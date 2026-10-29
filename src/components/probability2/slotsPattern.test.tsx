import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import { ComponentHost, type ComponentHostProps } from '../ComponentHost';
import type { ComponentEvent, ComponentHandle, ComponentSpec } from '../contract';
import { isGate, opensGate } from '../registry';
import { MAX_INTERACTIVE, countInteractive } from './countInteractive';
import { ExploredPayloadSchema, FindingPayloadSchema } from './finding';
import { allPatterns } from './slots';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="s1"
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

const spec = (over: Record<string, unknown> = {}): ComponentSpec => ({
  component: 'SlotsPattern',
  props: { n: 4, k: 2, meantToDistinguish: false, ...over },
});
const six = ['a', 'b', 'c', 'd', 'e', 'f'].map(x => ({ id: x, label: x.toUpperCase() }));

/** Marks the slots of a pattern ('SFSF') and presses add. */
async function addPattern(pattern: string) {
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === 'S') {
      await fireEvent.press(screen.getByTestId(`slots-slot-${i}`));
    }
  }
  await fireEvent.press(screen.getByTestId('slots-add'));
}

describe('SlotsPattern: free mode', () => {
  it('shows the slots, no list, the add button waiting for exactly k marks, and the escape', async () => {
    const { errors } = await host(spec());
    expect(errors).toEqual([]);
    expect(screen.getByTestId('slots-pattern-s1')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^slots-slot-\d$/)).toHaveLength(4);
    expect(screen.queryByTestId(/^slots-row-/)).toBeNull();
    expect(screen.getByTestId('slots-add').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('slots-reveal')).toBeOnTheScreen();
    expect(screen.getByText('اضغط على الخانات باش تعلّمها، وبعد اضغط على «زيد».')).toBeOnTheScreen();
  });

  it('marking slots toggles them and emits an event each time; add opens at exactly k marks', async () => {
    const { events } = await host(spec());
    await fireEvent.press(screen.getByTestId('slots-slot-0'));
    expect(screen.getByTestId('slots-add').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('slots-slot-2'));
    expect(screen.getByTestId('slots-add').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('slots-slot-2'));
    expect(screen.getByTestId('slots-add').props.accessibilityState.disabled).toBe(true);
    expect(byName(events, 'slot_toggled').map(e => e.payload)).toEqual([
      { index: 0, marked: true },
      { index: 2, marked: true },
      { index: 2, marked: false },
    ]);
  });

  it('adding writes the pattern in the list and clears the marks', async () => {
    const { events } = await host(spec());
    await addPattern('SFSF');
    expect(screen.getByTestId('slots-row-0')).toBeOnTheScreen();
    expect(JSON.stringify(screen.getByTestId('slots-row-0').props.accessibilityLabel)).toContain('1');
    expect(byName(events, 'pattern_added')[0]!.payload).toEqual({ pattern: 'SFSF', k: 2, duplicate: false });
    expect(screen.getByTestId('slots-add').props.accessibilityState.disabled).toBe(true);
  });

  it('a duplicate is refused at once, with a mark on the earlier row and a line of words', async () => {
    const { events } = await host(spec());
    await addPattern('SFSF');
    await addPattern('FFSS');
    await addPattern('SFSF');
    expect(screen.queryByTestId('slots-row-2')).toBeNull();
    expect(screen.getByTestId('slots-dup-0')).toBeOnTheScreen();
    expect(screen.queryByTestId('slots-dup-1')).toBeNull();
    expect(screen.getByText('هذا النمط عندك قبل.')).toBeOnTheScreen();
    expect(byName(events, 'duplicate').map(e => e.payload)).toEqual([{ pattern: 'SFSF' }]);
    expect(byName(events, 'pattern_added').map(e => e.payload)).toEqual([
      { pattern: 'SFSF', k: 2, duplicate: false },
      { pattern: 'FFSS', k: 2, duplicate: false },
      { pattern: 'SFSF', k: 2, duplicate: true },
    ]);
    // changing the marks clears the mark on the earlier row
    await fireEvent.press(screen.getByTestId('slots-slot-1'));
    expect(screen.queryByTestId('slots-dup-0')).toBeNull();
  });

  it('"that is all" with a list that is not complete says at least one is missing and names nothing', async () => {
    const { events } = await host(spec());
    await addPattern('SFSF');
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(screen.getByText('باقي على الأقل نمط ناقص.')).toBeOnTheScreen();
    expect(byName(events, 'missing_hint_requested')[0]!.payload).toEqual({ level: 0, missing: true });
    expect(names(events)).not.toContain('explored');
    expect(names(events)).not.toContain('count_confirmed');
    // no number of the count anywhere on screen
    expect(screen.queryByTestId('slots-count')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain('C_{4}^{2}');
  });

  it('the help ladder: level 1 is words only, level 2 names a slot, and then it stops without the hint level', async () => {
    const { events } = await host(spec());
    await addPattern('SFSF');
    await fireEvent.press(screen.getByTestId('slots-help'));
    expect(screen.getByText('على الأقل نمط ناقص. بدّل بلاصة خانة معلّمة وشوف.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('slots-help'));
    expect(screen.getByTestId('slots-help-slot')).toBeOnTheScreen();
    // level 3 needs hintLevel >= 2 or showSolution: the button is gone, not disabled
    expect(screen.queryByTestId('slots-help')).toBeNull();
    expect(byName(events, 'missing_hint_requested').map(e => e.payload)).toEqual([
      { level: 1, missing: true },
      { level: 2, missing: true },
    ]);
  });

  it('level 1 reads the same whether one pattern is missing or several', async () => {
    const level1 = async (listed: string[]) => {
      await host(spec());
      for (const p of listed) {
        await addPattern(p);
      }
      await fireEvent.press(screen.getByTestId('slots-help'));
      return screen.getByTestId('slots-help-text').props.children;
    };
    const all = allPatterns(4, 2);
    const one = await level1(all.filter(p => p !== 'FSSF'));
    const several = await level1(['SSFF', 'FFSS']);
    expect(one).toBe(several);
  });

  it('level 3 (with the hint level) fills the slots with a missing pattern; the student still presses add', async () => {
    const { events } = await host(spec(), { lessonState: { hintLevel: 2 } });
    await addPattern('SSFF');
    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByTestId('slots-help'));
    }
    expect(screen.getByTestId('slots-slot-1').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('slots-slot-0').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('slots-slot-2').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('slots-add').props.accessibilityState.disabled).toBe(false);
    expect(byName(events, 'missing_hint_requested').at(-1)!.payload).toEqual({ level: 3, missing: true });
    expect(screen.queryByTestId('slots-help')).toBeNull();
    await fireEvent.press(screen.getByTestId('slots-add'));
    expect(screen.getByTestId('slots-row-1')).toBeOnTheScreen();
  });

  it('showSolution also opens level 3', async () => {
    await host(spec(), { showSolution: true });
    await fireEvent.press(screen.getByTestId('slots-help'));
    await fireEvent.press(screen.getByTestId('slots-help'));
    expect(screen.getByTestId('slots-help')).toBeOnTheScreen();
  });

  it('a complete list, confirmed: the count is written by the engine, the gate opens, the finding is found', async () => {
    const { events } = await host(spec());
    for (const p of allPatterns(4, 2)) {
      await addPattern(p);
    }
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(screen.getByTestId('slots-count')).toBeOnTheScreen();
    expect(names(events).slice(-3)).toEqual(['count_confirmed', 'explored', 'finding']);
    expect(byName(events, 'count_confirmed')[0]!.payload).toEqual({ n: 4, k: 2, value: '6', correct: true });
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'list_complete',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'slots.pattern_list',
      numbers: { n: '4', k: '2', count: '6' },
      how: 'found',
      correct: true,
      calc: ['C_{4}^{2} = 6'],
    });
    expect(screen.queryByTestId('slots-reveal')).toBeNull();
  });

  it('a list completed with the help is a "helped" finding', async () => {
    const { events } = await host(spec());
    for (const p of allPatterns(4, 2).slice(0, 5)) {
      await addPattern(p);
    }
    await fireEvent.press(screen.getByTestId('slots-help'));
    await addPattern(allPatterns(4, 2)[5]!);
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({ how: 'helped', correct: true });
    expect((byName(events, 'finding')[0]!.payload as { route: string[] }).route).toEqual([
      'added:5',
      'missing_hint:1',
      'added:1',
      'confirmed',
    ]);
  });

  it('the escape shows the whole list and the count, opens the gate as skipped, and is never understanding', async () => {
    const { events } = await host(spec());
    await addPattern('SFSF');
    await fireEvent.press(screen.getByTestId('slots-reveal'));
    expect(screen.getAllByTestId(/^slots-row-\d$/)).toHaveLength(6);
    expect(screen.getByTestId('slots-count')).toBeOnTheScreen();
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
    expect(screen.queryByTestId('slots-reveal')).toBeNull();
    expect(names(events)).not.toContain('count_confirmed');
  });
});

describe('SlotsPattern: counts only above the list cap', () => {
  const big = () => spec({ n: 7, k: 3, listCap: 20, meantToDistinguish: true });

  it('lists nothing, counts what the student has added, still refuses a duplicate', async () => {
    const { events } = await host(big());
    await addPattern('SSSFFFF');
    await addPattern('SSFSFFF');
    expect(screen.queryByTestId(/^slots-row-/)).toBeNull();
    expect(screen.getByTestId('slots-sofar')).toBeOnTheScreen();
    expect(screen.getByText('القايمة طويلة برشا باش تتعرض: نعدّو الأنماط كان.')).toBeOnTheScreen();
    await addPattern('SSSFFFF');
    expect(byName(events, 'duplicate')).toHaveLength(1);
    expect(screen.queryByTestId(/^slots-dup-/)).toBeNull();
    expect(screen.getByText('هذا النمط عندك قبل.')).toBeOnTheScreen();
  });

  it('the escape shows the count, not a list of 35 rows', async () => {
    await host(big());
    await fireEvent.press(screen.getByTestId('slots-reveal'));
    expect(screen.queryByTestId(/^slots-row-/)).toBeNull();
    expect(screen.getByTestId('slots-count')).toBeOnTheScreen();
  });
});

describe('SlotsPattern: guided', () => {
  it('the slots wait for the first marked slot; choosing it locks the slots up to it', async () => {
    const { events } = await host(spec({ n: 5, k: 2, mode: 'guided' }));
    expect(screen.getAllByTestId(/^slots-first-\d$/)).toHaveLength(4);
    expect(screen.getByTestId('slots-slot-3').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('slots-first-1'));
    expect(screen.getByTestId('slots-slot-0').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('slots-slot-1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('slots-slot-1').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('slots-slot-2').props.accessibilityState.disabled).toBe(false);
    expect(byName(events, 'first_slot_selected')[0]!.payload).toEqual({ index: 1 });
    await fireEvent.press(screen.getByTestId('slots-slot-3'));
    await fireEvent.press(screen.getByTestId('slots-add'));
    expect(screen.getByTestId('slots-row-0')).toBeOnTheScreen();
    // after an add the first marked slot stays fixed, ready for the next pattern
    expect(screen.getByTestId('slots-slot-1').props.accessibilityState.selected).toBe(true);
  });
});

describe('SlotsPattern: build_pascal', () => {
  it('a chip per k; each confirmed list fills its cell of the Pascal row; the row is the finding', async () => {
    const { events } = await host(spec({ n: 3, k: 0, mode: 'build_pascal' }));
    expect(screen.getAllByTestId(/^slots-k-\d$/)).toHaveLength(4);
    // k = 0: one pattern with no mark
    await fireEvent.press(screen.getByTestId('slots-add'));
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(screen.getByTestId('slots-pascal-0')).toHaveTextContent('1');
    expect(screen.getByTestId('slots-pascal-1')).toHaveTextContent('?');
    expect(names(events)).toContain('explored');
    expect(names(events)).not.toContain('finding');
    for (const k of [1, 2, 3]) {
      await fireEvent.press(screen.getByTestId(`slots-k-${k}`));
      for (const p of allPatterns(3, k)) {
        await addPattern(p);
      }
      await fireEvent.press(screen.getByTestId('slots-done'));
    }
    expect(screen.getByTestId('slots-pascal-2')).toHaveTextContent('3');
    expect(byName(events, 'k_selected').map(e => e.payload)).toEqual([{ k: 1 }, { k: 2 }, { k: 3 }]);
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'slots.pascal_row',
      numbers: { n: '3', c0: '1', c1: '3', c2: '3', c3: '1' },
      how: 'found',
      calc: ['1 + 3 + 3 + 1 = 8'],
    });
  });

  it('a cell stays "?" until its list is confirmed, even if the list is complete', async () => {
    await host(spec({ n: 3, k: 1, mode: 'build_pascal' }));
    for (const p of allPatterns(3, 1)) {
      await addPattern(p);
    }
    expect(screen.getByTestId('slots-pascal-1')).toHaveTextContent('?');
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(screen.getByTestId('slots-pascal-1')).toHaveTextContent('3');
  });
});

describe('SlotsPattern: bridge', () => {
  const bridge = (over: Record<string, unknown> = {}) =>
    spec({ n: 6, k: 2, mode: 'bridge', bridge: { balls: six }, meantToDistinguish: true, ...over });

  it('draws a ball label above each slot', async () => {
    const { errors } = await host(bridge());
    expect(errors).toEqual([]);
    expect(screen.getAllByTestId(/^slots-ball-\d$/)).toHaveLength(6);
    expect(screen.getByTestId('slots-ball-0')).toHaveTextContent('A');
  });

  it('flipping shows the same list read the other way: C(n,k) = C(n,n-k), once the list is complete', async () => {
    const { events } = await host(bridge());
    for (const p of allPatterns(6, 2)) {
      await addPattern(p);
    }
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(screen.queryByTestId('slots-symmetry')).toBeNull();
    await fireEvent.press(screen.getByTestId('slots-flip'));
    expect(screen.getByTestId('slots-symmetry')).toBeOnTheScreen();
    expect(byName(events, 'flipped').map(e => e.payload)).toEqual([{ flipped: true }]);
    // the first row, SSFFFF, read the other way is FFSSSS
    expect(screen.getByTestId('slots-row-0').props.accessibilityLabel).toContain('FFSSSS');
    // while flipped the slots are a view, not a control
    expect(screen.getByTestId('slots-slot-0').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('slots-flip'));
    expect(screen.getByTestId('slots-slot-0').props.accessibilityState.disabled).toBe(false);
  });

  it('flipped with nothing marked there is nothing to read the other way: no slot and no ball shows marked', async () => {
    await host(bridge());
    await fireEvent.press(screen.getByTestId('slots-flip'));
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`slots-slot-${i}`).props.accessibilityState.selected).toBe(false);
    }
  });

  it('flipped with a complete pattern marked: the n - k other slots show marked', async () => {
    await host(bridge());
    await fireEvent.press(screen.getByTestId('slots-slot-0'));
    await fireEvent.press(screen.getByTestId('slots-slot-1'));
    await fireEvent.press(screen.getByTestId('slots-flip'));
    const marked = [0, 1, 2, 3, 4, 5].filter(
      i => screen.getByTestId(`slots-slot-${i}`).props.accessibilityState.selected === true,
    );
    expect(marked).toEqual([2, 3, 4, 5]);
  });

  it('the finding of a flipped, found bridge holds the symmetry line', async () => {
    const { events } = await host(bridge());
    await fireEvent.press(screen.getByTestId('slots-flip'));
    await fireEvent.press(screen.getByTestId('slots-flip'));
    for (const p of allPatterns(6, 2)) {
      await addPattern(p);
    }
    await fireEvent.press(screen.getByTestId('slots-done'));
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      calc: ['C_{6}^{2} = 15', 'C_{6}^{2} = C_{6}^{4} = 15'],
    });
  });
});

describe('SlotsPattern: state, readonly, replay', () => {
  it('the snapshot restores the list, the marks and the gate; a replay emits nothing and cannot be tapped', async () => {
    const live = await host(spec());
    await addPattern('SFSF');
    await fireEvent.press(screen.getByTestId('slots-slot-1'));
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap.explored).toBeNull();

    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={spec()}
        defaultInstanceId="s2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('slots-row-0')).toBeOnTheScreen();
    const replayed = screen.getByTestId('slots-slot-1');
    expect(replayed.props.accessibilityState.selected).toBe(true);
    await fireEvent.press(replayed);
    expect(events).toEqual([]);
  });

  it('a garbled snapshot is ignored: the component starts empty', async () => {
    await render(
      <ComponentHost
        spec={spec()}
        defaultInstanceId="s3"
        mode="replay"
        snapshot={{ marks: 'x' } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.queryByTestId('slots-row-0')).toBeNull();
  });

  it('is a gate by event name, and the escape opens it like the pattern list does', () => {
    expect(isGate('SlotsPattern', { n: 4, k: 2 })).toBe(true);
    expect(opensGate('SlotsPattern', 'explored')).toBe(true);
    expect(opensGate('SlotsPattern', 'pattern_added')).toBe(false);
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host({ component: 'SlotsPattern', props: { n: 9, k: 2 } });
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });
});

describe('SlotsPattern: 44 pt targets and the 60 element rule', () => {
  it('every slot and every button is at least 44 pt in both dimensions', async () => {
    await host(spec({ n: 7, k: 3, meantToDistinguish: true }));
    const style = (id: string) => {
      const flat = Object.assign({}, ...[screen.getByTestId(id).props.style].flat(2).filter(Boolean));
      return flat as { minHeight?: number; minWidth?: number; width?: number; height?: number };
    };
    for (let i = 0; i < 7; i++) {
      const s = style(`slots-slot-${i}`);
      expect(Math.max(s.width ?? 0, s.minWidth ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.max(s.height ?? 0, s.minHeight ?? 0)).toBeGreaterThanOrEqual(44);
    }
  });

  it('at the worst case no variant renders more than 60 interactive elements', async () => {
    const cases: Record<string, unknown>[] = [
      { n: 7, k: 3, meantToDistinguish: true },
      { n: 5, k: 0, mode: 'build_pascal' },
      { n: 7, k: 3, mode: 'bridge', bridge: { balls: [...six, { id: 'g', label: 'G' }] } },
      { n: 6, k: 2, mode: 'guided', meantToDistinguish: false },
    ];
    for (const c of cases) {
      const { unmount } = await render(
        <ComponentHost
          spec={{ component: 'SlotsPattern', props: c as never }}
          defaultInstanceId="w"
          mode="interactive"
          onEvent={() => undefined}
          onError={() => undefined}
        />,
      );
      expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
      await unmount();
    }
  });
});
