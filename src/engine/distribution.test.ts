import { enumeratePatterns } from './combinatorics';
import {
  bernoulliDist,
  binomialLaw,
  distMean,
  distSecondMoment,
  distVariance,
  isSymmetric,
  lawFromPatterns,
  patternWeight,
  spreadFrame,
  sumIsOne,
} from './distribution';
import { ratToDecimal, sameRat } from './rationalFormat';
import {
  binomialPmf,
  enumerateOutcomes,
  expectation,
  law,
  variance,
  type Ball,
} from './probability';
import { EngineError, equals, frac, mul, sub, type Fraction } from './rational';

const f = (n: number, d = 1): Fraction => frac(n, d);

describe('spreadFrame: distance, square, contribution, total', () => {
  it('p = 3/10 on values 0 and 1: the prototype numbers, exactly', () => {
    const fr = spreadFrame([0, 1], [f(7, 10), f(3, 10)]); // P(F) = 7/10, P(S) = 3/10
    expect(fr.mean).toEqual([3, 10]);
    const [rowF, rowS] = fr.rows;
    // F (value 0): 3/10 left of the mean; its square 9/100; contribution 7/10 x 9/100
    expect(rowF).toEqual({
      x: 0,
      p: [7, 10],
      d: [-3, 10],
      dist: [3, 10],
      d2: [9, 100],
      w: [63, 1000],
    });
    // S (value 1): 7/10 right of the mean; its square 49/100; contribution 3/10 x 49/100
    expect(rowS).toEqual({
      x: 1,
      p: [3, 10],
      d: [7, 10],
      dist: [7, 10],
      d2: [49, 100],
      w: [147, 1000],
    });
    expect(fr.variance).toEqual([21, 100]);
    expect(ratToDecimal(fr.variance)).toBe('0,21');
  });

  it('the total is p(1-p) at every p of a 1/20 grid, 0 at both ends, largest at 1/2', () => {
    let best: Fraction = [0, 1];
    for (let i = 0; i <= 20; i++) {
      const p = f(i, 20);
      const q = sub([1, 1], p);
      const fr = spreadFrame([0, 1], [q, p]);
      expect(equals(fr.variance, mul(p, q))).toBe(true);
      if (fr.variance[0] * best[1] > best[0] * fr.variance[1]) {
        best = fr.variance;
      }
      // symmetric: p and 1-p spread the same
      const mirror = spreadFrame([0, 1], [p, q]);
      expect(equals(mirror.variance, fr.variance)).toBe(true);
    }
    expect(spreadFrame([0, 1], [f(1), f(0)]).variance).toEqual([0, 1]);
    expect(spreadFrame([0, 1], [f(0), f(1)]).variance).toEqual([0, 1]);
    expect(best).toEqual([1, 4]);
  });

  it('why the checkpoint must not use p = 1/2: four wrong formulas all give 1/4 there', () => {
    const p = f(1, 2);
    const q = sub([1, 1], p);
    const four = [mul(p, q), mul(p, p), mul(p, f(1, 2)), mul(q, q)];
    expect(four.every(x => equals(x, [1, 4]))).toBe(true);
    // and at 3/10 they are four different numbers
    const p2 = f(3, 10);
    const q2 = sub([1, 1], p2);
    const spread = [mul(p2, q2), mul(p2, p2), mul(p2, f(1, 2)), mul(q2, q2)];
    expect(new Set(spread.map(x => x.join('/'))).size).toBe(4);
  });

  it('the contributions add up to the variance, and to E(X^2) - E(X)^2', () => {
    const fr = spreadFrame([1, 2, 3, 5], [f(1, 8), f(3, 8), f(1, 4), f(1, 4)]);
    const total = fr.rows.reduce<Fraction>((s, r) => {
      const n = s[0] * r.w[1] + r.w[0] * s[1];
      return frac(n, s[1] * r.w[1]);
    }, [0, 1]);
    expect(equals(total, fr.variance)).toBe(true);
    const dist = fr.rows.map(r => ({ value: r.x, p: r.p }));
    expect(equals(fr.variance, distVariance(dist))).toBe(true);
    // E(X^2) - E(X)^2, written out
    const m = distMean(dist);
    expect(equals(sub(distSecondMoment(dist), mul(m, m)), fr.variance)).toBe(true);
  });

  it('three laws with the same mean and different spread (values 1, 2, 3)', () => {
    const a = spreadFrame([1, 2, 3], [f(1, 3), f(1, 3), f(1, 3)]);
    const b = spreadFrame([1, 2, 3], [f(1, 2), f(0), f(1, 2)]);
    const c = spreadFrame([1, 2, 3], [f(0), f(1), f(0)]);
    expect([a, b, c].map(x => x.mean)).toEqual([[2, 1], [2, 1], [2, 1]]);
    expect([a, b, c].map(x => x.variance)).toEqual([[2, 3], [1, 1], [0, 1]]);
  });

  it('refuses what is not a distribution', () => {
    expect(() => spreadFrame([0, 1], [f(1, 2), f(1, 3)])).toThrow(EngineError); // sums to 5/6
    expect(() => spreadFrame([0, 1], [f(3, 2), f(-1, 2)])).toThrow(EngineError); // negative
    expect(() => spreadFrame([0, 1, 2], [f(1, 2), f(1, 2)])).toThrow(EngineError); // lengths
    expect(() => spreadFrame([1, 1], [f(1, 2), f(1, 2)])).toThrow(EngineError); // duplicate value
    expect(() => spreadFrame([0.5, 1], [f(1, 2), f(1, 2)])).toThrow(EngineError); // not an integer
  });
});

describe('moments agree with the engine that already exists', () => {
  const urn: Ball[] = [-1, 0, 0, 1, 2].map((v, i) => ({ id: `b${i}`, value: v }));
  const rows = law('product', enumerateOutcomes(urn, 'simultaneous', 2));

  it('Exercise 2: X in {-2,-1,0,2}, E(X) = -1/10, V(X) = 89/100', () => {
    expect(rows.map(r => r.value)).toEqual([-2, -1, 0, 2]);
    expect(distMean(rows)).toEqual([-1, 10]);
    expect(distVariance(rows)).toEqual([89, 100]);
    expect(equals(distMean(rows), expectation(rows).fraction)).toBe(true);
    expect(equals(distVariance(rows), variance(rows).fraction)).toBe(true);
    const fr = spreadFrame(
      rows.map(r => r.value),
      rows.map(r => r.p),
    );
    expect(fr.mean).toEqual([-1, 10]);
    expect(fr.variance).toEqual([89, 100]);
  });
});

describe('Bernoulli and binomial laws', () => {
  it('bernoulliDist puts p on the second value', () => {
    const d = bernoulliDist([0, 1], f(3, 10));
    expect(d).toEqual([
      { value: 0, p: [7, 10] },
      { value: 1, p: [3, 10] },
    ]);
    expect(sumIsOne(d)).toBe(true);
    expect(() => bernoulliDist([0, 1], f(3, 2))).toThrow(EngineError);
  });

  it('n = 3 and n = 4 with p = 1/2: the numeric twins of the exercise', () => {
    const b3 = binomialLaw(3, f(1, 2));
    expect(b3.map(r => r.p)).toEqual([[1, 8], [3, 8], [3, 8], [1, 8]]);
    expect(distMean(b3)).toEqual([3, 2]);
    expect(distVariance(b3)).toEqual([3, 4]);
    const b4 = binomialLaw(4, f(1, 2));
    expect(b4.map(r => r.p)).toEqual([[1, 16], [1, 4], [3, 8], [1, 4], [1, 16]]);
    expect(distMean(b4)).toEqual([2, 1]);
    expect(distVariance(b4)).toEqual([1, 1]);
  });

  it('E = np and V = np(1-p) for several n and p; for p = 1/2: n/2 and n/4', () => {
    for (const [pn, pd] of [[1, 2], [1, 3], [1, 6], [7, 10]] as const) {
      const p = f(pn, pd);
      for (let n = 1; n <= 12; n++) {
        const d = binomialLaw(n, p);
        expect(sumIsOne(d)).toBe(true);
        expect(equals(distMean(d), mul(f(n), p))).toBe(true);
        expect(equals(distVariance(d), mul(f(n), mul(p, sub([1, 1], p))))).toBe(true);
        d.forEach(r => expect(sameRat(r.p, binomialPmf(n, p, r.value))).toBe(true));
      }
    }
    for (let n = 2; n <= 12; n++) {
      const d = binomialLaw(n, f(1, 2));
      expect(distMean(d)).toEqual(frac(n, 2));
      expect(distVariance(d)).toEqual(frac(n, 4));
    }
  });

  it('refuses an (n, p) whose exact law does not fit', () => {
    expect(() => binomialLaw(16, f(3, 10))).toThrow(EngineError);
  });
});

describe('symmetry and the sum check', () => {
  it('B(n, 1/2) is symmetric; B(n, 1/3) is not', () => {
    expect(isSymmetric(binomialLaw(4, f(1, 2)))).toBe(true);
    expect(isSymmetric(binomialLaw(5, f(1, 2)))).toBe(true);
    expect(isSymmetric(binomialLaw(4, f(1, 3)))).toBe(false);
  });
  it('the same-mean law (1/2, 0, 1/2) is symmetric, the law of the product is not', () => {
    expect(
      isSymmetric([
        { value: 1, p: f(1, 2) },
        { value: 2, p: f(0) },
        { value: 3, p: f(1, 2) },
      ]),
    ).toBe(true);
    expect(
      isSymmetric([
        { value: -2, p: f(1, 10) },
        { value: -1, p: f(2, 10) },
        { value: 0, p: f(6, 10) },
        { value: 2, p: f(1, 10) },
      ]),
    ).toBe(false);
  });
  it('sumIsOne: the evidence "sum 5/8" fails, 1 passes', () => {
    expect(sumIsOne([{ value: 0, p: f(1, 4) }, { value: 1, p: f(3, 8) }])).toBe(false);
    expect(sumIsOne([{ value: 0, p: f(1, 4) }, { value: 1, p: f(3, 4) }])).toBe(true);
  });
});

describe('lawFromPatterns: the law of "number of S" over a list of patterns', () => {
  const countS = (pattern: string) => pattern.split('S').length - 1;

  it('n = 4, uniform: counts 1, 4, 6, 4, 1 of 16', () => {
    const d = lawFromPatterns(enumeratePatterns(4, 0).concat(
      enumeratePatterns(4, 1),
      enumeratePatterns(4, 2),
      enumeratePatterns(4, 3),
      enumeratePatterns(4, 4),
    ), countS);
    expect(d.map(r => r.value)).toEqual([0, 1, 2, 3, 4]);
    expect(d.map(r => r.p)).toEqual([[1, 16], [1, 4], [3, 8], [1, 4], [1, 16]]);
  });

  it('with p = 1/3 on S the weights are p^s q^(n-s) and the law is the binomial one', () => {
    const patterns = [0, 1, 2, 3].flatMap(k => enumeratePatterns(3, k));
    expect(patterns).toHaveLength(8);
    const weights = patterns.map(p => patternWeight(p, f(1, 3)));
    expect(patternWeight('SFS', f(1, 3))).toEqual([2, 27]);
    expect(patternWeight('FFF', f(1, 3))).toEqual([8, 27]);
    const d = lawFromPatterns(patterns, countS, weights);
    expect(d.map(r => r.p)).toEqual([[8, 27], [4, 9], [2, 9], [1, 27]]);
    expect(d.map(r => r.p)).toEqual(binomialLaw(3, f(1, 3)).map(r => r.p));
  });

  it('a list with a missing or repeated pattern is not a sample space', () => {
    const six = enumeratePatterns(4, 2);
    expect(() => lawFromPatterns(six.concat('SSFF'), countS)).toThrow(EngineError); // duplicate
    expect(() => lawFromPatterns(['SS', 'SSS'], countS)).toThrow(EngineError); // lengths differ
    expect(() => lawFromPatterns([], countS)).toThrow(EngineError);
    // weights that do not sum to 1
    expect(() => lawFromPatterns(['S', 'F'], countS, [f(1, 2), f(1, 3)])).toThrow(EngineError);
  });
});
