import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../../i18n';
import { memoryStore } from '../../../storage/kv';
import { OnboardingScreen } from './OnboardingScreen';
import { ONBOARDING_KEY, isOnboarded, markOnboarded } from './onboardingState';

async function renderIt(p: Partial<React.ComponentProps<typeof OnboardingScreen>> = {}) {
  const onDone = jest.fn();
  await render(<OnboardingScreen onDone={onDone} still {...p} />);
  return onDone;
}
const next = () => fireEvent.press(screen.getByTestId('onboarding-next'));

describe('onboarding', () => {
  it('asks the class first; «نكمّلو» without one says so and stays', async () => {
    await renderIt();
    expect(screen.getByTestId('onboarding-class')).toBeOnTheScreen();
    expect(screen.getByText('في أنا قسم تقرا؟')).toBeOnTheScreen();
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
    await next();
    expect(screen.getByTestId('onboarding-nudge')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-class')).toBeOnTheScreen();
    // A year from 2ème on still needs its section.
    await fireEvent.press(screen.getByTestId('class-year-3s'));
    expect(screen.queryByTestId('onboarding-nudge')).toBeNull();
    await next();
    expect(screen.getByTestId('onboarding-nudge')).toBeOnTheScreen();
  });

  it('Bac Maths: the real bac analysis question as a map, then the real urn line by line', async () => {
    const onDone = await renderIt();
    await fireEvent.press(screen.getByTestId('class-year-4s'));
    await fireEvent.press(screen.getByTestId('class-section-mathematiques'));
    await next();
    expect(screen.getByTestId('onboarding-map')).toBeOnTheScreen();
    expect(screen.getByText(/Session de contrôle · Mathématiques · Exercice 4/)).toBeOnTheScreen();
    expect(screen.getByText('Bac · Mathématiques')).toBeOnTheScreen();
    expect(screen.getByText('يفهّمك السؤال قبل ما تحلّ')).toBeOnTheScreen();
    expect(screen.getByText('lim f(x) = 0   (x → +∞)')).toBeOnTheScreen();
    await next();
    expect(screen.getByTestId('onboarding-lines')).toBeOnTheScreen();
    expect(screen.getByText('p(A) = 2/10')).toBeOnTheScreen();
    expect(screen.getByText('p(A) = 1/10')).toBeOnTheScreen();
    expect(screen.getByText('ama fama zouz kour fihom 0 ?')).toBeOnTheScreen();
    expect(screen.getByLabelText('p(A) = 2/10, سطر فيه غلطة')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-next')).toHaveTextContent('نبداو');
    await next();
    expect(onDone).toHaveBeenCalledWith({ year: '4s', section: 'mathematiques' });
  });

  it('1ère has no section: its own examples (affine function, median)', async () => {
    const onDone = await renderIt();
    await fireEvent.press(screen.getByTestId('class-year-1s'));
    await next();
    expect(screen.getByText(/f est une fonction affine/)).toBeOnTheScreen();
    expect(screen.getByText('1ère année')).toBeOnTheScreen();
    await next();
    expect(screen.getByText('Me = 15')).toBeOnTheScreen();
    expect(screen.getByText('Médiane')).toBeOnTheScreen();
    // «تخطّي» finishes with the class too.
    await fireEvent.press(screen.getByTestId('onboarding-skip'));
    expect(onDone).toHaveBeenCalledWith({ year: '1s', section: null });
  });

  it('starts on a saved class; the dots go back, never ahead', async () => {
    await renderIt({ initial: { year: '4s', section: 'sciences-experimentales' } });
    expect(screen.getByTestId('class-year-4s')).toBeSelected();
    expect(screen.getByTestId('class-section-sciences-experimentales')).toBeSelected();
    await fireEvent.press(screen.getByTestId('onboarding-dot-2'));
    expect(screen.getByTestId('onboarding-class')).toBeOnTheScreen();
    await next();
    await next();
    expect(screen.getByText('p(A ∩ F) = 2/3 × 1/4 = 1/6')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('onboarding-dot-1'));
    expect(screen.getByTestId('onboarding-map')).toBeOnTheScreen();
  });

  it('changing the year drops a section the new year does not have', async () => {
    await renderIt({ initial: { year: '3s', section: 'mathematiques' } });
    await fireEvent.press(screen.getByTestId('class-year-2s'));
    expect(screen.getByTestId('class-section-sciences')).not.toBeSelected();
    await next();
    expect(screen.getByTestId('onboarding-nudge')).toBeOnTheScreen();
  });
});

describe('onboarding record', () => {
  it('is done once marked; damaged data shows it again', () => {
    const kv = memoryStore();
    expect(isOnboarded(kv)).toBe(false);
    markOnboarded(kv, 123);
    expect(isOnboarded(kv)).toBe(true);
    kv.set(ONBOARDING_KEY, '{');
    expect(isOnboarded(kv)).toBe(false);
  });
});
