/**
 * The red / black urn exercise (bac2022c-sc-ex2, docs/exercises/EX_URN_RN.md),
 * question 1, played from its JSON with the rules planner. Every number is
 * the engine's; the comments say how it is worked out by hand.
 */
// Frozen copy of question 1 as it was in exsc2-0.3.0 (before the method-lesson slice, docs/METHOD_LESSON_PROGRESS.md). Its assertions are unchanged; the live content has its own tests (scEx2.method.test.ts).
import exSc2 from '../../content/fixtures/scEx2.v030.json';
import exSc2Misconceptions from '../../content/fixtures/scEx2Misconceptions.v030.json';
import { resolveSpec } from '../../components/registry';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { runEngineCall } from '../../engine/calls';
import { toNumber, type Fraction } from '../../engine/rational';
import { createRulesPlanner, type RulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson, type LessonContent } from './lesson';
import { stepSync } from './orchestrate';
import type { FeedItem, FeedItemOf, LessonAction, LessonState } from './types';

function load(): LoadedExercise {
  const r = loadExercise(exSc2, exSc2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const loaded = load();
const ex = loaded.exercise;

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

class Session {
  readonly content: LessonContent = buildContent(loaded, '1');
  readonly log = new EventLog(
    {
      sessionId: 'sess-sc',
      studentId: 'anon-1',
      exerciseId: ex.id,
      contentVersion: ex.contentVersion,
    },
    fixedClock(),
  );
  state: LessonState;
  private t = 0;
  private readonly planner: RulesPlanner = createRulesPlanner(
    this.content.menu,
  );
  constructor() {
    const r = startLesson(this.content);
    this.state = r.state;
    this.log.append(r.events);
  }
  act(action: ActionInput): Event[] {
    this.t += 1500;
    const before = this.log.all().length;
    this.state = stepSync(
      this.content,
      this.state,
      { ...action, at: this.t } as LessonAction,
      this.log,
      this.planner,
    );
    return this.log.all().slice(before);
  }
  choose(optionId: string) {
    return this.act({ type: 'answer', value: { optionId } });
  }
  type(raw: string) {
    return this.act({ type: 'answer', value: { raw }, keys: raw.split('') });
  }
  get items(): FeedItem[] {
    return this.state.items;
  }
  activeStep(): string {
    const c = this.items.at(-1);
    if (c?.kind !== 'question' || c.ref.scope !== 'main') {
      throw new Error(`last item is ${c?.kind}`);
    }
    return c.ref.stepId;
  }
}

const answer = (s: Session) =>
  s.log
    .all()
    .filter(e => e.t === 'answer')
    .at(-1);
const lastFeedback = (s: Session) =>
  [...s.items].reverse().find(i => i.kind === 'feedback') as
    | FeedItemOf<'feedback'>
    | undefined;

describe('engine values (hard rule 1: computed, never authored)', () => {
  const v = (id: string): Fraction => loaded.values.get(id)!;
  it('C(10,3) = 120 draws; A: C(4,1) × C(6,2) = 4 × 15 = 60; P(A) = 1/2', () => {
    expect(v('nTotal')).toEqual([120, 1]);
    expect(v('c103')).toEqual([120, 1]);
    expect(v('c41')).toEqual([4, 1]);
    expect(v('c62')).toEqual([15, 1]);
    expect(v('nA')).toEqual([60, 1]);
    expect(v('pA')).toEqual([1, 2]);
  });
  it('the exam states P(A) = 0.5: the engine agrees', () => {
    expect(toNumber(v('pA'))).toBe(0.5);
  });
  it('the ordered alternative: 360 / 720 is P(A), recomputed on the ordered urn', () => {
    // 10 × 9 × 8 ordered draws; the red at one of 3 places: 3 × 4 × 6 × 5.
    expect(v('nOrd')).toEqual([720, 1]);
    expect(v('nAOrd')).toEqual([360, 1]);
    const ordered = {
      experiment: { ...ex.experiment!, draw: 'ordered' as const },
    };
    expect(runEngineCall({ fn: 'outcomeCount', args: {} }, ordered)).toEqual({
      ok: true,
      value: [720, 1],
    });
    const oneRed = ex.values!.nA!.args;
    expect(runEngineCall({ fn: 'count', args: oneRed }, ordered)).toEqual({
      ok: true,
      value: [360, 1],
    });
    expect(runEngineCall({ fn: 'probability', args: oneRed }, ordered)).toEqual(
      { ok: true, value: v('pA') },
    );
  });
});

describe('content shape', () => {
  it('the urn is coloured: 4 red balls (value 1) and 6 black (value 0), 3 drawn at once', () => {
    const urn = ex.experiment!.urn;
    expect(urn.filter(b => b.color === 'red' && b.value === 1)).toHaveLength(4);
    expect(urn.filter(b => b.color === 'black' && b.value === 0)).toHaveLength(
      6,
    );
    expect(ex.experiment).toMatchObject({ draw: 'simultaneous', k: 3 });
  });
  it('the real urn is shown once (Urn display, E4); the comparison is on the 2R 2N twin', () => {
    const steps = ex.parts[0]!.groups.flatMap(g => g.steps);
    const urnStep = steps.find(s => s.id === 'urn')!;
    const compare = steps.find(s => s.id === 'compare')!;
    if (urnStep.kind !== 'component' || compare.kind !== 'component') {
      throw new Error('component steps expected');
    }
    expect(resolveSpec(urnStep.component, ex.experiment)).toMatchObject({
      ok: true,
      props: { mode: 'display' },
    });
    expect(resolveSpec(compare.component, ex.experiment)).toMatchObject({
      ok: true,
    });
  });
  it('the paper: question 1 taught, 2 and 3 soon; no source line until the product owner gives it (D1)', () => {
    const qs = ex.paper!.parts.flatMap(p => p.questions);
    expect(qs.map(q => [q.id, q.status])).toEqual([
      ['1', 'available'],
      ['2', 'soon'],
      ['3', 'soon'],
    ]);
    expect(ex.paper!.source).toBeUndefined();
    expect(ex.section).toBe('sciences-experimentales');
  });
  it('everything is unreviewed', () => {
    expect(ex.reviewed).toBe(false);
    const trusts = JSON.stringify(exSc2).match(/"reviewed":(true|false)/g)!;
    expect(new Set(trusts)).toEqual(new Set(['"reviewed":false']));
  });
});

/** The lesson waits on a picture: its tap opens the gate (the screen's `gate_passed`). */
function passGate(s: Session, stepId: string) {
  expect(s.state.gate).toEqual({ stepId });
  s.act({ type: 'gate_passed', stepId });
}

describe('question 1, played', () => {
  /**
   * s3 (how we draw), the boxes picture (a gate), s4 (120), the choice picture
   * (a gate), s6 (60), s8 (P(A)). The pictures hold the lesson until one tap
   * (Phase 4a): the screen logs the component's `explored` and the lesson goes on.
   */
  function upToProbability(): Session {
    const s = new Session();
    expect(s.activeStep()).toBe('s3');
    s.choose('at_once');
    passGate(s, 'boxes');
    expect(s.activeStep()).toBe('s4');
    s.type('120');
    passGate(s, 'choice');
    expect(s.activeStep()).toBe('s6');
    s.type('60');
    expect(s.activeStep()).toBe('s8');
    return s;
  }

  it('the happy path ends with the writeup, values filled by the engine', () => {
    const s = upToProbability();
    s.type('1/2');
    expect(s.state.finished).toBe(true);
    const writeup = s.items.find(i => i.kind === 'writeup') as
      | FeedItemOf<'writeup'>
      | undefined;
    expect(writeup?.lines.join('\n')).toMatch(
      /C\(10,3\) = 120 tirages possibles/,
    );
    expect(writeup?.lines.join('\n')).toMatch(/P\(A\) = 60\/120 = 1\/2 = 0,5/);
    expect(writeup?.lines.join('\n')).toMatch(
      /360 tirages favorables sur .* = 720/,
    );
  });

  it('change 1: an ordered count at step c is right (360/720), like every equivalent form', () => {
    for (const raw of ['360/720', '60/120', '1/2', '0,5', '0.5']) {
      const s = upToProbability();
      const [, e] = s.type(raw);
      expect(e).toMatchObject({ t: 'answer', correct: true });
      expect(s.state.finished).toBe(true);
    }
  });

  it('change 1: 720 at step a says each group is counted 6 times (a valid ordered count)', () => {
    const s = new Session();
    s.choose('at_once');
    passGate(s, 'boxes');
    s.type('720');
    expect(answer(s)).toMatchObject({
      correct: false,
      misconceptionId: 'counts_ordered_draws',
    });
    const fb = lastFeedback(s)!;
    expect(JSON.stringify(fb.rich)).toMatch(/ستّة مرّات/);
    expect(fb.rich?.math).toBe('3 \\times 2 \\times 1');
  });

  it('E1: 1000 at step a and 54/125 at step c are diagnosed as drawing with replacement', () => {
    const s = new Session();
    s.choose('at_once');
    passGate(s, 'boxes');
    s.type('1000');
    expect(answer(s)).toMatchObject({
      misconceptionId: 'draws_with_replacement',
    });
    const t = upToProbability();
    t.type('54/125');
    expect(answer(t)).toMatchObject({
      misconceptionId: 'draws_with_replacement',
    });
  });

  it('the other wrong values of the brief are traced to their misconception', () => {
    const cases: [string, string][] = [
      ['4', 'counts_only_reds'],
      ['19', 'adds_instead_of_multiplying'],
      ['24', 'wrong_group_size'],
      ['120', 'gives_total_as_favourable'],
      ['360', 'counts_ordered_draws'],
    ];
    for (const [raw, id] of cases) {
      const s = new Session();
      s.choose('at_once');
      passGate(s, 'boxes');
      s.type('120');
      passGate(s, 'choice');
      s.type(raw);
      expect(answer(s)).toMatchObject({ correct: false, misconceptionId: id });
    }
    for (const [raw, id] of [
      ['2/5', 'single_ball_probability'],
      ['5/6', 'at_least_one_instead_of_exactly'],
      ['1/12', 'mixed_order_count'],
      ['19/120', 'adds_instead_of_multiplying'],
      ['60', 'count_given_as_probability'],
    ] as const) {
      const s = upToProbability();
      s.type(raw);
      expect(answer(s)).toMatchObject({ correct: false, misconceptionId: id });
    }
  });
});

describe('twins, transfers and deep dives (engine answers on their own urns)', () => {
  const ans = (key: string) => {
    const a = loaded.answers.get(key);
    return a?.kind === 'number' ? a.value : a;
  };
  it('simpler twins: 2R 2N draw 2 = 6; 3R 2N draw 3 = 10; P(one red) on 2R 2N = 2/3', () => {
    expect(ans('var:sim-1-total-1')).toEqual([6, 1]);
    expect(ans('var:sim-1-total-2')).toEqual([10, 1]);
    expect(ans('var:sim-1-p-1')).toEqual([2, 3]);
  });
  it('transfers on 5R 5N draw 2: 5 × 5 = 25 draws with one red; P = 25/45 = 5/9', () => {
    expect(ans('var:tr-1-onered-5r5n')).toEqual([25, 1]);
    expect(ans('var:tr-1-p-5r5n')).toEqual([5, 9]);
  });
  it('deep-dive minis: 3R 2N draw 2 = 10, one red = 3 × 2 = 6; 2R 3N P(one red) = 6/10 = 3/5', () => {
    expect(ans('dd:dd_count_draws')).toEqual([10, 1]);
    expect(ans('dd:dd_and_times')).toEqual([6, 1]);
    expect(ans('dd:dd_fav_total')).toEqual([3, 5]);
  });
  it('every typed step of question 1 has a walk-through', () => {
    const typed = ex.parts[0]!.groups.flatMap(g => g.steps).filter(
      s => s.kind === 'typed',
    );
    expect(typed.map(s => s.id)).toEqual(['s4', 's6', 's8']);
    for (const s of typed) {
      expect(s.kind === 'typed' && s.walkthrough?.lines.length).toBe(2);
    }
  });
});
