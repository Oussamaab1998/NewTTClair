import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Rich } from '../../content/schema';
import { RichText } from '../blocks/RichText';
import { MathBlock } from '../math/MathBlock';
import { ScrollingMath } from '../math/ScrollingMath';
import { spokenMath } from '../math/spoken';
import { toPlainText } from '../rich/runs';
import { theme } from '../../theme';

interface RichViewProps {
  rich: Rich;
  color?: string;
  fontSize?: number;
  /** Arabic face (default regular; question prompts use bold). */
  fontFamily?: string;
  /** 'paper': the French line is exam wording (STIX, DESIGN.md §3). */
  variant?: 'lesson' | 'paper';
  /** Lines of the Arabic paragraph (ask chips: 1). The formula keeps its own line. */
  numberOfLines?: number;
  /**
   * A formula wider than the card scrolls sideways (default). Off where the
   * view sits in a horizontal scroll or a button (ask chips, options).
   */
  mathScroll?: boolean;
  testID?: string;
}

/**
 * Renders every field of a Rich, each on its own line: Arabic paragraph (RTL),
 * French line (LTR), then the formula as its own LTR block. Never inline math.
 */
export function RichView({
  rich,
  color = theme.color.textPrimary,
  fontSize = theme.font.body.fontSize,
  fontFamily = theme.font.family.ui.regular,
  variant = 'lesson',
  numberOfLines,
  mathScroll = true,
  testID,
}: RichViewProps) {
  const Formula = mathScroll ? ScrollingMath : MathBlock;
  return (
    <View testID={testID}>
      {rich.ar && (
        <RichText
          runs={rich.ar}
          {...(numberOfLines !== undefined && { numberOfLines })}
          style={{
            color,
            fontSize,
            fontFamily,
            lineHeight: fontSize * theme.font.readingLineRatio,
          }}
        />
      )}
      {rich.fr !== undefined && (
        <Text
          style={[
            styles.fr,
            variant === 'paper'
              ? { ...theme.font.paper, color }
              : { color, fontSize: fontSize - theme.font.secondaryRunDelta },
          ]}
          accessibilityLanguage="fr"
        >
          {rich.fr}
        </Text>
      )}
      {rich.math !== undefined && (
        <Formula
          latex={rich.math}
          color={color}
          fontSize={fontSize + theme.font.mathRunDelta}
          {...(testID !== undefined && { testID: `${testID}-math` })}
        />
      )}
    </View>
  );
}

/** A Rich as words for screen readers: formulas read as words, not LaTeX. */
export function richToSpoken(rich: Rich): string {
  return [
    rich.ar && toPlainText(rich.ar),
    rich.fr,
    rich.math && spokenMath(rich.math),
  ]
    .filter(Boolean)
    .join(' ');
}

/** Plain text of a Rich (quotes in student bubbles). */
/** A quoted block: its words, and its formula apart (rendered as math, never as raw LaTeX). */
export interface Quote {
  text: string;
  math?: string;
}

export function richToQuote(rich: Rich): Quote {
  const text = [rich.ar && toPlainText(rich.ar), rich.fr]
    .filter(Boolean)
    .join(' ');
  return rich.math !== undefined ? { text, math: rich.math } : { text };
}

export function richToPlain(rich: Rich): string {
  return [rich.ar && toPlainText(rich.ar), rich.fr, rich.math]
    .filter(Boolean)
    .join(' ');
}

const styles = StyleSheet.create({
  fr: {
    fontFamily: theme.font.family.ui.regular,
    writingDirection: 'ltr',
    textAlign: 'left',
    lineHeight: theme.font.lineHeight.body,
  },
});
