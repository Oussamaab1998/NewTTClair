/**
 * The `explored` gate has an escape (docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md,
 * change 2): a gate left with `how: 'skipped'` opens the lesson at once, is
 * logged as skipped, and never counts as a step the student did. A1's
 * PredictReveal is the gate used here (the reducer treats every gate alike).
 */
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { createRulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import { actionsFromEvents } from './replay';
import type { LessonAction, LessonState } from './types';

const r = loadExercise(ex4, ex4Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const START = '((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))';
const GOAL = '((e^(x))/(e^(2x)+1))';

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

function session() {
  const content = buildContent(loaded, 'A1');
  const log = new EventLog(
    {
      sessionId: 'sess-gate',
      studentId: 'anon-1',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const planner = createRulesPlanner(content.menu);
  const start = startLesson(content);
  let state: LessonState = start.state;
  log.append(start.events);
  let t = 0;
  const act = (a: ActionInput): Event[] => {
    t += 20000;
    const before = log.all().length;
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      planner,
    );
    return log.all().slice(before);
  };
  return {
    act,
    log,
    get state() {
      return state;
    },
  };
}

/** Domain choice, then the gate at s4. */
function atGate(s: ReturnType<typeof session>) {
  s.act({ type: 'answer', value: { optionId: 'yes' } });
  expect(s.state.gate).toEqual({ stepId: 's4' });
}
function finish(s: ReturnType<typeof session>): Event[] {
  s.act({ type: 'answer', value: { line: START } });
  s.act({ type: 'answer', value: { line: GOAL } });
  return s.act({ type: 'answer', value: { optionId: 'paire' } });
}

describe('a gate left with how: skipped', () => {
  it('opens the lesson at once, like any gate tap (it never traps the student)', () => {
    const s = session();
    atGate(s);
    s.act({ type: 'gate_passed', stepId: 's4', how: 'skipped' });
    expect(s.state.gate).toBeUndefined();
    const card = s.state.items.find(
      i => i.kind === 'question' && i.status === 'active',
    );
    expect(card).toBeDefined();
  });

  it('is counted as revealed in part_done, not as answered', () => {
    const s = session();
    atGate(s);
    s.act({ type: 'gate_passed', stepId: 's4', how: 'skipped' });
    const ev = finish(s);
    expect(ev.find(e => e.t === 'part_done')).toMatchObject({
      counted: 4,
      answered: 3,
      revealed: 1,
    });
  });

  it('a gate passed the normal way is still answered (unchanged)', () => {
    const s = session();
    atGate(s);
    s.act({ type: 'gate_passed', stepId: 's4' });
    expect(finish(s).find(e => e.t === 'part_done')).toMatchObject({
      counted: 4,
      answered: 4,
      revealed: 0,
    });
    const t = session();
    atGate(t);
    t.act({ type: 'gate_passed', stepId: 's4', how: 'done' });
    expect(finish(t).find(e => e.t === 'part_done')).toMatchObject({
      answered: 4,
      revealed: 0,
    });
  });

  it('a second tap, or a tap for another step, does not change what was recorded', () => {
    const s = session();
    atGate(s);
    s.act({ type: 'gate_passed', stepId: 's4', how: 'skipped' });
    s.act({ type: 'gate_passed', stepId: 's4' });
    s.act({ type: 'gate_passed', stepId: 's9', how: 'skipped' });
    expect(finish(s).find(e => e.t === 'part_done')).toMatchObject({
      answered: 3,
      revealed: 1,
    });
  });
});

describe('replay maps the logged escape back', () => {
  const log = (
    name: string,
    payload: Record<string, unknown>,
    component = 'GroupBoxes',
  ) =>
    ({
      t: 'component_event',
      id: 'e1',
      ts: 1,
      sessionId: 's',
      studentId: 'a',
      exerciseId: 'x',
      contentVersion: 'v',
      questionId: '1',
      stepId: 'boxes',
      component,
      name,
      payload,
    } as unknown as Event);

  it('an explored event with how: skipped becomes a skipped gate tap', () => {
    expect(
      actionsFromEvents([log('explored', { why: 'reveal', how: 'skipped' })]),
    ).toEqual([
      expect.objectContaining({
        type: 'gate_passed',
        stepId: 'boxes',
        how: 'skipped',
      }),
    ]);
  });
  it('an explored event with how: done is a plain gate tap (no how)', () => {
    const [a] = actionsFromEvents([
      log('explored', { why: 'box_expanded', how: 'done' }),
    ]);
    expect(a).toMatchObject({ type: 'gate_passed', stepId: 'boxes' });
    expect(a).not.toHaveProperty('how');
  });
  it('the other events of the component are not gate taps', () => {
    expect(
      actionsFromEvents([
        log('box_expanded', { key: 'r1' }),
        log('finding', {}),
      ]),
    ).toEqual([]);
  });
  it('a session with a skipped gate replays to the same feed', () => {
    const s = session();
    atGate(s);
    s.log.append([
      {
        t: 'component_event',
        questionId: 'A1',
        stepId: 's4',
        component: 'GroupBoxes',
        name: 'explored',
        payload: { instanceId: 'a1-s4', why: 'reveal', how: 'skipped' },
      },
    ]);
    s.act({ type: 'gate_passed', stepId: 's4', how: 'skipped' });
    const replay = session();
    for (const a of actionsFromEvents(s.log.all())) {
      replay.act(a);
    }
    expect(replay.state.items).toEqual(s.state.items);
    expect(finish(replay).find(e => e.t === 'part_done')).toMatchObject({
      answered: 3,
      revealed: 1,
    });
  });
});
