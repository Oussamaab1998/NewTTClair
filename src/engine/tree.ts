/**
 * Probability trees, exact (docs/exercises/BAC2022P_SC_EX2.md).
 *
 * Two things live here. A two-event tree (A or not A, then F or not F):
 * from what a statement gives, every branch, every path, the two totals and
 * the four reversed conditionals. And an authored tree as a picture draws it
 * (ProbabilityTree): branches with a probability or none yet, checked node by
 * node (the branches leaving one node sum to 1) and multiplied along a path.
 *
 * Nothing is rounded and nothing is typed in content: an answer shown as a
 * fact is one of these values.
 */
import {
  EngineError,
  add,
  compare,
  div,
  frac,
  mul,
  sub,
  type Fraction,
} from './rational';

const ZERO: Fraction = [0, 1];
const ONE: Fraction = [1, 1];

/** Every quantity of a two-event tree, by the name the method graphs use. */
export const TREE_QUANTITIES = [
  'a',
  'not_a',
  'f_given_a',
  'nf_given_a',
  'f_given_na',
  'nf_given_na',
  'a_and_f',
  'a_and_nf',
  'na_and_f',
  'na_and_nf',
  'f',
  'not_f',
  'a_given_f',
  'na_given_f',
  'a_given_nf',
  'na_given_nf',
] as const;
export type TreeQuantity = (typeof TREE_QUANTITIES)[number];
export type TwoEventTree = Readonly<Record<TreeQuantity, Fraction>>;

/**
 * What a statement gives: the first branch, the branch to F after A, and
 * either the total p(F) or the branch to F after not A.
 */
export type TwoEventGiven = {
  pA: Fraction;
  pFgA: Fraction;
} & ({ pF: Fraction } | { pFgNotA: Fraction });

const inUnit = (p: Fraction): boolean =>
  compare(p, ZERO) >= 0 && compare(p, ONE) <= 0;

/**
 * Solves the tree. Throws an EngineError when the givens are not a tree a
 * question can be asked on: a probability outside [0, 1], a first branch of
 * 0 or 1 (one side would not exist), a total p(F) the first path already
 * exceeds, or an event F that is sure or impossible (no reversed conditional).
 */
export function solveTwoEventTree(given: TwoEventGiven): TwoEventTree {
  const { pA, pFgA } = given;
  if (compare(pA, ZERO) <= 0 || compare(pA, ONE) >= 0) {
    throw new EngineError('p(A) must be strictly between 0 and 1');
  }
  if (!inUnit(pFgA)) {
    throw new EngineError('p(F | A) must be between 0 and 1');
  }
  const notA = sub(ONE, pA);
  const aAndF = mul(pA, pFgA);
  let fGivenNotA: Fraction;
  if ('pF' in given) {
    const naAndF = sub(given.pF, aAndF);
    if (compare(naAndF, ZERO) < 0 || compare(naAndF, notA) > 0) {
      throw new EngineError('p(F) does not fit the tree');
    }
    fGivenNotA = div(naAndF, notA);
  } else {
    if (!inUnit(given.pFgNotA)) {
      throw new EngineError('p(F | not A) must be between 0 and 1');
    }
    fGivenNotA = given.pFgNotA;
  }
  const naAndF = mul(notA, fGivenNotA);
  const f = add(aAndF, naAndF);
  const notF = sub(ONE, f);
  if (compare(f, ZERO) <= 0 || compare(notF, ZERO) <= 0) {
    throw new EngineError('F must be neither sure nor impossible');
  }
  const nfGivenA = sub(ONE, pFgA);
  const nfGivenNotA = sub(ONE, fGivenNotA);
  const aAndNf = mul(pA, nfGivenA);
  const naAndNf = mul(notA, nfGivenNotA);
  return {
    a: pA,
    not_a: notA,
    f_given_a: pFgA,
    nf_given_a: nfGivenA,
    f_given_na: fGivenNotA,
    nf_given_na: nfGivenNotA,
    a_and_f: aAndF,
    a_and_nf: aAndNf,
    na_and_f: naAndF,
    na_and_nf: naAndNf,
    f,
    not_f: notF,
    a_given_f: div(aAndF, f),
    na_given_f: div(naAndF, f),
    a_given_nf: div(aAndNf, notF),
    na_given_nf: div(naAndNf, notF),
  };
}

/**
 * The tree of a small population counted whole (a small example): `n` people,
 * `a` of them in A, `af` of those in F, and `naf` of the others in F.
 */
export function treeFromCounts(counts: {
  n: number;
  a: number;
  af: number;
  naf: number;
}): TwoEventTree {
  const { n, a, af, naf } = counts;
  const whole = [n, a, af, naf].every(x => Number.isInteger(x) && x >= 0);
  if (!whole || a <= 0 || a >= n || af > a || naf > n - a) {
    throw new EngineError('the counts do not make a tree');
  }
  return solveTwoEventTree({
    pA: frac(a, n),
    pFgA: frac(af, a),
    pFgNotA: frac(naf, n - a),
  });
}

// ---------------------------------------------------------------------------
// An authored tree (what a picture draws).

/** A branch: its id, its probability when the picture knows it, what leaves its end. */
export interface TreeBranch {
  id: string;
  p: Fraction | null;
  children?: readonly TreeBranch[];
}

export interface TreeIssue {
  /** The branch whose end is the faulty node; null for the root. */
  at: string | null;
  problem: 'out_of_range' | 'sum_not_one' | 'duplicate_id';
}

/**
 * Checks a tree node by node: every known probability is in [0, 1], and
 * where all the branches leaving a node are known, they sum to 1. A node with
 * an unknown branch is not checked for its sum (the picture is not complete).
 */
export function checkTree(branches: readonly TreeBranch[]): TreeIssue[] {
  const issues: TreeIssue[] = [];
  const seen = new Set<string>();
  const walk = (level: readonly TreeBranch[], at: string | null): void => {
    let sum: Fraction | null = ZERO;
    for (const b of level) {
      if (seen.has(b.id)) {
        issues.push({ at: b.id, problem: 'duplicate_id' });
      }
      seen.add(b.id);
      if (b.p === null) {
        sum = null;
      } else {
        if (!inUnit(b.p)) {
          issues.push({ at: b.id, problem: 'out_of_range' });
        }
        sum = sum === null ? null : add(sum, b.p);
      }
    }
    if (level.length > 0 && sum !== null && compare(sum, ONE) !== 0) {
      issues.push({ at, problem: 'sum_not_one' });
    }
    for (const b of level) {
      if (b.children && b.children.length > 0) {
        walk(b.children, b.id);
      }
    }
  };
  walk(branches, null);
  return issues;
}

/** The branches from the root to the end of `leafId`, or null when the tree has no such branch. */
export function pathTo(
  branches: readonly TreeBranch[],
  leafId: string,
): TreeBranch[] | null {
  for (const b of branches) {
    if (b.id === leafId) {
      return [b];
    }
    const below = b.children ? pathTo(b.children, leafId) : null;
    if (below) {
      return [b, ...below];
    }
  }
  return null;
}

/**
 * The probability of a path: the product of its branches. Null when the path
 * does not exist or one of its branches is not known yet.
 */
export function pathProbability(
  branches: readonly TreeBranch[],
  leafId: string,
): Fraction | null {
  const path = pathTo(branches, leafId);
  if (!path) {
    return null;
  }
  let out: Fraction = ONE;
  for (const b of path) {
    if (b.p === null) {
      return null;
    }
    out = mul(out, b.p);
  }
  return out;
}
