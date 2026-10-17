/**
 * Registry of engine calls that content can reference by name (docs/DATA.md `EngineCall`).
 * Content never carries answers: it names a function and JSON args, and the
 * engine computes the value. Every result is an exact fraction.
 */
import { z } from 'zod';

import {
  BallSchema,
  DrawSchema,
  enumerateOutcomes,
  EventSpecSchema,
  law,
  matchingOutcomes,
  probability,
  ValueFnSchema,
  type Outcome,
} from './probability';
import {
  add,
  choose,
  EngineError,
  frac,
  mul,
  sub,
  type Fraction,
} from './rational';

/** The random experiment of an exercise (shared by its engine calls). */
export const ExperimentSchema = z.strictObject({
  urn: z.array(BallSchema).min(1),
  draw: DrawSchema,
  k: z.number().int().min(1),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export interface CallContext {
  experiment?: Experiment;
}

const FractionArg = z.tuple([z.number().int(), z.number().int()]);

interface CallDef<A> {
  args: z.ZodType<A>;
  run: (args: A, ctx: CallContext) => Fraction;
}

function outcomes(ctx: CallContext): Outcome[] {
  if (!ctx.experiment) {
    throw new EngineError('this call needs an exercise experiment');
  }
  const { urn, draw, k } = ctx.experiment;
  return enumerateOutcomes(urn, draw, k);
}

const EventArgs = z.strictObject({
  event: EventSpecSchema,
  valueFn: ValueFnSchema.optional(),
});

const def = <A>(d: CallDef<A>): CallDef<unknown> => d as CallDef<unknown>;

export const ENGINE_CALLS = {
  /** Number of equally likely outcomes of the experiment. */
  outcomeCount: def({
    args: z.strictObject({}),
    run: (_, ctx) => frac(outcomes(ctx).length),
  }),
  /** Number of outcomes in an event. */
  count: def({
    args: EventArgs,
    run: (a, ctx) =>
      frac(
        matchingOutcomes(
          a.event,
          outcomes(ctx),
          a.valueFn ? { valueFn: a.valueFn } : {},
        ).length,
      ),
  }),
  /** p(event), reduced. */
  probability: def({
    args: EventArgs,
    run: (a, ctx) =>
      probability(
        a.event,
        outcomes(ctx),
        a.valueFn ? { valueFn: a.valueFn } : {},
      ).reduced,
  }),
  /** C(n, k). */
  choose: def({
    args: z.strictObject({
      n: z.number().int().min(0),
      k: z.number().int().min(0),
    }),
    run: a => frac(choose(a.n, a.k)),
  }),
  /** 1 − p, for complement exercises that are not about the urn. */
  oneMinus: def({
    args: z.strictObject({ p: FractionArg }),
    run: a => sub([1, 1], frac(a.p[0], a.p[1])),
  }),
  /** Σ p(X = x) over the law of X (the "sum = 1" habit check). */
  lawSum: def({
    args: z.strictObject({ valueFn: ValueFnSchema }),
    run: (a, ctx) =>
      law(a.valueFn, outcomes(ctx)).reduce<Fraction>(
        (s, r) => add(s, r.p),
        [0, 1],
      ),
  }),
  /** Product of integers (numeric twins: 0 × 2). */
  product: def({
    args: z.strictObject({ factors: z.array(z.number().int()).min(1) }),
    run: a => a.factors.reduce<Fraction>((p, f) => mul(p, frac(f)), [1, 1]),
  }),
} satisfies Record<string, CallDef<unknown>>;
export type EngineCallName = keyof typeof ENGINE_CALLS;

export function isEngineCallName(name: string): name is EngineCallName {
  return Object.prototype.hasOwnProperty.call(ENGINE_CALLS, name);
}

interface SetCallDef<A> {
  args: z.ZodType<A>;
  run: (args: A, ctx: CallContext) => number[];
}
const setDef = <A>(d: SetCallDef<A>): SetCallDef<unknown> =>
  d as SetCallDef<unknown>;

/** Calls whose result is a set of integers (answers of type `set`), sorted ascending. */
export const SET_CALLS = {
  /** Values taken by a random variable (with p > 0). */
  lawValues: setDef({
    args: z.strictObject({ valueFn: ValueFnSchema }),
    run: (a, ctx) => law(a.valueFn, outcomes(ctx)).map(r => r.value),
  }),
} satisfies Record<string, SetCallDef<unknown>>;

export type CallResult<T = Fraction> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Runs a named call; never throws (content errors are reported, not crashed on). */
export function runEngineCall(
  call: { fn: string; args: unknown },
  ctx: CallContext,
): CallResult {
  if (!isEngineCallName(call.fn)) {
    return { ok: false, error: `unknown engine call ${call.fn}` };
  }
  return runDef(call.fn, ENGINE_CALLS[call.fn], call.args, ctx);
}

/** Same as runEngineCall, for set-valued calls. */
export function runSetCall(
  call: { fn: string; args: unknown },
  ctx: CallContext,
): CallResult<number[]> {
  if (!Object.prototype.hasOwnProperty.call(SET_CALLS, call.fn)) {
    return { ok: false, error: `unknown set call ${call.fn}` };
  }
  const d = SET_CALLS[call.fn as keyof typeof SET_CALLS];
  return runDef(call.fn, d, call.args, ctx);
}

function runDef<T>(
  fn: string,
  d: { args: z.ZodType<unknown>; run: (a: unknown, c: CallContext) => T },
  rawArgs: unknown,
  ctx: CallContext,
): CallResult<T> {
  const args = d.args.safeParse(rawArgs);
  if (!args.success) {
    return {
      ok: false,
      error: `${fn}: bad args (${args.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')})`,
    };
  }
  try {
    return { ok: true, value: d.run(args.data, ctx) };
  } catch (e) {
    if (e instanceof EngineError) {
      return { ok: false, error: `${fn}: ${e.message}` };
    }
    throw e;
  }
}
