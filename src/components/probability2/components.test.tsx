import React, { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import '../../i18n';
import {
  ComponentHost,
  type ComponentHostProps,
} from '../ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentSpec,
} from '../contract';
import { isGate, opensGate } from '../registry';
import { countInteractive, MAX_INTERACTIVE } from './countInteractive';
import { ExploredPayloadSchema, FindingPayloadSchema } from './finding';

const rn = (r: number, n: number) => [
  ...Array.from({ length: r }, (_, i) => ({ id: `r${i + 1}`, value: 1, color: 'red' as const })),
  ...Array.from({ length: n }, (_, i) => ({ id: `n${i + 1}`, value: 0, color: 'black' as const })),
];

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
      defaultInstanceId="c1"
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

const boxesSpec = (over: Record<string, unknown> = {}): ComponentSpec => ({
  component: 'GroupBoxes',
  props: { balls: rn(2, 3), k: 3, ...over },
});
const choiceSpec = (over: Record<string, unknown> = {}): ComponentSpec => ({
  component: 'ChoiceProduct',
  props: {
    stages: [{ balls: rn(3, 0), size: 1 }, { balls: rn(0, 4), size: 2 }],
    ...over,
  },
});

describe('GroupBoxes', () => {
  it('shows the 10 boxes of the twin, none expanded, with the gate hint and the escape', async () => {
    const { errors } = await host(boxesSpec());
    expect(errors).toEqual([]);
    expect(screen.getByTestId('group-boxes-c1')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^group-box-[a-z0-9-]+$/)).toHaveLength(10);
    expect(screen.queryByTestId(/^group-orderings-/)).toBeNull();
    expect(screen.getByText('اضغط على علبة باش تشوف الترتيبات متاعها.')).toBeOnTheScreen();
    expect(screen.getByTestId('group-reveal')).toBeOnTheScreen();
  });

  it('tapping a box opens its 6 orderings (one box at a time) and opens the gate once', async () => {
    const { events } = await host(boxesSpec());
    await fireEvent.press(screen.getByTestId('group-box-r1-r2-n1'));
    expect(screen.getAllByTestId(/^group-order-r1-r2-n1-\d$/)).toHaveLength(6);
    // the engine's own calculation, written out
    expect(screen.getByTestId('group-calc')).toBeOnTheScreen();
    expect(names(events)).toEqual(['box_expanded', 'explored', 'finding']);
    expect(events[0]!.payload).toMatchObject({ key: 'r1-r2-n1', orderings: 6 });
    const explored = byName(events, 'explored')[0]!.payload;
    expect(ExploredPayloadSchema.parse(explored)).toEqual({ why: 'box_expanded', how: 'done' });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'groupboxes.orderings_per_box',
      numbers: { boxes: '10', perBox: '6', ordered: '60' },
      route: ['expand:r1-r2-n1'],
      how: 'found',
      correct: null,
      calc: ['10 \\times 6 = 60', 'C_{5}^{3} = 10'],
    });
    // a second box: the first closes, nothing more opens the gate
    await fireEvent.press(screen.getByTestId('group-box-r1-n2-n3'));
    expect(screen.queryByTestId('group-orderings-r1-r2-n1')).toBeNull();
    expect(screen.getAllByTestId(/^group-order-r1-n2-n3-\d$/)).toHaveLength(6);
    expect(names(events)).toEqual(['box_expanded', 'explored', 'finding', 'box_expanded']);
    // the same box again folds it back
    await fireEvent.press(screen.getByTestId('group-box-r1-n2-n3'));
    expect(screen.queryByTestId('group-orderings-r1-n2-n3')).toBeNull();
  });

  it('the escape (change 2): "I do not know, show me" opens a box, logs how: skipped, and the gate opens', async () => {
    const { events } = await host(boxesSpec());
    await fireEvent.press(screen.getByTestId('group-reveal'));
    expect(names(events)).toEqual(['explored', 'finding']);
    expect(ExploredPayloadSchema.parse(events[0]!.payload)).toEqual({ why: 'reveal', how: 'skipped' });
    expect(events[1]!.payload).toMatchObject({ how: 'skipped', correct: null });
    expect(screen.getAllByTestId(/^group-order-/)).toHaveLength(6);
    expect(screen.queryByTestId('group-reveal')).toBeNull(); // used once
    expect(opensGate('GroupBoxes', 'explored')).toBe(true);
    expect(isGate('GroupBoxes')).toBe(true);
  });

  it('the real urn: one mixed box, always open, never tappable; 120 boxes are never put on screen; another box is one tap', async () => {
    const { events } = await host(boxesSpec({ balls: rn(4, 6), k: 3 }));
    expect(screen.queryAllByTestId(/^group-box-/)).toHaveLength(1);
    // red and black balls: r1 r2 n1, not the all-red first box of the urn
    const box = screen.getByTestId('group-box-r1-r2-n1');
    expect(box.props.accessibilityRole).not.toBe('button');
    expect(screen.getAllByTestId(/^group-order-r1-r2-n1-\d$/)).toHaveLength(6);
    // the hint says what to do here: another box, not "tap a box"
    expect(screen.getByText('اضغط على علبة أخرى باش تشوف علبة ثانية.')).toBeOnTheScreen();
    expect(screen.queryByText('اضغط على علبة باش تشوف الترتيبات متاعها.')).toBeNull();
    // pressing the open box does nothing
    await fireEvent.press(box);
    expect(events).toEqual([]);
    await fireEvent.press(screen.getByTestId('group-next'));
    expect(names(events)).toEqual(['next_box', 'explored', 'finding']);
    expect(screen.queryAllByTestId(/^group-box-/)).toHaveLength(1);
    expect(screen.getByTestId('group-box-r1-r2-n2')).toBeOnTheScreen();
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      numbers: { boxes: '120', perBox: '6', ordered: '720' },
    });
  });

  it('a property splits the boxes in a slice bar: 20, 60, 36, 4; tapping a slice lists some of its boxes', async () => {
    const { events } = await host(boxesSpec({ balls: rn(4, 6), groupBy: { property: { value: 1 } } }));
    expect(screen.getAllByTestId(/^slice-/)).toHaveLength(4);
    // the slice of exactly one red: label 1, count 60
    expect(within(screen.getByTestId('slice-1')).getByText('60')).toBeOnTheScreen();
    expect(within(screen.getByTestId('slice-0')).getByText('20')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('slice-1'));
    expect(screen.getAllByTestId(/^group-box-/).length).toBeLessThanOrEqual(6);
    expect(names(events)).toEqual(['slice_selected', 'explored', 'finding']);
    expect(events[0]!.payload).toMatchObject({ j: 1, count: 60 });
    // the footer says what the slices add up to, not "boxes x orderings"
    expect(screen.getByText('مجموع العلب في الأجزاء الكل:')).toBeOnTheScreen();
    expect(screen.queryByText(/عدد العلب في عدد الترتيبات/)).toBeNull();
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      findingId: 'groupboxes.slices',
      numbers: { total: '120', slice0: '20', slice1: '60', slice2: '36', slice3: '4' },
    });
  });

  it('readonly and replay: the recorded state is shown, nothing can be tapped, nothing is emitted', async () => {
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={boxesSpec()}
        defaultInstanceId="c1"
        mode="replay"
        onEvent={e => events.push(e)}
        onError={() => undefined}
        snapshot={{ expanded: 'r1-r2-n1', slice: null, sample: 0, explored: 'done' }}
      />,
    );
    expect(screen.getAllByTestId(/^group-order-r1-r2-n1-\d$/)).toHaveLength(6);
    await fireEvent.press(screen.getByTestId('group-box-r1-n2-n3'));
    expect(events).toEqual([]);
    expect(screen.queryByTestId('group-reveal')).toBeNull();
  });

  it('getStateSnapshot returns what the replay needs', async () => {
    const { ref } = await host(boxesSpec());
    await fireEvent.press(screen.getByTestId('group-box-r1-r2-n1'));
    expect(ref.current?.getStateSnapshot()).toMatchObject({ expanded: 'r1-r2-n1', explored: 'done' });
  });

  it('invalid props give the host fallback, not a crash (k = 2 as a teaching example)', async () => {
    const { errors } = await host(boxesSpec({ k: 2 }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('every box has a spoken label naming its balls', async () => {
    await host(boxesSpec());
    expect(screen.getByTestId('group-box-r1-r2-n1').props.accessibilityLabel).toMatch(/^علبة فيها/);
  });

  it('worst case stays under 60 interactive elements: 6 balls, k = 3 (20 boxes), one open', async () => {
    await host(boxesSpec({ balls: rn(3, 3), mode: 'show_all' }));
    await fireEvent.press(screen.getAllByTestId(/^group-box-/)[0]!);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    expect(countInteractive(screen.toJSON())).toBeGreaterThanOrEqual(20);
  });
});

describe('ChoiceProduct', () => {
  it('lists the chips of each stage: 3 reds, and the 6 pairs of 4 blacks', async () => {
    const { errors } = await host(choiceSpec());
    expect(errors).toEqual([]);
    expect(screen.getAllByTestId(/^choice-option-0-\d+$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/^choice-option-1-\d+$/)).toHaveLength(6);
    expect(screen.getByText('اختار خيار من كل مرحلة.')).toBeOnTheScreen();
    // stage names are words: a digit never shares a line with Arabic words
    expect(screen.getByText('المرحلة الأولى')).toBeOnTheScreen();
    expect(screen.getByText('المرحلة الثانية')).toBeOnTheScreen();
    expect(screen.queryByTestId('choice-calc')).toBeNull(); // the count is not written before the picks
  });

  it('picking one option in each stage lights the cell, writes the product, and opens the gate once', async () => {
    const { events } = await host(choiceSpec());
    await fireEvent.press(screen.getByTestId('choice-option-0-1'));
    expect(names(events)).toEqual(['option_picked']);
    expect(screen.queryByTestId('choice-calc')).toBeNull();
    await fireEvent.press(screen.getByTestId('choice-option-1-4'));
    expect(names(events)).toEqual(['option_picked', 'option_picked', 'explored', 'finding']);
    expect(screen.getByTestId('choice-cell-1-4')).toBeOnTheScreen();
    expect(screen.getByTestId('choice-calc')).toBeOnTheScreen();
    expect(events[0]!.payload).toMatchObject({ stage: 0, option: 1 });
    expect(ExploredPayloadSchema.parse(events[2]!.payload)).toEqual({ why: 'both_stages', how: 'done' });
    const f = FindingPayloadSchema.parse(events[3]!.payload);
    expect(f).toMatchObject({
      findingId: 'choiceproduct.and',
      numbers: { stage1: '3', stage2: '6', total: '18' },
      route: ['pick:1:1', 'pick:2:4'],
      how: 'found',
      calc: ['C_{4}^{2} = 6', '3 \\times 6 = 18'],
    });
  });

  it('the grid is rows x columns: 3 x 6 cells, display only', async () => {
    await host(choiceSpec());
    expect(screen.getAllByTestId(/^choice-cell-\d+-\d+$/)).toHaveLength(18);
  });

  it('switching to OR shows the sum bar (3 + 6 = 9), logs mode_switched, and the finding keeps both counts', async () => {
    const { events } = await host(choiceSpec());
    await fireEvent.press(screen.getByTestId('choice-option-0-0'));
    await fireEvent.press(screen.getByTestId('choice-option-1-0'));
    await fireEvent.press(screen.getByTestId('choice-mode-or'));
    expect(byName(events, 'mode_switched')[0]!.payload).toEqual({ mode: 'or' });
    expect(screen.getAllByTestId(/^slice-/)).toHaveLength(2);
    expect(screen.queryAllByTestId(/^choice-cell-/)).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('choice-mode-and'));
    expect(screen.getAllByTestId(/^choice-cell-/)).toHaveLength(18);
  });

  it('a student who switches before picking: the finding is written in the mode they ended in', async () => {
    const { events } = await host(choiceSpec());
    await fireEvent.press(screen.getByTestId('choice-mode-or'));
    await fireEvent.press(screen.getByTestId('choice-option-0-0'));
    await fireEvent.press(screen.getByTestId('choice-option-1-0'));
    const f = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(f.findingId).toBe('choiceproduct.or');
    expect(f.numbers.total).toBe('9');
    expect(f.route).toEqual(['switch:or', 'pick:1:0', 'pick:2:0']);
  });

  it('the escape (change 2): show me picks the first option of each stage and logs how: skipped', async () => {
    const { events } = await host(choiceSpec());
    await fireEvent.press(screen.getByTestId('choice-reveal'));
    expect(names(events)).toEqual(['explored', 'finding']);
    expect(ExploredPayloadSchema.parse(events[0]!.payload)).toEqual({ why: 'reveal', how: 'skipped' });
    expect(events[1]!.payload).toMatchObject({ how: 'skipped', correct: null });
    expect(screen.getByTestId('choice-cell-0-0')).toBeOnTheScreen();
    expect(screen.queryByTestId('choice-reveal')).toBeNull();
    expect(isGate('ChoiceProduct')).toBe(true);
  });

  it('allowSwitch false: no toggle', async () => {
    await host(choiceSpec({ allowSwitch: false }));
    expect(screen.queryByTestId('choice-mode-or')).toBeNull();
  });

  it('readonly: a recorded pick is shown, taps do nothing', async () => {
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={choiceSpec()}
        defaultInstanceId="c1"
        mode="readonly"
        onEvent={e => events.push(e)}
        onError={() => undefined}
        snapshot={{ picks: [2, 5], mode: 'and', explored: 'done' }}
      />,
    );
    expect(screen.getByTestId('choice-calc')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('choice-option-0-0'));
    expect(events).toEqual([]);
  });

  it('snapshot round trip', async () => {
    const { ref } = await host(choiceSpec());
    await fireEvent.press(screen.getByTestId('choice-option-0-2'));
    await fireEvent.press(screen.getByTestId('choice-option-1-5'));
    expect(ref.current?.getStateSnapshot()).toEqual({
      picks: [2, 5],
      mode: 'and',
      explored: 'done',
    });
  });

  it('the real step (4 reds, 15 pairs): 4 + 15 chips, a 60-cell picture, 19 interactive elements at most plus toggles', async () => {
    await host({
      component: 'ChoiceProduct',
      props: { stages: [{ balls: rn(4, 0), size: 1 }, { balls: rn(0, 6), size: 2 }] },
    });
    expect(screen.getAllByTestId(/^choice-option-/)).toHaveLength(19);
    expect(screen.getAllByTestId(/^choice-cell-\d+-\d+$/)).toHaveLength(60);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
  });

  it('the non-session parameterisation: three starters x four mains = 12, with labels', async () => {
    const { events } = await host({
      component: 'ChoiceProduct',
      props: {
        stages: [
          { labels: ['soup', 'salad', 'egg'], size: 1 },
          { labels: ['fish', 'beef', 'rice', 'pie'], size: 1 },
        ],
      },
    });
    await fireEvent.press(screen.getByTestId('choice-option-0-0'));
    await fireEvent.press(screen.getByTestId('choice-option-1-3'));
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      numbers: { stage1: '3', stage2: '4', total: '12' },
      calc: ['3 \\times 4 = 12'],
    });
  });

  it('invalid props (2 x 2, meant to tell sum from product) give the fallback', async () => {
    const { errors } = await host({
      component: 'ChoiceProduct',
      props: {
        stages: [
          { labels: ['a', 'b'], size: 1 },
          { labels: ['c', 'd'], size: 1 },
        ],
      },
    });
    expect(errors).toHaveLength(1);
  });

  it('spoken labels for the chips name their items', async () => {
    await host(choiceSpec());
    expect(screen.getByTestId('choice-option-1-0').props.accessibilityLabel).toMatch(/^الخيار:/);
  });
});
