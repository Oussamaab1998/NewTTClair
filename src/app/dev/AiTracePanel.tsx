import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  latencyLines,
  modelCheckLine,
  type LlmRuntime,
} from '../../planner/llm/runtime';
import type { TraceEntry } from '../../planner/llm/trace';
import { theme } from '../../theme';

const usd = (v: number) => `$${v.toFixed(v < 0.01 ? 5 : 3)}`;

/** One decision as dev lines (codes and numbers only; LTR). */
export function traceLines(e: TraceEntry): string[] {
  const head = [
    e.source.toUpperCase(),
    e.aiTrigger ?? '-',
    `${e.lessonTrigger}@${e.stepId}`,
    `→ ${e.action}`,
    e.aiAction && e.aiAction !== e.action ? `(ai: ${e.aiAction})` : '',
    `[${e.ruleId}]`,
  ]
    .filter(Boolean)
    .join(' ');
  const lines = [head];
  if (e.model) {
    const u = e.usage;
    lines.push(
      [
        e.model,
        e.outcome ?? '',
        e.latencyMs !== undefined ? `${e.latencyMs} ms` : '',
        u
          ? `in ${u.inputTokens} (read ${u.cachedInputTokens} / write ${
              u.cacheWriteInputTokens ?? 0
            }) out ${u.outputTokens}`
          : '',
        e.costUsd !== undefined ? usd(e.costUsd) : '',
        e.reasons && e.reasons.length > 0
          ? `guard: ${e.reasons.join(', ')}`
          : e.outcome === 'ok'
          ? 'guard: ok'
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }
  if (e.timing) {
    lines.push(
      [
        `prep ${e.timing.prepMs} ms`,
        e.timing.headersMs !== undefined
          ? `headers ${e.timing.headersMs} ms`
          : 'no response',
        e.timing.bodyMs !== undefined ? `body ${e.timing.bodyMs} ms` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }
  if (e.diagnosis) {
    lines.push(
      `dx: ${e.diagnosis.misconceptionIds.join(', ') || '-'} · ${
        e.diagnosis.summary
      }`,
    );
  }
  if (e.why) {
    lines.push(`why: ${e.why}`);
  }
  return lines;
}

/**
 * Dev tools only: one row per settled planner decision (rules / llm /
 * fallback), with trigger, action, diagnosis, latency, tokens, cost and the
 * guard's verdict; the header shows what is left of the every-mistake cap and
 * of today's money cap. Collapsed by default; tap to open.
 */
export function AiTracePanel({
  runtime,
  initiallyOpen = false,
}: {
  runtime: LlmRuntime;
  initiallyOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(initiallyOpen);
  const log = runtime.trace;
  const entries = useSyncExternalStore(
    useCallback(cb => log?.subscribe(cb) ?? (() => undefined), [log]),
    () => log?.all() ?? [],
  );
  const status = useSyncExternalStore(
    useCallback(cb => runtime.subscribe(cb), [runtime]),
    () => runtime.status(),
  );
  const caps = [
    status.everyMistake
      ? `${t('lesson.devLlm.everyMistake')} ${status.everyMistake.remaining}/${
          status.everyMistake.limit
        }`
      : `${t('lesson.devLlm.everyMistake')} off`,
    status.spend
      ? `${t('lesson.devLlm.spend')} ${usd(status.spend.usd)} / ${usd(
          status.spend.capUsd,
        )}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const title = `${open ? '▾' : '▸'} ${t('lesson.devLlm.traceTitle')} (${
    entries.length
  }) · ${caps}\n${[modelCheckLine(status), ...latencyLines(status)].join(
    '\n',
  )}`;
  return (
    <>
      <Pressable
        onPress={() => setOpen(v => !v)}
        accessibilityRole="button"
        style={styles.bar}
        testID="ai-trace-toggle"
      >
        <Text style={styles.mono}>{title}</Text>
      </Pressable>
      {open && (
        <ScrollView style={styles.panel} testID="ai-trace-panel">
          {entries.length === 0 && (
            <Text style={styles.mono}>{t('lesson.devLlm.traceEmpty')}</Text>
          )}
          {[...entries].reverse().map(e => (
            <Text
              key={`${e.at}-${e.stepId}-${e.ruleId}`}
              style={[styles.mono, styles.row]}
              selectable
            >
              {traceLines(e).join('\n')}
            </Text>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.color.devConsoleBackground,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xxs,
  },
  panel: {
    maxHeight: theme.size.rawPanelMaxHeight,
    backgroundColor: theme.color.devConsoleBackground,
    paddingHorizontal: theme.space.sm,
  },
  mono: {
    color: theme.color.devConsoleText,
    fontFamily: theme.font.family.mono,
    fontSize: theme.font.size.micro,
    writingDirection: 'ltr',
  },
  row: { marginTop: theme.space.sm },
});
