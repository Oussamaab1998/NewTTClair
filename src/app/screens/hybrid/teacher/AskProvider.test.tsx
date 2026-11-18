import '../../../../i18n';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Pressable } from 'react-native';

import type { GlossaryEntry } from '../../../../content/help/schema';
import { ASK_LONG_PRESS_MS, RichView } from '../../../../lesson/feed/RichView';
import { AskProvider } from './AskProvider';

const mockEntries: GlossaryEntry[] = [
  {
    id: 'inter',
    match: ['p(A \\cap F)'],
    meaning: [{ ar: [{ ar: 'الزوز مع بعض.' }] }],
  },
  {
    id: 'montrer',
    match: ['Montrer que'],
    meaning: [{ ar: [{ ar: 'نوريو باللي الحاجة صحيحة.' }] }],
  },
  {
    id: 'arbre',
    match: ['arbre de probabilité'],
    meaning: [{ ar: [{ ar: 'الشجرة.' }] }],
  },
];
jest.mock('../../../../content/help/help', () => ({
  glossaryMatches: (_ex: string, pressed: string) => {
    const k = pressed.replace(/\s+/g, '');
    const exact = mockEntries.filter(e =>
      e.match.some(m => m.replace(/\s+/g, '') === k),
    );
    return exact.length > 0
      ? exact
      : mockEntries.filter(e =>
          e.match.some(m => k.includes(m.replace(/\s+/g, ''))),
        );
  },
}));

const touch = (x = 10, y = 10) => ({
  nativeEvent: { pageX: x, pageY: y, touches: [{}] },
});

async function longPress(testID: string) {
  const el = screen.getByTestId(testID);
  await fireEvent(el, 'touchStart', touch());
  await act(async () => {
    jest.advanceTimersByTime(ASK_LONG_PRESS_MS + 10);
  });
}

describe('long press to ask', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('changes nothing in RichView without the provider', async () => {
    await render(<RichView rich={{ fr: 'Montrer que', math: 'p(A)' }} />);
    expect(screen.queryByTestId('ask-fr')).toBeNull();
    expect(screen.queryByTestId('ask-math')).toBeNull();
  });

  it('opens the four options on a formula, and asks with the one entry it names', async () => {
    const onAsk = jest.fn();
    await render(
      <AskProvider exerciseId="x" onAsk={onAsk}>
        <RichView rich={{ math: 'p(A \\cap F)' }} />
      </AskProvider>,
    );
    expect(screen.queryByTestId('ask-menu')).toBeNull();
    await longPress('ask-math');
    expect(screen.getByTestId('ask-menu')).toBeTruthy();
    expect(screen.getByText('نسأل الأستاذ على الكتيبة هاذي')).toBeTruthy();
    for (const label of [
      'شنوّة معناها؟',
      'كيفاش نقراها بالفرنسي؟',
      'علاش نستعملوها هنا؟',
      'نكتب سؤالي وحدي',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // One entry: no chips to pick.
    expect(screen.queryByTestId('ask-chip-inter')).toBeNull();
    await fireEvent.press(screen.getByTestId('ask-option-meaning'));
    expect(onAsk).toHaveBeenCalledWith({
      kind: 'meaning',
      pressed: { kind: 'math', text: 'p(A \\cap F)' },
      entryId: 'inter',
    });
    expect(screen.queryByTestId('ask-menu')).toBeNull();
  });

  it('shows the entries of a French sentence as chips, and asks about the one he picks', async () => {
    const onAsk = jest.fn();
    const sentence = "Montrer que l'arbre de probabilité ci-contre est correct";
    await render(
      <AskProvider exerciseId="x" onAsk={onAsk}>
        <RichView rich={{ fr: sentence }} variant="paper" />
      </AskProvider>,
    );
    await longPress('ask-fr');
    expect(screen.getByText('اختار شنوّة تحب تفهم:')).toBeTruthy();
    expect(screen.getByTestId('ask-chip-montrer')).toBeTruthy();
    expect(screen.getByTestId('ask-chip-arbre')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ask-chip-arbre'));
    await fireEvent.press(screen.getByTestId('ask-option-reading'));
    expect(onAsk).toHaveBeenCalledWith({
      kind: 'reading',
      pressed: { kind: 'fr', text: 'arbre de probabilité' },
      entryId: 'arbre',
    });
  });

  it('asks about the whole text when no chip is picked', async () => {
    const onAsk = jest.fn();
    const sentence = "Montrer que l'arbre de probabilité";
    await render(
      <AskProvider exerciseId="x" onAsk={onAsk}>
        <RichView rich={{ fr: sentence }} />
      </AskProvider>,
    );
    await longPress('ask-fr');
    await fireEvent.press(screen.getByTestId('ask-option-own'));
    expect(onAsk).toHaveBeenCalledWith({
      kind: 'own',
      pressed: { kind: 'fr', text: sentence },
      entryId: null,
    });
  });

  it('is no long press when the finger moves (a scroll) or lifts early', async () => {
    await render(
      <AskProvider exerciseId="x" onAsk={() => {}}>
        <RichView rich={{ math: 'p(A)' }} />
      </AskProvider>,
    );
    const el = screen.getByTestId('ask-math');
    await fireEvent(el, 'touchStart', touch(10, 10));
    await fireEvent(el, 'touchMove', touch(40, 10));
    await act(async () => {
      jest.advanceTimersByTime(ASK_LONG_PRESS_MS * 2);
    });
    expect(screen.queryByTestId('ask-menu')).toBeNull();
    await fireEvent(el, 'touchStart', touch());
    await fireEvent(el, 'touchEnd', touch());
    await act(async () => {
      jest.advanceTimersByTime(ASK_LONG_PRESS_MS * 2);
    });
    expect(screen.queryByTestId('ask-menu')).toBeNull();
  });

  it('leaves the tap of a button around the formula to the button', async () => {
    const onPress = jest.fn();
    await render(
      <AskProvider exerciseId="x" onAsk={() => {}}>
        <Pressable onPress={onPress} testID="card">
          <RichView rich={{ math: 'p(A)' }} />
        </Pressable>
      </AskProvider>,
    );
    await fireEvent.press(screen.getByTestId('ask-math'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ask-menu')).toBeNull();
  });

  it('gives screen readers a long-press action, and closes on the dimmed screen', async () => {
    await render(
      <AskProvider exerciseId="x" onAsk={() => {}}>
        <RichView rich={{ math: 'p(A)' }} />
      </AskProvider>,
    );
    const el = screen.getByTestId('ask-math');
    expect(el.props.accessibilityActions).toEqual([
      { name: 'longpress', label: 'نسأل الأستاذ' },
    ]);
    await fireEvent(el, 'accessibilityAction', {
      nativeEvent: { actionName: 'longpress' },
    });
    expect(screen.getByTestId('ask-menu')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ask-menu-scrim'));
    expect(screen.queryByTestId('ask-menu')).toBeNull();
  });
});
