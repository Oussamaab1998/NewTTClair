import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Circle, Line, Text as SvgText } from 'react-native-svg';
import { z } from 'zod';

import { evalFn, fnEntry } from '../../engine/analysis';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { ActionButton, Note, styles as ui } from '../probability/ui';
import { CompactRow, Expandable } from './Expandable';
import { useInterval } from './FunctionPlot';
import { PlotCanvas, type Curve } from './PlotCanvas';
import {
  fnName,
  readoutPair,
  unionRange,
  valueLine,
  type Interval,
} from './plot';
import type { PointOnCurveProps } from './schemas';
import { Slider } from './Slider';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ x: z.number(), comparing: z.boolean() });
const P = theme.plot;

/** Same height on both sides (relative 1e-9). */
export const sameHeight = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * x slider with the live point (x, f(x)) and its mirror (−x, f(−x)):
 * the student sees whether both heights agree (parity). A toggle swaps in a
 * comparison function.
 */
export function PointOnCurve(p: ViewProps<PointOnCurveProps>) {
  const { t } = useTranslation();
  const { fn, x0, showMirror, compareFn, step } = p.props;
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
    return s.success ? s.data : { x: x0, comparing: false };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [x, setX] = useState(initial.x);
  const [comparing, setComparing] = useState(
    initial.comparing && compareFn !== undefined,
  );
  const shown = comparing && compareFn ? compareFn : fn;
  const name = fnName(shown);
  const fx = evalFn(shown, x);
  const fmx = evalFn(shown, -x);
  const emit = useEmit('PointOnCurve', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ x, comparing, fx, fmx }) }),
    [x, comparing, fx, fmx],
  );

  const curves = useMemo<Curve[]>(() => [{ fn: shown, role: 'main' }], [shown]);
  const overlay = useCallback(
    (
      v: Parameters<
        NonNullable<React.ComponentProps<typeof PlotCanvas>['overlay']>
      >[0],
    ) => (
      <>
        <Line
          x1={v.px(x)}
          x2={v.px(x)}
          y1={v.py(0)}
          y2={v.py(fx)}
          stroke={P.color.guide}
          strokeWidth={P.guideWidth}
          strokeDasharray={P.dash}
        />
        <Circle
          cx={v.px(x)}
          cy={v.py(fx)}
          r={P.markerRadius}
          fill={P.color.marker}
        />
        <PointLabel
          x={v.px(x)}
          y={v.py(fx)}
          text={POINT_LABEL.x}
          testID="point-label-x"
        />
        {showMirror && (
          <>
            <Line
              x1={v.px(-x)}
              x2={v.px(-x)}
              y1={v.py(0)}
              y2={v.py(fmx)}
              stroke={P.color.guide}
              strokeWidth={P.guideWidth}
              strokeDasharray={P.dash}
            />
            <Circle
              cx={v.px(-x)}
              cy={v.py(fmx)}
              r={P.markerRadius}
              fill={P.color.surface}
              stroke={P.color.marker}
              strokeWidth={P.guideWidth}
            />
            <PointLabel
              x={v.px(-x)}
              y={v.py(fmx)}
              text={POINT_LABEL.minusX}
              testID="point-label-minus-x"
            />
          </>
        )}
      </>
    ),
    [x, fx, fmx, showMirror],
  );

  const commit = (v: number) =>
    emit('x_changed', {
      x: v,
      fx: evalFn(shown, v),
      ...(showMirror && { fmx: evalFn(shown, -v) }),
      fn: shown,
    });

  const same = sameHeight(fx, fmx);
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
      onChange={setX}
      onCommit={commit}
      disabled={!live}
      accessibilityLabel={t('analysis.point.slider')}
      testID={`point-slider-${p.instanceId}`}
    />
  );
  // Same format on both sides (they are compared).
  const pair = readoutPair(fx, fmx);
  const fxLine = (compact: boolean) => (
    <Text
      style={[ui.ltr, compact && styles.compact]}
      {...oneLine(compact)}
      testID="point-fx"
    >
      {valueLine(name, x, pair[0])}
    </Text>
  );
  const fmxLine = (compact: boolean) =>
    showMirror && (
      <Text
        style={[ui.ltr, compact && styles.compact]}
        {...oneLine(compact)}
        testID="point-fmx"
      >
        {valueLine(name, -x, pair[1])}
      </Text>
    );
  const readouts = (
    <>
      {fxLine(false)}
      {fmxLine(false)}
    </>
  );
  const verdictShort = `${same ? '✓' : '≠'} ${t(
    same ? 'analysis.point.sameShort' : 'analysis.point.differentShort',
  )}`;

  return (
    <Expandable
      name="PointOnCurve"
      testID={`point-${p.instanceId}`}
      prefix="point"
      onToggle={expanded => emit('expanded_toggled', { expanded })}
      renderCompact={expand => (
        <>
          <CompactRow
            plot={plot(theme.plot.compactHeight)}
            expand={expand}
            head={fxLine(true)}
            side={
              <>
                {fmxLine(true)}
                {showMirror && (
                  <Text
                    style={[ui.readoutLabel, { color: tone(same).text }]}
                    testID="point-verdict"
                  >
                    {verdictShort}
                  </Text>
                )}
              </>
            }
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
          <View style={ui.list}>{readouts}</View>
          {showMirror && (
            <Note
              tone={same ? 'success' : 'warning'}
              text={t(
                same ? 'analysis.point.same' : 'analysis.point.different',
              )}
              testID="point-verdict"
            />
          )}
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
              testID="point-compare"
            />
          )}
        </>
      }
    />
  );
}

/** Points named by text (not color only): x and −x. */
const POINT_LABEL = { x: 'x', minusX: '−x' };

function PointLabel(p: { x: number; y: number; text: string; testID: string }) {
  return (
    <SvgText
      x={p.x}
      y={p.y - P.markerRadius - theme.space.xxs}
      fontSize={P.labelSize}
      fill={P.color.marker}
      textAnchor="middle"
      testID={p.testID}
    >
      {p.text}
    </SvgText>
  );
}

/** Collapsed readouts stay on one line next to the expand icon (shrink, never wrap). */
const oneLine = (compact: boolean) =>
  compact
    ? {
        numberOfLines: 1,
        adjustsFontSizeToFit: true,
        minimumFontScale: theme.plot.readoutMinScale,
      }
    : {};

const styles = StyleSheet.create({
  compact: { fontSize: theme.font.size.small },
});

const tone = (same: boolean) =>
  same ? theme.feedback.success : theme.feedback.warning;
