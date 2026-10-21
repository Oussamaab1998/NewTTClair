import React, { useImperativeHandle, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { MathBlock } from '../../lesson/math/MathBlock';
import { RichView } from '../../lesson/feed/RichView';
import { useEmit, type ViewProps } from '../host';
import { ActionButton, Panel } from '../probability/ui';
import type { StepThroughProps } from './schemas';
import { theme } from '../../theme';

const SnapshotSchema = z.object({
  shown: z.number().int().min(1),
  why: z.array(z.number().int()),
});

/** One step at a time; each step's reason behind a "why?" button. */
export function StepThrough(p: ViewProps<StepThroughProps>) {
  const { t } = useTranslation();
  const { steps } = p.props;
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { shown: 1, why: [] };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [shownState, setShown] = useState(initial.shown);
  const [why, setWhy] = useState<number[]>(initial.why);
  const emit = useEmit('StepThrough', p);
  const live = p.mode === 'interactive';
  const shown =
    p.mode === 'readonly' ? steps.length : Math.min(shownState, steps.length);

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ shown: shownState, why }) }),
    [shownState, why],
  );

  const next = () => {
    if (!live || shownState >= steps.length) {
      return;
    }
    setShown(shownState + 1);
    emit('step_revealed', { index: shownState });
  };
  const toggleWhy = (i: number) => {
    if (!live) {
      return;
    }
    const open = !why.includes(i);
    setWhy(open ? [...why, i] : why.filter(w => w !== i));
    if (open) {
      emit('why_opened', { index: i });
    }
  };

  return (
    <Panel testID={`steps-${p.instanceId}`}>
      {steps.slice(0, shown).map((s, i) => (
        <View key={i} testID={`steps-step-${i}`}>
          {s.text && <RichView rich={s.text} fontSize={theme.font.size.body} />}
          {s.math && (
            <MathBlock latex={s.math} fontSize={theme.font.size.bodyLarge} />
          )}
          {s.why && (
            <ActionButton
              label={t(
                why.includes(i)
                  ? 'primitives.steps.hideWhy'
                  : 'primitives.steps.why',
              )}
              onPress={() => toggleWhy(i)}
              disabled={!live}
              testID={`steps-why-${i}`}
            />
          )}
          {s.why && why.includes(i) && (
            <RichView rich={s.why} fontSize={theme.font.size.callout} />
          )}
        </View>
      ))}
      {live && shown < steps.length && (
        <ActionButton
          label={t('primitives.steps.next')}
          onPress={next}
          primary
          testID="steps-next"
        />
      )}
    </Panel>
  );
}
