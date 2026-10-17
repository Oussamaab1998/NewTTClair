import React, { useImperativeHandle, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { fractionToLatex } from '../../engine/format';
import { probability, satisfies } from '../../engine/probability';
import { sub } from '../../engine/rational';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { ballLabels, formatFraction, outcomeLabel, outcomesOf } from './logic';
import type { ComplementViewProps } from './schemas';
import { ActionButton, OutcomeChip, Panel, styles as ui } from './ui';
import { theme } from '../../theme';

type Side = 'event' | 'complement';

const SnapshotSchema = z.object({
  revealed: z.boolean(),
  showOutcomes: z.boolean(),
});

const UNKNOWN = '?';

/**
 * A bar split into p(E) and p(Ē). One side is known; tapping the "?" side
 * reveals it through the identity p(E) = 1 − p(Ē), written on its own line
 * (teaches "au moins un" through the complement).
 */
export function ComplementView(p: ViewProps<ComplementViewProps>) {
  const { t } = useTranslation();
  const { balls, draw, k, event, valueFn, direction, interactive, labels } =
    p.props;
  const outcomes = useMemo(
    () => outcomesOf({ balls, draw, k }),
    [balls, draw, k],
  );
  const ctx = useMemo(() => (valueFn ? { valueFn } : {}), [valueFn]);
  const pE = useMemo(
    () => probability(event, outcomes, ctx),
    [ctx, event, outcomes],
  );
  const pNotE = sub([1, 1], pE.reduced);
  const nameE = labels?.event ?? 'E';
  const nameNotE = labels?.complement ?? '\\bar{E}';
  const known: Side = direction === 'from_complement' ? 'complement' : 'event';
  const unknown: Side = known === 'event' ? 'complement' : 'event';

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { revealed: false, showOutcomes: false };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [revealedState, setRevealed] = useState(initial.revealed);
  const [showOutcomes, setShowOutcomes] = useState(initial.showOutcomes);
  const emit = useEmit('ComplementView', p);
  const live = p.mode === 'interactive' && interactive;
  // Static or readonly views show everything.
  const revealed = revealedState || !interactive || p.mode === 'readonly';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({ revealed: revealedState, showOutcomes }),
    }),
    [revealedState, showOutcomes],
  );

  const pOf = (side: Side) => (side === 'event' ? pE.reduced : pNotE);
  const nameOf = (side: Side) => (side === 'event' ? nameE : nameNotE);
  const shown = (side: Side) => side === known || revealed;
  const reveal = () => {
    if (!live || revealedState) {
      return;
    }
    setRevealed(true);
    emit('fraction_revealed', { side: unknown, fraction: [...pOf(unknown)] });
  };

  const nE = pE.num;
  const labelsMap = useMemo(() => ballLabels(balls, true), [balls]);
  const identity = `p(${nameOf(unknown)}) = 1 - p(${nameOf(known)})`;
  const computed = `p(${nameOf(unknown)}) = 1 - ${fractionToLatex(
    pOf(known),
  )} = ${fractionToLatex(pOf(unknown))}`;

  return (
    <Panel testID={`complement-${p.instanceId}`}>
      <View style={styles.bar}>
        {(['event', 'complement'] as const).map(side => {
          const count = side === 'event' ? nE : outcomes.length - nE;
          if (count === 0) {
            return null;
          }
          const isUnknown = !shown(side);
          return (
            <Pressable
              key={side}
              onPress={side === unknown ? reveal : undefined}
              disabled={!live || side !== unknown || revealedState}
              accessibilityRole="button"
              accessibilityLabel={`p ${side === 'event' ? 'E' : 'not E'} ${
                isUnknown ? UNKNOWN : formatFraction(pOf(side))
              }`}
              testID={`complement-side-${side}`}
              style={[
                styles.segment,
                { flex: count },
                side === 'event' ? styles.eventSide : styles.complementSide,
                isUnknown && styles.unknown,
              ]}
            >
              <MathBlock
                latex={`p(${nameOf(side)})`}
                fontSize={theme.font.size.callout}
              />
              <Text style={styles.value} testID={`complement-value-${side}`}>
                {isUnknown ? UNKNOWN : formatFraction(pOf(side))}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <MathBlock latex={identity} fontSize={theme.font.size.bodyLarge} />
      {revealed && (
        <MathBlock latex={computed} fontSize={theme.font.size.bodyLarge} />
      )}
      {live && !revealedState && (
        <Text style={ui.readoutLabel}>{t('proba.complement.hint')}</Text>
      )}
      <ActionButton
        label={t(
          showOutcomes
            ? 'proba.complement.hideOutcomes'
            : 'proba.complement.showOutcomes',
        )}
        disabled={p.mode !== 'interactive'}
        onPress={() => {
          setShowOutcomes(!showOutcomes);
          emit('complement_toggled', { showing: !showOutcomes });
        }}
        testID="complement-toggle"
      />
      {showOutcomes &&
        (['event', 'complement'] as const).map(side => (
          <View key={side} style={styles.group}>
            <MathBlock
              latex={nameOf(side)}
              fontSize={theme.font.size.callout}
            />
            <View style={ui.grid}>
              {outcomes
                .filter(o => satisfies(event, o, ctx) === (side === 'event'))
                .map(o => (
                  <OutcomeChip
                    key={o.id}
                    id={o.id}
                    label={outcomeLabel(o, labelsMap, draw)}
                    mark={side === 'event' ? 'correct' : null}
                    disabled
                    testIDPrefix={`complement-${side}`}
                  />
                ))}
            </View>
          </View>
        ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    direction: 'ltr',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    minHeight: theme.size.complementBarMinHeight,
  },
  segment: {
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.xs,
  },
  eventSide: { backgroundColor: theme.feedback.success.surface },
  complementSide: { backgroundColor: theme.color.backgroundApp },
  unknown: {
    borderWidth: theme.border.thick,
    borderStyle: 'dashed',
    borderColor: theme.color.actionPrimary,
  },
  value: {
    fontSize: theme.font.size.reading,
    fontWeight: theme.font.weight.bold,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  group: { gap: theme.space.xxs },
});
