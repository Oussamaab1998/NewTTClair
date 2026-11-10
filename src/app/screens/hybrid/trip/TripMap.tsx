/**
 * The question's map (owner, 2026-10-30: "a very clear map, easy
 * sentences, a high view he can see whenever he wants"), from roadView
 * (src/hybrid/tour): the exercise from above (its questions, this one
 * marked, how one feeds the next), what changed since the question before,
 * what we have, what is asked, the steps as numbered stations on a line
 * (on the side the reading starts), the end (a flag: the check), then what
 * comes after (the recipe, the similar questions), smaller.
 *
 * Two modes. 'trip', before he starts: a step he has from an earlier
 * question is done (✓, his line, where we found it) and the first station
 * to do says «نبداو من هنا». 'progress', the «الطريق» sheet: done ✓ with
 * his line, the station he is on ringed «توّا هنا», the later ones quieter,
 * the overview folded to one line. Status is shape and words, never colour
 * alone; numbers, exam French and math are their own left-to-right lines.
 */
import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ReusedStep } from '../../../../hybrid/board';
import type {
  MapLine,
  RoadStatus,
  RoadView,
} from '../../../../hybrid/tour/tour';
import { RichView } from '../../../../lesson/feed/RichView';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { lineLatex } from '../../../../method/lineChain';
import { theme } from '../../../../theme';
import { FadeIn } from './FadeIn';
import {
  BoxIcon,
  ChangeIcon,
  CheckIcon,
  DotIcon,
  FlagIcon,
  TargetIcon,
} from './icons';

export type MapMode = 'trip' | 'progress';

/** The words of each status (shape is the circle, these are for the ear). */
export const ROAD_WORD = {
  done: 'hybrid.road.done',
  now: 'hybrid.road.now',
  later: 'hybrid.road.upcoming',
} as const;

/** How one question feeds a later one (toward the reading end). */
const LINK_MARK = '↲';
const OPEN_MARK = '▾';
const CLOSE_MARK = '▴';

const ICON = theme.font.size.title;
const BADGE_ICON = theme.size.paperDot;

export interface TripMapProps {
  road: RoadView;
  mode: MapMode;
  /** The steps he has from an earlier question, by card id. */
  reused: Readonly<Record<string, ReusedStep>>;
  /** The questions' labels on the exam paper, by question id. */
  questionLabels: Readonly<Record<string, string>>;
  /** More under a step (the sheet: what and why now, the components he used). */
  stepExtra?: (cardId: string) => React.ReactNode;
  /** The sections fade in one after the other (the trip). */
  animate?: boolean;
  testID?: string;
}

function Label({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.labelRow}>
      {icon}
      <Text style={styles.label}>{text}</Text>
    </View>
  );
}

/** A left-to-right line (numbers, the exam's French) in a pill of its own. */
function FrPill({
  text,
  strong = false,
  testID,
}: {
  text: string;
  strong?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.pill, strong && styles.pillStrong]} testID={testID}>
      <Text
        style={[styles.pillText, strong && styles.pillTextStrong]}
        accessibilityLanguage="fr"
      >
        {text}
      </Text>
    </View>
  );
}

function Tag({ text, testID }: { text: string; testID?: string }) {
  return (
    <View style={styles.tag} testID={testID}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

/** A small green check with a word (a result he has). */
function Found({ text }: { text: string }) {
  return (
    <View style={styles.foundRow}>
      <View style={styles.foundBadge}>
        <CheckIcon size={BADGE_ICON} color={theme.color.textOnAccent} />
      </View>
      <Text style={styles.foundText}>{text}</Text>
    </View>
  );
}

/** His own line, as math on its own left-to-right line. */
function HisLine({ line, testID }: { line: string; testID: string }) {
  return (
    <View style={styles.hisLine} testID={testID}>
      <MathBlock latex={lineLatex(line)} fontSize={theme.font.size.body} />
    </View>
  );
}

function Overview({
  overview,
  mode,
  questionLabels,
}: {
  overview: NonNullable<RoadView['overview']>;
  mode: MapMode;
  questionLabels: Readonly<Record<string, string>>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(mode === 'trip');
  const at = overview.questions.findIndex(q => q.current);
  const list = (
    <View style={styles.qList}>
      <RichView
        rich={overview.says}
        fontSize={theme.font.size.small}
        color={theme.color.textSecondary}
      />
      {overview.questions.map((q, i) => {
        const last = i === overview.questions.length - 1;
        return (
          <View
            key={q.id}
            style={styles.qRow}
            testID={`trip-q-${q.id}${q.current ? '-current' : ''}`}
          >
            <View style={styles.qRail}>
              <View style={[styles.qDot, q.current && styles.qDotNow]} />
              {!last && <View style={styles.qLine} />}
            </View>
            <View style={[styles.qBody, !last && styles.qBodyGap]}>
              <View style={styles.inline}>
                <Text style={[styles.qLabel, q.current && styles.qLabelNow]}>
                  {t('hybrid.question')}
                </Text>
                <Text
                  style={[
                    styles.qLabel,
                    styles.ltr,
                    q.current && styles.qLabelNow,
                  ]}
                >
                  {questionLabels[q.id] ?? q.id}
                </Text>
                {q.current && <Tag text={t('hybrid.trip.current')} />}
              </View>
              <RichView
                rich={q.says}
                fontSize={theme.font.size.small}
                color={
                  q.current
                    ? theme.color.textPrimary
                    : theme.color.textSecondary
                }
                fontFamily={
                  q.current
                    ? theme.font.family.ui.bold
                    : theme.font.family.ui.regular
                }
              />
              {q.fr !== null && (
                <Text style={styles.qFr} accessibilityLanguage="fr">
                  {q.fr}
                </Text>
              )}
              {q.link && (
                <View style={styles.link} testID={`trip-q-${q.id}-link`}>
                  <Text style={styles.linkMark}>{LINK_MARK}</Text>
                  <View style={styles.grow}>
                    <RichView
                      rich={q.link}
                      fontSize={theme.font.size.small}
                      color={theme.color.textSecondary}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
  if (mode === 'trip') {
    return (
      <View style={styles.soft} testID="trip-overview">
        <Label text={t('hybrid.trip.overview')} />
        {list}
      </View>
    );
  }
  return (
    <View style={styles.soft} testID="trip-overview">
      <Pressable
        style={styles.overviewHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={t(open ? 'hybrid.trip.less' : 'hybrid.trip.more')}
        testID="trip-overview-toggle"
        onPress={() => setOpen(o => !o)}
      >
        <Text style={styles.label}>{t('hybrid.trip.overview')}</Text>
        <View style={[styles.inline, styles.grow]}>
          <Text style={styles.small}>{t('hybrid.question')}</Text>
          <Text style={[styles.small, styles.ltr]}>{at + 1}</Text>
          <Text style={styles.small}>{t('hybrid.trip.of')}</Text>
          <Text style={[styles.small, styles.ltr]}>
            {overview.questions.length}
          </Text>
        </View>
        <Text style={styles.toggleMark}>{open ? CLOSE_MARK : OPEN_MARK}</Text>
      </Pressable>
      {open && list}
    </View>
  );
}

function LineList({
  lines,
  testID,
}: {
  lines: readonly MapLine[];
  testID: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.lines}>
      {lines.map((l, i) => (
        <View
          key={i}
          style={[styles.lineItem, i > 0 && styles.lineItemRule]}
          testID={`${testID}-${i}`}
        >
          <RichView rich={l.says} fontSize={theme.font.size.small} />
          {l.fr !== null && <FrPill text={l.fr} testID={`${testID}-${i}-fr`} />}
          {l.his && (
            <View style={styles.his} testID={`${testID}-${i}-his`}>
              <Found text={t('hybrid.trip.found')} />
              <HisLine line={l.his.line} testID={`${testID}-${i}-line`} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/** A station's circle on the line: ✓ done, its number (ringed when now), the flag at the end. */
function Circle({
  state,
  mode,
  children,
  small = false,
  label,
}: {
  state: RoadStatus;
  mode: MapMode;
  children: React.ReactNode;
  small?: boolean;
  label: string;
}) {
  const quiet = mode === 'progress' && state === 'later';
  return (
    <View
      style={[styles.ring, state === 'now' && styles.ringNow]}
      accessible
      accessibilityLabel={label}
    >
      <View
        style={[
          small ? styles.circleSmall : styles.circle,
          state === 'done' && styles.circleDone,
          state === 'now' && styles.circleNow,
          quiet && styles.circleQuiet,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Rail({
  children,
  line,
}: {
  children: React.ReactNode;
  /** The line down to the next station: none for the last one. */
  line: 'done' | 'plain' | 'faint' | null;
}) {
  return (
    <View style={styles.rail}>
      {children}
      {line !== null && (
        <View
          style={[
            styles.railLine,
            line === 'done' && styles.railLineDone,
            line === 'faint' && styles.railLineFaint,
          ]}
        />
      )}
    </View>
  );
}

function StepNumber({
  n,
  state,
  mode,
}: {
  n: number;
  state: RoadStatus;
  mode: MapMode;
}) {
  if (state === 'done') {
    return <CheckIcon size={BADGE_ICON} color={theme.color.textOnAccent} />;
  }
  return (
    <Text
      style={[
        styles.number,
        state === 'now' && styles.numberNow,
        mode === 'progress' && state === 'later' && styles.numberQuiet,
      ]}
    >
      {n}
    </Text>
  );
}

export const TripMap = memo(function TripMapImpl({
  road,
  mode,
  reused,
  questionLabels,
  stepExtra,
  animate = false,
  testID = 'trip-map',
}: TripMapProps) {
  const { t } = useTranslation();
  // A step he has from an earlier question is done on the map from the trip on.
  const doneOf = (x: RoadView['steps'][number]) =>
    x.status === 'done' || reused[x.cardId] !== undefined;
  const first = road.steps.findIndex(x => !doneOf(x));
  const stateOf = (x: RoadView['steps'][number], i: number): RoadStatus =>
    doneOf(x)
      ? 'done'
      : mode === 'trip'
      ? i === first
        ? 'now'
        : 'later'
      : x.status;
  const reached = road.steps.length > 0 && first < 0;
  const quietAfter = mode === 'progress';
  let section = 0;
  const fade = (node: React.ReactNode) => (
    <FadeIn index={section++} off={!animate}>
      {node}
    </FadeIn>
  );
  return (
    <View style={styles.map} testID={testID}>
      {road.overview &&
        fade(
          <Overview
            overview={road.overview}
            mode={mode}
            questionLabels={questionLabels}
          />,
        )}
      {road.changed &&
        fade(
          <View style={styles.changed} testID="trip-changed">
            <View style={styles.changedIcon}>
              <ChangeIcon size={ICON} />
            </View>
            <View style={styles.grow}>
              <Text style={styles.label}>{t('hybrid.trip.changed')}</Text>
              <RichView rich={road.changed} fontSize={theme.font.size.small} />
            </View>
          </View>,
        )}
      {road.have.length > 0 &&
        fade(
          <View style={styles.card} testID="trip-have">
            <Label
              text={t('hybrid.trip.have')}
              icon={<BoxIcon size={ICON} />}
            />
            <LineList lines={road.have} testID="trip-have" />
          </View>,
        )}
      {road.goal &&
        fade(
          <View style={styles.card} testID="trip-goal">
            <Label
              text={t('hybrid.trip.goal')}
              icon={<TargetIcon size={ICON} />}
            />
            <RichView rich={road.goal.says} fontSize={theme.font.size.small} />
            {road.goal.fr !== null && (
              <FrPill text={road.goal.fr} strong testID="trip-goal-fr" />
            )}
            {road.goal.his && (
              <View style={styles.his}>
                <Found text={t('hybrid.trip.found')} />
                <HisLine line={road.goal.his.line} testID="trip-goal-line" />
              </View>
            )}
          </View>,
        )}
      {road.steps.length > 0 &&
        fade(
          <View style={styles.stations} testID="trip-steps">
            <Label text={t('hybrid.trip.steps')} />
            {road.steps.map((x, i) => {
              const state = stateOf(x, i);
              const from = reused[x.cardId];
              const line =
                state === 'done' ? x.line ?? from?.line ?? null : null;
              const lastStep = i === road.steps.length - 1;
              return (
                <View
                  key={x.cardId}
                  style={styles.station}
                  testID={`trip-step-${x.cardId}-${state}`}
                >
                  <Rail
                    line={
                      lastStep && !road.finish
                        ? null
                        : state === 'done'
                        ? 'done'
                        : 'plain'
                    }
                  >
                    <Circle
                      state={state}
                      mode={mode}
                      label={`${t(ROAD_WORD[state])} ${i + 1}`}
                    >
                      <StepNumber n={i + 1} state={state} mode={mode} />
                    </Circle>
                  </Rail>
                  <View
                    style={[
                      styles.stationCard,
                      state === 'now' && styles.stationNow,
                      mode === 'progress' &&
                        state === 'later' &&
                        styles.stationQuiet,
                    ]}
                  >
                    {state === 'now' && (
                      <Tag
                        text={t(
                          mode === 'trip'
                            ? 'hybrid.trip.startHere'
                            : 'hybrid.trip.here',
                        )}
                        testID={`trip-step-${x.cardId}-tag`}
                      />
                    )}
                    <RichView
                      rich={x.title}
                      fontFamily={theme.font.family.ui.bold}
                      color={
                        mode === 'progress' && state === 'later'
                          ? theme.color.textSecondary
                          : theme.color.textPrimary
                      }
                    />
                    <RichView
                      rich={x.says}
                      fontSize={theme.font.size.small}
                      color={theme.color.textSecondary}
                    />
                    {x.fr !== null && <FrPill text={x.fr} />}
                    {from && (
                      <View
                        style={styles.inline}
                        testID={`trip-reused-${x.cardId}`}
                      >
                        <Found text={t('hybrid.trip.foundIn')} />
                        <Text style={[styles.foundText, styles.ltr]}>
                          {from.label}
                        </Text>
                      </View>
                    )}
                    {line !== null && (
                      <HisLine line={line} testID={`trip-line-${x.cardId}`} />
                    )}
                    {stepExtra?.(x.cardId)}
                  </View>
                </View>
              );
            })}
            {road.finish && (
              <View
                style={styles.station}
                testID={`trip-finish-${reached ? 'done' : 'later'}`}
              >
                <Rail line={road.after.length > 0 ? 'faint' : null}>
                  <Circle
                    state={reached && mode === 'progress' ? 'done' : 'later'}
                    mode="trip"
                    label={t('hybrid.trip.finish')}
                  >
                    <FlagIcon
                      size={BADGE_ICON + theme.space.xxs}
                      filled={reached}
                      color={
                        reached && mode === 'progress'
                          ? theme.color.textOnAccent
                          : theme.color.ink
                      }
                    />
                  </Circle>
                </Rail>
                <View style={[styles.stationCard, styles.finishCard]}>
                  <Text style={styles.label}>{t('hybrid.trip.finish')}</Text>
                  <RichView
                    rich={road.finish.says}
                    fontSize={theme.font.size.small}
                  />
                  {road.finish.fr !== null && (
                    <FrPill text={road.finish.fr} testID="trip-finish-fr" />
                  )}
                </View>
              </View>
            )}
            {road.after.map((x, i) => {
              const last = i === road.after.length - 1;
              const state: RoadStatus = mode === 'trip' ? 'later' : x.status;
              return (
                <View
                  key={x.kind}
                  style={styles.station}
                  testID={`trip-after-${x.kind}-${state}`}
                >
                  <Rail line={last ? null : 'faint'}>
                    <Circle
                      state={state}
                      mode={mode}
                      small
                      label={t(ROAD_WORD[state])}
                    >
                      {state === 'done' ? (
                        <CheckIcon
                          size={BADGE_ICON}
                          color={theme.color.textOnAccent}
                        />
                      ) : (
                        <DotIcon
                          size={BADGE_ICON}
                          filled={state === 'now'}
                          color={
                            state === 'now'
                              ? theme.color.textOnAccent
                              : theme.color.inkMuted
                          }
                        />
                      )}
                    </Circle>
                  </Rail>
                  <View
                    style={[
                      styles.afterBody,
                      quietAfter && state === 'later' && styles.stationQuiet,
                    ]}
                  >
                    {state === 'now' && <Tag text={t('hybrid.trip.here')} />}
                    <Text style={styles.afterLabel}>
                      {t(`hybrid.kind.${x.kind}`)}
                    </Text>
                    <RichView
                      rich={x.says}
                      fontSize={theme.font.size.small}
                      color={theme.color.textSecondary}
                    />
                  </View>
                </View>
              );
            })}
          </View>,
        )}
    </View>
  );
});

const styles = StyleSheet.create({
  map: { gap: theme.space.md },
  grow: { flex: 1 },
  inline: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.xxs,
  },
  ltr: { writingDirection: 'ltr' },
  labelRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  label: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  small: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  soft: {
    gap: theme.space.sm,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surfaceMuted,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
  },
  overviewHead: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: theme.size.touch,
  },
  toggleMark: { ...theme.font.body, color: theme.color.ink },
  qList: { gap: theme.space.sm },
  qRow: { flexDirection: theme.reading.row, gap: theme.space.sm },
  qRail: { width: theme.size.checkBadge, alignItems: 'center' },
  qDot: {
    width: theme.size.paperDot,
    height: theme.size.paperDot,
    borderRadius: theme.size.paperDot / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    marginTop: theme.space.xs,
  },
  qDotNow: {
    width: theme.size.checkBadge,
    height: theme.size.checkBadge,
    borderRadius: theme.size.checkBadge / 2,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.pen,
    marginTop: theme.space.xxs,
  },
  qLine: {
    flex: 1,
    width: theme.border.line,
    backgroundColor: theme.color.border,
    marginTop: theme.space.xxs,
  },
  qBody: { flex: 1, gap: theme.space.xxxs },
  qBodyGap: { paddingBottom: theme.space.sm },
  qLabel: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  qLabelNow: {
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
  },
  qFr: {
    ...theme.font.small,
    fontFamily: theme.font.family.math.family,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
    textAlign: 'right',
  },
  link: {
    flexDirection: theme.reading.row,
    alignItems: 'flex-start',
    gap: theme.space.xxs,
    paddingTop: theme.space.xxs,
  },
  linkMark: { ...theme.font.small, color: theme.color.pen },
  changed: {
    flexDirection: theme.reading.row,
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.highlighterSoft,
  },
  changedIcon: { paddingTop: theme.space.xxs },
  card: {
    gap: theme.space.sm,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  lines: { gap: theme.space.sm },
  lineItem: { gap: theme.space.xxs },
  lineItemRule: {
    paddingTop: theme.space.sm,
    borderTopWidth: theme.border.hairline,
    borderTopColor: theme.color.gridLine,
  },
  pill: {
    alignSelf: theme.reading.startAlign,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xxxs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceMuted,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
  },
  pillStrong: {
    backgroundColor: theme.color.highlighterSoft,
    borderColor: theme.color.ink,
    borderWidth: theme.border.line,
  },
  pillText: {
    ...theme.font.small,
    fontFamily: theme.font.family.math.family,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  pillTextStrong: {
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.bold,
  },
  tag: {
    alignSelf: theme.reading.startAlign,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.tag,
    backgroundColor: theme.color.highlighter,
    borderWidth: theme.border.thin,
    borderColor: theme.color.ink,
  },
  tagText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  his: { gap: theme.space.xxxs },
  foundRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
  },
  foundBadge: {
    width: theme.size.checkBadge,
    height: theme.size.checkBadge,
    borderRadius: theme.size.checkBadge / 2,
    backgroundColor: theme.color.correct.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.text,
    writingDirection: 'rtl',
  },
  hisLine: {
    borderRadius: theme.radius.chip,
    backgroundColor: theme.color.correct.bg,
    paddingHorizontal: theme.space.sm,
  },
  stations: { gap: theme.space.sm },
  station: { flexDirection: theme.reading.row, gap: theme.space.md },
  rail: { width: theme.size.paperNumber, alignItems: 'center' },
  railLine: {
    flex: 1,
    width: theme.border.thick,
    minHeight: theme.space.md,
    backgroundColor: theme.color.borderControl,
    marginVertical: theme.space.xxxs,
  },
  railLineDone: { backgroundColor: theme.color.correct.ink },
  railLineFaint: { backgroundColor: theme.color.border },
  ring: {
    padding: theme.space.xxxs,
    borderRadius: theme.size.paperNumber,
    borderWidth: theme.border.active,
    borderColor: theme.color.paper,
  },
  ringNow: { borderColor: theme.color.pen },
  circle: {
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.size.toneIcon / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSmall: {
    width: theme.size.checkBadge + theme.space.xxs,
    height: theme.size.checkBadge + theme.space.xxs,
    borderRadius: theme.size.checkBadge,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    borderColor: theme.color.correct.ink,
    backgroundColor: theme.color.correct.ink,
  },
  circleNow: {
    borderColor: theme.color.pen,
    backgroundColor: theme.color.pen,
  },
  circleQuiet: { borderColor: theme.color.borderControl },
  number: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  numberNow: { color: theme.color.textOnAccent },
  numberQuiet: { color: theme.color.inkMuted },
  stationCard: {
    flex: 1,
    gap: theme.space.xxs,
    padding: theme.space.md,
    marginBottom: theme.space.xs,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  stationNow: {
    borderColor: theme.color.pen,
    borderWidth: theme.border.active,
  },
  stationQuiet: { opacity: theme.opacity.inactive },
  finishCard: { backgroundColor: theme.color.surfaceMuted },
  afterBody: {
    flex: 1,
    gap: theme.space.xxxs,
    paddingBottom: theme.space.sm,
  },
  afterLabel: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
