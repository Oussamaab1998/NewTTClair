import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { setDevTools } from '../src/app/devFlags';

afterEach(() => act(() => setDevTools(false)));

test('hides the dev tools until a long press on the lesson title', async () => {
  await render(<App />);
  expect(screen.getByTestId('lesson-screen')).toBeOnTheScreen();
  expect(screen.queryByTestId('tab-demo')).toBeNull();
  expect(screen.queryByTestId('toggle-events')).toBeNull();

  await fireEvent(screen.getByTestId('lesson-title'), 'longPress');
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
