/**
 * Situation: the compact, serializable input of a planner decision, built from
 * the event log only (so the lesson and tools/replay build the same thing).
 * It becomes the LLM context pack in Phase 4: keep it small, ids and numbers
 * only. Free student text is allowed in exactly one field: `request.text`
 * (situation.test.ts enforces it). No student or session ids.
 */
import { eventStepKey, stepInfo, type Catalog } from '../state/catalog';
import { THRESHOLDS } from '../state/config';
import {
  deriveState,
  shownRepresentation,
  type SkillStatus,
} from '../state/derive';
import { parseNumeric } from '../engine/format';
import type { Event } from '../telemetry/events';
import type { ClarifyChoice, VariantKind } from '../content/schema';
import type { ActionKind, Trigger } from './schema';
import { attemptOutcomes, type OutcomeClass } from '../state/outcomes';

export interface Detour {
  kind: 'deep_dive' | 'variant';
  id: string;
  representation: string;
  variantKind?: VariantKind;
  round?: number;
  /** open; completed/abandoned (deep dives); correct/wrong/revealed/abandoned (variants). */
  outcome: string;
  /** Deep dives: the mini question was answered right on the first try. */
  miniCorrect?: boolean;
  /** Deep dives: did it help (task minis: right with at most one wrong try). */
  helped?: boolean;
  /** Opened by a planner rule (reaction) rather than by default content. */
  ruleId?: string;
}

export interface Situation {
  trigger: Trigger;
  exerciseId: string;
  contentVersion: string;
  questionId: string;
  step: {
    key: string;
    scope: 'main' | 'mini' | 'variant' | 'unknown';
    skills: string[];
    /** Wrong answers on this step (this visit and earlier ones in the session). */
    wrong: number;
    notSure: number;
    /** wrong + not_sure: the ask_clarify threshold counts both (PLANNER.md). */
    struggle: number;
    hintsUsed: number;
    hintCount: number;
    /** Exact wrong values: option ids or numeric input only (never free text). */
    wrongValues: { value: string | null; misconceptionId?: string }[];
    last?: {
      correct: boolean;
      /** Option id or numeric input; null when not numeric. */
      value: string | null;
      attempt: number;
      durationMs?: number;
      /** Lines: the goal form typed as the first line (no reasoning shown). */
      jumped?: boolean;
    };
    timeOnStepMs?: number;
    revealed: boolean;
    /**
     * Lines steps: the engine's verdict on the last checked line. `raw` is
     * the typed math line (math characters only, else omitted); `at` the
     * values at the first disagreeing sample point (wrong lines).
     */
    line?: {
      verdict: 'wrong' | 'invalid';
      raw?: string;
      where?: string;
      reason?: string;
      parentheses?: string;
      at?: { x: number; student: number; expected: number };
    };
  };
  /** Open detours, innermost last (deep dives and variants). */
  stack: { kind: Detour['kind']; id: string; variantKind?: VariantKind }[];
  depth: number;
  /** Detours opened from this step (any outcome). */
  detours: Detour[];
  /** Components shown in this question (most recent last, capped), and whether the student used them. */
  componentsShown: {
    component: string;
    stepKey: string;
    used: boolean;
    snapshot?: Record<string, unknown>;
  }[];
  /** Union over the step's skills (derived state). */
  representationsTried: string[];
  /** Planner decisions on this step, oldest first. */
  decisions: { ruleId: string; kind: ActionKind; representation?: string }[];
  requests: { kind: 'change_method' | 'simpler' | 'ask'; via?: string }[];
  /** Repair offers on this step the student declined (variant ids): not proposed again. */
  declinedOffers: string[];
  clarify: ClarifyChoice[];
  selfReports: {
    stepKey: string;
    value: 'understood' | 'guessed' | 'dismissed';
  }[];
  question: {
    cleanStreak: number;
    /** The clean streak has at least one typed or task answer (not only option taps). */
    cleanStreakActed: boolean;
    selfReportsAsked: number;
    compressOffered: boolean;
    compressed: boolean;
    transfersDone: string[];
    variantsShown: string[];
    deepDivesShown: string[];
    /** Rounds of the mini-example loop already played for this step. */
    exampleRounds: { variantId: string; round: number; outcome: string }[];
    /** Open prerequisite variants on the stack. */
    prerequisiteLevel: number;
    teacherNotes: number;
  };
  skills: Record<
    string,
    {
      status: SkillStatus;
      representationsTried: string[];
      /** Misconception id -> times seen (all sessions), when any. */
      misconceptions?: Record<string, number>;
      /** "Change method" / "easier" taps on this skill (all sessions). */
      helpRequests: { changeMethod: number; easier: number };
    }
  >;
  /** Counts over the whole session (all questions). */
  session: {
    selfReportsAsked: number;
    /** D2: fresh variants opened after a reveal in this session (variant ids). */
    freshAfterReveal?: string[];
    /** E1: finished attempts in this session, in order. */
    outcomes?: {
      stepKey: string;
      outcome: OutcomeClass;
      skills: readonly string[];
    }[];
    /** E2: repeats and step-backs made (skills; question). */
    moves?: {
      move: 'repeat' | 'step_back';
      skills: readonly string[];
      questionId: string;
    }[];
  };
  /** The only field allowed to carry the student's own words (an ask). */
  request?: { text: string };
}

const COMPONENTS_KEPT = 8;

/** A typed math line, kept only when it is math characters (never free text). */
const MATH_LINE = /^[0-9xe+\-*/^().,\s]{1,80}$/;

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(v)
    ? v.slice(0, max)
    : undefined;

/** The engine's verdict on the last checked line of this step, if any. */
function lineOf(onStep: readonly Event[]): Situation['step']['line'] {
  const e = [...onStep]
    .reverse()
    .find(
      x =>
        x.t === 'component_event' &&
        x.component === 'LinesEditor' &&
        (x.name === 'line_wrong' || x.name === 'invalid_input'),
    );
  if (e?.t !== 'component_event') {
    return undefined;
  }
  const p = e.payload;
  const raw = typeof p.raw === 'string' && MATH_LINE.test(p.raw) ? p.raw : '';
  const at =
    p.at && typeof p.at === 'object' && !Array.isArray(p.at)
      ? (p.at as Record<string, unknown>)
      : undefined;
  const x = num(at?.x);
  const student = num(at?.student);
  const expected = num(at?.expected);
  const where = str(p.where, 20);
  const reason = str(p.reason, 40);
  const parentheses = str(p.parentheses, 20);
  return {
    verdict: e.name === 'line_wrong' ? 'wrong' : 'invalid',
    ...(raw && { raw }),
    ...(where && { where }),
    ...(reason && { reason }),
    ...(parentheses && { parentheses }),
    ...(x !== undefined &&
      student !== undefined &&
      expected !== undefined && { at: { x, student, expected } }),
  };
}

/** Option ids (content ids) for choices; typed input only when it is a number; never task objects. */
function answerValue(a: Extract<Event, { t: 'answer' }>): string | null {
  if (typeof a.value !== 'string') {
    return null;
  }
  if (a.kind === 'choice' || a.kind === 'ordering') {
    return /^[A-Za-z0-9_.-]{1,40}$/.test(a.value) ? a.value : null;
  }
  return a.kind === 'typed' && parseNumeric(a.value).ok
    ? a.value.slice(0, 20)
    : null;
}

const TRIGGER_OF: Partial<Record<Event['t'], Trigger>> = {
  not_sure: 'not_sure',
  request: 'request',
  clarify: 'clarify',
  self_report: 'self_report',
  deepdive: 'detour_closed',
};

/** C3: the misconception the student picked on the probe card after this wrong answer. */
function probedMisconception(
  onStep: readonly Event[],
  answer: Extract<Event, { t: 'answer' }>,
): string | undefined {
  const i = onStep.indexOf(answer);
  const probe = onStep
    .slice(i + 1)
    .find(
      (e): e is Extract<Event, { t: 'probe' }> =>
        e.t === 'probe' && e.value === answer.value,
    );
  return probe?.choice ?? undefined;
}

/** The trigger an event stands for, if it is a decision point. */
export function triggerOf(e: Event): Trigger | null {
  if (e.t === 'answer') {
    if (!e.correct) {
      return 'wrong';
    }
    // A correct mini / variant answer closes its detour: that event is the trigger.
    return e.stepId.startsWith('dd:') || e.stepId.startsWith('var:')
      ? null
      : 'correct';
  }
  if (
    e.t === 'component_event' &&
    e.component === 'Variant' &&
    e.name === 'closed'
  ) {
    return 'detour_closed';
  }
  // D2: a main step revealed (a variant's reveal closes it: detour_closed).
  if (e.t === 'reveal') {
    return e.stepId.startsWith('dd:') || e.stepId.startsWith('var:')
      ? null
      : 'revealed';
  }
  // C3: the planner reacts to a probed wrong answer once the card is answered.
  if (e.t === 'probe') {
    return e.movedOn ? null : 'wrong';
  }
  if (
    e.t === 'component_event' &&
    e.component === 'LinesEditor' &&
    e.name === 'invalid_input'
  ) {
    return 'line_invalid';
  }
  return TRIGGER_OF[e.t] ?? null;
}

/**
 * Builds the situation at the last event of `events` that is a decision point
 * (or at `at`, an index into `events`). Only events of the same session and
 * question are read, plus earlier sessions for skill state.
 */
export function buildSituation(
  events: readonly Event[],
  catalog: Catalog,
  opts: { at?: number; requestText?: string } = {},
): Situation | null {
  let at = opts.at ?? events.length - 1;
  while (at >= 0 && triggerOf(events[at]!) === null) {
    at -= 1;
  }
  const trig = events[at];
  if (!trig) {
    return null;
  }
  const trigger = triggerOf(trig)!;
  const upTo = events.slice(0, at + 1);
  const same = upTo.filter(
    e => e.sessionId === trig.sessionId && e.questionId === trig.questionId,
  );
  const key = eventStepKey(trig);
  const info = stepInfo(catalog, trig);
  const onStep = same.filter(e => eventStepKey(e) === key);

  // --- the step --------------------------------------------------------------
  const answers = onStep.filter(
    (e): e is Extract<Event, { t: 'answer' }> => e.t === 'answer',
  );
  const wrongs = answers.filter(a => !a.correct);
  const notSure = onStep.filter(e => e.t === 'not_sure').length;
  // Help taps and long-press asks with no verified answer: struggle signals.
  const helpTaps = onStep.filter(
    e => e.t === 'request' || (e.t === 'ask' && e.unanswered === true),
  ).length;
  const lastAnswer = answers[answers.length - 1];

  // --- stack of open detours ----------------------------------------------------
  const stack: Situation['stack'] = [];
  const detours: Detour[] = [];
  const byOpen = new Map<string, Detour>();
  const componentsShown: Situation['componentsShown'] = [];
  const decisions: Situation['decisions'] = [];
  const requests: Situation['requests'] = [];
  const declinedOffers: string[] = [];
  let pendingOffer: string | undefined;
  const clarify: ClarifyChoice[] = [];
  const selfReports: Situation['selfReports'] = [];
  const exampleRounds: Situation['question']['exampleRounds'] = [];
  const transfersDone: string[] = [];
  const variantsShown: string[] = [];
  const deepDivesShown: string[] = [];
  let cleanStreak = 0;
  let cleanStreakActed = false;
  let selfReportsAsked = 0;
  let compressOffered = false;
  let compressed = false;
  let teacherNotes = 0;
  /** Steps where help was used or an attempt failed (their correct answer is not clean). */
  const dirty = new Set<string>();

  for (const e of same) {
    const k = eventStepKey(e);
    if (
      (e.t === 'answer' && !e.correct) ||
      e.t === 'not_sure' ||
      e.t === 'hint' ||
      e.t === 'reveal'
    ) {
      dirty.add(k);
    }
    switch (e.t) {
      case 'component_event': {
        if (
          e.name === 'shown' &&
          (e.component === 'DeepDive' || e.component === 'Variant')
        ) {
          dirty.add(k);
        }
        if (e.name === 'shown' && e.component === 'DeepDive') {
          const id = String(e.payload.deepDiveId);
          const d: Detour = {
            kind: 'deep_dive',
            id,
            representation: shownRepresentation(e),
            outcome: 'open',
            ...(e.reaction && { ruleId: e.reaction.reactionId }),
          };
          stack.push({ kind: 'deep_dive', id });
          byOpen.set(`dd:${id}`, d);
          pushOnce(deepDivesShown, id);
          if (k === key) {
            detours.push(d);
          }
        } else if (e.name === 'shown' && e.component === 'Variant') {
          const id = String(e.payload.variantId);
          const vk = e.payload.kind as VariantKind;
          const round =
            typeof e.payload.round === 'number' ? e.payload.round : undefined;
          const d: Detour = {
            kind: 'variant',
            id,
            representation: shownRepresentation(e),
            variantKind: vk,
            ...(round !== undefined && { round }),
            outcome: 'open',
            ...(e.reaction && { ruleId: e.reaction.reactionId }),
          };
          stack.push({ kind: 'variant', id, variantKind: vk });
          byOpen.set(`var:${id}`, d);
          variantsShown.push(id);
          if (k === key) {
            detours.push(d);
          }
        } else if (e.name === 'closed' && e.component === 'Variant') {
          const id = String(e.payload.variantId);
          const d = byOpen.get(`var:${id}`);
          if (d) {
            d.outcome = String(e.payload.outcome);
          }
          const i = stack.map(s => s.id).lastIndexOf(id);
          if (i >= 0) {
            stack.splice(i, 1);
          }
        } else if (e.name === 'shown') {
          componentsShown.push({
            component: e.component,
            stepKey: k,
            used: false,
          });
        } else if (e.component !== 'NumericKeypad') {
          // Any other component interaction marks the latest copy as used.
          const c = [...componentsShown]
            .reverse()
            .find(x => x.component === e.component);
          if (c) {
            c.used = true;
            const snapshot = Object.fromEntries(
              Object.entries(e.payload).filter(
                ([, v]) => typeof v === 'number' || typeof v === 'boolean',
              ),
            );
            if (Object.keys(snapshot).length > 0) {
              c.snapshot = snapshot;
            }
          }
        }
        break;
      }
      case 'deepdive': {
        const d = byOpen.get(`dd:${e.deepDiveId}`);
        if (d) {
          d.outcome = e.outcome;
          if (e.miniCorrect !== undefined) {
            d.miniCorrect = e.miniCorrect;
          }
          if (e.helped !== undefined) {
            d.helped = e.helped;
          }
        }
        const i = stack.map(s => s.id).lastIndexOf(e.deepDiveId);
        if (i >= 0) {
          stack.splice(i, 1);
        }
        break;
      }
      case 'answer':
        if (e.correct && !k.includes(':')) {
          const clean = !dirty.has(k) && e.attempt === 1;
          cleanStreak = clean ? cleanStreak + 1 : 0;
          cleanStreakActed =
            clean &&
            (cleanStreakActed ||
              e.kind === 'typed' ||
              e.kind === 'lines' ||
              e.kind === 'task');
        } else if (!e.correct) {
          cleanStreak = 0;
          cleanStreakActed = false;
          compressed = false;
        }
        break;
      case 'not_sure':
      case 'reveal':
        cleanStreak = 0;
        cleanStreakActed = false;
        compressed = false;
        break;
      case 'plan':
        if (e.decision.next.kind === 'self_report') {
          selfReportsAsked += 1;
        }
        if (e.decision.next.kind === 'compress_steps') {
          compressOffered = true;
          cleanStreak = 0;
          cleanStreakActed = false;
        }
        if (k === key) {
          const n = e.decision.next;
          pendingOffer =
            n.kind === 'variant' && n.offer ? n.variantId : undefined;
          decisions.push({
            ruleId: e.decision.ruleId,
            kind: e.decision.next.kind,
            ...(e.decision.representation !== undefined && {
              representation: e.decision.representation,
            }),
          });
          // A follow-up action counts too (B4: the silent teacher note).
          if (e.decision.followUp) {
            decisions.push({
              ruleId: e.decision.ruleId,
              kind: e.decision.followUp.kind,
            });
          }
        }
        break;
      case 'offer_response':
        if (e.offer === 'compress' && e.accepted) {
          compressed = true;
        }
        if (
          e.offer === 'repair' &&
          !e.accepted &&
          k === key &&
          pendingOffer !== undefined
        ) {
          pushOnce(declinedOffers, pendingOffer);
        }
        break;
      case 'request':
        if (k === key) {
          requests.push({ kind: e.kind });
        }
        break;
      case 'ask':
        if (k === key) {
          requests.push({ kind: 'ask', via: e.via });
        }
        break;
      case 'clarify':
        if (k === key) {
          clarify.push(e.choice);
        }
        break;
      case 'self_report':
        selfReports.push({ stepKey: k, value: e.value });
        break;
      case 'transfer':
        pushOnce(transfersDone, e.variantId);
        break;
      case 'example_round':
        exampleRounds.push({
          variantId: e.templateId,
          round: e.round,
          outcome: e.outcome,
        });
        break;
      case 'teacher_note':
        teacherNotes += 1;
        break;
      default:
        break;
    }
  }

  // --- skill state (all sessions up to now) --------------------------------------
  const state = deriveState(upTo, catalog);
  const skillIds = [...(info?.skills ?? [])];
  // D1: the skills map also holds the own skills of misconceptions seen on
  // the step (step.skills stays the step's own).
  const shownSkillIds = [...skillIds];
  for (const w of wrongs) {
    const own =
      w.misconceptionId !== undefined
        ? catalog.misconceptions.get(w.misconceptionId)?.skillId
        : undefined;
    if (own !== undefined && !shownSkillIds.includes(own)) {
      shownSkillIds.push(own);
    }
  }
  const skills: Situation['skills'] = {};
  const tried = new Set<string>();
  for (const id of shownSkillIds) {
    const s = state.skills[id];
    if (s) {
      const seen = Object.entries(s.misconceptions).filter(([, n]) => n > 0);
      skills[id] = {
        status: s.status,
        representationsTried: s.representationsTried,
        helpRequests: {
          changeMethod: s.evidence.changeMethod,
          easier: s.evidence.easier,
        },
        ...(seen.length > 0 && { misconceptions: Object.fromEntries(seen) }),
      };
      // Only the step's own skills say which forms were tried here.
      if (skillIds.includes(id)) {
        s.representationsTried.forEach(r => tried.add(r));
      }
    }
  }
  // Representations of detours on this step count as tried even if their skills differ.
  detours.forEach(d => tried.add(d.representation));

  const parentRounds = exampleRounds.filter(r =>
    detours.some(d => d.id === r.variantId),
  );
  const prerequisiteLevel = stack.filter(
    s => s.variantKind === 'prerequisite',
  ).length;

  const line = lineOf(onStep);
  const situation: Situation = {
    trigger,
    exerciseId: trig.exerciseId,
    contentVersion: trig.contentVersion,
    questionId: trig.questionId,
    step: {
      key,
      scope: info?.scope ?? 'unknown',
      skills: skillIds,
      wrong: wrongs.length,
      notSure,
      // "Change method" / "easier" taps count like a "not sure" (help chips).
      struggle: wrongs.length + notSure + helpTaps,
      hintsUsed: onStep.filter(e => e.t === 'hint').length,
      hintCount: info?.hintCount ?? 0,
      wrongValues: wrongs.map(w => {
        const m = probedMisconception(onStep, w) ?? w.misconceptionId;
        return {
          value: answerValue(w),
          ...(m !== undefined && { misconceptionId: m }),
        };
      }),
      ...(lastAnswer && {
        last: {
          correct: lastAnswer.correct,
          value: answerValue(lastAnswer),
          attempt: lastAnswer.attempt,
          ...(lastAnswer.durationMs !== undefined && {
            durationMs: lastAnswer.durationMs,
          }),
          ...(lastAnswer.jumped && { jumped: true }),
        },
      }),
      ...(onStep[0] && {
        timeOnStepMs: Math.max(0, trig.ts - onStep[0].ts),
      }),
      ...(line && { line }),
      revealed: onStep.some(e => e.t === 'reveal'),
    },
    stack,
    depth: stack.length,
    detours,
    componentsShown: componentsShown.slice(-COMPONENTS_KEPT),
    representationsTried: [...tried],
    decisions,
    requests,
    declinedOffers,
    clarify,
    selfReports,
    question: {
      cleanStreak,
      cleanStreakActed,
      selfReportsAsked,
      compressOffered,
      compressed,
      transfersDone,
      variantsShown,
      deepDivesShown,
      exampleRounds: parentRounds,
      prerequisiteLevel,
      teacherNotes,
    },
    skills,
    session: {
      selfReportsAsked: upTo.filter(
        e =>
          e.t === 'plan' &&
          e.sessionId === trig.sessionId &&
          e.decision.next.kind === 'self_report',
      ).length,
      outcomes: attemptOutcomes(
        upTo.filter(e => e.sessionId === trig.sessionId),
        catalog,
      ).map(o => ({
        stepKey: o.stepKey,
        outcome: o.outcome,
        skills: o.skills,
      })),
      moves: upTo.flatMap(e =>
        e.t === 'plan' &&
        e.sessionId === trig.sessionId &&
        e.decision.nextMove !== undefined &&
        e.decision.nextMove.move !== 'move_on'
          ? [
              {
                move: e.decision.nextMove.move,
                skills: e.decision.diagnosis.skillIds,
                questionId: e.questionId,
              },
            ]
          : [],
      ),
      freshAfterReveal: upTo.flatMap(e =>
        e.t === 'plan' &&
        e.sessionId === trig.sessionId &&
        e.decision.ruleId === 'rule.after_reveal.fresh' &&
        e.decision.next.kind === 'variant'
          ? [e.decision.next.variantId]
          : [],
      ),
    },
    ...(opts.requestText !== undefined && {
      request: { text: opts.requestText.slice(0, 500) },
    }),
  };
  return situation;
}

function pushOnce(xs: string[], x: string) {
  if (!xs.includes(x)) {
    xs.push(x);
  }
}

/** Thresholds the planner reads (re-exported so rules and tests share one source). */
export { THRESHOLDS };
