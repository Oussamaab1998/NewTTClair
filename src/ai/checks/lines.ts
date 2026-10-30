/**
 * Reading and checking a line the student wrote, for the AI tutor. The engine
 * decides everything here; the model only receives the verdict.
 * - A leading label is kept apart: `P(A) = 1/2`, `p(X=0)=7/10`, `E(X)=…`.
 * - Counting notation is evaluated: C(10,3), C(10;3), A(10,3), 3! (counting.ts).
 * - Powers are allowed (a line typed as text); the pad has no `^` key.
 * - `990/3*2*1` is ambiguous: both readings are computed (factorForm readback).
 * - A line without "=" (`11*10*9`) is still read: its value is known and it
 *   is matched like a bare value, flagged unfinished.
 * Values are exact fractions written "p/q" (or "n").
 */
import '../../method/library';

import { fractionToPlain } from '../../engine/format';
import { normalizeCounting } from '../../engine/expression/counting';
import type { Fraction } from '../../engine/rational';
import { isUnreducedFraction, aboveOne } from '../../method/checks';
import { readback, type Readback } from '../../method/factorForm';
import type { Graph, GraphNode } from '../../method/graph';
import { evalChain, type ChainResult } from '../../method/lineChain';
import {
  matchLine,
  URN_CARDS,
  type ExtraCandidate,
  type Match,
  type MutationTable,
} from '../../method/mutations';

export const plain = (f: Fraction): string => fractionToPlain(f);

const LABEL = /^\s*([pPEV])\s*\(([^()]{1,20})\)\s*=\s*/;

export interface LineRead {
  raw: string;
  /** `P(A)`, `p(X=0)`, `E(X)`: what the line says it computes. */
  label: string | null;
  /** The text the engine evaluated (label removed, counting notation replaced). */
  evaluated: string;
  usedNotation: boolean;
  chain: ChainResult;
  readback: Readback | null;
  /** When ambiguous: the value of the grouped reading `990/(3*2*1)`. */
  groupedValue: Fraction | null;
}

/** `11x10x9` -> `11*10*9` (a letter x between digits is a times sign). */
const timesX = (s: string): string => {
  let prev = '';
  let cur = s;
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2');
  }
  return cur;
};

export function readLine(raw: string): LineRead {
  const text = timesX(raw.trim());
  const m = LABEL.exec(text);
  const label = m ? `${m[1]}(${m[2]!.trim()})` : null;
  const body = m ? text.slice(m[0].length) : text;
  const n = normalizeCounting(body);
  const evaluated = n.ok ? n.text : body;
  const chain = n.ok
    ? evalChain(evaluated, { allowPow: true })
    : ({ kind: 'unreadable', reason: 'syntax' } as const);
  const rb = chain.kind === 'unreadable' ? null : readback(evaluated);
  let groupedValue: Fraction | null = null;
  if (rb) {
    const g = evalChain(rb.grouped, { allowPow: true });
    groupedValue =
      g.kind === 'chain' || g.kind === 'bare' || g.kind === 'unfinished'
        ? g.kind === 'chain'
          ? g.sides[0]!.value
          : g.value
        : null;
  }
  return {
    raw,
    label,
    evaluated,
    usedNotation: n.ok && n.usedNotation,
    chain,
    readback: rb,
    groupedValue,
  };
}

/** One graph the session can match lines against: the question's, or a case's. */
export interface GraphRuntime {
  id: string;
  graph: Graph;
  table: MutationTable;
  extra: readonly ExtraCandidate[];
}

export type GraphVerdict =
  | {
      verdict: 'credit';
      node: string;
      derivation: string;
      unsimplified: boolean;
      completes: boolean;
    }
  | { verdict: 'support'; node: string; derivation: string }
  | { verdict: 'repeat'; node: string }
  | { verdict: 'other_step'; node: string }
  | {
      verdict: 'slip';
      slip: string;
      node: string;
      strength: 'confirmed' | 'asked';
    }
  | { verdict: 'known_wrong'; misconception: string }
  | { verdict: 'ambiguous'; slips: string[] }
  | { verdict: 'no_match' };

function toVerdict(m: Match): GraphVerdict | null {
  switch (m.kind) {
    case 'credit':
      return {
        verdict: 'credit',
        node: m.node.id,
        derivation: m.derivation,
        unsimplified: m.unsimplified,
        completes: m.completes,
      };
    case 'support':
      return { verdict: 'support', node: m.node.id, derivation: m.derivation };
    case 'repeat':
      return { verdict: 'repeat', node: m.node.id };
    case 'other_step':
      return { verdict: 'other_step', node: m.node.id };
    case 'mutation':
      return {
        verdict: 'slip',
        slip: m.candidate.id,
        node: m.candidate.nodeId,
        strength: m.strength,
      };
    case 'value_only':
      return {
        verdict: 'known_wrong',
        misconception: m.extra.misconceptionId,
      };
    case 'ambiguous':
      return { verdict: 'ambiguous', slips: m.candidates.map(c => c.id) };
    default:
      return null;
  }
}

/** A line without "=" is matched as the value it computes. */
function asValue(
  chain: Exclude<ChainResult, { kind: 'unreadable' }>,
): Exclude<ChainResult, { kind: 'unreadable' }> {
  return chain.kind === 'unfinished'
    ? { kind: 'bare', side: chain.side, value: chain.value }
    : chain;
}

const RANK: Record<GraphVerdict['verdict'], number> = {
  credit: 0,
  support: 1,
  slip: 2,
  known_wrong: 3,
  repeat: 4,
  other_step: 5,
  ambiguous: 6,
  no_match: 7,
};

/**
 * Matches a read line on a graph. With `node`, only that node's plan card is
 * tried (the tutor said what it expects); otherwise every card, best verdict
 * first (credit, then support, then a slip).
 */
export function matchOnGraph(
  rt: GraphRuntime,
  chain: ChainResult,
  credited: ReadonlySet<string>,
  node?: string,
): GraphVerdict {
  if (chain.kind === 'unreadable') {
    return { verdict: 'no_match' };
  }
  const line = asValue(chain);
  const cards = rt.graph.cards ?? URN_CARDS;
  const target: GraphNode | undefined =
    node === undefined ? undefined : rt.graph.nodes.find(n => n.id === node);
  const tryCards = target ? [target.planCard] : cards;
  let best: GraphVerdict = { verdict: 'no_match' };
  for (const card of tryCards) {
    const v = toVerdict(
      matchLine({
        graph: rt.graph,
        table: rt.table,
        card,
        credited,
        line,
        extra: rt.extra,
      }),
    );
    if (v && RANK[v.verdict] < RANK[best.verdict]) {
      best = v;
    }
  }
  return best;
}

/** The engine's view of a line, as sent to the model. */
export interface LineVerdict {
  readable: boolean;
  reason?: string;
  label: string | null;
  notation: boolean;
  /** Each side as he wrote it, with its exact value. */
  sides: { text: string; value: string }[];
  /** Does every "=" hold? null for a single side. */
  equal: boolean | null;
  /** First "=" that does not hold (0-based), when any. */
  mismatch_at: number | null;
  /** He wrote no "=" result yet. */
  unfinished: boolean;
  value: string | null;
  readback: { grouped: string; grouped_value: string | null } | null;
  checks: { above_one: boolean; unreduced_written: boolean };
}

export function lineVerdict(r: LineRead): LineVerdict {
  const c = r.chain;
  if (c.kind === 'unreadable') {
    return {
      readable: false,
      reason: c.reason,
      label: r.label,
      notation: r.usedNotation,
      sides: [],
      equal: null,
      mismatch_at: null,
      unfinished: false,
      value: null,
      readback: null,
      checks: { above_one: false, unreduced_written: false },
    };
  }
  const sides = c.kind === 'chain' ? c.sides : [c.side];
  const last = sides[sides.length - 1]!;
  return {
    readable: true,
    label: r.label,
    notation: r.usedNotation,
    sides: sides.map(s => ({ text: s.raw, value: plain(s.value) })),
    equal: c.kind === 'chain' ? c.equal : null,
    mismatch_at: c.kind === 'chain' ? c.mismatchAt ?? null : null,
    unfinished: c.kind === 'unfinished',
    value: plain(c.value),
    readback: r.readback
      ? {
          grouped: r.readback.grouped,
          grouped_value: r.groupedValue ? plain(r.groupedValue) : null,
        }
      : null,
    checks: {
      // "Can this be a probability?": only for a line that reads as one (a
      // P(...) label, or a fraction result like 28/15), never for a count
      // such as 720/6 = 120 (a swapped whole ratio is caught by the graph).
      above_one:
        aboveOne(c.value) &&
        ((r.label !== null && /^[pP]/.test(r.label)) || c.value[1] !== 1),
      unreduced_written: isUnreducedFraction(last.ast),
    },
  };
}
