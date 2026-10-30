/**
 * A pick of one sentence card (the combine reason, a claim, a formula, a
 * recognise card). The cards are shown in a stable shuffled order that is
 * never the authored order. One act: the tap. A wrong tap is answered in the
 * feed; the card stays tappable (he may pick again).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Rich } from '../../../content/schema';
import { seededOrder } from '../../../method/shuffle';
import { theme } from '../../../theme';
import { RichView } from '../RichView';

export interface PickCard {
  id: string;
  text: Rich;
}

interface Props {
  cards: readonly PickCard[];
  /** Seeds the order (the step id, plus the stage for a repair). */
  seed: string;
  readonly: boolean;
  chosen?: string;
  onPick: (id: string) => void;
  testID?: string;
}

export function CardsPick({
  cards,
  seed,
  readonly,
  chosen,
  onPick,
  testID = 'cards-pick',
}: Props) {
  const [tried, setTried] = useState<string[]>([]);
  const order = useMemo(
    () =>
      seededOrder(
        cards.map(c => c.id),
        seed,
      ),
    [cards, seed],
  );
  const byId = new Map(cards.map(c => [c.id, c]));
  return (
    <View style={styles.wrap} testID={testID}>
      {order.map(id => {
        const card = byId.get(id)!;
        const on = chosen === id;
        return (
          <Pressable
            key={id}
            disabled={readonly}
            onPress={() => {
              setTried(x => (x.includes(id) ? x : [...x, id]));
              onPick(id);
            }}
            style={[
              styles.card,
              on && styles.on,
              !on && tried.includes(id) && styles.tried,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: readonly }}
            testID={`pick-card-${id}`}
          >
            <View style={styles.text}>
              <RichView rich={card.text} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: theme.space.sm, gap: theme.space.xs },
  card: {
    minHeight: theme.size.touch,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  on: {
    backgroundColor: theme.color.surfaceSelected,
    borderColor: theme.color.ink,
  },
  tried: { borderStyle: 'dashed' },
  text: { flex: 1 },
});
