/**
 * Coincidence guard (docs/COMPONENTS_PROBABILITY_V2.md E6). A teaching example
 * is only worth showing when a student who uses a WRONG method gets a
 * DIFFERENT number from the right one: 2 + 2 = 2 x 2, k = k! for k = 2,
 * p^2 = p / 2 at p = 1/2 all hide the difference. `wrongMethodValues` names
 * the slips seen in the sessions and computes them; `coincidences` returns
 * those that equal the right value; `assertNoCoincidence` is what a loader or
 * a generator calls for an example that is meant to distinguish them.
 */
import { arrangements, choose, factorial } from './combinatorics';
import { evaluateExact, parseExpression, type Node } from './expression';
import { sameRat } from './rationalFormat';
import {
  EngineError,
  compare,
  frac,
  mul,
  sub,
  type Fraction,
} from './rational';

export interface WrongMethod {
  id: string;
  value: Fraction;
  /** What the student did (English, for tests and reports; never shown). */
  note: string;
}

export type StageSpec = { options: number } | { n: number; k: number };

export type CoincidenceSpec =
  /** Count of a staged choice: AND multiplies the stages, OR adds them. */
  | { kind: 'staged'; mode: 'and' | 'or'; stages: StageSpec[] }
  /** Number of ways to choose k of n: C(n,k). */
  | { kind: 'subset'; n: number; k: number }
  /** Number of boxes of an ordered draw: A(n,k) / k!. */
  | { kind: 'boxes'; n: number; k: number }
  /** The spread of a Bernoulli variable: p(1-p). */
  | { kind: 'bernoulli_variance'; p: Fraction };

const int = (n: number): Fraction => frac(n);

function positive(name: string, n: number): void {
  if (!Number.isInteger(n) || n < 1) {
    throw new EngineError(`${name} must be a positive integer`);
  }
}

const combine = (mode: 'and' | 'or', counts: number[]): number =>
  counts.reduce((acc, c, i) =>
    i === 0 ? c : mode === 'and' ? acc * c : acc + c,
  );

function staged(
  mode: 'and' | 'or',
  stages: readonly StageSpec[],
): { correct: Fraction; wrong: WrongMethod[] } {
  if (stages.length < 2 || stages.length > 3) {
    throw new EngineError('a staged count has 2 or 3 stages');
  }
  const counts = stages.map(s => {
    if ('options' in s) {
      positive('options', s.options);
      return s.options;
    }
    positive('n', s.n);
    positive('k', s.k);
    if (s.k > s.n) {
      throw new EngineError('k cannot exceed n');
    }
    return choose(s.n, s.k);
  });
  const correct = int(combine(mode, counts));
  const wrong: WrongMethod[] = [
    mode === 'and'
      ? {
          id: 'sum_instead_of_product',
          value: int(combine('or', counts)),
          note: 'added the stages instead of multiplying them',
        }
      : {
          id: 'product_instead_of_sum',
          value: int(combine('and', counts)),
          note: 'multiplied the stages instead of adding them',
        },
  ];
  const subsetIdx = stages.flatMap((s, i) => ('n' in s ? [i] : []));
  for (const i of subsetIdx) {
    const s = stages[i] as { n: number; k: number };
    const suffix = subsetIdx.length > 1 ? `_${i + 1}` : '';
    const swap = (v: number) => counts.map((c, j) => (j === i ? v : c));
    wrong.push(
      {
        id: `subset_as_n${suffix}`,
        value: int(combine(mode, swap(s.n))),
        note: 'counted the balls, not the choices',
      },
      {
        id: `subset_as_arrangements${suffix}`,
        value: int(combine(mode, swap(arrangements(s.n, s.k)))),
        note: 'counted ordered choices',
      },
      {
        id: `subset_as_nk${suffix}`,
        value: int(combine(mode, swap(s.n * s.k))),
        note: 'read C(n,k) as n x k',
      },
    );
  }
  return { correct, wrong };
}

/** The right value and the named wrong-method values for an example. */
export function wrongMethodValues(spec: CoincidenceSpec): {
  correct: Fraction;
  wrong: WrongMethod[];
} {
  switch (spec.kind) {
    case 'staged':
      return staged(spec.mode, spec.stages);
    case 'subset': {
      positive('n', spec.n);
      positive('k', spec.k);
      if (spec.k > spec.n) {
        throw new EngineError('k cannot exceed n');
      }
      const power = Array.from({ length: spec.k }).reduce<number>(
        acc => acc * spec.n,
        1,
      );
      return {
        correct: int(choose(spec.n, spec.k)),
        wrong: [
          { id: 'n_times_k', value: int(spec.n * spec.k), note: 'read C(n,k) as n x k' },
          { id: 'arrangements', value: int(arrangements(spec.n, spec.k)), note: 'counted ordered choices, A(n,k)' },
          { id: 'n_power_k', value: int(power), note: 'n^k, with replacement' },
          { id: 'n_plus_k', value: int(spec.n + spec.k), note: 'added n and k' },
        ],
      };
    }
    case 'boxes': {
      positive('n', spec.n);
      positive('k', spec.k);
      if (spec.k > spec.n) {
        throw new EngineError('k cannot exceed n');
      }
      const total = arrangements(spec.n, spec.k);
      return {
        correct: frac(total, factorial(spec.k)),
        wrong: [
          {
            id: 'divide_by_k',
            value: frac(total, spec.k),
            note: 'divided by the number of balls in a box instead of its orderings (k!)',
          },
          { id: 'ordered_total', value: int(total), note: 'did not divide at all' },
        ],
      };
    }
    case 'bernoulli_variance': {
      const { p } = spec;
      const q = sub([1, 1], p);
      if (compare(p, [0, 1]) < 0 || compare(q, [0, 1]) < 0) {
        throw new EngineError('p must be between 0 and 1');
      }
      return {
        correct: mul(p, q),
        wrong: [
          { id: 'p_squared', value: mul(p, p), note: 'p^2' },
          { id: 'p_over_2', value: mul(p, [1, 2]), note: 'p / 2' },
          { id: 'q_squared', value: mul(q, q), note: '(1 - p)^2' },
          { id: 'p_alone', value: p, note: 'p' },
          { id: 'q_alone', value: q, note: '1 - p' },
        ],
      };
    }
  }
}

/** The wrong methods whose value equals the right one. */
export function coincidences(spec: CoincidenceSpec): WrongMethod[] {
  const { correct, wrong } = wrongMethodValues(spec);
  return wrong.filter(w => sameRat(w.value, correct));
}

/** Throws, naming the colliding methods, if any wrong method gives the right value. */
export function assertNoCoincidence(spec: CoincidenceSpec): void {
  const hits = coincidences(spec);
  if (hits.length > 0) {
    throw new EngineError(
      `coincidence: ${hits.map(h => `${h.id} (${h.note})`).join('; ')} give the right value`,
    );
  }
}

function substitute(node: Node, name: string, value: Fraction): Node {
  switch (node.type) {
    case 'var': {
      if (node.name !== name) {
        return node;
      }
      const [n, d] = value;
      const num = (x: number): Node => ({ type: 'num', value: x, text: String(x) });
      const ratio: Node =
        d === 1
          ? num(Math.abs(n))
          : { type: 'binary', op: '/', left: num(Math.abs(n)), right: num(d) };
      return n < 0 ? { type: 'unary', op: '-', arg: ratio } : ratio;
    }
    case 'unary':
      return { ...node, arg: substitute(node.arg, name, value) };
    case 'binary':
      return {
        ...node,
        left: substitute(node.left, name, value),
        right: substitute(node.right, name, value),
      };
    case 'call':
      return { ...node, arg: substitute(node.arg, name, value) };
    default:
      return node;
  }
}

/** Exact value of a safe-parser expression with `name` set to a rational; null if it is not rational there. */
export function evaluateAtRational(
  ast: Node,
  name: string,
  value: Fraction,
): Fraction | null {
  return evaluateExact(substitute(ast, name, frac(value[0], value[1])));
}

/**
 * Candidate expressions in one variable must be told apart: at how many grid
 * positions are they pairwise different? Used for the SpreadSlider checkpoint
 * ("which expression is 0 at p = 0 and p = 1 and largest at 1/2?"): p(1-p),
 * p^2, p / 2 and (1-p)^2 all give 1/4 at p = 1/2. Throws if an expression does
 * not parse or has no rational value anywhere on the grid.
 */
export function distinctAtGrid(
  expressions: readonly string[],
  variable: string,
  grid: readonly Fraction[],
  minPositions = 2,
): { ok: boolean; positions: Fraction[] } {
  const asts = expressions.map(src => {
    const r = parseExpression(src, { variables: [variable] });
    if (!r.ok) {
      throw new EngineError(`does not parse: ${src} (${r.error.code})`);
    }
    return r.ast;
  });
  const table = asts.map(ast => grid.map(g => evaluateAtRational(ast, variable, g)));
  table.forEach((row, i) => {
    if (row.every(v => v === null)) {
      throw new EngineError(`no rational value on the grid: ${expressions[i]}`);
    }
  });
  const positions = grid.filter((_, c) => {
    const column = table.map(row => row[c]);
    if (column.some(v => v === null)) {
      return false;
    }
    const seen = column as Fraction[];
    return seen.every((a, i) => seen.every((b, j) => i === j || !sameRat(a, b)));
  });
  return { ok: positions.length >= minPositions, positions };
}
