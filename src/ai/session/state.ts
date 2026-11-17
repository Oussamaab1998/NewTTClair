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
import { ballsOf } from '../../method/repair';
import { buildGraphFor } from '../../method/templates';
import type { GraphRuntime, GraphVerdict, LineVerdict } from '../checks/lines';
import { plain } from '../checks/lines';

/**
 * A small case (P12): a box of letters, a red/black urn, or a probability
 * tree counted whole: `n` people, `a` of them in A, `af` of those in F and
 * `naf` of the others in F. A tree case rehearses ONE step: `node` of the
 * graph `template` builds on these counts (src/method/templatesTree.ts).
 */
export type CaseSpec =
  | { kind: 'box'; n: number; k: number }
  | { kind: 'urn'; reds: number; blacks: number; k: number; j: number }
  | {
      kind: 'tree';
      template: string;
      node: string;
      n: number;
      a: number;
      af: number;
      naf: number;
    };

/** A case made of balls or letters (it can be listed and drawn as an urn). */
export type BallCase = Exclude<CaseSpec, { kind: 'tree' }>;

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
  /** His plan, once he put the plan cards in a valid order (card ids). */
  planOrder: string[] | null;
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
      planOrder: null,
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

/**
 * Nodes whose calculation is already on one of his lines: a right line of
 * the node, even one he still has to simplify (the conductor does not credit
 * that one yet). The value alone then finishes the node (MatchInput.worked).
 */
export const workedSet = (s: SessionState, graph: string): Set<string> =>
  new Set(
    s.lines.flatMap(l =>
      l.graph === graph && l.match?.verdict === 'credit' ? [l.match.node] : [],
    ),
  );

/** Named counts of a box of n letters, k drawn. */
export function boxValues(n: number, k: number): Record<string, Fraction> {
  return {
    ordered: frac(arrangements(n, k)),
    orderings: frac(factorial(k)),
    groups: frac(choose(n, k)),
  };
}

/**
 * A case's balls: the ids its lists are checked on and the names he reads
 * (a box: letters a, b...; an urn: r1.. as R1.., n1.. as N1..), the same in
 * the urn picture, the case card and the tools' results.
 */
export function caseBallNames(spec: BallCase): { id: string; label: string }[] {
  return spec.kind === 'box'
    ? 'abcdefgh'
        .slice(0, spec.n)
        .split('')
        .map(id => ({ id, label: id }))
    : ballsOf(spec.reds, spec.blacks);
}

/** The whole counts a tree case shows: at the root, after the first level, at each leaf. */
export function treeCaseCounts(spec: Extract<CaseSpec, { kind: 'tree' }>): {
  n: number;
  a: number;
  na: number;
  af: number;
  anf: number;
  naf: number;
  nanf: number;
  /** Everyone in F, whichever side they come from. */
  f: number;
} {
  const { n, a, af, naf } = spec;
  return {
    n,
    a,
    na: n - a,
    af,
    anf: a - af,
    naf,
    nanf: n - a - naf,
    f: af + naf,
  };
}

/**
 * A case as the random experiment components draw (Urn, OutcomeSpace...):
 * red balls r1.. (value 1) and black n1.. (value 0); a box's letters a, b...
 * get distinct values so none is marked as a duplicate. Each ball carries
 * its name (caseBallNames), so the picture shows a b c d, not the values.
 * A tree case has no balls to draw (BallCase).
 */
export function caseExperiment(spec: BallCase): Experiment {
  const urn = caseBallNames(spec).map(({ id, label }, i) =>
    spec.kind === 'box'
      ? { id, value: i + 1, label }
      : id.startsWith('r')
      ? { id, value: 1, color: 'red' as const, label }
      : { id, value: 0, color: 'black' as const, label },
  );
  return { urn, draw: 'simultaneous', k: spec.k };
}

/** A case's graph (urn and tree cases; a box has named counts instead). */
export function caseRuntime(id: string, spec: CaseSpec): GraphRuntime | null {
  if (spec.kind === 'tree') {
    const { n, a, af, naf } = spec;
    const tree = buildGraphFor(
      { template: spec.template, args: { counts: { n, a, af, naf } } },
      { inputs: {} },
    );
    return { id, graph: tree, table: mutationsFor(tree), extra: [] };
  }
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
