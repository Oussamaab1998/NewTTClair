import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { createRulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson } from './lesson';
import { stepSync, withHistory } from './orchestrate';
import type { LessonAction } from './types';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const content = buildContent(loaded, '1b');
const rules = createRulesPlanner(content.menu);

/** Two wrong answers on 1b/s3 in one session; returns the session log. */
function twoWrong(sessionId: string, history: readonly Event[], t0: number) {
  const log = new EventLog(
    {
      sessionId,
      studentId: 'a',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(t0),
  );
  const view = withHistory(history, log);
  const start = startLesson(content);
  log.append(start.events);
  let state = start.state;
  for (const optionId of ['one', 'two']) {
    const a: LessonAction = { type: 'answer', value: { optionId }, at: 1000 };
    state = stepSync(content, state, a, view, rules);
  }
  const plans = log
    .all()
    .filter((e): e is Extract<Event, { t: 'plan' }> => e.t === 'plan');
  return { log, second: plans[1]!.decision };
}

describe('student state across sessions (stored history)', () => {
  it('a representation tried in an earlier session is not repeated: second wrong -> another representation', () => {
    const a = twoWrong('A', [], 1_760_000_000_000);
    expect(a.second).toMatchObject({
      next: { kind: 'deep_dive', deepDiveId: 'au_moins_contraire' },
      representation: 'text+ComplementView',
    });
    // Same student, new session, no history: the same deep dive again.
    expect(twoWrong('B', [], 1_760_100_000_000).second.next).toMatchObject({
      kind: 'deep_dive',
    });
    // With session A as history: an untried representation instead.
    const b = twoWrong('B', a.log.all(), 1_760_100_000_000);
    expect(b.second).toMatchObject({
      ruleId: 'rule.second_wrong',
      next: { kind: 'variant', variantId: 'alt-1b-s3-pick' },
      representation: 'EventPicker',
    });
  });

  it('per-step counters stay per session: history does not turn a first wrong into a second wrong', () => {
    const a = twoWrong('A', [], 1_760_000_000_000);
    const log = new EventLog(
      {
        sessionId: 'B',
        studentId: 'a',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(1_760_100_000_000),
    );
    const view = withHistory(a.log.all(), log);
    const start = startLesson(content);
    log.append(start.events);
    stepSync(
      content,
      start.state,
      { type: 'answer', value: { optionId: 'one' }, at: 1000 },
      view,
      rules,
    );
    const plan = log.all().find(e => e.t === 'plan');
    expect(plan?.t === 'plan' && plan.decision.ruleId).toMatch(
      /^rule\.first_wrong/,
    );
  });
});
