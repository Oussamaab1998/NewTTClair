/**
 * The home screen: a new student gets «مرحبا بيك» and one suggested exercise
 * (its warm-up first), no counts; a returning one gets «كمّل وين وقفت» at the
 * question he was on and his effort counts. The domain and session cards open
 * the exercise list; the sheet opens the exam paper.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../../i18n';
import i18n from '../../../i18n';
import { partKey } from '../../../state/doneParts';
import { memoryStore } from '../../../storage/kv';
import { HomeScreen } from './HomeScreen';
import { noteActiveDay } from './activeDays';
import { saveStudentClass } from '../chapters/studentClass';

beforeAll(() => i18n.changeLanguage('ar-TN'));

const NOW = new Date(2026, 10, 19, 10).getTime();

function home(over: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  const onOpen = jest.fn();
  const onPaper = jest.fn();
  const onList = jest.fn();
  const el = (
    <HomeScreen
      onOpen={onOpen}
      onPaper={onPaper}
      onList={onList}
      eventStore={{ load: () => [] }}
      doneRecord={{ all: () => ({}) }}
      store={memoryStore()}
      now={() => NOW}
      {...over}
    />
  );
  return { el, onOpen, onPaper, onList };
}

describe('the home screen', () => {
  it('a new student: welcome, one suggested exercise with its warm-up, no counts', async () => {
    const h = home();
    await render(h.el);
    expect(screen.getByText('مرحبا بيك')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hero-start')).toBeOnTheScreen();
    expect(screen.getByText('نقترحو تبدا بـ')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'قبل التمرين، شوية أسئلة صغار باش نعرفو منين نبداو معاك.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Contrôle 2022 · Maths · Exercice 2'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('home-stats')).toBeNull();
    // No class picked yet: the bac Maths.
    expect(screen.getByTestId('home-class')).toHaveTextContent(
      'Bac · Mathématiques',
    );
    await fireEvent.press(screen.getByTestId('home-start'));
    expect(h.onOpen).toHaveBeenCalledWith({
      exerciseId: 'bac2022c-ex2',
      partId: '1a',
    });
  });

  it('a returning student: «كمّل وين وقفت» at his question, and his counts', async () => {
    const store = memoryStore();
    noteActiveDay(store, NOW);
    const h = home({
      store,
      doneRecord: {
        all: () => ({
          [partKey('bac2022c-ex2', '1a')]: {
            firstDoneAt: NOW,
            contentVersion: 'x',
          },
        }),
      },
    });
    await render(h.el);
    expect(screen.getByText('عسلامة')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hero-resume')).toBeOnTheScreen();
    expect(
      screen.getByText('Contrôle 2022 · Maths · Exercice 2 · Question 1.b'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('كمّلت 1 من 6')).toBeOnTheScreen();
    expect(screen.getByTestId('home-stats')).toHaveTextContent(
      /1أسئلة كمّلتهم1تمارين بديتهم1أيام هالجمعة/,
    );
    await fireEvent.press(screen.getByTestId('home-resume'));
    expect(h.onOpen).toHaveBeenCalledWith({
      exerciseId: 'bac2022c-ex2',
      partId: '1b',
    });
    await fireEvent.press(screen.getByTestId('home-paper'));
    expect(h.onPaper).toHaveBeenCalledWith('bac2022c-ex2');
  });

  it('the domains open their exercises; the empty ones are «قريبا»; the sessions too', async () => {
    const h = home();
    await render(h.el);
    expect(screen.getByTestId('home-domain-probability')).toHaveTextContent(
      /Probabilités3 exercicesالاحتمالات/,
    );
    expect(screen.getByTestId('home-soon-sequences')).toHaveTextContent(
      /Suitesقريبا/,
    );
    await fireEvent.press(screen.getByTestId('home-domain-analysis'));
    expect(h.onList).toHaveBeenCalledWith({
      kind: 'domain',
      domain: 'analysis',
    });
    await fireEvent.press(screen.getByTestId('home-session-bac2022p'));
    expect(h.onList).toHaveBeenCalledWith({
      kind: 'session',
      session: 'bac2022p',
    });
  });

  it('reads his class from the class picker: its line and its first suggestion', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '4s', section: 'sciences-experimentales' });
    const h = home({ store });
    await render(h.el);
    expect(screen.getByTestId('home-class')).toHaveTextContent(
      'Bac · Sciences expérimentales',
    );
    expect(
      screen.getByText('Contrôle 2022 · Sc. exp. · Exercice 2'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('home-start'));
    expect(h.onOpen).toHaveBeenCalledWith({
      exerciseId: 'bac2022c-sc-ex2',
      partId: '1',
    });
  });

  it('a class with no exercise yet (1ère): «التمارين متاع قسمك في الطريق», the bac ones one link away', async () => {
    const store = memoryStore();
    saveStudentClass(store, { year: '1s', section: null });
    const h = home({ store });
    await render(h.el);
    expect(screen.getByTestId('home-class')).toHaveTextContent('1ère année');
    expect(screen.getByTestId('home-hero-soon')).toHaveTextContent(
      /التمارين متاع قسمك في الطريق/,
    );
    expect(screen.queryByTestId('home-start')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-see-bac'));
    expect(h.onList).toHaveBeenCalledWith({ kind: 'all' });
  });
});
