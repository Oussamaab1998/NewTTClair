/**
 * The row of math keys above the teacher's input (approved mockup
 * TeacherTyping): ∩ ∪ Ā p( ) / fraction √ x², left to right like the
 * formulas. A key writes into his question at the cursor; the phone
 * keyboard stays open (the keys never take the focus).
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../../../theme';
import { MATH_KEYS, type MathKey } from './typed';

export function MathKeys({ onKey }: { onKey: (key: MathKey) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={t('hybrid.teacher.keysLabel')}
      testID="teacher-keys"
    >
      {MATH_KEYS.map(k => (
        <Pressable
          key={k.id}
          style={({ pressed }) => [styles.key, pressed && styles.keyDown]}
          accessibilityRole="button"
          accessibilityLabel={t(`hybrid.teacher.keys.${k.id}`)}
          accessibilityLanguage="fr"
          testID={`teacher-key-${k.id}`}
          onPress={() => onKey(k)}
        >
          <Text style={styles.glyph}>{k.glyph}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: theme.mathSide.row, gap: theme.space.xs },
  key: {
    minWidth: theme.size.touch,
    height: theme.size.touch,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceKey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDown: { backgroundColor: theme.color.surfaceKeyPressed },
  glyph: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
