import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import { theme } from '../../theme';
import { ComponentHost, type ComponentHostProps } from '../ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentSpec,
  JsonObject,
} from '../contract';
import { isGate, opensGate } from '../registry';
import { MAX_INTERACTIVE, countInteractive } from './countInteractive';
import { ExploredPayloadSchema, FindingPayloadSchema } from './finding';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="r1"
      mode="interactive"
      onEvent={e => events.push(e)}
      onError={(...a) => errors.push(a)}
      handleRef={ref}
      {...extra}
    />,
  );
  return { events, errors, ref };
}
const names = (events: ComponentEvent[]) => events.map(e => e.name);
const byName = (events: ComponentEvent[], n: string) => events.filter(e => e.name === n);

const runs = (props: JsonObject): ComponentSpec => ({ component: 'RepeatedRuns', props });
const fraction = (over: JsonObject = {}) =>
  runs({ N: 36, mode: 'fraction_of_total', stages: [{ p: '1/6' }], ...over });
const two = (over: JsonObject = {}) =>
  runs({ N: 36, mode: 'two_stage', stages: [{ p: '1/6' }, { p: '1/6' }], ...over });
const tally = () =>
  runs({
    N: 60,
    mode: 'tally',
    tally: { values: [1, 2, 3, 4, 5, 6], probabilities: ['1/6', '1/6', '1/6', '1/6', '1/6', '1/6'] },
  });

const lit = () =>
  screen
    .getAllByTestId(/^runs-cell-\d+$/)
    .map(c => Object.assign({}, ...[c.props.style].flat(2).filter(Boolean)) as { backgroundColor?: string })
    .filter(s => s.backgroundColor === theme.color.highlighter).length;

describe('RepeatedRuns: watch', () => {
  it('fraction_of_total: 36 cells, no count until the step; the step lights 6 and writes the engine calculation', async () => {
    const { errors, events } = await host(fraction());
    expect(errors).toEqual([]);
    expect(screen.getAllByTestId(/^runs-cell-\d+$/)).toHaveLength(36);
    expect(screen.queryByTestId('runs-calc')).toBeNull();
    expect(screen.queryByTestId('runs-stage-1')).toBeNull();
    await fireEvent.press(screen.getByTestId('runs-next'));
    expect(screen.getByTestId('runs-stage-1')).toBeOnTheScreen();
    expect(screen.getByTestId('runs-calc')).toBeOnTheScreen();
    expect(byName(events, 'stage_advanced').map(e => e.payload)).toEqual([{ stage: 1, count: 6 }]);
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'last_stage',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'runs.fraction',
      numbers: { runs: '36', count: '6' },
      how: 'found',
      calc: ['\\frac{1}{6} \\times 36 = 6'],
    });
    expect(screen.queryByTestId('runs-next')).toBeNull();
    expect(screen.queryByTestId('runs-reveal')).toBeNull();
  });

  it('two_stage: 36 -> 6 -> 1, the second inside the first; the gate opens at the last step', async () => {
    const { events } = await host(two());
    await fireEvent.press(screen.getByTestId('runs-next'));
    expect(names(events)).not.toContain('explored');
    await fireEvent.press(screen.getByTestId('runs-next'));
    expect(byName(events, 'stage_advanced').map(e => e.payload)).toEqual([
      { stage: 1, count: 6 },
      { stage: 2, count: 1 },
    ]);
    expect(screen.getByTestId('runs-stage-2')).toBeOnTheScreen();
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      findingId: 'runs.two_stage',
      numbers: { runs: '36', stage1: '6', stage2: '1' },
      calc: ['\\frac{1}{6} \\times 36 = 6', '\\frac{1}{6} \\times 6 = 1'],
    });
  });

  it('another run count: 60 runs, 1/5 then 1/3: 12, then 4', async () => {
    const { events } = await host(runs({ N: 60, mode: 'two_stage', stages: [{ p: '1/5' }, { p: '1/3' }] }));
    await fireEvent.press(screen.getByTestId('runs-next'));
    await fireEvent.press(screen.getByTestId('runs-next'));
    expect(byName(events, 'stage_advanced').map(e => e.payload)).toEqual([
      { stage: 1, count: 12 },
      { stage: 2, count: 4 },
    ]);
  });

  it('tally of a fair die: the runs per value from the start; S, then the average, by the steps', async () => {
    const { events } = await host(tally());
    expect(screen.getAllByTestId(/^runs-tally-row-\d$/)).toHaveLength(6);
    expect(screen.queryByTestId('runs-calc')).toBeNull();
    await fireEvent.press(screen.getByTestId('runs-next'));
    expect(screen.getByTestId('runs-calc')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('runs-next'));
    expect(byName(events, 'stage_advanced').map(e => e.payload)).toEqual([
      { stage: 1, total: '210' },
      { stage: 2, average: '7/2' },
    ]);
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      findingId: 'runs.tally',
      numbers: { runs: '60', total: '210', average: '7/2' },
    });
  });

  it('the escape jumps to the end, opens the gate as skipped, and is never understanding', async () => {
    const { events } = await host(two());
    await fireEvent.press(screen.getByTestId('runs-reveal'));
    expect(screen.getByTestId('runs-stage-2')).toBeOnTheScreen();
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
  });
});

describe('RepeatedRuns: shade', () => {
  const shade = (over: JsonObject = {}) => fraction({ interaction: 'shade', ...over });

  it('taps shade cells; the count is written only after a confirm, and a wrong count is not told', async () => {
    const { events } = await host(shade());
    expect(screen.getByTestId('runs-confirm').props.accessibilityState.disabled).toBe(true);
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByTestId(`runs-cell-${i}`));
    }
    expect(screen.getByTestId('runs-cell-0').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId('runs-confirm'));
    expect(screen.getByTestId('runs-message')).toBeOnTheScreen();
    expect(screen.queryByTestId('runs-calc')).toBeNull();
    expect(byName(events, 'confirm_pressed')[0]!.payload).toEqual({ count: 4, correct: false });
    // the wrong count never says the right one: nothing on screen carries 6 as a result
    expect(JSON.stringify(screen.toJSON())).not.toContain('= 6');
    expect(names(events)).not.toContain('explored');
  });

  it('shading 6 and confirming opens the gate, writes the calculation and locks the cells', async () => {
    const { events } = await host(shade());
    for (let i = 0; i < 6; i++) {
      await fireEvent.press(screen.getByTestId(`runs-cell-${i}`));
    }
    await fireEvent.press(screen.getByTestId('runs-confirm'));
    expect(byName(events, 'confirm_pressed')[0]!.payload).toEqual({ count: 6, correct: true });
    expect(screen.getByTestId('runs-calc')).toBeOnTheScreen();
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'count_confirmed',
      how: 'done',
    });
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({ correct: true, how: 'found' });
    expect(screen.getByTestId('runs-cell-0').props.accessibilityState.disabled).toBe(true);
    expect(byName(events, 'cell_tapped')).toHaveLength(6);
  });

  it('a tapped cell can be tapped again to unshade it', async () => {
    const { events } = await host(shade());
    await fireEvent.press(screen.getByTestId('runs-cell-3'));
    await fireEvent.press(screen.getByTestId('runs-cell-3'));
    expect(byName(events, 'cell_tapped').map(e => e.payload)).toEqual([
      { index: 3, selected: true },
      { index: 3, selected: false },
    ]);
    expect(screen.getByTestId('runs-confirm').props.accessibilityState.disabled).toBe(true);
  });

  it('the escape shades the 6 cells, writes the calculation, skipped', async () => {
    const { events } = await host(shade());
    await fireEvent.press(screen.getByTestId('runs-reveal'));
    expect(screen.getByTestId('runs-cell-5').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('runs-cell-6').props.accessibilityState.selected).toBe(false);
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({ how: 'skipped', correct: null });
  });

  it('at most 36 cells of 44 pt (the 60 element rule): 36 cells + confirm + escape', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={shade()}
        defaultInstanceId="w"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(countInteractive(screen.toJSON())).toBe(38);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });

  it('every cell is a 44 pt target both ways', async () => {
    await host(shade());
    const s = Object.assign({}, ...[screen.getByTestId('runs-cell-0').props.style].flat(2).filter(Boolean)) as {
      width: number;
      height: number;
    };
    expect(s.width).toBeGreaterThanOrEqual(44);
    expect(s.height).toBeGreaterThanOrEqual(44);
  });
});

describe('RepeatedRuns: state, readonly, replay', () => {
  it('the snapshot restores the stage and the gate; a replay emits nothing', async () => {
    const live = await host(two());
    await fireEvent.press(screen.getByTestId('runs-next'));
    await fireEvent.press(screen.getByTestId('runs-next'));
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap).toMatchObject({ stage: 2, explored: 'done' });
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={two()}
        defaultInstanceId="r2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('runs-stage-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('runs-next')).toBeNull();
    expect(events).toEqual([]);
    expect(lit()).toBeGreaterThan(0);
  });

  it('a garbled snapshot is ignored', async () => {
    await render(
      <ComponentHost
        spec={two()}
        defaultInstanceId="r3"
        mode="replay"
        snapshot={{ stage: 9 } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.queryByTestId('runs-stage-1')).toBeNull();
  });

  it('is a gate by event name', () => {
    expect(isGate('RepeatedRuns', {})).toBe(true);
    expect(opensGate('RepeatedRuns', 'explored')).toBe(true);
    expect(opensGate('RepeatedRuns', 'stage_advanced')).toBe(false);
  });

  it('invalid props fall back, never crash: 36 runs and p = 1/5 is 7.2', async () => {
    const { errors } = await host(fraction({ stages: [{ p: '1/5' }] }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });
});
