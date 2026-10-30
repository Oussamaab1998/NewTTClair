/**
 * Claim testing (docs/METHOD_LESSON_PLAN.md G and 8.6): a claim the student
 * picks from cards is a RELATION between the numbers of a small box, written
 * as the number of groups it predicts from the other numbers. The engine
 * computes the prediction on a NEW case and the real count; the student
 * checks with his own list. Variables (single letters, the parser's rule):
 * `o` ordered draws, `f` the orderings of one group (k!), `k`, `n`.
 *
 * Nothing about a claim is trusted from content: its truth is derived by
 * running it on a battery of boxes, and the loader compares.
 */
import {
  evaluateExact,
  parseExpression,
  type Node,
} from '../engine/expression';
import { choose, EngineError, frac, type Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import { factorial } from '../engine/combinatorics';

export interface BoxCase {
  n: number;
  k: number;
}

export function boxNumbers(c: BoxCase): {
  ordered: number;
  groups: number;
  kfact: number;
} {
  if (
    !Number.isInteger(c.n) ||
    !Number.isInteger(c.k) ||
    c.k < 1 ||
    c.k > c.n
  ) {
    throw new EngineError('a box needs 1 <= k <= n');
  }
  let ordered = 1;
  for (let i = 0; i < c.k; i++) {
    ordered *= c.n - i;
  }
  return { ordered, groups: choose(c.n, c.k), kfact: factorial(c.k) };
}

function bind(n: Node, vars: Readonly<Record<string, number>>): Node {
  switch (n.type) {
    case 'var': {
      const v = vars[n.name];
      if (v === undefined) {
        throw new EngineError(`unknown variable ${n.name}`);
      }
      return { type: 'num', value: v, text: String(v) };
    }
    case 'unary':
      return { ...n, arg: bind(n.arg, vars) };
    case 'binary':
      return { ...n, left: bind(n.left, vars), right: bind(n.right, vars) };
    case 'call':
      return { ...n, arg: bind(n.arg, vars) };
    default:
      return n;
  }
}

/** An expression in named fractions (`t - a`): exact, safe parser, nothing else. */
export function evalWith(
  expr: string,
  vars: Readonly<Record<string, Fraction>>,
): Fraction {
  const names = Object.keys(vars);
  const p = parseExpression(expr, { variables: names, constants: [] });
  if (!p.ok) {
    throw new EngineError(`claim does not parse: ${expr} (${p.error.code})`);
  }
  const node = (v: Fraction): Node => {
    const q = parseExpression(`${v[0]}/${v[1]}`, {
      variables: [],
      constants: [],
    });
    if (!q.ok) {
      throw new EngineError(`not a number: ${v[0]}/${v[1]}`);
    }
    return q.ast;
  };
  const sub = (n: Node): Node => {
    switch (n.type) {
      case 'var': {
        const v = vars[n.name];
        if (!v) {
          throw new EngineError(`unknown variable ${n.name}`);
        }
        return node(v);
      }
      case 'unary':
        return { ...n, arg: sub(n.arg) };
      case 'binary':
        return { ...n, left: sub(n.left), right: sub(n.right) };
      case 'call':
        return { ...n, arg: sub(n.arg) };
      default:
        return n;
    }
  };
  const value = evaluateExact(sub(p.ast));
  if (value === null) {
    throw new EngineError(`claim has no exact value: ${expr}`);
  }
  return value;
}

export interface Prediction {
  predicted: Fraction;
  actual: Fraction;
  holds: boolean;
}

/** `predictsGroups` is an expression in o, f, k, n: the number of groups the claim predicts. */
export function predictClaim(predictsGroups: string, c: BoxCase): Prediction {
  const p = parseExpression(predictsGroups, {
    variables: ['o', 'f', 'k', 'n'],
    constants: [],
  });
  if (!p.ok) {
    throw new EngineError(
      `claim does not parse: ${predictsGroups} (${p.error.code})`,
    );
  }
  const b = boxNumbers(c);
  const value = evaluateExact(
    bind(p.ast, { o: b.ordered, f: b.kfact, k: c.k, n: c.n }),
  );
  if (value === null) {
    throw new EngineError(`claim has no exact value: ${predictsGroups}`);
  }
  const actual = frac(b.groups);
  return { predicted: value, actual, holds: sameRat(value, actual) };
}

export type Truth = 'true' | 'false' | 'true_only_for_k2';

const BATTERY: BoxCase[] = [
  { n: 3, k: 2 },
  { n: 4, k: 2 },
  { n: 5, k: 2 },
  { n: 5, k: 3 },
  { n: 6, k: 3 },
  { n: 7, k: 3 },
  { n: 6, k: 4 },
];

/** True when it holds on every box; true only for pairs when it fails exactly on k >= 3. */
export function derivedTruth(predictsGroups: string): Truth {
  const results = BATTERY.map(c => ({
    k: c.k,
    ok: predictClaim(predictsGroups, c).holds,
  }));
  if (results.every(r => r.ok)) {
    return 'true';
  }
  const failsOnlyAboveTwo = results.filter(r => !r.ok).every(r => r.k >= 3);
  const holdsOnPairs = results.filter(r => r.k === 2).every(r => r.ok);
  return failsOnlyAboveTwo && holdsOnPairs ? 'true_only_for_k2' : 'false';
}

export interface ClaimCardData {
  id: string;
  predictsGroups: string;
  truth: Truth;
}

/** At most this many groups can be written by hand with chips. */
export const MAX_LISTABLE_GROUPS = 10;

export function claimSetOk(
  cards: readonly ClaimCardData[],
  testCase: BoxCase,
): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const { groups } = boxNumbers(testCase);
  if (groups > MAX_LISTABLE_GROUPS) {
    problems.push(`${groups} groups are too long to list by hand`);
  }
  if (testCase.k === testCase.n - 1) {
    problems.push('k = n - 1: as many groups as balls hides which was counted');
  }
  for (const card of cards) {
    const real = derivedTruth(card.predictsGroups);
    if (real !== card.truth) {
      problems.push(
        `${card.id}: authored truth ${card.truth}, derived ${real}`,
      );
      continue;
    }
    const verdict = predictClaim(card.predictsGroups, testCase);
    if (card.truth === 'true' && !verdict.holds) {
      problems.push(`${card.id}: a true claim fails on the test case`);
    }
    if (card.truth !== 'true' && verdict.holds) {
      problems.push(`${card.id}: the test case does not falsify it`);
    }
  }
  return { ok: problems.length === 0, problems };
}
