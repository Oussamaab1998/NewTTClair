/**
 * What one tutored question knows besides the conversation: the graphs lines
 * are checked against (the question's own, plus small cases the tutor made),
 * what the student has earned (credited nodes), his lines L1.. with their
 * engine verdicts, the numbers already on screen, and the bookkeeping the
 * tutor writes (roadmap, paper, observations, component requests).
 * Graph runtimes are rebuilt from specs; everything else is plain JSON.
 */
import type { Experiment } from '../../engine/calls';
import { choose, frac, type Fraction } from '../../engine/rational';
import { arrangements, factorial } from '../../engine/combinatorics';
import { mutationsFor } from '../../method/mutations';
import { buildGraphFor } from '../../method/templates';
import type { GraphRuntime, GraphVerdict, LineVerdict } from '../checks/lines';
import { plain } from '../checks/lines';

/** A small case the tutor made (P12): a box of letters, or a red/black urn. */
export type CaseSpec =
  | { kind: 'box'; n: number; k: number }
  | { kind: 'urn'; reds: number; blacks: number; k: number; j: number };

export interface StudentLine {
  id: string;
  raw: string;
  turn: number;
  /** The graph it was matched on ('main' or a case id), null for an unchecked line. */
  graph: string | null;
  /** The node the tutor expected it to settle, when it said. */
  expected: string | null;
  verdict: LineVerdict;
  match: GraphVerdict | null;
}

export interface Roadmap {
  stages: { id: string; title: string }[];
  current: string;
  done: string[];
  now: string;
  why: string;
  next: string;
}

export interface PaperLine {
  fr: string;
  fromLine: string | null;
}

export interface Observation {
  id: string;
  turn: number;
  kind: 'misconception' | 'gap' | 'strength' | 'habit' | 'language' | 'affect';
  skill: string | null;
  slip: string | null;
  note: string;
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface ComponentRequest {
  turn: number;
  name: string;
  studentDoes: string;
  why: string;
  closest: string | null;
}

export interface SessionState {
  exerciseId: string;
  questionId: string;
  turn: number;
  /** «ما نعرفش» taps and free answers saying the same. */
  dontKnows: number;
  /** Components shown to him this question (names, in order). */
  componentsShown: string[];
  /** The one-time reminder to use a component was sent. */
  componentNudged: boolean;
  cases: Record<string, CaseSpec>;
  /** Graph id -> node ids the student earned with his own lines. */
  credited: Record<string, string[]>;
  lines: StudentLine[];
  /** Numbers of the statement and the exercise data (the given 4, 6, 3, 10). */
  given: string[];
  /** Numbers already shown or computed by the engine this session ("p/q"). */
  known: string[];
  roadmap: Roadmap | null;
  paper: PaperLine[];
  observations: Observation[];
  componentRequests: ComponentRequest[];
}

/** In-memory companions of the state: graph runtimes are not serialised. */
export interface SessionRuntime {
  state: SessionState;
  graphs: Map<string, GraphRuntime>;
}

export function newSession(
  exerciseId: string,
  questionId: string,
  main: GraphRuntime | null,
  statementNumbers: readonly string[],
): SessionRuntime {
  const graphs = new Map<string, GraphRuntime>();
  if (main) {
    graphs.set('main', main);
  }
  return {
    state: {
      exerciseId,
      questionId,
      turn: 0,
      dontKnows: 0,
      componentsShown: [],
      componentNudged: false,
      cases: {},
      credited: {},
      lines: [],
      given: [...new Set(statementNumbers)],
      known: [...new Set(statementNumbers)],
      roadmap: null,
      paper: [],
      observations: [],
      componentRequests: [],
    },
    graphs,
  };
}

export function addKnown(s: SessionState, values: readonly Fraction[]): void {
  const set = new Set(s.known);
  for (const v of values) {
    const p = plain(v);
    if (!set.has(p)) {
      set.add(p);
      s.known.push(p);
    }
  }
}

export function credit(s: SessionState, graph: string, node: string): void {
  const list = (s.credited[graph] ??= []);
  if (!list.includes(node)) {
    list.push(node);
  }
}

export const creditedSet = (s: SessionState, graph: string): Set<string> =>
  new Set(s.credited[graph] ?? []);

/** Named counts of a box of n letters, k drawn. */
export function boxValues(n: number, k: number): Record<string, Fraction> {
  return {
    ordered: frac(arrangements(n, k)),
    orderings: frac(factorial(k)),
    groups: frac(choose(n, k)),
  };
}

/**
 * A case as the random experiment components draw (Urn, OutcomeSpace...):
 * red balls r1.. (value 1) and black n1.. (value 0); a box's letters a, b...
 * get distinct values so none is marked as a duplicate.
 */
export function caseExperiment(spec: CaseSpec): Experiment {
  const urn =
    spec.kind === 'box'
      ? 'abcdefgh'
          .slice(0, spec.n)
          .split('')
          .map((id, i) => ({ id, value: i + 1 }))
      : [
          ...Array.from({ length: spec.reds }, (_, i) => ({
            id: `r${i + 1}`,
            value: 1,
            color: 'red' as const,
          })),
          ...Array.from({ length: spec.blacks }, (_, i) => ({
            id: `n${i + 1}`,
            value: 0,
            color: 'black' as const,
          })),
        ];
  return { urn, draw: 'simultaneous', k: spec.k };
}

/** A case's graph (urn cases only; a box has named counts instead). */
export function caseRuntime(id: string, spec: CaseSpec): GraphRuntime | null {
  if (spec.kind !== 'urn') {
    return null;
  }
  const graph = buildGraphFor(
    { template: 'urn_exactly_j', args: { j: spec.j } },
    { urn: { reds: spec.reds, blacks: spec.blacks, k: spec.k }, inputs: {} },
  );
  return { id, graph, table: mutationsFor(graph), extra: [] };
}

/** Rebuilds the in-memory graphs of a stored session. */
export function restoreRuntime(
  state: SessionState,
  main: GraphRuntime | null,
): SessionRuntime {
  const graphs = new Map<string, GraphRuntime>();
  if (main) {
    graphs.set('main', main);
  }
  for (const [id, spec] of Object.entries(state.cases)) {
    const rt = caseRuntime(id, spec);
    if (rt) {
      graphs.set(id, rt);
    }
  }
  return { state, graphs };
}
