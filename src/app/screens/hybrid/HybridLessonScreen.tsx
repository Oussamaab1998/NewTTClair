/**
 * The lesson board (plan v2, track B): one question, led by the conductor.
 * Header (back, title, question); a question opens with its trip (the
 * question's map, and «نبداو»). Then three segments that open the sheets
 * «التمرين», «الطريق» (the map with where he is; it flashes for a moment at
 * «نبداو»; no progress strip over the card, owner 2026-11-11), «اللي لقيناه»; his finished
 * steps folded to one line each; the card of the step he is on; the chat
 * drawer for free text. Instant replies need no network; the AI answers only where
 * the conductor asks for it (the Mover), and the prepared reply shows when
 * it does not.
 *
 * The screen moves only to show what just appeared on the card (the top of
 * a new exchange, the case card, the paper back), and never while his
 * finger is on it or it is still gliding; growing content (a group he adds
 * on the case) does not move it.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import type { LoadedExercise } from '../../../content/loader';
import { appPaperQuestions } from '../../../content/paper';
import type { Rich } from '../../../content/schema';
import type { Mover, Templates } from '../../../hybrid/mover';
import { RichView } from '../../../lesson/feed/RichView';
import type { DoneRecord } from '../../../state/doneParts';
import type { KeyValueStore } from '../../../storage/kv';
import { theme } from '../../../theme';
import { BoardSheet } from './board/BoardSheet';
import { ExerciseTab } from './board/ExerciseTab';
import { FoundTab } from './board/FoundTab';
import { RoadTab } from './board/RoadTab';
import { TabBar, type BoardTab } from './board/TabBar';
import { ChatDrawer } from './ChatDrawer';
import { CollapsedStep } from './CollapsedStep';
import { DevOverlay } from './DevOverlay';
import { ExchangeView, StepCard } from './StepCard';
import { TripScreen } from './trip/TripScreen';
import { useHybridSession } from './useHybridSession';

const BACK_MARK = '→';
/** How long «الطريق» flashes once «نبداو» puts the map there. */
const FLASH_MS = 2500;
/** What just appeared is measured after its layout is in (ms). */
const SETTLE_MS = 80;
/** A top already in this upper part of the screen is left where it is. */
const REVEAL_BAND = 0.6;
/** Scroll events while he drags: often enough to know where the screen is. */
const SCROLL_THROTTLE_MS = 100;
/** A glide that never reported its end is over after this long (ms). */
const GLIDE_MAX_MS = 2000;

export interface HybridLessonScreenProps {
  loaded: LoadedExercise;
  raw: unknown;
  questionId: string;
  onBack: () => void;
  /** Opens another question of this exercise (the next one, after the end). */
  onNext?: (questionId: string) => void;
  /** The AI side (default: none, the prepared replies only). */
  mover?: Mover;
  templates?: Templates;
  /** Tests: memory stores. */
  store?: KeyValueStore;
  doneRecord?: DoneRecord;
}

function Ended({
  next,
  onNext,
  onBack,
}: {
  next: { id: string; label: string } | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.ended} testID="hybrid-ended">
      <Text style={styles.endedText}>{t('hybrid.ended.title')}</Text>
      <View style={styles.endedActions}>
        {next && (
          <Pressable
            style={styles.primary}
            accessibilityRole="button"
            testID="hybrid-next-question"
            onPress={onNext}
          >
            <View style={styles.row}>
              <Text style={styles.primaryText}>{t('hybrid.ended.next')}</Text>
              <Text style={styles.primaryText}>{next.label}</Text>
            </View>
          </Pressable>
        )}
        <Pressable
          style={styles.secondary}
          accessibilityRole="button"
          testID="hybrid-back-to-list"
          onPress={onBack}
        >
          <Text style={styles.secondaryText}>{t('hybrid.ended.list')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HybridLessonScreen(p: HybridLessonScreenProps) {
  const { t } = useTranslation();
  const s = useHybridSession({
    loaded: p.loaded,
    raw: p.raw,
    questionId: p.questionId,
    ...(p.mover && { mover: p.mover }),
    ...(p.templates && { templates: p.templates }),
    ...(p.store && { store: p.store }),
    ...(p.doneRecord && { doneRecord: p.doneRecord }),
  });
  const [tab, setTab] = useState<BoardTab | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const openRoad = useCallback(() => setTab('road'), []);
  // «نبداو»: the map goes into «الطريق»; the segment flashes for a moment.
  const { touring, send } = s;
  const wasTouring = useRef(touring);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const ended = wasTouring.current && !touring;
    wasTouring.current = touring;
    if (!ended) {
      return undefined;
    }
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [touring]);
  const start = useCallback(() => send({ kind: 'continue' }), [send]);

  // Where the screen is, and whether he is moving it (B11).
  const port = useRef({ height: 0, offset: 0, content: 0 });
  const touching = useRef(false);
  const glideUntil = useRef(0);
  const cardY = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (revealTimer.current) {
        clearTimeout(revealTimer.current);
      }
    },
    [],
  );
  /** Bring a top on the card into view, unless he is on the screen or it is in view already. */
  const reveal = useCallback((at: () => number | undefined) => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
    }
    revealTimer.current = setTimeout(() => {
      revealTimer.current = null;
      const y = at();
      if (
        y === undefined ||
        touching.current ||
        Date.now() < glideUntil.current
      ) {
        return;
      }
      const top = cardY.current + y;
      const v = port.current;
      if (
        v.height > 0 &&
        top >= v.offset &&
        top <= v.offset + v.height * REVEAL_BAND
      ) {
        return;
      }
      const want = Math.max(0, top - theme.space.sm);
      const max = Math.max(0, v.content - v.height);
      scroll.current?.scrollTo({
        y: v.content > 0 ? Math.min(want, max) : want,
        animated: true,
      });
    }, SETTLE_MS);
  }, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    port.current.offset = e.nativeEvent.contentOffset.y;
  }, []);
  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    cardY.current = e.nativeEvent.layout.y;
  }, []);

  const title = p.loaded.exercise.title as Rich;
  const questions = useMemo(
    () => appPaperQuestions(p.loaded.exercise),
    [p.loaded.exercise],
  );
  const questionLabels = useMemo(
    () => Object.fromEntries(questions.map(q => [q.id, q.label])),
    [questions],
  );
  const at = questions.findIndex(q => q.id === p.questionId);
  const label = questions[at]?.label ?? p.questionId;
  const nextQ = at >= 0 ? questions[at + 1] : undefined;
  const next =
    p.onNext && nextQ && nextQ.status === 'available'
      ? { id: nextQ.id, label: nextQ.label }
      : null;
  const step = s.frame ? s.ctx.frames.get(s.frame.frameId) : undefined;
  const experiment = p.loaded.exercise.experiment;
  const labelOf = (id: string) => questionLabels[id] ?? id;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="hybrid-screen"
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={t('hybrid.back')}
          testID="hybrid-back"
          onPress={p.onBack}
        >
          <Text style={styles.headerMark}>{BACK_MARK}</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <RichView
            rich={title.ar ? { ar: title.ar } : title}
            numberOfLines={1}
            mathScroll={false}
          />
          <View style={styles.row}>
            <Text style={styles.headerSub}>{t('hybrid.question')}</Text>
            <Text style={styles.headerSub}>{label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.tabs}>
        <TabBar
          selected={null}
          flash={flash ? 'road' : null}
          onSelect={setTab}
        />
      </View>
      {touring ? (
        <TripScreen
          road={s.road}
          reused={s.reused}
          questionLabels={questionLabels}
          waiting={s.waiting}
          onStart={start}
        />
      ) : (
        <ScrollView
          ref={scroll}
          style={styles.main}
          contentContainerStyle={styles.mainContent}
          keyboardShouldPersistTaps="handled"
          // Growing content never moves the screen (only `reveal` does).
          onContentSizeChange={(_w, h) => {
            port.current.content = h;
          }}
          onLayout={e => {
            port.current.height = e.nativeEvent.layout.height;
          }}
          onTouchStart={() => {
            touching.current = true;
            glideUntil.current = 0;
          }}
          onTouchEnd={() => {
            touching.current = false;
          }}
          onTouchCancel={() => {
            touching.current = false;
          }}
          onScrollBeginDrag={() => {
            touching.current = true;
          }}
          onMomentumScrollBegin={() => {
            glideUntil.current = Date.now() + GLIDE_MAX_MS;
          }}
          onMomentumScrollEnd={e => {
            glideUntil.current = 0;
            onScroll(e);
          }}
          onScrollEndDrag={e => {
            touching.current = false;
            onScroll(e);
          }}
          onScroll={onScroll}
          scrollEventThrottle={SCROLL_THROTTLE_MS}
          testID="hybrid-main"
        >
          {s.steps
            .filter(x => x.status === 'done')
            .map(x => (
              <CollapsedStep
                key={x.key}
                step={x}
                fromLabel={
                  x.fromQuestionId !== null ? labelOf(x.fromQuestionId) : null
                }
                onPress={openRoad}
              />
            ))}
          {s.frame && step ? (
            <StepCard
              frame={s.frame}
              step={step}
              stage={s.state.progress.stage}
              similarLines={s.state.progress.lines}
              next={s.strip.next}
              exchanges={s.card}
              readback={s.readback}
              waiting={s.waiting}
              experiment={experiment}
              live={s.live}
              onAct={s.send}
              onReadback={s.chooseReadback}
              onFinishMove={exchangeId => s.finishComponent({ exchangeId })}
              onFinishPicture={spec => s.finishComponent({ spec })}
              state={s.state}
              levelOf={s.levelOf}
              onReveal={reveal}
              onLayout={onCardLayout}
            />
          ) : (
            <>
              {s.card.map(x => (
                <ExchangeView key={x.id} x={x} live={null} />
              ))}
              <Ended
                next={next}
                onNext={() => next && p.onNext?.(next.id)}
                onBack={p.onBack}
              />
            </>
          )}
        </ScrollView>
      )}
      {!s.ended && (
        <ChatDrawer
          exchanges={s.chat}
          disabled={s.waiting}
          onSend={text => s.send({ kind: 'free', text })}
        />
      )}
      {__DEV__ && <DevOverlay entries={s.dev} />}
      <BoardSheet tab={tab} onTab={setTab} onClose={() => setTab(null)}>
        {tab === 'exercise' && <ExerciseTab sheet={s.sheets.exercise()} />}
        {tab === 'road' && (
          <RoadTab road={s.sheets.road()} questionLabels={questionLabels} />
        )}
        {tab === 'found' && <FoundTab found={s.sheets.found()} />}
      </BoardSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    gap: theme.space.md,
    borderBottomColor: theme.color.borderDefault,
    borderBottomWidth: theme.border.line,
  },
  headerButton: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  headerMark: { ...theme.font.header, color: theme.color.textPrimary },
  headerTitle: { flex: 1 },
  row: { flexDirection: theme.reading.row, gap: theme.space.xs },
  headerSub: { ...theme.font.small, color: theme.color.textSecondary },
  tabs: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.xs,
  },
  main: { flex: 1 },
  mainContent: {
    padding: theme.layout.gutter,
    gap: theme.space.sm,
    paddingBottom: theme.space.section,
  },
  ended: {
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surfaceSelected,
    gap: theme.space.md,
  },
  endedText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  endedActions: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  primary: {
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.button,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.xxl,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: { ...theme.font.body, color: theme.color.textOnAccent },
  secondary: {
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.xxl,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  secondaryText: { ...theme.font.body, color: theme.color.textPrimary },
});
