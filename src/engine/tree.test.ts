/**
 * The two-event tree and the authored tree. The facts of the exam exercise
 * (docs/exercises/BAC2022P_SC_EX2.md) are recomputed here from the three
 * numbers the statement gives, and checked a second way (paths sum to the
 * totals, every node's branches sum to 1).
 */
import { EngineError, add, frac, mul, sub, type Fraction } from './rational';
import {
  TREE_QUANTITIES,
  checkTree,
  pathProbability,
  pathTo,
  solveTwoEventTree,
  treeFromCounts,
  type TreeBranch,
} from './tree';

const f = (n: number, d = 1): Fraction => frac(n, d);
const ONE = f(1);

/** Bac 2022, session principale, Sciences expérimentales, exercice 2. */
const EXAM = { pA: f(2, 3), pFgA: f(1, 4), pF: f(5, 12) };

describe('the exam tree, from its three givens', () => {
  const t = solveTwoEventTree(EXAM);

  it('question 1: the path through not A to F is what the statement says', () => {
    expect(t.a_and_f).toEqual(mul(EXAM.pA, EXAM.pFgA));
    expect(t.na_and_f).toEqual(sub(EXAM.pF, t.a_and_f));
    expect(t.na_and_f).toEqual(f(1, 4));
  });

  it('question 2: the branch to F after not A', () => {
    expect(t.not_a).toEqual(f(1, 3));
    expect(t.f_given_na).toEqual(f(3, 4));
  });

  it('question 3: the four missing branches', () => {
    expect(t.not_a).toEqual(f(1, 3));
    expect(t.nf_given_a).toEqual(f(3, 4));
    expect(t.f_given_na).toEqual(f(3, 4));
    expect(t.nf_given_na).toEqual(f(1, 4));
  });

  it('question 4: not A knowing not F', () => {
    expect(t.not_f).toEqual(f(7, 12));
    expect(t.na_and_nf).toEqual(f(1, 12));
    expect(t.na_given_nf).toEqual(f(1, 7));
  });

  it('the official correction agrees on every value it prints', () => {
    // 1) 5/12 - 2/3 x 1/4 = 3/12 = 1/4   2) (1/4)/(1/3) = 3/4
    // 3) 1/3, 3/4, 3/4, 1/4               4) (1/3 x 1/4)/(1 - 5/12) = 1/7
    expect(sub(f(5, 12), mul(f(2, 3), f(1, 4)))).toEqual(f(3, 12));
    expect([t.not_a, t.nf_given_a, t.f_given_na, t.nf_given_na]).toEqual([
      f(1, 3),
      f(3, 4),
      f(3, 4),
      f(1, 4),
    ]);
    expect(t.na_given_nf).toEqual(f(1, 7));
  });

  it('checked a second way: branches, paths and totals agree', () => {
    expect(add(t.a, t.not_a)).toEqual(ONE);
    expect(add(t.f_given_a, t.nf_given_a)).toEqual(ONE);
    expect(add(t.f_given_na, t.nf_given_na)).toEqual(ONE);
    expect(add(t.a_and_f, t.na_and_f)).toEqual(t.f);
    expect(add(t.a_and_nf, t.na_and_nf)).toEqual(t.not_f);
    expect(
      [t.a_and_f, t.a_and_nf, t.na_and_f, t.na_and_nf].reduce(add),
    ).toEqual(ONE);
    expect(add(t.a_given_f, t.na_given_f)).toEqual(ONE);
    expect(add(t.a_given_nf, t.na_given_nf)).toEqual(ONE);
    expect(t.f).toEqual(EXAM.pF);
  });

  it('names every quantity once', () => {
    expect(Object.keys(t).sort()).toEqual([...TREE_QUANTITIES].sort());
  });
});

describe('solveTwoEventTree', () => {
  it('gives the same tree from the total or from the lower branch', () => {
    const fromTotal = solveTwoEventTree(EXAM);
    const fromBranch = solveTwoEventTree({
      pA: EXAM.pA,
      pFgA: EXAM.pFgA,
      pFgNotA: fromTotal.f_given_na,
    });
    expect(fromBranch).toEqual(fromTotal);
  });

  it.each([
    ['a first branch of 0', { pA: f(0), pFgA: f(1, 2), pF: f(1, 2) }],
    ['a first branch of 1', { pA: f(1), pFgA: f(1, 2), pF: f(1, 2) }],
    ['a branch above 1', { pA: f(1, 2), pFgA: f(3, 2), pF: f(1, 2) }],
    ['a total below the first path', { pA: f(1, 2), pFgA: f(1), pF: f(1, 4) }],
    ['a total the tree cannot reach', { pA: f(1, 2), pFgA: f(0), pF: f(3, 4) }],
    ['an impossible F', { pA: f(1, 2), pFgA: f(0), pFgNotA: f(0) }],
    ['a sure F', { pA: f(1, 2), pFgA: f(1), pFgNotA: f(1) }],
  ])('refuses %s', (_name, given) => {
    expect(() => solveTwoEventTree(given)).toThrow(EngineError);
  });
});

describe('treeFromCounts', () => {
  it('a class of 25: every probability is a count over a count', () => {
    const t = treeFromCounts({ n: 25, a: 15, af: 6, naf: 5 });
    expect(t.a).toEqual(f(15, 25));
    expect(t.f_given_a).toEqual(f(6, 15));
    expect(t.a_and_f).toEqual(f(6, 25));
    expect(t.na_and_f).toEqual(f(5, 25));
    expect(t.f).toEqual(f(11, 25));
    expect(t.f_given_na).toEqual(f(5, 10));
    // Among the 14 who are not F, 5 come from not A.
    expect(t.na_given_nf).toEqual(f(5, 14));
  });

  it.each([
    [{ n: 10, a: 0, af: 0, naf: 1 }],
    [{ n: 10, a: 10, af: 1, naf: 0 }],
    [{ n: 10, a: 4, af: 5, naf: 1 }],
    [{ n: 10, a: 4, af: 1, naf: 7 }],
    [{ n: 10, a: 4.5, af: 1, naf: 1 }],
  ])('refuses counts that do not make a tree: %j', counts => {
    expect(() => treeFromCounts(counts)).toThrow(EngineError);
  });
});

describe('an authored tree', () => {
  const printed: TreeBranch[] = [
    {
      id: 'a',
      p: f(2, 3),
      children: [
        { id: 'a.f', p: f(1, 4) },
        { id: 'a.nf', p: null },
      ],
    },
    {
      id: 'na',
      p: null,
      children: [
        { id: 'na.f', p: null },
        { id: 'na.nf', p: null },
      ],
    },
  ];

  it('the tree as printed has no fault (unknown branches are not summed)', () => {
    expect(checkTree(printed)).toEqual([]);
  });

  it('a path is the product of its branches, or unknown', () => {
    expect(pathTo(printed, 'a.f')?.map(b => b.id)).toEqual(['a', 'a.f']);
    expect(pathProbability(printed, 'a.f')).toEqual(mul(f(2, 3), f(1, 4)));
    expect(pathProbability(printed, 'a.nf')).toBeNull();
    expect(pathProbability(printed, 'nowhere')).toBeNull();
  });

  it('finds a node whose branches do not sum to 1, a value out of range, a repeated id', () => {
    const wrong: TreeBranch[] = [
      {
        id: 'a',
        p: f(2, 3),
        children: [
          { id: 'x', p: f(1, 4) },
          { id: 'x', p: f(1, 4) },
        ],
      },
      { id: 'na', p: f(3, 2) },
    ];
    expect(checkTree(wrong)).toEqual(
      expect.arrayContaining([
        { at: null, problem: 'sum_not_one' },
        { at: 'na', problem: 'out_of_range' },
        { at: 'x', problem: 'duplicate_id' },
        { at: 'a', problem: 'sum_not_one' },
      ]),
    );
  });
});
