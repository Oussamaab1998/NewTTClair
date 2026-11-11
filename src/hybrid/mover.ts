/**
 * The seams of the hybrid lesson (plan v2), fixed before tracks A, B and C
 * are built in parallel:
 * - the screen (track B) runs the conductor; after an act that is not
 *   instant it asks a Mover for an AI move, and shows the conductor's
 *   prepared reply (then applyFallback) when the Mover gives none;
 * - the AI side (track A) implements the Mover (router, allowance, the slim
 *   one-move calls) and the Templates (prepared replies with his numbers);
 * - an AI move never moves the route: only the conductor's engine does.
 * The defaults (noMover, noTemplates) let each track work alone.
 */
import type { StudentAct } from '../ai/checks/autoCheck';
import type { CaseSpec } from '../ai/session/state';
import type { RenderBlock, ShownComponent } from '../ai/verify/message';
import type { QuestionCtx } from './conductor/conductor';
import type { ActOut, ConductorState, Reason, Tier } from './conductor/types';

export type AiTier = Exclude<Tier, 'instant'>;

/** What happened, for the AI side: his act, the conductor's answer, the state after it. */
export interface MoveRequest {
  act: StudentAct;
  /** out.tier is 'light' or 'deep'. */
  out: ActOut;
  state: ConductorState;
}

/** An AI move, already checked by verifyAsk (src/ai/verify/message.ts). */
export interface Move {
  blocks: RenderBlock[];
  component: ShownComponent | null;
  tier: AiTier;
  costUsd: number;
  /** The small case the move works on (prepared or made by the engine): his next lines may be about it (applyMove). */
  case?: { id: string; spec: CaseSpec } | null;
}

/** Null: no move (not allowed today, failed, refused): the prepared reply is shown. */
export type Mover = (
  ctx: QuestionCtx,
  req: MoveRequest,
  signal?: AbortSignal,
) => Promise<Move | null>;

export const noMover: Mover = async () => null;

/** The day's AI allowance (plan v2 A3): never blocks the lesson, only the calls. */
export type AllowanceMode = 'full' | 'essential' | 'prepared_only';

export interface Allowance {
  mode(): AllowanceMode;
  /** May this call be made now (mode, the per-question limits)? */
  permits(tier: AiTier, reason: Reason): boolean;
  /**
   * May the light tier hand this moment over to one deep call (its move was
   * escalate)? The deep limits and the day's mode; a light reason reaches
   * the deep tier only this way.
   */
  permitsHandover(reason: Reason): boolean;
  /** The real cost of a call that was made. */
  add(tier: AiTier, usd: number): void;
}

/**
 * The prepared reply with his own numbers (plan v2 A4), already checked by
 * verifyAsk; null keeps the conductor's reply (out.reply).
 */
export type Templates = (
  ctx: QuestionCtx,
  state: ConductorState,
  out: ActOut,
) => RenderBlock[] | null;

export const noTemplates: Templates = () => null;
