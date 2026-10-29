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

import { sumLine } from '../../engine/calcLines';
import { frac } from '../../engine/rational';
import { ratToLatex } from '../../engine/rationalFormat';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import type { JsonObject } from '../contract';
import { useEmit, type ViewProps } from '../host';
import { hintLevelOf } from '../reveals';
import { makeExplored } from './finding';
import type { VariableTableProps } from './schemas';
import {
  runCheck,
  studentLaw,
  tableFinding,
  tableModel,
  type CheckId,
  type CheckResult,
} from './table';

const SnapshotSchema = z.object({
  assign: z.record(z.string(), z.number().int().min(0).max(5)),
  pen: z.number().int().min(0).max(5).nullable(),
  presses: z.record(z.string(), z.number().int().min(0).max(99)),
  last: z
    .object({
      check: z.enum(['all_used', 'sum', 'symmetry', 'law']),
      passed: z.boolean(),
      detail: z.enum(['ok', 'missing', 'sum_not_one', 'not_symmetric', 'values_wrong']),
      named: z.number().int().optional(),
      sum: z.tuple([z.number().int(), z.number().int()]).optional(),
      wrongValues: z.array(z.number().int()).optional(),
    })
    .nullable(),
  explored: z.enum(['done', 'skipped']).nullable(),
});

const CHECK_LABEL = {
  all_used: 'pv2.table.checkAll',
  sum: 'pv2.table.checkSum',
  symmetry: 'pv2.table.checkSym',
  law: 'pv2.table.checkLaw',
} as const satisfies Record<CheckId, string>;
const RESULT_TEXT = {
  'all_used:ok': 'pv2.table.allOk',
  'all_used:missing': 'pv2.table.allMissing',
  'sum:ok': 'pv2.table.sumOk',
  'sum:sum_not_one': 'pv2.table.sumNot',
  'symmetry:ok': 'pv2.table.symOk',
  'symmetry:not_symmetric': 'pv2.table.symNot',
  'law:ok': 'pv2.table.lawOk',
  'law:missing': 'pv2.table.lawMissing',
  'law:values_wrong': 'pv2.table.lawWrong',
} as const;

/**
 * The law of a random variable, built by the student: choose a value, tap the
 * outcomes that give it, watch the table of counts and probabilities fill, and
 * press the checks (all outcomes used? the sum? symmetric? the law itself?).
 * A check never gives the right counts: it says something is missing (naming
 * it only on the second press or at hint level 2), shows the student's own
 * sum, says the law is not symmetric, or names the values whose number of
 * outcomes is wrong. Opens its gate (`explored`) when the law check passes;
 * "I do not know, show me" places every outcome and logs `how: skipped`.
 */
export function VariableTable(p: ViewProps<VariableTableProps>) {
  const { t } = useTranslation();
  const m = useMemo(() => tableModel(p.props), [p.props]);
  const hintLevel = hintLevelOf(p.lessonState);

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success &&
      Object.keys(s.data.assign).every(
        k => Number(k) < m.items.length && s.data.assign[k]! < m.values.length,
      )
      ? s.data
      : {
          assign: {} as Record<string, number>,
          pen: null as number | null,
          presses: {} as Record<string, number>,
          last: null as CheckResult | null,
          explored: null as 'done' | 'skipped' | null,
        };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [assign, setAssign] = useState<Record<string, number>>(initial.assign);
  const [pen, setPen] = useState(initial.pen);
  const [presses, setPresses] = useState<Record<string, number>>(initial.presses);
  const [last, setLast] = useState<CheckResult | null>(
    (initial.last as CheckResult | null) ?? null,
  );
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const route = useRef<string[]>([]);
  const emit = useEmit('VariableTable', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({
        assign,
        pen,
        presses,
        // a plain JSON copy (the sum is a readonly pair)
        last: last === null ? null : (JSON.parse(JSON.stringify(last)) as JsonObject),
        explored,
      }),
    }),
    [assign, pen, presses, last, explored],
  );

  const numeric = (a: Record<string, number>): Record<number, number> =>
    Object.fromEntries(Object.entries(a).map(([k, v]) => [Number(k), v]));
  const law = studentLaw(m, numeric(assign));

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped', a: Record<string, number>) => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit(
        'finding',
        tableFinding(
          m,
          numeric(a),
          route.current,
          how === 'done' ? 'found' : 'skipped',
        ),
      );
    },
    // `numeric` is a pure helper.
     
    [emit, m],
  );

  const selectValue = (v: number) => {
    if (!live) {
      return;
    }
    setPen(v);
    emit('value_selected', { x: v });
  };
  const place = (i: number) => {
    if (!live || pen === null || explored === 'skipped') {
      return;
    }
    const next = { ...assign };
    if (next[String(i)] === pen) {
      delete next[String(i)];
    } else {
      next[String(i)] = pen;
    }
    setAssign(next);
    setLast(null);
    emit('mapping_changed', {
      outcome: m.items[i]!.id,
      value: next[String(i)] ?? null,
    });
  };
  const check = (id: CheckId) => {
    if (!live) {
      return;
    }
    const count = (presses[id] ?? 0) + 1;
    setPresses({ ...presses, [id]: count });
    const r = runCheck(m, numeric(assign), id, count, hintLevel);
    setLast(r);
    route.current.push(`${id}:${r.passed ? 'ok' : r.detail}`);
    emit('check_run', { check: id, passed: r.passed, detail: r.detail });
    if (id === 'law') {
      emit('law_submitted', {
        law: Object.fromEntries(law.counts.map((c, v) => [String(v), c])),
        correct: r.passed,
      });
      if (r.passed) {
        finish('law_correct', 'done', assign);
      }
    }
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    const all = Object.fromEntries(m.items.map((it, i) => [String(i), it.value]));
    setAssign(all);
    setLast(null);
    route.current.push('reveal');
    finish('reveal', 'skipped', all);
  };

  const wrong = new Set(last?.check === 'law' ? last.wrongValues ?? [] : []);
  const finished = explored !== null;

  return (
    <Panel testID={`variable-table-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}

      <Text style={ui.readoutLabel}>{t('pv2.table.pick')}</Text>
      <View style={styles.chips}>
        {m.values.map(v => (
          <Pressable
            key={v}
            disabled={!live || finished}
            onPress={() => selectValue(v)}
            accessibilityRole="button"
            accessibilityLabel={t('pv2.table.valueChip', { x: v })}
            accessibilityState={{ selected: pen === v, disabled: !live || finished }}
            testID={`table-value-${v}`}
            style={[styles.chip, pen === v && styles.chipOn]}
          >
            <Text style={styles.chipText}>
              {pen === v ? `${theme.feedback.success.icon} ` : ''}
              {v}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.items}>
        {m.items.map((it, i) => {
          const v = assign[String(i)];
          const named = last?.check === 'all_used' && last.named === i;
          return (
            <Pressable
              key={it.id}
              disabled={!live || finished}
              onPress={() => place(i)}
              accessibilityRole="button"
              accessibilityLabel={t(
                v === undefined ? 'pv2.table.outcomeEmpty' : 'pv2.table.outcomeSet',
                { o: it.label, x: v },
              )}
              accessibilityState={{ selected: v !== undefined, disabled: !live || finished }}
              testID={`table-outcome-${i}`}
              style={[styles.item, v !== undefined && styles.itemOn, named && styles.itemNamed]}
            >
              <Text style={styles.itemText}>{it.label}</Text>
              {v !== undefined && (
                <Text style={styles.badge} testID={`table-value-of-${i}`}>
                  {v}
                </Text>
              )}
              {named && <Text style={styles.badge}>{theme.feedback.warning.icon}</Text>}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.table} testID="table-law">
        <View style={styles.headRow} testID="table-head">
          <Text style={[ui.readoutLabel, styles.col]}>{t('pv2.table.colValue')}</Text>
          <Text style={[ui.readoutLabel, styles.col]}>{t('pv2.table.colCount')}</Text>
          <Text style={[ui.readoutLabel, styles.col]}>{t('pv2.table.colProb')}</Text>
        </View>
        {m.values.map(v => (
          <View
            key={v}
            style={[styles.tableRow, wrong.has(v) && styles.tableRowWrong]}
            testID={`table-row-${v}`}
          >
            <Text style={[styles.cellText, styles.col]}>{v}</Text>
            <Text style={[styles.cellText, styles.col]} testID={`table-count-${v}`}>
              {law.counts[v]}
            </Text>
            <View style={[styles.prob, styles.col]}>
              <MathBlock latex={ratToLatex(law.probs[v]!)} fontSize={theme.font.size.body} />
            </View>
            {wrong.has(v) && (
              <Text style={styles.badge} testID={`table-wrong-${v}`}>
                {theme.feedback.warning.icon}
              </Text>
            )}
          </View>
        ))}
      </View>

      {live && !finished && (
        <View style={styles.checks}>
          {m.checks.map(id => (
            <ActionButton
              key={id}
              label={t(CHECK_LABEL[id])}
              onPress={() => check(id)}
              testID={`table-check-${id}`}
            />
          ))}
        </View>
      )}

      {last && (
        <View style={styles.result} testID="table-result">
          <Text style={[ui.readoutLabel, styles.note]}>
            {t(
              RESULT_TEXT[`${last.check}:${last.detail}` as keyof typeof RESULT_TEXT] ??
                'pv2.table.lawMissing',
            )}
          </Text>
          {last.check === 'sum' && last.sum && (
            <MathBlock latex={ratToLatex(last.sum)} fontSize={theme.font.size.bodyLarge} />
          )}
          {last.check === 'all_used' && last.named !== undefined && (
            <Text style={styles.cellText} testID="table-named">
              {m.items[last.named]!.label}
            </Text>
          )}
        </View>
      )}

      {finished && (
        <View style={styles.result} testID="table-calc">
          <Text style={ui.readoutLabel}>{t('pv2.table.total')}</Text>
          <MathBlock
            latex={sumLine((explored === 'done' ? law.counts : m.trueCounts).map(c => frac(c)))}
            fontSize={theme.font.size.bodyLarge}
          />
        </View>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="table-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: theme.mathSide.row, flexWrap: 'wrap', gap: theme.space.sm },
  chip: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: theme.mathSide.row,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  chipOn: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  chipText: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  items: { flexDirection: theme.mathSide.row, flexWrap: 'wrap', gap: theme.space.xs },
  item: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xxs,
    paddingHorizontal: theme.space.xs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  itemOn: {
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.surfaceSelected,
  },
  itemNamed: { borderStyle: 'dashed' },
  itemText: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  badge: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  table: { gap: theme.space.xxs },
  tableRow: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xl,
    paddingVertical: theme.space.xxs,
    borderBottomWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
  },
  tableRowWrong: {
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.surfaceSelected,
  },
  headRow: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xl,
  },
  col: { width: theme.pv2.tableCol, textAlign: 'center' },
  cellText: {
    minWidth: theme.size.touch,
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  prob: { minWidth: theme.size.touch },
  checks: { flexDirection: theme.reading.row, flexWrap: 'wrap', gap: theme.space.sm },
  result: { gap: theme.space.xxs },
  note: { fontFamily: theme.font.family.ui.bold },
});

