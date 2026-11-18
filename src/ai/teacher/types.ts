/**
 * The teacher (student test 2026-11-18, docs/STUDENT_TEST_PLAN.md): its own
 * full screen, apart from the lesson's moves. One stateless call per
 * question he asks; the answer is whole (meaning, French reading, an example
 * with numbers of its own), never ends with a question, and never gives the
 * result or the calculation of a step of his question he has not done yet.
 */
import type { RenderBlock } from '../verify/message';
import type { VerifyContext } from '../verify/message';

/** What the teacher's screen draws: Arabic runs, a French line, a formula. */
export type TeacherBlock = Extract<RenderBlock, { type: 'ar' | 'fr' | 'math' }>;

/** One earlier exchange of this teacher thread (model-facing text). */
export interface TeacherTurn {
  his: string;
  answer: string;
}

/**
 * The exercise as the teacher reads it: the text of the context (statement,
 * question, the step he is on, his credited lines, the values he must not be
 * given) and what the answer is checked against.
 */
export interface TeacherContext {
  exerciseId: string;
  questionId: string;
  /** The context for the model, in English with the exam's French. */
  text: string;
  /** The values he has not found yet, one line each (model-facing). */
  hidden: string[];
  verify: VerifyContext;
}

export type TeacherMode =
  /** A question he typed, or a long-press option the glossary does not answer. */
  | 'ask'
  /** «مازال ما فهمتش» on the last answer: the same thing, differently and simpler. */
  | 'simpler';

export interface TeacherRequest {
  mode: TeacherMode;
  /** His words, verbatim (any script), or the menu option he chose. */
  question: string;
  /** What he long-pressed in the lesson (LaTeX or the paper's French), when he asked from there. */
  pressed: string | null;
  /**
   * The open question of the lesson (null: none open). Even a general
   * question is checked against it: the teacher never gives a step he has
   * not done.
   */
  context: TeacherContext | null;
  /** The chip: false when he asks about the exercise, true for a general question. */
  general: boolean;
  /** The last turns of this thread, oldest first (at most TEACHER_HISTORY). */
  history: TeacherTurn[];
}

export interface TeacherAnswer {
  blocks: TeacherBlock[];
  /** 'ai': written by the model and checked; 'canned': the dev stand-in. */
  source: 'ai' | 'canned';
  costUsd: number;
}

export type TeacherResult =
  | { ok: true; answer: TeacherAnswer }
  /**
   * 'spent': the day's allowance is used up (the teacher is back tomorrow;
   * glossary answers still work); 'failed': no answer passed the checks, or
   * the call failed (no key, offline, refused).
   */
  | { ok: false; reason: 'spent' | 'failed' };

/** The AI teacher: never throws; a result for every request. */
export type TeacherAi = (
  req: TeacherRequest,
  signal?: AbortSignal,
) => Promise<TeacherResult>;

/** Turns of the thread sent with each request. */
export const TEACHER_HISTORY = 3;
