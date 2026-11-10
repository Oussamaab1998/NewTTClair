/**
 * «التمرين»: the exam paper as printed (French, left to right): the
 * statement, every question (the one now highlighted, finished ones ✓),
 * the data and the words he found underlined, and the results: the one the
 * statement gives, and those of the questions he finished.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ExerciseSheet, MarkedRich } from '../../../../hybrid/board';
import { MarkedStatement } from '../../../../lesson/feed/MarkedStatement';
import { QuestionRow, ResultTag } from '../../../../lesson/feed/paperParts';
import { RichView } from '../../../../lesson/feed/RichView';
import { theme } from '../../../../theme';

const DONE_MARK = '✓';
/** A result the statement gives (not his to prove from nothing): an open diamond. */
const GIVEN_MARK = '◇';

function Marked({ m, testID }: { m: MarkedRich; testID: string }) {
  return (
    <>
      {m.rich.fr !== undefined && (
        <MarkedStatement text={m.rich.fr} marks={m.marks} testID={testID} />
      )}
      {m.rich.math !== undefined && (
        <RichView rich={{ math: m.rich.math }} variant="paper" />
      )}
    </>
  );
}

export function ExerciseTab({ sheet }: { sheet: ExerciseSheet }) {
  const { t } = useTranslation();
  const given = sheet.results.filter(r => r.why === 'given');
  const proven = sheet.results.filter(r => r.why === 'proven');
  return (
    <View style={styles.wrap} testID="exercise-tab">
      <View style={styles.legend}>
        <Text style={[styles.legendText, styles.data]}>
          {t('hybrid.exercise.data')}
        </Text>
        <Text style={[styles.legendText, styles.tapped]}>
          {t('hybrid.exercise.tapped')}
        </Text>
      </View>
      <View style={styles.statement} testID="exercise-statement">
        <Marked m={sheet.statement} testID="exercise-statement-text" />
      </View>
      {sheet.questions.map(q => (
        <QuestionRow
          key={q.id}
          q={{ id: q.id, label: q.label, status: 'available' }}
          state={q.state}
          onLayout={undefined}
          testID={`board-q-${q.id}-${q.state}`}
          wording={q.wording.map((w, i) => (
            <Marked key={i} m={w} testID={`board-q-${q.id}-text-${i}`} />
          ))}
        />
      ))}
      {given.length > 0 && (
        <View style={styles.results} testID="exercise-given">
          <Text style={styles.resultsTitle}>{t('hybrid.exercise.given')}</Text>
          {given.map(r => (
            <ResultTag
              key={r.id}
              id={r.id}
              statement={r.statement}
              mark={GIVEN_MARK}
              testID={`board-result-${r.id}-given`}
            />
          ))}
        </View>
      )}
      {proven.length > 0 && (
        <View style={styles.results} testID="exercise-proven">
          <Text style={styles.resultsTitle}>{t('hybrid.exercise.proven')}</Text>
          {proven.map(r => (
            <ResultTag
              key={r.id}
              id={r.id}
              statement={r.statement}
              mark={DONE_MARK}
              testID={`board-result-${r.id}-proven`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.md },
  legend: {
    flexDirection: theme.reading.row,
    gap: theme.space.md,
  },
  legendText: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  data: { textDecorationLine: 'underline' },
  tapped: {
    textDecorationLine: 'underline',
    fontFamily: theme.font.family.ui.bold,
    backgroundColor: theme.color.highlighterSoft,
  },
  statement: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  results: { gap: theme.space.sm, alignItems: theme.reading.startAlign },
  resultsTitle: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
});
