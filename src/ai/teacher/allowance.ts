/**
 * The teacher's own daily allowance, apart from the lesson board's
 * (src/hybrid/live.ts): its spend of the day in the app store under
 * `teacher.spend.v1` ({ day, usd }, the UTC date, as the board's). A call is
 * made only while the day's spend plus one typical answer stays under the
 * cap; then the teacher is back tomorrow (glossary answers still work, the
 * lesson is never blocked). The real cost of each call is charged (the
 * context and his question are his own, never shared by other students).
 */
import { AI_MODELS, aiCostUsd } from '../config';
import type { AiUsage } from '../transport/wire';
import { storeLedger, type SpendLedger } from '../../planner/llm/costCap';
import type { KeyValueStore } from '../../storage/kv';

export const TEACHER_SPEND_KEY = 'teacher.spend.v1';
/** Owner's default (2026-11-18 plan): about fifteen answers a day. */
export const TEACHER_DAILY_USD = 0.2;

/**
 * A typical teacher call, in tokens (first guesses, to be measured): the
 * cached prefix is the tool and the rules (about 6,200 characters, some
 * 1,700 tokens); the context, the last turns and his question are not cached
 * (about 900 tokens with three turns of history); at effort low the thinking
 * and an answer of about 900 Arabic characters stay near 1,100 output tokens.
 */
export const TYPICAL_TEACHER_CALL: AiUsage = {
  input: 900,
  cacheRead: 1_700,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 1_100,
};

/** What one answer is expected to cost (about $0.013 on Sonnet 5.5). */
export const TEACHER_EXPECTED_USD = aiCostUsd(
  AI_MODELS.sonnet,
  TYPICAL_TEACHER_CALL,
);

export interface TeacherAllowance {
  /** One more answer fits in the day's allowance. */
  permits(): boolean;
  /** A call was made and cost `usd`. */
  add(usd: number): void;
  spent(): number;
}

export function teacherAllowance(o: {
  ledger: SpendLedger;
  dailyUsd?: number;
  expectedUsd?: number;
}): TeacherAllowance {
  const cap = o.dailyUsd ?? TEACHER_DAILY_USD;
  const expected = o.expectedUsd ?? TEACHER_EXPECTED_USD;
  return {
    permits: () => {
      const s = o.ledger.get();
      return Number.isFinite(s) && s + expected <= cap;
    },
    add: usd => {
      if (Number.isFinite(usd) && usd > 0) {
        o.ledger.add(usd);
      }
    },
    spent: () => o.ledger.get(),
  };
}

/** The day of the record: the UTC date (as the lesson board's). */
const today = () => new Date().toISOString().slice(0, 10);

export function storeTeacherAllowance(
  store: KeyValueStore,
  o: { dailyUsd?: number; today?: () => string } = {},
): TeacherAllowance {
  return teacherAllowance({
    ledger: storeLedger(store, TEACHER_SPEND_KEY, o.today ?? today),
    ...(o.dailyUsd !== undefined && { dailyUsd: o.dailyUsd }),
  });
}
