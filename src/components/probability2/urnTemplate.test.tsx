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
import { UrnTemplatePropsSchema } from './schemas';
import { urnExample, URN_TEMPLATE_REVEALS } from './urnExample';
import { completeReveals, revealedByRules } from '../reveals';
import { freshCandidateOk } from '../../engine/urnVariants';
import { parseRat } from '../../engine/rationalFormat';

async function host(spec: ComponentSpec, extra: Partial<ComponentHostProps> = {}) {
  const events: ComponentEvent[] = [];
  const errors: unknown[][] = [];
  const ref = createRef<ComponentHandle>();
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="u1"
      mode="interactive"
      onEvent={e => events.push(e)}
      onError={(...a) => errors.push(a)}
      handleRef={ref}
      {...extra}
    />,
  );
  return { events, errors, ref };
}
const byName = (events: ComponentEvent[], n: string) => events.filter(e => e.name === n);

const tpl = (props: JsonObject): ComponentSpec => ({ component: 'UrnTemplate', props });
const parent: JsonObject = { answer: '1/2', wrong: ['5/6', '1/12', '19/120', '2/5', '54/125'] };
const exactly = (over: JsonObject = {}) =>
  tpl({ templateId: 'urn_exactly_j', seed: 3, parent, ...over });
const table = (over: JsonObject = {}) =>
  tpl({ templateId: 'repeated_trials_table', seed: 5, ...over });

describe('UrnTemplate props', () => {
  const ok = (p: unknown) => UrnTemplatePropsSchema.safeParse(p);

  it('accepts the demo cases; the seed is 1 to 10000 and defaults to 1', () => {
    expect(ok(exactly().props).success).toBe(true);
    expect(ok(table().props).success).toBe(true);
    expect(UrnTemplatePropsSchema.parse({ templateId: 'urn_exactly_j' }).seed).toBe(1);
    expect(ok({ templateId: 'urn_exactly_j', seed: 0 }).success).toBe(false);
    expect(ok({ templateId: 'urn_exactly_j', seed: 10001 }).success).toBe(false);
    expect(ok({ templateId: 'nope' }).success).toBe(false);
  });

});

describe('urnExample: the same props always show the same example, and never the parent\'s answer', () => {
  const props = UrnTemplatePropsSchema.parse(exactly().props);

  it('deterministic; "another example" changes it', () => {
    expect(urnExample(props, 0)).toEqual(urnExample(props, 0));
    const set = new Set(Array.from({ length: 5 }, (_, b) => JSON.stringify(urnExample(props, b).urn) + urnExample(props, b).j));
    expect(set.size).toBeGreaterThan(1);
  });

  it('every example the student can reach passes the fresh rule against the parent', () => {
    const p = {
      answer: parseRat('1/2')!,
      wrong: (parent.wrong as string[]).map(w => parseRat(w)!),
    };
    for (let b = 0; b <= 4; b++) {
      expect(freshCandidateOk(p, urnExample(props, b).answer)).toEqual({ ok: true });
    }
  });
});

describe('UrnTemplate: urn_exactly_j', () => {
  it('shows a small urn, the draw, the engine\'s solution lines, and the buttons', async () => {
    const { errors, events } = await host(exactly());
    expect(errors).toEqual([]);
    expect(events).toEqual([]);
    expect(screen.getByTestId('urn-template-u1')).toBeOnTheScreen();
    expect(screen.getByTestId('urn-balls')).toBeOnTheScreen();
    expect(screen.getByTestId('urn-lines')).toBeOnTheScreen();
    expect(screen.getByTestId('urn-another')).toBeOnTheScreen();
    expect(screen.getByTestId('urn-reveal')).toBeOnTheScreen();
  });

  it('the same props show the same screen (seeded)', async () => {
    await host(exactly());
    const first = JSON.stringify(screen.toJSON());
    await host(exactly());
    expect(JSON.stringify(screen.toJSON())).toBe(first);
  });

  it('"another example" shows the next seed, opens the gate once, and the finding holds the example', async () => {
    const { events } = await host(exactly());
    const before = JSON.stringify(screen.toJSON());
    await fireEvent.press(screen.getByTestId('urn-another'));
    expect(JSON.stringify(screen.toJSON())).not.toBe(before);
    expect(byName(events, 'example_requested')[0]!.payload).toMatchObject({
      seed: 4,
      templateId: 'urn_exactly_j',
    });
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'another_example',
      how: 'done',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ findingId: 'urn.example', how: 'found', correct: null });
    expect(finding.calc).toHaveLength(3);
    await fireEvent.press(screen.getByTestId('urn-another'));
    expect(byName(events, 'explored')).toHaveLength(1);
    expect(screen.queryByTestId('urn-reveal')).toBeNull();
  });

  it('stops after 4 more examples (the schema proved they all exist)', async () => {
    await host(exactly());
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByTestId('urn-another'));
    }
    expect(screen.queryByTestId('urn-another')).toBeNull();
  });

  it('the escape opens the gate as skipped and is never understanding', async () => {
    const { events } = await host(exactly());
    await fireEvent.press(screen.getByTestId('urn-reveal'));
    expect(ExploredPayloadSchema.parse(byName(events, 'explored')[0]!.payload)).toEqual({
      why: 'reveal',
      how: 'skipped',
    });
    const finding = FindingPayloadSchema.parse(byName(events, 'finding')[0]!.payload);
    expect(finding).toMatchObject({ how: 'skipped', correct: null });
    expect(finding.calc).toBeUndefined();
  });
});

describe('UrnTemplate: repeated_trials_table', () => {
  it('n trials, P(S), j successes, and the term written by the engine', async () => {
    const { events } = await host(table());
    expect(screen.queryByTestId('urn-balls')).toBeNull();
    expect(screen.getByTestId('urn-lines')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('urn-another'));
    expect(byName(events, 'finding')[0]!.payload).toMatchObject({ findingId: 'urn.table_example' });
  });
});

describe('UrnTemplate: reveals, state, limits', () => {
  it('reveals are declared and complete; the numbers of the examples are on screen by props', () => {
    expect(completeReveals(URN_TEMPLATE_REVEALS)).toBe(true);
    const ex = urnExample(UrnTemplatePropsSchema.parse(exactly().props), 0);
    const hit = revealedByRules(URN_TEMPLATE_REVEALS, exactly().props, undefined, f => f[0] === ex.answer[0] && f[1] === ex.answer[1]);
    expect(hit?.value).toBe('example_values');
    expect(hit?.by).toBe('props');
  });

  it('the snapshot restores the example and the gate; a replay emits nothing', async () => {
    const live = await host(exactly());
    await fireEvent.press(screen.getByTestId('urn-another'));
    await fireEvent.press(screen.getByTestId('urn-another'));
    const snap = live.ref.current!.getStateSnapshot() as Record<string, unknown>;
    expect(snap).toEqual({ bump: 2, explored: 'done' });
    const shown = JSON.stringify(screen.toJSON());
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={exactly()}
        defaultInstanceId="u2"
        mode="replay"
        snapshot={snap as never}
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    expect(events).toEqual([]);
    expect(screen.queryByTestId('urn-another')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).toContain('urn-lines');
    expect(shown).toContain('urn-lines');
  });

  it('is a gate by event name', () => {
    expect(isGate('UrnTemplate', {})).toBe(true);
    expect(opensGate('UrnTemplate', 'explored')).toBe(true);
    expect(opensGate('UrnTemplate', 'example_requested')).toBe(false);
  });

  it('invalid props fall back, never crash', async () => {
    const { errors } = await host(tpl({ templateId: 'urn_exactly_j', seed: 0 }));
    expect(errors).toHaveLength(1);
    expect(screen.getByTestId('component-fallback')).toBeOnTheScreen();
  });

  it('two buttons only', async () => {
    const { unmount } = await render(
      <ComponentHost
        spec={exactly()}
        defaultInstanceId="w"
        mode="interactive"
        onEvent={() => undefined}
        onError={() => undefined}
      />,
    );
    expect(countInteractive(screen.toJSON())).toBe(2);
    expect(countInteractive(screen.toJSON())).toBeLessThanOrEqual(MAX_INTERACTIVE);
    await unmount();
  });
});
