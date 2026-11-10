/**
 * The live AI side of the lesson board (plan v2): one mover per question,
 * with the day's allowance kept in the store, the tier stepped down when the
 * allowance says so (routeCall), and the prepared replies with his numbers.
 * Internet only: no key, a failed or refused call → the prepared reply.
 */
import { createMover } from '../ai/move/mover';
import { profileDigest } from '../ai/profile/digest';
import { loadProfile } from '../ai/profile/profile';
import type { QuestionNotes } from '../ai/packs/notes';
import { createMessagesTransport } from '../ai/transport/messagesApi';
import { storeLedger } from '../planner/llm/costCap';
import type { KeyValueStore } from '../storage/kv';
import { createAllowance, routeCall } from './allowance';
import type { Mover, Templates } from './mover';
import { templates } from './replies/fill';

/** The day's AI spend of the lesson board (apart from the AI-led screen's). */
export const HYBRID_SPEND_KEY = 'hybrid.spend.v1';
const today = () => new Date().toISOString().slice(0, 10);

export function liveAi(o: {
  store: KeyValueStore;
  apiKey: string;
  /** The question's notes, for the profile digest (null: none). */
  notes: QuestionNotes | null;
  /** Tests inject a transport. */
  transport?: Parameters<typeof createMover>[0]['transport'];
}): { mover: Mover; templates: Templates } {
  const allowance = createAllowance({
    ledger: storeLedger(o.store, HYBRID_SPEND_KEY, today),
  });
  const inner = createMover({
    transport: o.transport ?? createMessagesTransport({ apiKey: o.apiKey }),
    allowance,
    profileDigest: profileDigest(loadProfile(o.store), o.notes),
  });
  const mover: Mover = async (ctx, req, signal) => {
    const tier = routeCall(req.out, allowance);
    if (!tier) {
      return null;
    }
    return inner(
      ctx,
      tier === req.out.tier ? req : { ...req, out: { ...req.out, tier } },
      signal,
    );
  };
  return { mover, templates };
}
