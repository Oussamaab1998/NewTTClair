import '../../../i18n';

import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

import { LONG_WAIT_MS, TypingBubble } from './TypingBubble';

describe('TypingBubble', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('says the teacher is writing, and after a long wait that it is still coming', async () => {
    jest.useFakeTimers();
    await render(<TypingBubble />);
    expect(screen.getByTestId('hybrid-waiting')).toHaveTextContent(
      'الأستاذ يكتب',
    );
    expect(screen.queryByTestId('hybrid-waiting-long')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(LONG_WAIT_MS);
    });
    expect(screen.getByTestId('hybrid-waiting-long')).toHaveTextContent(
      'مازال شوية',
    );
  });

  it('animates the dots in one loop; with reduce motion on they stay still', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    const view = await render(<TypingBubble />);
    await act(async () => {});
    expect(loop).toHaveBeenCalledTimes(1);
    await view.unmount();

    loop.mockClear();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await render(<TypingBubble />);
    await act(async () => {});
    expect(loop).not.toHaveBeenCalled();
  });
});
