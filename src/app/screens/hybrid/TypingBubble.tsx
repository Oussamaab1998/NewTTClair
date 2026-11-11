/**
 * The teacher is writing: three dots in a tutor bubble, where the reply
 * will land, with «الأستاذ يكتب» beside them. One Animated.loop on the
 * native driver drives the dots' opacity (nothing re-renders, cheap on
 * small Android phones); with reduce motion on, the dots stay still. After
 * a long wait a second line says it is still coming.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../../theme';

/** One round of the three dots (ms). */
const CYCLE_MS = 1200;
/** After this long, «مازال شوية» (ms). */
export const LONG_WAIT_MS = 8000;
const DOTS = [0, 1, 2] as const;
/** A dot's opacity at rest and lit. */
const DIM = 0.3;
const LIT = 1;

/** Each dot lights up in turn: a short peak in its own slice of the cycle. */
const dotOpacity = (phase: Animated.Value, i: number) =>
  phase.interpolate({
    inputRange: [0, 0.1 + i * 0.2, 0.3 + i * 0.2, 0.5 + i * 0.2, 1],
    outputRange: [DIM, DIM, LIT, DIM, DIM],
  });

export function TypingBubble({
  testID = 'hybrid-waiting',
}: {
  testID?: string;
}) {
  const { t } = useTranslation();
  const phase = useRef(new Animated.Value(0)).current;
  const [long, setLong] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLong(true), LONG_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let live = true;
    // No state is set here: the loop drives the native views only.
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .catch(() => false)
      .then(reduce => {
        if (!live || reduce) {
          return;
        }
        loop = Animated.loop(
          Animated.timing(phase, {
            toValue: 1,
            duration: CYCLE_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        loop.start();
      });
    return () => {
      live = false;
      loop?.stop();
    };
  }, [phase]);
  return (
    <View
      style={styles.bubble}
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={t('hybrid.step.waiting')}
      testID={testID}
    >
      <View style={styles.row}>
        <View style={styles.dots}>
          {DOTS.map(i => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: dotOpacity(phase, i) }]}
            />
          ))}
        </View>
        <Text style={styles.text}>{t('hybrid.step.waiting')}</Text>
      </View>
      {long && (
        <Text style={styles.long} testID={`${testID}-long`}>
          {t('hybrid.wait.long')}
        </Text>
      )}
    </View>
  );
}

/** The dot's size: a small round mark, the width of a small gap. */
const DOT = theme.space.sm;

const styles = StyleSheet.create({
  bubble: {
    alignSelf: theme.reading.startAlign,
    gap: theme.space.xxs,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderDefault,
    backgroundColor: theme.color.surfaceCard,
  },
  row: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  dots: { flexDirection: 'row', gap: theme.space.xxs, direction: 'ltr' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.color.ink,
  },
  text: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  long: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
