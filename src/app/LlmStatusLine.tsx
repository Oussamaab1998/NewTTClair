import React, { useCallback, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { modelCheckLine, type LlmRuntime } from '../planner/llm/runtime';
import { theme } from '../theme';

/**
 * Dev tools only (behind the dev flag): LLM mode and why, model, last call
 * outcome, today's cap. A tap toggles the local kill switch. Students never
 * see any of this; when the LLM is off or failing they get the rules lesson.
 */
export function LlmStatusLine({ runtime }: { runtime: LlmRuntime }) {
  const { t } = useTranslation();
  const s = useSyncExternalStore(
    useCallback(cb => runtime.subscribe(cb), [runtime]),
    () => runtime.status(),
  );
  const mode =
    s.mode === 'llm' ? `llm (${s.clientId})` : `rules_only (${s.reason})`;
  const last = s.last
    ? `${s.last.purpose} ${s.last.outcome} ${s.last.statusClass} ${s.last.latencyMs}ms`
    : '-';
  const line = `${t('lesson.devLlm.mode')}: ${mode} · ${t(
    'lesson.devLlm.last',
  )}: ${last} · ${t('lesson.devLlm.cap')}: ${s.capRemaining}/${
    s.capLimit
  } · ${modelCheckLine(s)}`;
  return (
    <Pressable
      onPress={() => runtime.flags.setKillSwitch(!runtime.flags.killSwitch())}
      accessibilityRole="button"
      accessibilityHint={t('lesson.devLlm.tapKill')}
      style={styles.line}
      testID="llm-status"
    >
      <Text style={styles.text}>{line}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: theme.color.devConsoleBackground,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xxs,
  },
  text: {
    color: theme.color.devConsoleText,
    fontFamily: theme.font.family.mono,
    fontSize: theme.font.size.micro,
    writingDirection: 'ltr',
  },
});
