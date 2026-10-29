/**
 * Deterministic repeated runs (docs/COMPONENTS_PROBABILITY_V2.md E5): N runs of
 * an experiment whose stage probabilities are exact rationals, with EXACT
 * integer counts (36 runs, p = 1/6: 6 have the event, 1 has it twice). Nothing
 * is random: a parameter set whose counts are not whole numbers is reported,
 * with the stage it fails at, so the content loader can reject it.
 */
import { assertDist, type Dist } from './distribution';
import { isInteger, mulInt, sumRat } from './rationalFormat';
import {
  EngineError,
  compare,
  frac,
  mul,
  type Fraction,
} from './rational';

export const MAX_STAGES = 3;

export type RunsResult =
  | {
      ok: true;
      /** counts[0] = N, counts[i] = runs that passed stages 1..i. */
      counts: number[];
    }
  | {
      ok: false;
      reason:
        | 'bad_n'
        | 'no_stage'
        | 'too_many_stages'
        | 'bad_probability'
        | 'not_integer';
      /** 1-based stage whose count is not a whole number. */
      stage?: number;
      /** That count, as a fraction. */
      value?: Fraction;
    };

const ZERO: Fraction = [0, 1];
const ONE: Fraction = [1, 1];

/** N·p1, N·p1·p2, ...; ok only if every count is a whole number. */
export function repeatedRuns(
  n: number,
  stages: readonly Fraction[],
): RunsResult {
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, reason: 'bad_n' };
  }
  if (stages.length === 0) {
    return { ok: false, reason: 'no_stage' };
  }
  if (stages.length > MAX_STAGES) {
    return { ok: false, reason: 'too_many_stages' };
  }
  const counts = [n];
  let current: Fraction = frac(n);
  for (let i = 0; i < stages.length; i++) {
    const p = stages[i]!;
    if (compare(p, ZERO) < 0 || compare(p, ONE) > 0) {
      return { ok: false, reason: 'bad_probability', stage: i + 1 };
    }
    current = mul(current, p);
    if (!isInteger(current)) {
      return { ok: false, reason: 'not_integer', stage: i + 1, value: current };
    }
    counts.push(current[0]);
  }
  return { ok: true, counts };
}

/**
 * The shaded cells for a stage: the first `count` cells of `total`, in
 * reading order (a contiguous block reads as a part of a whole).
 */
export function cellsForStage(total: number, count: number): number[] {
  if (
    !Number.isInteger(total) ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > total
  ) {
    throw new EngineError('count must be a whole number between 0 and total');
  }
  return Array.from({ length: count }, (_, i) => i);
}

export interface TallyRow {
  x: number;
  p: Fraction;
  /** Runs with this value: N p. */
  runs: number;
  /** runs x x. */
  total: number;
}
export type TallyResult =
  | {
      ok: true;
      rows: TallyRow[];
      /** S = sum of runs x value. */
      total: number;
      /** S / N, exactly; equals E(X). */
      average: Fraction;
    }
  | {
      ok: false;
      reason: 'bad_n' | 'not_a_law' | 'not_integer';
      x?: number;
      value?: Fraction;
    };

/** The table value of X, number of runs, total S = runs x X, average = S / N. */
export function tally(
  values: readonly number[],
  probabilities: readonly Fraction[],
  n: number,
): TallyResult {
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, reason: 'bad_n' };
  }
  if (values.length !== probabilities.length) {
    return { ok: false, reason: 'not_a_law' };
  }
  const dist: Dist = values.map((value, i) => ({ value, p: probabilities[i]! }));
  try {
    assertDist(dist);
  } catch {
    return { ok: false, reason: 'not_a_law' };
  }
  const rows: TallyRow[] = [];
  for (const r of dist) {
    const runs = mulInt(r.p, n);
    if (!isInteger(runs)) {
      return { ok: false, reason: 'not_integer', x: r.value, value: runs };
    }
    rows.push({ x: r.value, p: r.p, runs: runs[0], total: runs[0] * r.value + 0 });
  }
  const total = sumRat(rows.map(r => frac(r.total)))[0];
  return { ok: true, rows, total, average: frac(total, n) };
}
