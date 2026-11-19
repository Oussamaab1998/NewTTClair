/**
 * For an exercise's play test (`<id>.play.test.ts`, docs/NEW_EXERCISE.md):
 * a question of the app played on the board with no AI, act by act, from
 * its trip to where it stops. The test writes the right lines from the
 * engine's values and checks each reason and the frame it ends on.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { CATALOG } from '../../app/exercises';
import { passTour } from '../tour/passTour';
import type { Carried } from '../tour/tour';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
  view,
  type QuestionCtx,
} from './conductor';
import type { ConductorState } from './types';

export const line = (raw: string): StudentAct => ({ kind: 'line', raw });
export const pick = (optionId: string): StudentAct => ({
  kind: 'choice',
  optionId,
});
export const order = (ids: string[]): StudentAct => ({ kind: 'order', ids });
export const dontKnow: StudentAct = { kind: 'dont_know' };
export const next: StudentAct = { kind: 'continue' };

export function ctxFor(exerciseId: string, questionId: string): QuestionCtx {
  const entry = CATALOG.find(e => e.id === exerciseId);
  if (!entry) {
    throw new Error(
      `${exerciseId} is not in the app (npm run new-exercise -- ${exerciseId} --register)`,
    );
  }
  if (!entry.result.ok) {
    throw new Error(
      `${exerciseId} does not load:\n${entry.result.errors.join('\n')}`,
    );
  }
  return questionCtx(entry.result.loaded, entry.raw as never, questionId);
}

export interface Played {
  /** The board's reason for each act, the trip's «نبداو» first when there is one. */
  reasons: string[];
  /** The frame he is on at the end (the recipe, a similar question...), or null. */
  at: string | null;
  state: ConductorState;
  ctx: QuestionCtx;
}

/** Plays the acts after the trip (passed for him); `carried`: his results of earlier questions. */
export function playOn(
  exerciseId: string,
  questionId: string,
  acts: readonly StudentAct[],
  opts: { carried?: Carried } = {},
): Played {
  const ctx = ctxFor(exerciseId, questionId);
  let s = startQuestion(ctx, opts);
  const reasons: string[] = [];
  for (const a of [...passTour(ctx), ...acts]) {
    const r = act(ctx, s, a);
    s = applyFallback(r.state, r.out);
    reasons.push(r.out.reason);
  }
  return { reasons, at: view(ctx, s)?.frameId ?? null, state: s, ctx };
}
