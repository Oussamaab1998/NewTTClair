import { runEngineCall, type Experiment } from './calls';
import { PROCEDURE_IDS, matchProcedures, runProcedure } from './procedures';
import { equals, frac } from './rational';

const urn = (red: number, black: number) => [
  ...Array.from({ length: red }, (_, i) => ({ id: `r${i + 1}`, value: 1, color: 'red' as const })),
  ...Array.from({ length: black }, (_, i) => ({ id: `n${i + 1}`, value: 0, color: 'black' as const })),
];
const ex = (red: number, black: number, k: number): Experiment => ({
  urn: urn(red, black),
  draw: 'simultaneous',
  k,
});
const oneRed = {
  id: 'value_eq',
  args: { valueFn: { id: 'count_value', args: { value: 1 } }, value: 1 },
} as const;
const prob = { fn: 'probability', args: { event: oneRed } };
const count = { fn: 'count', args: { event: oneRed } };

describe('total_over_favourable: the probability written upside down (total / favourable)', () => {
  it('is a known procedure', () => {
    expect(PROCEDURE_IDS).toContain('total_over_favourable');
  });

  it('step s8 (4 red, 6 black, 3 drawn): P = 60/120 = 1/2, the slip is 120/60 = 2', () => {
    const right = runEngineCall(prob, { experiment: ex(4, 6, 3) });
    expect(right.ok && right.value).toEqual([1, 2]);
    expect(runProcedure('total_over_favourable', prob, { experiment: ex(4, 6, 3) })).toEqual({
      ok: true,
      value: [[2, 1]],
    });
  });

  it('another probability: P = 5/6 gives 6/5 (also above 1)', () => {
    const e = ex(2, 4, 2);
    const p = runEngineCall(prob, { experiment: e });
    const r = runProcedure('total_over_favourable', prob, { experiment: e });
    expect(p.ok && r.ok).toBe(true);
    if (p.ok && r.ok) {
      expect(equals(r.value[0]!, frac(p.value[1], p.value[0]))).toBe(true);
    }
  });

  it('differs from the answer whenever the probability is not 1 (the loader refuses a row equal to the answer)', () => {
    for (const [r, b, k] of [[4, 6, 3], [3, 4, 3], [2, 4, 3], [3, 5, 2]] as const) {
      const right = runEngineCall(prob, { experiment: ex(r, b, k) });
      const slip = runProcedure('total_over_favourable', prob, { experiment: ex(r, b, k) });
      expect(right.ok && slip.ok && slip.value.some(v => equals(v, right.value))).toBe(false);
    }
  });

  it('does not apply to a count, to the number of draws, or when no draw has the event', () => {
    expect(runProcedure('total_over_favourable', count, { experiment: ex(4, 6, 3) }).ok).toBe(false);
    expect(
      runProcedure('total_over_favourable', { fn: 'outcomeCount', args: {} }, { experiment: ex(4, 6, 3) }).ok,
    ).toBe(false);
    const none = { fn: 'probability', args: { event: { id: 'any_value', args: { value: 5 } } } };
    expect(runProcedure('total_over_favourable', none, { experiment: ex(4, 6, 3) }).ok).toBe(false);
    expect(runProcedure('total_over_favourable', prob, {}).ok).toBe(false);
  });

  it('a typed 2 is matched to it, alone among the s8 procedures', () => {
    const table = [
      'balls_in_event',
      'with_replacement',
      'earlier_result',
      'total_over_favourable',
    ] as const;
    const earlier = [frac(120), frac(60)];
    expect(matchProcedures([2, 1], prob, { experiment: ex(4, 6, 3) }, table, earlier)).toEqual([
      'total_over_favourable',
    ]);
    // the other s8 slips are not claimed by it
    expect(matchProcedures([60, 1], prob, { experiment: ex(4, 6, 3) }, table, earlier)).toEqual([
      'earlier_result',
    ]);
  });
});
