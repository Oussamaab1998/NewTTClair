/**
 * The third help level's line to fill (student test 2026-11-18, mockup 2c):
 * the step's lead (p(A ∩ F) =), then his line with empty slots in place of
 * the values (`{}*{}={}` reads «▢ × ▢ = ▢»), the values he can drop in as
 * chips, and «✓ نثبّت». He picks a slot (the first empty one is picked),
 * then a chip, or types in the slot. The line goes to the board as if he
 * had typed it: the engine judges it, the fill gives no answer of its own.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { z } from 'zod';
import type { FillSchema } from '../../../../content/help/schema';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { lineLatex } from '../../../../method/lineChain';
import { theme } from '../../../../theme';

type Fill = z.infer<typeof FillSchema>;

/** The template cut at its slots: text pieces between them. */
export function fillPieces(template: string): string[] {
  return template.split('{}');
}

/** His line: the template with each slot's value (an empty slot stays empty). */
export function filledLine(
  template: string,
  values: readonly string[],
): string {
  let i = 0;
  return template.replace(/\{\}/g, () => values[i++]?.trim() ?? '');
}

/** How a piece between slots reads (× and ÷ for * and /). */
/**
 * How a piece between slots reads: × and ÷ for * and /, an exponent in
 * brackets raised whole, the rest as typed (a lone operator or an open
 * bracket is not a line lineLatex can draw).
 */
export const pieceLatex = (piece: string): string =>
  piece
    .trim()
    // An exponent in brackets is raised whole: e^(2x) reads e^{2x}.
    .replace(/\^\(([^()]*)\)/g, '^{$1}')
    .replace(/\*/g, ' \\times ')
    .replace(/\//g, ' \\div ')
    .replace(/\s+/g, ' ')
    .trim();

export function FillLine({
  fill,
  disabled,
  busy,
  onLine,
}: {
  fill: Fill;
  disabled: boolean;
  /** His filled line is the act being answered: «نثبّت» spins. */
  busy: boolean;
  onLine: (raw: string) => void;
}) {
  const { t } = useTranslation();
  const pieces = useMemo(() => fillPieces(fill.template), [fill.template]);
  const slots = pieces.length - 1;
  const [values, setValues] = useState<string[]>(() =>
    Array.from({ length: slots }, () => ''),
  );
  const [picked, setPicked] = useState(0);
  const full = values.every(v => v.trim() !== '');
  const put = (i: number, v: string) => {
    const next = values.map((x, j) => (j === i ? v : x));
    setValues(next);
    // The next empty slot is picked after a chip (typing stays in its slot).
    const empty = next.findIndex(x => x.trim() === '');
    if (empty >= 0) {
      setPicked(empty);
    }
  };
  return (
    <View style={styles.wrap} testID="ladder-fill">
      <Text style={styles.title}>{t('hybrid.ladder.fill')}</Text>
      <View style={styles.line}>
        {fill.lead !== undefined && (
          <MathBlock latex={fill.lead} fontSize={theme.font.size.reading} />
        )}
        {pieces.map((piece, i) => (
          <React.Fragment key={i}>
            {pieceLatex(piece) !== '' && (
              <MathBlock
                latex={pieceLatex(piece)}
                fontSize={theme.font.size.reading}
              />
            )}
            {i < slots && (
              <TextInput
                style={[styles.slot, i === picked && styles.slotOn]}
                value={values[i]}
                editable={!disabled}
                onFocus={() => setPicked(i)}
                onChangeText={v => {
                  setValues(values.map((x, j) => (j === i ? v : x)));
                }}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel={t('hybrid.ladder.slot', { n: i + 1 })}
                testID={`ladder-slot-${i}`}
              />
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.chips}>
        {fill.chips.map(c => (
          <Pressable
            key={c}
            style={[styles.chip, disabled && styles.off]}
            accessibilityRole="button"
            accessibilityLabel={c}
            disabled={disabled}
            testID={`ladder-chip-${c}`}
            onPress={() => put(picked, c)}
          >
            <MathBlock latex={lineLatex(c)} fontSize={theme.font.size.body} />
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[styles.confirm, (!full || disabled) && styles.off]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !full || disabled, busy }}
        disabled={!full || disabled}
        testID="ladder-fill-confirm"
        onPress={() => onLine(filledLine(fill.template, values))}
      >
        <View style={styles.busyRow}>
          {busy && (
            <ActivityIndicator size="small" color={theme.color.textOnAccent} />
          )}
          <Text style={styles.confirmText}>{t('hybrid.ladder.confirm')}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.md },
  title: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  // A line of maths: always left to right.
  line: {
    direction: 'ltr',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  slot: {
    minWidth: theme.size.fillSlotWidth,
    height: theme.size.fillSlotHeight,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.active,
    borderColor: theme.color.borderControl,
    borderStyle: 'dashed',
    backgroundColor: theme.color.card,
    textAlign: 'center',
    fontSize: theme.font.size.reading,
    color: theme.color.textPrimary,
    paddingHorizontal: theme.space.sm,
  },
  slotOn: {
    borderStyle: 'solid',
    borderColor: theme.color.pen,
    backgroundColor: theme.color.deepDive.bg,
  },
  chips: {
    direction: 'ltr',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  chip: {
    minHeight: theme.size.touch,
    minWidth: theme.size.fillSlotWidth,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
  },
  confirm: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { ...theme.font.body, color: theme.color.textOnAccent },
  busyRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  off: { opacity: theme.opacity.disabled },
});
