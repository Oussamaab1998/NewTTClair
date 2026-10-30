/**
 * He lists the groups himself: tap the balls of one group, add it, repeat;
 * "that is all" is the one act (the help comes back in the feed and never
 * says how many are missing). A group already listed is merged, not added
 * twice. Chip adds and ball taps are not acts.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../../theme';

export interface ListBall {
  id: string;
  label: string;
}

interface Props {
  balls: readonly ListBall[];
  /** Balls in one group. */
  size: number;
  readonly: boolean;
  initial?: readonly (readonly string[])[];
  onSubmit: (list: string[][]) => void;
  testID?: string;
}

const same = (a: readonly string[], b: readonly string[]) =>
  [...a].sort().join('-') === [...b].sort().join('-');

export function ListBuilder({
  balls,
  size,
  readonly,
  initial = [],
  onSubmit,
  testID = 'list-builder',
}: Props) {
  const { t } = useTranslation();
  const [list, setList] = useState<string[][]>(initial.map(g => [...g]));
  const [current, setCurrent] = useState<string[]>([]);
  const label = (id: string) => balls.find(b => b.id === id)?.label ?? id;
  const canAdd = current.length === size;
  const add = () => {
    if (!canAdd) {
      return;
    }
    setList(l => (l.some(g => same(g, current)) ? l : [...l, current]));
    setCurrent([]);
  };
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.balls}>
        {balls.map(b => {
          const on = current.includes(b.id);
          return (
            <Pressable
              key={b.id}
              disabled={readonly || (!on && current.length >= size)}
              onPress={() =>
                setCurrent(c =>
                  c.includes(b.id) ? c.filter(x => x !== b.id) : [...c, b.id],
                )
              }
              style={[styles.ball, on && styles.ballOn]}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              accessibilityState={{ selected: on }}
              testID={`list-ball-${b.id}`}
            >
              <Text style={styles.ballText}>{b.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {!readonly && (
        <Pressable
          onPress={add}
          disabled={!canAdd}
          style={[styles.action, !canAdd && styles.actionOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdd }}
          testID="list-add"
        >
          <Text style={styles.actionText}>{t('method.list.add')}</Text>
        </Pressable>
      )}
      <View style={styles.groups}>
        {list.map((g, i) => (
          <View
            key={g.join('-')}
            style={styles.group}
            testID={`list-group-${i}`}
          >
            <Text style={styles.groupText}>{g.map(label).join('  ')}</Text>
            {!readonly && (
              <Pressable
                onPress={() => setList(l => l.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={t('method.list.remove')}
                style={styles.remove}
                testID={`list-remove-${i}`}
              >
                <Text style={styles.removeText}>{t('method.list.remove')}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {!readonly && (
        <Pressable
          onPress={() => onSubmit(list)}
          disabled={list.length === 0}
          style={[styles.confirm, list.length === 0 && styles.actionOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: list.length === 0 }}
          testID="list-done"
        >
          <Text style={styles.confirmText}>{t('method.list.done')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: theme.space.sm, gap: theme.space.sm },
  balls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
    direction: 'ltr',
  },
  ball: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballOn: {
    backgroundColor: theme.color.surfaceSelected,
    borderColor: theme.color.ink,
  },
  ballText: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  groups: { gap: theme.space.xs },
  group: {
    minHeight: theme.size.touch,
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.md,
    borderBottomWidth: theme.border.line,
    borderBottomColor: theme.color.gridLine,
  },
  groupText: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  remove: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: theme.color.textSecondary,
    fontSize: theme.font.size.body,
  },
  action: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOff: { opacity: theme.opacity.disabled },
  actionText: {
    color: theme.color.ink,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
  confirm: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: theme.color.textOnAccent,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
});
