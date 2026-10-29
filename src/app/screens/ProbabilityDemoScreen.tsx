import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ComponentHost } from '../../components/ComponentHost';
import type {
  ComponentEvent,
  ComponentResult,
  ComponentSpec,
  JsonObject,
} from '../../components/contract';
import { ActionButton } from '../../components/probability/ui';
import { VariableTablePropsSchema } from '../../components/probability2/schemas';
import { allPatterns } from '../../components/probability2/slots';
import { tableModel } from '../../components/probability2/table';
import type { Experiment } from '../../engine/calls';
import { probe } from '../../perf/probe';
import { theme } from '../../theme';
import type * as DevOnly from '../dev';

// Demo-only sample data (Exercise 2 urn); specs list only the props they change.
const EXPERIMENT: Experiment = {
  urn: [
    { id: 'a', value: -1 },
    { id: 'b', value: 0 },
    { id: 'c', value: 0 },
    { id: 'd', value: 1 },
    { id: 'e', value: 2 },
  ],
  draw: 'simultaneous',
  k: 2,
};
const X0 = { id: 'value_eq', args: { value: 0 } };
/** The red / black exercise urn (docs/exercises/EX_URN_RN.md): 4 red, 6 black, 3 drawn. */
const RED_BLACK = {
  balls: [
    ...['r1', 'r2', 'r3', 'r4'].map(id => ({ id, value: 1, color: 'red' })),
    ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(id => ({
      id,
      value: 0,
      color: 'black',
    })),
  ],
  draw: 'simultaneous',
  k: 3,
};
const B = { id: 'any_value', args: { value: 0 } };

/** probability2 demo urns: r red (value 1) and n black (value 0) balls. */
const balls = (r: number, n: number) => [
  ...Array.from({ length: r }, (_, i) => ({ id: `r${i + 1}`, value: 1, color: 'red' })),
  ...Array.from({ length: n }, (_, i) => ({ id: `n${i + 1}`, value: 0, color: 'black' })),
];
const pick = (b: ReturnType<typeof balls>, size: number) => ({ balls: b, size });
/** SlotsPattern demo: n ball labels N1, N2, ... (the exercise's black balls; a letter F would be read as the F of a slot). */
const letters = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, label: `N${i + 1}` }));
/** A recorded SlotsPattern state (what the replay copy shows). */
const slotsState = (n: number, k: number, over: JsonObject): JsonObject => ({
  marks: Array.from({ length: n }, () => false),
  lists: {},
  k,
  fixed: null,
  level: 0,
  help: null,
  message: 'none',
  dup: null,
  flipped: false,
  confirmed: [],
  revealed: false,
  explored: null,
  ...over,
});

/** A recorded SpreadSlider state (what the replay copy shows). */
const spreadState = (over: JsonObject): JsonObject => ({
  index: 0,
  visited: [],
  answer: null,
  correct: false,
  unlocked: false,
  explored: null,
  ...over,
});
/** A recorded RepeatedRuns state. */
const runsState = (over: JsonObject): JsonObject => ({
  shaded: [],
  stage: 0,
  done: false,
  message: 'none',
  explored: null,
  ...over,
});

/** A recorded VariableTable state. */
const tableState = (assign: JsonObject, over: JsonObject): JsonObject => ({
  assign,
  pen: null,
  presses: {},
  last: null,
  explored: null,
  ...over,
});
/** The right value of every outcome of a VariableTable (what the escape shows). */
const tableRight = (props: JsonObject): JsonObject =>
  Object.fromEntries(
    tableModel(VariableTablePropsSchema.parse(props)).items.map((it, i) => [String(i), it.value]),
  );
/** A recorded BinomialExplorer state. */
const binomState = (over: JsonObject): JsonObject => ({
  n: 5,
  pIndex: 2,
  taps: [],
  selected: null,
  mean: false,
  variance: false,
  explored: null,
  ...over,
});

/** A recorded EventAreaModel state. */
const areaState = (over: JsonObject): JsonObject => ({
  selected: [],
  overlay: null,
  tried: [],
  explored: null,
  ...over,
});

export interface DemoCase {
  title: string;
  /** A registered component; or `key` + `render` for a non-registry view (editor). */
  spec?: ComponentSpec;
  key?: string;
  render?: () => React.ReactNode;
  /** A replay of a recorded state next to the live one. */
  replay?: { snapshot?: JsonObject; showSolution?: boolean };
  /** Intentional: shows the fallback; its component_error is expected. */
  expectError?: boolean;
}

/** Debug builds only; `__DEV__` is false in release, so Metro drops the require. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('../dev') as typeof DevOnly)
  : null;

const CASES: DemoCase[] = [
  {
    title: 'Urn (select)',
    spec: { component: 'Urn', props: { mode: 'select', valueFn: 'product' } },
    replay: { snapshot: { selected: ['b', 'c'] } },
  },
  {
    title: 'OutcomeSpace (colorBy value)',
    spec: {
      component: 'OutcomeSpace',
      props: { valueFn: 'product', colorBy: 'value' },
    },
  },
  {
    title: 'OutcomeSpace (colorBy event)',
    spec: { component: 'OutcomeSpace', props: { colorBy: 'event', event: B } },
  },
  {
    title: 'EventPicker (X = 0, live)',
    spec: {
      component: 'EventPicker',
      props: { valueFn: 'product', event: X0, reveal: 'live' },
    },
    replay: {
      snapshot: {
        selected: ['a-b', 'a-c', 'b-d', 'b-e', 'c-d', 'c-e'],
        attempts: 1,
        done: false,
        lastExtra: [],
        lastMissed: 1,
      },
      showSolution: true,
    },
  },
  {
    title: 'ComplementView (B from not B)',
    spec: {
      component: 'ComplementView',
      props: { event: B, labels: { event: 'B', complement: '\\bar{B}' } },
    },
  },
  {
    title: 'LawBuilder (fill_probabilities)',
    spec: { component: 'LawBuilder', props: { valueFn: 'product' } },
    replay: { showSolution: true },
  },
  {
    title: 'LawBuilder (assign_outcomes)',
    spec: {
      component: 'LawBuilder',
      props: { valueFn: 'product', mode: 'assign_outcomes' },
    },
  },
  {
    title: 'LawChart (E, E2, V)',
    spec: {
      component: 'LawChart',
      props: { valueFn: 'product', reveal: ['E', 'E2', 'V'] },
    },
  },
  {
    // Not a bug: proves invalid props render a fallback and log component_error.
    title: 'fallback test (intentional: k = 9 > 5 balls)',
    spec: { component: 'Urn', props: { k: 9 } },
    expectError: true,
  },
  {
    // Red / black exercise urn: 120 draws, shown because display mode lists none (E4).
    title: 'Urn (4 red, 6 black, display)',
    spec: { component: 'Urn', props: { ...RED_BLACK, mode: 'display' } },
  },
  {
    title: 'LawChart (number of reds, checked law, E3)',
    spec: {
      component: 'LawChart',
      props: {
        ...RED_BLACK,
        law: {
          of: { id: 'count_value', args: { value: 1 } },
          rows: [
            { value: 0, p: [1, 6] },
            { value: 1, p: [1, 2] },
            { value: 2, p: [3, 10] },
            { value: 3, p: [1, 30] },
          ],
        },
      },
    },
  },
  // probability2 (docs/COMPONENTS_PROBABILITY_V2.md). Appended after the cases
  // above so every existing `-devComponent X#n` keeps its index.
  {
    title: 'GroupBoxes (twin of step s4: 5 balls, 3 drawn, 10 boxes)',
    spec: { component: 'GroupBoxes', props: { balls: balls(2, 3), k: 3 } },
    replay: {
      snapshot: { expanded: 'r1-r2-n1', slice: null, sample: 0, explored: 'done' },
    },
  },
  {
    title: 'GroupBoxes (hard case: the real urn, 120 boxes, one at a time)',
    spec: { component: 'GroupBoxes', props: { balls: balls(4, 6), k: 3 } },
  },
  {
    title: 'GroupBoxes (slices by the number of reds: 20, 60, 36, 4)',
    spec: {
      component: 'GroupBoxes',
      props: { balls: balls(4, 6), k: 3, groupBy: { property: { value: 1 } } },
    },
    replay: {
      snapshot: { expanded: null, slice: 1, sample: 0, explored: 'done' },
    },
  },
  {
    title: 'GroupBoxes (other twin: 4 balls, 4 boxes; 24 / 3 = 8 is the slip)',
    spec: { component: 'GroupBoxes', props: { balls: balls(2, 2), k: 3 } },
  },
  {
    title: 'GroupBoxes (other parameters: 6 balls, 4 drawn, 24 orderings a box)',
    spec: { component: 'GroupBoxes', props: { balls: balls(3, 3), k: 4 } },
  },
  {
    title: 'ChoiceProduct (twin of step s6: 1 of 3 reds AND 2 of 4 blacks)',
    spec: { component: 'ChoiceProduct', props: { stages: [pick(balls(3, 0), 1), pick(balls(0, 4), 2)] } },
    replay: { snapshot: { picks: [1, 3], mode: 'and', explored: 'done' } },
  },
  {
    title: 'ChoiceProduct (hard case: 1 of 4 reds AND 2 of 6 blacks, 60 cells)',
    spec: { component: 'ChoiceProduct', props: { stages: [pick(balls(4, 0), 1), pick(balls(0, 6), 2)] } },
  },
  {
    title: 'ChoiceProduct (the sum picture: OR)',
    spec: {
      component: 'ChoiceProduct',
      props: { stages: [pick(balls(3, 0), 1), pick(balls(0, 4), 2)], mode: 'or' },
    },
  },
  {
    title: 'ChoiceProduct (other parameters: 3 starters, 4 mains)',
    spec: {
      component: 'ChoiceProduct',
      props: {
        stages: [
          { labels: ['soup', 'salad', 'egg'], size: 1 },
          { labels: ['fish', 'beef', 'rice', 'pie'], size: 1 },
        ],
      },
    },
  },
  {
    title: 'ChoiceProduct (other parameters: 2 of 6 girls AND 1 of 3 boys)',
    spec: {
      component: 'ChoiceProduct',
      props: {
        stages: [
          { labels: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'], size: 2 },
          { labels: ['b1', 'b2', 'b3'], size: 1 },
        ],
      },
    },
  },
  // Stop 2: SlotsPattern and PartWholeBar (appended after the cases above).
  {
    title: 'SlotsPattern (default: 3 marks in 5 slots, 10 patterns; 3 listed, one repeated)',
    spec: { component: 'SlotsPattern', props: { n: 5, k: 3, mode: 'free' } },
    replay: {
      snapshot: slotsState(5, 3, {
        lists: { '3': ['SSSFF', 'SSFSF', 'SSFFS'] },
        message: 'duplicate',
        dup: 1,
      }),
    },
  },
  {
    title: 'SlotsPattern (hard case: 35 patterns, counts only above a cap of 20)',
    spec: { component: 'SlotsPattern', props: { n: 7, k: 3, mode: 'free', listCap: 20 } },
    replay: {
      snapshot: slotsState(7, 3, {
        lists: { '3': ['SSSFFFF', 'SSFSFFF', 'SSFFSFF', 'SSFFFSF'] },
        message: 'missing',
      }),
    },
  },
  {
    title: 'SlotsPattern (other parameters: guided, 2 marks in 4 slots, the first mark fixed)',
    spec: {
      component: 'SlotsPattern',
      props: { n: 4, k: 2, mode: 'guided', meantToDistinguish: false },
    },
    replay: {
      snapshot: slotsState(4, 2, {
        marks: [false, true, false, true],
        lists: { '2': ['FSSF'] },
        fixed: 1,
      }),
    },
  },
  {
    title: 'SlotsPattern (other parameters: build the Pascal row for 5 slots)',
    spec: { component: 'SlotsPattern', props: { n: 5, k: 0, mode: 'build_pascal' } },
    replay: {
      snapshot: slotsState(5, 1, {
        lists: { '0': ['FFFFF'], '1': allPatterns(5, 1) },
        confirmed: [0, 1],
        explored: 'done',
      }),
    },
  },
  {
    title: 'SlotsPattern (bridge: 2 balls chosen among 6, the complete list read both ways)',
    spec: {
      component: 'SlotsPattern',
      props: { n: 6, k: 2, mode: 'bridge', bridge: { balls: letters(6) } },
    },
    replay: {
      snapshot: slotsState(6, 2, {
        lists: { '2': allPatterns(6, 2) },
        confirmed: [2],
        flipped: true,
        explored: 'done',
      }),
    },
  },
  {
    title: 'PartWholeBar (place a value on a bar of 6; 8 is more than the whole)',
    spec: { component: 'PartWholeBar', props: { whole: '6', mode: 'place', ticks: 6 } },
    replay: { snapshot: { index: 8, explored: 'done' } },
  },
  {
    title: 'PartWholeBar (hard case: a probability bar of 1, ten ticks, 11/10 is above 1)',
    spec: { component: 'PartWholeBar', props: { whole: '1', mode: 'place', ticks: 10 } },
    replay: { snapshot: { index: 11, explored: 'done' } },
  },
  {
    title: 'PartWholeBar (1/6 of 36: place the part)',
    spec: {
      component: 'PartWholeBar',
      props: { whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' },
    },
    replay: { snapshot: { index: 1, explored: 'done' } },
  },
  {
    title: 'PartWholeBar (other parameters: 3/4 of 20, four ticks)',
    spec: {
      component: 'PartWholeBar',
      props: { whole: '20', mode: 'fraction_of_quantity', fraction: '3/4', ticks: 4 },
    },
    replay: { snapshot: { index: 3, explored: 'done' } },
  },
  {
    title: 'PartWholeBar (feedback: 12 of 6, the value a student wrote)',
    spec: { component: 'PartWholeBar', props: { whole: '6', mode: 'feedback', part: '12' } },
    replay: {},
  },
  // Stop 3: SpreadSlider and RepeatedRuns (appended after the cases above).
  {
    title: 'SpreadSlider (default: values 0 and 1, p from 0 to 1 in tenths, the total waits for 3 positions)',
    spec: {
      component: 'SpreadSlider',
      props: {
        family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/10', init: '3/10' } },
        totalLockedUntil: { positions: 3 },
      },
    },
    replay: { snapshot: spreadState({ index: 5, visited: [1, 3, 5], explored: 'done' }) },
  },
  {
    title: 'SpreadSlider (hard case: 21 positions, the checkpoint "0 at both ends, largest at 1/2")',
    spec: {
      component: 'SpreadSlider',
      props: {
        family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/20', init: '1/10' } },
        totalLockedUntil: { positions: 3 },
        checkpoint: { kind: 'zero_at_ends', expressions: ['p', 'p^2', 'p*(1-p)', '1-p'] },
      },
    },
    replay: {
      snapshot: spreadState({
        index: 10,
        visited: [2, 10, 16],
        answer: 2,
        correct: true,
        explored: 'done',
      }),
    },
  },
  {
    title: 'SpreadSlider (other parameters: three laws on 1, 2, 3 with the same mean 2)',
    spec: {
      component: 'SpreadSlider',
      props: {
        values: [1, 2, 3],
        family: {
          kind: 'scenarios',
          sameMean: true,
          scenarios: [
            { id: 'A', probabilities: ['1/3', '1/3', '1/3'] },
            { id: 'B', probabilities: ['1/2', '0', '1/2'] },
            { id: 'C', probabilities: ['0', '1', '0'] },
          ],
        },
        totalLockedUntil: { positions: 3 },
      },
    },
    replay: { snapshot: spreadState({ index: 1, visited: [0, 1, 2], explored: 'done' }) },
  },
  {
    title: 'SpreadSlider (other parameters: the law of Exercise 2, values -2, -1, 0, 2, looked at value by value)',
    spec: {
      component: 'SpreadSlider',
      props: {
        values: [-2, -1, 0, 2],
        family: { kind: 'fixed', probabilities: ['1/6', '1/2', '3/10', '1/30'] },
        totalLockedUntil: { positions: 4 },
      },
    },
    replay: { snapshot: spreadState({ index: 3, visited: [0, 1, 2, 3], explored: 'done' }) },
  },
  {
    title: 'SpreadSlider (the checkpoint "which p gives the larger spread?")',
    spec: {
      component: 'SpreadSlider',
      props: {
        family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/10', init: '1/10' } },
        totalLockedUntil: { positions: 3 },
        checkpoint: { kind: 'larger_spread', options: ['1/10', '3/10', '1/2'] },
      },
    },
    replay: {
      snapshot: spreadState({
        index: 5,
        visited: [2, 4, 5],
        answer: 2,
        correct: true,
        explored: 'done',
      }),
    },
  },
  {
    title: 'RepeatedRuns (default: shade 1/6 of 36 runs)',
    spec: {
      component: 'RepeatedRuns',
      props: { N: 36, mode: 'fraction_of_total', stages: [{ p: '1/6' }], interaction: 'shade' },
    },
    replay: {
      snapshot: runsState({ shaded: [0, 1, 2, 3, 4, 5], done: true, explored: 'done' }),
    },
  },
  {
    title: 'RepeatedRuns (36 runs, 1/6, then 1/6 of those: 36, 6, 1)',
    spec: {
      component: 'RepeatedRuns',
      props: { N: 36, mode: 'two_stage', stages: [{ p: '1/6' }, { p: '1/6' }] },
    },
    replay: { snapshot: runsState({ stage: 2, explored: 'done' }) },
  },
  {
    title: 'RepeatedRuns (hard case: 60 runs, 1/5 then 1/3: 60, 12, 4)',
    spec: {
      component: 'RepeatedRuns',
      props: { N: 60, mode: 'two_stage', stages: [{ p: '1/5' }, { p: '1/3' }], cols: 10 },
    },
    replay: { snapshot: runsState({ stage: 2, explored: 'done' }) },
  },
  {
    title: 'RepeatedRuns (other parameters: a fair die over 60 runs, the tally and its average)',
    spec: {
      component: 'RepeatedRuns',
      props: {
        N: 60,
        mode: 'tally',
        tally: {
          values: [1, 2, 3, 4, 5, 6],
          probabilities: ['1/6', '1/6', '1/6', '1/6', '1/6', '1/6'],
        },
      },
    },
    replay: { snapshot: runsState({ stage: 2, explored: 'done' }) },
  },
  {
    title: 'RepeatedRuns (other parameters: 24 runs, 1/4 of them)',
    spec: {
      component: 'RepeatedRuns',
      props: { N: 24, mode: 'fraction_of_total', stages: [{ p: '1/4' }] },
    },
    replay: { snapshot: runsState({ stage: 1, explored: 'done' }) },
  },
  // Stop 4: VariableTable and BinomialExplorer (appended after the cases above).
  {
    title: 'VariableTable (default: 4 trials, the counts 1, 8, 4, 2, 1 add up to 16 but are not symmetric)',
    spec: { component: 'VariableTable', props: { outcomes: { kind: 'trials', n: 4 } } },
    replay: {
      snapshot: tableState(
        Object.fromEntries(
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4].map((v, i) => [String(i), v]),
        ),
        {
          pen: 2,
          last: { check: 'symmetry', passed: false, detail: 'not_symmetric' },
        },
      ),
    },
  },
  {
    title: 'VariableTable (hard case: 5 trials, 32 outcomes, 20 placed, one asked for)',
    spec: { component: 'VariableTable', props: { outcomes: { kind: 'trials', n: 5 } } },
    replay: {
      snapshot: tableState(
        Object.fromEntries(
          Object.entries(tableRight({ outcomes: { kind: 'trials', n: 5 } }))
            .slice(0, 20),
        ),
        { pen: 3, presses: { all_used: 2 }, last: { check: 'all_used', passed: false, detail: 'missing', named: 20 } },
      ),
    },
  },
  {
    title: 'VariableTable (other parameters: 3 trials with P(S) = 1/3: 8/27, 12/27, 6/27, 1/27)',
    spec: {
      component: 'VariableTable',
      props: { outcomes: { kind: 'trials', n: 3 }, weights: { p: '1/3' } },
    },
    replay: {
      snapshot: tableState(tableRight({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '1/3' } }), {
        explored: 'done',
      }),
    },
  },
  {
    title: 'VariableTable (other parameters: an urn of 2 red and 2 black, 2 drawn)',
    spec: {
      component: 'VariableTable',
      props: { outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 } },
    },
    replay: {
      snapshot: tableState(tableRight({ outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 } }), {
        explored: 'done',
      }),
    },
  },
  {
    title: 'VariableTable (the 60 element rule: an urn of 3 red and 4 black, 3 drawn: 35 draws)',
    spec: {
      component: 'VariableTable',
      props: { outcomes: { kind: 'urn', reds: 3, blacks: 4, k: 3 } },
    },
    replay: { snapshot: tableState({}, {}) },
  },
  {
    title: 'BinomialExplorer (default: up to 5 trials, tappable bars, p from 1/10 to 9/10)',
    spec: {
      component: 'BinomialExplorer',
      props: {
        n: { min: 2, max: 5, init: 5 },
        p: { min: '1/10', max: '9/10', step: '1/10', init: '3/10' },
      },
    },
    replay: {
      snapshot: binomState({ taps: [2, 3], selected: 3, mean: true, variance: true, explored: 'done' }),
    },
  },
  {
    title: 'BinomialExplorer (hard case: the Exercise 2 range, up to 15 trials with p = 7/10, a stepper)',
    spec: {
      component: 'BinomialExplorer',
      props: { n: { min: 1, max: 15, init: 8 }, p: { fixed: '7/10' } },
    },
    replay: {
      snapshot: binomState({
        n: 8,
        pIndex: 0,
        taps: [5, 6],
        selected: 6,
        mean: true,
        variance: true,
        explored: 'done',
      }),
    },
  },
  {
    title: 'BinomialExplorer (other parameters: p = 1/6, 4 to 10 trials)',
    spec: {
      component: 'BinomialExplorer',
      props: { n: { min: 4, max: 10, init: 8 }, p: { fixed: '1/6' } },
    },
    replay: {
      snapshot: binomState({ n: 8, pIndex: 0, taps: [0, 1], selected: 1, explored: 'done' }),
    },
  },
  {
    title: 'BinomialExplorer (other parameters: 4 trials, p = 1/2, with the patterns of the bar)',
    spec: {
      component: 'BinomialExplorer',
      props: { n: { min: 4, max: 4, init: 4 }, p: { fixed: '1/2' }, linkSlots: true },
    },
    replay: {
      snapshot: binomState({ n: 4, pIndex: 0, taps: [1, 2], selected: 2, explored: 'done' }),
    },
  },
  {
    title: 'BinomialExplorer (other parameters: 3 to 6 trials, p from 1/10 to 9/10, starting at 1/2)',
    spec: {
      component: 'BinomialExplorer',
      props: {
        n: { min: 3, max: 6, init: 6 },
        p: { min: '1/10', max: '9/10', step: '1/10', init: '1/2' },
      },
    },
    replay: {
      snapshot: binomState({
        n: 6,
        pIndex: 4,
        taps: [2, 3],
        selected: 3,
        mean: true,
        variance: true,
        explored: 'done',
      }),
    },
  },
  // Stop 5: EventAreaModel and UrnTemplate (appended after the cases above).
  {
    title: 'EventAreaModel (default: the 4R6N urn by the number of reds, A = exactly one red, B = no red)',
    spec: {
      component: 'EventAreaModel',
      props: {
        source: { kind: 'urn', reds: 4, blacks: 6, k: 3 },
        events: [
          { id: 'A', label: 'A', slices: ['s1'] },
          { id: 'B', label: 'B', slices: ['s0'] },
        ],
        overlays: ['complement', 'intersection', 'union', 'conditional'],
      },
    },
    replay: {
      snapshot: areaState({
        selected: ['A', 'B'],
        overlay: 'complement',
        tried: ['complement', 'union'],
        explored: 'done',
      }),
    },
  },
  {
    title: 'EventAreaModel (hard case: the slice of 4 draws of 120, narrower than a touch target, as probabilities)',
    spec: {
      component: 'EventAreaModel',
      props: {
        source: { kind: 'urn', reds: 4, blacks: 6, k: 3 },
        events: [
          { id: 'A', label: 'A', slices: ['s1'] },
          { id: 'C', label: 'C', slices: ['s3'] },
        ],
        overlays: ['complement', 'union'],
        labels: 'probabilities',
      },
    },
    replay: {
      snapshot: areaState({
        selected: ['C'],
        overlay: 'complement',
        tried: ['complement'],
        explored: 'done',
      }),
    },
  },
  {
    title: 'EventAreaModel (other parameters: a fair die, A even, B at least 5; the conditional)',
    spec: {
      component: 'EventAreaModel',
      props: {
        source: {
          kind: 'authored',
          slices: [1, 2, 3, 4, 5, 6].map(i => ({ id: `d${i}`, label: String(i), count: 1 })),
        },
        events: [
          { id: 'A', label: 'A', slices: ['d2', 'd4', 'd6'] },
          { id: 'B', label: 'B', slices: ['d5', 'd6'] },
        ],
        overlays: ['complement', 'intersection', 'union', 'conditional'],
      },
    },
    replay: {
      snapshot: areaState({
        selected: ['A', 'B'],
        overlay: 'conditional',
        tried: ['intersection', 'conditional'],
        explored: 'done',
      }),
    },
  },
  {
    title: 'EventAreaModel (other parameters: 2 red and 2 black, 2 drawn; the complement of A is not B)',
    spec: {
      component: 'EventAreaModel',
      props: {
        source: { kind: 'urn', reds: 2, blacks: 2, k: 2 },
        events: [
          { id: 'A', label: 'A', slices: ['s1'] },
          { id: 'B', label: 'B', slices: ['s0'] },
        ],
        overlays: ['complement'],
      },
    },
    replay: {
      snapshot: areaState({
        selected: ['A', 'B'],
        overlay: 'complement',
        tried: ['complement'],
        explored: 'done',
      }),
    },
  },
  {
    title: 'EventAreaModel (authored slices of 5, 3 and 2: the intersection of two events)',
    spec: {
      component: 'EventAreaModel',
      props: {
        source: {
          kind: 'authored',
          slices: [
            { id: 'x', label: 'x', count: 5 },
            { id: 'y', label: 'y', count: 3 },
            { id: 'z', label: 'z', count: 2 },
          ],
        },
        events: [
          { id: 'A', label: 'A', slices: ['x', 'y'] },
          { id: 'B', label: 'B', slices: ['y', 'z'] },
        ],
        overlays: ['intersection', 'union'],
        labels: 'probabilities',
      },
    },
    replay: {
      snapshot: areaState({
        selected: ['A', 'B'],
        overlay: 'intersection',
        tried: ['intersection', 'union'],
        explored: 'done',
      }),
    },
  },
  {
    title: 'UrnTemplate (default: a fresh urn, exactly j reds, for the step "P(exactly one red) = 1/2")',
    spec: {
      component: 'UrnTemplate',
      props: {
        templateId: 'urn_exactly_j',
        seed: 3,
        parent: { answer: '1/2', wrong: ['5/6', '1/12', '19/120', '2/5', '54/125'] },
      },
    },
    replay: { snapshot: { bump: 1, explored: 'done' } },
  },
  {
    title: 'UrnTemplate (hard case: the next seed, another urn)',
    spec: {
      component: 'UrnTemplate',
      props: {
        templateId: 'urn_exactly_j',
        seed: 7,
        parent: { answer: '1/2', wrong: ['5/6', '1/12', '19/120', '2/5', '54/125'] },
      },
    },
    replay: { snapshot: { bump: 2, explored: 'done' } },
  },
  {
    title: 'UrnTemplate (other parameters: the term P(X = j) of n trials)',
    spec: { component: 'UrnTemplate', props: { templateId: 'repeated_trials_table', seed: 5 } },
    replay: { snapshot: { bump: 1, explored: 'done' } },
  },
  {
    title: 'UrnTemplate (other parameters: n trials, another seed)',
    spec: { component: 'UrnTemplate', props: { templateId: 'repeated_trials_table', seed: 11 } },
    replay: { snapshot: { bump: 0, explored: 'done' } },
  },
  {
    title: 'UrnTemplate (no parent: any fresh urn, seed 1)',
    spec: { component: 'UrnTemplate', props: { templateId: 'urn_exactly_j' } },
    replay: { snapshot: { bump: 3, explored: 'done' } },
  },
];

/**
 * Storybook-like screen for the probability components: each one live
 * (interactive) and, when useful, as a replay of a recorded state. The perf
 * panel shows React commit times per component, to read on a real device.
 */
export const PROBABILITY_DEMO_COMPONENTS: readonly string[] = [
  ...new Set(CASES.map(c => c.spec?.component ?? c.key ?? '')),
];

export function ProbabilityDemoScreen() {
  return (
    <ComponentDemo
      cases={CASES}
      experiment={EXPERIMENT}
      testID="probability-demo"
    />
  );
}

/** Live + replay rendering of demo cases, with the event log and perf panel. */
export function ComponentDemo({
  cases,
  experiment,
  testID,
}: {
  cases: readonly DemoCase[];
  experiment?: Experiment;
  testID: string;
}) {
  // `-devComponent X`: only X's cases; `X#n`: only X's n-th case (from 0).
  // All cases if nothing matches.
  const [only, nth] = (devOnly?.devComponentAtLaunch() ?? '').split('#');
  const matching = cases.filter(c => (c.spec?.component ?? c.key) === only);
  const picked =
    nth !== undefined && matching[Number(nth)]
      ? [matching[Number(nth)]!]
      : matching;
  const shownCases = picked.length > 0 ? picked : cases;
  const [log, setLog] = useState<string[]>([]);
  const push = useCallback(
    (line: string) => setLog(l => [line, ...l].slice(0, 8)),
    [],
  );
  const onEvent = useCallback(
    (e: ComponentEvent) =>
      push(`${e.component}.${e.name} ${JSON.stringify(e.payload)}`),
    [push],
  );
  const onResult = useCallback(
    (r: ComponentResult) =>
      push(
        `result correct=${String(r.correct)} ${(
          r.misconceptionHints ?? []
        ).join(',')}`,
      ),
    [push],
  );
  const onError = useCallback(
    (component: string, reason: string) =>
      push(`component_error ${component} ${reason}`),
    [push],
  );
  const onExpectedError = useCallback(
    (component: string, reason: string) =>
      push(`component_error ${component} ${reason} (expected: fallback test)`),
    [push],
  );

  // `-devWidth 360`: a narrow phone for screenshots (debug builds only; the
  // simulators are 390 and 402 pt). Absent: the screen is exactly as before.
  const clamp = devOnly?.devWidthAtLaunch() ?? null;
  const body = (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentOffset={{ x: 0, y: devOnly?.devScrollAtLaunch() ?? 0 }}
      testID={testID}
    >
      <PerfPanel />
      <Section title="log">
        {log.map((l, i) => (
          <Text key={i} style={styles.log} numberOfLines={3}>
            {l}
          </Text>
        ))}
      </Section>
      {shownCases.map((c, i) => (
        <Section key={i} title={c.title}>
          {c.render?.()}
          {c.spec && (
            <ComponentHost
              spec={c.spec}
              defaultInstanceId={`demo-${i}`}
              mode="interactive"
              {...(experiment && { experiment })}
              onEvent={onEvent}
              onResult={onResult}
              onError={c.expectError ? onExpectedError : onError}
            />
          )}
          {c.spec && c.replay && (
            <>
              <Text style={styles.sub}>{REPLAY_LABEL}</Text>
              <ComponentHost
                spec={c.spec}
                defaultInstanceId={`demo-${i}-replay`}
                mode="replay"
                {...(experiment && { experiment })}
                onEvent={onEvent}
                onError={onError}
                {...(c.replay.snapshot && { snapshot: c.replay.snapshot })}
                {...(c.replay.showSolution && { showSolution: true })}
              />
            </>
          )}
        </Section>
      ))}
    </ScrollView>
  );
  return clamp === null ? (
    body
  ) : (
    <View style={[styles.clamp, { width: clamp }]} testID={`${testID}-clamp`}>
      {body}
    </View>
  );
}

const REPLAY_LABEL = 'replay';

const statLine = (r: ReturnType<typeof probe.stats>[number]) =>
  `${r.id}: n=${r.n} median=${r.medianMs.toFixed(1)} ms max=${r.maxMs.toFixed(
    1,
  )} ms`;
const heightLine = () =>
  Object.entries(probe.heights())
    .map(([name, h]) => `${name} height=${h} pt`)
    .join(' ');
const renderLine = () =>
  ['OutcomeChip', 'FeedItemView', 'LessonFeed']
    .map(name => `${name}=${probe.renders(name)}`)
    .join(' ');

function PerfPanel() {
  const { t } = useTranslation();
  useSyncExternalStore(
    useCallback(cb => probe.subscribe(cb), []),
    () => probe.version,
  );
  const rows = probe.stats();
  return (
    <Section title={t('proba.perf.title')}>
      {rows.map(r => (
        <Text key={r.id} style={styles.log} testID={`perf-${r.id}`}>
          {statLine(r)}
        </Text>
      ))}
      <Text style={styles.log}>{renderLine()}</Text>
      <Text style={styles.log} testID="perf-heights">
        {heightLine()}
      </Text>
      <ActionButton
        label={t('proba.perf.reset')}
        onPress={() => probe.reset()}
        testID="perf-reset"
      />
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clamp: { flex: 1, alignSelf: 'center' },
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  content: {
    padding: theme.space.lg,
    gap: theme.space.lg,
    paddingBottom: theme.space.scrollEnd,
  },
  section: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    gap: theme.space.xs,
  },
  title: {
    fontSize: theme.font.size.footnote,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.textSecondary,
  },
  sub: {
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    marginTop: theme.space.xs,
  },
  log: {
    fontSize: theme.font.size.tiny,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
