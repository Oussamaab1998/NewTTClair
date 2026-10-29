/**
 * Known wrong procedures (C1, Tutor intelligence 1): the step's engine call
 * computed again the way a student who makes that mistake would, so a typed
 * wrong value can be traced to a misconception. Only count / probability /
 * outcome-count calls on an urn experiment; each procedure says when it does
 * not apply. Values are exact fractions, like every engine result.
 */
import { runEngineCall, type CallContext, type CallResult } from './calls';
import type { EventSpec } from './probability';
import { div, equals, frac, type Fraction } from './rational';

export const PROCEDURE_IDS = [
  /** A simultaneous draw counted as an ordered one. */
  'ordered_draw',
  /** Balls counted instead of draws: the event read on one ball. */
  'balls_in_event',
  /** Every ball of the urn counted. */
  'all_balls',
  /** The opposite event counted (or its probability). */
  'opposite_event',
  /** Every draw counted, not only the event's. */
  'all_outcomes',
  /** Balls with the same number taken as one ball. */
  'merged_identical',
  /** An earlier result of the question given again (compared as a fraction). */
  'earlier_result',
  /** The balls drawn one by one, each put back before the next (10 × 10 × 10). */
  'with_replacement',
  /**
   * The ordered count divided by the balls in a box (720 / 3 = 240), not by
   * the orderings of a box (720 / 3! = 120). For k = 2 the two coincide, so a
   * step with k = 2 cannot carry this row (the loader refuses a row that
   * equals the answer).
   */
  'ordered_divided_by_k',
  /**
   * A probability written upside down: total / favourable (120 / 60 = 2), a
   * "probability" above 1. Only for a probability; the loader refuses a row
   * that equals the answer (a probability of 1).
   */
  'total_over_favourable',
] as const;
export type ProcedureId = (typeof PROCEDURE_IDS)[number];

type Call = { fn: string; args: unknown };

const URN_CALLS = new Set(['count', 'probability', 'outcomeCount']);

const notApplicable = (
  id: ProcedureId,
  why: string,
): CallResult<Fraction[]> => ({
  ok: false,
  error: `${id} does not apply: ${why}`,
});

const one = (r: CallResult): CallResult<Fraction[]> =>
  r.ok ? { ok: true, value: [r.value] } : r;

const eventOf = (call: Call): EventSpec | undefined =>
  (call.args as { event?: EventSpec } | undefined)?.event;

/** The answer computed with procedure `id`; `earlier` = results already shown in the question. */
export function runProcedure(
  id: ProcedureId,
  call: Call,
  ctx: CallContext,
  earlier: readonly Fraction[] = [],
): CallResult<Fraction[]> {
  if (id === 'earlier_result') {
    const seen: Fraction[] = [];
    for (const v of earlier) {
      if (!seen.some(s => equals(s, v))) {
        seen.push(v);
      }
    }
    return seen.length > 0
      ? { ok: true, value: seen }
      : notApplicable(id, 'no earlier result');
  }
  const ex = ctx.experiment;
  if (!ex) {
    return notApplicable(id, 'no experiment');
  }
  if (!URN_CALLS.has(call.fn)) {
    return notApplicable(id, `${call.fn} is not a count or a probability`);
  }
  const counts = call.fn !== 'probability';
  switch (id) {
    case 'ordered_draw':
      return ex.draw === 'simultaneous'
        ? one(runEngineCall(call, { experiment: { ...ex, draw: 'ordered' } }))
        : notApplicable(id, 'the draw is already ordered');
    case 'with_replacement':
      return ex.draw !== 'ordered_with_replacement'
        ? one(
            runEngineCall(call, {
              experiment: { ...ex, draw: 'ordered_with_replacement' },
            }),
          )
        : notApplicable(id, 'the balls are already put back');
    case 'ordered_divided_by_k': {
      if (call.fn !== 'outcomeCount') {
        return notApplicable(id, 'only for the number of draws');
      }
      if (ex.draw !== 'simultaneous' || ex.k < 2) {
        return notApplicable(id, 'needs a simultaneous draw of 2+ balls');
      }
      const ordered = runEngineCall(call, {
        experiment: { ...ex, draw: 'ordered' },
      });
      return ordered.ok
        ? { ok: true, value: [div(ordered.value, frac(ex.k))] }
        : ordered;
    }
    case 'total_over_favourable': {
      if (call.fn !== 'probability') {
        return notApplicable(id, 'only for a probability');
      }
      const p = runEngineCall(call, ctx);
      if (!p.ok) {
        return p;
      }
      return p.value[0] === 0
        ? notApplicable(id, 'no draw has the event')
        : { ok: true, value: [div(frac(1), p.value)] };
    }
    case 'balls_in_event':
      if (ex.k < 2 || call.fn === 'outcomeCount') {
        return notApplicable(id, 'needs an event on a draw of 2+ balls');
      }
      return one(runEngineCall(call, { experiment: { ...ex, k: 1 } }));
    case 'all_balls':
      return counts && ex.k >= 2
        ? one(
            runEngineCall(
              { fn: 'outcomeCount', args: {} },
              { experiment: { ...ex, k: 1 } },
            ),
          )
        : notApplicable(id, 'only for counts of draws');
    case 'opposite_event': {
      const event = eventOf(call);
      if (!event) {
        return notApplicable(id, 'no event');
      }
      const opposite: EventSpec =
        event.id === 'not' ? event.args.event : { id: 'not', args: { event } };
      return one(
        runEngineCall(
          { fn: call.fn, args: { ...(call.args as object), event: opposite } },
          ctx,
        ),
      );
    }
    case 'all_outcomes':
      return call.fn === 'count'
        ? one(runEngineCall({ fn: 'outcomeCount', args: {} }, ctx))
        : notApplicable(id, 'only for counts of an event');
    case 'merged_identical': {
      const urn = ex.urn.filter(
        (b, i) => ex.urn.findIndex(c => c.value === b.value) === i,
      );
      if (urn.length === ex.urn.length) {
        return notApplicable(id, 'no two balls share a number');
      }
      if (urn.length < ex.k && ex.draw !== 'ordered_with_replacement') {
        return notApplicable(id, 'too few balls once merged');
      }
      return one(runEngineCall(call, { experiment: { ...ex, urn } }));
    }
  }
}

/** The procedures of `table` (in its order) whose value equals `value`. */
export function matchProcedures(
  value: Fraction,
  call: Call,
  ctx: CallContext,
  table: readonly ProcedureId[],
  earlier: readonly Fraction[] = [],
): ProcedureId[] {
  return table.filter(id => {
    const r = runProcedure(id, call, ctx, earlier);
    return r.ok && r.value.some(v => equals(v, value));
  });
}
