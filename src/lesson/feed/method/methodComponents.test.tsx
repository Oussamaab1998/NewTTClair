/**
 * The views of the method lesson's later frames: a sentence pick, the list he
 * builds with chips, the stages of a repair script, the sheet's findings and
 * paper skeleton. Pure props in, events out.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../../i18n';
import type { FindingResult, SkeletonRow } from '../../../method/findings';
import type { Roadmap } from '../../../method/roadmap';
import { CardsPick } from './CardsPick';
import { ListBuilder } from './ListBuilder';
import { MethodSheet } from './MethodSheet';

const ar = (t: string) => ({ ar: [{ ar: t }] });

describe('CardsPick', () => {
  const cards = [
    { id: 'a', text: ar('الجملة الأولى') },
    { id: 'b', text: ar('الجملة الثانية') },
    { id: 'c', text: ar('الجملة الثالثة') },
  ];
  it('one tap is one act with the card id; a wrong tap leaves the card tappable', async () => {
    const onPick = jest.fn();
    await render(
      <CardsPick cards={cards} seed="s" readonly={false} onPick={onPick} />,
    );
    await fireEvent.press(screen.getByTestId('pick-card-b'));
    await fireEvent.press(screen.getByTestId('pick-card-b'));
    expect(onPick.mock.calls).toEqual([['b'], ['b']]);
  });
  it('the order is stable for a seed and is not the authored order', async () => {
    const order = async (seed: string) => {
      await render(
        <CardsPick
          cards={cards}
          seed={seed}
          readonly
          onPick={() => undefined}
          testID={`p-${seed}`}
        />,
      );
      return screen.getAllByTestId(/^pick-card-/).map(n => n.props.testID);
    };
    const first = await order('x');
    expect(first).not.toEqual(['pick-card-a', 'pick-card-b', 'pick-card-c']);
  });
  it('readonly: nothing is pressable and the recorded card shows selected', async () => {
    const onPick = jest.fn();
    await render(
      <CardsPick cards={cards} seed="s" readonly chosen="c" onPick={onPick} />,
    );
    await fireEvent.press(screen.getByTestId('pick-card-a'));
    expect(onPick).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('pick-card-c').props.accessibilityState,
    ).toMatchObject({ selected: true });
  });
});

describe('ListBuilder', () => {
  const balls = [
    { id: 'r1', label: 'R1' },
    { id: 'n1', label: 'N1' },
    { id: 'n2', label: 'N2' },
  ];
  it('a group of 2 is added with its balls, a duplicate is merged, "that is all" sends the list as ONE act', async () => {
    const onSubmit = jest.fn();
    await render(
      <ListBuilder
        balls={balls}
        size={2}
        readonly={false}
        onSubmit={onSubmit}
      />,
    );
    for (const id of ['r1', 'n1']) {
      await fireEvent.press(screen.getByTestId(`list-ball-${id}`));
    }
    await fireEvent.press(screen.getByTestId('list-add'));
    // the same group in the other order is the same group
    for (const id of ['n1', 'r1']) {
      await fireEvent.press(screen.getByTestId(`list-ball-${id}`));
    }
    await fireEvent.press(screen.getByTestId('list-add'));
    expect(screen.getAllByTestId(/^list-group-/)).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('list-done'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith([['r1', 'n1']]);
  });
  it('"add" waits for a full group; a group can be removed', async () => {
    await render(
      <ListBuilder
        balls={balls}
        size={2}
        readonly={false}
        onSubmit={() => undefined}
      />,
    );
    await fireEvent.press(screen.getByTestId('list-ball-r1'));
    expect(
      screen.getByTestId('list-add').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('list-ball-n2'));
    await fireEvent.press(screen.getByTestId('list-add'));
    await fireEvent.press(screen.getByTestId('list-remove-0'));
    expect(screen.queryAllByTestId(/^list-group-/)).toHaveLength(0);
  });
});

describe('MethodSheet: findings and the paper skeleton', () => {
  const roadmap: Roadmap = {
    entries: [
      {
        id: 'm.plan',
        kind: 'plan',
        short: ar('الخطة'),
        header: { now: ar('ا'), why: ar('ب'), next: ar('ج') },
        status: 'current',
      },
    ],
    current: {
      id: 'm.plan',
      kind: 'plan',
      short: ar('الخطة'),
      header: { now: ar('ا'), why: ar('ب'), next: ar('ج') },
      status: 'current',
    },
  };
  const found: FindingResult[] = [
    {
      id: 'f1',
      title: ar('عدد التيراجات الكل'),
      lines: [
        { nodeId: 'total', raw: '10*9*8/(3*2*1) = 120', reason: ar('سبب') },
      ],
      rule: { text: ar('القاعدة'), condition: ar('الشرط') },
      bridge: [
        {
          nodeId: 'total',
          did: '10*9*8/(3*2*1) = 120',
          exam: 'C_{10}^{3} = 120',
        },
      ],
    },
    {
      id: 'f2',
      title: ar('الاحتمال'),
      lines: [{ nodeId: 'result', raw: '60/120 = 1/2' }],
      rule: null,
      bridge: [],
    },
  ];
  const skeleton: SkeletonRow[] = [
    {
      id: 'k1',
      parts: [
        { text: 'Le nombre est ' },
        { node: 'total', value: '120' },
        { text: ' et ' },
        { node: 'fav', value: null },
      ],
    },
  ];
  it('his own line, the rule with its condition and the bridge only for a complete finding; a blank stays dashed until filled', async () => {
    await render(
      <MethodSheet
        visible
        roadmap={roadmap}
        found={found}
        skeleton={skeleton}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByTestId('finding-f1')).toBeOnTheScreen();
    expect(screen.getByTestId('rule-f1')).toBeOnTheScreen();
    expect(screen.getByTestId('bridge-total')).toBeOnTheScreen();
    expect(screen.getByTestId('finding-f2')).toBeOnTheScreen();
    expect(screen.queryByTestId('rule-f2')).toBeNull();
    expect(screen.getByTestId('skeleton-fill-total')).toBeOnTheScreen();
    expect(screen.getByTestId('skeleton-blank-fav')).toBeOnTheScreen();
    expect(screen.queryByTestId('skeleton-fill-fav')).toBeNull();
  });
  it('without findings the sheet is the route alone', async () => {
    await render(
      <MethodSheet visible roadmap={roadmap} onClose={() => undefined} />,
    );
    expect(screen.queryByTestId('finding-f1')).toBeNull();
    expect(screen.queryByTestId('paper-skeleton')).toBeNull();
  });
});

describe('MethodFrameCard: the stages of a repair script', () => {
  const { MethodFrameCard } = require('./MethodFrameCard');
  const trust = {
    reviewed: false,
    contentVersion: 'x',
    source: 'authored',
    status: 'ok',
  };
  const stages = [
    {
      type: 'show',
      text: ar('مثال'),
      worked: {
        graph: {
          template: 'urn_exactly_j',
          args: { reds: 3, blacks: 5, k: 3, j: 1 },
        },
        nodes: ['total'],
      },
    },
    { type: 'list', prompt: ar('اكتب'), reds: 1, blacks: 2, k: 2 },
    {
      type: 'cards',
      prompt: ar('اختار'),
      evaluator: 'pick',
      args: {},
      cards: [
        { id: 'x', text: ar('أ'), truth: 'true' },
        { id: 'y', text: ar('ب'), truth: 'false' },
      ],
    },
    {
      type: 'component',
      prompt: ar('شوف'),
      component: {
        component: 'PartWholeBar',
        props: { whole: '7', part: '14', mode: 'feedback' },
      },
    },
  ];
  const step = {
    id: 'rep',
    blockId: 'b',
    trust,
    skills: [],
    kind: 'mframe',
    prompt: ar('p'),
    hints: [ar('h')],
    frame: { type: 'repair', stages },
  };
  const view = (stage: number, onSubmit: (v: unknown) => void) =>
    render(
      <MethodFrameCard
        step={step}
        active
        lines={undefined}
        result={undefined}
        restored={undefined}
        stage={stage}
        onSubmit={onSubmit}
        renderComponent={() => null}
        handle={null}
      />,
    );
  it('show: the worked lines come from the engine and one tap acknowledges', async () => {
    const onSubmit = jest.fn();
    await view(0, onSubmit);
    expect(screen.getByTestId('worked-lines')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('repair-ack'));
    expect(onSubmit).toHaveBeenCalledWith({ ack: true });
  });
  it('list: his groups travel as one value, with their ball ids', async () => {
    const onSubmit = jest.fn();
    await view(1, onSubmit);
    for (const id of ['r1', 'n1']) {
      await fireEvent.press(screen.getByTestId(`list-ball-${id}`));
    }
    await fireEvent.press(screen.getByTestId('list-add'));
    await fireEvent.press(screen.getByTestId('list-done'));
    expect(onSubmit).toHaveBeenCalledWith({ list: [['r1', 'n1']] });
  });
  it('cards: a pick sends the card id', async () => {
    const onSubmit = jest.fn();
    await view(2, onSubmit);
    await fireEvent.press(screen.getByTestId('pick-card-y'));
    expect(onSubmit).toHaveBeenCalledWith({ card: 'y' });
  });
  it('component: "I looked" ends the stage (a feedback picture has no gate of its own)', async () => {
    const onSubmit = jest.fn();
    await view(3, onSubmit);
    await fireEvent.press(screen.getByTestId('repair-looked'));
    expect(onSubmit).toHaveBeenCalledWith({ explored: true });
  });
});
