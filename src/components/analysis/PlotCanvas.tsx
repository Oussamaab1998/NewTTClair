import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View as RNView,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { evalFn, type FnId } from '../../engine/analysis';
import {
  curvePath,
  makeView,
  plainNumber,
  sampleCurve,
  shadePath,
  signedPaths,
  type Interval,
  type View,
} from './plot';
import type { Marker } from './schemas';
import { theme } from '../../theme';

export interface Curve {
  fn: FnId;
  /** main: the studied function; second: a comparison curve. */
  role: 'main' | 'second';
  /** Solid where f > 0, dashed where f < 0. */
  bySign?: boolean;
}

export interface Shade {
  fn: FnId;
  from: number;
  to: number;
  sign: 'auto' | 'pos' | 'neg';
}

interface Props {
  domain: Interval;
  range: Interval;
  curves: readonly Curve[];
  markers?: readonly Marker[];
  shade?: Shade;
  /** Extra SVG drawn on top (sliders' points, tangents), in pixel space. */
  overlay?: (view: View) => React.ReactNode;
  /** Receives the view once laid out (touch -> x). */
  onView?: (view: View) => void;
  testID?: string;
  accessibilityLabel?: string;
  /** Default theme.plot.height; compact / expanded views pass theirs. */
  height?: number;
}

const P = theme.plot;

/**
 * Axes, curves, markers and shading from engine samples. Paths are computed
 * once per width and props; only `overlay` changes while a slider moves.
 */
export function PlotCanvas(p: Props) {
  const [width, setWidth] = useState<number>(P.defaultWidth);
  const { domain, range, curves, markers, shade, onView } = p;
  const height = p.height ?? P.height;
  const view = useMemo(
    () => makeView(domain, range, width, height, P.pad),
    [domain, range, width, height],
  );
  const paths = useMemo(
    () =>
      curves.map(c =>
        c.bySign
          ? signedPaths(c.fn, domain, view).map(r => ({
              ...c,
              d: r.d,
              dashed: r.sign === '-',
              stroke: r.sign === '-' ? P.color.negative : P.color.positive,
            }))
          : [
              {
                ...c,
                d: curvePath(sampleCurve(c.fn, domain), view),
                dashed: false,
                stroke: c.role === 'main' ? P.color.curve : P.color.secondCurve,
              },
            ],
      ),
    [curves, domain, view],
  );
  const shadeD = useMemo(
    () => (shade ? shadePath(shade.fn, shade.from, shade.to, view) : null),
    [shade, view],
  );
  const shadeFill =
    shade?.sign === 'neg' || (shade?.sign === 'auto' && shade.from > shade.to)
      ? P.color.shadeNegative
      : P.color.shadePositive;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) {
      setWidth(w);
    }
  };
  React.useEffect(() => {
    onView?.(view);
  }, [onView, view]);

  const [lo, hi] = range;
  const [a, b] = domain;
  const xAxis = lo <= 0 && hi >= 0;
  const yAxis = a <= 0 && b >= 0;

  return (
    <RNView
      onLayout={onLayout}
      testID={p.testID}
      accessible
      {...(p.accessibilityLabel !== undefined && {
        accessibilityLabel: p.accessibilityLabel,
      })}
      style={[styles.box, { height }]}
    >
      <Svg width={width} height={height}>
        {shadeD && (
          <Path d={shadeD} fill={shadeFill} fillOpacity={P.shadeOpacity} />
        )}
        {xAxis && (
          <Line
            x1={0}
            x2={width}
            y1={view.py(0)}
            y2={view.py(0)}
            stroke={P.color.axis}
            strokeWidth={P.axisWidth}
          />
        )}
        {yAxis && (
          <Line
            x1={view.px(0)}
            x2={view.px(0)}
            y1={0}
            y2={height}
            stroke={P.color.axis}
            strokeWidth={P.axisWidth}
          />
        )}
        {(markers ?? []).map((m, i) => (
          <MarkerMark
            key={i}
            index={i}
            marker={m}
            view={view}
            curveFn={curves[0]?.fn}
          />
        ))}
        {paths.flat().map((c, i) => (
          <Path
            key={i}
            d={c.d}
            fill="none"
            stroke={c.stroke}
            testID={`plot-curve-${c.role}${c.dashed ? '-dashed' : ''}`}
            strokeWidth={c.role === 'main' ? P.curveWidth : P.secondCurveWidth}
            {...((c.dashed || c.role === 'second') && {
              strokeDasharray: P.dash,
            })}
          />
        ))}
        {p.overlay?.(view)}
      </Svg>
    </RNView>
  );
}

function MarkerMark({
  index,
  marker: m,
  view,
  curveFn,
}: {
  index: number;
  marker: Marker;
  view: View;
  curveFn: FnId | undefined;
}) {
  const y = m.type === 'point' && curveFn ? evalFn(curveFn, m.at) : NaN;
  const value = !m.showValue
    ? undefined
    : m.type === 'point'
    ? `(${plainNumber(m.at)} ; ${plainNumber(y)})`
    : `${m.type === 'vline' ? 'x' : 'y'} = ${plainNumber(m.at)}`;
  const label = [m.label, value].filter(Boolean).join(' ') || undefined;
  if (m.type === 'point') {
    if (!Number.isFinite(y)) {
      return null;
    }
    return (
      <>
        <Circle
          cx={view.px(m.at)}
          cy={view.py(y)}
          r={P.markerRadius}
          fill={P.color.marker}
        />
        {label && (
          <SvgText
            testID={`plot-marker-label-${index}`}
            x={view.px(m.at) + P.markerRadius + theme.space.xxs}
            y={view.py(y) - P.markerRadius}
            fontSize={P.labelSize}
            fill={P.color.marker}
          >
            {label}
          </SvgText>
        )}
      </>
    );
  }
  const horizontal = m.type !== 'vline';
  const pos = horizontal ? view.py(m.at) : view.px(m.at);
  return (
    <>
      <Line
        x1={horizontal ? 0 : pos}
        x2={horizontal ? view.width : pos}
        y1={horizontal ? pos : 0}
        y2={horizontal ? pos : view.height}
        stroke={P.color.guide}
        strokeWidth={P.guideWidth}
        strokeDasharray={P.dash}
      />
      {label && (
        <SvgText
          testID={`plot-marker-label-${index}`}
          x={horizontal ? view.width - theme.space.xxs : pos + theme.space.xxs}
          y={
            horizontal
              ? // Below the line when there is room: the curve often runs just above it.
                pos + P.labelSize + theme.space.xxs <= view.height
                ? pos + P.labelSize + theme.space.xxs
                : pos - theme.space.xxs
              : P.labelSize + theme.space.xxs
          }
          fontSize={P.labelSize}
          fill={P.color.guide}
          textAnchor={horizontal ? 'end' : 'start'}
        >
          {label}
        </SvgText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  box: { direction: 'ltr' },
});
