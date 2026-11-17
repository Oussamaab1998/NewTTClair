/**
 * The onboarding's three screens (owner-approved mockup v2, 2026-11-17):
 * 1. the TTeClair wordmark and the class (year, then section);
 * 2. an analysis question of his year, turned into a map in derja
 *    («عندنا / المطلوب / الطريق»): TTeClair explains before he solves;
 * 3. a probability or statistics question of his year, written line by line:
 *    a right line, a mistake, a hint, his question in Arabizi, TTeClair's
 *    answer, the fixed line, and «تسجّلت» (the gap is remembered).
 * Math and French exam lines are LTR runs of their own, never inside Arabic.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SectionId, Year } from '../../../content/curriculum';
import type {
  AnalysisExample,
  PracticeExample,
} from '../../../content/onboardingExamples';
import { RichText } from '../../../lesson/blocks/RichText';
import { theme } from '../../../theme';
import { ClassChoice } from '../chapters/ClassPicker';
import { SchoolIcon } from '../chapters/icons';
import { Reveal } from './Reveal';

const OK_MARK = '✓';
const WRONG_MARK = '✗';
const DOWN_MARK = '↓';

/** When each block shows (ms after the screen): the story plays in order. */
export const AT = {
  pill: 0,
  title: 150,
  statement: 250,
  derja: 550,
  have: 850,
  goal: 1450,
  road: 2050,
  given: 600,
  wrong: 1100,
  hint: 2000,
  question: 3000,
  reply: 4000,
  fixed: 5200,
  remembered: 6000,
} as const;

/** Screen 1: the wordmark, then «في أنا قسم تقرا؟». */
export function ClassStep(p: {
  year: Year | null;
  section: SectionId | null;
  onYear: (y: Year) => void;
  onSection: (s: SectionId) => void;
  nudge: boolean;
  still: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.step} testID="onboarding-class">
      <Reveal at={0} still={p.still}>
        <Wordmark big />
        <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
      </Reveal>
      <Reveal at={AT.title} still={p.still}>
        <Text style={styles.title}>{t('chapters.classTitle')}</Text>
        <Text style={styles.lead}>{t('onboarding.classLead')}</Text>
      </Reveal>
      <Reveal at={AT.statement} still={p.still}>
        <ClassChoice
          year={p.year}
          section={p.section}
          onYear={p.onYear}
          onSection={p.onSection}
        />
      </Reveal>
      {p.nudge && (
        <Text style={styles.nudge} testID="onboarding-nudge" accessibilityLiveRegion="polite">
          {t('onboarding.pickFirst')}
        </Text>
      )}
    </View>
  );
}

/** "TTe" + "Clair" on a rounded highlighter mark (a name: always LTR). */
export function Wordmark({ big = false }: { big?: boolean }) {
  const { t } = useTranslation();
  const text = big ? styles.wordmark : styles.wordmarkSmall;
  return (
    <View
      style={styles.wordmarkRow}
      accessible
      accessibilityRole="header"
      accessibilityLabel={t('onboarding.tutorName')}
    >
      <Text style={text}>{t('onboarding.brandA')}</Text>
      <View style={[styles.wordmarkMark, big && styles.wordmarkMarkBig]}>
        <Text style={text}>{t('onboarding.brandB')}</Text>
      </View>
    </View>
  );
}

/** «من البرنامج متاعك · Bac · Mathématiques». */
function ProgrammePill({ classLabel }: { classLabel: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.pill}>
      <SchoolIcon size={theme.font.size.body} color={theme.color.pen} />
      <Text style={styles.pillText}>{t('onboarding.fromYourProgramme')}</Text>
      <Text style={styles.pillClass}>{classLabel}</Text>
    </View>
  );
}

/** The exam wording: its source, then the statement (French, LTR). */
function Statement({
  source,
  statement,
  compact = false,
}: {
  source: string;
  statement: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.statement} testID="onboarding-statement">
      <Text style={styles.source}>{source}</Text>
      <Text
        style={[styles.statementText, compact && styles.statementCompact]}
        accessibilityLanguage="fr"
      >
        {statement}
      </Text>
    </View>
  );
}

/** "TTeClair" on its own line, then the screen's promise (never a Latin name inside Arabic). */
function PromiseTitle({ title, still }: { title: string; still: boolean }) {
  const { t } = useTranslation();
  return (
    <Reveal at={AT.title} still={still} style={styles.promise}>
      <Text style={styles.tutor}>{t('onboarding.tutorName')}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </Reveal>
  );
}

/** Screen 2: the question, then its map in derja. */
export function MapStep(p: { example: AnalysisExample; classLabel: string; still: boolean }) {
  const { t } = useTranslation();
  const { example: ex, still } = p;
  const inDerja = `${t('onboarding.inDerja')} ${DOWN_MARK}`;
  return (
    <View style={styles.step} testID="onboarding-map">
      <PromiseTitle title={t('onboarding.mapTitle')} still={still} />
      <Reveal at={AT.pill} still={still}>
        <ProgrammePill classLabel={p.classLabel} />
      </Reveal>
      <Reveal at={AT.statement} still={still}>
        <Statement source={ex.source} statement={ex.statement} />
      </Reveal>
      <Reveal at={AT.derja} still={still}>
        <Text style={styles.derja}>{inDerja}</Text>
      </Reveal>
      <Reveal at={AT.have - AT.title} still={still} style={styles.map}>
        <MapRow at={AT.have} still={still} label={t('onboarding.have')}>
          <RichText runs={ex.have} style={styles.mapText} />
        </MapRow>
        <MapRow at={AT.goal} still={still} label={t('onboarding.goal')}>
          <RichText runs={ex.goal} style={styles.mapText} />
          <View style={styles.goalMath}>
            <Text style={styles.goalMathText}>{ex.goalMath}</Text>
          </View>
        </MapRow>
        <MapRow
          at={AT.road}
          still={still}
          label={t('onboarding.road')}
          tag={t('onboarding.stepByStep')}
          last
        >
          <RichText runs={ex.road} style={styles.mapText} />
        </MapRow>
      </Reveal>
    </View>
  );
}

function MapRow(p: {
  at: number;
  still: boolean;
  label: string;
  tag?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Reveal at={p.at} still={p.still} style={styles.mapRow}>
      {/* The dot, and the road down to the next one (none after the last). */}
      <View style={styles.dotColumn}>
        <View style={[styles.dot, p.last && styles.dotOpen]} />
        {!p.last && <View style={styles.road} />}
      </View>
      <View style={styles.mapBody}>
        <View style={styles.mapLabelLine}>
          <Text style={styles.mapLabel}>{p.label}</Text>
          {p.tag !== undefined && <Text style={styles.tag}>{p.tag}</Text>}
        </View>
        {p.children}
      </View>
    </Reveal>
  );
}

/** Screen 3: his lines, the mistake, the hint, his question, TTeClair's answer. */
export function LinesStep(p: { example: PracticeExample; classLabel: string; still: boolean }) {
  const { t } = useTranslation();
  const { example: ex, still } = p;
  return (
    <View style={styles.step} testID="onboarding-lines">
      <PromiseTitle title={t('onboarding.linesTitle')} still={still} />
      <Reveal at={AT.pill} still={still}>
        <ProgrammePill classLabel={p.classLabel} />
      </Reveal>
      <Reveal at={AT.statement} still={still}>
        <Statement source={ex.source} statement={ex.statement} compact />
      </Reveal>
      <Reveal at={AT.given - AT.title} still={still} style={styles.sheet}>
        <Reveal at={AT.given} still={still}>
          <MathLine text={ex.given} ok />
        </Reveal>
        <Reveal at={AT.wrong} still={still}>
          <MathLine text={ex.wrong} ok={false} still={still} />
        </Reveal>
        <Reveal at={AT.hint} still={still} style={styles.hint}>
          <RichText
            runs={[{ ar: `${t('onboarding.hint')} · ` }, ...ex.hint]}
            style={styles.hintText}
          />
        </Reveal>
        <Reveal at={AT.question} still={still} style={styles.bubble}>
          <Text style={styles.bubbleText}>{ex.question}</Text>
        </Reveal>
        <Reveal at={AT.reply} still={still} style={styles.reply}>
          <Text style={styles.replyName}>{t('onboarding.tutorName')}</Text>
          <RichText runs={ex.reply} style={styles.replyText} />
        </Reveal>
        <Reveal at={AT.fixed} still={still}>
          <MathLine text={ex.fixed} ok last />
        </Reveal>
      </Reveal>
      <Reveal at={AT.remembered} still={still} style={styles.remembered}>
        <Text style={styles.skill}>{ex.skill}</Text>
        <Text style={styles.rememberedText}>{t('onboarding.remembered')}</Text>
      </Reveal>
    </View>
  );
}

/** One exam-paper line (LTR) with its mark at the end: ✓ right, ✗ a mistake (with an underline). */
function MathLine({
  text,
  ok,
  last,
  still = true,
}: {
  text: string;
  ok: boolean;
  last?: boolean;
  still?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={[styles.line, last && styles.lineLast]}
      accessible
      accessibilityLabel={`${text}, ${ok ? t('onboarding.okLine') : t('onboarding.wrongLine')}`}
    >
      <View>
        <Text style={styles.lineText}>{text}</Text>
        {!ok && (
          <Reveal at={AT.wrong + AT.wrong / 2} still={still}>
            <View style={styles.underline} />
          </Reveal>
        )}
      </View>
      <Text style={ok ? styles.okMark : styles.wrongMark}>{ok ? OK_MARK : WRONG_MARK}</Text>
    </View>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' } as const;
const ltrRight = { textAlign: 'right', writingDirection: 'ltr' } as const;

const styles = StyleSheet.create({
  step: { gap: theme.space.lg },
  wordmarkRow: {
    alignSelf: theme.reading.startAlign,
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
  },
  wordmark: { ...theme.font.wordmark, color: theme.color.ink, writingDirection: 'ltr' },
  wordmarkSmall: {
    fontFamily: theme.font.family.ui.extraBold,
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  wordmarkMark: {
    backgroundColor: theme.color.highlighter,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.xxxs,
  },
  wordmarkMarkBig: { borderRadius: theme.radius.xl, paddingHorizontal: theme.space.xs },
  tagline: { ...theme.font.body, color: theme.color.inkMuted, ...rtl },
  title: { ...theme.font.screenTitle, color: theme.color.ink, ...rtl },
  lead: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  nudge: {
    ...theme.font.small,
    color: theme.color.error.noteText,
    backgroundColor: theme.color.error.noteBg,
    borderColor: theme.color.error.noteBorder,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    ...rtl,
  },
  promise: { gap: theme.space.xxs },
  tutor: {
    fontFamily: theme.font.family.ui.extraBold,
    fontSize: theme.font.size.callout,
    color: theme.color.pen,
    ...ltrRight,
  },
  pill: {
    alignSelf: theme.reading.startAlign,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  pillText: { ...theme.font.small, color: theme.color.ink },
  pillClass: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  statement: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
    padding: theme.space.lg,
    gap: theme.space.xxs,
  },
  source: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  statementText: {
    ...theme.font.paper,
    color: theme.color.ink,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  statementCompact: {
    fontSize: theme.font.size.callout,
    lineHeight: theme.font.lineHeight.body,
  },
  derja: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.pen,
    textAlign: 'center',
  },
  map: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
    padding: theme.space.lg,
    gap: theme.space.lg,
  },
  mapRow: { flexDirection: theme.reading.row, gap: theme.space.md },
  dotColumn: { alignItems: 'center' },
  // Runs into the gap below the row, to the next dot.
  road: {
    flex: 1,
    width: theme.border.thick,
    marginBottom: -theme.space.lg - theme.space.sm,
    backgroundColor: theme.color.pen,
  },
  dot: {
    marginTop: theme.space.sm,
    width: theme.space.lg,
    height: theme.space.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.pen,
  },
  dotOpen: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.selected,
    borderColor: theme.color.pen,
  },
  mapBody: { flex: 1, gap: theme.space.xxs },
  mapLabelLine: { flexDirection: theme.reading.row, alignItems: 'center', gap: theme.space.xs },
  mapLabel: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
    color: theme.color.ink,
  },
  tag: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.caption,
    color: theme.color.ink,
    backgroundColor: theme.color.highlighter,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.xs,
    overflow: 'hidden',
  },
  mapText: { color: theme.color.inkMuted },
  goalMath: {
    alignSelf: theme.reading.startAlign,
    borderWidth: theme.border.thin,
    borderStyle: 'dashed',
    borderColor: theme.color.pen,
    backgroundColor: theme.color.deepDive.bg,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.sm,
  },
  goalMathText: { ...theme.font.paper, color: theme.color.ink, writingDirection: 'ltr' },
  sheet: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xs,
    gap: theme.space.sm,
  },
  line: {
    flexDirection: theme.mathSide.row,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.space.xs,
    borderBottomWidth: theme.border.thin,
    borderBottomColor: theme.color.gridLine,
  },
  lineLast: { borderBottomWidth: 0 },
  lineText: { ...theme.font.paper, color: theme.color.ink, writingDirection: 'ltr' },
  underline: { height: theme.border.thick, backgroundColor: theme.color.error.ink },
  okMark: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.title,
    color: theme.color.correct.ink,
  },
  wrongMark: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.title,
    color: theme.color.error.ink,
  },
  hint: {
    backgroundColor: theme.color.error.noteBg,
    borderColor: theme.color.error.noteBorder,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
  },
  hintText: { color: theme.color.error.noteText },
  // His question: a blue-pen bubble at the reading end (DESIGN.md §3).
  bubble: {
    alignSelf: theme.reading.endAlign,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xs,
  },
  bubbleText: { ...theme.font.small, color: theme.color.pen, writingDirection: 'ltr' },
  reply: { gap: theme.space.xxxs },
  replyName: {
    fontFamily: theme.font.family.ui.extraBold,
    fontSize: theme.font.size.footnote,
    color: theme.color.pen,
    ...ltrRight,
  },
  replyText: { color: theme.color.ink },
  remembered: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  skill: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.correct.text,
    backgroundColor: theme.color.correct.bg,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.sm,
    overflow: 'hidden',
    writingDirection: 'ltr',
  },
  rememberedText: { ...theme.font.small, color: theme.color.correct.text, ...rtl },
});
