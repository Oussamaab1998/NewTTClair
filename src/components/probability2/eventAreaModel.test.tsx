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
import { EventAreaModelPropsSchema } from './schemas';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="a1"
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

const area = (props: JsonObject): ComponentSpec => ({ component: 'EventAreaModel', props });
const urn = (over: JsonObject = {}) =>
  area({
    source: { kind: 'urn', reds: 4, blacks: 6, k: 3 },
    events: [
      { id: 'A', label: 'A', slices: ['s1'] },
      { id: 'B', label: 'B', slices: ['s0'] },
    ],
    overlays: ['complement', 'intersection', 'union', 'conditional'],
    ...over,
  });

describe('EventAreaModel props', () => {
  const ok = (p: unknown) => EventAreaModelPropsSchema.safeParse(p);

  it('accepts the demo cases', () => {
    expect(ok(urn().props).success).toBe(true);
    expect(
      ok({
        source: { kind: 'authored', slices: [1, 2, 3, 4, 5, 6].map(i => ({ id: `d${i}`, label: String(i), count: 1 })) },
        events: [{ id: 'A', label: 'A', slices: ['d2', 'd4', 'd6'] }, { id: 'B', label: 'B', slices: ['d5', 'd6'] }],
      }).success,
    ).toBe(true);
  });

  it('defaults: the complement, counts', () => {
    expect(EventAreaModelPropsSchema.parse({ ...urn().props, overlays: undefined })).toMatchObject({
      overlays: ['complement'],
      labels: 'counts',
    });
  });

  it('an event needs real slices with draws in them; ids are unique', () => {
    const base = urn().props as Record<string, unknown>;
    expect(ok({ ...base, events: [{ id: 'A', label: 'A', slices: ['s9'] }] }).success).toBe(false);
    expect(ok({ ...base, events: [{ id: 'A', label: 'A', slices: ['s1', 's1'] }] }).success).toBe(false);
    expect(
      ok({ ...base, events: [{ id: 'A', label: 'A', slices: ['s1'] }, { id: 'A', label: 'B', slices: ['s0'] }] }).success,
    ).toBe(false);
    // 1 red among 3 drawn from 1 red and 1 black cannot be: an empty event
    expect(
      ok({
        source: { kind: 'urn', reds: 1, blacks: 3, k: 2 },
        events: [{ id: 'A', label: 'A', slices: ['s2'] }],
      }).success,
    ).toBe(false);
  });

  it('intersection and union need two events', () => {
    const one = [{ id: 'A', label: 'A', slices: ['s1'] }];
    expect(ok({ ...(urn().props as object), events: one, overlays: ['union'] }).success).toBe(false);
    expect(ok({ ...(urn().props as object), events: one, overlays: ['complement', 'conditional'] }).success).toBe(true);
  });

  it('an urn too big to count by formula, or k above its size, is refused', () => {
    expect(ok({ source: { kind: 'urn', reds: 1, blacks: 1, k: 3 }, events: [{ id: 'A', label: 'A', slices: ['s1'] }] }).success).toBe(false);
  });
});

describe('EventAreaModel: the 4R6N urn', () => {
  it('shows the four slices (20, 60, 36, 4), the total 120, the events, and no result yet', async () => {
    const { errors, events } = await host(urn());
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getByTestId('area-slice-s0')).toHaveTextContent(/20/);
    expect(screen.getByTestId('area-slice-s1')).toHaveTextContent(/60/);
    expect(screen.getByTestId('area-slice-s2')).toHaveTextContent(/36/);
    expect(screen.getByTestId('area-slice-s3')).toHaveTextContent(/4/);
    expect(screen.getByTestId('area-total')).toBeOnTheScreen();
    expect(screen.queryByTestId('area-result')).toBeNull();
    expect(screen.getByTestId('area-reveal')).toBeOnTheScreen();
    // a view needs an event first
    expect(screen.getByTestId('area-overlay-complement').props.accessibilityState.disabled).toBe(true);
  });

  it('the complement of A is 20 + 36 + 4 = 60 draws, and with B chosen too it says it is not B', async () => {
    const { events } = await host(urn());
    await fireEvent.press(screen.getByTestId('area-event-A'));
    await fireEvent.press(screen.getByTestId('area-overlay-complement'));
    expect(screen.getByTestId('area-result')).toBeOnTheScreen();
    expect(screen.queryByTestId('area-compare')).toBeNull();
    // the three slices of the complement are marked, with a shape
    expect(screen.getByTestId('area-slice-s0')).toHaveTextContent(/○/);
    expect(screen.getByTestId('area-slice-s1')).toHaveTextContent(/●/);
    expect(screen.getByTestId('area-slice-s2')).toHaveTextContent(/○/);
    await fireEvent.press(screen.getByTestId('area-event-B'));
    expect(screen.getByTestId('area-compare')).toBeOnTheScreen();
    expect(byName(events, 'event_selected').map(e => e.payload)).toEqual([
      { ids: ['A'] },
      { ids: ['A', 'B'] },
    ]);
    expect(byName(events, 'overlay_selected').map(e => e.payload)).toEqual([
      { overlay: 'complement', valid: true },
    ]);
  });

  it('the complement is drawn whole: a slice that is also the second event is dashed too (the mark wins over the light)', async () => {
    await host(urn());
    await fireEvent.press(screen.getByTestId('area-event-A'));
    await fireEvent.press(screen.getByTestId('area-event-B'));
    await fireEvent.press(screen.getByTestId('area-overlay-complement'));
    // the complement of A: slices 0 (which is B), 2 and 3, all hollow marks; A itself, slice 1, is the one lit
    for (const k of ['s0', 's2', 's3']) {
      expect(screen.getByTestId(`area-slice-${k}`)).toHaveTextContent(/\u25cb/);
    }
    expect(screen.getByTestId('area-slice-s1')).toHaveTextContent(/\u25cf/);
    expect(screen.getByTestId('area-slice-s0')).not.toHaveTextContent(/\u25cf/);
  });

  it('intersection and union wait for two events; with A and B: no common draw, and 20 + 60 = 80 in the union', async () => {
    await host(urn());
    await fireEvent.press(screen.getByTestId('area-event-A'));
    expect(screen.getByTestId('area-overlay-union').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('area-event-B'));
    await fireEvent.press(screen.getByTestId('area-overlay-intersection'));
    expect(screen.getByTestId('area-result')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('area-overlay-union'));
    expect(JSON.stringify(screen.toJSON())).toContain('80 sur 120');
  });

  it('the conditional zooms into the first event: only its slices are drawn again', async () => {
    await host(urn());
    await fireEvent.press(screen.getByTestId('area-event-A'));
    await fireEvent.press(screen.getByTestId('area-overlay-conditional'));
    expect(screen.getByTestId('area-zoom-s1')).toBeOnTheScreen();
    expect(screen.queryByTestId('area-zoom-s0')).toBeNull();
  });

  it('two events at most: a third selection drops the oldest', async () => {
    await host(
      urn({
        events: [
          { id: 'A', label: 'A', slices: ['s1'] },
          { id: 'B', label: 'B', slices: ['s0'] },
          { id: 'C', label: 'C', slices: ['s2', 's3'] },
        ],
      }),
    );
    for (const id of ['A', 'B', 'C']) {
      await fireEvent.press(screen.getByTestId(`area-event-${id}`));
    }
    expect(screen.getByTestId('area-event-A').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('area-event-C').props.accessibilityState.selected).toBe(true);
  });

  it('two different views open the gate; the finding holds the numbers and the engine lines', async () => {
    const { events } = await host(urn());
    await fireEvent.press(screen.getByTestId('area-event-A'));
    await fireEvent.press(screen.getByTestId('area-event-B'));
    await fireEvent.press(screen.getByTestId('area-overlay-complement'));
    expect(names(events)).not.toContain('explored');
    await fireEvent.press(screen.getByTestId('area-overlay-union'));
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'overlays_tried',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'area.events',
      numbers: { total: '120', a: '60', complement: '60', b: '20' },
      how: 'found',
    });
    expect(finding.calc).toEqual(['20 + 36 + 4 = 60', '\\frac{60}{120} = \\frac{1}{2}']);
    expect(screen.queryByTestId('area-reveal')).toBeNull();
  });

  it('one offered view opens the gate at the first valid use', async () => {
    const { events } = await host(urn({ overlays: ['complement'] }));
    await fireEvent.press(screen.getByTestId('area-event-A'));
    await fireEvent.press(screen.getByTestId('area-overlay-complement'));
    expect(names(events)).toContain('explored');
  });

  it('labels as probabilities: 1/6, 1/2, 3/10, 1/30', async () => {
    await host(urn({ labels: 'probabilities' }));
    expect(screen.getByTestId('area-slice-s0')).toHaveTextContent(/1\/6/);
    expect(screen.getByTestId('area-slice-s1')).toHaveTextContent(/1\/2/);
    expect(screen.getByTestId('area-slice-s2')).toHaveTextContent(/3\/10/);
    expect(screen.getByTestId('area-slice-s3')).toHaveTextContent(/1\/30/);
  });

  it('the escape lights the first event and its first view, opens the gate as skipped', async () => {
    const { events } = await host(urn());
    await fireEvent.press(screen.getByTestId('area-reveal'));
    expect(screen.getByTestId('area-result')).toBeOnTheScreen();
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
  });

  it('every chip is a 44 pt target both ways', async () => {
    await host(urn());
    const s = Object.assign({}, ...[screen.getByTestId('area-event-A').props.style].flat(2).filter(Boolean)) as {
      minWidth: number;
      minHeight: number;
    };
    expect(s.minWidth).toBeGreaterThanOrEqual(44);
    expect(s.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('EventAreaModel: state, readonly, replay, limits', () => {
  it('the snapshot restores the events, the view and the gate; a replay emits nothing', async () => {
    const live = await host(urn());
    await fireEvent.press(screen.getByTestId('area-event-A'));
    await fireEvent.press(screen.getByTestId('area-overlay-complement'));
    await fireEvent.press(screen.getByTestId('area-overlay-conditional'));
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap).toMatchObject({ selected: ['A'], overlay: 'conditional', explored: 'done' });
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={urn()}
        defaultInstanceId="a2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('area-zoom-s1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('area-event-B'));
    expect(events).toEqual([]);
  });

  it('a garbled snapshot is ignored', async () => {
    await render(
      <ComponentHost
        spec={urn()}
        defaultInstanceId="a3"
        mode="replay"
        snapshot={{ selected: ['Z'] } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.queryByTestId('area-result')).toBeNull();
  });

  it('is a gate by event name', () => {
    expect(isGate('EventAreaModel', {})).toBe(true);
    expect(opensGate('EventAreaModel', 'explored')).toBe(true);
    expect(opensGate('EventAreaModel', 'overlay_selected')).toBe(false);
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host(area({ source: { kind: 'urn', reds: 1, blacks: 1, k: 3 }, events: [] }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('few interactive elements: events, views, the escape', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={urn()}
        defaultInstanceId="w"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(countInteractive(screen.toJSON())).toBe(2 + 4 + 1);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });
});
