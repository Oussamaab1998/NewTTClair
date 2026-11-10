/**
 * A section of the map that fades in (and rises a little) after the ones
 * before it, once, when it first shows. React Native's Animated with the
 * native driver (opacity and a translate only: nothing re-renders), not
 * Reanimated (DECISIONS D36). With reduce motion on, or `off`, it is just
 * there.
 */
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

import { theme } from '../../../../theme';

/** One section's fade, and the wait between two sections (ms). */
const FADE_MS = 260;
const STAGGER_MS = 70;

export function FadeIn({
  index,
  off = false,
  children,
}: {
  /** Its place among the sections (the wait before it fades in). */
  index: number;
  off?: boolean;
  children: React.ReactNode;
}) {
  const shown = useRef(new Animated.Value(off ? 1 : 0)).current;
  useEffect(() => {
    if (off) {
      return undefined;
    }
    let anim: Animated.CompositeAnimation | null = null;
    let live = true;
    // No state is set here: the animation drives the native view only.
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .catch(() => false)
      .then(reduce => {
        if (!live) {
          return;
        }
        if (reduce) {
          shown.setValue(1);
          return;
        }
        anim = Animated.timing(shown, {
          toValue: 1,
          duration: FADE_MS,
          delay: index * STAGGER_MS,
          useNativeDriver: true,
        });
        anim.start();
      });
    return () => {
      live = false;
      anim?.stop();
    };
  }, [off, index, shown]);
  if (off) {
    return <>{children}</>;
  }
  const rise = shown.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.space.sm, 0],
  });
  return (
    <Animated.View
      style={{ opacity: shown, transform: [{ translateY: rise }] }}
    >
      {children}
    </Animated.View>
  );
}
