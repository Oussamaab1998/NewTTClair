/**
 * A question the AI tutor closed counts as done (picker ✓ chips, «كمّل من»)
 * like a scripted part: a `part_done` event with the number of steps he
 * settled with his own lines (docs/DATA.md "Done parts": at least one).
 */
import type { Event } from '../../../telemetry/events';

export function aiPartDone(o: {
  exerciseId: string;
  contentVersion: string;
  questionId: string;
  /** Steps he settled with his own engine-credited lines. */
  answered: number;
  now: number;
}): Extract<Event, { t: 'part_done' }> {
  return {
    id: `ai-done-${o.now.toString(36)}`,
    ts: o.now,
    sessionId: `ai-${o.now.toString(36)}`,
    studentId: 'local-anon',
    exerciseId: o.exerciseId,
    contentVersion: o.contentVersion,
    questionId: o.questionId,
    stepId: 'ai',
    t: 'part_done',
    counted: o.answered,
    answered: o.answered,
    revealed: 0,
  };
}
