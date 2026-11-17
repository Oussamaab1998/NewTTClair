/**
 * The onboarding (owner-approved mockup v2, 2026-11-17), shown once before
 * the home: the class first, then two examples from that class's programme.
 * «نكمّلو» moves on (screen 1 needs a full class: else it says so), a swipe
 * in reading direction does too, the dots go back, «تخطّي» (screens 2-3) and
 * «نبداو» finish with the class. Reduce motion: every block is just there.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  CURRICULUM,
  type SectionId,
  type Year,
} from '../../../content/curriculum';
import { examplesFor } from '../../../content/onboardingExamples';
import { theme } from '../../../theme';
import { pickedClass, sectionForYear } from '../chapters/ClassPicker';
import type { StudentClass } from '../chapters/chapters';
import { AT, ClassStep, LinesStep, MapStep, Wordmark } from './OnboardingSteps';

const STEPS = 3;
/** A horizontal drag this long (pt) turns the page. */
const SWIPE = theme.size.touch;

export interface OnboardingScreenProps {
  /** A class already saved (shown selected). */
  initial?: StudentClass | null;
  onDone: (cls: StudentClass) => void;
  /** Tests: skip the reduce-motion lookup and show every block at once. */
  still?: boolean;
}

export function OnboardingScreen({ initial, onDone, still: stillProp }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [year, setYear] = useState<Year | null>(initial?.year ?? null);
  const [section, setSection] = useState<SectionId | null>(initial?.section ?? null);
  const [nudge, setNudge] = useState(false);
  const still = useReduceMotion(stillProp);
  const picked = pickedClass(year, section);
  const examples = picked ? examplesFor(picked.year, picked.section) : null;
  const classLabel = picked ? classLabelOf(picked, t) : '';
  // Screen 3 is taller than a phone: once «تسجّلت» shows, bring it into view.
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (step !== STEPS - 1) {
      return undefined;
    }
    const timer = setTimeout(
      () => scroll.current?.scrollToEnd({ animated: !still }),
      still ? 0 : AT.remembered + AT.title,
    );
    return () => clearTimeout(timer);
  }, [step, still]);

  const next = () => {
    if (!picked || !examples) {
      setNudge(true);
      return;
    }
    if (step < STEPS - 1) {
      setStep(step + 1);
    } else {
      onDone(picked);
    }
  };
  const back = () => setStep(s => Math.max(0, s - 1));
  // The pan handler is made once: it reads the latest moves through a ref.
  const moves = useRef({ next, back });
  moves.current = { next, back };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > theme.space.lg && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          // Reading direction: the next page comes from the left.
          if (g.dx > SWIPE) {
            moves.current.next();
          } else if (g.dx < -SWIPE) {
            moves.current.back();
          }
        },
      }),
    [],
  );

  return (
    <View style={styles.root} testID="onboarding" {...pan.panHandlers}>
      {step > 0 && (
        <View style={styles.top}>
          <Wordmark />
          <Pressable
            onPress={() => picked && onDone(picked)}
            accessibilityRole="button"
            hitSlop={theme.space.sm}
            testID="onboarding-skip"
          >
            <Text style={styles.skip}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        ref={scroll}
        key={step}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <ClassStep
            year={year}
            section={section}
            onYear={y => {
              setYear(y);
              setSection(s => sectionForYear(y, s));
              setNudge(false);
            }}
            onSection={s => {
              setSection(s);
              setNudge(false);
            }}
            nudge={nudge && !picked}
            still={still}
          />
        )}
        {step === 1 && examples && (
          <MapStep example={examples.analysis} classLabel={classLabel} still={still} />
        )}
        {step === 2 && examples && (
          <LinesStep example={examples.practice} classLabel={classLabel} still={still} />
        )}
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {Array.from({ length: STEPS }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => (i <= step ? setStep(i) : undefined)}
              hitSlop={theme.space.sm}
              accessibilityRole="button"
              accessibilityState={{ selected: i === step }}
              accessibilityLabel={t('onboarding.page', { n: i + 1, total: STEPS })}
              testID={`onboarding-dot-${i}`}
            >
              <View style={[styles.dot, i === step && styles.dotOn]} />
            </Pressable>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={next}
          accessibilityRole="button"
          testID="onboarding-next"
        >
          <Text style={styles.ctaText}>
            {step < STEPS - 1 ? t('onboarding.next') : t('onboarding.start')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "Bac · Mathématiques", "1ère année": the class as the chapter picker writes it. */
export function classLabelOf(
  cls: StudentClass,
  t: (key: `chapters.yearShort.${Year}`) => string,
): string {
  const year = t(`chapters.yearShort.${cls.year}`);
  const section = CURRICULUM.sections.find(s => s.id === cls.section)?.fr;
  return section ? `${year} · ${section}` : year;
}

/** Reduce motion (iOS setting), read once and followed while shown. */
function useReduceMotion(forced: boolean | undefined): boolean {
  const [reduce, setReduce] = useState(forced ?? false);
  useEffect(() => {
    if (forced !== undefined) {
      return undefined;
    }
    let live = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .catch(() => false)
      .then(v => live && setReduce(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub?.remove();
    };
  }, [forced]);
  return forced ?? reduce;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.paper },
  top: {
    flexDirection: theme.reading.row,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.space.sm,
  },
  skip: { ...theme.font.small, color: theme.color.inkMuted },
  scroll: { flex: 1 },
  content: {
    padding: theme.layout.gutter,
    paddingBottom: theme.space.section,
  },
  bottom: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.lg,
    gap: theme.space.md,
    borderTopWidth: theme.border.thin,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.paper,
  },
  dots: {
    flexDirection: theme.reading.row,
    justifyContent: 'center',
    gap: theme.space.xs,
  },
  dot: {
    width: theme.space.sm,
    height: theme.space.sm,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.color.border,
  },
  dotOn: { width: theme.space.section, backgroundColor: theme.color.pen },
  cta: {
    minHeight: theme.size.touch + theme.space.xs,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  ctaText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.reading,
    color: theme.color.card,
  },
});
