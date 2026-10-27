import {
  loadEx2,
  playRealSession1b,
} from '../lesson/session/fixtures/realSession1b';
import { buildContent } from '../lesson/session/lesson';
import { THRESHOLDS } from '../state/config';
import type { Event } from './events';
import { EventLog, fixedClock } from './log';
import { answerTimingStats, formatAnswerTiming } from './answerTiming';

const content = buildContent(loadEx2(), '1b');

function log(durations: number[]): readonly Event[] {
  const loaded = loadEx2();
  const l = new EventLog(
    {
      sessionId: 't',
      studentId: 'anon',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  l.append(
    durations.map(durationMs => ({
      questionId: '1b',
      stepId: 's3',
      t: 'answer',
      kind: 'choice',
      value: 'none',
      correct: true,
      attempt: 1,
      durationMs,
    })),
  );
  return l.all();
}

describe('how often the "unusual answer time" self-report can fire', () => {
  it('counts first tries that are fast, slow or in between, and the rule firing', () => {
    const s = answerTimingStats(
      log([THRESHOLDS.fastAnswerMs - 1, 5000, THRESHOLDS.slowAnswerMs + 1]),
      content.catalog,
    );
    expect(s).toMatchObject({
      firstTries: 3,
      timed: 3,
      fast: 1,
      slow: 1,
      fired: 0,
    });
  });

  it('the real 1.b session (scripted, 5 s per action): reachable 0 times', () => {
    const s = answerTimingStats(playRealSession1b().events, content.catalog);
    expect(s).toMatchObject({ fast: 0, slow: 0, fired: 0 });
    expect(formatAnswerTiming(s)).toMatch(
      /^odd time: fast 0 · slow 0 of 2 timed first tries · fired 0/,
    );
  });
});
