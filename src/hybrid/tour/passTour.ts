/**
 * The act that goes through a question's trip: «نبداو» (nothing when the
 * question has none). For tests and the conductor dry run.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import type { QuestionCtx } from '../conductor/conductor';

export function passTour(ctx: QuestionCtx): StudentAct[] {
  return ctx.tour ? [{ kind: 'continue' }] : [];
}
