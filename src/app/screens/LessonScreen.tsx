import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { toPlainText } from '../../lesson/rich/runs';
import type { LoadedExercise } from '../../content/loader';
import {
  allParts,
  CATALOG,
  findPart,
  partLabel,
  type Opened,
} from '../exercises';
import { ExercisePicker } from './ExercisePicker';
import { AskField } from '../../lesson/feed/AskField';
import { LessonFeed, type FeedHandlers } from '../../lesson/feed/LessonFeed';
import { HelpContext } from '../../lesson/feed/help';
import { LongPressMenu } from '../../lesson/feed/LongPressMenu';
import {
  FeedbackCard,
  feedbackCardAllowed,
} from '../../lesson/feed/FeedbackCard';
import {
  ReportSheet,
  type ReportSheetState,
} from '../../lesson/feed/ReportSheet';
import { SnapshotRegistry } from '../../lesson/feed/snapshots';
import type { LocalQueue } from '../../telemetry/reports';
import { appQueue } from '../appQueue';
import { appEventStore } from '../appEventStore';
import type { EventStore } from '../../telemetry/eventStore';
import { appLessonLlm, appLlmRuntime } from '../appLlm';
import { LlmStatusLine } from '../LlmStatusLine';
import type * as DevOnly from '../dev';

import { deviceContext } from '../device';
import type { AskMode } from '../../lesson/session/types';
import { useLesson, type LessonLlm } from '../../lesson/useLesson';
import { LLM_CONFIG } from '../../config/llm';
import { opensGate } from '../../components/registry';
import type { JsonObject } from '../../components/contract';
import type { TutorTurn } from '../../planner/llm/contextPack';
import { contextFor } from '../../telemetry/reports';
import { answerQuestion } from '../../tutor/tutor';
import {
  TutorDrawer,
  type DrawerChoice,
  type DrawerState,
} from '../../tutor/TutorDrawer';
import type { LessonContent } from '../../lesson/session/lesson';
import type { LessonState } from '../../lesson/session/types';
import { probe } from '../../perf/probe';
import {
  DEV_REVEAL_MS,
  devRevealAvailable,
  devToolsEnabled,
  setDevTools,
  useDevTools,
} from '../devFlags';
import type { EventLog, LogClock } from '../../telemetry/log';
import { theme } from '../../theme';

/** Debug builds only; `__DEV__` is false in release, so Metro drops the require. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('../dev') as typeof DevOnly)
  : null;

/** Debug launch: the scripted live check plays 1.b; `-devPart` opens a part. */
const launchPart = (): string | undefined =>
  devOnly?.devScenario() === 'live1'
    ? '1b'
    : devOnly?.devPartAtLaunch() ?? undefined;

interface LessonScreenProps {
  /** Injected in tests for deterministic ids and timestamps. */
  clock?: LogClock;
  /** Exposes the log (tests, export). */
  onLog?: (log: EventLog) => void;
  /** Opens this part directly; absent or unknown: the exercise picker. */
  initialPart?: string | undefined;
  /** Report / question queue (MMKV by default; tests inject a memory one). */
  queue?: LocalQueue;
  /** LLM wiring; default: the app's (on when a key is present). null = rules only. */
  llm?: LessonLlm | null;
  /** Persistent event log (MMKV by default; tests inject a memory one). */
  eventStore?: EventStore;
}

/** The exercise picker, then a part played from JSON. */
export function LessonScreen({
  initialPart = launchPart(),
  ...props
}: LessonScreenProps) {
  const [opened, setOpened] = useState<Opened | null>(() =>
    initialPart === undefined ? null : findPart(initialPart),
  );
  const result = CATALOG.find(e => e.id === opened?.exerciseId)?.result;
  if (!opened || !result?.ok) {
    return <ExercisePicker onOpen={setOpened} />;
  }
  return (
    <Lesson
      key={`${opened.exerciseId}/${opened.partId}`}
      loaded={result.loaded}
      part={opened.partId}
      onPart={setOpened}
      onBack={() => setOpened(null)}
      {...props}
    />
  );
}

const newSessionId = () => `sess-${Date.now().toString(36)}`;

interface LessonProps extends Omit<LessonScreenProps, 'initialPart'> {
  loaded: LoadedExercise;
  part: string;
  /** Dev part switch. */
  onPart: (opened: Opened) => void;
  /** Back to the exercise picker. */
  onBack: () => void;
}

function Lesson({
  loaded,
  part,
  onPart,
  onBack,
  clock,
  onLog,
  queue: injectedQueue,
  llm: injectedLlm,
  eventStore: injectedStore,
}: LessonProps) {
  const { t } = useTranslation();
  const [sessionId] = useState(newSessionId);
  const [queue] = useState(() => injectedQueue ?? appQueue());
  const [llm] = useState(() =>
    injectedLlm === null ? undefined : injectedLlm ?? appLessonLlm(),
  );
  const [snapshots] = useState(() => new SnapshotRegistry());
  // No accounts yet: a pseudonymous local id (CLAUDE.md rule 8).
  const lesson = useLesson(
    loaded,
    part,
    { sessionId, studentId: 'local-anon' },
    clock,
    {
      queue,
      device: deviceContext,
      eventStore: injectedStore ?? appEventStore(),
      ...(llm && { llm }),
    },
  );
  const { dispatch, logUi, logError, log, state, content, report } = lesson;
  const { studentScrolled, sendFeedback } = lesson;
  // D19: after the question's done line, non-blocking.
  const showFeedback = state.finished && feedbackCardAllowed(state.items);
  const endCard = useMemo(
    () => (showFeedback ? <FeedbackCard onSend={sendFeedback} /> : null),
    [showFeedback, sendFeedback],
  );
  const [sheet, setSheet] = useState<ReportSheetState>(null);
  /** The active card's key: its component state goes with an ask. */
  const activeCard = state.stack[state.stack.length - 1]?.cardKey;
  useEffect(() => onLog?.(log), [log, onLog]);

  const [showEvents, setShowEvents] = useState(false);
  const devTools = useDevTools();
  const [menu, setMenu] = useState<{ blockId: string; quoted: string } | null>(
    null,
  );

  const handlers = useMemo<FeedHandlers>(
    () => ({
      onSelect: optionId => dispatch({ type: 'answer', value: { optionId } }),
      onSubmitTyped: (raw, keys) =>
        dispatch({ type: 'answer', value: { raw }, keys }),
      onSubmitLine: (line, keys) =>
        dispatch({ type: 'answer', value: { line }, keys }),
      onLinesInput: (stepId, name, payload) =>
        logUi('LinesEditor', name, payload, stepId),
      onNotSure: () => dispatch({ type: 'not_sure' }),
      onHint: () => dispatch({ type: 'hint' }),
      onReveal: () => dispatch({ type: 'reveal' }),
      onBack: () => dispatch({ type: 'leave_deep_dive' }),
      onLongPress: (blockId, quoted) => {
        logUi('LongPressMenu', 'opened', { blockId });
        setMenu({ blockId, quoted });
      },
      // Component taps are logged only: the feed does not re-render, except
      // the tap that opens a gate (PredictReveal), which lets the lesson go on.
      onComponentEvent: (stepId, e) => {
        logUi(
          e.component,
          e.name,
          { instanceId: e.instanceId, ...e.payload },
          stepId,
        );
        if (opensGate(e.component, e.name)) {
          dispatch({ type: 'gate_passed', stepId });
        }
      },
      onComponentResult: r =>
        dispatch({
          type: 'component_result',
          correct: r.correct === true,
          details: r.details,
          ...(r.misconceptionHints && {
            misconceptionHints: r.misconceptionHints,
          }),
        }),
      onComponentError: logError,
      onSkip: reason => dispatch({ type: 'skip', reason }),
      onRequest: kind => dispatch({ type: 'request', kind }),
      onCardChoice: (purpose, choice) =>
        dispatch({ type: 'card_choice', purpose, choice }),
      onKeypadHeight: h => probe.layout('keypad', h),
      onBlockMenu: target => {
        logUi('BlockMenu', 'opened', { blockId: target.blockId });
        setSheet({ stage: 'menu', target });
      },
      onReport: target => {
        logUi('ReportSheet', 'opened', { blockId: target.blockId });
        setSheet({ stage: 'report', target });
      },
    }),
    [dispatch, logUi, logError],
  );

  const sendReport: React.ComponentProps<typeof ReportSheet>['onSend'] = (
    target,
    reason,
    text,
  ) => {
    const snapshot =
      target.snapshotKey !== undefined
        ? snapshots.snapshotOf(target.snapshotKey)
        : undefined;
    report({
      blockId: target.blockId,
      source: target.source,
      reason,
      ...(text !== undefined && { text }),
      ...(snapshot && { snapshot }),
      ...(target.componentSpec && { componentSpec: target.componentSpec }),
      ...(target.llmRequestId !== undefined && {
        llmRequestId: target.llmRequestId,
      }),
    });
    setSheet({ stage: 'thanks' });
  };
  // Tutor drawer (free-text questions).
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const history = useRef<TutorTurn[]>([]);
  const askTutor = (raw: string) => {
    const text = raw.trim().slice(0, 500);
    if (!text) {
      return;
    }
    const components = snapshots.collect(activeCard);
    const ctx = lesson.tutorContext();
    setDrawer({ question: text, status: 'loading' });
    answerQuestion(
      {
        content,
        question: text,
        stepKey: ctx.stepKey,
        hintsUsed: ctx.hintsUsed,
        hintCount: ctx.hintCount,
        skills: ctx.skills,
        ...(components && { components }),
        history: history.current,
      },
      llm && { ...llm, timeoutMs: LLM_CONFIG.tutorTimeoutMs },
    ).then(({ answer, record }) => {
      const blocks =
        answer.source === 'ai'
          ? answer.blocks.length
          : answer.source === 'verified'
          ? answer.parts.length
          : 0;
      const counts =
        answer.source === 'ai'
          ? { blocks, ...answer.counts }
          : { blocks, verified: 0, unverified: 0, dropped: 0 };
      lesson.logTutor({
        text,
        ...(components && { components }),
        answerSource: answer.source,
        ...(record && { record }),
        ...(answer.source === 'ai' && { requestId: answer.requestId }),
        counts,
      });
      if (
        answer.source === 'saved' ||
        (answer.source === 'ai' && answer.needsTeacher)
      ) {
        saveQuestion(text, components);
      }
      history.current = [
        ...history.current,
        { role: 'student' as const, text },
      ].slice(-6);
      setDrawer(d =>
        d?.question === text ? { question: text, status: 'done', answer } : d,
      );
    });
  };
  const saveQuestion = (text: string, components?: JsonObject) => {
    const ctx = lesson.tutorContext();
    const id = `q-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    queue.add({
      kind: 'question',
      id,
      ts: Date.now(),
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
      questionId: state.questionId,
      stepId: ctx.stepId,
      text,
      ...(components && { snapshot: components }),
      context: contextFor(log.all(), deviceContext()),
    });
  };
  const chooseInDrawer = (choice: DrawerChoice) => {
    logUi('TutorDrawer', choice, {});
    if (choice === 'still_unclear' && drawer) {
      saveQuestion(drawer.question);
    }
    setDrawer(null);
  };

  // Debug builds only: the scripted live check (src/app/dev/).
  const live = useRef({ askTutor, chooseInDrawer });
  live.current = { askTutor, chooseInDrawer };
  useEffect(() => {
    if (devOnly?.devToolsAtLaunch()) {
      setDevTools(true);
    }
    devOnly?.runDevBench();
    if (devOnly?.devScenario() !== 'live1' || part !== '1b' || !llm) {
      return;
    }
    devOnly.runLive1({
      runtime: llm.runtime,
      log,
      answerWrong: () =>
        dispatch({ type: 'answer', value: { optionId: 'one' } }),
      ask: text => live.current.askTutor(text),
      closeDrawer: () => live.current.chooseInDrawer('back'),
      showDevTools: () => setDevTools(true),
    });
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissSheet = () => {
    if (sheet && sheet.stage !== 'thanks') {
      logUi('ReportSheet', 'dismissed', {
        blockId: sheet.target.blockId,
        stage: sheet.stage,
      });
    }
    setSheet(null);
  };

  const chooseMode = (mode: AskMode) => {
    if (menu) {
      const components = snapshots.collect(activeCard);
      dispatch({
        type: 'ask_longpress',
        blockId: menu.blockId,
        mode,
        quoted: menu.quoted,
        ...(components && { components }),
      });
    }
    setMenu(null);
  };
  const dismissMenu = () => {
    if (menu) {
      logUi('LongPressMenu', 'dismissed', { blockId: menu.blockId });
    }
    setMenu(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="lesson-screen"
    >
      <View style={styles.header}>
        {devTools && <ExportQueue queue={queue} />}
        {devTools && (
          <ExportEvents store={injectedStore ?? appEventStore()} log={log} />
        )}
        {devTools && (
          <Pressable
            onPress={() => setShowEvents(v => !v)}
            style={styles.events}
            accessibilityRole="button"
            testID="toggle-events"
          >
            <EventCount log={log} />
            <Text style={styles.eventsLabel}>{t('lesson.events')}</Text>
          </Pressable>
        )}
        {devTools ? (
          <View style={styles.parts}>
            {allParts().map(o => (
              <Pressable
                key={o.partId}
                onPress={() => onPart(o)}
                style={[styles.part, o.partId === part && styles.partOn]}
                accessibilityRole="tab"
                accessibilityLabel={`${t('lesson.part')} ${partLabel(
                  o.partId,
                )}`}
                accessibilityState={{ selected: o.partId === part }}
                testID={`part-${o.partId}`}
              >
                <Text style={styles.partText}>{partLabel(o.partId)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => {
                logUi('LessonHeader', 'back_to_picker', {});
                onBack();
              }}
              style={styles.part}
              accessibilityRole="button"
              testID="back-to-picker"
            >
              <Text style={styles.backText}>{t('picker.back')}</Text>
            </Pressable>
            <Text
              style={styles.partText}
              accessibilityLabel={`${t('lesson.part')} ${partLabel(part)}`}
              testID="lesson-part"
            >
              {partLabel(part)}
            </Text>
          </>
        )}
        <View style={styles.titleBox}>
          <Pressable
            disabled={!devRevealAvailable()}
            delayLongPress={DEV_REVEAL_MS}
            onLongPress={() => setDevTools(!devToolsEnabled())}
            testID="lesson-title"
          >
            <Text style={styles.title}>
              {toPlainText(loaded.exercise.title.ar)}
            </Text>
          </Pressable>
          {!loaded.exercise.reviewed && (
            <Text style={styles.badge}>{t('lesson.unreviewed')}</Text>
          )}
        </View>
      </View>
      {devTools && <LlmStatusLine runtime={llm?.runtime ?? appLlmRuntime()} />}
      {devTools && devOnly && (llm?.runtime ?? appLlmRuntime()).devRaw && (
        <devOnly.LlmRawPanel
          log={(llm?.runtime ?? appLlmRuntime()).devRaw!}
          initiallyOpen={devOnly.devScenario() !== null}
        />
      )}
      {devTools && (
        <StoredEvents store={injectedStore ?? appEventStore()} log={log} />
      )}
      {devTools && showEvents && <EventPanel log={log} />}
      <HelpContext.Provider value={lesson.help}>
        <LessonFeed
          items={state.items}
          content={content}
          handlers={handlers}
          snapshots={snapshots}
          onUserScroll={studentScrolled}
          endCard={endCard}
        />
      </HelpContext.Provider>
      <AskField
        foldFor={keypadCard(state, content)}
        chips={content.question.askChips ?? []}
        onChip={chipId => {
          const components = snapshots.collect(activeCard);
          dispatch({
            type: 'ask_field',
            chipId,
            ...(components && { components }),
          });
        }}
        onSend={askTutor}
      />
      <LongPressMenu
        quoted={menu?.quoted ?? null}
        onChoose={chooseMode}
        onDismiss={dismissMenu}
      />
      <TutorDrawer
        state={drawer}
        hidden={sheet !== null}
        onChoose={chooseInDrawer}
        onReport={handlers.onReport}
        onMenu={handlers.onBlockMenu}
      />
      <ReportSheet
        state={sheet}
        onOpenReport={target => setSheet({ stage: 'report', target })}
        onSend={sendReport}
        onDismiss={dismissSheet}
      />
    </KeyboardAvoidingView>
  );
}

/** Key of the active card when it shows a keypad (typed step, lines editor, LawBuilder fill), else null. */
function keypadCard(state: LessonState, content: LessonContent): string | null {
  const frame = state.stack[state.stack.length - 1];
  const step = frame ? content.steps.get(frame.stepKey) : undefined;
  if (!frame || !step) {
    return null;
  }
  const fill =
    step.kind === 'component' &&
    step.component.component === 'LawBuilder' &&
    (step.component.props.mode ?? 'fill_probabilities') ===
      'fill_probabilities';
  return step.kind === 'typed' || step.kind === 'lines' || fill
    ? frame.cardKey
    : null;
}

/** Dev only: shares the report / question queue as JSONL (share sheet -> Files, mail...). */
const ExportQueue = memo(function ExportQueueImpl({
  queue,
}: {
  queue: LocalQueue;
}) {
  const { t } = useTranslation();
  const count = useSyncExternalStore(
    useCallback(cb => queue.subscribe(cb), [queue]),
    () => queue.count(),
  );
  return (
    <Pressable
      onPress={() => {
        Share.share({
          title: 'tteclair-queue.jsonl',
          message: queue.toJsonl(),
        }).catch(() => undefined);
      }}
      style={styles.events}
      accessibilityRole="button"
      testID="export-queue"
    >
      <Text style={styles.eventsCount}>{count}</Text>
      <Text style={styles.eventsLabel}>{t('lesson.exportQueue')}</Text>
    </Pressable>
  );
});

/**
 * Dev only: shares the stored event log as JSONL, the format
 * `npm run replay -- table <file>` reads.
 */
const ExportEvents = memo(function ExportEventsImpl({
  store,
  log,
}: {
  store: EventStore;
  log: EventLog;
}) {
  const { t } = useTranslation();
  useEventCount(log);
  const count = store.stats().events;
  return (
    <Pressable
      onPress={() => {
        Share.share({
          title: 'tteclair-events.jsonl',
          message: store
            .load()
            .map(e => JSON.stringify(e))
            .join('\n'),
        }).catch(() => undefined);
      }}
      style={styles.events}
      accessibilityRole="button"
      testID="export-events"
    >
      <Text style={styles.eventsCount}>{count}</Text>
      <Text style={styles.eventsLabel}>{t('lesson.exportEvents')}</Text>
    </Pressable>
  );
});

function useEventCount(log: EventLog): number {
  return useSyncExternalStore(
    useCallback(cb => log.subscribe(cb), [log]),
    () => log.all().length,
  );
}

/** Subscribes on its own, so a logged tap re-renders only this badge. */
const EventCount = memo(function EventCountImpl({ log }: { log: EventLog }) {
  const count = useEventCount(log);
  return (
    <Text style={styles.eventsCount} testID="event-count">
      {count}
    </Text>
  );
});

/** Dev only: what the persistent event log holds (survives relaunch). */
const StoredEvents = memo(function StoredEventsImpl({
  store,
  log,
}: {
  store: EventStore;
  log: EventLog;
}) {
  const { t } = useTranslation();
  useEventCount(log);
  const s = store.stats();
  const line = `${t('lesson.devLlm.stored')}: ${s.events} · chunks ${
    s.chunks
  } · ${s.chars} chars · dropped ${s.dropped}`;
  return (
    <Text style={[styles.mono, styles.storedLine]} testID="stored-events">
      {line}
    </Text>
  );
});

const EventPanel = memo(function EventPanelImpl({ log }: { log: EventLog }) {
  useEventCount(log);
  return (
    <ScrollView style={styles.eventPanel} testID="event-panel">
      {log
        .all()
        .slice(-40)
        .map(e => (
          <Text key={e.id} style={[styles.mono, styles.eventLine]}>
            {JSON.stringify({
              ...e,
              id: undefined,
              sessionId: undefined,
              studentId: undefined,
              exerciseId: undefined,
              contentVersion: undefined,
            })}
          </Text>
        ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    backgroundColor: theme.color.surfaceCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.borderDefault,
    gap: theme.space.sm,
  },
  titleBox: { flex: 1 },
  parts: { flexDirection: 'row', gap: theme.space.xxs },
  part: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xs,
  },
  partOn: {
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.thick,
  },
  backText: {
    fontSize: theme.font.size.small,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  partText: {
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'ltr',
  },
  title: {
    fontSize: theme.font.size.reading,
    fontWeight: theme.font.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  badge: {
    fontSize: theme.font.size.caption,
    color: theme.feedback.warning.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  events: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    paddingHorizontal: theme.space.xs,
  },
  eventsCount: {
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'ltr',
  },
  eventsLabel: {
    fontSize: theme.font.size.micro,
    color: theme.color.textSecondary,
  },
  eventPanel: {
    maxHeight: theme.size.eventPanelMaxHeight,
    backgroundColor: theme.color.devConsoleBackground,
    padding: theme.space.xs,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    fontSize: theme.font.size.micro,
    writingDirection: 'ltr',
  },
  eventLine: { color: theme.color.devConsoleText },
  storedLine: {
    color: theme.color.devConsoleText,
    backgroundColor: theme.color.devConsoleBackground,
    paddingHorizontal: theme.space.sm,
  },
});
