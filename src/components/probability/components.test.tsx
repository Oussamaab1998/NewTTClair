import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import type { Experiment } from '../../engine/calls';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { probe } from '../../perf/probe';
import {
  ComponentHost,
  VIEWS,
  type ComponentHostProps,
} from '../ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentResult,
  ComponentSpec,
} from '../contract';
import { REGISTRY } from '../registry';
import { lawRows, moments } from './logic';

const experiment: Experiment = {
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
const ZERO_PAIRS = ['a-b', 'a-c', 'b-c', 'b-d', 'b-e', 'c-d', 'c-e'];

async function host(
  spec: ComponentSpec,
  extra: Partial<ComponentHostProps> = {},
) {
  const events: ComponentEvent[] = [];
  const results: ComponentResult[] = [];
  const errors: unknown[][] = [];
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="t1"
      mode="interactive"
      experiment={experiment}
      onEvent={e => events.push(e)}
      onResult={r => results.push(r)}
      onError={(...a) => errors.push(a)}
      {...extra}
    />,
  );
  const names = () => events.map(e => e.name);
  return { events, results, errors, names };
}
const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
async function typeKeys(prefix: string, raw: string) {
  for (const key of raw) {
    await tap(`${prefix}-key-${key}`);
  }
  await tap(`${prefix}-check`);
}

describe('ComponentHost', () => {
  it('maps exactly the registered names to views', () => {
    expect(Object.keys(VIEWS).sort()).toEqual(Object.keys(REGISTRY).sort());
  });
  it('falls back and reports unknown components and invalid props', async () => {
    // A contract name with no registered view yet.
    const a = await host({ component: 'BinomialExplorer', props: {} });
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
    expect(a.errors[0]?.slice(0, 2)).toEqual([
      'BinomialExplorer',
      'unknown_component',
    ]);

    const b = await host({ component: 'Urn', props: { k: 9 } });
    expect(b.errors[0]?.slice(0, 2)).toEqual(['Urn', 'invalid_props']);
  });
  it('catches a render error inside a view', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const original = VIEWS.Urn;
    VIEWS.Urn = () => {
      throw new Error('boom');
    };
    try {
      const r = await host({ component: 'Urn', props: {} });
      expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
      expect(r.errors[0]).toEqual(['Urn', 'runtime_error', 'boom']);
    } finally {
      VIEWS.Urn = original!;
      spy.mockRestore();
    }
  });
});

describe('Urn', () => {
  it('draws two balls by tapping and shows the product', async () => {
    const r = await host({
      component: 'Urn',
      props: { mode: 'select', valueFn: 'product' },
    });
    expect(screen.getByText('0′')).toBeOnTheScreen();
    await tap('urn-ball-a');
    await tap('urn-ball-e');
    expect(screen.getByTestId('urn-readout')).toHaveTextContent(
      '{−1 ; 2}   (−1) × 2 = −2',
    );
    expect(r.names()).toEqual([
      'ball_toggled',
      'ball_toggled',
      'selection_complete',
    ]);
    expect(r.events[2]!.payload).toEqual({
      ballIds: ['a', 'e'],
      outcomeId: 'a-e',
      value: -2,
    });
    expect(r.events[2]).toMatchObject({ component: 'Urn', instanceId: 't1' });
  });
  it('emits nothing in display mode', async () => {
    const r = await host({ component: 'Urn', props: {} });
    await tap('urn-ball-a');
    expect(r.events).toEqual([]);
  });
});

describe('OutcomeSpace', () => {
  it('lists the 10 draws with their product and explains a tapped one', async () => {
    const r = await host({
      component: 'OutcomeSpace',
      props: { valueFn: 'product', colorBy: 'value' },
    });
    expect(screen.getByTestId('outcome-count')).toHaveTextContent('10');
    expect(screen.getAllByTestId(/^outcome-[a-e]-[a-e]$/)).toHaveLength(10);
    await tap('outcome-b-c');
    expect(screen.getByTestId('outcome-readout')).toHaveTextContent(
      '{0 ; 0′}   0 × 0 = 0',
    );
    await tap('legend-0');
    expect(r.events.map(e => [e.name, e.payload])).toEqual([
      ['outcome_tapped', { outcomeId: 'b-c', value: 0 }],
      ['legend_toggled', { value: 0, on: true }],
    ]);
  });
});

describe('EventPicker', () => {
  const spec: ComponentSpec = {
    component: 'EventPicker',
    props: { valueFn: 'product', event: X0 },
  };

  it('diagnoses a selection that forgets {0 ; 0′}, then accepts the full event', async () => {
    const r = await host(spec);
    for (const id of ZERO_PAIRS.filter(x => x !== 'b-c')) {
      await tap(`pick-${id}`);
    }
    await tap('pick-a-d'); // product −1: extra
    await tap('picker-check');

    const submitted = r.events.find(e => e.name === 'submitted')!;
    expect(submitted.payload).toEqual({
      selected: ['a-b', 'a-c', 'a-d', 'b-d', 'b-e', 'c-d', 'c-e'],
      correct: ZERO_PAIRS,
      missed: ['b-c'],
      extra: ['a-d'],
      fraction: [7, 10],
      isCorrect: false,
      attempt: 1,
      misconceptionHints: [],
    });
    expect(r.results[0]).toMatchObject({ correct: false });
    expect(screen.getByTestId('pick-a-d-mark-extra')).toBeOnTheScreen();
    expect(screen.getByTestId('picker-missed')).toHaveTextContent('1');
    // The missing draw is not shown (no answer before the hint ladder).
    expect(screen.queryByTestId('pick-b-c-mark-solution')).toBeNull();

    await tap('pick-a-d');
    await tap('pick-b-c');
    await tap('picker-check');
    expect(r.results[1]).toEqual({
      correct: true,
      details: {
        selected: ZERO_PAIRS,
        correct: ZERO_PAIRS,
        missed: [],
        extra: [],
        fraction: [7, 10],
      },
      misconceptionHints: [],
    });
    expect(screen.getByTestId('picker-fraction')).toHaveTextContent('7/10');
    expect(screen.getByTestId('picker-correct')).toBeOnTheScreen();
    expect(screen.queryByTestId('picker-check')).toBeNull();
  });

  it('names the forgotten duplicate pair as a misconception hint', async () => {
    const r = await host(spec);
    for (const id of ZERO_PAIRS.filter(x => x !== 'b-c')) {
      await tap(`pick-${id}`);
    }
    await tap('picker-check');
    expect(r.results[0]!.misconceptionHints).toEqual([
      'misses_duplicate_value_pair',
    ]);
  });

  it('replays a recorded selection without emitting, and shows the solution when asked', async () => {
    const r = await host(spec, {
      mode: 'replay',
      snapshot: {
        selected: ['a-b'],
        attempts: 1,
        done: false,
        lastExtra: [],
        lastMissed: 6,
      },
      showSolution: true,
    });
    await tap('pick-a-d');
    expect(r.events).toEqual([]);
    expect(screen.getByTestId('pick-a-b-mark-correct')).toBeOnTheScreen();
    expect(screen.getByTestId('pick-b-c-mark-solution')).toBeOnTheScreen();
    expect(screen.queryByTestId('picker-check')).toBeNull();
  });

  it('exposes its state through getStateSnapshot()', async () => {
    const ref = createRef<ComponentHandle>();
    await host(spec, { handleRef: ref });
    await tap('pick-b-c');
    expect(ref.current?.getStateSnapshot()).toEqual({
      selected: ['b-c'],
      attempts: 0,
      done: false,
      lastExtra: [],
      lastMissed: 0,
    });
  });

  it('re-renders only the tapped chip (not the other nine)', async () => {
    await host(spec);
    const before = probe.renders('OutcomeChip');
    await tap('pick-b-c');
    expect(probe.renders('OutcomeChip') - before).toBe(1);
  });
});

describe('ComplementView', () => {
  it('reveals p(B) = 1 − 3/10 = 7/10 from the complement', async () => {
    const r = await host({
      component: 'ComplementView',
      props: {
        event: { id: 'any_value', args: { value: 0 } },
        labels: { event: 'B', complement: '\\bar{B}' },
      },
    });
    expect(screen.getByTestId('complement-value-complement')).toHaveTextContent(
      '3/10',
    );
    expect(screen.getByTestId('complement-value-event')).toHaveTextContent('?');
    await tap('complement-side-event');
    expect(screen.getByTestId('complement-value-event')).toHaveTextContent(
      '7/10',
    );
    await tap('complement-toggle');
    expect(screen.getAllByTestId(/^complement-complement-/)).toHaveLength(3);
    expect(r.events.map(e => [e.name, e.payload])).toEqual([
      ['fraction_revealed', { side: 'event', fraction: [7, 10] }],
      ['complement_toggled', { showing: true }],
    ]);
  });
});

describe('LawBuilder', () => {
  it('fills the law with the keypad, flags a sum that is not 1, then accepts the fix', async () => {
    const r = await host({
      component: 'LawBuilder',
      props: { valueFn: 'product' },
    });
    expect(screen.getByTestId('law-active')).toHaveTextContent('p(X = −2) = ?');
    await typeKeys('law-keypad', '1/10');
    await typeKeys('law-keypad', '0,1');
    await typeKeys('law-keypad', '6/10'); // wrong p(X = 0)
    await typeKeys('law-keypad', '1/10');

    expect(screen.getByTestId('law-sum')).toHaveTextContent('∑ p = 9/10');
    expect(screen.getByTestId('law-sum-not-one')).toBeOnTheScreen();
    expect(r.results[0]).toMatchObject({
      correct: false,
      misconceptionHints: ['law_sum_not_one'],
      details: { sum: [9, 10], wrongCells: [0], correctCells: [-2, -1, 2] },
    });
    // The wrong cell becomes active again.
    expect(screen.getByTestId('law-active')).toHaveTextContent('p(X = 0) = ?');
    await typeKeys('law-keypad', '7/10');
    expect(screen.getByTestId('law-sum-ok')).toBeOnTheScreen();
    expect(r.results[1]).toMatchObject({
      correct: true,
      details: { sum: [1, 1] },
    });
    expect(
      r.events
        .filter(e => e.name === 'cell_filled')
        .map(e => e.payload.correct),
    ).toEqual([true, true, false, true, true]);
    expect(
      r.events.filter(e => e.name === 'sum_checked').map(e => e.payload),
    ).toEqual([
      { sum: [9, 10], ok: false },
      { sum: [1, 1], ok: true },
    ]);
  });

  it('logs invalid input without filling the cell', async () => {
    const r = await host({
      component: 'LawBuilder',
      props: { valueFn: 'product' },
    });
    await typeKeys('law-keypad', '1/');
    expect(r.names()).toEqual(['invalid_input']);
    expect(screen.getByTestId('law-cell--2-text')).toHaveTextContent('?');
  });

  it('assigns draws to values by tapping (assign_outcomes)', async () => {
    const r = await host({
      component: 'LawBuilder',
      props: { valueFn: 'product', mode: 'assign_outcomes' },
    });
    await tap('assign-a-d');
    await tap('assign-col-2');
    expect(screen.getByTestId('assign-wrong')).toBeOnTheScreen();
    await tap('assign-col--1');
    expect(screen.getByTestId('assign-col--1-p')).toHaveTextContent('1/10');
    expect(r.events.map(e => e.payload)).toEqual([
      { outcomeId: 'a-d', value: 2, correct: false },
      { outcomeId: 'a-d', value: -1, correct: true },
    ]);
  });

  it('shows the engine law in readonly mode', async () => {
    await host({
      component: 'LawBuilder',
      props: { valueFn: 'product', mode: 'readonly' },
    });
    expect(screen.getByTestId('law-cell-0-text')).toHaveTextContent('7/10');
    expect(screen.getByTestId('law-sum-ok')).toBeOnTheScreen();
  });
});

describe('LawChart', () => {
  it('reveals E(X), E(X²) and V(X) step by step', async () => {
    const r = await host({
      component: 'LawChart',
      props: { valueFn: 'product', reveal: ['E', 'E2', 'V'] },
    });
    await tap('chart-reveal-E');
    await tap('chart-reveal-E2');
    await tap('chart-reveal-V');
    expect(r.events.map(e => e.payload)).toEqual([
      { step: 'E', value: [-1, 10] },
      { step: 'E2', value: [9, 10] },
      { step: 'V', value: [89, 100] },
    ]);
    expect(screen.getByTestId('chart-step-V')).toBeOnTheScreen();
    expect(screen.queryByTestId('chart-reveal-V')).toBeNull();
  });
  it('builds formulas the native renderer can draw', () => {
    const m = moments(
      lawRows({ balls: experiment.urn, draw: 'simultaneous', k: 2 }, 'product'),
    );
    for (const v of Object.values(m)) {
      expect(() => parseLatexSubset(`${v.name} = ${v.expanded}`)).not.toThrow();
    }
  });
});
