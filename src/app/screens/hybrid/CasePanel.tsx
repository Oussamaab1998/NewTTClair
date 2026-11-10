/**
 * «الصندوق الصغير»: the small case an AI move put him on (state.onCase),
 * on the step card. What the case is (its balls, how many are drawn), the
 * list builder to list its groups (judged by the conductor on the case, the
 * ids the engine's check uses: urn balls r1..rN, n1..nM; box letters a, b,
 * c…), a note that the lines he writes now go under the case on his page,
 * and «نرجعو للسؤال». Each label is on its own line, the numbers and ball
 * names on their own left-to-right line.
 */
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { StudentAct } from '../../../ai/checks/autoCheck';
import type { CaseSpec } from '../../../ai/session/state';
import { ListBuilder } from '../../../lesson/feed/method/ListBuilder';
import { ballsOf } from '../../../method/repair';
import { theme } from '../../../theme';

/** A box case's letters (as the conductor's check names them). */
const LETTERS = 'abcdefgh';

/** The balls of a case, with the ids its list is checked on. */
export function caseBalls(spec: CaseSpec): { id: string; label: string }[] {
  return spec.kind === 'box'
    ? LETTERS.slice(0, spec.n)
        .split('')
        .map(id => ({ id, label: id }))
    : ballsOf(spec.reds, spec.blacks);
}

export const CasePanel = memo(function CasePanelImpl({
  caseId,
  spec,
  lines,
  disabled,
  onAct,
}: {
  caseId: string;
  spec: CaseSpec;
  /** The step takes lines: they go under the case on his page. */
  lines: boolean;
  disabled: boolean;
  onAct: (a: StudentAct) => void;
}) {
  const { t } = useTranslation();
  const balls = useMemo(() => caseBalls(spec), [spec]);
  return (
    <View style={styles.panel} testID="case-panel">
      <Text style={styles.title}>{t('hybrid.case.title')}</Text>
      <Text style={styles.text}>{t('hybrid.case.intro')}</Text>
      <Text style={styles.label}>{t('hybrid.case.contents')}</Text>
      <Text style={styles.ltr} testID="case-balls">
        {balls.map(b => b.label).join('  ')}
      </Text>
      <Text style={styles.label}>{t('hybrid.case.drawn')}</Text>
      <Text style={styles.ltr} testID="case-drawn">
        {String(spec.k)}
      </Text>
      <Text style={styles.label}>{t('hybrid.case.list')}</Text>
      <View pointerEvents={disabled ? 'none' : 'auto'}>
        <ListBuilder
          key={caseId}
          balls={balls}
          size={spec.k}
          readonly={false}
          onSubmit={groups => onAct({ kind: 'list', groups })}
          testID="case-list"
        />
      </View>
      {lines && <Text style={styles.text}>{t('hybrid.case.lines')}</Text>}
      <Pressable
        style={styles.back}
        accessibilityRole="button"
        disabled={disabled}
        testID="case-back"
        onPress={() => onAct({ kind: 'continue' })}
      >
        <Text style={styles.backText}>{t('hybrid.case.back')}</Text>
      </Pressable>
    </View>
  );
});

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
  back: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
});
