import { createRulesPlanner } from '../../planner/rules';
import { buildSituation } from '../../planner/situation';
import { deriveState } from '../../state/derive';
import { THRESHOLDS } from '../../state/config';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { loadEx2 } from './fixtures/realSession1b';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { LessonAction, LessonState } from './types';

type Act = Omit<LessonAction, 'at'>;

/** 1.b up to s5 (s3 answered), with a driver for the next actions. */
function at1bS5() {
  const loaded = loadEx2();
  const content = buildContent(loaded, '1b');
  const log = new EventLog(
    {
      sessionId: 'help',
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
  act({ type: 'answer', value: { optionId: 'none' } } as Act);
  const frameKey = () => {
    const ref = state.stack[state.stack.length - 1]?.ref;
    return ref?.scope === 'main'
      ? `${ref.questionId}/${ref.stepId}`
      : ref?.scope === 'mini'
      ? `dd:${ref.deepDiveId}`
      : ref
      ? `var:${ref.variantId}`
      : null;
  };
  return { content, log, act, state: () => state, frameKey, loaded };
}

const request = (
  kind: 'change_method' | 'simpler',
  via: 'chip' | 'menu' | 'choice' = 'chip',
): Act => ({ type: 'request', kind, via } as Act);

const reasonOf = (items: LessonState['items']) =>
  items.find(
    i => i.kind === 'feedback' && i.message?.startsWith('helpReason.'),
  );

describe('help requests: event, state signal, reason line (help chips, 2026-10-22)', () => {
  it('a chip tap logs request {kind, attempt, via} and the feed says what happens next', () => {
    const s = at1bS5();
    expect(s.frameKey()).toBe('1b/s5');
    const r = s.act(request('change_method'));
    expect(r.events.find(e => e.t === 'request')).toMatchObject({
      t: 'request',
      kind: 'change_method',
      stepId: 's5',
      attempt: 1,
      via: 'chip',
    });
    const reason = reasonOf(r.items);
    expect(reason).toMatchObject({ kind: 'feedback', tone: 'info' });
    expect(['helpReason.alternative', 'helpReason.deepDive']).toContain(
      reason?.kind === 'feedback' ? reason.message : '',
    );
  });

  it('"easier" says a smaller example or a step back', () => {
    const s = at1bS5();
    const r = s.act(request('simpler', 'menu'));
    const reason = reasonOf(r.items);
    expect(['helpReason.simpler', 'helpReason.prerequisite']).toContain(
      reason?.kind === 'feedback' ? reason.message : '',
    );
  });

  it('a tap counts like a "not sure" (struggle), and two "easier" on one skill are visible to the planner', () => {
    const s = at1bS5();
    s.act(request('simpler'));
    // Back on s5 after the detour (answered right), then "easier" again.
    for (let i = 0; i < 6 && s.frameKey() !== '1b/s5'; i += 1) {
      s.act({ type: 'leave_deep_dive' } as Act);
    }
    s.act(request('simpler'));
    const events = s.log.all();
    const d = deriveState(events, s.content.catalog);
    expect(d.skills['counting-pairs']?.evidence).toMatchObject({ easier: 2 });
    // A "not sure" on s5 now: the planner's view of the step and its skills.
    const base = events.find(e => e.stepId === 's5')!;
    const probe = {
      ...base,
      id: 'probe',
      ts: events[events.length - 1]!.ts + 1,
      t: 'not_sure',
      attempt: 1,
    } as Event;
    const sit = buildSituation([...events, probe], s.content.catalog);
    expect(sit?.skills['counting-pairs']?.helpRequests).toEqual({
      changeMethod: 0,
      easier: 2,
    });
    expect(sit?.step.struggle).toBeGreaterThanOrEqual(3);
  });

  it(`at ${THRESHOLDS.maxDetoursPerStep} detours (leaving and coming back in between): no new detour, the line points to the hint`, () => {
    const s = at1bS5();
    const backToS5 = () => {
      for (let i = 0; i < 8 && s.frameKey() !== '1b/s5'; i += 1) {
        s.act({ type: 'leave_deep_dive' } as Act);
      }
    };
    for (const kind of ['change_method', 'simpler', 'change_method'] as const) {
      s.act(request(kind));
      backToS5();
    }
    const sit = buildSituation(s.log.all(), s.content.catalog);
    expect(sit?.detours.filter(d => d.variantKind !== 'transfer').length).toBe(
      THRESHOLDS.maxDetoursPerStep,
    );
    const r = s.act(request('change_method'));
    const plan = r.events.find(e => e.t === 'plan');
    expect(plan?.t === 'plan' && plan.decision.ruleId).toBe(
      'rule.request.none',
    );
    expect(reasonOf(r.items)).toMatchObject({ message: 'helpReason.hint' });
    expect(s.frameKey()).toBe('1b/s5');
  });

  it('at the cap with the ladder used up: the line points to "show the answer"', () => {
    const s = at1bS5();
    const backToS5 = () => {
      for (let i = 0; i < 8 && s.frameKey() !== '1b/s5'; i += 1) {
        s.act({ type: 'leave_deep_dive' } as Act);
      }
    };
    for (const kind of ['change_method', 'simpler', 'change_method'] as const) {
      s.act(request(kind));
      backToS5();
    }
    for (let i = 0; i < 3; i += 1) {
      s.act({ type: 'hint' } as Act);
    }
    const r = s.act(request('simpler'));
    expect(reasonOf(r.items)).toMatchObject({ message: 'helpReason.reveal' });
  });
});
