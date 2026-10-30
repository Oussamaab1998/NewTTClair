/**
 * What he found and the paper skeleton, built from his own ACCEPTED lines
 * only (docs/METHOD_LESSON_PLAN.md 6.2 and 6.3): a line that is a bare
 * number where a derivation was asked is "unexplained" and fills nothing;
 * nothing is ever shown that he did not compute. Pure.
 */
import { chooseLine } from '../engine/calcLines';
import { fractionToPlain } from '../engine/format';
import type { Finding, Rich } from '../content/schema';
import type { Graph, GraphNode } from './graph';
import { evalChain } from './lineChain';

export interface FindingLine {
  nodeId: string;
  raw: string;
  reason?: Rich;
}
export interface BridgeLine {
  nodeId: string;
  /** His line as he typed it. */
  did: string;
  /** How the exam writes the count (LaTeX). */
  exam: string;
}
export interface FindingResult {
  id: string;
  title: Rich;
  lines: FindingLine[];
  /** The rule WITH its condition, once every node is found and the claim he made was right. */
  rule: { text: Rich; condition: Rich } | null;
  bridge: BridgeLine[];
}

const node = (g: Graph, id: string): GraphNode | undefined =>
  g.nodes.find(n => n.id === id);

/** A line is a derivation unless it is a bare number the node does not allow bare. */
export function isExplained(g: Graph, nodeId: string, raw: string): boolean {
  const n = node(g, nodeId);
  if (!n) {
    return false;
  }
  const c = evalChain(raw);
  if (c.kind === 'unreadable') {
    return false;
  }
  const plain =
    c.kind === 'bare' ||
    (c.kind === 'chain' &&
      c.sides.every(
        s =>
          s.ast.type === 'num' ||
          (s.ast.type === 'unary' && s.ast.arg.type === 'num'),
      ));
  return !plain || n.bareOk;
}

export function buildFindings(input: {
  findings: readonly Finding[];
  graph: Graph;
  methodId: string;
  /** His credited line by node id. */
  lines: Readonly<Record<string, string>>;
  /** The card he picked, by pick step id (`m1.p_reason`). */
  picks: Readonly<Record<string, string>>;
  /** Is this card the true one of this pick? */
  trueCard: (pickStepId: string, cardId: string) => boolean;
}): FindingResult[] {
  const out: FindingResult[] = [];
  for (const f of input.findings) {
    const lines: FindingLine[] = f.nodes.flatMap(id => {
      const raw = input.lines[id];
      return raw !== undefined && isExplained(input.graph, id, raw)
        ? [
            {
              nodeId: id,
              raw,
              ...(f.reasons[id] && { reason: f.reasons[id]! }),
            },
          ]
        : [];
    });
    if (lines.length === 0) {
      continue;
    }
    const pickStep =
      f.viaCard === undefined ? undefined : `${input.methodId}.${f.viaCard}`;
    const picked = pickStep === undefined ? undefined : input.picks[pickStep];
    const claimOk =
      pickStep === undefined ||
      (picked !== undefined && input.trueCard(pickStep, picked));
    const complete = lines.length === f.nodes.length && claimOk;
    const bridge: BridgeLine[] =
      complete && f.bridge
        ? lines.flatMap(l => {
            const n = node(input.graph, l.nodeId);
            return n?.shape.kind === 'choose'
              ? [
                  {
                    nodeId: l.nodeId,
                    did: l.raw,
                    exam: chooseLine(n.shape.n, n.shape.k),
                  },
                ]
              : [];
          })
        : [];
    out.push({
      id: f.id,
      title: f.title,
      lines,
      rule: complete ? f.rule : null,
      bridge,
    });
  }
  return out;
}

export type SkeletonPart =
  | { text: string }
  | { node: string; value: string | null };

export interface SkeletonRow {
  id: string;
  parts: SkeletonPart[];
}

/** `{node}` blanks of the exam lines, filled with the value of his accepted line of that node. */
export function fillSkeleton(input: {
  skeleton: readonly { id: string; fr: string }[];
  graph: Graph;
  lines: Readonly<Record<string, string>>;
}): SkeletonRow[] {
  const valueOf = (id: string): string | null => {
    const raw = input.lines[id];
    if (raw === undefined || !isExplained(input.graph, id, raw)) {
      return null;
    }
    const c = evalChain(raw);
    return c.kind === 'unreadable' ? null : fractionToPlain(c.value);
  };
  return input.skeleton.map(line => {
    const parts: SkeletonPart[] = [];
    let last = 0;
    for (const m of line.fr.matchAll(/\{([a-z0-9_]+)\}/g)) {
      const at = m.index ?? 0;
      if (at > last) {
        parts.push({ text: line.fr.slice(last, at) });
      }
      parts.push({ node: m[1]!, value: valueOf(m[1]!) });
      last = at + m[0].length;
    }
    if (last < line.fr.length) {
      parts.push({ text: line.fr.slice(last) });
    }
    return { id: line.id, parts };
  });
}
