import { memoryStore } from '../storage/kv';
import type { Event } from '../telemetry/events';
import {
  createDoneRecord,
  doneParts,
  partKey,
  resetExercise,
} from './doneParts';

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

const reset = (ts: number, exerciseId = 'bac2022c-ex4'): Event =>
  ({
    ...base,
    id: `r${ts}`,
    ts,
    sessionId: `reset-${ts}`,
    exerciseId,
    questionId: 'exercise',
    stepId: 'reset',
    t: 'exercise_reset',
  } as Event);
/** A session: an answer at `start`, its part_done at `start + 5`. */
const session = (id: string, start: number, extra = {}): Event[] => [
  {
    ...base,
    id: `${id}-a`,
    ts: start,
    sessionId: id,
    t: 'answer',
    ...extra,
  } as unknown as Event,
  partDone(2, 0, { id: `${id}-d`, ts: start + 5, sessionId: id, ...extra }),
];
const EX2_1B = partKey('bac2022c-ex2', '1b');

describe('«ابدا من جديد»: a reset wipes earlier progress of that exercise only', () => {
  it('a part done before the reset no longer counts; done again after it, it does', () => {
    const before = session('s1', 10);
    expect(doneParts([...before, reset(100)]).has(A1)).toBe(false);
    const after = session('s2', 200);
    expect(doneParts([...before, reset(100), ...after]).has(A1)).toBe(true);
  });
  it('a session that started before the reset does not count, even if it ended after it', () => {
    const spanning = [
      ...session('s1', 90).slice(0, 1),
      reset(100),
      ...session('s1', 90)
        .slice(1)
        .map(e => ({ ...e, ts: 150 })),
    ];
    expect(doneParts(spanning).has(A1)).toBe(false);
  });
  it('the latest reset wins; another exercise is untouched', () => {
    const ex2 = session('e2', 10, {
      exerciseId: 'bac2022c-ex2',
      questionId: '1b',
    });
    const done = doneParts([
      ...session('s1', 10),
      reset(50),
      ...session('s2', 60),
      reset(100),
      ...ex2,
    ]);
    expect(done.has(A1)).toBe(false);
    expect(done.has(EX2_1B)).toBe(true);
  });
  it('the record: cleared for that exercise only; a stale entry before the reset is ignored', () => {
    const record = createDoneRecord(memoryStore());
    record.note(partDone(2, 0, { ts: 10 }));
    record.note(
      partDone(2, 0, { ts: 10, exerciseId: 'bac2022c-ex2', questionId: '1b' }),
    );
    // A stale entry (as if clearing had failed): ignored after a later reset.
    expect([...doneParts([reset(100)], record)]).toEqual([EX2_1B]);
    record.clearExercise('bac2022c-ex4');
    expect(Object.keys(record.all())).toEqual([EX2_1B]);
  });
  it("resetExercise logs exercise_reset (history kept) and clears the exercise's marks", () => {
    const stored: Event[] = [...session('s1', 10)];
    const record = createDoneRecord(memoryStore());
    record.note(stored[1]!);
    resetExercise(
      { id: 'bac2022c-ex4', contentVersion: 'ex4-0.1.0' },
      {
        eventStore: {
          append: es => {
            stored.push(...es);
          },
        },
        doneRecord: record,
        clock: { now: () => 500, newId: () => 'r1' },
      },
    );
    expect(stored).toHaveLength(3); // nothing deleted
    expect(stored.at(-1)).toMatchObject({
      t: 'exercise_reset',
      exerciseId: 'bac2022c-ex4',
      ts: 500,
    });
    expect(record.all()).toEqual({});
    expect(doneParts(stored, record).size).toBe(0);
  });
});

// part_done itself (emitted at the done line, with its counts): src/lesson/session/ex4.test.ts.
