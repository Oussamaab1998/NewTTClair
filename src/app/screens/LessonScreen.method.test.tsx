/**
 * The live question 1 of bac2022c-sc-ex2 (exsc2-0.4.0, playable slice): the
 * opening card, the strip, the plan cards, the read tap, the total frame
 * with the line pad, its notes, the readback, the sheet.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { LessonScreen } from './LessonScreen';

let log: EventLog;
const PART = 'bac2022c-sc-ex2/1';

async function renderQ1() {
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart={PART}
        clock={fixedClock()}
        llm={null}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}
const last = (id: string) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(last(id));
async function type(line: string) {
  for (const ch of line) {
    await tap(`line-input-key-${ch}`);
  }
}
async function toTotalFrame() {
  await renderQ1();
  for (const id of ['c_total', 'c_fav', 'c_ratio']) {
    await tap(`plan-card-${id}`);
  }
  await tap('plan-confirm');
  // « Une épreuve consiste à tirer simultanément trois boules de l'urne. » : word 5
  await tap('read-token-5');
}
const answers = () => log.all().filter(e => e.t === 'answer');

describe('question 1, the playable slice', () => {
  it('opens with the opening card, the strip (now, next) and the plan cards', async () => {
    await renderQ1();
    expect(screen.getByTestId('method-strip')).toBeOnTheScreen();
    expect(screen.getByTestId('strip-now')).toBeOnTheScreen();
    expect(screen.getByTestId('strip-next')).toBeOnTheScreen();
    expect(screen.getByTestId('frame-header')).toBeOnTheScreen();
    for (const id of ['c_total', 'c_fav', 'c_ratio']) {
      expect(screen.getByTestId(`plan-card-${id}`)).toBeOnTheScreen();
    }
    // no picture and no keypad before the plan
    expect(screen.queryByTestId('line-input')).toBeNull();
  });

  it('a plan in a good order gives the reason for the order; then the word to tap', async () => {
    await renderQ1();
    for (const id of ['c_fav', 'c_total', 'c_ratio']) {
      await tap(`plan-card-${id}`);
    }
    await tap('plan-confirm');
    expect(last('note-reason-order')).toBeOnTheScreen();
    expect(screen.getByTestId('statement-tap')).toBeOnTheScreen();
    expect(answers().at(-1)).toMatchObject({ kind: 'method', correct: true });
  });

  it('dividing first names the card and what it needs, and the plan stays', async () => {
    await renderQ1();
    for (const id of ['c_ratio', 'c_total', 'c_fav']) {
      await tap(`plan-card-${id}`);
    }
    await tap('plan-confirm');
    expect(last('note-plan-violation')).toBeOnTheScreen();
    expect(answers().at(-1)).toMatchObject({ correct: false });
  });

  it('the right word opens the line pad (no letter keys, no C key)', async () => {
    await toTotalFrame();
    expect(last('line-input')).toBeOnTheScreen();
    expect(screen.queryByTestId('line-input-key-C')).not.toBeNull(); // C is "clear"
    expect(screen.queryByTestId('line-input-key-x')).toBeNull();
    expect(screen.queryByTestId('line-input-key-(')).not.toBeNull();
  });

  it('the right total is credited by name and recapped, with the line he typed', async () => {
    await toTotalFrame();
    await type('10×9×8÷(3×2×1)=120');
    await tap('line-input-check');
    expect(last('note-credit')).toBeOnTheScreen();
    expect(last('note-recap')).toBeOnTheScreen();
    expect(answers().at(-1)).toMatchObject({ kind: 'method', correct: true });
    // The lesson goes on to the favourable frame (it ended here only in the slice).
    expect(log.all().some(e => e.t === 'part_done')).toBe(false);
    expect(last('frame-header')).toBeOnTheScreen();
  });

  it('a ÷ followed by a product asks which reading he means; the literal one is the slip', async () => {
    await toTotalFrame();
    await type('10×9×8÷3×2×1=480');
    await tap('line-input-check');
    expect(last('line-readback')).toBeOnTheScreen();
    expect(
      answers().filter(e => e.t === 'answer' && e.stepId === 'm1.c_total'),
    ).toHaveLength(0);
    await tap('line-readback-literal');
    expect(answers().at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'mut.bracket_left_to_right',
      inferredBy: 'mutation',
    });
    expect(
      log.all().some(e => e.t === 'component_event' && e.name === 'readback'),
    ).toBe(true);
  });

  it('the grouped reading rewrites the line with his choice and credits it', async () => {
    await toTotalFrame();
    await type('10×9×8÷3×2×1=120');
    await tap('line-input-check');
    await tap('line-readback-grouped');
    expect(answers().at(-1)).toMatchObject({
      correct: true,
      value: { mline: '10×9×8÷(3×2×1)=120', readback: 'grouped' },
    });
  });

  it('the strip opens the route sheet: the steps, now / why / next, and closes again', async () => {
    await renderQ1();
    await tap('method-strip');
    expect(screen.getByTestId('method-sheet')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^method-row-m1\./)).toHaveLength(7);
    expect(screen.getByTestId('method-row-m1.plan-current')).toBeOnTheScreen();
    await tap('method-sheet-close');
    expect(
      log
        .all()
        .some(
          e =>
            e.t === 'component_event' &&
            e.component === 'MethodSheet' &&
            e.name === 'closed',
        ),
    ).toBe(true);
  });
});
