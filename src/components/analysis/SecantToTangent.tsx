import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Circle, Line } from 'react-native-svg';
import { z } from 'zod';

import { derivative, evalFn, fnEntry } from '../../engine/analysis';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { CompactRow, Expandable } from './Expandable';
import { useInterval } from './FunctionPlot';
import { MathReadout } from './MathReadout';
import { PlotCanvas, type Curve } from './PlotCanvas';
import {
  autoRange,
  cleanSlope,
  lineAcross,
  type Interval,
  type View,
} from './plot';
import type { SecantToTangentProps } from './schemas';
import { Slider } from './Slider';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ hIndex: z.number().int().min(0) });
const P = theme.plot;

export const secantSlope = (
  fn: SecantToTangentProps['fn'],
  x0: number,
  h: number,
) => (evalFn(fn, x0 + h) - evalFn(fn, x0)) / h;

/**
 * What f' means: the second point slides towards (x0, f(x0)) as h shrinks,
 * and the secant slope approaches the tangent slope.
 */
export function SecantToTangent(p: ViewProps<SecantToTangentProps>) {
  const { t } = useTranslation();
  const { fn, x0, hSteps } = p.props;
  const domain = useInterval(p.props.domain);
  const given = p.props.range;
  const range = useMemo<Interval>(
    () => (given ? [given[0]!, given[1]!] : autoRange(fn, domain)),
    [given, fn, domain],
  );
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? Math.min(s.data.hIndex, hSteps.length - 1) : 0;
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [i, setI] = useState(initial);
  const h = hSteps[i]!;
  const y0 = evalFn(fn, x0);
  const yh = evalFn(fn, x0 + h);
  const secant = secantSlope(fn, x0, h);
  const tangent = useMemo(() => cleanSlope(derivative(fn, x0)), [fn, x0]);
  const emit = useEmit('SecantToTangent', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({ hIndex: i, h, secantSlope: secant }),
    }),
    [i, h, secant],
  );

  const curves = useMemo<Curve[]>(() => [{ fn, role: 'main' }], [fn]);
  const overlay = useCallback(
    (v: View) => (
      <>
        <Line
          {...lineAcross(v, x0, y0, tangent)}
          stroke={P.color.tangent}
          strokeWidth={P.secondCurveWidth}
          strokeDasharray={P.dash}
          testID="secant-tangent-line"
        />
        <Line
          {...lineAcross(v, x0, y0, secant)}
          stroke={P.color.secondCurve}
          strokeWidth={P.secondCurveWidth}
          testID="secant-line"
        />
        <Circle
          cx={v.px(x0)}
          cy={v.py(y0)}
          r={P.markerRadius}
          fill={P.color.marker}
        />
        <Circle
          cx={v.px(x0 + h)}
          cy={v.py(yh)}
          r={P.markerRadius}
          fill={P.color.surface}
          stroke={P.color.marker}
          strokeWidth={P.guideWidth}
        />
      </>
    ),
    [x0, y0, h, yh, secant, tangent],
  );

  const plot = (height: number) => (
    <PlotCanvas
      domain={domain}
      range={range}
      curves={curves}
      overlay={overlay}
      height={height}
      accessibilityLabel={t('analysis.plot.a11y')}
    />
  );
  const slider = (
    <Slider
      min={0}
      max={hSteps.length - 1}
      step={1}
      value={i}
      onChange={setI}
      onCommit={k =>
        emit('h_changed', {
          h: hSteps[k]!,
          secantSlope: secantSlope(fn, x0, hSteps[k]!),
          tangentSlope: tangent,
        })
      }
      disabled={!live}
      accessibilityLabel={t('analysis.secant.slider')}
      testID={`secant-slider-${p.instanceId}`}
    />
  );
  const hReadout = (small: boolean) => (
    <MathReadout latex="h" value={h} decimal small={small} testID="secant-h" />
  );
  const slopes = (small: boolean) => (
    <>
      <MathReadout
        latex="\frac{f(x_0+h)-f(x_0)}{h}"
        value={secant}
        stack={small}
        testID="secant-slope"
      />
      <MathReadout
        latex="f'(x_0)"
        value={tangent}
        approx
        small={small}
        testID="secant-tangent"
      />
    </>
  );

  return (
    <Expandable
      name="SecantToTangent"
      testID={`secant-${p.instanceId}`}
      prefix="secant"
      onToggle={expanded => emit('expanded_toggled', { expanded })}
      renderCompact={expand => (
        <>
          <CompactRow
            plot={plot(theme.plot.compactHeight)}
            expand={expand}
            head={hReadout(true)}
            side={slopes(true)}
          />
          {slider}
        </>
      )}
      full={
        <>
          <MathBlock
            latex={fnEntry(fn).latex}
            fontSize={theme.font.size.body}
          />
          {plot(theme.plot.expandedHeight)}
          {slider}
          <MathReadout latex="x_0" value={x0} decimal testID="secant-x0" />
          {hReadout(false)}
          {slopes(false)}
        </>
      }
    />
  );
}
