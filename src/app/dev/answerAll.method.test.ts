import { loadExercise } from '../../content/loader';
import { buildContent, startLesson } from '../../lesson/session/lesson';
import { stepSync } from '../../lesson/session/orchestrate';
import type { LessonAction } from '../../lesson/session/types';
import { methodExercise } from '../../method/fixtures/methodExercise';
import { createRulesPlanner } from '../../planner/rules';
import { EventLog, fixedClock } from '../../telemetry/log';
import { nextRightAction } from './answerAll';

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

it('-devActions answerAll plays a method question: the plan, the word, the expected line, with no reveal', () => {
  const r = loadExercise(methodExercise(), [
    own('draws_with_replacement'),
    own('counts_balls_not_draws'),
  ]);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  const content = buildContent(r.loaded, '1');
  const log = new EventLog(
    {
      sessionId: 's',
      studentId: 'st',
      exerciseId: 'fx-method',
      contentVersion: 'fxm-0.1.0',
    },
    fixedClock(),
  );
  const planner = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state = start.state;
  for (let i = 1; i < 30; i += 1) {
    const next = nextRightAction(state, r.loaded);
    if (!next) {
      break;
    }
    state = stepSync(
      content,
      state,
      { ...next, at: i * 20000 } as LessonAction,
      log,
      planner,
    );
  }
  expect(state.finished).toBe(true);
  const answers = log.all().filter(e => e.t === 'answer');
  expect(answers).toHaveLength(3);
  expect(answers.every(e => e.t === 'answer' && e.correct)).toBe(true);
  expect(log.all().find(e => e.t === 'part_done')).toMatchObject({
    counted: 3,
    answered: 3,
    revealed: 0,
  });
});
