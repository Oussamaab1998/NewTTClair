/**
 * Standing checks (docs/METHOD_LESSON_PLAN.md 8.5): small predicates the
 * engine triggers, each a step the student does himself. They never print a
 * value: `multiplyBackCheck` returns the product to compute, built from the
 * student's own numbers, and the expected result is his own dividend.
 */
import { evaluateExact, type Node } from '../engine/expression';
import { compare, frac, type Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import type { Unit } from './graph';
import { evalChain, type ChainResult } from './lineChain';

/** "Can this be a probability?": above 1 or below 0. */
export const aboveOne = (v: Fraction): boolean => !inRange(v);
export const inRange = (v: Fraction): boolean =>
  compare(v, frac(0)) >= 0 && compare(v, frac(1)) <= 0;

/** An ordered count and a group count are not the same kind of number. */
export function unitsMismatch(a: Unit, b: Unit): boolean {
  const kind = (u: Unit) => (u === 'ordered' || u === 'groups' ? u : null);
  const x = kind(a);
  const y = kind(b);
  return x !== null && y !== null && x !== y;
}

export const targetMatch = (target: Fraction, value: Fraction): boolean =>
  sameRat(target, value);

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);

/** Written `a/b` with whole numbers that still share a factor (25/55). */
export function isUnreducedFraction(n: Node): boolean {
  return (
    n.type === 'binary' &&
    n.op === '/' &&
    n.left.type === 'num' &&
    n.right.type === 'num' &&
    Number.isInteger(n.left.value) &&
    Number.isInteger(n.right.value) &&
    n.right.value !== 0 &&
    gcd(n.left.value, n.right.value) > 1
  );
}

export interface MultiplyBack {
  /** The product the student is asked to compute, from his own numbers: `55*6`. */
  expr: string;
  /** His own dividend: the product must come back to it. */
  expected: Fraction;
  /** Does a line he wrote close the check (its last side is the dividend, the first side is the product asked)? */
  closedBy: (raw: string) => boolean;
}

/** The text after the last "/" or "÷" that is not inside parentheses. */
function topLevelDivisor(raw: string): string | null {
  let depth = 0;
  let at = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (depth === 0 && (ch === '/' || ch === '÷')) {
      at = i;
    }
  }
  return at < 0 ? null : raw.slice(at + 1).trim();
}

/** For a chain whose first side is a division `a / b = q`: check q x b = a. */
export function multiplyBackCheck(
  line: Extract<ChainResult, { kind: 'chain' }>,
): MultiplyBack | null {
  const first = line.sides[0]!;
  const a = first.ast;
  if (a.type !== 'binary' || a.op !== '/') {
    return null;
  }
  const divisor = topLevelDivisor(first.raw);
  const expected = evaluateExact(a.left);
  if (divisor === null || divisor === '' || expected === null) {
    return null;
  }
  const q = line.sides[line.sides.length - 1]!.raw;
  const wrapQ = /^[\d.,]+$/.test(q) ? q : `(${q})`;
  return {
    expr: `${wrapQ}*${divisor}`,
    expected,
    closedBy: (raw: string) => {
      const r = evalChain(raw);
      return r.kind === 'chain' && r.equal && sameRat(r.value, expected);
    },
  };
}
