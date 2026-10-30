/**
 * Question 1 of bac2022c-sc-ex2 as it is NOW (exsc2-0.4.0, the playable
 * slice of the method lesson): the main path, the engine's numbers, the
 * slips of the total frame, and that nothing early is shown. The old content
 * (exsc2-0.3.0) is frozen in src/content/fixtures and keeps its own tests.
 */
import exSc2 from '../../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { checkWalkthroughs } from '../walkthroughCheck';
import { createRulesPlanner } from '../../planner/rules';
import { ratToString } from '../../engine/rationalFormat';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, isMethodStep, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { FeedItem, LessonAction, LessonState } from './types';

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

function load(): LoadedExercise {
  const r = loadExercise(exSc2, exSc2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const loaded = load();

class Session {
  readonly content = buildContent(loaded, '1');
  readonly log = new EventLog(
    {
      sessionId: 's',
      studentId: 'a',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  state: LessonState;
  private t = 0;
  private readonly planner = createRulesPlanner(this.content.menu);
  constructor() {
    const r = startLesson(this.content);
    this.state = r.state;
    this.log.append(r.events);
  }
  act(a: ActionInput) {
    this.t += 1500;
    this.state = stepSync(
      this.content,
      this.state,
      { ...a, at: this.t } as LessonAction,
      this.log,
      this.planner,
    );
  }
  line(mline: string) {
    this.act({ type: 'answer', value: { mline } });
  }
  toTotal() {
    this.act({
      type: 'answer',
      value: { plan: ['c_total', 'c_fav', 'c_ratio'] },
    });
    this.act({ type: 'answer', value: { token: 'simultanément' } });
  }
  get items(): FeedItem[] {
    return this.state.items;
  }
}
const answers = (s: Session) => s.log.all().filter(e => e.t === 'answer');
const jsonOf = (x: unknown) => JSON.stringify(x);

describe('the slice: shape, version, main path', () => {
  const part = loaded.exercise.parts[0]!;
  const steps = part.groups.flatMap(g => g.steps);

  it('is exsc2-0.4.0 in the exercise and in every block it carries; Exercise 2 and 4 keep theirs (D23)', () => {
    expect(loaded.exercise.contentVersion).toBe('exsc2-0.4.0');
    const versions = new Set(jsonOf(exSc2).match(/exsc2-\d+\.\d+\.\d+/g));
    expect([...versions]).toEqual(['exsc2-0.4.0']);
    expect(
      new Set(jsonOf(exSc2Misconceptions).match(/exsc2-\d+\.\d+\.\d+/g)),
    ).toEqual(new Set(['exsc2-0.4.0']));
  });

  it('the main path: the lead, the opening card, the plan, the read tap, the three frames with the reason between, the recipe, two similar questions', () => {
    expect(steps.map(s => s.id)).toEqual([
      's1',
      'm1.opening',
      'm1.plan',
      'm1.read',
      'm1.c_total',
      'm1.c_fav',
      'm1.p_reason',
      'm1.c_ratio',
      'm1.recipe',
      'm1.sim_same',
      'm1.sim_twist',
    ]);
  });

  it('no picture on the main path: urn, comparison, boxes and choice picture are gone from it', () => {
    expect(steps.filter(s => s.kind === 'component')).toEqual([]);
  });

  it('the pictures that stay are repairs: the boxes alternative is for the total frame', () => {
    const alt = loaded.exercise.variants.find(v => v.id === 'alt-1-s4-boxes');
    expect(alt?.forSteps).toEqual(['1/m1.c_total']);
    expect(alt?.representation).toBe('GroupBoxes');
  });

  it('everything new is unreviewed', () => {
    expect(new Set(jsonOf(exSc2).match(/"reviewed":(true|false)/g))).toEqual(
      new Set(['"reviewed":false']),
    );
  });

  it('the walk-through of the total frame does not state its answer', () => {
    expect(checkWalkthroughs(loaded)).toEqual([]);
  });

  it('the AI is never asked about a method frame', () => {
    expect(isMethodStep(new Session().content, '1/m1.c_total')).toBe(true);
    expect(isMethodStep(new Session().content, '1/s1')).toBe(false);
  });
});

describe("the engine's numbers (computed, never authored)", () => {
  it('the graph of the total frame: 720, 6, 120', () => {
    const a = loaded.answers.get('1/m1.c_total');
    if (a?.kind !== 'method' || a.frame !== 'lines') {
      throw new Error('lines');
    }
    const v = (id: string) =>
      ratToString(a.graph.nodes.find(n => n.id === id)!.value);
    expect([
      v('ord'),
      v('orderings'),
      v('total'),
      v('fav'),
      v('result'),
    ]).toEqual(['720', '6', '120', '60', '1/2']);
  });
});

describe('the first acts and the write-up', () => {
  it('3 acts to the total: the plan, the word, the total line; all right the first time', () => {
    const s = new Session();
    s.toTotal();
    s.line('10*9*8/(3*2*1) = 120');
    expect(answers(s)).toHaveLength(3);
    expect(answers(s).every(e => e.t === 'answer' && e.correct)).toBe(true);
  });

  it('the model write-up comes only at the end of the part, after both similar questions, and holds the whole model', () => {
    const s = new Session();
    s.toTotal();
    s.line('10*9*8/(3*2*1) = 120');
    expect(s.items.some(i => i.kind === 'writeup')).toBe(false);
    const w = loaded.exercise.parts[0]!.writeup.modelFr;
    expect(w).toHaveLength(4);
  });
});

describe('the slips of the total frame, by value and structure', () => {
  const slips: [string, string, 'confirmed' | 'asked'][] = [
    ['10*9*8/3*2*1 = 480', 'mut.bracket_left_to_right', 'confirmed'],
    ['10*9*8/3 = 240', 'mut.divide_by_k_not_k_factorial', 'confirmed'],
    ['10*9*8/2 = 360', 'mut.one_factor_divided', 'confirmed'],
    ['(10+3)*9*8/(3*2*1) = 156', 'mut.start_number_off', 'confirmed'],
    ['11*10*9/(3*2*1) = 165', 'mut.start_number_off', 'confirmed'],
    ['10*3 = 30', 'mut.n_times_k', 'confirmed'],
  ];
  it.each(slips)('%s is %s', (raw, id) => {
    const s = new Session();
    s.toTotal();
    s.line(raw);
    expect(answers(s).at(-1)).toMatchObject({
      correct: false,
      misconceptionId: id,
      inferredBy: 'mutation',
    });
  });

  it('1000 (with replacement) and 10 (all the balls) are known wrong values of the content', () => {
    const a = new Session();
    a.toTotal();
    a.line('10*10*10 = 1000');
    expect(answers(a).at(-1)).toMatchObject({
      misconceptionId: 'draws_with_replacement',
    });
    const b = new Session();
    b.toTotal();
    b.line('5+5 = 10');
    expect(answers(b).at(-1)).toMatchObject({
      misconceptionId: 'counts_balls_not_draws',
    });
  });

  it('the ordered product alone (10*9*8 = 720) is a supporting step: not graded, no repair, the card stays', () => {
    const s = new Session();
    s.toTotal();
    s.line('10*9*8 = 720');
    s.line('3*2*1 = 6');
    expect(
      answers(s).filter(e => e.t === 'answer' && e.stepId === 'm1.c_total'),
    ).toHaveLength(0);
    expect(s.state.stack[0]?.stepId).toBe('m1.c_total');
  });

  it('a slip never shows a digit of its own: only his line (a note) or authored words', () => {
    const s = new Session();
    s.toTotal();
    s.line('10*9*8/3*2*1 = 480');
    const fb = s.items.filter(i => i.kind === 'feedback').at(-1);
    expect(fb?.kind === 'feedback' && fb.rich).toBeTruthy();
    expect(jsonOf(fb?.kind === 'feedback' && fb.rich)).not.toMatch(/[0-9]/);
  });
});

describe('nothing early', () => {
  it('hints 1 and 2 of the total frame hold no value of the question (no 120, no 60)', () => {
    const step = loaded.exercise.parts[0]!.groups.flatMap(g => g.steps).find(
      s => s.id === 'm1.c_total',
    );
    if (step?.kind !== 'mframe') {
      throw new Error('frame');
    }
    for (const h of (step.hints ?? []).slice(0, 2)) {
      expect(jsonOf(h)).not.toMatch(/\b(120|60)\b/);
    }
  });

  it('a reveal is refused until the end of the ladder (rule 6)', () => {
    const s = new Session();
    s.toTotal();
    s.act({ type: 'reveal' });
    expect(s.items.some(i => i.kind === 'answer')).toBe(false);
  });
});
