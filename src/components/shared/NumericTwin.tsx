import React, { useImperativeHandle, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { MathBlock } from '../../lesson/math/MathBlock';
import { RichView } from '../../lesson/feed/RichView';
import { useEmit, type ViewProps } from '../host';
import { Note, Panel, styles as ui } from '../probability/ui';
import { equalsLatex, numericTwin } from './logic';
import type { NumericTwinProps } from './schemas';
import { ChoiceChip } from './ui';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ value: z.number().nullable() });

/**
 * Replace the scary part by a number: the student picks a value for the
 * symbol and reads both expressions computed with it.
 */
export function NumericTwin(p: ViewProps<NumericTwinProps>) {
  const { t } = useTranslation();
  const { symbol, template, compare, values, label } = p.props;
  const twin = useMemo(
    () => numericTwin(symbol, template, compare),
    [symbol, template, compare],
  );
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data.value : null;
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [value, setValue] = useState<number | null>(initial);
  const emit = useEmit('NumericTwin', p);
  const row = value === null ? null : twin.row(value);

  useImperativeHandle(p.ref, () => ({ getStateSnapshot: () => ({ value }) }), [
    value,
  ]);

  const pick = (v: number) => {
    if (p.mode !== 'interactive') {
      return;
    }
    setValue(v);
    const r = twin.row(v);
    emit('value_changed', {
      symbol,
      value: v,
      template: r.template,
      ...(r.compare !== undefined && { compare: r.compare }),
      ...(r.equal !== undefined && { equal: r.equal }),
    });
  };

  return (
    <Panel testID={`twin-${p.instanceId}`}>
      {label && <RichView rich={label} fontSize={theme.font.size.body} />}
      <Text style={ui.readoutLabel}>{t('primitives.twin.tryValue')}</Text>
      <View style={ui.grid}>
        {values.map(v => (
          <ChoiceChip
            key={v}
            selected={value === v}
            disabled={p.mode !== 'interactive'}
            onPress={() => pick(v)}
            accessibilityLabel={`${symbol} = ${v}`}
            testID={`twin-value-${v}`}
          >
            <MathBlock
              latex={`${symbol}${equalsLatex(v)}`}
              fontSize={theme.font.size.body}
            />
          </ChoiceChip>
        ))}
      </View>
      <MathBlock
        latex={
          row
            ? `${twin.templateLatex}${equalsLatex(row.template)}`
            : twin.templateLatex
        }
        fontSize={theme.font.size.bodyLarge}
      />
      {twin.compareLatex !== undefined && (
        <MathBlock
          latex={
            row?.compare !== undefined
              ? `${twin.compareLatex}${equalsLatex(row.compare)}`
              : twin.compareLatex
          }
          fontSize={theme.font.size.bodyLarge}
        />
      )}
      {row?.equal !== undefined && (
        <Note
          tone={row.equal ? 'success' : 'warning'}
          text={t(
            row.equal ? 'primitives.twin.equal' : 'primitives.twin.different',
          )}
          testID="twin-verdict"
        />
      )}
    </Panel>
  );
}
