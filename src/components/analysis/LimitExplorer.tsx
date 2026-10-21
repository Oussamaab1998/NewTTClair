import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Circle } from 'react-native-svg';
import { z } from 'zod';

import {
  evalFn,
  fnEntry,
  limitProbe,
  toRational,
  type FnId,
} from '../../engine/analysis';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { ActionButton, styles as ui } from '../probability/ui';
import { CompactRow, Expandable } from './Expandable';
import { PlotCanvas, type Curve } from './PlotCanvas';
import {
  autoRange,
  readoutNumber,
  sampleCurve,
  type Interval,
  type View as PlotView,
} from './plot';
import type { LimitExplorerProps, Marker } from './schemas';
import { MathReadout } from './MathReadout';
import { Slider } from './Slider';
import { theme } from '../../theme';

const SnapshotSchema = z.object({ x: z.number(), zoomed: z.boolean() });
const P = theme.plot;

/** The engine limit as an exact small fraction, or null (no asymptote drawn). */
export function engineLimit(fn: FnId, dir: '+inf' | '-inf'): number | null {
  const p = limitProbe(fn, dir);
  const q = p.converges ? toRational(p.estimate, { tol: 1e-8 }) : null;
  return q ? q[0] / q[1] : null;
}

/** Zoomed y-range: the far half of the domain, close to the limit L. */
export function zoomRange(fn: FnId, domain: Interval, L: number): Interval {
  const far: Interval =
    domain[0] >= 0
      ? [(domain[0] + domain[1]) / 2, domain[1]]
      : [domain[0], (domain[0] + domain[1]) / 2];
  const gap = Math.max(
    ...sampleCurve(fn, far, 40).map(p =>
      p.y === null ? 0 : Math.abs(p.y - L),
    ),
    1e-12,
  );
  return [L - 0.2 * gap, L + 1.2 * gap];
}

const xLine = (x: number) => `x = ${readoutNumber(x, { fractions: false })}`;

/**
 * x -> ±∞ slider: numerator, denominator and f(x) read separately (∞/∞),
 * the asymptote from the engine limit, and a vertical zoom showing that the
 * curve gets close to the asymptote without touching it.
 */
export function LimitExplorer(p: ViewProps<LimitExplorerProps>) {
  const { t } = useTranslation();
  const { fn, numerator, denominator, direction, xMax, step } = p.props;
  const sign = direction === '+inf' ? 1 : -1;
  const domain = useMemo<Interval>(
    () => (sign > 0 ? [0, xMax] : [-xMax, 0]),
    [sign, xMax],
  );
  const L = useMemo(() => engineLimit(fn, direction), [fn, direction]);
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { x: sign, zoomed: p.props.zoom };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [x, setX] = useState(initial.x);
  const [zoomed, setZoomed] = useState(initial.zoomed && L !== null);
  const range = useMemo<Interval>(
    () =>
      zoomed && L !== null ? zoomRange(fn, domain, L) : autoRange(fn, domain),
    [zoomed, L, fn, domain],
  );
  const fx = evalFn(fn, x);
  const nx = numerator ? evalFn(numerator, x) : undefined;
  const dx = denominator ? evalFn(denominator, x) : undefined;
  const emit = useEmit('LimitExplorer', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ x, zoomed, fx }) }),
    [x, zoomed, fx],
  );

  const curves = useMemo<Curve[]>(() => [{ fn, role: 'main' }], [fn]);
  const markers = useMemo<Marker[]>(
    () => (L === null ? [] : [{ type: 'asymptote', at: L, showValue: true }]),
    [L],
  );
  const overlay = useCallback(
    (v: PlotView) => (
      <Circle
        cx={v.px(x)}
        cy={v.py(Math.min(range[1], Math.max(range[0], fx)))}
        r={P.markerRadius}
        fill={P.color.marker}
      />
    ),
    [x, fx, range],
  );

  const commit = (v: number) =>
    emit('x_changed', {
      x: v,
      fx: evalFn(fn, v),
      ...(numerator && { numerator: evalFn(numerator, v) }),
      ...(denominator && { denominator: evalFn(denominator, v) }),
    });

  const plot = (height: number) => (
    <PlotCanvas
      domain={domain}
      range={range}
      curves={curves}
      markers={markers}
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
      accessibilityLabel={t('analysis.limit.slider')}
      testID={`limit-slider-${p.instanceId}`}
    />
  );
  const xText = (
    <Text style={ui.ltr} testID="limit-x">
      {xLine(x)}
    </Text>
  );
  const values = (small: boolean) => (
    <>
      {numerator && nx !== undefined && (
        <MathReadout
          latex={fnEntry(numerator).latex}
          value={nx}
          small={small}
          testID="limit-num"
        />
      )}
      {denominator && dx !== undefined && (
        <MathReadout
          latex={fnEntry(denominator).latex}
          value={dx}
          small={small}
          testID="limit-den"
        />
      )}
      <MathReadout latex="f(x)" value={fx} small={small} testID="limit-fx" />
    </>
  );

  return (
    <Expandable
      name="LimitExplorer"
      testID={`limit-${p.instanceId}`}
      prefix="limit"
      onToggle={expanded => emit('expanded_toggled', { expanded })}
      renderCompact={expand => (
        <>
          <CompactRow
            plot={plot(theme.plot.compactHeight)}
            expand={expand}
            head={xText}
            side={values(true)}
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
          {xText}
          {values(false)}
          {L !== null && (
            <ActionButton
              label={t(
                zoomed ? 'analysis.limit.unzoom' : 'analysis.limit.zoom',
              )}
              onPress={() => {
                setZoomed(!zoomed);
                emit('zoom_toggled', { zoomed: !zoomed });
              }}
              disabled={!live}
              testID="limit-zoom"
            />
          )}
        </>
      }
    />
  );
}
