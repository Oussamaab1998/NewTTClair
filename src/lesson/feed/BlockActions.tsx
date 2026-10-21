import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import type { ReportTarget } from './reportTarget';

const MENU_MARK = '⋯';
const REPORT_MARK = '⚑';
const AI_MARK = '✦';
const ENGINE_MARK = '∑';

interface BlockActionsProps {
  target: ReportTarget | null;
  onMenu: (target: ReportTarget) => void;
  onReport: (target: ReportTarget) => void;
  children: React.ReactNode;
}

/**
 * Wraps a feed block with its report entry point and trust label
 * (docs/FEEDBACK_AND_TRUST.md). AI blocks and the active question show a
 * labelled Report button; other blocks a small "..." in the left gutter that
 * opens a menu. AI and engine labels are a small text line (shape + text,
 * never color only); lesson labels are shown inside the menu.
 */
export function BlockActions({
  target,
  onMenu,
  onReport,
  children,
}: BlockActionsProps) {
  const { t } = useTranslation();
  if (!target) {
    return <>{children}</>;
  }
  const note =
    target.trust === 'ai_generated'
      ? `${AI_MARK} ${t('lesson.trust.ai_generated')}`
      : target.trust === 'engine_computed'
      ? `${ENGINE_MARK} ${t('lesson.trust.engine_computed')}`
      : null;
  const reportLabel = `${REPORT_MARK} ${t('lesson.report.button')}`;
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.gutter}>
          {!target.prominent && (
            <Pressable
              onPress={() => onMenu(target)}
              hitSlop={theme.size.blockMenuSlop}
              accessibilityRole="button"
              accessibilityLabel={t('lesson.report.menu')}
              testID={`block-menu-${target.itemKey}`}
            >
              <Text style={styles.menuMark}>{MENU_MARK}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.body}>{children}</View>
      </View>
      {(note !== null || target.prominent) && (
        <View style={styles.footer}>
          {target.prominent && (
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  gutter: {
    width: theme.size.blockGutter,
    alignItems: 'flex-start',
    paddingTop: theme.space.xs,
  },
  body: { flex: 1 },
  menuMark: {
    fontSize: theme.font.size.body,
    color: theme.color.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: theme.size.blockGutter,
    marginTop: theme.space.xxxs,
    gap: theme.space.sm,
  },
  note: {
    flex: 1,
    fontSize: theme.font.size.tiny,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reportText: {
    fontSize: theme.font.size.caption,
    color: theme.color.actionPrimary,
    writingDirection: 'rtl',
  },
});
