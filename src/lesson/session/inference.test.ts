/**
 * C3 (Tutor intelligence 1): typed wrong values traced to a misconception.
 * Authored wrong answers first; then the step's procedure table (engine
 * values, C2). One match gives that misconception; several give the first
 * as a hypothesis plus one short, skippable probe card (at most one per
 * step). The answer event records `inferredBy` and the candidates.
 */
import { createRulesPlanner } from '../../planner/rules';
import { buildSituation } from '../../planner/situation';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { loadEx2 } from './fixtures/realSession1b';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { LessonAction, LessonState } from './types';

type Act = Omit<LessonAction, 'at'>;

function lesson() {
  const loaded = loadEx2();
  const content = buildContent(loaded, '1b');
  const log = new EventLog(
    {
      sessionId: 'inf',
      studentId: 'anon',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const rules = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state: LessonState = start.state;
  let t = 1000;
  const act = (a: Act) => {
    t += 5000;
    const before = log.all().length;
    const items = state.items.length;
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      rules,
    );
    return { events: log.all().slice(before), items: state.items.slice(items) };
  };
  const ref = () => state.stack[state.stack.length - 1]?.ref;
  const openProbe = () =>
    state.items.find(
      i =>
        i.kind === 'choice_card' &&
        i.purpose === 'probe' &&
        i.status === 'open',
    );
  return { act, ref, openProbe, log, content, state: () => state };
}

const ans = (raw: string): Act => ({ type: 'answer', value: { raw } } as Act);
const answerOf = (events: readonly Event[]) =>
  events.find(e => e.t === 'answer');
const planOf = (events: readonly Event[]) => events.find(e => e.t === 'plan');

/** s3 answered; now on 1b/s5 (answer 3). */
function atS5() {
  const l = lesson();
  l.act({ type: 'answer', value: { optionId: 'none' } } as Act);
  return l;
}

/** On the transfer of 1b/s5 (answer 6). */
function atTransfer() {
  const l = atS5();
  l.act({ type: 'hint' } as Act);
  l.act(ans('3'));
  l.act({
    type: 'card_choice',
    purpose: 'self_report',
    choice: 'guessed',
  } as Act);
  expect(l.ref()).toMatchObject({ variantId: 'tr-1b-s5-noneg' });
  return l;
}

describe('typed wrong values: authored first, then the engine procedures', () => {
  it('an authored wrong answer wins (5 at 1b/s5): inferredBy authored', () => {
    const r = atS5().act(ans('5'));
    expect(answerOf(r.events)).toMatchObject({
      misconceptionId: 'counts_balls_not_pairs',
      inferredBy: 'authored',
    });
  });

  it('one procedure match (7 at 1b/s5, the opposite event): that misconception, no probe', () => {
    const l = atS5();
    const r = l.act(ans('7'));
    expect(answerOf(r.events)).toMatchObject({
      misconceptionId: 'confuses_event_and_complement',
      inferredBy: 'procedure',
      candidates: ['confuses_event_and_complement'],
    });
    expect(l.openProbe()).toBeUndefined();
    expect(planOf(r.events)).toBeDefined();
  });

  it('no match (8 at 1b/s5): no misconception, no inferredBy', () => {
    const r = atS5().act(ans('8'));
    const a = answerOf(r.events);
    expect(a).toMatchObject({ correct: false });
    expect(a).not.toHaveProperty('misconceptionId');
    expect(a).not.toHaveProperty('inferredBy');
  });

  it('several matches (4 at the transfer): the first as hypothesis, one probe card, the planner waits', () => {
    const l = atTransfer();
    const r = l.act(ans('4'));
    expect(answerOf(r.events)).toMatchObject({
      value: '4',
      misconceptionId: 'counts_balls_not_pairs',
      inferredBy: 'procedure',
      candidates: ['counts_balls_not_pairs', 'confuses_event_and_complement'],
    });
    expect(l.openProbe()).toMatchObject({
      choices: [
        'counts_balls_not_pairs',
        'confuses_event_and_complement',
        'dismissed',
      ],
      blocking: false,
    });
    expect(planOf(r.events)).toBeUndefined();
  });

  it('the probe answer is logged and the planner reacts with the chosen misconception', () => {
    const l = atTransfer();
    l.act(ans('4'));
    const r = l.act({
      type: 'card_choice',
      purpose: 'probe',
      choice: 'confuses_event_and_complement',
    } as Act);
    expect(r.events.find(e => e.t === 'probe')).toMatchObject({
      value: '4',
      candidates: ['counts_balls_not_pairs', 'confuses_event_and_complement'],
      choice: 'confuses_event_and_complement',
    });
    expect(planOf(r.events)).toBeDefined();
    const sit = buildSituation(l.log.all(), l.content.catalog);
    expect(sit?.step.wrongValues.at(-1)).toEqual({
      value: '4',
      misconceptionId: 'confuses_event_and_complement',
    });
  });

  it('skipped ("not now"): logged with no choice; the hypothesis stands', () => {
    const l = atTransfer();
    l.act(ans('4'));
    const r = l.act({
      type: 'card_choice',
      purpose: 'probe',
      choice: 'dismissed',
    } as Act);
    expect(r.events.find(e => e.t === 'probe')).toMatchObject({ choice: null });
    expect(planOf(r.events)).toBeDefined();
    const sit = buildSituation(l.log.all(), l.content.catalog);
    expect(sit?.step.wrongValues.at(-1)?.misconceptionId).toBe(
      'counts_balls_not_pairs',
    );
  });

  it('left open and the student acts on the step: closed, logged as skipped', () => {
    const l = atTransfer();
    l.act(ans('4'));
    const r = l.act({ type: 'not_sure' } as Act);
    expect(r.events.find(e => e.t === 'probe')).toMatchObject({ choice: null });
    expect(l.openProbe()).toBeUndefined();
  });

  it('at most one probe per step: the same several-match value again gets none', () => {
    // Was shown with 3; 3 no longer gets a probe (its answers lead to the same
    // next action, 2026-10-22), so the second value is 4 again.
    const l = atTransfer();
    l.act(ans('4'));
    l.act({
      type: 'card_choice',
      purpose: 'probe',
      choice: 'dismissed',
    } as Act);
    for (let i = 0; i < 4 && l.ref()?.scope !== 'variant'; i += 1) {
      l.act({ type: 'leave_deep_dive' } as Act);
    }
    expect(l.ref()).toMatchObject({ variantId: 'tr-1b-s5-noneg' });
    const r = l.act(ans('4'));
    expect(answerOf(r.events)).toMatchObject({
      misconceptionId: 'counts_balls_not_pairs',
      candidates: ['counts_balls_not_pairs', 'confuses_event_and_complement'],
    });
    expect(l.openProbe()).toBeUndefined();
    expect(
      r.items.some(i => i.kind === 'choice_card' && i.purpose === 'probe'),
    ).toBe(false);
  });
});

describe('round 1: each probe answer changes what happens (the transfer of 1b/s5)', () => {
  const lib = loadEx2().misconceptions;
  const lineOf = (id: string, form: 'feedback' | 'feedbackConfirmed') =>
    lib.get(id)?.[form];

  function tap(value: string, choice: string) {
    const l = atTransfer();
    l.act(ans(value));
    const r = l.act({ type: 'card_choice', purpose: 'probe', choice } as Act);
    const plan = planOf(r.events);
    const lines = l
      .state()
      .items.filter(i => i.kind === 'feedback' && i.rich !== undefined)
      .map(i => (i.kind === 'feedback' ? i.rich : undefined));
    return {
      rule: plan?.t === 'plan' ? plan.decision.ruleId : undefined,
      next: plan?.t === 'plan' ? plan.decision.next : undefined,
      lastLine: lines.at(-1),
    };
  }

  it('«عدّيت الكور»: the plain line, then the pairs-listing offer', () => {
    expect(tap('4', 'counts_balls_not_pairs')).toEqual({
      rule: 'rule.first_wrong.repair',
      next: { kind: 'variant', variantId: 'alt-2a-s6-list', offer: true },
      lastLine: lineOf('counts_balls_not_pairs', 'feedbackConfirmed'),
    });
  });

  it('«عدّيت العكس»: the plain line, then the next hint (no ComplementView exists for this step)', () => {
    expect(tap('4', 'confuses_event_and_complement')).toEqual({
      rule: 'rule.first_wrong.diagnosed',
      next: { kind: 'hint', level: 1 },
      lastLine: lineOf('confuses_event_and_complement', 'feedbackConfirmed'),
    });
  });

  it('«موش توّا» on 4: as with no probe (the hypothesis asked as a question, its offer)', () => {
    expect(tap('4', 'dismissed')).toEqual({
      rule: 'rule.first_wrong.repair',
      next: { kind: 'variant', variantId: 'alt-2a-s6-list', offer: true },
      lastLine: lineOf('counts_balls_not_pairs', 'feedback'),
    });
  });

  it('3 (merged balls / earlier result): both answers would lead to hint 1, so no probe: the merged-balls line as a question, then hint 1', () => {
    const l = atTransfer();
    const r = l.act(ans('3'));
    expect(answerOf(r.events)).toMatchObject({
      misconceptionId: 'merges_identical_balls',
      inferredBy: 'procedure',
      candidates: ['merges_identical_balls', 'reuses_earlier_result'],
    });
    expect(r.events.some(e => e.t === 'probe')).toBe(false);
    expect(
      l
        .state()
        .items.some(i => i.kind === 'choice_card' && i.purpose === 'probe'),
    ).toBe(false);
    const plan = planOf(r.events);
    expect(plan?.t === 'plan' && plan.decision.ruleId).toBe(
      'rule.first_wrong.diagnosed',
    );
    expect(plan?.t === 'plan' && plan.decision.next).toEqual({
      kind: 'hint',
      level: 1,
    });
    const lines = r.items.filter(
      i => i.kind === 'feedback' && i.rich !== undefined,
    );
    expect(lines.map(i => (i.kind === 'feedback' ? i.rich : null))).toEqual([
      lineOf('merges_identical_balls', 'feedback'),
    ]);
  });
});
