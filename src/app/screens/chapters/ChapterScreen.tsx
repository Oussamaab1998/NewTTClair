/**
 * One chapter: its domain, its textbook title, and our exercises for it. Each
 * card shows its exam source, the parts this chapter covers (done ✓, next,
 * open; any part opens on tap) and one button: start, resume from the next
 * part, or read again. A chapter without exercises says «قريبا».
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RichText } from '../../../lesson/blocks/RichText';
import { theme } from '../../../theme';
import { partLabel, type Opened } from '../../exercises';
import { examSession } from '../home/home';
import type { ChapterExercise, ChapterRow } from './chapters';
import { ChapterDomainIcon, ClockIcon } from './icons';

const BACK_MARK = '→';
const DONE_MARK = '✓';

export interface ChapterScreenProps {
  row: ChapterRow;
  classLabel: string;
  onBack: () => void;
  onOpen: (opened: Opened) => void;
}

export function ChapterScreen({ row, classLabel, onBack, onOpen }: ChapterScreenProps) {
  const { t } = useTranslation();
  const { chapter } = row;
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID={`chapter-${chapter.id}`}
    >
      <View style={styles.top}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('hybrid.back')}
          testID="chapter-back"
          hitSlop={theme.space.sm}
        >
          <Text style={styles.backMark}>{BACK_MARK}</Text>
        </Pressable>
        <View style={styles.domainChip}>
          <ChapterDomainIcon
            domain={chapter.domain}
            size={theme.font.size.callout}
            color={theme.color.pen}
          />
          <Text style={styles.domainText}>{t(`chapters.domain.${chapter.domain}`)}</Text>
        </View>
      </View>
      <Text style={styles.title} accessibilityRole="header" accessibilityLanguage="fr">
        {chapter.title.fr}
      </Text>
      <Text style={styles.classLine}>{classLabel}</Text>
      {row.exercises.length > 0 ? (
        <>
          <Text style={styles.section}>{t('chapters.exercises')}</Text>
          {row.exercises.map(x => (
            <ExerciseCard key={x.entry.id} item={x} onOpen={onOpen} />
          ))}
        </>
      ) : (
        <View style={styles.soon} testID="chapter-soon">
          <ClockIcon size={theme.size.homeIcon} color={theme.color.borderControl} />
          <Text style={styles.soonTitle}>{t('chapters.soon')}</Text>
          <Text style={styles.soonBody}>{t('chapters.soonBody')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function ExerciseCard({
  item,
  onOpen,
}: {
  item: ChapterExercise;
  onOpen: (opened: Opened) => void;
}) {
  const { t } = useTranslation();
  if (!item.entry.result.ok) {
    return null; // chapters.ts never passes one; never crash
  }
  const { exercise } = item.entry.result.loaded;
  const session = examSession(exercise.id);
  const source = session
    ? t('chapters.examLine', {
        year: session.year,
        session: t(`chapters.session.${session.kind}`),
        section: exercise.section ? t(`lesson.sectionShort.${exercise.section}`) : '',
      })
    : '';
  const points = exercise.paper?.points;
  const open = (partId: string) => onOpen({ exerciseId: exercise.id, partId });
  const doneSet = new Set(item.done);
  const nextOpen = item.state === 'started' ? item.next : null;
  return (
    <View style={styles.card} testID={`chapter-exercise-${exercise.id}`}>
      {(source !== '' || points !== undefined) && (
        <View style={styles.sourceLine}>
          <Text style={styles.source}>{source}</Text>
          {points !== undefined && (
            <Text style={styles.source}>
              {t('chapters.points', { n: String(points).replace('.', ',') })}
            </Text>
          )}
        </View>
      )}
      <View style={styles.titleLine}>
        <RichText runs={exercise.title.ar} style={styles.cardTitle} />
        <Text style={styles.number}>{t('lesson.exerciseLabel', { n: exercise.number })}</Text>
      </View>
      {item.partial && <Text style={styles.partial}>{t('chapters.partial')}</Text>}
      <View style={styles.chips}>
        {item.parts.map(p => {
          const done = doneSet.has(p);
          const current = p === nextOpen;
          const label = partLabel(p);
          return (
            <Pressable
              key={p}
              onPress={() => open(p)}
              style={[styles.chip, done && styles.chipDone, current && styles.chipCurrent]}
              accessibilityRole="button"
              accessibilityLabel={`${t('lesson.part')} ${label}${
                done ? `, ${t('picker.done')}` : current ? `, ${t('picker.current')}` : ''
              }`}
              testID={`chapter-part-${exercise.id}-${p}`}
            >
              <Text style={[styles.chipText, done && styles.chipTextDone]}>
                {done ? `${DONE_MARK} ${label}` : label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={styles.primary}
        onPress={() => open(item.next)}
        accessibilityRole="button"
        testID={`chapter-go-${exercise.id}`}
      >
        {item.state === 'started' ? (
          // Arabic, then the part label as its own LTR run.
          <RichText
            runs={[{ ar: `${t('chapters.resumeFrom')} ` }, { fr: partLabel(item.next) }]}
            style={styles.primaryText}
          />
        ) : (
          <Text style={styles.primaryText}>
            {item.state === 'done' ? t('chapters.again') : t('chapters.start')}
          </Text>
        )}
      </Pressable>
    </View>
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
  top: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    justifyContent: 'space-between',
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
  domainChip: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  domainText: { ...theme.font.small, color: theme.color.ink, writingDirection: 'ltr' },
  title: { ...theme.font.screenTitle, color: theme.color.ink, marginTop: theme.space.md, ...ltrRight },
  classLine: { ...theme.font.small, color: theme.color.inkMuted, ...ltrRight },
  section: { ...theme.font.header, color: theme.color.ink, marginTop: theme.space.lg, ...rtl },
  card: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  sourceLine: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.space.sm },
  source: { ...theme.font.small, color: theme.color.inkMuted, writingDirection: 'ltr' },
  titleLine: {
    flexDirection: theme.reading.row,
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  cardTitle: { ...theme.font.header, color: theme.color.ink },
  number: { ...theme.font.small, color: theme.color.inkMuted, writingDirection: 'ltr' },
  partial: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  chips: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  chip: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDone: { backgroundColor: theme.color.correct.bg, borderColor: theme.color.correct.ink },
  chipCurrent: { backgroundColor: theme.color.highlighter, borderColor: theme.color.ink },
  chipText: { ...theme.font.small, color: theme.color.ink, writingDirection: 'ltr' },
  chipTextDone: { fontFamily: theme.font.family.ui.bold, color: theme.color.correct.text },
  primary: {
    marginTop: theme.space.xs,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
    color: theme.color.card,
  },
  soon: {
    marginTop: theme.space.xl,
    alignItems: 'center',
    gap: theme.space.xs,
    padding: theme.space.section,
    borderRadius: theme.radius.sheet,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  soonTitle: {
    fontFamily: theme.font.family.ui.extraBold,
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.ink,
  },
  soonBody: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
