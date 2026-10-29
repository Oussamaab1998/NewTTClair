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
import { VariableTablePropsSchema } from './schemas';
import { tableModel } from './table';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
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
const names = (events: ComponentEvent[]) => events.map(e => e.name);
const byName = (events: ComponentEvent[], n: string) => events.filter(e => e.name === n);

const table = (props: JsonObject): ComponentSpec => ({ component: 'VariableTable', props });
const trials = (n: number, over: JsonObject = {}) =>
  table({ outcomes: { kind: 'trials', n }, ...over });

/** The right value of each outcome of n = 3 trials, in the order of the rows. */
const rightValues = (n: number) =>
  tableModel(VariableTablePropsSchema.parse({ outcomes: { kind: 'trials', n } })).items.map(i => i.value);

/** Taps each outcome with the value given by `plan` (a list, by row), choosing the chip when it changes. */
async function fill(plan: readonly (number | null)[]) {
  let pen: number | null = null;
  for (let i = 0; i < plan.length; i++) {
    const v = plan[i]!;
    if (v === null) {
      continue;
    }
    if (v !== pen) {
      await fireEvent.press(screen.getByTestId(`table-value-${v}`));
      pen = v;
    }
    await fireEvent.press(screen.getByTestId(`table-outcome-${i}`));
  }
}

describe('VariableTable props', () => {
  const ok = (p: unknown) => VariableTablePropsSchema.safeParse(p);

  it('accepts the demo cases', () => {
    expect(ok({ outcomes: { kind: 'trials', n: 4 } }).success).toBe(true);
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '1/3' } }).success).toBe(true);
    expect(ok({ outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 } }).success).toBe(true);
    expect(ok({ outcomes: { kind: 'trials', n: 5 } }).success).toBe(true);
  });

  it('n from 2 to 5 (32 outcomes at most); an urn of at most 48 draws, k not above its size, no weights', () => {
    expect(ok({ outcomes: { kind: 'trials', n: 6 } }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'urn', reds: 8, blacks: 8, k: 4 } }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'urn', reds: 1, blacks: 1, k: 3 } }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 }, weights: { p: '1/2' } }).success).toBe(false);
  });

  it('p strictly between 0 and 1', () => {
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '0' } }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '3/2' } }).success).toBe(false);
  });

  it('the checks: no repeat, the law check is how the student finishes, and symmetry only for a symmetric law', () => {
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, checks: ['law', 'law'] }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, checks: ['all_used', 'sum'] }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '1/3' }, checks: ['symmetry', 'law'] }).success).toBe(false);
    expect(ok({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '1/2' }, checks: ['symmetry', 'law'] }).success).toBe(true);
    expect(ok({ outcomes: { kind: 'urn', reds: 2, blacks: 3, k: 2 }, checks: ['symmetry', 'law'] }).success).toBe(false);
  });

  it('the default checks leave symmetry out when the true law is not symmetric (and the model agrees)', () => {
    const sym = tableModel(VariableTablePropsSchema.parse({ outcomes: { kind: 'trials', n: 3 } }));
    expect(sym.checks).toEqual(['all_used', 'sum', 'symmetry', 'law']);
    const skew = tableModel(VariableTablePropsSchema.parse({ outcomes: { kind: 'trials', n: 3 }, weights: { p: '1/3' } }));
    expect(skew.checks).toEqual(['all_used', 'sum', 'law']);
  });
});

describe('VariableTable: building the law of the number of S in 3 trials', () => {
  it('shows 8 outcomes, the value chips 0 to 3, an empty table and the four checks; nothing is placed for the student', async () => {
    const { errors, events } = await host(trials(3));
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getAllByTestId(/^table-outcome-\d+$/)).toHaveLength(8);
    expect(screen.getAllByTestId(/^table-value-\d$/)).toHaveLength(4);
    expect(screen.getByTestId('table-count-0')).toHaveTextContent('0');
    expect(screen.getByTestId('table-check-all_used')).toBeOnTheScreen();
    expect(screen.getByTestId('table-check-symmetry')).toBeOnTheScreen();
    expect(screen.getByTestId('table-reveal')).toBeOnTheScreen();
    expect(screen.queryByTestId('table-result')).toBeNull();
  });

  it('the table has a header row of three words, one over each column, and no digit on it', async () => {
    await host(trials(3));
    const head = screen.getByTestId('table-head');
    expect(head).toHaveTextContent(/القيمة/);
    expect(head).toHaveTextContent(/المخارج/);
    expect(head).toHaveTextContent(/الاحتمال/);
    expect(head).toHaveTextContent(/^[^0-9]*$/);
    for (const col of ['table-count-0']) {
      const s = Object.assign({}, ...[screen.getByTestId(col).props.style].flat(2).filter(Boolean)) as { width: number };
      expect(s.width).toBe(72);
    }
  });

  it('with no value chosen a tap places nothing', async () => {
    const { events } = await host(trials(3));
    await fireEvent.press(screen.getByTestId('table-outcome-0'));
    expect(names(events)).toEqual([]);
    expect(screen.queryByTestId('table-value-of-0')).toBeNull();
  });

  it('choose a value, tap outcomes: the table of counts fills as they go; tapping again takes one back', async () => {
    const { events } = await host(trials(3));
    await fireEvent.press(screen.getByTestId('table-value-3'));
    await fireEvent.press(screen.getByTestId('table-outcome-0'));
    expect(screen.getByTestId('table-count-3')).toHaveTextContent('1');
    expect(screen.getByTestId('table-value-of-0')).toHaveTextContent('3');
    await fireEvent.press(screen.getByTestId('table-outcome-0'));
    expect(screen.getByTestId('table-count-3')).toHaveTextContent('0');
    expect(byName(events, 'mapping_changed').map(e => e.payload)).toEqual([
      { outcome: 'SSS', value: 3 },
      { outcome: 'SSS', value: null },
    ]);
    expect(byName(events, 'value_selected').map(e => e.payload)).toEqual([{ x: 3 }]);
  });

  it('all_used: "at least one has no value" at first; the outcome is named only on the second press', async () => {
    const plan = rightValues(3).map((v, i) => (i === 5 ? null : v));
    const { events } = await host(trials(3));
    await fill(plan);
    await fireEvent.press(screen.getByTestId('table-check-all_used'));
    expect(screen.getByTestId('table-result')).toBeOnTheScreen();
    expect(screen.queryByTestId('table-named')).toBeNull();
    await fireEvent.press(screen.getByTestId('table-check-all_used'));
    expect(screen.getByTestId('table-named')).toHaveTextContent('FSF');
    expect(byName(events, 'check_run').map(e => e.payload)).toEqual([
      { check: 'all_used', passed: false, detail: 'missing' },
      { check: 'all_used', passed: false, detail: 'missing' },
    ]);
  });

  it('all_used: named at once at hint level 2', async () => {
    const plan = rightValues(3).map((v, i) => (i === 5 ? null : v));
    await host(trials(3), { lessonState: { hintLevel: 2 } });
    await fill(plan);
    await fireEvent.press(screen.getByTestId('table-check-all_used'));
    expect(screen.getByTestId('table-named')).toHaveTextContent('FSF');
  });

  it('sum: the student\'s own sum, short of 1 with one outcome missing', async () => {
    const plan = rightValues(3).map((v, i) => (i === 5 ? null : v));
    await host(trials(3));
    await fill(plan);
    await fireEvent.press(screen.getByTestId('table-check-sum'));
    expect(screen.getByTestId('table-result')).toBeOnTheScreen();
    expect(JSON.stringify(screen.toJSON())).toContain('7 sur 8');
  });

  it('a law with the right number of outcomes but the wrong values passes "all used" and "sum", fails "symmetric" and the law', async () => {
    // n = 3: 8 outcomes. Counts 1, 4, 2, 1 (they add up to 8, but the law is 1, 3, 3, 1): FSS is counted as 1, not 2
    const wrongPlan = [3, 2, 2, 1, 1, 1, 1, 0];
    const { events } = await host(trials(3));
    await fill(wrongPlan);
    await fireEvent.press(screen.getByTestId('table-check-all_used'));
    await fireEvent.press(screen.getByTestId('table-check-sum'));
    await fireEvent.press(screen.getByTestId('table-check-symmetry'));
    await fireEvent.press(screen.getByTestId('table-check-law'));
    expect(byName(events, 'check_run').map(e => [e.payload.check, e.payload.passed])).toEqual([
      ['all_used', true],
      ['sum', true],
      ['symmetry', false],
      ['law', false],
    ]);
    // the wrong rows are marked, the right counts are not told
    expect(screen.getByTestId('table-wrong-1')).toBeOnTheScreen();
    expect(screen.getByTestId('table-wrong-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('table-wrong-0')).toBeNull();
    expect(names(events)).not.toContain('explored');
    expect(byName(events, 'law_submitted')[0]!.payload).toEqual({
      law: { '0': 1, '1': 4, '2': 2, '3': 1 },
      correct: false,
    });
  });

  it('the right law: the law check passes, the gate opens, the finding is found with the calculation', async () => {
    const { events } = await host(trials(3));
    await fill(rightValues(3));
    await fireEvent.press(screen.getByTestId('table-check-law'));
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'law_correct',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({
      findingId: 'table.law',
      numbers: { outcomes: '8', c0: '1', c1: '3', c2: '3', c3: '1' },
      how: 'found',
      correct: true,
      calc: ['1 + 3 + 3 + 1 = 8'],
    });
    expect(screen.getByTestId('table-calc')).toBeOnTheScreen();
    expect(screen.queryByTestId('table-check-law')).toBeNull();
    expect(screen.queryByTestId('table-reveal')).toBeNull();
    expect(screen.getByTestId('table-outcome-0').props.accessibilityState.disabled).toBe(true);
  });

  it('weights: p = 1/3 shows 8/27 for no S', async () => {
    await host(trials(3, { weights: { p: '1/3' } }));
    expect(screen.queryByTestId('table-check-symmetry')).toBeNull();
    await fill(rightValues(3));
    expect(JSON.stringify(screen.toJSON())).toContain('8 sur 27');
  });

  it('the escape places every outcome, opens the gate as skipped, and is never understanding', async () => {
    const { events } = await host(trials(3));
    await fireEvent.press(screen.getByTestId('table-reveal'));
    expect(screen.getByTestId('table-count-1')).toHaveTextContent('3');
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
  });
});

describe('VariableTable: an urn', () => {
  it('2 red and 2 black, 2 drawn: 6 outcomes, X = the number of reds, counts 1, 4, 1', async () => {
    const { events } = await host(table({ outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 } }));
    expect(screen.getAllByTestId(/^table-outcome-\d+$/)).toHaveLength(6);
    const m = tableModel(VariableTablePropsSchema.parse({ outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 } }));
    await fill(m.items.map(i => i.value));
    await fireEvent.press(screen.getByTestId('table-check-law'));
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({
      numbers: { outcomes: '6', c0: '1', c1: '4', c2: '1' },
    });
  });
});

describe('VariableTable: state, readonly, replay, limits', () => {
  it('the snapshot restores the mapping and the gate; a replay emits nothing and cannot be edited', async () => {
    const live = await host(trials(3));
    await fill(rightValues(3));
    await fireEvent.press(screen.getByTestId('table-check-law'));
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap).toMatchObject({ explored: 'done' });
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={trials(3)}
        defaultInstanceId="t2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('table-count-1')).toHaveTextContent('3');
    await fireEvent.press(screen.getByTestId('table-outcome-0'));
    expect(events).toEqual([]);
  });

  it('a garbled snapshot is ignored', async () => {
    await render(
      <ComponentHost
        spec={trials(3)}
        defaultInstanceId="t3"
        mode="replay"
        snapshot={{ assign: { 99: 1 } } as never}
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.getByTestId('table-count-1')).toHaveTextContent('0');
  });

  it('is a gate by event name', () => {
    expect(isGate('VariableTable', {})).toBe(true);
    expect(opensGate('VariableTable', 'explored')).toBe(true);
    expect(opensGate('VariableTable', 'check_run')).toBe(false);
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host(trials(9));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('at the worst case (5 trials: 32 outcomes, 6 chips, 4 checks, the escape) no more than 60 interactive elements', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={trials(5)}
        defaultInstanceId="w"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(countInteractive(screen.toJSON())).toBe(32 + 6 + 4 + 1);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });

  it('an urn of 35 draws (4 red, 3 black, 3 drawn) fits: its outcomes, 4 chips, 3 checks (no symmetry) and the escape', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={table({ outcomes: { kind: 'urn', reds: 4, blacks: 3, k: 3 } })}
        defaultInstanceId="w2"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(screen.getAllByTestId(/^table-outcome-\d+$/)).toHaveLength(35);
    expect(countInteractive(screen.toJSON())).toBe(35 + 4 + 3 + 1);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });
});
