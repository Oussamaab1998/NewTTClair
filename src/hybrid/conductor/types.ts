/**
 * The hybrid conductor's state and outputs (plan v2 A2). The state is plain
 * JSON (resumable, stored with the question); the engine moves it, never the
 * AI. Each act returns a prepared reply that is always shown when no AI move
 * replaces it, and the tier that should answer: instant (no call), light
 * (Haiku) or deep (Sonnet).
 */
import type { SessionState } from '../../ai/session/state';
import type { Rich } from '../../content/schema';
import type { ReplyPart } from '../../method/replies';
import type { Carried, TourProgress } from '../tour/tour';

export type Tier = 'instant' | 'light' | 'deep';

/** Why an act gets the reply it gets (the dry run and the dev overlay print it). */
export const INSTANT_REASONS = [
  'plan_ok',
  'plan_wrong',
  'plan_shown',
  'read_ok',
  'read_wrong',
  'unreadable',
  'readback',
  'credit',
  'line_note',
  'slip_first',
  'hint',
  'pick_ok',
  'pick_wrong',
  'stage',
  'recipe',
  'similar_line',
  'similar_review',
  'not_now',
  // The question trip (src/hybrid/tour): «نبداو».
  'tour_done',
  // Back from a small case to the question.
  'case_back',
  // A small box finished: the case closes, the prepared bridge to the question (bridge.ts).
  'case_done',
] as const;
export const LIGHT_REASONS = [
  'free_text',
  'case_line',
  'slip_no_reply',
  'slip_again',
  'pick_again',
  'component_result',
  'similar_other',
] as const;
export const DEEP_REASONS = [
  'undiagnosed',
  'stuck_again',
  'claim',
  'slip_third',
] as const;

export type InstantReason = (typeof INSTANT_REASONS)[number];
export type LightReason = (typeof LIGHT_REASONS)[number];
export type DeepReason = (typeof DEEP_REASONS)[number];
export type Reason = InstantReason | LightReason | DeepReason;

export const tierOf = (r: Reason): Tier =>
  (LIGHT_REASONS as readonly string[]).includes(r)
    ? 'light'
    : (DEEP_REASONS as readonly string[]).includes(r)
    ? 'deep'
    : 'instant';

/** What happened on the frame he is on now (reset when the route moves). */
export interface FrameProgress {
  /** Wrong answers (plan, word, line, pick). */
  attempts: number;
  dontKnows: number;
  /** Content hints given (the ladder; at most 2, the third is excluded). */
  hints: number;
  /** Times each known slip was seen on this frame. */
  slips: Record<string, number>;
  /** Slips whose prepared explanation was shown already. */
  shown: string[];
  /** A similar question's lines, reviewed on submit. */
  lines: string[];
  /** A repair frame's stage, and list failures inside it. */
  stage: number;
  listFails: number;
}

export interface ConductorState {
  v: 1;
  exerciseId: string;
  questionId: string;
  /** Method frame ids in his order (head, his cards, tail). */
  route: string[];
  at: number;
  progress: FrameProgress;
  planOrder: string[] | null;
  /** What tapped words established ({ order: 'unordered' }). */
  facts: Record<string, unknown>;
  /** Cards he picked right, by frame id. */
  picks: Record<string, string>;
  /** His credited line by main-graph node (card evaluators test formulas on them). */
  nodeLines: Record<string, string>;
  /** The evidence store shared with the AI side (his lines L1.., credits, known values). */
  session: SessionState;
  turn: number;
  done: boolean;
  /**
   * The small case an AI move put him on: his lines are judged there first,
   * and on the question when the case does not read them. Closed by
   * «نرجعو للسؤال», a line the question credits, or a finished box.
   */
  onCase: string | null;
  /** The question trip (null: none authored); its map is his road. */
  tour: TourProgress | null;
  /** His results of earlier questions, by "question/node" (from the records). */
  carried: Carried;
}

export interface ActOut {
  tier: Tier;
  reason: Reason;
  /** The prepared reply: shown at once, or when the AI move fails or is not allowed. */
  reply: ReplyPart[];
  /** The engine moved the route forward (only a credit, a right pick or a done stage does). */
  advanced: boolean;
  /** The prepared reply ends with the next hint: it counts only if shown (applyFallback). */
  hintPending?: true;
  /** An ambiguous division: he says how he meant it before the line is judged. */
  readback?: { literal: string; grouped: string };
}

/** What the screen shows for the frame he is on. */
export interface FrameView {
  frameId: string;
  type: 'plan' | 'read' | 'lines' | 'cards' | 'recipe' | 'similar' | 'repair';
  prompt: Rich | null;
  header: { now: Rich; why: Rich; next: Rich } | null;
  hintsLeft: number;
}
