/**
 * Numbered-ball templates (docs/exercises/EX2_PROBABILITY.md): balls carry
 * numbers (`balls: [-1, 0, 0, 1, 2]`), `k` are drawn at once, and the events
 * and the random variable are read on the numbers. Four question shapes over
 * one vocabulary of nodes, so a result found in one question is reused in the
 * next (the total, P(B) = P(X = 0)):
 * - `num_same`: the k balls carry the same number (count, then divide);
 * - `num_at_least`: at least one ball carries `value`, through the opposite
 *   event (no ball carries it);
 * - `num_law`: the law of X (`valueFn`, the product by default): its values
 *   (a pick), the value whose event is an earlier result (`reuseValue`), the
 *   other values, and the check that the probabilities add up to 1;
 * - `num_moments`: E(X), E(X²) and V(X).
 *
 * Every value comes from the engine (`enumerateOutcomes`, `law`, the moments
 * of src/engine/probability.ts); a form is accepted only when it evaluates
 * exactly to its node's value (mutations.ts checks it). Several cards hold
 * more than one main node (the other values of the law): the card closes when
 * all of them are credited (mutations.ts `creditOf`).
 *
 * Wrong roads come from the real sessions of this exercise
 * (docs/samples/ex2_session_1_expected_planner.md): dividing by the balls
 * instead of the draws, taking the two balls 0 as one, ordered draws,
 * forgetting the draw with two 0, the opposite event's probability given as
 * the answer. A road that lands on the RIGHT value with these numbers
 * (5 × 2 = 10 draws, 3 balls without 0 = C(3,2) draws) is a trap, not a
 * credit (`traps`).
 *
 * Domain code, like the urn, binomial and tree templates.
 */
import { evaluateExact, parseExpression } from '../engine/expression';
import {
  enumerateOutcomes,
  expectation,
  law,
  secondMoment,
  variance,
  type Ball,
  type LawRow,
  type ValueFn,
} from '../engine/probability';
import { choose, EngineError, frac, sub, type Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import { chooseForms, type Graph, type GraphNode, type RawMutation } from './graph';
import { registerTemplate, type Args, type Template } from './templates';

const SPEC = { reds: 0, blacks: 0, k: 0, j: 0 };
const ONE: Fraction = [1, 1];

/** A value as written alone. */
const s = (v: Fraction): string =>
  v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`;
/** A whole number as an operand: a negative one keeps its brackets. */
const w = (x: number): string => (x < 0 ? `(${x})` : String(x));
const unique = (xs: string[]): string[] => [...new Set(xs)];
const down = (n: number, m: number): string =>
  Array.from({ length: m }, (_, i) => String(n - i)).join('*');
const fallingValue = (n: number, m: number): number => {
  let p = 1;
  for (let i = 0; i < m; i++) {
    p *= n - i;
  }
  return p;
};
/** `C(n,k)` as a student writes it; `1` and `n` alone when k is 0 or 1. */
const chooseWritten = (n: number, k: number): string[] =>
  k === 0 ? ['1'] : k === 1 ? [String(n)] : chooseForms(n, k);

/** A node id for a value of X: `p_m2` for -2, `p_0`, `p_2`. */
export const valueNodeId = (x: number): string =>
  x < 0 ? `p_m${-x}` : `p_${x}`;

interface Data {
  values: number[];
  k: number;
  n: number;
  total: number;
  balls: Ball[];
}

function dataOf(args: Args): Data {
  const raw = args.balls;
  if (
    !Array.isArray(raw) ||
    raw.length < 2 ||
    !raw.every(x => typeof x === 'number' && Number.isInteger(x))
  ) {
    throw new EngineError(
      'a numbered-ball template needs balls: an array of whole numbers',
    );
  }
  const values = raw as number[];
  const k = args.k === undefined ? 2 : args.k;
  if (typeof k !== 'number' || !Number.isInteger(k) || k < 1) {
    throw new EngineError('k must be a whole number of balls drawn');
  }
  if (k > values.length) {
    throw new EngineError('cannot draw more balls than the urn holds');
  }
  const balls: Ball[] = values.map((value, i) => ({
    id: String.fromCharCode(97 + i),
    value,
  }));
  return {
    values,
    k,
    n: values.length,
    total: choose(values.length, k),
    balls,
  };
}

/** How many balls carry each number, in increasing order of the number. */
function multiplicities(values: readonly number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of [...values].sort((a, b) => a - b)) {
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

/** The three nodes of the total card: ordered draws, orderings of one draw, all draws. */
function totalNodes(d: Data, bareTotal: boolean): GraphNode[] {
  const ord = fallingValue(d.n, d.k);
  const perDraw = fallingValue(d.k, d.k);
  return [
    {
      id: 'ord',
      planCard: 'total',
      role: 'support',
      unit: 'ordered',
      value: frac(ord),
      forms: [down(d.n, d.k)],
      bareOk: false,
      inputs: [],
      shape: { kind: 'falling', n: d.n, k: d.k },
      main: false,
    },
    {
      id: 'orderings',
      planCard: 'total',
      role: 'support',
      unit: 'ordered',
      value: frac(perDraw),
      forms: unique([down(d.k, d.k), down(d.k, d.k).replace(/\*1$/, '')]),
      bareOk: false,
      inputs: [],
      shape: { kind: 'factorial', k: d.k },
      main: false,
    },
    {
      id: 'total',
      planCard: 'total',
      role: 'total',
      unit: 'groups',
      value: frac(d.total),
      forms: chooseWritten(d.n, d.k),
      bareOk: bareTotal,
      inputs: ['ord', 'orderings'],
      shape: { kind: 'choose', n: d.n, k: d.k },
      main: true,
      ...(!bareTotal && { proof: true }),
      label: '\\text{card}(\\Omega)',
    },
  ];
}

/** Wrong roads to the total (the same in every question of this urn). */
function totalRoads(d: Data): RawMutation[] {
  const distinct = multiplicities(d.values).size;
  return [
    { id: 'drop_division', nodeId: 'total', expr: down(d.n, d.k) },
    ...(distinct !== d.n && distinct >= d.k
      ? [
          {
            id: 'merges_identical_balls',
            nodeId: 'total',
            expr: chooseWritten(distinct, d.k)[0]!,
          },
        ]
      : []),
    { id: 'n_times_k', nodeId: 'total', expr: `${d.n}*${d.k}` },
  ];
}

/** Keeps the roads whose value differs from their node's as slips, the others as traps. */
function split(
  nodes: readonly GraphNode[],
  roads: readonly RawMutation[],
  valueOf: (expr: string) => Fraction | null,
): { slips: RawMutation[]; traps: RawMutation[] } {
  const slips: RawMutation[] = [];
  const traps: RawMutation[] = [];
  for (const r of roads) {
    const node = nodes.find(x => x.id === r.nodeId);
    const v = valueOf(r.expr);
    if (!node || v === null) {
      continue;
    }
    (sameRat(v, node.value) ? traps : slips).push(r);
  }
  return { slips, traps };
}

const valueOfExpr = (expr: string): Fraction | null => {
  const p = parseExpression(expr, { variables: [], constants: [] });
  return p.ok ? evaluateExact(p.ast) : null;
};

function graphOf(
  id: string,
  cards: readonly string[],
  nodes: GraphNode[],
  roads: readonly RawMutation[],
): Graph {
  const { slips, traps } = split(nodes, roads, valueOfExpr);
  return {
    spec: SPEC,
    order: 'unordered',
    nodes,
    template: id,
    cards,
    mutate: (nd: GraphNode) => slips.filter(r => r.nodeId === nd.id),
    ...(traps.length > 0 && {
      traps: (nd: GraphNode) => traps.filter(r => r.nodeId === nd.id),
    }),
  };
}

// ---------------------------------------------------------------------------
// num_same: the k balls drawn carry the same number.

function buildSame(args: Args): Graph {
  const d = dataOf(args);
  const groups = [...multiplicities(d.values).entries()].filter(
    ([, m]) => m >= d.k,
  );
  if (groups.length === 0) {
    throw new EngineError('num_same: no number is carried by k balls');
  }
  const fav = groups.reduce((a, [, m]) => a + choose(m, d.k), 0);
  const favForms = unique([
    String(fav),
    groups.map(([, m]) => chooseWritten(m, d.k)[0]!).join('+'),
    groups.map(([, m]) => String(choose(m, d.k))).join('+'),
  ]);
  const result = frac(fav, d.total);
  const ballsSharing = groups.reduce((a, [, m]) => a + m, 0);
  const distinct = multiplicities(d.values).size;
  const nodes: GraphNode[] = [
    ...totalNodes(d, args.reuseTotal === true),
    {
      id: 'fav',
      planCard: 'fav',
      role: 'part',
      unit: 'groups',
      value: frac(fav),
      forms: favForms,
      // One draw, listed: "{0 ; 0}" is the whole reasoning.
      bareOk: true,
      inputs: [],
      shape: { kind: 'product', of: [] },
      main: true,
      label: '\\text{card}(A)',
    },
    {
      id: 'result',
      planCard: 'ratio',
      role: 'result',
      unit: 'ratio',
      value: result,
      forms: unique([`${fav}/${d.total}`, s(result)]),
      bareOk: false,
      inputs: ['total', 'fav'],
      shape: { kind: 'ratio', num: 'fav', den: 'total' },
      main: true,
      reduced: true,
      label: 'p(A)',
    },
  ];
  const roads: RawMutation[] = [
    ...totalRoads(d),
    // The balls that carry the shared number, not the draws they make.
    ...(ballsSharing !== fav
      ? [{ id: 'counts_balls_not_draws', nodeId: 'fav', expr: String(ballsSharing) }]
      : []),
    // Each number with itself, as if a ball could be drawn twice.
    ...(distinct !== fav
      ? [{ id: 'ball_drawn_twice', nodeId: 'fav', expr: String(distinct) }]
      : []),
    { id: 'swap_numerator_denominator', nodeId: 'result', expr: `${d.total}/${fav}` },
    {
      id: 'counts_balls_not_pairs',
      nodeId: 'result',
      expr: `${ballsSharing}/${d.n}`,
    },
    {
      id: 'ordered_instead_of_groups',
      nodeId: 'result',
      expr: `${fav}/${fallingValue(d.n, d.k)}`,
    },
  ];
  return graphOf('num_same', ['total', 'fav', 'ratio'], nodes, roads);
}

// ---------------------------------------------------------------------------
// num_at_least: at least one ball carries `value`, through the opposite event.

function intArg(args: Args, key: string): number {
  const v = args[key];
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new EngineError(`template argument ${key} must be a whole number`);
  }
  return v;
}

function buildAtLeast(args: Args): Graph {
  const d = dataOf(args);
  const value = intArg(args, 'value');
  const m = d.values.filter(x => x === value).length;
  const others = d.n - m;
  if (m === 0 || others < d.k) {
    throw new EngineError(
      'num_at_least: the number must be on a ball, and enough balls must be left without it',
    );
  }
  const none = choose(others, d.k);
  const pNone = frac(none, d.total);
  const fav = d.total - none;
  const result = sub(ONE, pNone);
  const label = `p(\\overline{B})`;
  const noneForms = chooseWritten(others, d.k);
  // Drawn two at a time: one ball with the number and one without, or two with it.
  const direct =
    d.k === 2
      ? unique([
          `${m}*${others}+${choose(m, 2)}`,
          `${m * others}+${choose(m, 2)}`,
        ])
      : [];
  const nodes: GraphNode[] = [
    ...totalNodes(d, args.reuseTotal === true),
    {
      id: 'none',
      planCard: 'none',
      role: 'part',
      unit: 'groups',
      value: frac(none),
      forms: noneForms,
      bareOk: false,
      inputs: [],
      shape: { kind: 'choose', n: others, k: d.k },
      main: false,
      proof: true,
      label: '\\text{card}(\\overline{B})',
    },
    {
      id: 'p_none',
      planCard: 'none',
      role: 'part',
      unit: 'ratio',
      value: pNone,
      forms: unique([
        `${none}/${d.total}`,
        s(pNone),
        ...noneForms.map(f => `(${f})/${d.total}`),
      ]),
      bareOk: false,
      inputs: ['none', 'total'],
      shape: { kind: 'ratio', num: 'none', den: 'total' },
      main: true,
      reduced: true,
      label,
    },
    {
      id: 'fav',
      planCard: 'result',
      role: 'support',
      unit: 'groups',
      value: frac(fav),
      forms: unique([`${d.total}-${none}`, ...direct]),
      bareOk: false,
      inputs: ['total', 'none'],
      shape: { kind: 'difference', of: ['total', 'none'] },
      main: false,
      label: '\\text{card}(B)',
    },
    {
      id: 'result',
      planCard: 'result',
      role: 'result',
      unit: 'ratio',
      value: result,
      forms: unique([
        `1-${s(pNone)}`,
        `1-${none}/${d.total}`,
        `(${d.total}-${none})/${d.total}`,
        `${fav}/${d.total}`,
        ...direct.map(f => `(${f})/${d.total}`),
      ]),
      bareOk: false,
      inputs: ['p_none'],
      shape: { kind: 'difference', of: ['total', 'p_none'] },
      main: true,
      // « Montrer que » prints the result: the calculation is what he shows.
      proof: true,
      reduced: true,
      label: 'p(B)',
    },
  ];
  const roads: RawMutation[] = [
    ...totalRoads(d),
    // The balls without the number, not the draws they make (equal when k = 2 and 3 balls).
    { id: 'counts_balls_not_draws', nodeId: 'none', expr: String(others) },
    { id: 'drop_division', nodeId: 'none', expr: down(others, d.k) },
    // The real session: the balls over the balls.
    { id: 'counts_balls_not_pairs', nodeId: 'p_none', expr: `${others}/${d.n}` },
    {
      id: 'ordered_instead_of_groups',
      nodeId: 'p_none',
      expr: `${fallingValue(others, d.k)}/${d.total}`,
    },
    // The opposite event's probability given as the answer.
    { id: 'forgot_one_minus', nodeId: 'result', expr: `${none}/${d.total}` },
    { id: 'counts_balls_not_pairs', nodeId: 'result', expr: `1-${others}/${d.n}` },
    ...(d.k === 2 && m >= 2
      ? [
          // Counted directly, the draw with two balls carrying the number is forgotten.
          {
            id: 'misses_double_draw',
            nodeId: 'result',
            expr: `${m}*${others}/${d.total}`,
          },
          // "Not B" taken as "exactly one ball carries it".
          {
            id: 'complement_partial_event',
            nodeId: 'result',
            expr: `1-${m}*${others}/${d.total}`,
          },
        ]
      : []),
    { id: 'swap_numerator_denominator', nodeId: 'result', expr: `${d.total}/${fav}` },
  ];
  return graphOf(
    'num_at_least',
    ['total', 'none', 'result'],
    nodes,
    roads,
  );
}

// ---------------------------------------------------------------------------
// num_law: the law of X.

function valueFnOf(args: Args): ValueFn {
  const f = args.valueFn ?? 'product';
  if (f !== 'product' && f !== 'sum' && f !== 'max' && f !== 'min') {
    throw new EngineError('valueFn must be product, sum, max or min');
  }
  return f;
}

function lawOf(d: Data, fn: ValueFn): LawRow[] {
  return law(fn, enumerateOutcomes(d.balls, 'simultaneous', d.k));
}

/** The values of X as a student lists them, in increasing order. */
export function lawValues(args: Args): number[] {
  const d = dataOf(args);
  return lawOf(d, valueFnOf(args)).map(r => r.value);
}

function buildLaw(args: Args): Graph {
  const d = dataOf(args);
  const rows = lawOf(d, valueFnOf(args));
  const reuse = args.reuseValue === undefined ? null : intArg(args, 'reuseValue');
  if (reuse !== null && !rows.some(r => r.value === reuse)) {
    throw new EngineError(`num_law: X never takes the value ${reuse}`);
  }
  if (rows.length < 2) {
    throw new EngineError('num_law: X takes one value only');
  }
  const pForms = (r: LawRow): string[] =>
    unique([`${r.outcomes.length}/${d.total}`, s(r.p)]);
  const nodes: GraphNode[] = rows.map(r => ({
    id: valueNodeId(r.value),
    planCard: r.value === reuse ? 'reuse' : 'others',
    role: 'part',
    unit: 'ratio',
    value: r.p,
    forms: pForms(r),
    // The value found in an earlier question (P(X = 0) = P(B)) is reused as it is.
    bareOk: r.value === reuse,
    inputs: [],
    shape: { kind: 'ratio', num: 'fav', den: 'total' },
    main: true,
    reduced: true,
    label: `p(X = ${r.value})`,
  }));
  const sorted = rows.map(r => s(r.p));
  const byWeight = [...rows]
    .sort((a, b) => b.outcomes.length - a.outcomes.length)
    .map(r => s(r.p));
  nodes.push({
    id: 'sum',
    planCard: 'check',
    role: 'result',
    unit: 'ratio',
    value: ONE,
    forms: unique([sorted.join('+'), byWeight.join('+')]),
    bareOk: false,
    inputs: nodes.map(n => n.id),
    shape: { kind: 'product', of: [] },
    main: true,
    proof: true,
    label: '\\sum p_i',
  });
  const roads: RawMutation[] = [];
  for (const r of rows) {
    const id = valueNodeId(r.value);
    const c = r.outcomes.length;
    roads.push(
      { id: 'counts_balls_not_pairs', nodeId: id, expr: `${c}/${d.n}` },
      { id: 'ordered_instead_of_groups', nodeId: id, expr: `${c}/${fallingValue(d.n, d.k)}` },
      { id: 'swap_numerator_denominator', nodeId: id, expr: `${d.total}/${c}` },
    );
  }
  if (reuse !== null) {
    const row = rows.find(r => r.value === reuse)!;
    const c = row.outcomes.length;
    const id = valueNodeId(reuse);
    roads.push(
      // The opposite event's probability (no ball 0) for {X = 0}.
      {
        id: 'confuses_event_and_complement',
        nodeId: id,
        expr: `${d.total - c}/${d.total}`,
      },
    );
  }
  // A value left out of the sum.
  for (const r of rows) {
    const rest = rows.filter(x => x !== r).map(x => s(x.p));
    if (rest.length >= 2) {
      roads.push({ id: 'law_sum_not_one', nodeId: 'sum', expr: rest.join('+') });
    }
  }
  return graphOf('num_law', ['values', 'reuse', 'others', 'check'], nodes, roads);
}

// ---------------------------------------------------------------------------
// num_moments: E(X), E(X²), V(X).

function buildMoments(args: Args): Graph {
  const d = dataOf(args);
  const rows = lawOf(d, valueFnOf(args));
  const e = expectation(rows).fraction;
  const e2 = secondMoment(rows).fraction;
  const v = variance(rows).fraction;
  const weighted = (f: (x: number) => number) =>
    rows.map(r => `${w(f(r.value))}*${s(r.p)}`).join('+');
  const weightedNoZero = (f: (x: number) => number) =>
    rows
      .filter(r => f(r.value) !== 0)
      .map(r => `${w(f(r.value))}*${s(r.p)}`)
      .join('+');
  const sq = (x: number) => x * x;
  const ms = (x: Fraction): string => (x[0] < 0 ? `(${s(x)})` : s(x));
  const nodes: GraphNode[] = [
    {
      id: 'mean',
      planCard: 'mean',
      role: 'part',
      unit: 'ratio',
      value: e,
      forms: unique([weighted(x => x), weightedNoZero(x => x)]),
      bareOk: false,
      inputs: [],
      shape: { kind: 'product', of: [] },
      main: true,
      proof: true,
      reduced: true,
      label: 'E(X)',
    },
    {
      id: 'square',
      planCard: 'square',
      role: 'part',
      unit: 'ratio',
      value: e2,
      forms: unique([weighted(sq), weightedNoZero(sq)]),
      bareOk: false,
      inputs: [],
      shape: { kind: 'product', of: [] },
      main: true,
      proof: true,
      reduced: true,
      label: 'E(X^2)',
    },
    {
      id: 'var',
      planCard: 'var',
      role: 'result',
      unit: 'ratio',
      value: v,
      forms: unique([
        `${s(e2)}-${ms(e)}*${ms(e)}`,
        `${s(e2)}-${s(frac(e[0] * e[0], e[1] * e[1]))}`,
      ]),
      bareOk: false,
      inputs: ['mean', 'square'],
      shape: { kind: 'difference', of: ['square', 'mean'] },
      main: true,
      proof: true,
      reduced: true,
      label: 'V(X)',
    },
  ];
  const distinct = rows.map(r => r.value);
  const eSquared = frac(e[0] * e[0], e[1] * e[1]);
  const roads: RawMutation[] = [
    // The values averaged as if they were equally likely.
    {
      id: 'mean_of_values_unweighted',
      nodeId: 'mean',
      expr: `(${distinct.map(w).join('+')})/${distinct.length}`,
    },
    // The signs dropped: every value counted as positive.
    {
      id: 'mean_drops_signs',
      nodeId: 'mean',
      expr: rows.map(r => `${Math.abs(r.value)}*${s(r.p)}`).join('+'),
    },
    // The square of the mean for the mean of the squares.
    { id: 'square_of_mean', nodeId: 'square', expr: `${ms(e)}*${ms(e)}` },
    // A negative value squared keeps its sign.
    {
      id: 'square_keeps_sign',
      nodeId: 'square',
      expr: rows
        .map(r => `${w(r.value < 0 ? -(r.value * r.value) : r.value * r.value)}*${s(r.p)}`)
        .join('+'),
    },
    // E(X) subtracted instead of E(X)².
    { id: 'variance_forgets_square', nodeId: 'var', expr: `${s(e2)}-${ms(e)}` },
    // The square of a negative mean added.
    { id: 'variance_adds_square', nodeId: 'var', expr: `${s(e2)}+${s(eSquared)}` },
    // The two terms the other way round.
    { id: 'variance_reversed', nodeId: 'var', expr: `${s(eSquared)}-${s(e2)}` },
  ];
  return graphOf('num_moments', ['mean', 'square', 'var'], nodes, roads);
}

// ---------------------------------------------------------------------------
// num_repeat_law / num_repeat_mean: the trial repeated n times with the balls
// put back (question 3). Y counts the successes, so it is binomial B(n, p);
// n stays a letter: his lines are formulas in n (src/method/exprLine.ts).

function fractionArg(args: Args, key: string): Fraction {
  const a = args[key];
  if (
    !Array.isArray(a) ||
    a.length !== 2 ||
    !a.every(x => typeof x === 'number' && Number.isInteger(x)) ||
    (a[1] as number) <= 0
  ) {
    throw new EngineError(`template argument ${key} must be [num, den]`);
  }
  return frac(a[0] as number, a[1] as number);
}

const fx = (v: Fraction): string => `(${s(v)})`;

/** The empty value of a step written with a letter (never read: `expr` is). */
const NO_VALUE: Fraction = [0, 1];

function exprNode(
  id: string,
  card: string,
  role: GraphNode['role'],
  expr: GraphNode['expr'],
  label: string,
): GraphNode {
  return {
    id,
    planCard: card,
    role,
    unit: 'ratio',
    value: NO_VALUE,
    forms: [],
    bareOk: false,
    inputs: [],
    shape: { kind: 'product', of: [] },
    main: true,
    label,
    ...(expr && { expr }),
  };
}

/** C(n,k) p^k q^(n−k) written in n, for k = 0, 1, 2. */
function termInN(k: number, p: Fraction, q: Fraction): string {
  const pk = k === 0 ? '' : k === 1 ? `${fx(p)}*` : `${fx(p)}^${k}*`;
  const qPow = k === 0 ? 'n' : `(n-${k})`;
  const count = k === 0 ? '' : k === 1 ? 'n*' : `n*(n-1)/2*`;
  return `${count}${pk}${fx(q)}^${qPow}`;
}

function buildRepeatLaw(args: Args): Graph {
  const p = fractionArg(args, 'p');
  const q = sub(ONE, p);
  const k = args.k === undefined ? 1 : intArg(args, 'k');
  if (k < 0 || k > 2) {
    throw new EngineError('num_repeat_law: k is 0, 1 or 2');
  }
  const ref = termInN(k, p, q);
  const knownWrong = [
    // The count of sequences forgotten: one sequence only.
    ...(k > 0
      ? [{ expr: termInN(k, p, q).replace(/^n\*(\(n-1\)\/2\*)?/, ''), id: 'forgets_count' }]
      : []),
    // The failures raised to n instead of n − k.
    ...(k > 0
      ? [{ expr: ref.replace(`^(n-${k})`, '^n'), id: 'failures_power_n' }]
      : []),
    // Success and failure exchanged.
    { expr: termInN(k, q, p), id: 'swaps_success_failure' },
  ];
  const nodes: GraphNode[] = [
    {
      id: 'p_trial',
      planCard: 'p',
      role: 'part',
      unit: 'ratio',
      value: p,
      forms: [s(p)],
      // The probability of one trial is a result found before (p(B)).
      bareOk: true,
      inputs: [],
      shape: { kind: 'ratio', num: 'fav', den: 'total' },
      main: true,
      label: 'p',
    },
    exprNode(
      'law_k',
      'law',
      'result',
      { variable: 'n', ref, goals: [], knownWrong },
      `P(Y = ${k})`,
    ),
  ];
  const roads: RawMutation[] = [
    { id: 'p_of_complement', nodeId: 'p_trial', expr: s(q) },
  ];
  return graphOf('num_repeat_law', ['type', 'p', 'law'], nodes, roads);
}

function buildRepeatMean(args: Args): Graph {
  const p = fractionArg(args, 'p');
  const q = sub(ONE, p);
  const target = fractionArg(args, 'target');
  const bound = frac(target[0] * p[1], target[1] * p[0]);
  const nMin = args.nMin === undefined ? 1 : intArg(args, 'nMin');
  const smallest = Math.max(nMin, Math.ceil(bound[0] / bound[1]));
  const nodes: GraphNode[] = [
    exprNode(
      'mean_n',
      'mean',
      'part',
      {
        variable: 'n',
        ref: `n*${fx(p)}`,
        goals: [],
        knownWrong: [
          { expr: `n*${fx(p)}*${fx(q)}`, id: 'variance_for_mean' },
          { expr: `n*${fx(q)}`, id: 'swaps_success_failure' },
        ],
      },
      'E(Y)',
    ),
    {
      id: 'bound',
      planCard: 'bound',
      role: 'part',
      unit: 'ratio',
      value: bound,
      forms: unique([
        `${s(target)}/${fx(p)}`,
        `${s(target)}*${p[1]}/${p[0]}`,
        s(bound),
      ]),
      bareOk: false,
      inputs: ['mean_n'],
      shape: { kind: 'ratio', num: 'target', den: 'p' },
      main: true,
      proof: true,
      label: 'n \\ge',
    },
    {
      id: 'smallest',
      planCard: 'smallest',
      role: 'result',
      unit: 'count',
      value: frac(smallest),
      forms: [String(smallest)],
      // The first whole number past the bound: the bound is his line before.
      bareOk: true,
      inputs: ['bound'],
      shape: { kind: 'product', of: [] },
      main: true,
      label: 'n',
    },
  ];
  const roads: RawMutation[] = [
    // Multiplied by p instead of divided.
    { id: 'solve_multiplies', nodeId: 'bound', expr: `${s(target)}*${fx(p)}` },
    // The whole number below the bound.
    ...(Math.floor(bound[0] / bound[1]) !== smallest &&
    Math.floor(bound[0] / bound[1]) >= 1
      ? [
          {
            id: 'rounds_down',
            nodeId: 'smallest',
            expr: String(Math.floor(bound[0] / bound[1])),
          },
        ]
      : []),
  ];
  return graphOf(
    'num_repeat_mean',
    ['mean', 'bound', 'smallest'],
    nodes,
    roads,
  );
}

// ---------------------------------------------------------------------------

/** Built once per arguments: the graph is read on every act, and never changed. */
const CACHE = new Map<string, Graph>();

const template = (
  id: string,
  cardKeys: readonly string[],
  build: (args: Args) => Graph,
): Template => ({
  id,
  cardKeys,
  build(args) {
    const key = `${id}|${JSON.stringify(args)}`;
    let g = CACHE.get(key);
    if (!g) {
      g = build(args);
      CACHE.set(key, g);
    }
    return g;
  },
});

export const LAW_TEMPLATE_IDS = [
  'num_same',
  'num_at_least',
  'num_law',
  'num_moments',
  'num_repeat_law',
  'num_repeat_mean',
] as const;

registerTemplate(template('num_same', ['total', 'fav', 'ratio'], buildSame));
registerTemplate(
  template('num_at_least', ['total', 'none', 'result'], buildAtLeast),
);
registerTemplate(
  template('num_law', ['values', 'reuse', 'others', 'check'], buildLaw),
);
registerTemplate(template('num_moments', ['mean', 'square', 'var'], buildMoments));
registerTemplate(
  template('num_repeat_law', ['type', 'p', 'law'], buildRepeatLaw),
);
registerTemplate(
  template('num_repeat_mean', ['mean', 'bound', 'smallest'], buildRepeatMean),
);
