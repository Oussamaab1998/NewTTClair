/**
 * Function-analysis templates (docs/exercises/EX4_ANALYSIS.md, Partie A):
 * parity, a limit and its interpretation, a derivative, the variation table,
 * the curve. The function is an argument written in x (`expr`, the safe
 * parser's syntax), so a similar question is another function. Steps
 * written with x are `expr` nodes (src/method/exprLine.ts): each of his
 * lines must equal the one before it at every sample point. Steps answered
 * by a sentence card (the domain, the conclusion, the interpretation, the
 * table) have no node: their card is a pick.
 *
 * Every argument is checked by the engine when the graph is built, so a
 * content mistake cannot reach a student: the parity claim (f(−x) against
 * ±f(x) by samples), the rewritten forms against f, the limit against f far
 * out, the derivative against the numeric derivative, f at the top point.
 *
 * Domain code, like the urn, tree and numbered-ball templates.
 */
import {
  evaluateExact,
  evaluateReal,
  parseExpression,
  type Node,
} from '../engine/expression';
import { EngineError, frac, type Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import { equalsRef, type ExprSpec } from './exprLine';
import type { Graph, GraphNode, RawMutation } from './graph';
import { registerTemplate, type Args, type Template } from './templates';

const SPEC = { reds: 0, blacks: 0, k: 0, j: 0 };
const NO_VALUE: Fraction = [0, 1];
const unique = (xs: string[]): string[] => [...new Set(xs)];

// ---------------------------------------------------------------------------
// Arguments.

function str(args: Args, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new EngineError(`template argument ${key} must be an expression`);
  }
  return v;
}

function strs(args: Args, key: string): string[] {
  const v = args[key];
  if (v === undefined) {
    return [];
  }
  if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) {
    throw new EngineError(`template argument ${key} must be expressions`);
  }
  return v as string[];
}

function slips(args: Args, key: string): { expr: string; id: string }[] {
  const v = args[key];
  if (v === undefined) {
    return [];
  }
  if (
    !Array.isArray(v) ||
    !v.every(
      x =>
        x !== null &&
        typeof x === 'object' &&
        typeof (x as { expr?: unknown }).expr === 'string' &&
        typeof (x as { id?: unknown }).id === 'string',
    )
  ) {
    throw new EngineError(`template argument ${key} must be {expr, id} slips`);
  }
  return v as { expr: string; id: string }[];
}

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

function ast(expr: string): Node {
  const p = parseExpression(expr, { variables: ['x'] });
  if (!p.ok) {
    throw new EngineError(`expression does not read: ${expr}`);
  }
  return p.ast;
}

const at = (n: Node, x: number): number => evaluateReal(n, { x });

/** f with x replaced by (−x), as the student writes it. */
export const negated = (expr: string): string =>
  expr.replace(/(?<![A-Za-z])x(?![A-Za-z])/g, '(-x)');

/** A number line's exact value (its forms are number lines). */
function exactOf(expr: string): Fraction | null {
  const p = parseExpression(expr, { variables: [], constants: [] });
  return p.ok ? evaluateExact(p.ast) : null;
}

function checkForms(forms: readonly string[], value: Fraction, what: string) {
  for (const f of forms) {
    const v = exactOf(f);
    if (!v || !sameRat(v, value)) {
      throw new EngineError(`${what}: ${f} is not ${value[0]}/${value[1]}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Nodes.

function exprNode(
  id: string,
  card: string,
  role: GraphNode['role'],
  expr: ExprSpec,
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
    expr,
  };
}

function valueNode(
  id: string,
  card: string,
  value: Fraction,
  forms: string[],
  o: { proof?: boolean; bareOk?: boolean; label: string },
): GraphNode {
  return {
    id,
    planCard: card,
    role: 'result',
    unit: 'ratio',
    value,
    forms,
    bareOk: o.bareOk === true,
    inputs: [],
    shape: { kind: 'product', of: [] },
    main: true,
    ...(o.proof === true && { proof: true }),
    label: o.label,
  };
}

function graphOf(
  id: string,
  cards: readonly string[],
  nodes: GraphNode[],
  roads: readonly RawMutation[] = [],
): Graph {
  return {
    spec: SPEC,
    order: 'unordered',
    nodes,
    template: id,
    cards,
    domain: 'analysis',
    mutate: (nd: GraphNode) => roads.filter(r => r.nodeId === nd.id),
  };
}

// ---------------------------------------------------------------------------
// fn_parity: the domain is symmetric (a pick), f(−x) written down to ±f(x)
// (lines), the conclusion (a pick).

function buildParity(args: Args): Graph {
  const expr = str(args, 'expr');
  const parity = args.parity === 'odd' ? 'odd' : 'even';
  const opposite = `-(${expr})`;
  const spec: ExprSpec = {
    variable: 'x',
    ref: negated(expr),
    goals: unique([parity === 'even' ? expr : opposite, ...strs(args, 'goals')]),
    goalNames:
      parity === 'even' ? ['f(x)', 'g(x)', 'h(x)'] : ['-f(x)', '-g(x)', '-h(x)'],
    knownWrong: [
      // The other parity's form: f(−x) = −f(x) for an even f, and back.
      { expr: parity === 'even' ? opposite : expr, id: 'odd_for_even' },
      ...slips(args, 'knownWrong'),
    ],
  };
  if (!equalsRef(spec, spec.goals[0]!)) {
    throw new EngineError(`fn_parity: f(-x) is not ${spec.goals[0]}`);
  }
  for (const g of spec.goals) {
    if (!equalsRef(spec, g)) {
      throw new EngineError(`fn_parity: the goal ${g} is not f(-x)`);
    }
  }
  return graphOf('fn_parity', ['domain', 'rewrite', 'conclude'], [
    exprNode('parity_line', 'rewrite', 'result', spec, 'f(-x)'),
  ]);
}

// ---------------------------------------------------------------------------
// fn_limit: f rewritten in a form whose limit reads (lines), the limit as a
// number line (`0/(0+1)`), its interpretation (a pick).

function buildLimit(args: Args): Graph {
  const expr = str(args, 'expr');
  const limit = fractionArg(args, 'limit');
  const goals = strs(args, 'goals');
  const limitForms = strs(args, 'limitForms');
  if (goals.length === 0 || limitForms.length === 0) {
    throw new EngineError('fn_limit needs goals and limitForms');
  }
  const spec: ExprSpec = {
    variable: 'x',
    ref: expr,
    goals,
    goalNames: [],
    knownWrong: slips(args, 'knownWrong'),
  };
  for (const g of goals) {
    if (!equalsRef(spec, g)) {
      throw new EngineError(`fn_limit: the form ${g} is not f`);
    }
  }
  const far = at(ast(expr), args.toward === '-inf' ? -40 : 40);
  if (Math.abs(far - limit[0] / limit[1]) > 1e-6) {
    throw new EngineError(`fn_limit: f does not tend to ${limit[0]}/${limit[1]}`);
  }
  checkForms(limitForms, limit, 'fn_limit');
  const roads: RawMutation[] = slips(args, 'limitSlips').map(x => ({
    id: x.id,
    nodeId: 'limit',
    expr: x.expr,
  }));
  return graphOf(
    'fn_limit',
    ['rewrite', 'limit', 'interpret'],
    [
      exprNode('limit_form', 'rewrite', 'part', spec, 'f(x)'),
      valueNode('limit', 'limit', limit, limitForms, {
        proof: true,
        label: '\\lim f',
      }),
    ],
    roads,
  );
}

// ---------------------------------------------------------------------------
// fn_derivative: the rule (a pick), the derivative of the denominator
// (lines), f′ written down to the « Montrer que » form (lines).

function derivativeAt(n: Node, x: number): number {
  const h = 1e-5;
  return (at(n, x + h) - at(n, x - h)) / (2 * h);
}

function buildDerivative(args: Args): Graph {
  const expr = str(args, 'expr');
  const target = str(args, 'target');
  const inner = str(args, 'inner');
  const innerOf = str(args, 'innerOf');
  const f = ast(expr);
  const t = ast(target);
  for (const x of [-2, -0.7, 0, 0.4, 1.3]) {
    const d = derivativeAt(f, x);
    if (Math.abs(d - at(t, x)) > 1e-5 * Math.max(1, Math.abs(d))) {
      throw new EngineError(`fn_derivative: the target is not f' at ${x}`);
    }
    const di = derivativeAt(ast(innerOf), x);
    if (Math.abs(di - at(ast(inner), x)) > 1e-5 * Math.max(1, Math.abs(di))) {
      throw new EngineError(`fn_derivative: ${inner} is not (${innerOf})'`);
    }
  }
  const innerSpec: ExprSpec = {
    variable: 'x',
    ref: inner,
    goals: [inner, ...strs(args, 'innerGoals')],
    knownWrong: slips(args, 'innerWrong'),
  };
  const spec: ExprSpec = {
    variable: 'x',
    ref: target,
    goals: unique([target, ...strs(args, 'goals')]),
    goalNames: ["f'(x)"],
    knownWrong: slips(args, 'knownWrong'),
  };
  return graphOf('fn_derivative', ['rule', 'inner', 'derive'], [
    exprNode('inner_d', 'inner', 'part', innerSpec, "v'(x)"),
    exprNode('deriv', 'derive', 'result', spec, "f'(x)"),
  ]);
}

// ---------------------------------------------------------------------------
// fn_variation / fn_sketch: the value at the top point is the one line; the
// sign of f′, the ends, the table, the symmetry and the asymptote are picks.

function topNode(args: Args, card: string): { node: GraphNode; roads: RawMutation[] } {
  const expr = str(args, 'expr');
  const x0 = typeof args.at === 'number' ? args.at : 0;
  const top = fractionArg(args, 'top');
  const topForms = strs(args, 'topForms');
  if (Math.abs(at(ast(expr), x0) - top[0] / top[1]) > 1e-9) {
    throw new EngineError(`the top value is not f(${x0})`);
  }
  checkForms(topForms, top, 'top');
  return {
    node: valueNode('top', card, top, unique([...topForms]), {
      bareOk: true,
      label: `f(${x0})`,
    }),
    roads: slips(args, 'topSlips').map(x => ({
      id: x.id,
      nodeId: 'top',
      expr: x.expr,
    })),
  };
}

function buildVariation(args: Args): Graph {
  const { node, roads } = topNode(args, 'top');
  return graphOf(
    'fn_variation',
    ['sign', 'top', 'ends', 'table'],
    [node],
    roads,
  );
}

function buildSketch(args: Args): Graph {
  const { node, roads } = topNode(args, 'top');
  return graphOf(
    'fn_sketch',
    ['symmetry', 'asymptote', 'top'],
    [node],
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

export const FUNCTION_TEMPLATE_IDS = [
  'fn_parity',
  'fn_limit',
  'fn_derivative',
  'fn_variation',
  'fn_sketch',
] as const;

registerTemplate(
  template('fn_parity', ['domain', 'rewrite', 'conclude'], buildParity),
);
registerTemplate(
  template('fn_limit', ['rewrite', 'limit', 'interpret'], buildLimit),
);
registerTemplate(
  template('fn_derivative', ['rule', 'inner', 'derive'], buildDerivative),
);
registerTemplate(
  template('fn_variation', ['sign', 'top', 'ends', 'table'], buildVariation),
);
registerTemplate(
  template('fn_sketch', ['symmetry', 'asymptote', 'top'], buildSketch),
);
