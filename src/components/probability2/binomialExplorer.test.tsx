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
import { BinomialExplorerPropsSchema } from './schemas';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="b1"
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

const explorer = (props: JsonObject): ComponentSpec => ({ component: 'BinomialExplorer', props });
const small = (over: JsonObject = {}) =>
  explorer({
    n: { min: 2, max: 5, init: 5 },
    p: { min: '1/10', max: '9/10', step: '1/10', init: '3/10' },
    ...over,
  });
const large = (over: JsonObject = {}) =>
  explorer({
    n: { min: 4, max: 10, init: 8 },
    p: { fixed: '1/6' },
    ...over,
  });

describe('BinomialExplorer props', () => {
  const ok = (p: unknown) => BinomialExplorerPropsSchema.safeParse(p);
  const messages = (p: unknown) => {
    const r = ok(p);
    return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  };

  it('accepts the demo cases', () => {
    expect(ok(small().props).success).toBe(true);
    expect(ok(large().props).success).toBe(true);
    // the Exercise 2 smallest-n question: p = 7/10, n up to 15
    expect(ok({ n: { min: 1, max: 15, init: 8 }, p: { fixed: '7/10' } }).success).toBe(true);
  });

  it('the loader rejects a range that is not exact: n up to 16 with tenths, n up to 25 with 1/6', () => {
    expect(ok({ n: { min: 1, max: 15, init: 8 }, p: { fixed: '7/10' } }).success).toBe(true);
    const r = { n: { min: 1, max: 15, init: 8 }, p: { min: '1/6', max: '5/6', step: '1/6', init: '1/6' } };
    expect(ok(r).success).toBe(true);
    expect(ok({ n: { min: 1, max: 16, init: 8 }, p: { fixed: '7/10' } }).success).toBe(false); // schema max 15
    // a denominator that overflows before 15
    expect(messages({ n: { min: 1, max: 15, init: 8 }, p: { fixed: '1/97' } }).join(' ')).toMatch(/not exact/);
  });

  it('n: min <= init <= max; p strictly between 0 and 1, on a grid of at most 21 positions', () => {
    expect(ok({ n: { min: 5, max: 3, init: 4 }, p: { fixed: '1/2' } }).success).toBe(false);
    expect(ok({ n: { min: 1, max: 5, init: 6 }, p: { fixed: '1/2' } }).success).toBe(false);
    expect(ok({ n: { min: 1, max: 5, init: 3 }, p: { fixed: '0' } }).success).toBe(false);
    expect(ok({ n: { min: 1, max: 5, init: 3 }, p: { fixed: '1' } }).success).toBe(false);
    expect(ok({ n: { min: 1, max: 5, init: 3 }, p: { min: '1/10', max: '9/10', step: '1/30', init: '1/10' } }).success).toBe(false);
    expect(ok({ n: { min: 1, max: 5, init: 3 }, p: { min: '1/10', max: '9/10', step: '1/10', init: '1/20' } }).success).toBe(false);
  });

  it('defaults: both toggles, the formula after 2 bars, no slots; linkSlots is for at most 7 trials', () => {
    const r = BinomialExplorerPropsSchema.parse(small().props);
    expect(r).toMatchObject({ toggles: { mean: true, variance: true }, formulaLockedUntilTaps: 2, linkSlots: false });
    expect(ok({ ...small().props, linkSlots: true }).success).toBe(true);
    expect(ok({ ...large().props, linkSlots: true }).success).toBe(false);
  });
});

describe('BinomialExplorer: tappable bars (up to 5 trials)', () => {
  it('shows n + 1 bars, the controls, no term and no formula yet, and the escape', async () => {
    const { errors, events } = await host(small());
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getAllByTestId(/^binom-bar-\d+$/)).toHaveLength(6);
    expect(screen.getByTestId('binom-n-slider')).toBeOnTheScreen();
    expect(screen.getByTestId('binom-p-slider')).toBeOnTheScreen();
    expect(screen.queryByTestId('binom-term')).toBeNull();
    expect(screen.queryByTestId('binom-formula')).toBeNull();
    expect(screen.getByTestId('binom-locked')).toBeOnTheScreen();
    expect(screen.getByTestId('binom-reveal')).toBeOnTheScreen();
    expect(screen.queryByTestId('binom-step-up')).toBeNull();
  });

  it('tapping a bar writes its term with the actual numbers; the formula waits for two DISTINCT bars', async () => {
    const { events } = await host(small());
    await fireEvent.press(screen.getByTestId('binom-bar-2'));
    expect(screen.getByTestId('binom-term')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('binom-bar-2'));
    expect(screen.queryByTestId('binom-formula')).toBeNull();
    expect(names(events)).not.toContain('explored');
    await fireEvent.press(screen.getByTestId('binom-bar-3'));
    expect(screen.getByTestId('binom-formula')).toBeOnTheScreen();
    expect(byName(events, 'bar_tapped').map(e => e.payload)).toEqual([
      { k: 2, via: 'bar' },
      { k: 2, via: 'bar' },
      { k: 3, via: 'bar' },
    ]);
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: '2_bars',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'binomial.formula',
      numbers: { n: '5', p: '3/10', k1: '2', k2: '3', mean: '3/2', variance: '21/20' },
      how: 'found',
    });
    expect(finding.calc).toHaveLength(4);
    expect(screen.queryByTestId('binom-reveal')).toBeNull();
  });

  it('mean and variance are the terms np and npq, written when switched on', async () => {
    const { events } = await host(small());
    expect(screen.queryByTestId('binom-mean')).toBeNull();
    await fireEvent.press(screen.getByTestId('binom-toggle-mean'));
    await fireEvent.press(screen.getByTestId('binom-toggle-variance'));
    expect(screen.getByTestId('binom-mean')).toBeOnTheScreen();
    expect(screen.getByTestId('binom-variance')).toBeOnTheScreen();
    expect(byName(events, 'toggle_changed').map(e => e.payload)).toEqual([
      { name: 'mean', on: true },
      { name: 'variance', on: true },
    ]);
    await fireEvent.press(screen.getByTestId('binom-toggle-mean'));
    expect(screen.queryByTestId('binom-mean')).toBeNull();
  });

  it('the controls log n and p on release; the bars follow n', async () => {
    const { events } = await host(small());
    await fireEvent(screen.getByTestId('binom-n-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    await fireEvent(screen.getByTestId('binom-p-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(byName(events, 'n_changed').map(e => e.payload)).toEqual([{ n: 4 }]);
    expect(byName(events, 'p_changed').map(e => e.payload)).toEqual([{ p: '2/5' }]);
    expect(screen.getAllByTestId(/^binom-bar-\d+$/)).toHaveLength(5);
  });

  it('the escape looks at two bars, opens the gate as skipped, and shows the formula', async () => {
    const { events } = await host(small());
    await fireEvent.press(screen.getByTestId('binom-reveal'));
    expect(screen.getByTestId('binom-formula')).toBeOnTheScreen();
    expect(screen.getByTestId('binom-mean')).toBeOnTheScreen();
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
  });

  it('a tappable bar looks tappable (a control edge, a button for its number); a display-only bar does not', async () => {
    await host(small());
    const edge = (id: string) =>
      (Object.assign({}, ...[screen.getByTestId(id).props.style].flat(2).filter(Boolean)) as { borderWidth: number })
        .borderWidth;
    const tappableEdge = edge('binom-barfill-1');
    await host(large());
    expect(edge('binom-barfill-1')).toBeLessThan(tappableEdge);
  });

  it('every bar is a 44 pt target both ways', async () => {
    await host(small());
    const s = Object.assign({}, ...[screen.getByTestId('binom-bar-0').props.style].flat(2).filter(Boolean)) as {
      width: number;
      minHeight: number;
    };
    expect(s.width).toBeGreaterThanOrEqual(44);
    expect(s.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('BinomialExplorer: from 6 trials, display-only bars and a stepper', () => {
  it('9 bars with no press handler, and a - / + stepper that looks at one bar at a time', async () => {
    const { events } = await host(large());
    expect(screen.getAllByTestId(/^binom-bar-\d+$/)).toHaveLength(9);
    expect(screen.getByTestId('binom-bar-0').props.onPress).toBeUndefined();
    expect(screen.getByTestId('binom-bar-0').props.accessibilityRole).toBeUndefined();
    await fireEvent.press(screen.getByTestId('binom-step-up'));
    await fireEvent.press(screen.getByTestId('binom-step-up'));
    expect(byName(events, 'bar_tapped').map(e => e.payload)).toEqual([
      { k: 0, via: 'step' },
      { k: 1, via: 'step' },
    ]);
    expect(screen.getByTestId('binom-term')).toBeOnTheScreen();
    expect(screen.getByTestId('binom-formula')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('binom-step-down'));
    expect(byName(events, 'bar_tapped').at(-1)!.payload).toEqual({ k: 0, via: 'step' });
  });

  it('a fixed p has no p slider; the stepper stops at 0 and n', async () => {
    await host(large({ n: { min: 8, max: 8, init: 8 } }));
    expect(screen.queryByTestId('binom-p-slider')).toBeNull();
    expect(screen.queryByTestId('binom-n-slider')).toBeNull();
    for (let i = 0; i < 12; i++) {
      await fireEvent.press(screen.getByTestId('binom-step-up'));
    }
    expect(screen.getByTestId('binom-k')).toBeOnTheScreen();
  });

  it('the largest range of the Exercise 2 question (n up to 15, p = 7/10) is exact: no crash, no sum of terms', async () => {
    const { errors } = await host(explorer({ n: { min: 1, max: 15, init: 15 }, p: { fixed: '7/10' } }));
    expect(errors).toEqual([]);
    await fireEvent.press(screen.getByTestId('binom-toggle-variance'));
    expect(screen.getByTestId('binom-variance')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('binom-step-up'));
    await fireEvent.press(screen.getByTestId('binom-step-up'));
    expect(screen.getByTestId('binom-term')).toBeOnTheScreen();
  });
});

describe('BinomialExplorer: linked patterns, state, readonly, limits', () => {
  it('linkSlots: a read-only list of the patterns of the bar, with no way to act on it', async () => {
    const { events } = await host(small({ linkSlots: true, n: { min: 4, max: 4, init: 4 } }));
    await fireEvent.press(screen.getByTestId('binom-bar-2'));
    expect(screen.getByTestId('slots-pattern-b1:slots')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^slots-row-\d+$/)).toHaveLength(6);
    expect(screen.queryByTestId('slots-add')).toBeNull();
    // the nested picture logs nothing of its own
    expect(events.every(e => e.component === 'BinomialExplorer')).toBe(true);
  });

  it('no patterns for k = 0 or k = n (one pattern, nothing to list)', async () => {
    await host(small({ linkSlots: true, n: { min: 4, max: 4, init: 4 } }));
    await fireEvent.press(screen.getByTestId('binom-bar-0'));
    expect(screen.queryByTestId(/^slots-pattern-/)).toBeNull();
  });

  it('the snapshot restores n, p, the bars looked at, the toggles and the gate; a replay emits nothing', async () => {
    const live = await host(small());
    await fireEvent.press(screen.getByTestId('binom-bar-1'));
    await fireEvent.press(screen.getByTestId('binom-bar-4'));
    await fireEvent.press(screen.getByTestId('binom-toggle-variance'));
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap).toMatchObject({ n: 5, taps: [1, 4], selected: 4, variance: true, explored: 'done' });
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={small()}
        defaultInstanceId="b2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('binom-formula')).toBeOnTheScreen();
    expect(screen.getByTestId('binom-variance')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('binom-bar-0'));
    expect(events).toEqual([]);
  });

  it('a garbled snapshot is ignored', async () => {
    await render(
      <ComponentHost
        spec={small()}
        defaultInstanceId="b3"
        mode="replay"
        snapshot={{ n: 99 } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.queryByTestId('binom-formula')).toBeNull();
  });

  it('is a gate by event name', () => {
    expect(isGate('BinomialExplorer', {})).toBe(true);
    expect(opensGate('BinomialExplorer', 'explored')).toBe(true);
    expect(opensGate('BinomialExplorer', 'bar_tapped')).toBe(false);
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host(explorer({ n: { min: 1, max: 15, init: 8 }, p: { fixed: '1/97' } }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('few interactive elements at the worst case', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={small({ linkSlots: true })}
        defaultInstanceId="w"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });
});
