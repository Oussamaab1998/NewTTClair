import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MathBlock } from '../../lesson/math/MathBlock';
import { styles as ui } from '../probability/ui';
import { readoutNumber } from './plot';
import { theme } from '../../theme';

/** "= 22026,466" (or "≈ ...") after a static formula. */
const valueText = (v: number, approx: boolean, decimal: boolean) =>
  `${approx ? '≈' : '='} ${readoutNumber(v, { fractions: !decimal })}`;

/**
 * A static formula (rendered once) followed by a live LTR value: labels are
 * math, so no Latin words sit inside Arabic text.
 */
export function MathReadout({
  latex,
  value,
  approx = false,
  decimal = false,
  stack = false,
  small = false,
  testID,
}: {
  latex: string;
  value: number;
  approx?: boolean;
  /** Slider positions (x, h): decimals, never 3/2. */
  decimal?: boolean;
  /** Formula above the value, smaller (collapsed readout column). */
  stack?: boolean;
  /** Smaller row (collapsed readout column). */
  small?: boolean;
  testID: string;
}) {
  return (
    <View style={stack ? styles.stack : styles.row}>
      <MathBlock
        latex={latex}
        fontSize={stack || small ? theme.font.size.small : theme.font.size.body}
      />
      <Text style={[ui.ltr, (stack || small) && styles.small]} testID={testID}>
        {valueText(value, approx, decimal)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    direction: 'ltr',
    flexWrap: 'wrap',
  },
  stack: { direction: 'ltr', alignItems: 'flex-start' },
  small: { fontSize: theme.font.size.small },
});
