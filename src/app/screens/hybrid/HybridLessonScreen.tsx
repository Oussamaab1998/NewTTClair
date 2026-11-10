/**
 * The lesson board (plan v2, track B): one question, led by the conductor.
 * Header (back, title, question); a question opens with its trip (the
 * question's map, and «نبداو»). Then the strip (a breadcrumb of the map:
 * done ✓, now ●, later ○, the end) with the station he is on; three
 * segments that open the sheets «التمرين», «الطريق» (the map with where he
 * is; it flashes for a moment at «نبداو»), «اللي لقيناه»; his finished
 * steps folded to one line each; the card of the step he is on; the chat
 * drawer for free text. Instant replies need no network; the AI answers only where
 * the conductor asks for it (the Mover), and the prepared reply shows when
 * it does not.
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
import { TripStrip } from './trip/TripStrip';
import { useHybridSession } from './useHybridSession';

const BACK_MARK = '→';
/** How long «الطريق» flashes once «نبداو» puts the map there. */
const FLASH_MS = 2500;

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
      {!touring && <TripStrip strip={s.strip} onOpen={openRoad} />}
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
          onContentSizeChange={() =>
            scroll.current?.scrollToEnd({ animated: true })
          }
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
          <RoadTab
            road={s.sheets.road()}
            questionLabels={questionLabels}
            experiment={experiment}
          />
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
