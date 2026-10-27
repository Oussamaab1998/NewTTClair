/**
 * B4 (2026-10-22): the guided walk-through for a stuck student, instead of
 * the teacher-note card. Its lines come one tap at a time («التالي»); each
 * says what to look at or do, never the answer. After the last line the
 * step's card is shown again, for the student to type the final value.
 * Readonly once done (and in replays).
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich } from '../../content/schema';
import { theme } from '../../theme';
import { RichView } from './RichView';

export const WalkthroughCard = memo(function WalkthroughCardImpl({
  lines,
  shown,
  done,
  onNext,
}: {
  lines: readonly Rich[];
  shown: number;
  done: boolean;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card} testID="walkthrough">
      <Text style={styles.title}>{t('lesson.walkthrough.title')}</Text>
      {lines.slice(0, Math.max(1, shown)).map((line, i) => (
        <View key={i} style={styles.line} testID={`walkthrough-line-${i + 1}`}>
          <Text style={styles.number}>{t('lesson.walkthrough.number', { n: i + 1 })}</Text>
          <View style={styles.lineBody}>
            <RichView rich={line} />
          </View>
        </View>
      ))}
      {!done && (
        <Pressable
          onPress={onNext}
          style={styles.next}
          accessibilityRole="button"
          testID="walkthrough-next"
        >
          <Text style={styles.nextText}>{t('lesson.walkthrough.next')}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    marginVertical: theme.space.xs,
    gap: theme.space.sm,
  },
  title: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.inkMuted,
    writingDirection: 'rtl',
  },
  line: {
    flexDirection: theme.reading.row,
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  number: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.pen,
    writingDirection: 'ltr',
  },
  lineBody: { flex: 1 },
  next: {
    alignSelf: theme.reading.startAlign,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    justifyContent: 'center',
  },
  nextText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.medium,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
});
