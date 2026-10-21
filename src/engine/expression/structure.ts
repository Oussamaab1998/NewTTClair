/**
 * Structure helpers for typed lines (README.md "Typed lines"): LaTeX of a
 * parsed line, where two fractions differ, and missing-parentheses readings.
 * Pure functions over the safe parser's AST; nothing is evaluated as code.
 */
import { checkEquivalence, type EquivalenceOptions } from './equivalence';
import { evaluateReal } from './evaluate';
import type { Node } from './parse';

/** Binding strength: 1 sum, 2 product / quotient, 3 sign, 4 power, 5 atom. */
export const precedence = (n: Node): number => {
  switch (n.type) {
    case 'binary':
      return n.op === '+' || n.op === '-' ? 1 : n.op === '^' ? 4 : 2;
    case 'unary':
      return 3;
    default:
      return 5;
  }
};

const paren = (s: string) => `\\left(${s}\\right)`;

/** LaTeX for the native renderer (lesson/math/latexSubset.ts). */
export function toLatex(n: Node): string {
  switch (n.type) {
    case 'num':
      return n.text.replace('.', '{,}');
    case 'const':
      return n.name === 'pi' ? '\\pi ' : 'e';
    case 'var':
      return n.name;
    case 'unary': {
      const inner = toLatex(n.arg);
      return n.op + (precedence(n.arg) <= 3 ? paren(inner) : inner);
    }
    case 'call': {
      const inner = toLatex(n.arg);
      if (n.fn === 'sqrt') {
        return `\\sqrt{${inner}}`;
      }
      if (n.fn === 'abs') {
        return `\\left|${inner}\\right|`;
      }
      return `\\${n.fn}${paren(inner)}`;
    }
    case 'binary': {
      const { op, left, right } = n;
      if (op === '/') {
        return `\\frac{${toLatex(left)}}{${toLatex(right)}}`;
      }
      if (op === '^') {
        const base = toLatex(left);
        return `${precedence(left) < 5 ? paren(base) : base}^{${toLatex(
          right,
        )}}`;
      }
      if (op === '+' || op === '-') {
        const r = toLatex(right);
        const wrap =
          right.type === 'unary' || (op === '-' && precedence(right) === 1);
        return `${toLatex(left)}${op}${wrap ? paren(r) : r}`;
      }
      // '*': fractions need no parentheses; sums and signed factors do.
      const side = (c: Node, isRight: boolean) => {
        const s = toLatex(c);
        const isFrac = c.type === 'binary' && c.op === '/';
        return !isFrac &&
          (precedence(c) === 1 || (isRight && precedence(c) === 3))
          ? paren(s)
          : s;
      };
      return `${side(left, false)}${n.implicit ? '' : '\\times '}${side(
        right,
        true,
      )}`;
    }
  }
}

/** Top-level numerator and denominator, or null. */
export function splitFraction(n: Node): { num: Node; den: Node } | null {
  return n.type === 'binary' && n.op === '/'
    ? { num: n.left, den: n.right }
    : null;
}

export interface Difference {
  where: 'numerator' | 'denominator' | 'both' | 'whole';
  /** First disagreeing sample point (nice points first): the student's own value. */
  at?: { x: number; student: number; expected: number };
}

/** Where a line differs from what it should equal (the caller knows they differ). */
export function locateDifference(
  student: Node,
  expected: Node,
  options: EquivalenceOptions = {},
): Difference {
  const whole = checkEquivalence(student, expected, options);
  const variable = options.variables?.[0] ?? 'x';
  const at =
    whole.verdict === 'different'
      ? {
          x: whole.counterexample.scope[variable] ?? 0,
          student: whole.counterexample.a,
          expected: whole.counterexample.b,
        }
      : undefined;
  const s = splitFraction(student);
  const e = splitFraction(expected);
  let where: Difference['where'] = 'whole';
  if (s && e) {
    const numOk =
      checkEquivalence(s.num, e.num, options).verdict === 'equivalent';
    const denOk =
      checkEquivalence(s.den, e.den, options).verdict === 'equivalent';
    where =
      numOk && !denOk ? 'denominator' : !numOk && denOk ? 'numerator' : 'both';
  }
  return at ? { where, at } : { where };
}

/** Flattens a left-associated chain of + and -. */
function terms(n: Node): { op: '+' | '-'; node: Node }[] {
  if (n.type === 'binary' && (n.op === '+' || n.op === '-')) {
    return [...terms(n.left), { op: n.op, node: n.right }];
  }
  return [{ op: '+', node: n }];
}

function chain(list: { op: '+' | '-'; node: Node }[]): Node {
  return list
    .slice(1)
    .reduce<Node>(
      (acc, t) => ({ type: 'binary', op: t.op, left: acc, right: t.node }),
      list[0]!.node,
    );
}

/**
 * "a/b + c" written for "a/(b + c)" (denominator), or "a + b/c" for
 * "(a + b)/c" (numerator): regroups the top-level sum and checks the target.
 */
export function missingParentheses(
  student: Node,
  target: Node,
  options: EquivalenceOptions = {},
): 'denominator' | 'numerator' | null {
  const list = terms(student);
  if (list.length < 2) {
    return null;
  }
  const same = (n: Node) =>
    checkEquivalence(n, target, options).verdict === 'equivalent';
  const first = splitFraction(list[0]!.node);
  if (first) {
    const den = chain([{ op: '+', node: first.den }, ...list.slice(1)]);
    if (same({ type: 'binary', op: '/', left: first.num, right: den })) {
      return 'denominator';
    }
  }
  const lastTerm = list[list.length - 1]!;
  const last = splitFraction(lastTerm.node);
  if (last) {
    const num = chain([
      ...list.slice(0, -1),
      { op: lastTerm.op, node: last.num },
    ]);
    if (same({ type: 'binary', op: '/', left: num, right: last.den })) {
      return 'numerator';
    }
  }
  return null;
}

/** Real value at x, for numeric checks shown to the student. */
export const valueAt = (n: Node, x: number, variable = 'x'): number =>
  evaluateReal(n, { [variable]: x });

/**
 * Canonical text of an expression up to the order of terms and factors
 * (a + b = b + a, a·b = b·a) and redundant parentheses; nothing else is
 * simplified. Used to tell when a line has reached the goal's written form.
 */
export function canonical(n: Node): string {
  const flat = (node: Node, ops: readonly string[]): Node[] =>
    node.type === 'binary' && ops.includes(node.op)
      ? [...flat(node.left, ops), ...flat(node.right, ops)]
      : [node];
  switch (n.type) {
    case 'num':
      return String(n.value);
    case 'const':
    case 'var':
      return n.name;
    case 'unary':
      return n.op === '+' ? canonical(n.arg) : `neg(${canonical(n.arg)})`;
    case 'call':
      return `${n.fn}(${canonical(n.arg)})`;
    case 'binary': {
      if (n.op === '+' || n.op === '*') {
        const parts = flat(n, [n.op]).map(canonical).sort();
        return `${n.op === '+' ? 'sum' : 'prod'}(${parts.join(',')})`;
      }
      return `${n.op}(${canonical(n.left)},${canonical(n.right)})`;
    }
  }
}

export const sameForm = (a: Node, b: Node): boolean =>
  canonical(a) === canonical(b);
