/**
 * Debug-only layout check: does any child stick out of its row? Jest has no
 * layout engine, so the real widths are measured on the device (`onLayout`);
 * an overflow warns (LogBox) and the last measurement is kept in the app's
 * user defaults (`devLayoutCheck`) for screenshots / checks without taps.
 */
import { useCallback, useRef } from 'react';
import { Settings, type LayoutChangeEvent } from 'react-native';

export interface Box {
  x: number;
  width: number;
}

/** Children whose right or left edge passes the row (half a point of rounding allowed). */
export function overflowing(
  rowWidth: number,
  children: Record<string, Box>,
): string[] {
  return Object.entries(children)
    .filter(([, b]) => b.x < -0.5 || b.x + b.width > rowWidth + 0.5)
    .map(([id]) => id);
}

const enabled = typeof __DEV__ !== 'undefined' && __DEV__;

export function useOverflowCheck(name: string) {
  const row = useRef<number | null>(null);
  const kids = useRef<Record<string, Box>>({});
  const check = useCallback(() => {
    if (row.current === null) {
      return;
    }
    const out = overflowing(row.current, kids.current);
    if (out.length > 0) {
      console.warn(`layout: ${name} overflows its row: ${out.join(', ')}`);
    }
    try {
      Settings.set({
        devLayoutCheck: JSON.stringify({
          name,
          row: row.current,
          children: kids.current,
          overflow: out,
        }),
      });
    } catch {
      // no native Settings module (Jest)
    }
  }, [name]);
  const onRow = useCallback(
    (e: LayoutChangeEvent) => {
      row.current = e.nativeEvent.layout.width;
      check();
    },
    [check],
  );
  const onChild = useCallback(
    (id: string) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      kids.current = { ...kids.current, [id]: { x, width } };
      check();
    },
    [check],
  );
  return enabled ? { onRow, onChild } : null;
}
