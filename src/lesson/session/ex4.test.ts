/**
 * Exercise 4 A1 through the reducer and the rules planner (like the app):
 * the lines step, misconception feedback once, jumped_to_goal, reveal.
 */
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { createRulesPlanner, type RulesPlanner } from '../../planner/rules';
import type { Decision } from '../../planner/schema';
import type { Situation } from '../../planner/situation';
import { EventSchema, type Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { SKILLS } from '../../content/skills';
import { buildContent, startLesson, type LessonContent } from './lesson';
import { stepSync } from './orchestrate';
import { actionsFromEvents } from './replay';
import type { FeedItemOf, LessonAction, LessonState } from './types';

function load(): LoadedExercise {
  const r = loadExercise(ex4, ex4Misconceptions);
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
  readonly content: LessonContent;
  readonly log: EventLog;
  state: LessonState;
  private t = 0;
  private readonly planner: RulesPlanner;
  constructor(
    questionId = 'A1',
    planner?: (base: RulesPlanner) => RulesPlanner,
  ) {
    const loaded = load();
    this.content = buildContent(loaded, questionId);
    this.log = new EventLog(
      {
        sessionId: 'sess-ex4',
        studentId: 'anon-1',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const base = createRulesPlanner(this.content.menu);
    this.planner = planner ? planner(base) : base;
    const r = startLesson(this.content);
    this.state = r.state;
    this.log.append(r.events);
  }
  act(action: ActionInput): Event[] {
    this.t += 20000; // never "suspiciously fast"
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
  activeCard(): FeedItemOf<'question'> | undefined {
    return this.state.items.find(
      (i): i is FeedItemOf<'question'> =>
        i.kind === 'question' && i.status === 'active',
    );
  }
  stepId(): string | undefined {
    const c = this.activeCard();
    return c?.ref.scope === 'main' ? c.ref.stepId : undefined;
  }
  line(line: string) {
    return this.act({ type: 'answer', value: { line } });
  }
}

const START_LINE = '((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))';
const GOAL_LINE = '((e^(x))/(e^(2x)+1))';
const EXP_GAP_LINE = '((e^(-2x))/(e^(2x)+1))';

function toLines(s: Session) {
  s.act({ type: 'answer', value: { optionId: 'yes' } });
  // The PredictReveal holds the lesson until one tap (ungraded).
  expect(s.stepId()).toBeUndefined();
  expect(s.state.gate).toEqual({ stepId: 's4' });
  s.act({ type: 'gate_passed', stepId: 's4' });
  expect(s.stepId()).toBe('s8');
}

describe('Exercise 4 content', () => {
  it('loads (every lines expression checked against the engine)', () => {
    const loaded = load();
    expect(loaded.answers.get('A1/s8')).toMatchObject({ kind: 'lines' });
    expect(loaded.answers.get('var:tr-A1-g')).toMatchObject({ kind: 'lines' });
  });
  it('refuses a goal that is not the engine function', () => {
    const bad = JSON.parse(JSON.stringify(ex4));
    bad.parts[0].groups[2].steps[3].goal = '(e^x)/(1+e^(3x))';
    const r = loadExercise(bad, ex4Misconceptions);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join()).toMatch(/goal is not f_ex4/);
  });
  it('refuses a known wrong line that is in fact right', () => {
    const bad = JSON.parse(JSON.stringify(ex4));
    bad.parts[0].groups[2].steps[3].knownWrong[0].expr = 'e^x/(1+e^(2x))';
    const r = loadExercise(bad, ex4Misconceptions);
    expect(!r.ok && r.errors.join()).toMatch(/equals the goal/);
  });
  it('the conclusion option comes from the engine parity of f', () => {
    const loaded = load();
    expect(loaded.answers.get('A1/s9')).toEqual({
      kind: 'option',
      optionId: 'paire',
    });
    expect(loaded.answers.get('var:alt-A1-s9-fold')).toEqual({
      kind: 'option',
      optionId: 'paire',
    });
    // Same options, an odd function: the engine picks the other option.
    const odd = JSON.parse(JSON.stringify(ex4));
    odd.parts[0].groups[3].steps[0].answer.fn = 'f_ex4_prime';
    const r = loadExercise(odd, ex4Misconceptions);
    expect(r.ok && r.loaded.answers.get('A1/s9')).toEqual({
      kind: 'option',
      optionId: 'impaire',
    });
  });
  it('refuses a parity answer that no option states', () => {
    const bad = JSON.parse(JSON.stringify(ex4));
    bad.parts[0].groups[3].steps[0].answer.fn = 'sigmoid_demo';
    const r = loadExercise(bad, ex4Misconceptions);
    expect(!r.ok && r.errors.join()).toMatch(
      /0 options state the engine parity neither of sigmoid_demo/,
    );
  });
});

describe('A1 through the lesson', () => {
  it('main path: domain, picture next to the computation, lines, conclusion, write-up', () => {
    const s = new Session();
    expect(s.stepId()).toBe('s3');
    toLines(s);
    // The PredictReveal (PointOnCurve) sits right before the computation.
    const kinds = s.state.items.map(i =>
      i.kind === 'component' ? i.spec.component : i.kind,
    );
    expect(kinds.indexOf('PredictReveal')).toBeLessThan(
      kinds.lastIndexOf('question'),
    );
    const ev1 = s.line(START_LINE);
    expect(ev1.find(e => e.t === 'answer')).toBeUndefined();
    expect(ev1).toContainEqual(
      expect.objectContaining({ t: 'component_event', name: 'line_accepted' }),
    );
    expect(s.activeCard()?.lines).toEqual([START_LINE]);
    const ev2 = s.line(GOAL_LINE);
    expect(ev2).toContainEqual(
      expect.objectContaining({
        t: 'answer',
        kind: 'lines',
        correct: true,
        value: [START_LINE, GOAL_LINE],
      }),
    );
    expect(ev2.find(e => e.t === 'answer' && e.jumped)).toBeUndefined();
    expect(s.stepId()).toBe('s9');
    s.act({ type: 'answer', value: { optionId: 'paire' } });
    expect(s.state.items.some(i => i.kind === 'writeup')).toBe(true);
    for (const e of s.log.all()) {
      expect(EventSchema.safeParse(e).success).toBe(true);
    }
  });

  it('a wrong line is a wrong answer with its misconception; its message comes once', () => {
    const s = new Session();
    toLines(s);
    const ev = s.line(EXP_GAP_LINE);
    expect(ev).toContainEqual(
      expect.objectContaining({
        t: 'answer',
        kind: 'lines',
        correct: false,
        misconceptionId: 'exponent_rules_gap',
      }),
    );
    expect(ev).toContainEqual(
      expect.objectContaining({
        t: 'component_event',
        name: 'line_wrong',
        payload: expect.objectContaining({ where: 'numerator' }),
      }),
    );
    const feedback = () =>
      s.state.items.filter(i => i.kind === 'feedback' && i.rich !== undefined)
        .length;
    expect(feedback()).toBe(1);
    // Second wrong: never the same message again (the planner reacts instead).
    s.line(EXP_GAP_LINE);
    expect(feedback()).toBe(1);
  });

  it('the goal form as the first line: accepted, flagged jumped, then a self-report', () => {
    const s = new Session();
    toLines(s);
    const ev = s.line(GOAL_LINE);
    expect(ev).toContainEqual(
      expect.objectContaining({ t: 'answer', correct: true, jumped: true }),
    );
    expect(ev).toContainEqual(
      expect.objectContaining({
        t: 'plan',
        decision: expect.objectContaining({ ruleId: 'rule.jumped_to_goal' }),
      }),
    );
  });

  it('reveal only at the end of the hint ladder, as the goal written in full', () => {
    const s = new Session();
    toLines(s);
    s.act({ type: 'reveal' });
    expect(s.state.items.some(i => i.kind === 'answer')).toBe(false);
    for (let i = 0; i < 3; i++) {
      s.act({ type: 'hint' });
    }
    s.act({ type: 'reveal' });
    const answer = s.state.items.find(i => i.kind === 'answer');
    expect(answer).toMatchObject({
      rich: { math: 'f(-x)=f(x)=\\frac{e^{x}}{1+e^{2x}}' },
    });
  });

  it('an unparsable line is logged, not counted as an answer', () => {
    const s = new Session();
    toLines(s);
    const ev = s.line('((e^(x))/())');
    expect(ev.find(e => e.t === 'answer')).toBeUndefined();
    expect(ev).toContainEqual(
      expect.objectContaining({ name: 'invalid_input' }),
    );
  });
});

describe('A1 detours', () => {
  it('"not sure" on the lines step opens its deep dive with one interactive component', () => {
    const s = new Session();
    toLines(s);
    const ev = s.act({ type: 'not_sure' });
    expect(ev).toContainEqual(
      expect.objectContaining({
        t: 'component_event',
        component: 'DeepDive',
        name: 'shown',
        payload: expect.objectContaining({
          deepDiveId: 'exp_product',
          representation: 'text+NumericTwin',
        }),
      }),
    );
    expect(s.activeCard()?.ref).toEqual({
      scope: 'mini',
      deepDiveId: 'exp_product',
    });
  });

  it('"easier" goes down the prerequisite map, or to a simpler twin written line by line', () => {
    const s = new Session();
    toLines(s);
    s.act({ type: 'request', kind: 'simpler' });
    const ref = s.activeCard()?.ref;
    expect(ref?.scope).toBe('variant');
    const id = ref?.scope === 'variant' ? ref.variantId : '';
    expect([
      'pre-exp-neg',
      'pre-domain-sym',
      'pre-parity',
      'sim-A1-exp-1',
    ]).toContain(id);
  });

  it('two wrong lines: the second changes representation (a detour opens)', () => {
    const s = new Session();
    toLines(s);
    s.line(EXP_GAP_LINE);
    s.line(EXP_GAP_LINE);
    expect(s.activeCard()?.ref.scope).not.toBe('main');
  });

  it('the simpler twin is a lines step of its own, checked by the engine', () => {
    // A planner that answers the first wrong line with the round-1 twin.
    const s = new Session('A1', base => {
      let used = false;
      const pick = (sit: Situation): Decision => {
        const d = base.decideSync(sit);
        if (!used && sit.trigger === 'wrong') {
          used = true;
          return { ...d, next: { kind: 'variant', variantId: 'sim-A1-exp-1' } };
        }
        return d;
      };
      return { ...base, id: 'scripted', decide: pick, decideSync: pick };
    });
    toLines(s);
    s.line(EXP_GAP_LINE);
    expect(s.activeCard()?.ref).toEqual({
      scope: 'variant',
      variantId: 'sim-A1-exp-1',
    });
    const wrong = s.line('e^(-2x^2)');
    expect(wrong).toContainEqual(
      expect.objectContaining({
        t: 'answer',
        kind: 'lines',
        misconceptionId: 'exponent_rules_gap',
      }),
    );
    const right = s.line('e^(x)');
    expect(right).toContainEqual(
      expect.objectContaining({ t: 'answer', kind: 'lines', correct: true }),
    );
    expect(right).toContainEqual(
      expect.objectContaining({ component: 'Variant', name: 'closed' }),
    );
  });

  it('"change method" opens an alternative representation (not the same text again)', () => {
    const s = new Session();
    toLines(s);
    const ev = s.act({ type: 'request', kind: 'change_method' });
    const plan = ev.find(e => e.t === 'plan');
    // A representation not tried yet: the deep dive with NumericTwin, or an alternative.
    expect(plan).toMatchObject({ decision: { ruleId: 'rule.change_method' } });
    const rep = plan?.t === 'plan' ? plan.decision.representation : '';
    expect(['text', 'PredictReveal', 'PointOnCurve']).not.toContain(rep);
  });
});

describe('Exercise 4 skills', () => {
  it('every skill tag in the content and the misconception library is in the skill map', () => {
    const tags = new Set<string>();
    const walk = (v: unknown, key?: string): void => {
      if (Array.isArray(v)) {
        v.forEach(x =>
          key === 'skills' && typeof x === 'string' ? tags.add(x) : walk(x),
        );
      } else if (v && typeof v === 'object') {
        Object.entries(v).forEach(([k, x]) =>
          k === 'skillId' && typeof x === 'string' ? tags.add(x) : walk(x, k),
        );
      }
    };
    walk(ex4);
    walk(ex4Misconceptions);
    expect([...tags].filter(t => !SKILLS.has(t))).toEqual([]);
  });
});

describe('A1 PredictReveal gate', () => {
  it('replays from the log: the logged tap opens the gate again', () => {
    const s = new Session();
    s.act({ type: 'answer', value: { optionId: 'yes' } });
    // As the screen does: the tap is logged, then the gate opens.
    s.log.append([
      {
        t: 'component_event',
        questionId: 'A1',
        stepId: 's4',
        component: 'PredictReveal',
        name: 'predicted',
        payload: { instanceId: 'a1-s4', optionId: 'same' },
      },
    ]);
    s.act({ type: 'gate_passed', stepId: 's4' });
    expect(s.stepId()).toBe('s8');
    const replay = new Session();
    for (const action of actionsFromEvents(s.log.all())) {
      replay.act(action);
    }
    expect(replay.state.items).toEqual(s.state.items);
  });
  it('a tap for another step, or a second tap, changes nothing', () => {
    const s = new Session();
    s.act({ type: 'answer', value: { optionId: 'yes' } });
    const held = s.state;
    s.act({ type: 'gate_passed', stepId: 's9' });
    expect(s.state.items).toEqual(held.items);
    s.act({ type: 'gate_passed', stepId: 's4' });
    const opened = s.state.items;
    s.act({ type: 'gate_passed', stepId: 's4' });
    expect(s.state.items).toEqual(opened);
  });
});

describe('A1 wrong answers: a message for each known mistake', () => {
  it('two different wrong options on s3: each gets its own message, never the generic one', () => {
    const s = new Session();
    const messages = () =>
      s.state.items.filter(
        (i): i is FeedItemOf<'feedback'> => i.kind === 'feedback',
      );
    s.act({ type: 'answer', value: { optionId: 'no_negative' } });
    s.act({ type: 'answer', value: { optionId: 'not_needed' } });
    const warnings = messages().filter(m => m.tone === 'warning');
    expect(warnings).toHaveLength(2);
    expect(warnings.every(m => m.rich !== undefined)).toBe(true);
    expect(warnings.some(m => m.message === 'wrong')).toBe(false);
    // The same mistake again does not repeat its message.
    s.act({ type: 'answer', value: { optionId: 'no_negative' } });
    expect(messages().filter(m => m.tone === 'warning')).toHaveLength(2);
  });
});

describe('A1/s3 help (authored after the audit)', () => {
  it('"change method" opens an authored representation, never a hint', () => {
    const s = new Session();
    const ev = s.act({ type: 'request', kind: 'change_method' });
    expect(ev.find(e => e.t === 'hint')).toBeUndefined();
    expect(s.activeCard()?.ref.scope).not.toBe('main');
  });
  it('"easier" opens the simpler interval first, not the teacher note', () => {
    const s = new Session();
    s.act({ type: 'request', kind: 'simpler' });
    const plan = s.log
      .all()
      .filter(e => e.t === 'plan')
      .at(-1);
    expect(plan).toMatchObject({
      decision: { next: { kind: 'variant', variantId: 'sim-A1-s3-int-1' } },
    });
  });
});
