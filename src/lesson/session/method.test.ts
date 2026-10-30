/**
 * The method lesson played through the reducer and the rules planner, on the
 * small fixture exercise (docs/METHOD_LESSON_PLAN.md and its addendum).
 */
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { methodExercise } from '../../method/fixtures/methodExercise';
import { createRulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson, type LessonContent } from './lesson';
import { stepSync } from './orchestrate';
import { actionsFromEvents } from './replay';
import type { FeedItem, FeedItemOf, LessonAction, LessonState } from './types';

const trust = {
  reviewed: false,
  contentVersion: 'fxm-0.1.0',
  source: 'authored',
  status: 'ok',
};
const own = (id: string) => ({
  id,
  skillId: 'combinations-count',
  description: id,
  signature: id,
  trust,
});

function load(): LoadedExercise {
  const r = loadExercise(methodExercise(), [
    own('draws_with_replacement'),
    own('counts_balls_not_draws'),
  ]);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

class Session {
  readonly loaded = load();
  readonly content: LessonContent = buildContent(this.loaded, '1');
  readonly log = new EventLog(
    {
      sessionId: 's',
      studentId: 'anon',
      exerciseId: 'fx-method',
      contentVersion: 'fxm-0.1.0',
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
  plan(order: string[]) {
    return this.act({ type: 'answer', value: { plan: order } });
  }
  read(token: string) {
    return this.act({ type: 'answer', value: { token } });
  }
  line(mline: string, readback?: 'grouped' | 'literal') {
    return this.act({
      type: 'answer',
      value: { mline, ...(readback && { readback }) },
    });
  }
  get items(): FeedItem[] {
    return this.state.items;
  }
  get active(): string | undefined {
    const c = this.items.at(-1);
    return c?.kind === 'question' && c.ref.scope === 'main'
      ? c.ref.stepId
      : undefined;
  }
}

const notes = (s: Session) =>
  s.items.flatMap(i => (i.kind === 'feedback' && i.note ? [i.note] : []));
const lastNote = (s: Session) => notes(s).at(-1);
const answers = (s: Session) => s.log.all().filter(e => e.t === 'answer');

function toTotal(): Session {
  const s = new Session();
  s.plan(['c_total', 'c_fav', 'c_ratio']);
  s.read('simultanément');
  return s;
}

describe('the opening and the plan', () => {
  it('shows the statement, the goal, the lead, the opening card, then the plan card (0 acts for the opening)', () => {
    const s = new Session();
    expect(s.items.map(i => i.kind).slice(0, 4)).toEqual([
      'statement',
      'statement',
      'tutor',
      'tutor',
    ]);
    expect(s.active).toBe('m1.plan');
  });

  it('a plan that respects what each card uses is accepted and the reason for the order follows', () => {
    const s = new Session();
    s.plan(['c_fav', 'c_total', 'c_ratio']);
    expect(lastNote(s)).toMatchObject({ kind: 'reason_order' });
    expect(s.active).toBe('m1.read');
    expect(s.state.method?.planOrder).toEqual(['c_fav', 'c_total', 'c_ratio']);
  });

  it('dividing first is not refused with "wrong": the card and what it needs are named', () => {
    const s = new Session();
    s.plan(['c_ratio', 'c_total', 'c_fav']);
    expect(lastNote(s)).toMatchObject({ kind: 'plan_violation' });
    expect(answers(s).at(-1)).toMatchObject({ kind: 'method', correct: false });
    expect(s.active).toBe('m1.plan');
  });
});

describe('reading the statement', () => {
  it('the right word sets the fact for the rest of the question', () => {
    const s = new Session();
    s.plan(['c_total', 'c_fav', 'c_ratio']);
    s.read('simultanément');
    expect(s.state.method?.facts).toEqual({
      order: 'unordered',
      replacement: false,
    });
    expect(s.active).toBe('m1.c_total');
  });

  it('another word is a neutral note, and the lesson stays', () => {
    const s = new Session();
    s.plan(['c_total', 'c_fav', 'c_ratio']);
    s.read('trois');
    const fb = [...s.items]
      .reverse()
      .find(i => i.kind === 'feedback') as FeedItemOf<'feedback'>;
    expect(JSON.stringify(fb.rich)).toContain('ما تقولش واش الترتيب يهمّ'); // the authored line
    expect(s.active).toBe('m1.read');
  });
});

describe('the total frame: lines, never "wrong"', () => {
  it('a right total is credited by name, then the recap names what he found and what is next', () => {
    const s = toTotal();
    s.line('10*9*8/(3*2*1) = 120');
    const ns = notes(s);
    expect(ns.at(-2)).toMatchObject({
      kind: 'credit',
      nodeId: 'total',
      derivation: 'exact',
      support: false,
    });
    expect(ns.at(-1)).toMatchObject({ kind: 'recap' });
    expect(ns.at(-1)).toMatchObject({ line: '10*9*8/(3*2*1) = 120' });
    expect(answers(s).at(-1)).toMatchObject({ kind: 'method', correct: true });
    expect(s.state.method?.credited).toContain('total');
    expect(s.state.finished).toBe(true); // the only built frame
  });

  it('the recap names the next card in HIS order, and carries no number but his own line', () => {
    const s = new Session();
    s.plan(['c_total', 'c_fav', 'c_ratio']);
    s.read('simultanément');
    s.line('10*9*8/(3*2*1) = 120');
    const recap = lastNote(s);
    expect(recap).toMatchObject({
      kind: 'recap',
      next: { ar: [{ ar: 'المطلوب' }] },
    });
    const { line, ...rest } = recap as { line?: string };
    expect(line).toBe('10*9*8/(3*2*1) = 120');
    expect(JSON.stringify(rest)).not.toMatch(/[0-9]/);
  });

  it('the ordered product is a supporting step: named, not graded, the card stays', () => {
    const s = toTotal();
    const before = answers(s).length;
    s.line('10*9*8 = 720');
    expect(answers(s).length).toBe(before);
    expect(lastNote(s)).toMatchObject({
      kind: 'credit',
      nodeId: 'ord',
      support: true,
    });
    expect(s.active).toBe('m1.c_total');
  });

  it('an unfinished line and an unequal line are shown, not graded; the mismatch repeats his line and adds no number', () => {
    const s = toTotal();
    const before = answers(s).length;
    s.line('10*9*8/(3*2*1)');
    expect(lastNote(s)).toMatchObject({ kind: 'neutral', code: 'unfinished' });
    s.line('10*9*8/(3*2*1) = 121');
    // The multiply-back check is HIS numbers as a product to compute himself: no value is printed.
    expect(lastNote(s)).toEqual({
      kind: 'neutral',
      code: 'mismatch',
      line: '10*9*8/(3*2*1) ≠ 121',
      check: '121*(3*2*1)',
    });
    expect(answers(s).length).toBe(before);
  });

  it('an unreadable line is logged, not graded, and the rules change nothing', () => {
    const s = toTotal();
    const ev = s.line('1+');
    expect(
      ev.some(e => e.t === 'component_event' && e.name === 'line_ungraded'),
    ).toBe(true);
    expect(ev.some(e => e.t === 'answer')).toBe(false);
    expect(s.active).toBe('m1.c_total');
  });

  it('a slip: the misconception id is mut.<id>, inferred by mutation, with its own message once', () => {
    const s = toTotal();
    s.line('10*9*8/3*2*1 = 480');
    expect(answers(s).at(-1)).toMatchObject({
      kind: 'method',
      correct: false,
      misconceptionId: 'mut.bracket_left_to_right',
      inferredBy: 'mutation',
    });
    const fb = s.items.filter(
      (i): i is FeedItemOf<'feedback'> => i.kind === 'feedback' && !!i.rich,
    );
    expect(fb.length).toBeGreaterThan(0);
    expect(s.active).toBe('m1.c_total');
  });

  it('a value the content knows (1000 with replacement) is a value-only match', () => {
    const s = toTotal();
    s.line('10*10*10 = 1000');
    expect(answers(s).at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'draws_with_replacement',
      inferredBy: 'procedure',
    });
  });

  it('the readback choice is logged and travels with the answer', () => {
    const s = toTotal();
    const ev = s.line('10*9*8/(3*2*1) = 120', 'grouped');
    expect(
      ev.some(e => e.t === 'component_event' && e.name === 'readback'),
    ).toBe(true);
    expect(answers(s).at(-1)).toMatchObject({
      value: { mline: '10*9*8/(3*2*1) = 120', readback: 'grouped' },
    });
  });
});

describe('help: the ladder first, then the line (rule 6)', () => {
  it('a reveal is refused until the end of the ladder, then the expected line is shown', () => {
    const s = toTotal();
    s.act({ type: 'reveal' });
    expect(s.active).toBe('m1.c_total'); // refused
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'reveal' });
    const shown = s.items.find(
      (i): i is FeedItemOf<'answer'> => i.kind === 'answer',
    );
    expect(JSON.stringify(shown)).toContain('120');
  });
});

describe('replay equals live', () => {
  it('the same feed from the event log alone, ungraded lines included', () => {
    const s = toTotal();
    s.line('10*9*8 = 720');
    s.line('10*9*8/(3*2*1)');
    s.line('10*9*8/3*2*1 = 480', 'literal');
    s.line('1+');
    s.line('10*9*8/(3*2*1) = 120', 'grouped');
    const r = new Session();
    for (const a of actionsFromEvents(s.log.all())) {
      r.act(a as ActionInput);
    }
    expect(r.items).toEqual(s.items);
    expect(r.state.method).toEqual(s.state.method);
    expect(r.log.all().map(e => e.t)).toEqual(s.log.all().map(e => e.t));
  });
});
