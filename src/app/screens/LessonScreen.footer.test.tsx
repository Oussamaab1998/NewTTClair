import React from 'react';
import { ScrollView } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { fixedClock } from '../../telemetry/log';
import { LessonScreen } from './LessonScreen';

const tap = (id: string) => fireEvent.press(screen.getAllByTestId(id).at(-1)!);
const layout = (id: string, y: number, height: number) =>
  fireEvent(screen.getAllByTestId(id).at(-1)!, 'layout', {
    nativeEvent: { layout: { x: 0, y, width: 360, height } },
  });

/** Approximate feed viewport heights at 360 and 390 pt width (iPhone 16e: 390; the -devWidth 360 clamp). */
const VIEWS = [
  { width: 360, height: 560 },
  { width: 390, height: 600 },
];

/** s3: wrong, offer declined, wrong again (deep dive), back to s3: the chips appear on the new s3 card. */
async function toChips(height: number, dragFirst: boolean) {
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart="1b"
        clock={fixedClock()}
        llm={null}
        helpLayout="chips"
      />
    </GestureHandlerRootView>,
  );
  await layout('lesson-feed', 0, height);
  await tap('option-one');
  await tap('card-repair-no');
  await tap('option-two');
  await fireEvent.press(screen.getAllByTestId(/^card-menu-/).at(-1)!);
  if (dragFirst) {
    // A manual drag after the last new feed item.
    await fireEvent(screen.getByTestId('lesson-feed'), 'scrollBeginDrag');
  }
  await tap('back-to-question');
}

describe('help chips appear: the card footer is scrolled into view (2026-10-22)', () => {
  // The preset's ScrollView mock: one shared jest.fn for every instance.
  const scrollTo = (ScrollView.prototype as unknown as { scrollTo: jest.Mock })
    .scrollTo;

  for (const v of VIEWS) {
    it(`${v.width} pt: scrolls to the card bottom once its layout is known`, async () => {
      await toChips(v.height, false);
      expect(screen.getByTestId('help-chips')).toBeTruthy();
      const card = screen.getAllByTestId(/^feed-item-question/).at(-1)!;
      scrollTo.mockClear();
      await fireEvent(card, 'layout', {
        nativeEvent: { layout: { x: 0, y: 900, height: 420 } },
      });
      expect(scrollTo).toHaveBeenLastCalledWith({
        y: 900 + 420 + 10 - v.height,
        animated: true,
      });
    });
  }

  it('360 pt, a card taller than the view: the scroll stops at the card top (the question stays visible)', async () => {
    await toChips(560, false);
    const card = screen.getAllByTestId(/^feed-item-question/).at(-1)!;
    scrollTo.mockClear();
    await fireEvent(card, 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, height: 700 } },
    });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 900, animated: true });
  });

  it('no footer scroll when the student dragged the feed since the last new item', async () => {
    await toChips(560, true);
    // The return line and the new s3 card are new items: the drag flag resets.
    // Drag again on the new card, then the layout arrives.
    await fireEvent(screen.getByTestId('lesson-feed'), 'scrollBeginDrag');
    const card = screen.getAllByTestId(/^feed-item-question/).at(-1)!;
    scrollTo.mockClear();
    await fireEvent(card, 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, height: 420 } },
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
