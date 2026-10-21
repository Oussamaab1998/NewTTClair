import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { LessonScreen } from '../../app/screens/LessonScreen';
import { fixedClock } from '../../telemetry/log';
import { overflowing } from './layoutCheck';

// Jest has no layout engine: the device measures (onLayout) and this check
// flags any footer button whose edge passes the card's inner edge. Here the
// measurements are fed in; on the simulator the real ones are read back.
describe('question footer: no button outside the card', () => {
  it('overflowing() flags a right edge past the row, allows rounding', () => {
    expect(
      overflowing(326, {
        a: { x: 0, width: 120 },
        b: { x: 206, width: 120.4 },
      }),
    ).toEqual([]);
    expect(
      overflowing(326, { a: { x: 0, width: 120 }, b: { x: 210, width: 120 } }),
    ).toEqual(['b']);
  });

  it('the card warns when a measured footer button sticks out', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <GestureHandlerRootView>
        <LessonScreen initialPart="A1" clock={fixedClock()} llm={null} />
      </GestureHandlerRootView>,
    );
    const layout = (id: string, x: number, width: number) =>
      fireEvent(screen.getAllByTestId(id).at(-1)!, 'layout', {
        nativeEvent: { layout: { x, y: 0, width, height: 44 } },
      });
    // 360 pt screen: card inner width 360 - 2 x 16 - 2 x 12 - 2 x 2 = 300.
    await layout('question-footer', 0, 300);
    await layout('not-sure', 180, 120);
    await layout('hint', 60, 112);
    expect(warn).not.toHaveBeenCalled();
    // A button 10 pt wider than the room it got.
    await layout('not-sure', 190, 120);
    expect(warn).toHaveBeenCalledWith(
      'layout: question-footer overflows its row: not-sure',
    );
    warn.mockRestore();
  });
});
