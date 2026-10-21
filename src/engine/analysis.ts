/**
 * Analysis engine (docs/COMPONENTS_ANALYSIS.md). Functions are referenced by
 * id; each is a safe-parser expression (./expression), never code.
 * Numeric derivative, limit probe and sign changes are for visuals and checks;
 * exact formulas live in content and are compared here by numeric samples.
 */
import {
  checkEquivalence,
  evaluateReal,
  parseExpression,
  type Node,
} from './expression';
import { EngineError, frac, type Fraction } from './rational';

export interface FnEntry {
  id: string;
  /** Safe-parser expression in x. */
  expr: string;
  latex: string;
  /** All reals except these points. */
  exclude?: readonly number[];
  /**
   * Floating-point safe range: |x| <= safeAbsX gives a correct value; beyond
   * it an exponential overflows (e^{709.8} = Infinity) and evalFn throws.
   */
  safeAbsX?: number;
}

/** Functions content and components may reference (Exercise 4 A1-A3). */
export const FUNCTION_REGISTRY = [
  {
    id: 'f_ex4',
    expr: 'e^x/(1+e^(2x))',
    latex: 'f(x)=\\frac{e^{x}}{1+e^{2x}}',
    // e^{2x} overflows past x ≈ 354.9.
    safeAbsX: 354,
  },
  { id: 'f_ex4_num', expr: 'e^x', latex: 'e^{x}', safeAbsX: 709 },
  { id: 'f_ex4_den', expr: '1+e^(2x)', latex: '1+e^{2x}', safeAbsX: 354 },
  {
    id: 'f_ex4_simplified',
    expr: '1/(e^(-x)+e^x)',
    latex: '\\frac{1}{e^{-x}+e^{x}}',
    safeAbsX: 709,
  },
  {
    id: 'f_ex4_prime',
    expr: '(1-e^(2x))e^x/(1+e^(2x))^2',
    latex:
      "f'(x)=\\frac{\\left(1-e^{2x}\\right)e^{x}}{\\left(1+e^{2x}\\right)^{2}}",
    // (1 + e^{2x})^2 overflows past x ≈ 177.4.
    safeAbsX: 177,
  },
  /** Not even: the comparison case for parity visuals. */
  {
    id: 'sigmoid_demo',
    expr: 'e^x/(1+e^x)',
    latex: 'g(x)=\\frac{e^{x}}{1+e^{x}}',
    safeAbsX: 709,
  },
  /** Quotient-rule example (EX4_ANALYSIS.md A3). */
  {
    id: 'quot_demo',
    expr: 'x/(x+1)',
    latex: 'h(x)=\\frac{x}{x+1}',
    exclude: [-1],
  },
  { id: 'exp_neg', expr: 'e^(-x)', latex: 'e^{-x}', safeAbsX: 709 },
  /** A1 transfer: the same shape with 2x (even as well). */
  {
    id: 'g_ex4_transfer',
    expr: 'e^(2x)/(1+e^(4x))',
    latex: 'g(x)=\\frac{e^{2x}}{1+e^{4x}}',
    // e^{4x} overflows past x ≈ 177.4.
    safeAbsX: 177,
  },
] as const satisfies readonly FnEntry[];

export type FnId = (typeof FUNCTION_REGISTRY)[number]['id'];
export const FN_IDS = FUNCTION_REGISTRY.map(e => e.id) as [FnId, ...FnId[]];

const AST = new Map<string, Node>(
  FUNCTION_REGISTRY.map(e => {
    const r = parseExpression(e.expr);
    if (!r.ok) {
      throw new Error(`registry expression ${e.id} does not parse`);
    }
    return [e.id, r.ast];
  }),
);

export function isFnId(id: string): id is FnId {
  return AST.has(id);
}

export function fnEntry(id: FnId): FnEntry {
  return FUNCTION_REGISTRY.find(e => e.id === id)!;
}

/**
 * f(x); NaN at an excluded point (outside the domain). Throws EngineError for
 * a non-finite x or an x beyond the function's floating-point safe range.
 */
export function evalFn(id: FnId, x: number): number {
  const entry = fnEntry(id);
  if (
    !Number.isFinite(x) ||
    (entry.safeAbsX !== undefined && Math.abs(x) > entry.safeAbsX)
  ) {
    throw new EngineError(
      `${id}: x = ${x} is outside the safe range |x| <= ${
        entry.safeAbsX ?? 'finite'
      } (floating-point overflow)`,
    );
  }
  if (entry.exclude?.includes(x)) {
    return NaN;
  }
  return evaluateReal(AST.get(id)!, { x });
}

/** Central difference, for visuals (exact derivatives live in content). */
export function derivative(id: FnId, x: number, h = 1e-5): number {
  return numericDerivative(t => evalFn(id, t), x, h);
}

export function numericDerivative(
  fn: (x: number) => number,
  x: number,
  h = 1e-5,
): number {
  return (fn(x + h) - fn(x - h)) / (2 * h);
}

/** Composite Simpson with `n` intervals (rounded up to even); a > b gives a negative value. */
export function simpson(
  fn: (x: number) => number,
  a: number,
  b: number,
  n = 400,
): number {
  if (a === b) {
    return 0;
  }
  if (a > b) {
    return -simpson(fn, b, a, n);
  }
  const m = Math.max(2, n + (n % 2));
  const h = (b - a) / m;
  let s = fn(a) + fn(b);
  for (let i = 1; i < m; i++) {
    s += (i % 2 === 1 ? 4 : 2) * fn(a + i * h);
  }
  return (s * h) / 3;
}

export function integrate(id: FnId, a: number, b: number, n = 400): number {
  return simpson(x => evalFn(id, x), a, b, n);
}

export type Direction = '+inf' | '-inf';

export interface LimitProbe {
  samples: { x: number; fx: number }[];
  /** Last finite value. */
  estimate: number;
  converges: boolean;
  diverges: '+inf' | '-inf' | null;
}

const PROBE_XS = [1, 2, 5, 10, 20, 50];

/**
 * Values of f at growing |x|. Moderate xs on purpose: the direct form of
 * f_ex4 underflows to 0 past x ≈ 355 (e^{2x} = Infinity) and is NaN past
 * x ≈ 710 (Infinity / Infinity), see the tests.
 */
export function limitProbe(
  id: FnId,
  direction: Direction,
  xs: readonly number[] = PROBE_XS,
): LimitProbe {
  const sign = direction === '+inf' ? 1 : -1;
  const samples = xs
    .map(x => ({ x: sign * x, fx: evalFn(id, sign * x) }))
    .filter(s => Number.isFinite(s.fx));
  const last = samples[samples.length - 1];
  const prev = samples[samples.length - 2];
  if (!last || !prev) {
    return { samples, estimate: NaN, converges: false, diverges: null };
  }
  const growing = Math.abs(last.fx) > Math.abs(prev.fx);
  const diverges =
    Math.abs(last.fx) > 1e6 && growing ? (last.fx > 0 ? '+inf' : '-inf') : null;
  const converges =
    diverges === null &&
    Math.abs(last.fx - prev.fx) <= 1e-8 * Math.max(1, Math.abs(last.fx));
  return { samples, estimate: last.fx, converges, diverges };
}

export type Parity = 'even' | 'odd' | 'both' | 'neither';

/** Values near 0 first, then further out; each is tested as x and -x. */
const PARITY_XS = [1e-3, 0.01, 0.1, 0.3, 0.5, 1, 1.7, 2.5, 4, 7, 10, 25, 60];

const close = (a: number, b: number) =>
  a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));

/**
 * Parity by samples: compares f(-x) with f(x) and with -f(x) at every sample
 * inside the safe range; excluded points (NaN) are skipped. A check, not a
 * proof: the proof is the student's computation of f(-x).
 */
export function parity(
  id: FnId,
  xs: readonly number[] = PARITY_XS,
): Parity {
  const limit = fnEntry(id).safeAbsX ?? Infinity;
  const pairs = xs
    .filter(x => x > 0 && x <= limit)
    .map(x => [evalFn(id, x), evalFn(id, -x)] as const)
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (pairs.length < 3) {
    throw new EngineError(`${id}: too few samples to check parity`);
  }
  const even = pairs.every(([a, b]) => close(b, a));
  const odd = pairs.every(([a, b]) => close(b, -a));
  return even && odd ? 'both' : even ? 'even' : odd ? 'odd' : 'neither';
}

export type Sign = '+' | '-';

export interface SignInfo {
  changes: { x: number; from: Sign; to: Sign }[];
  /** Points where f is undefined (poles, excluded points), never reported as zeros. */
  undefinedAt: number[];
  regions: { from: number; to: number; sign: Sign }[];
}

/**
 * Sign changes on [a, b]: a grid of midpoints (avoids landing on nice
 * values), then bisection. A flip where |f| does not shrink is a pole.
 */
export function signChange(
  id: FnId,
  interval: readonly [number, number],
  steps = 400,
): SignInfo {
  return signChangeOf(x => evalFn(id, x), interval, steps);
}

/** signChange for any real function (e.g. a numeric derivative). */
export function signChangeOf(
  at: (x: number) => number,
  [a, b]: readonly [number, number],
  steps = 400,
): SignInfo {
  const xs = Array.from(
    { length: steps },
    (_, k) => a + ((b - a) * (k + 0.5)) / steps,
  );
  const breaks: { x: number; kind: 'zero' | 'undefined' }[] = [];
  for (let k = 1; k < xs.length; k++) {
    let lo = xs[k - 1]!;
    let hi = xs[k]!;
    const flo = at(lo);
    const fhi = at(hi);
    if (!Number.isFinite(fhi)) {
      breaks.push({ x: hi, kind: 'undefined' });
      continue;
    }
    if (!Number.isFinite(flo) || Math.sign(flo) === Math.sign(fhi)) {
      continue;
    }
    for (let i = 0; i < 80 && hi - lo > 1e-14; i++) {
      const mid = (lo + hi) / 2;
      const fm = at(mid);
      if (!Number.isFinite(fm) || fm === 0) {
        lo = hi = mid;
        break;
      }
      if (Math.sign(fm) === Math.sign(flo)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const x = (lo + hi) / 2;
    const fx = at(x);
    const isZero =
      Number.isFinite(fx) && Math.abs(fx) <= 1e-6 * Math.max(1, Math.abs(flo));
    breaks.push({ x, kind: isZero ? 'zero' : 'undefined' });
  }
  const signOf = (x: number): Sign => (at(x) < 0 ? '-' : '+');
  const changes = breaks
    .filter(br => br.kind === 'zero')
    .map(br => ({
      x: br.x,
      from: signOf(br.x - 1e-6),
      to: signOf(br.x + 1e-6),
    }));
  const cuts = [a, ...breaks.map(br => br.x), b];
  const regions: SignInfo['regions'] = [];
  for (let i = 1; i < cuts.length; i++) {
    const from = cuts[i - 1]!;
    const to = cuts[i]!;
    regions.push({ from, to, sign: signOf((from + to) / 2) });
  }
  return {
    changes,
    undefinedAt: breaks.filter(br => br.kind === 'undefined').map(br => br.x),
    regions,
  };
}

/**
 * The fraction p/q (q <= maxDen) within `tol` of x, else null. Lets content
 * answers stay exact fractions computed by the engine (f(0) = 1/2, lim = 0).
 */
export function toRational(
  x: number,
  { maxDen = 1000, tol = 1e-12 }: { maxDen?: number; tol?: number } = {},
): Fraction | null {
  if (!Number.isFinite(x) || Math.abs(x) > 1e9) {
    return null;
  }
  // Continued fraction convergents.
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  let r = x;
  for (let i = 0; i < 40; i++) {
    const ai = Math.floor(r);
    [h0, h1] = [h1, ai * h1 + h0];
    [k0, k1] = [k1, ai * k1 + k0];
    if (k1 > maxDen) {
      return null;
    }
    if (Math.abs(h1 / k1 - x) <= tol) {
      return frac(h1, k1);
    }
    const rest = r - ai;
    if (rest === 0) {
      return null;
    }
    r = 1 / rest;
  }
  return null;
}

export type EquivalenceVerdict =
  | { verdict: 'equivalent'; checkedPoints: number; domainDiffers: boolean }
  | {
      verdict: 'different';
      counterexample: { scope: Record<string, number>; a: number; b: number };
    }
  | { verdict: 'undetermined' }
  | { verdict: 'parse_error'; side: 'a' | 'b'; code: string; index: number };

/**
 * Two typed expressions compared by numeric samples (expression/README.md):
 * negatives, zero and random points; points near `exclude` are skipped.
 */
export function equivalentExpressions(
  a: string,
  b: string,
  {
    variables = ['x'],
    exclude = [],
  }: { variables?: readonly string[]; exclude?: readonly number[] } = {},
): EquivalenceVerdict {
  const pa = parseExpression(a, { variables });
  if (!pa.ok) {
    return { verdict: 'parse_error', side: 'a', ...pa.error };
  }
  const pb = parseExpression(b, { variables });
  if (!pb.ok) {
    return { verdict: 'parse_error', side: 'b', ...pb.error };
  }
  const r = checkEquivalence(pa.ast, pb.ast, {
    variables,
    skip: scope =>
      Object.values(scope).some(v => exclude.some(p => Math.abs(v - p) < 1e-3)),
  });
  return r.verdict === 'undetermined' ? { verdict: 'undetermined' } : r;
}

/** Points where content expressions are compared (negatives, 0, near 0). */
const MATCH_XS = [-3, -2, -1.3, -0.7, -0.05, 0, 0.001, 0.4, 1, 1.6, 2.2, 3];

/**
 * Is this written expression (safe parser) the registry function `fn`, its
 * value at −x, or its derivative? Numeric samples; the derivative is the
 * numeric one (tolerance 1e-6 relative). Points where either side is
 * undefined are skipped; at least 6 points must agree.
 */
export function matchesFn(
  expr: string,
  ref: { fn: FnId; transform: 'id' | 'neg' | 'derivative' },
  variable = 'x',
): { ok: boolean; at?: number } {
  const p = parseExpression(expr, { variables: [variable] });
  if (!p.ok) {
    return { ok: false };
  }
  const target = (x: number) => {
    try {
      return ref.transform === 'neg'
        ? evalFn(ref.fn, -x)
        : ref.transform === 'derivative'
        ? derivative(ref.fn, x)
        : evalFn(ref.fn, x);
    } catch {
      return NaN;
    }
  };
  const tol = ref.transform === 'derivative' ? 1e-6 : 1e-9;
  let checked = 0;
  for (const x of MATCH_XS) {
    const a = evaluateReal(p.ast, { [variable]: x });
    const b = target(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      continue;
    }
    if (Math.abs(a - b) > tol * Math.max(1, Math.abs(b))) {
      return { ok: false, at: x };
    }
    checked++;
  }
  return { ok: checked >= 6 };
}
