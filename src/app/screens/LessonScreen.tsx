import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { AskField } from '../../lesson/feed/AskField';
import { LessonFeed, type FeedHandlers } from '../../lesson/feed/LessonFeed';
import { LongPressMenu } from '../../lesson/feed/LongPressMenu';
import type { AskMode } from '../../lesson/session/types';
import { useLesson } from '../../lesson/useLesson';
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

const EX2 = loadExercise(ex2, ex2Misconceptions);

/** Playable questions of Exercise 2, in exam order. */
const PARTS = ['1b', '2a'] as const;
type Part = (typeof PARTS)[number];
const partLabel = (id: string) => `${id.slice(0, -1)}.${id.slice(-1)}`;

interface LessonScreenProps {
  /** Injected in tests for deterministic ids and timestamps. */
  clock?: LogClock;
  /** Exposes the log (tests, export). */
  onLog?: (log: EventLog) => void;
  initialPart?: Part;
}

/** Exercise 2 (1.b, 2.a), played from JSON with no AI. */
export function LessonScreen({
  initialPart = '2a',
  ...props
}: LessonScreenProps) {
  const { t } = useTranslation();
  const [part, setPart] = useState<Part>(initialPart);
  if (!EX2.ok) {
    // Content CI catches this; never crash in the app.
    return (
      <ScrollView
        testID="lesson-load-error"
        contentContainerStyle={styles.error}
      >
        <Text>{t('lesson.loadError')}</Text>
        {EX2.errors.map(e => (
          <Text key={e} style={styles.mono}>
            {e}
          </Text>
        ))}
      </ScrollView>
    );
  }
  return (
    <Lesson
      key={part}
      loaded={EX2.loaded}
      part={part}
      onPart={setPart}
      {...props}
    />
  );
}

const newSessionId = () => `sess-${Date.now().toString(36)}`;

interface LessonProps extends Omit<LessonScreenProps, 'initialPart'> {
  loaded: LoadedExercise;
  part: Part;
  onPart: (part: Part) => void;
}

function Lesson({ loaded, part, onPart, clock, onLog }: LessonProps) {
  const { t } = useTranslation();
  const [sessionId] = useState(newSessionId);
  // No accounts yet: a pseudonymous local id (CLAUDE.md rule 8).
  const lesson = useLesson(
    loaded,
    part,
    { sessionId, studentId: 'local-anon' },
    clock,
  );
  const { dispatch, logUi, logError, log, state, content } = lesson;
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
      onNotSure: () => dispatch({ type: 'not_sure' }),
      onHint: () => dispatch({ type: 'hint' }),
      onReveal: () => dispatch({ type: 'reveal' }),
      onBack: () => dispatch({ type: 'leave_deep_dive' }),
      onLongPress: (blockId, quoted) => {
        logUi('LongPressMenu', 'opened', { blockId });
        setMenu({ blockId, quoted });
      },
      // Component taps are logged only: the feed does not re-render.
      onComponentEvent: (stepId, e) =>
        logUi(
          e.component,
          e.name,
          { instanceId: e.instanceId, ...e.payload },
          stepId,
        ),
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
    }),
    [dispatch, logUi, logError],
  );

  const chooseMode = (mode: AskMode) => {
    if (menu) {
      dispatch({
        type: 'ask_longpress',
        blockId: menu.blockId,
        mode,
        quoted: menu.quoted,
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
        <View style={styles.parts}>
          {PARTS.map(id => (
            <Pressable
              key={id}
              onPress={() => onPart(id)}
              style={[styles.part, id === part && styles.partOn]}
              accessibilityRole="tab"
              accessibilityLabel={`${t('lesson.part')} ${partLabel(id)}`}
              accessibilityState={{ selected: id === part }}
              testID={`part-${id}`}
            >
              <Text style={styles.partText}>{partLabel(id)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.titleBox}>
          <Pressable
            disabled={!devRevealAvailable()}
            delayLongPress={DEV_REVEAL_MS}
            onLongPress={() => setDevTools(!devToolsEnabled())}
            testID="lesson-title"
          >
            <Text style={styles.title}>{t('lesson.title')}</Text>
          </Pressable>
          {!loaded.exercise.reviewed && (
            <Text style={styles.badge}>{t('lesson.unreviewed')}</Text>
          )}
        </View>
      </View>
      {devTools && showEvents && <EventPanel log={log} />}
      <LessonFeed items={state.items} content={content} handlers={handlers} />
      <AskField
        foldFor={keypadCard(state, content)}
        chips={content.question.askChips ?? []}
        onChip={chipId => dispatch({ type: 'ask_field', chipId })}
        onSend={text => dispatch({ type: 'ask_field', text })}
      />
      <LongPressMenu
        quoted={menu?.quoted ?? null}
        onChoose={chooseMode}
        onDismiss={dismissMenu}
      />
    </KeyboardAvoidingView>
  );
}

/** Key of the active card when it shows a keypad (typed step, LawBuilder fill), else null. */
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
  return step.kind === 'typed' || fill ? frame.cardKey : null;
}

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
  error: { padding: theme.space.xxl, gap: theme.space.xs },
});
