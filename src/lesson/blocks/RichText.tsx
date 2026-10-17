import React, { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import {
  DEFAULT_ISOLATION,
  toPlainText,
  toSegments,
  type ArRuns,
  type IsolationStrategy,
} from '../rich/runs';
import { theme } from '../../theme';

interface RichTextProps {
  runs: ArRuns;
  strategy?: IsolationStrategy;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * An Arabic paragraph (RTL, right aligned) with isolated French terms.
 * Never put formulas here; use MathBlock on its own line.
 */
export function RichText({
  runs,
  strategy = DEFAULT_ISOLATION,
  style,
  testID,
}: RichTextProps) {
  const segments = useMemo(() => toSegments(runs, strategy), [runs, strategy]);

  return (
    <Text
      style={[styles.paragraph, style]}
      accessibilityLanguage="ar"
      accessibilityLabel={toPlainText(runs)}
      testID={testID}
    >
      {segments.map((segment, i) =>
        segment.ltr ? (
          <Text key={i} style={styles.ltrRun}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontSize: theme.font.size.reading,
    lineHeight: theme.font.lineHeight.reading,
    color: theme.color.textPrimary,
  },
  // iOS honors writingDirection on nested runs; Android ignores it (relies on LRI…PDI).
  ltrRun: { writingDirection: 'ltr' },
});
