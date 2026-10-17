/**
 * Append-only event log (docs/DATA.md §2). Every event is stamped with the
 * base fields (id, ts, session, pseudonymous student, exercise) and validated
 * against EventSchema before it is stored; stored events are frozen.
 * In memory for now: storage (SQLite vs MMKV) is still Proposed (DECISIONS.md D2).
 */
import { EventSchema, type Event, type EventDraft } from './events';

export interface SessionInfo {
  sessionId: string;
  /** Pseudonymous; never a name or contact detail (CLAUDE.md rule 8). */
  studentId: string;
  exerciseId: string;
  contentVersion: string;
}

export interface LogClock {
  /** Wall-clock ms for `ts`. */
  now(): number;
  newId(): string;
  /** Monotonic ms for durations; defaults to the device clock (tests make it deterministic). */
  monotonic?: () => number;
}

export const defaultClock: LogClock = {
  now: () => Date.now(),
  newId: () =>
    `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
};

export type Listener = (events: readonly Event[]) => void;

export class EventLog {
  private readonly events: Event[] = [];
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly session: SessionInfo,
    private readonly clock: LogClock = defaultClock,
  ) {}

  /** Stamps, validates and appends. Throws on an invalid event: that is a bug, not user input. */
  append(drafts: readonly EventDraft[]): Event[] {
    if (drafts.length === 0) {
      return [];
    }
    const added = drafts.map(draft =>
      Object.freeze(
        EventSchema.parse({
          ...draft,
          id: this.clock.newId(),
          ts: this.clock.now(),
          ...this.session,
        }),
      ),
    );
    this.events.push(...added);
    for (const l of this.listeners) {
      l(this.events);
    }
    return added;
  }

  all(): readonly Event[] {
    return this.events;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** One JSON event per line (replay harness / export). */
  toJsonl(): string {
    return this.events.map(e => JSON.stringify(e)).join('\n');
  }
}

/** Deterministic clock for tests and replay (each monotonic read is 2 s later). */
export function fixedClock(start = 1_760_000_000_000): LogClock {
  let n = 0;
  let m = 0;
  return {
    now: () => start + n * 1000,
    newId: () => `ev-${++n}`,
    monotonic: () => (m += 2000),
  };
}
