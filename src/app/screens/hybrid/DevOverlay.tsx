/**
 * Debug builds only (the screen mounts it under `__DEV__`): who answered
 * each act (instant, the AI move, or the prepared reply when the AI gave
 * none), the conductor's reason, and what it cost. Folded to a small chip.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../../theme';
import type { DevEntry } from './useHybridSession';

/** Entries shown when open (the newest last). */
const SHOWN = 12;

const usd = (n: number) => `$${n.toFixed(4)}`;
const lineOf = (e: DevEntry) =>
  `${e.frameId} ${e.tier}:${e.reason} ${e.by} ${usd(e.costUsd)} ${e.ms}ms`;

export function DevOverlay({ entries }: { entries: readonly DevEntry[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const total = usd(entries.reduce((sum, e) => sum + e.costUsd, 0));
  const last = entries[entries.length - 1];
  const chip = last ? `${last.tier}:${last.reason} ${total}` : total;
  return (
    <View style={styles.wrap} pointerEvents="box-none" testID="dev-overlay">
      <Pressable
        style={styles.chip}
        accessibilityRole="button"
        accessibilityLabel={t('hybrid.dev.toggle')}
        testID="dev-overlay-toggle"
        onPress={() => setOpen(o => !o)}
      >
        <Text style={styles.text} testID="dev-overlay-last">
          {chip}
        </Text>
      </Pressable>
      {open && (
        <ScrollView style={styles.panel}>
          {entries.slice(-SHOWN).map(e => (
            <Text key={e.id} style={styles.text}>
              {lineOf(e)}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: theme.size.touch,
    ...theme.mathSide.startEdge(theme.space.xs),
    alignItems: 'flex-start',
    gap: theme.space.xxs,
  },
  chip: {
    backgroundColor: theme.color.devConsoleBackground,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.xxxs,
  },
  panel: {
    maxHeight: theme.size.eventPanelMaxHeight,
    backgroundColor: theme.color.devConsoleBackground,
    borderRadius: theme.radius.tag,
    padding: theme.space.xs,
  },
  text: {
    fontFamily: theme.font.family.mono,
    fontSize: theme.font.size.small,
    color: theme.color.devConsoleText,
    writingDirection: 'ltr',
  },
});
