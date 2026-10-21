import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { LessonScreen } from '../../app/screens/LessonScreen';
import { createDoneRecord } from '../../state/doneParts';
import { memoryStore } from '../../storage/kv';
import type { Event } from '../../telemetry/events';
import { createKvEventStore } from '../../telemetry/eventStore';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { theme } from '../../theme';

let log: EventLog;
async function renderPart(part: string, done: string[] = []) {
  const record = createDoneRecord(memoryStore());
  for (const q of done) {
    record.note({
      id: `pd-${q}`,
      ts: 1,
      sessionId: 'old',
      studentId: 'local-anon',
      exerciseId: q.startsWith('A') ? 'bac2022c-ex4' : 'bac2022c-ex2',
      contentVersion: 'v',
      questionId: q,
      stepId: 'part',
      t: 'part_done',
      counted: 4,
      answered: 4,
      revealed: 0,
    } as Event);
  }
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart={part}
        clock={fixedClock()}
        llm={null}
        eventStore={createKvEventStore(memoryStore())}
        doneRecord={record}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}
const sheetEvents = () =>
  log
    .all()
    .flatMap(e =>
      e.t === 'component_event' && e.component === 'PaperSheet'
        ? [{ name: e.name, payload: e.payload }]
        : [],
    );

describe('«الورقة» sheet (DESIGN.md §4.3)', () => {
  it('A1: the statement, A1 current, the questions not built yet as «قريبا»', async () => {
    await renderPart('A1');
    await fireEvent.press(screen.getByTestId('paper-open'));
    expect(screen.getByTestId('paper-statement')).toHaveTextContent(
      /Soit f la fonction/,
    );
    expect(screen.getByTestId('paper-q-A1-current')).toHaveTextContent(
      /انت هنا/,
    );
    for (const id of ['A2', 'A3', 'A4']) {
      const row = screen.getByTestId(`paper-q-${id}-soon`);
      expect(row).toHaveTextContent(/قريبا/);
      expect(row.props.onPress).toBeUndefined();
    }
    // The exam wording, as transcribed.
    expect(screen.getByTestId('paper-q-A4-soon')).toHaveTextContent(
      /Tracer \(ζ\)\./,
    );
  });

  it('2.a with 1.b done: 1.b ✓, 2.a current, the proven result p(B) shown', async () => {
    await renderPart('2a', ['1b']);
    await fireEvent.press(screen.getByTestId('paper-open'));
    expect(screen.getByTestId('paper-q-1b-done')).toHaveTextContent(/✓/);
    expect(screen.getByTestId('paper-q-2a-current')).toBeOnTheScreen();
    expect(screen.getByTestId('paper-result-p_B_7_10')).toBeOnTheScreen();
    expect(screen.queryByTestId('paper-result-law_X')).toBeNull();
  });

  it('closes four ways, each logged with how; focus goes back to the button', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await renderPart('A1');
    const open = () => fireEvent.press(screen.getByTestId('paper-open'));
    await open();
    await fireEvent.press(screen.getByTestId('paper-close'));
    await open();
    await fireEvent.press(screen.getByTestId('paper-scrim'));
    await open();
    await fireEvent(screen.getByTestId('paper-modal'), 'requestClose');
    await open();
    await fireEvent.press(screen.getByTestId('paper-return'));
    expect(screen.queryByTestId('paper-sheet')).toBeNull();
    expect(sheetEvents()).toEqual([
      { name: 'opened', payload: {} },
      { name: 'closed', payload: { via: 'close' } },
      { name: 'opened', payload: {} },
      { name: 'closed', payload: { via: 'scrim' } },
      { name: 'opened', payload: {} },
      { name: 'closed', payload: { via: 'back_gesture' } },
      { name: 'opened', payload: {} },
      { name: 'closed', payload: { via: 'return' } },
    ]);
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
    focus.mockRestore();
  });

  it('opens scrolled to the current question when the list is long', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo' as never);
    await renderPart('A1');
    await fireEvent.press(screen.getByTestId('paper-open'));
    await act(async () =>
      fireEvent(screen.getByTestId('paper-q-A1-current'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 900, width: 340, height: 80 } },
      }),
    );
    expect(scrollTo).toHaveBeenCalledWith({
      y: 900 - theme.space.section,
      animated: false,
    });
    scrollTo.mockRestore();
  });
});
