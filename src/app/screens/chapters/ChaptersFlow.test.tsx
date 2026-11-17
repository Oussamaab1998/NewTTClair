import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import '../../../i18n';
import { memoryStore } from '../../../storage/kv';
import { ChaptersFlow } from './ChaptersFlow';
import { saveStudentClass } from './studentClass';

const doneRecord = (...keys: string[]) => ({
  all: () =>
    Object.fromEntries(keys.map(k => [k, { firstDoneAt: 1, contentVersion: 'x' }])),
});

async function renderFlow(p: Partial<React.ComponentProps<typeof ChaptersFlow>> = {}) {
  const onOpen = jest.fn();
  const onBack = jest.fn();
  await render(
    <ChaptersFlow onOpen={onOpen} onBack={onBack} store={memoryStore()} {...p} />,
  );
  return { onOpen, onBack };
}

describe('chapter picker', () => {
  it('asks the class the first time, keeps it, then lists the chapters', async () => {
    const store = memoryStore();
    await renderFlow({ store });
    expect(screen.getByTestId('class-picker')).toBeOnTheScreen();
    expect(screen.getByTestId('class-next')).toBeDisabled();
    // 1ère has no section: ready at once.
    await fireEvent.press(screen.getByTestId('class-year-1s'));
    expect(screen.queryByTestId('class-section-mathematiques')).toBeNull();
    expect(screen.getByTestId('class-next')).toBeEnabled();
    // Bac needs its section.
    await fireEvent.press(screen.getByTestId('class-year-4s'));
    expect(screen.getByTestId('class-next')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('class-section-sciences-experimentales'));
    await fireEvent.press(screen.getByTestId('class-next'));
    expect(screen.getByTestId('chapter-list')).toBeOnTheScreen();
    expect(store.getString('student.class.v1')).toBe(
      '{"year":"4s","section":"sciences-experimentales"}',
    );
    expect(screen.getByTestId('chapters-change-class')).toHaveTextContent(
      /Bac · Sciences expérimentales/,
    );
    expect(screen.getByTestId('tile-total')).toHaveTextContent(/17/);
    expect(screen.getByTestId('tile-available')).toHaveTextContent(/2/);
  });

  it('chapters with exercises first; the others say «قريبا»', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '4s', section: 'sciences-experimentales' });
    await renderFlow({ store, doneRecord: doneRecord('bac2022c-sc-ex2/1') });
    const finite = screen.getByTestId('chapter-now-4s-se.probabilites-ensemble-fini');
    expect(finite).toHaveTextContent(/1\/6/);
    expect(screen.getByTestId('chapter-row-4s-se.statistiques')).toHaveTextContent(/قريبا/);
    expect(
      screen.getByTestId('chapter-row-4s-se.variables-aleatoires'),
    ).not.toHaveTextContent(/قريبا/);
  });

  it('a home domain card starts on that filter; «الكل» shows every domain', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '4s', section: 'mathematiques' });
    await renderFlow({ store, domain: 'probability' });
    expect(screen.getByTestId('chapters-group-probability')).toBeOnTheScreen();
    expect(screen.queryByTestId('chapters-group-analysis')).toBeNull();
    await fireEvent.press(screen.getByTestId('chapters-filter-all'));
    expect(screen.getByTestId('chapters-group-analysis')).toBeOnTheScreen();
    expect(screen.getByTestId('chapters-group-arithmetic')).toBeOnTheScreen();
  });

  it('a chapter shows only its parts of an exercise and opens the next one', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '4s', section: 'sciences-experimentales' });
    const { onOpen } = await renderFlow({
      store,
      doneRecord: doneRecord('bac2022c-sc-ex2/3a'),
    });
    await fireEvent.press(screen.getByTestId('chapter-now-4s-se.variables-aleatoires'));
    const card = screen.getByTestId('chapter-exercise-bac2022c-sc-ex2');
    expect(within(card).getByText('الأسئلة اللي تخصّ الدرس هذا برك')).toBeOnTheScreen();
    expect(within(card).queryByTestId('chapter-part-bac2022c-sc-ex2-1')).toBeNull();
    expect(within(card).getByTestId('chapter-part-bac2022c-sc-ex2-3a')).toHaveTextContent(
      /✓ 3\.a/,
    );
    expect(within(card).getByText(/Session de contrôle/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('chapter-go-bac2022c-sc-ex2'));
    expect(onOpen).toHaveBeenLastCalledWith({ exerciseId: 'bac2022c-sc-ex2', partId: '3b' });
    // Any part opens on tap.
    await fireEvent.press(screen.getByTestId('chapter-part-bac2022c-sc-ex2-3a'));
    expect(onOpen).toHaveBeenLastCalledWith({ exerciseId: 'bac2022c-sc-ex2', partId: '3a' });
    await fireEvent.press(screen.getByTestId('chapter-back'));
    expect(screen.getByTestId('chapter-list')).toBeOnTheScreen();
  });

  it('a chapter without exercises says «قريبا»', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '4s', section: 'mathematiques' });
    await renderFlow({ store });
    await fireEvent.press(screen.getByTestId('chapter-row-4s-m.coniques'));
    expect(screen.getByTestId('chapter-soon')).toBeOnTheScreen();
  });

  it('a class with no exercises yet gets the honest card, not an empty list', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '1s', section: null });
    await renderFlow({ store });
    expect(screen.getByTestId('chapters-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('chapters-change-class')).toHaveTextContent(/1ère année/);
    expect(screen.getByTestId('chapter-row-1s.fonctions-affines')).toHaveTextContent(/قريبا/);
  });

  it('«بدّل» opens the picker on the current class; back keeps it', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '3s', section: 'sciences-techniques' });
    const { onBack } = await renderFlow({ store });
    await fireEvent.press(screen.getByTestId('chapters-change-class'));
    expect(screen.getByTestId('class-year-3s')).toBeSelected();
    expect(screen.getByTestId('class-section-sciences-techniques')).toBeSelected();
    await fireEvent.press(screen.getByTestId('class-back'));
    expect(screen.getByTestId('chapter-list')).toBeOnTheScreen();
    expect(onBack).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('chapters-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('the parent keeps the open chapter (a lesson comes back to it)', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '4s', section: 'mathematiques' });
    const onChapter = jest.fn();
    await renderFlow({ store, chapterId: '4s-m.probabilites', onChapter });
    expect(screen.getByTestId('chapter-4s-m.probabilites')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('chapter-back'));
    expect(onChapter).toHaveBeenLastCalledWith(null);
  });
});
