import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import { ComponentHost, type ComponentHostProps } from '../ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentSpec,
  JsonObject,
} from '../contract';
import { generateExample } from '../../engine/examples';

async function host(
  spec: ComponentSpec,
  extra: Partial<ComponentHostProps> = {},
) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="t1"
      mode="interactive"
      onEvent={e => events.push(e)}
      onError={(...a) => errors.push(a)}
      handleRef={ref}
      {...extra}
    />,
  );
  return { events, errors, ref };
}
const tap = (id: string) => fireEvent.press(screen.getByTestId(id));

const stepsProps: JsonObject = {
  steps: [
    { math: 'f(-x)=\\frac{e^{-x}}{1+e^{-2x}}' },
    {
      math: 'f(-x)=\\frac{e^{x}}{e^{2x}+1}',
      why: { fr: 'on multiplie par e^{2x}' },
    },
  ],
};
const steps: ComponentSpec = { component: 'StepThrough', props: stepsProps };
const stepsJson = { component: 'StepThrough', props: stepsProps };
const predict: ComponentSpec = {
  component: 'PredictReveal',
  props: {
    prompt: { fr: 'f(-1) comparé à f(1) ?' },
    options: [
      { id: 'same', label: { fr: 'égal' } },
      { id: 'other', label: { fr: 'différent' } },
    ],
    reveal: stepsJson,
    insight: { fr: 'insight' },
  },
};

describe('PredictReveal', () => {
  it('logs the prediction, then shows the inner component and the insight', async () => {
    const h = await host(predict);
    expect(screen.queryByTestId('steps-t1:reveal')).toBeNull();
    await tap('predict-option-same');
    expect(h.events.map(e => e.name)).toEqual(['predicted']);
    expect(h.events[0]!.payload).toEqual({ optionId: 'same' });
    expect(screen.getByTestId('steps-t1:reveal')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-insight')).toBeOnTheScreen();
    // A second tap changes nothing (one prediction).
    await tap('predict-option-other');
    expect(h.events).toHaveLength(1);
  });
  it('"I don\'t know, show me" reveals without a prediction', async () => {
    const h = await host(predict);
    await tap('predict-reveal');
    expect(h.events.map(e => [e.name, e.payload])).toEqual([
      ['revealed', { predicted: null }],
    ]);
  });
  it('inner events carry the slot instance id; the snapshot nests the inner state', async () => {
    const h = await host(predict);
    await tap('predict-option-same');
    await tap('steps-next');
    expect(h.events[1]).toMatchObject({
      component: 'StepThrough',
      instanceId: 't1:reveal',
      name: 'step_revealed',
    });
    expect(h.ref.current?.getStateSnapshot()).toEqual({
      predicted: 'same',
      revealed: true,
      inner: { shown: 2, why: [] },
    });
  });
  it('replays a recorded state without emitting events', async () => {
    const h = await host(predict, {
      mode: 'replay',
      snapshot: {
        predicted: 'other',
        revealed: true,
        inner: { shown: 2, why: [1] },
      },
    });
    expect(screen.getByTestId('steps-step-1')).toBeOnTheScreen();
    await tap('predict-option-same');
    expect(h.events).toEqual([]);
  });
  it('an invalid inner spec makes the whole block fall back', async () => {
    const h = await host({
      ...predict,
      props: {
        ...predict.props,
        reveal: { component: 'StepThrough', props: {} },
      },
    });
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
    expect(h.errors[0]?.slice(0, 2)).toEqual([
      'PredictReveal',
      'invalid_props',
    ]);
    expect(String(h.errors[0]?.[2])).toMatch(/^reveal: /);
  });
  it('refuses a task component as the inner spec', async () => {
    const h = await host({
      ...predict,
      props: {
        ...predict.props,
        reveal: {
          component: 'EventPicker',
          props: {
            balls: [
              { id: 'a', value: 1 },
              { id: 'b', value: 2 },
            ],
            draw: 'simultaneous',
            k: 1,
            valueFn: 'sum',
            event: { id: 'value_eq', args: { value: 1 } },
          },
        },
      },
    });
    expect(String(h.errors[0]?.[2])).toMatch(
      /task components cannot be nested/,
    );
  });
});

describe('CompareTwo', () => {
  it('renders both inner components with their own instance ids', async () => {
    const twin = {
      component: 'NumericTwin',
      props: { symbol: 'u', template: 'u/(3u)', values: [2] },
    };
    const h = await host({
      component: 'CompareTwo',
      props: { left: stepsJson, right: twin, leftLabel: { fr: 'A' } },
    });
    expect(screen.getByTestId('steps-t1:left')).toBeOnTheScreen();
    expect(screen.getByTestId('twin-t1:right')).toBeOnTheScreen();
    await tap('twin-value-2');
    expect(h.events[0]).toMatchObject({ instanceId: 't1:right' });
    expect(h.ref.current?.getStateSnapshot()).toEqual({
      left: { shown: 1, why: [] },
      right: { value: 2 },
    });
  });
});

describe('ExampleGenerator', () => {
  it('works with only its required props and moves to the next seed', async () => {
    const h = await host({
      component: 'ExampleGenerator',
      props: { templateId: 'quotient_linear' },
    });
    expect(h.errors).toEqual([]);
    await tap('example-another');
    expect(h.events[0]).toMatchObject({
      name: 'example_generated',
      payload: {
        templateId: 'quotient_linear',
        seed: 2,
        params: generateExample('quotient_linear', 2).params,
      },
    });
    expect(h.ref.current?.getStateSnapshot()).toEqual({ seed: 2 });
  });
  it('readonly cannot generate', async () => {
    const h = await host(
      { component: 'ExampleGenerator', props: { templateId: 'parity_exp' } },
      { mode: 'readonly' },
    );
    await tap('example-another');
    expect(h.events).toEqual([]);
  });
});

describe('NumericTwin', () => {
  it('computes both sides with the chosen value and says if they agree', async () => {
    const h = await host({
      component: 'NumericTwin',
      props: {
        symbol: 'u',
        template: 'u/(u*3)',
        compare: '0/3',
        values: [2, 5],
      },
    });
    expect(screen.queryByTestId('twin-verdict')).toBeNull();
    await tap('twin-value-5');
    expect(h.events[0]!.payload).toMatchObject({
      symbol: 'u',
      value: 5,
      compare: 0,
      equal: false,
    });
    expect(screen.getByTestId('twin-verdict')).toBeOnTheScreen();
  });
});

describe('StepThrough', () => {
  it('reveals one step at a time and opens the reason on demand', async () => {
    const h = await host(steps);
    expect(screen.queryByTestId('steps-step-1')).toBeNull();
    await tap('steps-next');
    await tap('steps-why-1');
    expect(h.events.map(e => [e.name, e.payload])).toEqual([
      ['step_revealed', { index: 1 }],
      ['why_opened', { index: 1 }],
    ]);
    expect(screen.queryByTestId('steps-next')).toBeNull();
  });
  it('readonly shows every step', async () => {
    await host(steps, { mode: 'readonly' });
    expect(screen.getByTestId('steps-step-1')).toBeOnTheScreen();
  });
});
