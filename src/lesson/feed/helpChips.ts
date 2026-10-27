/**
 * When the two quiet help chips («غيّر الطريقة», «حاجة أسهل») show under the
 * active question (product owner, 2026-10-22). Pure, so the card and the
 * tests share it. Shown after a wrong answer or a "not sure" on this card;
 * idle time (THRESHOLDS.helpChipsIdleMs) alone shows them only with the
 * config flag `helpChipsIdleAlone` (off). Never on minis or readonly cards,
 * never while the repair offer is open (it already offers a picture), nor
 * after it was declined until the next wrong / "not sure" on the step, and
 * each chip only when the rules have an authored answer for it (HelpTargets,
 * which is false at the detour cap). They also stay in the card's "⋯".
 */
import type { HelpTargets } from '../../planner/rules';
import { THRESHOLDS } from '../../state/config';

export interface HelpChipsInput {
  active: boolean;
  scope: 'main' | 'variant' | 'mini';
  /** Wrong answers on this card. */
  wrongs: number;
  /** "Not sure" taps on this card. */
  notSures: number;
  /** Time since the last action on this card. */
  idleMs: number;
  targets: HelpTargets | null;
  /** A repair offer card is open. */
  offerOpen: boolean;
  /** Repair offer declined at this many signals (wrongs + "not sure"): hidden until one more. */
  hold?: number;
  /** Default: THRESHOLDS.helpChipsIdleAlone. */
  idleAlone?: boolean;
}

export type HelpChipsReason = 'wrong' | 'not_sure' | 'idle';

export interface HelpChipsState {
  visible: boolean;
  reason?: HelpChipsReason;
  changeMethod: boolean;
  simpler: boolean;
}

const HIDDEN: HelpChipsState = {
  visible: false,
  changeMethod: false,
  simpler: false,
};

export function helpChipsState(i: HelpChipsInput): HelpChipsState {
  const change = i.targets?.changeMethod === true;
  const simpler = i.targets?.simpler === true;
  if (!i.active || i.scope === 'mini' || i.offerOpen || (!change && !simpler)) {
    return HIDDEN;
  }
  if (i.hold !== undefined && i.wrongs + i.notSures <= i.hold) {
    return HIDDEN;
  }
  const idleAlone = i.idleAlone ?? THRESHOLDS.helpChipsIdleAlone;
  const reason: HelpChipsReason | undefined =
    i.wrongs > 0
      ? 'wrong'
      : i.notSures > 0
      ? 'not_sure'
      : idleAlone && i.idleMs >= THRESHOLDS.helpChipsIdleMs
      ? 'idle'
      : undefined;
  return reason
    ? { visible: true, reason, changeMethod: change, simpler }
    : HIDDEN;
}
