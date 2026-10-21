import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  type ScrollViewInstance,
} from 'react-native';

import { MathBlock } from './MathBlock';

type ScrollingMathProps = React.ComponentProps<typeof MathBlock>;

/**
 * A formula that can be wider than its card (2.a's law sum): the LinesCard
 * line pattern, a horizontal LTR scroll, centred when it fits. Scrolling is on
 * only while the formula is wider than its box, so a short formula never takes
 * the feed's vertical swipe; once wider, the indicator flashes. Never wraps
 * (math stays on one line).
 */
export function ScrollingMath(props: ScrollingMathProps) {
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  // Rounding: a formula that fits must not scroll by a fraction of a point.
  const wider = content - box > StyleSheet.hairlineWidth;
  const scroll = useRef<ScrollViewInstance>(null);
  // Once wider: flash the indicator, so the hidden end is discoverable.
  useEffect(() => {
    if (wider) {
      scroll.current?.flashScrollIndicators();
    }
  }, [wider]);
  return (
    <ScrollView
      ref={scroll}
      horizontal
      style={styles.scroll}
      scrollEnabled={wider}
      showsHorizontalScrollIndicator={wider}
      onLayout={e => setBox(e.nativeEvent.layout.width)}
      onContentSizeChange={w => setContent(w)}
      contentContainerStyle={styles.content}
      {...(props.testID !== undefined && { testID: `${props.testID}-scroll` })}
    >
      <MathBlock {...props} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView grows by default: it must not take a card's spare
  // height (the active card's room under the feed's scroll-to-top).
  scroll: { flexGrow: 0 },
  content: { flexGrow: 1, justifyContent: 'center', direction: 'ltr' },
});
