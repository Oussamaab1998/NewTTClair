/**
 * Pure model of BinomialExplorer: the grid of (n, p), every term C(n,k) p^k
 * q^(n-k) exactly (the loader proved every (n, p) of the grid fits), the
 * written term and the np and npq lines, the finding and the `reveals`
 * declaration. A moment is NEVER computed by adding the terms: that overflows
 * for B(15, 7/10) (docs/COMPONENTS_PROBABILITY_V2.md E8); np and npq are
 * closed forms. No React.
 */
import { productLine } from '../../engine/calcLines';
import { binomialExpectation, binomialPmf } from '../../engine/probability';
import {
  add,
  div,
  frac,
  mul,
  sub,
  toNumber,
  type Fraction,
} from '../../engine/rational';
import {
  mulInt,
  parseRat,
  ratToLatex,
  ratToString,
} from '../../engine/rationalFormat';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import {
  BinomialExplorerPropsSchema,
  type BinomialExplorerProps,
} from './schemas';

export interface BinomialModel {
  ns: number[];
  ps: Fraction[];
  fixedP: boolean;
  initN: number;
  /** Index into `ps`. */
  initP: number;
  toggles: BinomialExplorerProps['toggles'];
  lock: number;
  linkSlots: boolean;
}

export function binomialModel(p: BinomialExplorerProps): BinomialModel {
  const ns = Array.from({ length: p.n.max - p.n.min + 1 }, (_, i) => p.n.min + i);
  let ps: Fraction[];
  let initP = 0;
  if ('fixed' in p.p) {
    ps = [parseRat(p.p.fixed)!];
  } else {
    const [min, max, step, init] = [p.p.min, p.p.max, p.p.step, p.p.init].map(
      s => parseRat(s)!,
    ) as [Fraction, Fraction, Fraction, Fraction];
    const count = div(sub(max, min), step)[0] + 1;
    ps = Array.from({ length: count }, (_, i) => add(min, mulInt(step, i)));
    initP = div(sub(init, min), step)[0];
  }
  return {
    ns,
    ps,
    fixedP: 'fixed' in p.p,
    initN: p.n.init,
    initP,
    toggles: p.toggles,
    lock: p.formulaLockedUntilTaps,
    linkSlots: p.linkSlots,
  };
}

export interface Term {
  k: number;
  p: Fraction;
}

/** P(X = k) for k = 0..n, each exact. */
export const binomialTerms = (n: number, p: Fraction): Term[] =>
  Array.from({ length: n + 1 }, (_, k) => ({ k, p: binomialPmf(n, p, k) }));

/**
 * Heights as a share of the largest term (layout only, never shown). Plain
 * numbers on purpose: comparing two exact terms of B(15, 7/10) multiplies
 * their denominators (10^15 x 10^15) and overflows, and a bar height needs no
 * exactness.
 */
export function barShares(terms: readonly Term[]): number[] {
  const xs = terms.map(t => toNumber(t.p));
  const top = Math.max(0, ...xs);
  return xs.map(x => (top > 0 ? x / top : 0));
}

/** `C_{5}^{2} \times (\frac{3}{10})^{2} \times (\frac{7}{10})^{3} = \frac{3087}{10000}` */
export function termLine(n: number, k: number, p: Fraction): string {
  const q = sub(frac(1), p);
  return (
    `C_{${n}}^{${k}} \\times (${ratToLatex(p)})^{${k}} \\times (${ratToLatex(q)})^{${n - k}}` +
    ` = ${ratToLatex(binomialPmf(n, p, k))}`
  );
}

/** np and npq, the closed forms (never E(X^2) - E(X)^2 from the terms). */
export function momentLines(n: number, p: Fraction): string[] {
  const q = sub(frac(1), p);
  return [productLine([n, p]), productLine([n, p, q])];
}

export interface ExplorerState {
  n: number;
  pIndex: number;
  /** The distinct bars the student looked at, in order. */
  taps: number[];
}

export function binomialFinding(
  m: BinomialModel,
  s: ExplorerState,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found' || how === 'helped';
  const p = m.ps[s.pIndex]!;
  const q = sub(frac(1), p);
  const [k1, k2] = s.taps;
  return makeFinding({
    findingId: 'binomial.formula',
    numbers: {
      n: String(s.n),
      p: ratToString(p),
      ...(k1 !== undefined && { k1: String(k1) }),
      ...(k2 !== undefined && { k2: String(k2) }),
      mean: ratToString(binomialExpectation(s.n, p)),
      variance: ratToString(mul(frac(s.n), mul(p, q))),
    },
    route: route.slice(0, 12),
    how,
    correct: null,
    ...(own && k1 !== undefined && k2 !== undefined && {
      calc: [termLine(s.n, k1, p), termLine(s.n, k2, p), ...momentLines(s.n, p)],
    }),
  });
}

// ---------------------------------------------------------------------------
// Reveals

const parseExplorer = (props: Record<string, unknown>): BinomialModel | null => {
  const r = BinomialExplorerPropsSchema.safeParse(props);
  return r.success ? binomialModel(r.data) : null;
};

export const BINOMIAL_EXPLORER_REVEALS: readonly RevealRule[] = [
  {
    value: 'bar_shapes',
    note: 'the bars show how P(X = k) compares for each k (heights only, no number)',
    by: 'props',
    minHint: 0,
    values: () => [],
  },
  {
    value: 'terms',
    note: 'the term C(n,k) p^k q^(n-k) of a bar, written with its value once the bar is tapped',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseExplorer(p);
      return m
        ? m.ns.flatMap(n => m.ps.flatMap(x => binomialTerms(n, x).map(t => t.p)))
        : [];
    },
  },
  {
    value: 'mean_variance',
    note: 'np and npq for the n and p on the controls, written when the mean or the variance is switched on',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseExplorer(p);
      return m
        ? m.ns.flatMap(n =>
            m.ps.flatMap(x => [
              binomialExpectation(n, x),
              mul(frac(n), mul(x, sub(frac(1), x))),
            ]),
          )
        : [];
    },
  },
  {
    value: 'formula',
    note: 'the general formula P(X = k) = C(n,k) p^k q^(n-k), written after two distinct bars were looked at (a formula, not a value)',
    by: 'state',
    lockedBy: p => ((p.formulaLockedUntilTaps as number | undefined) ?? 2) > 0,
    minHint: 0,
    values: () => [],
  },
];
