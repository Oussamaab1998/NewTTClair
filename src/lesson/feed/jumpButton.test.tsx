import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { LessonScreen } from '../../app/screens/LessonScreen';
import { fixedClock } from '../../telemetry/log';

/** Lay out the current (last) card far below, then scroll to the top. */
async function moveAway() {
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
}

describe('"back to the question" button', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('appears only after the card has been out of view for 2 s', async () => {
    await render(
      <GestureHandlerRootView>
        <LessonScreen initialPart="1b" clock={fixedClock()} llm={null} />
      </GestureHandlerRootView>,
    );
    await moveAway();
    expect(screen.queryByTestId('jump-to-current')).toBeNull();
    await act(() => jest.advanceTimersByTime(1900));
    expect(screen.queryByTestId('jump-to-current')).toBeNull();
    await act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('jump-to-current')).toBeOnTheScreen();
    // Back near the card: gone at once.
    await fireEvent.scroll(screen.getByTestId('lesson-feed'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 1800 },
        layoutMeasurement: { width: 400, height: 600 },
        contentSize: { width: 400, height: 2400 },
      },
    });
    expect(screen.queryByTestId('jump-to-current')).toBeNull();
  });
});
