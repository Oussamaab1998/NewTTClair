/**
 * The warm-up before an exercise (owner, 2026-11-17): its own few questions,
 * once, before the whole exercise.
 *
 * 1. An explanation first (D84): we want to know his level on what this
 *    exercise needs; small questions, no mark, «ما نعرفش» helps, his answers
 *    guide the exercise; then the chips of what it checks (each main
 *    question's French topic) and «نبداو التسخين».
 * 2. One question at a time, under a header with a progress bar and a tag
 *    saying what the question checks: a line on the worksheet or a pick of
 *    a card, «ما نعرفش», and «نفوتو للتمرين» to skip.
 * 3. Nothing is marked right or wrong (src/warmup/warmup.ts walks the
 *    questions); the end shows the exercise's one general sentence and
 *    «نبداو». The answers are handed to `onDone` (the gate saves them).
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich, Warmup } from '../../../../content/schema';
import { RichView } from '../../../../lesson/feed/RichView';
import { CardsPick } from '../../../../lesson/feed/method/CardsPick';
import { Worksheet } from '../../../../lesson/worksheet/Worksheet';
import { theme } from '../../../../theme';
import {
  MAX_ASKED,
  answerWarmup,
  currentQuestion,
  hadGaps,
  startWarmup,
  warmupTopics,
  type WarmupAct,
  type WarmupAnswer,
  type WarmupState,
} from '../../../../warmup/warmup';
import { TargetIcon } from '../trip/icons';

const BACK_MARK = '→';
const NO_TILES = [] as const;
const NO_LINES = [] as const;
const INTRO_LINES = [
  'warmup.introSmall',
  'warmup.introNoMark',
  'warmup.introDontKnow',
  'warmup.introGuide',
] as const;

export interface WarmupScreenProps {
  title: Rich;
  warmup: Warmup;
  onDone: (answers: WarmupAnswer[]) => void;
  onBack: () => void;
  /** Debug builds: acts played at once (`-devWarmupActs`, screenshots); they skip the explanation. */
  acts?: readonly WarmupAct[];
}

/** A French topic chip: LTR, pen edge (the words carry the meaning). */
function TopicChip({ topic }: { topic: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{topic}</Text>
    </View>
  );
}

export function WarmupScreen(p: WarmupScreenProps) {
  const { t } = useTranslation();
  const [started, setStarted] = useState(() => (p.acts?.length ?? 0) > 0);
  const [state, setState] = useState<WarmupState>(() => {
    let s = startWarmup(p.warmup);
    for (const a of p.acts ?? []) {
      s = answerWarmup(p.warmup, s, a).state;
    }
    return s;
  });
  const [unreadable, setUnreadable] = useState(false);
  const q = currentQuestion(p.warmup, state);
  const act = (a: WarmupAct) => {
    const r = answerWarmup(p.warmup, state, a);
    setUnreadable(!r.readable);
    setState(r.state);
  };
  // Skipping before the first question: straight to the exercise, every
  // question recorded as skipped (no "all clear" sentence for nothing asked).
  const skipAll = () =>
    p.onDone(answerWarmup(p.warmup, state, { kind: 'skip' }).state.asked);
  const total = Math.max(
    1,
    Math.min(MAX_ASKED, state.asked.length + state.queue.length),
  );
  const n = Math.min(state.asked.length + 1, total);
  const asking = started && !state.done && q !== null;

  return (
    <View style={styles.root} testID="warmup-screen">
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={t('hybrid.back')}
          testID="warmup-back"
          onPress={p.onBack}
          hitSlop={theme.space.sm}
        >
          <Text style={styles.headerMark}>{BACK_MARK}</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.overline}>{t('warmup.title')}</Text>
          <RichView
            rich={p.title.ar ? { ar: p.title.ar } : p.title}
            numberOfLines={1}
            mathScroll={false}
            fontSize={theme.font.size.title}
            fontFamily={theme.font.family.ui.bold}
            color={theme.color.ink}
          />
          {asking && (
            <View
              style={styles.progress}
              accessible
              accessibilityLabel={t('warmup.progress', { n, total })}
              testID="warmup-progress"
            >
              <View style={styles.segments}>
                {Array.from({ length: total }, (_, i) => (
                  <View
                    key={i}
                    style={[styles.segment, i < n && styles.segmentOn]}
                  />
                ))}
              </View>
              <Text style={styles.count}>
                {t('warmup.count', { n, total })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {!started ? (
        <>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            testID="warmup-intro"
          >
            <View style={styles.badge}>
              <TargetIcon
                size={theme.size.warmupBadge / 2}
                color={theme.color.pen}
              />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {t('warmup.introTitle')}
            </Text>
            <Text style={styles.lead}>{t('warmup.introLead')}</Text>
            <View style={styles.points}>
              {INTRO_LINES.map(k => (
                <View key={k} style={styles.point}>
                  <View style={styles.bullet} />
                  <Text style={styles.pointText}>{t(k)}</Text>
                </View>
              ))}
            </View>
            {p.warmup.intro && <RichView rich={p.warmup.intro} />}
            <View style={styles.checks} testID="warmup-checks">
              <Text style={styles.checksLabel}>{t('warmup.checks')}</Text>
              <View style={styles.chips}>
                {warmupTopics(p.warmup).map(topic => (
                  <TopicChip key={topic} topic={topic} />
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              testID="warmup-begin"
              onPress={() => setStarted(true)}
            >
              <Text style={styles.primaryText}>{t('warmup.begin')}</Text>
            </Pressable>
            <Pressable
              style={styles.footerLink}
              accessibilityRole="button"
              testID="warmup-skip-all"
              onPress={skipAll}
              hitSlop={theme.space.sm}
            >
              <Text style={styles.link}>{t('warmup.skip')}</Text>
            </Pressable>
          </View>
        </>
      ) : !asking ? (
        <>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
          >
            <Text style={styles.title} accessibilityRole="header">
              {t('warmup.doneTitle')}
            </Text>
            <View testID="warmup-done-text">
              <RichView
                rich={hadGaps(state) ? p.warmup.done.gaps : p.warmup.done.clean}
              />
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              testID="warmup-start"
              onPress={() => p.onDone(state.asked)}
            >
              <Text style={styles.primaryText}>{t('warmup.start')}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tag} testID={`warmup-topic-${q.id}`}>
            <Text style={styles.tagLabel}>{t('warmup.checksThis')}</Text>
            <TopicChip topic={q.topic} />
          </View>
          <View style={styles.prompt} testID={`warmup-q-${q.id}`}>
            <RichView rich={q.prompt} />
          </View>
          {unreadable && (
            <Text style={styles.note} testID="warmup-unreadable">
              {t('warmup.unreadable')}
            </Text>
          )}
          {q.input.kind === 'line' ? (
            <Worksheet
              key={q.id}
              step={{ id: q.id, label: { ar: [{ ar: t('warmup.answer') }] } }}
              prompt={null}
              lines={NO_LINES}
              tiles={NO_TILES}
              scaffold={null}
              counting={q.input.keys === 'counting' ? 'numbers' : false}
              onSubmit={raw => act({ kind: 'line', raw })}
              testID="warmup-sheet"
            />
          ) : (
            <CardsPick
              key={q.id}
              cards={q.input.cards.map(c => ({ id: c.id, text: c.text }))}
              seed={q.id}
              readonly={false}
              onPick={id => act({ kind: 'pick', cardId: id })}
              testID="warmup-cards"
            />
          )}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondary,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              testID="warmup-dont-know"
              onPress={() => act({ kind: 'dont_know' })}
            >
              <Text style={styles.secondaryText}>{t('warmup.dontKnow')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="warmup-skip"
              onPress={() => act({ kind: 'skip' })}
              hitSlop={theme.space.sm}
            >
              <Text style={styles.link}>{t('warmup.skip')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' } as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'flex-start',
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.lg,
    gap: theme.space.md,
    backgroundColor: theme.color.card,
    borderBottomColor: theme.color.border,
    borderBottomWidth: theme.border.thin,
  },
  headerButton: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.button,
    borderWidth: theme.border.medium,
    borderColor: theme.color.border,
  },
  headerMark: { ...theme.font.header, color: theme.color.ink },
  headerTitle: { flex: 1, gap: theme.space.xxxs },
  overline: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.caption,
    lineHeight: theme.font.lineHeight.body - theme.space.xs,
    color: theme.color.pen,
    ...rtl,
  },
  progress: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  segments: {
    flex: 1,
    flexDirection: theme.reading.row,
    gap: theme.space.xxs,
  },
  segment: {
    flex: 1,
    height: theme.size.progressBar,
    borderRadius: theme.size.progressBar,
    backgroundColor: theme.color.gridLine,
  },
  segmentOn: { backgroundColor: theme.color.pen },
  count: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'ltr',
  },
  body: { flex: 1 },
  bodyContent: {
    padding: theme.layout.gutter,
    gap: theme.space.lg,
    paddingBottom: theme.space.scrollEnd,
  },
  badge: {
    width: theme.size.warmupBadge,
    height: theme.size.warmupBadge,
    borderRadius: theme.size.warmupBadge,
    borderWidth: theme.border.medium,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: theme.reading.startAlign,
  },
  title: {
    ...theme.font.header,
    color: theme.color.ink,
    ...rtl,
  },
  lead: { ...theme.font.body, color: theme.color.ink, ...rtl },
  points: { gap: theme.space.sm },
  point: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
  },
  bullet: {
    width: theme.size.warmupBullet,
    height: theme.size.warmupBullet,
    borderRadius: theme.size.warmupBullet,
    backgroundColor: theme.color.pen,
  },
  pointText: { ...theme.font.body, color: theme.color.ink, flex: 1, ...rtl },
  checks: {
    backgroundColor: theme.color.card,
    borderColor: theme.color.border,
    borderWidth: theme.border.thin,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  checksLabel: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  chips: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  chip: {
    borderWidth: theme.border.thin,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xxxs,
  },
  chipText: {
    ...theme.font.small,
    color: theme.color.pen,
    writingDirection: 'ltr',
  },
  tag: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  tagLabel: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  prompt: { gap: theme.space.xs },
  note: { ...theme.font.small, color: theme.color.textSecondary, ...rtl },
  actions: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  secondary: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderDefault,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...theme.font.body,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  link: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
  },
  footer: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.sm,
    gap: theme.space.sm,
    borderTopWidth: theme.border.hairline,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.backgroundApp,
  },
  footerLink: { alignSelf: 'center', paddingVertical: theme.space.xxs },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.sm,
  },
  pressed: { opacity: theme.opacity.pressed },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
});
