import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { JsonObjectSchema, type ComponentHandle } from '../contract';
import { useEmit, type ViewProps } from '../host';
import { RichView } from '../../lesson/feed/RichView';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import type { PredictRevealProps } from './schemas';
import { ChoiceChip } from './ui';
import { theme } from '../../theme';

const SnapshotSchema = z.object({
  predicted: z.string().nullable(),
  revealed: z.boolean(),
  inner: JsonObjectSchema.optional(),
});

/**
 * "What will happen?": the student picks a prediction (logged, not graded),
 * then the inner component is shown, then one insight sentence.
 */
export function PredictReveal(p: ViewProps<PredictRevealProps>) {
  const { t } = useTranslation();
  const { prompt, options, reveal, insight } = p.props;
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { predicted: null, revealed: false };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [predicted, setPredicted] = useState<string | null>(initial.predicted);
  const [revealedState, setRevealed] = useState(initial.revealed);
  const innerRef = useRef<ComponentHandle>(null);
  const emit = useEmit('PredictReveal', p);
  const live = p.mode === 'interactive';
  const revealed = revealedState || p.mode === 'readonly';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => {
        const inner = innerRef.current?.getStateSnapshot();
        return { predicted, revealed: revealedState, ...(inner && { inner }) };
      },
    }),
    [predicted, revealedState],
  );

  const choose = (optionId: string) => {
    if (!live || revealedState) {
      return;
    }
    setPredicted(optionId);
    setRevealed(true);
    emit('predicted', { optionId });
  };
  const skip = () => {
    if (!live || revealedState) {
      return;
    }
    setRevealed(true);
    emit('revealed', { predicted: null });
  };

  return (
    <Panel testID={`predict-${p.instanceId}`}>
      <RichView rich={prompt} fontSize={theme.font.size.bodyLarge} />
      <View style={ui.grid}>
        {options.map(o => (
          <ChoiceChip
            key={o.id}
            selected={predicted === o.id}
            disabled={!live || revealedState}
            onPress={() => choose(o.id)}
            testID={`predict-option-${o.id}`}
          >
            <RichView rich={o.label} fontSize={theme.font.size.body} />
          </ChoiceChip>
        ))}
      </View>
      {!revealed && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={skip}
          testID="predict-reveal"
        />
      )}
      {revealed &&
        p.renderInner?.(reveal, 'reveal', {
          ref: innerRef,
          ...(initial.inner && { snapshot: initial.inner }),
        })}
      {revealed && insight && (
        <RichView
          rich={insight}
          fontSize={theme.font.size.body}
          testID="predict-insight"
        />
      )}
    </Panel>
  );
}
