/**
 * Props schemas of the analysis components (docs/COMPONENTS_ANALYSIS.md).
 * JSON-only; functions are registry ids. Values shown as facts are computed
 * by the engine: a point marker gives only x (y = f(x)), and an asymptote
 * marker is checked against the engine's limit.
 * Intervals are 2-number arrays, not tuples (the strict LLM schema has none).
 */
import { z } from 'zod';

import { RichSchema } from '../../content/schema';
import {
  derivative,
  evalFn,
  fnEntry,
  FN_IDS,
  limitProbe,
  signChangeOf,
  type FnId,
} from '../../engine/analysis';

export const FnIdSchema = z.enum(FN_IDS);

export const IntervalSchema = z
  .array(z.number())
  .length(2)
  .refine(([a, b]) => a! < b!, { message: 'interval needs a < b' });
const ix = (i: readonly number[]) => [i[0]!, i[1]!] as const;

/**
 * Plain short label drawn in the SVG (no LaTeX there). No digits and no
 * Arabic: numbers come from the engine through `showValue`.
 */
export const PlotLabel = z
  .string()
  .min(1)
  .max(16)
  .regex(/^[^0-9\u0600-\u06FF]*$/, {
    message: 'no digits or Arabic in plot labels (use showValue)',
  });

const markerFields = {
  at: z.number(),
  label: PlotLabel.optional(),
  /** Engine value next to the mark: (x ; f(x)) for a point, y = / x = for a line. */
  showValue: z.boolean().optional(),
};
export const MarkerSchema = z.discriminatedUnion('type', [
  /** (at, f(at)): y computed by the engine. */
  z.strictObject({ type: z.literal('point'), ...markerFields }),
  /** Horizontal guide y = at. */
  z.strictObject({ type: z.literal('hline'), ...markerFields }),
  /** Vertical guide x = at. */
  z.strictObject({ type: z.literal('vline'), ...markerFields }),
  /** Horizontal asymptote y = at: must equal the engine's limit at ±∞. */
  z.strictObject({ type: z.literal('asymptote'), ...markerFields }),
]);
export type Marker = z.infer<typeof MarkerSchema>;

type Ctx = z.RefinementCtx;

/** Domain inside the function's safe range (the engine throws beyond it). */
export function checkDomain(
  fn: FnId,
  domain: readonly number[],
  ctx: Ctx,
  path: string = 'domain',
): boolean {
  const safe = fnEntry(fn).safeAbsX;
  const [a, b] = ix(domain);
  if (safe !== undefined && (Math.abs(a) > safe || Math.abs(b) > safe)) {
    ctx.addIssue({
      code: 'custom',
      path: [path],
      message: `outside the safe range |x| <= ${safe} of ${fn}`,
    });
    return false;
  }
  return true;
}

const inside = (x: number, [a, b]: readonly number[]) => x >= a! && x <= b!;

export function checkMarkers(
  fn: FnId,
  domain: readonly number[],
  markers: readonly Marker[] | undefined,
  ctx: Ctx,
): void {
  (markers ?? []).forEach((m, i) => {
    const path = ['markers', i, 'at'];
    if ((m.type === 'point' || m.type === 'vline') && !inside(m.at, domain)) {
      ctx.addIssue({ code: 'custom', path, message: 'outside the domain' });
    }
    if (m.type === 'point' && !Number.isFinite(evalFn(fn, m.at))) {
      ctx.addIssue({
        code: 'custom',
        path,
        message: `${fn} is undefined here`,
      });
    }
    if (m.type === 'asymptote') {
      const ok = (['+inf', '-inf'] as const).some(dir => {
        const p = limitProbe(fn, dir);
        return p.converges && Math.abs(p.estimate - m.at) < 1e-6;
      });
      if (!ok) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `y = ${m.at} is not a horizontal asymptote of ${fn} (engine limit)`,
        });
      }
    }
  });
}

export const FunctionPlotPropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    domain: IntervalSchema.default([-4, 4]),
    /** y-range; computed from the curve when absent. */
    range: IntervalSchema.optional(),
    markers: z.array(MarkerSchema).max(6).optional(),
    shade: z
      .strictObject({
        from: z.number(),
        to: z.number(),
        sign: z.enum(['auto', 'pos', 'neg']).default('auto'),
      })
      .optional(),
    /** Curve drawn by sign: solid where f > 0, dashed where f < 0 (not color alone). */
    colorBySign: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (!checkDomain(p.fn, p.domain, ctx)) {
      return;
    }
    checkMarkers(p.fn, p.domain, p.markers, ctx);
    if (
      p.shade &&
      !(inside(p.shade.from, p.domain) && inside(p.shade.to, p.domain))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['shade'],
        message: 'outside the domain',
      });
    }
  });
export type FunctionPlotProps = z.output<typeof FunctionPlotPropsSchema>;

/** x inside [a, b]. */
function checkInDomain(
  x: number,
  domain: readonly number[],
  path: string,
  ctx: Ctx,
): void {
  if (!inside(x, domain)) {
    ctx.addIssue({
      code: 'custom',
      path: [path],
      message: 'outside the domain',
    });
  }
}

/** Slider grid: at most this many steps (precomputed, smooth on cheap phones). */
const MAX_STEPS = 400;

function checkStep(step: number, domain: readonly number[], ctx: Ctx): void {
  if ((domain[1]! - domain[0]!) / step > MAX_STEPS) {
    ctx.addIssue({
      code: 'custom',
      path: ['step'],
      message: `more than ${MAX_STEPS} slider steps`,
    });
  }
}

export const PointOnCurvePropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    x0: z.number().default(1),
    /** Also show (−x, f(−x)). Needs a domain symmetric about 0. */
    showMirror: z.boolean().default(true),
    /** A "compare" toggle switches to this function (e.g. a non-even one). */
    compareFn: FnIdSchema.optional(),
    domain: IntervalSchema.default([-3, 3]),
    range: IntervalSchema.optional(),
    step: z.number().positive().default(0.1),
  })
  .superRefine((p, ctx) => {
    if (
      !checkDomain(p.fn, p.domain, ctx) ||
      (p.compareFn && !checkDomain(p.compareFn, p.domain, ctx))
    ) {
      return;
    }
    if (p.showMirror && p.domain[0] !== -p.domain[1]!) {
      ctx.addIssue({
        code: 'custom',
        path: ['domain'],
        message: 'the mirror needs a domain symmetric about 0',
      });
    }
    checkInDomain(p.x0, p.domain, 'x0', ctx);
    checkStep(p.step, p.domain, ctx);
  });
export type PointOnCurveProps = z.output<typeof PointOnCurvePropsSchema>;

export const FoldSymmetryPropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    compareFn: FnIdSchema.optional(),
    /** Symmetric about 0 (the fold is the y-axis). */
    domain: IntervalSchema.default([-3, 3]),
    range: IntervalSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (
      !checkDomain(p.fn, p.domain, ctx) ||
      (p.compareFn && !checkDomain(p.compareFn, p.domain, ctx))
    ) {
      return;
    }
    if (p.domain[0] !== -p.domain[1]!) {
      ctx.addIssue({
        code: 'custom',
        path: ['domain'],
        message: 'the fold needs a domain symmetric about 0',
      });
    }
  });
export type FoldSymmetryProps = z.output<typeof FoldSymmetryPropsSchema>;

export const LimitExplorerPropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    /** Shown separately (∞/∞); must satisfy numerator / denominator = fn. */
    numerator: FnIdSchema.optional(),
    denominator: FnIdSchema.optional(),
    direction: z.enum(['+inf', '-inf']).default('+inf'),
    xMax: z.number().positive().max(50).default(10),
    /** Start zoomed near the asymptote. */
    zoom: z.boolean().default(false),
    step: z.number().positive().default(0.5),
  })
  .superRefine((p, ctx) => {
    const domain = p.direction === '+inf' ? [0, p.xMax] : [-p.xMax, 0];
    const fns = [p.fn, p.numerator, p.denominator].filter(
      (f): f is FnId => f !== undefined,
    );
    if (!fns.every(f => checkDomain(f, domain, ctx, 'xMax'))) {
      return;
    }
    checkStep(p.step, domain, ctx);
    if ((p.numerator === undefined) !== (p.denominator === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['denominator'],
        message: 'numerator and denominator go together',
      });
      return;
    }
    if (p.numerator && p.denominator) {
      const xs = [0.5, 1, 2, 5].map(x => (p.direction === '+inf' ? x : -x));
      const ok = xs.every(x => {
        const q = evalFn(p.numerator!, x) / evalFn(p.denominator!, x);
        const f = evalFn(p.fn, x);
        return Math.abs(q - f) <= 1e-9 * Math.max(1, Math.abs(f));
      });
      if (!ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['numerator'],
          message: `numerator / denominator is not ${p.fn} (engine samples)`,
        });
      }
    }
  });
export type LimitExplorerProps = z.output<typeof LimitExplorerPropsSchema>;

const DEFAULT_H = [3, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.01];

export const SecantToTangentPropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    x0: z.number().default(-1),
    /** Decreasing positive steps: the second point is (x0 + h, f(x0 + h)). */
    hSteps: z.array(z.number().positive()).min(2).max(10).default(DEFAULT_H),
    domain: IntervalSchema.default([-3, 3]),
    range: IntervalSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (!checkDomain(p.fn, p.domain, ctx)) {
      return;
    }
    if (p.hSteps.some((h, i) => i > 0 && h >= p.hSteps[i - 1]!)) {
      ctx.addIssue({
        code: 'custom',
        path: ['hSteps'],
        message: 'hSteps must decrease',
      });
    }
    for (const x of [p.x0, ...p.hSteps.map(h => p.x0 + h)]) {
      if (!inside(x, p.domain) || !Number.isFinite(evalFn(p.fn, x))) {
        ctx.addIssue({
          code: 'custom',
          path: ['x0'],
          message: `x = ${x} is outside the domain or where ${p.fn} is undefined`,
        });
        return;
      }
    }
  });
export type SecantToTangentProps = z.output<typeof SecantToTangentPropsSchema>;

export const TangentSlopePropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    x0: z.number().default(-1),
    domain: IntervalSchema.default([-3, 3]),
    range: IntervalSchema.optional(),
    step: z.number().positive().default(0.1),
    /** reveal_by_exploration: a mini variation table filled by visited regions. */
    showTable: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (!checkDomain(p.fn, p.domain, ctx)) {
      return;
    }
    checkInDomain(p.x0, p.domain, 'x0', ctx);
    checkStep(p.step, p.domain, ctx);
    // A derivative needs f defined around every slider position.
    if (fnEntry(p.fn).exclude?.some(e => inside(e, p.domain))) {
      ctx.addIssue({
        code: 'custom',
        path: ['domain'],
        message: `${p.fn} is undefined inside the domain`,
      });
    }
  });
export type TangentSlopeProps = z.output<typeof TangentSlopePropsSchema>;

const End = (inf: '-inf' | '+inf') => z.union([z.literal(inf), z.number()]);

export const VariationTableBuilderPropsSchema = z
  .strictObject({
    fn: FnIdSchema,
    /** Finite interval the engine scans for sign changes of f'. */
    scan: IntervalSchema.default([-5, 5]),
    /** Ends shown in the table: ±∞ (value = engine limit) or the scan bound. */
    ends: z
      .strictObject({ left: End('-inf'), right: End('+inf') })
      .default({ left: '-inf', right: '+inf' }),
    mode: z.literal('student_fill').default('student_fill'),
    prompt: RichSchema.optional(),
    maxAttempts: z.number().int().min(1).optional(),
  })
  .superRefine((p, ctx) => {
    if (!checkDomain(p.fn, p.scan, ctx, 'scan')) {
      return;
    }
    if (fnEntry(p.fn).exclude?.some(e => inside(e, p.scan))) {
      ctx.addIssue({
        code: 'custom',
        path: ['scan'],
        message: `${p.fn} is undefined inside the scan`,
      });
      return;
    }
    const [a, b] = ix(p.scan);
    if (
      (p.ends.left !== '-inf' && p.ends.left !== a) ||
      (p.ends.right !== '+inf' && p.ends.right !== b)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['ends'],
        message: 'a finite end must equal the scan bound',
      });
    }
    // With an infinite end, no sign change may hide beyond the scan.
    const safe = fnEntry(p.fn).safeAbsX ?? 1e6;
    const span = b - a;
    const wide = [
      p.ends.left === '-inf' ? Math.max(-safe / 2, a - 2 * span) : a,
      p.ends.right === '+inf' ? Math.min(safe / 2, b + 2 * span) : b,
    ] as const;
    const n = (i: readonly [number, number]) =>
      signChangeOf(x => derivative(p.fn, x), i).changes.length;
    if (n(wide) !== n([a, b])) {
      ctx.addIssue({
        code: 'custom',
        path: ['scan'],
        message: "f' changes sign outside the scan: widen it",
      });
    }
  });
export type VariationTableBuilderProps = z.output<
  typeof VariationTableBuilderPropsSchema
>;
