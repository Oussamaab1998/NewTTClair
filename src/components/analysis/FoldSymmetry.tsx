import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Path } from 'react-native-svg';
import { z } from 'zod';

import { fnEntry } from '../../engine/analysis';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { ActionButton, Note, styles as ui } from '../probability/ui';
import { CompactRow, Expandable } from './Expandable';
import { useInterval } from './FunctionPlot';
import { PlotCanvas } from './PlotCanvas';
import {
  foldOverlap,
  foldPath,
  rightHalfPath,
  unionRange,
  type Interval,
  type View,
} from './plot';
import type { FoldSymmetryProps } from './schemas';
import { Slider } from './Slider';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ k: z.number(), comparing: z.boolean() });
const P = theme.plot;
const FOLD_STEP = 0.05;
const NO_CURVES: never[] = [];

/**
 * Fold the left half of the curve over the y-axis with a slider; at the end
 * the engine says whether it lands on the right half (parity).
 */
export function FoldSymmetry(p: ViewProps<FoldSymmetryProps>) {
  const { t } = useTranslation();
  const { fn, compareFn } = p.props;
  const domain = useInterval(p.props.domain);
  const given = p.props.range;
  const range = useMemo<Interval>(
    () =>
      given
        ? [given[0]!, given[1]!]
        : unionRange(compareFn ? [fn, compareFn] : [fn], domain),
    [given, fn, compareFn, domain],
  );
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { k: 0, comparing: false };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [k, setK] = useState(initial.k);
  const [comparing, setComparing] = useState(
    initial.comparing && compareFn !== undefined,
  );
  const shown = comparing && compareFn ? compareFn : fn;
  const overlap = useMemo(() => foldOverlap(shown, domain[1]), [shown, domain]);
  const done = k >= 1;
  const emit = useEmit('FoldSymmetry', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ k, comparing }) }),
    [k, comparing],
  );

  const overlay = useCallback(
    (v: View) => (
      <>
        <Path
          d={rightHalfPath(shown, domain, v)}
          fill="none"
          stroke={P.color.curve}
          strokeWidth={P.curveWidth}
          testID="fold-right"
        />
        <Path
          d={foldPath(shown, domain, k, v)}
          fill="none"
          stroke={P.color.secondCurve}
          strokeWidth={P.secondCurveWidth}
          strokeDasharray={P.dash}
          testID="fold-left"
        />
      </>
    ),
    [shown, domain, k],
  );

  const commit = (v: number) => {
    emit('fold_changed', { k: v, fn: shown });
    if (v >= 1) {
      emit('fold_complete', { overlap, fn: shown });
    }
  };

  const plot = (height: number) => (
    <PlotCanvas
      domain={domain}
      range={range}
      curves={NO_CURVES}
      overlay={overlay}
      height={height}
      accessibilityLabel={t('analysis.plot.a11y')}
    />
  );
  const slider = (
    <Slider
      min={0}
      max={1}
      step={FOLD_STEP}
      value={k}
      onChange={setK}
      onCommit={commit}
      disabled={!live}
      accessibilityLabel={t('analysis.fold.slider')}
      testID={`fold-slider-${p.instanceId}`}
    />
  );
  const status = done ? (overlap ? 'overlap' : 'noOverlap') : 'hint';
  const statusTone = done ? (overlap ? 'success' : 'warning') : 'info';

  return (
    <Expandable
      name="FoldSymmetry"
      testID={`fold-${p.instanceId}`}
      prefix="fold"
      onToggle={expanded => emit('expanded_toggled', { expanded })}
      renderCompact={expand => (
        <>
          <CompactRow
            plot={plot(theme.plot.compactHeight)}
            expand={expand}
            head={
              <Text
                style={[
                  ui.readoutLabel,
                  { color: theme.feedback[statusTone].text },
                ]}
                testID={done ? 'fold-verdict' : 'fold-hint'}
              >
                {t(`analysis.fold.${status}Short`)}
              </Text>
            }
            side={null}
          />
          {slider}
        </>
      )}
      full={
        <>
          <MathBlock
            latex={fnEntry(shown).latex}
            fontSize={theme.font.size.body}
          />
          {plot(theme.plot.expandedHeight)}
          {slider}
          <Note
            tone={statusTone}
            text={t(`analysis.fold.${status}`)}
            testID={done ? 'fold-verdict' : 'fold-hint'}
          />
          {compareFn && (
            <ActionButton
              label={t(
                comparing ? 'analysis.point.back' : 'analysis.point.compare',
              )}
              onPress={() => {
                setComparing(!comparing);
                emit('compare_toggled', {
                  comparing: !comparing,
                  fn: comparing ? fn : compareFn,
                });
              }}
              disabled={!live}
              testID="fold-compare"
            />
          )}
        </>
      }
    />
  );
}
