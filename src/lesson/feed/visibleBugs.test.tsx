/**
 * Round 1 "dead ends", item 4: the visible bugs (2026-10-22).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import '../../i18n';
import { LessonScreen } from '../../app/screens/LessonScreen';
import { fixedClock } from '../../telemetry/log';
import { theme } from '../../theme';
import { DeepDiveStart, StudentBubble, VariantStart } from './Bubbles';
import { LongPressMenu } from './LongPressMenu';
import { NumericKeypad } from './NumericKeypad';

const flat = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

describe('a quoted block with a formula: the formula renders, never raw LaTeX', () => {
  const quote = { text: 'عدد التيراجات الكل', math: '\\binom{5}{2} = 10' };

  it('in the student bubble', async () => {
    await render(
      <StudentBubble
        content={{
          kind: 'quote',
          mode: 'why',
          quoted: quote.text,
          math: quote.math,
        }}
      />,
    );
    expect(screen.queryByText(/\\binom/)).toBeNull();
    expect(screen.getByTestId('student-quote-math')).toBeOnTheScreen();
    expect(screen.getByText(quote.text)).toBeOnTheScreen();
  });

  it('in the long-press menu header', async () => {
    await render(
      <LongPressMenu quote={quote} onChoose={() => {}} onDismiss={() => {}} />,
    );
    expect(screen.queryByText(/\\binom/)).toBeNull();
    expect(screen.getByTestId('longpress-quote-math')).toBeOnTheScreen();
  });

  it('end to end: long-press on a tutor line with a formula, then «علاش؟»', async () => {
    await render(
      <GestureHandlerRootView>
        <LessonScreen initialPart="1b" clock={fixedClock()} llm={null} />
      </GestureHandlerRootView>,
    );
    await fireEvent.press(screen.getAllByTestId('option-none').at(-1)!);
    // 1b/s5 answered: s6 (a line with \\binom{5}{2}) comes next.
    await fireEvent.press(screen.getAllByTestId('keypad-key-3').at(-1)!);
    await fireEvent.press(screen.getAllByTestId('keypad-check').at(-1)!);
    for (const id of ['card-self_report-dismissed']) {
      const b = screen.queryAllByTestId(id).at(-1);
      if (b) {
        await fireEvent.press(b);
      }
    }
    await act(() =>
      fireGestureHandler(getByGestureTestId('tutor-q1b-s6-longpress')),
    );
    await fireEvent.press(screen.getByTestId('longpress-why'));
    expect(screen.queryByText(/\\binom|\\val/)).toBeNull();
    expect(screen.getAllByTestId('student-quote-math').length).toBe(1);
  });
});

describe('a typed answer is shown once on its card', () => {
  it('readonly: only the rendered value (was the typed text and its preview side by side)', async () => {
    await render(
      <NumericKeypad
        readonly
        kind="probability"
        value="7/10"
        onSubmit={() => {}}
      />,
    );
    expect(screen.queryByText('7/10')).toBeNull();
    expect(screen.getByTestId('keypad-preview')).toBeOnTheScreen();
  });

  it('while typing: the typed text and the live preview both stay', async () => {
    await render(
      <NumericKeypad readonly={false} kind="probability" onSubmit={() => {}} />,
    );
    for (const k of ['7', '/', '1', '0']) {
      await fireEvent.press(screen.getByTestId(`keypad-key-${k}`));
    }
    expect(screen.getByTestId('keypad-display')).toHaveTextContent('7/10');
    expect(screen.getByTestId('keypad-preview')).toBeOnTheScreen();
  });
});

describe('detour tabs never reach the item above', () => {
  it(`a sheet's top margin clears its tab (${theme.offset.cardTab} pt) by at least ${theme.space.sm} pt`, async () => {
    await render(
      <GestureHandlerRootView>
        <LessonScreen initialPart="1b" clock={fixedClock()} llm={null} />
      </GestureHandlerRootView>,
    );
    await fireEvent.press(screen.getAllByTestId('not-sure').at(-1)!);
    const sheet = screen.getAllByTestId('detour-sheet').at(-1)!;
    expect(
      Number(flat(sheet).marginTop) + theme.offset.cardTab,
    ).toBeGreaterThanOrEqual(theme.space.sm);
  });

  it('outside a sheet (a detour from the lesson itself): the tab has no negative margin', async () => {
    await render(<VariantStart kind="transfer" />);
    expect(
      Number(flat(screen.getByTestId('variant-start-transfer')).marginTop),
    ).toBeGreaterThanOrEqual(0);
    await render(<DeepDiveStart />);
    expect(
      Number(flat(screen.getByTestId('deep-dive-start')).marginTop),
    ).toBeGreaterThanOrEqual(0);
  });

  it('inside a sheet the tab still sits on its edge', async () => {
    await render(<VariantStart kind="alternative" inSheet />);
    expect(
      flat(screen.getByTestId('variant-start-alternative')).marginTop,
    ).toBe(theme.offset.cardTab);
  });
});

describe('"back to the question" never covers the feed', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('it takes its own row under the feed (not floating over an option)', async () => {
    await render(
      <GestureHandlerRootView>
        <LessonScreen initialPart="1b" clock={fixedClock()} llm={null} />
      </GestureHandlerRootView>,
    );
    const items = screen.getAllByTestId(/^feed-item-/);
    await fireEvent(items.at(-1)!, 'layout', {
      nativeEvent: { layout: { x: 0, y: 2000, width: 300, height: 300 } },
    });
    await fireEvent.scroll(screen.getByTestId('lesson-feed'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
        layoutMeasurement: { width: 400, height: 600 },
        contentSize: { width: 400, height: 2400 },
      },
    });
    await act(() => jest.advanceTimersByTime(theme.feed.jumpDelayMs + 100));
    const jump = screen.getByTestId('jump-to-current');
    expect(flat(jump).position).not.toBe('absolute');
    expect(flat(screen.getByTestId('jump-row')).position).not.toBe('absolute');
    // Not inside the scrolling feed.
    let node: typeof jump | null = jump;
    while (node) {
      expect(node.props.testID).not.toBe('lesson-feed');
      node = node.parent as typeof jump | null;
    }
  });
});
