/**
 * Display and input helpers for exact values: fraction -> LaTeX / plain text,
 * and student numeric input -> exact fraction through the safe parser.
 */
import { evaluateExact, parseExpression } from './expression';
import type { Fraction } from './rational';

/** `[7, 10]` -> `\frac{7}{10}`, `[3, 1]` -> `3`, `[-1, 10]` -> `-\frac{1}{10}`. */
export function fractionToLatex([num, den]: Fraction): string {
  if (den === 1) {
    return String(num);
  }
  const sign = num < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(num)}}{${den}}`;
}

/** `[7, 10]` -> `7/10` (exam-paper lines, accessibility labels). */
export function fractionToPlain([num, den]: Fraction): string {
  return den === 1 ? String(num) : `${num}/${den}`;
}

export type NumericParse =
  | { ok: true; value: Fraction }
  | { ok: false; reason: 'syntax' | 'not_a_number' };

/**
 * Exact value of a constant numeric input ("0,7", "7/10", "1 - 3/10").
 * No variables are allowed; never evaluates code.
 */
export function parseNumeric(input: string): NumericParse {
  const parsed = parseExpression(input, { variables: [], constants: [] });
  if (!parsed.ok) {
    return { ok: false, reason: 'syntax' };
  }
  const value = evaluateExact(parsed.ast);
  return value ? { ok: true, value } : { ok: false, reason: 'not_a_number' };
}
