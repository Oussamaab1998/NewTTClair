import React, { useImperativeHandle, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { fractionToLatex } from '../../engine/format';
import { frac, toNumber, type Fraction } from '../../engine/rational';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import {
  ballLabels,
  formatFraction,
  decimalLatex,
  formatInt,
  lawRows,
  moments,
  outcomeLabel,
  outcomesOf,
} from './logic';
import {
  MomentStepSchema,
  type LawChartProps,
  type MomentStep,
} from './schemas';
import { ActionButton, Panel, styles as ui } from './ui';
import { theme } from '../../theme';

const SnapshotSchema = z.object({
  revealed: z.array(MomentStepSchema),
  bar: z.number().nullable(),
});

const CHART_H = theme.chart.plotHeight;
const PAD = theme.chart.padX;
/** Plot plus the band above it for the p labels. */
const PLOT_WITH_LABELS = CHART_H + theme.chart.valueLabelBand;
const STEP_LABEL: Record<MomentStep, string> = {
  E: 'E(X)',
  E2: 'E(X²)',
  V: 'V(X)',
};

interface Row {
  value: number;
  p: Fraction;
  outcomeIds?: string[];
}

/**
 * Bar chart of a law on a numeric axis, with step-by-step E(X), E(X²), V(X)
 * (exact values from the engine; V(X) = 0,89 in Exercise 2). Tap a bar to
 * see its draws.
 */
export function LawChart(p: ViewProps<LawChartProps>) {
  const { t } = useTranslation();
  const { balls, draw, k, valueFn, law, reveal, showFormula, markDuplicates } =
    p.props;
  const rows = useMemo<Row[]>(() => {
    if (law) {
      return [...law.rows]
        .map(r => ({ value: r.value, p: frac(r.p[0], r.p[1]) }))
        .sort((a, b) => a.value - b.value);
    }
    return lawRows({ balls: balls!, draw: draw!, k: k! }, valueFn!);
  }, [balls, draw, k, law, valueFn]);
  const m = useMemo(() => moments(rows), [rows]);
  const outcomes = useMemo(
    () => (balls && draw && k ? outcomesOf({ balls, draw, k }) : []),
    [balls, draw, k],
  );
  const labels = useMemo(
    () => ballLabels(balls ?? [], markDuplicates),
    [balls, markDuplicates],
  );

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { revealed: [] as MomentStep[], bar: null };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [revealed, setRevealed] = useState<MomentStep[]>(
    p.mode === 'readonly' && !p.snapshot ? reveal : initial.revealed,
  );
  const [bar, setBar] = useState<number | null>(initial.bar);
  const [width, setWidth] = useState(0);
  const emit = useEmit('LawChart', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ revealed, bar }) }),
    [revealed, bar],
  );

  const min = rows[0]!.value;
  const max = rows[rows.length - 1]!.value;
  const maxP = Math.max(...rows.map(r => toNumber(r.p)));
  const inner = Math.max(0, width - 2 * PAD);
  const xOf = (v: number) =>
    PAD + (max === min ? inner / 2 : ((v - min) / (max - min)) * inner);
  const nextStep = reveal.find(s => !revealed.includes(s));
  const showE = revealed.includes('E');
  const barRow = bar === null ? undefined : rows.find(r => r.value === bar);
  const barText =
    barRow?.outcomeIds && draw
      ? `X = ${formatInt(barRow.value)} : ${barRow.outcomeIds
          .map(id =>
            outcomeLabel(outcomes.find(o => o.id === id)!, labels, draw),
          )
          .join(', ')}`
      : null;

  return (
    <Panel testID={`law-chart-${p.instanceId}`}>
      <View
        style={styles.chart}
        onLayout={(e: LayoutChangeEvent) =>
          setWidth(e.nativeEvent.layout.width)
        }
      >
        {width > 0 &&
          rows.map(r => {
            const h = Math.max(
              theme.chart.minBarHeight,
              (toNumber(r.p) / maxP) * CHART_H,
            );
            return (
              <Pressable
                key={r.value}
                disabled={!live}
                onPress={() => {
                  const next = bar === r.value ? null : r.value;
                  setBar(next);
                  emit('bar_tapped', {
                    value: r.value,
                    p: [...r.p],
                    ...(r.outcomeIds && { outcomes: r.outcomeIds }),
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`X = ${r.value}, p = ${formatFraction(
                  r.p,
                )}`}
                testID={`chart-bar-${r.value}`}
                style={[
                  styles.barHit,
                  {
                    left: xOf(r.value) - theme.size.touch / 2,
                    height: PLOT_WITH_LABELS,
                  },
                ]}
              >
                <Text style={styles.pLabel}>{formatFraction(r.p)}</Text>
                <View
                  style={[
                    styles.bar,
                    { height: h },
                    bar === r.value && styles.barOn,
                  ]}
                />
              </Pressable>
            );
          })}
        {width > 0 && showE && (
          <View
            style={[styles.eLine, { left: xOf(m.E.decimal) }]}
            testID="chart-e-marker"
          >
            <Text style={styles.eLabel}>{STEP_LABEL.E}</Text>
          </View>
        )}
        <View style={styles.axis} />
        {width > 0 &&
          rows.map(r => (
            <Text
              key={r.value}
              style={[
                styles.xLabel,
                { left: xOf(r.value) - theme.chart.axisLabelWidth / 2 },
              ]}
            >
              {formatInt(r.value)}
            </Text>
          ))}
      </View>
      {barText !== null && (
        <Text style={ui.ltr} testID="chart-bar-readout">
          {barText}
        </Text>
      )}
      {live && outcomes.length > 0 && !barRow && (
        <Text style={ui.readoutLabel}>{t('proba.chart.tapBar')}</Text>
      )}
      {revealed.map(step => {
        const mv = m[step];
        const lines = [
          showFormula ? `${mv.name} = ${mv.expanded}` : null,
          `${showFormula ? '' : `${mv.name} `}= ${fractionToLatex(mv.value)}`,
          mv.value[1] === 1 ? null : `= ${decimalLatex(mv.decimal)}`,
        ].filter((l): l is string => l !== null);
        return (
          <View key={step} testID={`chart-step-${step}`}>
            {lines.map(line => (
              <ScrollView
                key={line}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <MathBlock latex={line} fontSize={theme.font.size.body} />
              </ScrollView>
            ))}
          </View>
        );
      })}
      {live && nextStep && (
        <View style={ui.rowEnd}>
          <ActionButton
            label={`${t('proba.chart.compute')}  ${STEP_LABEL[nextStep]}`}
            onPress={() => {
              setRevealed([...revealed, nextStep]);
              emit('step_revealed', {
                step: nextStep,
                value: [...m[nextStep].value],
              });
            }}
            testID={`chart-reveal-${nextStep}`}
          />
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: CHART_H + theme.chart.footerHeight,
    direction: 'ltr',
  },
  barHit: {
    position: 'absolute',
    top: 0,
    width: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: theme.chart.barWidth,
    backgroundColor: theme.color.actionPrimary,
    borderTopLeftRadius: theme.radius.xs,
    borderTopRightRadius: theme.radius.xs,
  },
  barOn: { backgroundColor: theme.color.deepDiveRail },
  pLabel: {
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  axis: {
    position: 'absolute',
    top: PLOT_WITH_LABELS,
    left: 0,
    right: 0,
    height: theme.chart.axisThickness,
    backgroundColor: theme.color.textPrimary,
  },
  xLabel: {
    position: 'absolute',
    top: PLOT_WITH_LABELS + theme.chart.axisLabelGap,
    width: theme.chart.axisLabelWidth,
    textAlign: 'center',
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  eLine: {
    position: 'absolute',
    top: 0,
    height: PLOT_WITH_LABELS,
    borderLeftWidth: theme.border.thick,
    borderStyle: 'dashed',
    borderColor: theme.feedback.danger.text,
  },
  eLabel: {
    fontSize: theme.font.size.caption,
    color: theme.feedback.danger.text,
    marginLeft: theme.space.markerLabel,
    writingDirection: 'ltr',
  },
});
