/**
 * Checks behind the SpreadSlider checkpoints (docs/COMPONENTS_PROBABILITY_V2.md
 * C1). Two questions, both answered by the engine, never by the content:
 *  - which of a few values of p gives the larger spread p(1 - p)? (a single
 *    answer: p and 1 - p tie, so a tie is refused);
 *  - which expression in p is 0 at p = 0 and p = 1 and largest at 1/2?
 *
 * At p = 1/2 several wrong formulas coincide with the right one (p(1-p),
 * p^2 / ... = 1/4, p = 1 - p), so the sample points of the check are away
 * from 1/2 (`CHECKPOINT_GRID`, tested with `distinctAtGrid`).
 */
import { parseExpression } from './expression';
import { evaluateAtRational } from './coincidence';
import { compare, frac, mul, sub, type Fraction } from './rational';
import { sameRat } from './rationalFormat';

const ZERO = frac(0);
const ONE = frac(1);
const HALF = frac(1, 2);

/** Sample points for telling candidate formulas apart: none is 1/2. */
export const CHECKPOINT_GRID: readonly Fraction[] = [
  frac(1, 10),
  frac(1, 5),
  frac(3, 10),
  frac(7, 10),
  frac(4, 5),
];

/** Points where "largest at 1/2" is looked for: 0, 1/20, ... 1. */
const TWENTIETHS: readonly Fraction[] = Array.from({ length: 21 }, (_, i) =>
  frac(i, 20),
);

/** p(1 - p): the variance of a Bernoulli variable with P(1) = p. */
export const bernoulliSpread = (p: Fraction): Fraction => mul(p, sub(ONE, p));

export type LargerSpread =
  | { ok: true; index: number }
  | { ok: false; reason: 'bad_p' | 'tie' };

/** The index of the p with the largest spread, when it is the only one. */
export function largerSpread(options: readonly Fraction[]): LargerSpread {
  if (options.some(p => compare(p, ZERO) < 0 || compare(p, ONE) > 0)) {
    return { ok: false, reason: 'bad_p' };
  }
  const spreads = options.map(bernoulliSpread);
  const best = spreads.reduce((m, s) => (compare(s, m) > 0 ? s : m), ZERO);
  const hits = spreads
    .map((s, i) => (sameRat(s, best) ? i : -1))
    .filter(i => i >= 0);
  return hits.length === 1
    ? { ok: true, index: hits[0]! }
    : { ok: false, reason: 'tie' };
}

export interface EndsProperty {
  zeroAtEnds: boolean;
  maxAtHalf: boolean;
}

/** Does this expression in p vanish at 0 and 1 and peak at 1/2? Exact, on a grid of twentieths. */
export function endsProperty(source: string): EndsProperty {
  const parsed = parseExpression(source, { variables: ['p'] });
  if (!parsed.ok) {
    return { zeroAtEnds: false, maxAtHalf: false };
  }
  const at = (p: Fraction) => evaluateAtRational(parsed.ast, 'p', p);
  const [a, b, mid] = [at(ZERO), at(ONE), at(HALF)];
  const zeroAtEnds = a !== null && b !== null && sameRat(a, ZERO) && sameRat(b, ZERO);
  if (!zeroAtEnds || mid === null) {
    return { zeroAtEnds, maxAtHalf: false };
  }
  const maxAtHalf = TWENTIETHS.every(g => {
    const v = at(g);
    return v !== null && compare(v, mid) <= 0;
  });
  return { zeroAtEnds, maxAtHalf };
}

export type EndsChoice =
  | { ok: true; index: number }
  | { ok: false; reason: 'none' | 'several' };

/** The one candidate that is 0 at both ends and largest at 1/2. */
export function findEndsExpression(expressions: readonly string[]): EndsChoice {
  const hits = expressions
    .map((e, i) => {
      const r = endsProperty(e);
      return r.zeroAtEnds && r.maxAtHalf ? i : -1;
    })
    .filter(i => i >= 0);
  if (hits.length === 0) {
    return { ok: false, reason: 'none' };
  }
  return hits.length === 1
    ? { ok: true, index: hits[0]! }
    : { ok: false, reason: 'several' };
}
