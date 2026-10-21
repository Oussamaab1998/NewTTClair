import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import { ComponentHost, type ComponentHostProps } from '../ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentSpec,
} from '../contract';
import { evalFn } from '../../engine/analysis';
import { autoRange, readoutNumber } from './plot';
import { snap } from './Slider';
import { zoomRange } from './LimitExplorer';
import { secantSlope } from './SecantToTangent';

export async function host(
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
export const tap = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('FunctionPlot', () => {
  it('works with only its required prop (default domain, computed range)', async () => {
    const h = await host({ component: 'FunctionPlot', props: { fn: 'f_ex4' } });
    expect(h.errors).toEqual([]);
    expect(screen.getByTestId('plot-canvas-t1')).toBeOnTheScreen();
    expect(h.ref.current?.getStateSnapshot()).toEqual({
      fn: 'f_ex4',
      domain: [-4, 4],
      range: [...autoRange('f_ex4', [-4, 4])],
    });
  });
  it('accepts the engine asymptote y = 0 and refuses a wrong one', async () => {
    const ok = await host({
      component: 'FunctionPlot',
      props: { fn: 'f_ex4', markers: [{ type: 'asymptote', at: 0 }] },
    });
    expect(ok.errors).toEqual([]);
    const bad = await host({
      component: 'FunctionPlot',
      props: { fn: 'f_ex4', markers: [{ type: 'asymptote', at: 1 }] },
    });
    expect(bad.errors[0]?.slice(0, 2)).toEqual([
      'FunctionPlot',
      'invalid_props',
    ]);
    expect(String(bad.errors[0]?.[2])).toMatch(/not a horizontal asymptote/);
  });
  it('refuses a domain beyond the safe range and a point where f is undefined', async () => {
    const far = await host({
      component: 'FunctionPlot',
      props: { fn: 'f_ex4', domain: [0, 400] },
    });
    expect(String(far.errors[0]?.[2])).toMatch(/safe range/);
    const pole = await host({
      component: 'FunctionPlot',
      props: {
        fn: 'quot_demo',
        domain: [-3, 2],
        markers: [{ type: 'point', at: -1 }],
      },
    });
    expect(String(pole.errors[0]?.[2])).toMatch(/undefined here/);
  });
  it('refuses digits in labels: values come from the engine (showValue)', async () => {
    const h = await host({
      component: 'FunctionPlot',
      props: {
        fn: 'f_ex4',
        markers: [{ type: 'point', at: 0, label: '(0 ; 1/2)' }],
      },
    });
    expect(String(h.errors[0]?.[2])).toMatch(/no digits/);
    const ok = await host({
      component: 'FunctionPlot',
      props: {
        fn: 'f_ex4',
        markers: [{ type: 'point', at: 0, label: 'max', showValue: true }],
      },
    });
    expect(ok.errors).toEqual([]);
    // SvgText wraps its string in a TSpan.
    expect(
      screen.getByTestId('plot-marker-label-0').props.children.props.children,
    ).toBe('max (0 ; 1/2)');
  });
  it("colorBySign draws f' as two parts (solid +, dashed -)", async () => {
    await host({
      component: 'FunctionPlot',
      props: { fn: 'f_ex4_prime', colorBySign: true, domain: [-3, 3] },
    });
    expect(screen.getAllByTestId('plot-curve-main-dashed')).toHaveLength(1);
    expect(screen.getAllByTestId('plot-curve-main')).toHaveLength(1);
  });
});

const step = (id: string, actionName: 'increment' | 'decrement') =>
  fireEvent(screen.getByTestId(id), 'accessibilityAction', {
    nativeEvent: { actionName },
  });

describe('Slider snap', () => {
  it('snaps to the grid without float drift and clamps', () => {
    expect(snap(0.30000000000000004, -3, 3, 0.1)).toBe(0.3);
    expect(snap(9, -3, 3, 0.1)).toBe(3);
    expect(snap(1.26, 0, 2, 0.25)).toBe(1.25);
  });
});

describe('PointOnCurve', () => {
  const spec: ComponentSpec = {
    component: 'PointOnCurve',
    props: { fn: 'f_ex4', compareFn: 'sigmoid_demo' },
  };
  it('shows f(x) and f(-x) with the same height for f_ex4', async () => {
    const h = await host(spec);
    expect(h.errors).toEqual([]);
    expect(screen.getByTestId('point-fx')).toHaveTextContent(
      `f(1) = ${readoutNumber(evalFn('f_ex4', 1))}`,
    );
    expect(screen.getByTestId('point-fmx')).toHaveTextContent(
      `f(-1) = ${readoutNumber(evalFn('f_ex4', -1))}`,
    );
    expect(screen.getByTestId('point-verdict')).toHaveTextContent(
      /نفس الارتفاع/,
    );
    // The two points are named by text on the plot, not by color only.
    expect(
      screen.getByTestId('point-label-x').props.children.props.children,
    ).toBe('x');
    expect(
      screen.getByTestId('point-label-minus-x').props.children.props.children,
    ).toBe('−x');
    // Collapsed readouts stay on one line next to the expand icon.
    expect(screen.getByTestId('point-fx').props.numberOfLines).toBe(1);
  });
  it('a slider step logs x_changed with engine values', async () => {
    const h = await host(spec);
    await step('point-slider-t1', 'increment');
    expect(h.events).toEqual([
      expect.objectContaining({
        name: 'x_changed',
        payload: {
          x: 1.1,
          fx: evalFn('f_ex4', 1.1),
          fmx: evalFn('f_ex4', -1.1),
          fn: 'f_ex4',
        },
      }),
    ]);
    expect(h.ref.current?.getStateSnapshot()).toMatchObject({
      x: 1.1,
      comparing: false,
    });
  });
  it('the compare toggle shows a function whose heights differ', async () => {
    const h = await host(spec);
    // The compare toggle lives in the expanded (full-screen) view.
    await tap('point-expand');
    await tap('point-compare');
    expect(h.events[0]).toMatchObject({
      name: 'expanded_toggled',
      payload: { expanded: true },
    });
    expect(h.events[1]).toMatchObject({
      name: 'compare_toggled',
      payload: { comparing: true, fn: 'sigmoid_demo' },
    });
    expect(screen.getByTestId('point-fx')).toHaveTextContent(/^g\(1\)/);
    expect(screen.getByTestId('point-verdict')).not.toHaveTextContent(
      /نفس الارتفاع/,
    );
  });
  it('replays a recorded x without events; readonly cannot move', async () => {
    const r = await host(spec, {
      mode: 'replay',
      snapshot: { x: 2, comparing: true },
    });
    expect(screen.getByTestId('point-fx')).toHaveTextContent(/^g\(2\)/);
    await step('point-slider-t1', 'increment');
    expect(r.events).toEqual([]);
  });
  it('refuses a mirror on a non-symmetric domain and x0 outside it', async () => {
    const h = await host({
      component: 'PointOnCurve',
      props: { fn: 'f_ex4', domain: [-1, 3], x0: 5 },
    });
    expect(String(h.errors[0]?.[2])).toMatch(/symmetric/);
    expect(String(h.errors[0]?.[2])).toMatch(/x0: outside the domain/);
  });
});

describe('FoldSymmetry', () => {
  const spec: ComponentSpec = {
    component: 'FoldSymmetry',
    props: { fn: 'f_ex4', compareFn: 'sigmoid_demo' },
  };
  async function foldAll(id: string) {
    for (let i = 0; i < 20; i++) {
      await step(id, 'increment');
    }
  }
  it('folding to the end reports an overlap for f_ex4 (engine check)', async () => {
    const h = await host(spec);
    expect(screen.getByTestId('fold-hint')).toBeOnTheScreen();
    await foldAll('fold-slider-t1');
    expect(h.events.at(-2)).toMatchObject({
      name: 'fold_changed',
      payload: { k: 1, fn: 'f_ex4' },
    });
    expect(h.events.at(-1)).toMatchObject({
      name: 'fold_complete',
      payload: { overlap: true, fn: 'f_ex4' },
    });
    // Collapsed: the short verdict (✓ + words); the full sentence is in the expanded view.
    expect(screen.getByTestId('fold-verdict')).toHaveTextContent(/✓/);
    await tap('fold-expand');
    expect(screen.getByTestId('fold-verdict')).toHaveTextContent(/بالضبط/);
  });
  it('the comparison function does not overlap', async () => {
    const h = await host(spec);
    await tap('fold-expand'); // the compare toggle is in the expanded view
    await tap('fold-compare');
    await foldAll('fold-slider-t1');
    expect(h.events.at(-1)).toMatchObject({
      name: 'fold_complete',
      payload: { overlap: false, fn: 'sigmoid_demo' },
    });
  });
  it('replays a recorded fold; refuses a non-symmetric domain', async () => {
    const r = await host(spec, {
      mode: 'replay',
      snapshot: { k: 1, comparing: false },
    });
    expect(screen.getByTestId('fold-verdict')).toBeOnTheScreen();
    expect(r.events).toEqual([]);
    const bad = await host({
      component: 'FoldSymmetry',
      props: { fn: 'f_ex4', domain: [-2, 3] },
    });
    expect(String(bad.errors[0]?.[2])).toMatch(/symmetric/);
  });
});

describe('LimitExplorer', () => {
  const spec: ComponentSpec = {
    component: 'LimitExplorer',
    props: {
      fn: 'f_ex4',
      numerator: 'f_ex4_num',
      denominator: 'f_ex4_den',
      xMax: 20,
    },
  };
  it('reads numerator, denominator and f(x) separately with engine values', async () => {
    const h = await host(spec);
    expect(h.errors).toEqual([]);
    for (let i = 0; i < 18; i++) {
      await step('limit-slider-t1', 'increment');
    }
    expect(screen.getByTestId('limit-x')).toHaveTextContent('x = 10');
    expect(screen.getByTestId('limit-num')).toHaveTextContent(
      `= ${readoutNumber(Math.exp(10))}`,
    );
    expect(screen.getByTestId('limit-den')).toHaveTextContent(
      `= ${readoutNumber(1 + Math.exp(20))}`,
    );
    expect(screen.getByTestId('limit-fx')).toHaveTextContent(
      `= ${readoutNumber(evalFn('f_ex4', 10))}`,
    );
    expect(h.events.at(-1)).toMatchObject({
      name: 'x_changed',
      payload: { x: 10, numerator: evalFn('f_ex4_num', 10) },
    });
  });
  it('draws the engine asymptote y = 0 and toggles the zoom', async () => {
    const h = await host(spec);
    expect(
      screen.getByTestId('plot-marker-label-0').props.children.props.children,
    ).toBe('y = 0');
    await tap('limit-expand'); // the zoom toggle is in the expanded view
    await tap('limit-zoom');
    expect(h.events.at(-1)).toMatchObject({
      name: 'zoom_toggled',
      payload: { zoomed: true },
    });
    expect(h.ref.current?.getStateSnapshot()).toMatchObject({ zoomed: true });
  });
  it('the zoomed range stays above the limit near +infinity (never touches)', () => {
    const [lo, hi] = zoomRange('f_ex4', [0, 20], 0);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(evalFn('f_ex4', 10));
    expect(evalFn('f_ex4', 20)).toBeGreaterThan(0);
  });
  it('refuses a numerator / denominator pair that is not f', async () => {
    const h = await host({
      component: 'LimitExplorer',
      props: { fn: 'f_ex4', numerator: 'f_ex4_num', denominator: 'exp_neg' },
    });
    expect(String(h.errors[0]?.[2])).toMatch(/is not f_ex4/);
  });
  it('works with only fn: e^-x -> 0, no numerator rows', async () => {
    const h = await host({
      component: 'LimitExplorer',
      props: { fn: 'exp_neg' },
    });
    expect(h.errors).toEqual([]);
    expect(screen.queryByTestId('limit-num')).toBeNull();
    await tap('limit-expand');
    expect(screen.getByTestId('limit-zoom')).toBeOnTheScreen();
  });
});

describe('SecantToTangent', () => {
  it('as h shrinks, the secant slope approaches the tangent slope (engine values)', async () => {
    const h = await host({
      component: 'SecantToTangent',
      props: { fn: 'quot_demo', x0: 0, domain: [-0.8, 3.5] },
    });
    expect(h.errors).toEqual([]);
    // h = 3: (3/4 - 0) / 3 = 1/4.
    expect(screen.getByTestId('secant-slope')).toHaveTextContent('= 1/4');
    expect(screen.getByTestId('secant-tangent')).toHaveTextContent('≈ 1');
    for (let i = 0; i < 7; i++) {
      await step('secant-slider-t1', 'increment');
    }
    expect(screen.getByTestId('secant-h')).toHaveTextContent('= 0,01');
    expect(h.events.at(-1)).toMatchObject({
      name: 'h_changed',
      payload: { h: 0.01, secantSlope: secantSlope('quot_demo', 0, 0.01) },
    });
    expect(Math.abs(secantSlope('quot_demo', 0, 0.01) - 1)).toBeLessThan(0.011);
    expect(h.ref.current?.getStateSnapshot()).toMatchObject({ hIndex: 7 });
  });
  it("f' at a maximum is 0, not a float residue", async () => {
    await host({
      component: 'SecantToTangent',
      props: { fn: 'f_ex4', x0: 0 },
    });
    expect(screen.getByTestId('secant-tangent')).toHaveTextContent('≈ 0');
  });
  it('refuses increasing steps and a second point outside the domain', async () => {
    const h = await host({
      component: 'SecantToTangent',
      props: { fn: 'f_ex4', x0: 2, hSteps: [0.1, 2] },
    });
    expect(String(h.errors[0]?.[2])).toMatch(/must decrease/);
    expect(String(h.errors[0]?.[2])).toMatch(/outside the domain/);
  });
});

describe('TangentSlope', () => {
  const spec: ComponentSpec = {
    component: 'TangentSlope',
    props: { fn: 'f_ex4', showTable: true },
  };
  it('says the direction in words; the table starts with only the visited region', async () => {
    const h = await host(spec);
    expect(h.errors).toEqual([]);
    expect(screen.getByTestId('tangent-trend')).toHaveTextContent(/↗/);
    await tap('tangent-expand'); // the table is in the expanded view
    expect(screen.getByTestId('tangent-sign-0')).toHaveTextContent('+');
    expect(screen.getByTestId('tangent-arrow-1')).toHaveTextContent('?');
    expect(screen.queryByTestId('grid-value-1')).toBeNull();
  });
  it('visiting x > 0 fills the second region and reveals f(0) = 1/2 from the engine', async () => {
    const h = await host(spec);
    for (let i = 0; i < 15; i++) {
      await step('tangent-slider-t1', 'increment');
    }
    expect(h.events.find(e => e.name === 'region_visited')).toMatchObject({
      payload: { region: 1, sign: '-' },
    });
    await tap('tangent-expand');
    expect(screen.getByTestId('tangent-arrow-1')).toHaveTextContent('↘');
    expect(screen.getByTestId('grid-x-1')).toHaveTextContent('0');
    expect(screen.getByTestId('grid-value-1')).toHaveTextContent('1/2');
    expect(screen.getByTestId('tangent-trend')).toHaveTextContent(/↘/);
    expect(h.events.at(-2)).toMatchObject({
      name: 'x_changed',
      payload: { x: 0.5 },
    });
  });
  it('at the maximum the tangent is flat', async () => {
    await host({ component: 'TangentSlope', props: { fn: 'f_ex4', x0: 0 } });
    expect(screen.getByTestId('tangent-trend')).toHaveTextContent(/→/);
    expect(screen.getByTestId('tangent-slope')).toHaveTextContent('≈ 0');
  });
  it('refuses a domain containing a point where f is undefined', async () => {
    const h = await host({
      component: 'TangentSlope',
      props: { fn: 'quot_demo', x0: 0 },
    });
    expect(String(h.errors[0]?.[2])).toMatch(/undefined inside the domain/);
  });
});

describe('VariationTableBuilder', () => {
  const spec: ComponentSpec = {
    component: 'VariationTableBuilder',
    props: { fn: 'f_ex4' },
  };
  const fill = async (taps: Record<string, number>) => {
    for (const [id, n] of Object.entries(taps)) {
      for (let i = 0; i < n; i++) {
        await tap(`vt-${id}`);
      }
    }
  };
  it('shows the engine limits at the ends and hides f(0) until solved', async () => {
    const h = await host(spec);
    expect(h.errors).toEqual([]);
    expect(screen.getByTestId('grid-x-0')).toHaveTextContent('−∞');
    expect(screen.getByTestId('grid-value-0')).toHaveTextContent('0');
    expect(screen.getByTestId('grid-value-2')).toHaveTextContent('0');
    expect(screen.queryByTestId('grid-value-1')).toBeNull();
    expect(screen.getByTestId('vt-check')).toBeDisabled();
    // Same check label as the other cards; "fill all" is a hint line.
    expect(screen.getByTestId('vt-check')).toHaveTextContent('نثبّت');
    expect(screen.getByTestId('vt-fill-all')).toBeOnTheScreen();
  });
  it('a correct table is a correct task result and reveals f(0) = 1/2', async () => {
    const results: unknown[] = [];
    const h = await host(spec, { onResult: r => results.push(r) });
    // + ↗ | − ↘ | max
    await fill({
      'sign-0': 1,
      'arrow-0': 1,
      'sign-1': 2,
      'arrow-1': 2,
      'extremum-1': 1,
    });
    await tap('vt-check');
    expect(results).toEqual([
      expect.objectContaining({ correct: true, misconceptionHints: [] }),
    ]);
    expect(screen.getByTestId('vt-correct')).toBeOnTheScreen();
    expect(screen.getByTestId('grid-value-1')).toHaveTextContent('1/2');
    expect(h.events.at(-1)).toMatchObject({
      name: 'submitted',
      payload: { isCorrect: true, attempt: 1 },
    });
  });
  it('marks wrong cells and sends the misconception hint, without showing answers', async () => {
    const results: { misconceptionHints?: string[] }[] = [];
    await host(spec, { onResult: r => results.push(r) });
    // Arrow up on the − interval: contradicts the student's own sign.
    await fill({
      'sign-0': 1,
      'arrow-0': 1,
      'sign-1': 2,
      'arrow-1': 1,
      'extremum-1': 1,
    });
    await tap('vt-check');
    expect(results[0]?.misconceptionHints).toEqual(['sign_arrow_mismatch']);
    expect(screen.getByTestId('vt-wrong')).toBeOnTheScreen();
    expect(screen.getByTestId('vt-arrow-1')).toHaveTextContent(/↗/);
    expect(screen.queryByTestId('grid-value-1')).toBeNull();
  });
  it('showSolution shows the engine table; replay restores cells without events', async () => {
    await host(spec, { mode: 'replay', showSolution: true });
    expect(screen.getByTestId('vt-sign-1')).toHaveTextContent('−');
    expect(screen.getByTestId('vt-extremum-1')).toHaveTextContent('max');
    const r = await host(spec, {
      mode: 'replay',
      snapshot: {
        cells: { 'sign-0': '+' },
        attempts: 0,
        done: false,
        lastWrong: [],
      },
    });
    await tap('vt-sign-0');
    expect(r.events).toEqual([]);
  });
  it("refuses a scan that misses a sign change of f'", async () => {
    const h = await host({
      component: 'VariationTableBuilder',
      props: { fn: 'f_ex4', scan: [1, 5] },
    });
    expect(String(h.errors[0]?.[2])).toMatch(/outside the scan/);
  });
});

describe('FoldSymmetry on mount', () => {
  it('starts unfolded (k = 0) with no event, whatever the props', async () => {
    const h = await host({
      component: 'FoldSymmetry',
      props: { fn: 'f_ex4', compareFn: 'sigmoid_demo' },
    });
    expect(h.ref.current?.getStateSnapshot()).toEqual({
      k: 0,
      comparing: false,
    });
    expect(h.events).toEqual([]);
    expect(screen.getByTestId('fold-hint')).toBeOnTheScreen();
    expect(screen.queryByTestId('fold-verdict')).toBeNull();
  });
});

describe('Expandable (collapsed in the feed, full screen on tap)', () => {
  it('shows each readout once, keeps the state, and logs the toggles', async () => {
    const h = await host({
      component: 'PointOnCurve',
      props: { fn: 'f_ex4' },
    });
    await step('point-slider-t1', 'increment');
    await tap('point-expand');
    expect(screen.getAllByTestId('point-fx')).toHaveLength(1);
    expect(screen.getByTestId('point-fx')).toHaveTextContent(/^f\(1,1\)/);
    await step('point-slider-t1', 'increment');
    await tap('point-collapse');
    expect(screen.getByTestId('point-fx')).toHaveTextContent(/^f\(1,2\)/);
    expect(h.events.map(e => e.name)).toEqual([
      'x_changed',
      'expanded_toggled',
      'x_changed',
      'expanded_toggled',
    ]);
  });
});
