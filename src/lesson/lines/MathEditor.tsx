import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  type Cursor,
  type EditorState,
  type Key,
  type LineIssue,
  type Node,
  type PathStep,
  type Selection,
  type Sym,
} from './editor';
import { theme } from '../../theme';
import { scrollForCursor } from './lineScroll';

const E = theme.editor;
const sizeAt = (depth: number) =>
  E.fontSizes[Math.min(depth, E.fontSizes.length - 1)]!;

/** How a symbol is drawn (typed '*' and '-' are shown as × and −). */
const SHOW: Partial<Record<string, string>> = { '*': '×', '-': '−' };
/** Letters are italic, as in the rendered formulas (x is never read as ×). */
const LETTER = /^[a-z]$/;
/** Binary signs get space around them (× never touches x). */
const OPERATOR = /^[-+*]$/;

/** A spot to mark: a whole slot, or one node of it. */
export type Mark = Pick<LineIssue, 'path' | 'index'>;

const samePath = (a: readonly PathStep[], b: readonly PathStep[]) =>
  a.length === b.length &&
  a.every((s, i) => s.i === b[i]!.i && s.slot === b[i]!.slot);

/** What every slot of one editor line needs to draw itself. */
interface ViewCtx {
  cursor: Cursor;
  /** A tap: the cursor goes to `at` in that slot (default: its end). */
  onTap?: (path: PathStep[], at?: number) => void;
  /** The faulty spot (a localized wrong line, an unreadable one). */
  mark?: Mark;
  sel?: Selection;
  /** The node a wrap just made, while it is shown. */
  flash?: Mark;
  /** The cursor element, measured so a long line keeps it in view. */
  cursorRef?: React.RefObject<React.ComponentRef<typeof View> | null>;
}

/** A slot: its nodes with the cursor; empty slots show a box. Tap = cursor to its end. */
function Slot({
  nodes,
  path,
  depth,
  ctx,
}: {
  nodes: readonly Node[];
  path: PathStep[];
  depth: number;
  ctx: ViewCtx;
}) {
  const size = sizeAt(depth);
  const { cursor, mark, flash, onTap } = ctx;
  const active = samePath(path, cursor.path);
  const marked = mark !== undefined && samePath(path, mark.path);
  const faulty = marked && mark.index === undefined;
  const sel = ctx.sel && samePath(ctx.sel.path, path) ? ctx.sel : undefined;
  const flashAt = flash && samePath(flash.path, path) ? flash.index : undefined;
  const caret = (key: string) => (
    <View
      key={key}
      ref={ctx.cursorRef}
      style={[styles.cursor, { height: size * E.cursorRatio }]}
      testID="editor-cursor"
    />
  );
  const view = (i: number) => (
    <NodeView
      key={i}
      node={nodes[i]!}
      path={path}
      index={i}
      depth={depth}
      ctx={ctx}
    />
  );
  const decorated = (i: number) =>
    marked && mark.index === i ? (
      <View key={i} style={styles.faulty} testID="editor-faulty-node">
        {view(i)}
      </View>
    ) : flashAt === i ? (
      <View key={i} style={styles.flash} testID="editor-flash">
        {view(i)}
      </View>
    ) : (
      view(i)
    );
  const items: React.ReactNode[] = [];
  let i = 0;
  while (i < nodes.length) {
    if (active && cursor.at === i) {
      items.push(caret(`c${i}`));
    }
    if (sel && i === sel.from && sel.to > sel.from) {
      const inner: React.ReactNode[] = [];
      for (let k = sel.from; k < sel.to; k += 1) {
        inner.push(view(k));
      }
      items.push(
        <View key={`s${i}`} style={styles.selection} testID="editor-selection">
          {inner}
        </View>,
      );
      i = sel.to;
      continue;
    }
    items.push(decorated(i));
    i += 1;
  }
  if (active && cursor.at === nodes.length) {
    items.push(caret('end'));
  }
  const empty = nodes.length === 0;
  return (
    <Pressable
      onPress={onTap && (() => onTap(path))}
      disabled={!onTap}
      style={[
        styles.slot,
        empty && {
          minWidth: size * E.slotRatio,
          minHeight: size * E.slotRatio,
        },
        empty && styles.empty,
        active && path.length > 0 && styles.activeSlot,
        empty && active && styles.activeEmpty,
        faulty && styles.faulty,
      ]}
      {...(active && path.length > 0 && { testID: 'editor-active-slot' })}
      {...(faulty && { testID: 'editor-faulty-slot' })}
    >
      {items}
    </Pressable>
  );
}

function NodeView({
  node,
  path,
  index,
  depth,
  ctx,
}: {
  node: Node;
  path: PathStep[];
  index: number;
  depth: number;
  ctx: ViewCtx;
}) {
  const size = sizeAt(depth);
  const at = (slot: PathStep['slot']) => [...path, { i: index, slot }];
  switch (node.k) {
    case 'sym': {
      const text = (
        <Text
          style={[
            styles.sym,
            LETTER.test(node.v) && styles.letter,
            OPERATOR.test(node.v) && styles.operator,
            { fontSize: size },
          ]}
        >
          {SHOW[node.v] ?? node.v}
        </Text>
      );
      const { onTap } = ctx;
      // A tap on a symbol puts the cursor right after it.
      return onTap ? (
        <Pressable
          onPress={() => onTap(path, index + 1)}
          hitSlop={E.tapSlop}
          testID="editor-sym"
        >
          {text}
        </Pressable>
      ) : (
        text
      );
    }
    case 'frac':
      return (
        <View style={styles.frac}>
          <Slot nodes={node.num} path={at('num')} depth={depth + 1} ctx={ctx} />
          <View style={styles.bar} />
          <Slot nodes={node.den} path={at('den')} depth={depth + 1} ctx={ctx} />
        </View>
      );
    case 'pow':
      return (
        <View style={{ marginBottom: size * E.liftRatio }}>
          <Slot nodes={node.exp} path={at('exp')} depth={depth + 1} ctx={ctx} />
        </View>
      );
    case 'group':
      return (
        <View style={styles.group}>
          <Text style={[styles.sym, { fontSize: size }]}>{PAREN.open}</Text>
          <Slot nodes={node.body} path={at('body')} depth={depth} ctx={ctx} />
          <Text style={[styles.sym, { fontSize: size }]}>{PAREN.close}</Text>
        </View>
      );
  }
}

const PAREN = { open: '(', close: ')' };

/** The editor line (horizontal scroll for long lines); tap a slot or a symbol to move the cursor. */
export function EditorLine({
  state,
  onKey,
  mark,
  showFlash = false,
  testID,
}: {
  state: EditorState;
  onKey?: (k: Key) => void;
  mark?: Mark;
  /** Show the node a wrap just made (the card times it). */
  showFlash?: boolean;
  testID?: string;
}) {
  // A line wider than the field scrolls: the cursor stays in view (typing at
  // the end, ← back to the start), with an inner margin on both sides.
  const scroll = useRef<ScrollViewInstance>(null);
  const content = useRef<React.ComponentRef<typeof View>>(null);
  const cursorRef = useRef<React.ComponentRef<typeof View>>(null);
  const scrollX = useRef(0);
  const viewWidth = useRef(0);
  /** Scroll so the cursor is in view (after an edit, a layout, a size change). */
  const follow = () => {
    const c = cursorRef.current;
    const host = content.current;
    if (!c || !host || typeof c.measureLayout !== 'function') {
      return;
    }
    c.measureLayout(host, x => {
      const next = scrollForCursor(
        x,
        scrollX.current,
        viewWidth.current,
        theme.space.lg,
      );
      if (next !== null) {
        scroll.current?.scrollTo({ x: next, animated: false });
        scrollX.current = next;
      }
    });
  };
  useEffect(follow);
  const ctx: ViewCtx = {
    cursor: state.cursor,
    cursorRef,
    ...(mark && { mark }),
    ...(state.sel && { sel: state.sel }),
    ...(showFlash && state.flash && { flash: state.flash }),
    ...(onKey && {
      onTap: (path: PathStep[], at?: number) =>
        onKey(at === undefined ? { focus: path } : { focus: path, at }),
    }),
  };
  return (
    <View style={styles.line}>
      <ScrollView
        ref={scroll}
        horizontal
        onLayout={e => {
          viewWidth.current = e.nativeEvent.layout.width;
          follow();
        }}
        onContentSizeChange={follow}
        onScroll={e => {
          scrollX.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={LINE_SCROLL_THROTTLE_MS}
        contentContainerStyle={styles.lineContent}
        testID={testID}
      >
        <View ref={content} style={styles.lineRow}>
          <Slot nodes={state.root} path={[]} depth={0} ctx={ctx} />
        </View>
      </ScrollView>
    </View>
  );
}

/** onScroll of a long line at most this often (only the cursor follow uses it). */
const LINE_SCROLL_THROTTLE_MS = 50;

/** Key labels (structure keys drawn as their shape, not as "^(" text). */
const LABEL: Record<string, string> = {
  frac: '▭⁄▭',
  pow: '□ⁿ',
  group: '( )',
  close: ')',
  left: '←',
  right: '→',
  up: '↑',
  down: '↓',
  undo: '↶',
  redo: '↷',
  back: '⌫',
  clear: 'C',
  '*': '×',
  '-': '−',
};

export type KeyId = Sym | 'frac' | 'pow' | 'group' | 'close';

/** Default keys for A1-A3 lines; content can narrow them (contextual keys). */
export const DEFAULT_KEYS: readonly KeyId[] = [
  'x',
  'e',
  'frac',
  'pow',
  'group',
  'close',
  '+',
  '-',
  '*',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];

/** Contextual keys, folded with ▾ so the question stays visible. */
export function EditorKeys({
  keys,
  collapsed,
  onKey,
  testID,
}: {
  keys: readonly KeyId[];
  collapsed: boolean;
  onKey: (k: Key) => void;
  testID: string;
}) {
  const { t } = useTranslation();
  // As many 44 pt keys per row as the card width holds (fewer rows).
  const [cols, setCols] = useState<number>(E.keysPerRow);
  if (collapsed) {
    return null;
  }
  // ")" comes with the parentheses key.
  const shown = keys.flatMap(k =>
    k === 'group' && !keys.includes('close')
      ? ['group' as const, 'close' as const]
      : [k],
  );
  const rows: KeyId[][] = [];
  shown.forEach((k, i) => {
    if (i % cols === 0) {
      rows.push([]);
    }
    rows[rows.length - 1]!.push(k);
  });
  return (
    <View
      style={styles.keys}
      onLayout={e => {
        const w = e.nativeEvent.layout.width;
        const fit = Math.floor((w + E.keyGap) / (theme.size.touch + E.keyGap));
        setCols(Math.max(1, fit));
      }}
      testID={`${testID}-keys`}
    >
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map(k => (
            <KeyButton
              // Rows with fewer keys keep the key width of full rows.
              grow={row.length === cols}
              key={k}
              k={k}
              onKey={onKey}
              label={LABEL[k] ?? k}
              {...(k === 'frac' && { icon: <FracIcon /> })}
              // Structure keys stand out (DESIGN.md §3).
              emphasis={k === 'frac' || k === 'pow'}
              a11y={t(`lines.key.${k}`, { defaultValue: k })}
              testID={`${testID}-key-${k}`}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function KeyButton<K>({
  k,
  onKey,
  label,
  a11y,
  testID,
  wide = false,
  grow = true,
  disabled = false,
  small = false,
  weight = 1,
  tool = false,
  emphasis = false,
  icon,
}: {
  k: K;
  onKey: (k: K) => void;
  label: string;
  a11y: string;
  testID: string;
  wide?: boolean;
  /** Share the row's width (false: keep a full row's key width). */
  grow?: boolean;
  disabled?: boolean;
  /** A text label (smaller type). */
  small?: boolean;
  /** Share of the row (flex). */
  weight?: number;
  /** Arrow / tool keys: a light pen tint, apart from the symbol keys. */
  tool?: boolean;
  /** A structure key (fraction, power): pen border. */
  emphasis?: boolean;
  /** A drawn glyph instead of the text label (the label stays for tests / a11y). */
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => onKey(k)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.key,
        weight !== 1 && { flex: weight },
        !grow && styles.fixed,
        wide && styles.wide,
        tool && styles.tool,
        emphasis && styles.emphasis,
        pressed && styles.pressed,
        disabled && styles.keyDisabled,
      ]}
    >
      {icon ?? (
        <Text
          style={[
            styles.keyText,
            small && styles.keySmall,
            typeof k === 'string' && LETTER.test(k) && styles.keyLetter,
            disabled && styles.keyTextDisabled,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** The fraction key: a box over a bar over a box (from the mockups). */
function FracIcon() {
  return (
    <View style={styles.fracIcon} accessible={false}>
      <View style={styles.fracBox} />
      <View style={styles.fracBar} />
      <View style={styles.fracBox} />
    </View>
  );
}

export const KEY_LABEL = LABEL;

/** Gap between keys (2 pt: six 44 pt keys fit a 280 pt card). */
export const KEY_GAP = E.keyGap;

const styles = StyleSheet.create({
  // The line being written: 2 pt pen border (DESIGN.md §3).
  // The border sits outside the scroll: a scrolled line keeps an inner margin
  // (it never runs under the border).
  line: {
    minHeight: E.minHeight,
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.card,
    paddingHorizontal: theme.space.sm,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lineContent: {
    alignItems: 'center',
    paddingHorizontal: theme.space.xxs,
    paddingVertical: theme.space.xs,
    direction: 'ltr',
  },
  lineRow: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
  slot: { flexDirection: 'row', alignItems: 'flex-end', direction: 'ltr' },
  empty: {
    borderWidth: theme.border.thin,
    borderStyle: 'dashed',
    borderColor: E.color.slot,
    borderRadius: theme.radius.xs,
  },
  activeSlot: {
    backgroundColor: E.color.activeSlotBackground,
    borderRadius: theme.radius.xs,
  },
  activeEmpty: { borderColor: E.color.activeSlot },
  faulty: {
    backgroundColor: E.color.faultySlot,
    borderRadius: theme.radius.xs,
  },
  cursor: { width: E.cursorWidth, backgroundColor: E.color.cursor },
  sym: {
    color: theme.color.textPrimary,
    fontFamily: theme.font.family.math.family,
    writingDirection: 'ltr',
  },
  letter: { fontStyle: theme.font.style.italic },
  operator: { marginHorizontal: E.operatorSpace },
  selection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: E.color.selection,
    borderRadius: theme.radius.xs,
  },
  flash: {
    borderWidth: theme.border.medium,
    borderColor: E.color.activeSlot,
    backgroundColor: E.color.activeSlotBackground,
    borderRadius: theme.radius.xs,
  },
  frac: { alignItems: 'center', marginHorizontal: theme.space.xxxs },
  bar: {
    alignSelf: 'stretch',
    height: E.barHeight,
    backgroundColor: theme.color.textPrimary,
  },
  group: { flexDirection: 'row', alignItems: 'center' },
  keys: { gap: E.keyGap, direction: 'ltr' },
  row: { flexDirection: 'row', gap: E.keyGap },
  // Cahier keys: card fill, 1.5 border, radius 12.
  key: {
    flex: 1,
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixed: { flex: 0, width: theme.size.touch },
  wide: { flex: 0, paddingHorizontal: theme.space.md },
  tool: { backgroundColor: E.color.toolKey },
  emphasis: { borderColor: theme.color.pen },
  pressed: { backgroundColor: theme.color.highlighterSoft },
  // Solid colours, not opacity: the label stays readable (4.59:1 on white).
  keyDisabled: {
    backgroundColor: theme.color.card,
    borderColor: theme.color.border,
  },
  keyTextDisabled: { color: theme.color.inkDisabled },
  keyText: { fontSize: theme.font.size.title, color: theme.color.ink },
  fracIcon: { alignItems: 'center', gap: E.fracIcon.gap },
  fracBox: {
    width: E.fracIcon.boxWidth,
    height: E.fracIcon.boxHeight,
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    borderRadius: theme.radius.xs,
  },
  fracBar: {
    width: E.fracIcon.barWidth,
    height: theme.border.line,
    backgroundColor: theme.color.ink,
  },
  keyLetter: {
    fontFamily: theme.font.family.math.family,
    fontStyle: theme.font.style.italic,
  },
  keySmall: { fontSize: theme.font.size.callout },
});
