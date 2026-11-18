/**
 * The lesson board on a probability tree (the small fixture of
 * src/hybrid/conductor/treeFixture.ts): the exercise's figure on the step
 * card, in «التمرين», on the trip and in «اللي لقيناه»; the prepared small
 * example and its card; the figure's numbers as tiles; the acts a debug
 * launch plays.
 */
import '../../../i18n';

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  act as rtlAct,
} from '@testing-library/react-native';
import React from 'react';

import { act, startQuestion } from '../../../hybrid/conductor/conductor';
import {
  TO_FIRST_LINES,
  treeMini,
} from '../../../hybrid/conductor/treeFixture';
import type { FoundQuestion } from '../../../hybrid/board';
import { printedFigure } from '../../../hybrid/figure';
import { loadResume, noExtras, saveResume } from '../../../hybrid/records';
import { roadView } from '../../../hybrid/tour/tour';
import arTN from '../../../i18n/ar-TN.json';
import { createDoneRecord } from '../../../state/doneParts';
import { memoryStore, type KeyValueStore } from '../../../storage/kv';
import type { DevHybridAct } from '../../dev/launch';
import { CATALOG } from '../../exercises';
import { FoundTab } from './board/FoundTab';
import { HybridLessonScreen } from './HybridLessonScreen';
import { TreeCasePanel } from './TreeCasePanel';
import { TripMap } from './trip/TripMap';

const { ctx, loaded, raw } = treeMini();
const WORDS = arTN.hybrid;

const last = (id: string | RegExp) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(last(id));
const flush = () => rtlAct(() => new Promise(r => setTimeout(r, 0)));
/** The string an SVG text draws. */
const drawn = (node: { props: Record<string, unknown> }): string =>
  (node.props.children as { props: { children: string } }).props.children;
/** The worksheet keys of a line (÷ opens a denominator, = leaves it). */
const KEY: Record<string, string> = { '×': '*', '÷': 'div' };
async function write(line: string) {
  for (const ch of line) {
    await tap(`worksheet-key-${KEY[ch] ?? ch}`);
  }
  await tap('worksheet-submit');
}

/** A store where he already passed the plan and the word: he is on the first lines step. */
function storeOnPath(): KeyValueStore {
  const store = memoryStore();
  let s = startQuestion(ctx);
  for (const a of TO_FIRST_LINES) {
    s = act(ctx, s, a).state;
  }
  saveResume(store, ctx, s, noExtras());
  return store;
}

async function renderTree(
  o: { store?: KeyValueStore; devActs?: DevHybridAct[] } = {},
) {
  const store = o.store ?? memoryStore();
  await render(
    <HybridLessonScreen
      loaded={loaded}
      raw={raw}
      questionId="t1"
      onBack={() => {}}
      store={store}
      doneRecord={createDoneRecord(memoryStore())}
      {...(o.devActs && { devActs: o.devActs })}
    />,
  );
  return store;
}

describe('HybridLessonScreen: an exercise with a figure', () => {
  it('shows the tree on the step card: what the statement prints, a "?" where he must find, the step marked', async () => {
    await renderTree();
    // No trip is authored for the fixture: the plan is his first step, the figure is there already.
    const plan = within(screen.getByTestId('step-figure'));
    expect(plan.getByTestId('tree-picture')).toBeOnTheScreen();
    expect(plan.queryByTestId(/^tree-mark-/)).toBeNull();
    for (const id of ['c_af', 'c_split', 'c_naf']) {
      await tap(`plan-card-${id}`);
    }
    await tap('plan-confirm');
    await tap('read-token-1');
    expect(screen.getByTestId('step-header')).toHaveTextContent(
      /نحسبو الطريق الأوّل/,
    );
    const figure = within(screen.getByTestId('step-figure'));
    // Printed branches as printed, the others a "?" with no value.
    expect(drawn(figure.getByTestId('tree-num-a'))).toBe('3');
    expect(drawn(figure.getByTestId('tree-den-a'))).toBe('5');
    expect(figure.getByTestId('tree-unknown-na')).toBeOnTheScreen();
    expect(figure.queryByTestId('tree-num-na')).toBeNull();
    // The path this step is about is marked (a thicker line with an arrowhead).
    expect(figure.getByTestId('tree-mark-a')).toBeOnTheScreen();
    expect(figure.getByTestId('tree-mark-a.f')).toBeOnTheScreen();
    expect(figure.queryByTestId('tree-mark-na')).toBeNull();
    // A picture only: nothing to tap in it.
    expect(figure.queryByTestId(/^tree-leaf-/)).toBeNull();
    // The figure's fractions are tiles, each once, before the statement's own numbers.
    const tiles = screen
      .getAllByTestId(/^worksheet-tile-/)
      .map(x => x.props.accessibilityLabel);
    expect(tiles.slice(0, 3)).toEqual(['3/5', '1/2', '7/10']);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('«التمرين» shows the figure as printed: an empty branch stays empty', async () => {
    await renderTree({ store: storeOnPath() });
    await tap('board-tabs-exercise');
    const sheet = within(screen.getByTestId('exercise-tab'));
    const printed = within(sheet.getByTestId('exercise-figure'));
    expect(drawn(printed.getByTestId('tree-num-a.f'))).toBe('1');
    expect(printed.queryByTestId(/^tree-unknown-/)).toBeNull();
    expect(printed.queryByTestId(/^tree-mark-/)).toBeNull();
    await tap('board-close');
    // «اللي لقيناه» opens with the figure and what he found so far.
    await tap('board-tabs-found');
    const found = within(screen.getByTestId('found-tab'));
    expect(
      within(found.getByTestId('found-figure')).getByTestId('tree-unknown-na'),
    ).toBeOnTheScreen();
  });

  it('the second «ما نعرفش» opens the small example, free; its right line brings him back', async () => {
    const store = await renderTree({ store: storeOnPath() });
    await tap('hybrid-dont-know');
    expect(screen.getByTestId('exchange-hint')).toBeOnTheScreen();
    expect(screen.queryByTestId('tree-case-panel')).toBeNull();
    await tap('hybrid-dont-know');
    expect(screen.getByTestId('exchange-case_open')).toHaveTextContent(
      WORDS.case.treeOpen,
      { exact: false },
    );
    // Answered at once, with no AI call.
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:case_open $0.0000',
    );
    const panel = within(screen.getByTestId('tree-case-panel'));
    expect(panel.getByText(WORDS.case.treeTitle)).toBeOnTheScreen();
    expect(panel.getByText(WORDS.case.treeIntro)).toBeOnTheScreen();
    expect(panel.getByTestId('tree-case-story')).toHaveTextContent(/عشرين/);
    // What each letter stands for: the letter is math, its meaning Arabic, apart.
    expect(panel.getByTestId('tree-case-legend-0')).toHaveTextContent(
      /التلميذ يلعب كورة/,
    );
    expect(panel.getByTestId('tree-case-legend-1')).toBeOnTheScreen();
    // The tree counts people: the root, and the end of every branch.
    const tree = within(panel.getByTestId('case-tree'));
    expect(drawn(tree.getByTestId('tree-root-count'))).toBe('20');
    expect(drawn(tree.getByTestId('tree-text-a.f'))).toBe('2');
    expect(tree.getByTestId('tree-mark-a.f')).toBeOnTheScreen();
    expect(tree.queryByTestId(/^tree-unknown-/)).toBeNull();
    // Nothing is hidden on this example: no line for "everyone in F".
    expect(panel.queryByTestId('tree-case-total')).toBeNull();
    // What is asked, as the exam writes it.
    expect(
      panel.getByTestId('tree-case-asked').props.accessibilityLabel,
    ).toBeTruthy();
    expect(panel.getByText(WORDS.case.treeLines)).toBeOnTheScreen();
    // His page stays open under the card (a small box folds it), with the example's name on it.
    expect(screen.queryByTestId('paper-folded')).toBeNull();
    expect(screen.queryByTestId('case-panel')).toBeNull();
    expect(screen.getByTestId('worksheet-step-now')).toHaveTextContent(
      WORDS.case.treeTitle,
      { exact: false },
    );
    expect(screen.getByTestId('hybrid-dont-know')).toBeEnabled();
    // The question's own figure is still on the card.
    expect(screen.getByTestId('step-figure')).toBeOnTheScreen();

    await write('2÷20');
    expect(screen.getByTestId('exchange-case_done')).toHaveTextContent(
      WORDS.bridge.tree.path,
      { exact: false },
    );
    expect(screen.queryByTestId('tree-case-panel')).toBeNull();
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:case_done $0.0000',
    );
    // Back on the question. His line on the example (a count over a count)
    // is not a model for the question's line: no scaffold. The figure's two
    // fractions come from their tiles, and the line is credited as before.
    expect(screen.queryByTestId(/^worksheet-scaffold-/)).toBeNull();
    await tap('worksheet-tile-0');
    await tap('worksheet-key-*');
    await tap('worksheet-tile-1');
    await write('=3÷10');
    expect(screen.getByTestId('exchange-credit')).toBeOnTheScreen();
    expect(loadResume(store, ctx)?.state.nodeLines.a_and_f).toBe(
      '(3/5)*(1/2)=3/10',
    );
  });

  it('«نرجعو للسؤال» closes the example', async () => {
    await renderTree({ store: storeOnPath() });
    await tap('hybrid-dont-know');
    await tap('hybrid-dont-know');
    await tap('case-back');
    expect(screen.queryByTestId('tree-case-panel')).toBeNull();
    expect(screen.getByTestId('worksheet-step-now')).not.toHaveTextContent(
      WORDS.case.treeTitle,
      { exact: false },
    );
  });

  it('a debug launch plays its acts through the buttons’ path, then opens the sheet', async () => {
    await renderTree({
      store: storeOnPath(),
      devActs: [
        // No trip to start, no example to leave yet: skipped.
        { type: 'start' },
        { type: 'back' },
        { type: 'dontKnow' },
        { type: 'dontKnow' },
        { type: 'line', raw: '8/20' },
        { type: 'sheet', tab: 'found' },
      ],
    });
    await flush();
    await waitFor(() =>
      expect(screen.getByTestId('found-tab')).toBeOnTheScreen(),
    );
    expect(screen.getByTestId('exchange-hint')).toBeOnTheScreen();
    expect(screen.getByTestId('exchange-case_open')).toBeOnTheScreen();
    // The slip on the example got its prepared text at once.
    expect(screen.getByTestId('exchange-case_note')).toHaveTextContent(
      /الفرع الأوّل برك/,
    );
    expect(screen.getByTestId('tree-case-panel')).toBeOnTheScreen();
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:case_note $0.0000',
    );
  });
});

describe('HybridLessonScreen: an exercise without a figure', () => {
  it('draws no figure anywhere (the urn exercise is as before)', async () => {
    const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
    await render(
      <HybridLessonScreen
        loaded={entry.result.ok ? entry.result.loaded : (null as never)}
        raw={entry.raw}
        questionId="1"
        onBack={() => {}}
        store={memoryStore()}
        doneRecord={createDoneRecord(memoryStore())}
      />,
    );
    expect(screen.queryByTestId('trip-figure')).toBeNull();
    await tap('paper-steps');
    expect(screen.getByTestId('step-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('step-figure')).toBeNull();
    await tap('board-tabs-exercise');
    expect(screen.getByTestId('exercise-tab')).toBeOnTheScreen();
    expect(screen.queryByTestId('exercise-figure')).toBeNull();
    await tap('board-close');
    await tap('board-tabs-found');
    expect(screen.getByTestId('found-tab')).toBeOnTheScreen();
    expect(screen.queryByTestId('found-figure')).toBeNull();
  });
});

describe('TreeCasePanel', () => {
  const rest = {
    kind: 'tree',
    template: 'tree_other_path',
    node: 'na_and_f',
    n: 20,
    a: 8,
    af: 2,
    naf: 3,
  } as const;

  it('an example an AI move made shows the tree and the way back only', async () => {
    const onAct = jest.fn();
    await render(
      <TreeCasePanel
        exerciseId="tree-mini"
        questionId="t1"
        caseId="C1"
        spec={rest}
        lines
        disabled={false}
        busy={null}
        onAct={onAct}
      />,
    );
    const panel = within(screen.getByTestId('tree-case-panel'));
    expect(panel.getByText(WORDS.case.treeTitle)).toBeOnTheScreen();
    expect(panel.queryByText(WORDS.case.treeIntro)).toBeNull();
    expect(panel.queryByTestId('tree-case-story')).toBeNull();
    expect(panel.queryByTestId(/^tree-case-legend-/)).toBeNull();
    expect(panel.queryByTestId('tree-case-ask')).toBeNull();
    expect(panel.queryByText(WORDS.case.treeLines)).toBeNull();
    // This shape hides the asked end: a "?" on the tree, and everyone of the
    // second event on a line of their own (the label, then the number alone).
    const tree = within(panel.getByTestId('case-tree'));
    expect(tree.getByTestId('tree-unknown-na.f')).toBeOnTheScreen();
    expect(tree.getByTestId('tree-ask-na.f')).toBeOnTheScreen();
    expect(tree.queryByTestId('tree-text-na.f')).toBeNull();
    expect(panel.getByText(WORDS.case.treeTotal)).toBeOnTheScreen();
    expect(panel.getByTestId('tree-case-total')).toHaveTextContent('5');
    await fireEvent.press(panel.getByTestId('case-back'));
    expect(onAct).toHaveBeenCalledWith({ kind: 'continue' });
  });

  it('is off and shows its spinner while «نرجعو للسؤال» is being answered', async () => {
    await render(
      <TreeCasePanel
        exerciseId="tree-mini"
        questionId="t1"
        caseId="S1"
        spec={{ ...rest, node: 'a_and_f' }}
        lines
        disabled
        busy="back"
        onAct={() => {}}
      />,
    );
    expect(screen.getByTestId('case-back')).toBeDisabled();
    expect(screen.getByTestId('case-back-busy')).toBeOnTheScreen();
    // The prepared example of this id brings its story and what is asked.
    expect(screen.getByTestId('tree-case-story')).toBeOnTheScreen();
    expect(screen.getByTestId('tree-case-asked')).toBeOnTheScreen();
  });
});

describe('the figure on the trip and in the write-up', () => {
  it('the trip shows the printed figure with what we have', async () => {
    const road = roadView(ctx, startQuestion(ctx));
    const view = await render(
      <TripMap
        road={road}
        mode="trip"
        reused={{}}
        questionLabels={{}}
        figure={printedFigure(ctx)}
      />,
    );
    const have = within(screen.getByTestId('trip-have'));
    expect(
      within(have.getByTestId('trip-figure')).getByTestId('tree-num-a'),
    ).toBeOnTheScreen();
    // Without a figure the map is as before (here: nothing to show under «عندنا»).
    await view.rerender(
      <TripMap road={road} mode="trip" reused={{}} questionLabels={{}} />,
    );
    expect(screen.queryByTestId('trip-have')).toBeNull();
    expect(screen.queryByTestId('trip-figure')).toBeNull();
  });

  it('a write-up line with a calculation shows it as math under its words', async () => {
    const q: FoundQuestion = {
      questionId: 't1',
      label: '1',
      current: true,
      done: false,
      writeup: [
        { id: 'k1', parts: [{ text: 'On a :' }] },
        {
          id: 'k2',
          parts: [{ text: 'Donc :' }],
          math: 'p(\\overline{A} \\cap F) = \\frac{7}{10} - \\frac{3}{10} = \\ldots',
        },
      ],
      findings: [],
      fixed: [],
      rules: [],
      card: null,
    };
    await render(<FoundTab found={[q]} />);
    expect(screen.getByTestId('skeleton-k2')).toHaveTextContent('Donc :');
    expect(screen.getByTestId('skeleton-math-k2')).toBeOnTheScreen();
    expect(screen.queryByTestId('skeleton-math-k1')).toBeNull();
    // No figure given: none drawn.
    expect(screen.queryByTestId('found-figure')).toBeNull();
  });
});
