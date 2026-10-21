import { memoryStore } from '../storage/kv';
import type { Event } from '../telemetry/events';
import { createDoneRecord, doneParts, partKey } from './doneParts';

const base = {
  id: 'e',
  ts: 1,
  sessionId: 's',
  studentId: 'st',
  exerciseId: 'bac2022c-ex4',
  contentVersion: 'ex4-0.1.0',
  questionId: 'A1',
  stepId: 'part',
};
const partDone = (answered: number, revealed: number, extra = {}): Event =>
  ({
    ...base,
    t: 'part_done',
    counted: answered + revealed,
    answered,
    revealed,
    ...extra,
  } as Event);
const A1 = partKey('bac2022c-ex4', 'A1');

describe('doneParts: only a part whose session reached the done line by the student', () => {
  it('a finished part with at least one step done by the student counts', () => {
    expect(doneParts([partDone(3, 1)]).has(A1)).toBe(true);
  });
  it('revealed-only (every step shown) does not count', () => {
    expect(doneParts([partDone(0, 4)]).has(A1)).toBe(false);
  });
  it('abandoned (answers but no part_done) does not count', () => {
    const answer = { ...base, t: 'answer' } as unknown as Event;
    expect(doneParts([answer]).size).toBe(0);
  });
  it('matched by exercise + question across content versions; other parts stay apart', () => {
    const done = doneParts([
      partDone(1, 0, { contentVersion: 'ex4-0.0.9' }),
      partDone(0, 3, { questionId: 'A2' }),
    ]);
    expect([...done]).toEqual([A1]);
  });
});

describe('the done-parts record (the event cap never erases a done mark)', () => {
  it('keeps the first done, survives losing the events, unions with events', () => {
    const record = createDoneRecord(memoryStore());
    record.note(partDone(0, 4)); // revealed-only: not recorded
    expect(record.all()).toEqual({});
    record.note(partDone(2, 0, { ts: 10 }));
    record.note(partDone(4, 0, { ts: 20 }));
    expect(record.all()).toEqual({
      [A1]: { firstDoneAt: 10, contentVersion: 'ex4-0.1.0' },
    });
    // The event store pruned or cleared: the record still says A1 is done.
    expect(doneParts([], record).has(A1)).toBe(true);
    // And events add what the record does not hold yet.
    const both = doneParts([partDone(1, 0, { questionId: 'A2' })], record);
    expect([...both].sort()).toEqual([A1, partKey('bac2022c-ex4', 'A2')]);
  });
  it('damaged stored data reads as empty, never a crash', () => {
    const kv = memoryStore();
    kv.set('done-parts', '{not json');
    expect(createDoneRecord(kv).all()).toEqual({});
  });
});

// part_done itself (emitted at the done line, with its counts): src/lesson/session/ex4.test.ts.
