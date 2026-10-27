import React from 'react';

import type { ComponentSpec, JsonObject } from '../../components/contract';
import { LINES_CASES } from './linesDemo';
import { ComponentDemo, type DemoCase } from './ProbabilityDemoScreen';

// Demo-only sample props (Exercise 4 shapes); not lesson content, unreviewed.
const STEPS_PROPS: JsonObject = {
  steps: [
    { math: 'f(-x)=\\frac{e^{-x}}{1+e^{-2x}}' },
    {
      math: 'f(-x)=\\frac{e^{-x}\\times e^{2x}}{\\left(1+e^{-2x}\\right)e^{2x}}',
      why: { fr: 'On multiplie en haut et en bas par le même nombre.' },
    },
    { math: 'f(-x)=\\frac{e^{x}}{e^{2x}+1}=f(x)' },
  ],
};
const STEPS: ComponentSpec = { component: 'StepThrough', props: STEPS_PROPS };

/** 2 red and 2 black balls, two drawn (twin of the red / black exercise). */
const TWIN_2R2N: JsonObject = {
  balls: [
    { id: 'r1', value: 1, color: 'red' },
    { id: 'r2', value: 1, color: 'red' },
    { id: 'n1', value: 0, color: 'black' },
    { id: 'n2', value: 0, color: 'black' },
  ],
  k: 2,
};

const CASES: DemoCase[] = [
  {
    title: 'FunctionPlot (f, asymptote, max point)',
    spec: {
      component: 'FunctionPlot',
      props: {
        fn: 'f_ex4',
        domain: [-4, 4],
        markers: [
          { type: 'asymptote', at: 0, showValue: true },
          { type: 'point', at: 0, label: 'max', showValue: true },
        ],
      },
    },
  },
  {
    title: "FunctionPlot (f' by sign, shaded)",
    spec: {
      component: 'FunctionPlot',
      props: {
        fn: 'f_ex4_prime',
        domain: [-3, 3],
        colorBySign: true,
        shade: { from: -1, to: 1 },
      },
    },
  },
  {
    title: 'FunctionPlot (x/(x+1), pole)',
    spec: {
      component: 'FunctionPlot',
      props: {
        fn: 'quot_demo',
        domain: [-3, 2],
        range: [-6, 6],
        markers: [{ type: 'vline', at: -1, showValue: true }],
      },
    },
  },
  {
    title: 'PointOnCurve (f, compare g)',
    spec: {
      component: 'PointOnCurve',
      props: { fn: 'f_ex4', compareFn: 'sigmoid_demo' },
    },
    replay: { snapshot: { x: 2, comparing: true } },
  },
  {
    title: 'FoldSymmetry (f, compare g)',
    spec: {
      component: 'FoldSymmetry',
      props: { fn: 'f_ex4', compareFn: 'sigmoid_demo' },
    },
    replay: { snapshot: { k: 0.6, comparing: false } },
  },
  {
    title: 'LimitExplorer (f = e^x / (1 + e^2x))',
    spec: {
      component: 'LimitExplorer',
      props: {
        fn: 'f_ex4',
        numerator: 'f_ex4_num',
        denominator: 'f_ex4_den',
        xMax: 20,
      },
    },
    replay: { snapshot: { x: 15, zoomed: true } },
  },
  {
    title: 'LimitExplorer (e^-x)',
    spec: { component: 'LimitExplorer', props: { fn: 'exp_neg' } },
  },
  {
    title: 'SecantToTangent (f, x0 = -1)',
    spec: { component: 'SecantToTangent', props: { fn: 'f_ex4' } },
    replay: { snapshot: { hIndex: 7 } },
  },
  {
    title: 'SecantToTangent (x/(x+1), x0 = 0)',
    spec: {
      component: 'SecantToTangent',
      props: { fn: 'quot_demo', x0: 0, domain: [-0.8, 3.5], range: [-1, 1] },
    },
  },
  {
    title: 'TangentSlope (f, mini table)',
    spec: {
      component: 'TangentSlope',
      props: { fn: 'f_ex4', showTable: true },
    },
    replay: { snapshot: { x: 1.5, visited: [0, 1] } },
  },
  {
    title: 'VariationTableBuilder (task, f)',
    spec: { component: 'VariationTableBuilder', props: { fn: 'f_ex4' } },
    replay: { showSolution: true },
  },
  {
    title: 'PredictReveal (reveal: StepThrough)',
    spec: {
      component: 'PredictReveal',
      props: {
        prompt: { fr: 'f(\u2212x) comparé à f(x) ?' },
        options: [
          { id: 'same', label: { math: 'f(-x)=f(x)' } },
          { id: 'opposite', label: { math: 'f(-x)=-f(x)' } },
          { id: 'other', label: { fr: 'autre' } },
        ],
        reveal: { component: 'StepThrough', props: STEPS_PROPS },
        insight: { fr: 'Le calcul le confirme ligne par ligne.' },
      },
    },
    replay: { snapshot: { predicted: 'same', revealed: true } },
  },
  {
    title: 'CompareTwo (twins)',
    spec: {
      component: 'CompareTwo',
      props: {
        leftLabel: { fr: 'cas A' },
        left: {
          component: 'NumericTwin',
          props: {
            symbol: 'u',
            template: 'u/(u*3)',
            compare: '1/3',
            values: [2, 5],
          },
        },
        rightLabel: { fr: 'cas B' },
        right: {
          component: 'NumericTwin',
          props: {
            symbol: 'u',
            template: 'u/(u*3)',
            compare: '0/3',
            values: [2, 5],
          },
        },
      },
    },
  },
  {
    title: 'ExampleGenerator (quotient_linear)',
    spec: {
      component: 'ExampleGenerator',
      props: { templateId: 'quotient_linear' },
    },
    replay: { snapshot: { seed: 5 } },
  },
  {
    title: 'ExampleGenerator (parity_exp)',
    spec: {
      component: 'ExampleGenerator',
      props: { templateId: 'parity_exp' },
    },
  },
  {
    title: 'NumericTwin (cancel leaves 1)',
    spec: {
      component: 'NumericTwin',
      props: {
        symbol: 'u',
        template: 'u/(u*3)',
        compare: '1/3',
        values: [2, 5, 10],
      },
    },
    replay: { snapshot: { value: 5 } },
  },
  {
    title: 'StepThrough',
    spec: STEPS,
    replay: { snapshot: { shown: 3, why: [1] } },
  },
  {
    // The intro of the red / black exercise (docs/exercises/EX_URN_RN.md), on the 2R 2N twin.
    title: 'CompareTwo (2R 2N: at once vs one by one, put back)',
    spec: {
      component: 'CompareTwo',
      props: {
        leftLabel: { ar: [{ ar: 'نجبدو الزوز مع بعض' }] },
        left: {
          component: 'OutcomeSpace',
          props: { ...TWIN_2R2N, draw: 'simultaneous' },
        },
        rightLabel: { ar: [{ ar: 'وحدة بوحدة، ونرجّعو الكورة' }] },
        right: {
          component: 'OutcomeSpace',
          props: { ...TWIN_2R2N, draw: 'ordered_with_replacement' },
        },
      },
    },
  },
];

/** Storybook-like screen for the analysis components and generic primitives. */
export function AnalysisDemoScreen() {
  return (
    <ComponentDemo cases={[...LINES_CASES, ...CASES]} testID="analysis-demo" />
  );
}
