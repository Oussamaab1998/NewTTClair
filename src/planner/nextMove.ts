/**
 * E2 (round 3, 2026-10-22): one decision after an attempt, from its outcome
 * class (src/state/outcomes.ts) and this session's record: move on, repeat
 * (a transfer or, after a reveal, a fresh variant) or step back (a
 * prerequisite). Thresholds and hard caps live in src/state/config.ts; every
 * move counts toward them, so no loop is possible. The result says which cap
 * (if any) stopped the wanted move; it is logged (`next_move` event).
 * Planner-internal: never shown to the student.
 */
import { THRESHOLDS, type Thresholds } from '../state/config';
import type { OutcomeClass } from '../state/outcomes';

export type Move = 'move_on' | 'repeat' | 'step_back';
export type MoveStop =
  | 'repeatPerSkillPerSession'
  | 'stepBackPerSkillPerSession'
  | 'movesPerQuestion'
  | 'freshAfterRevealPerSkillPerSession'
  | 'no_content';

export interface NextMoveInput {
  outcome: OutcomeClass;
  skills: readonly string[];
  /** A skill of the step is shaky or a gap. */
  skillShaky: boolean;
  /** Earlier outcomes on each skill in this session. */
  sessionOutcomes: Record<string, readonly OutcomeClass[]>;
  /** The attempt was a transfer (or a fresh variant). */
  transfer?: boolean;
  /** Earlier failed transfers per skill in this session (answered wrong first, or revealed). */
  transferFailures?: Record<string, number>;
  /** Moves already made: per skill in the session, and in this question. */
  moves: {
    repeat: Record<string, number>;
    stepBack: Record<string, number>;
    question: number;
  };
  /** Authored content that a move could open now. */
  available: { repeat: boolean; stepBack: boolean };
  /** Lines: the goal written at once, no reasoning shown (2026-10-18): a first try that repeats. */
  jumped?: boolean;
  /** D2: the revealed attempt was itself a fresh variant (move on). */
  revealedWasFresh?: boolean;
  /** D2's own cap was reached for a fresh variant after a reveal. */
  freshCapped?: boolean;
}

export interface NextMoveDecision {
  outcome: OutcomeClass;
  wanted: Move;
  move: Move;
  stoppedBy?: MoveStop;
}

function wantedMove(i: NextMoveInput): Move {
  switch (i.outcome) {
    case 'first_try':
      return i.jumped ? 'repeat' : 'move_on';
    case 'transfer_ok':
      return 'move_on';
    case 'after_retry':
      return i.skillShaky ? 'repeat' : 'move_on';
    case 'after_hint':
    case 'after_detour':
    case 'guessed':
      return 'repeat';
    case 'revealed': {
      if (i.revealedWasFresh) {
        return 'move_on'; // D2: no second variant, no step back.
      }
      // A transfer failing a second time on the skill this session.
      const before = Math.max(
        0,
        ...i.skills.map(s => i.transferFailures?.[s] ?? 0),
      );
      return i.transfer && before >= 1 ? 'step_back' : 'repeat';
    }
    case 'transfer_fail':
      return 'step_back';
  }
}

export function nextMove(
  i: NextMoveInput,
  th: Thresholds = THRESHOLDS,
): NextMoveDecision {
  const wanted = wantedMove(i);
  const stop = (stoppedBy: MoveStop): NextMoveDecision => ({
    outcome: i.outcome,
    wanted,
    move: 'move_on',
    stoppedBy,
  });
  if (wanted === 'move_on') {
    return { outcome: i.outcome, wanted, move: 'move_on' };
  }
  if (i.moves.question >= th.movesPerQuestion) {
    return stop('movesPerQuestion');
  }
  const used = (m: Record<string, number>) =>
    Math.max(0, ...i.skills.map(s => m[s] ?? 0));
  if (wanted === 'repeat') {
    if (used(i.moves.repeat) >= th.repeatPerSkillPerSession) {
      return stop('repeatPerSkillPerSession');
    }
    if (i.outcome === 'revealed' && i.freshCapped) {
      return stop('freshAfterRevealPerSkillPerSession');
    }
    if (!i.available.repeat) {
      return stop('no_content');
    }
    return { outcome: i.outcome, wanted, move: 'repeat' };
  }
  if (used(i.moves.stepBack) >= th.stepBackPerSkillPerSession) {
    return stop('stepBackPerSkillPerSession');
  }
  if (!i.available.stepBack) {
    return stop('no_content');
  }
  return { outcome: i.outcome, wanted, move: 'step_back' };
}
