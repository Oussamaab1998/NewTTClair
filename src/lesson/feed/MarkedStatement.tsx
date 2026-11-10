/**
 * An exam line in the paper face (French, left to right) with some words
 * underlined: the data (numbers, in words or digits) and the words the
 * student found himself (the read frame's tap). Not colour alone: data are
 * underlined; his words are underlined, bold and highlighted. One Text with
 * nested runs, so the line wraps like any paragraph and stays cheap.
 * (RichView has no underline.)
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { theme } from '../../theme';

export interface StatementMark {
  word: string;
  kind: 'data' | 'tapped';
}

/** Punctuation around a word, kept outside the underline. */
const SPLIT = /^([(«"']*)(.*?)([.,;:!?)»"']*)$/u;

export function MarkedStatement({
  text,
  marks,
  color = theme.color.ink,
  testID = 'marked-statement',
}: {
  text: string;
  marks: readonly StatementMark[];
  color?: string;
  testID?: string;
}) {
  const kindOf = new Map(marks.map(m => [m.word.toLowerCase(), m.kind]));
  const tokens = text.split(/(\s+)/u);
  return (
    <Text
      style={[styles.line, { color }]}
      accessibilityLanguage="fr"
      testID={testID}
    >
      {tokens.map((tok, i) => {
        const [, lead = '', core = '', trail = ''] = SPLIT.exec(tok) ?? [];
        const kind = core === '' ? undefined : kindOf.get(core.toLowerCase());
        if (!kind) {
          return tok;
        }
        return (
          <React.Fragment key={i}>
            {lead}
            <Text
              style={kind === 'tapped' ? styles.tapped : styles.data}
              testID={`${testID}-${kind}-${i}`}
            >
              {core}
            </Text>
            {trail}
          </React.Fragment>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    ...theme.font.paper,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  data: { textDecorationLine: 'underline' },
  tapped: {
    textDecorationLine: 'underline',
    fontWeight: theme.font.weight.bold,
    backgroundColor: theme.color.highlighterSoft,
  },
});
