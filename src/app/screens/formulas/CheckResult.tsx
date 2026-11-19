/**
 * The end of a Vérif rapide (mockup 9): a ✓ or ✗ per rule and what happens
 * to it next (its status and when it comes back). No total score, no level
 * (D8). The one action offered is to look again at a missed rule.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ruleLatex } from '../../../formulas/display';
import type { FormulaAnswer, FormulaState } from '../../../formulas/log';
import type { FormulaRule } from '../../../formulas/schema';
import { dueWords } from '../../../formulas/session';
import { theme } from '../../../theme';
import { Bar, Button, DueText, Formula, FormulasHeader, StatusPill, styles } from './parts';

export interface ResultRow {
  rule: FormulaRule;
  verdict: FormulaAnswer['verdict'];
  state: FormulaState;
}

export function CheckResult({
  rows,
  now,
  onReview,
  onFinish,
}: {
  rows: readonly ResultRow[];
  now: number;
  onReview: (ruleId: string) => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation('formulas');
  const missed = rows.find(r => r.verdict !== 'right');
  return (
    <View style={styles.root} testID="formulas-result">
      <FormulasHeader
        title={t('check.resultTitle')}
        subtitle={t('check.resultSub')}
        onBack={onFinish}
        mark="close"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {rows.map(r => {
          const right = r.verdict === 'right';
          return (
            <View key={r.rule.id} style={[styles.card, local.row]} testID={`result-row-${r.rule.id}`}>
              <View style={[local.shape, right ? local.shapeRight : local.shapeWrong]}>
                <Text style={[local.shapeText, right ? local.textRight : local.textWrong]}>
                  {right ? theme.feedback.success.icon : theme.feedback.danger.icon}
                </Text>
              </View>
              <View style={local.middle}>
                <Formula latex={ruleLatex(r.rule)} />
                <View style={local.status}>
                  <StatusPill status={r.state.status} />
                  <DueText words={dueWords(r.state, now)} />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Bar>
        {missed ? (
          <>
            <Button
              label={t('check.review')}
              onPress={() => onReview(missed.rule.id)}
              grow
              testID="result-review"
            />
            <Button label={t('check.finish')} kind="quiet" onPress={onFinish} testID="result-finish" />
          </>
        ) : (
          <Button label={t('check.finish')} onPress={onFinish} grow testID="result-finish" />
        )}
      </Bar>
    </View>
  );
}

const local = StyleSheet.create({
  row: { flexDirection: theme.mathSide.row, alignItems: 'center', gap: theme.space.md },
  middle: { flex: 1, gap: theme.space.xxs },
  status: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  shape: {
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeRight: { borderColor: theme.color.correct.ink, backgroundColor: theme.color.correct.bg },
  shapeWrong: { borderColor: theme.color.error.noteBorder, backgroundColor: theme.color.error.noteBg },
  shapeText: { ...theme.font.small, fontFamily: theme.font.family.ui.bold },
  textRight: { color: theme.color.correct.ink },
  textWrong: { color: theme.color.error.ink },
});
