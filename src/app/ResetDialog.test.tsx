import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../i18n';
import { createDoneRecord, type DoneRecord } from '../state/doneParts';
import { memoryStore } from '../storage/kv';
import type { Event } from '../telemetry/events';
import { createKvEventStore, type EventStore } from '../telemetry/eventStore';
import { fixedClock } from '../telemetry/log';
import { LessonScreen } from './screens/LessonScreen';

let store: EventStore;
let record: DoneRecord;
/** The app at the picker; ex2's 1.b done in an earlier session (ts 1). */
async function renderApp({ doneBefore = true } = {}) {
  store = createKvEventStore(memoryStore());
  record = createDoneRecord(memoryStore());
  if (doneBefore) {
    const done = {
      id: 'pd-1b',
      ts: 1,
      sessionId: 'old',
      studentId: 'local-anon',
      exerciseId: 'bac2022c-ex2',
      contentVersion: 'v',
      questionId: '1b',
      stepId: 'part',
      t: 'part_done',
      counted: 3,
      answered: 3,
      revealed: 0,
    } as Event;
    store.append([done]);
    record.note(done);
  }
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        // Later than the stored session: the reset comes after it.
        clock={{ ...fixedClock(), now: () => 1_000 }}
        llm={null}
        eventStore={store}
        doneRecord={record}
      />
    </GestureHandlerRootView>,
  );
}
const dialogEvents = () =>
  store
    .load()
    .flatMap(e =>
      e.t === 'component_event' && e.component === 'ResetDialog'
        ? [{ name: e.name, payload: e.payload }]
        : e.t === 'exercise_reset'
        ? [{ name: 'exercise_reset', payload: { exerciseId: e.exerciseId } }]
        : [],
    );
const RESET = 'reset-bac2022c-ex2';

describe('«ابدا من جديد» (start the exercise from scratch)', () => {
  it('the link shows only on an exercise with a done part', async () => {
    await renderApp({ doneBefore: false });
    expect(screen.queryByTestId(RESET)).toBeNull();
    expect(screen.queryByTestId('reset-bac2022c-ex4')).toBeNull();
  });

  it('confirm: progress of ex2 counts again from zero, at once; history stays', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await renderApp();
    expect(screen.getByTestId('open-1b')).toHaveTextContent('✓1.b');
    expect(screen.getByTestId('resume-bac2022c-ex2')).toHaveTextContent(
      /كمّل من/,
    );
    await fireEvent.press(screen.getByTestId(RESET));
    expect(
      screen.getByText(
        'تحب تبدا التمرين هذا من جديد؟ العلامات متاع التقدّم باش تتمسح.',
      ),
    ).toBeOnTheScreen();
    // Focus starts on «لا».
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
    await fireEvent.press(screen.getByTestId('reset-confirm'));
    expect(screen.queryByTestId('reset-dialog')).toBeNull();
    expect(screen.getByTestId('open-1b')).toHaveTextContent(/^1\.b$/);
    expect(screen.getByTestId('resume-bac2022c-ex2')).toHaveTextContent(
      'نبداو',
    );
    expect(screen.queryByTestId(RESET)).toBeNull();
    expect(dialogEvents()).toEqual([
      { name: 'opened', payload: { exerciseId: 'bac2022c-ex2' } },
      { name: 'confirmed', payload: { exerciseId: 'bac2022c-ex2' } },
      { name: 'exercise_reset', payload: { exerciseId: 'bac2022c-ex2' } },
    ]);
    // Nothing deleted: the old part_done is still stored.
    expect(store.load().some(e => e.t === 'part_done')).toBe(true);
    focus.mockRestore();
  });

  it('three ways to cancel («لا», outside, back gesture): nothing changes, each logged', async () => {
    await renderApp();
    const open = () => fireEvent.press(screen.getByTestId(RESET));
    await open();
    await fireEvent.press(screen.getByTestId('reset-cancel'));
    await open();
    await fireEvent.press(screen.getByTestId('reset-scrim'));
    await open();
    await fireEvent(screen.getByTestId('reset-modal'), 'requestClose');
    expect(screen.queryByTestId('reset-dialog')).toBeNull();
    expect(screen.getByTestId('open-1b')).toHaveTextContent('✓1.b');
    const ex = { exerciseId: 'bac2022c-ex2' };
    expect(dialogEvents()).toEqual([
      { name: 'opened', payload: ex },
      { name: 'cancelled', payload: { ...ex, via: 'no' } },
      { name: 'opened', payload: ex },
      { name: 'cancelled', payload: { ...ex, via: 'scrim' } },
      { name: 'opened', payload: ex },
      { name: 'cancelled', payload: { ...ex, via: 'back_gesture' } },
    ]);
  });

  it('the paper screen: the link at the bottom; after a reset, no ✓ and the first part is current', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('paper-screen-bac2022c-ex2'));
    expect(screen.getByTestId('exam-q-1b-done')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId(RESET));
    await fireEvent.press(screen.getByTestId('reset-confirm'));
    expect(screen.getByTestId('exam-q-1b-current')).toBeOnTheScreen();
    expect(screen.getByTestId('exam-paper-start')).toHaveTextContent('نبداو');
    expect(screen.queryByTestId(RESET)).toBeNull();
  });

  it('the next lesson starts its progress bar at zero', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId(RESET));
    await fireEvent.press(screen.getByTestId('reset-confirm'));
    await fireEvent.press(screen.getByTestId('resume-bac2022c-ex2'));
    expect(screen.getByTestId('lesson-part')).toHaveTextContent('1.b');
    expect(
      screen.getByTestId('lesson-progress').props.accessibilityValue,
    ).toMatchObject({
      now: 0,
    });
  });
});
