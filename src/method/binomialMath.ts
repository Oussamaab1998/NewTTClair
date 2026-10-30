/**
 * Exact binomial numbers for the method lesson (Question 3): the probability
 * of one term, the mean and the variance of the number of successes, as
 * rationals of safe integers. A value that would pass 2^53 throws (the
 * graph builders and the loader refuse such a question, never a float).
 */
import {
  add,
  choose,
  EngineError,
  frac,
  mul,
  sub,
  type Fraction,
} from '../engine/rational';

const powFr = (x: Fraction, e: number): Fraction => {
  let r = frac(1);
  for (let i = 0; i < e; i++) {
    r = mul(r, x);
  }
  return r;
};

/** p^k q^(n-k): the probability of ONE sequence with k successes. */
export function sequenceProbability(
  n: number,
  k: number,
  p: Fraction,
): Fraction {
  assertCase(n, k);
  return mul(powFr(p, k), powFr(sub(frac(1), p), n - k));
}

/** C(n,k) p^k q^(n-k). */
export function binomialTerm(n: number, k: number, p: Fraction): Fraction {
  return mul(frac(choose(n, k)), sequenceProbability(n, k, p));
}

export const binomialMean = (n: number, p: Fraction): Fraction =>
  mul(frac(n), p);
export const binomialVariance = (n: number, p: Fraction): Fraction =>
  mul(frac(n), mul(p, sub(frac(1), p)));

/** The variance of ONE trial, computed from its two values (not from the formula p q). */
export function oneTrialVariance(p: Fraction): Fraction {
  const q = sub(frac(1), p);
  return add(mul(mul(p, p), q), mul(mul(q, q), p));
}

function assertCase(n: number, k: number): void {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 1 || k < 0 || k > n) {
    throw new EngineError('a binomial case needs 0 <= k <= n and n >= 1');
  }
}
