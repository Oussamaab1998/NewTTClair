import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme';
import type { Item } from './logic';

export type DotSize = 'dot' | 'ordering';

/**
 * A ball, as in the urn: coloured balls keep their letter (R1, N2) on a fill
 * that is secondary to it; items without a colour are a bordered circle.
 */
export function BallDot({ item, size = 'dot' }: { item: Item; size?: DotSize }) {
  const tone = item.color && theme.color.ball[item.color];
  const d = size === 'dot' ? theme.pv2.dot : theme.pv2.orderingDot;
  return (
    <View
      style={[
        styles.dot,
        { width: d, height: d, borderRadius: theme.radius.pill },
        tone && { backgroundColor: tone.fill, borderColor: tone.fill },
      ]}
    >
      <Text
        style={[
          size === 'dot' ? styles.label : styles.labelSmall,
          tone && { color: tone.text },
        ]}
      >
        {item.label}
      </Text>
    </View>
  );
}

/** Items side by side, in reading order of the math (left to right). */
export function Dots({ items, size = 'dot' }: { items: readonly Item[]; size?: DotSize }) {
  return (
    <View style={styles.dots}>
      {items.map(it => (
        <BallDot key={it.id} item={it} size={size} />
      ))}
    </View>
  );
}

/** A label that is not a ball (starters, mains): a bordered word. */
export const styles = StyleSheet.create({
  dots: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xxxs,
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  label: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  labelSmall: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.micro,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
