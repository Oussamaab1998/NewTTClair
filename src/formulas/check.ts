/**
 * The Vérif rapide (mockup 8) and what is due: up to 5 rules due today,
 * mixed, one item each, never «Calcule» (too long for a fast check), no
 * help. The screen builds each item with `drillItem(rule, kind, pool, seed)`.
 */
import { rng } from '../engine/expression/equivalence';
import { kindsFor, type DrillKind } from './drills/drills';
import {
  isDue,
  ruleState,
  type FormulaLog,
  type FormulaState,
} from './log';
import type { VisibleRule } from './visible';

export const CHECK_MAX = 5;

export interface DueRule extends VisibleRule {
  state: FormulaState;
}

/** The rules due today, the longest waiting first (his own year's before reminders). */
export function dueRules(
  log: FormulaLog,
  visible: readonly VisibleRule[],
  now: number,
): DueRule[] {
  return visible
    .map(v => ({ ...v, state: ruleState(log.entries[v.rule.id], now, v.reminder) }))
    .filter(v => isDue(v.state, now))
    .sort(
      (a, b) =>
        a.state.due! - b.state.due! ||
        Number(a.reminder) - Number(b.reminder) ||
        a.rule.id.localeCompare(b.rule.id),
    );
}

export interface CheckItemPlan {
  ruleId: string;
  kind: Exclude<DrillKind, 'calc'>;
}

/** Today's Vérif rapide: which rules, in which order, with which drill. */
export function pickCheck(
  log: FormulaLog,
  visible: readonly VisibleRule[],
  now: number,
  seed: number,
): CheckItemPlan[] {
  const r = rng(seed);
  const pool = visible.map(v => v.rule);
  const chosen = dueRules(log, visible, now).slice(0, CHECK_MAX);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j]!, chosen[i]!];
  }
  return chosen.map(d => {
    const kinds = kindsFor(d.rule, pool).filter(
      (k): k is CheckItemPlan['kind'] => k !== 'calc',
    );
    return { ruleId: d.rule.id, kind: kinds[Math.floor(r() * kinds.length)]! };
  });
}

/** For the AI digest: ids and statuses of the rules he has answered, nothing else. */
export function formulaDigest(
  log: FormulaLog,
  visible: readonly VisibleRule[],
  now: number,
): { id: string; status: FormulaState['status'] }[] {
  return visible
    .filter(v => (log.entries[v.rule.id]?.answers.length ?? 0) > 0)
    .map(v => ({
      id: v.rule.id,
      status: ruleState(log.entries[v.rule.id], now, v.reminder).status,
    }));
}
