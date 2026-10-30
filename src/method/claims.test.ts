import { ratToString } from '../engine/rationalFormat';
import { boxNumbers, claimSetOk, derivedTruth, predictClaim } from './claims';

const show = (expr: string, n: number, k: number) => {
  const r = predictClaim(expr, { n, k });
  return {
    predicted: ratToString(r.predicted),
    actual: ratToString(r.actual),
    holds: r.holds,
  };
};

describe('a box of n balls taken k at a time', () => {
  it('ordered draws, groups, orderings of one group (abc has 6)', () => {
    expect(boxNumbers({ n: 3, k: 2 })).toEqual({
      ordered: 6,
      groups: 3,
      kfact: 2,
    });
    expect(boxNumbers({ n: 4, k: 3 })).toEqual({
      ordered: 24,
      groups: 4,
      kfact: 6,
    });
    expect(boxNumbers({ n: 5, k: 3 })).toEqual({
      ordered: 60,
      groups: 10,
      kfact: 6,
    });
    expect(boxNumbers({ n: 8, k: 3 })).toEqual({
      ordered: 336,
      groups: 56,
      kfact: 6,
    });
  });
});

describe('the engine computes what a claim predicts on a new case', () => {
  it('"always x2" (groups = ordered / 2) is true for pairs, false for triples', () => {
    expect(show('o/2', 3, 2)).toEqual({
      predicted: '3',
      actual: '3',
      holds: true,
    });
    // the owner's test: 3 balls out of 4, predicted 12, the list gave 4
    expect(show('o/2', 4, 3)).toEqual({
      predicted: '12',
      actual: '4',
      holds: false,
    });
    // the new case of R3: 3 out of 5, predicted 30, the list gives 10
    expect(show('o/2', 5, 3)).toEqual({
      predicted: '30',
      actual: '10',
      holds: false,
    });
  });

  it('"divide by k" fails on triples, "divide by k!" holds everywhere', () => {
    expect(show('o/k', 3, 2).holds).toBe(true);
    expect(show('o/k', 5, 3)).toEqual({
      predicted: '20',
      actual: '10',
      holds: false,
    });
    for (const [n, k] of [
      [3, 2],
      [4, 2],
      [5, 3],
      [6, 3],
      [7, 4],
    ] as const) {
      expect(show('o/f', n, k).holds).toBe(true);
    }
  });

  it("the owner's relation: 24 / 6 = 4 and 336 / 6 = 56", () => {
    expect(show('o/f', 4, 3)).toEqual({
      predicted: '4',
      actual: '4',
      holds: true,
    });
    expect(show('o/f', 8, 3)).toEqual({
      predicted: '56',
      actual: '56',
      holds: true,
    });
  });

  it('rejects what it cannot read, and letters it does not know', () => {
    expect(() => predictClaim('o/', { n: 4, k: 3 })).toThrow();
    expect(() => predictClaim('o/z', { n: 4, k: 3 })).toThrow();
    expect(() => predictClaim('o/0', { n: 4, k: 3 })).toThrow();
  });
});

describe('the truth of a claim is derived, never trusted', () => {
  it('true, false, or true only when two balls are taken (2 = 2!)', () => {
    expect(derivedTruth('o/f')).toBe('true');
    expect(derivedTruth('o/2')).toBe('true_only_for_k2');
    expect(derivedTruth('o/k')).toBe('true_only_for_k2');
    expect(derivedTruth('o')).toBe('false');
  });
});

describe('a claim set must tell the cards apart on its test case', () => {
  const cards = [
    {
      id: 'always2',
      predictsGroups: 'o/2',
      truth: 'true_only_for_k2' as const,
    },
    { id: 'byk', predictsGroups: 'o/k', truth: 'true_only_for_k2' as const },
    { id: 'kfact', predictsGroups: 'o/f', truth: 'true' as const },
  ];

  it('3 out of 5 (10 groups, 60 ordered) falsifies the over-general cards and keeps the true one', () => {
    expect(claimSetOk(cards, { n: 5, k: 3 })).toEqual({
      ok: true,
      problems: [],
    });
  });

  it('a pair box cannot distinguish them, so it is refused as a test case', () => {
    const r = claimSetOk(cards, { n: 3, k: 2 });
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/always2/);
  });

  it('a list too long to write by hand is refused', () => {
    expect(claimSetOk(cards, { n: 8, k: 3 }).ok).toBe(false);
  });

  it('"3 of 4" is refused: as many groups as balls hides which was counted', () => {
    expect(claimSetOk(cards, { n: 4, k: 3 }).ok).toBe(false);
  });

  it('a card whose authored truth is wrong is refused', () => {
    const bad = [
      { id: 'x', predictsGroups: 'o/2', truth: 'true' as const },
      cards[2]!,
    ];
    expect(claimSetOk(bad, { n: 5, k: 3 }).ok).toBe(false);
  });
});
