import React, {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ComponentHandle } from '../../components/contract';
import type { KeypadKind } from '../../content/schema';
import { MathBlock } from '../math/MathBlock';
import { theme } from '../../theme';

const BACKSPACE = '⌫';
const CHECK_MARK = '✓';
const CLEAR = 'C';
const COLLAPSE = '▾';
const EXPAND = '▴';
const MAX_LENGTH = 20;
/** Rows are LTR like a calculator, whatever the UI language. */
const DIGIT_ROWS = [
  ['1', '2', '3', '4', '5'],
  ['6', '7', '8', '9', '0'],
] as const;
/** Extra keys per kind (integer: digits only). */
const EXTRA: Record<KeypadKind, readonly string[]> = {
  integer: [],
  signed: ['-', CLEAR],
  probability: ['/', ',', CLEAR],
};

/** Pretty preview for simple numbers and fractions ("3/10" -> 3 over 10), else none. */
export function previewLatex(raw: string): string | null {
  const m = /^(-?)(\d+(?:[.,]\d+)?)(?:\/(\d+))?$/.exec(raw);
  if (!m) {
    return null;
  }
  const [, sign, num, den] = m;
  const n = num!.replace('.', '{,}').replace(',', '{,}');
  return den ? `${sign}\\frac{${n}}{${den}}` : `${sign}${n}`;
}

interface NumericKeypadProps {
  readonly: boolean;
  /** Which keys: integer (counts), signed, probability (fractions, comma). */
  kind?: KeypadKind;
  /** Shown in readonly mode (what was typed). */
  value?: string;
  /** Text already typed (restored after a deep dive). */
  initialRaw?: string;
  /** Raw input and the key trace (logged with the answer). */
  onSubmit: (raw: string, keys: string[]) => void;
  /** Measured height (perf/UX checks on a device). */
  onHeight?: (height: number) => void;
  testID?: string;
  ref?: Ref<ComponentHandle>;
}

/**
 * Fractions / decimals for probability (COMPONENTS_LESSON_UI.md §3). Lives
 * inside the feed. Compact: check and backspace sit in the display row, and
 * ▾ folds the keys so the question and the picture stay visible. Equivalent
 * forms (1/10 = 0,1) are accepted by the engine check, not here.
 */
export function NumericKeypad({
  readonly,
  kind = 'probability',
  value,
  initialRaw = '',
  onSubmit,
  onHeight,
  testID = 'keypad',
  ref,
}: NumericKeypadProps) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState(initialRaw);
  const [collapsed, setCollapsed] = useState(false);
  const keys = useRef<string[]>([]);
  const shown = readonly ? value ?? '' : raw;
  const preview = useMemo(() => previewLatex(shown), [shown]);
  const checkLabel = `${CHECK_MARK} ${t('lesson.check')}`;

  useImperativeHandle(ref, () => ({ getStateSnapshot: () => ({ raw }) }), [
    raw,
  ]);

  const press = (key: string) => {
    keys.current.push(key);
    if (key === BACKSPACE) {
      setRaw(r => r.slice(0, -1));
    } else if (key === CLEAR) {
      setRaw('');
    } else {
      setRaw(r => (r.length < MAX_LENGTH ? r + key : r));
    }
  };

  const submit = () => {
    if (raw.length === 0) {
      return;
    }
    onSubmit(raw, keys.current);
    keys.current = [];
    setRaw('');
  };

  const key = (k: string, inline = false) => (
    <Pressable
      key={k}
      onPress={() => press(k)}
      style={({ pressed }) => [
        styles.key,
        inline && styles.inline,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        k === BACKSPACE
          ? t('lesson.backspace')
          : k === CLEAR
          ? t('lesson.clear')
          : k
      }
      testID={`${testID}-key-${k}`}
    >
      <Text style={styles.keyText}>{k}</Text>
    </Pressable>
  );

  return (
    <View
      style={styles.wrap}
      testID={testID}
      onLayout={
        onHeight &&
        ((e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height))
      }
    >
      <View style={styles.row}>
        {!readonly && (
          <Pressable
            onPress={() => setCollapsed(c => !c)}
            style={styles.fold}
            accessibilityRole="button"
            accessibilityLabel={t(
              collapsed ? 'lesson.showKeys' : 'lesson.hideKeys',
            )}
            accessibilityState={{ expanded: !collapsed }}
            testID={`${testID}-collapse`}
          >
            <Text style={styles.keyText}>{collapsed ? EXPAND : COLLAPSE}</Text>
          </Pressable>
        )}
        <View style={styles.display}>
          <Text style={styles.raw} testID={`${testID}-display`}>
            {shown.length > 0 ? shown : ' '}
          </Text>
          {preview && preview !== shown && (
            <View style={styles.preview}>
              <MathBlock latex={preview} fontSize={theme.font.size.body} />
            </View>
          )}
        </View>
        {!readonly && key(BACKSPACE, true)}
        {!readonly && (
          <Pressable
            onPress={submit}
            disabled={raw.length === 0}
            style={[styles.check, raw.length === 0 && styles.checkDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: raw.length === 0 }}
            testID={`${testID}-check`}
          >
            <Text style={styles.checkText}>{checkLabel}</Text>
          </Pressable>
        )}
      </View>
      {!readonly && !collapsed && (
        <>
          {DIGIT_ROWS.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map(k => key(k))}
            </View>
          ))}
          {EXTRA[kind].length > 0 && (
            <View style={styles.row}>{EXTRA[kind].map(k => key(k))}</View>
          )}
        </>
      )}
    </View>
  );
}

// Same key style as the line editor (DESIGN.md §3): card keys, radius 12,
// the field with a 2 pt pen border, «نثبّت» filled ink.
const styles = StyleSheet.create({
  wrap: { marginTop: theme.space.sm, gap: theme.space.xs, direction: 'ltr' },
  row: { flexDirection: 'row', gap: theme.space.xs },
  display: {
    flex: 1,
    minHeight: theme.size.touch,
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.color.card,
  },
  raw: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.title,
    writingDirection: 'ltr',
    color: theme.color.ink,
  },
  preview: { minWidth: theme.size.keypadPreviewMinWidth },
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
  inline: { flex: 0, width: theme.size.touch },
  fold: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.editor.color.toolKey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: theme.color.highlighterSoft },
  keyText: { fontSize: theme.font.size.title, color: theme.color.ink },
  check: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A solid fill, not opacity: the label stays readable (DESIGN.md §2).
  checkDisabled: { backgroundColor: theme.color.inkDisabled },
  checkText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.body,
    fontFamily: theme.font.family.ui.bold,
  },
});
