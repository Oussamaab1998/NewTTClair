import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import { buildContent, reduce, startLesson } from '../lesson/session/lesson';
import { decide, stepSync } from '../lesson/session/orchestrate';
import { EventLog, fixedClock } from '../telemetry/log';
import {
  buildMenu,
  continueDecision,
  validateDecision,
  type Planner,
} from './planner';
import { createRulesPlanner } from './rules';
import type { Decision } from './schema';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const menu = buildMenu(loaded);
const rules = createRulesPlanner(menu);

const output = (next: unknown): unknown => ({
  diagnosis: {
    skillIds: [],
    misconceptionIds: [],
    confidence: 0.4,
    summary: 'x',
  },
  avoid: [],
  next,
});

describe('validateDecision: only registered components and authored content', () => {
  it('rejects an unknown component', () => {
    const d = validateDecision(
      output({
        kind: 'show_component',
        component: { component: 'Hologram', props: {} },
        instruction: { fr: 'x' },
      }),
      menu,
      'llm',
    );
    expect(d).toMatchObject({ next: { kind: 'continue' }, source: 'fallback' });
  });

  it('rejects a registered component with invalid props, and a task shown directly', () => {
    for (const component of [
      { component: 'Urn', props: { k: 9 } },
      { component: 'EventPicker', props: { event: { id: 'all_equal' } } },
    ]) {
      expect(
        validateDecision(
          output({
            kind: 'show_component',
            component,
            instruction: { fr: 'x' },
          }),
          menu,
          'llm',
        ).next.kind,
      ).toBe('continue');
    }
  });

  it('accepts a valid visual component (experiment props come from the exercise)', () => {
    const d = validateDecision(
      output({
        kind: 'show_component',
        component: { component: 'OutcomeSpace', props: {} },
        instruction: { fr: 'Regarde' },
      }),
      menu,
      'llm',
    );
    expect(d).toMatchObject({
      next: { kind: 'show_component' },
      ruleId: 'llm',
      source: 'llm',
    });
  });

  it('rejects unknown variants, deep dives and prerequisites', () => {
    for (const next of [
      { kind: 'variant', variantId: 'nope' },
      { kind: 'deep_dive', deepDiveId: 'nope' },
      { kind: 'revisit_prerequisite', skillId: 'nope' },
      { kind: 'quiz', stepId: 's1' },
    ]) {
      expect(validateDecision(output(next), menu, 'llm').next.kind).toBe(
        'continue',
      );
    }
  });

  it('rejects garbage and unknown action kinds (no "reveal" action exists)', () => {
    expect(validateDecision('nonsense', menu, 'llm').next.kind).toBe(
      'continue',
    );
    expect(
      validateDecision(output({ kind: 'reveal_answer' }), menu, 'llm').next
        .kind,
    ).toBe('continue');
  });
});

describe('the lesson applies only what fits the current state', () => {
  it('turns an inapplicable decision into the deterministic fallback, logged', () => {
    const content = buildContent(loaded, '1b');
    const start = startLesson(content).state;
    const wrong = reduce(content, start, {
      type: 'answer',
      value: { optionId: 'two' },
      at: 1000,
    });
    expect(wrong.state.pending?.trigger).toBe('wrong');
    // A hint at a level the ladder cannot give is fine (the next hint), but a
    // numeric check without a numeric value is not.
    const bad: Decision = {
      ...continueDecision('rule.test', 'rules'),
      next: { kind: 'numeric_check' },
    };
    const applied = reduce(content, wrong.state, {
      type: 'apply_plan',
      decision: bad,
      at: 1500,
    });
    expect(applied.events).toMatchObject([
      {
        t: 'plan',
        decision: { ruleId: 'fallback.not_applicable', source: 'fallback' },
      },
    ]);
    expect(applied.state.pending).toBeUndefined();
  });

  it('accepts no student action while a decision is pending', () => {
    const content = buildContent(loaded, '1b');
    const wrong = reduce(content, startLesson(content).state, {
      type: 'answer',
      value: { optionId: 'two' },
      at: 1000,
    });
    const ignored = reduce(content, wrong.state, {
      type: 'answer',
      value: { optionId: 'none' },
      at: 1100,
    });
    expect(ignored.events).toEqual([]);
    expect(ignored.state).toBe(wrong.state);
  });
});

describe('one planner interface: an LLM planner can be added without touching the lesson', () => {
  function session() {
    const content = buildContent(loaded, '1b');
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'a',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const start = startLesson(content);
    log.append(start.events);
    const state = reduce(content, start.state, { type: 'not_sure', at: 1000 });
    log.append(state.events);
    return { content, log };
  }

  it('uses an async planner when it answers in time', async () => {
    const { content, log } = session();
    const llm: Planner = {
      id: 'fake-llm',
      decide: async () => ({
        ...continueDecision('llm', 'llm'),
        next: { kind: 'hint', level: 1 },
      }),
    };
    const d = await decide(content, log, llm, rules, 1000);
    expect(d).toMatchObject({
      ruleId: 'llm',
      source: 'llm',
      next: { kind: 'hint' },
    });
  });

  it('falls back to the rules on error and on timeout', async () => {
    const { content, log } = session();
    const failing: Planner = {
      id: 'broken',
      decide: async () => {
        throw new Error('network');
      },
    };
    const slow: Planner = {
      id: 'slow',
      decide: () => new Promise(() => {}),
    };
    for (const p of [failing, slow]) {
      const d = await decide(content, log, p, rules, 10);
      expect(d.source).toBe('fallback');
      expect(d.ruleId).toBe('rule.not_sure.deep_dive');
    }
  });

  it('the synchronous step settles the decision in the same call', () => {
    const { content, log } = session();
    const before = log.all().length;
    const start = startLesson(content).state;
    const state = stepSync(
      content,
      start,
      { type: 'not_sure', at: 1 },
      log,
      rules,
    );
    expect(state.pending).toBeUndefined();
    expect(
      log
        .all()
        .slice(before)
        .map(e => e.t),
    ).toContain('plan');
  });
});
