/**
 * A question opens on the exam paper (student test 2026-11-18, mockup 1a):
 * the statement as printed, its figure, every question with this one
 * highlighted, then how he wants to work it: «نكتب الحل وحدي» (like in the
 * exam, each line judged on its own) or «نمشيو خطوة بخطوة» (the steps, with
 * the teacher). He can switch later; a long press on any word or symbol
 * asks the teacher. The question's map is in «الطريق».
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { ExerciseSheet } from '../../../../hybrid/board';
import { theme } from '../../../../theme';
import { ExerciseTab } from '../board/ExerciseTab';

export function PaperFirst({
  sheet,
  soloPossible,
  waiting,
  onSolo,
  onSteps,
}: {
  sheet: ExerciseSheet;
  /** The question has a line he can write (else only the steps). */
  soloPossible: boolean;
  waiting: boolean;
  onSolo: () => void;
  onSteps: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="paper-first"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t('hybrid.paper.title')}
      </Text>
      <ExerciseTab sheet={sheet} />
      <Text style={styles.ask}>{t('hybrid.paper.ask')}</Text>
      {soloPossible && (
        <Pressable
          style={[styles.choice, styles.primary, waiting && styles.off]}
          accessibilityRole="button"
          accessibilityState={{ disabled: waiting }}
          disabled={waiting}
          testID="paper-solo"
          onPress={onSolo}
        >
          <Text style={[styles.choiceTitle, styles.onInk]}>
            {t('hybrid.paper.solo')}
          </Text>
          <Text style={[styles.choiceSub, styles.onInkMuted]}>
            {t('hybrid.paper.soloSub')}
          </Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.choice, styles.secondary, waiting && styles.off]}
        accessibilityRole="button"
        accessibilityState={{ disabled: waiting }}
        disabled={waiting}
        testID="paper-steps"
        onPress={onSteps}
      >
        <Text style={styles.choiceTitle}>{t('hybrid.paper.steps')}</Text>
        <Text style={styles.choiceSub}>{t('hybrid.paper.stepsSub')}</Text>
      </Pressable>
      <Text style={styles.note}>{t('hybrid.paper.note')}</Text>
    </ScrollView>
  );
}

const rtl = { writingDirection: 'rtl', textAlign: 'right' } as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: theme.layout.gutter,
    gap: theme.space.md,
    paddingBottom: theme.space.section,
  },
  title: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    ...rtl,
  },
  ask: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    marginTop: theme.space.sm,
    ...rtl,
  },
  choice: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    gap: theme.space.xxs,
  },
  primary: { backgroundColor: theme.color.ink },
  secondary: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.active,
    borderColor: theme.color.borderControl,
  },
  choiceTitle: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    ...rtl,
  },
  choiceSub: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    ...rtl,
  },
  onInk: { color: theme.color.textOnAccent },
  onInkMuted: { color: theme.color.onInk.muted },
  note: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    ...rtl,
  },
  off: { opacity: theme.opacity.disabled },
});
