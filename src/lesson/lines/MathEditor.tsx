import React, { useRef, useState } from 'react';
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
import { MATH_FONT } from '../math/NativeMath';
import { theme } from '../../theme';

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
  const flashAt =
    flash && samePath(flash.path, path) ? flash.index : undefined;
  const caret = (key: string) => (
    <View
      key={key}
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
  // Typing past the width keeps the end of the line (the cursor) in view.
  const scroll = useRef<ScrollViewInstance>(null);
  const ctx: ViewCtx = {
    cursor: state.cursor,
    ...(mark && { mark }),
    ...(state.sel && { sel: state.sel }),
    ...(showFlash && state.flash && { flash: state.flash }),
    ...(onKey && {
      onTap: (path: PathStep[], at?: number) =>
        onKey(at === undefined ? { focus: path } : { focus: path, at }),
    }),
  };
  return (
    <ScrollView
      ref={scroll}
      horizontal
      onContentSizeChange={() =>
        scroll.current?.scrollToEnd({ animated: false })
      }
      style={styles.line}
      contentContainerStyle={styles.lineContent}
      testID={testID}
    >
      <Slot nodes={state.root} path={[]} depth={0} ctx={ctx} />
    </ScrollView>
  );
}

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
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.keyText,
          small && styles.keySmall,
          typeof k === 'string' && LETTER.test(k) && styles.keyLetter,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const KEY_LABEL = LABEL;

/** Gap between keys (2 pt: six 44 pt keys fit a 280 pt card). */
export const KEY_GAP = E.keyGap;

const styles = StyleSheet.create({
  line: {
    minHeight: E.minHeight,
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceCard,
  },
  lineContent: {
    alignItems: 'center',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    direction: 'ltr',
  },
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
    fontFamily: MATH_FONT,
    writingDirection: 'ltr',
  },
  letter: { fontStyle: 'italic' },
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
  key: {
    flex: 1,
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceKey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixed: { flex: 0, width: theme.size.touch },
  wide: { flex: 0, paddingHorizontal: theme.space.md },
  pressed: { backgroundColor: theme.color.surfaceKeyPressed },
  disabled: { opacity: theme.opacity.disabled },
  keyText: { fontSize: theme.font.size.title, color: theme.color.textPrimary },
  keyLetter: { fontFamily: MATH_FONT, fontStyle: 'italic' },
  keySmall: { fontSize: theme.font.size.callout },
});
