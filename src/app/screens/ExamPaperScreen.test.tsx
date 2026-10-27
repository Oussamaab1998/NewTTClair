import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { createDoneRecord } from '../../state/doneParts';
import { memoryStore } from '../../storage/kv';
import type { Event } from '../../telemetry/events';
import {
  createKvEventStore,
  type EventStore,
} from '../../telemetry/eventStore';
import { fixedClock } from '../../telemetry/log';
import { LessonScreen } from './LessonScreen';

let store: EventStore;
/** The app at the picker; `done` parts already finished in an earlier session. */
async function renderApp(
  done: { exerciseId: string; questionId: string }[] = [],
) {
  store = createKvEventStore(memoryStore());
  const record = createDoneRecord(memoryStore());
  for (const d of done) {
    record.note({
      id: `pd-${d.questionId}`,
      ts: 1,
      sessionId: 'old',
      studentId: 'local-anon',
      contentVersion: 'v',
      stepId: 'part',
      t: 'part_done',
      counted: 3,
      answered: 3,
      revealed: 0,
      ...d,
    } as Event);
  }
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        clock={fixedClock()}
        llm={null}
        eventStore={store}
        doneRecord={record}
      />
    </GestureHandlerRootView>,
  );
}
const paperEvents = () =>
  store
    .load()
    .flatMap(e =>
      e.t === 'component_event' && e.component === 'ExamPaper'
        ? [{ name: e.name, payload: e.payload }]
        : [],
    );

describe('the exam paper screen (DESIGN.md §4.4, mockups 05 / 06 / 07)', () => {
  it('«شوف الورقة» opens the whole exercise 4 as printed, not the lesson', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('paper-screen-bac2022c-ex4'));
    expect(screen.getByTestId('exam-paper')).toBeOnTheScreen();
    expect(screen.queryByTestId('lesson-screen')).toBeNull();
    expect(screen.getByTestId('exam-paper-source')).toHaveTextContent(
      'Examen du baccalauréat · Session de contrôle 2022 · Mathématiques',
    );
    expect(screen.getByTestId('exam-paper-heading')).toHaveTextContent(
      'Exercice 4 (7 points)',
    );
    expect(screen.getByTestId('exam-paper-points')).toHaveTextContent('7 نقاط');
    for (const [i, h] of ['Partie A', 'Partie B', 'Partie C'].entries()) {
      expect(screen.getByTestId(`exam-part-${i}`)).toHaveTextContent(
        new RegExp(h),
      );
    }
    for (const label of ['a', 'b', 'c']) {
      expect(screen.getByTestId(`exam-sub-B2-${label}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('exam-sub-C2-b')).toHaveTextContent(
      /En déduire que/,
    );
    // The current question is the first one to do; nothing else is marked.
    expect(screen.getByTestId('exam-q-A1-current')).toBeOnTheScreen();
    expect(screen.getByTestId('exam-q-B1-none')).toBeOnTheScreen();
    // Formulas read as French words (Partie B's integral).
    expect(
      screen.getByLabelText(
        /^F de x égale intégrale de 0 à l n x de f de t d t$/,
      ),
    ).toBeOnTheScreen();
  });

  it('a done part has its ✓, the next one is current; the button resumes there', async () => {
    await renderApp([{ exerciseId: 'bac2022c-ex2', questionId: '1b' }]);
    await fireEvent.press(screen.getByTestId('paper-screen-bac2022c-ex2'));
    expect(screen.getByTestId('exam-q-1b-done')).toBeOnTheScreen();
    expect(screen.getByLabelText('كملتو')).toBeOnTheScreen();
    expect(screen.getByTestId('exam-q-2a-current')).toBeOnTheScreen();
    // No transcribed wording: only the label and «قريبا».
    expect(screen.getByTestId('exam-q-1a-soon')).toHaveTextContent(/قريبا/);
    // Ex2 has no confirmed points: «Exercice 2» alone, no points tag.
    expect(screen.getByTestId('exam-paper-heading')).toHaveTextContent(
      /^Exercice 2$/,
    );
    expect(screen.queryByTestId('exam-paper-points')).toBeNull();
    await fireEvent.press(screen.getByTestId('exam-paper-start'));
    expect(screen.getByTestId('lesson-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-part')).toHaveTextContent('2.a');
    expect(paperEvents()).toEqual([
      { name: 'opened', payload: {} },
      { name: 'start', payload: { partId: '2a' } },
    ]);
  });

  it('back returns to the picker (logged)', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('paper-screen-bac2022c-ex4'));
    await fireEvent.press(screen.getByTestId('exam-paper-back'));
    expect(screen.getByTestId('exercise-picker')).toBeOnTheScreen();
    expect(paperEvents()).toEqual([
      { name: 'opened', payload: {} },
      { name: 'closed', payload: { via: 'back' } },
    ]);
  });
});
