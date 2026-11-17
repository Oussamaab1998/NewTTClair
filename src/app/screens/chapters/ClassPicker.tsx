/**
 * «في أنا قسم تقرا؟»: the year cards, then (2ème and up) the section cards.
 * Scientific sections only; labels come from the curriculum map. ClassPicker is
 * the screen (before the first chapter list, and «بدّل»); ClassChoice is just
 * the cards, which the onboarding's first screen reuses.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  CURRICULUM,
  type SectionId,
  type Year,
  YEARS,
  sectionsOf,
} from '../../../content/curriculum';
import { theme } from '../../../theme';
import type { StudentClass } from './chapters';
import { SectionIcon } from './icons';

const BACK_MARK = '→';
const CHECK = '✓';

/** The class once the picks make one (a section is needed from 2ème on). */
export function pickedClass(
  year: Year | null,
  section: SectionId | null,
): StudentClass | null {
  if (year === null) {
    return null;
  }
  const sections = sectionsOf(year);
  if (sections.length === 0) {
    return { year, section: null };
  }
  return section !== null && sections.includes(section) ? { year, section } : null;
}

export interface ClassChoiceProps {
  year: Year | null;
  section: SectionId | null;
  onYear: (year: Year) => void;
  onSection: (section: SectionId) => void;
}

/** The year cards, then the section cards of that year. */
export function ClassChoice({ year, section, onYear, onSection }: ClassChoiceProps) {
  const { t } = useTranslation();
  const sections = year ? sectionsOf(year) : [];
  const label = (id: Year | SectionId) =>
    [...CURRICULUM.years, ...CURRICULUM.sections].find(x => x.id === id)!;
  return (
    <View style={styles.choice}>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {YEARS.map(y => (
          <Card
            key={y}
            selected={year === y}
            big={t(`chapters.yearShort.${y}`)}
            ar={label(y).ar}
            onPress={() => onYear(y)}
            testID={`class-year-${y}`}
          />
        ))}
      </View>
      {sections.length > 0 && (
        <>
          <Text style={styles.subtitle}>{t('chapters.classSection')}</Text>
          <View style={styles.grid} accessibilityRole="radiogroup">
            {sections.map(s => (
              <Card
                key={s}
                selected={section === s}
                icon={s}
                ar={label(s).ar}
                fr={label(s).fr}
                onPress={() => onSection(s)}
                testID={`class-section-${s}`}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

/** Keeps a section only if the new year has it. */
export const sectionForYear = (y: Year, s: SectionId | null) =>
  s !== null && sectionsOf(y).includes(s) ? s : null;

export interface ClassPickerProps {
  /** The class to show selected (changing it with «بدّل»). */
  initial?: StudentClass | null;
  onPick: (cls: StudentClass) => void;
  onBack?: () => void;
}

export function ClassPicker({ initial, onPick, onBack }: ClassPickerProps) {
  const { t } = useTranslation();
  const [year, setYear] = useState<Year | null>(initial?.year ?? null);
  const [section, setSection] = useState<SectionId | null>(
    initial?.section ?? null,
  );
  const picked = pickedClass(year, section);
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="class-picker"
    >
      {onBack && (
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('hybrid.back')}
          testID="class-back"
          hitSlop={theme.space.sm}
        >
          <Text style={styles.backMark}>{BACK_MARK}</Text>
        </Pressable>
      )}
      <Text style={styles.title} accessibilityRole="header">
        {t('chapters.classTitle')}
      </Text>
      <Text style={styles.lead}>{t('chapters.classLead')}</Text>
      <ClassChoice
        year={year}
        section={section}
        onYear={y => {
          setYear(y);
          setSection(s => sectionForYear(y, s));
        }}
        onSection={setSection}
      />
      <Pressable
        style={[styles.next, !picked && styles.nextDisabled]}
        disabled={!picked}
        onPress={() => picked && onPick(picked)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !picked }}
        testID="class-next"
      >
        <Text style={styles.nextText}>{t('chapters.classNext')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Card(p: {
  selected: boolean;
  big?: string;
  icon?: SectionId;
  ar: string;
  fr?: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        p.selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
      onPress={p.onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: p.selected }}
      accessibilityLabel={[p.ar, p.fr].filter(Boolean).join('، ')}
      testID={p.testID}
    >
      {p.selected && (
        <View style={styles.check}>
          <Text style={styles.checkText}>{CHECK}</Text>
        </View>
      )}
      {p.big !== undefined && <Text style={styles.big}>{p.big}</Text>}
      <View style={styles.cardRow}>
        {p.icon !== undefined && (
          <SectionIcon section={p.icon} size={theme.font.size.title} color={theme.color.pen} />
        )}
        <View style={styles.cardText}>
          <Text style={styles.cardAr}>{p.ar}</Text>
          {p.fr !== undefined && <Text style={styles.cardFr}>{p.fr}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.paper },
  content: {
    padding: theme.layout.gutter,
    paddingBottom: theme.space.scrollEnd,
    gap: theme.space.lg,
  },
  choice: { gap: theme.space.lg },
  back: {
    alignSelf: theme.reading.startAlign,
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
  lead: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  subtitle: { ...theme.font.header, color: theme.color.ink, ...rtl },
  grid: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: theme.size.touch,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  cardSelected: {
    backgroundColor: theme.color.highlighterSoft,
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
  },
  pressed: { opacity: theme.opacity.pressed },
  check: {
    position: 'absolute',
    top: theme.space.sm,
    // The ✓ sits at the reading end of the card.
    ...theme.reading.endEdge(theme.space.sm),
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.caption,
    color: theme.color.card,
  },
  big: {
    ...theme.font.header,
    color: theme.color.pen,
    textAlign: 'right',
    writingDirection: 'ltr',
  },
  cardRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  cardText: { flex: 1 },
  cardAr: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
    lineHeight: theme.font.lineHeight.body,
    color: theme.color.ink,
    ...rtl,
  },
  cardFr: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'right',
    writingDirection: 'ltr',
  },
  next: {
    marginTop: theme.space.sm,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextDisabled: { backgroundColor: theme.color.inkDisabled },
  nextText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.card,
  },
});
