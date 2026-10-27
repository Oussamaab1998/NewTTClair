import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { DevRawLog, RawEntry } from '../../planner/llm/devRaw';
import { theme } from '../../theme';

/** Pretty JSON when it parses (Arabic stays readable), else the text as is. */
export function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const header = (e: RawEntry) =>
  `${e.purpose} · ${e.outcome}${
    e.reasons.length > 0 ? ` · ${e.reasons.join(', ')}` : ''
  } · ${e.requestId}`;

/**
 * Dev tools only: the last raw model outputs with the pipeline's verdict, so
 * the Arabic can be read and judged. Collapsed by default; tap to open.
 */
export function LlmRawPanel({
  log,
  initiallyOpen = false,
}: {
  log: DevRawLog;
  initiallyOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(initiallyOpen);
  const entries = useSyncExternalStore(
    useCallback(cb => log.subscribe(cb), [log]),
    () => log.all(),
  );
  const title = `${open ? '▾' : '▸'} ${t('lesson.devLlm.rawTitle')} (${
    entries.length
  })`;
  return (
    <>
      <Pressable
        onPress={() => setOpen(v => !v)}
        accessibilityRole="button"
        style={styles.bar}
        testID="llm-raw-toggle"
      >
        <Text style={styles.mono}>{title}</Text>
      </Pressable>
      {open && (
        <ScrollView style={styles.panel} testID="llm-raw-panel">
          {entries.length === 0 && (
            <Text style={styles.mono}>{t('lesson.devLlm.rawEmpty')}</Text>
          )}
          {[...entries].reverse().map(e => (
            <React.Fragment key={e.requestId}>
              <Text style={[styles.mono, styles.head]}>{header(e)}</Text>
              <Text style={styles.raw} selectable>
                {pretty(e.raw)}
              </Text>
            </React.Fragment>
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
  head: { marginTop: theme.space.sm, fontWeight: theme.font.weight.bold },
  raw: {
    color: theme.color.textOnInverse,
    fontSize: theme.font.size.caption,
    writingDirection: 'ltr',
  },
});
