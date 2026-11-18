/**
 * Select any text to ask about it (approved mockups 4a-4c, 2026-11-18): the
 * long-pressed block is lifted where it sits and drawn again word by word.
 * - The word under his finger is selected, with a blue handle at each end.
 * - A dragged handle moves its end one whole word at a time (never half a
 *   word), in the block's reading direction; a magnifier above the finger
 *   shows the word it is on. «+» / «−» do the same with a tap, «الجملة
 *   الكاملة» jumps to the sentence, then the whole block; a tap on a word
 *   selects that word alone.
 * - A formula is selected whole; its parts (selection.ts formulaParts) are
 *   chips to narrow it to the piece he means.
 * «اسأل الأستاذ» hands the selection to the four options (AskProvider). Our
 * own selection, not the phone's: the same on iOS and Android, and it works
 * on formulas, which the phone cannot select.
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
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native';

import type { AskFrame } from '../../../../lesson/feed/RichView';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { theme } from '../../../../theme';
import {
  formulaParts,
  grow,
  moveEdge,
  selectedKind,
  selectedText,
  sentence,
  shrink,
  wordSelection,
  wordsOf,
  type SelectSource,
  type Selection,
  type Word,
} from './selection';

/** What he chose to ask about. */
export interface Selected {
  kind: 'ar' | 'fr' | 'math';
  text: string;
}

/** The face of the pressed text, so the lifted copy reads the same. */
export interface SelectFont {
  fontSize: number;
  fontFamily: string;
  /** The exam paper's French (STIX). */
  paper: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Words he selected, between quotes as a quote. */
const quoted = (s: string): string => ['«', s, '»'].join('');

/** The handle's dot (its radius) and its touch area (wider than it looks). */
const HANDLE_DOT = theme.size.selectDot / 2;
const HANDLE_TOUCH = theme.size.touch;
/** Words never measured (a failed measure): the whole block is selected after this long. */
const WORDS_WAIT_MS = 400;
/** The magnifier above the finger while a handle moves. */
const LOUPE = theme.size.selectLoupe;

/** The word nearest to a point: on its line first, else the closest. */
export function wordAtPoint(
  rects: readonly (Rect | undefined)[],
  x: number,
  y: number,
): number | null {
  let best: { i: number; d: number } | null = null;
  rects.forEach((r, i) => {
    if (!r) {
      return;
    }
    const onLine = y >= r.y && y <= r.y + r.h;
    const dx = x < r.x ? r.x - x : x > r.x + r.w ? x - (r.x + r.w) : 0;
    const dy = onLine
      ? 0
      : Math.min(Math.abs(y - r.y), Math.abs(y - r.y - r.h));
    // A word on the finger's line always wins over one above or below it.
    const d = (onLine ? 0 : 10_000) + dx + dy;
    if (best === null || d < best.d) {
      best = { i, d };
    }
  });
  return best === null ? null : (best as { i: number }).i;
}

/** Consecutive words of one French run inside Arabic: drawn as one left-to-right group. */
function groupsOf(words: readonly Word[]): Word[][] {
  const out: Word[][] = [];
  for (const w of words) {
    const last = out[out.length - 1];
    if (last && last[0]!.group === w.group && w.dir === 'ltr') {
      last.push(w);
    } else {
      out.push([w]);
    }
  }
  return out;
}

function Handle({
  rect,
  side,
  edge,
  onDrag,
  onEnd,
}: {
  rect: Rect;
  /** Which side of the word it sits on. */
  side: 'left' | 'right';
  edge: 'start' | 'end';
  onDrag: (edge: 'start' | 'end', x: number, y: number) => void;
  onEnd: () => void;
}) {
  const { t } = useTranslation();
  const latest = useRef({ edge, onDrag, onEnd });
  latest.current = { edge, onDrag, onEnd };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: e =>
          latest.current.onDrag(
            latest.current.edge,
            e.nativeEvent.pageX,
            e.nativeEvent.pageY,
          ),
        onPanResponderMove: e =>
          latest.current.onDrag(
            latest.current.edge,
            e.nativeEvent.pageX,
            e.nativeEvent.pageY,
          ),
        onPanResponderRelease: () => latest.current.onEnd(),
        onPanResponderTerminate: () => latest.current.onEnd(),
      }),
    [],
  );
  // Window coordinates are physical: the left edge of the screen is 0.
  const x = side === 'left' ? rect.x : rect.x + rect.w;
  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel={t(
        edge === 'start'
          ? 'hybrid.teacher.select.startHandle'
          : 'hybrid.teacher.select.endHandle',
      )}
      style={[
        styles.handleTouch,
        {
          ...theme.mathSide.startEdge(x - HANDLE_TOUCH / 2),
          top: rect.y - HANDLE_DOT,
          height: rect.h + theme.size.selectDot,
        },
      ]}
      testID={`select-handle-${edge}`}
    >
      <View style={[styles.handleBar, { height: rect.h }]} />
      <View
        style={[
          styles.handleDot,
          edge === 'start' ? styles.handleDotTop : styles.handleDotBottom,
        ]}
      />
    </View>
  );
}

function ToolButton({
  label,
  a11y,
  onPress,
  disabled = false,
  strong = false,
  testID,
}: {
  label: string;
  a11y?: string;
  onPress: () => void;
  disabled?: boolean;
  strong?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tool,
        pressed && styles.toolDown,
        disabled && styles.toolOff,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...(a11y !== undefined && { accessibilityLabel: a11y })}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text
        style={[
          styles.toolText,
          strong && styles.toolStrong,
          disabled && styles.toolTextOff,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Selector({
  source,
  frame,
  point,
  font,
  onAsk,
  onDismiss,
}: {
  source: SelectSource;
  /** Where the block sits (window); null: not measured, the copy sits mid-screen. */
  frame: AskFrame | null;
  /** Where he pressed (window); null: the whole block is selected. */
  point: { x: number; y: number } | null;
  font: SelectFont;
  onAsk: (s: Selected) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const words = useMemo(() => wordsOf(source), [source]);
  const parts = useMemo(
    () => (source.kind === 'math' ? formulaParts(source.latex) : []),
    [source],
  );
  const rtl = source.kind === 'ar';
  const [sel, setSel] = useState<Selection | null>(
    point === null && words.length > 0
      ? { start: 0, end: words.length - 1 }
      : null,
  );
  const [part, setPart] = useState(0);
  const [rects, setRects] = useState<(Rect | undefined)[]>([]);
  const [drag, setDrag] = useState<{
    edge: 'start' | 'end';
    x: number;
    y: number;
  } | null>(null);
  const refs = useRef<(React.ComponentRef<typeof Text> | null)[]>([]);
  const measured = useRef<(Rect | undefined)[]>([]);

  // Each word's place on the screen; once all are in, the pressed word is selected.
  const onWordLayout = useCallback(
    (i: number) => (_e: LayoutChangeEvent) => {
      const node = refs.current[i];
      if (typeof node?.measureInWindow !== 'function') {
        return;
      }
      node.measureInWindow((x, y, w, h) => {
        measured.current[i] = { x, y, w, h };
        const all = measured.current.filter(Boolean).length === words.length;
        if (all) {
          const next = [...measured.current];
          setRects(next);
          setSel(cur => {
            if (cur) {
              return cur;
            }
            const at = point ? wordAtPoint(next, point.x, point.y) : 0;
            return wordSelection(at ?? 0, words.length);
          });
        }
      });
    },
    [words.length, point],
  );

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setSel(
          cur =>
            cur ??
            (words.length > 0 ? { start: 0, end: words.length - 1 } : cur),
        ),
      WORDS_WAIT_MS,
    );
    return () => clearTimeout(timer);
  }, [words.length]);

  const onDrag = useCallback(
    (edge: 'start' | 'end', x: number, y: number) => {
      const i = wordAtPoint(rects, x, y);
      setDrag({ edge, x, y });
      if (i === null) {
        return;
      }
      setSel(cur => {
        if (!cur) {
          return cur;
        }
        const next = moveEdge(cur, edge, i);
        // The dragged end may have crossed the other one: it is now the other edge.
        const other = edge === 'start' ? cur.end : cur.start;
        const now = i < other ? 'start' : i > other ? 'end' : edge;
        if (now !== edge) {
          setDrag(d => (d ? { ...d, edge: now } : d));
        }
        return next;
      });
    },
    [rects],
  );
  const onDragEnd = useCallback(() => setDrag(null), []);

  const { height: screenH } = Dimensions.get('window');
  const top = frame ? frame.y : screenH * 0.3;
  const below = frame ? frame.y + frame.height / 2 < screenH / 2 : true;
  const cardStyle = frame
    ? {
        top: frame.y - theme.space.xs,
        ...theme.mathSide.startEdge(frame.x - theme.space.xs),
        width: frame.width + theme.space.xs + theme.space.xs,
      }
    : {
        top,
        ...theme.mathSide.startEdge(theme.layout.gutter),
        ...theme.mathSide.endEdge(theme.layout.gutter),
      };
  const { fontFamily, fontSize } = font;
  const wordStyle: TextStyle = font.paper
    ? { ...theme.font.paper, color: theme.color.textPrimary }
    : {
        fontFamily,
        fontSize,
        lineHeight: fontSize * theme.font.readingLineRatio,
        color: theme.color.textPrimary,
      };
  const gap = (font.paper ? theme.font.paper.fontSize : font.fontSize) * 0.3;

  const isMath = source.kind === 'math';
  const chosen: Selected | null = isMath
    ? { kind: 'math', text: parts[part] ?? source.latex }
    : sel
    ? { kind: selectedKind(words, sel), text: selectedText(words, sel) }
    : null;
  const many = sel !== null && sel.end > sel.start;
  const whole = sel !== null && sel.start === 0 && sel.end === words.length - 1;

  const startRect = sel ? rects[sel.start] : undefined;
  const endRect = sel ? rects[sel.end] : undefined;
  // Where the toolbar goes: under the block when it sits in the upper half.
  const blockBottom = frame
    ? frame.y + frame.height
    : top + theme.size.touch * 2;
  const toolbarPlace = below
    ? { top: blockBottom + theme.space.lg }
    : { bottom: screenH - top + theme.space.lg };
  const loupeWord =
    drag && sel ? words[drag.edge === 'start' ? sel.start : sel.end] : null;

  // What is selected, quoted: on the side away from the buttons, so they
  // never move under his finger when it appears (toolbar below the text:
  // under the buttons; above it: over them).
  const preview = !isMath && many && chosen && (
    <View
      style={[
        styles.preview,
        below ? styles.previewBelow : styles.previewAbove,
      ]}
      testID="select-preview"
    >
      <Text style={styles.toolLabel}>{t('hybrid.teacher.select.chosen')}</Text>
      <Text
        style={[
          styles.previewText,
          chosen.kind === 'fr' ? styles.ltrWord : styles.rtlText,
        ]}
        numberOfLines={2}
      >
        {quoted(chosen.text)}
      </Text>
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} testID="select-layer">
      <Pressable
        style={styles.scrim}
        accessibilityRole="button"
        accessibilityLabel={t('hybrid.teacher.menu.close')}
        onPress={onDismiss}
        testID="select-scrim"
      />
      <View style={[styles.lifted, cardStyle]} testID="select-lifted">
        {isMath ? (
          <View style={styles.formula}>
            <MathBlock latex={source.latex} fontSize={theme.font.size.title} />
          </View>
        ) : (
          <View
            style={[styles.flow, rtl ? styles.rtlFlow : styles.ltrFlow]}
            testID="select-words"
          >
            {groupsOf(words).map((g, gi) => {
              const items = g.map(w => {
                const on = sel !== null && w.i >= sel.start && w.i <= sel.end;
                return (
                  <Text
                    key={w.i}
                    ref={node => {
                      refs.current[w.i] = node;
                    }}
                    onLayout={onWordLayout(w.i)}
                    onPress={() => setSel(wordSelection(w.i, words.length))}
                    style={[
                      wordStyle,
                      { paddingHorizontal: gap / 2 },
                      on && styles.wordOn,
                      w.dir === 'ltr' && rtl && styles.ltrWord,
                    ]}
                    accessibilityState={{ selected: on }}
                    testID={`select-word-${w.i}`}
                  >
                    {w.text}
                  </Text>
                );
              });
              return g.length > 1 || (rtl && g[0]!.dir === 'ltr') ? (
                <View key={`g${gi}`} style={[styles.flow, styles.ltrFlow]}>
                  {items}
                </View>
              ) : (
                items
              );
            })}
          </View>
        )}
      </View>

      {!isMath && startRect && endRect && (
        <>
          <Handle
            rect={startRect}
            side={rtl ? 'right' : 'left'}
            edge="start"
            onDrag={onDrag}
            onEnd={onDragEnd}
          />
          <Handle
            rect={endRect}
            side={rtl ? 'left' : 'right'}
            edge="end"
            onDrag={onDrag}
            onEnd={onDragEnd}
          />
        </>
      )}

      {drag && loupeWord && (
        <View
          pointerEvents="none"
          style={[
            styles.loupe,
            {
              ...theme.mathSide.startEdge(drag.x - LOUPE / 2),
              top: drag.y - LOUPE - theme.space.xxl,
            },
          ]}
          testID="select-loupe"
        >
          <Text
            style={[
              wordStyle,
              styles.loupeText,
              loupeWord.dir === 'ltr' && styles.ltrWord,
            ]}
            numberOfLines={1}
          >
            {loupeWord.text}
          </Text>
        </View>
      )}

      <View style={[styles.toolbar, toolbarPlace]} testID="select-toolbar">
        {isMath && parts.length > 1 && (
          <View style={styles.partsBox}>
            <Text style={styles.toolLabel}>
              {t('hybrid.teacher.select.parts')}
            </Text>
            <View style={styles.parts}>
              {parts.map((p, i) => (
                <Pressable
                  key={p}
                  style={[styles.part, i === part && styles.partOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === part }}
                  onPress={() => setPart(i)}
                  testID={`select-part-${i}`}
                >
                  <MathBlock latex={p} fontSize={theme.font.size.body} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {!below && preview}
        <View style={styles.tools}>
          {isMath ? (
            <View style={styles.about}>
              <Text style={styles.toolLabel}>
                {t('hybrid.teacher.select.about')}
              </Text>
              <MathBlock
                latex={chosen?.text ?? source.latex}
                fontSize={theme.font.size.body}
                color={theme.color.textOnAccent}
              />
            </View>
          ) : (
            <>
              <ToolButton
                label="−"
                a11y={t('hybrid.teacher.select.less')}
                disabled={!many}
                onPress={() => setSel(s => (s ? shrink(s) : s))}
                testID="select-less"
              />
              <ToolButton
                label="+"
                a11y={t('hybrid.teacher.select.more')}
                disabled={sel === null || whole}
                onPress={() => setSel(s => (s ? grow(s, words.length) : s))}
                testID="select-more"
              />
              <ToolButton
                label={t('hybrid.teacher.select.sentence')}
                disabled={sel === null || whole}
                onPress={() => setSel(s => (s ? sentence(s, words) : s))}
                testID="select-sentence"
              />
            </>
          )}
          <ToolButton
            label={t('hybrid.teacher.select.ask')}
            strong
            disabled={chosen === null || chosen.text === ''}
            onPress={() => chosen && onAsk(chosen)}
            testID="select-ask"
          />
        </View>
        {below && preview}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.color.overlayScrim,
    opacity: theme.opacity.dimmed,
  },
  lifted: {
    position: 'absolute',
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.space.xs,
    paddingHorizontal: theme.space.xs,
  },
  formula: {
    alignItems: 'center',
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.deepDive.bg,
    paddingVertical: theme.space.xs,
  },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  rtlFlow: { direction: 'rtl' },
  ltrFlow: { direction: 'ltr' },
  ltrWord: { writingDirection: 'ltr' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  // The editor's own selection blue (the same as «widen» in the line editor).
  wordOn: {
    backgroundColor: theme.editor.color.selection,
    color: theme.color.ink,
  },
  handleTouch: {
    position: 'absolute',
    width: HANDLE_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: { width: theme.border.active, backgroundColor: theme.color.pen },
  handleDot: {
    position: 'absolute',
    width: theme.size.selectDot,
    height: theme.size.selectDot,
    borderRadius: HANDLE_DOT,
    backgroundColor: theme.color.pen,
  },
  handleDotTop: { top: 0 },
  handleDotBottom: { bottom: 0 },
  loupe: {
    position: 'absolute',
    width: LOUPE,
    height: LOUPE,
    borderRadius: LOUPE / 2,
    borderWidth: theme.border.active,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loupeText: {
    fontSize: theme.font.size.title * 1.4,
    lineHeight: theme.font.size.title * 2,
    backgroundColor: theme.editor.color.selection,
  },
  toolbar: {
    position: 'absolute',
    ...theme.mathSide.startEdge(theme.layout.gutter),
    ...theme.mathSide.endEdge(theme.layout.gutter),
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.button,
    overflow: 'hidden',
  },
  preview: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  previewAbove: {
    borderBottomWidth: theme.border.thin,
    borderBottomColor: theme.color.onInk.track,
  },
  previewBelow: {
    borderTopWidth: theme.border.thin,
    borderTopColor: theme.color.onInk.track,
  },
  previewText: {
    ...theme.font.small,
    color: theme.color.textOnAccent,
    flexShrink: 1,
  },
  partsBox: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    gap: theme.space.xs,
  },
  parts: {
    direction: 'ltr',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    paddingBottom: theme.space.sm,
  },
  part: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceCard,
  },
  partOn: {
    borderColor: theme.color.pen,
    borderWidth: theme.border.active,
    backgroundColor: theme.color.deepDive.bg,
  },
  tools: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    borderTopWidth: theme.border.thin,
    borderTopColor: theme.color.onInk.track,
  },
  about: {
    flex: 1,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  tool: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.md,
  },
  toolDown: { backgroundColor: theme.color.onInk.track },
  toolText: { ...theme.font.body, color: theme.color.textOnAccent },
  // Nothing more to add: clearly off, not just a little paler.
  toolOff: { opacity: theme.opacity.dimmed },
  toolTextOff: { color: theme.color.onInk.muted },
  toolStrong: {
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.highlighter,
  },
  toolLabel: {
    ...theme.font.small,
    color: theme.color.onInk.muted,
    writingDirection: 'rtl',
  },
});
