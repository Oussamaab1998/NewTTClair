/**
 * The home screen (owner, 2026-11-17: design A, "continue first", in the
 * Cahier look): the greeting on squared paper, the ink «كمّل» card, his
 * effort counts, the domains with their progress, and the exam sessions.
 * Computed on mount from what the app keeps (src/app/screens/home/home.ts);
 * mounted again after each lesson, so it is fresh then.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { loadProfile } from '../../../ai/profile/profile';
import { loadRecord } from '../../../hybrid/records';
import { RichView } from '../../../lesson/feed/RichView';
import { PaperBackground } from '../../../lesson/paper/PaperBackground';
import {
  doneParts,
  latestResets,
  type DoneRecord,
} from '../../../state/doneParts';
import { appStore } from '../../../storage/appStore';
import type { KeyValueStore } from '../../../storage/kv';
import type { EventStore } from '../../../telemetry/eventStore';
import { theme } from '../../../theme';
import {
  CATALOG,
  partLabel,
  type CatalogEntry,
  type Opened,
} from '../../exercises';
import { CURRICULUM, SECTION_IDS, trackFor } from '../../../content/curriculum';
import type { StudentClass } from '../chapters/chapters';
import { loadStudentClass } from '../chapters/studentClass';
import { loadActiveDays } from './activeDays';
import {
  catalogOf,
  examSession,
  homeData,
  type Activity,
  type HomeData,
  type HomeDomain,
  type HomeDomainCard,
  type HomeHero,
  type HomeSessionCard,
} from './home';
import { DomainIcon, SheetIcon } from './icons';

const SEP = ' · ';
const FORWARD = '←';

/** What a home card opens: the exercise list, all of it or a part. */
export type HomeList =
  | { kind: 'all' }
  | { kind: 'domain'; domain: HomeDomain }
  | { kind: 'session'; session: string };

export interface HomeScreenProps {
  onOpen: (opened: Opened) => void;
  /** The exam paper screen of an exercise. */
  onPaper: (exerciseId: string) => void;
  onList: (list: HomeList) => void;
  catalog?: readonly CatalogEntry[];
  eventStore?: Pick<EventStore, 'load'>;
  doneRecord?: Pick<DoneRecord, 'all'>;
  /** The lesson board's records, the profile and the active days. */
  store?: KeyValueStore;
  now?: () => number;
}

/** Everything the home reads, once. */
function readHome(
  catalog: readonly CatalogEntry[],
  eventStore: Pick<EventStore, 'load'> | undefined,
  doneRecord: Pick<DoneRecord, 'all'> | undefined,
  store: KeyValueStore,
  now: number,
  forClass: ReadonlySet<string> | null,
): HomeData {
  const events = eventStore?.load() ?? [];
  const resets = latestResets(events);
  const activity: Activity[] = events
    .filter(e => e.ts >= (resets.get(e.exerciseId) ?? 0))
    .map(e => ({
      exerciseId: e.exerciseId,
      questionId: e.questionId,
      at: e.ts,
    }));
  const profile = loadProfile(store);
  for (const e of catalog) {
    if (!e.result.ok) {
      continue;
    }
    const parts = e.result.loaded.exercise.parts.map(p => p.id);
    for (const q of parts) {
      const rec = loadRecord(store, e.id, q);
      if (rec) {
        activity.push({ exerciseId: e.id, questionId: q, at: rec.updatedAt });
      }
    }
    const warm = profile?.warmups?.[e.id];
    if (warm && parts[0] !== undefined) {
      activity.push({ exerciseId: e.id, questionId: parts[0], at: warm.at });
    }
  }
  return homeData({
    catalog,
    done: doneParts(events, doneRecord),
    activity,
    activeDays: loadActiveDays(store),
    warmupSeen: id => profile?.warmups?.[id] !== undefined,
    forClass,
    now,
  });
}

/**
 * His class: the one he picked in the class picker (`student.class.v1`, the
 * onboarding will write it too), else his profile's section in the bac year,
 * else the bac Maths (the app's first section).
 */
function readClass(store: KeyValueStore): StudentClass {
  const picked = loadStudentClass(store);
  if (picked) {
    return picked;
  }
  const s = loadProfile(store)?.section;
  const section = SECTION_IDS.find(id => id === s) ?? 'mathematiques';
  return { year: '4s', section };
}

/** The exercises of his class's programme (the curriculum map); null: unknown class. */
function exercisesOfClass(cls: StudentClass): ReadonlySet<string> | null {
  const track = trackFor(cls.year, cls.section);
  return track
    ? new Set(track.chapters.flatMap(c => c.exercises.map(e => e.id)))
    : null;
}

export function HomeScreen(p: HomeScreenProps) {
  const { t } = useTranslation();
  const catalog = p.catalog ?? CATALOG;
  const [cls] = useState(() => readClass(p.store ?? appStore()));
  const [data] = useState(() =>
    readHome(
      catalog,
      p.eventStore,
      p.doneRecord,
      p.store ?? appStore(),
      (p.now ?? Date.now)(),
      exercisesOfClass(cls),
    ),
  );
  // As the chapter screens write it: «Bac · Mathématiques».
  const sectionName = CURRICULUM.sections.find(x => x.id === cls.section)?.fr;
  const classLine = [
    t(`chapters.yearShort.${cls.year}`),
    ...(sectionName ? [sectionName] : []),
  ].join(SEP);
  const live = data.domains.filter(d => d.exercises > 0);
  const soon = data.domains.filter(d => d.exercises === 0);
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="home-screen"
    >
      <View style={styles.top}>
        <PaperBackground style="grid" />
        <Text style={styles.hello} accessibilityRole="header">
          {t(data.stats ? 'home.hello' : 'home.welcome')}
        </Text>
        <Text style={styles.bac} testID="home-class">
          {classLine}
        </Text>
        <Hero hero={data.hero} catalog={catalog} {...p} />
      </View>
      <View style={styles.body}>
        {data.stats && (
          <View style={styles.stats} testID="home-stats">
            <Stat
              n={data.stats.questionsDone}
              label={t('home.stats.questions')}
            />
            <View style={styles.statRule} />
            <Stat
              n={data.stats.exercisesStarted}
              label={t('home.stats.exercises')}
            />
            <View style={styles.statRule} />
            <Stat n={data.stats.daysThisWeek} label={t('home.stats.days')} />
          </View>
        )}
        <Text style={styles.section}>{t('home.domainsTitle')}</Text>
        {live.map(d => (
          <DomainCard
            key={d.domain}
            card={d}
            onPress={() => p.onList({ kind: 'domain', domain: d.domain })}
          />
        ))}
        {soon.length > 0 && (
          <View style={styles.soonRow}>
            {soon.map(d => (
              <View
                key={d.domain}
                style={styles.soon}
                testID={`home-soon-${d.domain}`}
              >
                <Text style={styles.soonName}>
                  {t(`home.domain.${d.domain}.name`)}
                </Text>
                <Text style={styles.soonText}>{t('home.soon')}</Text>
              </View>
            ))}
          </View>
        )}
        {data.sessions.length > 0 && (
          <>
            <Text style={styles.section}>{t('home.sessionsTitle')}</Text>
            <View style={styles.sessions}>
              {data.sessions.map(s => (
                <SessionCard
                  key={s.id}
                  card={s}
                  onPress={() => p.onList({ kind: 'session', session: s.id })}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function useCount() {
  const { t } = useTranslation();
  return (n: number) =>
    n === 1 ? t('home.exerciseOne') : t('home.exercisesMany', { count: n });
}

/** The ink card: «كمّل وين وقفت», «نقترحو تبدا بـ», or everything done. */
function Hero({
  hero,
  catalog,
  onOpen,
  onPaper,
  onList,
}: { hero: HomeHero; catalog: readonly CatalogEntry[] } & HomeScreenProps) {
  const { t } = useTranslation();
  if (hero.kind === 'soon') {
    // His class has no exercise yet: never a bac exercise pushed on him; the
    // bac ones stay one quiet link away.
    return (
      <View style={styles.hero} testID="home-hero-soon">
        <Text style={styles.heroTitleText}>{t('chapters.emptyTitle')}</Text>
        <Text style={styles.heroNote}>{t('home.soonNote')}</Text>
        <Pressable
          style={styles.heroLink}
          accessibilityRole="button"
          testID="home-see-bac"
          onPress={() => onList({ kind: 'all' })}
          hitSlop={theme.space.sm}
        >
          <Text style={styles.heroLinkText}>{t('home.seeBac')}</Text>
        </Pressable>
      </View>
    );
  }
  if (hero.kind === 'allDone') {
    return (
      <View style={styles.hero} testID="home-hero-allDone">
        <Text style={styles.heroTitleText}>{t('home.allDoneTitle')}</Text>
        <Text style={styles.heroNote}>{t('home.allDoneText')}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.heroButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          testID="home-all"
          onPress={() => onList({ kind: 'all' })}
        >
          <Text style={styles.heroButtonText}>{t('home.seeAll')}</Text>
        </Pressable>
      </View>
    );
  }
  const entry = catalog.find(e => e.id === hero.exerciseId);
  if (!entry?.result.ok) {
    return null;
  }
  const exercise = entry.result.loaded.exercise;
  const session = examSession(exercise.id);
  const exam = [
    t('home.examLine', {
      session: session
        ? t(`home.session.${session.kind}`, { year: session.year })
        : '',
      section: t(`home.section.${exercise.section ?? 'mathematiques'}`),
      n: exercise.number,
    }),
    ...(hero.kind === 'resume'
      ? [t('home.examQuestion', { q: partLabel(hero.partId) })]
      : []),
  ].join(SEP);
  const open = () => onOpen({ exerciseId: exercise.id, partId: hero.partId });
  return (
    <View style={styles.hero} testID={`home-hero-${hero.kind}`}>
      <View style={styles.heroTop}>
        <Text style={styles.heroLabel}>
          {t(hero.kind === 'resume' ? 'home.resumeLabel' : 'home.startLabel')}
        </Text>
        <View
          style={[
            styles.subjectTag,
            { backgroundColor: theme.color.subject[exercise.subject] },
          ]}
        >
          <Text style={styles.subjectText}>
            {t(`home.domain.${exercise.subject}.name`)}
          </Text>
        </View>
      </View>
      <View testID="home-hero-title">
        <RichView
          rich={{ ar: exercise.title.ar }}
          color={theme.color.textOnAccent}
          fontSize={theme.font.size.title}
          fontFamily={theme.font.family.ui.bold}
          numberOfLines={2}
        />
      </View>
      <Text style={styles.exam}>{exam}</Text>
      {hero.kind === 'resume' && (
        <View
          style={styles.progress}
          accessible
          accessibilityLabel={t('home.progressA11y', {
            done: hero.done,
            total: hero.total,
          })}
        >
          <View style={styles.segments}>
            {Array.from({ length: hero.total }, (_, i) => (
              <View
                key={i}
                style={[styles.segment, i < hero.done && styles.segmentOn]}
              />
            ))}
          </View>
          <Text style={styles.count}>
            {t('home.count', { done: hero.done, total: hero.total })}
          </Text>
        </View>
      )}
      {hero.kind === 'start' && hero.warmup && (
        <Text style={styles.heroNote}>{t('home.warmupNote')}</Text>
      )}
      <View style={styles.heroActions}>
        <Pressable
          style={({ pressed }) => [
            styles.heroButton,
            styles.heroMain,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          testID={hero.kind === 'resume' ? 'home-resume' : 'home-start'}
          onPress={open}
        >
          <Text style={styles.heroButtonText}>
            {t(hero.kind === 'resume' ? 'home.resume' : 'home.start')}
          </Text>
          <Text style={styles.heroButtonText}>{FORWARD}</Text>
        </Pressable>
        {exercise.paper && (
          <Pressable
            style={({ pressed }) => [
              styles.heroSheet,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home.paper')}
            testID="home-paper"
            onPress={() => onPaper(exercise.id)}
          >
            <SheetIcon color={theme.color.textOnAccent} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{String(n)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A progress ring with its percentage (decorative: the label says it). */
function Ring({
  done,
  total,
  color,
}: {
  done: number;
  total: number;
  color: string;
}) {
  const { t } = useTranslation();
  const size = theme.size.homeRing;
  const stroke = theme.size.homeRingStroke;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const frac = total > 0 ? done / total : 0;
  return (
    <View
      style={styles.ring}
      accessible
      accessibilityLabel={t('home.progressA11y', { done, total })}
    >
      <Svg width={size} height={size} accessible={false}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={theme.color.gridLine}
          strokeWidth={stroke}
        />
        {frac > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${len * frac} ${len}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <Text style={styles.ringText}>
        {t('home.percent', { p: Math.round(frac * 100) })}
      </Text>
    </View>
  );
}

function DomainCard({
  card,
  onPress,
}: {
  card: HomeDomainCard;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const count = useCount();
  const subject =
    card.domain === 'analysis' || card.domain === 'probability'
      ? card.domain
      : null;
  const color = subject ? theme.color.subject[subject] : theme.color.inkMuted;
  return (
    <Pressable
      style={({ pressed }) => [styles.domain, pressed && styles.pressed]}
      accessibilityRole="button"
      testID={`home-domain-${card.domain}`}
      onPress={onPress}
    >
      <View
        style={[
          styles.domainIcon,
          {
            backgroundColor: subject
              ? theme.color.subjectTint[subject]
              : theme.color.surfaceMuted,
          },
        ]}
      >
        <DomainIcon domain={card.domain} color={color} />
      </View>
      <View style={styles.domainText}>
        <View style={styles.domainNameRow}>
          <Text style={styles.domainName}>
            {t(`home.domain.${card.domain}.name`)}
          </Text>
          <Text style={styles.domainCount}>{count(card.exercises)}</Text>
        </View>
        <Text style={styles.domainSub}>
          {t(`home.domain.${card.domain}.sub`)}
        </Text>
      </View>
      <Ring done={card.done} total={card.total} color={color} />
    </Pressable>
  );
}

function SessionCard({
  card,
  onPress,
}: {
  card: HomeSessionCard;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const count = useCount();
  return (
    <Pressable
      style={({ pressed }) => [styles.session, pressed && styles.pressed]}
      accessibilityRole="button"
      testID={`home-session-${card.id}`}
      onPress={onPress}
    >
      <Text style={styles.sessionCaps}>
        {t('home.sessionCaps', { year: card.year })}
      </Text>
      <Text style={styles.sessionName}>
        {t(`home.sessionLong.${card.kind}`)}
      </Text>
      <Text style={styles.sessionCount}>{count(card.exercises)}</Text>
    </Pressable>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' } as const;
const ltrEnd = { textAlign: 'right', writingDirection: 'ltr' } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.paper },
  content: { paddingBottom: theme.space.scrollEnd },
  top: {
    overflow: 'hidden',
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.space.section,
    paddingBottom: theme.space.section,
    borderBottomWidth: theme.border.thin,
    borderBottomColor: theme.color.border,
  },
  hello: { ...theme.font.screenTitle, color: theme.color.ink, ...rtl },
  bac: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.footnote,
    lineHeight: theme.font.lineHeight.body - theme.space.xs,
    color: theme.color.inkMuted,
    ...ltrEnd,
  },
  hero: {
    marginTop: theme.space.xxl,
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.hero,
    padding: theme.space.xxl,
    gap: theme.space.sm,
  },
  heroTop: {
    flexDirection: theme.reading.row,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  heroLabel: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    backgroundColor: theme.color.highlighter,
    borderRadius: theme.radius.xs,
    paddingHorizontal: theme.space.xs,
    overflow: 'hidden',
    writingDirection: 'rtl',
  },
  subjectTag: {
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xxxs,
  },
  subjectText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.caption,
    lineHeight: theme.font.lineHeight.body - theme.space.xs,
    color: theme.color.textOnAccent,
    writingDirection: 'ltr',
  },
  heroTitleText: {
    ...theme.font.header,
    color: theme.color.textOnAccent,
    ...rtl,
  },
  exam: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.small,
    lineHeight: theme.font.lineHeight.body - theme.space.xxs,
    color: theme.color.onInk.muted,
    ...ltrEnd,
  },
  heroNote: { ...theme.font.small, color: theme.color.onInk.muted, ...rtl },
  heroLink: {
    alignSelf: theme.reading.startAlign,
    minHeight: theme.size.touch,
    justifyContent: 'center',
  },
  heroLinkText: {
    ...theme.font.small,
    color: theme.color.textOnAccent,
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
  },
  progress: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  segments: { flex: 1, flexDirection: theme.reading.row, gap: theme.space.xxs },
  segment: {
    flex: 1,
    height: theme.size.progressBar,
    borderRadius: theme.size.progressBar,
    backgroundColor: theme.color.onInk.track,
  },
  segmentOn: { backgroundColor: theme.color.highlighter },
  count: {
    ...theme.font.small,
    color: theme.color.onInk.muted,
    writingDirection: 'ltr',
  },
  heroActions: {
    flexDirection: theme.reading.row,
    gap: theme.space.sm,
    marginTop: theme.space.sm,
  },
  heroButton: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
  },
  heroMain: {
    flex: 1,
    flexDirection: theme.reading.row,
    gap: theme.space.sm,
  },
  heroButtonText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  heroSheet: {
    minWidth: theme.size.touch + theme.space.xxs,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.onInk.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  body: { paddingHorizontal: theme.layout.gutter },
  stats: {
    flexDirection: theme.reading.row,
    marginTop: theme.space.xxl,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.xxs,
  },
  statRule: {
    width: theme.border.thin,
    marginVertical: theme.space.md,
    backgroundColor: theme.color.border,
  },
  statN: {
    ...theme.font.header,
    fontFamily: theme.font.family.ui.extraBold,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  statLabel: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  section: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    marginTop: theme.space.section,
    marginBottom: theme.space.md,
    ...rtl,
  },
  domain: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.lg,
    padding: theme.space.xl,
    marginBottom: theme.space.sm,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
  },
  domainIcon: {
    width: theme.size.homeIcon,
    height: theme.size.homeIcon,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainText: { flex: 1 },
  domainNameRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    gap: theme.space.sm,
  },
  domainName: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.bodyLarge,
    lineHeight: theme.font.lineHeight.relaxed,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  domainCount: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'ltr',
  },
  domainSub: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  ring: {
    width: theme.size.homeRing,
    height: theme.size.homeRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    position: 'absolute',
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.tiny,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  soonRow: { flexDirection: theme.reading.row, gap: theme.space.sm },
  soon: {
    flex: 1,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderWidth: theme.border.medium,
    borderStyle: 'dashed',
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
  },
  soonName: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.callout,
    lineHeight: theme.font.lineHeight.body,
    color: theme.color.inkMuted,
    ...ltrEnd,
  },
  soonText: { ...theme.font.small, color: theme.color.inkMuted, ...rtl },
  sessions: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  session: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: theme.size.chipMinWidth * 2,
    padding: theme.space.lg,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    gap: theme.space.xxs,
  },
  sessionCaps: {
    ...theme.font.paperSource,
    color: theme.color.inkMuted,
    ...ltrEnd,
  },
  sessionName: {
    ...theme.font.paper,
    color: theme.color.ink,
    textDecorationLine: 'underline',
    ...ltrEnd,
  },
  sessionCount: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    ...ltrEnd,
  },
});

/** The exercise list behind a home card: its exercises and its subtitle. */
export function useHomeListPicker(catalog: readonly CatalogEntry[] = CATALOG) {
  const { t } = useTranslation();
  return (list: HomeList): { catalog: CatalogEntry[]; subtitle?: string } => {
    if (list.kind === 'all') {
      return { catalog: [...catalog] };
    }
    if (list.kind === 'domain') {
      return {
        catalog: catalogOf(catalog, { domain: list.domain }),
        subtitle: t(`home.domain.${list.domain}.name`),
      };
    }
    const entries = catalogOf(catalog, { session: list.session });
    const s = examSession(list.session);
    return {
      catalog: entries,
      ...(s && {
        subtitle: [t(`home.sessionLong.${s.kind}`), String(s.year)].join(' '),
      }),
    };
  };
}
