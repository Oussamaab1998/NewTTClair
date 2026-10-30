/**
 * What the three kinds of method frame do with a student's act, as pure
 * functions the reducer calls (docs/METHOD_LESSON_PLAN.md and the addendum):
 * the plan (any order that respects what each card uses), the read tap (the
 * word that says whether order matters) and a line (evaluate, find the
 * readback, match by value and structure).
 */
import type { PlanCardRef } from '../content/schema';
import { readback, type Readback } from './factorForm';
import type { Graph, PlanCardKey } from './graph';
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
  | { kind: 'value_only'; misconceptionId: string };

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
}): LineEvaluation {
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
  const line = evalChain(raw);
  if (line.kind === 'unreadable') {
    return { outcome: 'other' };
  }
  let slip: ReviewedLine | null = null;
  for (const card of graph.cards ?? URN_CARDS) {
    const m = matchLine({ graph, table, card, credited, line });
    if (m.kind === 'credit' || m.kind === 'support') {
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
