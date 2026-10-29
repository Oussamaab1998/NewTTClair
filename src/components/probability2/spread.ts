/**
 * Pure model of SpreadSlider: the frame (mean, distances, squares,
 * contributions, total) at every position of the control, computed once from
 * the props by the engine, so a drag tick is a lookup. The finding and the
 * `reveals` declaration live here too. No React (the guard and the tests
 * import it).
 */
import { productLine, sumLine } from '../../engine/calcLines';
import {
  spreadFrame,
  type SpreadFrame,
} from '../../engine/distribution';
import { add, compare, div, frac, sub, type Fraction } from '../../engine/rational';
import { mulInt, parseRat, ratToString } from '../../engine/rationalFormat';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import { SpreadSliderPropsSchema, type SpreadSliderProps } from './schemas';

/** The total waits for this many distinct positions unless the props say otherwise. */
export const DEFAULT_LOCK = 3;

export interface SpreadPosition {
  /** p, the scenario id or the value: what the route and the events call this position. */
  label: string;
  /** Bernoulli: P(values[1]). */
  p: Fraction | null;
  frame: SpreadFrame;
}

export interface SpreadModel {
  family: SpreadSliderProps['family']['kind'];
  values: readonly number[];
  positions: SpreadPosition[];
  init: number;
  /** Distinct positions to visit before the total is written; 0 when no total is shown. */
  lock: number;
  /** The largest distance and the largest total over all positions: the fixed scales of the pictures. */
  maxDist: Fraction;
  maxVar: Fraction;
  show: SpreadSliderProps['show'];
}

const rat = (s: string): Fraction => parseRat(s)!;

export function spreadModel(p: SpreadSliderProps): SpreadModel {
  const f = p.family;
  let positions: SpreadPosition[];
  let init = 0;
  if (f.kind === 'bernoulli') {
    const [min, max, step, at] = [f.p.min, f.p.max, f.p.step, f.p.init].map(rat) as [
      Fraction,
      Fraction,
      Fraction,
      Fraction,
    ];
    const count = div(sub(max, min), step)[0] + 1;
    positions = Array.from({ length: count }, (_, i) => {
      const x = add(min, mulInt(step, i));
      return {
        label: ratToString(x),
        p: x,
        frame: spreadFrame(p.values, [sub(frac(1), x), x]),
      };
    });
    init = div(sub(at, min), step)[0];
  } else if (f.kind === 'fixed') {
    const frame = spreadFrame(p.values, f.probabilities.map(rat));
    positions = p.values.map(v => ({ label: ratToString(frac(v)), p: null, frame }));
  } else {
    positions = f.scenarios.map(s => ({
      label: s.id,
      p: null,
      frame: spreadFrame(p.values, s.probabilities.map(rat)),
    }));
  }
  const max = (xs: Fraction[]) => xs.reduce((m, x) => (compare(x, m) > 0 ? x : m), frac(0));
  return {
    family: f.kind,
    values: p.values,
    positions,
    init,
    lock: p.show.total ? p.totalLockedUntil?.positions ?? DEFAULT_LOCK : 0,
    maxDist: max(positions.flatMap(x => x.frame.rows.map(r => r.dist))),
    maxVar: max(positions.map(x => x.frame.variance)),
    show: p.show,
  };
}

/** `\frac{7}{10} \times \frac{9}{100} = \frac{63}{1000}` for each value, then their sum: the total. */
export function spreadCalc(frame: SpreadFrame): string[] {
  return [
    ...frame.rows.map(r => productLine([r.p, r.d2])),
    sumLine(frame.rows.map(r => r.w)),
  ];
}

export function spreadFinding(
  m: SpreadModel,
  index: number,
  route: readonly string[],
  how: FindingHow,
  checkpointCorrect?: boolean,
): FindingPayload {
  const own = how === 'found' || how === 'helped';
  const at = m.positions[index]!;
  let findingId: string;
  let numbers: Record<string, string>;
  if (m.family === 'scenarios') {
    findingId = 'spread.scenarios';
    numbers = Object.fromEntries(
      m.positions.flatMap((x, i) => [
        [`m${i}`, ratToString(x.frame.mean)],
        [`v${i}`, ratToString(x.frame.variance)],
      ]),
    );
  } else {
    findingId = m.family === 'bernoulli' ? 'spread.bernoulli' : 'spread.fixed';
    numbers = {
      ...(at.p !== null && { p: ratToString(at.p) }),
      mean: ratToString(at.frame.mean),
      variance: ratToString(at.frame.variance),
    };
  }
  return makeFinding({
    findingId,
    numbers,
    route: route.slice(0, 12),
    how,
    correct: own && checkpointCorrect !== undefined ? checkpointCorrect : null,
    ...(own && m.family !== 'scenarios' && { calc: spreadCalc(at.frame) }),
  });
}

// ---------------------------------------------------------------------------
// Reveals

const parseSpread = (props: Record<string, unknown>): SpreadModel | null => {
  const r = SpreadSliderPropsSchema.safeParse(props);
  return r.success ? spreadModel(r.data) : null;
};

export const SPREAD_SLIDER_REVEALS: readonly RevealRule[] = [
  {
    value: 'frame',
    note: 'p, the mean, and the distance, square and contribution of each value at the starting position (they change with the handle)',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseSpread(p);
      const at = m?.positions[m.init];
      return m && at
        ? [
            ...(at.p ? [at.p, sub(frac(1), at.p)] : []),
            at.frame.mean,
            ...at.frame.rows.flatMap(r => [r.dist, r.d2, r.w]),
          ]
        : [];
    },
  },
  {
    value: 'variance_total',
    note: 'the total spread (the variance) at each position, written after the student visited enough distinct positions',
    by: 'state',
    // Safe only when the lock is written in the props (or no total is shown): the default lock is not trusted.
    lockedBy: p =>
      (p.show as { total?: boolean } | undefined)?.total === false ||
      p.totalLockedUntil !== undefined,
    minHint: 'ladder_end',
    values: p => {
      const m = parseSpread(p);
      return m && m.show.total ? m.positions.map(x => x.frame.variance) : [];
    },
  },
  {
    value: 'candidate_formulas',
    note: 'the formulas of the zero_at_ends checkpoint are listed, one of them p(1 - p); they are formulas, not values',
    by: 'props',
    minHint: 0,
    values: () => [],
  },
];
