/**
 * A written line is a chain of sides separated by "=": `336 ÷ 6 = 56`
 * (docs/METHOD_LESSON_PLAN.md section 8.1). Every side goes through the safe
 * parser (no `eval`, no letters, no powers: the pad has no such keys) and is
 * evaluated EXACTLY (rationals; a value past the safe integers is "not a
 * number", never a float). The counting keys' notation, C(n,k) (the worksheet
 * writes `C((10),(3))`), A(n,k) and n!, is read as the product a student
 * writes for it (`expandCounting`), so `C(10,3) = 120` keeps the factors of
 * `10*9*8/(3*2*1)` (fix list B5). Nothing here grades a line: it only says
 * what the line is and whether its sides agree.
 */
import {
  evaluateExact,
  parseExpression,
  toLatex,
  type Node,
} from '../engine/expression';
import {
  expandCounting,
  rewriteCounting,
} from '../engine/expression/counting';
import { splitLabels } from './exprLine';
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
/** `a/b` of two written numbers, or its opposite (`-1/10`, an expectation). */
const isWrittenFraction = (n: Node): boolean => {
  const inner = n.type === 'unary' && n.op === '-' ? n.arg : n;
  if (inner.type !== 'binary' || inner.op !== '/') {
    return false;
  }
  const left =
    inner.left.type === 'unary' && inner.left.op === '-'
      ? inner.left.arg
      : inner.left;
  return left.type === 'num' && inner.right.type === 'num';
};

const isFractionResult = (s: Side): boolean =>
  isWrittenFraction(s.ast) && s.value[1] !== 1;

/**
 * A side that is only a value, with no calculation in it: a number, a signed
 * number, or `a/b` of two written numbers (`1/4`, `3/12`, `-1/10`).
 */
export const isLiteralValue = (n: Node): boolean =>
  isPlainNumber(n) || isWrittenFraction(n);

/** C(…), A(…) or a "!": the counting keys' notation. */
const COUNTING = /[CA]\s*\(|!/;

function parseSide(raw: string, index: number): Side | ChainResult {
  let text = raw;
  if (COUNTING.test(raw)) {
    const n = expandCounting(raw);
    if (!n.ok) {
      return unreadable(
        n.reason === 'too_large' ? 'not_a_number' : 'syntax',
        index,
      );
    }
    text = n.text;
  }
  const p = parseExpression(text, { variables: [], constants: [] });
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

/** Letters the parser reads as variables while a C( ), an A( ) or a "!" is held aside. */
const HELD = ['Q', 'U', 'V', 'W', 'Y', 'Z', 'B', 'D', 'F', 'G', 'H', 'J'];

/** The Tunisian writing: C_{n}^{p}, A_{n}^{p}, n!. */
const countingTex = (kind: 'C' | 'A' | '!', a: number, b: number): string =>
  kind === '!' ? `${a}!` : `${kind}_{${a}}^{${b}}`;

/** One side as LaTeX; its counting notation stays notation (never its value). */
function sideLatex(part: string): string {
  const plain = parseExpression(part, { variables: [], constants: [] });
  if (plain.ok) {
    return toLatex(plain.ast);
  }
  // A line with a letter (f(−x), a formula in n): x, n and e are read.
  if (/[xne]/.test(part) && !/[CA]\s*\(/.test(part)) {
    const lettered = parseExpression(part, { variables: ['x', 'n'] });
    if (lettered.ok) {
      return toLatex(lettered.ast);
    }
  }
  if (!COUNTING.test(part)) {
    return part.trim();
  }
  const held = new Map<string, string>();
  const r = rewriteCounting(part, (kind, a, b) => {
    const name = HELD[held.size];
    if (name === undefined) {
      throw new Error('too many counting terms');
    }
    held.set(name, countingTex(kind, a, b));
    return name;
  });
  if (!r.ok) {
    return part.trim();
  }
  const p = parseExpression(r.text, {
    variables: [...held.keys(), 'n', 'x'],
    constants: [],
  });
  if (!p.ok) {
    return part.trim();
  }
  return toLatex(p.ast).replace(/[A-Z]/g, c => held.get(c) ?? c);
}

/** LaTeX of what he typed, side by side with "=": his own writing, never recomputed. */
export function lineLatex(raw: string): string {
  // A leading label keeps its own "=" (`P(Y=1) = ...`).
  const { labels, body } = splitLabels(raw);
  return [...labels, ...body.split('=')]
    .map(part => {
      try {
        return sideLatex(part);
      } catch {
        return part.trim();
      }
    })
    .join(' = ');
}
