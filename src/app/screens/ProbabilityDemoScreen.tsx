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
const B = { id: 'any_value', args: { value: 0 } };

interface DemoCase {
  title: string;
  spec: ComponentSpec;
  /** A replay of a recorded state next to the live one. */
  replay?: { snapshot?: JsonObject; showSolution?: boolean };
  /** Intentional: shows the fallback; its component_error is expected. */
  expectError?: boolean;
}

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
];

/**
 * Storybook-like screen for the probability components: each one live
 * (interactive) and, when useful, as a replay of a recorded state. The perf
 * panel shows React commit times per component, to read on a real device.
 */
export function ProbabilityDemoScreen() {
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
      testID="probability-demo"
    >
      <PerfPanel />
      <Section title="log">
        {log.map((l, i) => (
          <Text key={i} style={styles.log} numberOfLines={3}>
            {l}
          </Text>
        ))}
      </Section>
      {CASES.map((c, i) => (
        <Section key={i} title={c.title}>
          <ComponentHost
            spec={c.spec}
            defaultInstanceId={`demo-${i}`}
            mode="interactive"
            experiment={EXPERIMENT}
            onEvent={onEvent}
            onResult={onResult}
            onError={c.expectError ? onExpectedError : onError}
          />
          {c.replay && (
            <>
              <Text style={styles.sub}>{REPLAY_LABEL}</Text>
              <ComponentHost
                spec={c.spec}
                defaultInstanceId={`demo-${i}-replay`}
                mode="replay"
                experiment={EXPERIMENT}
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
