/**
 * A written line is a chain of sides separated by "=": `336 ÷ 6 = 56`
 * (docs/METHOD_LESSON_PLAN.md section 8.1). Every side goes through the safe
 * parser (no `eval`, no letters, no powers: the pad has no such keys) and is
 * evaluated EXACTLY (rationals; a value past the safe integers is "not a
 * number", never a float). Nothing here grades a line: it only says what the
 * line is and whether its sides agree.
 */
import {
  evaluateExact,
  parseExpression,
  toLatex,
  type Node,
} from '../engine/expression';
import type { Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';

/** Same limit as the lines editor (`LINE_MAX` in the lesson reducer). */
export const LINE_MAX = 200;

export type ChainFailure = 'empty' | 'syntax' | 'too_long' | 'not_a_number';

export interface Side {
  raw: string;
  ast: Node;
  value: Fraction;
}

export type ChainResult =
  | { kind: 'unreadable'; reason: ChainFailure; side?: number }
  /** One side that is a plain number (`120`, `0,5`, `-3`). */
  | { kind: 'bare'; side: Side; value: Fraction }
  /** One side with an operator and no "=" yet (`8+3`, `10×9×8÷(3×2×1)`). */
  | { kind: 'unfinished'; side: Side; value: Fraction }
  /** Two or more sides. `value` is the last side's. `mismatchAt` is the first i with side i != side i+1. */
  | {
      kind: 'chain';
      sides: Side[];
      equal: boolean;
      value: Fraction;
      mismatchAt?: number;
    };

const unreadable = (reason: ChainFailure, side?: number): ChainResult =>
  side === undefined
    ? { kind: 'unreadable', reason }
    : { kind: 'unreadable', reason, side };

const isPlainNumber = (n: Node): boolean =>
  n.type === 'num' || (n.type === 'unary' && n.arg.type === 'num');

/**
 * A lone `a/b` of two numbers whose value is NOT a whole number (`7/2`,
 * `1/128`) is a result in fraction form, not a computation waiting for its
 * "=": it is read as a value. `720/6` (a whole quotient) stays unfinished.
 */
const isFractionResult = (s: Side): boolean =>
  s.ast.type === 'binary' &&
  s.ast.op === '/' &&
  s.ast.left.type === 'num' &&
  s.ast.right.type === 'num' &&
  s.value[1] !== 1;

function parseSide(raw: string, index: number): Side | ChainResult {
  const p = parseExpression(raw, { variables: [], constants: [] });
  if (!p.ok) {
    return unreadable(
      p.error.code === 'too_long' ? 'too_long' : 'syntax',
      index,
    );
  }
  const value = evaluateExact(p.ast);
  if (value === null) {
    return unreadable('not_a_number', index);
  }
  return { raw: raw.trim(), ast: p.ast, value };
}

/**
 * Parses and evaluates a whole line. Never throws. Powers are refused (the
 * pad has no such key) unless `allowPow` (a line typed as free text, AI tutor).
 */
export function evalChain(
  raw: string,
  opts: { allowPow?: boolean } = {},
): ChainResult {
  if (raw.trim() === '') {
    return unreadable('empty');
  }
  if (raw.length > LINE_MAX) {
    return unreadable('too_long');
  }
  if (opts.allowPow !== true && raw.includes('^')) {
    return unreadable('syntax');
  }
  const parts = raw.split('=');
  const sides: Side[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.trim() === '') {
      return unreadable('syntax', i);
    }
    const s = parseSide(part, i);
    if ('kind' in s) {
      return s;
    }
    sides.push(s);
  }
  if (sides.length === 1) {
    const side = sides[0]!;
    return isPlainNumber(side.ast) || isFractionResult(side)
      ? { kind: 'bare', side, value: side.value }
      : { kind: 'unfinished', side, value: side.value };
  }
  let mismatchAt: number | undefined;
  for (let i = 0; i + 1 < sides.length; i++) {
    if (!sameRat(sides[i]!.value, sides[i + 1]!.value)) {
      mismatchAt = i;
      break;
    }
  }
  const last = sides[sides.length - 1]!;
  return {
    kind: 'chain',
    sides,
    equal: mismatchAt === undefined,
    value: last.value,
    ...(mismatchAt !== undefined && { mismatchAt }),
  };
}

/**
 * The student's own line with "≠" where two sides disagree. It repeats only
 * what he typed: a side's value may be the expected one, so none is computed
 * for display (plan 4.4, rule 2).
 */
export function mismatchLine(raw: string, mismatchAt: number): string {
  const parts = raw.split('=').map(p => p.trim());
  return parts
    .map((p, i) =>
      i === 0 ? p : `${i - 1 === mismatchAt ? ' ≠ ' : ' = '}${p}`,
    )
    .join('');
}

/** LaTeX of what he typed, side by side with "=": his own writing, never recomputed. */
export function lineLatex(raw: string): string {
  return raw
    .split('=')
    .map(part => {
      const p = parseExpression(part, { variables: [], constants: [] });
      return p.ok ? toLatex(p.ast) : part.trim();
    })
    .join(' = ');
}
