/**
 * Parts of the route sheet shared with the lesson board's sheets (moved out
 * of MethodSheet.tsx with no change of behaviour): a step row (a check when
 * done, the current one a highlighter row with an ink border, its status in
 * words), a finding (his own lines with their reasons, the bridge to the
 * exam notation, the rule with its condition) and a paper skeleton line.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich } from '../../../content/schema';
import type { FindingResult, SkeletonRow } from '../../../method/findings';
import { lineLatex } from '../../../method/lineChain';
import type { RoadmapRow } from '../../../method/roadmap';
import { theme } from '../../../theme';
import { MathBlock } from '../../math/MathBlock';
import { RichView } from '../RichView';

const CHECK = '✓';

export type StepRowStatus = 'done' | 'current' | 'upcoming';

/** A step of the route: the mark, what the caller puts inside, the status in words. */
export function StepRow({
  status,
  statusLabel,
  testID,
  children,
}: {
  status: StepRowStatus;
  statusLabel: string;
  testID: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[styles.row, status === 'current' && styles.rowCurrent]}
      accessible
      accessibilityLabel={statusLabel}
      testID={testID}
    >
      <View style={[styles.mark, status === 'done' && styles.markDone]}>
        <Text style={styles.markText}>{status === 'done' ? CHECK : ''}</Text>
      </View>
      <View style={styles.info}>{children}</View>
      <Text style={styles.status}>{statusLabel}</Text>
    </View>
  );
}

/** A label and its small secondary text, on one line in reading order («علاش» ...). */
export function SubLine({ label, rich }: { label: string; rich: Rich }) {
  return (
    <View style={styles.sub}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.subText}>
        <RichView
          rich={rich}
          fontSize={theme.font.size.small}
          color={theme.color.textSecondary}
        />
      </View>
    </View>
  );
}

/** A roadmap row: its title, what it does, why, and what comes next. */
export function RouteRow({ row }: { row: RoadmapRow }) {
  const { t } = useTranslation();
  const status = t(
    row.status === 'done'
      ? 'method.sheet.done'
      : row.status === 'current'
      ? 'method.sheet.current'
      : 'method.sheet.upcoming',
  );
  return (
    <StepRow
      status={row.status}
      statusLabel={status}
      testID={`method-row-${row.id}-${row.status}`}
    >
      <RichView rich={row.short} fontFamily={theme.font.family.ui.bold} />
      <RichView rich={row.header.now} fontSize={theme.font.size.small} />
      <SubLine label={t('method.sheet.whyLabel')} rich={row.header.why} />
      <SubLine label={t('method.sheet.nextLabel')} rich={row.header.next} />
    </StepRow>
  );
}

/** One finding: his own lines with their reasons; the rule with its condition once everything is found; the bridge to the exam notation. */
export function Finding({ finding }: { finding: FindingResult }) {
  const { t } = useTranslation();
  return (
    <View style={styles.finding} testID={`finding-${finding.id}`}>
      <RichView rich={finding.title} fontFamily={theme.font.family.ui.bold} />
      {finding.lines.map(l => (
        <View key={l.nodeId} style={styles.findingLine}>
          <MathBlock latex={lineLatex(l.raw)} fontSize={theme.font.size.body} />
          {l.reason && (
            <RichView
              rich={l.reason}
              fontSize={theme.font.size.small}
              color={theme.color.textSecondary}
            />
          )}
        </View>
      ))}
      {finding.bridge.map(b => (
        <View
          key={b.nodeId}
          style={styles.bridge}
          testID={`bridge-${b.nodeId}`}
        >
          <Text style={styles.label}>{t('method.sheet.did')}</Text>
          <MathBlock latex={lineLatex(b.did)} fontSize={theme.font.size.body} />
          <Text style={styles.label}>{t('method.sheet.exam')}</Text>
          <MathBlock latex={b.exam} fontSize={theme.font.size.body} />
        </View>
      ))}
      {finding.rule && (
        <View style={styles.rule} testID={`rule-${finding.id}`}>
          <Text style={styles.label}>{t('method.sheet.rule')}</Text>
          <RichView
            rich={finding.rule.text}
            fontFamily={theme.font.family.ui.bold}
          />
          <Text style={styles.label}>{t('method.sheet.condition')}</Text>
          <RichView rich={finding.rule.condition} />
        </View>
      )}
    </View>
  );
}

/** An exam line: the French text in the paper font, a blank dashed until his own accepted line fills it. */
export function SkeletonLine({ row }: { row: SkeletonRow }) {
  const { t } = useTranslation();
  return (
    <View style={styles.skeletonLine} testID={`skeleton-${row.id}`}>
      {row.parts.map((p, i) =>
        'text' in p ? (
          <Text key={i} style={styles.paperText}>
            {p.text}
          </Text>
        ) : p.value !== null ? (
          <Text
            key={i}
            style={[styles.paperText, styles.filled]}
            testID={`skeleton-fill-${p.node}`}
          >
            {p.value}
          </Text>
        ) : (
          <View
            key={i}
            style={styles.blank}
            accessible
            accessibilityLabel={t('method.sheet.blank')}
            testID={`skeleton-blank-${p.node}`}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: theme.reading.row,
    gap: theme.space.sm,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  rowCurrent: {
    backgroundColor: theme.color.highlighterSoft,
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
  },
  mark: {
    width: theme.space.xl,
    height: theme.space.xl,
    borderRadius: theme.space.xl,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: { backgroundColor: theme.color.pen, borderColor: theme.color.pen },
  markText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.small,
  },
  info: { flex: 1, gap: theme.space.xxs },
  sub: { flexDirection: theme.reading.row, gap: theme.space.xs },
  subText: { flex: 1 },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.font.size.small,
    writingDirection: 'rtl',
  },
  status: {
    alignSelf: theme.reading.endAlign,
    color: theme.color.textSecondary,
    fontSize: theme.font.size.small,
    writingDirection: 'rtl',
  },
  finding: {
    gap: theme.space.xs,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  findingLine: {
    gap: theme.space.xxs,
    borderBottomWidth: theme.border.line,
    borderBottomColor: theme.color.gridLine,
    paddingBottom: theme.space.xs,
  },
  bridge: { gap: theme.space.xxs },
  rule: {
    gap: theme.space.xxs,
    padding: theme.space.sm,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.highlighterSoft,
  },
  skeletonLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    direction: 'ltr',
    gap: theme.space.xxs,
  },
  paperText: {
    ...theme.font.paper,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  filled: { color: theme.color.pen },
  blank: {
    minWidth: theme.size.touch,
    height: theme.space.xl,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.borderControl,
    borderRadius: theme.radius.chip,
  },
});
