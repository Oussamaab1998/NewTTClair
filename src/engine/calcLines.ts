/**
 * The calculation a student did, written as LaTeX lines BY THE ENGINE from
 * the numbers they used (docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md,
 * change 4: `calc` of a finding). The result is always computed from the
 * operands, never copied from props or from a model, so a wrong method shows
 * its own wrong number (720 / 3 = 240). Textbook notation C_n^k is the
 * default display form; `\binom` is available for older content.
 */
import { arrangements, choose, factorial } from './combinatorics';
import { ratToLatex } from './rationalFormat';
import {
  EngineError,
  add,
  div,
  frac,
  mul,
  type Fraction,
} from './rational';

type Operand = number | Fraction;
const q = (x: Operand): Fraction => (typeof x === 'number' ? frac(x) : frac(x[0], x[1]));
const tex = (x: Operand): string => ratToLatex(q(x));

function atLeastTwo(xs: readonly Operand[]): void {
  if (xs.length < 2) {
    throw new EngineError('an operation needs at least two operands');
  }
}

/** `4 \times 15 = 60` */
export function productLine(factors: readonly Operand[]): string {
  atLeastTwo(factors);
  const result = factors.map(q).reduce((p, x) => mul(p, x));
  return `${factors.map(tex).join(' \\times ')} = ${ratToLatex(result)}`;
}

/** `4 + 15 = 19` */
export function sumLine(terms: readonly Operand[]): string {
  atLeastTwo(terms);
  const result = terms.map(q).reduce((s, x) => add(s, x));
  return `${terms.map(tex).join(' + ')} = ${ratToLatex(result)}`;
}

/** `\frac{720}{6} = 120` (the quotient of the two numbers the student divided). */
export function divisionLine(a: Operand, b: Operand): string {
  const result = div(q(a), q(b)); // throws on a zero divisor
  return `\\frac{${tex(a)}}{${tex(b)}} = ${ratToLatex(result)}`;
}

/** `C_{6}^{2} = 15`, or `\binom{6}{2} = 15` with style 'binom'. */
export function chooseLine(
  n: number,
  k: number,
  style: 'textbook' | 'binom' = 'textbook',
): string {
  const value = choose(n, k);
  return style === 'binom'
    ? `\\binom{${n}}{${k}} = ${value}`
    : `C_{${n}}^{${k}} = ${value}`;
}

/**
 * `C_{6}^{2} = C_{6}^{4} = 15`: choosing the k balls to take is choosing the
 * n - k balls to leave. Refused when k = n - k (swapping S and F changes
 * nothing, so there is nothing to show).
 */
export function chooseSymmetryLine(n: number, k: number): string {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) {
    throw new EngineError('k must be an integer from 0 to n');
  }
  if (2 * k === n) {
    throw new EngineError('k equals n - k: swapping S and F changes nothing');
  }
  return `C_{${n}}^{${k}} = C_{${n}}^{${n - k}} = ${choose(n, k)}`;
}

/** `A_{10}^{3} = 720` */
export function arrangementLine(n: number, k: number): string {
  return `A_{${n}}^{${k}} = ${arrangements(n, k)}`;
}

/** `3! = 6` */
export function factorialLine(n: number): string {
  return `${n}! = ${factorial(n)}`;
}
