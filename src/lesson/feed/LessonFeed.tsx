import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ComponentHost } from '../../components/ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
} from '../../components/contract';
import type { Experiment } from '../../engine/calls';
import { probe } from '../../perf/probe';
import {
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
import { useTranslation } from 'react-i18next';

import type { LessonContent } from '../session/lesson';
import { experimentForRef, stepForRef } from '../session/lesson';
import type { CardPurpose, FeedItem, FeedItemOf } from '../session/types';
import { MathBlock } from '../math/MathBlock';
import {
  AnswerBlock,
  AskAnswer,
  DeepDiveStart,
  HintBlock,
  ReturnDivider,
  StudentBubble,
  ToneBlock,
  VariantStart,
  Writeup,
} from './Bubbles';
import { ChoiceCard } from './ChoiceCard';
import { isAway } from './jump';
import { CardMemory, CardMemoryContext } from './cardMemory';
import { SnapshotContext, type SnapshotRegistry } from './snapshots';
import { QuestionCard, type QuestionHandlers } from './QuestionCard';
import type { ComponentErrorReason } from '../../components/ComponentHost';
import { RichView } from './RichView';
import { TutorText } from './TutorText';
import { BlockActions } from './BlockActions';
import { reportTarget, type ReportTarget } from './reportTarget';
import { theme } from '../../theme';

const DONE_MARK = '✓';
const THINKING_MARK = '…';

export interface FeedHandlers extends QuestionHandlers {
  onLongPress: (blockId: string, quoted: string) => void;
  onCardChoice: (purpose: CardPurpose, choice: string) => void;
  /** "..." on a block: the menu with its trust label and Report. */
  onBlockMenu: (target: ReportTarget) => void;
  /** The visible Report button (AI blocks, active question). */
  onReport: (target: ReportTarget) => void;
}

interface FeedItemViewProps {
  item: FeedItem;
  content: LessonContent;
  handlers: FeedHandlers;
  onLayoutKey: (key: string, y: number, height: number) => void;
}

/** Items keep their identity across appends, so memo skips everything but changed cards. */
const FeedItemView = memo(function FeedItemViewImpl({
  item,
  content,
  handlers,
  onLayoutKey,
}: FeedItemViewProps) {
  probe.count('FeedItemView');
  const { t } = useTranslation();
  const experiment = content.loaded.exercise.experiment;
  let body: React.ReactNode;
  switch (item.kind) {
    case 'statement':
      body = (
        <View style={styles.statement}>
          <RichView rich={item.rich} />
        </View>
      );
      break;
    case 'tutor':
      body = (
        <TutorText
          rich={item.rich}
          longPress={item.longPress}
          onLongPress={handlers.onLongPress}
          {...(item.blockId !== undefined && {
            blockId: item.blockId,
            testID: `tutor-${item.blockId}`,
          })}
        />
      );
      break;
    case 'math':
      body = <MathBlock latex={item.latex} />;
      break;
    case 'student':
      body = <StudentBubble content={item.content} />;
      break;
    case 'feedback':
      body = (
        <ToneBlock
          tone={item.tone}
          {...(item.message && { message: item.message })}
          {...(item.rich && { rich: item.rich })}
        />
      );
      break;
    case 'hint':
      body = (
        <HintBlock level={item.level} total={item.total} rich={item.rich} />
      );
      break;
    case 'answer':
      body = <AnswerBlock rich={item.rich} />;
      break;
    case 'ask_answer':
      body = <AskAnswer parts={item.parts} />;
      break;
    case 'question': {
      const own = experimentForRef(content, item.ref);
      body = (
        <QuestionCard
          item={item}
          step={stepForRef(content, item.ref)}
          {...(own && { experiment: own })}
          {...handlers}
        />
      );
      break;
    }
    case 'component': {
      const own = item.experiment ?? experiment;
      body = (
        <VisualComponent
          item={item}
          handlers={handlers}
          {...(own && { experiment: own })}
        />
      );
      break;
    }
    case 'choice_card':
      body = <ChoiceCard item={item} onChoose={handlers.onCardChoice} />;
      break;
    case 'variant_start':
      body = <VariantStart kind={item.variantKind} />;
      break;
    case 'deep_dive_start':
      body = <DeepDiveStart />;
      break;
    case 'return':
      body = <ReturnDivider />;
      break;
    case 'component_fallback':
      body = (
        <ToneBlock
          tone="info"
          message="componentFallback"
          testID="component-fallback"
        />
      );
      break;
    case 'writeup':
      body = <Writeup lines={item.lines} />;
      break;
    case 'thinking':
      // A provisional answer is on screen; it may still change.
      body = (
        <Text
          style={styles.thinking}
          accessibilityLabel={t('lesson.thinking')}
          testID="feed-thinking"
        >
          {THINKING_MARK}
        </Text>
      );
      break;
    case 'done': {
      const doneLabel = `${DONE_MARK} ${t('lesson.done')}`;
      body = (
        <Text style={styles.done} testID="lesson-done">
          {doneLabel}
        </Text>
      );
      break;
    }
  }
  return (
    <View
      testID={`feed-item-${item.key}`}
      onLayout={(e: LayoutChangeEvent) =>
        onLayoutKey(
          item.key,
          e.nativeEvent.layout.y,
          e.nativeEvent.layout.height,
        )
      }
      style={
        item.depth > 0 && [
          styles.nested,
          { marginRight: item.depth * theme.space.depthIndent },
        ]
      }
    >
      <BlockActions
        target={reportTarget(item, content)}
        onMenu={handlers.onBlockMenu}
        onReport={handlers.onReport}
      >
        {body}
      </BlockActions>
    </View>
  );
});

/** A visual component: always interactive, its events go to the log only. */
function VisualComponent({
  item,
  handlers,
  experiment,
}: {
  item: FeedItemOf<'component'>;
  handlers: FeedHandlers;
  experiment?: Experiment;
}) {
  const { t } = useTranslation();
  const { onComponentEvent, onComponentError } = handlers;
  const { stepId } = item;
  const onEvent = useCallback(
    (e: ComponentEvent) => onComponentEvent(stepId, e),
    [onComponentEvent, stepId],
  );
  const onError = useCallback(
    (component: string, reason: ComponentErrorReason, detail: string) =>
      onComponentError(stepId, component, reason, detail),
    [onComponentError, stepId],
  );
  const snapshots = useContext(SnapshotContext);
  const handle = useRef<ComponentHandle>(null);
  useEffect(() => {
    snapshots?.register(item.blockId, item.spec.component, handle);
    return () => snapshots?.unregister(item.blockId, handle);
  }, [snapshots, item.blockId, item.spec.component]);
  if (item.superseded) {
    // A newer copy (e.g. the law table with one more cell) is further down.
    return (
      <Text style={styles.superseded} testID="component-superseded">
        {t('lesson.tableUpdated')}
      </Text>
    );
  }
  return (
    <ComponentHost
      spec={item.spec}
      defaultInstanceId={item.blockId}
      mode="interactive"
      {...(experiment && { experiment })}
      {...(item.lessonState && { lessonState: item.lessonState })}
      onEvent={onEvent}
      onError={onError}
      handleRef={handle}
    />
  );
}

interface LessonFeedProps {
  items: readonly FeedItem[];
  content: LessonContent;
  handlers: FeedHandlers;
  /** Mounted components' snapshots (ask, long-press, report). */
  snapshots: SnapshotRegistry;
  /** The student started dragging the feed (not programmatic scrolls). */
  onUserScroll?: () => void;
  /** Rendered after the last item (the end-of-question feedback card). */
  endCard?: React.ReactNode;
}

/**
 * Vertical lesson feed. New items append; the view scrolls to the first new
 * item (not to the bottom), so a long answer is read from its start.
 * When the student scrolls away from the current card, a "back to the
 * question" button appears; only that button re-renders on scroll.
 * ScrollView, not virtualized: one question is short (virtualization is an open decision).
 */
export const LessonFeed = memo(function LessonFeedImpl({
  items,
  content,
  handlers,
  snapshots,
  onUserScroll,
  endCard,
}: LessonFeedProps) {
  probe.count('LessonFeed');
  const { t } = useTranslation();
  const [memory] = useState(() => new CardMemory());
  const scroll = useRef<ScrollViewInstance>(null);
  const layouts = useRef(new Map<string, { y: number; height: number }>());
  const known = useRef(new Set<string>());
  const scrollTarget = useRef<string | null>(null);
  const view = useRef({ offset: 0, height: 0 });
  const [away, setAway] = useState(false);
  // The button shows only once the card has been out of view for a while:
  // a quick look back at the statement does not cover it with a button.
  const [showJump, setShowJump] = useState(false);
  useEffect(() => {
    if (!away) {
      setShowJump(false);
      return;
    }
    const timer = setTimeout(() => setShowJump(true), theme.feed.jumpDelayMs);
    return () => clearTimeout(timer);
  }, [away]);
  /** The current card: the last item (an active question or a card waiting for a tap). */
  const currentKey = items[items.length - 1]?.key;
  const currentRef = useRef(currentKey);
  currentRef.current = currentKey;

  const scrollToKey = useCallback((key: string) => {
    const l = layouts.current.get(key);
    if (l) {
      scroll.current?.scrollTo({
        y: Math.max(0, l.y - theme.space.lg),
        animated: true,
      });
    }
  }, []);

  const updateAway = useCallback(() => {
    const key = currentRef.current;
    const l = key === undefined ? undefined : layouts.current.get(key);
    const next = isAway(l, view.current);
    setAway(prev => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    const fresh = items.find(i => !known.current.has(i.key));
    if (fresh && known.current.size > 0) {
      scrollTarget.current = fresh.key;
      if (layouts.current.has(fresh.key)) {
        scrollToKey(fresh.key);
        scrollTarget.current = null;
      }
    }
    known.current = new Set(items.map(i => i.key));
  }, [items, scrollToKey]);

  const onLayoutKey = useCallback(
    (key: string, y: number, height: number) => {
      layouts.current.set(key, { y, height });
      if (scrollTarget.current === key) {
        scrollToKey(key);
        scrollTarget.current = null;
      }
      if (key === currentRef.current) {
        updateAway();
      }
    },
    [scrollToKey, updateAway],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      view.current = {
        offset: e.nativeEvent.contentOffset.y,
        height: e.nativeEvent.layoutMeasurement.height,
      };
      updateAway();
    },
    [updateAway],
  );

  return (
    <CardMemoryContext.Provider value={memory}>
      <SnapshotContext.Provider value={snapshots}>
        <View style={styles.wrap}>
          <ScrollView
            ref={scroll}
            style={styles.feed}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            onScrollBeginDrag={onUserScroll}
            scrollEventThrottle={SCROLL_THROTTLE_MS}
            testID="lesson-feed"
          >
            {items.map(item => (
              <FeedItemView
                key={item.key}
                item={item}
                content={content}
                handlers={handlers}
                onLayoutKey={onLayoutKey}
              />
            ))}
            {endCard}
          </ScrollView>
          {showJump && currentKey !== undefined && (
            <Pressable
              onPress={() => scrollToKey(currentKey)}
              style={styles.jump}
              accessibilityRole="button"
              testID="jump-to-current"
            >
              <Text style={styles.jumpText}>{t('lesson.jumpToCurrent')}</Text>
            </Pressable>
          )}
        </View>
      </SnapshotContext.Provider>
    </CardMemoryContext.Provider>
  );
});

/** onScroll at most this often: only the jump button depends on it. */
const SCROLL_THROTTLE_MS = 100;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  // Small, in the bottom-left corner over the "⋯" gutter (Arabic lines start
  // on the right), just above the ask bar.
  jump: {
    position: 'absolute',
    bottom: theme.space.xs,
    left: theme.space.xs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.actionPrimary,
    justifyContent: 'center',
  },
  jumpText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.footnote,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'rtl',
  },
  feed: { flex: 1, backgroundColor: theme.color.backgroundApp },
  content: { padding: theme.space.lg, paddingBottom: theme.space.scrollEnd },
  statement: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    marginVertical: theme.space.xxs,
    borderLeftWidth: theme.border.focus,
    borderLeftColor: theme.color.actionPrimary,
  },
  nested: {
    borderRightWidth: theme.border.thick,
    borderRightColor: theme.color.deepDiveRail,
    paddingRight: theme.space.sm,
  },
  superseded: {
    fontSize: theme.font.size.footnote,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginVertical: theme.space.xxxs,
  },
  thinking: {
    fontSize: theme.font.size.reading,
    color: theme.color.textSecondary,
    textAlign: 'right',
    marginVertical: theme.space.xxs,
  },
  done: {
    textAlign: 'center',
    color: theme.feedback.success.text,
    fontSize: theme.font.size.bodyLarge,
    marginVertical: theme.space.lg,
  },
});
