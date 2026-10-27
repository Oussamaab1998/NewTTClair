/**
 * Derived student state (docs/DATA.md §3): a pure function of the event log.
 *
 * Evidence rules:
 * - A correct answer counts; if the student then says "guessed", it moves to
 *   `guessed` (weak evidence only).
 * - `reveal`, and a law cell filled with source "revealed", are never a success.
 * - `skip` counts as neither pass nor fail.
 * - `not_sure` is its own evidence, never a wrong answer (it still counts as a
 *   struggle signal for "gap").
 * - Only `transfer` events (a changed variant of a solved task) count as
 *   transfer. A deep-dive mini question is ordinary practice, never a transfer.
 * - Misconceptions in the "writing" category (or on a writing skill) are exam
 *   habits: they go to `habits`, not to math evidence.
 */
import { SKILLS, type Skills } from '../content/skills';
import type { Event } from '../telemetry/events';
import { eventStepKey, stepInfo, type Catalog } from './catalog';
import { THRESHOLDS, type Thresholds } from './config';
import {
  attemptOutcomes,
  outcomesBySkill,
  type SkillOutcomes,
} from './outcomes';

/**
 * Statuses are planner hypotheses about what to show next, never labels for
 * the student: "gap" (and "closed") must not be shown or claimed in the UI.
 */
export type SkillStatus =
  | 'unseen'
  | 'known'
  | 'shaky'
  | 'gap'
  | 'recovering'
  | 'closed';

export interface SkillEvidence {
  correct: number;
  wrong: number;
  notSure: number;
  hints: number;
  guessed: number;
  /** Correct only after a hint, a wrong answer, "not sure" or a detour on that step. */
  helped: number;
  revealed: number;
  skipped: number;
  transferOk: number;
  transferFail: number;
  /** "Change method" / "easier" taps (help chips, 2026-10-22): struggle signals like "not sure". */
  changeMethod: number;
  easier: number;
  /** Long-press asks with no verified answer (round 1, 2026-10-22): a struggle signal too. */
  unanswered: number;
  /** D1: misconceptions of this skill seen on another skill's step (a struggle signal). */
  misconceptionSignals: number;
  lastSeen: number;
}

export interface SkillState {
  skillId: string;
  kind: 'math' | 'writing';
  status: SkillStatus;
  evidence: SkillEvidence;
  /** Representations shown while working on this skill ("text" for deep dives). */
  representationsTried: string[];
  /** Planner-chosen representations after which the original step was answered right. */
  representationsHelped: string[];
  misconceptions: Record<string, number>;
  /** E1: the outcome class of each finished attempt on this skill (planner input, never shown). */
  outcomes: SkillOutcomes;
  nextReviewAt?: number;
}

export interface HabitState {
  habitId: string;
  count: number;
  misconceptions: Record<string, number>;
  lastSeen: number;
}

export interface StudentState {
  skills: Record<string, SkillState>;
  /** Writing habits (parentheses, conclusion, domain check, interpretation). */
  habits: Record<string, HabitState>;
  /** Events whose step is not in the catalog (other content version, legacy log). */
  unattributed: number;
}

interface Acc {
  ev: SkillEvidence;
  tried: string[];
  helped: string[];
  misconceptions: Record<string, number>;
  /** sessionId -> wrong + not_sure signals. */
  signals: Map<string, number>;
  /** Sessions of clean transfers (no hints). */
  cleanTransfers: { session: string; ts: number }[];
  firstTransferSession?: string;
  /** D2: the last reveal, and the last correct answer on a variant (a transfer included). */
  lastRevealAt?: number;
  lastVariantOkAt?: number;
}

const emptyEvidence = (): SkillEvidence => ({
  correct: 0,
  wrong: 0,
  notSure: 0,
  hints: 0,
  guessed: 0,
  helped: 0,
  revealed: 0,
  skipped: 0,
  transferOk: 0,
  transferFail: 0,
  changeMethod: 0,
  easier: 0,
  unanswered: 0,
  misconceptionSignals: 0,
  lastSeen: 0,
});

const pushUnique = (xs: string[], x: string) => {
  if (!xs.includes(x)) {
    xs.push(x);
  }
};

/** The representation a `shown` event stands for. */
export function shownRepresentation(
  e: Extract<Event, { t: 'component_event' }>,
): string {
  const r = e.payload.representation;
  return typeof r === 'string' ? r : e.component;
}

export function deriveState(
  events: readonly Event[],
  catalog: Catalog,
  opts: { skills?: Skills; thresholds?: Thresholds } = {},
): StudentState {
  const skills = opts.skills ?? SKILLS;
  const th = opts.thresholds ?? THRESHOLDS;
  const acc = new Map<string, Acc>();
  const habits: Record<string, HabitState> = {};
  let unattributed = 0;

  const get = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) {
      a = {
        ev: emptyEvidence(),
        tried: [],
        helped: [],
        misconceptions: {},
        signals: new Map(),
        cleanTransfers: [],
      };
      acc.set(id, a);
    }
    return a;
  };

  /** Per session + step: was help used before the answer? */
  const helpedSteps = new Set<string>();
  /** Last correct answer per session (a following "guessed" weakens it). */
  const lastCorrect = new Map<string, readonly string[]>();
  /** Planner-chosen representation waiting for the original step's next answer. */
  const pendingRepair = new Map<string, string>();

  const skillsOf = (e: Event): readonly string[] => {
    const info = stepInfo(catalog, e);
    if (!info) {
      unattributed += 1;
      return [];
    }
    return info.skills;
  };
  const touch = (ids: readonly string[], ts: number, f: (a: Acc) => void) => {
    for (const id of ids) {
      const a = get(id);
      a.ev.lastSeen = Math.max(a.ev.lastSeen, ts);
      f(a);
    }
  };
  const isWriting = (misconceptionId: string | undefined) => {
    if (misconceptionId === undefined) {
      return false;
    }
    const m = catalog.misconceptions.get(misconceptionId);
    return (
      m !== undefined &&
      (m.category === 'writing' || skills.kind(m.skillId) === 'writing')
    );
  };
  const signal = (a: Acc, session: string) =>
    a.signals.set(session, (a.signals.get(session) ?? 0) + 1);

  for (const e of events) {
    const key = `${e.sessionId}|${eventStepKey(e)}`;
    switch (e.t) {
      case 'answer': {
        const ids = skillsOf(e);
        const repair = pendingRepair.get(key);
        pendingRepair.delete(key);
        if (e.correct) {
          const helped = helpedSteps.has(key);
          touch(ids, e.ts, a => {
            a.ev.correct += 1;
            if (e.stepId.startsWith('var:')) {
              a.lastVariantOkAt = e.ts;
            }
            if (helped) {
              a.ev.helped += 1;
            }
            if (repair) {
              pushUnique(a.helped, repair);
            }
          });
          lastCorrect.set(e.sessionId, ids);
          helpedSteps.delete(key);
          break;
        }
        helpedSteps.add(key);
        if (isWriting(e.misconceptionId)) {
          const m = catalog.misconceptions.get(e.misconceptionId!)!;
          const h = (habits[m.skillId] ??= {
            habitId: m.skillId,
            count: 0,
            misconceptions: {},
            lastSeen: 0,
          });
          h.count += 1;
          h.misconceptions[e.misconceptionId!] =
            (h.misconceptions[e.misconceptionId!] ?? 0) + 1;
          h.lastSeen = Math.max(h.lastSeen, e.ts);
          break;
        }
        // D1 (2026-10-22): the wrong answer is evidence on the step's skills;
        // its misconception is counted under its own skill (the library's
        // skillId), which also gets one signal when it is not one of them.
        const own =
          e.misconceptionId !== undefined
            ? catalog.misconceptions.get(e.misconceptionId)?.skillId
            : undefined;
        touch(ids, e.ts, a => {
          a.ev.wrong += 1;
          signal(a, e.sessionId);
          if (e.misconceptionId !== undefined && own === undefined) {
            a.misconceptions[e.misconceptionId] =
              (a.misconceptions[e.misconceptionId] ?? 0) + 1;
          }
        });
        if (own !== undefined && e.misconceptionId !== undefined) {
          const m = e.misconceptionId;
          touch([own], e.ts, a => {
            a.misconceptions[m] = (a.misconceptions[m] ?? 0) + 1;
            if (!ids.includes(own)) {
              a.ev.misconceptionSignals += 1;
              signal(a, e.sessionId);
            }
          });
        }
        break;
      }
      case 'not_sure':
        helpedSteps.add(key);
        touch(skillsOf(e), e.ts, a => {
          a.ev.notSure += 1;
          signal(a, e.sessionId);
        });
        break;
      case 'request':
        // Counts like "not sure": a struggle signal on the step's skills.
        helpedSteps.add(key);
        touch(skillsOf(e), e.ts, a => {
          if (e.kind === 'simpler') {
            a.ev.easier += 1;
          } else {
            a.ev.changeMethod += 1;
          }
          signal(a, e.sessionId);
        });
        break;
      case 'ask':
        if (e.unanswered) {
          touch(skillsOf(e), e.ts, a => {
            a.ev.unanswered += 1;
            signal(a, e.sessionId);
          });
        }
        break;
      case 'hint':
        helpedSteps.add(key);
        touch(skillsOf(e), e.ts, a => {
          a.ev.hints += 1;
        });
        break;
      case 'reveal':
        helpedSteps.delete(key);
        touch(skillsOf(e), e.ts, a => {
          a.ev.revealed += 1;
          a.lastRevealAt = e.ts;
        });
        break;
      case 'skip':
        touch(skillsOf(e), e.ts, a => {
          a.ev.skipped += 1;
        });
        break;
      case 'self_report':
        // "understood" keeps the answer as it is; "dismissed" is never evidence either way.
        if (e.value === 'guessed') {
          touch(lastCorrect.get(e.sessionId) ?? [], e.ts, a => {
            if (a.ev.correct > 0) {
              a.ev.correct -= 1;
              a.ev.guessed += 1;
            }
          });
        }
        lastCorrect.delete(e.sessionId);
        break;
      case 'transfer':
        touch([e.skillId], e.ts, a => {
          if (e.correct) {
            a.ev.transferOk += 1;
            a.lastVariantOkAt = e.ts;
            a.firstTransferSession ??= e.sessionId;
            if (e.hintsUsed === 0) {
              a.cleanTransfers.push({ session: e.sessionId, ts: e.ts });
            }
          } else {
            a.ev.transferFail += 1;
          }
        });
        break;
      case 'component_event': {
        if (e.name !== 'shown') {
          // cell_filled_by_lesson (solved or revealed) is never an answer: the
          // EventPicker answer / reveal before it already counted.
          break;
        }
        const rep = shownRepresentation(e);
        let ids = skillsOf(e);
        const dd = e.payload.deepDiveId;
        const v = e.payload.variantId;
        if (typeof dd === 'string') {
          ids = [...ids, ...(catalog.deepDiveSkills.get(dd) ?? [])];
          helpedSteps.add(key);
        } else if (typeof v === 'string') {
          ids = [...ids, ...(catalog.variantSkills.get(v) ?? [])];
          helpedSteps.add(key);
        }
        touch([...new Set(ids)], e.ts, a => pushUnique(a.tried, rep));
        if (e.reaction) {
          pendingRepair.set(key, rep);
        }
        break;
      }
      default:
        break;
    }
  }

  const out: Record<string, SkillState> = {};
  const byOutcome = outcomesBySkill(attemptOutcomes(events, catalog));
  for (const [id, a] of acc) {
    const status = statusOf(a, th);
    const delay =
      status === 'gap' ||
      status === 'shaky' ||
      status === 'recovering' ||
      status === 'closed'
        ? th.reviewDelayMs[status]
        : undefined;
    out[id] = {
      outcomes: byOutcome.get(id) ?? { counts: {}, recent: [] },
      skillId: id,
      kind: skills.kind(id) ?? 'math',
      status,
      evidence: a.ev,
      representationsTried: a.tried,
      representationsHelped: a.helped,
      misconceptions: a.misconceptions,
      ...(delay !== undefined && { nextReviewAt: a.ev.lastSeen + delay }),
    };
  }
  return { skills: out, habits, unattributed };
}

/** "gap" counts wrong answers and "not sure" together (DATA.md); it is a planner hypothesis only. */
function statusOf(a: Acc, th: Thresholds): SkillStatus {
  const ev = a.ev;
  const hadGap = [...a.signals.values()].some(
    n => n >= th.gapSignalsPerSession,
  );
  // D2 (2026-10-22): a reveal holds the skill until a later correct variant.
  if (
    a.lastRevealAt !== undefined &&
    a.lastRevealAt >= (a.lastVariantOkAt ?? -1)
  ) {
    return hadGap ? 'gap' : 'shaky';
  }
  if (ev.transferOk > 0) {
    if (!hadGap) {
      return 'known';
    }
    const closed = th.closedNeedsLaterSession
      ? a.cleanTransfers.some(c => c.session !== a.firstTransferSession)
      : a.cleanTransfers.length >= 2;
    return closed ? 'closed' : 'recovering';
  }
  if (hadGap) {
    return 'gap';
  }
  if (
    ev.wrong +
      ev.notSure +
      ev.changeMethod +
      ev.easier +
      ev.unanswered +
      ev.misconceptionSignals >=
      th.shakySignals ||
    ev.guessed > 0 ||
    ev.helped > 0 ||
    ev.revealed > 0 ||
    ev.hints > 0
  ) {
    return 'shaky';
  }
  if (ev.correct > 0) {
    return 'known';
  }
  // Only skips (or only shown representations): no evidence either way.
  return 'unseen';
}
