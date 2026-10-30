/**
 * A calculator pad for written lines like `10×9×8÷(3×2×1) = 120`
 * (D37, docs/METHOD_LESSON_PLAN.md section 3): digits, comma, + − × ÷,
 * parentheses and "=". No letter keys, no C(n,k) key. One submit; the role of
 * a line is inferred by the engine, never chosen (addendum A1). When a "÷" is
 * followed by a bare product (`990÷3×2×1`) the app states both readings and
 * the student chooses (readback R-B); nothing is rewritten silently.
 */
import React, {
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ComponentHandle } from '../../../components/contract';
import { readback, type Readback } from '../../../method/factorForm';
import { evalChain } from '../../../method/lineChain';
import { theme } from '../../../theme';
import { PadOpenContext } from './padOpen';

const BACKSPACE = '⌫';
const CHECK_MARK = '✓';
const CLEAR = 'C';
const COLLAPSE = '▾';
const EXPAND = '▴';
const MAX_LENGTH = 120;
/** Rows are LTR like a calculator, whatever the UI language. */
const ROWS = [
  ['7', '8', '9', '(', ')'],
  ['4', '5', '6', '×', '÷'],
  ['1', '2', '3', '+', '−'],
  ['0', ',', '=', CLEAR],
] as const;

interface Props {
  readonly: boolean;
  initialRaw?: string;
  /** A line, and the reading he chose when it was ambiguous. */
  onSubmit: (
    raw: string,
    readback?: 'grouped' | 'literal',
    keys?: string[],
  ) => void;
  testID?: string;
  ref?: Ref<ComponentHandle>;
}

const mathOf = (rb: Readback) => ({
  grouped: `÷ (${rb.divisor.join(' × ')})`,
  literal: `÷ ${rb.divisor[0]},  ${rb.divisor
    .slice(1)
    .map(x => `× ${x}`)
    .join(' ')}`,
});

export function LineInput({
  readonly,
  initialRaw = '',
  onSubmit,
  testID = 'line-input',
  ref,
}: Props) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState(initialRaw);
  const [collapsed, setCollapsed] = useState(false);
  const reportOpen = useContext(PadOpenContext);
  useEffect(() => {
    reportOpen(!readonly && !collapsed);
    return () => reportOpen(false);
  }, [readonly, collapsed, reportOpen]);
  const [deciding, setDeciding] = useState<Readback | null>(null);
  const checkLabel = `${CHECK_MARK} ${t('lesson.check')}`;
  const keys = useRef<string[]>([]);
  const scroll = useRef<ScrollViewInstance>(null);

  useImperativeHandle(ref, () => ({ getStateSnapshot: () => ({ raw }) }), [
    raw,
  ]);

  const press = (key: string) => {
    keys.current.push(key);
    setDeciding(null);
    if (key === BACKSPACE) {
      setRaw(r => r.slice(0, -1));
    } else if (key === CLEAR) {
      setRaw('');
    } else {
      setRaw(r => (r.length < MAX_LENGTH ? r + key : r));
    }
  };

  const send = (line: string, choice?: 'grouped' | 'literal') => {
    onSubmit(line, choice, keys.current);
    keys.current = [];
    setRaw('');
    setDeciding(null);
  };

  const submit = () => {
    if (raw.length === 0) {
      return;
    }
    const rb = evalChain(raw).kind === 'unreadable' ? null : readback(raw);
    if (rb) {
      setDeciding(rb);
      return;
    }
    send(raw);
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
          ? t('method.line.delete')
          : k === CLEAR
          ? t('method.line.clear')
          : k
      }
      testID={`${testID}-key-${k}`}
    >
      <Text style={styles.keyText}>{k}</Text>
    </Pressable>
  );

  if (readonly) {
    return <View testID={testID} />;
  }
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setCollapsed(c => !c)}
          style={styles.fold}
          accessibilityRole="button"
          accessibilityLabel={t('method.line.keys')}
          accessibilityState={{ expanded: !collapsed }}
          testID={`${testID}-collapse`}
        >
          <Text style={styles.keyText}>{collapsed ? EXPAND : COLLAPSE}</Text>
        </Pressable>
        <View style={styles.display}>
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() =>
              scroll.current?.scrollToEnd({ animated: false })
            }
          >
            <Text style={styles.raw} testID={`${testID}-display`}>
              {raw.length > 0 ? raw : ' '}
            </Text>
          </ScrollView>
        </View>
        {key(BACKSPACE, true)}
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
      </View>
      {deciding && (
        <View style={styles.readback} testID="line-readback">
          <Text style={styles.readbackAsk}>{t('method.readback.ask')}</Text>
          {(['grouped', 'literal'] as const).map(c => (
            <Pressable
              key={c}
              onPress={() => send(c === 'grouped' ? deciding.grouped : raw, c)}
              style={styles.choice}
              accessibilityRole="button"
              testID={`line-readback-${c}`}
            >
              <Text style={styles.choiceLabel}>
                {t(`method.readback.${c}`)}
              </Text>
              <Text style={styles.choiceMath}>{mathOf(deciding)[c]}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!collapsed &&
        ROWS.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map(k => key(k))}
          </View>
        ))}
    </View>
  );
}

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
    justifyContent: 'center',
    backgroundColor: theme.color.card,
  },
  raw: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.title,
    writingDirection: 'ltr',
    color: theme.color.ink,
  },
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
  checkDisabled: { backgroundColor: theme.color.inkDisabled },
  checkText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.body,
    fontFamily: theme.font.family.ui.bold,
  },
  readback: {
    gap: theme.space.xs,
    padding: theme.space.sm,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.highlighterSoft,
  },
  readbackAsk: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  choice: {
    minHeight: theme.size.touch,
    padding: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    gap: theme.space.xs,
  },
  choiceLabel: {
    fontSize: theme.font.size.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  choiceMath: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
});
