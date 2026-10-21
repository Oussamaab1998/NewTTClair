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
/** Send: an arrow toward the reading direction (shape cue; the label is for screen readers). */
const SEND_MARK = '\u2190';

interface AskFieldProps {
  chips: readonly { id: string; label: Rich }[];
  onChip: (chipId: string) => void;
  onSend: (text: string) => void;
  /**
   * Fold the chips while this card is active (any question card on screen);
   * a quiet chip brings them back until the next card. null: unfolded.
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
  // A fixed row height: two lines when a chip carries a formula (its own LTR
  // line under the text), else one; the row never jumps while scrolling.
  const tall = chips.some(c => c.label.math !== undefined);
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
          style={tall ? styles.rowTall : styles.rowShort}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
          testID="ask-chips"
        >
          {chips.map(c => (
            <Pressable
              key={c.id}
              onPress={() => onChip(c.id)}
              style={styles.chip}
              accessibilityRole="button"
              testID={`ask-chip-${c.id}`}
            >
              <RichView
                rich={c.label}
                fontSize={theme.font.size.small}
                numberOfLines={1}
                mathScroll={false}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={styles.row}>
        {/* Reading order: the chips toggle, the field, the send button. */}
        {!showChips && chips.length > 0 && (
          <Pressable
            onPress={() => setOpenedFor(foldFor)}
            style={styles.more}
            accessibilityRole="button"
            accessibilityState={{ expanded: false }}
            testID="ask-chips-toggle"
          >
            <Text style={styles.moreText}>{t('lesson.askMore')}</Text>
          </Pressable>
        )}
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder={t('lesson.askPlaceholder')}
          placeholderTextColor={theme.color.inkMuted}
          maxLength={MAX_LENGTH}
          style={styles.input}
          returnKeyType="send"
          testID="ask-input"
        />
        <Pressable
          onPress={send}
          style={styles.send}
          accessibilityRole="button"
          accessibilityLabel={t('lesson.askSend')}
          testID="ask-send"
        >
          <Text style={styles.sendText}>{SEND_MARK}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Cahier ask bar (DESIGN.md §3): on paper; in reading order: the quiet «اسأل»
// chips toggle at the start (right), the white rounded field, the round pen
// send button at the end (left). The chips row stays above with its folding rules.
const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.color.paper,
    paddingTop: theme.space.xs,
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.space.xs,
    gap: theme.space.xs,
  },
  rowShort: { height: theme.size.askChipRow, flexGrow: 0 },
  rowTall: { height: theme.size.askChipRowTall, flexGrow: 0 },
  chips: {
    gap: theme.space.xs,
    paddingHorizontal: theme.space.xxxs,
    alignItems: 'stretch',
  },
  chip: {
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
  },
  row: {
    flexDirection: theme.reading.row,
    gap: theme.space.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: theme.size.touch,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.xl,
    ...theme.font.body,
    lineHeight: undefined,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  send: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.size.touch / 2,
    backgroundColor: theme.color.pen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { ...theme.font.header, color: theme.color.textOnAccent },
  // The chips toggle is a quiet chip, not a dark button.
  more: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    justifyContent: 'center',
  },
  moreText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.medium,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
});
