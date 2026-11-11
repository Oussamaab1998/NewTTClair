/**
 * The day's AI allowance and the routing of one act (plan v2 A3). Money never
 * blocks the lesson: a call that is not permitted is simply not made, and the
 * conductor's prepared reply is shown, with no cap message. One allowance per
 * question: its call counts and spend live in a QuestionLedger (the app keeps
 * it in the store per question and per day, so leaving and reopening the
 * question keeps its limits); the day's spend lives in the ledger (storeLedger,
 * shared by every question on the device). The app's day is the UTC date
 * (src/hybrid/live.ts).
 *
 * The mode comes from the day's spend against dailyUsd:
 *
 *   mode           day's spend    light calls for            deep calls for
 *   full           under 60%      every light or deep        every deep reason
 *                                 reason
 *   essential      60% to 90%     free_text, slip_no_reply,  stuck_again,
 *                                 pick_again, similar_other  slip_third
 *   prepared_only  above 90%      none                       none
 *
 * In essential mode there are no remarks: no light call for component_result
 * or slip_again, and deep only at the hardest moments. In every mode one
 * question gets at most perQuestion.light light calls, perQuestion.deep deep
 * calls and perQuestion.usd dollars; a call is refused when the question's
 * spend plus the charge expected of one move at its tier
 * (MOVE_EXPECTED_CHARGE_USD) would pass perQuestion.usd. A deep reason may be
 * answered by a light call (routeCall) when light is permitted for it: in full
 * mode that is every deep reason, in essential mode none. A light reason is
 * never sent deep; the light tier may hand it over (permitsHandover) under the
 * deep limits, in essential mode only for the reasons listed above.
 */
import { MOVE_EXPECTED_CHARGE_USD } from '../ai/config';
import type { SpendLedger } from '../planner/llm/costCap';
import type { KeyValueStore } from '../storage/kv';
import { tierOf, type ActOut, type Reason } from './conductor/types';
import type { AiTier, Allowance, AllowanceMode } from './mover';

export interface AllowanceLimits {
  light: number;
  deep: number;
  usd: number;
}

/** Plan v2 figures (owner, 2026-10-30), to be tuned with the measurement (A6). */
export const DAILY_USD = 0.1;
export const PER_QUESTION: AllowanceLimits = { light: 10, deep: 2, usd: 0.04 };

/** Share of the day's allowance where essential starts, and above which only prepared replies are left. */
const ESSENTIAL_FROM = 0.6;
const PREPARED_ABOVE = 0.9;

/** Essential mode: the light reasons the student needs answered. */
const ESSENTIAL_LIGHT: readonly Reason[] = [
  'free_text',
  'slip_no_reply',
  'pick_again',
  'similar_other',
];
/** Essential mode: the hardest moments. */
const ESSENTIAL_DEEP: readonly Reason[] = ['stuck_again', 'slip_third'];

/** One question's calls per tier and the dollars charged for them. */
export type QuestionSpend = AllowanceLimits;

/** Where one question's calls and spend live. */
export interface QuestionLedger {
  get(): QuestionSpend;
  /** One call made at this tier, charged `usd` (a finite, non-negative number). */
  add(tier: AiTier, usd: number): void;
}

const zero = (): QuestionSpend => ({ light: 0, deep: 0, usd: 0 });

/** In memory: the counts last as long as the allowance (tests, the harness). */
export function memoryQuestionLedger(): QuestionLedger {
  const s = zero();
  return {
    get: () => ({ ...s }),
    add: (tier, usd) => {
      s[tier] += 1;
      s.usd += usd;
    },
  };
}

/**
 * One question's calls and spend in a KeyValueStore. Every question of the
 * day shares `key`: { day, questions: { [question]: { light, deep, usd } } }.
 * A record of another day (or one that cannot be read) counts as nothing and
 * is replaced on the next call, so it never holds more than one day.
 */
export function storeQuestionLedger(
  store: KeyValueStore,
  key: string,
  question: string,
  today: () => string,
): QuestionLedger {
  const count = (x: unknown): number =>
    typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : 0;
  const readDay = (): Record<string, unknown> => {
    try {
      const v = JSON.parse(store.getString(key) ?? 'null') as {
        day?: unknown;
        questions?: unknown;
      } | null;
      return v &&
        v.day === today() &&
        typeof v.questions === 'object' &&
        v.questions !== null
        ? (v.questions as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };
  const spendOf = (v: unknown): QuestionSpend => {
    if (typeof v !== 'object' || v === null) {
      return zero();
    }
    const r = v as Record<string, unknown>;
    return { light: count(r.light), deep: count(r.deep), usd: count(r.usd) };
  };
  return {
    get: () => spendOf(readDay()[question]),
    add: (tier, usd) => {
      const questions = readDay();
      const s = spendOf(questions[question]);
      s[tier] += 1;
      s.usd += usd;
      store.set(
        key,
        JSON.stringify({
          day: today(),
          questions: { ...questions, [question]: s },
        }),
      );
    },
  };
}

/** The mode for a day's spend; an unreadable spend or no allowance leaves the prepared path only. */
export function modeFor(spentUsd: number, dailyUsd: number): AllowanceMode {
  if (!Number.isFinite(spentUsd) || !(dailyUsd > 0)) {
    return 'prepared_only';
  }
  if (spentUsd < dailyUsd * ESSENTIAL_FROM) {
    return 'full';
  }
  return spentUsd <= dailyUsd * PREPARED_ABOVE ? 'essential' : 'prepared_only';
}

export function createAllowance(o: {
  ledger: SpendLedger;
  /** This question's calls and spend (default: in memory, this allowance only). */
  question?: QuestionLedger;
  dailyUsd?: number;
  perQuestion?: AllowanceLimits;
  /** The charge expected of one move per tier (default MOVE_EXPECTED_CHARGE_USD). */
  expectedUsd?: Readonly<Record<AiTier, number>>;
}): Allowance {
  const dailyUsd = o.dailyUsd ?? DAILY_USD;
  const limits = o.perQuestion ?? PER_QUESTION;
  const expected = o.expectedUsd ?? MOVE_EXPECTED_CHARGE_USD;
  const question = o.question ?? memoryQuestionLedger();
  const mode = (): AllowanceMode => modeFor(o.ledger.get(), dailyUsd);
  // A call left at this tier, and room in the question's dollars for one more move.
  const fits = (tier: AiTier): boolean => {
    const s = question.get();
    return s[tier] < limits[tier] && s.usd + expected[tier] <= limits.usd;
  };
  // The day's mode for a reason; `essential` lists the ones still answered there.
  const modeAnswers = (
    reason: Reason,
    essential: readonly Reason[],
  ): boolean => {
    switch (mode()) {
      case 'full':
        return true;
      case 'essential':
        return essential.includes(reason);
      case 'prepared_only':
        return false;
    }
  };

  return {
    mode,
    permits: (tier, reason) => {
      // Instant reasons never call; a light reason is never sent deep.
      const own = tierOf(reason);
      if (own === 'instant' || (tier === 'deep' && own !== 'deep')) {
        return false;
      }
      return (
        fits(tier) &&
        modeAnswers(reason, tier === 'light' ? ESSENTIAL_LIGHT : ESSENTIAL_DEEP)
      );
    },
    permitsHandover: reason => {
      // One deep call under the deep limits, for a reason the mode answers.
      const own = tierOf(reason);
      if (own === 'instant') {
        return false;
      }
      return (
        fits('deep') &&
        modeAnswers(reason, own === 'light' ? ESSENTIAL_LIGHT : ESSENTIAL_DEEP)
      );
    },
    add: (tier, usd) => {
      // A cost that is not a number counts 0.
      const v = Number.isFinite(usd) ? Math.max(0, usd) : 0;
      question.add(tier, v);
      o.ledger.add(v);
    },
  };
}

/**
 * The tier actually called for an act: its own tier when permitted; a deep
 * reason that is not permitted falls back to a light call when light is
 * permitted for it; else null, and the prepared reply is shown.
 */
export function routeCall(out: ActOut, allowance: Allowance): AiTier | null {
  if (out.tier === 'instant') {
    return null;
  }
  if (allowance.permits(out.tier, out.reason)) {
    return out.tier;
  }
  return out.tier === 'deep' && allowance.permits('light', out.reason)
    ? 'light'
    : null;
}
