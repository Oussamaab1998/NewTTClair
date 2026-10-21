import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { toPlainText } from '../../lesson/rich/runs';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { setDevTools } from '../devFlags';
import { allParts, CATALOG, findPart } from '../exercises';
import { ExercisePicker } from './ExercisePicker';
import { createDoneRecord } from '../../state/doneParts';
import { memoryStore } from '../../storage/kv';
import type { Event } from '../../telemetry/events';
import { createKvEventStore } from '../../telemetry/eventStore';
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

describe('lesson header', () => {
  it('title, French subtitle, draft tag, back; no dev row in normal mode', async () => {
    await renderApp('A1');
    expect(screen.getByTestId('lesson-title')).toHaveTextContent(
      'تمرين دراسة الدالة',
    );
    expect(screen.getByText(/^Exercice 4/)).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-part')).toHaveTextContent('A.1');
    // Short tag; the full sentence stays for screen readers.
    expect(screen.getByTestId('draft-tag')).toHaveTextContent('مسودّة');
    expect(screen.getByLabelText('مسودّة: مازال ما راجعهاش أستاذ.')).toBe(
      screen.getByTestId('draft-tag'),
    );
    expect(screen.getByLabelText('رجوع للتمارين')).toBe(
      screen.getByTestId('back-to-picker'),
    );
    for (const id of ['toggle-events', 'export-queue', 'export-events']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it('the progress bar counts only acting steps: A1 0, 1, 2 of 4', async () => {
    await renderApp('A1');
    const value = () =>
      screen.getByTestId('lesson-progress').props.accessibilityValue as {
        now: number;
        max: number;
      };
    // Explanation steps do not count: the bar starts at 0.
    expect(value()).toMatchObject({ now: 0, max: 4 });
    await fireEvent.press(screen.getByTestId('option-yes'));
    // The prediction gate is open now.
    expect(value()).toMatchObject({ now: 1, max: 4 });
    await fireEvent.press(screen.getByTestId('predict-option-same'));
    // On the lines step.
    expect(value()).toMatchObject({ now: 2, max: 4 });
  });
});

describe('progress bar through a deep dive', () => {
  it('stays put during the deep dive, advances once the parent question is answered', async () => {
    await renderApp('1b');
    const now = () =>
      (
        screen.getByTestId('lesson-progress').props.accessibilityValue as {
          now: number;
          max: number;
        }
      ).now;
    expect(now()).toBe(0);
    // «ما نعرفش» opens a deep dive: the question is still open, nothing passed.
    await fireEvent.press(screen.getAllByTestId('not-sure').at(-1)!);
    expect(now()).toBe(0);
    // Leave the dive ("back" in the mini card's ⋯), answer the question right.
    await fireEvent.press(screen.getAllByTestId(/^card-menu-/).at(-1)!);
    await fireEvent.press(screen.getByTestId('back-to-question'));
    await fireEvent.press(screen.getAllByTestId('option-none').at(-1)!);
    expect(now()).toBe(1);
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
      // The Arabic title (its plain text), «Exercice n» from the number field.
      expect(
        screen.getByLabelText(toPlainText(exercise.title.ar)),
      ).toBeOnTheScreen();
      expect(screen.getByText(`Exercice ${exercise.number}`)).toBeOnTheScreen();
      for (const p of exercise.parts) {
        expect(screen.getByTestId(`open-${p.id}`)).toBeOnTheScreen();
      }
      // Questions not built yet are on the card too, not pressable.
      for (const q of exercise.paper?.questions ?? []) {
        if (q.status === 'soon') {
          expect(screen.getByTestId(`soon-${q.id}`)).toBeOnTheScreen();
        }
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

describe('picker cards: done parts, current part, «كمّل من»', () => {
  const partDone = (questionId: string, answered: number): Event =>
    ({
      id: `pd-${questionId}-${answered}`,
      ts: 1,
      sessionId: 'old',
      studentId: 'local-anon',
      exerciseId: questionId.startsWith('A') ? 'bac2022c-ex4' : 'bac2022c-ex2',
      contentVersion: 'v',
      questionId,
      stepId: 'part',
      t: 'part_done',
      counted: 4,
      answered,
      revealed: 4 - answered,
    } as Event);
  const storeWith = (events: Event[]) => {
    const store = createKvEventStore(memoryStore());
    store.append(events);
    return store;
  };

  it('no history: «نبداو», the first part is current, not-built questions are not pressable', async () => {
    await render(
      <ExercisePicker onOpen={() => undefined} eventStore={storeWith([])} />,
    );
    expect(screen.getByTestId('resume-bac2022c-ex2')).toHaveTextContent(
      'نبداو',
    );
    expect(screen.getByLabelText('السؤال 1.b, التالي')).toBeOnTheScreen();
    const soon = screen.getByTestId('soon-2b');
    expect(soon.props.accessibilityState).toEqual({ disabled: true });
    expect(soon.props.onPress).toBeUndefined();
  });

  it('a done part gets ✓ and «كمّل من» the next one; revealed-only does not count', async () => {
    const opened: string[] = [];
    await render(
      <ExercisePicker
        onOpen={o => opened.push(o.partId)}
        eventStore={storeWith([partDone('1b', 2), partDone('A1', 0)])}
      />,
    );
    expect(screen.getByTestId('open-1b')).toHaveTextContent('✓1.b');
    expect(screen.getByLabelText('السؤال 2.a, التالي')).toBeOnTheScreen();
    expect(screen.getByTestId('resume-bac2022c-ex2')).toHaveTextContent(
      /كمّل من/,
    );
    // A1 was only revealed: not done, so ex4 still starts.
    expect(screen.getByTestId('open-A1')).toHaveTextContent('A.1');
    expect(screen.getByTestId('resume-bac2022c-ex4')).toHaveTextContent(
      'نبداو',
    );
    await fireEvent.press(screen.getByTestId('resume-bac2022c-ex2'));
    expect(opened).toEqual(['2a']);
  });

  it('the record keeps a done mark the event store no longer has', async () => {
    const record = createDoneRecord(memoryStore());
    record.note(partDone('1b', 1));
    await render(
      <ExercisePicker
        onOpen={() => undefined}
        eventStore={storeWith([])}
        doneRecord={record}
      />,
    );
    expect(screen.getByTestId('open-1b')).toHaveTextContent('✓1.b');
  });

  it('done parts are read again when coming back from a lesson', async () => {
    const store = storeWith([]);
    const record = createDoneRecord(memoryStore());
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
    expect(screen.getByTestId('open-1b')).toHaveTextContent('1.b');
    await fireEvent.press(screen.getByTestId('open-1b'));
    // The part reaches its done line while it is open (stored like the app does).
    store.append([partDone('1b', 3)]);
    await fireEvent.press(screen.getByTestId('back-to-picker'));
    expect(screen.getByTestId('open-1b')).toHaveTextContent('✓1.b');
  });
});
