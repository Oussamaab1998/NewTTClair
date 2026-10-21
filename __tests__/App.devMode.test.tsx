import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import App from '../App';
import { devToolsEnabled, setDevTools } from '../src/app/devFlags';

// `-devMode on` at launch (debug builds): dev mode for that run.
jest.mock('../src/app/dev/launch', () => ({
  ...jest.requireActual('../src/app/dev/launch'),
  devModeAtLaunch: () => true,
}));

afterEach(() => act(() => setDevTools(false)));

test('-devMode on shows the dev tabs from the start', async () => {
  await render(<App />);
  expect(devToolsEnabled()).toBe(true);
  expect(screen.getByTestId('tab-demo')).toBeOnTheScreen();
  expect(screen.getByTestId('exercise-picker')).toBeOnTheScreen();
});
