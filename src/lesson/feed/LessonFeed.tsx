import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import type { TFunction } from 'i18next';

import type { LessonContent } from '../session/lesson';
import { experimentForRef, stepForRef } from '../session/lesson';
import type { CardPurpose, FeedItem, FeedItemOf } from '../session/types';
import { ScrollingMath } from '../math/ScrollingMath';
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
import { MethodNoteView, noteSpoken } from './method/MethodNoteView';
import { FooterRevealContext } from './help';
import { footerScrollY, isAway } from './jump';
import { CardMemory, CardMemoryContext } from './cardMemory';
import { SnapshotContext, type SnapshotRegistry } from './snapshots';
import { QuestionCard, type QuestionHandlers } from './QuestionCard';
import type { ComponentErrorReason } from '../../components/ComponentHost';
import { RichView, richToSpoken, type Quote } from './RichView';
import { WalkthroughCard } from './WalkthroughCard';
import { TutorText } from './TutorText';
import { BlockActions, type MenuVia } from './BlockActions';
import {
  reportPath,
  reportTarget,
  visualOwners,
  type ReportTarget,
} from './reportTarget';
import { spokenMath } from '../math/spoken';
import { PaperBackground } from '../paper/PaperBackground';
import { theme, type PaperStyle } from '../../theme';

const DONE_MARK = '✓';
const NO_VISUALS: readonly ReportTarget[] = [];
const THINKING_MARK = '…';

export interface FeedHandlers extends QuestionHandlers {
  /** Tutor text long-press: the ask menu (with its block's trust label and Report). */
  onLongPress: (
    blockId: string,
    quote: Quote,
    target: ReportTarget | null,
  ) => void;
  onCardChoice: (purpose: CardPurpose, choice: string) => void;
  /** B4: «التالي» on the walk-through. */
  onWalkthroughNext: () => void;
  /** A block's menu (trust label + Report): long-press or screen-reader action. */
  onBlockMenu: (target: ReportTarget, via?: MenuVia) => void;
  /** The visible Report button (AI blocks). */
  onReport: (target: ReportTarget) => void;
}

/** A block as words: its accessibility label on the long-press path. */
function blockLabel(item: FeedItem, t: TFunction): string {
  switch (item.kind) {
    case 'statement':
    case 'tutor':
      return richToSpoken(item.rich);
    case 'math':
      return spokenMath(item.latex);
    case 'feedback':
      return item.note
        ? noteSpoken(t, item.note)
        : item.rich
        ? richToSpoken(item.rich)
        : item.message
        ? t(`lesson.${item.message}`)
        : '';
    case 'hint':
      return `${t('lesson.hint')} ${item.level}/${item.total}. ${richToSpoken(
        item.rich,
      )}`;
    case 'answer':
      return `${t('lesson.revealed')} ${richToSpoken(item.rich)}`;
    case 'ask_answer':
      return item.parts.map(richToSpoken).join(' ');
    case 'writeup':
      return [t('lesson.writeupTitle'), ...item.lines].join(' ');
    case 'walkthrough':
      return [
        t('lesson.walkthrough.title'),
        ...item.lines.slice(0, item.shown).map(richToSpoken),
      ].join(' ');
    case 'component_fallback':
      return t('lesson.componentFallback');
    default:
      return '';
  }
}

interface FeedItemViewProps {
  item: FeedItem;
  content: LessonContent;
  handlers: FeedHandlers;
  onLayoutKey: (key: string, y: number, height: number) => void;
  /** Question cards: the visuals whose Report sits in this card's "⋯". */
  visuals?: readonly ReportTarget[] | undefined;
}

/** Items keep their identity across appends, so memo skips everything but changed cards. */
const FeedItemView = memo(function FeedItemViewImpl({
  item,
  content,
  handlers,
  onLayoutKey,
  visuals,
}: FeedItemViewProps) {
  probe.count('FeedItemView');
  const { t } = useTranslation();
  const experiment = content.loaded.exercise.experiment;
  const target = reportTarget(item, content);
  const path = reportPath(item);
  let body: React.ReactNode;
  switch (item.kind) {
    case 'statement':
      // Exam wording: the French line in the paper face (DESIGN.md §3).
      body = (
        <View style={styles.statement}>
          <RichView rich={item.rich} variant="paper" />
        </View>
      );
      break;
    case 'tutor':
      body = (
        <TutorText
          rich={item.rich}
          longPress={item.longPress}
          onLongPress={(blockId, quote) =>
            handlers.onLongPress(blockId, quote, target)
          }
          {...(target && {
            onReportAction: () => handlers.onBlockMenu(target, 'a11y'),
          })}
          {...(item.blockId !== undefined && {
            blockId: item.blockId,
            testID: `tutor-${item.blockId}`,
          })}
        />
      );
      break;
    case 'math':
      body = <ScrollingMath latex={item.latex} />;
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
        >
          {item.note && <MethodNoteView note={item.note} />}
        </ToneBlock>
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
          reportTarget={target}
          visualTargets={visuals ?? NO_VISUALS}
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
      body = (
        <ChoiceCard
          item={item}
          onChoose={handlers.onCardChoice}
          {...(target && {
            onTitleMenu: (via: MenuVia) => handlers.onBlockMenu(target, via),
          })}
        />
      );
      break;
    case 'variant_start':
      body = <VariantStart kind={item.variantKind} inSheet={item.depth > 0} />;
      break;
    case 'deep_dive_start':
      body = <DeepDiveStart inSheet={item.depth > 0} />;
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
    case 'walkthrough':
      body = (
        <WalkthroughCard
          lines={item.lines}
          shown={item.shown}
          done={item.done}
          onNext={handlers.onWalkthroughNext}
        />
      );
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
    >
      <BlockActions
        target={target}
        path={path}
        label={path === 'longpress' ? blockLabel(item, t) : ''}
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
  /** The paper behind the feed (DESIGN.md §6; default the theme's). */
  paper?: PaperStyle;
  /** Debug builds (`-devScrollEnd on`): keep the feed at its end (screenshots). */
  devScrollToEnd?: boolean;
  /** Debug builds (`-devScroll N` with `-devScrollEnd on`): N pt back from the end. */
  devScrollBack?: number;
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
  paper = theme.layout.paperStyle,
  devScrollToEnd = false,
  devScrollBack = 0,
}: LessonFeedProps) {
  probe.count('LessonFeed');
  const { t } = useTranslation();
  const [memory] = useState(() => new CardMemory());
  // Interactive visuals have no long-press: their Report is a row in the
  // "⋯" of the card that owns them (DESIGN.md §3).
  const visualsByCard = useMemo(() => {
    const byCard = new Map<string, ReportTarget[]>();
    const owners = visualOwners(items);
    for (const item of items) {
      const card = owners.get(item.key);
      const target = card && reportTarget(item, content);
      if (card && target) {
        byCard.set(card, [...(byCard.get(card) ?? []), target]);
      }
    }
    return byCard;
  }, [items, content]);
  const scroll = useRef<ScrollViewInstance>(null);
  const layouts = useRef(new Map<string, { y: number; height: number }>());
  const known = useRef(new Set<string>());
  const scrollTarget = useRef<string | null>(null);
  const view = useRef({ offset: 0, height: 0 });
  /** The student dragged the feed since the last new item (help chips then do not scroll). */
  const userScrolled = useRef(false);
  /** A card whose help chips appeared: its footer is scrolled into view (again once its height is known). */
  const footerTarget = useRef<string | null>(null);
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

  const contentHeight = useRef(0);
  /** Debug builds: the end of the feed, or `devScrollBack` pt above it. */
  const devScrollNow = useCallback(() => {
    if (devScrollBack > 0) {
      scroll.current?.scrollTo({
        y: Math.max(
          0,
          contentHeight.current - view.current.height - devScrollBack,
        ),
        animated: false,
      });
    } else {
      scroll.current?.scrollToEnd({ animated: false });
    }
  }, [devScrollBack]);

  const scrollToKey = useCallback(
    (key: string) => {
      if (devScrollToEnd) {
        devScrollNow();
        return;
      }
      const l = layouts.current.get(key);
      if (l) {
        // Exactly the item's top: a margin above it would show a slice of the
        // previous block (a stray mark under the header).
        scroll.current?.scrollTo({ y: Math.max(0, l.y), animated: true });
      }
    },
    [devScrollToEnd, devScrollNow],
  );

  const updateAway = useCallback(() => {
    const key = currentRef.current;
    const l = key === undefined ? undefined : layouts.current.get(key);
    const next = isAway(l, view.current);
    setAway(prev => (prev === next ? prev : next));
  }, []);

  const scrollToFooter = useCallback(
    (key: string) => {
      const y = devScrollToEnd
        ? null
        : footerScrollY(
            layouts.current.get(key),
            view.current,
            userScrolled.current,
            theme.space.md,
          );
      if (y !== null) {
        scroll.current?.scrollTo({ y, animated: true });
      }
    },
    [devScrollToEnd],
  );

  const revealFooter = useCallback(
    (key: string) => {
      footerTarget.current = key;
      scrollToFooter(key);
    },
    [scrollToFooter],
  );

  const onScrollBeginDrag = useCallback(() => {
    userScrolled.current = true;
    onUserScroll?.();
  }, [onUserScroll]);

  useEffect(() => {
    const fresh = items.find(i => !known.current.has(i.key));
    if (fresh) {
      userScrolled.current = false;
      // A card's effects run before this one: keep a target the new items set.
      const target = footerTarget.current;
      if (target !== null && known.current.has(target)) {
        footerTarget.current = null;
      }
    }
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
      if (footerTarget.current === key) {
        scrollToFooter(key);
      }
      if (key === currentRef.current) {
        updateAway();
      }
    },
    [scrollToKey, scrollToFooter, updateAway],
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
        <FooterRevealContext.Provider value={revealFooter}>
          <View style={styles.wrap}>
            <PaperBackground style={paper} />
            <ScrollView
              ref={scroll}
              style={styles.feed}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              onScrollBeginDrag={onScrollBeginDrag}
              onLayout={(e: LayoutChangeEvent) => {
                view.current = {
                  ...view.current,
                  height: e.nativeEvent.layout.height,
                };
              }}
              scrollEventThrottle={SCROLL_THROTTLE_MS}
              {...(devScrollToEnd && {
                onContentSizeChange: (_w: number, h: number) => {
                  contentHeight.current = h;
                  devScrollNow();
                },
              })}
              testID="lesson-feed"
            >
              <FeedRun
                items={items}
                visualsByCard={visualsByCard}
                depth={0}
                content={content}
                handlers={handlers}
                onLayoutKey={onLayoutKey}
              />
              {endCard}
            </ScrollView>
            {showJump && currentKey !== undefined && (
              // Its own row under the feed: it never covers an option (round 1).
              <View style={styles.jumpRow} testID="jump-row">
                <Pressable
                  onPress={() => scrollToKey(currentKey)}
                  style={styles.jump}
                  accessibilityRole="button"
                  testID="jump-to-current"
                >
                  <Text style={styles.jumpText}>
                    {t('lesson.jumpToCurrent')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </FooterRevealContext.Provider>
      </SnapshotContext.Provider>
    </CardMemoryContext.Provider>
  );
});

interface FeedRunProps {
  items: readonly FeedItem[];
  depth: number;
  content: LessonContent;
  handlers: FeedHandlers;
  onLayoutKey: (key: string, y: number, height: number) => void;
  /** Card key -> the visuals reported from its "⋯" (visualOwners). */
  visualsByCard: ReadonlyMap<string, readonly ReportTarget[]>;
}

/**
 * Items at this depth in order; each run of deeper items (a deep dive or a
 * variant, from its start item to the "return" divider) goes into one inset
 * sheet (DESIGN.md §3). Nested detours nest.
 */
function FeedRun({ items, depth, visualsByCard, ...rest }: FeedRunProps) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < items.length; ) {
    const item = items[i]!;
    if (item.depth <= depth) {
      out.push(
        <FeedItemView
          key={item.key}
          item={item}
          visuals={visualsByCard.get(item.key)}
          {...rest}
        />,
      );
      i += 1;
      continue;
    }
    let j = i;
    while (j < items.length && items[j]!.depth > depth) {
      j += 1;
    }
    out.push(
      <DetourSheet
        key={`sheet-${item.key}`}
        items={items.slice(i, j)}
        depth={depth + 1}
        visualsByCard={visualsByCard}
        {...rest}
      />,
    );
    i = j;
  }
  return <>{out}</>;
}

/**
 * The deep-dive sheet: tinted, dashed pen edge, its start item as the tab.
 * Item positions are reported in feed coordinates (the sheet's own y added,
 * and re-reported when the sheet moves), so the "back to the question" button
 * and the scroll to new items still work inside it.
 */
function DetourSheet({ onLayoutKey, ...rest }: FeedRunProps) {
  const base = useRef<number | null>(null);
  const local = useRef(new Map<string, { y: number; height: number }>());
  const onChild = useCallback(
    (key: string, y: number, height: number) => {
      local.current.set(key, { y, height });
      if (base.current !== null) {
        onLayoutKey(key, base.current + y, height);
      }
    },
    [onLayoutKey],
  );
  return (
    <View
      style={styles.sheet}
      testID="detour-sheet"
      onLayout={(e: LayoutChangeEvent) => {
        base.current = e.nativeEvent.layout.y;
        for (const [key, l] of local.current) {
          onLayoutKey(key, e.nativeEvent.layout.y + l.y, l.height);
        }
      }}
    >
      <FeedRun {...rest} onLayoutKey={onChild} />
    </View>
  );
}

/** onScroll at most this often: only the jump button depends on it. */
const SCROLL_THROTTLE_MS = 100;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.color.backgroundApp },
  // Small, at the reading end (Arabic lines start on the right), in its own
  // row just above the ask bar: never over the feed.
  jumpRow: {
    alignItems: theme.reading.endAlign,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.xxs,
    backgroundColor: theme.color.backgroundApp,
  },
  jump: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.pen,
    justifyContent: 'center',
  },
  jumpText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
  // Transparent: the paper (flat, grid or ruled) is the wrap's background.
  feed: { flex: 1 },
  content: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.scrollEnd,
  },
  // Statement / goal: a plain white card (no left rail, DESIGN.md §3).
  statement: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    marginVertical: theme.space.xxs,
  },
  sheet: {
    backgroundColor: theme.color.deepDive.bg,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.deepDive.edge,
    borderRadius: theme.radius.card,
    // Clears its tab (theme.offset.cardTab, sitting on the top edge) by space.sm.
    marginTop: theme.space.sheetTop,
    marginBottom: theme.space.xs,
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.sm,
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
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.ink,
    marginVertical: theme.space.lg,
  },
});
