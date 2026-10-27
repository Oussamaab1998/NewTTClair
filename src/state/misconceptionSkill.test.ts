/**
 * D1 (round 3, 2026-10-22): a misconception is counted under its own skill
 * (the library's `skillId`), not under every skill of the step where it
 * showed up. The wrong answer itself stays evidence on the step's skills;
 * the misconception's own skill also gets one struggle signal when it is
 * not one of them.
 */
import { buildSituation } from '../planner/situation';
import type { Event } from '../telemetry/events';
import { EventLog, fixedClock } from '../telemetry/log';
import {
  loadEx2,
  playRealSession1b,
} from '../lesson/session/fixtures/realSession1b';
import { buildContent } from '../lesson/session/lesson';
import { deriveState } from './derive';

const content = buildContent(loadEx2(), '1b');

/** One wrong answer on 1b/s7 (equiprobability, complement-event): 3/5, counting balls. */
function s7Wrong(): readonly Event[] {
  const loaded = loadEx2();
  const log = new EventLog(
    {
      sessionId: 'd1',
      studentId: 'anon',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  log.append([
    {
      questionId: '1b',
      stepId: 's7',
      t: 'answer',
      kind: 'choice',
      value: 'p3_5',
      correct: false,
      misconceptionId: 'counts_balls_not_pairs',
      attempt: 1,
    },
  ]);
  return log.all();
}

describe('D1: a misconception lives on its own skill', () => {
  it('the real 1.b session: counts_balls_not_pairs is on counting-pairs, not on the skills of s7', () => {
    const { events } = playRealSession1b();
    const d = deriveState(events, content.catalog);
    expect(d.skills['counting-pairs']?.misconceptions).toMatchObject({
      counts_balls_not_pairs: expect.any(Number),
    });
    for (const other of ['complement-event', 'equiprobability']) {
      expect(d.skills[other]?.misconceptions ?? {}).not.toHaveProperty(
        'counts_balls_not_pairs',
      );
    }
  });

  it('the wrong answer stays on the step skills; the own skill gets one signal (shaky, not unseen)', () => {
    const d = deriveState(s7Wrong(), content.catalog);
    expect(d.skills['complement-event']?.evidence.wrong).toBe(1);
    expect(d.skills.equiprobability?.evidence.wrong).toBe(1);
    const own = d.skills['counting-pairs'];
    expect(own?.misconceptions).toEqual({ counts_balls_not_pairs: 1 });
    expect(own?.evidence.wrong).toBe(0);
    expect(own?.status).toBe('shaky');
  });

  it("the planner's view of the step includes the misconception's skill", () => {
    const sit = buildSituation(s7Wrong(), content.catalog);
    expect(sit?.skills['counting-pairs']?.misconceptions).toEqual({
      counts_balls_not_pairs: 1,
    });
  });
});
