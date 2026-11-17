import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import i18n from '../../i18n';
import { ComponentHost, type ComponentHostProps } from '../ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentSpec,
  JsonObject,
} from '../contract';
import { isGate, isOfferedToPlanner, componentMeta } from '../registry';
import { MAX_INTERACTIVE, countInteractive } from './countInteractive';
import { ExploredPayloadSchema, FindingPayloadSchema } from './finding';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="t1"
      mode="readonly"
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
/** The string an SVG text draws. */
const drawn = (testID: string): string =>
  screen.getByTestId(testID).props.children.props.children;

const NOT_A = '\\overline{A}';
const NOT_F = '\\overline{F}';
const tree = (over: Record<string, JsonObject>, top: JsonObject = {}): ComponentSpec => ({
  component: 'ProbabilityTree',
  props: {
    ...top,
    branches: (
      [
        ['a', 'A'],
        ['na', NOT_A],
      ] as const
    ).map(([id, latex]) => ({
      id,
      latex,
      ...over[id],
      children: [
        { id: `${id}.f`, latex: 'F', ...over[`${id}.f`] },
        { id: `${id}.nf`, latex: NOT_F, ...over[`${id}.nf`] },
      ],
    })),
  },
});
const blank = { show: 'blank' };
const hidden = { show: 'hidden' };
const printed = (top: JsonObject = {}) =>
  tree(
    { a: { p: '2/3' }, 'a.f': { p: '1/4' }, 'a.nf': blank, na: blank, 'na.f': blank, 'na.nf': blank },
    top,
  );
const live = (top: JsonObject = {}) =>
  tree(
    {
      a: { p: '2/3' },
      'a.f': { p: '1/4' },
      'a.nf': hidden,
      na: { p: '1/3', show: 'found' },
      'na.f': hidden,
      'na.nf': hidden,
    },
    { compact: true, mark: ['a', 'a.f'], ask: 'a.nf', ...top },
  );
const counts = (top: JsonObject = {}) =>
  tree(
    {
      a: { count: 15 },
      'a.f': { count: 6 },
      'a.nf': { count: 9, countShow: 'hidden' },
      na: { count: 10 },
      'na.f': { count: 5 },
      'na.nf': { count: 5 },
    },
    { rootCount: 25, ...top },
  );
const full = (top: JsonObject = {}) =>
  tree(
    {
      a: { p: '2/3' },
      'a.f': { p: '1/4' },
      'a.nf': { p: '3/4' },
      na: { p: '1/3' },
      'na.f': { p: '1/2' },
      'na.nf': { p: '1/2' },
    },
    top,
  );
const LEAVES = ['a.f', 'a.nf', 'na.f', 'na.nf'];

describe('ProbabilityTree: the picture', () => {
  it('as printed: the two given values as stacked fractions, the labels with their bars, no "?" and no mark', async () => {
    const { errors, events } = await host(printed());
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getByTestId('probability-tree-t1')).toBeOnTheScreen();
    expect([drawn('tree-num-a'), drawn('tree-den-a')]).toEqual(['2', '3']);
    expect([drawn('tree-num-a.f'), drawn('tree-den-a.f')]).toEqual(['1', '4']);
    // nothing on the four branches the exam prints empty
    expect(screen.getAllByTestId(/^tree-value-/)).toHaveLength(2);
    expect(screen.queryByTestId(/^tree-unknown-/)).toBeNull();
    expect(screen.queryByTestId(/^tree-mark-/)).toBeNull();
    expect(screen.queryByTestId(/^tree-found-/)).toBeNull();
    expect(screen.getAllByTestId(/^tree-edge-/)).toHaveLength(6);
    expect(drawn('tree-label-a')).toBe('A');
    expect(drawn('tree-label-na')).toBe('A');
    expect(drawn('tree-label-na.nf')).toBe('F');
    expect(screen.getAllByTestId(/^tree-overline-/).map(n => n.props.testID)).toEqual([
      'tree-overline-a.nf',
      'tree-overline-na',
      'tree-overline-na.nf',
    ]);
  });

  it('hidden shows a "?" in a box; the one asked for is the emphasised one', async () => {
    await host(live());
    expect(screen.getAllByTestId(/^tree-unknown-/).map(n => n.props.testID)).toEqual([
      'tree-unknown-a.nf',
      'tree-unknown-na.f',
      'tree-unknown-na.nf',
    ]);
    expect(screen.getAllByTestId(/^tree-ask-/).map(n => n.props.testID)).toEqual(['tree-ask-a.nf']);
    // a hidden branch never draws the value, even when the picture knows it
    await host(
      tree({
        a: { p: '2/3' },
        'a.f': { p: '1/4' },
        'a.nf': { p: '3/4', show: 'hidden' },
        na: hidden,
        'na.f': hidden,
        'na.nf': hidden,
      }),
    );
    expect(screen.getByTestId('tree-unknown-a.nf')).toBeOnTheScreen();
    expect(screen.queryByTestId('tree-num-a.nf')).toBeNull();
  });

  it('a found value is marked as found (a tick, not a colour); a given one is not', async () => {
    await host(live());
    expect(screen.getAllByTestId(/^tree-found-/).map(n => n.props.testID)).toEqual(['tree-found-na']);
    expect([drawn('tree-num-na'), drawn('tree-den-na')]).toEqual(['1', '3']);
  });

  it('the branches of the current step carry the marker, the others do not', async () => {
    await host(live());
    expect(screen.getAllByTestId(/^tree-mark-/).map(n => n.props.testID)).toEqual([
      'tree-mark-a',
      'tree-mark-a.f',
    ]);
    await host(live({ mark: [] }));
    expect(screen.queryByTestId(/^tree-mark-/)).toBeNull();
  });

  it('counts mode: the count at the root and at each end, a "?" for a hidden count, no fraction anywhere', async () => {
    const { errors } = await host(counts());
    expect(errors).toEqual([]);
    expect(drawn('tree-root-count')).toBe('25');
    expect(drawn('tree-text-a')).toBe('15');
    expect(drawn('tree-text-a.f')).toBe('6');
    expect(drawn('tree-text-na.nf')).toBe('5');
    expect(screen.getAllByTestId(/^tree-count-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^tree-unknown-/).map(n => n.props.testID)).toEqual([
      'tree-unknown-a.nf',
    ]);
    expect(screen.queryByTestId(/^tree-(num|den|value)-/)).toBeNull();
    // outside counts mode there is no count
    await host(printed());
    expect(screen.queryByTestId('tree-root-count')).toBeNull();
    expect(screen.queryByTestId(/^tree-count-/)).toBeNull();
  });

  it('a whole number or a decimal is plain, with a French comma', async () => {
    await host(
      tree({
        a: { p: '0.25' },
        'a.f': { p: '1' },
        'a.nf': { p: '0' },
        na: { p: '0,75' },
        'na.f': hidden,
        'na.nf': hidden,
      }),
    );
    expect(drawn('tree-text-a')).toBe('0,25');
    expect(drawn('tree-text-a.f')).toBe('1');
    expect(drawn('tree-text-na')).toBe('0,75');
    expect(screen.queryByTestId(/^tree-num-/)).toBeNull();
  });

  it('one spoken label for the whole picture, "?" said as unknown', async () => {
    await host(live());
    const label: string = screen.getByTestId('tree-picture').props.accessibilityLabel;
    expect(label).toContain(i18n.t('pv2.tree.title'));
    expect(label).toContain('2/3');
    expect(label).toContain(i18n.t('pv2.tree.unknown'));
    expect(label).toContain(i18n.t('pv2.tree.asked'));
    expect(label).not.toContain('?');
  });

  it('the same props draw the same picture; it follows the width of its container', async () => {
    await host(printed());
    const first = JSON.stringify(screen.toJSON());
    await host(printed());
    expect(JSON.stringify(screen.toJSON())).toBe(first);
    const before: number = screen.getByTestId('tree-label-a.f').props.x[0];
    await fireEvent(screen.getByTestId('tree-box'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 232 } },
    });
    const after: number = screen.getByTestId('tree-label-a.f').props.x[0];
    expect(Number(after) - Number(before)).toBeCloseTo(70, 3);
  });
});

describe('ProbabilityTree: interactive', () => {
  it('shows the hint and one target per path end, nothing selected', async () => {
    const { events, errors } = await host(full(), { mode: 'interactive' });
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getByText(i18n.t('pv2.tree.hint'))).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^tree-leaf-/).map(n => n.props.testID)).toEqual(
      LEAVES.map(id => `tree-leaf-${id}`),
    );
    expect(screen.queryByTestId(/^tree-mark-/)).toBeNull();
    expect(screen.queryByTestId('tree-path')).toBeNull();
    expect(countInteractive(screen.toJSON())).toBe(4);
  });

  it('a tap on a path end emits path_selected, marks the path and writes its product (never the result)', async () => {
    const { events } = await host(full(), { mode: 'interactive' });
    await fireEvent.press(screen.getByTestId('tree-leaf-a.f'));
    expect(names(events)).toEqual(['path_selected']);
    expect(events[0]).toMatchObject({ component: 'ProbabilityTree', instanceId: 't1' });
    expect(events[0]!.payload).toEqual({ leaf: 'a.f', path: ['a', 'a.f'], known: true });
    expect(screen.getAllByTestId(/^tree-mark-/).map(n => n.props.testID)).toEqual([
      'tree-mark-a',
      'tree-mark-a.f',
    ]);
    expect(screen.getByText(i18n.t('pv2.tree.pathCaption'))).toBeOnTheScreen();
    // two fractions and a multiplication sign, read aloud: no equals sign, no 1/6
    expect(screen.getByTestId('tree-path').props.accessibilityLabel).toBe(
      '2 sur 3 fois 1 sur 4',
    );
    // another path: the marking moves
    await fireEvent.press(screen.getByTestId('tree-leaf-na.nf'));
    expect(events[1]!.payload).toEqual({ leaf: 'na.nf', path: ['na', 'na.nf'], known: true });
    expect(screen.getAllByTestId(/^tree-mark-/).map(n => n.props.testID)).toEqual([
      'tree-mark-na',
      'tree-mark-na.nf',
    ]);
  });

  it('a path with a hidden or blank branch: only the marking, no expression', async () => {
    const { events } = await host(printed(), { mode: 'interactive' });
    await fireEvent.press(screen.getByTestId('tree-leaf-a.nf'));
    expect(events[0]!.payload).toEqual({ leaf: 'a.nf', path: ['a', 'a.nf'], known: false });
    expect(screen.getAllByTestId(/^tree-mark-/)).toHaveLength(2);
    expect(screen.queryByTestId('tree-path')).toBeNull();
    await fireEvent.press(screen.getByTestId('tree-leaf-a.f'));
    expect(events[1]!.payload).toMatchObject({ leaf: 'a.f', known: true });
    expect(screen.getByTestId('tree-path')).toBeOnTheScreen();
  });

  it('explored and its finding once every path end was tapped, and only once', async () => {
    const { events } = await host(printed(), { mode: 'interactive' });
    for (const id of ['a.f', 'a.f', 'a.nf', 'na.f']) {
      await fireEvent.press(screen.getByTestId(`tree-leaf-${id}`));
    }
    expect(names(events)).toEqual(Array.from({ length: 4 }, () => 'path_selected'));
    await fireEvent.press(screen.getByTestId('tree-leaf-na.nf'));
    expect(names(events).slice(4)).toEqual(['path_selected', 'explored', 'finding']);
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'all_leaves',
      how: 'done',
    });
    expect(FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload)).toEqual({
      findingId: 'tree.paths',
      numbers: { leaves: '4', known: '1' },
      route: ['leaf:a.f', 'leaf:a.f', 'leaf:a.nf', 'leaf:na.f', 'leaf:na.nf'],
      how: 'found',
      correct: null,
    });
    await fireEvent.press(screen.getByTestId('tree-leaf-a.f'));
    expect(byName(events, 'explored')).toHaveLength(1);
    expect(byName(events, 'finding')).toHaveLength(1);
  });

  it('counts mode: a tap marks the path and writes no product', async () => {
    const { events } = await host(counts(), { mode: 'interactive' });
    await fireEvent.press(screen.getByTestId('tree-leaf-a.f'));
    expect(events[0]!.payload).toEqual({ leaf: 'a.f', path: ['a', 'a.f'], known: true });
    expect(screen.getAllByTestId(/^tree-mark-/)).toHaveLength(2);
    expect(screen.queryByTestId('tree-path')).toBeNull();
    expect(screen.queryByTestId('tree-path-slot')).toBeNull();
    await fireEvent.press(screen.getByTestId('tree-leaf-a.nf'));
    expect(events[1]!.payload).toMatchObject({ known: false });
  });

  it('the largest tree stays under the limit of interactive elements', async () => {
    const big: ComponentSpec = {
      component: 'ProbabilityTree',
      props: {
        branches: ['a', 'b', 'c', 'd'].map(x => ({
          id: x,
          latex: x.toUpperCase(),
          p: '1/4',
          children: ['e', 'f', 'g', 'h'].map(y => ({
            id: `${x}.${y}`,
            latex: y.toUpperCase(),
            p: '1/4',
          })),
        })),
      },
    };
    const { errors } = await host(big, { mode: 'interactive' });
    expect(errors).toEqual([]);
    expect(countInteractive(screen.toJSON())).toBe(16);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
  });
});

describe('ProbabilityTree: readonly, replay, state', () => {
  it('readonly: no touch target, no hint, no event', async () => {
    const { events } = await host(full());
    expect(screen.queryByTestId(/^tree-leaf-/)).toBeNull();
    expect(screen.queryByText(i18n.t('pv2.tree.hint'))).toBeNull();
    expect(screen.queryByTestId('tree-path-slot')).toBeNull();
    expect(countInteractive(screen.toJSON())).toBe(0);
    expect(events).toEqual([]);
  });

  it('the snapshot holds the selected path end; a replay draws it and emits nothing', async () => {
    const shown = await host(full(), { mode: 'interactive' });
    expect(shown.ref.current!.getStateSnapshot()).toEqual({
      selected: null,
      tapped: [],
      explored: null,
    });
    await fireEvent.press(screen.getByTestId('tree-leaf-na.f'));
    await fireEvent.press(screen.getByTestId('tree-leaf-a.f'));
    const snap = shown.ref.current!.getStateSnapshot();
    expect(snap).toEqual({ selected: 'a.f', tapped: ['na.f', 'a.f'], explored: null });

    const replay = await host(full(), { mode: 'replay', snapshot: snap });
    expect(replay.events).toEqual([]);
    expect(replay.errors).toEqual([]);
    expect(screen.getAllByTestId(/^tree-mark-/).map(n => n.props.testID)).toEqual([
      'tree-mark-a',
      'tree-mark-a.f',
    ]);
    expect(screen.getByTestId('tree-path')).toBeOnTheScreen();
    expect(screen.queryByTestId(/^tree-leaf-/)).toBeNull();
    expect(countInteractive(screen.toJSON())).toBe(0);
    expect(replay.ref.current!.getStateSnapshot()).toEqual(snap);
  });

  it('a snapshot that names no path end of this tree is ignored', async () => {
    for (const snapshot of [
      { selected: 'zz', tapped: [], explored: null },
      { selected: 'a', tapped: [], explored: null },
      { selected: 3 },
    ] as JsonObject[]) {
      const { errors } = await host(full(), { mode: 'replay', snapshot });
      expect(errors).toEqual([]);
      expect(screen.queryByTestId(/^tree-mark-/)).toBeNull();
      expect(screen.queryByTestId('tree-path')).toBeNull();
    }
  });

  it('invalid props fall back through the host, never crash', async () => {
    for (const bad of [
      tree({ a: { p: '2/3' }, na: { p: '2/3' }, 'a.f': hidden, 'a.nf': hidden, 'na.f': hidden, 'na.nf': hidden }),
      tree({ a: {}, na: hidden, 'a.f': hidden, 'a.nf': hidden, 'na.f': hidden, 'na.nf': hidden }),
      printed({ mark: ['zz'] }),
      { component: 'ProbabilityTree', props: {} } as ComponentSpec,
    ]) {
      const { errors, events } = await host(bad);
      expect(errors).toHaveLength(1);
      expect(errors[0]!.slice(0, 2)).toEqual(['ProbabilityTree', 'invalid_props']);
      expect(events).toEqual([]);
      expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
      expect(screen.queryByTestId('tree-picture')).toBeNull();
    }
  });

  it('is registered as a lesson-only picture: no gate, not offered to the planner', () => {
    const meta = componentMeta('ProbabilityTree');
    expect(meta?.kind).toBe('visual');
    expect(isOfferedToPlanner(meta)).toBe(false);
    // a read-only tree asks nothing, so it never holds the lesson
    expect(isGate('ProbabilityTree', {})).toBe(false);
  });
});
