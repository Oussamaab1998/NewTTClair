import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { theme, type PaperStyle } from '../../theme';

interface Size {
  width: number;
  height: number;
}

/**
 * The lines for one size: 1 pt rects on multiples of the step from the top /
 * start edge, as in the mockups (pixel-aligned at 2× and 3×).
 */
export function paperLines(style: PaperStyle, { width, height }: Size) {
  const line = theme.layout.gridLine;
  const step = style === 'grid' ? theme.layout.grid : theme.layout.ruled;
  const rows = Array.from(
    { length: Math.floor(height / step) + 1 },
    (_, i) => ({
      x: 0,
      y: i * step,
      width,
      height: line,
    }),
  );
  const columns =
    style === 'grid'
      ? Array.from({ length: Math.floor(width / step) + 1 }, (_, i) => ({
          x: i * step,
          y: 0,
          width: line,
          height,
        }))
      : [];
  return [...rows, ...columns];
}

/**
 * The paper behind a screen (DESIGN.md §6): flat, grid or ruled. Fixed (it
 * does not scroll), drawn once per size, never re-rendered by feed updates
 * (memo on a string prop). Cards stay solid white over it.
 */
export const PaperBackground = React.memo(function PaperBackgroundImpl({
  style,
}: {
  style: PaperStyle;
}) {
  const [size, setSize] = useState<Size | null>(null);
  if (style === 'flat') {
    return null;
  }
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setSize(s =>
          s && s.width === width && s.height === height ? s : { width, height },
        );
      }}
      testID="paper-bg"
    >
      {size && (
        <Svg width={size.width} height={size.height}>
          {paperLines(style, size).map((r, i) => (
            <Rect key={i} {...r} fill={theme.color.gridLine} />
          ))}
        </Svg>
      )}
    </View>
  );
});
