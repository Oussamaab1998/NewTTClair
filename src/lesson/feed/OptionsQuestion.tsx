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
        const mark = chosen
          ? result.correct
            ? theme.feedback.success
            : theme.feedback.danger
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
              mark && { borderColor: mark.text, backgroundColor: mark.surface },
            ]}
          >
            <View style={styles.label}>
              <RichView rich={o.label} fontSize={theme.font.size.bodyLarge} />
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
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  pressed: { backgroundColor: theme.color.surfaceSelected },
  label: { flex: 1 },
  mark: {
    fontSize: theme.font.size.reading,
    fontWeight: theme.font.weight.bold,
    marginLeft: theme.space.sm,
  },
});
