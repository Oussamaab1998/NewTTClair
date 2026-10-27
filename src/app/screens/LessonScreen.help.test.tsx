import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import i18n from '../../i18n';
import { setDevTools } from '../devFlags';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { LessonScreen } from './LessonScreen';

let log: EventLog;

async function renderLesson(helpLayout: 'chips' | 'choice' = 'chips') {
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart="1b"
        clock={fixedClock()}
        llm={null}
        helpLayout={helpLayout}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}

const tap = (id: string) => fireEvent.press(screen.getAllByTestId(id).at(-1)!);
const lastOf = (t: string) =>
  log
    .all()
    .filter(e => e.t === t)
    .at(-1);

afterEach(() => setDevTools(false));

const openMenu = () =>
  fireEvent.press(screen.getAllByTestId(/^card-menu-/).at(-1)!);

describe('help chips under the active question (2026-10-22)', () => {
  /**
   * s3 "exactement une" (a known mistake with a repair offer), offer
   * declined, a second wrong answer ("les deux": the rules open the deep
   * dive), then back to s3: the chips show there.
   */
  async function declineThenWrongAgain() {
    await renderLesson();
    await tap('option-one');
    await tap('card-repair-no');
    await tap('option-two');
    await openMenu();
    await tap('back-to-question');
  }

  it('hidden on a fresh card, while the repair offer is open, and after it is declined', async () => {
    await renderLesson();
    expect(screen.queryByTestId('help-chips')).toBeNull();
    await tap('option-one');
    expect(screen.getAllByTestId('card-repair-open').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('help-chips')).toBeNull();
    await tap('card-repair-no');
    // Declined: the chips wait for the next wrong / "not sure" (they stay in "⋯").
    expect(screen.queryByTestId('help-chips')).toBeNull();
    await openMenu();
    expect(
      screen.getAllByTestId(/^request-(change-method|simpler)$/).length,
    ).toBeGreaterThan(0);
  });

  it('shown after the next wrong answer on the step (the card shown again keeps the hold)', async () => {
    await declineThenWrongAgain();
    expect(screen.getByTestId('help-chips')).toBeTruthy();
    const shown = log
      .all()
      .filter(e => e.t === 'component_event' && e.component === 'HelpChips');
    expect(shown).toMatchObject([
      { name: 'shown', payload: { reason: 'wrong' } },
    ]);
  });

  it('a chip tap: request {via: chip, attempt} and the reason line', async () => {
    await declineThenWrongAgain();
    const id = screen.queryAllByTestId('help-chip-change').length
      ? 'help-chip-change'
      : 'help-chip-simpler';
    await tap(id);
    expect(lastOf('request')).toMatchObject({ via: 'chip', attempt: 3 });
    const reasons = Object.values(
      i18n.t('lesson.helpReason', { returnObjects: true }) as Record<
        string,
        string
      >,
    );
    expect(reasons.some(r => screen.queryAllByText(r).length > 0)).toBe(true);
  });

  it('the "⋯" entries stay, and log via: menu', async () => {
    await renderLesson();
    await tap('option-one');
    await tap('card-repair-no');
    await openMenu();
    await tap(
      screen.queryAllByTestId('request-change-method').length
        ? 'request-change-method'
        : 'request-simpler',
    );
    expect(lastOf('request')).toMatchObject({ via: 'menu' });
  });
});

describe('layout B: «ما نعرفش» opens a small choice', () => {
  it('opens without a "not sure" event; the plain «ما نعرفش برك» keeps it; no chips row', async () => {
    await renderLesson('choice');
    await tap('option-one');
    const before = log.all().filter(e => e.t === 'not_sure').length;
    await tap('not-sure');
    expect(screen.getByTestId('help-choice')).toBeTruthy();
    expect(screen.queryByTestId('help-chips')).toBeNull();
    expect(log.all().filter(e => e.t === 'not_sure').length).toBe(before);
    await tap('help-choice-not-sure');
    expect(log.all().filter(e => e.t === 'not_sure').length).toBe(before + 1);
  });

  it('a choice tap logs request {via: choice}', async () => {
    await renderLesson('choice');
    await tap('not-sure');
    const id = screen.queryAllByTestId('help-choice-change').length
      ? 'help-choice-change'
      : 'help-choice-simpler';
    await tap(id);
    expect(lastOf('request')).toMatchObject({ via: 'choice' });
  });
});

describe('usage line (dev tools)', () => {
  it('counts the chip and the offer', async () => {
    setDevTools(true);
    await renderLesson();
    await tap('option-one');
    await tap('card-repair-no');
    await tap('option-two');
    await openMenu();
    await tap('back-to-question');
    await tap('help-chip-simpler');
    expect(screen.getByTestId('help-usage')).toHaveTextContent(
      /chip change 0 \/ easier 1 .* offer yes 0 \/ no 1 .* shown wrong 1/,
    );
  });
});
