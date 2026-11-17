/**
 * A figure of the exercise (a probability tree) drawn read-only through the
 * component registry: the printed one in «التمرين» and on the trip, the
 * live one on the step card and in «اللي لقيناه», a small example's tree on
 * its card (src/hybrid/figure.ts). Always left to right, on a line of its
 * own. It is drawn again only when its signature changes: the conductor
 * state is a new object after every act, and a key press on the worksheet
 * must not lay the picture out again.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ComponentHost } from '../../../components/ComponentHost';
import type { ComponentSpec } from '../../../components/contract';

const nothing = () => {};

export const FigureView = memo(
  function FigureViewImpl({
    spec,
    testID,
  }: {
    spec: ComponentSpec;
    /** Changes exactly when the picture does (LiveFigure.signature; a printed figure: any constant). */
    signature: string;
    testID: string;
  }) {
    return (
      <View style={styles.figure} testID={testID}>
        <ComponentHost
          spec={spec}
          defaultInstanceId={testID}
          mode="readonly"
          // A picture: nothing to tap, so nothing to log; a spec the
          // registry refuses shows its neutral fallback.
          onEvent={nothing}
          onError={nothing}
        />
      </View>
    );
  },
  (a, b) => a.signature === b.signature && a.testID === b.testID,
);

const styles = StyleSheet.create({
  figure: { direction: 'ltr', alignSelf: 'stretch' },
});
