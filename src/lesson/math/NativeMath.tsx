import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { MathNode } from './latexSubset';

export const MATH_FONT = Platform.select({ ios: 'Times New Roman', default: 'serif' });
// Typesetting rules, not theme values: script/inner scales (0.7, 0.9), line
// ratio 1.25, script offsets 0.45, operator scale 1.2 and the small glyph
// spacings in `styles` below. They keep formulas proportional at any size, so
// they stay here (the theme guard allows this file by name).
const SCRIPT_SCALE = 0.7;
const MIN_SIZE = 11;
const SQRT = '√';

interface NodeProps {
  node: MathNode;
  size: number;
  color: string;
}

/** Renders a parsed MathNode tree with plain Views/Text (no WebView). */
export function MathNodeView({ node, size, color }: NodeProps) {
  const small = Math.max(MIN_SIZE, size * SCRIPT_SCALE);
  switch (node.t) {
    case 'text':
      return (
        <Text
          style={[
            styles.text,
            { fontSize: size, lineHeight: size * 1.25, color },
            node.italic && styles.italic,
          ]}
        >
          {node.v}
        </Text>
      );
    case 'row':
      return (
        <View style={styles.row}>
          {node.children.map((child, i) => (
            <MathNodeView key={i} node={child} size={size} color={color} />
          ))}
        </View>
      );
    case 'frac': {
      const inner = Math.max(MIN_SIZE, size * 0.9);
      return (
        <View style={styles.frac}>
          <MathNodeView node={node.num} size={inner} color={color} />
          <View
            style={[
              styles.fracRule,
              { backgroundColor: color, height: Math.max(1, size / 18) },
            ]}
          />
          <MathNodeView node={node.den} size={inner} color={color} />
        </View>
      );
    }
    case 'binom':
      return (
        <Fenced open="(" close=")" size={size} color={color}>
          <View style={styles.frac}>
            <MathNodeView node={node.n} size={size * 0.9} color={color} />
            <MathNodeView node={node.k} size={size * 0.9} color={color} />
          </View>
        </Fenced>
      );
    case 'fenced':
      return (
        <Fenced open={node.open} close={node.close} size={size} color={color}>
          <MathNodeView node={node.body} size={size} color={color} />
        </Fenced>
      );
    case 'sqrt':
      return (
        <View style={styles.row}>
          <Text style={[styles.text, { fontSize: size * 1.2, color }]}>
            {SQRT}
          </Text>
          <View style={[styles.overline, { borderTopColor: color }]}>
            <MathNodeView node={node.body} size={size} color={color} />
          </View>
        </View>
      );
    case 'overline':
      return (
        <View style={[styles.overline, { borderTopColor: color }]}>
          <MathNodeView node={node.body} size={size} color={color} />
        </View>
      );
    case 'scripts': {
      // Lift a lone superscript / drop a lone subscript relative to the base.
      const supOffset = { marginBottom: node.sub ? 0 : size * 0.45 };
      const subOffset = { marginTop: node.sup ? 0 : size * 0.45 };
      return (
        <View style={styles.row}>
          <MathNodeView node={node.base} size={size} color={color} />
          <View style={styles.scriptColumn}>
            {node.sup ? (
              <View style={supOffset}>
                <MathNodeView node={node.sup} size={small} color={color} />
              </View>
            ) : null}
            {node.sub ? (
              <View style={subOffset}>
                <MathNodeView node={node.sub} size={small} color={color} />
              </View>
            ) : null}
          </View>
        </View>
      );
    }
    case 'limits':
      return (
        <View style={styles.limits}>
          {node.over ? (
            <MathNodeView node={node.over} size={small} color={color} />
          ) : null}
          <MathNodeView node={node.base} size={size} color={color} />
          {node.under ? (
            <MathNodeView node={node.under} size={small} color={color} />
          ) : null}
        </View>
      );
  }
}

/** Delimiters that grow with their content (measured once via onLayout). */
function Fenced({
  open,
  close,
  size,
  color,
  children,
}: {
  open: string;
  close: string;
  size: number;
  color: string;
  children: React.ReactNode;
}) {
  const [height, setHeight] = useState(size * 1.25);
  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (Math.abs(h - height) > 1) {
      setHeight(h);
    }
  };
  const scaleY = Math.max(1, height / (size * 1.25));
  const delimStyle = [
    styles.text,
    { fontSize: size, lineHeight: size * 1.25, color, transform: [{ scaleY }] },
  ];
  return (
    <View style={styles.row}>
      {open ? <Text style={delimStyle}>{open}</Text> : null}
      <View onLayout={onLayout}>{children}</View>
      {close ? <Text style={delimStyle}>{close}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: MATH_FONT,
    writingDirection: 'ltr',
    includeFontPadding: false,
  },
  italic: { fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
  frac: { alignItems: 'center', marginHorizontal: 3 },
  fracRule: { alignSelf: 'stretch', marginVertical: 2 },
  overline: { borderTopWidth: 1, paddingTop: 1 },
  scriptColumn: { justifyContent: 'center', marginLeft: 1 },
  limits: { alignItems: 'center', marginHorizontal: 2 },
});
