/**
 * The warm-up gate: an explanation of what we check and why, then the
 * exercise's own questions once before the exercise (a progress bar and the
 * topic of each), «ما نعرفش» and skip, no mark on any answer, the general
 * sentence at the end, then the lesson; the second time the lesson opens at
 * once.
 */
import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../../../i18n';
import i18n from '../../../../i18n';
import { loadProfile } from '../../../../ai/profile/profile';
import { CATALOG } from '../../../exercises';
import type { Rich } from '../../../../content/schema';
import { memoryStore } from '../../../../storage/kv';
import { WarmupGate } from './WarmupGate';

beforeAll(() => i18n.changeLanguage('ar-TN'));

const ex2 = CATALOG.find(e => e.id === 'bac2022c-ex2')!;
const loaded = ex2.result.ok ? ex2.result.loaded : null;

function gate(store = memoryStore()) {
  return (
    <WarmupGate
      exerciseId="bac2022c-ex2"
      warmup={loaded!.exercise.warmup}
      title={loaded!.exercise.title as Rich}
      onBack={jest.fn()}
      store={store}
    >
      <Text testID="lesson">lesson</Text>
    </WarmupGate>
  );
}

async function begin(store = memoryStore()) {
  await render(gate(store));
  await fireEvent.press(screen.getByTestId('warmup-begin'));
}

describe('the warm-up gate', () => {
  it('explains first: why, and what it checks for this exercise', async () => {
    await render(gate());
    expect(screen.getByTestId('warmup-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('warmup-intro')).toBeOnTheScreen();
    expect(
      screen.getByText('نحبّو نعرفو مستواك في الحاجات اللي يحتاجها هالتمرين.'),
    ).toBeOnTheScreen();
    for (const topic of [
      'dénombrement',
      'événement contraire',
      'produit nul',
      'espérance',
    ]) {
      expect(screen.getByText(topic)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('warmup-q-w_pairs')).toBeNull();
    expect(screen.queryByTestId('warmup-progress')).toBeNull();
    expect(screen.queryByTestId('lesson')).toBeNull();
  });

  it('«نبداو التسخين» opens the first question, with its topic and the progress', async () => {
    await begin();
    expect(screen.queryByTestId('warmup-intro')).toBeNull();
    expect(screen.getByTestId('warmup-q-w_pairs')).toBeOnTheScreen();
    expect(screen.getByTestId('warmup-topic-w_pairs')).toHaveTextContent(
      /dénombrement/,
    );
    expect(screen.getByLabelText('السؤال 1 من 4')).toBeOnTheScreen();
    expect(screen.getByText('1 / 4')).toBeOnTheScreen();
  });

  it('«ما نعرفش» moves on to the easier question, with no mark', async () => {
    await begin();
    await fireEvent.press(screen.getByTestId('warmup-dont-know'));
    expect(screen.getByTestId('warmup-q-w_list')).toBeOnTheScreen();
    expect(screen.getByText('2 / 5')).toBeOnTheScreen();
  });

  it('skip ends it with the general sentence, then the lesson; seen once', async () => {
    const store = memoryStore();
    await begin(store);
    await fireEvent.press(screen.getByTestId('warmup-dont-know'));
    await fireEvent.press(screen.getByTestId('warmup-skip'));
    expect(screen.getByTestId('warmup-done-text')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('warmup-start'));
    expect(screen.getByTestId('lesson')).toBeOnTheScreen();
    const p = loadProfile(store);
    expect(p?.warmups?.['bac2022c-ex2']?.answers[0]).toMatchObject({
      id: 'w_pairs',
      verdict: 'dont_know',
    });
    await render(gate(store));
    expect(screen.getByTestId('lesson')).toBeOnTheScreen();
    expect(screen.queryByTestId('warmup-screen')).toBeNull();
  });

  it('skip on the explanation goes straight to the lesson, nothing asked', async () => {
    const store = memoryStore();
    await render(gate(store));
    await fireEvent.press(screen.getByTestId('warmup-skip-all'));
    expect(screen.getByTestId('lesson')).toBeOnTheScreen();
    expect(
      loadProfile(store)?.warmups?.['bac2022c-ex2']?.answers.map(
        a => a.verdict,
      ),
    ).toEqual(['skipped', 'skipped', 'skipped', 'skipped']);
  });

  it('a pick question shows its cards', async () => {
    await begin();
    await fireEvent.press(screen.getByTestId('warmup-dont-know'));
    await fireEvent.press(screen.getByTestId('warmup-dont-know'));
    await fireEvent.press(screen.getByTestId('warmup-dont-know'));
    await fireEvent.press(screen.getByTestId('warmup-dont-know'));
    expect(screen.getByTestId('warmup-q-w_zero')).toBeOnTheScreen();
    expect(screen.getByTestId('warmup-cards')).toBeOnTheScreen();
  });
});
