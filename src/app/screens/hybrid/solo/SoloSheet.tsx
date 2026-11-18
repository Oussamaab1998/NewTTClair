/**
 * «نكتب الحل وحدي» (student test 2026-11-18, mockup 1b): he writes the
 * question alone, like in the exam, line by line. The worksheet keeps his
 * lines with the engine's mark on each (✓ a step finished, ✗ a known slip);
 * under it, what the board says about his last line: the step counts, it is
 * right so far, or it does not count (a known slip's own text). The paper
 * folds above («الورقة»). «تعطّلت؟» opens the hand-over (Handoff.tsx).
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SkillLevel } from '../../../../ai/profile/profile';
import type { ExerciseSheet } from '../../../../hybrid/board';
import type { ConductorState } from '../../../../hybrid/conductor/types';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { lineLatex } from '../../../../method/lineChain';
import { theme } from '../../../../theme';
import { ExerciseTab } from '../board/ExerciseTab';
import { LineEntry } from '../LineEntry';
import { PartView } from '../StepCard';
import type { Exchange } from '../useHybridSession';

export interface SoloSheetProps {
  paper: () => ExerciseSheet;
  state: ConductorState;
  /** The line step a hand-over would start on (its keys: C(n,k), x...). */
  stepKey: string | null;
  givens: readonly string[];
  levelOf: (node: string | null) => SkillLevel;
  lettersOf: (cardKey: string | null) => 'x' | 'n' | null;
  /** His solo lines and their marks, oldest first. */
  sheet: readonly Exchange[];
  readback: { literal: string; grouped: string } | null;
  waiting: boolean;
  onLine: (raw: string) => void;
  onReadback: (choice: 'grouped' | 'literal') => void;
  onStuck: () => void;
}

/** What the board says about his last line. */
function LastWord({ x }: { x: Exchange }) {
  const { t } = useTranslation();
  const right = x.reason === 'solo_credit' || x.reason === 'solo_note';
  // The board's own notes and explanations of a line that does not count.
  const explained =
    x.said?.kind === 'parts'
      ? x.said.parts.filter(p => p.kind === 'feedback' || p.kind === 'note')
      : [];
  const text =
    x.reason === 'solo_credit'
      ? t('hybrid.solo.credit')
      : x.reason === 'solo_note'
      ? t('hybrid.solo.note')
      : x.reason === 'unreadable'
      ? t('hybrid.solo.unreadable')
      : t('hybrid.solo.wrong');
  return (
    <View
      style={[styles.word, right ? styles.wordRight : styles.wordWrong]}
      testID={`solo-word-${x.reason}`}
    >
      <View style={styles.wordRow}>
        <Text style={[styles.wordMark, right && styles.wordMarkRight]}>
          {right ? theme.feedback.success.icon : theme.feedback.warning.icon}
        </Text>
        <Text style={styles.wordText}>{text}</Text>
      </View>
      {!right && explained.map((p, i) => <PartView key={i} part={p} />)}
    </View>
  );
}

export function SoloSheet(p: SoloSheetProps) {
  const { t } = useTranslation();
  const [paperOpen, setPaperOpen] = useState(false);
  const paper = useMemo(
    () => (paperOpen ? p.paper() : null),
    // The paper is computed when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paperOpen],
  );
  const label = useMemo(() => ({ ar: [{ ar: t('hybrid.solo.line') }] }), [t]);
  const last = p.sheet[p.sheet.length - 1];
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="solo-sheet"
    >
      <Pressable
        style={styles.paperToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: paperOpen }}
        testID="solo-paper"
        onPress={() => setPaperOpen(o => !o)}
      >
        <Text style={styles.paperToggleText}>
          {paperOpen ? t('hybrid.solo.hidePaper') : t('hybrid.solo.showPaper')}
        </Text>
        <Text style={styles.paperToggleText}>{paperOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {paper && <ExerciseTab sheet={paper} />}
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {t('hybrid.solo.title')}
        </Text>
        <Text style={styles.sub}>{t('hybrid.solo.sub')}</Text>
      </View>
      <View style={styles.page}>
        <LineEntry
          active
          onLine={p.onLine}
          step={{ id: 'solo', label, node: null, key: p.stepKey }}
          state={p.state}
          level={p.levelOf(null)}
          disabled={p.waiting}
          busy={p.waiting}
          givens={p.givens}
          letters={p.lettersOf(p.stepKey)}
        />
      </View>
      {p.readback && (
        <View style={styles.readback} testID="solo-readback">
          <Text style={styles.sub}>{t('method.readback.ask')}</Text>
          {(['grouped', 'literal'] as const).map(c => (
            <Pressable
              key={c}
              style={styles.choice}
              accessibilityRole="button"
              testID={`solo-readback-${c}`}
              onPress={() => p.onReadback(c)}
            >
              <Text style={styles.sub}>{t(`method.readback.${c}`)}</Text>
              <MathBlock
                latex={lineLatex(
                  c === 'grouped' ? p.readback!.grouped : p.readback!.literal,
                )}
                fontSize={theme.font.size.body}
              />
            </Pressable>
          ))}
        </View>
      )}
      {last && !p.readback && <LastWord x={last} />}
      <Pressable
        style={[styles.stuck, p.waiting && styles.off]}
        accessibilityRole="button"
        disabled={p.waiting}
        testID="solo-stuck"
        onPress={p.onStuck}
      >
        <Text style={styles.stuckText}>{t('hybrid.solo.stuck')}</Text>
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
  paperToggle: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  paperToggleText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    ...rtl,
  },
  head: { gap: theme.space.xxs },
  title: {
    ...theme.font.header,
    color: theme.color.ink,
    ...rtl,
  },
  sub: { ...theme.font.small, color: theme.color.textSecondary, ...rtl },
  page: {
    backgroundColor: theme.color.card,
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  readback: { gap: theme.space.sm },
  choice: {
    minHeight: theme.size.touch,
    padding: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    gap: theme.space.xs,
  },
  word: {
    borderRadius: theme.radius.chip,
    padding: theme.space.md,
    gap: theme.space.xs,
  },
  wordRight: { backgroundColor: theme.color.correct.bg },
  wordWrong: {
    backgroundColor: theme.color.draft.bg,
    borderWidth: theme.border.line,
    borderColor: theme.color.draft.border,
  },
  wordRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  wordMark: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.draft.text,
  },
  wordMarkRight: { color: theme.color.correct.ink },
  wordText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    flex: 1,
    ...rtl,
  },
  stuck: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    paddingHorizontal: theme.space.lg,
  },
  stuckText: { ...theme.font.body, color: theme.color.textPrimary, ...rtl },
  off: { opacity: theme.opacity.disabled },
});
