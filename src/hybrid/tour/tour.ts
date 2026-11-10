/**
 * The question trip and the map it shows (owner, 2026-10-30: "a very clear
 * map, easy sentences, a high view he can see whenever he wants" — not a
 * tour he builds). The first time he opens a question, the trip is shown:
 * the exercise from above, then this question's map. «نبداو» starts his
 * first step; the same map, with what is done and where he is, is the
 * «الطريق» sheet and the strip for the rest of the question. A step found in
 * an earlier question is reused (credited, its screens skipped). Pure.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { credit } from '../../ai/session/state';
import { stepKey, type ResolvedAnswer } from '../../content/loader';
import type { MethodFrameStep, Rich } from '../../content/schema';
import { stepOrderFor } from '../../method/route';
import scEx2 from '../../content/trips.sc-ex2.json';
import type { QuestionCtx } from '../conductor/conductor';
import type { ActOut, ConductorState, Reason } from '../conductor/types';
import { tierOf } from '../conductor/types';
import {
  TripFileSchema,
  type TripLine,
  type TripOverview,
  type TripQuestion,
} from './schema';

const FILES = [scEx2].flatMap(f => {
  const r = TripFileSchema.safeParse(f);
  return r.success ? [r.data] : [];
});

/** A question's trip: the exercise overview and this question's map. */
export interface Trip {
  overview: TripOverview;
  question: TripQuestion;
}

/** The trip authored for a question, or null (the question starts at its first step). */
export function tourFor(exerciseId: string, questionId: string): Trip | null {
  const file = FILES.find(f => f.exerciseId === exerciseId);
  const question = file?.questions[questionId];
  return file && question ? { overview: file.overview, question } : null;
}

/** The trip in the conductor state: shown (at 0) until «نبداو» (at 1). */
export interface TourProgress {
  kind: 'trip';
  at: number;
}

/** His results of earlier questions, by "question/node" (from the records). */
export type Carried = Record<string, { line: string; value: string }>;

export const newTour = (): TourProgress => ({ kind: 'trip', at: 0 });

/** The trip is on: authored for the question and not started yet. */
export const isTouring = (ctx: QuestionCtx, s: ConductorState): boolean =>
  ctx.tour !== null && s.tour != null && s.tour.at < 1;

/** The plan frame of the question (its cards are the steps' cards). */
export function planStep(ctx: QuestionCtx): MethodFrameStep | null {
  for (const st of ctx.frames.values()) {
    if (st.frame.type === 'plan') {
      return st;
    }
  }
  return null;
}

/** The frames the trip replaces: ordering the plan and the word to read. */
export const tourReplaces = (st: MethodFrameStep): boolean =>
  st.frame.type === 'plan' || st.frame.type === 'read';

const out = (reason: Reason, reply: ActOut['reply'] = []): ActOut => ({
  tier: tierOf(reason),
  reason,
  reply,
  advanced: false,
});

const carriedOf = (s: ConductorState, key: string) =>
  (s.carried ?? {})[key] ?? null;

/** The main-graph node a plan card settles (its key, or the result for the last card). */
function nodeOfCard(ctx: QuestionCtx, cardId: string): string | null {
  const plan = planStep(ctx);
  if (plan?.frame.type !== 'plan') {
    return null;
  }
  const card = plan.frame.cards.find(c => c.id === cardId);
  const nodes = ctx.pack.main?.graph.nodes ?? [];
  if (!card) {
    return null;
  }
  if (nodes.some(n => n.id === card.key)) {
    return card.key;
  }
  const last = !plan.frame.cards.some(c => c.needs.includes(card.id));
  return last ? nodes.find(n => n.role === 'result')?.id ?? null : null;
}

/** Frames of a card whose line is already settled (a reused result) leave the route. */
function dropSettled(ctx: QuestionCtx, s: ConductorState): void {
  const credited = new Set(s.session.credited.main ?? []);
  s.route = s.route.filter(id => {
    const f = ctx.frames.get(id)?.frame;
    if (f?.type !== 'lines') {
      return true;
    }
    const answer = ctx.loaded.answers.get(stepKey.main(ctx.questionId, id)) as
      | ResolvedAnswer
      | undefined;
    const main =
      answer?.kind === 'method' && answer.frame === 'lines'
        ? answer.graph.nodes.find(n => n.planCard === f.key && n.main)
        : undefined;
    return !main || !credited.has(main.id);
  });
}

/**
 * One act while the trip is shown: null when it is not (the conductor
 * handles the act). Mutates the copied state it is given.
 */
export function tourAct(
  ctx: QuestionCtx,
  s: ConductorState,
  a: StudentAct,
): ActOut | null {
  const trip = ctx.tour;
  if (!trip || !s.tour || !isTouring(ctx, s)) {
    return null;
  }
  if (a.kind === 'free') {
    return out('free_text', [
      { kind: 'student', content: { kind: 'typed', raw: a.text } },
    ]);
  }
  if (a.kind !== 'continue') {
    return out('not_now');
  }
  // «نبداو»: his steps in the map's order, without the plan and the word
  // frames (the map showed them); what the word said still holds.
  const order = trip.question.steps.map(x => x.card);
  s.planOrder = order;
  s.session.planOrder = order;
  s.route = stepOrderFor(ctx.groupSteps, order).filter(id => {
    const st = ctx.frames.get(id);
    return st !== undefined && !tourReplaces(st);
  });
  for (const st of ctx.frames.values()) {
    if (st.frame.type === 'read') {
      for (const t of st.frame.targets) {
        s.facts = { ...s.facts, ...t.effect };
      }
    }
  }
  // A step found in an earlier question is his already.
  for (const step of trip.question.steps) {
    const c = step.reuse
      ? carriedOf(s, `${step.reuse.from}/${step.reuse.node}`)
      : null;
    if (step.reuse && c) {
      credit(s.session, 'main', step.reuse.node);
      s.nodeLines[step.reuse.node] = c.line;
      if (!s.session.known.includes(c.value)) {
        s.session.known.push(c.value);
      }
    }
  }
  s.tour.at = 1;
  dropSettled(ctx, s);
  s.at = 0;
  s.done = s.route.length === 0;
  return out('tour_done');
}

// ---------------------------------------------------------------------------
// The map: shown by the trip, then «الطريق» and the strip.

export type RoadStatus = 'done' | 'now' | 'later';

/** A line of the map, with his own line when it is an earlier result he has. */
export interface MapLine {
  says: Rich;
  fr: string | null;
  his: { line: string; value: string } | null;
}

export interface RoadView {
  /** The exercise from above: its questions, this one marked. */
  overview: {
    says: Rich;
    questions: {
      id: string;
      says: Rich;
      fr: string | null;
      link: Rich | null;
      current: boolean;
    }[];
  } | null;
  /** Later questions: what changed since the one before. */
  changed: Rich | null;
  have: MapLine[];
  goal: MapLine | null;
  /** The steps in order, with where he is. */
  steps: {
    cardId: string;
    title: Rich;
    says: Rich;
    fr: string | null;
    status: RoadStatus;
    /** His line that settled it (or the earlier question's, reused). */
    line: string | null;
    reused: boolean;
  }[];
  finish: MapLine | null;
  after: { kind: 'recipe' | 'similar'; says: Rich; status: RoadStatus }[];
  /** The trip was shown and he started. */
  ready: boolean;
}

const mapLine = (s: ConductorState, l: TripLine): MapLine => ({
  says: l.says,
  fr: l.fr ?? null,
  his: l.carried ? carriedOf(s, `${l.carried.from}/${l.carried.node}`) : null,
});

export function roadView(ctx: QuestionCtx, s: ConductorState): RoadView {
  const trip = ctx.tour;
  const touring = isTouring(ctx, s);
  const credited = new Set(s.session.credited.main ?? []);
  const frameNow =
    s.done || touring ? null : ctx.frames.get(s.route[s.at] ?? '');
  // A step found in an earlier question: his line from there (done even
  // before «نبداو» credits it).
  const reusedLine = (id: string): string | null => {
    const r = trip?.question.steps.find(x => x.card === id)?.reuse;
    return r ? carriedOf(s, `${r.from}/${r.node}`)?.line ?? null : null;
  };
  const cardDone = (id: string): boolean => {
    if (reusedLine(id) !== null) {
      return true;
    }
    const node = nodeOfCard(ctx, id);
    if (node) {
      return credited.has(node);
    }
    // A card with no line of its own (a pick): done once its frames are behind him.
    const at = s.route.findIndex(r => ctx.frames.get(r)?.group === id);
    return s.done || (at >= 0 && at < s.at && frameNow?.group !== id);
  };
  const cards = trip?.question.steps.map(x => x.card) ?? [];
  // The step he is on; while the trip is shown, the first one not settled.
  const nowCard = touring
    ? cards.find(id => !cardDone(id)) ?? null
    : frameNow?.group ?? null;
  const steps = (trip?.question.steps ?? []).map(x => {
    const node = nodeOfCard(ctx, x.card);
    const status: RoadStatus =
      nowCard === x.card ? 'now' : cardDone(x.card) ? 'done' : 'later';
    return {
      cardId: x.card,
      title: x.title,
      says: x.says,
      fr: x.fr ?? null,
      status,
      line: (node ? s.nodeLines[node] : undefined) ?? reusedLine(x.card),
      reused: reusedLine(x.card) !== null,
    };
  });
  // After the steps: the recipe, then the similar questions.
  const kindNow = frameNow?.frame.type;
  const passedKind = (k: 'recipe' | 'similar') => {
    if (s.done) {
      return true;
    }
    const last = s.route
      .map((r, i) => (ctx.frames.get(r)?.frame.type === k ? i : -1))
      .filter(i => i >= 0)
      .pop();
    return last !== undefined && last < s.at;
  };
  const after = (trip?.question.after ?? []).map(x => ({
    kind: x.kind,
    says: x.says,
    status: (kindNow === x.kind
      ? 'now'
      : passedKind(x.kind)
      ? 'done'
      : 'later') as RoadStatus,
  }));
  return {
    overview: trip
      ? {
          says: trip.overview.says,
          questions: trip.overview.questions.map(q => ({
            id: q.id,
            says: q.says,
            fr: q.fr ?? null,
            link: q.link ?? null,
            current: q.id === ctx.questionId,
          })),
        }
      : null,
    changed: trip?.question.changed ?? null,
    have: (trip?.question.have ?? []).map(l => mapLine(s, l)),
    goal: trip ? mapLine(s, trip.question.goal) : null,
    steps,
    finish: trip ? mapLine(s, trip.question.finish) : null,
    after,
    ready: !touring,
  };
}
