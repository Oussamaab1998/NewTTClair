/**
 * Keeps what the student did on a card (selected outcomes, typed text) when a
 * deep dive pauses it: the re-asked card for the same step starts from the
 * paused card's `getStateSnapshot()`. UI state only; the lesson reducer and
 * the event log are untouched (the paused card stays mounted, readonly).
 */
import { createContext, type RefObject } from 'react';

import type { ComponentHandle, JsonObject } from '../../components/contract';

interface Entry {
  cardKey: string;
  handle: RefObject<ComponentHandle | null>;
}

export class CardMemory {
  private entries = new Map<string, Entry>();

  register(
    stepKey: string,
    cardKey: string,
    handle: RefObject<ComponentHandle | null>,
  ) {
    this.entries.set(stepKey, { cardKey, handle });
  }

  unregister(stepKey: string, cardKey: string) {
    if (this.entries.get(stepKey)?.cardKey === cardKey) {
      this.entries.delete(stepKey);
    }
  }

  /** State of the previous card for this step (not this card itself). */
  restore(stepKey: string, cardKey: string): JsonObject | undefined {
    const e = this.entries.get(stepKey);
    if (!e || e.cardKey === cardKey) {
      return undefined;
    }
    return e.handle.current?.getStateSnapshot();
  }
}

export const CardMemoryContext = createContext<CardMemory | null>(null);
