/**
 * The compute tools: what the engine tells the tutor. Pure and synchronous.
 * Every value a tool returns is added to the session's known numbers (the
 * tutor may then show it). Errors come back as text for an is_error result.
 */
import type { z } from 'zod';

import { runEngineCall, type Experiment } from '../../engine/calls';
import { listBoxes, orderingsOfBox } from '../../engine/grouping';
import type { Ball } from '../../engine/probability';
import { frac, type Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import { boxNumbers, evalWith } from '../../method/claims';
import { leaves } from '../../method/factorForm';
import { ballsOf } from '../../method/repair';
import {
  lineVerdict,
  matchOnGraph,
  plain,
  readLine,
  type GraphVerdict,
  type LineRead,
  type LineVerdict,
} from '../checks/lines';
import {
  addKnown,
  boxValues,
  caseRuntime,
  creditedSet,
  type CaseSpec,
  type SessionRuntime,
} from '../session/state';
import type {
  CheckLineSchema,
  EngineCallSchema,
  EvaluateSchema,
  Expect,
  ListOutcomesSchema,
  MakeCaseSchema,
  TestRuleSchema,
} from './schemas';

export type ToolOutcome =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

export interface ToolContext {
  rt: SessionRuntime;
  /** The exercise's random experiment, when it has one. */
  experiment: Experiment | null;
}

const fail = (error: string): ToolOutcome => ({ ok: false, error });

/**
 * Every number a read line shows: the numbers written in it, each side's
 * exact value, and the grouped reading's value.
 */
function valuesOf(r: LineRead): Fraction[] {
  const c = r.chain;
  if (c.kind === 'unreadable') {
    return [];
  }
  const sides = c.kind === 'chain' ? c.sides : [c.side];
  const written = sides
    .flatMap(s => leaves(s.ast))
    .map(Number)
    .filter(n => Number.isInteger(n))
    .map(n => frac(n));
  return [
    ...written,
    ...sides.map(s => s.value),
    ...(r.groupedValue ? [r.groupedValue] : []),
  ];
}

/** A box case is matched by its named counts (ordered, orderings, groups). */
function matchOnBox(
  spec: Extract<CaseSpec, { kind: 'box' }>,
  value: Fraction,
  node: string | undefined,
): GraphVerdict {
  const named = Object.entries(boxValues(spec.n, spec.k));
  const hit = named.find(([name, v]) => sameRat(v, value) && name === node);
  if (hit) {
    return {
      verdict: 'credit',
      node: hit[0],
      derivation: 'value',
      unsimplified: false,
      completes: true,
    };
  }
  const other = named.find(([, v]) => sameRat(v, value));
  if (other) {
    return node === undefined
      ? {
          verdict: 'credit',
          node: other[0],
          derivation: 'value',
          unsimplified: false,
          completes: true,
        }
      : { verdict: 'other_step', node: other[0] };
  }
  return { verdict: 'no_match' };
}

export interface Judged {
  read: LineRead;
  verdict: LineVerdict;
  /** null when nothing was expected and no graph applies. */
  match: GraphVerdict | null;
  graph: string | null;
}

/**
 * The engine's judgement of a line: read it, then match it on the expected
 * graph node, an expected value, or (no expectation) the question's graph.
 */
export function judgeLine(
  rt: SessionRuntime,
  raw: string,
  expect: Expect | null,
): Judged {
  const read = readLine(raw);
  const verdict = lineVerdict(read);
  addKnown(rt.state, valuesOf(read));
  const c = read.chain;
  if (c.kind === 'unreadable') {
    return { read, verdict, match: null, graph: null };
  }
  if (expect?.kind === 'value') {
    const target = readLine(expect.expr);
    const t = target.chain;
    const tv = t.kind === 'unreadable' ? null : t.value;
    if (!tv) {
      return { read, verdict, match: { verdict: 'no_match' }, graph: null };
    }
    const unsimplified = expect.reduced && verdict.checks.unreduced_written;
    return {
      read,
      verdict,
      match: sameRat(c.value, tv)
        ? {
            verdict: 'credit',
            node: 'value',
            derivation: 'value',
            unsimplified,
            completes: !unsimplified,
          }
        : { verdict: 'no_match' },
      graph: null,
    };
  }
  const graphId = expect?.graph ?? 'main';
  const node = expect?.node;
  const spec = rt.state.cases[graphId];
  if (spec?.kind === 'box') {
    return {
      read,
      verdict,
      match: matchOnBox(spec, c.value, node),
      graph: graphId,
    };
  }
  const g = rt.graphs.get(graphId);
  if (!g) {
    return { read, verdict, match: null, graph: null };
  }
  return {
    read,
    verdict,
    match: matchOnGraph(g, c, creditedSet(rt.state, graphId), node),
    graph: graphId,
  };
}

function evaluate(
  ctx: ToolContext,
  input: z.infer<typeof EvaluateSchema>,
): ToolOutcome {
  return {
    ok: true,
    result: input.lines.map(line => {
      const read = readLine(line);
      addKnown(ctx.rt.state, valuesOf(read));
      return { line, ...lineVerdict(read) };
    }),
  };
}

function checkLine(
  ctx: ToolContext,
  input: z.infer<typeof CheckLineSchema>,
): ToolOutcome {
  if (
    input.expect?.kind === 'node' &&
    !ctx.rt.graphs.has(input.expect.graph) &&
    ctx.rt.state.cases[input.expect.graph] === undefined
  ) {
    return fail(`unknown graph ${input.expect.graph}`);
  }
  const j = judgeLine(ctx.rt, input.line, input.expect);
  return { ok: true, result: { line: j.verdict, match: j.match } };
}

interface CaseBalls {
  balls: Ball[];
  label: (id: string) => string;
  k: number;
}

function caseBalls(ctx: ToolContext, caseId: string): CaseBalls | string {
  const spec = ctx.rt.state.cases[caseId];
  if (spec?.kind === 'box') {
    const letters = 'abcdefgh'.slice(0, spec.n).split('');
    return {
      balls: letters.map(id => ({ id, value: 0 })),
      label: id => id,
      k: spec.k,
    };
  }
  const urn =
    spec?.kind === 'urn'
      ? spec
      : caseId === 'main'
      ? ctx.rt.graphs.get('main')?.graph.spec
      : undefined;
  if (!urn) {
    return `unknown case ${caseId}`;
  }
  const labelled = ballsOf(urn.reds, urn.blacks);
  const labels = new Map(labelled.map(b => [b.id, b.label]));
  return {
    balls: labelled.map(b => ({
      id: b.id,
      value: b.id.startsWith('r') ? 1 : 0,
      color: b.id.startsWith('r') ? 'red' : 'black',
    })),
    label: id => labels.get(id) ?? id,
    k: urn.k,
  };
}

const LIST_MAX = 60;

function listOutcomes(
  ctx: ToolContext,
  input: z.infer<typeof ListOutcomesSchema>,
): ToolOutcome {
  const cb = caseBalls(ctx, input.case_id);
  if (typeof cb === 'string') {
    return fail(cb);
  }
  let boxes;
  try {
    boxes = listBoxes(cb.balls, cb.k);
  } catch {
    return fail('too many draws to list');
  }
  const reds = (ids: readonly string[]) =>
    ids.filter(id => id.startsWith('r')).length;
  const kept =
    input.reds_exactly === null
      ? boxes
      : boxes.filter(b => reds(b.ballIds) === input.reds_exactly);
  const items =
    input.what === 'groups'
      ? kept.map(b => b.ballIds.map(cb.label).join(' '))
      : kept.flatMap(b =>
          orderingsOfBox(b.ballIds).map(o =>
            o.split('-').map(cb.label).join(' '),
          ),
        );
  addKnown(ctx.rt.state, [frac(items.length)]);
  return {
    ok: true,
    result:
      items.length > LIST_MAX
        ? { count: items.length, too_many_to_list: true }
        : { count: items.length, items },
  };
}

const LISTABLE = 30;

function testRule(
  ctx: ToolContext,
  input: z.infer<typeof TestRuleSchema>,
): ToolOutcome {
  const out = [];
  for (const c of input.cases) {
    if (c.k > c.n) {
      return fail(`case n=${c.n} k=${c.k}: k must be at most n`);
    }
    const b = boxNumbers(c);
    let predicted: Fraction;
    try {
      predicted = evalWith(input.rule, {
        n: frac(c.n),
        k: frac(c.k),
        o: frac(b.ordered),
        f: frac(b.kfact),
      });
    } catch {
      return fail(
        `the rule must be an expression in n, k, o, f (e.g. "o/2", "o/f"): ${input.rule}`,
      );
    }
    const actual = frac(
      input.predicts === 'groups'
        ? b.groups
        : input.predicts === 'ordered'
        ? b.ordered
        : b.kfact,
    );
    addKnown(ctx.rt.state, [predicted, actual]);
    out.push({
      n: c.n,
      k: c.k,
      predicted: plain(predicted),
      actual: plain(actual),
      holds: sameRat(predicted, actual),
      listable_by_hand: actual[0] <= LISTABLE,
    });
  }
  return { ok: true, result: out };
}

/** Pairs of named counts of a box that are equal: a wrong method would give the right number. */
function boxCoincidences(n: number, k: number): string[] {
  const v = boxValues(n, k);
  const named: [string, Fraction][] = [
    ['balls n', frac(n)],
    ['drawn k', frac(k)],
    ['n*k', frac(n * k)],
    ['ordered', v.ordered!],
    ['orderings', v.orderings!],
    ['groups', v.groups!],
    ['ordered/k', frac(v.ordered![0], k)],
  ];
  const out: string[] = [];
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      if (sameRat(named[i]![1], named[j]![1])) {
        out.push(`${named[i]![0]} = ${named[j]![0]}`);
      }
    }
  }
  return out;
}

function makeCase(
  ctx: ToolContext,
  input: z.infer<typeof MakeCaseSchema>,
): ToolOutcome {
  const s = ctx.rt.state;
  const spec: CaseSpec = input.case;
  if (spec.kind === 'box' && spec.k > spec.n) {
    return fail('k must be at most n');
  }
  if (spec.kind === 'urn') {
    if (spec.reds + spec.blacks < spec.k) {
      return fail('the urn needs at least k balls');
    }
    if (
      spec.j > spec.k ||
      spec.j > spec.reds ||
      spec.k - spec.j > spec.blacks
    ) {
      return fail('j reds and k - j blacks must fit in the urn');
    }
  }
  const id = `C${Object.keys(s.cases).length + 1}`;
  const known = new Set(s.known);
  let values: Record<string, Fraction>;
  let coincidences: string[];
  if (spec.kind === 'box') {
    values = boxValues(spec.n, spec.k);
    coincidences = boxCoincidences(spec.n, spec.k);
  } else {
    const rt = caseRuntime(id, spec);
    if (!rt) {
      return fail('could not build the case');
    }
    ctx.rt.graphs.set(id, rt);
    values = Object.fromEntries(rt.graph.nodes.map(n => [n.id, n.value]));
    coincidences = rt.table.dropped
      .filter(d => d.why === 'equals_right_value')
      .map(d => `${d.id} at ${d.nodeId}`);
  }
  s.cases[id] = spec;
  const reused = Object.entries(values)
    .filter(([, v]) => v[0] > 2 && known.has(plain(v)))
    .map(([name, v]) => `${name}=${plain(v)}`);
  addKnown(s, Object.values(values));
  return {
    ok: true,
    result: {
      case_id: id,
      balls:
        spec.kind === 'box'
          ? 'abcdefgh'.slice(0, spec.n).split('')
          : ballsOf(spec.reds, spec.blacks).map(b => b.label),
      k: spec.k,
      private_values: Object.fromEntries(
        Object.entries(values).map(([name, v]) => [name, plain(v)]),
      ),
      coincidences,
      reused_numbers: reused,
    },
  };
}

function engineCall(
  ctx: ToolContext,
  input: z.infer<typeof EngineCallSchema>,
): ToolOutcome {
  let args: unknown;
  try {
    args = JSON.parse(input.args_json);
  } catch {
    return fail('args_json is not JSON');
  }
  let experiment: Experiment | undefined;
  if (input.on === 'exercise') {
    experiment = ctx.experiment ?? undefined;
  } else {
    const cb = caseBalls(ctx, input.on);
    if (typeof cb === 'string') {
      return fail(cb);
    }
    experiment = { urn: cb.balls, draw: 'simultaneous', k: cb.k };
  }
  if (!experiment) {
    return fail('this exercise has no experiment');
  }
  const r = runEngineCall({ fn: input.fn, args }, { experiment });
  if (!r.ok) {
    return fail(r.error);
  }
  addKnown(ctx.rt.state, [r.value]);
  return { ok: true, result: { value: plain(r.value) } };
}

type Runner = (ctx: ToolContext, input: never) => ToolOutcome;

export const COMPUTE: Readonly<Record<string, Runner>> = {
  evaluate: evaluate as Runner,
  check_line: checkLine as Runner,
  list_outcomes: listOutcomes as Runner,
  test_rule: testRule as Runner,
  make_case: makeCase as Runner,
  engine_call: engineCall as Runner,
};
