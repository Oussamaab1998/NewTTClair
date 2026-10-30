/**
 * The read frame: the statement's sentence as words he can tap. One tap on
 * the word that says whether order matters. The component does not know
 * which word is right (the reducer decides).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../../theme';

interface Props {
  sentence: string;
  readonly: boolean;
  /** The word that was tapped (readonly). */
  chosen?: string;
  onTap: (token: string) => void;
  testID?: string;
}

const tidy = (w: string) => w.replace(/^[(«"]+|[.,;:!?)»"]+$/gu, '');

export function StatementTap({
  sentence,
  readonly,
  chosen,
  onTap,
  testID = 'statement-tap',
}: Props) {
  const [last, setLast] = useState<number | null>(null);
  const words = sentence.split(/\s+/u).filter(Boolean);
  return (
    <View style={styles.wrap} testID={testID}>
      {words.map((w, i) => {
        const token = tidy(w);
        const on =
          last === i ||
          (chosen !== undefined && token === chosen && last === null);
        return (
          <Pressable
            key={`${w}-${i}`}
            disabled={readonly || token === ''}
            onPress={() => {
              setLast(i);
              onTap(token);
            }}
            style={[styles.word, on && styles.wordOn]}
            accessibilityRole="button"
            accessibilityLabel={token}
            testID={`read-token-${i}`}
          >
            <Text style={styles.text}>{w}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.space.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
    direction: 'ltr',
  },
  word: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordOn: {
    backgroundColor: theme.color.surfaceSelected,
    borderColor: theme.color.ink,
  },
  text: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
});
