/**
 * «مثال صغير»: a small probability tree counted whole (people, not
 * fractions), on the step card. A prepared example brings its story, what
 * each letter stands for in the story, the tree with the count at the end
 * of every branch, and what he is asked to find (the exam's own writing of
 * it, as math, with a question mark). When the asked end is not printed, the
 * people of the second event are given on a line of their own. He answers
 * on his page, which stays open under the card (unlike a small box), or
 * comes back to the question. An example an AI move made has no story: the
 * tree and the way back only.
 *
 * Letters and numbers are never inside an Arabic sentence: each is math or
 * a left-to-right line of its own.
 */
import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { StudentAct } from '../../../ai/checks/autoCheck';
import { preparedFor } from '../../../ai/move/prepared';
import { caseRuntime } from '../../../ai/session/state';
import {
  treeCaseSignature,
  treeCaseView,
  type TreeCase,
} from '../../../hybrid/figure';
import { RichView } from '../../../lesson/feed/RichView';
import { MathBlock } from '../../../lesson/math/MathBlock';
import { theme } from '../../../theme';
import type { CaseBusy } from './CasePanel';
import { FigureView } from './FigureView';

/** What is asked, after the exam's writing of it. */
const ASKED = ' = ?';

interface TreeCasePanelProps {
  exerciseId: string;
  questionId: string;
  caseId: string;
  spec: TreeCase;
  /** The step takes lines: they go under the example on his page. */
  lines: boolean;
  /** An answer is on its way. */
  disabled: boolean;
  busy: CaseBusy;
  onAct: (a: StudentAct) => void;
}

/** The conductor state is copied on every act: the case is compared by what it is. */
const sameCase = (a: TreeCasePanelProps, b: TreeCasePanelProps): boolean =>
  a.exerciseId === b.exerciseId &&
  a.questionId === b.questionId &&
  a.caseId === b.caseId &&
  treeCaseSignature(a.spec) === treeCaseSignature(b.spec) &&
  a.lines === b.lines &&
  a.disabled === b.disabled &&
  a.busy === b.busy &&
  a.onAct === b.onAct;

export const TreeCasePanel = memo(function TreeCasePanelImpl({
  exerciseId,
  questionId,
  caseId,
  spec,
  lines,
  disabled,
  busy,
  onAct,
}: TreeCasePanelProps) {
  const { t } = useTranslation();
  const signature = treeCaseSignature(spec);
  const model = useMemo(
    () => ({
      view: treeCaseView(spec),
      entry:
        preparedFor(exerciseId, questionId).find(e => e.id === caseId) ?? null,
      label:
        caseRuntime(caseId, spec)?.graph.nodes.find(n => n.id === spec.node)
          ?.label ?? null,
    }),
    // `spec` is a new object after every act: the signature says what it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseId, questionId, caseId, signature],
  );
  const { view, entry, label } = model;
  if (!view) {
    return null;
  }
  return (
    <View style={styles.panel} testID="tree-case-panel">
      <Text style={styles.title}>{t('hybrid.case.treeTitle')}</Text>
      {entry && <Text style={styles.text}>{t('hybrid.case.treeIntro')}</Text>}
      {entry?.story && <RichView rich={entry.story} testID="tree-case-story" />}
      {(entry?.legend ?? []).map((row, i) => (
        <View key={i} style={styles.legend} testID={`tree-case-legend-${i}`}>
          <View style={styles.letter}>
            <MathBlock latex={row.latex} fontSize={theme.font.size.body} />
          </View>
          <View style={styles.meaning}>
            <RichView rich={row.says} fontSize={theme.font.size.small} />
          </View>
        </View>
      ))}
      <FigureView
        spec={view.spec}
        signature={view.signature}
        testID="case-tree"
      />
      {view.total !== null && (
        <>
          <Text style={styles.label}>{t('hybrid.case.treeTotal')}</Text>
          <Text style={styles.ltr} testID="tree-case-total">
            {String(view.total)}
          </Text>
        </>
      )}
      {entry?.ask && (
        <View style={styles.ask} testID="tree-case-ask">
          <RichView rich={entry.ask} fontFamily={theme.font.family.ui.bold} />
          {label !== null && (
            <MathBlock
              latex={`${label}${ASKED}`}
              fontSize={theme.font.size.body}
              testID="tree-case-asked"
            />
          )}
        </View>
      )}
      {entry && lines && (
        <Text style={styles.text}>{t('hybrid.case.treeLines')}</Text>
      )}
      <Pressable
        style={[styles.back, disabled && busy !== 'back' && styles.off]}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: disabled && busy === 'back' }}
        disabled={disabled}
        testID="case-back"
        onPress={() => onAct({ kind: 'continue' })}
      >
        <View style={styles.backRow}>
          {disabled && busy === 'back' && (
            <ActivityIndicator
              size="small"
              color={theme.color.ink}
              testID="case-back-busy"
            />
          )}
          <Text style={styles.backText}>{t('hybrid.case.back')}</Text>
        </View>
      </Pressable>
    </View>
  );
},
sameCase);

const styles = StyleSheet.create({
  panel: {
    gap: theme.space.xs,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.active,
    borderStyle: 'dashed',
    borderColor: theme.color.deepDive.edge,
    backgroundColor: theme.color.deepDive.bg,
  },
  title: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  text: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  label: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltr: {
    ...theme.font.paper,
    color: theme.color.ink,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  // One row per letter: the letter in a cell of its own (math, left to
  // right), its meaning beside it, never the two in one sentence.
  legend: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  letter: {
    minWidth: theme.size.touch,
    alignItems: 'center',
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  meaning: { flex: 1 },
  ask: { gap: theme.space.xxs },
  back: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: theme.opacity.disabled },
  backRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  backText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
});
