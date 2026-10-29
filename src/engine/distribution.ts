/**
 * Distribution helpers (docs/COMPONENTS_PROBABILITY_V2.md E4): mean, E(X^2),
 * variance, the distance / square / contribution of each value, binomial laws,
 * symmetry and sum checks, the law of a rule over a list of patterns. Values
 * are integers, probabilities exact fractions; nothing is a float. The
 * existing `expectation` / `variance` in probability.ts return exact values
 * too (plus a decimal for display); these return the bare fraction and are
 * tested against them.
 */
import { enumeratePatterns } from './combinatorics';
import { binomialPmf } from './probability';
import { sameRat, sumRat } from './rationalFormat';
import {
  EngineError,
  compare,
  equals,
  frac,
  mul,
  pow,
  sub,
  type Fraction,
} from './rational';

export interface DistRow {
  value: number;
  p: Fraction;
}
export type Dist = readonly DistRow[];

export interface SpreadRow {
  x: number;
  p: Fraction;
  /** Signed gap to the mean, x - mean. */
  d: Fraction;
  /** Distance to the mean, |x - mean|: the segment on the number line. */
  dist: Fraction;
  /** Squared distance: the square. */
  d2: Fraction;
  /** Contribution p x d2: a piece of the stacked bar. */
  w: Fraction;
}
export interface SpreadFrame {
  mean: Fraction;
  rows: SpreadRow[];
  /** The sum of the contributions. */
  variance: Fraction;
}

const ZERO: Fraction = [0, 1];
const ONE: Fraction = [1, 1];

const sumOf = sumRat;

/** True when the probabilities add up to exactly 1. */
export const sumIsOne = (d: Dist): boolean =>
  equals(sumOf(d.map(r => r.p)), ONE);

/** Throws unless `d` is a law: distinct integer values, p >= 0, sum 1. */
export function assertDist(d: Dist): void {
  if (d.length === 0) {
    throw new EngineError('a law needs at least one value');
  }
  if (new Set(d.map(r => r.value)).size !== d.length) {
    throw new EngineError('duplicate value in the law');
  }
  for (const r of d) {
    if (!Number.isInteger(r.value)) {
      throw new EngineError('law values must be integers');
    }
    if (compare(r.p, ZERO) < 0) {
      throw new EngineError('a probability cannot be negative');
    }
  }
  if (!sumIsOne(d)) {
    throw new EngineError('the probabilities of a law add up to 1');
  }
}

/** E(X) = sum of x p. */
export const distMean = (d: Dist): Fraction =>
  sumOf(d.map(r => mul(frac(r.value), r.p)));

/** E(X^2) = sum of x^2 p. */
export const distSecondMoment = (d: Dist): Fraction =>
  sumOf(d.map(r => mul(frac(r.value * r.value), r.p)));

/** V(X) = E(X^2) - E(X)^2. */
export function distVariance(d: Dist): Fraction {
  const m = distMean(d);
  return sub(distSecondMoment(d), mul(m, m));
}

/**
 * The rows the SpreadSlider draws: for each value its distance to the mean
 * (segment), the square of that distance, and its contribution p x square;
 * the contributions add up to the variance.
 */
export function spreadFrame(
  values: readonly number[],
  probabilities: readonly Fraction[],
): SpreadFrame {
  if (values.length !== probabilities.length) {
    throw new EngineError('one probability per value');
  }
  const d: Dist = values.map((value, i) => ({
    value,
    p: probabilities[i]!,
  }));
  assertDist(d);
  const mean = distMean(d);
  const rows = d.map<SpreadRow>(r => {
    const gap = sub(frac(r.value), mean);
    const dist = frac(Math.abs(gap[0]), gap[1]);
    const d2 = mul(gap, gap);
    return { x: r.value, p: r.p, d: gap, dist, d2, w: mul(r.p, d2) };
  });
  return { mean, rows, variance: sumOf(rows.map(r => r.w)) };
}

/** P(values[1]) = p, P(values[0]) = 1 - p. */
export function bernoulliDist(
  values: readonly [number, number],
  p: Fraction,
): Dist {
  const q = sub(ONE, p);
  if (compare(p, ZERO) < 0 || compare(q, ZERO) < 0) {
    throw new EngineError('p must be between 0 and 1');
  }
  return [
    { value: values[0], p: q },
    { value: values[1], p },
  ];
}

/** B(n, p): values 0..n with P(X = k) = C(n,k) p^k q^(n-k). Throws if it does not fit exactly. */
export function binomialLaw(n: number, p: Fraction): Dist {
  return Array.from({ length: n + 1 }, (_, k) => ({
    value: k,
    p: binomialPmf(n, p, k),
  }));
}

/** p(x) = p(min + max - x) for every value: the law mirrors about the middle of its range. */
export function isSymmetric(d: Dist): boolean {
  if (d.length === 0) {
    return false;
  }
  const values = d.map(r => r.value);
  const centre = Math.min(...values) + Math.max(...values);
  const at = new Map(d.map(r => [r.value, r.p]));
  return d.every(r => sameRat(r.p, at.get(centre - r.value) ?? ZERO));
}

/** p^s q^(n-s) for a pattern of S and F with s letters S. */
export function patternWeight(pattern: string, p: Fraction): Fraction {
  const s = pattern.split('S').length - 1;
  return mul(pow(p, s), pow(sub(ONE, p), pattern.length - s));
}

/**
 * The law of `rule` (pattern -> integer) over a list of equally long, distinct
 * patterns. Weights default to uniform (1 / length); given weights must be
 * >= 0 and add up to 1.
 */
export function lawFromPatterns(
  patterns: readonly string[],
  rule: (pattern: string) => number,
  weights?: readonly Fraction[],
): Dist {
  if (patterns.length === 0) {
    throw new EngineError('no patterns');
  }
  if (new Set(patterns).size !== patterns.length) {
    throw new EngineError('a pattern is listed twice');
  }
  if (new Set(patterns.map(p => p.length)).size !== 1) {
    throw new EngineError('patterns have different lengths');
  }
  if (weights !== undefined && weights.length !== patterns.length) {
    throw new EngineError('one weight per pattern');
  }
  const w = weights ?? patterns.map(() => frac(1, patterns.length));
  if (w.some(x => compare(x, ZERO) < 0) || !equals(sumOf(w), ONE)) {
    throw new EngineError('the weights must be >= 0 and add up to 1');
  }
  const byValue = new Map<number, Fraction[]>();
  patterns.forEach((pattern, i) => {
    const v = rule(pattern) + 0;
    byValue.set(v, [...(byValue.get(v) ?? []), w[i]!]);
  });
  return [...byValue.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, ps]) => ({ value, p: sumOf(ps) }));
}

/** Every pattern of n slots, grouped by number of S (0..n): the whole sample space of n trials. */
export const allPatterns = (n: number): string[] =>
  Array.from({ length: n + 1 }, (_, k) => enumeratePatterns(n, k)).flat();
