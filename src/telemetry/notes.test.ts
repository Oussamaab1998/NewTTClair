import { isAway } from '../lesson/feed/jump';
import { EventLog, fixedClock } from './log';
import { TeacherNoteQueue } from './notes';

describe('teacher note queue', () => {
  it('collects teacher_note events only, as ids (exportable)', () => {
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'anon',
        exerciseId: 'bac2022c-ex2',
        contentVersion: 'ex2-0.4.0',
      },
      fixedClock(),
    );
    const queue = new TeacherNoteQueue(log);
    log.append([
      { questionId: '1b', stepId: 's5', t: 'hint', level: 1 },
      {
        questionId: '1b',
        stepId: 's5',
        t: 'teacher_note',
        noteId: 'note-1',
        skillIds: ['counting-pairs'],
        misconceptionIds: ['counts_all_outcomes'],
        ruleId: 'rule.example_loop.end',
      },
    ]);
    expect(queue.all()).toEqual([
      expect.objectContaining({
        noteId: 'note-1',
        stepId: 's5',
        skillIds: ['counting-pairs'],
        ruleId: 'rule.example_loop.end',
      }),
    ]);
    const line = JSON.parse(queue.toJsonl());
    expect(Object.keys(line).sort()).toEqual([
      'contentVersion',
      'exerciseId',
      'misconceptionIds',
      'noteId',
      'questionId',
      'ruleId',
      'skillIds',
      'stepId',
      'ts',
    ]);
  });
});

describe('"back to the question" button', () => {
  const view = { offset: 500, height: 600 };
  it('shows when the current card is below or above the view', () => {
    expect(isAway({ y: 1200, height: 200 }, view)).toBe(true);
    expect(isAway({ y: 100, height: 200 }, view)).toBe(true);
  });
  it('hides when any part of the card is visible, or before layout', () => {
    expect(isAway({ y: 1000, height: 200 }, view)).toBe(false);
    expect(isAway({ y: 400, height: 200 }, view)).toBe(false);
    expect(isAway(undefined, view)).toBe(false);
    expect(isAway({ y: 1200, height: 1 }, { offset: 0, height: 0 })).toBe(
      false,
    );
  });
});
