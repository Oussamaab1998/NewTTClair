import React, { useImperativeHandle, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { fnEntry } from '../../engine/analysis';
import { MathBlock } from '../../lesson/math/MathBlock';
import type { ViewProps } from '../host';
import { Panel } from '../probability/ui';
import { PlotCanvas, type Curve } from './PlotCanvas';
import { autoRange, type Interval } from './plot';
import type { FunctionPlotProps } from './schemas';
import { theme } from '../../theme';

/** 2-number arrays from the schema -> a stable interval. */
export function useInterval(i: readonly number[]): Interval {
  const [a, b] = [i[0]!, i[1]!];
  return useMemo(() => [a, b] as const, [a, b]);
}

/** The base plot every analysis component composes: curve, markers, shading. */
export function FunctionPlot(p: ViewProps<FunctionPlotProps>) {
  const { t } = useTranslation();
  const { fn, markers, shade, colorBySign } = p.props;
  const domain = useInterval(p.props.domain);
  const given = p.props.range;
  const range = useMemo<Interval>(
    () => (given ? [given[0]!, given[1]!] : autoRange(fn, domain)),
    [given, fn, domain],
  );
  const curves = useMemo<Curve[]>(
    () => [{ fn, role: 'main', bySign: colorBySign }],
    [fn, colorBySign],
  );
  const shading = useMemo(
    () => (shade ? { fn, ...shade } : undefined),
    [fn, shade],
  );

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({ fn, domain: [...domain], range: [...range] }),
    }),
    [fn, domain, range],
  );

  return (
    <Panel testID={`plot-${p.instanceId}`}>
      <MathBlock latex={fnEntry(fn).latex} fontSize={theme.font.size.body} />
      <PlotCanvas
        domain={domain}
        range={range}
        curves={curves}
        {...(markers && { markers })}
        {...(shading && { shade: shading })}
        accessibilityLabel={t('analysis.plot.a11y')}
        testID={`plot-canvas-${p.instanceId}`}
      />
    </Panel>
  );
}
