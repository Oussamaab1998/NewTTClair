import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  useLongPressGesture,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import type { Rich } from '../../content/schema';
import { richToQuote, type Quote, RichView } from './RichView';
import { theme } from '../../theme';

/** COMPONENTS_LESSON_UI.md §6: 450 ms hold, 8 pt move cancels. */
export const LONG_PRESS_MS = 450;
export const LONG_PRESS_MAX_MOVE = 8;

interface TutorTextProps {
  rich: Rich;
  blockId?: string;
  longPress: boolean;
  onLongPress?: (blockId: string, quote: Quote) => void;
  /** Screen-reader "report" action: the block's menu (trust label + Report). */
  onReportAction?: () => void;
  testID?: string;
}

/** A tutor paragraph. Long-press (or a mouse hold in the simulator) opens the ask menu. */
export const TutorText = memo(function TutorTextImpl({
  rich,
  blockId,
  longPress,
  onLongPress,
  onReportAction,
  testID,
}: TutorTextProps) {
  const { t } = useTranslation();
  const enabled =
    longPress && blockId !== undefined && onLongPress !== undefined;
  const gesture = useLongPressGesture({
    minDuration: LONG_PRESS_MS,
    maxDistance: LONG_PRESS_MAX_MOVE,
    enabled,
    runOnJS: true,
    // No spread here: the worklets Babel plugin rejects it in gesture configs.
    testID: testID ? `${testID}-longpress` : undefined,
    onActivate: () => {
      if (enabled) {
        onLongPress(blockId, richToQuote(rich));
      }
    },
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.block}
        testID={testID}
        accessibilityHint={enabled ? t('lesson.longPressHint') : undefined}
        accessibilityActions={[
          ...(enabled
            ? [{ name: 'longpress', label: t('lesson.menuTitle') }]
            : []),
          ...(onReportAction
            ? [{ name: 'report', label: t('lesson.report.button') }]
            : []),
        ]}
        onAccessibilityAction={e => {
          if (e.nativeEvent.actionName === 'report') {
            onReportAction?.();
          } else if (enabled) {
            onLongPress(blockId, richToQuote(rich));
          }
        }}
      >
        <RichView rich={rich} />
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  block: { paddingVertical: theme.space.xxs },
});
