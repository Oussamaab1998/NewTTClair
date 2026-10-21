import { memoryStore } from '../storage/kv';
import type { Event } from './events';
import {
  LocalQueue,
  QUEUE_KEY,
  QUEUE_MAX,
  contextFor,
  readQueueExport,
  slimEvent,
  type QueueEntry,
} from './reports';

const device = {
  appVersion: '0.0.1',
  platform: 'ios',
  osVersion: '26.5',
  locale: 'ar-TN',
};

const base = {
  id: 'e1',
  ts: 1,
  sessionId: 's',
  studentId: 'local-anon',
  exerciseId: 'bac2022c-ex2',
  contentVersion: 'ex2-0.5.0',
  questionId: '1b',
  stepId: 's3',
};

const ask: Event = {
  ...base,
  t: 'ask',
  via: 'field',
  text: 'my own words',
  source: 'local',
  snapshot: { stepKey: '1b/s3' },
};
const longpress: Event = {
  ...base,
  id: 'e2',
  t: 'ask',
  via: 'longpress',
  mode: 'explain',
  quoted: 'quoted lesson sentence',
  source: 'local',
};

const reportEntry = (id: string): QueueEntry => ({
  kind: 'report',
  id,
  event: {
    ...base,
    id,
    t: 'report',
    blockId: 'q1b-s1',
    reason: 'unclear',
    source: 'lesson',
  },
  context: contextFor([ask, longpress], device),
});

describe('report queue', () => {
  it('persists across instances (same store) and survives bad stored data', () => {
    const store = memoryStore();
    const q = new LocalQueue(store);
    q.add(reportEntry('r1'));
    expect(new LocalQueue(store).all()).toHaveLength(1);
    store.set(QUEUE_KEY, '{not json');
    expect(new LocalQueue(store).all()).toEqual([]);
    store.set(
      QUEUE_KEY,
      JSON.stringify([{ kind: 'report', id: 'x' }, reportEntry('r2')]),
    );
    expect(new LocalQueue(store).all().map(e => e.id)).toEqual(['r2']);
  });

  it('keeps the newest QUEUE_MAX entries', () => {
    const q = new LocalQueue(memoryStore());
    for (let i = 0; i < QUEUE_MAX + 5; i += 1) {
      q.add(reportEntry(`r${i}`));
    }
    expect(q.count()).toBe(QUEUE_MAX);
    expect(q.all()[0]!.id).toBe('r5');
  });

  it('attached events keep ids and kinds, never free text', () => {
    const slim = [ask, longpress].map(slimEvent);
    const text = JSON.stringify(slim);
    expect(text).not.toContain('my own words');
    expect(text).not.toContain('quoted lesson sentence');
    expect(text).not.toContain('local-anon');
    expect(slim[1]).toMatchObject({
      t: 'ask',
      stepId: 's3',
      data: { via: 'longpress', mode: 'explain' },
    });
  });

  it('a question entry (tutor drawer, no verified answer) round-trips through the export', () => {
    const q = new LocalQueue(memoryStore());
    q.add(reportEntry('r1'));
    q.add({
      kind: 'question',
      id: 'q1',
      ts: 2,
      exerciseId: 'bac2022c-ex2',
      contentVersion: 'ex2-0.5.0',
      questionId: '1b',
      stepId: 's3',
      text: 'علاش نطرحو من واحد؟',
      context: contextFor([ask], device),
    });
    const { entries, errors } = readQueueExport(
      `${q.toJsonl()}\nnot json\n{"kind":"report"}`,
    );
    expect(entries.map(e => e.kind)).toEqual(['report', 'question']);
    expect(errors.map(e => e.line)).toEqual([3, 4]);
  });

  it('rejects an entry that does not match the schema (never stored)', () => {
    const q = new LocalQueue(memoryStore());
    expect(() =>
      q.add({
        ...reportEntry('r1'),
        context: { device, lastEvents: [] as never, extra: 1 } as never,
      }),
    ).toThrow();
    expect(q.count()).toBe(0);
  });
});
