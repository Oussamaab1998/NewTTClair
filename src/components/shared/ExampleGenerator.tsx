import React, { useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { generateExample } from '../../engine/examples';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { ActionButton, Panel } from '../probability/ui';
import type { ExampleGeneratorProps } from './schemas';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ seed: z.number().int().min(1) });
const MAX_SEED = 10000;

/** An engine-generated example; "another example" moves to the next seed. */
export function ExampleGenerator(p: ViewProps<ExampleGeneratorProps>) {
  const { t } = useTranslation();
  const { templateId } = p.props;
  const initialSeed = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data.seed : p.props.seed;
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [seed, setSeed] = useState(initialSeed);
  const example = useMemo(
    () => generateExample(templateId, seed),
    [templateId, seed],
  );
  const emit = useEmit('ExampleGenerator', p);

  useImperativeHandle(p.ref, () => ({ getStateSnapshot: () => ({ seed }) }), [
    seed,
  ]);

  const another = () => {
    const next = (seed % MAX_SEED) + 1;
    setSeed(next);
    const ex = generateExample(templateId, next);
    emit('example_generated', { templateId, seed: next, params: ex.params });
  };

  return (
    <Panel testID={`example-${p.instanceId}`}>
      {example.lines.map((line, i) => (
        <MathBlock
          key={`${seed}-${i}`}
          latex={line}
          fontSize={theme.font.size.bodyLarge}
        />
      ))}
      <ActionButton
        label={t('primitives.example.another')}
        onPress={another}
        disabled={p.mode !== 'interactive'}
        testID="example-another"
      />
    </Panel>
  );
}
