import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import {
  GestureDetector,
  useLongPressGesture,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import type { ReportPath, ReportTarget } from './reportTarget';
import { LONG_PRESS_MAX_MOVE, LONG_PRESS_MS } from './TutorText';

const REPORT_MARK = '⚑';
const AI_MARK = '✦';
const ENGINE_MARK = '∑';

export type MenuVia = 'longpress' | 'a11y';

interface BlockActionsProps {
  target: ReportTarget | null;
  /** How this block's Report is reached (reportPath). */
  path: ReportPath | null;
  /** The block as words (its accessibility label on the long-press path). */
  label: string;
  onMenu: (target: ReportTarget, via: MenuVia) => void;
  onReport: (target: ReportTarget) => void;
  children: React.ReactNode;
}

/**
 * Wraps a feed block with its way to the trust label and Report
 * (docs/FEEDBACK_AND_TRUST.md, DESIGN.md §3). No per-block icon: blocks use
 * the full width. Display blocks open their menu on a long-press (and a
 * screen-reader "report" action); tutor text, choice cards and question cards
 * handle their own entry; visuals are reported from their card's "⋯". AI
 * blocks keep a visible Report button and their trust line; engine values a
 * small "∑" line (shape + text, never color only).
 */
export function BlockActions({
  target,
  path,
  label,
  onMenu,
  onReport,
  children,
}: BlockActionsProps) {
  const { t } = useTranslation();
  if (!target) {
    return <>{children}</>;
  }
  const ai = target.trust === 'ai_generated';
  const note = ai
    ? `${AI_MARK} ${t('lesson.trust.ai_generated')}`
    : target.trust === 'engine_computed'
    ? `${ENGINE_MARK} ${t('lesson.trust.engine_computed')}`
    : null;
  const reportLabel = `${REPORT_MARK} ${t('lesson.report.button')}`;
  return (
    <View>
      {path === 'longpress' ? (
        <LongPressBlock
          testID={`block-${target.itemKey}-longpress`}
          label={label}
          onMenu={via => onMenu(target, via)}
        >
          {children}
        </LongPressBlock>
      ) : (
        children
      )}
      {(note !== null || ai) && (
        <View style={styles.footer}>
          {ai && (
            <Pressable
              onPress={() => onReport(target)}
              hitSlop={theme.size.blockMenuSlop}
              accessibilityRole="button"
              testID={`block-report-${target.itemKey}`}
            >
              <Text style={styles.reportText}>{reportLabel}</Text>
            </Pressable>
          )}
          {note !== null && (
            <Text style={styles.note} testID={`trust-${target.itemKey}`}>
              {note}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * A display block (no touchables inside) that opens its menu on a long-press,
 * like tutor text: 450 ms hold, cancelled by an 8 pt move (a scroll).
 */
export function LongPressBlock({
  testID,
  label,
  onMenu,
  children,
}: {
  testID: string;
  label: string;
  onMenu: (via: MenuVia) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const gesture = useLongPressGesture({
    minDuration: LONG_PRESS_MS,
    maxDistance: LONG_PRESS_MAX_MOVE,
    runOnJS: true,
    testID,
    onActivate: () => onMenu('longpress'),
  });
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityLabel={label}
        accessibilityActions={[
          { name: 'report', label: t('lesson.report.button') },
        ]}
        onAccessibilityAction={e => {
          if (e.nativeEvent.actionName === 'report') {
            onMenu('a11y');
          }
        }}
        testID={`${testID}-target`}
      >
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.space.xxxs,
    gap: theme.space.sm,
  },
  note: {
    flex: 1,
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reportText: {
    ...theme.font.small,
    color: theme.color.pen,
    writingDirection: 'rtl',
  },
});
