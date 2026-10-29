import { binomialLaw, distMean } from './distribution';
import {
  cellsForStage,
  repeatedRuns,
  tally,
  type RunsResult,
} from './runs';
import { enumerateOutcomes, law, type Ball } from './probability';
import { EngineError, frac, type Fraction } from './rational';

const f = (n: number, d = 1): Fraction => frac(n, d);

const ok = (r: RunsResult) => {
  if (!r.ok) {
    throw new Error(`expected ok, got ${r.reason}`);
  }
  return r;
};

describe('repeatedRuns: exact counts, never random', () => {
  it('N = 36, p = 1/6: 6 runs have the event first; with 1/6 again, 1 has it twice', () => {
    const r = ok(repeatedRuns(36, [f(1, 6), f(1, 6)]));
    expect(r.counts).toEqual([36, 6, 1]);
  });

  it('one stage: 1/6 of 36 is 6 (and 36 / (1/6) = 216 is not)', () => {
    expect(ok(repeatedRuns(36, [f(1, 6)])).counts).toEqual([36, 6]);
    expect(36 / (1 / 6)).toBeCloseTo(216);
  });

  it('1/6 + 1/6 is 1/3, but two stages of 1/6 give 1/36 of the runs', () => {
    const r = ok(repeatedRuns(36, [f(1, 6), f(1, 6)]));
    expect(r.counts[2]! / r.counts[0]!).toBeCloseTo(1 / 36);
    expect(r.counts[2]! / r.counts[0]!).not.toBeCloseTo(1 / 3);
  });

  it('the exercise: exactly one red with p = 1/2 over N = 36 runs, then again: 36, 18, 9', () => {
    expect(ok(repeatedRuns(36, [f(1, 2), f(1, 2)])).counts).toEqual([36, 18, 9]);
  });

  it('non-session: N = 60, 1/5 then 1/3 gives 60, 12, 4', () => {
    expect(ok(repeatedRuns(60, [f(1, 5), f(1, 3)])).counts).toEqual([60, 12, 4]);
  });

  it('rejects a parameter set whose counts are not integers, and says which stage', () => {
    const a = repeatedRuns(36, [f(1, 5)]);
    expect(a).toEqual({ ok: false, stage: 1, reason: 'not_integer', value: [36, 5] });
    const b = repeatedRuns(36, [f(1, 6), f(1, 4)]); // 6 * 1/4 = 3/2
    expect(b).toMatchObject({ ok: false, stage: 2, reason: 'not_integer' });
    expect(repeatedRuns(36, [f(1, 6), f(1, 3)])).toMatchObject({ ok: true });
  });

  it('rejects bad input without throwing: p outside [0, 1], N < 1, no stage, too many stages', () => {
    expect(repeatedRuns(36, [f(3, 2)])).toMatchObject({ ok: false, reason: 'bad_probability' });
    expect(repeatedRuns(36, [f(-1, 6)])).toMatchObject({ ok: false, reason: 'bad_probability' });
    expect(repeatedRuns(0, [f(1, 2)])).toMatchObject({ ok: false, reason: 'bad_n' });
    expect(repeatedRuns(36.5, [f(1, 2)])).toMatchObject({ ok: false, reason: 'bad_n' });
    expect(repeatedRuns(36, [])).toMatchObject({ ok: false, reason: 'no_stage' });
    expect(repeatedRuns(36, [f(1, 2), f(1, 2), f(1, 2), f(1, 2)])).toMatchObject({
      ok: false,
      reason: 'too_many_stages',
    });
  });

  it('is deterministic: the same input is the same answer, and nothing reads a random source', () => {
    const spy = jest.spyOn(Math, 'random');
    const a = repeatedRuns(36, [f(1, 6), f(1, 6)]);
    const b = repeatedRuns(36, [f(1, 6), f(1, 6)]);
    expect(a).toEqual(b);
    expect(cellsForStage(36, 6)).toEqual(cellsForStage(36, 6));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('cellsForStage: which cells are shaded', () => {
  it('a contiguous block from the first cell, in reading order', () => {
    expect(cellsForStage(36, 6)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(cellsForStage(36, 0)).toEqual([]);
    expect(cellsForStage(36, 36)).toHaveLength(36);
  });
  it('stage 2 sits inside stage 1: the subset is the first cells of the subset', () => {
    const r = ok(repeatedRuns(36, [f(1, 6), f(1, 6)]));
    const s1 = cellsForStage(r.counts[0]!, r.counts[1]!);
    const s2 = cellsForStage(r.counts[1]!, r.counts[2]!);
    expect(s2.every(i => s1.includes(i))).toBe(true);
    expect(s2).toEqual([0]);
  });
  it('refuses a count above N', () => {
    expect(() => cellsForStage(36, 37)).toThrow(EngineError);
    expect(() => cellsForStage(36, -1)).toThrow(EngineError);
    expect(() => cellsForStage(36, 2.5)).toThrow(EngineError);
  });
});

describe('tally: the table of a law over N runs', () => {
  it('the exercise law over 36 runs of one draw: number of reds 0..3 with 1/6, 1/2, 3/10, 1/30 has no integer counts', () => {
    const r = tally(
      [0, 1, 2, 3],
      [f(1, 6), f(1, 2), f(3, 10), f(1, 30)],
      36,
    );
    expect(r).toMatchObject({ ok: false, reason: 'not_integer' });
  });

  it('over N = 60 the same law is whole: 10, 30, 18, 2 runs, total S = 30 + 36 + 6 = 72, average 6/5', () => {
    const r = tally([0, 1, 2, 3], [f(1, 6), f(1, 2), f(3, 10), f(1, 30)], 60);
    if (!r.ok) {
      throw new Error(r.reason);
    }
    expect(r.rows.map(x => x.runs)).toEqual([10, 30, 18, 2]);
    expect(r.rows.map(x => x.total)).toEqual([0, 30, 36, 6]);
    expect(r.total).toBe(72);
    expect(r.average).toEqual([6, 5]);
    expect(r.rows.reduce((s, x) => s + x.runs, 0)).toBe(60);
  });

  it('the average of the tally is E(X), exactly: a fair die over 60 runs', () => {
    const r = tally([1, 2, 3, 4, 5, 6], Array(6).fill(f(1, 6)), 60);
    if (!r.ok) {
      throw new Error(r.reason);
    }
    expect(r.rows.map(x => x.runs)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(r.total).toBe(210);
    expect(r.average).toEqual([7, 2]);
  });

  it('the average of a law taken from the engine equals its mean: 2.a law of the product on N = 10 runs', () => {
    const urn: Ball[] = [-1, 0, 0, 1, 2].map((v, i) => ({ id: `b${i}`, value: v }));
    const rows = law('product', enumerateOutcomes(urn, 'simultaneous', 2));
    const r = tally(
      rows.map(x => x.value),
      rows.map(x => x.p),
      10,
    );
    if (!r.ok) {
      throw new Error(r.reason);
    }
    expect(r.rows.map(x => x.runs)).toEqual([1, 1, 7, 1]); // X = -2, -1, 0, 2
    expect(r.total).toBe(-2 - 1 + 0 + 2);
    expect(r.average).toEqual(distMean(rows)); // -1/10
    expect(r.average).toEqual([-1, 10]);
  });

  it('binomial B(3, 1/2) over N = 8 runs: 1, 3, 3, 1', () => {
    const d = binomialLaw(3, f(1, 2));
    const r = tally(d.map(x => x.value), d.map(x => x.p), 8);
    if (!r.ok) {
      throw new Error(r.reason);
    }
    expect(r.rows.map(x => x.runs)).toEqual([1, 3, 3, 1]);
    expect(r.average).toEqual([3, 2]);
  });

  it('a bad law is reported, not thrown', () => {
    expect(tally([0, 1], [f(1, 2), f(1, 3)], 6)).toMatchObject({ ok: false, reason: 'not_a_law' });
    expect(tally([0, 1], [f(1, 2)], 6)).toMatchObject({ ok: false, reason: 'not_a_law' });
    expect(tally([0, 1], [f(1, 2), f(1, 2)], 0)).toMatchObject({ ok: false, reason: 'bad_n' });
  });
});
