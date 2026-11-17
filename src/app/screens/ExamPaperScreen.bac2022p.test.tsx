/**
 * The exam paper screen of the probability-tree exercise: the statement is
 * followed by the tree the exam prints, with its two numbers and its empty
 * branches, and by the four questions with the exam's own labels.
 */
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { createDoneRecord } from '../../state/doneParts';
import { memoryStore } from '../../storage/kv';
import { createKvEventStore } from '../../telemetry/eventStore';
import { fixedClock } from '../../telemetry/log';
import { partLabel } from '../exercises';
import { LessonScreen } from './LessonScreen';

describe('the exam paper of bac2022p-sc-ex2', () => {
  it('prints the tree under the statement, as on the exam', async () => {
    await render(
      <GestureHandlerRootView>
        <LessonScreen
          clock={fixedClock()}
          llm={null}
          eventStore={createKvEventStore(memoryStore())}
          doneRecord={createDoneRecord(memoryStore())}
        />
      </GestureHandlerRootView>,
    );
    await fireEvent.press(screen.getByTestId('paper-screen-bac2022p-sc-ex2'));
    expect(screen.getByTestId('exam-paper-source')).toHaveTextContent(
      'Examen du baccalauréat · Session principale 2022 · Sciences expérimentales',
    );
    expect(screen.getByTestId('exam-paper-heading')).toHaveTextContent(
      'Exercice 2 (3,5 points)',
    );
    const figure = within(screen.getByTestId('exam-paper-figure'));
    expect(figure.getByTestId('tree-picture')).toBeOnTheScreen();
    // Two printed numbers; nothing asked, nothing marked.
    expect(figure.getByTestId('tree-num-a')).toBeOnTheScreen();
    expect(figure.getByTestId('tree-num-a.f')).toBeOnTheScreen();
    expect(figure.queryByTestId('tree-num-na')).toBeNull();
    expect(figure.queryByTestId(/^tree-unknown-/)).toBeNull();
    expect(figure.queryByTestId(/^tree-mark-/)).toBeNull();
  });

  it("a part is shown with the paper's own number, not its internal id", () => {
    expect(['t1', 't2', 't3', 't4'].map(partLabel)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    // The exam-numbered ids of the other exercises keep their rule.
    expect(['1', '1b', 'A1', '3a'].map(partLabel)).toEqual([
      '1',
      '1.b',
      'A.1',
      '3.a',
    ]);
  });
});
