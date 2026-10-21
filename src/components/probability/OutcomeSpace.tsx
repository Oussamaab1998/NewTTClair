import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  satisfies,
  type Outcome,
  type ValueFn,
} from '../../engine/probability';
import { RichView } from '../../lesson/feed/RichView';
import { useEmit, type ViewProps } from '../host';
import {
  ballLabels,
  formatInt,
  outcomeLabel,
  outcomesOf,
  valueExpression,
  valueOf,
} from './logic';
import type { OutcomeSpaceProps } from './schemas';
import {
  ActionButton,
  OutcomeChip,
  Panel,
  Readout,
  styles as ui,
  VALUE_COLORS,
} from './ui';
import { theme } from '../../theme';

/** Beyond this, the collapsed view shows the first chips and a "show all" button. */
const COLLAPSED = 12;

const SnapshotSchema = z.object({
  focus: z.string().nullable(),
  legend: z.number().nullable(),
  expanded: z.boolean(),
});
type Snapshot = z.infer<typeof SnapshotSchema>;

/**
 * Every outcome as a chip, optionally with its value and colored by value or
 * by event (teaches listing systematically and C(n, k)). Tapping a chip shows
 * how its value is obtained; tapping a legend value highlights its draws.
 */
export function OutcomeSpace(p: ViewProps<OutcomeSpaceProps>) {
  const { t } = useTranslation();
  const { draw, valueFn, colorBy, event, layout, showCount, highlight } =
    p.props;
  const { balls, k, markDuplicates } = p.props;
  const outcomes = useMemo(
    () => outcomesOf({ balls, draw, k }),
    [balls, draw, k],
  );
  const labels = useMemo(
    () => ballLabels(balls, markDuplicates),
    [balls, markDuplicates],
  );
  const values = useMemo(
    () =>
      valueFn
        ? [...new Set(outcomes.map(o => valueOf(valueFn, o)))].sort(
            (a, b) => a - b,
          )
        : [],
    [outcomes, valueFn],
  );
  const initial = useMemo<Snapshot>(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : { focus: null, legend: null, expanded: false };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [focus, setFocus] = useState<string | null>(initial.focus);
  const [legend, setLegend] = useState<number | null>(initial.legend);
  const [expanded, setExpanded] = useState(initial.expanded);
  const focusRef = useRef(focus);
  const emit = useEmit('OutcomeSpace', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ focus, legend, expanded }) }),
    [focus, legend, expanded],
  );

  const onChip = useCallback(
    (id: string) => {
      const next = focusRef.current === id ? null : id;
      focusRef.current = next;
      setFocus(next);
      const o = outcomes.find(x => x.id === id)!;
      emit('outcome_tapped', {
        outcomeId: id,
        ...(valueFn && { value: valueOf(valueFn, o) }),
        ...(event && {
          inEvent: satisfies(event, o, valueFn ? { valueFn } : {}),
        }),
      });
    },
    [emit, event, outcomes, valueFn],
  );

  const shown =
    expanded || outcomes.length <= COLLAPSED
      ? outcomes
      : outcomes.slice(0, COLLAPSED);
  const focused = focus ? outcomes.find(o => o.id === focus) : undefined;
  const focusText = (o: Outcome, fn: ValueFn) =>
    `${outcomeLabel(o, labels, draw)}   ${valueExpression(fn, o)}`;

  return (
    <Panel testID={`outcome-space-${p.instanceId}`}>
      {showCount && (
        <Readout
          label={t('proba.outcomes.count')}
          value={String(outcomes.length)}
          testID="outcome-count"
        />
      )}
      <View style={layout === 'grid' ? ui.grid : ui.list}>
        {shown.map(o => {
          const v = valueFn ? valueOf(valueFn, o) : undefined;
          const inEvent =
            colorBy === 'event' && event
              ? satisfies(event, o, valueFn ? { valueFn } : {})
              : false;
          const tint =
            colorBy === 'value' && v !== undefined
              ? VALUE_COLORS[values.indexOf(v) % VALUE_COLORS.length]
              : undefined;
          return (
            <OutcomeChip
              key={o.id}
              id={o.id}
              label={outcomeLabel(o, labels, draw)}
              {...(v !== undefined && { badge: formatInt(v) })}
              {...(tint !== undefined && { tint })}
              mark={inEvent ? 'correct' : null}
              focused={focus === o.id || (highlight?.includes(o.id) ?? false)}
              dim={legend !== null && v !== legend}
              disabled={!live}
              onPress={onChip}
              testIDPrefix="outcome"
            />
          );
        })}
      </View>
      {outcomes.length > COLLAPSED && (
        <ActionButton
          label={t(
            expanded ? 'proba.outcomes.showLess' : 'proba.outcomes.showAll',
          )}
          disabled={!live}
          onPress={() => {
            setExpanded(!expanded);
            emit('expanded', { expanded: !expanded });
          }}
          testID="outcomes-expand"
        />
      )}
      {focused && valueFn ? (
        <Text style={ui.ltr} testID="outcome-readout">
          {focusText(focused, valueFn)}
        </Text>
      ) : (
        live &&
        valueFn && (
          <Text style={ui.readoutLabel}>{t('proba.outcomes.tapHint')}</Text>
        )
      )}
      {colorBy === 'value' && values.length > 0 && (
        <>
          <View style={styles.legend}>
            {values.map((v, i) => (
              <Pressable
                key={v}
                disabled={!live}
                onPress={() => {
                  const on = legend !== v;
                  setLegend(on ? v : null);
                  emit('legend_toggled', { value: v, on });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: legend === v }}
                testID={`legend-${v}`}
                style={[
                  styles.legendItem,
                  { borderColor: VALUE_COLORS[i % VALUE_COLORS.length] },
                  legend === v && styles.legendOn,
                ]}
              >
                <Text
                  style={[
                    styles.legendText,
                    { color: VALUE_COLORS[i % VALUE_COLORS.length] },
                  ]}
                >
                  {formatInt(v)}
                </Text>
              </Pressable>
            ))}
          </View>
          {live && (
            <Text style={ui.readoutLabel}>{t('proba.outcomes.legend')}</Text>
          )}
        </>
      )}
      {p.props.insight && (
        <RichView rich={p.props.insight} fontSize={theme.font.size.body} />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
    direction: 'ltr',
  },
  legendItem: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    borderWidth: theme.border.thick,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
  },
  legendOn: {
    backgroundColor: theme.color.surfaceSelected,
    borderWidth: theme.border.focus,
  },
  legendText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
    writingDirection: 'ltr',
  },
});
