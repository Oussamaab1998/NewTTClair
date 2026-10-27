/**
 * C1 (Tutor intelligence 1): the answer computed again with known wrong
 * procedures. Ex 2 urn: -1, 0, 0, 1, 2; two balls drawn simultaneously.
 * Every expected value is worked out by hand in the comment beside it.
 */
import type { Experiment } from './calls';
import {
  matchProcedures,
  PROCEDURE_IDS,
  runProcedure,
  type ProcedureId,
} from './procedures';
import { frac, type Fraction } from './rational';

const EX2: Experiment = {
  urn: [
    { id: 'a', value: -1 },
    { id: 'b', value: 0 },
    { id: 'c', value: 0 },
    { id: 'd', value: 1 },
    { id: 'e', value: 2 },
  ],
  draw: 'simultaneous',
  k: 2,
};
const ctx = { experiment: EX2 };
const not = (event: object) => ({ id: 'not', args: { event } });
const anyValue = (value: number) => ({ id: 'any_value', args: { value } });

/** The transfer of 1b/s5: draws with no negative number (answer C(4,2) = 6). */
const TRANSFER = { fn: 'count', args: { event: not(anyValue(-1)) } };
/** 1b/s5: draws with no 0 (answer C(3,2) = 3). */
const S5 = { fn: 'count', args: { event: not(anyValue(0)) } };
/** 1b/s7: p(no 0) = 3/10. */
const S7 = { fn: 'probability', args: { event: not(anyValue(0)) } };

const run = (
  id: ProcedureId,
  call: { fn: string; args: unknown },
  earlier: Fraction[] = [],
) => {
  const r = runProcedure(id, call, ctx, earlier);
  return r.ok ? r.value : r.error;
};

describe('procedures: the answer re-run with a known wrong procedure', () => {
  it('the transfer (answer 6): each procedure', () => {
    // Balls with no negative number: 0, 0, 1, 2.
    expect(run('balls_in_event', TRANSFER)).toEqual([frac(4)]);
    // All the balls of the urn.
    expect(run('all_balls', TRANSFER)).toEqual([frac(5)]);
    // Draws WITH the -1: {-1,0}, {-1,0'}, {-1,1}, {-1,2}.
    expect(run('opposite_event', TRANSFER)).toEqual([frac(4)]);
    // Every draw: C(5,2).
    expect(run('all_outcomes', TRANSFER)).toEqual([frac(10)]);
    // Ordered draws from 0, 0', 1, 2: 4 × 3.
    expect(run('ordered_draw', TRANSFER)).toEqual([frac(12)]);
    // The two 0 balls taken as one: pairs of {0, 1, 2}.
    expect(run('merged_identical', TRANSFER)).toEqual([frac(3)]);
    // 1b/s5's result, shown before the transfer.
    expect(run('earlier_result', TRANSFER, [frac(3)])).toEqual([frac(3)]);
  });

  it('typed 4 at the transfer: balls first, then the opposite event (table order)', () => {
    expect(
      matchProcedures(frac(4), TRANSFER, ctx, [...PROCEDURE_IDS], [frac(3)]),
    ).toEqual(['balls_in_event', 'opposite_event']);
  });

  it('typed 5 at the transfer: only all the balls; 12: only the ordered draw', () => {
    expect(
      matchProcedures(frac(5), TRANSFER, ctx, [...PROCEDURE_IDS], [frac(3)]),
    ).toEqual(['all_balls']);
    expect(
      matchProcedures(frac(12), TRANSFER, ctx, [...PROCEDURE_IDS], []),
    ).toEqual(['ordered_draw']);
  });

  it('the match order is the order of the table passed in', () => {
    expect(
      matchProcedures(frac(4), TRANSFER, ctx, [
        'opposite_event',
        'balls_in_event',
      ]),
    ).toEqual(['opposite_event', 'balls_in_event']);
  });

  it('1b/s5 (answer 3): balls with no 0 is 3 too, so that procedure collides with the answer', () => {
    // -1, 1, 2: three balls; the loader rejects it in a table for this step.
    expect(run('balls_in_event', S5)).toEqual([frac(3)]);
    expect(run('all_balls', S5)).toEqual([frac(5)]);
    // Draws with a 0: 10 − 3.
    expect(run('opposite_event', S5)).toEqual([frac(7)]);
    // Ordered draws from -1, 1, 2: 3 × 2.
    expect(run('ordered_draw', S5)).toEqual([frac(6)]);
  });

  it('probabilities (1b/s7, answer 3/10)', () => {
    // 3 balls with no 0 out of 5.
    expect(run('balls_in_event', S7)).toEqual([frac(3, 5)]);
    expect(run('opposite_event', S7)).toEqual([frac(7, 10)]);
    // Ordered: 6 / 20, the same probability (collides; the loader rejects it).
    expect(run('ordered_draw', S7)).toEqual([frac(3, 10)]);
    // Urn -1, 0, 1, 2: pairs with no 0 = 3 of 6.
    expect(run('merged_identical', S7)).toEqual([frac(1, 2)]);
    // Earlier results are compared as fractions: 6/10 is 3/5.
    expect(run('earlier_result', S7, [frac(6, 10), frac(3)])).toEqual([
      frac(3, 5),
      frac(3),
    ]);
  });

  it('procedures that do not fit the answer are errors, not values', () => {
    // A probability has no "all balls" / "all outcomes" count.
    expect(run('all_balls', S7)).toMatch(/does not apply/);
    expect(run('all_outcomes', S7)).toMatch(/does not apply/);
    expect(run('earlier_result', S5, [])).toMatch(/no earlier result/);
    expect(
      runProcedure(
        'merged_identical',
        S5,
        { experiment: { ...EX2, urn: EX2.urn.slice(0, 2) } },
        [],
      ),
    ).toMatchObject({ ok: false });
    expect(
      runProcedure('ordered_draw', S5, {
        experiment: { ...EX2, draw: 'ordered' },
      }),
    ).toMatchObject({ ok: false });
    expect(
      runProcedure(
        'balls_in_event',
        { fn: 'choose', args: { n: 5, k: 2 } },
        ctx,
      ),
    ).toMatchObject({ ok: false });
    expect(runProcedure('balls_in_event', S5, {})).toMatchObject({
      ok: false,
    });
  });
});

/**
 * Sciences expérimentales 2022 (docs/exercises/EX_URN_RN.md): 4 red balls
 * (value 1) and 6 black (value 0), three drawn simultaneously.
 */
describe('procedures on the red / black urn (3 balls drawn)', () => {
  const RN: Experiment = {
    urn: [
      ...['r1', 'r2', 'r3', 'r4'].map(id => ({ id, value: 1 })),
      ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(id => ({ id, value: 0 })),
    ],
    draw: 'simultaneous',
    k: 3,
  };
  const rn = { experiment: RN };
  const oneRed = {
    id: 'value_eq',
    args: { valueFn: { id: 'count_value', args: { value: 1 } }, value: 1 },
  };
  const TOTAL = { fn: 'outcomeCount', args: {} };
  const P_A = { fn: 'probability', args: { event: oneRed } };
  const P_B = { fn: 'probability', args: { event: not(anyValue(1)) } };
  const N_B = { fn: 'count', args: { event: not(anyValue(1)) } };
  const runRn = (id: ProcedureId, call: { fn: string; args: unknown }) => {
    const r = runProcedure(id, call, rn);
    return r.ok ? r.value : r.error;
  };

  it('with_replacement: the three balls drawn one by one, each put back', () => {
    // 10 × 10 × 10.
    expect(runRn('with_replacement', TOTAL)).toEqual([frac(1000)]);
    // 3 places for the red × (4/10) × (6/10)²  = 432/1000.
    expect(runRn('with_replacement', P_A)).toEqual([frac(54, 125)]);
    // (6/10)³ = 216/1000.
    expect(runRn('with_replacement', P_B)).toEqual([frac(27, 125)]);
  });

  it('with_replacement does not apply when the draw already puts balls back', () => {
    expect(
      runProcedure('with_replacement', TOTAL, {
        experiment: { ...RN, draw: 'ordered_with_replacement' },
      }),
    ).toMatchObject({ ok: false });
  });

  it('the ordered count is 3! = 6 times the simultaneous one, so an ordered P is the same', () => {
    // 10 × 9 × 8 = 720 = 6 × 120.
    expect(runRn('ordered_draw', TOTAL)).toEqual([frac(720)]);
    // 6 × 5 × 4 = 120 = 6 × 20.
    expect(runRn('ordered_draw', N_B)).toEqual([frac(120)]);
    // 360/720 and 120/720: equal to the answers (the loader rejects them in a table).
    expect(runRn('ordered_draw', P_A)).toEqual([frac(1, 2)]);
    expect(runRn('ordered_draw', P_B)).toEqual([frac(1, 6)]);
  });

  it('the opposite of A has as many draws as A: that procedure gives the answer', () => {
    expect(runRn('opposite_event', P_A)).toEqual([frac(1, 2)]);
  });
});
