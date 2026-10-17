import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich } from '../../content/schema';
import { RichView } from './RichView';
import { theme } from '../../theme';

const MAX_LENGTH = 500;

interface AskFieldProps {
  chips: readonly { id: string; label: Rich }[];
  onChip: (chipId: string) => void;
  onSend: (text: string) => void;
  /**
   * Fold the chips while this card is active (a keypad is open); a button
   * brings them back until the next card that folds them. null: unfolded.
   */
  foldFor?: string | null;
}

/**
 * Always-available free-text question field with starter chips.
 * Answers are canned for now (verified chip answers, else a neutral message).
 */
export function AskField({
  chips,
  onChip,
  onSend,
  foldFor = null,
}: AskFieldProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const showChips = foldFor === null || openedFor === foldFor;
  const send = () => {
    if (text.trim().length > 0) {
      onSend(text);
      setText('');
    }
  };
  return (
    <View style={styles.wrap} testID="ask-field">
      {showChips && chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {chips.map(c => (
            <Pressable
              key={c.id}
              onPress={() => onChip(c.id)}
              style={styles.chip}
              accessibilityRole="button"
              testID={`ask-chip-${c.id}`}
            >
              <RichView rich={c.label} fontSize={theme.font.size.small} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={styles.row}>
        {!showChips && chips.length > 0 && (
          <Pressable
            onPress={() => setOpenedFor(foldFor)}
            style={styles.more}
            accessibilityRole="button"
            accessibilityState={{ expanded: false }}
            testID="ask-chips-toggle"
          >
            <Text style={styles.sendText}>{t('lesson.askMore')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={send}
          style={styles.send}
          accessibilityRole="button"
          testID="ask-send"
        >
          <Text style={styles.sendText}>{t('lesson.askSend')}</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder={t('lesson.askPlaceholder')}
          maxLength={MAX_LENGTH}
          style={styles.input}
          returnKeyType="send"
          testID="ask-input"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.borderDefault,
    backgroundColor: theme.color.surfaceCard,
    paddingTop: theme.space.xs,
    paddingHorizontal: theme.space.sm,
    gap: theme.space.xs,
  },
  chips: { gap: theme.space.xs, paddingHorizontal: theme.space.xxxs },
  chip: {
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.sheet,
    paddingHorizontal: theme.space.md,
    minHeight: theme.size.askChipMinHeight,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: theme.size.touch,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.xl,
    fontSize: theme.font.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  send: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.actionPrimary,
    justifyContent: 'center',
  },
  sendText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.callout,
  },
  more: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.textSecondary,
    justifyContent: 'center',
  },
});
