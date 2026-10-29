import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import { ComponentHost, type ComponentHostProps } from '../ComponentHost';
import type { ComponentEvent, ComponentHandle, ComponentSpec, JsonObject } from '../contract';
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
      defaultInstanceId="p1"
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

const bar = (props: JsonObject): ComponentSpec => ({
  component: 'PartWholeBar',
  props,
});
const place = (over: JsonObject = {}) =>
  bar({ whole: '6', mode: 'place', ticks: 6, ...over });
const fraction = (over: JsonObject = {}) =>
  bar({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/6', ...over });
const feedback = (over: JsonObject = {}) =>
  bar({ whole: '6', mode: 'feedback', part: '12', ...over });

/** One step of the stepped control, as a screen reader's "increment". */
async function step(dir: 'increment' | 'decrement', times = 1) {
  for (let i = 0; i < times; i++) {
    await fireEvent(screen.getByTestId('part-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: dir },
    });
  }
}
const flat = (id: string) =>
  Object.assign({}, ...[screen.getByTestId(id).props.style].flat(2).filter(Boolean)) as Record<
    string,
    unknown
  >;

describe('PartWholeBar: place', () => {
  it('shows the bar with the whole marked, the stepped control and the escape; nothing placed yet', async () => {
    const { errors } = await host(place());
    expect(errors).toEqual([]);
    expect(screen.getByTestId('part-whole-p1')).toBeOnTheScreen();
    expect(screen.getByTestId('part-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('part-whole-mark')).toBeOnTheScreen();
    expect(screen.getByTestId('part-slider')).toBeOnTheScreen();
    expect(screen.getByTestId('part-reveal')).toBeOnTheScreen();
    expect(screen.queryByTestId('part-over')).toBeNull();
    expect(screen.queryByTestId('part-calc')).toBeNull();
    expect(screen.getByText('جرّ المقبض باش تحطّ القيمة على الشريط.')).toBeOnTheScreen();
  });

  it('a step places a value: it is logged with the whole and the ratio, and the gate opens once', async () => {
    const { events } = await host(place());
    await step('increment');
    await step('increment');
    expect(byName(events, 'value_placed').map(e => e.payload)).toEqual([
      { value: '1', whole: '6', ratio: '1/6' },
      { value: '2', whole: '6', ratio: '1/3' },
    ]);
    expect(byName(events, 'explored')).toHaveLength(1);
    expect(names(events).indexOf('explored')).toBeLessThan(names(events).indexOf('finding'));
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'value_placed',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'partwhole.place',
      numbers: { whole: '6', value: '1', ratio: '1/6' },
      how: 'found',
      correct: null,
    });
    // 1 of 6 is 1/6 written twice: no calculation (it says nothing)
    expect(finding.calc).toBeUndefined();
    expect(screen.queryByTestId('part-reveal')).toBeNull();
  });

  it('before the handle moves nothing is "the value I placed": no readout, no fill on the bar', async () => {
    await host(place());
    expect(screen.queryByTestId('part-value')).toBeNull();
    expect(screen.queryByTestId('part-fill')).toBeNull();
    await step('increment');
    expect(screen.getByTestId('part-value')).toBeOnTheScreen();
    expect(screen.getByTestId('part-fill')).toBeOnTheScreen();
    await step('decrement');
    // back at 0 the fill goes away again (a zero-width fill still drew an ink sliver)
    expect(screen.queryByTestId('part-fill')).toBeNull();
  });

  it('the arrow past the whole is a plain arrow, never U+25B6 (iOS draws it as a play-button emoji)', async () => {
    await host(place());
    await step('increment', 7);
    expect(screen.getByTestId('part-arrow')).toHaveTextContent('\u2192');
  });

  it('a calculation that says nothing is not written: 11/10 of a bar of 1 is 11/10', async () => {
    await host(bar({ whole: '1', mode: 'place', ticks: 10 }));
    await step('increment', 11);
    expect(screen.getByTestId('part-over')).toBeOnTheScreen();
    expect(screen.queryByTestId('part-calc')).toBeNull();
  });

  it('but 8 of 6 is written: 8/6 = 4/3', async () => {
    await host(place());
    await step('increment', 8);
    expect(screen.getByTestId('part-calc')).toBeOnTheScreen();
  });

  it('a value above the whole gets three signs: the arrow, the words "more than the whole" and a dashed end', async () => {
    const { events } = await host(place());
    await step('increment', 7);
    expect(screen.getByTestId('part-over')).toBeOnTheScreen();
    expect(flat('part-over').borderStyle).toBe('dashed');
    expect(screen.getByTestId('part-arrow')).toBeOnTheScreen();
    expect(screen.getByText('أكثر من الكلّ')).toBeOnTheScreen();
    expect(byName(events, 'exceeds_whole').map(e => e.payload)).toEqual([{ value: '7', whole: '6' }]);
    // back inside the whole: all three go away
    await step('decrement');
    expect(screen.queryByTestId('part-over')).toBeNull();
    expect(screen.queryByTestId('part-arrow')).toBeNull();
    expect(screen.queryByText('أكثر من الكلّ')).toBeNull();
  });

  it('the whole itself is not more than the whole', async () => {
    const { events } = await host(place());
    await step('increment', 6);
    expect(screen.queryByTestId('part-over')).toBeNull();
    expect(names(events)).not.toContain('exceeds_whole');
  });

  it('a probability bar: ten ticks, 5/6 is not on a tick but 1/2 is; the readout keeps exact fractions', async () => {
    const { events } = await host(bar({ whole: '1', mode: 'place', ticks: 10 }));
    await step('increment', 5);
    expect(byName(events, 'value_placed').at(-1)!.payload).toEqual({ value: '1/2', whole: '1', ratio: '1/2' });
    await step('increment', 6);
    expect(byName(events, 'exceeds_whole').at(-1)!.payload).toEqual({ value: '11/10', whole: '1' });
  });

  it('the escape puts the value at the whole, opens the gate as skipped, and is never understanding', async () => {
    const { events } = await host(place());
    await fireEvent.press(screen.getByTestId('part-reveal'));
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
    expect(screen.queryByTestId('part-reveal')).toBeNull();
  });

  it('the control is adjustable for a screen reader and says its value', async () => {
    await host(place());
    const slider = screen.getByTestId('part-slider');
    expect(slider.props.accessibilityRole).toBe('adjustable');
    await step('increment', 2);
    expect(screen.getByTestId('part-slider').props.accessibilityLabel).toContain('2');
  });
});

describe('PartWholeBar: fraction_of_quantity', () => {
  it('1/6 of 36: nothing about 6 until a value is placed; then the engine writes the calculation', async () => {
    const { events } = await host(fraction());
    expect(screen.queryByTestId('part-calc')).toBeNull();
    await step('increment');
    expect(screen.getByTestId('part-calc')).toBeOnTheScreen();
    expect(screen.getByText('حطّيتها في بلاصتها.')).toBeOnTheScreen();
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'partwhole.fraction',
      numbers: { whole: '36', fraction: '1/6', value: '6', quantity: '6' },
      correct: true,
      calc: ['\\frac{1}{6} \\times 36 = 6'],
    });
    expect(byName(events, 'value_placed')[0]!.payload).toEqual({
      value: '6',
      whole: '36',
      ratio: '1/6',
      matches: true,
    });
  });

  it('a wrong first value: the line is still the engine\'s, the finding says not correct, and a later right value adds one more finding', async () => {
    // 1/3 of 36 is 12: the first step of the control lands on 6, which is not it
    const { events } = await host(fraction({ fraction: '1/3' }));
    await step('increment');
    expect(screen.getByText('موش في بلاصتها: شوف الحساب.')).toBeOnTheScreen();
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({ correct: false });
    expect(FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload).calc).toBeUndefined();
    await step('increment');
    expect(screen.getByText('حطّيتها في بلاصتها.')).toBeOnTheScreen();
    expect(byName(events, 'finding')).toHaveLength(2);
    expect(byName(events, 'finding')[1]!.payload).toMatchObject({
      correct: true,
      calc: ['\\frac{1}{3} \\times 36 = 12'],
    });
    expect(byName(events, 'explored')).toHaveLength(1);
  });

  it('the control stops at the whole: a quantity cannot be placed above 36', async () => {
    const { events } = await host(fraction());
    await step('increment', 12);
    expect(names(events)).not.toContain('exceeds_whole');
    expect(screen.queryByTestId('part-over')).toBeNull();
  });

  it('the escape places the value for the student and shows the line; skipped, not correct', async () => {
    const { events } = await host(fraction());
    await fireEvent.press(screen.getByTestId('part-reveal'));
    expect(screen.getByTestId('part-calc')).toBeOnTheScreen();
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({ how: 'skipped', correct: null });
  });

  it('another quantity: 3/4 of 20 with 4 ticks', async () => {
    const { events } = await host(fraction({ whole: '20', fraction: '3/4', ticks: 4 }));
    await step('increment', 3);
    expect(byName(events, 'value_placed').at(-1)!.payload).toMatchObject({ value: '15', matches: true });
  });
});

describe('PartWholeBar: feedback', () => {
  it('"12 of 6": the bar, the arrow, the words and the dashed end; the value and its ratio; nothing about the right value', async () => {
    const { events } = await host(feedback());
    expect(screen.getByTestId('part-over')).toBeOnTheScreen();
    expect(flat('part-over').borderStyle).toBe('dashed');
    expect(screen.getByTestId('part-arrow')).toBeOnTheScreen();
    expect(screen.getByText('أكثر من الكلّ')).toBeOnTheScreen();
    expect(screen.getByTestId('part-calc')).toBeOnTheScreen();
    expect(screen.queryByTestId('part-slider')).toBeNull();
    expect(screen.queryByTestId('part-reveal')).toBeNull();
    // it asks nothing and logs nothing
    expect(events).toEqual([]);
    expect(countInteractive(screen.toJSON())).toBe(0);
  });

  it('a part inside the whole shows no overflow', async () => {
    await host(feedback({ part: '3' }));
    expect(screen.queryByTestId('part-over')).toBeNull();
    expect(screen.queryByTestId('part-arrow')).toBeNull();
    expect(screen.queryByText('أكثر من الكلّ')).toBeNull();
  });

  it('is not a gate (a readonly picture must never hold the lesson), unlike place and fraction_of_quantity', () => {
    expect(isGate('PartWholeBar', { whole: '6', mode: 'feedback', part: '12' })).toBe(false);
    expect(isGate('PartWholeBar', { whole: '6', mode: 'place' })).toBe(true);
    expect(isGate('PartWholeBar', { whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' })).toBe(true);
    expect(opensGate('PartWholeBar', 'explored')).toBe(true);
  });
});

describe('PartWholeBar: state, readonly, replay, targets', () => {
  it('the snapshot restores the placed value and the gate; a replay emits nothing and cannot be moved', async () => {
    const live = await host(place());
    await step('increment', 8);
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap.explored).toBe('done');
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={place()}
        defaultInstanceId="p2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('part-over')).toBeOnTheScreen();
    await step('decrement');
    expect(events).toEqual([]);
    expect(screen.getByTestId('part-over')).toBeOnTheScreen();
  });

  it('a garbled snapshot is ignored', async () => {
    await render(
      <ComponentHost
        spec={place()}
        defaultInstanceId="p3"
        mode="replay"
        snapshot={{ index: 'x' } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.queryByTestId('part-over')).toBeNull();
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host(bar({ whole: '0', mode: 'place' }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('at most 2 interactive elements (the control and the escape), far under 60', async () => {
    for (const s of [place(), fraction(), feedback()]) {
      const { unmount } = await render(
        <ComponentHost
          spec={s}
          defaultInstanceId="w"
          mode="interactive"
          onEvent={() => undefined}
          onError={() => undefined}
        />,
      );
      expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(2);
      expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
      await unmount();
    }
  });
});
