/**
 * Concrete functions for the drills (docs/FORMULAS_PLAN.md, stage 2): small
 * families with whole coefficients and their exact derivatives, put into a
 * rule's law by substitution. Everything is an engine expression, so the
 * drills judge and draw what the law says (law.ts checked the law itself).
 *
 * `instantiate(rule, seed)` gives f, the expected f′ and each trap's f′ for
 * one seed; `tidy` makes a substituted expression readable (4·3 → 12,
 * x^(5−1) → x⁴, 1·v → v) without changing its value (tested).
 */
import { checkEquivalence, precedence, type Node } from '../../engine/expression';
import { rng } from '../../engine/expression/equivalence';
import { parseInX, parseLaw } from '../law';
import type { FormulaRule } from '../schema';

/** A function of x with its derivative, both as engine expressions. */
export interface Part {
  f: string;
  d: string;
}

export type Family = 'lin' | 'quad' | 'quadPos' | 'mono';

const pick = <T>(r: () => number, xs: readonly T[]): T =>
  xs[Math.floor(r() * xs.length)]!;

/** "3x^2", "-x", "5", "x" from a coefficient and a power. */
function term(coef: number, power: number): string {
  if (power === 0) {
    return String(coef);
  }
  const c = coef === 1 ? '' : coef === -1 ? '-' : String(coef);
  return power === 1 ? `${c}x` : `${c}x^${power}`;
}

const plus = (a: string, b: number): string =>
  b === 0 ? a : b > 0 ? `${a}+${b}` : `${a}${b}`;

/** One function of a family, for this random draw. */
export function partOf(family: Family, r: () => number): Part {
  switch (family) {
    case 'lin': {
      const a = pick(r, [1, 2, 3, 4, -1, -2, -3]);
      const b = pick(r, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      return { f: plus(term(a, 1), b), d: String(a) };
    }
    case 'quad': {
      const c = pick(r, [-4, -1, 1, 2, 3, 5]);
      return { f: plus('x^2', c), d: '2x' };
    }
    case 'quadPos': {
      const c = pick(r, [1, 2, 3, 4, 5]);
      return { f: plus('x^2', c), d: '2x' };
    }
    case 'mono': {
      const a = pick(r, [1, 2, 3, -1]);
      const m = pick(r, [2, 3, 4]);
      return { f: term(a, m), d: term(a * m, m - 1) };
    }
  }
}

/** How each rule's «Calcule» functions are drawn. */
interface Spec {
  u?: readonly Family[];
  v?: readonly Family[];
  n?: readonly number[];
  k?: readonly number[];
  /** A rule on x itself: f is k times the law's function. */
  scale?: readonly number[];
}

export const SPECS: Readonly<Record<string, Spec>> = {
  'deriv.power_x': { n: [3, 4, 5, 6, 7], scale: [1, 2, 3, 4, -2] },
  'deriv.sqrt_x': { scale: [2, 3, 4, 6, -2] },
  'deriv.inv_x': { scale: [2, 3, 5, 7, -4] },
  'deriv.sum': { u: ['mono'], v: ['lin'] },
  'deriv.scalar': { u: ['quad', 'lin', 'mono'], k: [3, 5, 7, -2, 4] },
  'deriv.product': { u: ['lin'], v: ['quad'] },
  'deriv.inv_v': { v: ['quadPos', 'lin'] },
  'deriv.quotient': { u: ['lin'], v: ['lin'] },
  'deriv.power_u': { u: ['lin'], n: [2, 3, 4, 5] },
  'deriv.sqrt_u': { u: ['quadPos', 'lin'] },
  'deriv.exp_u': { u: ['lin', 'quad'] },
  'deriv.ln_u': { u: ['quadPos', 'lin'] },
};

export function hasSpec(ruleId: string): boolean {
  return Object.hasOwn(SPECS, ruleId);
}

// Building nodes.

export function num(value: number): Node {
  return value < 0
    ? { type: 'unary', op: '-', arg: num(-value) }
    : { type: 'num', value, text: String(value) };
}

function substitute(node: Node, map: Readonly<Record<string, Node>>): Node {
  switch (node.type) {
    case 'var':
      return map[node.name] ?? node;
    case 'unary':
      return { ...node, arg: substitute(node.arg, map) };
    case 'call':
      return { ...node, arg: substitute(node.arg, map) };
    case 'binary':
      return {
        ...node,
        left: substitute(node.left, map),
        right: substitute(node.right, map),
      };
    default:
      return node;
  }
}

/** k times an expression, with k put where a reader expects it. */
function scaled(k: number, node: Node): Node {
  if (k === 1) {
    return node;
  }
  if (node.type === 'unary' && node.op === '-') {
    return { type: 'unary', op: '-', arg: scaled(k, node.arg) };
  }
  if (node.type === 'binary' && node.op === '/') {
    return { ...node, left: scaled(k, node.left) };
  }
  return { type: 'binary', op: '*', left: num(k), right: node, implicit: true };
}

// Tidying for display (never changes the value).

function constOf(node: Node): number | null {
  if (node.type === 'num') {
    return node.value;
  }
  if (node.type === 'unary' && node.op === '-' && node.arg.type === 'num') {
    return -node.arg.value;
  }
  return null;
}

function isNegative(node: Node): boolean {
  const c = constOf(node);
  if (c !== null) {
    return c < 0;
  }
  if (node.type === 'unary') {
    return node.op === '-';
  }
  return (
    node.type === 'binary' &&
    (node.op === '*' || node.op === '/') &&
    isNegative(node.left)
  );
}

function negate(node: Node): Node {
  const c = constOf(node);
  if (c !== null) {
    return num(-c);
  }
  if (node.type === 'unary' && node.op === '-') {
    return node.arg;
  }
  if (node.type === 'binary' && (node.op === '*' || node.op === '/') && isNegative(node.left)) {
    return tidyProduct(node.op, negate(node.left), node.right, node.implicit);
  }
  return { type: 'unary', op: '-', arg: node };
}

function tidyProduct(
  op: '*' | '/',
  left: Node,
  right: Node,
  implicit: true | undefined,
): Node {
  const a = constOf(left);
  const b = constOf(right);
  if (op === '/') {
    if (b === 1) {
      return left;
    }
    return { type: 'binary', op, left, right };
  }
  if (a === 1) {
    return right;
  }
  if (b === 1) {
    return left;
  }
  if (a === -1) {
    return negate(right);
  }
  if (b === -1) {
    return negate(left);
  }
  // A number goes first: x·3 → 3x.
  if (b !== null && a === null) {
    return tidyProduct('*', right, left, true);
  }
  // 4·(3·w) → 12w.
  if (a !== null && right.type === 'binary' && right.op === '*') {
    const c = constOf(right.left);
    if (c !== null) {
      return tidyProduct('*', num(a * c), right.right, true);
    }
  }
  // (2x+1)·2x → 2x(2x+1): a sum goes last.
  if (a === null && precedence(left) === 1 && precedence(right) > 1) {
    return { type: 'binary', op: '*', left: right, right: left, implicit: true };
  }
  return {
    type: 'binary',
    op: '*',
    left,
    right,
    ...(a !== null || implicit ? { implicit: true as const } : {}),
  };
}

function arith(op: '+' | '-' | '*' | '/' | '^', a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
    case '^':
      return a ** b;
  }
}

type Binary = Extract<Node, { type: 'binary' }>;

function tidyBinary(node: Binary): Node {
  const left = tidy(node.left);
  const right = tidy(node.right);
  const a = constOf(left);
  const b = constOf(right);
  if (a !== null && b !== null) {
    const v = arith(node.op, a, b);
    if (Number.isInteger(v) && Math.abs(v) < 1e6) {
      return num(v);
    }
  }
  switch (node.op) {
    case '*':
    case '/':
      return tidyProduct(node.op, left, right, node.implicit);
    case '^':
      return b === 1 ? left : { ...node, left, right };
    case '+':
    case '-': {
      if (b === 0) {
        return left;
      }
      // a + (b ± c) is (a + b) ± c: so x³ + (−3x − 3) reads x³ − 3x − 3.
      if (node.op === '+' && right.type === 'binary' && (right.op === '+' || right.op === '-')) {
        return tidy({
          type: 'binary',
          op: right.op,
          left: { type: 'binary', op: '+', left, right: right.left },
          right: right.right,
        });
      }
      if (isNegative(right)) {
        const op = node.op === '+' ? '-' : '+';
        return { type: 'binary', op, left, right: negate(right) };
      }
      return { ...node, left, right };
    }
  }
}

/** Readable form of a substituted expression: same value, fewer marks. */
export function tidy(node: Node): Node {
  switch (node.type) {
    case 'unary':
      return node.op === '+' ? tidy(node.arg) : negate(tidy(node.arg));
    case 'call':
      return { ...node, arg: tidy(node.arg) };
    case 'binary':
      return tidyBinary(node);
    default:
      return node;
  }
}

// One drawn function for a rule.

export interface Instance {
  ruleId: string;
  /** The parts used (only those the law has). */
  u?: Part;
  v?: Part;
  n?: number;
  k?: number;
  scale?: number;
  /** f(x), as built. */
  f: Node;
  /** The law's function before the factor `scale` (f itself when there is none). */
  base: Node;
  /** f′(x) by the law, before tidying (what answers are judged against). */
  d: Node;
  /** Each trap's f′(x), before tidying. */
  traps: { id: string; d: Node }[];
}

const ZERO: Node = { type: 'num', value: 0, text: '0' };

/**
 * Equivalence with more random points than the default: a function like
 * √(−x − 3) lives on a small part of [−10, 10], and the judge must still
 * decide (a right answer must never come back «undetermined»).
 */
export const DRILL_EQUIVALENCE = { randomSamples: 160 } as const;

const differs = (a: Node, b: Node): boolean =>
  checkEquivalence(a, b, DRILL_EQUIVALENCE).verdict === 'different';

/**
 * A drawn function a drill can use: f is not a constant, the answer is no
 * trap and no two traps agree, so a slip is always named, and named once.
 * (With u = x + 1, u′ = 1 and «Oublier u′» would give the right answer.)
 */
export function usable(inst: Instance): boolean {
  return (
    differs(inst.d, ZERO) &&
    inst.traps.every(t => differs(t.d, inst.d)) &&
    inst.traps.every((a, i) => inst.traps.slice(i + 1).every(b => differs(a.d, b.d)))
  );
}

/** Draws before giving up (never reached by the specs: tested on 500 seeds). */
const DRAWS = 50;

/** The rule's law with concrete functions, for this seed. Throws if the rule has no spec. */
export function instantiate(rule: FormulaRule, seed: number): Instance {
  const r = rng(seed);
  for (let i = 0; i < DRAWS; i++) {
    const inst = draw(rule, r);
    if (usable(inst)) {
      return inst;
    }
  }
  throw new Error(`${rule.id} seed ${seed}: no usable function in ${DRAWS} draws`);
}

function draw(rule: FormulaRule, r: () => number): Instance {
  const spec = SPECS[rule.id];
  if (!spec) {
    throw new Error(`${rule.id}: no drill spec`);
  }
  const u = spec.u ? partOf(pick(r, spec.u), r) : undefined;
  const v = spec.v ? partOf(pick(r, spec.v), r) : undefined;
  const n = spec.n ? pick(r, spec.n) : undefined;
  const k = spec.k ? pick(r, spec.k) : undefined;
  const scale = spec.scale ? pick(r, spec.scale) : undefined;
  const map: Record<string, Node> = {};
  if (u) {
    map.u = parseInX(u.f);
    map.U = parseInX(u.d);
  }
  if (v) {
    map.v = parseInX(v.f);
    map.V = parseInX(v.d);
  }
  if (n !== undefined) {
    map.n = num(n);
  }
  if (k !== undefined) {
    map.k = num(k);
  }
  const build = (src: string) => scaled(scale ?? 1, substitute(parseLaw(src), map));
  return {
    ruleId: rule.id,
    ...(u ? { u } : {}),
    ...(v ? { v } : {}),
    ...(n !== undefined ? { n } : {}),
    ...(k !== undefined ? { k } : {}),
    ...(scale !== undefined ? { scale } : {}),
    f: build(rule.law.of),
    base: substitute(parseLaw(rule.law.of), map),
    d: build(rule.law.d),
    traps: rule.traps.map(t => ({ id: t.id, d: build(t.d) })),
  };
}
