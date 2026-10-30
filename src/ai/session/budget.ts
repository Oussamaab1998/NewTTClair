/**
 * Money caps for tutor calls: one question session, and (optionally) a daily
 * ledger shared by every session on the device. Before each call the worst
 * case must fit under both; afterwards the real cost is added.
 */
import type { SpendLedger } from '../../planner/llm/costCap';

export interface Budget {
  canSpend(worstUsd: number): boolean;
  add(usd: number): void;
  spentUsd(): number;
}

export function createBudget(o: {
  sessionCapUsd: number;
  daily?: { ledger: SpendLedger; capUsd: number };
}): Budget {
  let spent = 0;
  return {
    canSpend: worst =>
      Number.isFinite(worst) &&
      spent + worst <= o.sessionCapUsd &&
      (!o.daily || o.daily.ledger.get() + worst <= o.daily.capUsd),
    add: usd => {
      const v = Number.isFinite(usd) ? usd : 0;
      spent += v;
      o.daily?.ledger.add(v);
    },
    spentUsd: () => spent,
  };
}
