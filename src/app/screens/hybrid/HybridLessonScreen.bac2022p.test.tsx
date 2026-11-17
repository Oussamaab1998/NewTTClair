/**
 * The lesson board on the probability-tree exercise (bac2022p-sc-ex2): the
 * hybrid board opens for each of its four questions (trip with the printed
 * tree, then the step card with the live tree), and question 1 is played to
 * the end with the worksheet keys and tiles, every act answered at once and
 * for free. Expected values come from the engine.
 */
import '../../../i18n';

import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import React from 'react';

import { fractionToPlain } from '../../../engine/format';
import { frac } from '../../../engine/rational';
import { solveTwoEventTree } from '../../../engine/tree';
import { loadRecord } from '../../../hybrid/records';
import { createDoneRecord } from '../../../state/doneParts';
import { memoryStore, type KeyValueStore } from '../../../storage/kv';
import { CATALOG } from '../../exercises';
import { HybridLessonScreen } from './HybridLessonScreen';
import { hasConductorFrames } from './useHybridSession';

const ID = 'bac2022p-sc-ex2';
const entry = CATALOG.find(e => e.id === ID)!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const T = solveTwoEventTree({
  pA: frac(2, 3),
  pFgA: frac(1, 4),
  pF: frac(5, 12),
});

const last = (id: string | RegExp) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(last(id));
/** The string an SVG text draws. */
const drawn = (node: { props: Record<string, unknown> }): string =>
  (node.props.children as { props: { children: string } }).props.children;
/** Worksheet keys: ÷ opens a denominator, → and = leave it. */
const KEY: Record<string, string> = {
  '×': '*',
  '÷': 'div',
  '→': 'right',
  '(': 'group',
  ')': 'close',
};
async function keys(text: string) {
  for (const ch of text) {
    await tap(`worksheet-key-${KEY[ch] ?? ch}`);
  }
}
async function write(text: string) {
  await keys(text);
  await tap('worksheet-submit');
}
/** Taps the number tile that holds this value. */
async function tile(value: string) {
  const t = screen
    .getAllByTestId(/^worksheet-tile-/)
    .find(x => x.props.accessibilityLabel === value);
  expect(t).toBeDefined();
  await fireEvent.press(t!);
}

async function renderQ(
  questionId: string,
  store: KeyValueStore = memoryStore(),
) {
  const doneRecord = createDoneRecord(memoryStore());
  const onNext = jest.fn();
  const view = await render(
    <HybridLessonScreen
      loaded={loaded!}
      raw={entry.raw}
      questionId={questionId}
      onBack={() => {}}
      onNext={onNext}
      store={store}
      doneRecord={doneRecord}
    />,
  );
  return { store, doneRecord, onNext, view };
}

describe(`${ID}: the hybrid board opens for every question`, () => {
  it.each(['t1', 't2', 't3', 't4'])(
    '%s: its method frames lead the board',
    q => {
      expect(hasConductorFrames(loaded!, entry.raw, q)).toBe(true);
    },
  );

  it.each(['t1', 't2', 't3', 't4'])(
    '%s: the trip shows the printed tree, «نبداو» opens the step card with the live tree',
    async q => {
      await renderQ(q);
      const trip = within(screen.getByTestId('trip-screen'));
      expect(trip.getByTestId(`trip-q-${q}-current`)).toBeOnTheScreen();
      // As printed on the exam: two numbers, the other branches empty.
      const printed = within(trip.getByTestId('trip-figure'));
      expect(drawn(printed.getByTestId('tree-num-a'))).toBe(String(T.a[0]));
      expect(drawn(printed.getByTestId('tree-den-a'))).toBe(String(T.a[1]));
      expect(printed.queryByTestId(/^tree-unknown-/)).toBeNull();
      await tap('trip-start');
      expect(screen.queryByTestId('trip-screen')).toBeNull();
      expect(screen.getByTestId('step-card')).toBeOnTheScreen();
      const live = within(screen.getByTestId('step-figure'));
      // What he has not found is a "?", and the step's branch is marked.
      expect(live.getAllByTestId(/^tree-unknown-/).length).toBeGreaterThan(0);
      expect(live.getAllByTestId(/^tree-mark-/).length).toBeGreaterThan(0);
      // The old lesson's strip stays removed; the map is in «الطريق».
      expect(screen.queryByTestId('hybrid-map')).toBeNull();
    },
  );
});

describe(`${ID}: question 1 on the instant path`, () => {
  it('plays to the end with no AI: trip, lines, pick, recipe, the two similar questions', async () => {
    const { store, doneRecord, onNext } = await renderQ('t1');
    await tap('trip-start');

    // The path whose two branches are printed: both come from their tiles.
    const figure = () => within(screen.getByTestId('step-figure'));
    expect(figure().getByTestId('tree-mark-a')).toBeOnTheScreen();
    expect(figure().getByTestId('tree-mark-a.f')).toBeOnTheScreen();
    // «اللي لقيناه» holds no calculation of the write-up before he writes it.
    await tap('board-tabs-found');
    expect(screen.queryByTestId(/^skeleton-math-/)).toBeNull();
    await tap('board-close');
    await tile(fractionToPlain(T.a));
    await keys('×');
    await tile(fractionToPlain(T.f_given_a));
    await write(`=${T.a_and_f[0]}÷${T.a_and_f[1]}`);
    expect(last('note-credit')).toBeOnTheScreen();
    await tap('board-tabs-found');
    expect(screen.getByTestId('skeleton-math-k1')).toBeOnTheScreen();
    expect(screen.queryByTestId('skeleton-math-k2')).toBeNull();
    await tap('board-close');

    // The pick: the event comes by two paths.
    await tap('pick-card-k_sum');
    expect(screen.getByTestId('exchange-pick_ok')).toBeOnTheScreen();

    // The value the statement prints, alone: not his result yet.
    await write(`${T.na_and_f[0]}÷${T.na_and_f[1]}`);
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:line_note $0.0000',
    );
    // The calculation: the total minus the known path.
    await tile(fractionToPlain(T.f));
    await keys('-');
    await write(
      `${T.a_and_f[0]}÷${T.a_and_f[1]}=${T.na_and_f[0]}÷${T.na_and_f[1]}`,
    );
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:credit $0.0000',
    );

    // His recipe, then the two similar questions, each with its own tree.
    for (const id of ['rq_path', 'rq_split', 'rq_rest', 'rq_check']) {
      await tap(`plan-card-${id}`);
    }
    await tap('plan-confirm');
    expect(screen.getByTestId('exchange-recipe')).toBeOnTheScreen();
    expect(screen.queryByTestId('hybrid-dont-know')).toBeNull();
    expect(drawn(figure().getByTestId('tree-num-a'))).toBe('4');
    await write('4÷5→×3÷8=3÷10');
    await write('2÷5→-3÷10=1÷10');
    await tap('similar-done');
    expect(screen.getByTestId('exchange-similar_review')).toBeOnTheScreen();
    // The twist prints the other side of the tree.
    expect(drawn(figure().getByTestId('tree-num-na'))).toBe('1');
    await write('1÷8→×4÷5=1÷10');
    await write('2÷5→-1÷10=3÷10');
    await tap('similar-done');

    expect(screen.getByTestId('hybrid-ended')).toBeOnTheScreen();
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:similar_review $0.0000',
    );
    expect(Object.keys(doneRecord.all())).toEqual([`${ID}/t1`]);
    expect(loadRecord(store, ID, 't1')).toMatchObject({
      done: true,
      values: {
        a_and_f: fractionToPlain(T.a_and_f),
        na_and_f: fractionToPlain(T.na_and_f),
      },
    });
    await tap('hybrid-next-question');
    expect(onNext).toHaveBeenCalledWith('t2');
  });

  it('question 2 opened after it: the trip shows the result he carries', async () => {
    const { store } = await renderQ('t1');
    await tap('trip-start');
    await tile(fractionToPlain(T.a));
    await keys('×');
    await tile(fractionToPlain(T.f_given_a));
    await write(`=${T.a_and_f[0]}÷${T.a_and_f[1]}`);
    await tap('pick-card-k_sum');
    await tile(fractionToPlain(T.f));
    await keys('-');
    await write(
      `${T.a_and_f[0]}÷${T.a_and_f[1]}=${T.na_and_f[0]}÷${T.na_and_f[1]}`,
    );
    await renderQ('t2', store);
    const trip = within(last('trip-screen'));
    expect(trip.getByTestId('trip-q-t2-current')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-changed')).toBeOnTheScreen();
    await tap('trip-start');
    // The first step of question 2: the lower first branch is asked on the tree.
    const live = within(last('step-figure'));
    expect(live.getByTestId('tree-mark-na')).toBeOnTheScreen();
  });
});
