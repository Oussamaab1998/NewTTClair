/**
 * Money caps for tutor calls: one question session, and (optionally) a daily
 * ledger shared by every session on the device. Before each call the worst
 * case must fit under both; afterwards the real cost is added.
 */
import type { SpendLedger } from '../../planner/llm/costCap';

/** Which cap a call would cross: this question's, or the day's. */
export type BudgetCap = 'question' | 'day';

export interface Budget {
  /** The cap the worst case would cross, or null when the call fits. */
  capHit(worstUsd: number): BudgetCap | null;
  add(usd: number): void;
  spentUsd(): number;
}

export function createBudget(o: {
  sessionCapUsd: number;
  daily?: { ledger: SpendLedger; capUsd: number };
}): Budget {
  let spent = 0;
  return {
    capHit: worst => {
      if (!Number.isFinite(worst) || spent + worst > o.sessionCapUsd) {
        return 'question';
      }
      if (o.daily && o.daily.ledger.get() + worst > o.daily.capUsd) {
        return 'day';
      }
      return null;
    },
    add: usd => {
      const v = Number.isFinite(usd) ? usd : 0;
      spent += v;
      o.daily?.ledger.add(v);
    },
    spentUsd: () => spent,
  };
}
