import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ComponentHost } from '../../components/ComponentHost';
import type {
  ComponentEvent,
  ComponentResult,
  ComponentSpec,
  JsonObject,
} from '../../components/contract';
import { ActionButton } from '../../components/probability/ui';
import type { Experiment } from '../../engine/calls';
import { probe } from '../../perf/probe';
import { theme } from '../../theme';
import type * as DevOnly from '../dev';

// Demo-only sample data (Exercise 2 urn); specs list only the props they change.
const EXPERIMENT: Experiment = {
  urn: [
    { id: 'a', value: -1 },
    { id: 'b', value: 0 },
    { id: 'c', value: 0 },
    { id: 'd', value: 1 },
    { id: 'e', value: 2 },
  ],
  draw: 'simultaneous',
  k: 2,
};
const X0 = { id: 'value_eq', args: { value: 0 } };
/** The red / black exercise urn (docs/exercises/EX_URN_RN.md): 4 red, 6 black, 3 drawn. */
const RED_BLACK = {
  balls: [
    ...['r1', 'r2', 'r3', 'r4'].map(id => ({ id, value: 1, color: 'red' })),
    ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(id => ({
      id,
      value: 0,
      color: 'black',
    })),
  ],
  draw: 'simultaneous',
  k: 3,
};
const B = { id: 'any_value', args: { value: 0 } };

export interface DemoCase {
  title: string;
  /** A registered component; or `key` + `render` for a non-registry view (editor). */
  spec?: ComponentSpec;
  key?: string;
  render?: () => React.ReactNode;
  /** A replay of a recorded state next to the live one. */
  replay?: { snapshot?: JsonObject; showSolution?: boolean };
  /** Intentional: shows the fallback; its component_error is expected. */
  expectError?: boolean;
}

/** Debug builds only; `__DEV__` is false in release, so Metro drops the require. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('../dev') as typeof DevOnly)
  : null;

const CASES: DemoCase[] = [
  {
    title: 'Urn (select)',
    spec: { component: 'Urn', props: { mode: 'select', valueFn: 'product' } },
    replay: { snapshot: { selected: ['b', 'c'] } },
  },
  {
    title: 'OutcomeSpace (colorBy value)',
    spec: {
      component: 'OutcomeSpace',
      props: { valueFn: 'product', colorBy: 'value' },
    },
  },
  {
    title: 'OutcomeSpace (colorBy event)',
    spec: { component: 'OutcomeSpace', props: { colorBy: 'event', event: B } },
  },
  {
    title: 'EventPicker (X = 0, live)',
    spec: {
      component: 'EventPicker',
      props: { valueFn: 'product', event: X0, reveal: 'live' },
    },
    replay: {
      snapshot: {
        selected: ['a-b', 'a-c', 'b-d', 'b-e', 'c-d', 'c-e'],
        attempts: 1,
        done: false,
        lastExtra: [],
        lastMissed: 1,
      },
      showSolution: true,
    },
  },
  {
    title: 'ComplementView (B from not B)',
    spec: {
      component: 'ComplementView',
      props: { event: B, labels: { event: 'B', complement: '\\bar{B}' } },
    },
  },
  {
    title: 'LawBuilder (fill_probabilities)',
    spec: { component: 'LawBuilder', props: { valueFn: 'product' } },
    replay: { showSolution: true },
  },
  {
    title: 'LawBuilder (assign_outcomes)',
    spec: {
      component: 'LawBuilder',
      props: { valueFn: 'product', mode: 'assign_outcomes' },
    },
  },
  {
    title: 'LawChart (E, E2, V)',
    spec: {
      component: 'LawChart',
      props: { valueFn: 'product', reveal: ['E', 'E2', 'V'] },
    },
  },
  {
    // Not a bug: proves invalid props render a fallback and log component_error.
    title: 'fallback test (intentional: k = 9 > 5 balls)',
    spec: { component: 'Urn', props: { k: 9 } },
    expectError: true,
  },
  {
    // Red / black exercise urn: 120 draws, shown because display mode lists none (E4).
    title: 'Urn (4 red, 6 black, display)',
    spec: { component: 'Urn', props: { ...RED_BLACK, mode: 'display' } },
  },
  {
    title: 'LawChart (number of reds, checked law, E3)',
    spec: {
      component: 'LawChart',
      props: {
        ...RED_BLACK,
        law: {
          of: { id: 'count_value', args: { value: 1 } },
          rows: [
            { value: 0, p: [1, 6] },
            { value: 1, p: [1, 2] },
            { value: 2, p: [3, 10] },
            { value: 3, p: [1, 30] },
          ],
        },
      },
    },
  },
];

/**
 * Storybook-like screen for the probability components: each one live
 * (interactive) and, when useful, as a replay of a recorded state. The perf
 * panel shows React commit times per component, to read on a real device.
 */
export const PROBABILITY_DEMO_COMPONENTS: readonly string[] = [
  ...new Set(CASES.map(c => c.spec?.component ?? c.key ?? '')),
];

export function ProbabilityDemoScreen() {
  return (
    <ComponentDemo
      cases={CASES}
      experiment={EXPERIMENT}
      testID="probability-demo"
    />
  );
}

/** Live + replay rendering of demo cases, with the event log and perf panel. */
export function ComponentDemo({
  cases,
  experiment,
  testID,
}: {
  cases: readonly DemoCase[];
  experiment?: Experiment;
  testID: string;
}) {
  // `-devComponent X`: only X's cases; `X#n`: only X's n-th case (from 0).
  // All cases if nothing matches.
  const [only, nth] = (devOnly?.devComponentAtLaunch() ?? '').split('#');
  const matching = cases.filter(c => (c.spec?.component ?? c.key) === only);
  const picked =
    nth !== undefined && matching[Number(nth)]
      ? [matching[Number(nth)]!]
      : matching;
  const shownCases = picked.length > 0 ? picked : cases;
  const [log, setLog] = useState<string[]>([]);
  const push = useCallback(
    (line: string) => setLog(l => [line, ...l].slice(0, 8)),
    [],
  );
  const onEvent = useCallback(
    (e: ComponentEvent) =>
      push(`${e.component}.${e.name} ${JSON.stringify(e.payload)}`),
    [push],
  );
  const onResult = useCallback(
    (r: ComponentResult) =>
      push(
        `result correct=${String(r.correct)} ${(
          r.misconceptionHints ?? []
        ).join(',')}`,
      ),
    [push],
  );
  const onError = useCallback(
    (component: string, reason: string) =>
      push(`component_error ${component} ${reason}`),
    [push],
  );
  const onExpectedError = useCallback(
    (component: string, reason: string) =>
      push(`component_error ${component} ${reason} (expected: fallback test)`),
    [push],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentOffset={{ x: 0, y: devOnly?.devScrollAtLaunch() ?? 0 }}
      testID={testID}
    >
      <PerfPanel />
      <Section title="log">
        {log.map((l, i) => (
          <Text key={i} style={styles.log} numberOfLines={3}>
            {l}
          </Text>
        ))}
      </Section>
      {shownCases.map((c, i) => (
        <Section key={i} title={c.title}>
          {c.render?.()}
          {c.spec && (
            <ComponentHost
              spec={c.spec}
              defaultInstanceId={`demo-${i}`}
              mode="interactive"
              {...(experiment && { experiment })}
              onEvent={onEvent}
              onResult={onResult}
              onError={c.expectError ? onExpectedError : onError}
            />
          )}
          {c.spec && c.replay && (
            <>
              <Text style={styles.sub}>{REPLAY_LABEL}</Text>
              <ComponentHost
                spec={c.spec}
                defaultInstanceId={`demo-${i}-replay`}
                mode="replay"
                {...(experiment && { experiment })}
                onEvent={onEvent}
                onError={onError}
                {...(c.replay.snapshot && { snapshot: c.replay.snapshot })}
                {...(c.replay.showSolution && { showSolution: true })}
              />
            </>
          )}
        </Section>
      ))}
    </ScrollView>
  );
}

const REPLAY_LABEL = 'replay';

const statLine = (r: ReturnType<typeof probe.stats>[number]) =>
  `${r.id}: n=${r.n} median=${r.medianMs.toFixed(1)} ms max=${r.maxMs.toFixed(
    1,
  )} ms`;
const heightLine = () =>
  Object.entries(probe.heights())
    .map(([name, h]) => `${name} height=${h} pt`)
    .join(' ');
const renderLine = () =>
  ['OutcomeChip', 'FeedItemView', 'LessonFeed']
    .map(name => `${name}=${probe.renders(name)}`)
    .join(' ');

function PerfPanel() {
  const { t } = useTranslation();
  useSyncExternalStore(
    useCallback(cb => probe.subscribe(cb), []),
    () => probe.version,
  );
  const rows = probe.stats();
  return (
    <Section title={t('proba.perf.title')}>
      {rows.map(r => (
        <Text key={r.id} style={styles.log} testID={`perf-${r.id}`}>
          {statLine(r)}
        </Text>
      ))}
      <Text style={styles.log}>{renderLine()}</Text>
      <Text style={styles.log} testID="perf-heights">
        {heightLine()}
      </Text>
      <ActionButton
        label={t('proba.perf.reset')}
        onPress={() => probe.reset()}
        testID="perf-reset"
      />
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  content: {
    padding: theme.space.lg,
    gap: theme.space.lg,
    paddingBottom: theme.space.scrollEnd,
  },
  section: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    gap: theme.space.xs,
  },
  title: {
    fontSize: theme.font.size.footnote,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.textSecondary,
  },
  sub: {
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    marginTop: theme.space.xs,
  },
  log: {
    fontSize: theme.font.size.tiny,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
