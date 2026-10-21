import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Circle, Line } from 'react-native-svg';
import { z } from 'zod';

import { derivative, evalFn, fnEntry, type Sign } from '../../engine/analysis';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { Note, styles as ui } from '../probability/ui';
import { CompactRow, Expandable } from './Expandable';
import { useInterval } from './FunctionPlot';
import { MathReadout } from './MathReadout';
import { PlotCanvas, type Curve } from './PlotCanvas';
import {
  autoRange,
  cleanSlope,
  lineAcross,
  readoutNumber,
  regionOf,
  variationColumns,
  type Interval,
  type View,
} from './plot';
import type { TangentSlopeProps } from './schemas';
import { Slider } from './Slider';
import { VariationGrid } from './VariationGrid';
import { theme } from '../../theme';

const SnapshotSchema = z.object({
  x: z.number(),
  visited: z.array(z.number().int().min(0)),
});
const P = theme.plot;

export const ARROW: Record<Sign, string> = { '+': '↗', '-': '↘' };
export type Trend = 'up' | 'down' | 'flat';
export const trendOf = (slope: number): Trend =>
  slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat';

/**
 * x slider with the tangent and its slope; the direction is said in words
 * and arrows (not color alone). With `showTable`, each visited region fills
 * its f' sign and arrow in a mini variation table.
 */
export function TangentSlope(p: ViewProps<TangentSlopeProps>) {
  const { t } = useTranslation();
  const { fn, x0, step, showTable } = p.props;
  const domain = useInterval(p.props.domain);
  const given = p.props.range;
  const range = useMemo<Interval>(
    () => (given ? [given[0]!, given[1]!] : autoRange(fn, domain)),
    [given, fn, domain],
  );
  const cols = useMemo(() => variationColumns(fn, domain), [fn, domain]);
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { x: x0, visited: [regionOf(cols, x0)] };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [x, setX] = useState(initial.x);
  const [visited, setVisited] = useState<number[]>(initial.visited);
  const y = evalFn(fn, x);
  const slope = cleanSlope(derivative(fn, x));
  const trend = trendOf(slope);
  const emit = useEmit('TangentSlope', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ x, slope, visited }) }),
    [x, slope, visited],
  );

  const onChange = (v: number) => {
    setX(v);
    const r = regionOf(cols, v);
    if (!visited.includes(r)) {
      setVisited([...visited, r]);
      emit('region_visited', { region: r, sign: cols.signs[r]! });
    }
  };

  const curves = useMemo<Curve[]>(() => [{ fn, role: 'main' }], [fn]);
  const overlay = useCallback(
    (v: View) => (
      <>
        <Line
          {...lineAcross(v, x, y, slope)}
          stroke={P.color.tangent}
          strokeWidth={P.secondCurveWidth}
          testID="tangent-line"
        />
        <Circle
          cx={v.px(x)}
          cy={v.py(y)}
          r={P.markerRadius}
          fill={P.color.marker}
        />
      </>
    ),
    [x, y, slope],
  );

  const shown = (i: number) => p.mode === 'readonly' || visited.includes(i);
  const points = cols.xs.map((c, i) => {
    const inner = i > 0 && i < cols.xs.length - 1;
    const both = shown(i - 1) && shown(i);
    return {
      x: readoutNumber(c),
      ...(inner && both && { fprime: '0' }),
      ...(both && inner && { value: readoutNumber(evalFn(fn, c)) }),
    };
  });
  const cell = (s: string, id: string) => (
    <Text style={ui.ltr} testID={id}>
      {s}
    </Text>
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
      min={domain[0]}
      max={domain[1]}
      step={step}
      value={x}
      onChange={onChange}
      onCommit={v =>
        emit('x_changed', { x: v, slope: cleanSlope(derivative(fn, v)) })
      }
      disabled={!live}
      accessibilityLabel={t('analysis.point.slider')}
      testID={`tangent-slider-${p.instanceId}`}
    />
  );
  const readouts = (small: boolean) => (
    <>
      <MathReadout
        latex="x"
        value={x}
        decimal
        small={small}
        testID="tangent-x"
      />
      <MathReadout
        latex="f'(x)"
        value={slope}
        approx
        small={small}
        testID="tangent-slope"
      />
    </>
  );
  const trendShort = t(`analysis.tangent.${trend}Short`);

  return (
    <Expandable
      name="TangentSlope"
      testID={`tangent-${p.instanceId}`}
      prefix="tangent"
      onToggle={expanded => emit('expanded_toggled', { expanded })}
      renderCompact={expand => (
        <>
          <CompactRow
            plot={plot(theme.plot.compactHeight)}
            expand={expand}
            head={readouts(true)}
            side={
              <Text style={ui.readoutLabel} testID="tangent-trend">
                {trendShort}
              </Text>
            }
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
          {readouts(false)}
          <Note
            tone="info"
            text={t(`analysis.tangent.${trend}`)}
            testID="tangent-trend"
          />
          {showTable && (
            <VariationGrid
              points={points}
              intervals={cols.signs.map((s, i) => ({
                sign: cell(shown(i) ? s : '?', `tangent-sign-${i}`),
                arrow: cell(shown(i) ? ARROW[s] : '?', `tangent-arrow-${i}`),
              }))}
              testID="tangent-table"
            />
          )}
        </>
      }
    />
  );
}
