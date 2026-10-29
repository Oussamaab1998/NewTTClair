import { runEngineCall, type Experiment } from './calls';
import { PROCEDURE_IDS, matchProcedures, runProcedure } from './procedures';
import { equals } from './rational';

const urn = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, value: i % 2 }));
const ex = (n: number, k: number, draw: Experiment['draw'] = 'simultaneous'): Experiment => ({
  urn: urn(n),
  draw,
  k,
});
const total = { fn: 'outcomeCount', args: {} };

describe('ordered_divided_by_k: the ordered count divided by the balls in a box, not by its orderings', () => {
  it('is a known procedure', () => {
    expect(PROCEDURE_IDS).toContain('ordered_divided_by_k');
  });

  it('the exercise urn: 720 / 3 = 240 (the right answer is 720 / 6 = 120)', () => {
    const r = runProcedure('ordered_divided_by_k', total, { experiment: ex(10, 3) });
    expect(r).toEqual({ ok: true, value: [[240, 1]] });
    const right = runEngineCall(total, { experiment: ex(10, 3) });
    expect(right.ok && right.value).toEqual([120, 1]);
  });

  it('the 4-ball twin: 24 / 3 = 8 (the right answer is 4); 5 balls: 60 / 3 = 20 (right: 10)', () => {
    expect(runProcedure('ordered_divided_by_k', total, { experiment: ex(4, 3) })).toEqual({ ok: true, value: [[8, 1]] });
    expect(runProcedure('ordered_divided_by_k', total, { experiment: ex(5, 3) })).toEqual({ ok: true, value: [[20, 1]] });
  });

  it('differs from the answer for k >= 3 and equals it for k = 2 (k = k!: the loader refuses such a row)', () => {
    for (const [n, k] of [[10, 3], [6, 3], [8, 4], [7, 4]] as const) {
      const wrong = runProcedure('ordered_divided_by_k', total, { experiment: ex(n, k) });
      const right = runEngineCall(total, { experiment: ex(n, k) });
      expect(wrong.ok && right.ok && wrong.value.some(v => equals(v, right.value))).toBe(false);
    }
    const wrong2 = runProcedure('ordered_divided_by_k', total, { experiment: ex(6, 2) });
    const right2 = runEngineCall(total, { experiment: ex(6, 2) });
    expect(wrong2.ok && right2.ok && wrong2.value.some(v => equals(v, right2.value))).toBe(true);
  });

  it('only for the number of draws of a simultaneous draw of 2 or more balls', () => {
    const no = (call: { fn: string; args: unknown }, e: Experiment) =>
      runProcedure('ordered_divided_by_k', call, { experiment: e });
    expect(no(total, ex(10, 3, 'ordered')).ok).toBe(false);
    expect(no(total, ex(10, 3, 'ordered_with_replacement')).ok).toBe(false);
    expect(no(total, ex(10, 1)).ok).toBe(false);
    expect(no({ fn: 'probability', args: { event: { id: 'any_value', args: { value: 0 } } } }, ex(10, 3)).ok).toBe(false);
    expect(
      no({ fn: 'count', args: { event: { id: 'any_value', args: { value: 0 } } } }, ex(10, 3)).ok,
    ).toBe(false);
    expect(runProcedure('ordered_divided_by_k', total, {}).ok).toBe(false);
  });

  it('a typed 240 is matched to it, alone among the s4 procedures', () => {
    const table = ['ordered_draw', 'with_replacement', 'all_balls', 'ordered_divided_by_k'] as const;
    expect(matchProcedures([240, 1], total, { experiment: ex(10, 3) }, table)).toEqual(['ordered_divided_by_k']);
    expect(matchProcedures([720, 1], total, { experiment: ex(10, 3) }, table)).toEqual(['ordered_draw']);
  });
});
