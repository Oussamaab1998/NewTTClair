/**
 * The day's AI allowance and the routing of one act (plan v2 A3). Money never
 * blocks the lesson: a call that is not permitted is simply not made, and the
 * conductor's prepared reply is shown, with no cap message. One allowance per
 * question (its own call counts and spend); the day's spend lives in the
 * ledger (storeLedger: per local day, shared by every question on the device).
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
 * calls and perQuestion.usd dollars. A deep reason may be answered by a light
 * call (routeCall) when light is permitted for it: in full mode that is every
 * deep reason, in essential mode none.
 */
import { createBudget } from '../ai/session/budget';
import type { SpendLedger } from '../planner/llm/costCap';
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
  dailyUsd?: number;
  perQuestion?: AllowanceLimits;
}): Allowance {
  const dailyUsd = o.dailyUsd ?? DAILY_USD;
  const limits = o.perQuestion ?? PER_QUESTION;
  // The question's spend and the ledger write (a cost that is not a number counts 0).
  const budget = createBudget({
    sessionCapUsd: limits.usd,
    daily: { ledger: o.ledger, capUsd: dailyUsd },
  });
  const calls: Record<AiTier, number> = { light: 0, deep: 0 };
  const mode = (): AllowanceMode => modeFor(o.ledger.get(), dailyUsd);

  return {
    mode,
    permits: (tier, reason) => {
      // Instant reasons never call; a light reason is never sent deep.
      const own = tierOf(reason);
      if (own === 'instant' || (tier === 'deep' && own !== 'deep')) {
        return false;
      }
      if (calls[tier] >= limits[tier] || budget.spentUsd() >= limits.usd) {
        return false;
      }
      switch (mode()) {
        case 'full':
          return true;
        case 'essential':
          return (tier === 'light' ? ESSENTIAL_LIGHT : ESSENTIAL_DEEP).includes(
            reason,
          );
        case 'prepared_only':
          return false;
      }
    },
    add: (tier, usd) => {
      calls[tier] += 1;
      budget.add(Math.max(0, usd));
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
