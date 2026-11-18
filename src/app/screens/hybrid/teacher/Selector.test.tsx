import '../../../../i18n';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ASK_LONG_PRESS_MS, RichView } from '../../../../lesson/feed/RichView';
import { MarkedStatement } from '../../../../lesson/feed/MarkedStatement';
import { theme } from '../../../../theme';
import { AskProvider } from './AskProvider';
import { Selector, wordAtPoint } from './Selector';

const FONT = {
  fontSize: theme.font.size.body,
  fontFamily: theme.font.family.ui.regular,
  paper: false,
};
const AR = {
  kind: 'ar' as const,
  runs: [{ ar: 'اكتب الحساب: احتمال الطريق المعلَّم في الشجرة.' }],
};

async function open(
  source: React.ComponentProps<typeof Selector>['source'],
  point: { x: number; y: number } | null = { x: 10, y: 10 },
) {
  const onAsk = jest.fn();
  const onDismiss = jest.fn();
  await render(
    <Selector
      source={source}
      frame={{ x: 16, y: 120, width: 340, height: 60 }}
      point={point}
      font={FONT}
      onAsk={onAsk}
      onDismiss={onDismiss}
    />,
  );
  return { onAsk, onDismiss };
}

describe('the selection layer', () => {
  it('a tap selects one word; «+» and «−» go one word at a time; «اسأل الأستاذ» asks about it', async () => {
    const { onAsk } = await open(AR);
    await fireEvent.press(screen.getByTestId('select-word-4'));
    expect(screen.getByTestId('select-less')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('select-more'));
    expect(screen.getByTestId('select-preview')).toHaveTextContent(
      /«المعلَّم في»/,
    );
    await fireEvent.press(screen.getByTestId('select-less'));
    expect(screen.queryByTestId('select-preview')).toBeNull();
    await fireEvent.press(screen.getByTestId('select-ask'));
    expect(onAsk).toHaveBeenCalledWith({ kind: 'ar', text: 'المعلَّم' });
  });

  it('«الجملة الكاملة»: the sentence (a colon ends one), then the whole block', async () => {
    const { onAsk } = await open(AR);
    await fireEvent.press(screen.getByTestId('select-word-3'));
    await fireEvent.press(screen.getByTestId('select-sentence'));
    expect(screen.getByTestId('select-preview')).toHaveTextContent(
      /«احتمال الطريق المعلَّم في الشجرة»/,
    );
    await fireEvent.press(screen.getByTestId('select-sentence'));
    expect(screen.getByTestId('select-more')).toBeDisabled();
    expect(screen.getByTestId('select-sentence')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('select-ask'));
    expect(onAsk).toHaveBeenCalledWith({
      kind: 'ar',
      text: 'اكتب الحساب: احتمال الطريق المعلَّم في الشجرة',
    });
  });

  it('French words of the paper are asked about as French', async () => {
    const { onAsk } = await open(
      { kind: 'fr', text: 'A et F sont deux évènements tels que' },
      null,
    );
    // No finger (a screen reader): the whole block is selected.
    await fireEvent.press(screen.getByTestId('select-ask'));
    expect(onAsk).toHaveBeenCalledWith({
      kind: 'fr',
      text: 'A et F sont deux évènements tels que',
    });
  });

  it('a formula is selected whole; a part chip narrows it', async () => {
    const { onAsk } = await open({
      kind: 'math',
      latex: 'p(\\overline{A} \\cap F) = \\frac{1}{4}',
    });
    expect(screen.queryByTestId('select-handle-start')).toBeNull();
    expect(screen.getByTestId('select-part-0')).toHaveProp(
      'accessibilityState',
      {
        selected: true,
      },
    );
    // Parts: whole, left side, right side, inside, Ā, F, ∩.
    await fireEvent.press(screen.getByTestId('select-part-4'));
    await fireEvent.press(screen.getByTestId('select-ask'));
    expect(onAsk).toHaveBeenCalledWith({
      kind: 'math',
      text: '\\overline{A}',
    });
  });

  it('a tap outside closes it', async () => {
    const { onDismiss } = await open(AR);
    await fireEvent.press(screen.getByTestId('select-scrim'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('the word under the finger', () => {
  const rects = [
    { x: 300, y: 100, w: 40, h: 30 },
    { x: 240, y: 100, w: 50, h: 30 },
    { x: 300, y: 140, w: 40, h: 30 },
  ];
  it('takes the word on the finger’s line, nearest across', () => {
    expect(wordAtPoint(rects, 250, 110)).toBe(1);
    expect(wordAtPoint(rects, 200, 112)).toBe(1);
    expect(wordAtPoint(rects, 320, 150)).toBe(2);
  });
  it('between lines, the closest one; nothing measured, nothing', () => {
    expect(wordAtPoint(rects, 320, 135)).not.toBeNull();
    expect(wordAtPoint([], 0, 0)).toBeNull();
  });
});

describe('every text of the board can be long-pressed', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('an Arabic paragraph and the paper’s French open the selection', async () => {
    await render(
      <AskProvider exerciseId="x" onAsk={() => {}}>
        <RichView rich={{ ar: [{ ar: 'نحسبو احتمال الطريق' }] }} />
        <MarkedStatement text="Montrer que p est correct" marks={[]} />
      </AskProvider>,
    );
    for (const id of ['ask-ar', 'marked-statement-ask']) {
      await fireEvent(screen.getByTestId(id), 'touchStart', {
        nativeEvent: { pageX: 5, pageY: 5, touches: [{}] },
      });
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          jest.advanceTimersByTime(ASK_LONG_PRESS_MS + 500);
        });
      }
      expect(screen.getByTestId('select-layer')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('select-scrim'));
      expect(screen.queryByTestId('select-layer')).toBeNull();
    }
  });
});
