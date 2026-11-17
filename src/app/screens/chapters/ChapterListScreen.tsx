/**
 * «الدروس»: the student's official chapter list. Counts, then the chapters
 * that have exercises now (or an honest «in the works» card), then the whole
 * programme by domain with a domain filter. A chapter without exercises says
 * «قريبا» with a clock and a dashed edge (never colour alone).
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Domain } from '../../../content/curriculum';
import { theme } from '../../../theme';
import type { ChapterList, ChapterRow } from './chapters';
import {
  ChapterDomainIcon,
  ClockIcon,
  PencilIcon,
  SchoolIcon,
  HourglassIcon,
} from './icons';

const BACK_MARK = '→';
const OPEN_MARK = '‹';

export interface ChapterListScreenProps {
  list: ChapterList;
  /** "Bac · Sciences expérimentales" (an LTR run). */
  classLabel: string;
  filter: Domain | 'all';
  onFilter: (f: Domain | 'all') => void;
  onChangeClass: () => void;
  onOpenChapter: (chapterId: string) => void;
  onBack?: () => void;
}

export function ChapterListScreen(p: ChapterListScreenProps) {
  const { t } = useTranslation();
  const total = p.list.track.chapters.length;
  const groups = p.list.groups.filter(
    g => p.filter === 'all' || g.domain === p.filter,
  );
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="chapter-list"
    >
      <View style={styles.headRow}>
        {p.onBack && (
          <Pressable
            style={styles.back}
            onPress={p.onBack}
            accessibilityRole="button"
            accessibilityLabel={t('hybrid.back')}
            testID="chapters-back"
            hitSlop={theme.space.sm}
          >
            <Text style={styles.backMark}>{BACK_MARK}</Text>
          </Pressable>
        )}
        <Text style={styles.title} accessibilityRole="header">
          {t('chapters.title')}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.classChip, pressed && styles.pressed]}
        onPress={p.onChangeClass}
        accessibilityRole="button"
        accessibilityLabel={`${t('chapters.changeA11y')}: ${p.classLabel}`}
        testID="chapters-change-class"
      >
        <SchoolIcon size={theme.font.size.bodyLarge} color={theme.color.pen} />
        <Text style={styles.classText}>{p.classLabel}</Text>
        <Text style={styles.changeText}>{t('chapters.change')}</Text>
      </Pressable>
      <View style={styles.tiles}>
        <Tile n={total} label={t('chapters.inProgramme')} testID="tile-total" />
        <Tile
          n={p.list.available.length}
          label={t('chapters.withExercises')}
          testID="tile-available"
        />
      </View>
      {p.list.available.length > 0 ? (
        <>
          <Text style={styles.section}>{t('chapters.startNow')}</Text>
          {p.list.available.map(r => (
            <NowCard key={r.chapter.id} row={r} onOpen={p.onOpenChapter} />
          ))}
        </>
      ) : (
        <View style={styles.empty} testID="chapters-empty">
          <HourglassIcon size={theme.size.homeIcon} color={theme.color.borderControl} />
          <Text style={styles.emptyTitle}>{t('chapters.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('chapters.emptyBody')}</Text>
        </View>
      )}
      <Text style={styles.section}>{t('chapters.wholeProgramme')}</Text>
      <View style={styles.filters}>
        {(['all', ...p.list.groups.map(g => g.domain)] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.filter, p.filter === f && styles.filterOn]}
            onPress={() => p.onFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: p.filter === f }}
            testID={`chapters-filter-${f}`}
          >
            {f !== 'all' && (
              <ChapterDomainIcon
                domain={f}
                size={theme.font.size.callout}
                color={theme.color.ink}
              />
            )}
            <Text style={[styles.filterText, p.filter === f && styles.filterTextOn]}>
              {f === 'all' ? t('chapters.all') : t(`chapters.domain.${f}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {groups.map(g => (
        <View key={g.domain} style={styles.group} testID={`chapters-group-${g.domain}`}>
          <View style={styles.groupHead}>
            <ChapterDomainIcon
              domain={g.domain}
              size={theme.font.size.callout}
              color={theme.color.inkMuted}
            />
            <Text style={styles.groupTitle}>{t(`chapters.domain.${g.domain}`)}</Text>
          </View>
          {g.rows.map(r => (
            <Row key={r.chapter.id} row={r} onOpen={p.onOpenChapter} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Tile({ n, label, testID }: { n: number; label: string; testID: string }) {
  return (
    <View style={styles.tile} testID={testID} accessible accessibilityLabel={`${n} ${label}`}>
      <Text style={styles.tileNumber}>{n}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function IconSquare({ row, muted }: { row: ChapterRow; muted?: boolean }) {
  return (
    <View style={[styles.icon, muted && styles.iconMuted]}>
      <ChapterDomainIcon
        domain={row.chapter.domain}
        size={theme.font.size.title}
        color={muted ? theme.color.inkDisabled : theme.color.pen}
      />
    </View>
  );
}

/** A chapter that has exercises: bigger, pen edge, with its progress. */
function NowCard({ row, onOpen }: { row: ChapterRow; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const share = row.totalParts ? row.doneParts / row.totalParts : 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.now, pressed && styles.pressed]}
      onPress={() => onOpen(row.chapter.id)}
      accessibilityRole="button"
      accessibilityLabel={`${row.chapter.title.fr}, ${t('chapters.progress', {
        done: row.doneParts,
        total: row.totalParts,
      })}`}
      testID={`chapter-now-${row.chapter.id}`}
    >
      <View style={styles.rowLine}>
        <IconSquare row={row} />
        <View style={styles.nowText}>
          <Text style={styles.nowDomain}>{t(`chapters.domain.${row.chapter.domain}`)}</Text>
          <Text style={styles.nowTitle}>{row.chapter.title.fr}</Text>
        </View>
        <Text style={styles.openMark}>{OPEN_MARK}</Text>
      </View>
      <View style={styles.progressLine}>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {t('chapters.progress', { done: row.doneParts, total: row.totalParts })}
        </Text>
      </View>
    </Pressable>
  );
}

/** A row of the whole programme: with its question count, or «قريبا». */
function Row({ row, onOpen }: { row: ChapterRow; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const soon = row.exercises.length === 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, soon && styles.rowSoon, pressed && styles.pressed]}
      onPress={() => onOpen(row.chapter.id)}
      accessibilityRole="button"
      accessibilityLabel={`${row.chapter.title.fr}, ${
        soon ? t('chapters.soon') : t('chapters.questionsA11y', { n: row.totalParts })
      }`}
      testID={`chapter-row-${row.chapter.id}`}
    >
      <IconSquare row={row} muted={soon} />
      <Text style={[styles.rowTitle, soon && styles.rowTitleSoon]}>
        {row.chapter.title.fr}
      </Text>
      {soon ? (
        <View style={[styles.tag, styles.tagSoon]}>
          <ClockIcon size={theme.font.size.small} color={theme.color.inkMuted} />
          <Text style={styles.tagSoonText}>{t('chapters.soon')}</Text>
        </View>
      ) : (
        <View style={[styles.tag, styles.tagOk]}>
          <PencilIcon size={theme.font.size.small} color={theme.color.correct.text} />
          <Text style={styles.tagOkText}>{row.totalParts}</Text>
        </View>
      )}
      <Text style={styles.openMarkMuted}>{OPEN_MARK}</Text>
    </Pressable>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' } as const;
const ltrRight = { textAlign: 'right', writingDirection: 'ltr' } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.paper },
  content: {
    padding: theme.layout.gutter,
    paddingBottom: theme.space.scrollEnd,
    gap: theme.space.sm,
  },
  headRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
  },
  back: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMark: { ...theme.font.header, color: theme.color.ink },
  title: { ...theme.font.screenTitle, color: theme.color.ink, ...rtl },
  classChip: {
    alignSelf: theme.reading.startAlign,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  classText: { ...theme.font.small, color: theme.color.ink, writingDirection: 'ltr' },
  changeText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.pen,
  },
  pressed: { opacity: theme.opacity.pressed },
  tiles: { flexDirection: theme.reading.row, gap: theme.space.sm, marginTop: theme.space.xs },
  tile: {
    flex: 1,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  tileNumber: { ...theme.font.header, color: theme.color.ink, ...ltrRight },
  tileLabel: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  section: {
    ...theme.font.header,
    color: theme.color.ink,
    marginTop: theme.space.lg,
    ...rtl,
  },
  now: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    borderRadius: theme.radius.sheet,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  rowLine: { flexDirection: theme.reading.row, alignItems: 'center', gap: theme.space.md },
  nowText: { flex: 1 },
  nowDomain: { ...theme.font.small, color: theme.color.inkMuted, ...ltrRight },
  nowTitle: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.bodyLarge,
    lineHeight: theme.font.lineHeight.body,
    color: theme.color.ink,
    ...ltrRight,
  },
  openMark: { ...theme.font.header, color: theme.color.pen },
  openMarkMuted: { ...theme.font.header, color: theme.color.borderControl },
  progressLine: { flexDirection: theme.reading.row, alignItems: 'center', gap: theme.space.sm },
  bar: {
    flex: 1,
    height: theme.size.progressBar,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.color.border,
    overflow: 'hidden',
  },
  // Fills from the reading start (right).
  barFill: {
    alignSelf: theme.reading.startAlign,
    height: '100%',
    backgroundColor: theme.color.pen,
  },
  progressText: { ...theme.font.small, color: theme.color.inkMuted, writingDirection: 'ltr' },
  empty: {
    marginTop: theme.space.lg,
    alignItems: 'center',
    gap: theme.space.xs,
    padding: theme.space.xxl,
    borderRadius: theme.radius.sheet,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  emptyTitle: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
    lineHeight: theme.font.lineHeight.body,
    color: theme.color.ink,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyBody: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  filters: { flexDirection: theme.reading.row, flexWrap: 'wrap', gap: theme.space.xs },
  filter: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
    minHeight: theme.size.askChipMinHeight,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  filterOn: { backgroundColor: theme.color.highlighter, borderColor: theme.color.ink },
  filterText: { ...theme.font.small, color: theme.color.ink, writingDirection: 'ltr' },
  filterTextOn: { fontFamily: theme.font.family.ui.bold },
  group: { gap: theme.space.xs, marginTop: theme.space.sm },
  groupHead: { flexDirection: theme.reading.row, alignItems: 'center', gap: theme.space.xs },
  groupTitle: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.footnote,
    color: theme.color.inkMuted,
    writingDirection: 'ltr',
  },
  row: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: theme.size.touch,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  rowSoon: { borderStyle: 'dashed', backgroundColor: theme.color.paper },
  icon: {
    width: theme.size.homeIcon,
    height: theme.size.homeIcon,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.deepDive.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMuted: { backgroundColor: theme.color.border },
  rowTitle: {
    flex: 1,
    fontFamily: theme.font.family.ui.medium,
    fontSize: theme.font.size.callout,
    lineHeight: theme.font.lineHeight.body,
    color: theme.color.ink,
    ...ltrRight,
  },
  rowTitleSoon: { color: theme.color.inkMuted },
  tag: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxxs,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.xxxs,
  },
  tagSoon: { backgroundColor: theme.color.border },
  tagSoonText: { ...theme.font.small, color: theme.color.ink },
  tagOk: { backgroundColor: theme.color.correct.bg },
  tagOkText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.correct.text,
  },
});
