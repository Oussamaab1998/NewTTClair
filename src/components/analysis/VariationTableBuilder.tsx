import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { evalFn, fnEntry } from '../../engine/analysis';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { useEmit, type ViewProps } from '../host';
import { ActionButton, Note, Panel, styles as ui } from '../probability/ui';
import { engineLimit } from './LimitExplorer';
import { readoutNumber, variationColumns, type Interval } from './plot';
import type { VariationTableBuilderProps } from './schemas';
import {
  cellIds,
  CYCLE,
  diagnoseVariation,
  kindOf,
  solutionCells,
  type Cells,
  type CellValue,
} from './variation';
import { VariationGrid, type GridPoint } from './VariationGrid';
import { theme } from '../../theme';

const CellSchema = z.enum(['+', '-', 'up', 'down', 'max', 'min', 'none']);
const SnapshotSchema = z.object({
  cells: z.record(z.string(), CellSchema),
  attempts: z.number().int().min(0),
  done: z.boolean(),
  lastWrong: z.array(z.string()),
});
type Snapshot = z.infer<typeof SnapshotSchema>;
const EMPTY: Snapshot = { cells: {}, attempts: 0, done: false, lastWrong: [] };

/** What a cell shows (shape and text, not color alone). */
const SHOW: Record<CellValue, string> = {
  '+': '+',
  '-': '−',
  up: '↗',
  down: '↘',
  max: 'max',
  min: 'min',
  none: '—',
};
const INF = { '-inf': '−∞', '+inf': '+∞' } as const;

/**
 * Task: fill the tableau de variation (signs of f', arrows, extremum at each
 * critical point), then check. Wrong cells are marked, never corrected; the
 * engine's table only comes with `showSolution` (end of the hint ladder).
 */
export function VariationTableBuilder(
  p: ViewProps<VariationTableBuilderProps>,
) {
  const { t } = useTranslation();
  const { fn, ends, prompt, maxAttempts } = p.props;
  const scan = useMemo<Interval>(
    () => [p.props.scan[0]!, p.props.scan[1]!],
    [p.props.scan],
  );
  const cols = useMemo(() => variationColumns(fn, scan), [fn, scan]);
  const ids = useMemo(() => cellIds(cols), [cols]);
  const solution = useMemo(() => solutionCells(cols), [cols]);
  const initial = useMemo<Snapshot>(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : EMPTY;
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cellsRef = useRef<Cells>(initial.cells);
  const [cells, setCells] = useState<Cells>(initial.cells);
  const [attempts, setAttempts] = useState(initial.attempts);
  const [done, setDone] = useState(initial.done);
  const [lastWrong, setLastWrong] = useState<string[]>(initial.lastWrong);
  const emit = useEmit('VariationTableBuilder', p);
  const locked = maxAttempts !== undefined && attempts >= maxAttempts && !done;
  const live = p.mode === 'interactive' && !done && !locked;
  const reveal = done || p.showSolution === true;
  const shown: Cells = p.showSolution ? solution : cells;
  const filled = ids.every(id => cells[id] !== undefined);

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({
        cells: cells as Record<string, CellValue>,
        attempts,
        done,
        lastWrong,
      }),
    }),
    [cells, attempts, done, lastWrong],
  );

  const tapCell = (id: string) => {
    const cycle = CYCLE[kindOf(id)];
    const cur = cellsRef.current[id];
    const next =
      cycle[(cur === undefined ? -1 : cycle.indexOf(cur)) + 1] ?? cycle[0]!;
    cellsRef.current = { ...cellsRef.current, [id]: next };
    setCells(cellsRef.current);
    setLastWrong(w => w.filter(x => x !== id));
    emit('cell_changed', { cell: id, value: next });
  };

  const submit = () => {
    const d = diagnoseVariation(cellsRef.current, cols);
    const attempt = attempts + 1;
    setAttempts(attempt);
    setLastWrong(d.wrong);
    if (d.isCorrect) {
      setDone(true);
    }
    const details = {
      cells: cellsRef.current as Record<string, CellValue>,
      wrong: d.wrong,
      missing: d.missing,
    };
    emit('submitted', {
      ...details,
      isCorrect: d.isCorrect,
      attempt,
      misconceptionHints: d.misconceptionHints,
    });
    if (!d.isCorrect && maxAttempts !== undefined && attempt >= maxAttempts) {
      emit('attempts_exhausted', { attempts: attempt });
    }
    if (p.mode === 'interactive') {
      p.onResult?.({
        correct: d.isCorrect,
        details,
        misconceptionHints: d.misconceptionHints,
      });
    }
  };

  const cell = (id: string) => {
    const v = shown[id];
    const wrong = !p.showSolution && lastWrong.includes(id);
    return (
      <Pressable
        onPress={() => tapCell(id)}
        disabled={!live}
        accessibilityRole="button"
        accessibilityLabel={`${id} ${v ?? '?'}`}
        testID={`vt-${id}`}
        style={[
          styles.cell,
          wrong && styles.wrong,
          p.showSolution && styles.solution,
        ]}
      >
        <Text style={ui.ltr}>{v === undefined ? '?' : SHOW[v]}</Text>
        {wrong && (
          <Text style={[ui.mark, styles.wrongMark]}>
            {theme.feedback.danger.icon}
          </Text>
        )}
      </Pressable>
    );
  };

  const endValue = (side: 'left' | 'right'): string | undefined => {
    const e = ends[side];
    if (e === '-inf' || e === '+inf') {
      const L = engineLimit(fn, e);
      return L === null ? undefined : readoutNumber(L);
    }
    return readoutNumber(evalFn(fn, e));
  };
  const last = cols.xs.length - 1;
  const points: GridPoint[] = cols.xs.map((c, i) => {
    if (i === 0 || i === last) {
      const side = i === 0 ? 'left' : 'right';
      const e = ends[side];
      const v = endValue(side);
      return {
        x: typeof e === 'number' ? readoutNumber(e) : INF[e],
        ...(v !== undefined && { value: v }),
      };
    }
    return {
      x: readoutNumber(c),
      fprime: '0',
      valueNode: cell(`extremum-${i}`),
      ...(reveal && { value: readoutNumber(evalFn(fn, c)) }),
    };
  });

  return (
    <Panel testID={`variation-${p.instanceId}`}>
      {prompt && (
        <RichView rich={prompt} fontSize={theme.font.size.bodyLarge} />
      )}
      <MathBlock latex={fnEntry(fn).latex} fontSize={theme.font.size.body} />
      {live && <Text style={ui.readoutLabel}>{t('analysis.table.hint')}</Text>}
      {live && !filled && (
        <Text style={ui.readoutLabel} testID="vt-fill-all">
          {t('analysis.table.fillAll')}
        </Text>
      )}
      <VariationGrid
        points={points}
        intervals={cols.signs.map((_, i) => ({
          sign: cell(`sign-${i}`),
          arrow: cell(`arrow-${i}`),
        }))}
        testID="vt-grid"
      />
      {done && (
        <Note
          tone="success"
          text={t('analysis.table.correct')}
          testID="vt-correct"
        />
      )}
      {!done && attempts > 0 && lastWrong.length > 0 && (
        <Note
          tone="warning"
          text={t('analysis.table.wrong')}
          testID="vt-wrong"
        />
      )}
      {locked && (
        <Note
          tone="info"
          text={t('proba.picker.exhausted')}
          testID="vt-exhausted"
        />
      )}
      {live && (
        <ActionButton
          label={t('proba.picker.check')}
          onPress={submit}
          disabled={!filled}
          primary
          testID="vt-check"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  cell: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    backgroundColor: theme.color.surfaceCard,
  },
  wrong: {
    borderStyle: 'dashed',
    borderWidth: theme.border.thick,
    borderColor: theme.feedback.danger.text,
  },
  wrongMark: { color: theme.feedback.danger.text },
  solution: { backgroundColor: theme.feedback.info.surface },
});
