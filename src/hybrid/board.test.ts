import type { StudentAct } from '../ai/checks/autoCheck';
import { CATALOG } from '../app/exercises';
import { fractionToPlain } from '../engine/format';
import { evalChain } from '../method/lineChain';
import { memoryStore } from '../storage/kv';
import {
  boardSteps,
  carriedOf,
  exerciseSheet,
  foundInputOf,
  foundSheet,
  marksOf,
  reusedSteps,
  roadSheet,
  slipsFixed,
  stripOf,
  tappedWords,
} from './board';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from './conductor/conductor';
import type { ConductorState } from './conductor/types';
import { passTour } from './tour/passTour';
import { isTouring, roadView, type Carried } from './tour/tour';
import {
  foundInputOfRecord,
  loadRecord,
  noExtras,
  recordFrom,
  saveRecord,
} from './records';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const ctx1 = questionCtx(loaded!, entry.raw as never, '1');
const ctx2 = questionCtx(loaded!, entry.raw as never, '2');
const ctx3a = questionCtx(loaded!, entry.raw as never, '3a');

/** Plays acts with the prepared replies (no AI), returning every state on the way. */
function play(
  ctx: QuestionCtx,
  acts: StudentAct[],
  carried: Carried = {},
): ConductorState[] {
  let s = startQuestion(ctx, { carried });
  const out = [s];
  for (const a of acts) {
    const r = act(ctx, s, a);
    s = applyFallback(r.state, r.out);
    out.push(s);
  }
  return out;
}
const line = (raw: string): StudentAct => ({ kind: 'line', raw });
/** The trip of question 1: «نبداو» (states[TRIP_END] is his first step). */
const TRIP1 = passTour(ctx1);
const TRIP_END = TRIP1.length;
const Q1: StudentAct[] = [
  ...TRIP1,
  line('10×3=30'),
  line('10×9×8÷(3×2×1)=120'),
  line('4×6=24'),
  line('4×15=60'),
  { kind: 'choice', optionId: 'r_add' },
  { kind: 'choice', optionId: 'r_true' },
  line('60÷120=1÷2'),
  { kind: 'order', ids: ['rc_read', 'rc_total', 'rc_fav', 'rc_divide'] },
  line('14×13×12÷(3×2×1)=364'),
  { kind: 'continue' },
  line('12×11×10÷(3×2×1)=220'),
  { kind: 'continue' },
];
/** On c_fav: his total line credited (after a slip). */
const AT_FAV = TRIP_END + 2;
/** On c_ratio: his total and favourable lines credited, the pick done. */
const AT_RATIO = TRIP_END + 6;

/** Every number shown in a value (ids, keys and labels are not shown as values). */
function numbersIn(x: unknown, key = ''): string[] {
  if (/(?:^id|Id|Ids|^key|^label|^node)$/.test(key)) {
    return [];
  }
  if (typeof x === 'string') {
    return x.match(/\d+/g) ?? [];
  }
  if (Array.isArray(x)) {
    return x.flatMap(v => numbersIn(v));
  }
  if (x && typeof x === 'object') {
    return Object.entries(x).flatMap(([k, v]) => numbersIn(v, k));
  }
  return [];
}

/** The numbers he may see: the statement's, his own lines', his earned values'. */
function allowed(ctx: QuestionCtx, states: ConductorState[]): Set<string> {
  const ex = loaded!.exercise;
  const s = states[states.length - 1]!;
  const own = states.flatMap(x => [
    ...x.session.lines.map(l => l.raw),
    ...x.progress.lines,
  ]);
  const earned = Object.values(s.nodeLines).map(raw => {
    const c = evalChain(raw);
    return c.kind === 'unreadable' ? '' : fractionToPlain(c.value);
  });
  const target = [...ctx.frames.values()].find(f => f.target)?.target;
  return new Set(
    numbersIn([
      ex.statement,
      ex.paper,
      ctx.pack.given,
      target ?? null,
      own,
      earned,
    ]),
  );
}

function boardOf(ctx: QuestionCtx, s: ConductorState, earlier = []) {
  const steps = boardSteps(ctx, s);
  const road = roadView(ctx, s);
  return {
    steps,
    strip: stripOf(steps, road),
    reused: reusedSteps(ctx, s),
    road: roadSheet(ctx, s, road, steps, []),
    exercise: exerciseSheet(
      loaded!,
      ctx.questionId,
      new Set<string>(),
      tappedWords(ctx, s),
    ),
    found: foundSheet(loaded!, earlier, foundInputOf(ctx, s, [])),
  };
}

/** Question 1 played to the end, saved as a record (what question 2 starts from). */
function q1Record() {
  const states = play(ctx1, Q1);
  const store = memoryStore();
  saveRecord(store, recordFrom(ctx1, states.at(-1)!, noExtras(), 1));
  return { states, rec: loadRecord(store, ctx1.exerciseId, '1')! };
}

describe('board: the strip and his steps', () => {
  it('while the trip is shown: no step card yet, the strip holds the map with its first station', () => {
    const [start] = play(ctx1, []);
    expect(isTouring(ctx1, start!)).toBe(true);
    const steps = boardSteps(ctx1, start!);
    expect(steps.map(x => x.kind)).toEqual([
      'card',
      'card',
      'card',
      'recipe',
      'similar',
    ]);
    // No step is his yet: their titles stay on the map, not on his steps.
    expect(steps.filter(x => x.kind === 'card').map(x => x.short)).toEqual([
      null,
      null,
      null,
    ]);
    const road = roadView(ctx1, start!);
    const strip = stripOf(steps, road);
    expect(strip.steps.map(x => `${x.key}:${x.status}`)).toEqual([
      'c_total:now',
      'c_fav:later',
      'c_ratio:later',
    ]);
    expect(strip.end).toBe('later');
    expect(strip.now).toEqual({ kind: 'step', title: road.steps[0]!.title });
  });

  it('follows the map; a finished step carries his line and his pick; the strip names the station he is on', () => {
    const s = play(ctx1, Q1.slice(0, AT_RATIO)).at(-1)!;
    const steps = boardSteps(ctx1, s);
    expect(steps.map(x => x.key)).toEqual([
      'c_total',
      'c_fav',
      'c_ratio',
      'm1.recipe',
      'similar',
    ]);
    expect(steps[0]).toMatchObject({
      status: 'done',
      work: { lines: ['10×9×8÷(3×2×1)=120'] },
    });
    const fav = steps.find(x => x.key === 'c_fav')!;
    expect(fav).toMatchObject({ status: 'done', work: { lines: ['4×15=60'] } });
    expect(fav.work.picks).toHaveLength(1);
    const ratio = steps.find(x => x.key === 'c_ratio')!;
    expect(ratio).toMatchObject({ status: 'now', work: { lines: [] } });
    expect(ratio.short).not.toBeNull();
    const road = roadView(ctx1, s);
    const strip = stripOf(steps, road);
    expect(strip.steps).toEqual([
      { key: 'c_total', status: 'done', reused: false },
      { key: 'c_fav', status: 'done', reused: false },
      { key: 'c_ratio', status: 'now', reused: false },
    ]);
    expect(strip.end).toBe('later');
    expect(strip.now).toEqual({ kind: 'step', title: road.steps[2]!.title });
    expect(strip.next).toMatchObject({ kind: 'recipe' });
  });

  it('the end of the map: the recipe, the similar questions, then done', () => {
    const states = play(ctx1, Q1);
    const at = (i: number) => {
      const s = states[i]!;
      return stripOf(boardSteps(ctx1, s), roadView(ctx1, s));
    };
    const recipe = at(AT_RATIO + 1);
    expect(recipe.steps.every(x => x.status === 'done')).toBe(true);
    expect(recipe.end).toBe('now');
    expect(recipe.now).toEqual({ kind: 'recipe', title: null });
    expect(at(AT_RATIO + 2).now).toEqual({ kind: 'similar', title: null });
    const end = at(states.length - 1);
    expect(end.end).toBe('done');
    expect(end.now).toBeNull();
  });

  it('a step reused from question 1 is done from the trip on, with his question 1 line', () => {
    const { rec } = q1Record();
    const carried = carriedOf([rec]);
    expect(carried['1/total']).toEqual({
      line: '10×9×8÷(3×2×1)=120',
      value: '120',
    });
    // On the trip: the map shows it found, with his line and the question.
    const [trip] = play(ctx2, [], carried);
    expect(reusedSteps(ctx2, trip!)).toEqual({
      c_total: { questionId: '1', label: '1', line: '10×9×8÷(3×2×1)=120' },
    });
    expect(roadView(ctx2, trip!).steps[0]).toMatchObject({
      cardId: 'c_total',
      reused: true,
    });
    // After «نبداو»: done, skipped, and the strip starts at the next step.
    const s = play(ctx2, passTour(ctx2), carried).at(-1)!;
    const steps = boardSteps(ctx2, s);
    expect(steps[0]).toMatchObject({
      key: 'c_total',
      status: 'done',
      frameIds: [],
      fromQuestionId: '1',
      work: { lines: ['10×9×8÷(3×2×1)=120'] },
    });
    expect(steps[1]).toMatchObject({ key: 'c_fav', status: 'now' });
    const strip = stripOf(steps, roadView(ctx2, s));
    expect(strip.steps[0]).toEqual({
      key: 'c_total',
      status: 'done',
      reused: true,
    });
    const sheet = roadSheet(ctx2, s, roadView(ctx2, s), steps, []);
    expect(sheet.reused).toEqual({
      c_total: { questionId: '1', label: '1', line: '10×9×8÷(3×2×1)=120' },
    });
    expect(sheet.here).toMatchObject({ cardId: 'c_fav' });
  });
});

describe('board: the sheets', () => {
  it('never shows a value he has not earned, at any point of the question (the map too)', () => {
    const states = play(ctx1, Q1);
    states.forEach((s, i) => {
      const shown = numbersIn(boardOf(ctx1, s));
      const ok = allowed(ctx1, states.slice(0, i + 1));
      expect(shown.filter(n => !ok.has(n))).toEqual([]);
    });
    // Before his total line, the board (the map too) has no 120 anywhere.
    const beforeTotal = states[TRIP_END + 1]!;
    expect(JSON.stringify(boardOf(ctx1, beforeTotal))).not.toMatch(/120/);
    expect(JSON.stringify(boardOf(ctx1, states.at(-1)!))).toMatch(/120/);
  });

  it('question 2 shows question 1 only from its record, and no unearned value of its own', () => {
    const { states: q1, rec } = q1Record();
    const earlier = [foundInputOfRecord(rec)];
    const states = play(ctx2, passTour(ctx2), carriedOf([rec]));
    // His question 1 lines (credited, and the slips he fixed).
    const his = numbersIn(q1.at(-1)!.session.lines.map(l => l.raw));
    for (const s of states) {
      const board = boardOf(ctx2, s, earlier as never);
      const ok = new Set([...allowed(ctx2, [s]), ...his]);
      expect(numbersIn(board).filter(n => !ok.has(n))).toEqual([]);
    }
    const [start] = states;
    const board = boardOf(ctx2, start!, earlier as never);
    // p(B) = 1/6 is not given by the statement: not shown before he finds it.
    expect(board.exercise.results.map(r => r.id)).toEqual(['p_A_1_2']);
    expect(board.found.map(f => [f.questionId, f.current])).toEqual([
      ['1', false],
      ['2', true],
    ]);
    // The map carries what he found in question 1: his line, on the step it settles.
    expect(board.road.reused.c_total?.line).toBe('10×9×8÷(3×2×1)=120');
  });

  it('a question 2 without question 1 has nothing to reuse: he computes it', () => {
    const s = play(ctx2, passTour(ctx2)).at(-1)!;
    expect(reusedSteps(ctx2, s)).toEqual({});
    expect(roadView(ctx2, s).steps[0]).toMatchObject({ reused: false });
    expect(roadView(ctx2, s).ready).toBe(true);
    expect(boardSteps(ctx2, s)[0]).toMatchObject({
      key: 'c_total',
      status: 'now',
    });
  });

  it('question 3a: what we have shows his question 1 result, and nothing he has not earned', () => {
    const { states: q1, rec } = q1Record();
    const [start] = play(ctx3a, [], carriedOf([rec]));
    const road = roadView(ctx3a, start!);
    expect(road.have[0]!.his).toEqual({ line: '60÷120=1÷2', value: '1/2' });
    const his = numbersIn(q1.at(-1)!.session.lines.map(l => l.raw));
    const ok = new Set([...allowed(ctx3a, [start!]), ...his]);
    expect(numbersIn(road).filter(n => !ok.has(n))).toEqual([]);
    // Without question 1, no line of his on the map.
    const [fresh] = play(ctx3a, []);
    expect(roadView(ctx3a, fresh!).have.every(l => l.his === null)).toBe(true);
  });

  it('«التمرين»: the current question, the data, the given result', () => {
    const [start] = play(ctx1, []);
    const before = exerciseSheet(
      loaded!,
      '1',
      new Set(),
      tappedWords(ctx1, start!),
    );
    expect(before.statement.marks).toEqual([
      { word: 'quatre', kind: 'data' },
      { word: 'six', kind: 'data' },
      { word: 'trois', kind: 'data' },
    ]);
    expect(before.questions.map(q => [q.id, q.state])).toEqual([
      ['1', 'current'],
      ['2', 'available'],
      ['3a', 'available'],
      ['3b', 'available'],
    ]);
    expect(before.results).toEqual([
      expect.objectContaining({ id: 'p_A_1_2', why: 'given' }),
    ]);
    // The map shows the words: after «نبداو» he has tapped none.
    const started = play(ctx1, TRIP1).at(-1)!;
    expect(tappedWords(ctx1, started)).toEqual([]);
    const after = exerciseSheet(
      loaded!,
      '1',
      new Set(['2']),
      tappedWords(ctx1, started),
    );
    expect(after.statement.marks).toEqual(before.statement.marks);
    expect(after.questions[1]!.state).toBe('done');
    expect(after.results.map(r => [r.id, r.why])).toEqual([
      ['p_A_1_2', 'given'],
      ['p_B_2_2', 'proven'],
    ]);
  });

  it('marks numbers written in words or digits, once each', () => {
    expect(marksOf('n ≥ 2, deux fois, 2 urnes', ['fois'])).toEqual([
      { word: '2', kind: 'data' },
      { word: 'deux', kind: 'data' },
      { word: 'fois', kind: 'tapped' },
    ]);
  });

  it('«الطريق»: the map with where he is, the components by step, the method card only after his recipe', () => {
    const mid = play(ctx1, Q1.slice(0, AT_FAV)).at(-1)!;
    const road = roadSheet(
      ctx1,
      mid,
      roadView(ctx1, mid),
      boardSteps(ctx1, mid),
      [
        {
          id: 'u1',
          frameId: 'm1.c_fav',
          name: 'UrnDraw',
          props: {},
          experiment: null,
          caseId: null,
          snapshot: null,
          source: 'move',
        },
        {
          id: 'u2',
          frameId: 'm1.recipe',
          name: 'UrnDraw',
          props: {},
          experiment: null,
          caseId: null,
          snapshot: null,
          source: 'move',
        },
      ],
    );
    // The map states the goal: the result the statement gives is not repeated.
    expect(road.road.goal).toEqual({
      says: expect.anything(),
      fr: 'Montrer que P(A) = 0,5',
      his: null,
    });
    expect(road.road.ready).toBe(true);
    expect(road.target).toBeNull();
    expect(road.card).toBeNull();
    expect(road.reused).toEqual({});
    expect(road.here).toMatchObject({ cardId: 'c_fav' });
    expect(road.here!.now).not.toBeNull();
    expect(road.components.c_fav!.map(c => c.id)).toEqual(['u1']);
    expect(road.components['']!.map(c => c.id)).toEqual(['u2']);
    expect(road.road.steps.map(x => [x.cardId, x.status, x.line])).toEqual([
      ['c_total', 'done', '10×9×8÷(3×2×1)=120'],
      ['c_fav', 'now', null],
      ['c_ratio', 'later', null],
    ]);
    const end = play(ctx1, Q1).at(-1)!;
    const atEnd = roadSheet(
      ctx1,
      end,
      roadView(ctx1, end),
      boardSteps(ctx1, end),
      [],
    );
    expect(atEnd.card?.checks.length).toBeGreaterThan(0);
    expect(atEnd.here).toBeNull();
    expect(atEnd.road.after.map(x => x.status)).toEqual(['done', 'done']);
  });

  it('«اللي لقيناه»: blanks filled from his lines only, his fixed slips, the card at the end', () => {
    const states = play(ctx1, Q1);
    const mid = states[TRIP_END + 4]!; // total and favourable credited, the division not yet
    const [now] = foundSheet(loaded!, [], foundInputOf(ctx1, mid, []));
    const fills = now!.writeup.flatMap(r =>
      r.parts.flatMap(p => ('node' in p ? [[p.node, p.value]] : [])),
    );
    expect(fills).toEqual([
      ['total', '120'],
      ['fav', '60'],
      ['fav', '60'],
      ['total', '120'],
      ['result', null],
    ]);
    expect(now!.card).toBeNull();
    expect(now!.fixed).toEqual([
      { node: 'total', before: '10×3=30', after: '10×9×8÷(3×2×1)=120' },
      { node: 'fav', before: '4×6=24', after: '4×15=60' },
    ]);
    const [end] = foundSheet(
      loaded!,
      [],
      foundInputOf(ctx1, states.at(-1)!, []),
    );
    expect(end!.card).not.toBeNull();
    expect(end!.done).toBe(true);
  });

  it('a slip is fixed only by a later credited line of the same node', () => {
    const s = play(ctx1, Q1.slice(0, AT_FAV + 1)).at(-1)!;
    expect(slipsFixed(s.session)).toEqual([
      { node: 'total', before: '10×3=30', after: '10×9×8÷(3×2×1)=120' },
    ]);
  });
});
