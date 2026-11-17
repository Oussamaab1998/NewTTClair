/**
 * Probability-tree templates (docs/exercises/BAC2022P_SC_EX2.md): a tree of
 * two events, A or not A, then F or not F. One template per question shape,
 * all over ONE vocabulary of quantities (src/engine/tree.ts): a node's id is
 * the quantity it computes and the key of its plan card, the same in every
 * question, so a result found in one question is reused in the next.
 *
 * The statement's numbers are arguments (`pA`, `pFgA`, and `pF` or
 * `pFgNotA`, each `[num, den]`); the engine computes every other value, so a
 * question can be played alone. A small example is the same template on a
 * population counted whole (`counts`): its lines may be written as counts
 * over counts, and nothing asks for the calculation or a reduced fraction.
 *
 * Domain code, like the urn and binomial templates. What is new here:
 * - `proof`: the value alone is not credited, he writes the calculation
 *   (several values of a tree are equal by chance, and « Montrer que » prints
 *   its result);
 * - `traps`: the wrong roads below reach, on some numbers, the RIGHT value.
 *   Each road is listed once; where its value differs it is a slip, where it
 *   coincides it is a trap. Any other single operation on the numbers he can
 *   see that lands on the right value is caught too (`coincidence`).
 */
import { parseExpression, type Node } from '../engine/expression';
import {
  EngineError,
  add,
  div,
  frac,
  mul,
  sub,
  type Fraction,
} from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import {
  solveTwoEventTree,
  treeFromCounts,
  type TreeQuantity,
  type TwoEventTree,
} from '../engine/tree';
import { factorBag, sameBag, type FactorBag } from './factorForm';
import type { Graph, GraphNode, RawMutation } from './graph';
import { sumTerms } from './mutations';
import { registerTemplate, type Args, type Template } from './templates';

const SPEC = { reds: 0, blacks: 0, k: 0, j: 0 };
const ONE: Fraction = [1, 1];

/** The slip of a right value reached by an operation no road of the tree explains. */
export const COINCIDENCE = 'coincidence';

/** A value as written alone. */
const s = (v: Fraction): string =>
  v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`;
/** A value as an operand: a fraction keeps its brackets. */
const o = (v: Fraction): string =>
  v[1] === 1 ? String(v[0]) : `(${v[0]}/${v[1]})`;
const unique = (xs: string[]): string[] => [...new Set(xs)];

export interface TreeCounts {
  n: number;
  a: number;
  af: number;
  naf: number;
}

interface TreeData {
  t: TwoEventTree;
  counts: TreeCounts | null;
  /** The statement's branches are on the other side (labels only: A and not A exchanged). */
  swap: boolean;
}

function fractionArg(args: Args, key: string): Fraction | null {
  const a = args[key];
  return Array.isArray(a) &&
    a.length === 2 &&
    a.every(x => typeof x === 'number' && Number.isInteger(x)) &&
    a[1] !== 0
    ? frac(a[0] as number, a[1] as number)
    : null;
}

function countsArg(args: Args): TreeCounts | null {
  const c = args.counts;
  if (c === undefined || c === null || typeof c !== 'object') {
    return null;
  }
  const r = c as Record<string, unknown>;
  const int = (k: string): number => {
    const v = r[k];
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      throw new EngineError(`tree counts need a whole number ${k}`);
    }
    return v;
  };
  return { n: int('n'), a: int('a'), af: int('af'), naf: int('naf') };
}

function dataOf(args: Args): TreeData {
  const swap = args.swap === true;
  const counts = countsArg(args);
  if (counts) {
    return { t: treeFromCounts(counts), counts, swap };
  }
  const pA = fractionArg(args, 'pA');
  const pFgA = fractionArg(args, 'pFgA');
  const pF = fractionArg(args, 'pF');
  const pFgNotA = fractionArg(args, 'pFgNotA');
  if (!pA || !pFgA || (pF === null) === (pFgNotA === null)) {
    throw new EngineError(
      'a tree template needs pA, pFgA and one of pF, pFgNotA (each [num, den]), or counts',
    );
  }
  return {
    t: pF
      ? solveTwoEventTree({ pA, pFgA, pF })
      : solveTwoEventTree({ pA, pFgA, pFgNotA: pFgNotA! }),
    counts: null,
    swap,
  };
}

/** How the exam writes each quantity (LaTeX; the bar is the complement). */
export function treeLabel(id: TreeQuantity, swap = false): string {
  const A = swap ? '\\overline{A}' : 'A';
  const NA = swap ? 'A' : '\\overline{A}';
  const NF = '\\overline{F}';
  const labels: Record<TreeQuantity, string> = {
    a: `p(${A})`,
    not_a: `p(${NA})`,
    f_given_a: `p(F/${A})`,
    nf_given_a: `p(${NF}/${A})`,
    f_given_na: `p(F/${NA})`,
    nf_given_na: `p(${NF}/${NA})`,
    a_and_f: `p(${A} \\cap F)`,
    a_and_nf: `p(${A} \\cap ${NF})`,
    na_and_f: `p(${NA} \\cap F)`,
    na_and_nf: `p(${NA} \\cap ${NF})`,
    f: 'p(F)',
    not_f: `p(${NF})`,
    a_given_f: `p(${A}/F)`,
    na_given_f: `p(${NA}/F)`,
    a_given_nf: `p(${A}/${NF})`,
    na_given_nf: `p(${NA}/${NF})`,
  };
  return labels[id];
}

// ---------------------------------------------------------------------------
// Right roads and wrong roads, per quantity.

/** The accepted derivations of a quantity (safe-parser syntax). */
function formsOf(id: TreeQuantity, d: TreeData): string[] {
  const v = d.t;
  const c = d.counts;
  const total = c ? c.af + c.naf : 0;
  switch (id) {
    case 'a_and_f':
      return [
        `${o(v.a)}*${o(v.f_given_a)}`,
        ...(c ? [`${c.af}/${c.n}`, `(${c.a}/${c.n})*(${c.af}/${c.a})`] : []),
      ];
    case 'na_and_f':
      return [
        `${o(v.f)}-${o(v.a_and_f)}`,
        ...(c ? [`${c.naf}/${c.n}`, `(${total}-${c.af})/${c.n}`] : []),
      ];
    case 'not_a':
      return [
        `1-${o(v.a)}`,
        ...(c ? [`${c.n - c.a}/${c.n}`, `(${c.n}-${c.a})/${c.n}`] : []),
      ];
    case 'f_given_na':
      return [
        `${o(v.na_and_f)}/${o(v.not_a)}`,
        ...(c
          ? [`${c.naf}/${c.n - c.a}`, `(${c.naf}/${c.n})/(${c.n - c.a}/${c.n})`]
          : []),
      ];
    case 'nf_given_a':
      return [
        `1-${o(v.f_given_a)}`,
        ...(c ? [`${c.a - c.af}/${c.a}`, `(${c.a}-${c.af})/${c.a}`] : []),
      ];
    case 'nf_given_na':
      return [
        `1-${o(v.f_given_na)}`,
        ...(c
          ? [
              `${c.n - c.a - c.naf}/${c.n - c.a}`,
              `(${c.n - c.a}-${c.naf})/${c.n - c.a}`,
            ]
          : []),
      ];
    case 'not_f':
      return [
        `1-${o(v.f)}`,
        `${o(v.a_and_nf)}+${o(v.na_and_nf)}`,
        ...(c ? [`${c.n - total}/${c.n}`, `(${c.n}-${total})/${c.n}`] : []),
      ];
    case 'a_and_nf':
      return [
        `${o(v.a)}*${o(v.nf_given_a)}`,
        `${o(v.a)}-${o(v.a_and_f)}`,
        ...(c ? [`${c.a - c.af}/${c.n}`] : []),
      ];
    case 'na_and_nf':
      return [
        `${o(v.not_a)}*${o(v.nf_given_na)}`,
        `${o(v.not_a)}-${o(v.na_and_f)}`,
        `${o(v.not_f)}-${o(v.a_and_nf)}`,
        ...(c ? [`${c.n - c.a - c.naf}/${c.n}`] : []),
      ];
    case 'na_given_nf':
      return [
        `${o(v.na_and_nf)}/${o(v.not_f)}`,
        `(${o(v.not_a)}*${o(v.nf_given_na)})/${o(v.not_f)}`,
        `(${o(v.not_a)}*${o(v.nf_given_na)})/(1-${o(v.f)})`,
        ...(c ? [`${c.n - c.a - c.naf}/${c.n - total}`] : []),
      ];
    default:
      return [s(v[id])];
  }
}

/**
 * The known wrong roads to a quantity: `[slip id, expression]`. Two roads
 * that cannot be told apart on a line (the same value written alone) share
 * one id.
 */
function roadsOf(
  id: TreeQuantity,
  d: TreeData,
  template: string,
): [string, string][] {
  const v = d.t;
  switch (id) {
    case 'a_and_f':
      return [
        ['adds_along_path', `${o(v.a)}+${o(v.f_given_a)}`],
        ['branch_for_path', s(v.f_given_a)],
        ['first_branch_for_path', s(v.a)],
        ['total_for_path', s(v.f)],
        // Only where the other path is what must be shown: it cannot be used.
        ...(template === 'tree_other_path'
          ? ([['uses_the_target', `${o(v.f)}-${o(v.na_and_f)}`]] as [
              string,
              string,
            ][])
          : []),
      ];
    case 'na_and_f':
      return [
        ['subtracts_branch_not_path', `${o(v.f)}-${o(v.f_given_a)}`],
        ['adds_instead_of_subtracts', `${o(v.f)}+${o(v.a_and_f)}`],
        ['first_minus_total', `${o(v.a)}-${o(v.f)}`],
        ['complement_of_total', `1-${o(v.f)}`],
        ['complement_of_path', `1-${o(v.a_and_f)}`],
        ['lower_branch_like_upper', `${o(v.not_a)}*${o(v.f_given_a)}`],
      ];
    case 'not_a':
      return [
        ['complement_forgotten', s(v.a)],
        ['inverts_instead_of_complement', `1/${o(v.a)}`],
        ['complement_of_other_branch', `1-${o(v.f_given_a)}`],
        ['complement_of_total', `1-${o(v.f)}`],
      ];
    case 'f_given_na':
      return [
        ['complement_across_nodes', `1-${o(v.f_given_a)}`],
        ['divides_by_total', `${o(v.na_and_f)}/${o(v.f)}`],
        ['divides_by_first_branch', `${o(v.na_and_f)}/${o(v.a)}`],
        ['quotient_upside_down', `${o(v.not_a)}/${o(v.na_and_f)}`],
        ['multiplies_instead_of_divides', `${o(v.na_and_f)}*${o(v.not_a)}`],
        ['intersection_for_conditional', s(v.na_and_f)],
      ];
    case 'nf_given_a':
      return [
        ['copies_another_branch', s(v.f_given_a)],
        ['complement_of_first_branch', `1-${o(v.a)}`],
        ['complement_of_total', `1-${o(v.f)}`],
        ['quotient_for_complement', `${o(v.na_and_f)}/${o(v.not_a)}`],
      ];
    case 'nf_given_na':
      return [
        ['copies_another_branch', s(v.nf_given_a)],
        ['copies_another_branch', s(v.f_given_na)],
        ['complement_across_nodes', `1-${o(v.f_given_a)}`],
        ['complement_of_first_branch', `1-${o(v.not_a)}`],
      ];
    case 'not_f':
      return [
        ['complement_forgotten', s(v.f)],
        ['complement_of_other_branch', `1-${o(v.f_given_a)}`],
        ['complement_of_first_branch', `1-${o(v.a)}`],
        ['adds_branches_for_total', `${o(v.nf_given_a)}+${o(v.nf_given_na)}`],
      ];
    case 'na_and_nf':
      return [
        ['adds_along_path', `${o(v.not_a)}+${o(v.nf_given_na)}`],
        ['branch_for_path', s(v.nf_given_na)],
        ['first_branch_for_path', s(v.not_a)],
        ['wrong_second_branch', `${o(v.not_a)}*${o(v.f_given_na)}`],
      ];
    case 'na_given_nf':
      return [
        ['reverses_condition', `${o(v.na_and_nf)}/${o(v.not_a)}`],
        ['condition_for_reverse', s(v.nf_given_na)],
        ['divides_by_other_total', `${o(v.na_and_nf)}/${o(v.f)}`],
        ['quotient_upside_down', `${o(v.not_f)}/${o(v.na_and_nf)}`],
        ['multiplies_instead_of_divides', `${o(v.na_and_nf)}*${o(v.not_f)}`],
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Coincidences: any single operation on what he can see that lands on the
// right value without being a road above.

interface Signature {
  bag: FactorBag;
  terms: string[] | null;
}

function parse(expr: string): Node | null {
  const p = parseExpression(expr, { variables: [], constants: [] });
  return p.ok ? p.ast : null;
}

function signature(expr: string): Signature | null {
  const ast = parse(expr);
  return ast ? { bag: factorBag(ast), terms: sumTerms(ast) } : null;
}

const sameSignature = (x: Signature, y: Signature): boolean =>
  sameBag(x.bag, y.bag) ||
  (x.terms !== null &&
    y.terms !== null &&
    x.terms.length === y.terms.length &&
    x.terms.every((t, i) => t === y.terms![i]));

function coincidences(
  node: GraphNode,
  visible: readonly Fraction[],
  named: readonly RawMutation[],
): RawMutation[] {
  const taken = [...node.forms, ...named.map(r => r.expr)].flatMap(e => {
    const sg = signature(e);
    return sg ? [sg] : [];
  });
  const out: RawMutation[] = [];
  const attempt = (expr: string, value: Fraction): void => {
    if (!sameRat(value, node.value)) {
      return;
    }
    const sg = signature(expr);
    if (!sg || taken.some(t => sameSignature(t, sg))) {
      return;
    }
    taken.push(sg);
    out.push({ id: COINCIDENCE, nodeId: node.id, expr });
  };
  const values = visible.filter(
    (x, i) => x[0] !== 0 && visible.findIndex(y => sameRat(x, y)) === i,
  );
  values.forEach((x, i) => {
    attempt(`1-${o(x)}`, sub(ONE, x));
    attempt(`${o(x)}*${o(x)}`, mul(x, x));
    for (const y of values.slice(i + 1)) {
      attempt(`${o(x)}+${o(y)}`, add(x, y));
      attempt(`${o(x)}-${o(y)}`, sub(x, y));
      attempt(`${o(y)}-${o(x)}`, sub(y, x));
      attempt(`${o(x)}*${o(y)}`, mul(x, y));
      attempt(`${o(x)}/${o(y)}`, div(x, y));
      attempt(`${o(y)}/${o(x)}`, div(y, x));
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// The templates.

interface NodeDef {
  id: TreeQuantity;
  card: string;
  role?: GraphNode['role'];
  inputs?: string[];
  /** The question's answer: written in lowest terms. */
  reduced?: boolean;
}

interface TreeShape {
  id: string;
  /** Plan-card keys in route order (a key with no node is a card answered by a pick). */
  cards: readonly string[];
  /** What he can see before the question starts, besides the statement's three numbers. */
  known: readonly TreeQuantity[];
  nodes: readonly NodeDef[];
}

const GIVEN: readonly TreeQuantity[] = ['a', 'f_given_a', 'f'];

const SHAPES: readonly TreeShape[] = [
  // The path the statement does not give, from the total and the other path.
  {
    id: 'tree_other_path',
    cards: ['a_and_f', 'split', 'na_and_f'],
    known: [],
    nodes: [
      { id: 'a_and_f', card: 'a_and_f' },
      {
        id: 'na_and_f',
        card: 'na_and_f',
        role: 'result',
        inputs: ['a_and_f'],
        reduced: true,
      },
    ],
  },
  // A branch of the second level, from a path and the branch before it.
  {
    id: 'tree_conditional',
    cards: ['not_a', 'rule', 'f_given_na'],
    known: ['a_and_f', 'na_and_f'],
    nodes: [
      { id: 'not_a', card: 'not_a' },
      {
        id: 'f_given_na',
        card: 'f_given_na',
        role: 'result',
        inputs: ['not_a'],
        reduced: true,
      },
    ],
  },
  // The whole tree: every branch the statement leaves empty.
  {
    id: 'tree_complete',
    cards: ['not_a', 'f_given_na', 'nf_given_a', 'nf_given_na'],
    known: ['a_and_f', 'na_and_f'],
    nodes: [
      { id: 'not_a', card: 'not_a' },
      {
        id: 'f_given_na',
        card: 'f_given_na',
        inputs: ['not_a'],
        reduced: true,
      },
      { id: 'nf_given_a', card: 'nf_given_a' },
      {
        id: 'nf_given_na',
        card: 'nf_given_na',
        role: 'result',
        inputs: ['f_given_na'],
      },
    ],
  },
  // The first level knowing the second (the tree read backwards).
  {
    id: 'tree_reverse',
    cards: ['not_f', 'na_and_nf', 'na_given_nf'],
    known: [
      'a_and_f',
      'na_and_f',
      'not_a',
      'f_given_na',
      'nf_given_a',
      'nf_given_na',
    ],
    nodes: [
      { id: 'not_f', card: 'not_f' },
      // Branches of the completed tree and the other path: accepted and
      // named when he writes them again, never the card's answer.
      { id: 'not_a', card: 'na_and_nf', role: 'support' },
      { id: 'nf_given_na', card: 'na_and_nf', role: 'support' },
      { id: 'a_and_nf', card: 'na_and_nf', role: 'support' },
      { id: 'na_and_nf', card: 'na_and_nf', inputs: ['not_a', 'nf_given_na'] },
      {
        id: 'na_given_nf',
        card: 'na_given_nf',
        role: 'result',
        inputs: ['na_and_nf', 'not_f'],
        reduced: true,
      },
    ],
  },
];

function build(shape: TreeShape, args: Args): Graph {
  const d = dataOf(args);
  const whole = d.counts !== null;
  const nodes: GraphNode[] = shape.nodes.map(n => {
    const support = n.role === 'support';
    return {
      id: n.id,
      planCard: n.card,
      role: n.role ?? 'part',
      unit: 'ratio',
      value: d.t[n.id],
      forms: unique(formsOf(n.id, d)),
      // Counted whole, a count over a count is the whole reasoning.
      bareOk: whole || support,
      inputs: n.inputs ?? [],
      shape: { kind: 'product', of: [] },
      main: !support,
      ...(!whole && !support && { proof: true }),
      ...(!whole && n.reduced === true && { reduced: true }),
      label: treeLabel(n.id, d.swap),
    };
  });
  const roads = (nd: GraphNode): RawMutation[] =>
    nd.role === 'support'
      ? []
      : roadsOf(nd.id as TreeQuantity, d, shape.id).map(([id, expr]) => ({
          id,
          nodeId: nd.id,
          expr,
        }));
  const before = (nd: GraphNode): Fraction[] => {
    const at = shape.cards.indexOf(nd.planCard);
    return [
      ...[...GIVEN, ...shape.known].map(q => d.t[q]),
      ...nodes
        .filter(
          x =>
            x.id !== nd.id &&
            (shape.cards.indexOf(x.planCard) < at ||
              (x.planCard === nd.planCard && x.role === 'support')),
        )
        .map(x => x.value),
    ];
  };
  return {
    spec: SPEC,
    order: 'unordered',
    nodes,
    template: shape.id,
    cards: shape.cards,
    domain: 'tree',
    givens: GIVEN.map(q => d.t[q]),
    mutate: roads,
    ...(!whole && {
      traps: (nd: GraphNode): RawMutation[] => {
        const named = roads(nd);
        return nd.role === 'support'
          ? []
          : [...named, ...coincidences(nd, before(nd), named)];
      },
    }),
  };
}

/** Built once per arguments: the graph is read on every act, and never changed. */
const CACHE = new Map<string, Graph>();

const template = (shape: TreeShape): Template => ({
  id: shape.id,
  cardKeys: shape.cards,
  build(args) {
    const key = `${shape.id}|${JSON.stringify(args)}`;
    let g = CACHE.get(key);
    if (!g) {
      g = build(shape, args);
      CACHE.set(key, g);
    }
    return g;
  },
});

export const TREE_TEMPLATE_IDS: readonly string[] = SHAPES.map(x => x.id);

SHAPES.forEach(shape => registerTemplate(template(shape)));
