import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';

export interface GridPoint {
  /** x label (a number, or −∞ / +∞). */
  x: string;
  /** Under the point in the f' row ("0" at a critical point). */
  fprime?: string;
  /** Under the point in the f row (a value or a limit). */
  value?: string;
  /** A control under the point in the f row (task: extremum), above the value. */
  valueNode?: React.ReactNode;
}

/**
 * Tableau de variation layout: rows x / f'(x) / f, point columns between
 * interval columns. Cells are given by the caller (static text or controls).
 */
export function VariationGrid({
  points,
  intervals,
  testID,
}: {
  points: readonly GridPoint[];
  intervals: readonly { sign: React.ReactNode; arrow: React.ReactNode }[];
  testID?: string;
}) {
  const row = (
    head: string,
    point: (p: GridPoint, i: number) => React.ReactNode,
    cell: (i: number) => React.ReactNode,
  ) => (
    <View style={styles.row}>
      <View style={styles.head}>
        <MathBlock latex={head} fontSize={theme.font.size.callout} />
      </View>
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <View style={styles.point}>{point(p, i)}</View>
          {i < intervals.length && (
            <View style={styles.interval}>{cell(i)}</View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
  const text = (s: string | undefined, id: string) =>
    s === undefined ? null : (
      <Text style={styles.text} testID={id}>
        {s}
      </Text>
    );
  return (
    <View style={styles.grid} testID={testID}>
      {row(
        'x',
        (p, i) => text(p.x, `grid-x-${i}`),
        () => null,
      )}
      {row(
        "f'(x)",
        (p, i) => text(p.fprime, `grid-fprime-${i}`),
        i => intervals[i]!.sign,
      )}
      {row(
        'f',
        (p, i) => (
          <>
            {p.valueNode}
            {text(p.value, `grid-value-${i}`)}
          </>
        ),
        i => intervals[i]!.arrow,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    borderWidth: theme.border.line,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.md,
    direction: 'ltr',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.size.touch,
    borderBottomWidth: theme.border.line,
    borderColor: theme.color.borderDefault,
  },
  head: {
    width: theme.size.touch,
    alignItems: 'center',
    borderRightWidth: theme.border.line,
    borderColor: theme.color.borderDefault,
  },
  point: { minWidth: theme.size.touch, alignItems: 'center' },
  interval: { flex: 1, alignItems: 'center' },
  text: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.callout,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
