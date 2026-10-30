/**
 * The EXPECTED SOLUTION GRAPH of an urn question (docs/METHOD_LESSON_PLAN.md
 * 2.2 and 8.4): the nodes a correct solution passes through, each with its
 * engine value, the derivations that are accepted, what it counts (unit) and
 * the plan card it belongs to. Nothing is typed in content: the graph is
 * computed from the urn and checked a second way by enumerating the draws
 * (the rule of `urnVariants.ts`).
 *
 * It is generic over the number of reds drawn `j` (0 and k included) and over
 * the number of colours that matter, so "exactly one red" and "no red" are
 * the same template with different arguments (addendum C1, rows Q2-1).
 * Event shapes beyond "exactly j" (for example "at least one") are added as
 * further builders behind the same node vocabulary.
 */
import { runEngineCall, type Experiment } from '../engine/calls';
import { MAX_ENUMERATION, factorial } from '../engine/combinatorics';
import {
  EngineError,
  choose,
  frac,
  mul,
  type Fraction,
} from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';

export type Order = 'unordered' | 'ordered';
/** A plan-card key of a template (the urn templates have total, fav, ratio). */
export type PlanCardKey = string;
/** Internal vocabulary only: these words are never shown to the student (D41). */
export type NodeRole = 'total' | 'part' | 'combine' | 'result' | 'support';
export type Unit = 'ordered' | 'groups' | 'count' | 'ratio';

export type Shape =
  | { kind: 'falling'; n: number; k: number }
  | { kind: 'factorial'; k: number }
  | { kind: 'choose'; n: number; k: number }
  | { kind: 'product'; of: string[] }
  | { kind: 'ratio'; num: string; den: string }
  /** `of[0]` minus `of[1]` (the complement counts: at least one = all draws minus none). */
  | { kind: 'difference'; of: [string, string] };

export interface GraphNode {
  id: string;
  planCard: PlanCardKey;
  role: NodeRole;
  unit: Unit;
  value: Fraction;
  /** Accepted derivations, safe-parser syntax; each evaluates exactly to `value`. */
  forms: string[];
  /** May the bare value be typed (the one-ball choice "4"). */
  bareOk: boolean;
  inputs: string[];
  shape: Shape;
  /** False for a supporting step (the ordered count, k!): accepted, but it does not complete its card. */
  main: boolean;
}

export interface UrnSpec {
  reds: number;
  blacks: number;
  k: number;
  /** Reds among the k balls drawn. */
  j: number;
}

/** A slip as an expression, before its value is computed by the engine (mutations.ts). */
export interface RawMutation {
  id: string;
  nodeId: string;
  expr: string;
  unit?: Unit;
}

export interface Graph {
  spec: UrnSpec;
  order: Order;
  nodes: GraphNode[];
  /** The template that made it (src/method/templates.ts). */
  template?: string;
  /** The plan-card keys of the template, in the order of the route. */
  cards?: readonly string[];
  /** A template's own slips; absent: the urn slips of mutations.ts. */
  mutate?: (node: GraphNode) => RawMutation[];
  /** Slips added to the default ones (a question that knows an earlier question's numbers). */
  extraMutate?: (node: GraphNode) => RawMutation[];
  /** Named values a card's claim can use (single letters, like `t` total, `a` another event's count). */
  vars?: Readonly<Record<string, Fraction>>;
}

export const nodeOf = (g: Graph, id: string): GraphNode => {
  const n = g.nodes.find(x => x.id === id);
  if (!n) {
    throw new EngineError(`no node ${id}`);
  }
  return n;
};

const falling = (n: number, m: number): number => {
  let p = 1;
  for (let i = 0; i < m; i++) {
    p *= n - i;
  }
  return p;
};
const fallingStr = (n: number, m: number): string =>
  Array.from({ length: m }, (_, i) => String(n - i)).join('*');
const factStr = (m: number): string =>
  Array.from({ length: m }, (_, i) => String(m - i)).join('*');
const unique = (xs: string[]): string[] => [...new Set(xs)];
const plain = (e: string): boolean => /^\d+$/.test(e);
const wrap = (e: string): string => (plain(e) ? e : `(${e})`);

/** C(n, k) written as a quotient, as a student on paper does it. */
export function chooseForms(n: number, k: number): string[] {
  if (k === 1) {
    return [String(n)];
  }
  const a = fallingStr(n, k);
  const b = factStr(k);
  const shortB = b.replace(/\*1$/, '');
  const va = String(falling(n, k));
  const vb = String(factorial(k));
  return unique([
    `${a}/(${b})`,
    `${a}/(${shortB})`,
    `${va}/(${b})`,
    `${va}/${vb}`,
    `${a}/${vb}`,
  ]);
}

/** `60/120` and its lowest terms `1/2` (both are accepted values; the unreduced one is flagged by the simplify check). */
function ratioForms(num: Fraction, den: Fraction): string[] {
  const raw = `${num[0]}/${den[0]}`;
  const r = frac(num[0], den[0]);
  const reduced = r[1] === 1 ? String(r[0]) : `${r[0]}/${r[1]}`;
  return unique([raw, reduced]);
}

function validate(spec: UrnSpec): void {
  const { reds, blacks, k, j } = spec;
  const ints = [reds, blacks, k, j].every(x => Number.isInteger(x) && x >= 0);
  if (!ints || k < 1) {
    throw new EngineError('an urn question needs whole numbers and k >= 1');
  }
  if (reds + blacks < k) {
    throw new EngineError('cannot draw more balls than the urn holds');
  }
  if (j > reds || k - j > blacks || j > k) {
    throw new EngineError('that many reds (or blacks) are not in the urn');
  }
}

export function buildUrnGraph(
  spec: UrnSpec,
  order: Order = 'unordered',
): Graph {
  validate(spec);
  const { reds, blacks, k, j } = spec;
  const n = reds + blacks;
  const nodes: GraphNode[] = [];
  const kb = k - j;
  const unit: Unit = order === 'ordered' ? 'ordered' : 'groups';

  // ---- the card "count all the draws"
  if (order === 'unordered') {
    if (k >= 2) {
      nodes.push({
        id: 'ord',
        planCard: 'total',
        role: 'support',
        unit: 'ordered',
        value: frac(falling(n, k)),
        forms: [fallingStr(n, k)],
        bareOk: false,
        inputs: [],
        shape: { kind: 'falling', n, k },
        main: false,
      });
      nodes.push({
        id: 'orderings',
        planCard: 'total',
        role: 'support',
        unit: 'count',
        value: frac(factorial(k)),
        forms: unique([factStr(k), factStr(k).replace(/\*1$/, '')]),
        bareOk: false,
        inputs: [],
        shape: { kind: 'factorial', k },
        main: false,
      });
    }
    nodes.push({
      id: 'total',
      planCard: 'total',
      role: 'total',
      unit: 'groups',
      value: frac(choose(n, k)),
      forms: chooseForms(n, k),
      bareOk: false,
      inputs: k >= 2 ? ['ord', 'orderings'] : [],
      shape: { kind: 'choose', n, k },
      main: true,
    });
  } else {
    nodes.push({
      id: 'total',
      planCard: 'total',
      role: 'total',
      unit: 'ordered',
      value: frac(falling(n, k)),
      forms: [fallingStr(n, k)],
      bareOk: false,
      inputs: [],
      shape: { kind: 'falling', n, k },
      main: true,
    });
  }

  // ---- the card "count the wanted draws"
  const partNode = (
    id: string,
    count: number,
    drawn: number,
    ordered: boolean,
    single: boolean,
  ): GraphNode => {
    const forms = ordered
      ? [fallingStr(count, drawn)]
      : chooseForms(count, drawn);
    return {
      id,
      planCard: 'fav',
      role: 'part',
      unit,
      value: frac(ordered ? falling(count, drawn) : choose(count, drawn)),
      forms,
      bareOk: drawn === 1,
      inputs: [],
      shape: ordered
        ? { kind: 'falling', n: count, k: drawn }
        : { kind: 'choose', n: count, k: drawn },
      main: single,
    };
  };
  const ordered = order === 'ordered';
  const both = j >= 1 && kb >= 1;
  let fav: Fraction;
  if (both) {
    const red = partNode('fav_red', reds, j, ordered, false);
    const black = partNode('fav_black', blacks, kb, ordered, false);
    const redE = red.forms[0]!;
    const blackE = black.forms[0]!;
    if (ordered) {
      const pos = frac(choose(k, j));
      nodes.push({
        id: 'positions',
        planCard: 'fav',
        role: 'support',
        unit: 'count',
        value: pos,
        forms: chooseForms(k, j),
        bareOk: chooseForms(k, j).every(plain),
        inputs: [],
        shape: { kind: 'choose', n: k, k: j },
        main: false,
      });
      nodes.push(red, black);
      fav = mul(mul(pos, red.value), black.value);
      const posE = chooseForms(k, j)[0]!;
      nodes.push({
        id: 'fav',
        planCard: 'fav',
        role: 'combine',
        unit,
        value: fav,
        forms: unique([
          `${wrap(posE)}*${red.value[0]}*${black.value[0]}`,
          `${wrap(posE)}*${redE}*${blackE}`,
          `${pos[0]}*${redE}*${blackE}`,
          `${pos[0]}*${red.value[0]}*${black.value[0]}`,
        ]),
        bareOk: false,
        inputs: ['positions', 'fav_red', 'fav_black'],
        shape: { kind: 'product', of: ['positions', 'fav_red', 'fav_black'] },
        main: true,
      });
    } else {
      nodes.push(red, black);
      fav = mul(red.value, black.value);
      nodes.push({
        id: 'fav',
        planCard: 'fav',
        role: 'combine',
        unit,
        value: fav,
        forms: unique([
          `${red.value[0]}*${black.value[0]}`,
          `${wrap(redE)}*${wrap(blackE)}`,
          `${red.value[0]}*${wrap(blackE)}`,
          `${wrap(redE)}*${black.value[0]}`,
          ...(plain(redE) ? [`${redE}*${blackE}`] : []),
        ]),
        bareOk: false,
        inputs: ['fav_red', 'fav_black'],
        shape: { kind: 'product', of: ['fav_red', 'fav_black'] },
        main: true,
      });
    }
  } else {
    // one choice only (no red, or only reds): that choice IS the favourable count
    const count = kb >= 1 ? blacks : reds;
    const drawn = kb >= 1 ? kb : j;
    const single = partNode('fav', count, drawn, ordered, true);
    nodes.push(single);
    fav = single.value;
  }

  // ---- the card "divide"
  const total = nodeOf({ spec, order, nodes }, 'total').value;
  const result = frac(fav[0] * total[1], fav[1] * total[0]);
  nodes.push({
    id: 'result',
    planCard: 'ratio',
    role: 'result',
    unit: 'ratio',
    value: result,
    forms: ratioForms(fav, total),
    bareOk: false,
    inputs: ['fav', 'total'],
    shape: { kind: 'ratio', num: 'fav', den: 'total' },
    main: true,
  });

  const graph: Graph = { spec, order, nodes };
  const check = verifyByEnumeration(graph);
  if (check.ok === false) {
    throw new EngineError(`graph and enumeration disagree: ${check.error}`);
  }
  return graph;
}

export type Verification =
  | { ok: true }
  | { ok: 'skipped' }
  | { ok: false; error: string };

const eventExactly = (j: number) => ({
  id: 'value_eq',
  args: { valueFn: { id: 'count_value', args: { value: 1 } }, value: j },
});

/** Enumerates the draws with the engine and compares total, favourable count and probability. */
export function verifyByEnumeration(g: Graph): Verification {
  const { reds, blacks, k, j } = g.spec;
  const n = reds + blacks;
  const size = g.order === 'ordered' ? falling(n, k) : choose(n, k);
  if (size > MAX_ENUMERATION) {
    return { ok: 'skipped' };
  }
  const experiment: Experiment = {
    urn: [
      ...Array.from({ length: reds }, (_, i) => ({
        id: `r${i + 1}`,
        value: 1,
      })),
      ...Array.from({ length: blacks }, (_, i) => ({
        id: `n${i + 1}`,
        value: 0,
      })),
    ],
    draw: g.order === 'ordered' ? 'ordered' : 'simultaneous',
    k,
  };
  const ctx = { experiment };
  const event = eventExactly(j);
  const asked: [string, { fn: string; args: unknown }, Fraction][] = [
    ['total', { fn: 'outcomeCount', args: {} }, nodeOf(g, 'total').value],
    ['fav', { fn: 'count', args: { event } }, nodeOf(g, 'fav').value],
    [
      'result',
      { fn: 'probability', args: { event } },
      nodeOf(g, 'result').value,
    ],
  ];
  for (const [id, call, expected] of asked) {
    const r = runEngineCall(call, ctx);
    if (!r.ok) {
      return { ok: false, error: `${id}: ${r.error}` };
    }
    if (!sameRat(r.value, expected)) {
      return {
        ok: false,
        error: `${id}: formula ${expected[0]}/${expected[1]}, enumeration ${r.value[0]}/${r.value[1]}`,
      };
    }
  }
  return { ok: true };
}
