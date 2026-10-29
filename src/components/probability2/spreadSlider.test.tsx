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
      defaultInstanceId="sp1"
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

const spread = (props: JsonObject): ComponentSpec => ({ component: 'SpreadSlider', props });
const tenths = (over: JsonObject = {}) =>
  spread({
    family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/10', init: '3/10' } },
    ...over,
  });
const scenarios = (over: JsonObject = {}) =>
  spread({
    values: [1, 2, 3],
    family: {
      kind: 'scenarios',
      sameMean: true,
      scenarios: [
        { id: 'a', probabilities: ['1/3', '1/3', '1/3'] },
        { id: 'b', probabilities: ['1/2', '0', '1/2'] },
        { id: 'c', probabilities: ['0', '1', '0'] },
      ],
    },
    ...over,
  });
const fixed = () =>
  spread({
    values: [-2, -1, 0, 2],
    family: { kind: 'fixed', probabilities: ['1/6', '1/2', '3/10', '1/30'] },
  });

async function move(dir: 'increment' | 'decrement', times = 1) {
  for (let i = 0; i < times; i++) {
    await fireEvent(screen.getByTestId('spread-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: dir },
    });
  }
}

describe('SpreadSlider: the Bernoulli slider', () => {
  it('shows p = 3/10 with a bar, a square and a contribution for each value, the stacked bar, no total, and the escape', async () => {
    const { errors, events } = await host(tenths());
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getByTestId('spread-slider-sp1')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^spread-row-\d$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^spread-dist-\d$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^spread-square-\d$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^spread-w-\d$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^spread-seg-\d$/)).toHaveLength(2);
    expect(screen.queryByTestId('spread-total')).toBeNull();
    expect(screen.getByTestId('spread-locked')).toBeOnTheScreen();
    expect(screen.getByTestId('spread-reveal')).toBeOnTheScreen();
    expect(screen.getByTestId('spread-slider').props.accessibilityRole).toBe('adjustable');
  });

  it('the square of the larger distance is drawn larger, at one scale for every position', async () => {
    await host(tenths());
    const side = (i: number) => {
      const flat = Object.assign({}, ...[screen.getByTestId(`spread-square-${i}`).props.style].flat(2).filter(Boolean));
      return flat as { width: number; height: number };
    };
    // 3/10 and 7/10: the second side is 7/3 of the first
    expect(side(1).width / side(0).width).toBeCloseTo(7 / 3);
    expect(side(0).width).toBe(side(0).height);
  });

  it('a step is a commit: it logs the position and how many distinct ones were visited', async () => {
    const { events } = await host(tenths());
    await move('increment');
    expect(byName(events, 'slider_changed').map(e => e.payload)).toEqual([
      { index: 4, p: '2/5', visited: 1 },
    ]);
    expect(screen.getByTestId('spread-p')).toBeOnTheScreen();
  });

  it('the total is written only after 3 DISTINCT positions; going back and forth does not count twice', async () => {
    const { events } = await host(tenths());
    await move('increment'); // 4
    await move('decrement'); // 3: new (the starting p is not "visited" until the student commits to it)
    await move('increment'); // 4 again: not new
    expect(screen.queryByTestId('spread-total')).toBeNull();
    expect(names(events)).not.toContain('explored');
    await move('increment'); // 5: the third
    expect(screen.getByTestId('spread-total')).toBeOnTheScreen();
    expect(screen.queryByTestId('spread-locked')).toBeNull();
    expect(byName(events, 'slider_changed').at(-1)!.payload).toMatchObject({ visited: 3 });
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: '3_positions',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'spread.bernoulli',
      numbers: { p: '1/2', mean: '1/2', variance: '1/4' },
      how: 'found',
    });
    expect(finding.calc).toHaveLength(3);
    expect(screen.queryByTestId('spread-reveal')).toBeNull();
  });

  it('a lock written in the props: 5 positions', async () => {
    const { events } = await host(tenths({ totalLockedUntil: { positions: 5 } }));
    await move('increment', 4);
    expect(screen.queryByTestId('spread-total')).toBeNull();
    await move('increment');
    expect(screen.getByTestId('spread-total')).toBeOnTheScreen();
    expect(names(events).filter(n => n === 'explored')).toHaveLength(1);
  });

  it('no total shown: the first move opens the gate, and there is no lock line', async () => {
    const { events } = await host(tenths({ show: { total: false } }));
    expect(screen.queryByTestId('spread-locked')).toBeNull();
    await move('increment');
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload).why).toBe('first_move');
    expect(screen.queryByTestId('spread-total')).toBeNull();
  });

  it('show flags hide the pieces they name', async () => {
    await host(tenths({ show: { distances: false, squares: false } }));
    expect(screen.queryByTestId('spread-dist-0')).toBeNull();
    expect(screen.queryByTestId('spread-square-0')).toBeNull();
    expect(screen.getByTestId('spread-w-0')).toBeOnTheScreen();
  });

  it('the escape writes the total, opens the gate as skipped, and is never understanding', async () => {
    const { events } = await host(tenths());
    await fireEvent.press(screen.getByTestId('spread-reveal'));
    expect(screen.getByTestId('spread-total')).toBeOnTheScreen();
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
  });

  it('is a gate by event name', () => {
    expect(isGate('SpreadSlider', {})).toBe(true);
    expect(opensGate('SpreadSlider', 'explored')).toBe(true);
    expect(opensGate('SpreadSlider', 'slider_changed')).toBe(false);
  });
});

describe('SpreadSlider: scenarios with the same mean', () => {
  it('chips select a scenario; the spread changes while the mean does not', async () => {
    const { events } = await host(scenarios());
    expect(screen.getAllByTestId(/^spread-scenario-\d$/)).toHaveLength(3);
    await fireEvent.press(screen.getByTestId('spread-scenario-1'));
    await fireEvent.press(screen.getByTestId('spread-scenario-2'));
    expect(byName(events, 'scenario_selected').map(e => e.payload)).toEqual([
      { id: 'b', visited: 1 },
      { id: 'c', visited: 2 },
    ]);
    expect(screen.queryByTestId('spread-total')).toBeNull();
    await fireEvent.press(screen.getByTestId('spread-scenario-0'));
    expect(screen.getByTestId('spread-total')).toBeOnTheScreen();
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding.findingId).toBe('spread.scenarios');
    expect(finding.numbers).toMatchObject({ v0: '2/3', v1: '1', v2: '0' });
  });
});

describe('SpreadSlider: a fixed law, looked at value by value', () => {
  it('"next value" moves the focus; the total waits for 3 values', async () => {
    const { events } = await host(fixed());
    await fireEvent.press(screen.getByTestId('spread-next'));
    await fireEvent.press(screen.getByTestId('spread-next'));
    expect(screen.queryByTestId('spread-total')).toBeNull();
    await fireEvent.press(screen.getByTestId('spread-next'));
    expect(screen.getByTestId('spread-total')).toBeOnTheScreen();
    expect(byName(events, 'value_focused').map(e => e.payload)).toEqual([
      { x: -1, visited: 1 },
      { x: 0, visited: 2 },
      { x: 2, visited: 3 },
    ]);
  });
});

describe('SpreadSlider: checkpoints, graded by the engine', () => {
  it('larger_spread: p = 1/2 is the answer; it appears once the gate is open', async () => {
    const { events } = await host(
      tenths({ checkpoint: { kind: 'larger_spread', options: ['1/10', '3/10', '1/2'] } }),
    );
    expect(screen.queryByTestId('spread-checkpoint')).toBeNull();
    await move('increment', 3);
    expect(screen.getByTestId('spread-checkpoint')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('spread-choice-0'));
    expect(screen.getByTestId('spread-verdict')).toBeOnTheScreen();
    expect(screen.getByTestId('spread-choice-2').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('spread-choice-2'));
    expect(byName(events, 'checkpoint_answered').map(e => e.payload)).toEqual([
      { checkpoint: 'larger_spread', choice: '1/10', correct: false },
      { checkpoint: 'larger_spread', choice: '1/2', correct: true },
    ]);
    // right: the choices stop, and a second finding says it
    expect(screen.getByTestId('spread-choice-0').props.accessibilityState.disabled).toBe(true);
    expect(byName(events, 'finding')).toHaveLength(2);
    expect(byName(events, 'finding')[1]!.payload).toMatchObject({ correct: true });
  });

  it('zero_at_ends: the formula that is 0 at both ends and largest at 1/2', async () => {
    const { events } = await host(
      tenths({ checkpoint: { kind: 'zero_at_ends', expressions: ['p', 'p^2', 'p*(1-p)', '1-p'] } }),
    );
    await move('increment', 3);
    await fireEvent.press(screen.getByTestId('spread-choice-1'));
    await fireEvent.press(screen.getByTestId('spread-choice-2'));
    expect(byName(events, 'checkpoint_answered').map(e => e.payload)).toEqual([
      { checkpoint: 'zero_at_ends', choice: 'p^2', correct: false },
      { checkpoint: 'zero_at_ends', choice: 'p*(1-p)', correct: true },
    ]);
  });

  it('the escape shows the checkpoint too; the student can still answer it', async () => {
    await host(tenths({ checkpoint: { kind: 'larger_spread', options: ['1/10', '1/2'] } }));
    await fireEvent.press(screen.getByTestId('spread-reveal'));
    expect(screen.getByTestId('spread-checkpoint')).toBeOnTheScreen();
  });
});

describe('SpreadSlider: state, readonly, replay, limits', () => {
  it('the snapshot restores the position, the visits and the gate; a replay emits nothing and cannot be moved', async () => {
    const live = await host(tenths());
    await move('increment', 3);
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap).toMatchObject({ index: 6, explored: 'done' });
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={tenths()}
        defaultInstanceId="sp2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('spread-total')).toBeOnTheScreen();
    await move('increment');
    expect(events).toEqual([]);
  });

  it('a garbled snapshot is ignored', async () => {
    await render(
      <ComponentHost
        spec={tenths()}
        defaultInstanceId="sp3"
        mode="replay"
        snapshot={{ index: 99 } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.queryByTestId('spread-total')).toBeNull();
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host(spread({ family: { kind: 'bernoulli', p: { min: '0', max: '2', step: '1/10', init: '0' } } }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('few interactive elements at the worst case: the slider, 4 checkpoint choices and the escape', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={tenths({ checkpoint: { kind: 'zero_at_ends', expressions: ['p', 'p^2', 'p*(1-p)', '1-p', 'p/2'] } })}
        defaultInstanceId="w"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    await fireEvent.press(screen.getByTestId('spread-reveal'));
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(8);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });
});
