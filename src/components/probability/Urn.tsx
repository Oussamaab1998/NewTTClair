import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { RichView } from '../../lesson/feed/RichView';
import type { Outcome } from '../../engine/probability';
import { useEmit, type ViewProps } from '../host';
import { ballLabels, outcomeLabel, valueExpression, valueOf } from './logic';
import type { UrnProps } from './schemas';
import { Panel, Readout, styles as ui } from './ui';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ selected: z.array(z.string()) });

/**
 * The urn: balls with their values; in "select" mode the student draws k balls
 * by tapping them (teaches the sample space and the simultaneous draw).
 */
export function Urn(p: ViewProps<UrnProps>) {
  const { t } = useTranslation();
  const { balls, draw, k, mode, markDuplicates, valueFn, insight } = p.props;
  const labels = useMemo(
    () => ballLabels(balls, markDuplicates),
    [balls, markDuplicates],
  );
  const initial = useMemo(() => {
    const snap = SnapshotSchema.safeParse(p.snapshot);
    return snap.success ? snap.data.selected : p.props.selected ?? [];
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sel = useRef<string[]>(initial);
  const [selected, setSelected] = useState<string[]>(initial);
  const emit = useEmit('Urn', p);
  const canTap = p.mode === 'interactive' && mode === 'select';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ selected }) }),
    [selected],
  );

  const toggle = useCallback(
    (id: string) => {
      const prev = sel.current;
      let next: string[];
      let replaced: string | undefined;
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else if (prev.length >= k) {
        // Full: the oldest ball goes back into the urn.
        replaced = prev[0];
        next = [...prev.slice(1), id];
      } else {
        next = [...prev, id];
      }
      sel.current = next;
      setSelected(next);
      emit('ball_toggled', {
        ballId: id,
        selected: next.includes(id),
        ...(replaced !== undefined && { replaced }),
      });
      if (next.length === k && next.includes(id)) {
        const o = drawnOutcome(balls, next);
        emit('selection_complete', {
          ballIds: o.ballIds,
          outcomeId: o.id,
          ...(valueFn && { value: valueOf(valueFn, o) }),
        });
      }
    },
    [balls, emit, k, valueFn],
  );

  const complete = selected.length === k ? drawnOutcome(balls, selected) : null;

  return (
    <Panel testID={`urn-${p.instanceId}`}>
      <View style={styles.urn}>
        {balls.map(b => {
          const on = selected.includes(b.id);
          return (
            <Pressable
              key={b.id}
              disabled={!canTap}
              onPress={() => toggle(b.id)}
              accessibilityRole={canTap ? 'button' : 'image'}
              accessibilityLabel={labels.get(b.id)}
              accessibilityState={{ selected: on, disabled: !canTap }}
              testID={`urn-ball-${b.id}`}
              style={[styles.ball, on && styles.ballOn]}
            >
              <Text style={[styles.ballText, on && styles.ballTextOn]}>
                {labels.get(b.id)}
              </Text>
              {on && (
                <Text style={styles.check}>{theme.feedback.success.icon}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {canTap && !complete && (
        <Text style={ui.readoutLabel}>{t('proba.urn.pick')}</Text>
      )}
      {complete && (
        <Readout
          label={t('proba.urn.draw')}
          value={`${outcomeLabel(complete, labels, draw)}${
            valueFn ? `   ${valueExpression(valueFn, complete)}` : ''
          }`}
          testID="urn-readout"
        />
      )}
      {insight && <RichView rich={insight} fontSize={theme.font.size.body} />}
    </Panel>
  );
}

/** The drawn balls in urn order (a simultaneous draw has no order). */
function drawnOutcome(
  balls: UrnProps['balls'],
  ids: readonly string[],
): Outcome {
  const chosen = balls.filter(b => ids.includes(b.id));
  return {
    id: chosen.map(b => b.id).join('-'),
    ballIds: chosen.map(b => b.id),
    balls: chosen,
  };
}

const styles = StyleSheet.create({
  urn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.xl,
    paddingHorizontal: theme.space.sm,
    borderWidth: theme.border.thick,
    borderTopWidth: 0,
    borderColor: theme.color.textSecondary,
    borderBottomLeftRadius: theme.radius.urnBase,
    borderBottomRightRadius: theme.radius.urnBase,
    direction: 'ltr',
  },
  ball: {
    width: theme.size.urnBall,
    height: theme.size.urnBall,
    borderRadius: theme.size.urnBall / 2,
    borderWidth: theme.border.thick,
    borderColor: theme.color.textPrimary,
    backgroundColor: theme.color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballOn: {
    backgroundColor: theme.color.actionPrimary,
    borderColor: theme.color.actionPrimary,
    transform: [{ translateY: theme.offset.ballLift }],
  },
  ballText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.reading,
    color: theme.color.textPrimary,
  },
  ballTextOn: { color: theme.color.textOnAccent },
  check: {
    position: 'absolute',
    top: theme.offset.ballBadgeOutset,
    right: theme.offset.ballBadgeOutset,
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.caption,
    color: theme.color.textOnAccent,
    backgroundColor: theme.feedback.success.text,
    borderRadius: theme.size.checkBadge / 2,
    width: theme.size.checkBadge,
    height: theme.size.checkBadge,
    textAlign: 'center',
    overflow: 'hidden',
  },
});
