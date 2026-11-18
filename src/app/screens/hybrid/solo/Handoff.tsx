/**
 * After «تعطّلت؟» on the solo sheet (student test 2026-11-18, mockup 1c):
 * what he wrote alone stays his (the green card, his lines), the question's
 * steps with where they go on from («كتبتها وحدك», «نبداو من هنا»,
 * «جاية»), and two ways: «نكمّلو خطوة بخطوة» or back to the sheet.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RoadView } from '../../../../hybrid/tour/tour';
import { RichView } from '../../../../lesson/feed/RichView';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { lineLatex } from '../../../../method/lineChain';
import { theme } from '../../../../theme';

const MARK = { done: '✓', now: '●', later: '○' } as const;

export function Handoff({
  lines,
  steps,
  waiting,
  onGo,
  onBack,
}: {
  /** His solo lines that finished a step. */
  lines: readonly string[];
  steps: RoadView['steps'];
  waiting: boolean;
  onGo: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="solo-handoff"
    >
      {lines.length > 0 && (
        <View style={styles.done} testID="solo-handoff-done">
          <Text style={styles.doneTitle}>
            {[MARK.done, t('hybrid.solo.doneTitle')].join(' ')}
          </Text>
          {lines.map((raw, i) => (
            <View key={i} style={styles.line}>
              <MathBlock
                latex={lineLatex(raw)}
                fontSize={theme.font.size.body}
              />
            </View>
          ))}
          <Text style={styles.small}>{t('hybrid.solo.doneKept')}</Text>
        </View>
      )}
      <Text style={styles.lead}>
        {lines.length > 0 ? t('hybrid.solo.lead') : t('hybrid.solo.leadNone')}
      </Text>
      <View style={styles.steps} testID="solo-handoff-steps">
        {steps.map(s => (
          <View
            key={s.cardId}
            style={[styles.step, s.status === 'now' && styles.stepNow]}
            testID={`solo-handoff-step-${s.status}`}
          >
            <Text
              style={[
                styles.stepMark,
                s.status === 'done' && styles.stepMarkDone,
              ]}
            >
              {MARK[s.status]}
            </Text>
            <View style={styles.stepText}>
              <RichView rich={s.title} fontSize={theme.font.size.callout} />
              <Text style={styles.small}>
                {s.status === 'done'
                  ? t('hybrid.solo.stepDone')
                  : s.status === 'now'
                  ? t('hybrid.solo.stepHere')
                  : t('hybrid.solo.stepLater')}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable
        style={[styles.primary, waiting && styles.off]}
        accessibilityRole="button"
        disabled={waiting}
        testID="solo-handoff-go"
        onPress={onGo}
      >
        <Text style={styles.primaryText}>{t('hybrid.solo.go')}</Text>
      </Pressable>
      <Pressable
        style={[styles.secondary, waiting && styles.off]}
        accessibilityRole="button"
        disabled={waiting}
        testID="solo-handoff-back"
        onPress={onBack}
      >
        <Text style={styles.secondaryText}>{t('hybrid.solo.back')}</Text>
      </Pressable>
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
  done: {
    backgroundColor: theme.color.correct.bg,
    borderWidth: theme.border.line,
    borderColor: theme.color.correct.ink,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  doneTitle: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.text,
    ...rtl,
  },
  line: {
    direction: 'ltr',
    alignItems: 'center',
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.chip,
    padding: theme.space.sm,
  },
  small: { ...theme.font.small, color: theme.color.textSecondary, ...rtl },
  lead: { ...theme.font.body, color: theme.color.textPrimary, ...rtl },
  steps: { gap: theme.space.xs },
  step: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.md,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  stepNow: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
    backgroundColor: theme.color.highlighterSoft,
  },
  stepMark: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    width: theme.size.handoffMark,
    textAlign: 'center',
  },
  stepMarkDone: { color: theme.color.correct.ink },
  stepText: { flex: 1, gap: theme.space.xxxs },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...theme.font.body, color: theme.color.textOnAccent },
  secondary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...theme.font.body, color: theme.color.textPrimary },
  off: { opacity: theme.opacity.disabled },
});
