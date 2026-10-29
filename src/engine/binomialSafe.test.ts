import {
  binomialSafe,
  checkBinomialGrid,
  maxSafeN,
} from './binomialSafe';
import {
  binomialLaw,
  distMean,
  distSecondMoment,
  distVariance,
  sumIsOne,
} from './distribution';
import { binomialExpectation, binomialPmf } from './probability';
import { EngineError, frac, mul, sub, type Fraction } from './rational';

const f = (n: number, d = 1): Fraction => frac(n, d);

describe('binomialSafe: can this (n, p) be shown exactly, term by term?', () => {
  it('every pmf term, np and npq are exact for the sizes the exercise uses', () => {
    for (const n of [3, 4, 5, 8, 10]) {
      expect(binomialSafe(n, f(1, 2))).toEqual({ ok: true });
      expect(binomialSafe(n, f(7, 10))).toEqual({ ok: true });
    }
  });

  it('the limit is the same one binomialPmf throws at: n = 15 for p = 3/10 and 7/10, 16 fails', () => {
    expect(binomialSafe(15, f(3, 10)).ok).toBe(true);
    expect(binomialSafe(15, f(7, 10)).ok).toBe(true);
    expect(binomialSafe(16, f(3, 10))).toMatchObject({ ok: false, n: 16 });
    expect(binomialSafe(16, f(7, 10)).ok).toBe(false);
    expect(() => binomialPmf(16, f(3, 10), 8)).toThrow(EngineError);
    expect(() => binomialPmf(15, f(3, 10), 7)).not.toThrow();
  });

  it('p = 0 and p = 1 are fine', () => {
    expect(binomialSafe(10, f(0)).ok).toBe(true);
    expect(binomialSafe(10, f(1)).ok).toBe(true);
  });

  it('p outside [0, 1], or n < 1, is refused with a reason', () => {
    expect(binomialSafe(5, f(3, 2))).toMatchObject({ ok: false, reason: 'bad_p' });
    expect(binomialSafe(5, f(-1, 2))).toMatchObject({ ok: false, reason: 'bad_p' });
    expect(binomialSafe(0, f(1, 2))).toMatchObject({ ok: false, reason: 'bad_n' });
    expect(binomialSafe(2.5, f(1, 2))).toMatchObject({ ok: false, reason: 'bad_n' });
  });
});

describe('maxSafeN: the largest n that is exact for every n up to it', () => {
  it.each([
    [[1, 2], 52],
    [[1, 3], 33],
    [[1, 5], 22],
    [[1, 6], 20],
    [[3, 10], 15],
    [[7, 10], 15],
    [[1, 10], 15],
    [[0, 1], 56], // C(n,k) itself stops fitting at n = 57 (choose fixed: was 54)
    [[1, 1], 56],
  ] as [[number, number], number][])('p = %j -> n <= %i', (p, want) => {
    expect(maxSafeN(p)).toBe(want);
  });

  it('the product owner rule: a denominator of 10 allows n <= 15', () => {
    for (const num of [1, 3, 7, 9]) {
      expect(maxSafeN(f(num, 10))).toBe(15);
    }
  });

  it('is consistent with binomialSafe: safe at maxSafeN, unsafe just above', () => {
    for (const p of [f(1, 2), f(1, 6), f(3, 10)]) {
      const m = maxSafeN(p);
      expect(binomialSafe(m, p).ok).toBe(true);
      expect(binomialSafe(m + 1, p).ok).toBe(false);
    }
  });

  it('takes a limit', () => {
    expect(maxSafeN(f(1, 2), 10)).toBe(10);
  });
});

describe('checkBinomialGrid: a whole slider range of n and of p', () => {
  const tenths = Array.from({ length: 11 }, (_, i) => f(i, 10));

  it('n 1..10 on p = 0, 1/10, ..., 1 is exact', () => {
    expect(checkBinomialGrid(1, 10, tenths)).toEqual({ ok: true });
  });
  it('n up to 15 is still exact on tenths; up to 16 is not, and it says where', () => {
    expect(checkBinomialGrid(1, 15, tenths)).toEqual({ ok: true });
    const r = checkBinomialGrid(1, 16, tenths);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.n).toBe(16);
      expect(r.p[1]).toBe(10);
    }
  });
  it('refuses an empty range', () => {
    expect(checkBinomialGrid(5, 3, tenths)).toMatchObject({ ok: false, reason: 'bad_n' });
    expect(checkBinomialGrid(1, 3, [])).toMatchObject({ ok: false, reason: 'bad_p' });
  });
});

describe('what is NOT safe even when every term is: sums of many terms (documented)', () => {
  it('B(15, 7/10): each pmf term is exact, E(X^2) and so V(X) written as sums overflow, npq does not', () => {
    const n = 15;
    const p = f(7, 10);
    expect(binomialSafe(n, p).ok).toBe(true);
    expect(distMean(binomialLaw(n, p))).toEqual([21, 2]); // the mean sum still fits
    expect(() => distSecondMoment(binomialLaw(n, p))).toThrow(EngineError);
    expect(() => distVariance(binomialLaw(n, p))).toThrow(EngineError);
    expect(binomialExpectation(n, p)).toEqual([21, 2]); // 21/2: the closed form
    const q = sub([1, 1], p);
    expect(mul(f(n), mul(p, q))).toEqual([63, 20]); // npq = 3.15
  });
  it('B(14, 7/10): the sum still fits, and the law adds up to 1', () => {
    const d = binomialLaw(14, f(7, 10));
    expect(sumIsOne(d)).toBe(true);
    expect(distMean(d)).toEqual([49, 5]);
  });
});
