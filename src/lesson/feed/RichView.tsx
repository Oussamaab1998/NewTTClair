import React, { createContext, useContext, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from 'react-native';

import type { Rich } from '../../content/schema';
import { RichText } from '../blocks/RichText';
import { MathBlock } from '../math/MathBlock';
import { ScrollingMath } from '../math/ScrollingMath';
import { spokenMath } from '../math/spoken';
import { toPlainText, type ArRuns } from '../rich/runs';
import { theme } from '../../theme';

/** Where a long-pressed text sits on the screen (window coordinates). */
export interface AskFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The face of a pressed text, so the selection draws it the same. */
export interface AskFont {
  fontSize: number;
  fontFamily: string;
  /** The exam paper's French (STIX, theme.font.paper). */
  paper: boolean;
}

/**
 * A long press on a formula (LaTeX), French words or an Arabic paragraph,
 * to select some of it and ask the teacher (select any text, 2026-11-18).
 */
export interface AskPress {
  kind: 'math' | 'fr' | 'ar';
  text: string;
  /** An Arabic paragraph's runs (its French words stay isolated). */
  runs?: ArRuns;
  /** Where the finger is (window); null: a screen reader's action, the whole text. */
  point: { x: number; y: number } | null;
  font: AskFont;
  /** Measures the pressed view (its frame, or null when it cannot be measured). */
  measure: (done: (frame: AskFrame | null) => void) => void;
}

export interface AskTarget {
  onPress: (p: AskPress) => void;
  /** The screen reader's name of the action («نسأل الأستاذ»). */
  label: string;
}

/**
 * Long press to ask (student test 2026-11-18): present only where the lesson
 * board wraps the lesson in its AskProvider
 * (src/app/screens/hybrid/teacher/AskProvider.tsx). Without it RichView
 * renders exactly as before.
 */
export const AskTargetContext = createContext<AskTarget | null>(null);

/** How long a finger stays still on a formula or French words before the menu opens. */
export const ASK_LONG_PRESS_MS = 450;
/** A finger that moves farther (a scroll) is no long press. */
const ASK_MOVE_SLOP = 10;

/**
 * A view that opens the ask menu on a long press. It reads raw touches and
 * never takes the responder, so a button around it still gets its tap and a
 * scroll still scrolls; presenting the menu cancels the touch underneath.
 * Screen readers get a "long press" action.
 */
export function Askable({
  kind,
  text,
  runs,
  font,
  target,
  children,
  testID,
}: {
  kind: AskPress['kind'];
  text: string;
  runs?: ArRuns;
  font: AskFont;
  target: AskTarget;
  children: React.ReactNode;
  testID?: string;
}) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  };
  useEffect(() => cancel, []);
  const fire = (point: AskPress['point']) => {
    cancel();
    target.onPress({
      kind,
      text,
      ...(runs !== undefined && { runs }),
      point,
      font,
      measure: done => {
        const node = ref.current;
        if (typeof node?.measureInWindow !== 'function') {
          done(null);
          return;
        }
        node.measureInWindow((x, y, width, height) =>
          done(
            [x, y, width, height].every(Number.isFinite) && width > 0
              ? { x, y, width, height }
              : null,
          ),
        );
      },
    });
  };
  const onTouchStart = (e: GestureResponderEvent) => {
    cancel();
    if ((e.nativeEvent.touches?.length ?? 1) > 1) {
      return;
    }
    const at = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    start.current = at;
    timer.current = setTimeout(() => fire(at), ASK_LONG_PRESS_MS);
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    const s = start.current;
    if (
      s &&
      (Math.abs(e.nativeEvent.pageX - s.x) > ASK_MOVE_SLOP ||
        Math.abs(e.nativeEvent.pageY - s.y) > ASK_MOVE_SLOP)
    ) {
      cancel();
    }
  };
  return (
    <View
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      accessibilityActions={[{ name: 'longpress', label: target.label }]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => {
        if (e.nativeEvent.actionName === 'longpress') {
          fire(null);
        }
      }}
      {...(testID !== undefined && { testID })}
    >
      {children}
    </View>
  );
}

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
  // Inside the lesson board only: a long press on any of its text selects it to ask.
  const ask = useContext(AskTargetContext);
  const askable = (
    kind: AskPress['kind'],
    text: string,
    node: React.ReactElement,
    runs?: ArRuns,
  ): React.ReactElement =>
    ask ? (
      <Askable
        kind={kind}
        text={text}
        {...(runs !== undefined && { runs })}
        font={{
          fontSize:
            kind === 'fr' ? fontSize - theme.font.secondaryRunDelta : fontSize,
          fontFamily,
          paper: kind === 'fr' && variant === 'paper',
        }}
        target={ask}
        testID={`ask-${kind}`}
      >
        {node}
      </Askable>
    ) : (
      node
    );
  return (
    <View testID={testID}>
      {rich.ar &&
        askable(
          'ar',
          toPlainText(rich.ar),
          <RichText
            runs={rich.ar}
            {...(numberOfLines !== undefined && { numberOfLines })}
            style={{
              color,
              fontSize,
              fontFamily,
              lineHeight: fontSize * theme.font.readingLineRatio,
            }}
          />,
          rich.ar,
        )}
      {rich.fr !== undefined &&
        askable(
          'fr',
          rich.fr,
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
          </Text>,
        )}
      {rich.math !== undefined &&
        askable(
          'math',
          rich.math,
          <Formula
            latex={rich.math}
            color={color}
            fontSize={fontSize + theme.font.mathRunDelta}
            {...(testID !== undefined && { testID: `${testID}-math` })}
          />,
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
