import '../../i18n';

import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';

import i18n from '../../i18n';
import { BIDI } from '../../lesson/rich/runs';
import { BidiTestScreen } from './BidiTestScreen';
import { MATH_SAMPLES, SENTENCES } from './bidiTestFixtures';

const renderScreen = () => render(<BidiTestScreen />);

describe('BidiTestScreen', () => {
  it('shows the lesson feed sample first', async () => {
    await renderScreen();
    expect(screen.getByTestId('feed-sample')).toBeOnTheScreen();
  });

  it('renders every sentence with all four strategies', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('tab-sentences'));
    for (const [i, sentence] of SENTENCES.entries()) {
      await fireEvent.press(screen.getByTestId(`sentence-chip-${i}`));
      for (const strategy of ['none', 'unicode', 'nested', 'both']) {
        expect(
          screen.getByTestId(`sentence-${sentence.id}-${strategy}`),
        ).toBeOnTheScreen();
      }
    }
  });

  it('isolates French terms only in strategies that should', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('tab-sentences'));
    const both = screen.getByTestId('sentence-S1-both');
    const none = screen.getByTestId('sentence-S1-none');
    expect(both).toHaveTextContent(
      `${BIDI.LRI}${BIDI.LRM}domaine${BIDI.LRM}${BIDI.PDI}`,
      {
        exact: false,
      },
    );
    expect(none).not.toHaveTextContent(BIDI.LRI, { exact: false });
  });

  it('renders every math sample with the native renderer (no fallback)', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('tab-math'));
    for (const [i, latex] of MATH_SAMPLES.entries()) {
      await fireEvent.press(
        screen.getByTestId(`math-page-${Math.floor(i / 4)}`),
      );
      const card = screen.getByTestId(`math-${i}`);
      // The raw LaTeX appears once (the caption), not again as a fallback.
      expect(within(card).getAllByText(latex)).toHaveLength(1);
    }
  });

  it('switches UI locale', async () => {
    await renderScreen();
    expect(
      screen.getByText('تجربة: عربي، كلمات بالفرنسي ورياضيات'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Français'));
    expect(
      await screen.findByText('Test : arabe, termes français et maths'),
    ).toBeOnTheScreen();
    await act(() => i18n.changeLanguage('ar-TN'));
  });
});
