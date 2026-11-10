/**
 * The map strip under the header, computed by the app from the engine's
 * credits (never from what the tutor says): the question's plan steps, each
 * done, now or later. Before he ordered the plan himself the steps have no
 * text, so the strip does not give the plan away.
 */
import type { QuestionPack } from '../packs/build';
import type { SessionState } from './state';

export type StepState = 'done' | 'now' | 'later';

export interface MapStep {
  cardId: string;
  state: StepState;
}

export interface StepMap {
  steps: MapStep[];
  /** True once he put the plan in a valid order: the strip may name the steps. */
  ordered: boolean;
  /** Card texts of the step now and the one after (null when hidden or none). */
  now: string | null;
  next: string | null;
}

/** The main-graph node a card settles: its own key, or the result for the last card. */
function cardNode(pack: QuestionPack, cardId: string): string | null {
  const nodes = pack.main?.graph.nodes ?? [];
  const card = pack.plan.find(c => c.id === cardId);
  if (!card) {
    return null;
  }
  if (nodes.some(n => n.id === card.key)) {
    return card.key;
  }
  const last = !pack.plan.some(c => c.needs.includes(card.id));
  return last ? nodes.find(n => n.role === 'result')?.id ?? null : null;
}

export function stepMap(pack: QuestionPack, s: SessionState): StepMap | null {
  if (pack.plan.length === 0) {
    return null;
  }
  const credited = new Set(s.credited.main ?? []);
  const result = pack.main?.graph.nodes.find(n => n.role === 'result')?.id;
  const finished = result !== undefined && credited.has(result);
  const order = s.planOrder ?? pack.plan.map(c => c.id);
  const done = (cardId: string, seen = new Set<string>()): boolean => {
    if (finished) {
      return true;
    }
    if (seen.has(cardId)) {
      return false;
    }
    seen.add(cardId);
    const node = cardNode(pack, cardId);
    if (node) {
      return credited.has(node);
    }
    // A card with no line of its own (Q3a "what is a success") is done once
    // a step that needs it is done.
    return pack.plan.some(c => c.needs.includes(cardId) && done(c.id, seen));
  };
  let nowAt = -1;
  const steps = order.map((cardId, i): MapStep => {
    if (done(cardId)) {
      return { cardId, state: 'done' };
    }
    if (nowAt < 0) {
      nowAt = i;
      return { cardId, state: 'now' };
    }
    return { cardId, state: 'later' };
  });
  const ordered = s.planOrder !== null;
  const textOf = (i: number): string | null => {
    const id = order[i];
    const card = id ? pack.plan.find(c => c.id === id) : undefined;
    return ordered && card && card.text !== '' ? card.text : null;
  };
  return {
    steps,
    ordered,
    now: nowAt >= 0 ? textOf(nowAt) : null,
    next: nowAt >= 0 ? textOf(nowAt + 1) : null,
  };
}
