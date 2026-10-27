/**
 * B4 (round 2, 2026-10-22): the guided walk-through replaces the
 * teacher-note card. Its lines come one tap at a time («التالي»), then the
 * step's card is shown again for the student to type the final value
 * (checked by the engine). The note for the teacher is queued silently.
 * The walk-through never shows the answer (rule 6).
 */
import { continueDecision } from '../../planner/planner';
import { TeacherNoteQueue } from '../../telemetry/notes';
import { EventLog, fixedClock } from '../../telemetry/log';
import { loadEx2 } from './fixtures/realSession1b';
import { buildContent, reduce, startLesson } from './lesson';
import { actionsFromEvents } from './replay';
import type { FeedItem, LessonAction, LessonState } from './types';

type Act = Omit<LessonAction, 'at'>;

/** 1b/s5 reached; the planner's escalation applied as the rules decide it. */
function atWalkthrough() {
  const loaded = loadEx2();
  const content = buildContent(loaded, '1b');
  const log = new EventLog(
    {
      sessionId: 'walk',
      studentId: 'anon',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const start = startLesson(content);
  log.append(start.events);
  let state: LessonState = start.state;
  let t = 0;
  const act = (a: Act) => {
    t += 1000;
    const r = reduce(content, state, { ...a, at: t } as LessonAction);
    state = r.state;
    return log.append(r.events);
  };
  act({ type: 'answer', value: { optionId: 'none' } } as Act);
  // No planner here: s3's "correct" decision is applied by hand.
  act({
    type: 'apply_plan',
    decision: continueDecision('rule.next_step', 'rules'),
  } as Act);
  act({ type: 'not_sure' } as Act);
  const events = act({
    type: 'apply_plan',
    decision: {
      ...continueDecision('rule.struggle_escalate', 'rules'),
      next: { kind: 'walkthrough' },
      followUp: { kind: 'teacher_note' },
    },
  } as Act);
  const walk = () =>
    state.items.find(
      (i): i is Extract<FeedItem, { kind: 'walkthrough' }> =>
        i.kind === 'walkthrough',
    );
  return { act, events, walk, log, content, state: () => state };
}

describe('the guided walk-through', () => {
  it('opens with its first line; the teacher note is queued silently (no card)', () => {
    const w = atWalkthrough();
    expect(w.walk()).toMatchObject({ stepId: 's5', shown: 1, done: false });
    expect(w.walk()?.lines).toHaveLength(2);
    expect(w.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          t: 'component_event',
          component: 'Walkthrough',
          name: 'line',
          payload: { index: 0 },
        }),
        expect.objectContaining({ t: 'teacher_note', silent: true }),
      ]),
    );
    expect(w.events.some(e => e.t === 'offer_response')).toBe(false);
    expect(w.state().items.some(i => i.kind === 'choice_card')).toBe(false);
    expect(new TeacherNoteQueue(w.log).all()).toHaveLength(1);
  });

  it('one tap per line, then the card again for the final value (checked by the engine)', () => {
    const w = atWalkthrough();
    const tap = w.act({ type: 'walkthrough_next' } as Act);
    expect(tap).toMatchObject([
      {
        t: 'component_event',
        component: 'Walkthrough',
        name: 'line',
        payload: { index: 1 },
      },
    ]);
    expect(w.walk()).toMatchObject({ shown: 2, done: true });
    const last = w.state().items.at(-1);
    expect(last).toMatchObject({
      kind: 'question',
      status: 'active',
      ref: { stepId: 's5' },
    });
    const r = w.act({ type: 'answer', value: { raw: '3' } } as Act);
    expect(r.find(e => e.t === 'answer')).toMatchObject({ correct: true });
  });

  it('rule 6: no answer is shown, and reveal stays locked before the end of the ladder', () => {
    const w = atWalkthrough();
    w.act({ type: 'walkthrough_next' } as Act);
    expect(w.state().items.some(i => i.kind === 'answer')).toBe(false);
    expect(w.act({ type: 'reveal' } as Act)).toEqual([]);
  });

  it('replays from the log alone', () => {
    const w = atWalkthrough();
    w.act({ type: 'walkthrough_next' } as Act);
    const content = w.content;
    let replayed = startLesson(content).state;
    for (const a of actionsFromEvents(w.log.all())) {
      replayed = reduce(content, replayed, a).state;
    }
    expect(replayed.items).toEqual(w.state().items);
  });
});
