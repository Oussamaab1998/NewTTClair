import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import { WalkthroughCard } from './WalkthroughCard';

const lines = [
  { ar: [{ ar: 'السطر الأوّل.' }] },
  { ar: [{ ar: 'السطر الثاني.' }] },
];

describe('WalkthroughCard (B4)', () => {
  it('shows the lines revealed so far and «التالي» while more are left', async () => {
    const onNext = jest.fn();
    await render(
      <WalkthroughCard lines={lines} shown={1} done={false} onNext={onNext} />,
    );
    expect(screen.getByTestId('walkthrough-line-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('walkthrough-line-2')).toBeNull();
    await fireEvent.press(screen.getByTestId('walkthrough-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('done: every line, no button (readonly, also in replays)', async () => {
    await render(
      <WalkthroughCard lines={lines} shown={2} done onNext={() => {}} />,
    );
    expect(screen.getByTestId('walkthrough-line-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('walkthrough-next')).toBeNull();
  });
});
