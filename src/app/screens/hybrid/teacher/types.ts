/**
 * What the lesson board wires: a long-press request (AskProvider -> onAsk),
 * the open question the teacher reads, and the screen's events.
 */
import type { AskKind } from '../../../../ai/teacher/glossary';
import type { QuestionCtx } from '../../../../hybrid/conductor/conductor';
import type { ConductorState } from '../../../../hybrid/conductor/types';

export type { AskKind };

/** A long press and the option he chose in its menu. */
export interface AskRequest {
  /** «شنوّة معناها؟» / «كيفاش نقراها بالفرنسي؟» / «علاش نستعملوها هنا؟» / «نكتب سؤالي وحدي». */
  kind: AskKind;
  /** What he long-pressed (or the chip he picked in it): LaTeX, or the paper's French words. */
  pressed: { kind: 'math' | 'fr'; text: string };
  /** The glossary entry of the chip he picked (null: none picked, or no glossary). */
  entryId: string | null;
}

/** The question open on the board: the teacher's context and what it must not give. */
export interface TeacherQuestion {
  ctx: QuestionCtx;
  state: ConductorState;
}

/**
 * The screen's acts and answers, for the event log (docs/DATA.md; the board
 * maps them to its events).
 */
export type TeacherEvent =
  | {
      t: 'teacher_ask';
      from: 'typed' | 'menu' | 'simpler';
      kind: AskKind | null;
      general: boolean;
    }
  | {
      t: 'teacher_answer';
      source: 'glossary' | 'ai' | 'canned';
      costUsd: number;
    }
  | { t: 'teacher_no_answer'; reason: 'spent' | 'failed' }
  | { t: 'teacher_understood' }
  | { t: 'teacher_context'; general: boolean }
  | { t: 'teacher_key'; key: string }
  | { t: 'teacher_close' };
