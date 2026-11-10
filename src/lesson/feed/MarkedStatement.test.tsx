import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { MarkedStatement } from './MarkedStatement';

const TEXT =
  'Une urne contient quatre boules rouges et six boules noires. Une épreuve consiste à tirer simultanément trois boules.';

describe('MarkedStatement', () => {
  it('keeps the whole line and underlines the data and his word, with their punctuation outside', async () => {
    await render(
      <MarkedStatement
        text={TEXT}
        marks={[
          { word: 'quatre', kind: 'data' },
          { word: 'six', kind: 'data' },
          { word: 'trois', kind: 'data' },
          { word: 'simultanément', kind: 'tapped' },
        ]}
      />,
    );
    expect(screen.getByTestId('marked-statement')).toHaveTextContent(TEXT);
    const data = screen.getAllByTestId(/^marked-statement-data-/);
    expect(data.map(d => d.props.children)).toEqual(['quatre', 'six', 'trois']);
    for (const d of data) {
      expect(StyleSheet.flatten(d.props.style)).toMatchObject({
        textDecorationLine: 'underline',
      });
    }
    const tapped = screen.getAllByTestId(/^marked-statement-tapped-/);
    expect(tapped.map(d => d.props.children)).toEqual(['simultanément']);
    // Not colour alone: his word is underlined and bold too.
    expect(StyleSheet.flatten(tapped[0]!.props.style)).toMatchObject({
      textDecorationLine: 'underline',
      fontWeight: expect.anything(),
    });
  });

  it('matches words whatever their case, and marks nothing else', async () => {
    await render(
      <MarkedStatement
        text="Trois boules, (deux) noires."
        marks={[
          { word: 'trois', kind: 'data' },
          { word: 'deux', kind: 'data' },
        ]}
        testID="m"
      />,
    );
    expect(screen.getByTestId('m')).toHaveTextContent(
      'Trois boules, (deux) noires.',
    );
    expect(
      screen.getAllByTestId(/^m-data-/).map(d => d.props.children),
    ).toEqual(['Trois', 'deux']);
    expect(screen.queryByTestId(/^m-tapped-/)).toBeNull();
  });
});
