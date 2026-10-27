/**
 * E1 (round 3, 2026-10-22): one outcome class per finished attempt, derived
 * from the log; counted per skill (for a later review screen and nextMove).
 * Never shown to students.
 */
import fs from 'node:fs';
import path from 'node:path';

import { createRulesPlanner } from '../planner/rules';
import { EventLog, fixedClock } from '../telemetry/log';
import {
  loadEx2,
  playRealSession1b,
} from '../lesson/session/fixtures/realSession1b';
import { buildContent, startLesson } from '../lesson/session/lesson';
import { stepSync } from '../lesson/session/orchestrate';
import type { LessonAction, LessonState } from '../lesson/session/types';
import { deriveState } from './derive';
import { attemptOutcomes, OUTCOME_CLASSES } from './outcomes';

type Act = Omit<LessonAction, 'at'>;
const content = buildContent(loadEx2(), '1b');

function play(actions: Act[]) {
  const loaded = loadEx2();
  const log = new EventLog(
    {
      sessionId: 'e1',
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
  for (const a of actions) {
    t += 5000;
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      rules,
    );
  }
  return attemptOutcomes(log.all(), content.catalog).map(o => [
    o.stepKey,
    o.outcome,
  ]);
}

const opt = (optionId: string): Act =>
  ({ type: 'answer', value: { optionId } } as Act);
const typed = (raw: string): Act => ({ type: 'answer', value: { raw } } as Act);
const hint: Act = { type: 'hint' } as Act;

describe('E1: an outcome class per attempt', () => {
  it.each<[string, Act[], [string, string][]]>([
    ['first_try', [opt('none')], [['1b/s3', 'first_try']]],
    [
      'after_retry (a wrong answer, no help taken)',
      [
        opt('one'),
        { type: 'card_choice', purpose: 'repair', choice: 'no' } as Act,
        opt('none'),
      ],
      [['1b/s3', 'after_retry']],
    ],
    ['after_hint', [hint, opt('none')], [['1b/s3', 'after_hint']]],
    [
      'after_detour (the deep dive opened)',
      [
        { type: 'not_sure' } as Act,
        { type: 'leave_deep_dive' } as Act,
        opt('none'),
      ],
      [['1b/s3', 'after_detour']],
    ],
    [
      'revealed',
      [hint, hint, hint, { type: 'reveal' } as Act],
      [['1b/s3', 'revealed']],
    ],
    [
      'guessed (self-report), then the transfer answered right: transfer_ok',
      [
        opt('none'),
        hint,
        typed('3'),
        {
          type: 'card_choice',
          purpose: 'self_report',
          choice: 'guessed',
        } as Act,
        typed('6'),
      ],
      [
        ['1b/s3', 'first_try'],
        ['1b/s5', 'guessed'],
        ['var:tr-1b-s5-noneg', 'transfer_ok'],
      ],
    ],
    [
      'transfer_fail: the transfer answered right only after a wrong answer',
      [
        opt('none'),
        hint,
        typed('3'),
        {
          type: 'card_choice',
          purpose: 'self_report',
          choice: 'guessed',
        } as Act,
        typed('12'),
        typed('6'),
      ],
      [
        ['1b/s3', 'first_try'],
        ['1b/s5', 'guessed'],
        ['var:tr-1b-s5-noneg', 'transfer_fail'],
      ],
    ],
  ])('%s', (_name, actions, expected) => {
    expect(play(actions)).toEqual(expected);
  });

  it('the real 1.b session', () => {
    const { events } = playRealSession1b();
    expect(
      attemptOutcomes(events, content.catalog).map(o => [o.stepKey, o.outcome]),
    ).toEqual([
      ['1b/s3', 'first_try'],
      ['1b/s5', 'guessed'],
      ['var:tr-1b-s5-noneg', 'revealed'],
      ['var:tr-1b-s5-fresh', 'transfer_ok'],
      ['1b/s7', 'after_detour'],
      ['1b/s8', 'first_try'],
    ]);
  });

  it('counted per skill in the derived state (counts and the last few)', () => {
    const { events } = playRealSession1b();
    const cp = deriveState(events, content.catalog).skills['counting-pairs'];
    expect(cp?.outcomes.counts).toMatchObject({
      guessed: 1,
      revealed: 1,
      transfer_ok: 1,
    });
    expect(cp?.outcomes.recent).toEqual(['guessed', 'revealed', 'transfer_ok']);
  });

  it('never shown to students: no screen or feed code reads skill states or outcomes', () => {
    const roots = ['src/lesson/feed', 'src/app/screens'].map(r =>
      path.join(__dirname, '..', '..', r),
    );
    const files = roots.flatMap(r =>
      fs
        .readdirSync(r)
        .filter(f => /\.tsx?$/.test(f) && !/\.test\./.test(f))
        .map(f => path.join(r, f)),
    );
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      expect({ f, hit: /state\/(derive|outcomes)'/.test(text) }).toEqual({
        f,
        hit: false,
      });
    }
    const i18n = ['ar-TN', 'fr'].map(l =>
      fs.readFileSync(path.join(__dirname, '..', 'i18n', `${l}.json`), 'utf8'),
    );
    // "revealed" and "guessed" are older UI words (the answer heading, the
    // self-report choice); the other classes and the statuses must not appear.
    const labels = [
      ...OUTCOME_CLASSES.filter(c => c !== 'revealed' && c !== 'guessed'),
      'shaky',
      'recovering',
      'unseen',
    ];
    for (const c of labels) {
      for (const text of i18n) {
        expect({ c, hit: text.includes(`"${c}"`) }).toEqual({ c, hit: false });
      }
    }
  });
});
