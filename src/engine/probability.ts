/**
 * Finite probability on urns (docs/COMPONENTS_PROBABILITY.md).
 *
 * Every outcome is equally likely (balls indistinguishable by touch). Balls
 * carry ids so two balls with the same value stay different outcomes.
 * All results are exact fractions; decimals are derived from them.
 */
import { z } from 'zod';

import {
  add,
  ceil,
  choose,
  div,
  EngineError,
  frac,
  mul,
  pow,
  sub,
  toNumber,
  type Fraction,
} from './rational';

// Ball ids are joined with '-' to build outcome ids.
export const BallSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_]+$/),
  value: z.number().int(),
});
export type Ball = z.infer<typeof BallSchema>;

export const DrawSchema = z.enum([
  'simultaneous',
  'ordered',
  'ordered_with_replacement',
]);
export type Draw = z.infer<typeof DrawSchema>;

export const ValueFnSchema = z.union([
  z.enum(['product', 'sum', 'max', 'min', 'identity']),
  z.strictObject({
    id: z.literal('count_value'),
    args: z.strictObject({ value: z.number().int() }),
  }),
]);
export type ValueFn = z.infer<typeof ValueFnSchema>;

export type EventSpec =
  | { id: 'any_value'; args: { value: number } }
  | { id: 'all_equal' }
  | { id: 'value_eq'; args: { valueFn?: ValueFn; value: number } }
  | { id: 'not'; args: { event: EventSpec } }
  | { id: 'and' | 'or'; args: { events: EventSpec[] } };

export const EventSpecSchema: z.ZodType<EventSpec> = z.lazy(() =>
  z.union([
    z.strictObject({
      id: z.literal('any_value'),
      args: z.strictObject({ value: z.number().int() }),
    }),
    z.strictObject({ id: z.literal('all_equal') }),
    z.strictObject({
      id: z.literal('value_eq'),
      args: z.strictObject({
        valueFn: ValueFnSchema.optional(),
        value: z.number().int(),
      }),
    }),
    z.strictObject({
      id: z.literal('not'),
      args: z.strictObject({ event: EventSpecSchema }),
    }),
    z.strictObject({
      id: z.enum(['and', 'or']),
      args: z.strictObject({ events: z.array(EventSpecSchema).min(1) }),
    }),
  ]),
) as z.ZodType<EventSpec>;

export interface Outcome {
  /** Stable id: ball ids joined with '-', in draw order ("b-c"). */
  id: string;
  ballIds: string[];
  balls: Ball[];
}

function validateUrn(urn: Ball[]): void {
  const ids = new Set<string>();
  for (const ball of urn) {
    if (!BallSchema.safeParse(ball).success) {
      throw new EngineError(`invalid ball: ${JSON.stringify(ball)}`);
    }
    if (ids.has(ball.id)) {
      throw new EngineError(`duplicate ball id: ${ball.id}`);
    }
    ids.add(ball.id);
  }
}

/** All equally likely outcomes of drawing k balls. */
export function enumerateOutcomes(
  urn: Ball[],
  draw: Draw,
  k: number,
): Outcome[] {
  validateUrn(urn);
  if (!Number.isInteger(k) || k < 1) {
    throw new EngineError('k must be a positive integer');
  }
  if (draw !== 'ordered_with_replacement' && k > urn.length) {
    throw new EngineError('cannot draw more balls than the urn holds');
  }

  const out: Outcome[] = [];
  const build = (prefix: number[]) => {
    if (prefix.length === k) {
      const balls = prefix.map(i => urn[i]!);
      const ballIds = balls.map(b => b.id);
      out.push({ id: ballIds.join('-'), ballIds, balls });
      return;
    }
    const start =
      draw === 'simultaneous' ? (prefix[prefix.length - 1] ?? -1) + 1 : 0;
    for (let i = start; i < urn.length; i++) {
      if (draw === 'ordered' && prefix.includes(i)) {
        continue;
      }
      build([...prefix, i]);
    }
  };
  build([]);
  return out;
}

export function evaluateValueFn(fn: ValueFn, outcome: Outcome): number {
  const values = outcome.balls.map(b => b.value);
  if (typeof fn === 'object') {
    return values.filter(v => v === fn.args.value).length;
  }
  switch (fn) {
    case 'product':
      return values.reduce((p, v) => p * v, 1);
    case 'sum':
      return values.reduce((s, v) => s + v, 0);
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'identity':
      if (values.length !== 1) {
        throw new EngineError('identity needs a single-ball draw');
      }
      return values[0]!;
  }
}

/** Context supplied by the component (e.g. its `valueFn` prop). */
export interface EventContext {
  valueFn?: ValueFn;
}

export function satisfies(
  event: EventSpec,
  outcome: Outcome,
  ctx: EventContext = {},
): boolean {
  switch (event.id) {
    case 'any_value':
      return outcome.balls.some(b => b.value === event.args.value);
    case 'all_equal':
      return outcome.balls.every(b => b.value === outcome.balls[0]?.value);
    case 'value_eq': {
      const fn = event.args.valueFn ?? ctx.valueFn;
      if (!fn) {
        throw new EngineError('value_eq needs a valueFn (in args or context)');
      }
      return evaluateValueFn(fn, outcome) === event.args.value;
    }
    case 'not':
      return !satisfies(event.args.event, outcome, ctx);
    case 'and':
      return event.args.events.every(e => satisfies(e, outcome, ctx));
    case 'or':
      return event.args.events.some(e => satisfies(e, outcome, ctx));
  }
}

export function matchingOutcomes(
  event: EventSpec,
  outcomes: Outcome[],
  ctx: EventContext = {},
): Outcome[] {
  return outcomes.filter(o => satisfies(event, o, ctx));
}

export interface ProbabilityResult {
  /** favorable / possible, before reduction (what a student counts). */
  num: number;
  den: number;
  reduced: Fraction;
}

export function probability(
  event: EventSpec,
  outcomes: Outcome[],
  ctx: EventContext = {},
): ProbabilityResult {
  if (outcomes.length === 0) {
    throw new EngineError('empty sample space');
  }
  const num = matchingOutcomes(event, outcomes, ctx).length;
  return { num, den: outcomes.length, reduced: frac(num, outcomes.length) };
}

export interface LawRow {
  value: number;
  outcomes: Outcome[];
  p: Fraction;
}

/** Law of a random variable, sorted by value. */
export function law(valueFn: ValueFn, outcomes: Outcome[]): LawRow[] {
  if (outcomes.length === 0) {
    throw new EngineError('empty sample space');
  }
  const byValue = new Map<number, Outcome[]>();
  for (const o of outcomes) {
    const v = evaluateValueFn(valueFn, o) + 0; // -0 -> 0
    byValue.set(v, [...(byValue.get(v) ?? []), o]);
  }
  return [...byValue.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, os]) => ({
      value,
      outcomes: os,
      p: frac(os.length, outcomes.length),
    }));
}

export interface ExactValue {
  fraction: Fraction;
  decimal: number;
}
const exact = (fraction: Fraction): ExactValue => ({
  fraction,
  decimal: toNumber(fraction),
});

type LawLike = readonly { value: number; p: Fraction }[];

const moment = (l: LawLike, f: (x: number) => number): Fraction =>
  l.reduce<Fraction>((s, r) => add(s, mul(frac(f(r.value)), r.p)), [0, 1]);

/** E(X) = Σ x·p */
export const expectation = (l: LawLike): ExactValue => exact(moment(l, x => x));
/** E(X²) = Σ x²·p */
export const secondMoment = (l: LawLike): ExactValue =>
  exact(moment(l, x => x * x));
/** V(X) = E(X²) − E(X)² */
export function variance(l: LawLike): ExactValue {
  const e = moment(l, x => x);
  return exact(
    sub(
      moment(l, x => x * x),
      mul(e, e),
    ),
  );
}

/** P(Y = k) for Y ~ B(n, p), exact. */
export function binomialPmf(n: number, p: Fraction, k: number): Fraction {
  if (!Number.isInteger(n) || n < 0 || !Number.isInteger(k)) {
    throw new EngineError('binomial needs integer n >= 0 and k');
  }
  if (k < 0 || k > n) {
    return [0, 1];
  }
  const q = sub([1, 1], p);
  return mul(frac(choose(n, k)), mul(pow(p, k), pow(q, n - k)));
}

/** E(Y) = n·p */
export const binomialExpectation = (n: number, p: Fraction): Fraction =>
  mul(frac(n), p);

export interface SmallestNQuery {
  p: Fraction;
  target: { type: 'E_at_least'; value: Fraction };
  /** Smallest n allowed by the statement (e.g. n >= 2). Default 1. */
  nMin?: number;
}

/** Smallest integer n >= nMin with n·p >= target (solved exactly: n >= target / p). */
export function smallestN({ p, target, nMin = 1 }: SmallestNQuery): number {
  if (p[0] <= 0) {
    throw new EngineError('p must be > 0');
  }
  return Math.max(nMin, ceil(div(target.value, p)));
}
