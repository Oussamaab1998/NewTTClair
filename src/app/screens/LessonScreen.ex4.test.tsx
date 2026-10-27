import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  createGestureController,
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { BIDI } from '../../lesson/rich/runs';
import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

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
/** The active card's "⋯" menu (the last card in the feed, DESIGN.md §3). */
const openCardMenu = () =>
  fireEvent.press(screen.getAllByTestId(/^card-menu-/).at(-1)!);
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
  it('the ask chips are collapsed while a card is on screen, open on request for that card only', async () => {
    await renderA1();
    // The first card (a choice) is on screen: collapsed, one tap opens them.
    expect(screen.queryByTestId('ask-chip-why_e2x')).toBeNull();
    await tap('ask-chips-toggle');
    expect(screen.getByTestId('ask-chip-why_e2x')).toBeOnTheScreen();
    await tap('option-yes');
    await tap('predict-option-same');
    expect(lastByTestId('lines-active-editor')).toBeOnTheScreen();
    expect(screen.queryByTestId('ask-chip-why_e2x')).toBeNull();
    await tap('ask-chips-toggle');
    expect(screen.getByTestId('ask-chip-why_e2x')).toBeOnTheScreen();
  });
  it('the open chips row has a fixed height: two lines when a chip has a formula', async () => {
    await renderA1();
    await tap('ask-chips-toggle');
    const row = screen.getByTestId('ask-chips');
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      height: theme.size.askChipRowTall,
    });
    // The formula keeps its own LTR line under the chip's one-line text.
    const chip = screen.getByTestId('ask-chip-why_e2x');
    expect(
      within(chip).getAllByLabelText('e puissance 2 x').length,
    ).toBeGreaterThan(0);
  });
  it('an unreadable line is named in the card and logged with its reason, not graded', async () => {
    await renderA1();
    await tap('option-yes');
    await tap('predict-option-same');
    await keys('e', 'pow', 'x', '+', '*', '1');
    await tap('lines-active-check');
    expect(lastByTestId('lines-active-unreadable')).toBeOnTheScreen();
    expect(log.all().filter(e => e.t === 'answer')).toHaveLength(1);
    expect(log.all().at(-2)).toMatchObject({
      t: 'component_event',
      component: 'LinesEditor',
      name: 'invalid_input',
      payload: { reason: 'double_operator' },
    });
    // A decision point for the AI tutor (D22); the rules change nothing.
    expect(log.all().at(-1)).toMatchObject({
      t: 'plan',
      trigger: 'line_invalid',
      decision: {
        ruleId: 'rule.line_invalid.continue',
        next: { kind: 'continue' },
      },
    });
    expect(lastByTestId('lines-active-unreadable')).toBeOnTheScreen();
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
  it('blocks are labelled with their words; formulas never as raw LaTeX', async () => {
    await renderA1();
    const latex = /[\\{}^_]/;
    // The statement (French wording + f(x) as a fraction) and the math step.
    const statement = screen.getAllByTestId(/^block-.*-longpress-target$/)[0]!;
    expect(statement.props.accessibilityLabel).toMatch(/^Soit f la fonction/);
    expect(statement.props.accessibilityLabel).toContain('sur');
    expect(statement.props.accessibilityLabel).not.toMatch(latex);
    // The block (what a screen reader stops on) and the formula inside it.
    const math = screen.getAllByLabelText(
      'x appartient à R implique moins x appartient à R',
    );
    expect(math[0]!.props.testID).toMatch(/-longpress-target$/);
    for (const el of screen.getAllByTestId(/-longpress-target$/)) {
      expect(el.props.accessibilityLabel).not.toMatch(latex);
    }
  });
  it('a long-press on a math block is cancelled when a scroll starts (no menu)', async () => {
    await renderA1();
    const target = screen
      .getAllByTestId(/^block-.*-longpress-target$/)
      .find(
        el =>
          el.props.accessibilityLabel ===
          'x appartient à R implique moins x appartient à R',
      )!;
    const gesture = getByGestureTestId(
      String(target.props.testID).replace(/-target$/, ''),
    );
    // A scroll moves more than 8 pt: the long-press fails before activating.
    await act(() => {
      const c = createGestureController(gesture);
      c.begin();
      c.fail();
    });
    expect(screen.queryByTestId('report-trust')).toBeNull();
    expect(
      log
        .all()
        .some(e => e.t === 'component_event' && e.component === 'BlockMenu'),
    ).toBe(false);
    // A real hold opens it.
    await act(() => fireGestureHandler(gesture));
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
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
    // Both live in the card's "⋯" menu.
    await openCardMenu();
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
