import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { frac } from '../../engine/rational';
import { ratToLatex } from '../../engine/rationalFormat';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import type { UrnTemplateProps } from './schemas';
import { Dots } from './ui';
import { urnExample, urnFinding } from './urnExample';

/** "Another example" can be asked this many times (the schema proved every one exists). */
const MAX_BUMPS = 4;

const SnapshotSchema = z.object({
  bump: z.number().int().min(0).max(MAX_BUMPS),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/**
 * A worked example on a FRESH urn, built and checked by the engine, so a
 * student who was just shown an answer sees the same method on other numbers
 * (and cannot copy the answer: it is never the parent step's answer, nor one
 * of its known wrong values). Seeded: the same props show the same example;
 * "another example" moves to the next seed. Opens its gate (`explored`) at
 * the first "another example"; "I do not know, show me" opens it as skipped.
 */
export function UrnTemplate(p: ViewProps<UrnTemplateProps>) {
  const { t } = useTranslation();
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { bump: 0, explored: null as 'done' | 'skipped' | null };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [bump, setBump] = useState(initial.bump);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const route = useRef<string[]>([]);
  const emit = useEmit('UrnTemplate', p);
  const live = p.mode === 'interactive';
  const v = useMemo(() => urnExample(p.props, bump), [p.props, bump]);

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ bump, explored }) }),
    [bump, explored],
  );

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped') => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit('finding', urnFinding(v, route.current, how === 'done' ? 'found' : 'skipped'));
    },
    [emit, v],
  );

  const another = () => {
    if (!live || bump >= MAX_BUMPS) {
      return;
    }
    const next = bump + 1;
    route.current.push(`example:${next}`);
    setBump(next);
    const w = urnExample(p.props, next);
    emit('example_requested', { seed: w.seed, templateId: w.templateId });
    finish('another_example', 'done');
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    route.current.push('reveal');
    finish('reveal', 'skipped');
  };

  const urnItems = [
    ...Array.from({ length: v.urn.reds }, (_, i) => ({
      id: `r${i + 1}`,
      label: `R${i + 1}`,
      color: 'red' as const,
    })),
    ...Array.from({ length: v.urn.blacks }, (_, i) => ({
      id: `n${i + 1}`,
      label: `N${i + 1}`,
      color: 'black' as const,
    })),
  ];

  return (
    <Panel testID={`urn-template-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}
      <Text style={ui.readoutLabel}>{t('pv2.urn.caption')}</Text>

      {v.templateId === 'urn_exactly_j' ? (
        <>
          <View style={styles.dots} testID="urn-balls">
            <Dots items={urnItems} />
          </View>
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.urn.drawn')}</Text>
            <MathBlock latex={String(v.urn.k)} fontSize={theme.font.size.bodyLarge} />
          </View>
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.urn.exactly')}</Text>
            <MathBlock latex={String(v.j)} fontSize={theme.font.size.bodyLarge} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.urn.trials')}</Text>
            <MathBlock latex={String(v.urn.k)} fontSize={theme.font.size.bodyLarge} />
          </View>
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.urn.success')}</Text>
            <MathBlock latex={ratToLatex(v.p ?? frac(1, 2))} fontSize={theme.font.size.bodyLarge} />
          </View>
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.urn.exactlyTrials')}</Text>
            <MathBlock latex={String(v.j)} fontSize={theme.font.size.bodyLarge} />
          </View>
        </>
      )}

      <View style={styles.pair} testID="urn-lines">
        <Text style={ui.readoutLabel}>{t('pv2.urn.solution')}</Text>
        {v.lines.map(line => (
          <MathBlock key={line} latex={line} fontSize={theme.font.size.bodyLarge} />
        ))}
      </View>
      {live && bump < MAX_BUMPS && (
        <ActionButton
          label={t('pv2.urn.another')}
          primary
          onPress={another}
          testID="urn-another"
        />
      )}
      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="urn-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  pair: { gap: theme.space.xxs },
  dots: { flexDirection: theme.mathSide.row, flexWrap: 'wrap' },
});
