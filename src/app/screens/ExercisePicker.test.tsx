import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { toPlainText } from '../../lesson/rich/runs';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { setDevTools } from '../devFlags';
import { allParts, CATALOG, findPart } from '../exercises';
import { ExercisePicker } from './ExercisePicker';
import { LessonScreen } from './LessonScreen';

afterEach(() => act(() => setDevTools(false)));

let log: EventLog;
async function renderApp(initialPart?: string) {
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart={initialPart}
        clock={fixedClock()}
        llm={null}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}

describe('exercise catalog', () => {
  it('part ids are unique across exercises, every exercise loads', () => {
    const ids = allParts().map(o => o.partId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CATALOG.every(e => e.result.ok)).toBe(true);
    expect(findPart('A1')).toEqual({
      exerciseId: 'bac2022c-ex4',
      partId: 'A1',
    });
    expect(findPart('Z9')).toBeNull();
  });
});

describe('ExercisePicker', () => {
  it('one card per exercise, title and parts from the JSON', async () => {
    await renderApp();
    expect(screen.getByTestId('exercise-picker')).toBeOnTheScreen();
    for (const e of CATALOG) {
      if (!e.result.ok) {
        throw new Error(e.id);
      }
      const { exercise } = e.result.loaded;
      expect(screen.getByTestId(`exercise-${e.id}`)).toBeOnTheScreen();
      expect(screen.getByText(toPlainText(exercise.title.ar))).toBeOnTheScreen();
      expect(screen.getByText(exercise.title.fr)).toBeOnTheScreen();
      for (const p of exercise.parts) {
        expect(screen.getByTestId(`open-${p.id}`)).toBeOnTheScreen();
      }
    }
    expect(screen.queryByTestId('lesson-screen')).toBeNull();
  });

  it('opens a part, and back returns to the picker (logged)', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('open-A1'));
    expect(screen.getByTestId('lesson-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-part')).toHaveTextContent('A.1');
    expect(screen.getByTestId('option-yes')).toBeOnTheScreen();
    // No part switch for normal use.
    expect(screen.queryByTestId('part-2a')).toBeNull();

    await fireEvent.press(screen.getByTestId('back-to-picker'));
    expect(screen.getByTestId('exercise-picker')).toBeOnTheScreen();
    expect(log.all().at(-1)).toMatchObject({
      t: 'component_event',
      component: 'LessonHeader',
      name: 'back_to_picker',
      questionId: 'A1',
    });

    await fireEvent.press(screen.getByTestId('open-1b'));
    expect(screen.getByTestId('lesson-part')).toHaveTextContent('1.b');
  });

  it('an unknown initial part shows the picker', async () => {
    await renderApp('Z9');
    expect(screen.getByTestId('exercise-picker')).toBeOnTheScreen();
  });

  it('the part switch is behind the dev flag and crosses exercises', async () => {
    await renderApp('2a');
    expect(screen.queryByTestId('part-A1')).toBeNull();
    await act(() => setDevTools(true));
    expect(screen.getByTestId('part-2a')).toBeSelected();
    await fireEvent.press(screen.getByTestId('part-A1'));
    expect(screen.getByTestId('part-A1')).toBeSelected();
    expect(screen.getByTestId('option-yes')).toBeOnTheScreen();
  });

  it('an exercise that fails to load gets an error card, no crash', async () => {
    await render(
      <ExercisePicker
        onOpen={() => undefined}
        catalog={[
          ...CATALOG,
          { id: 'broken', result: { ok: false, errors: ['bad step'] } },
        ]}
      />,
    );
    expect(screen.getByTestId('exercise-broken-error')).toBeOnTheScreen();
    expect(screen.getByText('bad step')).toBeOnTheScreen();
    expect(screen.getByTestId('open-A1')).toBeOnTheScreen();
  });
});
