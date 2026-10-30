/**
 * The plan frame: coarse step cards in a shuffled pool; the student puts them
 * in order and confirms. Any order that respects what each card uses is
 * right (src/method/frame.ts). One act: the confirm.
 */
import React, { useImperativeHandle, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ComponentHandle } from '../../../components/contract';
import type { Rich } from '../../../content/schema';
import { theme } from '../../../theme';
import { RichView } from '../RichView';

export interface PlanCardItem {
  id: string;
  text: Rich;
}

export interface PlanLabels {
  slot: 'method.plan.slot' | 'method.recipe.slot';
  pool: 'method.plan.pool' | 'method.recipe.pool';
  confirm: 'method.plan.confirm' | 'method.recipe.confirm';
}

interface Props {
  /** The pool, already in its shuffled order. */
  pool: readonly PlanCardItem[];
  readonly: boolean;
  /** Restored or recorded order (readonly shows it). */
  placed?: readonly string[];
  onSubmit: (order: string[]) => void;
  /** Fewest and most cards he must pick (default: all of them, the plan). */
  min?: number;
  max?: number;
  /** i18n keys of the words around the cards (the plan's by default). */
  labels?: PlanLabels;
  testID?: string;
  ref?: Ref<ComponentHandle>;
}

const PLAN_LABELS: PlanLabels = {
  slot: 'method.plan.slot',
  pool: 'method.plan.pool',
  confirm: 'method.plan.confirm',
};

export function PlanCards({
  pool,
  readonly,
  placed: initial = [],
  onSubmit,
  min = pool.length,
  max = pool.length,
  labels = PLAN_LABELS,
  testID = 'plan-cards',
  ref,
}: Props) {
  const { t } = useTranslation();
  const [placed, setPlaced] = useState<string[]>([...initial]);
  useImperativeHandle(ref, () => ({ getStateSnapshot: () => ({ placed }) }), [
    placed,
  ]);
  const byId = new Map(pool.map(c => [c.id, c]));
  const left = pool.filter(c => !placed.includes(c.id));
  const full = placed.length >= min && placed.length <= max;
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.slots}>
        {placed.map((id, i) => (
          <Pressable
            key={id}
            disabled={readonly}
            onPress={() => setPlaced(p => p.filter(x => x !== id))}
            style={[styles.card, styles.placed]}
            accessibilityRole="button"
            accessibilityLabel={t(labels.slot, { n: i + 1 })}
            testID={`plan-slot-${i}`}
          >
            <Text style={styles.badge}>{i + 1}</Text>
            <View style={styles.text}>
              <RichView rich={byId.get(id)!.text} />
            </View>
          </Pressable>
        ))}
      </View>
      {!readonly && left.length > 0 && placed.length < max && (
        <View style={styles.pool}>
          <Text style={styles.poolLabel}>{t(labels.pool)}</Text>
          {left.map(c => (
            <Pressable
              key={c.id}
              onPress={() => setPlaced(p => [...p, c.id])}
              style={styles.card}
              accessibilityRole="button"
              testID={`plan-card-${c.id}`}
            >
              <View style={styles.text}>
                <RichView rich={c.text} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {!readonly && (
        <Pressable
          onPress={() => onSubmit(placed)}
          disabled={!full}
          style={[styles.confirm, !full && styles.confirmOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !full }}
          testID="plan-confirm"
        >
          <Text style={styles.confirmText}>{t(labels.confirm)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: theme.space.sm, gap: theme.space.sm },
  slots: { gap: theme.space.xs },
  pool: { gap: theme.space.xs },
  poolLabel: {
    color: theme.color.textSecondary,
    fontSize: theme.font.size.small,
    textAlign: 'right',
  },
  card: {
    minHeight: theme.size.touch,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  placed: {
    backgroundColor: theme.color.surfaceSelected,
    borderColor: theme.color.ink,
  },
  badge: {
    minWidth: theme.size.touch / 2,
    textAlign: 'center',
    color: theme.color.ink,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
  text: { flex: 1 },
  confirm: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOff: { backgroundColor: theme.color.inkDisabled },
  confirmText: {
    color: theme.color.textOnAccent,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
});
