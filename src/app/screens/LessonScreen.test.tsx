import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import '../../i18n';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { previewLatex } from '../../lesson/feed/NumericKeypad';
import { probe } from '../../perf/probe';
import { setDevTools } from '../devFlags';
import { EventSchema } from '../../telemetry/events';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { LessonScreen } from './LessonScreen';

let log: EventLog;

// The event counter is a dev tool (behind the dev flag).
beforeEach(() => setDevTools(true));
afterEach(() => setDevTools(false));

async function renderLesson(part: '1b' | '2a' = '1b') {
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart={part}
        clock={fixedClock()}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}

const lastByTestId = (id: string) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(lastByTestId(id));
/** The active card's "⋯" menu (the last card in the feed, DESIGN.md §3). */
const openCardMenu = () =>
  fireEvent.press(screen.getAllByTestId(/^card-menu-/).at(-1)!);
async function typeOnKeypad(raw: string) {
  for (const key of raw) {
    await tap(`keypad-key-${key}`);
  }
  await tap('keypad-check');
}
const longPress = (id: string) =>
  act(() => fireGestureHandler(getByGestureTestId(id)));
const eventTypes = () => log.all().map(e => e.t);
/** Student-side events only (without planner records and component traces). */
const studentEvents = () =>
  eventTypes().filter(t => t !== 'plan' && t !== 'component_event');
const lastOf = (t: string) =>
  log
    .all()
    .filter(e => e.t === t)
    .at(-1);

describe('LessonScreen (Exercise 2, 1.b)', () => {
  it('plays end to end from JSON by tapping and typing, writing an event for every answer', async () => {
    await renderLesson();
    await tap('option-none');
    await typeOnKeypad('3');
    await tap('option-p3_10');
    await typeOnKeypad('0,7');

    expect(screen.getByTestId('writeup')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-done')).toBeOnTheScreen();
    expect(
      screen.getByText('Par conséquent p(B) = 1 − p(B̄) = 1 − 3/10 = 7/10.'),
    ).toBeOnTheScreen();
    const answers = log.all().filter(e => e.t === 'answer');
    expect(answers).toHaveLength(4);
    expect(answers.every(e => e.t === 'answer' && e.correct)).toBe(true);
    for (const e of log.all()) {
      expect(EventSchema.safeParse(e).success).toBe(true);
    }
    expect(screen.getByTestId('event-count')).toHaveTextContent(
      String(log.all().length),
    );
  });

  it('opens a deep dive on "ما نعرفش" and asks the original question again after it', async () => {
    await renderLesson();
    await tap('not-sure');
    expect(screen.getByTestId('deep-dive-start')).toBeOnTheScreen();
    expect(screen.getByTestId('question-paused')).toBeOnTheScreen();

    await tap('option-aucun');
    expect(screen.getByTestId('return-divider')).toBeOnTheScreen();
    expect(lastByTestId('question-active')).toBeOnTheScreen();

    // Re-asked question works; correct after help asks for one self-report first.
    await tap('option-none');
    expect(screen.getByTestId('card-self_report-open')).toBeOnTheScreen();
    await tap('card-self_report-understood');
    expect(lastByTestId('keypad')).toBeOnTheScreen();
    expect(studentEvents()).toEqual([
      'not_sure',
      'answer',
      'deepdive',
      'answer',
      'self_report',
    ]);
    expect(lastOf('deepdive')).toMatchObject({
      t: 'deepdive',
      outcome: 'completed',
      stepId: 's3',
    });
    expect(
      log.all().flatMap(e => (e.t === 'plan' ? [e.decision.ruleId] : [])),
    ).toEqual([
      'rule.not_sure.deep_dive',
      'rule.detour_done',
      'rule.correct_after_help',
      'rule.next_step',
    ]);
  });

  it('can leave a deep dive with "back" (logged as abandoned)', async () => {
    await renderLesson();
    await tap('not-sure');
    await openCardMenu();
    await tap('back-to-question');
    expect(lastOf('deepdive')).toMatchObject({
      t: 'deepdive',
      outcome: 'abandoned',
    });
    await tap('option-none');
    expect(lastOf('answer')).toMatchObject({
      t: 'answer',
      correct: true,
      stepId: 's3',
    });
  });

  it('walks the hint ladder, then shows the answer', async () => {
    await renderLesson();
    expect(screen.queryByTestId('reveal')).toBeNull();
    for (const level of [1, 2, 3]) {
      await tap('hint');
      expect(screen.getByTestId(`hint-${level}`)).toBeOnTheScreen();
    }
    await tap('reveal');
    expect(screen.getByTestId('revealed-answer')).toBeOnTheScreen();
    expect(eventTypes()).toEqual(['hint', 'hint', 'hint', 'reveal']);
  });

  it('shows feedback on a wrong option and keeps the question active', async () => {
    await renderLesson();
    await tap('option-one');
    expect(screen.getByTestId('feedback-warning')).toBeOnTheScreen();
    expect(lastByTestId('question-active')).toBeOnTheScreen();
    expect(lastOf('answer')).toMatchObject({
      misconceptionId: 'au_moins_direct_miscount',
      attempt: 1,
    });
    // The misconception's repair component is offered, optional.
    expect(screen.getByTestId('card-repair-open')).toBeOnTheScreen();
  });

  it('long-press on tutor text opens the menu; a choice appends the verified answer', async () => {
    await renderLesson();
    await longPress('tutor-q1b-s1-longpress');
    expect(await screen.findByTestId('longpress-menu')).toBeOnTheScreen();
    await tap('longpress-explain');
    expect(screen.queryByTestId('longpress-menu')).toBeNull();
    expect(screen.getByTestId('ask-answer')).toBeOnTheScreen();
    expect(log.all()).toMatchObject([
      {
        t: 'component_event',
        component: 'LongPressMenu',
        name: 'opened',
        payload: { blockId: 'q1b-s1' },
      },
      {
        t: 'ask',
        via: 'longpress',
        mode: 'explain',
        snapshot: { blockId: 'q1b-s1' },
      },
    ]);
  });

  it('logs a dismissed long-press menu', async () => {
    await renderLesson();
    await longPress('tutor-q1b-s2-longpress');
    await tap('longpress-cancel');
    expect(eventTypes()).toEqual(['component_event', 'component_event']);
    expect(log.all()[1]).toMatchObject({ name: 'dismissed' });
  });

  it('answers ask-field chips in the feed; free text opens the tutor drawer (no LLM: saved, neutral line)', async () => {
    await renderLesson();
    // Collapsed while the first card is on screen (DESIGN.md §3).
    await tap('ask-chips-toggle');
    await tap('ask-chip-why_complement');
    expect(screen.getByTestId('ask-answer')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('ask-input'), 'علاش؟');
    await tap('ask-send');
    expect(await screen.findByTestId('tutor-saved')).toHaveTextContent(
      'سؤالك تسجّل.',
    );
    expect(log.all()).toMatchObject([
      { t: 'ask', via: 'field', snapshot: { chipId: 'why_complement' } },
      { t: 'ask', via: 'field', text: 'علاش؟', source: 'local' },
      { t: 'tutor_answer', source: 'saved', blocks: 0 },
    ]);
    await tap('tutor-back');
    expect(screen.queryByTestId('tutor-drawer')).toBeNull();
  });

  it('writes at least one event for every interaction', async () => {
    await renderLesson();
    const interactions: (() => Promise<unknown>)[] = [
      () => tap('option-two'),
      () => tap('hint'),
      () => tap('not-sure'),
      async () => {
        // "back" is in the mini card's "⋯" menu (opening it is logged too).
        await openCardMenu();
        await tap('back-to-question');
      },
      () => tap('option-none'),
      () => tap('card-self_report-understood'),
      () => tap('hint'),
      () => typeOnKeypad('6'),
      async () => {
        // Chips are folded while the keypad is open.
        await tap('ask-chips-toggle');
        await tap('ask-chip-what_simultane');
      },
      () => typeOnKeypad('6'),
      () => typeOnKeypad('10'),
      () => typeOnKeypad('3'),
      () => tap('not-sure'),
    ];
    for (const interact of interactions) {
      const before = log.all().length;
      await interact();
      expect(log.all().length).toBeGreaterThan(before);
    }
  });
});

describe('keypad preview', () => {
  it('previews simple numbers and fractions with the native renderer', () => {
    expect(previewLatex('3/10')).toBe('\\frac{3}{10}');
    expect(previewLatex('0,7')).toBe('0{,}7');
    expect(previewLatex('3/')).toBeNull();
    for (const raw of ['3/10', '0,7', '-1/10', '12']) {
      expect(() => parseLatexSubset(previewLatex(raw)!)).not.toThrow();
    }
  });
});

describe('LessonScreen (Exercise 2, 2.a with probability components)', () => {
  const ZERO_PAIRS = ['a-b', 'a-c', 'b-c', 'b-d', 'b-e', 'c-d', 'c-e'];
  async function pick(ids: string[], check = true) {
    for (const id of ids) {
      await tap(`pick-${id}`);
    }
    if (check) {
      await tap('picker-check');
    }
  }
  async function fillCell(raw: string) {
    for (const key of raw) {
      await tap(`law-keypad-key-${key}`);
    }
    await tap('law-keypad-check');
  }
  const cellText = (v: number) => lastByTestId(`law-cell-${v}-text`);

  it('is playable by tapping outcomes; the law fills as they go, then the sum check', async () => {
    await renderLesson('2a');
    expect(screen.getByTestId('part-2a')).toBeSelected();
    await typeOnKeypad('10');
    await tap('option-ok');
    expect(cellText(0)).toHaveTextContent('?');

    // X = 0, first forgetting {0 ; 0'}.
    await pick(ZERO_PAIRS.filter(id => id !== 'b-c'));
    expect(lastByTestId('picker-missed')).toHaveTextContent('1');
    await pick(['b-c']);
    expect(cellText(0)).toHaveTextContent('7/10');
    expect(lastByTestId('law-cell-0-solved')).toBeOnTheScreen();
    expect(screen.getAllByTestId('component-superseded')).toHaveLength(1);
    // Right after a wrong try: one self-report, then a changed version (another urn).
    await tap('card-self_report-guessed');
    expect(screen.getByTestId('variant-start-transfer')).toBeOnTheScreen();
    await pick(['p-q', 'q-r', 'q-s']);
    expect(lastOf('transfer')).toMatchObject({
      variantId: 'tr-2a-s10-urn',
      correct: true,
    });
    await tap('complement-side-event');

    await pick(['a-e']);
    await pick(['a-d']);
    await pick(['d-e']);
    expect(cellText(2)).toHaveTextContent('1/10');
    await typeOnKeypad('1');

    // Optional practice: the whole table alone, with the sum check.
    await fillCell('1/10');
    await fillCell('0,1');
    await fillCell('7/10');
    await fillCell('1/10');
    expect(screen.getByTestId('law-sum')).toHaveTextContent('∑ p = 1');
    expect(screen.getByTestId('law-sum-ok')).toBeOnTheScreen();
    expect(screen.getByTestId('law-chart-q2a-s20')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-done')).toBeOnTheScreen();

    const all = log.all();
    for (const e of all) {
      expect(EventSchema.safeParse(e).success).toBe(true);
    }
    const submitted = all.filter(
      e => e.t === 'component_event' && e.name === 'submitted',
    );
    // s10 twice, the transfer variant once, s15-s17 once each.
    expect(submitted).toHaveLength(6);
    expect(submitted[0]).toMatchObject({
      stepId: 's10',
      component: 'EventPicker',
      payload: {
        instanceId: 'q2a-s10',
        missed: ['b-c'],
        extra: [],
        correct: ZERO_PAIRS,
        misconceptionHints: ['misses_duplicate_value_pair'],
      },
    });
    expect(
      all.filter(
        e => e.t === 'component_event' && e.name === 'cell_filled_by_lesson',
      ),
    ).toHaveLength(4);
    expect(
      all.filter(e => e.t === 'component_event' && e.name === 'sum_checked'),
    ).toMatchObject([{ payload: { sum: [1, 1], ok: true } }]);
  });

  it('keeps the selected outcomes when a deep dive opens and closes', async () => {
    await renderLesson('2a');
    await typeOnKeypad('10');
    await tap('option-ok');
    await pick(
      ZERO_PAIRS.filter(id => id !== 'b-c'),
      false,
    );
    await tap('not-sure');
    expect(screen.getByTestId('deep-dive-start')).toBeOnTheScreen();
    await typeOnKeypad('0');
    expect(screen.getByTestId('return-divider')).toBeOnTheScreen();
    // Only the missing draw is tapped on the re-asked card.
    await pick(['b-c']);
    const result = log.all().filter(e => e.t === 'answer' && e.kind === 'task');
    expect(result).toMatchObject([{ stepId: 's10', correct: true }]);
  });

  it('keeps half-typed text when a deep dive opens and closes', async () => {
    await renderLesson('1b');
    await tap('option-none');
    await tap('keypad-key-3');
    await tap('not-sure');
    // The deep dive's mini question: three balls, three draws.
    await typeOnKeypad('3');
    expect(lastByTestId('keypad-display')).toHaveTextContent('3');
  });

  it('shows digits only for a count, and the fraction keys for a probability', async () => {
    await renderLesson('1b');
    await tap('option-none');
    expect(screen.queryByTestId('keypad-key-/')).toBeNull();
    expect(screen.queryByTestId('keypad-key-,')).toBeNull();
    expect(screen.queryByTestId('keypad-key--')).toBeNull();
    await typeOnKeypad('3');
    await tap('option-p3_10');
    expect(lastByTestId('keypad-key-/')).toBeOnTheScreen();
    expect(lastByTestId('keypad-key-,')).toBeOnTheScreen();
    // The keys fold away so the question stays visible.
    await tap('keypad-collapse');
    expect(screen.queryByTestId('keypad-key-1')).toBeNull();
    expect(lastByTestId('keypad-check')).toBeOnTheScreen();
  });

  it('folds the ask chips while a keypad is open', async () => {
    await renderLesson('2a');
    expect(screen.queryByTestId('ask-chip-why_no_1')).toBeNull();
    await tap('ask-chips-toggle');
    expect(screen.getByTestId('ask-chip-why_no_1')).toBeOnTheScreen();
    await typeOnKeypad('10');
    // The next card (a choice): collapsed again, the toggle is back.
    expect(screen.queryByTestId('ask-chip-why_no_1')).toBeNull();
    expect(screen.getByTestId('ask-chips-toggle')).toBeOnTheScreen();
  });

  it('skips the optional practice with a reason', async () => {
    await renderLesson('2a');
    await typeOnKeypad('10');
    await tap('option-ok');
    await pick(ZERO_PAIRS);
    await pick(['a-e']);
    await pick(['a-d']);
    await pick(['d-e']);
    await typeOnKeypad('1');
    await tap('skip');
    await tap('skip-not_now');
    expect(screen.getByTestId('question-skipped')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-done')).toBeOnTheScreen();
    expect(log.all().filter(e => e.t === 'skip')).toMatchObject([
      { stepId: 's18', reason: 'not_now' },
    ]);
  });

  it('a tap on an outcome re-renders that chip only, not the feed', async () => {
    await renderLesson('2a');
    await typeOnKeypad('10');
    await tap('option-ok');
    const feed = probe.renders('LessonFeed');
    const items = probe.renders('FeedItemView');
    const chips = probe.renders('OutcomeChip');
    await tap('pick-a-b');
    await tap('pick-a-c');
    expect(probe.renders('LessonFeed')).toBe(feed);
    expect(probe.renders('FeedItemView')).toBe(items);
    expect(probe.renders('OutcomeChip') - chips).toBe(2);
    expect(
      log
        .all()
        .filter(
          e => e.t === 'component_event' && e.name === 'outcome_selected',
        ),
    ).toHaveLength(2);
  });
});
