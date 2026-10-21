/**
 * Pure logic of the generic primitives (no React): values shown as facts are
 * computed here by the engine, so views only lay them out.
 */
import { toRational } from '../../engine/analysis';
import {
  evaluateReal,
  parseExpression,
  toLatex,
  type Node,
} from '../../engine/expression';
import { fractionToLatex } from '../../engine/format';

/** Exact small fraction as LaTeX, else "≈ 0,1234". */
export function numberLatex(x: number): { latex: string; exact: boolean } {
  if (!Number.isFinite(x)) {
    return { latex: '\\text{?}', exact: false };
  }
  const q = toRational(x, { maxDen: 100, tol: 1e-9 });
  if (q) {
    return { latex: fractionToLatex(q), exact: true };
  }
  return {
    latex: `\\approx ${x.toFixed(4).replace('.', '{,}')}`,
    exact: false,
  };
}

/** "= 1/3" for an exact value, "≈ 2,7183" otherwise (never "= ≈"). */
export function equalsLatex(x: number): string {
  const n = numberLatex(x);
  return n.exact ? `=${n.latex}` : n.latex;
}

export interface TwinRow {
  value: number;
  template: number;
  compare?: number;
  /** Both sides agree (relative 1e-9). */
  equal?: boolean;
}

function parse(src: string, symbol: string): Node {
  const r = parseExpression(src, { variables: [symbol] });
  if (!r.ok) {
    throw new Error(`NumericTwin expression does not parse: ${src}`);
  }
  return r.ast;
}

export interface Twin {
  templateLatex: string;
  compareLatex?: string;
  row: (value: number) => TwinRow;
}

/** Props are validated first (schema), so parsing cannot fail here. */
export function numericTwin(
  symbol: string,
  template: string,
  compare?: string,
): Twin {
  const t = parse(template, symbol);
  const c = compare === undefined ? undefined : parse(compare, symbol);
  return {
    templateLatex: toLatex(t),
    ...(c && { compareLatex: toLatex(c) }),
    row: value => {
      const tv = evaluateReal(t, { [symbol]: value });
      if (!c) {
        return { value, template: tv };
      }
      const cv = evaluateReal(c, { [symbol]: value });
      return {
        value,
        template: tv,
        compare: cv,
        equal:
          Math.abs(tv - cv) <= 1e-9 * Math.max(1, Math.abs(tv), Math.abs(cv)),
      };
    },
  };
}
