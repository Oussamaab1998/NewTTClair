import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { theme } from '../../theme';

/** Nearest grid value min + k·step inside [min, max] (no float drift). */
export function snap(v: number, min: number, max: number, step: number) {
  const k = Math.round((Math.min(max, Math.max(min, v)) - min) / step);
  return Number((min + k * step).toFixed(10));
}

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  /** Each grid value crossed while dragging (local state only). */
  onChange: (v: number) => void;
  /** Drag released or accessibility step: the value to log. */
  onCommit: (v: number) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

const S = theme.slider;

/**
 * Horizontal slider on PanResponder: the gesture keeps priority over the
 * feed's scroll; values snap to `step`. Adjustable for screen readers.
 */
export function Slider(p: Props) {
  const [width, setWidth] = useState(0);
  const live = useRef(p);
  live.current = p;
  const start = useRef(0);
  const last = useRef(p.value);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.disabled,
        onMoveShouldSetPanResponder: () => !live.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: e => {
          start.current = e.nativeEvent.locationX;
          move(start.current);
        },
        onPanResponderMove: (_, g) => move(start.current + g.dx),
        onPanResponderRelease: () => live.current.onCommit(last.current),
        onPanResponderTerminate: () => live.current.onCommit(last.current),
      }),
    // `move` reads refs only.
    [],
  );

  const widthRef = useRef(0);
  widthRef.current = width;
  function move(px: number) {
    const { min, max, step, onChange } = live.current;
    const w = widthRef.current;
    if (w <= 0) {
      return;
    }
    const v = snap(min + (px / w) * (max - min), min, max, step);
    if (v !== last.current) {
      last.current = v;
      onChange(v);
    }
  }

  const stepBy = (dir: 1 | -1) => {
    const { min, max, step, value, disabled } = p;
    if (disabled) {
      return;
    }
    const v = snap(value + dir * step, min, max, step);
    last.current = v;
    p.onChange(v);
    p.onCommit(v);
  };

  const frac = (p.value - p.min) / (p.max - p.min);
  return (
    <View
      {...responder.panHandlers}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.box, p.disabled && styles.disabled]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={p.accessibilityLabel}
      accessibilityValue={{ min: p.min, max: p.max, now: p.value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e =>
        stepBy(e.nativeEvent.actionName === 'increment' ? 1 : -1)
      }
      testID={p.testID}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: frac * width }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: frac * width - S.thumb / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: S.touchHeight,
    justifyContent: 'center',
    direction: 'ltr',
    marginHorizontal: S.thumb / 2,
  },
  disabled: { opacity: theme.opacity.disabled },
  track: {
    height: S.trackHeight,
    borderRadius: S.trackHeight / 2,
    backgroundColor: S.color.track,
    overflow: 'hidden',
  },
  fill: { height: S.trackHeight, backgroundColor: S.color.fill },
  thumb: {
    position: 'absolute',
    width: S.thumb,
    height: S.thumb,
    borderRadius: S.thumb / 2,
    backgroundColor: S.color.thumb,
  },
});
