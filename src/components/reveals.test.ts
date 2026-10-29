import type { Fraction } from '../engine/rational';
import {
  completeReveals,
  hintAllows,
  hintLevelOf,
  revealedByRules,
  type RevealRule,
} from './reveals';

const isSixty = (f: Fraction) => f[0] === 60 && f[1] === 1;

/** A SpreadSlider-like rule: the total is shown after 3 positions, unless totalLockedUntil is absent. */
const total: RevealRule = {
  value: 'variance_total',
  note: 'the total spread (the variance) at the current p',
  by: 'state',
  lockedBy: p => p.totalLockedUntil !== undefined,
  minHint: 'ladder_end',
  values: () => [[60, 1]],
};
const sizes: RevealRule = {
  value: 'stage_sizes',
  note: 'the number of options of each stage',
  by: 'props',
  minHint: 0,
  values: () => [[4, 1], [15, 1]],
};

describe('revealedByRules: does a component put the answer on screen by construction?', () => {
  it('a rule by props shows its values as soon as it is mounted', () => {
    const shows: RevealRule = { ...sizes, values: () => [[60, 1]] };
    expect(revealedByRules([shows], {}, undefined, isSixty)?.value).toBe('stage_sizes');
  });

  it('a rule by state is safe only when the props lock it', () => {
    expect(revealedByRules([total], { totalLockedUntil: { positions: 3 } }, undefined, isSixty)).toBeNull();
    expect(revealedByRules([total], {}, undefined, isSixty)?.value).toBe('variance_total');
  });

  it('a rule by state with no lock function is never trusted', () => {
    const unlocked: RevealRule = { ...total };
    delete unlocked.lockedBy;
    expect(
      revealedByRules([unlocked], { totalLockedUntil: { positions: 3 } }, undefined, isSixty)?.value,
    ).toBe('variance_total');
  });

  it('a value that is not the answer is no reveal', () => {
    expect(revealedByRules([sizes], {}, undefined, isSixty)).toBeNull();
  });

  it('no rule, no reveal; the first revealing rule is returned', () => {
    expect(revealedByRules([], {}, undefined, isSixty)).toBeNull();
    const shows: RevealRule = { ...sizes, value: 'first', values: () => [[60, 1]] };
    expect(revealedByRules([sizes, shows, total], {}, undefined, isSixty)?.value).toBe('first');
  });

  it('values may depend on the props and the experiment', () => {
    const rule: RevealRule = {
      ...sizes,
      values: (p, e) => [[Number(p.n) * (e?.k ?? 1), 1]],
    };
    const e = { urn: [], draw: 'simultaneous' as const, k: 3 };
    expect(revealedByRules([rule], { n: 20 }, e, isSixty)).not.toBeNull();
    expect(revealedByRules([rule], { n: 20 }, undefined, isSixty)).toBeNull();
  });
});

describe('hintAllows: a rule names the hint level from which it may be enabled', () => {
  it.each([
    [0, 0, false, true],
    [0, 3, false, true],
    [2, 1, false, false],
    [2, 2, false, true],
    [3, 2, false, false],
    ['ladder_end', 3, false, false],
    ['ladder_end', 3, true, true],
    ['ladder_end', 0, true, true],
  ] as const)('minHint %s at level %i (ladder ended: %s) -> %s', (minHint, level, ended, want) => {
    expect(hintAllows({ ...sizes, minHint }, level, ended)).toBe(want);
  });
});

describe('hintLevelOf: the level the lesson hands to a task component', () => {
  it('defaults to 0 and ignores anything that is not a level', () => {
    expect(hintLevelOf(undefined)).toBe(0);
    expect(hintLevelOf({})).toBe(0);
    expect(hintLevelOf({ hintLevel: '2' })).toBe(0);
    expect(hintLevelOf({ hintLevel: -1 })).toBe(0);
    expect(hintLevelOf({ hintLevel: 1.5 })).toBe(0);
  });
  it('reads 0..3 and never more than the ladder has', () => {
    expect(hintLevelOf({ hintLevel: 0 })).toBe(0);
    expect(hintLevelOf({ hintLevel: 2 })).toBe(2);
    expect(hintLevelOf({ hintLevel: 3 })).toBe(3);
    expect(hintLevelOf({ hintLevel: 9 })).toBe(3);
  });
});

describe('completeReveals: the condition for flipping offeredToPlanner (product owner, 2026-10-27)', () => {
  it('a declared, empty list is complete: the component reveals nothing by construction', () => {
    expect(completeReveals([])).toBe(true);
  });
  it('not declared is not complete', () => {
    expect(completeReveals(undefined)).toBe(false);
  });
  it('every rule needs a note, an id, a values function, and a lock if it is by state', () => {
    expect(completeReveals([sizes, total])).toBe(true);
    expect(completeReveals([{ ...sizes, note: '' }])).toBe(false);
    expect(completeReveals([{ ...sizes, value: 'Not An Id' }])).toBe(false);
    const noLock: RevealRule = { ...total };
    delete noLock.lockedBy;
    expect(completeReveals([noLock])).toBe(false);
    expect(completeReveals([{ ...sizes, values: undefined as never }])).toBe(false);
  });
  it('two rules with the same id are ambiguous', () => {
    expect(completeReveals([sizes, { ...sizes }])).toBe(false);
  });
});
