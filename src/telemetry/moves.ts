/**
 * E2 (round 3, 2026-10-22): the dev panel's view of nextMove: the last
 * decisions (class → move, and the cap that stopped a move) and the caps
 * used in the current session. Debug tools only; never shown to students.
 */
import { THRESHOLDS, type Thresholds } from '../state/config';
import type { Event } from './events';

type Plan = Extract<Event, { t: 'plan' }>;

export function formatMoves(
  events: readonly Event[],
  th: Thresholds = THRESHOLDS,
  last = 3,
): string {
  const session = events.at(-1)?.sessionId;
  const plans = events.filter(
    (e): e is Plan =>
      e.t === 'plan' &&
      e.sessionId === session &&
      e.decision.nextMove !== undefined,
  );
  const recent = plans.slice(-last).map(p => {
    const m = p.decision.nextMove!;
    return `${m.outcome}→${m.move}${m.stoppedBy ? ` (${m.stoppedBy})` : ''}`;
  });
  const per = (move: 'repeat' | 'step_back') => {
    const by = new Map<string, number>();
    for (const p of plans) {
      if (p.decision.nextMove?.move === move) {
        for (const k of p.decision.diagnosis.skillIds) {
          by.set(k, (by.get(k) ?? 0) + 1);
        }
      }
    }
    return Math.max(0, ...by.values());
  };
  const question = plans.filter(
    p =>
      p.questionId === events.at(-1)?.questionId &&
      p.decision.nextMove?.move !== 'move_on',
  ).length;
  return [
    `moves: ${recent.length > 0 ? recent.join(' · ') : '-'}`,
    `caps: repeat ${per('repeat')}/${th.repeatPerSkillPerSession}`,
    `step back ${per('step_back')}/${th.stepBackPerSkillPerSession}`,
    `question ${question}/${th.movesPerQuestion}`,
  ].join(' · ');
}
