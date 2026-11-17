import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { setDevTools } from '../src/app/devFlags';

// The old lesson's screens are tested on the frozen ex4 0.1.0 (question A1):
// ex4 1.0.0 moved Partie A to the hybrid board (docs/EX2_EX4_UPGRADE_PROGRESS.md).
jest.mock('../src/content/exercises/bac2022c-ex4.json', () =>
  jest.requireActual('../src/content/fixtures/ex4.v010.json'),
);
jest.mock('../src/content/exercises/bac2022c-ex4.misconceptions.json', () =>
  jest.requireActual('../src/content/fixtures/ex4Misconceptions.v010.json'),
);

afterEach(() => act(() => setDevTools(false)));

test('hides the dev tools until a long press on the lesson title', async () => {
  await render(<App />);
  // Normal start: the home; a domain opens its exercises, back returns home.
  expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('home-domain-probability'));
  expect(screen.getByTestId('exercise-picker')).toBeOnTheScreen();
  expect(screen.getByTestId('picker-subtitle')).toHaveTextContent(
    'Probabilités',
  );
  await fireEvent.press(screen.getByTestId('picker-back'));
  expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('home-domain-probability'));
  await fireEvent.press(screen.getByTestId('open-2a'));
  expect(screen.getByTestId('lesson-screen')).toBeOnTheScreen();
  expect(screen.queryByTestId('tab-demo')).toBeNull();
  expect(screen.queryByTestId('toggle-events')).toBeNull();
  expect(screen.queryByTestId('part-A1')).toBeNull();

  await fireEvent(screen.getByTestId('lesson-title'), 'longPress');
  expect(screen.getByTestId('part-A1')).toBeOnTheScreen();
  expect(screen.getByTestId('toggle-events')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('tab-demo'));
  expect(screen.getByTestId('lesson-ui-demo')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('tab-proba'));
  expect(screen.getByTestId('probability-demo')).toBeOnTheScreen();
  // The intentional fallback test case, labelled as such.
  expect(screen.getAllByTestId('component-fallback')).toHaveLength(1);
  expect(
    screen.getByText('fallback test (intentional: k = 9 > 5 balls)'),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('tab-bidi'));
  expect(screen.getByTestId('bidi-test-screen')).toBeOnTheScreen();
});
