import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme';

export interface SliceItem {
  key: string;
  /** Short LTR text above the count (the number of balls with the property, a stage number). */
  label: string;
  count: number;
}

/** Marks the selected slice next to its colour: shape and text, never colour alone. */
const MARK = '●';
/** A slice an overlay lights (the complement of an event): a hollow mark and a dashed edge. */
const MARKED = '○';

/**
 * A bar cut in slices whose widths follow their counts (20, 60, 36, 4 boxes of
 * 120; 3 + 6). Shared by GroupBoxes (slices of boxes) and ChoiceProduct (the
 * sum picture); EventAreaModel will use it too. A slice is at least a touch
 * target wide, so a slice of 4 out of 120 is still tappable. Without
 * `onSelect` it is a picture only.
 */
export function SliceBar({
  slices,
  selectedKey,
  selectedKeys,
  markedKeys,
  valueText,
  onSelect,
  a11yLabel,
  testIDPrefix = 'slice',
}: {
  slices: readonly SliceItem[];
  selectedKey?: string | null;
  /** Several slices lit at once (the slices of an event). */
  selectedKeys?: ReadonlySet<string>;
  /** Slices an overlay marks (dashed edge, hollow mark). */
  markedKeys?: ReadonlySet<string>;
  /** What the number line shows instead of the count (a probability). */
  valueText?: (s: SliceItem) => string;
  onSelect?: (key: string) => void;
  a11yLabel: (s: SliceItem) => string;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.bar}>
      {slices.map(s => {
        // An overlay's mark wins over the event's light: the complement of A must show ALL its slices
        // dashed, including one that is also the event B.
        const marked = markedKeys?.has(s.key) === true;
        const on = !marked && (s.key === selectedKey || selectedKeys?.has(s.key) === true);
        const body = (
          <>
            <Text style={styles.label}>
              {on ? `${MARK} ` : marked ? `${MARKED} ` : ''}
              {s.label}
            </Text>
            <Text style={styles.count}>{valueText ? valueText(s) : s.count}</Text>
          </>
        );
        const style = [
          styles.slice,
          { flexGrow: Math.max(s.count, 1) },
          s.count === 0 && styles.empty,
          marked && styles.marked,
          on && styles.on,
        ];
        return onSelect ? (
          <Pressable
            key={s.key}
            onPress={() => onSelect(s.key)}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel(s)}
            accessibilityState={{ selected: on }}
            testID={`${testIDPrefix}-${s.key}`}
            style={style}
          >
            {body}
          </Pressable>
        ) : (
          <View
            key={s.key}
            accessible
            accessibilityRole="image"
            accessibilityLabel={a11yLabel(s)}
            testID={`${testIDPrefix}-${s.key}`}
            style={style}
          >
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: theme.mathSide.row,
    gap: theme.space.xxs,
  },
  slice: {
    flexBasis: 0,
    minWidth: theme.pv2.sliceMinWidth,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceMuted,
    paddingVertical: theme.space.xxs,
  },
  empty: { borderStyle: 'dashed', backgroundColor: theme.color.card },
  on: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  marked: {
    borderStyle: 'dashed',
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.card,
  },
  label: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  count: {
    fontFamily: theme.font.family.math.family,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
