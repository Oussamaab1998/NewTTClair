/**
 * Exact fractions for probability answers (no floating point drift).
 * Numbers stay JS numbers; anything past 2^53 throws instead of losing precision.
 */
export type Fraction = readonly [num: number, den: number];

export class EngineError extends Error {
  override name = 'EngineError';
}

function assertSafe(n: number): number {
  if (!Number.isSafeInteger(n)) {
    throw new EngineError(`integer out of safe range: ${n}`);
  }
  return n;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

/** Reduced fraction with a positive denominator. */
export function frac(num: number, den = 1): Fraction {
  assertSafe(num);
  assertSafe(den);
  if (den === 0) {
    throw new EngineError('zero denominator');
  }
  const g = gcd(num, den) || 1;
  const sign = den < 0 ? -1 : 1;
  // `+ 0` turns -0 into 0 so results compare equal with toEqual.
  return [(sign * num) / g + 0, (sign * den) / g];
}

export const add = (a: Fraction, b: Fraction): Fraction =>
  frac(
    assertSafe(a[0] * b[1]) + assertSafe(b[0] * a[1]),
    assertSafe(a[1] * b[1]),
  );
export const neg = (a: Fraction): Fraction => frac(-a[0], a[1]);
export const sub = (a: Fraction, b: Fraction): Fraction => add(a, neg(b));
export const mul = (a: Fraction, b: Fraction): Fraction =>
  frac(assertSafe(a[0] * b[0]), assertSafe(a[1] * b[1]));
export function div(a: Fraction, b: Fraction): Fraction {
  if (b[0] === 0) {
    throw new EngineError('division by zero');
  }
  return mul(a, [b[1], b[0]]);
}
/** Integer power (negative exponents allowed when the base is non-zero). */
export function pow(a: Fraction, e: number): Fraction {
  if (!Number.isInteger(e)) {
    throw new EngineError('non-integer exponent');
  }
  const base = e < 0 ? div([1, 1], a) : a;
  let out: Fraction = [1, 1];
  for (let i = 0; i < Math.abs(e); i++) {
    out = mul(out, base);
  }
  return out;
}
export const compare = (a: Fraction, b: Fraction): number =>
  Math.sign(assertSafe(a[0] * b[1]) - assertSafe(b[0] * a[1]));
export const equals = (a: Fraction, b: Fraction): boolean =>
  compare(a, b) === 0;
export const toNumber = (a: Fraction): number => a[0] / a[1];

/** Smallest integer >= a (integer arithmetic, den > 0 after `frac`). */
export function ceil(a: Fraction): number {
  const [num, den] = frac(a[0], a[1]);
  const r = ((num % den) + den) % den;
  return (num - r) / den + (r === 0 ? 0 : 1);
}

/** C(n, k), exact. */
export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0) {
    throw new EngineError('choose needs non-negative integers');
  }
  if (k > n) {
    return 0;
  }
  let out = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) {
    out = assertSafe((out * (n - i + 1)) / i);
  }
  return out;
}
