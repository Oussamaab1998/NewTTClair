import { memoryStore } from '../storage/kv';
import { createKvEventStore } from './eventStore';
import type { Event } from './events';
import { EventLog, fixedClock } from './log';

/** Close to the test events' timestamps, so retention keeps them. */
const NOW = () => 1_760_000_100_000;

const session = {
  sessionId: 's1',
  studentId: 'local-anon',
  exerciseId: 'bac2022c-ex2',
  contentVersion: 'ex2-0.5.0',
};

function events(n: number, from = 0): Event[] {
  return Array.from({ length: n }, (_, i) => ({
    ...session,
    id: `e${from + i}`,
    ts: 1_760_000_000_000 + from + i,
    questionId: '1b',
    stepId: 's3',
    t: 'hint',
    level: 1,
  }));
}

describe('append-only event store (MMKV layout, memory store in tests)', () => {
  it('survives a relaunch: a new store over the same storage loads every event in order', () => {
    const kv = memoryStore();
    const a = createKvEventStore(kv, { now: NOW, chunkEvents: 3 });
    a.append(events(4));
    a.append(events(3, 4));
    const b = createKvEventStore(kv, { now: NOW, chunkEvents: 3 });
    expect(b.load().map(e => e.id)).toEqual([
      'e0',
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
      'e6',
    ]);
    b.append(events(1, 7));
    expect(
      createKvEventStore(kv, { now: NOW, chunkEvents: 3 }).stats(),
    ).toMatchObject({
      events: 8,
      chunks: 3,
      dropped: 0,
    });
  });

  it('only the open chunk is rewritten; sealed chunks never change', () => {
    const kv = memoryStore();
    const writes: string[] = [];
    const spy = {
      ...kv,
      set: (k: string, v: string) => {
        writes.push(k);
        kv.set(k, v);
      },
    };
    const s = createKvEventStore(spy, { now: NOW, chunkEvents: 2 });
    s.append(events(2));
    writes.length = 0;
    s.append(events(1, 2));
    expect(writes.filter(k => k.startsWith('events.chunk.'))).toEqual([
      'events.chunk.1',
    ]);
  });

  it('keeps at most maxChunks chunks: the oldest are dropped and counted', () => {
    const s = createKvEventStore(memoryStore(), {
      chunkEvents: 2,
      maxChunks: 3,
    });
    s.append(events(9));
    expect(s.stats()).toMatchObject({ events: 5, chunks: 3, dropped: 4 });
    expect(s.load()[0]!.id).toBe('e4');
  });

  it('damaged stored data is skipped, never fatal', () => {
    const kv = memoryStore();
    const s = createKvEventStore(kv, { now: NOW, chunkEvents: 10 });
    s.append(events(2));
    kv.set(
      'events.chunk.0',
      `${kv.getString('events.chunk.0')}\n{broken\n{"t":"hint"}`,
    );
    expect(
      createKvEventStore(kv, { now: NOW })
        .load()
        .map(e => e.id),
    ).toEqual(['e0', 'e1']);
    kv.set('events.index.v1', 'nonsense');
    expect(createKvEventStore(kv, { now: NOW }).load()).toEqual([]);
  });

  it('clear removes everything', () => {
    const kv = memoryStore();
    const s = createKvEventStore(kv, { now: NOW });
    s.append(events(3));
    s.clear();
    expect(createKvEventStore(kv, { now: NOW }).stats()).toEqual({
      events: 0,
      chunks: 0,
      chars: 0,
      dropped: 0,
      expired: 0,
    });
  });
});

describe('retention rule', () => {
  it('deletes sealed chunks older than the retention period when the store opens; never the open chunk', () => {
    const kv = memoryStore();
    const DAY = 86_400_000;
    const s = createKvEventStore(kv, { now: NOW, chunkEvents: 2 });
    // events(n, from): ts = 1_760_000_000_000 + from + i
    s.append(events(5)); // chunks [e0 e1] [e2 e3] [e4] (open)
    const t0 = 1_760_000_000_000;
    const later = createKvEventStore(kv, {
      chunkEvents: 2,
      retainDays: 90,
      now: () => t0 + 91 * DAY,
    });
    expect(later.load().map(e => e.id)).toEqual(['e4']);
    expect(later.stats()).toMatchObject({ events: 1, expired: 4 });
    const recent = createKvEventStore(memoryStore(), {
      retainDays: 90,
      now: () => t0 + 10 * DAY,
    });
    expect(recent.stats().expired).toBe(0);
  });
});

describe('EventLog with a persistent sink', () => {
  it('persists every validated event; a failing sink never breaks the log', () => {
    const kv = memoryStore();
    const store = createKvEventStore(kv, { now: NOW });
    const log = new EventLog(session, fixedClock(), store);
    log.append([{ t: 'hint', questionId: '1b', stepId: 's3', level: 1 }]);
    expect(store.load()).toEqual(log.all());

    const broken = new EventLog(session, fixedClock(), {
      append: () => {
        throw new Error('disk full');
      },
    });
    expect(() =>
      broken.append([{ t: 'hint', questionId: '1b', stepId: 's3', level: 1 }]),
    ).not.toThrow();
    expect(broken.all()).toHaveLength(1);
  });
});
