import {
  CHECKPOINT_GRID,
  bernoulliSpread,
  endsProperty,
  findEndsExpression,
  largerSpread,
} from './spreadChecks';
import { distinctAtGrid } from './coincidence';
import { frac, type Fraction } from './rational';

const f = (n: number, d = 1): Fraction => frac(n, d);

describe('bernoulliSpread: p(1 - p), exact', () => {
  it('p = 3/10 gives 21/100; the two ends give 0; 1/2 gives 1/4', () => {
    expect(bernoulliSpread(f(3, 10))).toEqual(f(21, 100));
    expect(bernoulliSpread(f(0))).toEqual(f(0));
    expect(bernoulliSpread(f(1))).toEqual(f(0));
    expect(bernoulliSpread(f(1, 2))).toEqual(f(1, 4));
  });

  it('p and 1 - p have the same spread', () => {
    expect(bernoulliSpread(f(1, 10))).toEqual(bernoulliSpread(f(9, 10)));
  });
});

describe('largerSpread: which p gives the larger spread, with a single answer', () => {
  it('the option closest to 1/2 wins', () => {
    expect(largerSpread([f(1, 10), f(3, 10), f(1, 2)])).toEqual({ ok: true, index: 2 });
    expect(largerSpread([f(1, 2), f(1, 5)])).toEqual({ ok: true, index: 0 });
  });

  it('p = 1/10 and p = 9/10 tie: the question would have two right answers', () => {
    expect(largerSpread([f(1, 10), f(9, 10), f(1, 2)])).toEqual({ ok: true, index: 2 });
    expect(largerSpread([f(1, 10), f(9, 10)])).toEqual({ ok: false, reason: 'tie' });
    expect(largerSpread([f(3, 10), f(7, 10), f(1, 10)])).toEqual({ ok: false, reason: 'tie' });
  });

  it('a p outside [0, 1] is refused', () => {
    expect(largerSpread([f(1, 2), f(3, 2)])).toEqual({ ok: false, reason: 'bad_p' });
    expect(largerSpread([f(-1, 2), f(1, 2)])).toEqual({ ok: false, reason: 'bad_p' });
  });
});

describe('endsProperty: 0 at p = 0 and p = 1, largest at 1/2', () => {
  it('p(1 - p) has it', () => {
    expect(endsProperty('p*(1-p)')).toEqual({ zeroAtEnds: true, maxAtHalf: true });
  });

  it('the usual wrong formulas do not', () => {
    expect(endsProperty('p')).toMatchObject({ zeroAtEnds: false });
    expect(endsProperty('p^2')).toMatchObject({ zeroAtEnds: false });
    expect(endsProperty('1-p')).toMatchObject({ zeroAtEnds: false });
    expect(endsProperty('(1-p)^2')).toMatchObject({ zeroAtEnds: false });
    expect(endsProperty('p/2')).toMatchObject({ zeroAtEnds: false });
  });

  it('a multiple of p(1 - p) has it too; a formula that is 0 at the ends and at 1/2 does not', () => {
    expect(endsProperty('4*p*(1-p)')).toEqual({ zeroAtEnds: true, maxAtHalf: true });
    expect(endsProperty('p*(1-p)*(1-2*p)')).toEqual({ zeroAtEnds: true, maxAtHalf: false });
  });

  it('an expression that does not parse, or is not rational somewhere, has nothing', () => {
    expect(endsProperty('p +')).toEqual({ zeroAtEnds: false, maxAtHalf: false });
    expect(endsProperty('sqrt(p)')).toMatchObject({ zeroAtEnds: false });
  });
});

describe('findEndsExpression: exactly one candidate must have the property', () => {
  it('finds it', () => {
    expect(findEndsExpression(['p', 'p^2', 'p*(1-p)', '1-p'])).toEqual({ ok: true, index: 2 });
  });

  it('none, or several, is refused', () => {
    expect(findEndsExpression(['p', 'p^2', '1-p'])).toEqual({ ok: false, reason: 'none' });
    expect(findEndsExpression(['p*(1-p)', '4*p*(1-p)', 'p^2'])).toEqual({ ok: false, reason: 'several' });
  });
});

describe('the checkpoint sample points are away from 1/2 (the coincidence guard)', () => {
  it('p, p^2, p(1-p), 1-p and p/2 are pairwise different at every point of the grid, but not at 1/2', () => {
    const list = ['p', 'p^2', 'p*(1-p)', '1-p'];
    expect(CHECKPOINT_GRID.every(g => g[0] * 2 !== g[1])).toBe(true);
    expect(distinctAtGrid(list, 'p', CHECKPOINT_GRID, 2).ok).toBe(true);
    // at 1/2 alone, p(1-p) = 1/4 and 1 - p = 1/2 = p: the bad grid
    expect(distinctAtGrid(['p', '1-p', 'p*(1-p)'], 'p', [f(1, 2)], 2).ok).toBe(false);
    // and p^2 = p / 2 only at 1/2
    expect(distinctAtGrid(['p^2', 'p/2'], 'p', [f(1, 2)], 1).ok).toBe(false);
    expect(distinctAtGrid(['p^2', 'p/2'], 'p', CHECKPOINT_GRID, 2).ok).toBe(true);
  });
});
