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

import { ratToLatex, ratToString } from '../../engine/rationalFormat';
import { frac } from '../../engine/rational';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import { runsCalc, runsFinding, runsModel, stageCells } from './runsModel';
import type { RepeatedRunsProps } from './schemas';

const SnapshotSchema = z.object({
  shaded: z.array(z.number().int().min(0).max(59)).max(60),
  stage: z.number().int().min(0).max(2),
  done: z.boolean(),
  message: z.enum(['none', 'not_this']),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/**
 * N runs of an experiment as N cells. `fraction_of_total` (1/6 of 36): the
 * student shades the cells (or watches them shaded) and the count is written
 * only after a confirm (or a step). `two_stage` (36 -> 6 -> 1): the second
 * stage is inside the first. `tally`: runs x value, the total S, and S / N =
 * E(X). Cells are one contiguous block in reading order (a part of a whole,
 * not chance). Opens its gate (`explored`) at the confirmed count or the last
 * step; "I do not know, show me" shows the end and logs `how: skipped`.
 */
export function RepeatedRuns(p: ViewProps<RepeatedRunsProps>) {
  const { t } = useTranslation();
  const m = useMemo(() => runsModel(p.props), [p.props]);
  const shadeMode = p.props.interaction === 'shade';

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success && s.data.shaded.every(i => i < m.N) && s.data.stage <= m.lastStage
      ? s.data
      : {
          shaded: [] as number[],
          stage: 0,
          done: false,
          message: 'none' as 'none' | 'not_this',
          explored: null as 'done' | 'skipped' | null,
        };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [shaded, setShaded] = useState<number[]>(initial.shaded);
  const [stage, setStage] = useState(initial.stage);
  const [done, setDone] = useState(initial.done);
  const [message, setMessage] = useState(initial.message);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const route = useRef<string[]>([]);
  const emit = useEmit('RepeatedRuns', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ shaded, stage, done, message, explored }) }),
    [shaded, stage, done, message, explored],
  );

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped') => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit('finding', runsFinding(m, route.current, how === 'done' ? 'found' : 'skipped'));
    },
    [emit, m],
  );

  const tap = (i: number) => {
    if (!live || done) {
      return;
    }
    const on = !shaded.includes(i);
    setShaded(on ? [...shaded, i] : shaded.filter(x => x !== i));
    setMessage('none');
    route.current.push(`cell:${shaded.length + (on ? 1 : -1)}`);
    emit('cell_tapped', { index: i, selected: on });
  };
  const confirm = () => {
    if (!live || done || shaded.length === 0) {
      return;
    }
    const ok = shaded.length === m.counts[1];
    route.current.push('confirmed');
    emit('confirm_pressed', { count: shaded.length, correct: ok });
    if (ok) {
      setDone(true);
      setMessage('none');
      finish('count_confirmed', 'done');
    } else {
      setMessage('not_this');
    }
  };
  const next = () => {
    if (!live || stage >= m.lastStage) {
      return;
    }
    const s = stage + 1;
    setStage(s);
    route.current.push(`stage:${s}`);
    emit('stage_advanced', {
      stage: s,
      ...(m.tally
        ? s === 1
          ? { total: String(m.tally.total) }
          : { average: ratToString(m.tally.average) }
        : { count: m.counts[s]! }),
    });
    if (s >= m.lastStage) {
      finish('last_stage', 'done');
    }
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    route.current.push('reveal');
    if (shadeMode) {
      setShaded(stageCells(m, 1));
      setDone(true);
    } else {
      setStage(m.lastStage);
    }
    setMessage('none');
    finish('reveal', 'skipped');
  };

  const shownStage = shadeMode ? (done ? 1 : 0) : stage;
  const lit = shadeMode ? new Set(shaded) : new Set(stageCells(m, shownStage));
  const kept = !shadeMode && m.mode === 'two_stage' && stage === 2 ? new Set(stageCells(m, 1)) : new Set<number>();
  const cells = Array.from({ length: m.N }, (_, i) => i);
  const rows = Array.from({ length: Math.ceil(m.N / m.cols) }, (_, r) =>
    cells.slice(r * m.cols, (r + 1) * m.cols),
  );
  const calc = shadeMode ? (done ? runsCalc(m, 1) : []) : runsCalc(m, shownStage);

  return (
    <Panel testID={`repeated-runs-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}

      {!m.tally && (
        <>
          <Text style={ui.readoutLabel}>{t('pv2.runs.cells')}</Text>
          {shadeMode && !done && <Text style={ui.readoutLabel}>{t('pv2.runs.shade')}</Text>}
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.runs.fractionLabel')}</Text>
            <MathBlock latex={ratToLatex(m.probs[0]!)} fontSize={theme.font.size.bodyLarge} />
          </View>
          <View style={styles.pair}>
            <Text style={ui.readoutLabel}>{t('pv2.runs.runsLabel')}</Text>
            <MathBlock latex={ratToLatex(frac(m.N))} fontSize={theme.font.size.bodyLarge} />
          </View>
          <View style={styles.grid} testID="runs-grid">
            {rows.map((row, r) => (
              <View key={r} style={styles.gridRow}>
                {row.map(i =>
                  shadeMode ? (
                    <Pressable
                      key={i}
                      disabled={!live || done}
                      onPress={() => tap(i)}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        lit.has(i) ? 'pv2.runs.cellOn' : 'pv2.runs.cellOff',
                        { n: i + 1 },
                      )}
                      accessibilityState={{ selected: lit.has(i), disabled: !live || done }}
                      testID={`runs-cell-${i}`}
                      style={styles.hit}
                    >
                      <View style={lit.has(i) ? styles.on : styles.off} />
                    </Pressable>
                  ) : (
                    <View
                      key={i}
                      testID={`runs-cell-${i}`}
                      style={
                        lit.has(i)
                          ? styles.smallOn
                          : kept.has(i)
                          ? styles.smallKept
                          : styles.smallOff
                      }
                    />
                  ),
                )}
              </View>
            ))}
          </View>
          {!shadeMode && shownStage >= 1 && (
            <Text style={ui.readoutLabel} testID="runs-stage-1">
              {t('pv2.runs.stage1')}
            </Text>
          )}
          {!shadeMode && shownStage >= 2 && (
            <Text style={ui.readoutLabel} testID="runs-stage-2">
              {t('pv2.runs.stage2')}
            </Text>
          )}
        </>
      )}

      {m.tally && (
        <View style={styles.table} testID="runs-tally">
          <Text style={ui.readoutLabel}>{t('pv2.runs.tallyHead')}</Text>
          {m.tally.rows.map((r, i) => (
            <View key={i} style={styles.tallyRow} testID={`runs-tally-row-${i}`}>
              <Text style={styles.cellText}>{ratToString(frac(r.x))}</Text>
              <Text style={styles.cellText}>{r.runs}</Text>
              {stage >= 1 && <Text style={styles.cellText}>{r.total}</Text>}
            </View>
          ))}
        </View>
      )}

      {calc.length > 0 && (
        <View style={styles.pair} testID="runs-calc">
          {shadeMode && <Text style={ui.readoutLabel}>{t('pv2.runs.right')}</Text>}
          {calc.map((line, i) => (
            <View key={line} style={styles.pair}>
              {m.tally && (
                <Text style={ui.readoutLabel}>
                  {t(i === 0 ? 'pv2.runs.sum' : 'pv2.runs.average')}
                </Text>
              )}
              <MathBlock latex={line} fontSize={theme.font.size.bodyLarge} />
            </View>
          ))}
        </View>
      )}

      {message === 'not_this' && (
        <Text style={[ui.readoutLabel, styles.note]} testID="runs-message">
          {t('pv2.runs.notThis')}
        </Text>
      )}

      {live && shadeMode && !done && (
        <ActionButton
          label={t('pv2.runs.confirm')}
          primary
          onPress={confirm}
          disabled={shaded.length === 0}
          testID="runs-confirm"
        />
      )}
      {live && !shadeMode && stage < m.lastStage && (
        <ActionButton label={t('pv2.runs.next')} primary onPress={next} testID="runs-next" />
      )}
      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="runs-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  pair: { gap: theme.space.xxs },
  grid: { gap: theme.pv2.cellGap, alignSelf: 'center' },
  gridRow: { flexDirection: theme.mathSide.row, gap: theme.pv2.cellGap },
  hit: {
    width: theme.size.touch,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallOn: {
    width: theme.pv2.cell,
    height: theme.pv2.cell,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.thick,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  smallKept: {
    width: theme.pv2.cell,
    height: theme.pv2.cell,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceMuted,
  },
  smallOff: {
    width: theme.pv2.cell,
    height: theme.pv2.cell,
    borderRadius: theme.radius.xs,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  // On: a filled circle on the highlighter with an ink edge. Kept: a muted square. Off: a hollow square.
  // (the shaded cells are 36 pt shapes in a 44 pt target; the watched ones are 18 pt, display only)
  on: {
    width: theme.pv2.slotShape,
    height: theme.pv2.slotShape,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  kept: {
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceMuted,
  },
  off: {
    width: theme.pv2.slotShape,
    height: theme.pv2.slotShape,
    borderRadius: theme.radius.xs,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  table: { gap: theme.space.xxs },
  tallyRow: {
    flexDirection: theme.mathSide.row,
    gap: theme.space.xl,
    paddingVertical: theme.space.xxs,
    borderBottomWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
  },
  cellText: {
    minWidth: theme.size.touch,
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  note: { fontFamily: theme.font.family.ui.bold },
});
