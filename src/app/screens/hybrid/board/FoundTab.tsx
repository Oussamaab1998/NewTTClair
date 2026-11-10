/**
 * «اللي لقيناه»: question by question (earlier ones from their records, the
 * one now live), the exam write-up with blanks filled from his accepted
 * lines only, how we got there (his lines with their reasons, the slips he
 * fixed, the rule once complete, his rules in his own words), and at the
 * end of a question the method card of its type.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FoundQuestion } from '../../../../hybrid/board';
import {
  Finding,
  SkeletonLine,
} from '../../../../lesson/feed/method/sheetParts';
import { RichView } from '../../../../lesson/feed/RichView';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { isolateInline } from '../../../../lesson/rich/runs';
import { lineLatex } from '../../../../method/lineChain';
import { theme } from '../../../../theme';

const DONE_MARK = '✓';

/** The method card of a question (also at the end of «الطريق»). */
export function MethodCardView({
  card,
  id,
  testID = `found-card-${id}`,
}: {
  card: NonNullable<FoundQuestion['card']>;
  id: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.label}>{t('hybrid.found.card')}</Text>
      <RichView rich={card.type} fontFamily={theme.font.family.ui.bold} />
      <Text style={styles.label}>{t('hybrid.found.cardSteps')}</Text>
      {card.steps.map((s, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.number}>{i + 1}</Text>
          <View style={styles.itemText}>
            <RichView rich={s} fontSize={theme.font.size.small} />
          </View>
        </View>
      ))}
      <Text style={styles.label}>{t('hybrid.found.cardChecks')}</Text>
      {card.checks.map((c, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.number}>{DONE_MARK}</Text>
          <View style={styles.itemText}>
            <RichView rich={c} fontSize={theme.font.size.small} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Question({ q }: { q: FoundQuestion }) {
  const { t } = useTranslation();
  const nothing =
    q.findings.length === 0 && q.fixed.length === 0 && q.rules.length === 0;
  return (
    <View style={styles.question} testID={`found-q-${q.questionId}`}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('hybrid.found.question')}</Text>
        <Text style={styles.titleLabel}>{q.label}</Text>
        {q.done && <Text style={styles.done}>{DONE_MARK}</Text>}
        {q.current && <Text style={styles.here}>{t('hybrid.found.here')}</Text>}
      </View>
      <Text style={styles.section}>{t('hybrid.found.writeup')}</Text>
      <View style={styles.paper} testID={`found-writeup-${q.questionId}`}>
        {q.writeup.map(r => (
          <SkeletonLine key={r.id} row={r} />
        ))}
      </View>
      <Text style={styles.section}>{t('hybrid.found.how')}</Text>
      {nothing && <Text style={styles.empty}>{t('hybrid.found.empty')}</Text>}
      {q.findings.map(f => (
        <Finding key={f.id} finding={f} />
      ))}
      {q.fixed.map(x => (
        <View
          key={x.node}
          style={styles.fixed}
          testID={`found-fixed-${x.node}`}
        >
          <Text style={styles.label}>{t('hybrid.found.fixed')}</Text>
          <Text style={styles.label}>{t('hybrid.found.before')}</Text>
          <MathBlock
            latex={lineLatex(x.before)}
            fontSize={theme.font.size.body}
          />
          <Text style={styles.label}>{t('hybrid.found.after')}</Text>
          <MathBlock
            latex={lineLatex(x.after)}
            fontSize={theme.font.size.body}
          />
        </View>
      ))}
      {q.rules.map((r, i) => (
        <View key={i} style={styles.rule}>
          <Text style={styles.label}>{t('hybrid.found.yourRule')}</Text>
          <Text style={styles.ruleText}>{isolateInline(r.text)}</Text>
        </View>
      ))}
      {q.card && <MethodCardView card={q.card} id={q.questionId} />}
    </View>
  );
}

export function FoundTab({ found }: { found: readonly FoundQuestion[] }) {
  return (
    <View style={styles.wrap} testID="found-tab">
      {found.map(q => (
        <Question key={q.questionId} q={q} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.section },
  question: { gap: theme.space.sm },
  head: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  title: {
    ...theme.font.header,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  titleLabel: {
    ...theme.font.header,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  done: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.ink,
  },
  here: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.md,
    writingDirection: 'rtl',
  },
  section: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  paper: {
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderPaper,
    backgroundColor: theme.color.card,
    gap: theme.space.xs,
  },
  empty: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fixed: {
    gap: theme.space.xxs,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  rule: {
    gap: theme.space.xxs,
    padding: theme.space.sm,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.highlighterSoft,
  },
  ruleText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  label: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    gap: theme.space.xs,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.active,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.card,
  },
  item: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  itemText: { flex: 1 },
  number: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
  },
});
