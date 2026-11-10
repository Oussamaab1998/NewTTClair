import type { StudentAct } from '../ai/checks/autoCheck';
import { CATALOG } from '../app/exercises';
import { memoryStore } from '../storage/kv';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
  view,
  type QuestionCtx,
} from './conductor/conductor';
import type { ConductorState } from './conductor/types';
import { passTour } from './tour/passTour';
import {
  carriedFromRecords,
  clearExerciseProgress,
  clearResume,
  earlierRecords,
  loadRecord,
  loadResume,
  noExtras,
  recordFrom,
  saveRecord,
  saveResume,
  type RecordExtras,
} from './records';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const ctx = questionCtx(loaded!, entry.raw as never, '1');

function play(acts: StudentAct[], from = startQuestion(ctx)): ConductorState {
  let s = from;
  for (const a of acts) {
    const r = act(ctx, s, a);
    s = applyFallback(r.state, r.out);
  }
  return s;
}
const line = (raw: string): StudentAct => ({ kind: 'line', raw });
const TO_FAV: StudentAct[] = [
  ...passTour(ctx),
  line('10×3=30'),
  line('10×9×8÷(3×2×1)=120'),
];
const REST: StudentAct[] = [
  line('4×15=60'),
  { kind: 'choice', optionId: 'r_true' },
  line('60÷120=1÷2'),
  { kind: 'order', ids: ['rc_read', 'rc_total', 'rc_fav', 'rc_divide'] },
  line('14×13×12÷(3×2×1)=364'),
  { kind: 'continue' },
  line('12×11×10÷(3×2×1)=220'),
  { kind: 'continue' },
];
const EXTRAS: RecordExtras = {
  recipe: ['rc_read', 'rc_total', 'rc_fav', 'rc_divide'],
  components: [
    {
      id: 'c1',
      frameId: 'm1.c_total',
      name: 'UrnDraw',
      props: { draws: 3 },
      experiment: null,
      caseId: null,
      snapshot: { drawn: ['r1', 'n2'] },
      source: 'move',
    },
  ],
  rules: [{ frameId: 'm1.c_total', text: 'n9sem 3la 6', turn: 4 }],
};

describe('question records', () => {
  it('round-trips a finished question: his lines, their values, plan, picks, word, extras', () => {
    const store = memoryStore();
    const s = play([...TO_FAV, ...REST]);
    const rec = recordFrom(ctx, s, EXTRAS, 42);
    expect(saveRecord(store, rec)).toBe(true);
    const back = loadRecord(store, 'bac2022c-sc-ex2', '1');
    expect(back).toEqual(rec);
    expect(back).toMatchObject({
      done: true,
      planOrder: ['c_total', 'c_fav', 'c_ratio'],
      lines: {
        total: '10×9×8÷(3×2×1)=120',
        fav: '4×15=60',
        result: '60÷120=1÷2',
      },
      values: { total: '120', fav: '60', result: '1/2' },
      picks: { 'm1.p_reason': 'r_true' },
      // The trip shows the data: no word to tap.
      taps: [],
      fixed: [
        { node: 'total', before: '10×3=30', after: '10×9×8÷(3×2×1)=120' },
      ],
    });
    expect(carriedFromRecords([back!])).toBe(
      'question 1: total = 120 (his line 10×9×8÷(3×2×1)=120); fav = 60 (his line 4×15=60); result = 1/2 (his line 60÷120=1÷2)',
    );
  });

  it('never replaces a finished record with an unfinished run of the question', () => {
    const store = memoryStore();
    saveRecord(
      store,
      recordFrom(ctx, play([...TO_FAV, ...REST]), noExtras(), 1),
    );
    const again = recordFrom(ctx, play(TO_FAV.slice(0, 1)), noExtras(), 2);
    expect(saveRecord(store, again)).toBe(false);
    expect(loadRecord(store, 'bac2022c-sc-ex2', '1')?.done).toBe(true);
  });

  it('reads damaged or foreign data as nothing', () => {
    const store = memoryStore();
    store.set('hybrid.record.v1.bac2022c-sc-ex2.1', '{not json');
    expect(loadRecord(store, 'bac2022c-sc-ex2', '1')).toBeNull();
    store.set('hybrid.record.v1.bac2022c-sc-ex2.1', JSON.stringify({ v: 2 }));
    expect(loadRecord(store, 'bac2022c-sc-ex2', '1')).toBeNull();
  });

  it('lists the earlier questions that have a record, in exam order', () => {
    const store = memoryStore();
    saveRecord(store, recordFrom(ctx, play(TO_FAV), noExtras(), 1));
    const ids = ['1', '2', '3a', '3b'];
    expect(
      earlierRecords(store, 'bac2022c-sc-ex2', ids, '3a').map(
        r => r.questionId,
      ),
    ).toEqual(['1']);
    expect(earlierRecords(store, 'bac2022c-sc-ex2', ids, '1')).toEqual([]);
  });
});

describe('resume', () => {
  it('resumes the conductor where he left it, and the question plays on the same', () => {
    const store = memoryStore();
    const s = play(TO_FAV);
    saveResume(store, ctx, s, EXTRAS);
    const back = loadResume(store, ctx);
    expect(back?.state).toEqual(s);
    expect(back?.extras).toEqual(EXTRAS);
    expect(view(ctx, back!.state)?.frameId).toBe('m1.c_fav');
    expect(play(REST, back!.state)).toEqual(play(REST, s));
    clearResume(store, 'bac2022c-sc-ex2', '1');
    expect(loadResume(store, ctx)).toBeNull();
  });

  it('does not resume another content version, another question, or a finished one', () => {
    const store = memoryStore();
    const key = 'hybrid.resume.v1.bac2022c-sc-ex2.1';
    saveResume(store, ctx, play(TO_FAV), noExtras());
    const stored = JSON.parse(store.getString(key)!);
    store.set(key, JSON.stringify({ ...stored, contentVersion: 'old' }));
    expect(loadResume(store, ctx)).toBeNull();
    const other: QuestionCtx = questionCtx(loaded!, entry.raw as never, '2');
    saveResume(store, ctx, play(TO_FAV), noExtras());
    store.set('hybrid.resume.v1.bac2022c-sc-ex2.2', store.getString(key)!);
    expect(loadResume(store, other)).toBeNull();
    saveResume(store, ctx, play([...TO_FAV, ...REST]), noExtras());
    expect(loadResume(store, ctx)).toBeNull();
  });
});

describe('a resume saved before the tour', () => {
  it('is dropped: the question starts again with its tour', () => {
    const store = memoryStore();
    const s = play(TO_FAV);
    saveResume(store, ctx, s, EXTRAS);
    expect(loadResume(store, ctx)).not.toBeNull();
    // The same resume as an older version wrote it: no tour, no carried results.
    const key = 'hybrid.resume.v1.bac2022c-sc-ex2.1';
    const old = JSON.parse(store.getString(key)!) as {
      state: Record<string, unknown>;
    };
    delete old.state.tour;
    delete old.state.carried;
    store.set(key, JSON.stringify(old));
    expect(loadResume(store, ctx)).toBeNull();
  });
});

describe('starting the exercise from scratch', () => {
  it('clears the records, resume points and carried results of its questions only', () => {
    const store = memoryStore();
    const s = play([...TO_FAV, ...REST]);
    saveRecord(store, recordFrom(ctx, s, EXTRAS, 42));
    saveResume(store, ctx, s, EXTRAS);
    store.set('ai.carried.v1.bac2022c-sc-ex2.1', 'total = 120');
    store.set('ai.carried.v1.bac2022c-ex2.1', 'kept');
    clearExerciseProgress(store, 'bac2022c-sc-ex2', ['1', '2']);
    expect(loadRecord(store, 'bac2022c-sc-ex2', '1')).toBeNull();
    expect(loadResume(store, ctx)).toBeNull();
    expect(store.getString('ai.carried.v1.bac2022c-sc-ex2.1')).toBeUndefined();
    expect(store.getString('ai.carried.v1.bac2022c-ex2.1')).toBe('kept');
  });
});
