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

import { frac, type Fraction } from '../../engine/rational';
import { NumericKeypad } from '../../lesson/feed/NumericKeypad';
import type { JsonObject } from '../contract';
import { useEmit, type Emit, type ViewProps } from '../host';
import {
  ballLabels,
  checkCell,
  checkLaw,
  formatFraction,
  formatInt,
  lawRows,
  outcomeLabel,
  outcomesOf,
  valueOf,
  type LawCheck,
  type LawRowView,
} from './logic';
import type { LawBuilderProps } from './schemas';
import { Note, OutcomeChip, Panel, Readout, styles as ui } from './ui';
import { theme } from '../../theme';

const FractionSnap = z.tuple([z.number().int(), z.number().int().min(1)]);
const SnapshotSchema = z.object({
  cells: z.record(z.string(), FractionSnap),
  assigned: z.record(z.string(), z.number().int()),
  done: z.boolean(),
});
interface Snapshot {
  cells: Record<string, Fraction>;
  assigned: Record<string, number>;
  done: boolean;
}

const SIGMA = '∑';
const UNKNOWN = '?';
const ROW_X = 'x';
const ROW_P = 'p(X = x)';
const activeLabel = (v: number) => `p(X = ${formatInt(v)}) = ?`;

/**
 * Task: the law of X as a table. "fill_probabilities": the student types
 * p(X = x) per value (keypad, equivalent forms accepted). "assign_outcomes":
 * tap a draw, then its value; probabilities come from the counts. Both end
 * with the habit check "sum = 1".
 */
export function LawBuilder(p: ViewProps<LawBuilderProps>) {
  const { balls, draw, k, valueFn, mode, prefilled } = p.props;
  const rows = useMemo(
    () => lawRows({ balls, draw, k }, valueFn),
    [balls, draw, k, valueFn],
  );
  const initial = useMemo<Snapshot>(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    const given: Record<string, Fraction> = {};
    for (const [key, f] of Object.entries(prefilled ?? {})) {
      given[key] = frac(f[0], f[1]);
    }
    return s.success ? s.data : { cells: given, assigned: {}, done: false };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const emit = useEmit('LawBuilder', p);

  if (mode === 'assign_outcomes') {
    return <AssignMode {...p} rows={rows} initial={initial} emit={emit} />;
  }
  if (mode === 'progressive') {
    return <ProgressiveMode {...p} rows={rows} />;
  }
  return <FillMode {...p} rows={rows} initial={initial} emit={emit} />;
}

interface ModeProps extends ViewProps<LawBuilderProps> {
  rows: LawRowView[];
  initial: Snapshot;
  emit: Emit;
}

function tableDetails(check: LawCheck): JsonObject {
  return {
    table: check.table.map(r => ({
      value: r.value,
      entered: r.entered ? [...r.entered] : null,
      correct: r.correct,
    })),
    sum: [...check.sum],
    correctCells: check.correctCells,
    wrongCells: check.wrongCells,
  };
}

// ---------------------------------------------------------------------------

function FillMode(p: ModeProps) {
  const { t } = useTranslation();
  const { rows, emit, initial, showSolution } = p;
  const { showSumCheck, prefilled } = p.props;
  const readonlyTable = p.props.mode === 'readonly';
  const [cells, setCells] = useState<Record<string, Fraction>>(initial.cells);
  const [done, setDone] = useState(initial.done);
  const [invalid, setInvalid] = useState(false);
  const firstOpen = rows.find(r => !(String(r.value) in initial.cells));
  const [active, setActive] = useState<number | null>(
    firstOpen ? firstOpen.value : null,
  );
  const live = p.mode === 'interactive' && !done && !readonlyTable;

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({
        cells: Object.fromEntries(
          Object.entries(cells).map(([key, f]) => [key, [...f]]),
        ),
        assigned: {},
        done,
      }),
    }),
    [cells, done],
  );

  const shownCells = useMemo<Record<string, Fraction>>(() => {
    if (readonlyTable || showSolution) {
      return Object.fromEntries(rows.map(r => [String(r.value), r.p]));
    }
    return cells;
  }, [cells, readonlyTable, rows, showSolution]);
  const check = checkLaw(rows, shownCells);
  const locked = (v: number) => prefilled?.[String(v)] !== undefined;

  const submit = (raw: string, keys: string[]) => {
    if (active === null) {
      return;
    }
    const row = rows.find(r => r.value === active)!;
    const c = checkCell(raw, row.p);
    if (!c.ok) {
      setInvalid(true);
      emit('invalid_input', { value: active, raw, reason: c.reason });
      return;
    }
    setInvalid(false);
    const next = { ...cells, [String(active)]: c.value };
    setCells(next);
    emit('cell_filled', {
      value: active,
      entered: raw,
      exact: [...c.value],
      correct: c.correct,
      keys: keys.slice(0, 40),
    });
    const after = checkLaw(rows, next);
    // Next open or wrong cell, in table order.
    const nextRow = rows.find(
      r =>
        !locked(r.value) &&
        (!(String(r.value) in next) || after.wrongCells.includes(r.value)) &&
        r.value !== active,
    );
    setActive(nextRow ? nextRow.value : null);
    if (after.complete) {
      emit('sum_checked', { sum: [...after.sum], ok: after.sumIsOne });
      const correct = after.wrongCells.length === 0;
      if (correct) {
        setDone(true);
      }
      p.onResult?.({
        correct,
        details: tableDetails(after),
        misconceptionHints: after.sumIsOne ? [] : ['law_sum_not_one'],
      });
    }
  };

  const own = showSolution ? checkLaw(rows, cells) : check;
  const markFor = (r: LawCheck['table'][number]) => {
    if (readonlyTable) {
      return null;
    }
    if (showSolution) {
      return own.correctCells.includes(r.value)
        ? ('correct' as const)
        : ('solution' as const);
    }
    if (r.entered === null) {
      return null;
    }
    return r.correct ? ('correct' as const) : ('extra' as const);
  };

  return (
    <Panel testID={`law-builder-${p.instanceId}`}>
      <View style={styles.table}>
        <View style={styles.headerCol}>
          <Text style={styles.headerText}>{ROW_X}</Text>
          <Text style={styles.headerText}>{ROW_P}</Text>
        </View>
        {check.table.map(r => {
          const mark = markFor(r);
          const tone =
            mark === 'correct'
              ? theme.feedback.success
              : mark === 'extra'
              ? theme.feedback.danger
              : mark === 'solution'
              ? theme.feedback.info
              : null;
          const isActive = live && active === r.value;
          return (
            <View key={r.value} style={styles.col}>
              <Text style={styles.valueText}>{formatInt(r.value)}</Text>
              <Pressable
                disabled={!live || locked(r.value)}
                onPress={() => {
                  setActive(r.value);
                  setInvalid(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`p(X = ${r.value})`}
                accessibilityState={{ selected: isActive }}
                testID={`law-cell-${r.value}`}
                style={[
                  styles.cell,
                  tone && {
                    borderColor: tone.text,
                    backgroundColor: tone.surface,
                  },
                  mark === 'extra' && styles.dashed,
                  isActive && styles.activeCell,
                ]}
              >
                <Text
                  style={styles.cellText}
                  testID={`law-cell-${r.value}-text`}
                >
                  {r.entered ? formatFraction(r.entered) : UNKNOWN}
                </Text>
                {tone && (
                  <Text style={[styles.cellMark, { color: tone.text }]}>
                    {tone.icon}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
      {showSumCheck && <SumCheck check={check} />}
      {done && (
        <Note tone="success" text={t('proba.law.done')} testID="law-done" />
      )}
      {live && active !== null && (
        <>
          <Text style={ui.ltr} testID="law-active">
            {activeLabel(active)}
          </Text>
          {invalid && <Note tone="info" text={t('lesson.invalidInput')} />}
          <NumericKeypad
            readonly={false}
            kind="probability"
            onSubmit={submit}
            testID="law-keypad"
          />
        </>
      )}
      {live && active === null && !check.complete && (
        <Text style={ui.readoutLabel}>{t('proba.law.fillHint')}</Text>
      )}
    </Panel>
  );
}

const LessonStateSchema = z.object({
  filled: z.array(
    z.object({
      value: z.number().int(),
      source: z.enum(['solved', 'revealed']),
    }),
  ),
});

/**
 * The law table filled by the lesson, one cell per solved EventPicker
 * (engine values). ✓ = found by the student, ◆ = shown after the hint
 * ladder. No sum row: the sum is asked right after.
 */
function ProgressiveMode(
  p: ViewProps<LawBuilderProps> & { rows: LawRowView[] },
) {
  const { t } = useTranslation();
  const filled = useMemo(() => {
    const state = LessonStateSchema.safeParse(p.lessonState);
    return state.success ? state.data.filled : [];
  }, [p.lessonState]);
  useImperativeHandle(p.ref, () => ({ getStateSnapshot: () => ({ filled }) }), [
    filled,
  ]);
  return (
    <Panel testID={`law-builder-${p.instanceId}`}>
      <View style={styles.table}>
        <View style={styles.headerCol}>
          <Text style={styles.headerText}>{ROW_X}</Text>
          <Text style={styles.headerText}>{ROW_P}</Text>
        </View>
        {p.rows.map(r => {
          const f = filled.find(x => x.value === r.value);
          const tone = f
            ? f.source === 'solved'
              ? theme.feedback.success
              : theme.feedback.info
            : null;
          return (
            <View key={r.value} style={styles.col}>
              <Text style={styles.valueText}>{formatInt(r.value)}</Text>
              <View
                style={[
                  styles.cell,
                  tone && {
                    borderColor: tone.text,
                    backgroundColor: tone.surface,
                  },
                  f?.source === 'revealed' && styles.dashed,
                ]}
                accessibilityLabel={
                  f
                    ? `${formatFraction(r.p)}, ${t(
                        f.source === 'solved'
                          ? 'lesson.lawSolved'
                          : 'lesson.lawRevealed',
                      )}`
                    : UNKNOWN
                }
                testID={`law-cell-${r.value}`}
              >
                <Text
                  style={styles.cellText}
                  testID={`law-cell-${r.value}-text`}
                >
                  {f ? formatFraction(r.p) : UNKNOWN}
                </Text>
                {f && tone && (
                  <Text
                    style={[styles.cellMark, { color: tone.text }]}
                    testID={`law-cell-${r.value}-${f.source}`}
                  >
                    {f.source === 'solved'
                      ? theme.feedback.success.icon
                      : REVEALED_MARK}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

const REVEALED_MARK = '◆';

function SumCheck({ check }: { check: LawCheck }) {
  const { t } = useTranslation();
  const sumText = `${SIGMA} p = ${formatFraction(check.sum)}`;
  return (
    <View style={styles.sum}>
      <Readout label={t('proba.law.sum')} value={sumText} testID="law-sum" />
      {check.complete &&
        (check.sumIsOne ? (
          check.wrongCells.length === 0 ? (
            <Note
              tone="success"
              text={t('proba.law.sumOk')}
              testID="law-sum-ok"
            />
          ) : (
            <Note
              tone="warning"
              text={t('proba.law.wrongCells')}
              testID="law-wrong-cells"
            />
          )
        ) : (
          <Note
            tone="warning"
            text={t('proba.law.sumNotOne')}
            testID="law-sum-not-one"
          />
        ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

function AssignMode(p: ModeProps) {
  const { t } = useTranslation();
  const { rows, emit, initial, showSolution } = p;
  const { balls, draw, k, valueFn, markDuplicates, showSumCheck } = p.props;
  const outcomes = useMemo(
    () => outcomesOf({ balls, draw, k }),
    [balls, draw, k],
  );
  const labels = useMemo(
    () => ballLabels(balls, markDuplicates),
    [balls, markDuplicates],
  );
  const [assigned, setAssigned] = useState<Record<string, number>>(
    initial.assigned,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const pickedRef = useRef<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(initial.done);
  const live = p.mode === 'interactive' && !done;

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ cells: {}, assigned, done }) }),
    [assigned, done],
  );

  const shownAssigned = useMemo<Record<string, number>>(
    () =>
      showSolution
        ? Object.fromEntries(outcomes.map(o => [o.id, valueOf(valueFn, o)]))
        : assigned,
    [assigned, outcomes, showSolution, valueFn],
  );
  const cells = useMemo(() => {
    const out: Record<string, Fraction> = {};
    for (const r of rows) {
      const n = Object.values(shownAssigned).filter(v => v === r.value).length;
      if (n > 0) {
        out[String(r.value)] = frac(n, outcomes.length);
      }
    }
    return out;
  }, [outcomes.length, rows, shownAssigned]);
  const check = checkLaw(rows, cells);

  const pick = useCallback((id: string) => {
    const next = pickedRef.current === id ? null : id;
    pickedRef.current = next;
    setPicked(next);
    setWrong(false);
  }, []);

  const assignTo = (value: number) => {
    const id = pickedRef.current;
    if (!id || !live) {
      return;
    }
    const o = outcomes.find(x => x.id === id)!;
    const correct = valueOf(valueFn, o) === value;
    emit('outcome_assigned', { outcomeId: id, value, correct });
    if (!correct) {
      setWrong(true);
      return;
    }
    const next = { ...assigned, [id]: value };
    setAssigned(next);
    pickedRef.current = null;
    setPicked(null);
    if (Object.keys(next).length === outcomes.length) {
      const after = checkLaw(
        rows,
        Object.fromEntries(
          rows.map(r => [
            String(r.value),
            frac(
              Object.values(next).filter(v => v === r.value).length,
              outcomes.length,
            ),
          ]),
        ),
      );
      setDone(true);
      emit('sum_checked', { sum: [...after.sum], ok: after.sumIsOne });
      p.onResult?.({ correct: true, details: tableDetails(after) });
    }
  };

  const unassigned = outcomes.filter(o => !(o.id in shownAssigned));

  return (
    <Panel testID={`law-builder-${p.instanceId}`}>
      {unassigned.length > 0 && (
        <>
          <Text style={ui.readoutLabel}>
            {t(live ? 'proba.law.assignHint' : 'proba.law.unassigned')}
          </Text>
          <View style={ui.grid}>
            {unassigned.map(o => (
              <OutcomeChip
                key={o.id}
                id={o.id}
                label={outcomeLabel(o, labels, draw)}
                mark={picked === o.id ? 'selected' : null}
                disabled={!live}
                onPress={pick}
                testIDPrefix="assign"
              />
            ))}
          </View>
        </>
      )}
      {wrong && (
        <Note
          tone="warning"
          text={t('proba.law.wrongAssign')}
          testID="assign-wrong"
        />
      )}
      <View style={styles.columns}>
        {rows.map(r => {
          const ids = outcomes.filter(o => shownAssigned[o.id] === r.value);
          const f = cells[String(r.value)];
          return (
            <Pressable
              key={r.value}
              onPress={() => assignTo(r.value)}
              disabled={!live || picked === null}
              accessibilityRole="button"
              accessibilityLabel={`X = ${r.value}`}
              testID={`assign-col-${r.value}`}
              style={[
                styles.column,
                picked !== null && live && styles.columnReady,
              ]}
            >
              <Text style={styles.valueText}>{formatInt(r.value)}</Text>
              {ids.map(o => (
                <Text key={o.id} style={styles.assigned}>
                  {outcomeLabel(o, labels, draw)}
                </Text>
              ))}
              <Text style={styles.cellText} testID={`assign-col-${r.value}-p`}>
                {f ? formatFraction(f) : UNKNOWN}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showSumCheck && <SumCheck check={check} />}
      {done && (
        <Note tone="success" text={t('proba.law.done')} testID="law-done" />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  table: {
    flexDirection: 'row',
    direction: 'ltr',
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.md,
  },
  headerCol: {
    justifyContent: 'space-around',
    paddingHorizontal: theme.space.xs,
    borderRightWidth: theme.border.thin,
    borderRightColor: theme.color.borderDefault,
    backgroundColor: theme.color.backgroundApp,
  },
  headerText: {
    fontSize: theme.font.size.small,
    fontStyle: 'italic',
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
    minHeight: theme.size.touch,
    textAlignVertical: 'center',
    lineHeight: theme.size.touch,
  },
  col: {
    flex: 1,
    alignItems: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.color.borderDefault,
  },
  valueText: {
    textAlign: 'center',
    fontSize: theme.font.size.bodyLarge,
    fontWeight: theme.font.weight.bold,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
    lineHeight: theme.size.touch,
  },
  cell: {
    minHeight: theme.size.touch,
    margin: theme.space.cellInset,
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCell: {
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.focus,
  },
  dashed: { borderStyle: 'dashed', borderWidth: theme.border.thick },
  cellText: {
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  cellMark: {
    position: 'absolute',
    top: theme.offset.cellMarkTop,
    right: theme.offset.cellMarkEnd,
    fontSize: theme.font.size.micro,
    fontWeight: theme.font.weight.bold,
  },
  sum: { gap: theme.space.xs },
  columns: { flexDirection: 'row', direction: 'ltr', gap: theme.space.xs },
  column: {
    flex: 1,
    minHeight: theme.size.assignColumnMinHeight,
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    paddingBottom: theme.space.xs,
    gap: theme.space.xxxs,
  },
  columnReady: {
    borderColor: theme.color.actionPrimary,
    borderStyle: 'dashed',
  },
  assigned: {
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
  },
});
