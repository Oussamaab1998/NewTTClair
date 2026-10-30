/**
 * The route of the question, as a sheet over the dimmed lesson (addendum E,
 * 21): every step with what it does, why, and what comes next. Rows are not
 * tappable. Done steps carry a check, the current one is a highlighter row
 * with an ink border: no other status, never a mistake. Findings and the
 * paper skeleton come later; this is the roadmap.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FindingResult, SkeletonRow } from '../../../method/findings';
import { lineLatex } from '../../../method/lineChain';
import type { Roadmap, RoadmapRow } from '../../../method/roadmap';
import { theme, type PaperStyle } from '../../../theme';
import { MathBlock } from '../../math/MathBlock';
import { PaperBackground } from '../../paper/PaperBackground';
import { RichView } from '../RichView';

const CLOSE_MARK = '×';
const CHECK = '✓';
const swallow = () => undefined;

export type MethodSheetCloseVia = 'close' | 'scrim' | 'back_gesture' | 'return';

interface Props {
  visible: boolean;
  roadmap: Roadmap;
  /** What he found, from his own accepted lines. */
  found?: readonly FindingResult[];
  /** The exam lines with blanks filled from his accepted lines only. */
  skeleton?: readonly SkeletonRow[];
  onClose: (via: MethodSheetCloseVia) => void;
  paperStyle?: PaperStyle;
}

export function MethodSheet({
  visible,
  roadmap,
  found = [],
  skeleton = [],
  onClose,
  paperStyle = theme.layout.paperStyle,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onClose('back_gesture')}
      testID="method-modal"
    >
      <Pressable
        style={styles.scrim}
        onPress={() => onClose('scrim')}
        testID="method-sheet-scrim"
      >
        <Pressable
          style={styles.sheet}
          onPress={swallow}
          accessible={false}
          testID="method-sheet"
        >
          <PaperBackground style={paperStyle} />
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>{t('method.sheet.title')}</Text>
            <Pressable
              onPress={() => onClose('close')}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('method.sheet.close')}
              testID="method-sheet-close"
            >
              <Text style={styles.closeMark}>{CLOSE_MARK}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            testID="method-sheet-scroll"
          >
            <Text style={styles.section}>{t('method.sheet.roadmap')}</Text>
            {roadmap.entries.map(e => (
              <Row key={e.id} row={e} />
            ))}
            {found.length > 0 && (
              <Text style={styles.section}>{t('method.sheet.found')}</Text>
            )}
            {found.map(f => (
              <Finding key={f.id} finding={f} />
            ))}
            {skeleton.length > 0 && (
              <>
                <Text style={styles.section}>{t('method.sheet.paper')}</Text>
                <View style={styles.paperSheet} testID="paper-skeleton">
                  {skeleton.map(r => (
                    <SkeletonLine key={r.id} row={r} />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <Pressable
            onPress={() => onClose('return')}
            style={styles.primary}
            accessibilityRole="button"
            testID="method-sheet-return"
          >
            <Text style={styles.primaryText}>{t('method.sheet.back')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** One finding: his own lines with their reasons; the rule with its condition once everything is found; the bridge to the exam notation. */
function Finding({ finding }: { finding: FindingResult }) {
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
function SkeletonLine({ row }: { row: SkeletonRow }) {
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

function Row({ row }: { row: RoadmapRow }) {
  const { t } = useTranslation();
  const status = t(
    row.status === 'done'
      ? 'method.sheet.done'
      : row.status === 'current'
      ? 'method.sheet.current'
      : 'method.sheet.upcoming',
  );
  return (
    <View
      style={[styles.row, row.status === 'current' && styles.rowCurrent]}
      accessible
      accessibilityLabel={status}
      testID={`method-row-${row.id}-${row.status}`}
    >
      <View style={[styles.mark, row.status === 'done' && styles.markDone]}>
        <Text style={styles.markText}>
          {row.status === 'done' ? CHECK : ''}
        </Text>
      </View>
      <View style={styles.info}>
        <RichView rich={row.short} fontFamily={theme.font.family.ui.bold} />
        <RichView rich={row.header.now} fontSize={theme.font.size.small} />
        <View style={styles.sub}>
          <Text style={styles.label}>{t('method.sheet.whyLabel')}</Text>
          <View style={styles.subText}>
            <RichView
              rich={row.header.why}
              fontSize={theme.font.size.small}
              color={theme.color.textSecondary}
            />
          </View>
        </View>
        <View style={styles.sub}>
          <Text style={styles.label}>{t('method.sheet.nextLabel')}</Text>
          <View style={styles.subText}>
            <RichView
              rich={row.header.next}
              fontSize={theme.font.size.small}
              color={theme.color.textSecondary}
            />
          </View>
        </View>
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: theme.color.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.sheetTop,
    borderTopRightRadius: theme.radius.sheetTop,
    overflow: 'hidden',
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.space.sheetBottom,
  },
  handle: {
    alignSelf: 'center',
    width: theme.size.touch,
    height: theme.space.xxs,
    borderRadius: theme.space.xxs,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.sm,
  },
  head: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  title: {
    flex: 1,
    ...theme.font.header,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  close: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.size.touch / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: { ...theme.font.header, color: theme.color.ink },
  body: { flexGrow: 0 },
  bodyContent: { gap: theme.space.sm, paddingBottom: theme.space.lg },
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
  section: {
    color: theme.color.textSecondary,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: theme.space.sm,
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
  paperSheet: {
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderPaper,
    backgroundColor: theme.color.card,
    gap: theme.space.xs,
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
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.color.textOnAccent,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
});
