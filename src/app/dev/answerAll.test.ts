import { CATALOG } from '../exercises';
import { buildContent, startLesson } from '../../lesson/session/lesson';
import { stepSync } from '../../lesson/session/orchestrate';
import type { LessonAction } from '../../lesson/session/types';
import { createRulesPlanner } from '../../planner/rules';
import { EventLog, fixedClock } from '../../telemetry/log';
import { nextRightAction } from './answerAll';

it.each(['A1', '1b', '2a'])(
  '-devActions answerAll plays %s to a counting part_done',
  part => {
    const entry = CATALOG.find(
      e =>
        e.result.ok && e.result.loaded.exercise.parts.some(p => p.id === part),
    )!;
    if (!entry.result.ok) {
      throw new Error(entry.id);
    }
    const loaded = entry.result.loaded;
    const content = buildContent(loaded, part);
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'st',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const planner = createRulesPlanner(content.menu);
    const start = startLesson(content);
    log.append(start.events);
    let state = start.state;
    for (let i = 1; i < 60; i += 1) {
      const next = nextRightAction(state, loaded);
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
    const done = log.all().find(e => e.t === 'part_done');
    expect(done).toMatchObject({ revealed: 0 });
    expect(done?.t === 'part_done' && done.answered).toBeGreaterThan(0);
  },
);
