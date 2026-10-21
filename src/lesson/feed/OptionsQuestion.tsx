import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Rich } from '../../content/schema';
import { richToPlain, RichView } from './RichView';
import { theme } from '../../theme';

export interface OptionView {
  id: string;
  label: Rich;
}

interface OptionsQuestionProps {
  options: readonly OptionView[];
  /** Readonly/replay: no taps; `result` marks the chosen option. */
  readonly: boolean;
  result?: { optionId?: string; correct: boolean };
  onSelect: (optionId: string) => void;
}

/** 2-4 options. Wrong options are not disabled (no answering by elimination marks). */
export function OptionsQuestion({
  options,
  readonly,
  result,
  onSelect,
}: OptionsQuestionProps) {
  return (
    <View style={styles.list}>
      {options.map(o => {
        const chosen = result?.optionId === o.id;
        // Green pencil / red pencil, each with its icon (DESIGN.md §3).
        const mark = chosen
          ? result.correct
            ? {
                edge: theme.color.correct.ink,
                surface: theme.color.correct.bg,
                text: theme.color.correct.ink,
                icon: theme.feedback.success.icon,
              }
            : {
                edge: theme.color.error.noteBorder,
                surface: theme.color.error.noteBg,
                text: theme.color.error.ink,
                icon: theme.feedback.danger.icon,
              }
          : null;
        return (
          <Pressable
            key={o.id}
            disabled={readonly}
            onPress={() => onSelect(o.id)}
            accessibilityRole="button"
            accessibilityLabel={richToPlain(o.label)}
            accessibilityState={{ disabled: readonly, selected: chosen }}
            testID={`option-${o.id}`}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.pressed,
              mark && { borderColor: mark.edge, backgroundColor: mark.surface },
            ]}
          >
            <View style={styles.label}>
              <RichView rich={o.label} mathScroll={false} />
            </View>
            {mark && (
              <Text style={[styles.mark, { color: mark.text }]}>
                {mark.icon}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.sm, marginTop: theme.space.sm },
  option: {
    minHeight: theme.size.touch,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xs,
    // The label first, the ✓ / ✗ mark at the reading end (left).
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.card,
  },
  // Highlighter under the finger (the tap answers at once).
  pressed: {
    backgroundColor: theme.color.highlighter,
    borderColor: theme.color.ink,
  },
  label: { flex: 1 },
  mark: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
  },
});
