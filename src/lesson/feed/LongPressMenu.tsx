import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AskMode } from '../session/types';
import { theme } from '../../theme';
import { isolateInline } from '../rich/runs';
import { MathBlock } from '../math/MathBlock';
import type { Quote } from './RichView';

export const ASK_MODES: readonly AskMode[] = ['explain', 'why', 'example'];

interface LongPressMenuProps {
  /** The quoted block (text, formula apart); the menu is hidden when null. */
  quote: Quote | null;
  /** The block's trust label, shown above its Report row. */
  trust?: string;
  /** «بلّغ على غلطة», the last row, apart from the ask modes. */
  onReport?: () => void;
  onChoose: (mode: AskMode) => void;
  onDismiss: () => void;
  /** iOS: the menu is gone (the next sheet may open now). */
  onHidden?: () => void;
}

/**
 * اشرحلي / علاش؟ / مثال for a long-pressed paragraph, then, set apart, its
 * trust label and «بلّغ على غلطة» (DESIGN.md §3).
 */
export function LongPressMenu({
  quote,
  trust,
  onReport,
  onChoose,
  onDismiss,
  onHidden,
}: LongPressMenuProps) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={quote !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      {...(onHidden && { onDismiss: onHidden })}
      testID="longpress-modal"
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        testID="longpress-backdrop"
      >
        <View style={styles.sheet} testID="longpress-menu">
          <Text style={styles.title}>{t('lesson.menuTitle')}</Text>
          {quote !== null && quote.text.length > 0 && (
            <Text
              style={styles.quote}
              numberOfLines={3}
              testID="longpress-quote"
            >
              {isolateInline(quote.text)}
            </Text>
          )}
          {quote?.math !== undefined && (
            <View testID="longpress-quote-math">
              <MathBlock latex={quote.math} fontSize={theme.font.size.body} />
            </View>
          )}
          {ASK_MODES.map(mode => (
            <Pressable
              key={mode}
              style={styles.option}
              onPress={() => onChoose(mode)}
              accessibilityRole="button"
              testID={`longpress-${mode}`}
            >
              <Text style={styles.optionText}>
                {t(`lesson.askMode.${mode}`)}
              </Text>
            </Pressable>
          ))}
          {onReport && (
            <View style={styles.reportGroup}>
              {trust !== undefined && (
                <Text style={styles.trust} testID="longpress-trust">
                  {trust}
                </Text>
              )}
              <Pressable
                style={styles.option}
                onPress={onReport}
                accessibilityRole="button"
                testID="longpress-report"
              >
                <Text style={styles.optionText}>
                  {t('lesson.report.button')}
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable
            style={styles.option}
            onPress={onDismiss}
            accessibilityRole="button"
            testID="longpress-cancel"
          >
            <Text style={[styles.optionText, styles.cancel]}>
              {t('lesson.cancel')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.color.overlayScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.color.surfaceCard,
    borderTopLeftRadius: theme.radius.sheetTop,
    borderTopRightRadius: theme.radius.sheetTop,
    padding: theme.space.xxl,
    paddingBottom: theme.space.sheetBottom,
  },
  title: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  quote: {
    fontFamily: theme.font.family.ui.regular,
    marginVertical: theme.space.sm,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  option: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.borderDefault,
  },
  optionText: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.reading,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.actionPrimary,
  },
  cancel: { color: theme.color.textSecondary },
  // Report is set apart from the ask modes: a thicker rule and some space.
  reportGroup: {
    marginTop: theme.space.md,
    borderTopWidth: theme.border.active,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.xs,
  },
  trust: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
