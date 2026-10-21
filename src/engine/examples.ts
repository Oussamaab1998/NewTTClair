/**
 * Engine-generated examples for ExampleGenerator (docs/COMPONENT_CATALOG.md):
 * a template id and a seed give the same example every time; every line is
 * built from safe-parser expressions and checked by code (examples.test.ts).
 */
import { numericDerivative } from './analysis';
import {
  checkEquivalence,
  evaluateReal,
  parseExpression,
  toLatex,
  type Node,
} from './expression';
import { rng } from './expression/equivalence';
import { EngineError } from './rational';

export const EXAMPLE_TEMPLATES = ['quotient_linear', 'parity_exp'] as const;
export type ExampleTemplate = (typeof EXAMPLE_TEMPLATES)[number];

export interface GeneratedExample {
  templateId: ExampleTemplate;
  seed: number;
  params: Record<string, number | string>;
  /** LaTeX lines, in order (native renderer subset). */
  lines: string[];
  /** Safe-parser expressions: the function and the result. */
  exprs: { f: string; answer: string };
  /** parity_exp only: is g even (computed by numeric samples). */
  even?: boolean;
}

function ast(expr: string): Node {
  const r = parseExpression(expr);
  if (!r.ok) {
    throw new EngineError(`example expression does not parse: ${expr}`);
  }
  return r.ast;
}
const tex = (expr: string) => toLatex(ast(expr));

/** "ax+b" without 1x, +-, or +0. */
function linear(a: number, b: number): string {
  const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
  return b === 0 ? ax : b > 0 ? `${ax}+${b}` : `${ax}-${-b}`;
}

const pick = <T>(next: () => number, xs: readonly T[]): T =>
  xs[Math.floor(next() * xs.length) % xs.length]!;

function quotientLinear(seed: number): GeneratedExample {
  const next = rng(seed * 7919 + 1);
  let a = 1;
  let b = 0;
  let c = 1;
  let d = 1;
  do {
    a = pick(next, [1, 2, 3, -1, -2]);
    b = pick(next, [-3, -2, -1, 1, 2, 3]);
    c = pick(next, [1, 2]);
    d = pick(next, [1, 2, 3, 4, -1, -2]);
  } while (a * d - b * c === 0);
  const u = linear(a, b);
  const v = linear(c, d);
  const f = `(${u})/(${v})`;
  const k = a * d - b * c;
  const answer = `${k}/(${v})^2`;
  // Check by code before showing.
  const h = (x: number) => evaluateReal(ast(f), { x });
  const hp = (x: number) => evaluateReal(ast(answer), { x });
  for (const x of [0.5, 2, 5]) {
    if (
      Math.abs(numericDerivative(h, x) - hp(x)) >
      1e-5 * (1 + Math.abs(hp(x)))
    ) {
      throw new EngineError('quotient_linear check failed');
    }
  }
  const coef = (n: number) => (n === 1 ? '' : n === -1 ? '-' : String(n));
  return {
    templateId: 'quotient_linear',
    seed,
    params: { a, b, c, d },
    exprs: { f, answer },
    lines: [
      `h(x)=${tex(f)}`,
      `u(x)=${tex(u)}\\quad u'(x)=${a}`,
      `v(x)=${tex(v)}\\quad v'(x)=${c}`,
      `h'(x)=\\frac{u'v-uv'}{v^{2}}=\\frac{${coef(a)}\\left(${tex(
        v,
      )}\\right)-${coef(c)}\\left(${tex(u)}\\right)}{\\left(${tex(
        v,
      )}\\right)^{2}}`,
      `h'(x)=${tex(answer)}`,
    ],
  };
}

const PARITY_KINDS = {
  /** e^{ax} + e^{-ax}: even. */
  sum: (a: string, v: string) => `e^(${a}${v})+e^(-${a}${v})`,
  /** e^{ax} − e^{-ax}: odd, not even. */
  diff: (a: string, v: string) => `e^(${a}${v})-e^(-${a}${v})`,
  /** e^{ax} / (1 + e^{2ax}): even (the Exercise 4 shape). */
  ratio: (a: string, v: string) => `e^(${a}${v})/(1+e^(2${a}${v}))`,
  /** e^{ax} / (1 + e^{ax}): not even. */
  sigmoid: (a: string, v: string) => `e^(${a}${v})/(1+e^(${a}${v}))`,
};

function parityExp(seed: number): GeneratedExample {
  const next = rng(seed * 104729 + 3);
  const kind = pick(
    next,
    Object.keys(PARITY_KINDS),
  ) as keyof typeof PARITY_KINDS;
  const a = pick(next, [1, 2, 3]);
  const coef = a === 1 ? '' : String(a);
  const build = PARITY_KINDS[kind];
  // 2·(a x): written as one coefficient so the LaTeX reads e^{4x}, not e^{2·2x}.
  const f = build(coef, 'x').replace(`2${coef}x`, `${2 * a}x`);
  const fNeg = build(coef, '(-x)').replace(`2${coef}(-x)`, `${2 * a}(-x)`);
  const r = checkEquivalence(ast(fNeg), ast(f));
  const even = r.verdict === 'equivalent';
  return {
    templateId: 'parity_exp',
    seed,
    params: { kind, a },
    exprs: { f, answer: fNeg },
    even,
    lines: [
      `g(x)=${tex(f)}`,
      `g(-x)=${tex(fNeg)}`,
      even ? 'g(-x)=g(x)' : 'g(-x)\\neq g(x)',
    ],
  };
}

export function generateExample(
  templateId: ExampleTemplate,
  seed: number,
): GeneratedExample {
  return templateId === 'quotient_linear'
    ? quotientLinear(seed)
    : parityExp(seed);
}
