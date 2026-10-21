import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KatexMath } from './KatexMath';
import { LatexSubsetError, parseLatexSubset } from './latexSubset';
import { MathNodeView } from './NativeMath';
import { spokenMath } from './spoken';
import { nowMs } from '../../telemetry/clock';
import { theme } from '../../theme';

export type MathRenderer = 'native' | 'katex';

interface MathBlockProps {
  latex: string;
  /** Pending docs/DECISIONS.md D1; 'native' until device results are in. */
  renderer?: MathRenderer;
  fontSize?: number;
  color?: string;
  /** Time from mount to first layout (native) or fonts-ready (KaTeX), in ms. */
  onRendered?: (ms: number) => void;
  onError?: (error: unknown) => void;
  testID?: string;
}

/**
 * A formula on its own line, always left-to-right, never inside an Arabic
 * sentence. If the formula cannot be rendered, the raw LaTeX is shown instead
 * (never crash the feed).
 */
export function MathBlock({
  latex,
  renderer = 'native',
  fontSize = theme.font.size.title,
  color = theme.color.textPrimary,
  onRendered,
  onError,
  testID,
}: MathBlockProps) {
  const start = useRef(nowMs());
  const reported = useRef(false);
  const [failed, setFailed] = useState(false);

  const parsed = useMemo(() => {
    if (renderer !== 'native') {
      return null;
    }
    try {
      return parseLatexSubset(latex);
    } catch (error) {
      if (!(error instanceof LatexSubsetError)) {
        throw error;
      }
      return error;
    }
  }, [latex, renderer]);

  const parseError = parsed instanceof LatexSubsetError ? parsed : null;
  const node = parsed instanceof LatexSubsetError ? null : parsed;
  useEffect(() => {
    if (parseError) {
      onError?.(parseError);
    }
    // Report once per parse result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseError]);

  const fail = (error: unknown) => {
    setFailed(true);
    onError?.(error);
  };

  const report = (ms: number) => {
    if (!reported.current) {
      reported.current = true;
      onRendered?.(ms);
    }
  };

  const showFallback = failed || parseError !== null;
  const spokenLabel = useMemo(() => spokenMath(latex), [latex]);

  return (
    <View
      style={styles.block}
      testID={testID}
      // Read as words, never as raw LaTeX (DESIGN.md §3).
      accessibilityLabel={spokenLabel}
      accessibilityLanguage="fr"
      onLayout={
        renderer === 'native' || showFallback
          ? () => report(nowMs() - start.current)
          : undefined
      }
    >
      {showFallback ? (
        <Text style={[styles.fallback, { color }]}>{latex}</Text>
      ) : renderer === 'native' && node ? (
        <MathNodeView node={node} size={fontSize} color={color} />
      ) : (
        <KatexMath
          latex={latex}
          fontSize={fontSize}
          color={color}
          onReady={report}
          onError={fail}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    direction: 'ltr',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: theme.space.xs,
  },
  fallback: {
    fontFamily: theme.font.family.mono,
    writingDirection: 'ltr',
    fontSize: theme.font.size.small,
  },
});
