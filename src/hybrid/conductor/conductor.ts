/**
 * The hybrid conductor (plan v2 A2): walks a method question frame by frame
 * in the student's own order, judges every act with the engine, and returns
 * the prepared reply (src/method/replies.ts, the content's hints) plus the
 * tier that should answer: instant (no AI call), light (Haiku) or deep
 * (Sonnet), with the reason. Pure: (context, state, act) -> (state, out).
 * Only an engine credit, a right pick or a finished stage moves the route;
 * an AI move can change what he reads, never where he is.
 *
 * A card that has a prepared small example (src/ai/move/prepared.ts, a
 * probability tree counted whole) opens it by itself on the second «ما
 * نعرفش», free, before any AI call (fix list S1); its lines are judged on
 * the example first, and the bridge (bridge.ts) brings him back.
 *
 * Not used by design (excluded from the hybrid lesson, plan v2): the old
 * variants (sim-1-total-1/2, alt-1-s4-boxes), the deep dive dd_count_draws,
 * the c_total walkthrough, the third hint of each frame (it gives the
 * formula), and the planner's self-report / offer / escalate machinery.
 */
import {
  autoCheck,
  recordLine,
  type StudentAct,
} from '../../ai/checks/autoCheck';
import { judgeLine } from '../../ai/tools/compute';
import { mathSegments } from '../../ai/checks/freeText';
import { preparedFor, preparedForCard } from '../../ai/move/prepared';
import type { QuestionPack } from '../../ai/packs/build';
import {
  credit,
  newSession,
  restoreRuntime,
  workedSet,
  type CaseSpec,
  type SessionRuntime,
} from '../../ai/session/state';
import { exercisePack } from '../../ai/tutor';
import {
  stepKey,
  type LoadedExercise,
  type ResolvedAnswer,
} from '../../content/loader';
import type { MethodFrameStep, Rich, Step } from '../../content/schema';
import { buildContent, type LessonContent } from '../../lesson/session/lesson';
import { evaluateLine, type LineEvaluation } from '../../method/frame';
import { evalChain, isLiteralValue } from '../../method/lineChain';
import { recap } from '../../method/narration';
import {
  replyForCards,
  replyForLine,
  replyForPlan,
  replyForRead,
  replyForRecipe,
  replyForRepairStage,
  reviewSimilar,
  type ReplyPart,
} from '../../method/replies';
import {
  methodRevealRich,
  nextShortFor,
  stepOrderFor,
} from '../../method/route';
import { treeCaseView } from '../figure';
import type { Move } from '../mover';
import {
  isTouring,
  newTour,
  tourAct,
  tourFor,
  tourReplaces,
  type Carried,
  type Trip,
} from '../tour/tour';
import {
  tierOf,
  type ActOut,
  type ConductorState,
  type FrameProgress,
  type FrameView,
  type Reason,
} from './types';
import { caseBridge, treeBridge, treeOpening } from './bridge';

/** The longest line kept (as in the lesson). */
const LINE_MAX = 200;
/** Hints of the ladder the conductor gives (the third one gives the formula). */
const HINTS_USED = 2;
/** Wrong plans before the plan is shown. */
const PLAN_SHOWN_AFTER = 3;

/** Everything the conductor reads but never stores (rebuilt from the content). */
export interface QuestionCtx {
  exerciseId: string;
  questionId: string;
  loaded: LoadedExercise;
  content: LessonContent;
  pack: QuestionPack;
  /** The method frames by id. */
  frames: Map<string, MethodFrameStep>;
  /** The steps of the method group (for his order). */
  groupSteps: readonly Step[];
  /** The question trip (src/content/trips.*.json), or null. */
  tour: Trip | null;
}

export function questionCtx(
  loaded: LoadedExercise,
  raw: Parameters<typeof exercisePack>[1],
  questionId: string,
): QuestionCtx {
  const content = buildContent(loaded, questionId);
  const pack = exercisePack(loaded, raw).questions.get(questionId);
  if (!pack) {
    throw new Error(`no question ${questionId}`);
  }
  const frames = new Map<string, MethodFrameStep>();
  let groupSteps: readonly Step[] = [];
  for (const g of content.question.groups) {
    for (const s of g.steps) {
      if (s.kind === 'mframe') {
        frames.set(s.id, s);
        groupSteps = g.steps;
      }
    }
  }
  const hasPlan = [...frames.values()].some(st => st.frame.type === 'plan');
  return {
    exerciseId: loaded.exercise.id,
    questionId,
    loaded,
    content,
    pack,
    frames,
    groupSteps,
    tour: hasPlan ? tourFor(loaded.exercise.id, questionId) : null,
  };
}

const emptyProgress = (): FrameProgress => ({
  attempts: 0,
  dontKnows: 0,
  hints: 0,
  slips: {},
  shown: [],
  lines: [],
  stage: 0,
  listFails: 0,
});

/**
 * A new question. With a trip, the trip is shown first and the plan and the
 * word to read leave the route (the trip shows them); `carried` are his
 * results of earlier questions (from the records), for the road and reuse.
 */
export function startQuestion(
  ctx: QuestionCtx,
  opts: { carried?: Carried } = {},
): ConductorState {
  const rt = newSession(
    ctx.exerciseId,
    ctx.questionId,
    ctx.pack.main,
    ctx.pack.given,
  );
  return {
    v: 1,
    exerciseId: ctx.exerciseId,
    questionId: ctx.questionId,
    route: [...ctx.frames.keys()].filter(
      id => !ctx.tour || !tourReplaces(ctx.frames.get(id)!),
    ),
    at: 0,
    progress: emptyProgress(),
    planOrder: null,
    facts: {},
    picks: {},
    nodeLines: {},
    session: rt.state,
    turn: 0,
    done: ctx.frames.size === 0,
    onCase: null,
    tour: ctx.tour ? newTour() : null,
    carried: opts.carried ?? {},
  };
}

const frameOf = (ctx: QuestionCtx, s: ConductorState) => {
  const id = s.route[s.at];
  return id === undefined ? undefined : ctx.frames.get(id);
};

const answerOf = (ctx: QuestionCtx, step: MethodFrameStep) =>
  ctx.loaded.answers.get(stepKey.main(ctx.questionId, step.id)) as
    | ResolvedAnswer
    | undefined;

/** The frame he is on; null after the end and while the trip is shown (see roadView). */
export function view(ctx: QuestionCtx, s: ConductorState): FrameView | null {
  const step = s.done || isTouring(ctx, s) ? undefined : frameOf(ctx, s);
  if (!step) {
    return null;
  }
  return {
    frameId: step.id,
    type: step.frame.type,
    prompt: 'prompt' in step ? (step.prompt as Rich) : null,
    header: 'header' in step ? (step.header as FrameView['header']) : null,
    hintsLeft: hintsLeft(step, s.progress),
  };
}

function hintsLeft(step: MethodFrameStep, p: FrameProgress): number {
  const hints = 'hints' in step ? (step.hints as Rich[] | undefined) ?? [] : [];
  return Math.max(0, Math.min(HINTS_USED, hints.length) - p.hints);
}

/** The next hint of the ladder (not counted yet); null when none is left. */
function nextHint(step: MethodFrameStep, p: FrameProgress): ReplyPart | null {
  if (hintsLeft(step, p) === 0) {
    return null;
  }
  const rich = ((step as { hints?: Rich[] }).hints ?? [])[p.hints];
  return rich ? { kind: 'feedback', tone: 'info', rich } : null;
}

/**
 * A prepared reply for an AI tier ending with the next hint: the hint counts
 * only if the prepared reply is shown (applyFallback), an AI move keeps it.
 */
const withHint = (o: ActOut, hint: ReplyPart | null): ActOut =>
  hint ? { ...o, reply: [...o.reply, hint], hintPending: true } : o;

/**
 * An AI move was shown. It never moves the route; a move on a small case
 * keeps the case (his next lines may be about it).
 */
export function applyMove(prev: ConductorState, move: Move): ConductorState {
  if (!move.case) {
    return prev;
  }
  const s = JSON.parse(JSON.stringify(prev)) as ConductorState;
  s.session.cases[move.case.id] = move.case.spec;
  s.onCase = move.case.id;
  return s;
}

/** The prepared reply was shown instead of an AI move: its hint is used up. */
export function applyFallback(prev: ConductorState, o: ActOut): ConductorState {
  if (!o.hintPending || o.tier === 'instant') {
    return prev;
  }
  const s = JSON.parse(JSON.stringify(prev)) as ConductorState;
  s.progress.hints += 1;
  return s;
}

function advance(s: ConductorState): void {
  s.at += 1;
  s.progress = emptyProgress();
  if (s.at >= s.route.length) {
    s.done = true;
  }
}

const out = (
  reason: Reason,
  reply: ReplyPart[],
  advanced = false,
  extra: Partial<ActOut> = {},
): ActOut => ({ tier: tierOf(reason), reason, reply, advanced, ...extra });

/** One student act: the new state and what to answer. */
export function act(
  ctx: QuestionCtx,
  prev: ConductorState,
  a: StudentAct,
): { state: ConductorState; out: ActOut } {
  const s = JSON.parse(JSON.stringify(prev)) as ConductorState;
  if (isTouring(ctx, s)) {
    s.turn += 1;
    s.session.turn = s.turn;
    return { state: s, out: tourAct(ctx, s, a) ?? out('not_now', []) };
  }
  const step = s.done ? undefined : frameOf(ctx, s);
  if (!step) {
    return { state: s, out: out('not_now', []) };
  }
  s.turn += 1;
  s.session.turn = s.turn;
  const rt = restoreRuntime(s.session, ctx.pack.main);
  const p = s.progress;

  if (a.kind === 'dont_know') {
    p.dontKnows += 1;
    s.session.dontKnows += 1;
    // On a small tree example he is stuck on the example: its own hint, once.
    const caseHint = treeCaseHint(ctx, s);
    if (caseHint) {
      return { state: s, out: out('case_note', [caseHint]) };
    }
    const hint = nextHint(step, p);
    if (p.dontKnows === 1 && hint) {
      p.hints += 1;
      return { state: s, out: out('hint', [hint]) };
    }
    // Stuck again on a card that has a prepared small example: it opens by
    // itself, free, before any AI call (S1). Its counts are on screen from
    // now on (known numbers).
    const example =
      step.frame.type === 'lines'
        ? preparedForCard(ctx.exerciseId, ctx.questionId, step.frame.key)
        : null;
    const counts = example ? treeCaseView(example) : null;
    if (example && counts && s.session.cases[example.id] === undefined) {
      s.session.cases[example.id] = example.spec;
      s.onCase = example.id;
      for (const n of counts.visible) {
        if (!s.session.known.includes(String(n))) {
          s.session.known.push(String(n));
        }
      }
      return { state: s, out: out('case_open', [treeOpening()]) };
    }
    // Stuck again: the deep tier finds a smaller step; the prepared reply is
    // the next hint, else what "show me" gives (he still writes it himself).
    const answer = answerOf(ctx, step);
    if (hint || !answer) {
      return { state: s, out: withHint(out('stuck_again', []), hint) };
    }
    return {
      state: s,
      out: out('stuck_again', [
        {
          kind: 'feedback',
          tone: 'info',
          rich: methodRevealRich(step, answer),
        },
      ]),
    };
  }
  if (a.kind === 'free') {
    // A sentence with a calculation in it is his own claim: the deep tier tests it.
    const claim = mathSegments(a.text).length > 0;
    return {
      state: s,
      out: withHint(
        out(claim ? 'claim' : 'free_text', [
          { kind: 'student', content: { kind: 'typed', raw: a.text } },
        ]),
        nextHint(step, p),
      ),
    };
  }

  const f = step.frame;
  // On a small case an AI move proposed: he lists its groups, or comes back.
  if (s.onCase) {
    const spec = s.session.cases[s.onCase];
    if (a.kind === 'continue') {
      s.onCase = null;
      return { state: s, out: out('case_back', []) };
    }
    if (a.kind === 'list' && spec && spec.kind !== 'tree') {
      const r = autoCheck(
        a,
        { kind: 'list', case_id: s.onCase, size: spec.k },
        rt,
        ctx.pack,
      );
      const complete =
        (r.result.engine as { complete?: boolean } | undefined)?.complete ===
        true;
      // A box listed whole: the case closes, the bridge leads to the question.
      if (complete && spec.kind === 'box') {
        s.onCase = null;
        return { state: s, out: out('case_done', caseBridge(ctx, rt, spec)) };
      }
      return {
        state: s,
        out: out('case_line', [
          complete
            ? { kind: 'message', tone: 'success', message: 'correct' }
            : { kind: 'message', tone: 'info', message: 'wrong' },
        ]),
      };
    }
  }
  // He used a component an AI move showed («كمّلت»): worth a remark; the
  // route stays. The tap carries no answer, so it never spends or shows a
  // hint: the prepared reply only sends him back to his step.
  if (a.kind === 'component' && f.type !== 'repair') {
    const prompt = view(ctx, s)?.prompt;
    return {
      state: s,
      out: out(
        'component_result',
        prompt ? [{ kind: 'feedback', tone: 'info', rich: prompt }] : [],
      ),
    };
  }
  switch (f.type) {
    case 'plan': {
      if (a.kind !== 'order') {
        break;
      }
      const order = a.ids.slice(0, 8);
      const { verdict, parts } = replyForPlan(f.cards, order);
      if (verdict.ok) {
        s.planOrder = order;
        s.session.planOrder = order;
        const route = stepOrderFor(ctx.groupSteps, order).filter(id =>
          ctx.frames.has(id),
        );
        s.route = route;
        s.at = route.indexOf(step.id);
        advance(s);
        return { state: s, out: out('plan_ok', parts, true) };
      }
      p.attempts += 1;
      const answer = answerOf(ctx, step);
      if (p.attempts >= PLAN_SHOWN_AFTER && answer) {
        return {
          state: s,
          out: out('plan_shown', [
            ...parts,
            {
              kind: 'feedback',
              tone: 'info',
              rich: methodRevealRich(step, answer),
            },
          ]),
        };
      }
      return { state: s, out: out('plan_wrong', parts) };
    }
    case 'read': {
      if (a.kind !== 'tap_word') {
        break;
      }
      const { verdict, parts } = replyForRead(f, a.token.slice(0, 40));
      if (verdict.ok) {
        s.facts = { ...s.facts, ...verdict.effect };
        advance(s);
        return { state: s, out: out('read_ok', parts, true) };
      }
      p.attempts += 1;
      return { state: s, out: out('read_wrong', parts) };
    }
    case 'lines':
      if (a.kind === 'line') {
        return { state: s, out: onLine(ctx, s, rt, step, a) };
      }
      break;
    case 'cards': {
      if (a.kind !== 'choice') {
        break;
      }
      const answer = answerOf(ctx, step);
      if (answer?.kind !== 'method' || answer.frame !== 'cards') {
        break;
      }
      const reply = replyForCards(f, a.optionId, {
        graph: answer.graph,
        lines: s.nodeLines,
        misconceptions: ctx.loaded.misconceptions,
        shown: p.shown,
      });
      if (!reply) {
        break;
      }
      if (reply.verdict.correct) {
        s.picks[step.id] = a.optionId;
        advance(s);
        return { state: s, out: out('pick_ok', reply.parts, true) };
      }
      p.attempts += 1;
      if (reply.verdict.explained !== undefined) {
        p.shown.push(reply.verdict.explained);
      }
      return {
        state: s,
        out: out(p.attempts === 1 ? 'pick_wrong' : 'pick_again', reply.parts),
      };
    }
    case 'repair': {
      const answer = answerOf(ctx, step);
      const st = f.stages[p.stage];
      const rs =
        answer?.kind === 'method' && answer.frame === 'repair'
          ? answer.stages[p.stage]
          : undefined;
      const value =
        a.kind === 'component'
          ? ({ explored: true } as const)
          : a.kind === 'continue'
          ? ({ ack: true } as const)
          : a.kind === 'list'
          ? { list: a.groups }
          : a.kind === 'line'
          ? { mline: a.raw }
          : a.kind === 'choice'
          ? { card: a.optionId }
          : null;
      if (!st || !rs || !value) {
        break;
      }
      const reply = replyForRepairStage(st, rs, value, {
        listFails: p.listFails,
        misconceptions: ctx.loaded.misconceptions,
        lines: s.nodeLines,
        lineMax: LINE_MAX,
      });
      if (reply.listFailed) {
        p.listFails += 1;
      }
      let advanced = false;
      if (reply.done) {
        p.stage += 1;
        p.listFails = 0;
        if (p.stage >= f.stages.length) {
          advance(s);
          advanced = true;
        }
      }
      // What he saw in a component is worth a remark; the stage moves without it.
      return {
        state: s,
        out: out(
          a.kind === 'component' ? 'component_result' : 'stage',
          reply.parts,
          advanced,
        ),
      };
    }
    case 'recipe': {
      if (a.kind !== 'order') {
        break;
      }
      const reply = replyForRecipe(f, a.ids);
      if (!reply) {
        break;
      }
      advance(s);
      return { state: s, out: out('recipe', reply.parts, true) };
    }
    case 'similar': {
      if (a.kind === 'line') {
        const raw = a.raw.slice(0, LINE_MAX);
        p.lines.push(raw);
        // Nothing is said while he writes; the review comes on submit.
        return {
          state: s,
          out: out('similar_line', [
            { kind: 'student', content: { kind: 'typed', raw } },
          ]),
        };
      }
      const answer = answerOf(ctx, step);
      if (
        a.kind !== 'continue' ||
        p.lines.length === 0 ||
        answer?.kind !== 'method' ||
        answer.frame !== 'similar'
      ) {
        break;
      }
      const review = reviewSimilar(answer.graph, answer.table, p.lines);
      const other = review.reviews.some(r => r.outcome === 'other');
      advance(s);
      return {
        state: s,
        out: out(
          other ? 'similar_other' : 'similar_review',
          review.parts,
          true,
        ),
      };
    }
  }
  return { state: s, out: out('not_now', []) };
}

/**
 * The hint of the small tree example he is on, the first time he says «ما
 * نعرفش» there (null: no tree open, no hint authored, or given already).
 */
function treeCaseHint(ctx: QuestionCtx, s: ConductorState): ReplyPart | null {
  const id = s.onCase;
  if (id === null || s.session.cases[id]?.kind !== 'tree') {
    return null;
  }
  const given = s.progress.caseHints ?? [];
  const hint = preparedFor(ctx.exerciseId, ctx.questionId).find(
    e => e.id === id,
  )?.hint;
  if (!hint || given.includes(id)) {
    return null;
  }
  s.progress.caseHints = [...given, id];
  return { kind: 'feedback', tone: 'info', rich: hint };
}

/**
 * A line while a small tree example is open, judged on the example first
 * (the node it rehearses). Right: the example closes with the bridge to the
 * question. A known slip: its prepared text, at once. Null: the line is the
 * question's (it credits it, so he is back there), or it is not a finished
 * line (the usual notes). Anything else is about the example: nothing is
 * counted against him on the question's step.
 */
function treeCaseLine(
  ctx: QuestionCtx,
  s: ConductorState,
  rt: SessionRuntime,
  caseId: string,
  spec: Extract<CaseSpec, { kind: 'tree' }>,
  raw: string,
  ev: LineEvaluation,
): ActOut | null {
  const expect = { kind: 'node' as const, graph: caseId, node: spec.node };
  const typed: ReplyPart = { kind: 'student', content: { kind: 'typed', raw } };
  const wrong: ReplyPart = { kind: 'message', tone: 'info', message: 'wrong' };
  const match = judgeLine(rt, raw, expect).match;
  if (match?.verdict === 'credit') {
    // Built before his line joins the session (see treeBridge).
    const bridge = treeBridge(ctx, rt, spec, raw);
    recordLine(rt, raw, expect);
    s.onCase = null;
    return out('case_done', [typed, ...bridge]);
  }
  if (match?.verdict === 'slip') {
    recordLine(rt, raw, expect);
    const lib = ctx.loaded.misconceptions.get(`mut.${match.slip}`);
    const text = lib?.feedbackConfirmed ?? lib?.feedback;
    return text
      ? out('case_note', [
          typed,
          { kind: 'feedback', tone: 'warning', rich: text },
        ])
      : out('case_line', [typed, wrong]);
  }
  const o = ev.outcome.kind;
  if (
    o === 'credit' ||
    o === 'support' ||
    o === 'unreadable' ||
    o === 'unfinished' ||
    o === 'mismatch'
  ) {
    return null;
  }
  recordLine(rt, raw, expect);
  return out('case_line', [typed, wrong]);
}

/**
 * His line of a node he finished in two lines: the earlier calculation,
 * then this line. When this line starts where the earlier one stopped
 * (`3/12 = 1/4` after `… = 3/12`) that side is written once; a line that is
 * only values continues the earlier one; a line with a calculation of its
 * own stands alone. The line just written is the session's last.
 */
function joinedLine(s: ConductorState, node: string, raw: string): string {
  const earlier = s.session.lines
    .slice(0, -1)
    .filter(
      l =>
        l.graph === 'main' &&
        l.match?.verdict === 'credit' &&
        l.match.node === node,
    )
    .at(-1)?.raw;
  if (earlier === undefined) {
    return raw;
  }
  const tidy = (side: string | undefined) => (side ?? '').replace(/\s+/g, '');
  const sides = raw.split('=');
  const chain = evalChain(raw);
  const onlyValues =
    chain.kind === 'bare' ||
    (chain.kind === 'chain' && chain.sides.every(x => isLiteralValue(x.ast)));
  const rest =
    tidy(earlier.split('=').at(-1)) === tidy(sides[0])
      ? sides.slice(1)
      : onlyValues
      ? sides
      : [];
  const joined = rest.length > 0 ? [earlier, ...rest].join('=') : raw;
  return joined.length <= LINE_MAX ? joined : raw;
}

function onLine(
  ctx: QuestionCtx,
  s: ConductorState,
  rt: SessionRuntime,
  step: MethodFrameStep,
  a: Extract<StudentAct, { kind: 'line' }>,
): ActOut {
  const f = step.frame;
  const answer = answerOf(ctx, step);
  if (
    f.type !== 'lines' ||
    answer?.kind !== 'method' ||
    answer.frame !== 'lines'
  ) {
    return out('not_now', []);
  }
  const p = s.progress;
  let raw = a.raw.slice(0, LINE_MAX);
  const credited = new Set(s.session.credited.main ?? []);
  const worked = workedSet(s.session, 'main');
  let ev = evaluateLine({
    raw,
    graph: answer.graph,
    table: answer.table,
    card: f.key,
    credited,
    extra: answer.extra,
    worked,
  });
  // An ambiguous division ("720/3*2*1"): he says how he meant it first.
  if (ev.readback && !a.readback) {
    return out('readback', [], false, {
      readback: { literal: raw, grouped: ev.readback.grouped },
    });
  }
  if (ev.readback && a.readback === 'grouped') {
    raw = ev.readback.grouped;
    ev = evaluateLine({
      raw,
      graph: answer.graph,
      table: answer.table,
      card: f.key,
      credited,
      extra: answer.extra,
      worked,
    });
  }
  // On a small case an AI move proposed, the case judges first: a line it
  // reads (right or a slip) is about the case (its right lines often look
  // like steps of the exam's urn: 6 on a box of four is also 3!). A box's
  // groups found close the case with the bridge to the question. Anything
  // else is judged on the question, and a line the question credits brings
  // him back.
  const spec = s.onCase ? s.session.cases[s.onCase] : undefined;
  if (s.onCase && spec?.kind === 'tree') {
    const onCase = treeCaseLine(ctx, s, rt, s.onCase, spec, raw, ev);
    if (onCase) {
      return onCase;
    }
  } else if (s.onCase && spec) {
    const expect = {
      kind: 'node' as const,
      graph: s.onCase,
      node:
        spec.kind === 'box' ? 'groups' : f.key === 'ratio' ? 'result' : f.key,
    };
    const peek = judgeLine(rt, raw, expect).match?.verdict;
    if (peek && peek !== 'no_match') {
      const { line } = recordLine(rt, raw, expect);
      const right = line.match?.verdict === 'credit';
      const typed: ReplyPart = {
        kind: 'student',
        content: { kind: 'typed', raw },
      };
      if (right && spec.kind === 'box') {
        s.onCase = null;
        return out('case_done', [typed, ...caseBridge(ctx, rt, spec)]);
      }
      return out('case_line', [
        typed,
        right
          ? { kind: 'message', tone: 'success', message: 'correct' }
          : { kind: 'message', tone: 'info', message: 'wrong' },
      ]);
    }
  }
  if (
    s.onCase &&
    (ev.outcome.kind === 'credit' || ev.outcome.kind === 'support')
  ) {
    s.onCase = null;
  }
  const main = answer.graph.nodes.find(n => n.planCard === f.key && n.main);
  // The line goes into the shared session (his L1.., the values he wrote),
  // but only the conductor credits: the recorder's own credit is undone
  // (an unsimplified 60/120 is not the result yet).
  const before = [...(s.session.credited.main ?? [])];
  recordLine(
    rt,
    raw,
    main ? { kind: 'node', graph: 'main', node: main.id } : null,
  );
  s.session.credited.main = before;
  const reply = replyForLine(ev.outcome, {
    raw,
    misconceptions: ctx.loaded.misconceptions,
    shown: p.shown,
    target:
      step.target &&
      answer.graph.nodes.some(n => n.planCard === f.key && n.role === 'result')
        ? step.target
        : null,
    recap: () =>
      recap(
        step.short ?? { ar: [{ ar: '?' }] },
        nextShortFor(step, f.cardId, s.planOrder ?? undefined),
        raw,
      ),
  });
  const v = reply.verdict;
  if (v.kind === 'unreadable') {
    return out('unreadable', reply.parts);
  }
  if (v.kind === 'ungraded') {
    return out('line_note', reply.parts);
  }
  if (v.kind === 'credit') {
    if (!v.unsimplified) {
      credit(s.session, 'main', v.node);
      // A node that asks for its calculation (`proof`), written on an
      // earlier line and finished now (`… = 3/12`, then `3/12 = 1/4`): the
      // two lines together are his line of the node.
      const proof =
        answer.graph.nodes.find(n => n.id === v.node)?.proof === true;
      s.nodeLines[v.node] =
        proof && worked.has(v.node) ? joinedLine(s, v.node, raw) : raw;
    }
    if (v.completes) {
      advance(s);
      return out('credit', reply.parts, true);
    }
    return out('line_note', reply.parts);
  }
  // A wrong line.
  p.attempts += 1;
  if (v.explained !== undefined) {
    p.shown.push(v.explained);
  }
  let reason: Reason;
  if (v.misconceptionId === undefined) {
    reason = 'undiagnosed';
  } else {
    const seen = (p.slips[v.misconceptionId] ?? 0) + 1;
    p.slips[v.misconceptionId] = seen;
    reason =
      seen === 1
        ? v.explained !== undefined
          ? 'slip_first'
          : 'slip_no_reply'
        : seen === 2
        ? 'slip_again'
        : 'slip_third';
  }
  // A prepared reply never ends with nothing new: when it explains nothing,
  // the next hint goes with it.
  const explains = reply.parts.some(x => x.kind === 'feedback');
  return tierOf(reason) !== 'instant' && !explains
    ? withHint(out(reason, reply.parts), nextHint(step, p))
    : out(reason, reply.parts);
}
