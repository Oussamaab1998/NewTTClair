/**
 * Mutation-based diagnosis of a written line (docs/METHOD_LESSON_PLAN.md
 * section 4 and the addendum A1: NO role term, the node is inferred).
 *
 * From the expected expression of each node the engine writes the lines a
 * student with a known slip would write, each with an id and its exact
 * value. A typed line is matched by VALUE first (exact rationals), then by
 * STRUCTURE (the factor bag, then the multiset of numbers), and the result
 * says how sure the match is: `confirmed` (same factors over the same
 * divisor) or `asked` (same value only: the feedback is a question).
 * A mutation whose value equals the node's right value is dropped, so a
 * right line is never labelled wrong (k = k! and "x1" make several of them
 * coincide for a pair).
 *
 * Nothing here prints a number: the caller turns a Match into words, and
 * the leak rules of plan 4.4 apply there.
 */
import { evaluateExact, parseExpression } from '../engine/expression';
import type { Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import { factorBag, leaves, sameBag, type FactorBag } from './factorForm';
import {
  nodeOf,
  type Graph,
  type GraphNode,
  type PlanCardKey,
  type RawMutation,
  type Unit,
} from './graph';
import type { ChainResult } from './lineChain';

export const MUTATION_IDS = [
  'drop_division',
  'divide_by_k_not_k_factorial',
  'one_factor_divided',
  'ordered_instead_of_groups',
  'add_instead_of_multiply',
  'swap_numerator_denominator',
  'bracket_left_to_right',
  'over_generalised_order_rule',
  'unsimplified',
  'missing_part',
  'start_number_off',
  'n_times_k',
] as const;
/** The twelve slips of the urn lessons; a template may add its own ids (src/method/library.ts has their texts). */
export type BaseMutationId = (typeof MUTATION_IDS)[number];
export type MutationId = string;

export interface Candidate {
  id: MutationId;
  nodeId: string;
  /** The ways the slip is written (safe-parser syntax); the value is computed from them. */
  exprs: string[];
  value: Fraction;
  bags: FactorBag[];
  numbers: string[][];
  /** What the slip counts, when it is clear. */
  unit?: Unit;
}

export interface Dropped {
  id: MutationId;
  nodeId: string;
  expr: string;
  value: Fraction;
  why: 'equals_right_value' | 'not_a_number';
}

export interface MutationTable {
  kept: Candidate[];
  dropped: Dropped[];
  /** Two different slips with the same value at one node. */
  ambiguous: { nodeId: string; value: Fraction; ids: MutationId[] }[];
}

export const URN_CARDS: readonly PlanCardKey[] = ['total', 'fav', 'ratio'];

const fallingStr = (n: number, m: number): string =>
  Array.from({ length: m }, (_, i) => String(n - i)).join('*');
const factStr = (m: number): string =>
  Array.from({ length: m }, (_, i) => String(m - i)).join('*');
const signed = (n: number, d: number): string =>
  d >= 0 ? `(${n}+${d})` : `(${n}-${-d})`;

type Raw = RawMutation;

function parseAst(expr: string) {
  const p = parseExpression(expr, { variables: [], constants: [] });
  return p.ok ? p.ast : null;
}

/** The slips of one node, as expressions (their values are computed by the engine below). */
export function rawFor(g: Graph, node: GraphNode): Raw[] {
  const out: Raw[] = [];
  const add = (id: MutationId, expr: string, unit?: Unit) =>
    out.push({ id, nodeId: node.id, expr, ...(unit && { unit }) });
  const s = node.shape;
  if (g.order !== 'unordered' || node.role === 'support') {
    return out;
  }
  if (s.kind === 'choose') {
    const { n, k } = s;
    if (k >= 2) {
      const falling = (m: number): number => {
        let p = 1;
        for (let t = 0; t < k; t++) {
          p *= m - t;
        }
        return p;
      };
      // the product as a student writes it (10*9*8) or already computed (720)
      const products = (m: number): string[] => [
        fallingStr(m, k),
        String(falling(m)),
      ];
      const b = factStr(k);
      for (const a of products(n)) {
        add('drop_division', a, 'ordered');
        add('divide_by_k_not_k_factorial', `${a}/${k}`);
        for (let f = 2; f < k; f++) {
          add('one_factor_divided', `${a}/${f}`);
        }
        add('bracket_left_to_right', `${a}/${b}`);
      }
      for (const d of [k, 1, -1]) {
        if (n + d < k) {
          continue;
        }
        for (const a of products(n + d)) {
          add('start_number_off', `${a}/(${b})`);
        }
        add(
          'start_number_off',
          `${signed(n, d)}*${fallingStr(n - 1, k - 1)}/(${b})`,
        );
      }
      add('n_times_k', `${n}*${k}`);
    } else if (k === 1) {
      add('over_generalised_order_rule', '1');
      add('n_times_k', `${n}*1`);
    }
    return out;
  }
  if (s.kind === 'product') {
    const parts = s.of.map(id => nodeOf(g, id));
    const values = parts.map(p => String(p.value[0]));
    add('add_instead_of_multiply', values.join('+'));
    parts.forEach((_, i) => add('missing_part', values[i]!));
    parts.forEach((p, i) => {
      const ps = p.shape;
      if (ps.kind === 'choose' && ps.k >= 2) {
        let orderedValue = 1;
        for (let t = 0; t < ps.k; t++) {
          orderedValue *= ps.n - t;
        }
        const others = values.filter((_, t) => t !== i);
        add(
          'ordered_instead_of_groups',
          [...others, fallingStr(ps.n, ps.k)].join('*'),
          'ordered',
        );
        add(
          'ordered_instead_of_groups',
          [...others, String(orderedValue)].join('*'),
          'ordered',
        );
      }
    });
    return out;
  }
  if (s.kind === 'ratio') {
    const num = nodeOf(g, s.num);
    const den = nodeOf(g, s.den);
    add('swap_numerator_denominator', `${den.value[0]}/${num.value[0]}`);
    const ord = g.nodes.find(x => x.id === 'ord');
    if (ord) {
      add(
        'ordered_instead_of_groups',
        `${num.value[0]}/${ord.value[0]}`,
        'ordered',
      );
    }
    return out;
  }
  return out;
}

export function mutationsFor(g: Graph): MutationTable {
  const kept: Candidate[] = [];
  const dropped: Dropped[] = [];
  for (const node of g.nodes) {
    for (const r of [
      ...(g.mutate ? g.mutate(node) : rawFor(g, node)),
      ...(g.extraMutate ? g.extraMutate(node) : []),
    ]) {
      const ast = parseAst(r.expr);
      const value = ast ? evaluateExact(ast) : null;
      if (!ast || value === null) {
        dropped.push({
          id: r.id,
          nodeId: r.nodeId,
          expr: r.expr,
          value: [0, 1],
          why: 'not_a_number',
        });
        continue;
      }
      if (sameRat(value, node.value)) {
        dropped.push({
          id: r.id,
          nodeId: r.nodeId,
          expr: r.expr,
          value,
          why: 'equals_right_value',
        });
        continue;
      }
      const same = kept.find(
        c => c.id === r.id && c.nodeId === r.nodeId && sameRat(c.value, value),
      );
      if (same) {
        if (!same.exprs.includes(r.expr)) {
          same.exprs.push(r.expr);
          same.bags.push(factorBag(ast));
          same.numbers.push(leaves(ast));
        }
        continue;
      }
      kept.push({
        id: r.id,
        nodeId: r.nodeId,
        exprs: [r.expr],
        value,
        bags: [factorBag(ast)],
        numbers: [leaves(ast)],
        ...(r.unit && { unit: r.unit }),
      });
    }
  }
  const ambiguous: MutationTable['ambiguous'] = [];
  for (const c of kept) {
    const twins = kept.filter(
      d => d.nodeId === c.nodeId && sameRat(d.value, c.value),
    );
    const ids = [...new Set(twins.map(t => t.id))];
    if (
      ids.length > 1 &&
      !ambiguous.some(a => a.nodeId === c.nodeId && sameRat(a.value, c.value))
    ) {
      ambiguous.push({ nodeId: c.nodeId, value: c.value, ids });
    }
  }
  return { kept, dropped, ambiguous };
}

// ---------------------------------------------------------------------------
// Matching

/** A wrong value known by the content (an authored wrong answer, a procedure) and matched by value only. */
export interface ExtraCandidate {
  value: Fraction;
  misconceptionId: string;
  nodeId?: string;
}

export interface MatchInput {
  graph: Graph;
  table: MutationTable;
  /** The plan card the student is working on. */
  card: PlanCardKey;
  /** Node ids already credited. */
  credited: ReadonlySet<string>;
  line: Exclude<ChainResult, { kind: 'unreadable' }>;
  extra?: readonly ExtraCandidate[];
}

export type Derivation = 'exact' | 'other' | 'absent';

export type Match =
  /** A right line. `completes` is false for a choice inside a step (the card closes on its main node). */
  | {
      kind: 'credit';
      node: GraphNode;
      derivation: Derivation;
      unsimplified: boolean;
      completes: boolean;
    }
  /** A right intermediate (the ordered count, k!): accepted and named, never the card's answer. */
  | { kind: 'support'; node: GraphNode; derivation: Derivation }
  | { kind: 'repeat'; node: GraphNode }
  | { kind: 'other_step'; node: GraphNode }
  | { kind: 'mutation'; candidate: Candidate; strength: 'confirmed' | 'asked' }
  | { kind: 'value_only'; extra: ExtraCandidate }
  | { kind: 'ambiguous'; candidates: Candidate[]; planCards: PlanCardKey[] }
  | { kind: 'generic' }
  | { kind: 'unfinished' }
  | { kind: 'mismatch'; at: number };

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);

/** The last side is written `a/b` with whole numbers a, b that still share a factor. */
function writtenUnreduced(line: MatchInput['line']): boolean {
  const last =
    line.kind === 'chain' ? line.sides[line.sides.length - 1]! : line.side;
  const a = last.ast;
  return (
    a.type === 'binary' &&
    a.op === '/' &&
    a.left.type === 'num' &&
    a.right.type === 'num' &&
    Number.isInteger(a.left.value) &&
    Number.isInteger(a.right.value) &&
    a.right.value !== 0 &&
    gcd(a.left.value, a.right.value) > 1
  );
}

export function matchLine(inp: MatchInput): Match {
  const { graph, table, card, credited, line } = inp;
  if (line.kind === 'unfinished') {
    return { kind: 'unfinished' };
  }
  if (line.kind === 'chain' && !line.equal) {
    return { kind: 'mismatch', at: line.mismatchAt ?? 0 };
  }
  const v = line.value;
  const sides = line.kind === 'chain' ? line.sides : [line.side];
  const bags = sides.map(s => factorBag(s.ast));
  const numberLists = sides.map(s => leaves(s.ast));
  const allPlain = sides.every(
    s => s.ast.type === 'num' || s.ast.type === 'unary',
  );
  const order = graph.cards ?? URN_CARDS;
  const cur = order.indexOf(card);
  const idx = (n: GraphNode) => order.indexOf(n.planCard);
  const equalNodes = graph.nodes.filter(n => sameRat(n.value, v));

  const bagMatches = (n: GraphNode): boolean =>
    n.forms.some(f => {
      const ast = parseAst(f);
      return ast !== null && bags.some(b => sameBag(b, factorBag(ast)));
    });
  const derivationOf = (n: GraphNode): Derivation =>
    bagMatches(n)
      ? 'exact'
      : allPlain
      ? n.bareOk
        ? 'exact'
        : 'absent'
      : 'other';
  const creditOf = (n: GraphNode): Match =>
    credited.has(n.id)
      ? { kind: 'repeat', node: n }
      : n.role === 'support'
      ? { kind: 'support', node: n, derivation: derivationOf(n) }
      : {
          kind: 'credit',
          node: n,
          derivation: derivationOf(n),
          unsimplified: n.shape.kind === 'ratio' && writtenUnreduced(line),
          completes: n.main,
        };
  const pick = (nodes: GraphNode[]): GraphNode => {
    const rank = (n: GraphNode) =>
      (bagMatches(n) ? 0 : 4) + (credited.has(n.id) ? 2 : 0) + (n.main ? 0 : 1);
    return [...nodes].sort((x, y) => rank(x) - rank(y))[0]!;
  };

  // (a) a node of the step he is on
  const here = equalNodes.filter(n => n.planCard === card);
  if (here.length > 0) {
    return creditOf(pick(here));
  }

  // (c) the same factors as a known slip of this step
  const score = (c: Candidate): number => {
    if (c.bags.some(cb => bags.some(b => sameBag(b, cb)))) {
      return 1;
    }
    const sameNumbers = c.numbers.some(cn =>
      numberLists.some(
        nl => nl.length === cn.length && nl.every((x, i) => x === cn[i]),
      ),
    );
    return sameNumbers ? 0.5 : 0;
  };
  const mine = table.kept.filter(
    c => nodeOf(graph, c.nodeId).planCard === card && sameRat(c.value, v),
  );
  const scored = mine.map(c => ({ c, s: score(c) }));
  const top = (min: number): Candidate[] => {
    const best = Math.max(-1, ...scored.filter(x => x.s >= min).map(x => x.s));
    return best < 0 ? [] : scored.filter(x => x.s === best).map(x => x.c);
  };
  const decide = (
    cands: Candidate[],
    strength: 'confirmed' | 'asked',
  ): Match => {
    const keys = new Set(cands.map(c => `${c.id}@${c.nodeId}`));
    return keys.size === 1
      ? { kind: 'mutation', candidate: cands[0]!, strength }
      : {
          kind: 'ambiguous',
          candidates: cands,
          planCards: [
            ...new Set(cands.map(c => nodeOf(graph, c.nodeId).planCard)),
          ],
        };
  };
  const exact = top(1);
  if (exact.length > 0) {
    return decide(exact, 'confirmed');
  }

  // (b) an earlier step's right line, written late
  const earlier = equalNodes.filter(n => idx(n) < cur && !credited.has(n.id));
  if (earlier.length > 0) {
    return creditOf(pick(earlier));
  }
  // (d) a line he already has, copied
  const have = equalNodes.filter(n => credited.has(n.id));
  if (have.length > 0) {
    return { kind: 'repeat', node: pick(have) };
  }
  // (e) the right value of a later step
  const later = equalNodes.filter(n => idx(n) > cur);
  if (later.length > 0) {
    return { kind: 'other_step', node: pick(later) };
  }
  // (f) a slip, by value only
  const asked = top(0);
  if (asked.length > 0) {
    return decide(asked, 'asked');
  }
  // (g) a wrong value the content knows
  const extra = (inp.extra ?? []).find(e => sameRat(e.value, v));
  if (extra) {
    return { kind: 'value_only', extra };
  }
  return { kind: 'generic' };
}
