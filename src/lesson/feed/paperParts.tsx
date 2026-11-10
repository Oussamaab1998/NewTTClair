/**
 * Parts of the «الورقة» sheet shared with the lesson board's exam tab (moved
 * out of PaperSheet.tsx with no change of behaviour): a question row of the
 * exam paper (its number, its wording in the exam's French, done ✓ / «انت
 * هنا» / «قريبا») and a result tag (a mark, then the result as printed).
 */
import React from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PaperQuestion, Rich } from '../../content/schema';
import { theme } from '../../theme';
import { RichView } from './RichView';

const DONE_MARK = '✓';
const doneTag = (label: string) => `${DONE_MARK} ${label}`;

export type RowState = 'done' | 'current' | 'available' | 'soon';

export function QuestionRow({
  q,
  state,
  onLayout,
  wording,
  testID,
}: {
  q: PaperQuestion;
  state: RowState;
  onLayout: ((e: LayoutChangeEvent) => void) | undefined;
  /** The wording drawn by the caller (default: the exam's lines as printed). */
  wording?: React.ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.row,
        state === 'current' && styles.rowCurrent,
        state === 'soon' && styles.rowSoon,
      ]}
      {...(onLayout && { onLayout })}
      accessible
      accessibilityState={{ disabled: state === 'soon' }}
      testID={testID ?? `paper-q-${q.id}-${state}`}
    >
      <View style={[styles.num, state === 'current' && styles.numCurrent]}>
        <Text style={styles.numText}>{q.label}</Text>
      </View>
      <View style={styles.wording}>
        {wording ??
          (q.wording ?? []).map((w, i) => (
            <RichView
              key={i}
              rich={w}
              variant="paper"
              {...(state === 'soon' && { color: theme.color.inkDisabled })}
            />
          ))}
      </View>
      {state === 'done' && (
        <Text style={styles.doneTag}>{doneTag(q.label)}</Text>
      )}
      {state === 'current' && (
        <Text style={styles.hereTag}>{t('paper.here')}</Text>
      )}
      {state === 'soon' && (
        <Text style={styles.soonTag}>{t('picker.soon')}</Text>
      )}
    </View>
  );
}

export function ResultTag({
  id,
  statement,
  mark = DONE_MARK,
  testID,
}: {
  id: string;
  statement: Rich;
  /** The shape before the result (default ✓, proven). */
  mark?: string;
  testID?: string;
}) {
  return (
    <View style={styles.resultTag} testID={testID ?? `paper-result-${id}`}>
      <Text style={styles.resultMark}>{mark}</Text>
      <RichView
        rich={statement}
        variant="paper"
        color={theme.color.correct.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The exam's own (French, LTR) order: number, wording, then the state tag.
  row: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  rowCurrent: {
    backgroundColor: theme.color.highlighterSoft,
    borderWidth: theme.border.active,
    borderColor: theme.color.ink,
  },
  // Clearly unavailable: dashed, muted, never pressable.
  rowSoon: {
    backgroundColor: theme.color.paper,
    borderStyle: 'dashed',
  },
  num: {
    width: theme.size.paperNumber,
    height: theme.size.paperNumber,
    borderRadius: theme.size.paperNumber / 2,
    backgroundColor: theme.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numCurrent: { backgroundColor: theme.color.highlighter },
  numText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  wording: { flex: 1, gap: theme.space.xxs },
  doneTag: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.text,
    backgroundColor: theme.color.correct.bg,
    borderColor: theme.color.correct.ink,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.sm,
    writingDirection: 'ltr',
  },
  hereTag: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.md,
    writingDirection: 'rtl',
  },
  soonTag: {
    ...theme.font.small,
    color: theme.color.inkDisabled,
    writingDirection: 'rtl',
  },
  // A proven result (French, LTR): ✓ then the statement.
  resultTag: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xs,
    backgroundColor: theme.color.correct.bg,
    borderColor: theme.color.correct.ink,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    direction: 'ltr',
  },
  resultMark: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.ink,
  },
});
