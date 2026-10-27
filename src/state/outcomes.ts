/**
 * E1 (round 3, 2026-10-22): one outcome class per finished attempt, from
 * the event log alone. A main step ends with a correct answer or a reveal;
 * a transfer (or a fresh variant after a reveal) ends when it closes.
 * Detours, minis and other variants are not attempts of their own: they
 * make the step's class `after_detour`. Planner input only (nextMove, a
 * later review screen); never a label for the student.
 */
import type { Event } from '../telemetry/events';
import { eventStepKey, stepInfo, type Catalog } from './catalog';

export const OUTCOME_CLASSES = [
  'first_try',
  'after_retry',
  'after_hint',
  'after_detour',
  'revealed',
  'guessed',
  'transfer_ok',
  'transfer_fail',
] as const;
export type OutcomeClass = (typeof OUTCOME_CLASSES)[number];

export interface AttemptOutcome {
  stepKey: string;
  skills: readonly string[];
  outcome: OutcomeClass;
  session: string;
  ts: number;
}

interface StepTrack {
  wrong: number;
  notSure: number;
  hints: number;
  detours: number;
}

const fresh = (): StepTrack => ({ wrong: 0, notSure: 0, hints: 0, detours: 0 });

export function attemptOutcomes(
  events: readonly Event[],
  catalog: Catalog,
): AttemptOutcome[] {
  const out: AttemptOutcome[] = [];
  const tracks = new Map<string, StepTrack>();
  const track = (session: string, key: string) => {
    const id = `${session} ${key}`;
    let t = tracks.get(id);
    if (!t) {
      t = fresh();
      tracks.set(id, t);
    }
    return t;
  };
  const isMain = (stepId: string) =>
    !stepId.startsWith('dd:') && !stepId.startsWith('var:');
  const push = (
    e: Event,
    stepKey: string,
    skills: readonly string[],
    outcome: OutcomeClass,
  ) => {
    out.push({ stepKey, skills, outcome, session: e.sessionId, ts: e.ts });
    tracks.delete(`${e.sessionId} ${stepKey}`);
  };

  for (const e of events) {
    const key = eventStepKey(e);
    switch (e.t) {
      case 'answer': {
        if (!isMain(e.stepId)) {
          break;
        }
        const t = track(e.sessionId, key);
        if (!e.correct) {
          t.wrong += 1;
          break;
        }
        const skills = stepInfo(catalog, e)?.skills ?? [];
        push(
          e,
          key,
          skills,
          t.detours > 0
            ? 'after_detour'
            : t.hints > 0
            ? 'after_hint'
            : t.wrong > 0 || t.notSure > 0
            ? 'after_retry'
            : 'first_try',
        );
        break;
      }
      case 'hint':
        if (isMain(e.stepId)) {
          track(e.sessionId, key).hints += 1;
        }
        break;
      case 'not_sure':
        if (isMain(e.stepId)) {
          track(e.sessionId, key).notSure += 1;
        }
        break;
      case 'reveal':
        if (isMain(e.stepId)) {
          push(e, key, stepInfo(catalog, e)?.skills ?? [], 'revealed');
        }
        break;
      case 'self_report': {
        // "Guessed" overrides the class of the step just answered.
        if (e.value !== 'guessed') {
          break;
        }
        const last = [...out]
          .reverse()
          .find(o => o.stepKey === key && o.session === e.sessionId);
        if (last) {
          last.outcome = 'guessed';
        }
        break;
      }
      case 'component_event': {
        const opened =
          (e.component === 'DeepDive' || e.component === 'Variant') &&
          e.name === 'shown';
        if ((opened || e.component === 'Walkthrough') && isMain(e.stepId)) {
          if (opened || e.payload.index === 0) {
            track(e.sessionId, key).detours += 1;
          }
        }
        if (
          e.component === 'Variant' &&
          e.name === 'closed' &&
          e.payload.kind === 'transfer'
        ) {
          const id = String(e.payload.variantId);
          const outcome = e.payload.outcome;
          if (outcome === 'abandoned') {
            break;
          }
          push(
            e,
            `var:${id}`,
            catalog.variantSkills.get(id) ?? [],
            outcome === 'correct'
              ? 'transfer_ok'
              : outcome === 'revealed'
              ? 'revealed'
              : 'transfer_fail',
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** Per skill: counts per class, and the last few classes (oldest first). */
export interface SkillOutcomes {
  counts: Partial<Record<OutcomeClass, number>>;
  recent: OutcomeClass[];
}

const RECENT = 5;

export function outcomesBySkill(
  outcomes: readonly AttemptOutcome[],
): Map<string, SkillOutcomes> {
  const by = new Map<string, SkillOutcomes>();
  for (const o of outcomes) {
    for (const skill of o.skills) {
      const s = by.get(skill) ?? { counts: {}, recent: [] };
      s.counts[o.outcome] = (s.counts[o.outcome] ?? 0) + 1;
      s.recent = [...s.recent, o.outcome].slice(-RECENT);
      by.set(skill, s);
    }
  }
  return by;
}
