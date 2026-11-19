/**
 * The «Formules» record (docs/FORMULAS_PLAN.md, stage 3), kept on the phone
 * under `formulas.v1`: for each rule, his last answers (drill or Vérif
 * rapide, the verdict, the trap). The status and the day a rule comes back
 * are computed from these, never stored, so a change of rule here never
 * needs a migration.
 *
 * - Nouvelle: never answered. A rule of his own year waits until he opens
 *   it (not due); a rule of the year before is a reminder, due at once
 *   (decision 8).
 * - En cours: answered, not yet Retenue.
 * - Retenue: right in a Vérif rapide on two different days since his last
 *   miss there.
 * Only Vérif answers move a rule between En cours and Retenue (drills train,
 * the Vérif checks). It comes back 1 day after training or a miss, then 3, 7
 * and 21 days after each good Vérif day.
 *
 * No score, no level, no count is shown from this (D8). The AI digest gets
 * rule ids and statuses only.
 */
import { z } from 'zod';

import type { KeyValueStore } from '../storage/kv';

export const FORMULAS_KEY = 'formulas.v1';
/** Answers kept per rule (enough for the status: it reads the last miss and after). */
export const ANSWERS_MAX = 30;

export const ANSWER_VERDICTS = ['right', 'trap', 'wrong', 'dont_know'] as const;
export type AnswerVerdict = (typeof ANSWER_VERDICTS)[number];

const AnswerSchema = z.object({
  at: z.number(),
  mode: z.enum(['drill', 'check']),
  kind: z.enum(['complete', 'true_false', 'calc', 'recognise']),
  verdict: z.enum(ANSWER_VERDICTS),
  trapId: z.string().optional(),
});
export type FormulaAnswer = z.infer<typeof AnswerSchema>;

const EntrySchema = z.object({
  id: z.string(),
  answers: z.array(AnswerSchema),
});
export type FormulaEntry = z.infer<typeof EntrySchema>;

const LogSchema = z.object({
  v: z.literal(1),
  entries: z.record(z.string(), EntrySchema),
});
export type FormulaLog = z.infer<typeof LogSchema>;

export const emptyFormulas = (): FormulaLog => ({ v: 1, entries: {} });

export function loadFormulas(store: KeyValueStore): FormulaLog {
  try {
    const raw = store.getString(FORMULAS_KEY);
    if (!raw) {
      return emptyFormulas();
    }
    const r = LogSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : emptyFormulas();
  } catch {
    return emptyFormulas();
  }
}

export function saveFormulas(store: KeyValueStore, log: FormulaLog): void {
  store.set(FORMULAS_KEY, JSON.stringify(log));
}

/** One more answer for a rule (a new log; the last ANSWERS_MAX are kept). */
export function noteAnswer(
  log: FormulaLog,
  ruleId: string,
  answer: FormulaAnswer,
): FormulaLog {
  const before = log.entries[ruleId]?.answers ?? [];
  return {
    v: 1,
    entries: {
      ...log.entries,
      [ruleId]: { id: ruleId, answers: [...before, answer].slice(-ANSWERS_MAX) },
    },
  };
}

// Days are his days (local midnight), not UTC's.

export function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  const d = new Date(dayStart(ms));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export type FormulaStatus = 'nouvelle' | 'en_cours' | 'retenue';

/** Days until it comes back: after training or a miss, then after 1, 2, 3+ good Vérif days. */
export const INTERVALS = [1, 3, 7, 21] as const;

export interface FormulaState {
  status: FormulaStatus;
  /** Local midnight of the day it is due (null: not due until he opens it). */
  due: number | null;
}

export function ruleState(
  entry: FormulaEntry | undefined,
  now: number,
  reminder: boolean,
): FormulaState {
  const answers = [...(entry?.answers ?? [])].sort((a, b) => a.at - b.at);
  if (answers.length === 0) {
    return { status: 'nouvelle', due: reminder ? dayStart(now) : null };
  }
  const checks = answers.filter(a => a.mode === 'check');
  if (checks.length === 0) {
    return { status: 'en_cours', due: addDays(answers.at(-1)!.at, INTERVALS[0]) };
  }
  let lastMiss = -1;
  checks.forEach((a, i) => {
    if (a.verdict !== 'right') {
      lastMiss = i;
    }
  });
  const goodDays = [...new Set(checks.slice(lastMiss + 1).map(a => dayStart(a.at)))];
  if (goodDays.length === 0) {
    return { status: 'en_cours', due: addDays(checks[lastMiss]!.at, INTERVALS[0]) };
  }
  const step = INTERVALS[Math.min(goodDays.length, INTERVALS.length - 1)]!;
  return {
    status: goodDays.length >= 2 ? 'retenue' : 'en_cours',
    due: addDays(Math.max(...goodDays), step),
  };
}

export const isDue = (state: FormulaState, now: number): boolean =>
  state.due !== null && state.due <= dayStart(now);
