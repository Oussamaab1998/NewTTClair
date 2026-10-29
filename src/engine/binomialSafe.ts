/**
 * How far the exact binomial can go (docs/COMPONENTS_PROBABILITY_V2.md E8).
 * Rationals are JS numbers: a pmf term C(n,k) p^k q^(n-k) over 10^n stops
 * fitting 2^53 at n = 16 when p has a denominator of 10 (n = 21 for 1/6,
 * n = 53 for 1/2). Sums over the terms stop earlier: E(X^2), hence V(X) written
 * as E(X^2) - E(X)^2, overflows for B(15, 7/10) (an intermediate numerator of
 * about 2e16) although every term and the mean are exact. So the
 * BinomialExplorer shows each term, np and npq (closed forms), and never adds
 * the terms up to get a moment. `binomialSafe` is exactly that: every term, np and npq.
 * The loader rejects a slider range that fails it (product owner, 2026-10-27:
 * keep numbers, reject n > 15 for p with a denominator of 10).
 */
import { binomialExpectation, binomialPmf } from './probability';
import {
  EngineError,
  compare,
  frac,
  mul,
  sub,
  type Fraction,
} from './rational';

export type BinomialSafety =
  | { ok: true }
  | {
      ok: false;
      reason: 'bad_n' | 'bad_p' | 'overflow';
      n: number;
      p: Fraction;
    };

const ZERO: Fraction = [0, 1];
const ONE: Fraction = [1, 1];

/** Every pmf term, np and npq are exact for B(n, p). Never throws. */
export function binomialSafe(n: number, p: Fraction): BinomialSafety {
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, reason: 'bad_n', n, p };
  }
  const q = sub(ONE, p);
  if (compare(p, ZERO) < 0 || compare(q, ZERO) < 0) {
    return { ok: false, reason: 'bad_p', n, p };
  }
  try {
    for (let k = 0; k <= n; k++) {
      binomialPmf(n, p, k);
    }
    binomialExpectation(n, p);
    mul(frac(n), mul(p, q));
    return { ok: true };
  } catch (e) {
    if (e instanceof EngineError) {
      return { ok: false, reason: 'overflow', n, p };
    }
    throw e;
  }
}

/** Largest n <= limit such that every m = 1..n is safe (0 if even n = 1 is not). */
export function maxSafeN(p: Fraction, limit = 60): number {
  let best = 0;
  for (let n = 1; n <= limit; n++) {
    if (!binomialSafe(n, p).ok) {
      break;
    }
    best = n;
  }
  return best;
}

/** A whole slider range: every n in [nMin, nMax] against every p of the grid. */
export function checkBinomialGrid(
  nMin: number,
  nMax: number,
  ps: readonly Fraction[],
): BinomialSafety {
  if (!Number.isInteger(nMin) || !Number.isInteger(nMax) || nMin < 1 || nMax < nMin) {
    return { ok: false, reason: 'bad_n', n: nMin, p: ps[0] ?? ZERO };
  }
  if (ps.length === 0) {
    return { ok: false, reason: 'bad_p', n: nMin, p: ZERO };
  }
  for (let n = nMin; n <= nMax; n++) {
    for (const p of ps) {
      const r = binomialSafe(n, p);
      if (!r.ok) {
        return r;
      }
    }
  }
  return { ok: true };
}
