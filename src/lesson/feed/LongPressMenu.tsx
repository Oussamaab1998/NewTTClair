import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AskMode } from '../session/types';
import { theme } from '../../theme';

export const ASK_MODES: readonly AskMode[] = ['explain', 'why', 'example'];

interface LongPressMenuProps {
  /** The quoted text; the menu is hidden when null. */
  quoted: string | null;
  onChoose: (mode: AskMode) => void;
  onDismiss: () => void;
}

/** اشرحلي / علاش؟ / مثال for a long-pressed paragraph. */
export function LongPressMenu({
  quoted,
  onChoose,
  onDismiss,
}: LongPressMenuProps) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={quoted !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        testID="longpress-backdrop"
      >
        <View style={styles.sheet} testID="longpress-menu">
          <Text style={styles.title}>{t('lesson.menuTitle')}</Text>
          {quoted !== null && (
            <Text style={styles.quote} numberOfLines={3}>
              {quoted}
            </Text>
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
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    padding: theme.space.xxl,
    paddingBottom: theme.space.sheetBottom,
  },
  title: {
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  quote: {
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
    fontSize: theme.font.size.reading,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.actionPrimary,
  },
  cancel: { color: theme.color.textSecondary },
});
