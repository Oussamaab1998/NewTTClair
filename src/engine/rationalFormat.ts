/**
 * Exact rationals for the probability components (docs/COMPONENTS_PROBABILITY_V2.md E2):
 * one formatter with the real minus sign (U+2212), exact decimals, and the
 * string form a rational takes in props and events ("1/6", "0,3"). Floats are
 * never used to print a probability.
 */
import { z } from 'zod';

import { fractionToLatex, parseNumeric } from './format';
import {
  EngineError,
  compare,
  frac,
  gcd,
  mul,
  type Fraction,
} from './rational';

const MINUS = '−';

/** `[-1, 2]` -> "−1/2", `[5, 1]` -> "5". Real minus sign. */
export function ratToString([num, den]: Fraction): string {
  const n = num < 0 ? `${MINUS}${Math.abs(num)}` : String(num);
  return den === 1 ? n : `${n}/${den}`;
}

/** Same LaTeX as `fractionToLatex`: `\frac{7}{10}`, `-\frac{1}{10}`. */
export const ratToLatex = fractionToLatex;

/**
 * The exact decimal with a French comma ("0,3", "−3,5"), or null when it never
 * ends (1/6) or has more than `maxDigits` digits (1/1024 at the default 6).
 */
export function ratToDecimal(f: Fraction, maxDigits = 6): string | null {
  const [num, den] = frac(f[0], f[1]);
  let rest = den;
  let twos = 0;
  let fives = 0;
  while (rest % 2 === 0) {
    rest /= 2;
    twos++;
  }
  while (rest % 5 === 0) {
    rest /= 5;
    fives++;
  }
  const digits = Math.max(twos, fives);
  if (rest !== 1 || digits > maxDigits) {
    return null;
  }
  if (digits === 0) {
    return num < 0 ? `${MINUS}${Math.abs(num)}` : String(num);
  }
  // 10^digits / den is an integer here: den divides 10^digits.
  const scaled = Math.abs(num) * (10 ** digits / den);
  if (!Number.isSafeInteger(scaled)) {
    return null;
  }
  const s = String(scaled).padStart(digits + 1, '0');
  const body = `${s.slice(0, s.length - digits)},${s.slice(s.length - digits)}`;
  return num < 0 ? `${MINUS}${body}` : body;
}

/** Exact value of a numeric string ("3/10", "0,3", "0.3", "−1/2"), or null. */
export function parseRat(input: string): Fraction | null {
  const r = parseNumeric(input);
  return r.ok ? r.value : null;
}

/**
 * A rational as an author or an event writes it: an integer, a decimal with
 * "." or ",", or `a/b` with b != 0. Strings only (tuples do not survive the
 * LLM strict-schema converter). Parsed exactly by `parseRat`.
 */
export const RatSchema = z
  .string()
  .regex(/^[-−]?(?:\d+\/\d+|\d+(?:[.,]\d+)?)$/)
  .refine(s => parseRat(s) !== null, { message: 'not an exact rational' });
export type RatString = z.infer<typeof RatSchema>;

/**
 * Equality of two fractions with no cross-multiplication: `frac` always
 * reduces, so equal values are equal tuples. `equals` multiplies the two
 * denominators and overflows on terms like 1/10^12.
 */
export const sameRat = (a: Fraction, b: Fraction): boolean => {
  const x = frac(a[0], a[1]);
  const y = frac(b[0], b[1]);
  return x[0] === y[0] && x[1] === y[1];
};

export const isInteger = (f: Fraction): boolean => frac(f[0], f[1])[1] === 1;

/** f × n for an integer n (36 × 1/6 = 6). */
export const mulInt = (f: Fraction, n: number): Fraction => mul(f, frac(n));

/** Largest integer <= f. */
export function floorRat(f: Fraction): number {
  const [num, den] = frac(f[0], f[1]);
  const r = ((num % den) + den) % den;
  return (num - r) / den;
}

export function minRat(xs: readonly Fraction[]): Fraction {
  if (xs.length === 0) {
    throw new EngineError('minRat of an empty list');
  }
  return xs.reduce((m, x) => (compare(x, m) < 0 ? x : m));
}

export function maxRat(xs: readonly Fraction[]): Fraction {
  if (xs.length === 0) {
    throw new EngineError('maxRat of an empty list');
  }
  return xs.reduce((m, x) => (compare(x, m) > 0 ? x : m));
}

/**
 * Exact sum over the least common denominator. `add` multiplies the two
 * denominators, so adding the 13 terms of B(12, 7/10) (all over 10^12) would
 * overflow although the sum is 1; this one does not.
 */
export function sumRat(xs: readonly Fraction[]): Fraction {
  let num = 0;
  let den = 1;
  for (const x of xs) {
    const [n, d] = frac(x[0], x[1]);
    const g = gcd(den, d);
    const lcm = (den / g) * d;
    const next = num * (lcm / den) + n * (lcm / d);
    if (!Number.isSafeInteger(lcm) || !Number.isSafeInteger(next)) {
      throw new EngineError(`integer out of safe range summing over ${lcm}`);
    }
    num = next;
    den = lcm;
    const r = gcd(num, den) || 1;
    num /= r;
    den /= r;
  }
  return frac(num, den);
}
