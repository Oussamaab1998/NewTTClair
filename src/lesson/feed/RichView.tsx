import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Rich } from '../../content/schema';
import { RichText } from '../blocks/RichText';
import { MathBlock } from '../math/MathBlock';
import { toPlainText } from '../rich/runs';
import { theme } from '../../theme';

interface RichViewProps {
  rich: Rich;
  color?: string;
  fontSize?: number;
  testID?: string;
}

/**
 * Renders every field of a Rich, each on its own line: Arabic paragraph (RTL),
 * French line (LTR), then the formula as its own LTR block. Never inline math.
 */
export function RichView({
  rich,
  color = theme.color.textPrimary,
  fontSize = 18,
  testID,
}: RichViewProps) {
  return (
    <View testID={testID}>
      {rich.ar && (
        <RichText
          runs={rich.ar}
          style={{
            color,
            fontSize,
            lineHeight: fontSize * theme.font.readingLineRatio,
          }}
        />
      )}
      {rich.fr !== undefined && (
        <Text
          style={[
            styles.fr,
            { color, fontSize: fontSize - theme.font.secondaryRunDelta },
          ]}
          accessibilityLanguage="fr"
        >
          {rich.fr}
        </Text>
      )}
      {rich.math !== undefined && (
        <MathBlock
          latex={rich.math}
          color={color}
          fontSize={fontSize + theme.font.mathRunDelta}
        />
      )}
    </View>
  );
}

/** Plain text of a Rich (quotes in student bubbles, accessibility). */
export function richToPlain(rich: Rich): string {
  return [rich.ar && toPlainText(rich.ar), rich.fr, rich.math]
    .filter(Boolean)
    .join(' ');
}

const styles = StyleSheet.create({
  fr: {
    writingDirection: 'ltr',
    textAlign: 'left',
    lineHeight: theme.font.lineHeight.body,
  },
});
