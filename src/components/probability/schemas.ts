/**
 * Props schemas of the probability components (docs/COMPONENTS_PROBABILITY.md).
 * JSON-only. `balls`, `draw` and `k` are required here, but the host fills them
 * from the exercise experiment when a spec omits them (contract rule 12), so
 * content and the planner can send only the interesting props.
 * Values shown as facts are recomputed by the engine: a prop that carries one
 * (`prefilled`, `law`) is checked here and rejected when it disagrees.
 */
import { z } from 'zod';

import { RichSchema } from '../../content/schema';
import {
  BallSchema,
  DrawSchema,
  enumerateOutcomes,
  EventSpecSchema,
  law,
  validateUrn,
  ValueFnSchema,
  type EventSpec,
  type ValueFn,
} from '../../engine/probability';
import {
  add,
  EngineError,
  equals,
  frac,
  type Fraction,
} from '../../engine/rational';
import { parseLatexSubset } from '../../lesson/math/latexSubset';

/** More outcomes than this do not fit a feed block (and would be slow to list). */
export const MAX_OUTCOMES = 60;

const experimentFields = {
  balls: z.array(BallSchema).min(1).max(12),
  draw: DrawSchema,
  k: z.number().int().min(1).max(4),
};

const FractionTuple = z.tuple([z.number().int(), z.number().int().min(1)]);

const MathString = z
  .string()
  .min(1)
  .max(40)
  .refine(
    s => {
      try {
        parseLatexSubset(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'must parse with the native math renderer' },
  );

type Ctx = z.RefinementCtx;

function checkExperiment(
  p: { balls: z.infer<typeof BallSchema>[]; draw: string; k: number },
  ctx: Ctx,
): boolean {
  try {
    const n = enumerateOutcomes(
      p.balls,
      p.draw as z.infer<typeof DrawSchema>,
      p.k,
    ).length;
    if (n > MAX_OUTCOMES) {
      ctx.addIssue({ code: 'custom', message: `too many outcomes (${n})` });
      return false;
    }
    return true;
  } catch (e) {
    if (e instanceof EngineError) {
      ctx.addIssue({ code: 'custom', message: e.message });
      return false;
    }
    throw e;
  }
}

/**
 * E4: a view that lists no draws (Urn in display mode) is not capped. The urn
 * and the draw are still checked, without enumerating the draws.
 */
function checkDrawable(
  p: { balls: z.infer<typeof BallSchema>[]; draw: string; k: number },
  ctx: Ctx,
): boolean {
  try {
    validateUrn(p.balls);
  } catch (e) {
    if (e instanceof EngineError) {
      ctx.addIssue({ code: 'custom', message: e.message });
      return false;
    }
    throw e;
  }
  if (p.draw !== 'ordered_with_replacement' && p.k > p.balls.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'cannot draw more balls than the urn holds',
    });
    return false;
  }
  return true;
}

/** `value_eq` events need a valueFn, in the event or in the props. */
function needsValueFn(event: EventSpec): boolean {
  switch (event.id) {
    case 'value_eq':
      return event.args.valueFn === undefined;
    case 'not':
      return needsValueFn(event.args.event);
    case 'and':
    case 'or':
      return event.args.events.some(needsValueFn);
    default:
      return false;
  }
}

function checkEventValueFn(
  p: { event?: EventSpec | undefined; valueFn?: ValueFn | undefined },
  ctx: Ctx,
) {
  if (p.event && p.valueFn === undefined && needsValueFn(p.event)) {
    ctx.addIssue({
      code: 'custom',
      path: ['valueFn'],
      message: 'value_eq needs a valueFn',
    });
  }
}

export const UrnPropsSchema = z
  .strictObject({
    ...experimentFields,
    mode: z.enum(['display', 'select']).default('display'),
    selected: z.array(z.string()).optional(),
    /** Subtle prime mark so two "0" balls are distinguishable (0, 0′). */
    markDuplicates: z.boolean().default(true),
    /** Shows the value of the selected draw (e.g. the product) once k balls are chosen. */
    valueFn: ValueFnSchema.optional(),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (p.mode === 'display') {
      checkDrawable(p, ctx);
    } else {
      checkExperiment(p, ctx);
    }
    const ids = new Set(p.balls.map(b => b.id));
    if (p.selected?.some(id => !ids.has(id))) {
      ctx.addIssue({
        code: 'custom',
        path: ['selected'],
        message: 'unknown ball',
      });
    }
  });
export type UrnProps = z.output<typeof UrnPropsSchema>;

export const OutcomeSpacePropsSchema = z
  .strictObject({
    ...experimentFields,
    valueFn: ValueFnSchema.optional(),
    colorBy: z.enum(['value', 'event', 'none']).default('none'),
    event: EventSpecSchema.optional(),
    layout: z.enum(['grid', 'list']).default('grid'),
    showCount: z.boolean().default(true),
    /** Outcome ids to emphasize. */
    highlight: z.array(z.string()).optional(),
    markDuplicates: z.boolean().default(true),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    checkExperiment(p, ctx);
    if (p.colorBy === 'value' && !p.valueFn) {
      ctx.addIssue({
        code: 'custom',
        path: ['valueFn'],
        message: 'colorBy value needs a valueFn',
      });
    }
    if (p.colorBy === 'event' && !p.event) {
      ctx.addIssue({
        code: 'custom',
        path: ['event'],
        message: 'colorBy event needs an event',
      });
    }
    checkEventValueFn(p, ctx);
  });
export type OutcomeSpaceProps = z.output<typeof OutcomeSpacePropsSchema>;

export const EventPickerPropsSchema = z
  .strictObject({
    ...experimentFields,
    valueFn: ValueFnSchema.optional(),
    event: EventSpecSchema,
    prompt: RichSchema.optional(),
    /** "live": the selected/total fraction updates on every tap; "on_submit": shown once correct. */
    reveal: z.enum(['live', 'on_submit']).default('on_submit'),
    showFraction: z.boolean().default(true),
    /** Stops accepting submits after this many wrong ones (the host decides what follows). */
    maxAttempts: z.number().int().min(1).max(10).optional(),
    /** Shows each draw's value (e.g. the product) on its chip. */
    showValues: z.boolean().default(false),
    markDuplicates: z.boolean().default(true),
  })
  .superRefine((p, ctx) => {
    checkExperiment(p, ctx);
    checkEventValueFn(p, ctx);
    if (p.showValues && !p.valueFn) {
      ctx.addIssue({
        code: 'custom',
        path: ['showValues'],
        message: 'showValues needs a valueFn',
      });
    }
  });
export type EventPickerProps = z.output<typeof EventPickerPropsSchema>;

export const ComplementViewPropsSchema = z
  .strictObject({
    ...experimentFields,
    event: EventSpecSchema,
    valueFn: ValueFnSchema.optional(),
    /** to_complement: p(E) known, find p(Ē). from_complement: p(Ē) known, find p(E) = 1 − p(Ē). */
    direction: z
      .enum(['to_complement', 'from_complement'])
      .default('from_complement'),
    interactive: z.boolean().default(true),
    /** Math names of the event and its complement (default E and Ē). */
    labels: z
      .strictObject({ event: MathString, complement: MathString })
      .optional(),
  })
  .superRefine((p, ctx) => {
    checkExperiment(p, ctx);
    checkEventValueFn(p, ctx);
  });
export type ComplementViewProps = z.output<typeof ComplementViewPropsSchema>;

export const LawBuilderPropsSchema = z
  .strictObject({
    ...experimentFields,
    valueFn: ValueFnSchema,
    mode: z
      .enum([
        'assign_outcomes',
        'fill_probabilities',
        'readonly',
        'progressive',
      ])
      .default('fill_probabilities'),
    /** Cells given to the student, keyed by value ("-2"). Checked against the engine. */
    prefilled: z.record(z.string(), FractionTuple).optional(),
    showSumCheck: z.boolean().default(true),
    markDuplicates: z.boolean().default(true),
  })
  .superRefine((p, ctx) => {
    if (!checkExperiment(p, ctx) || !p.prefilled) {
      return;
    }
    const rows = law(p.valueFn, enumerateOutcomes(p.balls, p.draw, p.k));
    for (const [key, given] of Object.entries(p.prefilled)) {
      const row = rows.find(r => String(r.value) === key);
      if (!row || !equals(row.p, frac(given[0], given[1]))) {
        ctx.addIssue({
          code: 'custom',
          path: ['prefilled', key],
          message: 'prefilled value disagrees with the engine',
        });
      }
    }
  });
export type LawBuilderProps = z.output<typeof LawBuilderPropsSchema>;

export const LawRowsSchema = z
  .array(z.strictObject({ value: z.number().int(), p: FractionTuple }))
  .min(1)
  .max(12);

export const MomentStepSchema = z.enum(['E', 'E2', 'V']);
export type MomentStep = z.infer<typeof MomentStepSchema>;

export const LawChartPropsSchema = z
  .strictObject({
    balls: experimentFields.balls.optional(),
    draw: experimentFields.draw.optional(),
    k: experimentFields.k.optional(),
    valueFn: ValueFnSchema.optional(),
    /**
     * A law given directly. Must sum to 1. With `of` (E3), it is the law of
     * that value function on the urn and the engine recomputes every row
     * (draws are not listed, so the 60-draw cap does not apply).
     */
    law: z
      .strictObject({ rows: LawRowsSchema, of: ValueFnSchema.optional() })
      .optional(),
    /** Steps the student can reveal, in this order. */
    reveal: z.array(MomentStepSchema).max(3).default([]),
    showFormula: z.boolean().default(true),
    markDuplicates: z.boolean().default(true),
  })
  .superRefine((p, ctx) => {
    if (p.law) {
      const values = p.law.rows.map(r => r.value);
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['law'],
          message: 'duplicate value',
        });
      }
      const sum = p.law.rows.reduce<Fraction>(
        (s, r) => add(s, frac(r.p[0], r.p[1])),
        [0, 1],
      );
      if (!equals(sum, [1, 1]) || p.law.rows.some(r => r.p[0] < 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['law'],
          message: 'probabilities must be >= 0 and sum to 1',
        });
      }
      if (p.law.of !== undefined) {
        checkLawOf(p.law.rows, p.law.of, p, ctx);
      }
      return;
    }
    if (!p.valueFn || !p.balls || !p.draw || p.k === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'LawChart needs a law, or valueFn with an experiment',
      });
      return;
    }
    checkExperiment({ balls: p.balls, draw: p.draw, k: p.k }, ctx);
  });
export type LawChartProps = z.output<typeof LawChartPropsSchema>;

/** E3: every row of a given law equals the engine's law of `of` on the urn. */
function checkLawOf(
  rows: z.infer<typeof LawRowsSchema>,
  of: ValueFn,
  p: {
    balls?: z.infer<typeof BallSchema>[] | undefined;
    draw?: z.infer<typeof DrawSchema> | undefined;
    k?: number | undefined;
  },
  ctx: Ctx,
) {
  if (!p.balls || !p.draw || p.k === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['law', 'of'],
      message: 'law.of needs the urn (balls, draw, k)',
    });
    return;
  }
  let engine: { value: number; p: Fraction }[];
  try {
    engine = law(of, enumerateOutcomes(p.balls, p.draw, p.k));
  } catch (e) {
    if (e instanceof EngineError) {
      ctx.addIssue({ code: 'custom', path: ['law', 'of'], message: e.message });
      return;
    }
    throw e;
  }
  const agrees =
    engine.length === rows.length &&
    engine.every(r => {
      const given = rows.find(g => g.value === r.value);
      return given !== undefined && equals(r.p, frac(given.p[0], given.p[1]));
    });
  if (!agrees) {
    ctx.addIssue({
      code: 'custom',
      path: ['law', 'rows'],
      message: 'law disagrees with the engine',
    });
  }
}
