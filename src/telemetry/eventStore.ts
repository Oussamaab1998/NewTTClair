/**
 * Append-only local event store (DECISIONS.md D2: MMKV now, behind this
 * interface so SQLite can replace it). Events survive app relaunch.
 *
 * MMKV facts that shape the layout (sources in DECISIONS.md D2 update):
 * it keeps everything in memory, appends each write to its file and rewrites
 * the whole file when it fills up, and rewriting one key over and over grows
 * the file until that rewrite. So: a separate MMKV instance; events in small
 * chunks (JSONL values); only the open chunk is rewritten on append, sealed
 * chunks never change; a hard cap on the number of chunks (oldest dropped,
 * and counted, beyond it).
 */
import type { KeyValueStore } from '../storage/kv';
import { EventSchema, type Event } from './events';

export interface EventStoreStats {
  events: number;
  chunks: number;
  /** UTF-16 length of the stored values (a size estimate). */
  chars: number;
  /** Events dropped by the cap since the store was created. */
  dropped: number;
  /** Events deleted by the retention rule since the store was created. */
  expired: number;
}

export interface EventStore {
  append(events: readonly Event[]): void;
  /** Every stored event, oldest first (invalid stored data is skipped). */
  load(): Event[];
  stats(): EventStoreStats;
  clear(): void;
}

export const CHUNK_EVENTS = 50;
export const MAX_CHUNKS = 40;
/**
 * Retention (untuned; to confirm with the legal review, PILOT_CONSENT.md
 * OPEN 5): sealed chunks whose newest event is older than this are deleted
 * when the store opens. The size cap (MAX_CHUNKS) applies on top.
 */
export const RETAIN_DAYS = 90;
const DAY_MS = 86_400_000;

const INDEX_KEY = 'events.index.v1';
const chunkKey = (n: number) => `events.chunk.${n}`;

interface Index {
  /** Chunk numbers in order; the last one is open. */
  chunks: number[];
  next: number;
  openCount: number;
  dropped: number;
  expired?: number;
}

const emptyIndex = (): Index => ({
  chunks: [],
  next: 0,
  openCount: 0,
  dropped: 0,
  expired: 0,
});

function readIndex(store: KeyValueStore): Index {
  try {
    const raw = store.getString(INDEX_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Index>) : null;
    if (
      v &&
      Array.isArray(v.chunks) &&
      v.chunks.every(n => Number.isInteger(n)) &&
      Number.isInteger(v.next) &&
      Number.isInteger(v.openCount) &&
      Number.isInteger(v.dropped)
    ) {
      return v as Index;
    }
  } catch {
    // Corrupt index: start again (the chunks are unreachable, not trusted).
  }
  return emptyIndex();
}

export function createKvEventStore(
  store: KeyValueStore,
  o: {
    chunkEvents?: number;
    maxChunks?: number;
    retainDays?: number;
    now?: () => number;
  } = {},
): EventStore {
  const chunkEvents = o.chunkEvents ?? CHUNK_EVENTS;
  const maxChunks = o.maxChunks ?? MAX_CHUNKS;
  const cutoff = (o.now ?? Date.now)() - (o.retainDays ?? RETAIN_DAYS) * DAY_MS;
  let index = readIndex(store);
  // Retention: drop sealed chunks whose newest event is older than the cutoff.
  {
    const sealed = index.chunks.slice(0, -1);
    const keep: number[] = [];
    let expired = 0;
    for (const n of sealed) {
      const lines = (store.getString(chunkKey(n)) ?? '')
        .split('\n')
        .filter(Boolean);
      const last = lines[lines.length - 1];
      let ts = Number.POSITIVE_INFINITY;
      try {
        ts = last ? (JSON.parse(last) as { ts?: number }).ts ?? ts : ts;
      } catch {
        ts = Number.NEGATIVE_INFINITY; // unreadable: treat as expired
      }
      if (ts < cutoff) {
        store.remove(chunkKey(n));
        expired += lines.length;
      } else {
        keep.push(n);
      }
    }
    if (expired > 0) {
      index = {
        ...index,
        chunks: [...keep, ...index.chunks.slice(-1)],
        expired: (index.expired ?? 0) + expired,
      };
      store.set(INDEX_KEY, JSON.stringify(index));
    }
  }
  /** The open chunk's lines, kept in memory to avoid re-reading it per append. */
  let open: string[] = (() => {
    const last = index.chunks[index.chunks.length - 1];
    const raw =
      last === undefined ? undefined : store.getString(chunkKey(last));
    return raw ? raw.split('\n').filter(Boolean) : [];
  })();

  const saveIndex = () => store.set(INDEX_KEY, JSON.stringify(index));

  return {
    append(events) {
      let dirty = false;
      const writeOpen = () => {
        const current = index.chunks[index.chunks.length - 1];
        if (dirty && current !== undefined) {
          store.set(chunkKey(current), open.join('\n'));
          dirty = false;
        }
      };
      for (const e of events) {
        if (index.chunks.length === 0 || index.openCount >= chunkEvents) {
          // Seal the full chunk (written if it has unsaved events, then never again).
          writeOpen();
          index.chunks.push(index.next);
          index.next += 1;
          index.openCount = 0;
          open = [];
          while (index.chunks.length > maxChunks) {
            const oldest = index.chunks.shift()!;
            store.remove(chunkKey(oldest));
            index.dropped += chunkEvents;
          }
        }
        open.push(JSON.stringify(e));
        index.openCount += 1;
        dirty = true;
      }
      if (events.length > 0) {
        writeOpen();
        saveIndex();
      }
    },
    load() {
      const out: Event[] = [];
      for (const n of index.chunks) {
        for (const line of (store.getString(chunkKey(n)) ?? '').split('\n')) {
          if (!line) {
            continue;
          }
          try {
            const r = EventSchema.safeParse(JSON.parse(line));
            if (r.success) {
              out.push(r.data);
            }
          } catch {
            // A damaged line is skipped, never fatal.
          }
        }
      }
      return out;
    },
    stats() {
      let chars = 0;
      let events = 0;
      for (const n of index.chunks) {
        const raw = store.getString(chunkKey(n)) ?? '';
        chars += raw.length;
        events += raw ? raw.split('\n').filter(Boolean).length : 0;
      }
      return {
        events,
        chunks: index.chunks.length,
        chars,
        dropped: index.dropped,
        expired: index.expired ?? 0,
      };
    },
    clear() {
      for (const n of index.chunks) {
        store.remove(chunkKey(n));
      }
      index = emptyIndex();
      open = [];
      store.remove(INDEX_KEY);
    },
  };
}
