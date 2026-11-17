/**
 * What the three kinds of method frame do with a student's act, as pure
 * functions the reducer calls (docs/METHOD_LESSON_PLAN.md and the addendum):
 * the plan (any order that respects what each card uses), the read tap (the
 * word that says whether order matters) and a line (evaluate, find the
 * readback, match by value and structure).
 */
import type { PlanCardRef } from '../content/schema';
import { readback, type Readback } from './factorForm';
import { exprSides, judgeExprLine } from './exprLine';
import type { Graph, GraphNode, PlanCardKey } from './graph';
import { evalChain, mismatchLine, type ChainFailure } from './lineChain';
import {
  matchLine,
  type ExtraCandidate,
  type Match,
  type MutationId,
  type MutationTable,
  URN_CARDS,
} from './mutations';

export type PlanVerdict =
  | { ok: true }
  | { ok: false; reason: 'incomplete' }
  | { ok: false; reason: 'dependency'; card: string; needs: string[] };

export function checkPlan(
  cards: readonly Pick<PlanCardRef, 'id' | 'needs'>[],
  order: readonly string[],
): PlanVerdict {
  const known = new Set(cards.map(c => c.id));
  if (
    order.length !== cards.length ||
    new Set(order).size !== order.length ||
    !order.every(id => known.has(id))
  ) {
    return { ok: false, reason: 'incomplete' };
  }
  const byId = new Map(cards.map(c => [c.id, c]));
  for (let i = 0; i < order.length; i++) {
    const card = byId.get(order[i]!)!;
    const before = new Set(order.slice(0, i));
    const missing = card.needs.filter(id => !before.has(id));
    if (missing.length > 0) {
      return { ok: false, reason: 'dependency', card: card.id, needs: missing };
    }
  }
  return { ok: true };
}

/** The facts a tap establishes (authored, e.g. `{ order: 'unordered' }`). */
export type ReadEffect = Readonly<Record<string, unknown>>;
const tidy = (s: string): string =>
  s
    .trim()
    .replace(/[.,;:!?]+$/u, '')
    .toLowerCase();

export function checkRead(
  targets: readonly { token: string; effect: ReadEffect }[],
  token: string,
): { ok: true; effect: ReadEffect } | { ok: false } {
  const t = tidy(token);
  const hit = targets.find(x => tidy(x.token) === t);
  return hit ? { ok: true, effect: hit.effect } : { ok: false };
}

export type LineOutcome =
  | { kind: 'unreadable'; reason: ChainFailure }
  | { kind: 'unfinished' }
  | { kind: 'mismatch'; at: number; shown: string }
  | Exclude<
      Match,
      | { kind: 'unfinished' }
      | { kind: 'mismatch' }
      | { kind: 'mutation' }
      | { kind: 'value_only' }
    >
  | {
      kind: 'mutation';
      id: MutationId;
      nodeId: string;
      strength: 'confirmed' | 'asked';
      misconceptionId: string;
    }
  | { kind: 'value_only'; misconceptionId: string }
  /**
   * A line with a letter that is not equal to his line before it (or to the
   * question's quantity), with no known slip: where it differs, when one
   * part of a fraction does (src/method/exprLine.ts).
   */
  | {
      kind: 'expr_wrong';
      where?: 'numerator' | 'denominator' | 'both' | 'whole';
      parentheses?: 'numerator' | 'denominator';
    };

export interface LineEvaluation {
  readback: Readback | null;
  outcome: LineOutcome;
}

export function evaluateLine(input: {
  raw: string;
  graph: Graph;
  table: MutationTable;
  card: PlanCardKey;
  credited: ReadonlySet<string>;
  extra?: readonly ExtraCandidate[];
  /** Nodes whose calculation is on an earlier line (see MatchInput.worked). */
  worked?: ReadonlySet<string>;
  /** His accepted lines on this card, oldest first (a step written with a letter). */
  accepted?: readonly string[];
}): LineEvaluation {
  const exprNode = input.graph.nodes.find(
    n => n.planCard === input.card && n.main && n.expr,
  );
  if (exprNode?.expr) {
    return {
      readback: null,
      outcome: exprOutcome(
        exprNode,
        input.graph,
        input.credited,
        input.accepted ?? [],
        input.raw,
      ),
    };
  }
  const line = evalChain(input.raw);
  if (line.kind === 'unreadable') {
    return {
      readback: null,
      outcome: { kind: 'unreadable', reason: line.reason },
    };
  }
  const rb = readback(input.raw);
  const m = matchLine({
    graph: input.graph,
    table: input.table,
    card: input.card,
    credited: input.credited,
    line,
    ...(input.extra && { extra: input.extra }),
    ...(input.worked && { worked: input.worked }),
  });
  switch (m.kind) {
    case 'unfinished':
      return { readback: rb, outcome: { kind: 'unfinished' } };
    case 'mismatch':
      return {
        readback: rb,
        outcome: {
          kind: 'mismatch',
          at: m.at,
          shown: mismatchLine(input.raw, m.at),
        },
      };
    case 'mutation':
      return {
        readback: rb,
        outcome: {
          kind: 'mutation',
          id: m.candidate.id,
          nodeId: m.candidate.nodeId,
          strength: m.strength,
          misconceptionId: `mut.${m.candidate.id}`,
        },
      };
    case 'value_only':
      return {
        readback: rb,
        outcome: {
          kind: 'value_only',
          misconceptionId: m.extra.misconceptionId,
        },
      };
    default:
      return { readback: rb, outcome: m };
  }
}

export interface ReviewedLine {
  outcome: 'credit' | 'slip' | 'other';
  nodeId?: string;
  /** The mutation id of a slip. */
  id?: string;
}

/**
 * A line of a similar question, looked at after he submits: credited for the
 * node it settles, labelled by the slip it matches, or neither. Every plan
 * card is tried (he may have written the steps in any order).
 */
export function reviewLine(
  graph: Graph,
  table: MutationTable,
  raw: string,
  credited: ReadonlySet<string>,
): ReviewedLine {
  // A similar question written with a letter: a line in the goal's form
  // settles its step, a known wrong line is its slip.
  for (const n of graph.nodes.filter(x => x.main && x.expr)) {
    const v = judgeExprLine(n.expr!, [], raw);
    if (v.kind === 'accepted' && v.final) {
      return { outcome: 'credit', nodeId: n.id };
    }
    if (v.kind === 'wrong' && v.slip) {
      return { outcome: 'slip', id: v.slip, nodeId: n.id };
    }
  }
  const line = evalChain(raw);
  if (line.kind === 'unreadable') {
    return { outcome: 'other' };
  }
  let slip: ReviewedLine | null = null;
  for (const card of graph.cards ?? URN_CARDS) {
    const m = matchLine({ graph, table, card, credited, line });
    // Without help he is not asked for the road: the value alone counts here.
    if (
      m.kind === 'credit' ||
      m.kind === 'support' ||
      m.kind === 'unexplained'
    ) {
      return { outcome: 'credit', nodeId: m.node.id };
    }
    if (m.kind === 'mutation' && !slip) {
      slip = {
        outcome: 'slip',
        id: m.candidate.id,
        nodeId: m.candidate.nodeId,
      };
    }
  }
  return slip ?? { outcome: 'other' };
}

/** A line on a step written with a letter, as an outcome of the board. */
function exprOutcome(
  node: GraphNode,
  graph: Graph,
  credited: ReadonlySet<string>,
  accepted: readonly string[],
  raw: string,
): LineOutcome {
  const v = judgeExprLine(node.expr!, accepted, raw);
  switch (v.kind) {
    case 'unreadable':
      return { kind: 'unreadable', reason: 'syntax' };
    case 'undetermined':
      return { kind: 'unreadable', reason: 'not_a_number' };
    case 'unchanged':
      return { kind: 'repeat', node };
    case 'mismatch': {
      const sides = exprSides(raw);
      const shown = sides
        .map((x, i) => (i === 0 ? x : `${i - 1 === v.at ? ' ≠ ' : ' = '}${x}`))
        .join('');
      return { kind: 'mismatch', at: v.at, shown };
    }
    case 'accepted':
      if (!v.final) {
        return { kind: 'support', node, derivation: 'exact' };
      }
      return credited.has(node.id)
        ? { kind: 'repeat', node }
        : {
            kind: 'credit',
            node,
            derivation: 'exact',
            unsimplified: false,
            completes: graph.nodes.every(
              x =>
                x.id === node.id ||
                !x.main ||
                x.planCard !== node.planCard ||
                credited.has(x.id),
            ),
          };
    case 'wrong':
      return v.slip
        ? {
            kind: 'mutation',
            id: v.slip as MutationId,
            nodeId: node.id,
            strength: 'confirmed',
            misconceptionId: `mut.${v.slip}`,
          }
        : {
            kind: 'expr_wrong',
            ...(v.where && { where: v.where }),
            ...(v.parentheses && { parentheses: v.parentheses }),
          };
  }
}
