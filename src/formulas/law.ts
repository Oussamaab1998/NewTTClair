/**
 * Checks a derivative law with numbers only (no symbolic algebra, no AI):
 * for sample functions u and v and sample points x, the slope of
 * of(u(x), v(x)) measured by a central difference must equal d evaluated
 * with u, v and their slopes U, V. A law that holds on every defined sample
 * is accepted; a wrong one shows a counter-example at once.
 *
 * Like the engine's equivalence check this is not a proof, but every sample
 * family and point is fixed, so a result never changes between runs.
 */
import {
  evaluateReal,
  parseExpression,
  type Node,
} from '../engine/expression';
import { FORMULA_VARIABLES } from './schema';

/** Sample u(x): positive ones too, so sqrt(u) and ln(u) have points. */
export const U_SAMPLES = [
  'x^2+1',
  '3x-2',
  'e^x',
  'x^3-2x+5',
  'sqrt(x+4)',
] as const;
/** Sample v(x), none of them zero at the sample points. */
export const V_SAMPLES = ['x+3', 'x^2+2', '2-5x', 'e^(-x)+1'] as const;
export const N_SAMPLES = [2, 3, 5] as const;
export const K_SAMPLES = [2, -3, 0.5] as const;
/** No whole numbers, so no sample hits a pole by chance. */
export const X_SAMPLES = [-1.7, -0.6, 0.35, 0.8, 1.45, 2.2, 3.1] as const;

const H = 1e-5;
/** Fewer defined comparisons than this: the check says nothing. */
export const MIN_POINTS = 20;

/** Parse a machine expression of a rule; throws on a content bug. */
export function parseLaw(src: string): Node {
  const r = parseExpression(src, { variables: [...FORMULA_VARIABLES] });
  if (!r.ok) {
    throw new Error(`cannot parse "${src}": ${r.error.code} at ${r.error.index}`);
  }
  return r.ast;
}

/** Parse an expression in x only (examples). */
export function parseInX(src: string): Node {
  const r = parseExpression(src, { variables: ['x'] });
  if (!r.ok) {
    throw new Error(`cannot parse "${src}": ${r.error.code} at ${r.error.index}`);
  }
  return r.ast;
}

const at = (node: Node, x: number): number => evaluateReal(node, { x });

/** The slope of g at x by a central difference (NaN where g is undefined). */
export function slope(g: (x: number) => number, x: number): number {
  const a = g(x + H);
  const b = g(x - H);
  return Number.isFinite(a) && Number.isFinite(b) ? (a - b) / (2 * H) : NaN;
}

export function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b));
}

export interface LawSample {
  u: string;
  v: string;
  n: number;
  k: number;
  x: number;
  /** The slope of of(u, v) at x. */
  slope: number;
  /** d at x. */
  d: number;
}

export type LawVerdict =
  | { holds: true; points: number }
  | { holds: false; counterexample: LawSample }
  | { holds: null; points: number };

/** Does d give the slope of `of` on every defined sample? */
export function checkLaw(ofSrc: string, dSrc: string): LawVerdict {
  const of = parseLaw(ofSrc);
  const d = parseLaw(dSrc);
  let points = 0;
  for (const uSrc of U_SAMPLES) {
    const uNode = parseInX(uSrc);
    for (const vSrc of V_SAMPLES) {
      const vNode = parseInX(vSrc);
      for (const n of N_SAMPLES) {
        for (const k of K_SAMPLES) {
          const F = (x: number) =>
            evaluateReal(of, { x, u: at(uNode, x), v: at(vNode, x), n, k });
          for (const x of X_SAMPLES) {
            const u = at(uNode, x);
            const v = at(vNode, x);
            const U = slope(t => at(uNode, t), x);
            const V = slope(t => at(vNode, t), x);
            const s = slope(F, x);
            const value = evaluateReal(d, { x, u, v, U, V, n, k });
            if (![u, v, U, V, s, value].every(Number.isFinite)) {
              continue;
            }
            points++;
            if (!close(s, value)) {
              return {
                holds: false,
                counterexample: { u: uSrc, v: vSrc, n, k, x, slope: s, d: value },
              };
            }
          }
        }
      }
    }
  }
  return points >= MIN_POINTS ? { holds: true, points } : { holds: null, points };
}

/**
 * Do two machine expressions differ somewhere on the samples? (Traps must
 * differ from each other, so a wrong answer names one trap only.)
 */
export function differ(aSrc: string, bSrc: string): boolean {
  const a = parseLaw(aSrc);
  const b = parseLaw(bSrc);
  for (const uSrc of U_SAMPLES) {
    const uNode = parseInX(uSrc);
    for (const vSrc of V_SAMPLES) {
      const vNode = parseInX(vSrc);
      for (const n of N_SAMPLES) {
        for (const k of K_SAMPLES) {
          for (const x of X_SAMPLES) {
            const scope = {
              x,
              u: at(uNode, x),
              v: at(vNode, x),
              U: slope(t => at(uNode, t), x),
              V: slope(t => at(vNode, t), x),
              n,
              k,
            };
            const p = evaluateReal(a, scope);
            const q = evaluateReal(b, scope);
            if (Number.isFinite(p) && Number.isFinite(q) && !close(p, q)) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

/** The template with the hole filled by a tile (in parentheses). */
export function fillHole(template: string, tile: string): string {
  return template.replace('?', `(${tile})`);
}

/** Points where f and g are both defined, and whether they all agree. */
export function sameInX(
  f: (x: number) => number,
  g: (x: number) => number,
  xs: readonly number[] = [...X_SAMPLES, -2.9, -0.15, 0.55, 4.3, 5.7],
): { same: boolean; points: number; at?: number } {
  let points = 0;
  for (const x of xs) {
    const a = f(x);
    const b = g(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      continue;
    }
    points++;
    if (!close(a, b)) {
      return { same: false, points, at: x };
    }
  }
  return { same: true, points };
}

/** f in x evaluated at x. */
export const valueIn =
  (node: Node) =>
  (x: number): number =>
    at(node, x);
