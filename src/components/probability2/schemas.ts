/**
 * Props of the probability2 components (docs/COMPONENTS_PROBABILITY_V2.md).
 * JSON only. Every number the components show is computed by the engine from
 * these props; the schema checks the engine's view of them (caps by formula,
 * not by listing; the coincidence guard for examples meant to tell two methods
 * apart). Rationals travel as strings; none is needed by these two components.
 */
import { z } from 'zod';

import { RichSchema } from '../../content/schema';
import { MAX_ENUMERATION, choose } from '../../engine/combinatorics';
import {
  assertNoCoincidence,
  distinctAtGrid,
  type StageSpec,
} from '../../engine/coincidence';
import { spreadFrame } from '../../engine/distribution';
import { sliceCountsFor } from '../../engine/grouping';
import { checkBinomialGrid } from '../../engine/binomialSafe';
import { MAX_TICKS, MIN_TICKS, quantityOf } from '../../engine/partWhole';
import { BallSchema, validateUrn } from '../../engine/probability';
import { EngineError, add, compare, div, frac, sub, type Fraction } from '../../engine/rational';
import {
  RatSchema,
  isInteger,
  mulInt,
  parseRat,
  ratToString,
  sameRat,
  sumRat,
} from '../../engine/rationalFormat';
import { repeatedRuns, tally } from '../../engine/runs';
import { URN_TEMPLATES, generateUrnVariant } from '../../engine/urnVariants';
import {
  CHECKPOINT_GRID,
  findEndsExpression,
  largerSpread,
} from '../../engine/spreadChecks';

/** Boxes listed at once (each is a tappable element; the cap of 60 elements leaves room for the orderings). */
export const MAX_BOXES_LISTED = 24;
/** Options a stage lists as chips. */
export const MAX_OPTIONS = 15;

function engineIssue<T>(ctx: z.RefinementCtx, path: (string | number)[], f: () => T): T | undefined {
  try {
    return f();
  } catch (e) {
    if (e instanceof EngineError) {
      ctx.addIssue({ code: 'custom', path, message: e.message });
      return undefined;
    }
    throw e;
  }
}

export const GroupBoxesPropsSchema = z
  .strictObject({
    balls: z.array(BallSchema).min(3).max(12),
    /** Balls in a draw (and in a box). k = 2 is allowed only with meantToDistinguish false. */
    k: z.number().int().min(2).max(4),
    /** One box per set of balls, or the boxes split by how many balls have a value. */
    groupBy: z
      .union([
        z.literal('ball_set'),
        z.strictObject({
          property: z.strictObject({ value: z.number().int() }),
        }),
      ])
      .default('ball_set'),
    /** ball_set only. Default: every box when there are at most 24, else one at a time. */
    mode: z.enum(['show_all', 'one_box_expanded']).optional(),
    /** The example must tell "divide by the orderings" from "divide by the balls" (k = k! for k = 2). */
    meantToDistinguish: z.boolean().default(true),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (
      engineIssue(ctx, ['balls'], () => {
        validateUrn(p.balls);
        return true;
      }) === undefined
    ) {
      return;
    }
    if (p.k > p.balls.length) {
      ctx.addIssue({ code: 'custom', path: ['k'], message: 'cannot draw more balls than the urn holds' });
      return;
    }
    const boxes = choose(p.balls.length, p.k);
    if (boxes > MAX_ENUMERATION) {
      ctx.addIssue({ code: 'custom', path: ['balls'], message: `${boxes} boxes` });
    }
    if (p.groupBy === 'ball_set') {
      if (p.mode === 'show_all' && boxes > MAX_BOXES_LISTED) {
        ctx.addIssue({
          code: 'custom',
          path: ['mode'],
          message: `${boxes} boxes: show_all lists at most ${MAX_BOXES_LISTED}`,
        });
      }
      if (p.meantToDistinguish) {
        engineIssue(ctx, ['k'], () =>
          assertNoCoincidence({ kind: 'boxes', n: p.balls.length, k: p.k }),
        );
      }
    } else {
      if (p.mode !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['mode'], message: 'mode is for ball_set' });
      }
      const slices = engineIssue(ctx, ['groupBy'], () =>
        sliceCountsFor(p.balls, 'simultaneous', p.k, p.groupBy === 'ball_set' ? 0 : p.groupBy.property.value),
      );
      if (slices && slices.filter(s => s.count > 0).length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupBy'],
          message: 'the property splits the boxes into one slice only',
        });
      }
    }
  });
export type GroupBoxesProps = z.output<typeof GroupBoxesPropsSchema>;

/** The mode the view uses. */
export function resolvedBoxMode(p: GroupBoxesProps): 'show_all' | 'one_box_expanded' {
  return (
    p.mode ??
    (choose(p.balls.length, p.k) <= MAX_BOXES_LISTED ? 'show_all' : 'one_box_expanded')
  );
}

const Label = z.string().regex(/^[A-Za-z0-9]{1,10}$/);

const StageSchema = z
  .strictObject({
    /** Arabic name of the stage ("a red ball"): content text, checked as any Rich. */
    title: RichSchema.optional(),
    balls: z.array(BallSchema).min(1).max(8).optional(),
    labels: z.array(Label).min(1).max(8).optional(),
    /** How many of the items the student picks (1: one item; 2: a pair). */
    size: z.number().int().min(1).max(3),
  })
  .superRefine((s, ctx) => {
    if ((s.balls === undefined) === (s.labels === undefined)) {
      ctx.addIssue({ code: 'custom', message: 'a stage has balls or labels, not both and not neither' });
      return;
    }
    const n = (s.balls ?? s.labels)!.length;
    if (s.size > n) {
      ctx.addIssue({ code: 'custom', path: ['size'], message: 'cannot pick more items than the stage holds' });
      return;
    }
    if (s.balls) {
      engineIssue(ctx, ['balls'], () => {
        validateUrn(s.balls!);
        return true;
      });
    }
    if (s.labels && new Set(s.labels).size !== s.labels.length) {
      ctx.addIssue({ code: 'custom', path: ['labels'], message: 'duplicate label' });
    }
    if (choose(n, s.size) > MAX_OPTIONS) {
      ctx.addIssue({
        code: 'custom',
        message: `${choose(n, s.size)} options: a stage lists at most ${MAX_OPTIONS}`,
      });
    }
  });
export type StageProps = z.output<typeof StageSchema>;

export const ChoiceProductPropsSchema = z
  .strictObject({
    stages: z.array(StageSchema).length(2),
    /** and: rows x columns. or: the two lists end to end. */
    mode: z.enum(['and', 'or']).default('and'),
    /** The student can switch between the two pictures (they are two different counts). */
    allowSwitch: z.boolean().default(true),
    /** The counts must tell a + b from a x b, and a choice of k from its balls. */
    meantToDistinguish: z.boolean().default(true),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (p.meantToDistinguish) {
      const stages: StageSpec[] = p.stages.map(s => {
        const n = (s.balls ?? s.labels ?? []).length;
        return s.size === 1 ? { options: n } : { n, k: s.size };
      });
      engineIssue(ctx, ['stages'], () =>
        assertNoCoincidence({ kind: 'staged', mode: p.mode, stages }),
      );
    }
  });
export type ChoiceProductProps = z.output<typeof ChoiceProductPropsSchema>;

// ---------------------------------------------------------------------------
// SlotsPattern

/** Patterns listed at once; above it the component counts without listing. */
export const MAX_LIST = 60;

const BridgeBall = z.strictObject({ id: Label, label: Label });

export const SlotsPatternPropsSchema = z
  .strictObject({
    /** Slots in a row. */
    n: z.number().int().min(2).max(7),
    /** Slots to mark (the first symbol, S). In build_pascal, the k the student starts on. */
    k: z.number().int().min(0).max(7),
    mode: z.enum(['free', 'guided', 'build_pascal', 'bridge']).default('free'),
    /** bridge: the same slots over n labelled balls (marked = chosen, empty = left in the box). */
    bridge: z.strictObject({ balls: z.array(BridgeBall).min(2).max(7) }).optional(),
    /** More patterns than this are counted, not listed. */
    listCap: z.number().int().min(4).max(MAX_LIST).default(MAX_LIST),
    /** The example must tell C(n,k) from n x k, n + k, ... (k = 2 often cannot). */
    meantToDistinguish: z.boolean().default(true),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (p.k > p.n) {
      ctx.addIssue({ code: 'custom', path: ['k'], message: 'k cannot exceed n' });
      return;
    }
    if (p.mode === 'bridge') {
      if (!p.bridge || p.bridge.balls.length !== p.n) {
        ctx.addIssue({
          code: 'custom',
          path: ['bridge'],
          message: 'bridge mode needs exactly n balls',
        });
      } else {
        const ids = new Set(p.bridge.balls.map(b => b.id));
        const labels = new Set(p.bridge.balls.map(b => b.label));
        if (ids.size !== p.n || labels.size !== p.n) {
          ctx.addIssue({ code: 'custom', path: ['bridge'], message: 'duplicate ball id or label' });
        }
      }
      if (2 * p.k === p.n) {
        ctx.addIssue({
          code: 'custom',
          path: ['k'],
          message: 'k = n - k: flipping the marks would change nothing',
        });
      }
    } else if (p.bridge !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['bridge'], message: 'balls are for bridge mode' });
    }
    if (p.mode === 'build_pascal') {
      if (p.n > 5) {
        ctx.addIssue({ code: 'custom', path: ['n'], message: 'build_pascal is for n up to 5' });
      }
      return;
    }
    if (p.k < 1 || p.k > p.n - 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['k'],
        message: 'a list of patterns needs 1 <= k <= n - 1',
      });
      return;
    }
    if (p.meantToDistinguish) {
      engineIssue(ctx, ['k'], () =>
        assertNoCoincidence({ kind: 'subset', n: p.n, k: p.k }),
      );
    }
  });
export type SlotsPatternProps = z.output<typeof SlotsPatternPropsSchema>;

// ---------------------------------------------------------------------------
// PartWholeBar

/** A part shown against its whole is at most this many wholes (the bar must stay readable). */
export const MAX_FEEDBACK_RATIO = 10;

export const PartWholeBarPropsSchema = z
  .strictObject({
    whole: RatSchema,
    /** feedback only: the value the student wrote. */
    part: RatSchema.optional(),
    mode: z.enum(['place', 'fraction_of_quantity', 'feedback']),
    /** fraction_of_quantity only: 1/6 of 36. */
    fraction: RatSchema.optional(),
    /** What the whole counts (draws, balls), shown beside it. */
    unit: RichSchema.optional(),
    ticks: z.number().int().min(MIN_TICKS).max(MAX_TICKS).default(6),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const whole = parseRat(p.whole);
    if (!whole || compare(whole, frac(0)) <= 0) {
      ctx.addIssue({ code: 'custom', path: ['whole'], message: 'the whole must be above zero' });
      return;
    }
    const bad = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (p.mode === 'place') {
      if (p.part !== undefined) {
        bad('part', 'place has no part: the student places it');
      }
      if (p.fraction !== undefined) {
        bad('fraction', 'place has no fraction');
      }
      return;
    }
    if (p.mode === 'feedback') {
      if (p.fraction !== undefined) {
        bad('fraction', 'feedback has no fraction');
      }
      const part = p.part === undefined ? null : parseRat(p.part);
      if (part === null) {
        bad('part', 'feedback needs the part');
      } else if (compare(part, frac(0)) < 0) {
        bad('part', 'the part cannot be below zero');
      } else if (compare(div(part, whole), frac(MAX_FEEDBACK_RATIO)) > 0) {
        bad('part', `the part is more than ${MAX_FEEDBACK_RATIO} wholes`);
      }
      return;
    }
    // fraction_of_quantity
    if (p.part !== undefined) {
      bad('part', 'the quantity is computed, not given');
    }
    const fraction = p.fraction === undefined ? null : parseRat(p.fraction);
    if (fraction === null) {
      bad('fraction', 'fraction_of_quantity needs the fraction');
      return;
    }
    if (compare(fraction, frac(0)) <= 0 || compare(fraction, frac(1)) > 0) {
      bad('fraction', 'the fraction must be above 0 and at most 1');
      return;
    }
    if (!isInteger(whole) || whole[0] < 2 || whole[0] > 120) {
      bad('whole', 'the quantity is a whole number from 2 to 120');
      return;
    }
    if (!isInteger(quantityOf(whole, fraction))) {
      bad('fraction', 'the fraction of the quantity is not a whole number');
      return;
    }
    if (!isInteger(mulInt(fraction, p.ticks))) {
      bad('ticks', 'the fraction does not land on a tick');
    }
  });
export type PartWholeBarProps = z.output<typeof PartWholeBarPropsSchema>;

// ---------------------------------------------------------------------------
// SpreadSlider

/** At most this many positions on the p slider (a stepped control, no drag precision). */
export const MAX_SPREAD_POSITIONS = 21;

const SpreadShow = z.strictObject({
  distances: z.boolean().default(true),
  squares: z.boolean().default(true),
  contributions: z.boolean().default(true),
  total: z.boolean().default(true),
});

export const SpreadSliderPropsSchema = z
  .strictObject({
    /** The values of the variable; the Bernoulli family has two (P(values[1]) = p). */
    values: z.array(z.number().int().min(-20).max(20)).min(2).max(5).default([0, 1]),
    family: z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('bernoulli'),
        p: z.strictObject({
          min: RatSchema,
          max: RatSchema,
          step: RatSchema,
          init: RatSchema,
        }),
      }),
      z.strictObject({
        kind: z.literal('fixed'),
        probabilities: z.array(RatSchema).min(2).max(5),
      }),
      z.strictObject({
        kind: z.literal('scenarios'),
        scenarios: z
          .array(
            z.strictObject({
              id: Label,
              probabilities: z.array(RatSchema).min(2).max(5),
            }),
          )
          .min(2)
          .max(3),
        /** The scenarios share their mean (so only the spread tells them apart). */
        sameMean: z.boolean().optional(),
      }),
    ]),
    show: SpreadShow.default({
      distances: true,
      squares: true,
      contributions: true,
      total: true,
    }),
    /** The total waits until this many DISTINCT positions were visited (default 3). */
    totalLockedUntil: z
      .strictObject({ positions: z.number().int().min(1).max(5) })
      .optional(),
    checkpoint: z
      .discriminatedUnion('kind', [
        z.strictObject({
          kind: z.literal('larger_spread'),
          options: z.array(RatSchema).min(2).max(4),
        }),
        z.strictObject({
          kind: z.literal('zero_at_ends'),
          expressions: z.array(z.string().min(1).max(20)).min(3).max(5),
        }),
      ])
      .optional(),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const bad = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (new Set(p.values).size !== p.values.length) {
      bad(['values'], 'duplicate value');
      return;
    }
    const rat = (s: string) => parseRat(s);
    let positions = 0;
    const f = p.family;
    if (f.kind === 'bernoulli') {
      if (p.values.length !== 2) {
        bad(['values'], 'the Bernoulli family has two values');
        return;
      }
      const [min, max, step, init] = [f.p.min, f.p.max, f.p.step, f.p.init].map(rat);
      if (!min || !max || !step || !init) {
        bad(['family', 'p'], 'p is not rational');
        return;
      }
      if (
        compare(min, frac(0)) < 0 ||
        compare(max, frac(1)) > 0 ||
        compare(min, max) >= 0 ||
        compare(step, frac(0)) <= 0
      ) {
        bad(['family', 'p'], 'need 0 <= min < max <= 1 and a step above 0');
        return;
      }
      const span = div(sub(max, min), step);
      if (!isInteger(span) || span[0] + 1 > MAX_SPREAD_POSITIONS) {
        bad(['family', 'p', 'step'], `the step must cut [min, max] into at most ${MAX_SPREAD_POSITIONS - 1} equal parts`);
        return;
      }
      const at = div(sub(init, min), step);
      if (!isInteger(at) || compare(init, min) < 0 || compare(init, max) > 0) {
        bad(['family', 'p', 'init'], 'init must be on the grid');
        return;
      }
      positions = span[0] + 1;
    } else {
      const lists =
        f.kind === 'fixed'
          ? [f.probabilities]
          : f.scenarios.map(s => s.probabilities);
      for (const [i, list] of lists.entries()) {
        const where = f.kind === 'fixed' ? ['family', 'probabilities'] : ['family', 'scenarios', i];
        if (list.length !== p.values.length) {
          bad(where, 'one probability per value');
          return;
        }
        const ps = list.map(rat);
        if (ps.some(x => x === null || compare(x, frac(0)) < 0) || !sameRat(sumRat(ps as Fraction[]), frac(1))) {
          bad(where, 'the probabilities must be at least 0 and add up to 1');
          return;
        }
      }
      if (f.kind === 'scenarios') {
        if (new Set(f.scenarios.map(s => s.id)).size !== f.scenarios.length) {
          bad(['family', 'scenarios'], 'duplicate scenario id');
          return;
        }
        if (f.sameMean === true) {
          const means = f.scenarios.map(s =>
            engineIssue(ctx, ['family', 'scenarios'], () =>
              spreadFrame(p.values, s.probabilities.map(x => rat(x)!)).mean,
            ),
          );
          if (means.some(m => m === undefined)) {
            return;
          }
          if (!means.every(m => sameRat(m!, means[0]!))) {
            bad(['family', 'sameMean'], 'sameMean is set but the means differ');
            return;
          }
        }
      }
      positions = f.kind === 'fixed' ? p.values.length : f.scenarios.length;
    }
    if (p.totalLockedUntil !== undefined) {
      if (!p.show.total) {
        bad(['totalLockedUntil'], 'no total is shown, so nothing waits');
      } else if (p.totalLockedUntil.positions > positions) {
        bad(['totalLockedUntil', 'positions'], `only ${positions} positions exist`);
      }
    } else if (p.show.total && positions < 3) {
      bad(['show', 'total'], 'the default lock needs at least 3 positions');
    }
    const c = p.checkpoint;
    if (c === undefined) {
      return;
    }
    if (f.kind !== 'bernoulli') {
      bad(['checkpoint'], 'checkpoints are for the Bernoulli family');
      return;
    }
    if (c.kind === 'larger_spread') {
      const options = c.options.map(rat);
      if (options.some(x => x === null)) {
        bad(['checkpoint', 'options'], 'not rational');
        return;
      }
      const r = largerSpread(options as Fraction[]);
      if (!r.ok) {
        bad(['checkpoint', 'options'], r.reason === 'tie' ? 'two options tie (p and 1 - p have the same spread)' : 'p must be between 0 and 1');
      }
    } else {
      const found = findEndsExpression(c.expressions);
      if (!found.ok) {
        bad(['checkpoint', 'expressions'], `exactly one expression must be 0 at both ends and largest at 1/2 (${found.reason})`);
        return;
      }
      const grid = engineIssue(ctx, ['checkpoint', 'expressions'], () =>
        distinctAtGrid(c.expressions, 'p', CHECKPOINT_GRID, 2),
      );
      if (grid && !grid.ok) {
        bad(['checkpoint', 'expressions'], 'two expressions coincide on the sample points');
      }
    }
  });
export type SpreadSliderProps = z.output<typeof SpreadSliderPropsSchema>;

// ---------------------------------------------------------------------------
// RepeatedRuns

/** Cells the student can tap (each a 44 pt target; the rest are drawn, not tapped). */
export const MAX_SHADE_CELLS = 36;

const RunStage = z.strictObject({
  label: RichSchema.optional(),
  p: RatSchema,
});

export const RepeatedRunsPropsSchema = z
  .strictObject({
    /** The number of repetitions of the experiment: 4 to 60. */
    N: z.number().int().min(4).max(60),
    mode: z.enum(['fraction_of_total', 'two_stage', 'tally']),
    stages: z.array(RunStage).min(1).max(3).optional(),
    tally: z
      .strictObject({
        values: z.array(z.number().int().min(-20).max(20)).min(2).max(6),
        probabilities: z.array(RatSchema).min(2).max(6),
      })
      .optional(),
    /** shade: the student taps the cells (fraction_of_total, N <= 36). watch: a button advances the picture. */
    interaction: z.enum(['shade', 'watch']).default('watch'),
    cols: z.number().int().min(4).max(10).default(6),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const bad = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (p.mode === 'tally') {
      if (p.stages !== undefined) {
        bad('stages', 'tally has no stages');
      }
      if (p.interaction !== 'watch') {
        bad('interaction', 'tally is watched, not shaded');
      }
      if (p.tally === undefined) {
        bad('tally', 'tally needs the law');
        return;
      }
      const r = tally(
        p.tally.values,
        p.tally.probabilities.map(x => parseRat(x) ?? frac(-1)),
        p.N,
      );
      if (!r.ok) {
        bad(
          'tally',
          r.reason === 'not_integer'
            ? `N x P(X = ${r.x}) is not a whole number of runs`
            : `not a law (${r.reason})`,
        );
      }
      return;
    }
    if (p.tally !== undefined) {
      bad('tally', 'only the tally mode has a law');
    }
    const want = p.mode === 'two_stage' ? 2 : 1;
    if (p.stages === undefined || p.stages.length !== want) {
      bad('stages', `${p.mode} has ${want} stage${want > 1 ? 's' : ''}`);
      return;
    }
    const r = repeatedRuns(
      p.N,
      p.stages.map(s => parseRat(s.p) ?? frac(-1)),
    );
    if (!r.ok) {
      bad(
        'stages',
        r.reason === 'not_integer'
          ? `${p.N} runs do not split into whole numbers at stage ${r.stage}`
          : `bad stages (${r.reason})`,
      );
      return;
    }
    if ((r.counts[r.counts.length - 1] ?? 0) < 1) {
      bad('stages', 'the last stage has no run');
    }
    if (p.interaction === 'shade') {
      if (p.mode !== 'fraction_of_total') {
        bad('interaction', 'only fraction_of_total can be shaded');
      }
      if (p.N > MAX_SHADE_CELLS) {
        bad('N', `shading is for at most ${MAX_SHADE_CELLS} runs (each cell is a 44 pt target)`);
      }
      if (p.cols > 6) {
        bad('cols', 'shaded cells are 44 pt wide: at most 6 columns');
      }
    }
  });
export type RepeatedRunsProps = z.output<typeof RepeatedRunsPropsSchema>;

// ---------------------------------------------------------------------------
// BinomialExplorer

/** Bars the student can tap: 6 bars of 44 pt fit the 360 pt column (7 do not). */
export const MAX_TAPPABLE_BARS = 6;

export const BinomialExplorerPropsSchema = z
  .strictObject({
    /** The number of trials: the loader proves every (n, p) of the grid is exact (n <= 15). */
    n: z.strictObject({
      min: z.number().int().min(1).max(15),
      max: z.number().int().min(1).max(15),
      init: z.number().int().min(1).max(15),
    }),
    p: z.union([
      z.strictObject({ fixed: RatSchema }),
      z.strictObject({
        min: RatSchema,
        max: RatSchema,
        step: RatSchema,
        init: RatSchema,
      }),
    ]),
    toggles: z
      .strictObject({
        mean: z.boolean().default(true),
        variance: z.boolean().default(true),
      })
      .default({ mean: true, variance: true }),
    /** The general formula waits until this many DISTINCT bars were looked at (default 2). */
    formulaLockedUntilTaps: z.number().int().min(0).max(3).default(2),
    /** Show the patterns of a bar (SlotsPattern, read only): for at most 7 trials. */
    linkSlots: z.boolean().default(false),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const bad = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (p.n.min > p.n.max || p.n.init < p.n.min || p.n.init > p.n.max) {
      bad(['n'], 'need min <= init <= max');
      return;
    }
    let ps: Fraction[];
    if ('fixed' in p.p) {
      const x = parseRat(p.p.fixed);
      ps = x ? [x] : [];
    } else {
      const [min, max, step, init] = [p.p.min, p.p.max, p.p.step, p.p.init].map(s =>
        parseRat(s),
      );
      if (!min || !max || !step || !init) {
        bad(['p'], 'p is not rational');
        return;
      }
      if (compare(min, max) >= 0 || compare(step, frac(0)) <= 0) {
        bad(['p'], 'need min < max and a step above 0');
        return;
      }
      const span = div(sub(max, min), step);
      if (!isInteger(span) || span[0] + 1 > MAX_SPREAD_POSITIONS) {
        bad(['p', 'step'], `the step must cut [min, max] into at most ${MAX_SPREAD_POSITIONS - 1} equal parts`);
        return;
      }
      if (!isInteger(div(sub(init, min), step)) || compare(init, min) < 0 || compare(init, max) > 0) {
        bad(['p', 'init'], 'init must be on the grid');
        return;
      }
      ps = Array.from({ length: span[0] + 1 }, (_, i) => add(min, mulInt(step, i)));
    }
    if (ps.length === 0 || ps.some(x => compare(x, frac(0)) <= 0 || compare(x, frac(1)) >= 0)) {
      bad(['p'], 'p must be strictly between 0 and 1');
      return;
    }
    const safe = checkBinomialGrid(p.n.min, p.n.max, ps);
    if (!safe.ok) {
      bad(['n'], `n = ${safe.n} with p = ${ratToString(safe.p)} is not exact (${safe.reason}): lower n.max or use a p with a smaller denominator`);
    }
    if (p.linkSlots && p.n.max > 7) {
      bad(['linkSlots'], 'the patterns are shown for at most 7 trials');
    }
  });
export type BinomialExplorerProps = z.output<typeof BinomialExplorerPropsSchema>;

// ---------------------------------------------------------------------------
// VariableTable

/** Outcomes the student places one by one (each a tappable row): with the value chips and the checks, at most 60 elements. */
export const MAX_TABLE_OUTCOMES = 48;

const TableCheck = z.enum(['all_used', 'sum', 'symmetry', 'law']);

export const VariableTablePropsSchema = z
  .strictObject({
    outcomes: z.discriminatedUnion('kind', [
      /** The S / F patterns of n trials; X = the number of S. */
      z.strictObject({ kind: z.literal('trials'), n: z.number().int().min(2).max(5) }),
      /** The draws of k balls from an urn of reds (value 1) and blacks; X = the number of reds. */
      z.strictObject({
        kind: z.literal('urn'),
        reds: z.number().int().min(1).max(8),
        blacks: z.number().int().min(1).max(8),
        k: z.number().int().min(1).max(4),
      }),
    ]),
    /** trials only: P(S) = p, so a pattern weighs p^s q^(n-s). */
    weights: z.union([z.literal('uniform'), z.strictObject({ p: RatSchema })]).default('uniform'),
    /**
     * The buttons the student can press; none runs by itself. Default: all
     * used, sum, law, and symmetry when the true law is symmetric.
     */
    checks: z.array(TableCheck).min(1).max(4).optional(),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const bad = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    let symmetric: boolean;
    if (p.outcomes.kind === 'trials') {
      if (p.weights === 'uniform') {
        symmetric = true;
      } else {
        const x = parseRat(p.weights.p);
        if (!x || compare(x, frac(0)) <= 0 || compare(x, frac(1)) >= 0) {
          bad(['weights', 'p'], 'p must be strictly between 0 and 1');
          return;
        }
        symmetric = sameRat(x, frac(1, 2));
      }
    } else {
      const { reds, blacks, k } = p.outcomes;
      if (p.weights !== 'uniform') {
        bad(['weights'], 'an urn draws are equally likely: no weights');
      }
      if (k > reds + blacks) {
        bad(['outcomes', 'k'], 'cannot draw more balls than the urn holds');
        return;
      }
      if (choose(reds + blacks, k) > MAX_TABLE_OUTCOMES) {
        bad(['outcomes'], `${choose(reds + blacks, k)} outcomes: at most ${MAX_TABLE_OUTCOMES}`);
        return;
      }
      symmetric = reds === blacks;
    }
    if (p.checks === undefined) {
      return;
    }
    if (new Set(p.checks).size !== p.checks.length) {
      bad(['checks'], 'a check is listed twice');
    }
    if (!p.checks.includes('law')) {
      bad(['checks'], 'the law check is how the student finishes');
    }
    if (p.checks.includes('symmetry') && !symmetric) {
      bad(['checks'], 'the true law is not symmetric, so the symmetry check would mislead');
    }
  });
export type VariableTableProps = z.output<typeof VariableTablePropsSchema>;

// ---------------------------------------------------------------------------
// EventAreaModel

export const OVERLAYS = ['complement', 'intersection', 'union', 'conditional'] as const;
export type Overlay = (typeof OVERLAYS)[number];

export const EventAreaModelPropsSchema = z
  .strictObject({
    source: z.discriminatedUnion('kind', [
      /** The slices are the draws with j reds, j = 0..k (the 4R6N urn: 20, 60, 36, 4 of 120). */
      z.strictObject({
        kind: z.literal('urn'),
        reds: z.number().int().min(1).max(8),
        blacks: z.number().int().min(1).max(8),
        k: z.number().int().min(1).max(4),
      }),
      z.strictObject({
        kind: z.literal('authored'),
        slices: z
          .array(
            z.strictObject({
              id: Label,
              label: Label,
              count: z.number().int().min(0).max(1000),
            }),
          )
          .min(2)
          .max(8),
      }),
    ]),
    events: z
      .array(
        z.strictObject({
          id: Label,
          label: Label,
          /** Slice ids (urn: s0, s1, ... for 0, 1, ... reds). */
          slices: z.array(Label).min(1).max(8),
        }),
      )
      .min(1)
      .max(4),
    overlays: z.array(z.enum(OVERLAYS)).min(1).max(4).default(['complement']),
    labels: z.enum(['counts', 'probabilities']).default('counts'),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const bad = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    let ids: string[];
    let counts: number[];
    if (p.source.kind === 'urn') {
      const { reds, blacks, k } = p.source;
      if (k > reds + blacks) {
        bad(['source', 'k'], 'cannot draw more balls than the urn holds');
        return;
      }
      if (choose(reds + blacks, k) > MAX_ENUMERATION) {
        bad(['source'], 'too many draws');
        return;
      }
      ids = Array.from({ length: k + 1 }, (_, j) => `s${j}`);
      counts = ids.map((_, j) =>
        j > reds || k - j > blacks ? 0 : choose(reds, j) * choose(blacks, k - j),
      );
    } else {
      ids = p.source.slices.map(s => s.id);
      counts = p.source.slices.map(s => s.count);
      if (new Set(ids).size !== ids.length) {
        bad(['source', 'slices'], 'duplicate slice id');
        return;
      }
    }
    if (counts.reduce((a, b) => a + b, 0) < 1) {
      bad(['source'], 'no outcome at all');
      return;
    }
    if (new Set(p.events.map(e => e.id)).size !== p.events.length) {
      bad(['events'], 'duplicate event id');
    }
    p.events.forEach((e, i) => {
      if (e.slices.some(s => !ids.includes(s)) || new Set(e.slices).size !== e.slices.length) {
        bad(['events', i, 'slices'], 'unknown or repeated slice');
        return;
      }
      if (e.slices.reduce((a, s) => a + counts[ids.indexOf(s)]!, 0) < 1) {
        bad(['events', i, 'slices'], 'an event with no outcome');
      }
    });
    if (new Set(p.overlays).size !== p.overlays.length) {
      bad(['overlays'], 'an overlay is listed twice');
    }
    if (
      p.events.length < 2 &&
      p.overlays.some(o => o === 'intersection' || o === 'union')
    ) {
      bad(['overlays'], 'intersection and union need two events');
    }
  });
export type EventAreaModelProps = z.output<typeof EventAreaModelPropsSchema>;

// ---------------------------------------------------------------------------
// UrnTemplate

export const UrnTemplatePropsSchema = z
  .strictObject({
    templateId: z.enum(URN_TEMPLATES),
    seed: z.number().int().min(1).max(10000).default(1),
    /** The step this example is for: the example must not give its answer, nor one of its known wrong values. */
    parent: z
      .strictObject({
        answer: RatSchema.optional(),
        wrong: z.array(RatSchema).max(12).optional(),
      })
      .optional(),
    insight: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    const parentOf = () => ({
      ...(p.parent?.answer !== undefined && { answer: parseRat(p.parent.answer)! }),
      wrong: (p.parent?.wrong ?? []).map(w => parseRat(w)!),
    });
    // "another example" bumps the seed up to 4 times: every one of them must exist
    for (let bump = 0; bump <= 4; bump++) {
      const seed = ((p.seed - 1 + bump) % 10000) + 1;
      engineIssue(ctx, ['seed'], () =>
        generateUrnVariant({ templateId: p.templateId, seed, parent: parentOf() }),
      );
    }
  });
export type UrnTemplateProps = z.output<typeof UrnTemplatePropsSchema>;
