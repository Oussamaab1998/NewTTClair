import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { BIDI } from '../../lesson/rich/runs';

import '../../i18n';
import { EventSchema } from '../../telemetry/events';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { LessonScreen } from './LessonScreen';

let log: EventLog;

async function renderA1() {
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart="A1"
        clock={fixedClock()}
        llm={null}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}
const lastByTestId = (id: string) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(lastByTestId(id));
async function keys(...ks: string[]) {
  for (const k of ks) {
    await tap(`lines-active-key-${k}`);
  }
}

describe('LessonScreen (Exercise 4, A1)', () => {
  it('plays A1 by tapping and typing lines, to the write-up', async () => {
    await renderA1();
    await tap('option-yes');
    await tap('predict-option-same');
    // The lines card: the goal on top, f(-x) as the start line.
    expect(lastByTestId('lines-active-goal')).toBeOnTheScreen();
    expect(lastByTestId('lines-active-line-0')).toBeOnTheScreen();
    // e^x / (e^{2x} + 1): the goal form as the first line (accepted, jumped).
    await keys('frac', 'e', 'pow', 'x', 'right', 'right');
    await keys('e', 'pow', '2', 'x', 'right', '+', '1');
    await tap('lines-active-check');
    const answer = log
      .all()
      .filter(e => e.t === 'answer')
      .at(-1);
    expect(answer).toMatchObject({
      kind: 'lines',
      correct: true,
      jumped: true,
    });
    // jumped_to_goal: a self-report card, then the transfer (g, written line by line).
    await tap('card-self_report-understood');
    await keys('frac', 'e', 'pow', '2', 'x', 'right', 'right');
    await keys('1', '+', 'e', 'pow', '4', 'x');
    await tap('lines-active-check');
    expect(
      log
        .all()
        .filter(e => e.t === 'transfer')
        .at(-1),
    ).toMatchObject({
      correct: true,
      variantId: 'tr-A1-g',
    });
    await tap('option-paire');
    expect(screen.getByTestId('writeup')).toBeOnTheScreen();
    expect(screen.getByText('Donc f est paire.')).toBeOnTheScreen();
    for (const e of log.all()) {
      expect(EventSchema.safeParse(e).success).toBe(true);
    }
  });

  it('a wrong line: localized in the card, logged with its misconception, message once', async () => {
    await renderA1();
    await tap('option-yes');
    await tap('predict-option-same');
    // e^{-2x} / (e^{2x} + 1): the exponent rule broken.
    const wrong = async () => {
      await keys('frac', 'e', 'pow', '-', '2', 'x', 'right', 'right');
      await keys('e', 'pow', '2', 'x', 'right', '+', '1');
      await tap('lines-active-check');
    };
    await wrong();
    expect(lastByTestId('lines-active-where')).toHaveTextContent(
      /le numérateur/,
    );
    expect(
      log
        .all()
        .filter(e => e.t === 'answer')
        .at(-1),
    ).toMatchObject({
      correct: false,
      misconceptionId: 'exponent_rules_gap',
    });
    expect(screen.getAllByText(/نجمعو الأسس، ما نضربوهمش/)).toHaveLength(1);
  });
  it('the ask chips fold while the lines editor is active, and come back on request', async () => {
    await renderA1();
    expect(screen.getByTestId('ask-chip-why_e2x')).toBeOnTheScreen();
    await tap('option-yes');
    await tap('predict-option-same');
    expect(lastByTestId('lines-active-editor')).toBeOnTheScreen();
    expect(screen.queryByTestId('ask-chip-why_e2x')).toBeNull();
    await tap('ask-chips-toggle');
    expect(screen.getByTestId('ask-chip-why_e2x')).toBeOnTheScreen();
  });
  it('an unreadable line is named in the card and logged with its reason, not graded', async () => {
    await renderA1();
    await tap('option-yes');
    await tap('predict-option-same');
    await keys('e', 'pow', 'x', '+', '*', '1');
    await tap('lines-active-check');
    expect(lastByTestId('lines-active-unreadable')).toBeOnTheScreen();
    expect(log.all().filter(e => e.t === 'answer')).toHaveLength(1);
    expect(log.all().at(-1)).toMatchObject({
      t: 'component_event',
      component: 'LinesEditor',
      name: 'invalid_input',
      payload: { reason: 'double_operator' },
    });
  });
  it('the PredictReveal holds the lesson until one tap; "show me" opens it, ungraded', async () => {
    await renderA1();
    await tap('option-yes');
    expect(lastByTestId('predict-reveal')).toBeOnTheScreen();
    // Nothing after it yet, and no verdict before the tap.
    expect(screen.queryByTestId('lines-active-editor')).toBeNull();
    expect(screen.queryByText(/نفس الارتفاع/)).toBeNull();
    const answersBefore = log.all().filter(e => e.t === 'answer').length;
    await tap('predict-reveal');
    expect(lastByTestId('lines-active-editor')).toBeOnTheScreen();
    expect(log.all().filter(e => e.t === 'answer')).toHaveLength(answersBefore);
    expect(log.all()).toContainEqual(
      expect.objectContaining({
        t: 'component_event',
        component: 'PredictReveal',
        name: 'revealed',
        stepId: 's4',
      }),
    );
  });
  it('the long-press quote keeps "−x" in LTR order (isolated, not plain text)', async () => {
    await renderA1();
    await act(() =>
      fireGestureHandler(getByGestureTestId('tutor-a1-s1-longpress')),
    );
    const quote = await screen.findByTestId('longpress-quote');
    expect(quote).toHaveTextContent(
      `${BIDI.LRI}${BIDI.LRM}−x${BIDI.LRM}${BIDI.PDI}`,
      { exact: false },
    );
  });
  it('help buttons appear only with an authored answer behind them', async () => {
    await renderA1();
    // s8 (lines) has alternatives, simpler twins, prerequisites and a deep dive.
    await tap('option-yes');
    await tap('predict-option-same');
    expect(lastByTestId('request-change-method')).toBeOnTheScreen();
    expect(lastByTestId('request-simpler')).toBeOnTheScreen();
  });
  it('copy then check unchanged: logged as inputs, not an answer, not a hint', async () => {
    await renderA1();
    await tap('option-yes');
    await tap('predict-option-same');
    const answers = log.all().filter(e => e.t === 'answer').length;
    await tap('lines-active-copy');
    await tap('lines-active-check');
    expect(lastByTestId('lines-active-unchanged')).toBeOnTheScreen();
    expect(log.all().filter(e => e.t === 'answer')).toHaveLength(answers);
    expect(log.all().filter(e => e.t === 'hint')).toHaveLength(0);
    const names = log
      .all()
      .filter(e => e.t === 'component_event' && e.component === 'LinesEditor')
      .map(e => (e.t === 'component_event' ? e.name : ''));
    expect(names).toEqual(
      expect.arrayContaining(['line_copied', 'unchanged_line']),
    );
  });
});
