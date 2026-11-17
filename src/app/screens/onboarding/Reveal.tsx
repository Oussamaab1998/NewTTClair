/**
 * A block that fades in and rises a little, `at` ms after its screen shows
 * (each onboarding screen is mounted when it shows, so it plays each time).
 * React Native's Animated with the native driver, like the trip's FadeIn
 * (DECISIONS D36: no Reanimated yet). `still` (reduce motion): just there.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '../../../theme';

const FADE_MS = 420;

export function Reveal({
  at,
  still,
  style,
  children,
  testID,
}: {
  at: number;
  still: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
}) {
  const shown = useRef(new Animated.Value(still ? 1 : 0)).current;
  useEffect(() => {
    if (still) {
      shown.setValue(1);
      return undefined;
    }
    const anim = Animated.timing(shown, {
      toValue: 1,
      duration: FADE_MS,
      delay: at,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [still, at, shown]);
  const rise = shown.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.space.md, 0],
  });
  return (
    <Animated.View
      style={[style, { opacity: shown, transform: [{ translateY: rise }] }]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}
