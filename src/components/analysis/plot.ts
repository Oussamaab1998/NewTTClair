/**
 * Pure plot geometry for the analysis components (no React): engine samples
 * to SVG path strings. Points are precomputed once per props (contract rule
 * 10); views only map them to pixels.
 */
import {
  derivative,
  evalFn,
  fnEntry,
  signChange,
  signChangeOf,
  toRational,
  type FnId,
  type Sign,
} from '../../engine/analysis';

export type Interval = readonly [number, number];

export interface View {
  domain: Interval;
  range: Interval;
  width: number;
  height: number;
  px: (x: number) => number;
  py: (y: number) => number;
  /** Pixel -> x (for touches). */
  xOf: (px: number) => number;
}

export function makeView(
  domain: Interval,
  range: Interval,
  width: number,
  height: number,
  pad: number,
): View {
  const [a, b] = domain;
  const [lo, hi] = range;
  const w = Math.max(1, width - 2 * pad);
  const h = Math.max(1, height - 2 * pad);
  return {
    domain,
    range,
    width,
    height,
    px: x => pad + ((x - a) / (b - a)) * w,
    py: y => pad + ((hi - y) / (hi - lo)) * h,
    xOf: px => a + ((px - pad) / w) * (b - a),
  };
}

export interface Pt {
  x: number;
  y: number | null;
}

/** f at n + 1 evenly spaced points; undefined values (or unsafe x) are null. */
export function sampleCurve(fn: FnId, [a, b]: Interval, n = 160): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / n;
    let y: number;
    try {
      y = evalFn(fn, x);
    } catch {
      return { x, y: null };
    }
    return { x, y: Number.isFinite(y) ? y : null };
  });
}

/** Values beyond this are clipped when choosing a range (poles). */
const CLIP = 10;

/** A y-range showing the curve and the x-axis, poles clipped. */
export function autoRange(fn: FnId, domain: Interval): Interval {
  const ys = sampleCurve(fn, domain, 200)
    .map(p => p.y)
    .filter((y): y is number => y !== null)
    .map(y => Math.max(-CLIP, Math.min(CLIP, y)));
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const span = hi - lo || 2;
  return [lo - 0.05 * span, hi + 0.05 * span];
}

const fmt = (n: number) => n.toFixed(2);

/**
 * "M x,y L ..." with a new subpath after an undefined point or across a
 * pole (a jump bigger than twice the range with a sign change).
 */
export function curvePath(points: readonly Pt[], view: View): string {
  const [lo, hi] = view.range;
  const span = hi - lo;
  const clamp = (y: number) => Math.max(lo - span, Math.min(hi + span, y));
  let d = '';
  let prev: number | null = null;
  for (const p of points) {
    if (p.y === null) {
      prev = null;
      continue;
    }
    const jump =
      prev !== null &&
      Math.abs(p.y - prev) > 2 * span &&
      Math.sign(p.y) !== Math.sign(prev);
    d += `${prev === null || jump ? 'M' : 'L'}${fmt(view.px(p.x))},${fmt(
      view.py(clamp(p.y)),
    )}`;
    prev = p.y;
  }
  return d;
}

/** One path per sign region of f (sign-colored curves, f' sign visuals). */
export function signedPaths(
  fn: FnId,
  domain: Interval,
  view: View,
  n = 160,
): { sign: Sign; from: number; to: number; d: string }[] {
  const span = domain[1] - domain[0];
  return signChange(fn, domain).regions.map(r => ({
    ...r,
    d: curvePath(
      sampleCurve(
        fn,
        [r.from, r.to],
        Math.max(2, Math.round((n * (r.to - r.from)) / span)),
      ),
      view,
    ),
  }));
}

/** Closed area between the curve and the x-axis on [min(a, b), max(a, b)]. */
export function shadePath(
  fn: FnId,
  a: number,
  b: number,
  view: View,
  n = 80,
): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const pts = sampleCurve(fn, [lo, hi], n).filter(p => p.y !== null);
  const [rlo, rhi] = view.range;
  const clamp = (y: number) => Math.max(rlo, Math.min(rhi, y));
  const top = pts
    .map(p => `L${fmt(view.px(p.x))},${fmt(view.py(clamp(p.y!)))}`)
    .join('');
  return `M${fmt(view.px(lo))},${fmt(view.py(0))}${top}L${fmt(
    view.px(hi),
  )},${fmt(view.py(0))}Z`;
}

/** Plain number for SVG labels: small exact fraction, else 2 decimals (French comma). */
export function plainNumber(x: number): string {
  const q = toRational(x, { maxDen: 100, tol: 1e-9 });
  if (q) {
    return q[1] === 1 ? String(q[0]) : `${q[0]}/${q[1]}`;
  }
  return x.toFixed(2).replace('.', ',');
}

/** Readout number: exact fraction (denominator <= 9), else 3 decimals (French comma). */
export function readoutNumber(
  x: number,
  { fractions = true }: { fractions?: boolean } = {},
): string {
  if (!Number.isFinite(x)) {
    return '?';
  }
  const a = Math.abs(x);
  // Tiny but not zero stays visible (a limit is approached, never reached).
  if (a >= 1e5 || (a > 0 && a < 1e-3)) {
    return scientific(x);
  }
  // Small fractions stay exact (1/2, 1/3); 27/10 reads better as 2,7.
  const q = fractions ? toRational(x, { maxDen: 9, tol: 1e-9 }) : null;
  if (q) {
    return q[1] === 1 ? String(q[0]) : `${q[0]}/${q[1]}`;
  }
  // 3 decimals, trailing zeros dropped (0,010 -> 0,01).
  return x
    .toFixed(3)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** 1,14 × 10²⁶ (French comma, superscript exponent). */
export function scientific(x: number): string {
  const [m, e] = x.toExponential(2).split('e');
  const exp = Number(e);
  const sup = String(Math.abs(exp))
    .split('')
    .map(d => SUPERSCRIPT[Number(d)])
    .join('');
  return `${m!.replace('.', ',')} × 10${exp < 0 ? '⁻' : ''}${sup}`;
}

/** The function's letter from its registry LaTeX ("g(x)=..." -> "g"), default f. */
export function fnName(fn: FnId): string {
  return /^([a-z]'?)\(x\)=/.exec(fnEntry(fn).latex)?.[1] ?? 'f';
}

/** Union of the auto ranges (one stable frame while toggling curves). */
export function unionRange(fns: readonly FnId[], domain: Interval): Interval {
  const rs = fns.map(f => autoRange(f, domain));
  return [Math.min(...rs.map(r => r[0])), Math.max(...rs.map(r => r[1]))];
}

/** "f(1,2) = 0,307": a readout line for a function value. */
export const valueLine = (
  name: string,
  x: number,
  y: number | string,
): string =>
  `${name}(${readoutNumber(x, { fractions: false })}) = ${
    typeof y === 'string' ? y : readoutNumber(y)
  }`;

/**
 * Left half (x <= 0) folded about the y-axis by k in [0, 1]: drawn at
 * x·cos(πk), so k = 1 puts f(x) at −x (the mirror image).
 */
export function foldPath(
  fn: FnId,
  domain: Interval,
  k: number,
  view: View,
  n = 80,
): string {
  const c = Math.cos(Math.PI * k);
  const pts = sampleCurve(fn, [domain[0], 0], n).map(p => ({
    x: p.x * c,
    y: p.y,
  }));
  return curvePath(pts, view);
}

/** Does the folded left half land on the right half? f(−x) = f(x) at samples. */
export function foldOverlap(fn: FnId, b: number, n = 60): boolean {
  return sampleCurve(fn, [0, b], n).every(p => {
    if (p.y === null) {
      return true;
    }
    const m = evalFn(fn, -p.x);
    return Math.abs(m - p.y) <= 1e-9 * Math.max(1, Math.abs(p.y));
  });
}

/** The right half only (x >= 0). */
export function rightHalfPath(fn: FnId, domain: Interval, view: View): string {
  return curvePath(sampleCurve(fn, [0, domain[1]], 80), view);
}

/**
 * Segment of the line through (x0, y0) with this slope, across the domain,
 * clipped along the line (never by moving an endpoint vertically, which
 * would tilt it) to a band around the range, so pixels stay moderate.
 */
export function lineAcross(
  view: View,
  x0: number,
  y0: number,
  slope: number,
): { x1: number; y1: number; x2: number; y2: number } {
  let [a, b] = view.domain;
  const [lo, hi] = view.range;
  const span = hi - lo;
  if (slope !== 0) {
    const xAt = (y: number) => x0 + (y - y0) / slope;
    const [xa, xb] = [xAt(lo - span), xAt(hi + span)].sort((m, n) => m - n);
    a = Math.max(a, xa!);
    b = Math.min(b, xb!);
  }
  const yOf = (x: number) => y0 + slope * (x - x0);
  return {
    x1: view.px(a),
    y1: view.py(yOf(a)),
    x2: view.px(b),
    y2: view.py(yOf(b)),
  };
}

/** A numeric derivative shown to students: exactly 0 below 1e-8. */
export const cleanSlope = (d: number): number => (Math.abs(d) < 1e-8 ? 0 : d);

export interface VariationColumns {
  /** Bounds of the domain and the x where f' changes sign. */
  xs: number[];
  /** Sign of f' on each interval between consecutive xs. */
  signs: Sign[];
}

/** Columns of a variation table from the engine (numeric derivative signs). */
export function variationColumns(fn: FnId, domain: Interval): VariationColumns {
  const info = signChangeOf(x => derivative(fn, x), domain);
  return {
    xs: [domain[0], ...info.changes.map(c => cleanX(c.x)), domain[1]],
    signs: info.regions.map(r => r.sign),
  };
}

/** Index of the interval containing x (between consecutive xs). */
export function regionOf(cols: VariationColumns, x: number): number {
  const i = cols.xs.findIndex((c, k) => k > 0 && x <= c);
  return Math.max(0, Math.min(cols.signs.length - 1, i - 1));
}

/** A bisection result shown to students: 1e-9 from a round value snaps to it. */
const cleanX = (x: number) => {
  const r = Math.round(x * 1e6) / 1e6;
  return Math.abs(r - x) < 1e-9 ? r + 0 : x;
};

/**
 * Two readouts shown side by side for comparison, in the same format: both
 * exact fractions, or both scientific, or both with 3 decimals (0,290 next
 * to 0,324, never 0,29).
 */
export function readoutPair(a: number, b: number): [string, string] {
  const exact = (x: number) =>
    Number.isFinite(x) && toRational(x, { maxDen: 9, tol: 1e-9 }) !== null;
  const sci = (x: number) =>
    Math.abs(x) >= 1e5 || (x !== 0 && Math.abs(x) < 1e-3);
  if (exact(a) && exact(b)) {
    return [readoutNumber(a), readoutNumber(b)];
  }
  if (sci(a) || sci(b)) {
    return [scientific(a), scientific(b)];
  }
  const fixed = (x: number) =>
    Number.isFinite(x) ? x.toFixed(3).replace('.', ',') : '?';
  return [fixed(a), fixed(b)];
}
