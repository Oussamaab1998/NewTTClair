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
  AccessibilityInfo,
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
  type CardAction,
  type ReportSheetState,
} from '../../lesson/feed/ReportSheet';
import { SnapshotRegistry } from '../../lesson/feed/snapshots';
import type { ReportTarget } from '../../lesson/feed/reportTarget';
import type { LocalQueue } from '../../telemetry/reports';
import { appQueue } from '../appQueue';
import { appEventStore } from '../appEventStore';
import { appDoneRecord } from '../appDoneRecord';
import { doneParts } from '../../state/doneParts';
import { PaperSheet, type PaperCloseVia } from '../../lesson/feed/PaperSheet';
import type { EventStore } from '../../telemetry/eventStore';
import type { DoneRecord } from '../../state/doneParts';
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
import { mainProgress, type Progress } from '../../lesson/session/progress';
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
  /** Done-parts record (MMKV by default; tests inject a memory one). */
  doneRecord?: DoneRecord;
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
    // Mounted again after each lesson: done parts are read fresh then.
    return (
      <ExercisePicker
        onOpen={setOpened}
        eventStore={props.eventStore ?? appEventStore()}
        doneRecord={props.doneRecord ?? appDoneRecord()}
      />
    );
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

/** Header glyphs (shape cues, not text: no i18n). */
const SUBTITLE_SEPARATOR = ' \u00b7 ';
/** «الورقة» button: a sheet-of-paper shape cue next to its label. */
const PAPER_MARK = '\u25a4';
const NOTHING_DONE: ReadonlySet<string> = new Set();
const BACK_MARK = '\u2192';

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
  doneRecord: injectedDone,
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
      doneRecord: injectedDone ?? appDoneRecord(),
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
  // «الورقة»: done parts read when it opens (stored sessions incl. this one,
  // plus the done record), focus back on its header button when it closes.
  const [paper, setPaper] = useState<ReadonlySet<string> | null>(null);
  const paperButton = useRef<React.ComponentRef<typeof View>>(null);
  const openPaper = () => {
    logUi('PaperSheet', 'opened', {});
    setPaper(
      doneParts(
        (injectedStore ?? appEventStore()).load(),
        injectedDone ?? appDoneRecord(),
      ),
    );
  };
  const closePaper = (via: PaperCloseVia) => {
    logUi('PaperSheet', 'closed', { via });
    setPaper(null);
    if (paperButton.current) {
      AccessibilityInfo.sendAccessibilityEvent(paperButton.current, 'focus');
    }
  };
  /** The active card's key: its component state goes with an ask. */
  const activeCard = state.stack[state.stack.length - 1]?.cardKey;
  useEffect(() => onLog?.(log), [log, onLog]);

  const [showEvents, setShowEvents] = useState(false);
  const devTools = useDevTools();
  const [menu, setMenu] = useState<{
    blockId: string;
    quoted: string;
    target: ReportTarget | null;
  } | null>(null);
  /** Report chosen in the long-press menu: opened once that menu is gone (iOS: one modal at a time). */
  const pendingReport = useRef<ReportTarget | null>(null);

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
      onLongPress: (blockId, quoted, target) => {
        logUi('LongPressMenu', 'opened', { blockId });
        setMenu({ blockId, quoted, target });
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
      onBlockMenu: (target, via) => {
        logUi('BlockMenu', 'opened', {
          blockId: target.blockId,
          ...(via && { via }),
        });
        setSheet({ stage: 'menu', target });
      },
      onReport: target => {
        logUi('ReportSheet', 'opened', { blockId: target.blockId });
        setSheet({ stage: 'report', target });
      },
      onCardMenu: (target, card) => {
        logUi('CardMenu', 'opened', {
          blockId: target.blockId,
          stepKey: card.stepKey,
        });
        setSheet({ stage: 'menu', target, card });
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
    devOnly?.runDevBench();
    // `-devActions notSure`: e.g. a deep dive in the real lesson (screenshots).
    for (const a of devOnly?.devActionsAtLaunch() ?? []) {
      if (a === 'notSure') {
        dispatch({ type: 'not_sure' });
      }
    }
    // `-devDemo paperSheet`: «الورقة» open from the start (screenshots).
    if (devOnly?.devDemoAtLaunch() === 'paperSheet') {
      openPaper();
    }
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

  // `-devActions answerAll` (debug builds): one right action per state until
  // the done line, so a real part_done is stored (screenshots). With
  // `-devUntil stepId`, it stops once that main step's card is open.
  const answerAll = useRef(
    devOnly?.devActionsAtLaunch().includes('answerAll') ?? false,
  );
  const until = useRef(devOnly?.devUntilAtLaunch() ?? null);
  useEffect(() => {
    if (!answerAll.current || !devOnly) {
      return;
    }
    const ref = state.stack[state.stack.length - 1]?.ref;
    if (ref?.scope === 'main' && ref.stepId === until.current) {
      answerAll.current = false;
      return;
    }
    const next = devOnly.nextRightAction(state, loaded);
    if (next) {
      dispatch(next);
    } else if (state.finished) {
      answerAll.current = false;
    }
  }, [state, loaded, dispatch]);

  const dismissSheet = () => {
    if (sheet?.stage === 'menu' && sheet.card) {
      logUi('CardMenu', 'dismissed', {
        blockId: sheet.target.blockId,
        stepKey: sheet.card.stepKey,
      });
    } else if (sheet && sheet.stage !== 'thanks') {
      logUi('ReportSheet', 'dismissed', {
        blockId: sheet.target.blockId,
        stage: sheet.stage,
      });
    }
    if (sheet && sheet.stage !== 'thanks') {
      sheet.card?.focusBack?.();
    }
    setSheet(null);
  };
  /** A card menu action: close the menu, then act (the action logs its own event). */
  const runCardAction = (action: CardAction) => {
    setSheet(null);
    action.onPress();
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
  /** «بلّغ على غلطة» in the long-press menu: that menu closes, then the report sheet opens. */
  const reportFromMenu = () => {
    if (!menu?.target) {
      return;
    }
    logUi('LongPressMenu', 'report', { blockId: menu.blockId });
    pendingReport.current = menu.target;
    setMenu(null);
    if (Platform.OS !== 'ios') {
      openPendingReport();
    }
  };
  const openPendingReport = () => {
    const target = pendingReport.current;
    pendingReport.current = null;
    if (target) {
      handlers.onReport(target);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="lesson-screen"
    >
      <View style={styles.header}>
        {/* Reading order (right to left): back, title, «الورقة». */}
        <Pressable
          onPress={() => {
            logUi('LessonHeader', 'back_to_picker', {});
            onBack();
          }}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('picker.back')}
          testID="back-to-picker"
        >
          <Text style={styles.backGlyph}>{BACK_MARK}</Text>
        </Pressable>
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
          <View style={styles.subtitleRow}>
            <View style={styles.subtitle}>
              <Text style={styles.subtitleText}>
                {t('lesson.exerciseLabel', { n: loaded.exercise.number })}
                {SUBTITLE_SEPARATOR}
              </Text>
              <Text
                style={styles.subtitleText}
                accessibilityLabel={`${t('lesson.part')} ${partLabel(part)}`}
                testID="lesson-part"
              >
                {partLabel(part)}
              </Text>
            </View>
            {!loaded.exercise.reviewed && (
              <Text
                style={styles.draftTag}
                accessibilityLabel={t('lesson.unreviewed')}
                testID="draft-tag"
              >
                {t('lesson.draftTag')}
              </Text>
            )}
          </View>
        </View>
        <Pressable
          ref={paperButton}
          onPress={openPaper}
          style={styles.paperButton}
          accessibilityRole="button"
          accessibilityLabel={t('paper.open')}
          testID="paper-open"
        >
          <Text style={styles.paperText}>{t('paper.open')}</Text>
          <Text style={styles.paperMark}>{PAPER_MARK}</Text>
        </Pressable>
      </View>
      <ProgressBar
        progress={mainProgress(content.question.groups, state)}
        label={t('lesson.progress')}
      />
      {devTools && (
        <View style={styles.devRow}>
          <ExportQueue queue={queue} />
          <ExportEvents store={injectedStore ?? appEventStore()} log={log} />
          <Pressable
            onPress={() => setShowEvents(v => !v)}
            style={styles.events}
            accessibilityRole="button"
            testID="toggle-events"
          >
            <EventCount log={log} />
            <Text style={styles.eventsLabel}>{t('lesson.events')}</Text>
          </Pressable>
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
        </View>
      )}
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
        // Collapsed while a question card is on screen (DESIGN.md §3).
        foldFor={activeCard ?? null}
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
        {...(menu?.target && {
          trust: t(`lesson.trust.${menu.target.trust}`),
          onReport: reportFromMenu,
        })}
        onChoose={chooseMode}
        onDismiss={dismissMenu}
        onHidden={openPendingReport}
      />
      <TutorDrawer
        state={drawer}
        hidden={sheet !== null}
        onChoose={chooseInDrawer}
        onReport={handlers.onReport}
        onMenu={handlers.onBlockMenu}
      />
      <PaperSheet
        visible={paper !== null}
        loaded={loaded}
        currentPartId={part}
        done={paper ?? NOTHING_DONE}
        onClose={closePaper}
      />
      <ReportSheet
        state={sheet}
        onOpenReport={(target, card) =>
          setSheet({ stage: 'report', target, ...(card && { card }) })
        }
        onSend={sendReport}
        onAction={runCardAction}
        onDismiss={dismissSheet}
      />
    </KeyboardAvoidingView>
  );
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

/** Main-path progress under the header (DESIGN.md §3); no step count shown. */
function ProgressBar({
  progress,
  label,
}: {
  progress: Progress;
  label: string;
}) {
  const ratio = progress.total > 0 ? progress.passed / progress.total : 0;
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: progress.total, now: progress.passed }}
      testID="lesson-progress"
    >
      <View style={[styles.progressFill, { flex: ratio }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  // Cahier header (DESIGN.md §3), in reading order: the back button at the
  // reading start (right), the title block, the «الورقة» button at the end.
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.sm,
    backgroundColor: theme.color.paper,
    gap: theme.space.lg,
  },
  titleBox: { flex: 1, alignItems: theme.reading.startAlign },
  subtitleRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  subtitle: { flexDirection: 'row', direction: 'ltr' },
  subtitleText: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'ltr',
  },
  draftTag: {
    ...theme.font.small,
    color: theme.color.draft.text,
    backgroundColor: theme.color.draft.bg,
    borderColor: theme.color.draft.border,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.xs,
    writingDirection: 'rtl',
  },
  back: {
    width: theme.size.touch,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.card,
    borderColor: theme.color.ink,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
  },
  backGlyph: { ...theme.font.header, color: theme.color.ink },
  // The label, then its mark at the reading end.
  paperButton: {
    minHeight: theme.size.touch,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  paperMark: { ...theme.font.body, color: theme.color.ink },
  paperText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  // The bar fills from the reading start (right).
  progressTrack: {
    flexDirection: theme.reading.row,
    height: theme.size.progressBar,
    marginHorizontal: theme.layout.gutter,
    marginBottom: theme.space.sm,
    borderRadius: theme.size.progressBar,
    backgroundColor: theme.color.border,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: theme.color.pen },
  devRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xs,
    gap: theme.space.sm,
  },
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
  partText: {
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'ltr',
  },
  title: {
    ...theme.font.header,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.ink,
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
    fontFamily: theme.font.family.mono,
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
