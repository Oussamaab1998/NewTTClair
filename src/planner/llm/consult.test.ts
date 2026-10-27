import { memoryStore } from '../../storage/kv';
import { continueDecision } from '../planner';
import { createRulesPlanner } from '../rules';
import type { Decision } from '../schema';
import type { Situation } from '../situation';
import {
  buildPlanPack,
  serializeDynamic,
  serializeStatic,
} from './contextPack';
import { consultReason, consultWith } from './consult';
import {
  A1_UNKNOWN_WRONG_LINE,
  fixtureSituation,
} from './fixtures/guardFixtures';
import { createFakeClient } from './plannerClient';
import { createLlmRuntime, EVERY_MISTAKE_KEY } from './runtime';

const rulesOf = (where: Parameters<typeof fixtureSituation>[0]) => {
  const { content, situation } = fixtureSituation(where);
  return {
    content,
    situation,
    rules: createRulesPlanner(content.menu).decideSync(situation),
  };
};

const withStep = (
  s: Situation,
  step: Partial<Situation['step']>,
): Situation => ({
  ...s,
  step: { ...s.step, ...step },
});

describe('when the AI is asked (D22 triggers)', () => {
  it('(a) a wrong answer no misconception explains', () => {
    // 1.b s5: the student typed 4 (no misconception for it).
    const { situation, rules } = rulesOf('s5');
    expect(situation.step.wrongValues.at(-1)?.misconceptionId).toBeUndefined();
    expect(consultReason(situation, rules)).toBe('unknown_wrong');
  });

  it('a wrong answer with a known misconception: the rules answer alone', () => {
    const { situation, rules } = rulesOf('s3');
    const known = withStep(situation, {
      wrongValues: [
        { value: 'one', misconceptionId: 'counts_balls_not_pairs' },
      ],
      struggle: 1,
    });
    expect(consultReason(known, rules)).toBeNull();
  });

  it('(b) the second struggle signal on the step (wrong + not sure counted together)', () => {
    const { situation, rules } = rulesOf('s3');
    const twice = withStep(situation, {
      wrongValues: [
        { value: 'one', misconceptionId: 'counts_balls_not_pairs' },
      ],
      notSure: 1,
      struggle: 2,
    });
    expect(consultReason({ ...twice, trigger: 'not_sure' }, rules)).toBe(
      'second_struggle',
    );
  });

  it('(c) a wrong typed line, even with a known misconception; an unreadable line', () => {
    const { situation, rules } = rulesOf('A1-s8');
    expect(situation.step.line).toMatchObject({
      verdict: 'wrong',
      raw: A1_UNKNOWN_WRONG_LINE,
      where: 'denominator',
      at: { x: expect.any(Number), student: expect.any(Number) },
    });
    expect(consultReason(situation, rules)).toBe('line_wrong');
    const known = withStep(situation, {
      wrongValues: [{ value: null, misconceptionId: 'exponent_rules_gap' }],
    });
    expect(consultReason(known, rules)).toBe('line_wrong');
    expect(
      consultReason(
        {
          ...situation,
          trigger: 'line_invalid',
          step: {
            ...situation.step,
            line: { verdict: 'invalid', reason: 'double_operator' },
          },
        },
        continueDecision(),
      ),
    ).toBe('line_invalid');
  });

  it('"AI on every mistake": any wrong answer or "not sure", only when the flag is passed', () => {
    const { situation, rules } = rulesOf('s3');
    const known = withStep(situation, {
      wrongValues: [
        { value: 'one', misconceptionId: 'counts_balls_not_pairs' },
      ],
      struggle: 1,
    });
    expect(consultReason(known, rules)).toBeNull();
    expect(consultReason(known, rules, { everyMistake: true })).toBe(
      'every_mistake',
    );
    expect(
      consultReason({ ...known, trigger: 'correct' }, rules, {
        everyMistake: true,
      }),
    ).toBeNull();
  });

  it('the every-mistake cap is per device and day, separate from the call cap', () => {
    const store = memoryStore();
    const rt = createLlmRuntime({
      client: createFakeClient({}),
      store,
      dailyCap: 200,
      today: () => '2026-10-21',
      everyMistake: { limit: 2 },
    });
    expect(rt.everyMistakeOn()).toBe(true);
    expect([
      rt.takeEveryMistake(),
      rt.takeEveryMistake(),
      rt.takeEveryMistake(),
    ]).toEqual([true, true, false]);
    expect(rt.status().everyMistake).toEqual({ remaining: 0, limit: 2 });
    expect(rt.status().capRemaining).toBe(200);
    expect(store.getString(EVERY_MISTAKE_KEY)).toContain('2026-10-21');
    const off = createLlmRuntime({
      client: createFakeClient({}),
      store: memoryStore(),
      dailyCap: 5,
    });
    expect(off.everyMistakeOn()).toBe(false);
    expect(off.takeEveryMistake()).toBe(false);
  });
});

describe('context pack p3', () => {
  it('a typed line: the engine numbers, the trigger, no current answer, failed representations listed', () => {
    const { content, situation } = fixtureSituation('A1-s8');
    const pack = buildPlanPack(content, situation, { reason: 'line_wrong' });
    expect(pack.dynamic.aiTrigger).toBe('line_wrong');
    expect(pack.dynamic.engineCheck).toMatchObject({
      kind: 'line',
      line: { verdict: 'wrong', at: { x: expect.any(Number) } },
    });
    expect(pack.dynamic.representationsFailed).toEqual([]);
    expect(pack.dynamic.verifiedSoFar.steps.map(s => s.key)).not.toContain(
      'A1/s8',
    );
    // The static part names the exercise's misconceptions (diagnosis ids).
    expect(pack.static.misconceptions.map(m => m.id)).toContain(
      'exponent_rules_gap',
    );
    // Two cacheable parts: static first, then dynamic only.
    expect(serializeStatic(pack)).not.toContain('"dynamic"');
    expect(serializeDynamic(pack)).not.toContain('"static"');
  });

  it('a typed value: the engine reads the student value (no answer)', () => {
    const { content, situation } = fixtureSituation('s5');
    const pack = buildPlanPack(content, situation, { reason: 'unknown_wrong' });
    expect(pack.dynamic.engineCheck).toEqual({
      kind: 'typed',
      studentValue: '4',
    });
  });
});

describe('one action, known diagnosis ids only', () => {
  it('drops followUp and why from the decision; an unknown id becomes a description', async () => {
    const { content, situation } = fixtureSituation('s3');
    const client = createFakeClient({
      plan: () => ({
        value: {
          diagnosis: {
            skillIds: [],
            misconceptionIds: ['made_up_id'],
            confidence: 0.5,
            summary: 'guess',
          },
          avoid: [],
          why: 'ask first',
          next: { kind: 'hint', level: 1 },
          followUp: { kind: 'hint', level: 2 },
        },
      }),
    });
    const r = await consultWith(client, content, situation, {
      requestId: 'r1',
      timeoutMs: 1000,
      reason: 'unknown_wrong',
    });
    const d = r.decision as Decision;
    expect(d.next).toEqual({ kind: 'hint', level: 1 });
    expect(d.followUp).toBeUndefined();
    expect(d).not.toHaveProperty('why');
    expect(d.diagnosis.misconceptionIds).toEqual([]);
    expect(d.diagnosis.summary).toContain('made_up_id');
    expect(r.record.trigger).toBe('unknown_wrong');
    expect(r.trace).toMatchObject({ why: 'ask first', action: 'hint' });
  });
});
