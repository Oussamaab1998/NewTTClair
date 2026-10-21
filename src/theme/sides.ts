/**
 * Named sides (DESIGN.md §8). The app is laid out LTR (no forced RTL,
 * DECISIONS.md), so React Native's start/end mean left/right; Arabic reading
 * starts at the right. Wherever a side carries meaning (rails, tabs, the jump
 * button, bubble sides, header and bar order), use these roles instead of
 * left/right. LTR math and data (tables, charts, the slider) and decorative
 * corners keep physical sides. If the app ever switches to native RTL, only
 * this file changes.
 */
import type { ViewStyle } from 'react-native';

type Edge = (v: number) => ViewStyle;

/** The Arabic reading direction: starts at the right. */
export const reading = {
  /** A row whose children are listed in reading order (first = rightmost). */
  row: 'row-reverse',
  /** alignSelf / alignItems at the reading start (right) / end (left). */
  startAlign: 'flex-end',
  endAlign: 'flex-start',
  startEdge: (v => ({ right: v })) as Edge,
  endEdge: (v => ({ left: v })) as Edge,
} as const;

/** Math and exam-paper lines: always LTR, they start at the left. */
export const mathSide = {
  row: 'row',
  startEdge: (v => ({ left: v })) as Edge,
  endEdge: (v => ({ right: v })) as Edge,
} as const;
