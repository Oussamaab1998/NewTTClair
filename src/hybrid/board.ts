/**
 * What the lesson board shows (plan v2, track B), computed from the
 * conductor's state and the content: the strip (a breadcrumb of the
 * question's map: src/hybrid/tour), the finished steps with his line, the
 * step card's what / why / next, and the three sheets («التمرين» the exam
 * paper, «الطريق» the map with where he is, «اللي لقيناه» what he found).
 * Pure, zero AI.
 * Nothing here shows a value he has not earned: the only numbers are the
 * statement's (and a result the statement itself gives), his own lines
 * (this question's and the earlier ones' he carries), and the engine values
 * of the nodes he earned.
 */
import type { SessionState } from '../ai/session/state';
import type { JsonObject } from '../components/contract';
import type { Experiment } from '../engine/calls';
import { stepKey, type LoadedExercise } from '../content/loader';
import { appPaperQuestions } from '../content/paper';
import type { MethodFrameStep, Rich } from '../content/schema';
import {
  buildFindings,
  fillSkeleton,
  type FindingResult,
  type SkeletonRow,
} from '../method/findings';
import type { Graph } from '../method/graph';
import type { QuestionCtx } from './conductor/conductor';
import type { ConductorState } from './conductor/types';
import type { QuestionRecord } from './records';
import type { Carried, RoadStatus, RoadView } from './tour/tour';

export type StepStatus = 'done' | 'now' | 'upcoming';
export type StepKind = 'plan' | 'read' | 'card' | 'recipe' | 'similar';

/** His work on a step, as he did it (never the content's answer). */
export interface StepWork {
  /** His credited lines on this step, in the graph's order. */
  lines: string[];
  /** The cards he picked right inside this step. */
  picks: Rich[];
  /** The word he found (a read step). */
  word: string | null;
  /** His plan: the step titles in his order. */
  plan: Rich[];
}

/** One step of his route: a plan card's frames together, or a head / tail frame. */
export interface BoardStep {
  key: string;
  kind: StepKind;
  frameIds: string[];
  status: StepStatus;
  /** Its title; null for a plan card before he ordered the plan (it would give the plan away) and for the similar questions (the screen names them). */
  short: Rich | null;
  /** What and why, on the step now only. */
  now: Rich | null;
  why: Rich | null;
  work: StepWork;
  /** A card he reused from this earlier question (done with no step card of its own). */
  fromQuestionId: string | null;
}

/** The strip under the header: a breadcrumb of the map, and the station he is on. */
export interface Strip {
  /** The map's steps in order, each done, now or later. */
  steps: { key: string; status: RoadStatus; reused: boolean }[];
  /** The end of the map (the check, then the recipe and the similar questions). */
  end: RoadStatus;
  /** The station he is on: a step (its title) or a part of the end; null after the end. */
  now:
    | { kind: 'step'; title: Rich }
    | { kind: 'recipe' | 'similar'; title: null }
    | null;
  /** The next step of his route still to do (its title may be hidden). */
  next: { kind: StepKind; short: Rich | null } | null;
}

/** A step of the map he found in an earlier question: that question and his line there. */
export interface ReusedStep {
  questionId: string;
  /** The question's label on the exam paper. */
  label: string;
  line: string;
}

/** A component he used, kept to reopen it in «الطريق» (replay or explore, no AI). */
export interface ComponentUse {
  id: string;
  frameId: string;
  name: string;
  props: Record<string, unknown>;
  experiment: Experiment | null;
  caseId: string | null;
  snapshot: JsonObject | null;
  /** A picture of the content (a repair stage) or one an AI move showed. */
  source: 'content' | 'move';
}

/** A rule he said in his own words (the AI side records it when he states one). */
export interface RuleStated {
  frameId: string;
  text: string;
  turn: number;
}

/** A slip he fixed himself: his wrong line, then his credited line of the same node. */
export interface SlipFixed {
  node: string;
  before: string;
  after: string;
}

type Frame = MethodFrameStep;
type Facts = Readonly<Record<string, unknown>>;
type MethodCard = NonNullable<
  Extract<Frame['frame'], { type: 'recipe' }>['methodCard']
>;

const SIMILAR = 'similar';
const HEAD = 'head';
const TAIL = 'tail';

/** The step a frame belongs to: its plan card's group, the similar questions together, else itself. */
function stepKeyOf(f: Frame): string {
  if (f.frame.type === 'similar') {
    return SIMILAR;
  }
  return f.group !== undefined && f.group !== HEAD && f.group !== TAIL
    ? f.group
    : f.id;
}

function kindOf(f: Frame): StepKind {
  switch (f.frame.type) {
    case 'plan':
    case 'read':
    case 'recipe':
    case 'similar':
      return f.frame.type;
    default:
      return 'card';
  }
}

const framesOf = (ctx: QuestionCtx, ids: readonly string[]): Frame[] =>
  ids.flatMap(id => {
    const f = ctx.frames.get(id);
    return f ? [f] : [];
  });

function planCardsOf(frames: Iterable<Frame>) {
  for (const f of frames) {
    if (f.frame.type === 'plan') {
      return f.frame.cards;
    }
  }
  return [];
}

/** The word of a read frame he found, from the facts his tap established. */
export function wordFound(f: Frame, facts: Facts): string | null {
  if (f.frame.type !== 'read') {
    return null;
  }
  const hit = f.frame.targets.find(t => {
    const entries = Object.entries(t.effect);
    return (
      entries.length > 0 &&
      entries.every(([k, v]) => JSON.stringify(facts[k]) === JSON.stringify(v))
    );
  });
  return hit?.token ?? null;
}

/** His credited lines on the nodes of one plan card (the main graph's order). */
function cardLines(
  graph: Graph | null,
  cardKey: string | undefined,
  nodeLines: Readonly<Record<string, string>>,
): string[] {
  if (!graph || cardKey === undefined) {
    return [];
  }
  return graph.nodes.flatMap(n =>
    n.planCard === cardKey && nodeLines[n.id] !== undefined
      ? [nodeLines[n.id]!]
      : [],
  );
}

/** The words he found in this question's statement (read frames he passed). */
export function tappedWords(ctx: QuestionCtx, s: ConductorState): string[] {
  // A word frame he passed (a question without a trip; the trip shows its word).
  const passed = new Set(s.done ? s.route : s.route.slice(0, s.at));
  return framesOf(ctx, [...passed]).flatMap(f => {
    const w = wordFound(f, s.facts);
    return w ? [w] : [];
  });
}

/** Steps reused from an earlier question once he started (they left his route), by card id: that question. */
export function reusedFrom(
  ctx: QuestionCtx,
  s: ConductorState,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const step of ctx.tour?.question.steps ?? []) {
    const r = step.reuse;
    if (r && (s.carried ?? {})[`${r.from}/${r.node}`] && s.tour?.at === 1) {
      out[step.card] = r.from;
    }
  }
  return out;
}

/**
 * The map's steps he has from an earlier question, by card id: shown done
 * with his line from the trip on («نبداو» credits them).
 */
export function reusedSteps(
  ctx: QuestionCtx,
  s: ConductorState,
): Record<string, ReusedStep> {
  const labels = new Map(
    appPaperQuestions(ctx.loaded.exercise).map(q => [q.id, q.label]),
  );
  const out: Record<string, ReusedStep> = {};
  for (const step of ctx.tour?.question.steps ?? []) {
    const r = step.reuse;
    const his = r ? (s.carried ?? {})[`${r.from}/${r.node}`] : undefined;
    if (r && his) {
      out[step.card] = {
        questionId: r.from,
        label: labels.get(r.from) ?? r.from,
        line: his.line,
      };
    }
  }
  return out;
}

/** His results of earlier questions, by "question/node" (what the map and reuse read). */
export function carriedOf(records: readonly QuestionRecord[]): Carried {
  const out: Carried = {};
  for (const r of records) {
    for (const [node, value] of Object.entries(r.values)) {
      const line = r.lines[node];
      if (line !== undefined) {
        out[`${r.questionId}/${node}`] = { line, value };
      }
    }
  }
  return out;
}

/** His route as steps, each done, now or upcoming, with his work on it. */
export function boardSteps(ctx: QuestionCtx, s: ConductorState): BoardStep[] {
  const frames = framesOf(ctx, s.route);
  const keys: string[] = [];
  const byKey = new Map<string, Frame[]>();
  for (const f of frames) {
    const k = stepKeyOf(f);
    const group = byKey.get(k);
    if (group) {
      group.push(f);
    } else {
      keys.push(k);
      byKey.set(k, [f]);
    }
  }
  // A card he reused left the route: it shows done, at its place in his order.
  const from = reusedFrom(ctx, s);
  const order = s.planOrder ?? [];
  for (const id of Object.keys(from)) {
    if (byKey.has(id)) {
      continue;
    }
    const rank = order.indexOf(id);
    const before = keys.findIndex(k => order.indexOf(k) > rank);
    const afterCards = keys.reduce(
      (n, k, i) => (order.includes(k) ? i + 1 : n),
      0,
    );
    keys.splice(before >= 0 ? before : afterCards, 0, id);
  }
  const nowId = s.done ? null : s.route[s.at] ?? null;
  const passed = new Set(s.done ? s.route : s.route.slice(0, s.at));
  const ordered = s.planOrder !== null;
  const cards = planCardsOf(ctx.frames.values());
  const graph = ctx.pack.main?.graph ?? null;
  const noWork = (lines: string[]): StepWork => ({
    lines,
    picks: [],
    word: null,
    plan: [],
  });
  return keys.map((key): BoardStep => {
    const card = cards.find(c => c.id === key);
    const fs = byKey.get(key);
    if (!fs) {
      return {
        key,
        kind: 'card',
        frameIds: [],
        status: 'done',
        short: card?.short ?? null,
        now: null,
        why: null,
        work: noWork(cardLines(graph, card?.key, s.nodeLines)),
        fromQuestionId: from[key] ?? null,
      };
    }
    const first = fs[0]!;
    const kind = kindOf(first);
    const status: StepStatus = fs.every(f => passed.has(f.id))
      ? 'done'
      : fs.some(f => f.id === nowId)
      ? 'now'
      : 'upcoming';
    // A card's title and header are its lines frame's (a pick inside it has its own).
    const head =
      fs.find(f => f.frame.type === 'lines' && f.frame.cardId === key) ?? first;
    const current = fs.find(f => f.id === nowId);
    const work: StepWork = {
      lines: kind === 'card' ? cardLines(graph, card?.key, s.nodeLines) : [],
      picks: fs.flatMap(f => {
        const pick = s.picks[f.id];
        const opt =
          pick !== undefined && f.frame.type === 'cards'
            ? f.frame.cards.find(c => c.id === pick)
            : undefined;
        return opt ? [opt.text] : [];
      }),
      word:
        kind === 'read' && passed.has(first.id)
          ? wordFound(first, s.facts)
          : null,
      plan:
        kind === 'plan' && s.planOrder
          ? s.planOrder.flatMap(id => {
              const c = cards.find(x => x.id === id);
              return c ? [c.short] : [];
            })
          : [],
    };
    return {
      key,
      kind,
      frameIds: fs.map(f => f.id),
      status,
      short:
        kind === 'similar' || (kind === 'card' && !ordered)
          ? null
          : head.short ?? null,
      now: current?.header?.now ?? null,
      why: current?.header?.why ?? null,
      work,
      fromQuestionId: null,
    };
  });
}

/** The strip: the map's stations (its steps, then the end) and the one he is on. */
export function stripOf(steps: readonly BoardStep[], road: RoadView): Strip {
  const at = steps.findIndex(x => x.status === 'now');
  const after =
    at >= 0 ? steps.slice(at + 1).find(x => x.status !== 'done') : undefined;
  const step = road.steps.find(x => x.status === 'now');
  const part = road.after.find(x => x.status === 'now');
  const stepsDone = road.steps.every(x => x.status === 'done');
  const end: RoadStatus = !stepsDone
    ? 'later'
    : road.after.every(x => x.status === 'done')
    ? 'done'
    : 'now';
  return {
    steps: road.steps.map(x => ({
      key: x.cardId,
      status: x.status,
      reused: x.reused,
    })),
    end,
    now: step
      ? { kind: 'step', title: step.title }
      : part
      ? { kind: part.kind, title: null }
      : null,
    next: after ? { kind: after.kind, short: after.short } : null,
  };
}

// ---------------------------------------------------------------------------
// «التمرين»: the exam paper.

export interface MarkSpan {
  word: string;
  kind: 'data' | 'tapped';
}
export interface MarkedRich {
  rich: Rich;
  /** Words of `rich.fr` to underline. */
  marks: MarkSpan[];
}
export type PaperRowState = 'done' | 'current' | 'available' | 'soon';

export interface ExerciseSheet {
  statement: MarkedRich;
  questions: {
    id: string;
    label: string;
    state: PaperRowState;
    wording: MarkedRich[];
  }[];
  /** Results the statement gives, and results of questions he finished. */
  results: {
    id: string;
    questionId: string;
    statement: Rich;
    why: 'given' | 'proven';
  }[];
}

/** French number words of the statements (the data written in words). */
const NUMBER_WORDS = new Set([
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'vingt',
  'cent',
]);
const NUMBER = /^\d+(?:[.,]\d+)?$/;

/** A word without the punctuation around it (as the read frame taps it). */
export const tidyWord = (w: string) =>
  w.replace(/^[(«"']+|[.,;:!?)»"']+$/gu, '');

/** The words of a French line to underline: the numbers (data), the words he found. */
export function marksOf(fr: string, tapped: readonly string[]): MarkSpan[] {
  const found = new Set(tapped.map(w => w.toLowerCase()));
  const out: MarkSpan[] = [];
  const seen = new Set<string>();
  for (const raw of fr.split(/\s+/u)) {
    const word = tidyWord(raw);
    const low = word.toLowerCase();
    const kind = found.has(low)
      ? 'tapped'
      : NUMBER_WORDS.has(low) || NUMBER.test(word)
      ? 'data'
      : null;
    if (kind && !seen.has(`${kind}:${low}`)) {
      seen.add(`${kind}:${low}`);
      out.push({ word, kind });
    }
  }
  return out;
}

const marked = (rich: Rich, tapped: readonly string[]): MarkedRich => ({
  rich,
  marks: rich.fr !== undefined ? marksOf(rich.fr, tapped) : [],
});

/** Does the statement give this question's result (« Montrer que P(A) = 0,5 »)? */
export function givenByStatement(
  loaded: LoadedExercise,
  questionId: string,
): boolean {
  const part = loaded.exercise.parts.find(p => p.id === questionId);
  return (
    part?.groups.some(g =>
      g.steps.some(st => st.kind === 'mframe' && st.target !== undefined),
    ) ?? false
  );
}

export function exerciseSheet(
  loaded: LoadedExercise,
  questionId: string,
  done: ReadonlySet<string>,
  tapped: readonly string[],
): ExerciseSheet {
  const ex = loaded.exercise;
  const questions = appPaperQuestions(ex).map(q => ({
    id: q.id,
    label: q.label,
    state: (q.status === 'soon'
      ? 'soon'
      : q.id === questionId
      ? 'current'
      : done.has(q.id)
      ? 'done'
      : 'available') as PaperRowState,
    wording: (q.wording ?? []).map(w => marked(w, tapped)),
  }));
  const results = ex.parts.flatMap(p => {
    const r = ex.results.find(x => x.id === p.expected);
    if (!r) {
      return [];
    }
    const why = givenByStatement(loaded, p.id)
      ? ('given' as const)
      : done.has(p.id)
      ? ('proven' as const)
      : null;
    return why
      ? [{ id: r.id, questionId: p.id, statement: r.statement, why }]
      : [];
  });
  return { statement: marked(ex.statement, tapped), questions, results };
}

// ---------------------------------------------------------------------------
// «الطريق»: the question's map, with what is done and where he is.

export interface RoadSheet {
  road: RoadView;
  /** The steps he has from an earlier question (that question, his line), by card id. */
  reused: Record<string, ReusedStep>;
  /** What and why on the step he is on (the card it belongs to). */
  here: { cardId: string; now: Rich | null; why: Rich | null } | null;
  /** The components he used, by card id ('' for those outside his steps). */
  components: Record<string, ComponentUse[]>;
  /** The result the statement gives, when the card has no goal of its own. */
  target: Rich | null;
  /** The method card of the question, once his recipe is built. */
  card: MethodCard | null;
}

const recipeFrameOf = (frames: Iterable<Frame>): Frame | undefined => {
  for (const f of frames) {
    if (f.frame.type === 'recipe') {
      return f;
    }
  }
  return undefined;
};

/** Has he passed the recipe frame (the method card is his now)? */
export function recipePassed(ctx: QuestionCtx, s: ConductorState): boolean {
  const recipe = recipeFrameOf(ctx.frames.values());
  if (!recipe) {
    return false;
  }
  const at = s.route.indexOf(recipe.id);
  return s.done || (at >= 0 && at < s.at);
}

export function roadSheet(
  ctx: QuestionCtx,
  s: ConductorState,
  road: RoadView,
  steps: readonly BoardStep[],
  components: readonly ComponentUse[],
): RoadSheet {
  const target =
    [...ctx.frames.values()].find(f => f.target !== undefined)?.target ?? null;
  const recipe = recipeFrameOf(ctx.frames.values());
  const card =
    recipe?.frame.type === 'recipe' ? recipe.frame.methodCard : undefined;
  const cardIds = new Set(road.steps.map(x => x.cardId));
  const byCard: RoadSheet['components'] = {};
  for (const c of components) {
    const group = ctx.frames.get(c.frameId)?.group ?? '';
    const key = cardIds.has(group) ? group : '';
    (byCard[key] ??= []).push(c);
  }
  const now = steps.find(x => x.status === 'now' && x.kind === 'card');
  return {
    road,
    reused: reusedSteps(ctx, s),
    here: now ? { cardId: now.key, now: now.now, why: now.why } : null,
    components: byCard,
    target: road.goal ? null : target,
    card: card && recipePassed(ctx, s) ? card : null,
  };
}

// ---------------------------------------------------------------------------
// «اللي لقيناه»: what he found, question by question.

/** What a question's found section is built from (the conductor now, a record later). */
export interface FoundInput {
  questionId: string;
  /** His credited line by main-graph node. */
  lines: Readonly<Record<string, string>>;
  picks: Readonly<Record<string, string>>;
  done: boolean;
  /** The recipe is behind him: the method card is shown. */
  recipeDone: boolean;
  fixed: readonly SlipFixed[];
  rules: readonly RuleStated[];
}

export interface FoundQuestion {
  questionId: string;
  label: string;
  current: boolean;
  done: boolean;
  /** The exam write-up, its blanks filled from his accepted lines only. */
  writeup: SkeletonRow[];
  /** How we got there: his lines with their reasons, the rule once complete. */
  findings: FindingResult[];
  fixed: SlipFixed[];
  rules: RuleStated[];
  card: MethodCard | null;
}

const questionFrames = (loaded: LoadedExercise, questionId: string) =>
  (loaded.exercise.parts.find(p => p.id === questionId)?.groups ?? [])
    .flatMap(g => g.steps)
    .filter((st): st is Frame => st.kind === 'mframe');

export function foundQuestion(
  loaded: LoadedExercise,
  input: FoundInput,
  current: boolean,
): FoundQuestion | null {
  const frames = questionFrames(loaded, input.questionId);
  const planFrame = frames.find(f => f.sheet !== undefined);
  const lineFrame = frames.find(f => f.frame.type === 'lines');
  const answer = lineFrame
    ? loaded.answers.get(stepKey.main(input.questionId, lineFrame.id))
    : undefined;
  if (
    !planFrame?.sheet ||
    answer?.kind !== 'method' ||
    answer.frame !== 'lines'
  ) {
    return null;
  }
  const findings = buildFindings({
    findings: planFrame.sheet.findings,
    graph: answer.graph,
    methodId: planFrame.methodId ?? '',
    lines: input.lines,
    picks: input.picks,
    trueCard: (pickStepId, cardId) => {
      const pick = frames.find(f => f.id === pickStepId);
      return (
        pick?.frame.type === 'cards' &&
        pick.frame.cards.some(c => c.id === cardId && c.truth === 'true')
      );
    },
  });
  const recipe = recipeFrameOf(frames);
  const card =
    recipe?.frame.type === 'recipe' ? recipe.frame.methodCard ?? null : null;
  const label =
    appPaperQuestions(loaded.exercise).find(q => q.id === input.questionId)
      ?.label ?? input.questionId;
  return {
    questionId: input.questionId,
    label,
    current,
    done: input.done,
    writeup: fillSkeleton({
      skeleton: planFrame.sheet.skeleton,
      graph: answer.graph,
      lines: input.lines,
    }),
    findings,
    fixed: [...input.fixed],
    rules: [...input.rules],
    card: input.recipeDone || input.done ? card : null,
  };
}

/** Earlier questions (in exam order) and the question now. */
export function foundSheet(
  loaded: LoadedExercise,
  earlier: readonly FoundInput[],
  now: FoundInput,
): FoundQuestion[] {
  return [
    ...earlier.map(e => foundQuestion(loaded, e, false)),
    foundQuestion(loaded, now, true),
  ].filter((q): q is FoundQuestion => q !== null);
}

/** The question now, as a found section's input. */
export function foundInputOf(
  ctx: QuestionCtx,
  s: ConductorState,
  rules: readonly RuleStated[],
): FoundInput {
  return {
    questionId: ctx.questionId,
    lines: s.nodeLines,
    picks: s.picks,
    done: s.done,
    recipeDone: recipePassed(ctx, s),
    fixed: slipsFixed(s.session),
    rules,
  };
}

/** Slips he fixed: the last wrong line aimed at a node before his credited line of it. */
export function slipsFixed(session: SessionState): SlipFixed[] {
  const out: SlipFixed[] = [];
  const nodeOf = (l: SessionState['lines'][number]) =>
    l.match && 'node' in l.match ? l.match.node : l.expected;
  session.lines.forEach((l, i) => {
    if (l.graph !== 'main' || l.match?.verdict !== 'credit') {
      return;
    }
    const node = l.match.node;
    const wrong = session.lines
      .slice(0, i)
      .filter(
        b =>
          b.graph === 'main' &&
          nodeOf(b) === node &&
          b.match !== null &&
          b.match.verdict !== 'credit' &&
          b.match.verdict !== 'support' &&
          b.match.verdict !== 'repeat',
      )
      .at(-1);
    if (wrong && !out.some(x => x.node === node)) {
      out.push({ node, before: wrong.raw, after: l.raw });
    }
  });
  return out;
}
