import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { RichView } from '../../lesson/feed/RichView';
import { useEmit, type ViewProps } from '../host';
import {
  ballLabels,
  diagnoseSelection,
  formatFraction,
  formatInt,
  outcomeLabel,
  outcomesOf,
  valueOf,
  type SelectionDiagnosis,
} from './logic';
import type { EventPickerProps } from './schemas';
import {
  ActionButton,
  Note,
  OutcomeChip,
  Panel,
  Readout,
  styles as ui,
  type ChipMark,
} from './ui';
import { frac } from '../../engine/rational';
import { theme } from '../../theme';

const SnapshotSchema = z.object({
  selected: z.array(z.string()),
  attempts: z.number().int().min(0),
  done: z.boolean(),
  lastExtra: z.array(z.string()),
  lastMissed: z.number().int().min(0),
});
type Snapshot = z.infer<typeof SnapshotSchema>;

const EMPTY: Snapshot = {
  selected: [],
  attempts: 0,
  done: false,
  lastExtra: [],
  lastMissed: 0,
};

/**
 * Task: tap every outcome that satisfies the event, then check. Feedback marks
 * the extra draws and says how many are missing, never which (the answer
 * itself only comes at the end of the hint ladder, CLAUDE.md rule 6).
 */
export function EventPicker(p: ViewProps<EventPickerProps>) {
  const { t } = useTranslation();
  const { balls, draw, k, event, valueFn, prompt, reveal, showFraction } =
    p.props;
  const { maxAttempts, showValues, markDuplicates } = p.props;
  const outcomes = useMemo(
    () => outcomesOf({ balls, draw, k }),
    [balls, draw, k],
  );
  const labels = useMemo(
    () => ballLabels(balls, markDuplicates),
    [balls, markDuplicates],
  );
  const ctx = useMemo(() => (valueFn ? { valueFn } : {}), [valueFn]);
  const initial = useMemo<Snapshot>(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : EMPTY;
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sel = useRef<string[]>(initial.selected);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [attempts, setAttempts] = useState(initial.attempts);
  const [done, setDone] = useState(initial.done);
  const [last, setLast] = useState<{ extra: string[]; missed: number }>({
    extra: initial.lastExtra,
    missed: initial.lastMissed,
  });
  const emit = useEmit('EventPicker', p);
  const locked = maxAttempts !== undefined && attempts >= maxAttempts && !done;
  const live = p.mode === 'interactive' && !done && !locked;
  const solution = useMemo(
    () =>
      p.showSolution
        ? diagnoseSelection([], outcomes, event, ctx).correct
        : null,
    [ctx, event, outcomes, p.showSolution],
  );

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({
        selected,
        attempts,
        done,
        lastExtra: last.extra,
        lastMissed: last.missed,
      }),
    }),
    [attempts, done, last, selected],
  );

  const toggle = useCallback(
    (id: string) => {
      const on = !sel.current.includes(id);
      const next = on
        ? [...sel.current, id]
        : sel.current.filter(x => x !== id);
      sel.current = next;
      setSelected(next);
      emit(on ? 'outcome_selected' : 'outcome_deselected', {
        outcomeId: id,
        count: next.length,
      });
    },
    [emit],
  );

  const submit = () => {
    const d: SelectionDiagnosis = diagnoseSelection(
      sel.current,
      outcomes,
      event,
      ctx,
    );
    const attempt = attempts + 1;
    setAttempts(attempt);
    setLast({ extra: d.extra, missed: d.missed.length });
    if (d.isCorrect) {
      setDone(true);
    }
    const details = {
      selected: d.selected,
      correct: d.correct,
      missed: d.missed,
      extra: d.extra,
      fraction: d.fraction,
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

  const markOf = (id: string): ChipMark => {
    const on = selected.includes(id);
    if (solution) {
      return solution.includes(id)
        ? on
          ? 'correct'
          : 'solution'
        : on
        ? 'extra'
        : null;
    }
    if (done && on) {
      return 'correct';
    }
    if (on && last.extra.includes(id)) {
      return 'extra';
    }
    return on ? 'selected' : null;
  };

  const showCount = showFraction && (reveal === 'live' || done);
  const reduced = frac(selected.length, outcomes.length);

  return (
    <Panel testID={`event-picker-${p.instanceId}`}>
      {prompt && (
        <RichView rich={prompt} fontSize={theme.font.size.bodyLarge} />
      )}
      {live && <Text style={ui.readoutLabel}>{t('proba.picker.hint')}</Text>}
      <View style={ui.grid}>
        {outcomes.map(o => (
          <OutcomeChip
            key={o.id}
            id={o.id}
            label={outcomeLabel(o, labels, draw)}
            {...(showValues &&
              valueFn && { badge: formatInt(valueOf(valueFn, o)) })}
            mark={markOf(o.id)}
            disabled={!live}
            onPress={toggle}
            testIDPrefix="pick"
          />
        ))}
      </View>
      {showCount && (
        <Readout
          label={t(done ? 'proba.picker.probability' : 'proba.picker.selected')}
          value={
            done && reduced[1] !== outcomes.length
              ? `${selected.length}/${outcomes.length} = ${formatFraction(
                  reduced,
                )}`
              : `${selected.length}/${outcomes.length}`
          }
          testID="picker-fraction"
        />
      )}
      {done && (
        <Note
          tone="success"
          text={t('proba.picker.correct')}
          testID="picker-correct"
        />
      )}
      {!done && attempts > 0 && last.extra.length > 0 && (
        <Note
          tone="warning"
          text={t('proba.picker.extra')}
          testID="picker-extra"
        />
      )}
      {!done && attempts > 0 && last.missed > 0 && (
        <Readout
          label={t('proba.picker.missed')}
          value={String(last.missed)}
          tone="warning"
          testID="picker-missed"
        />
      )}
      {solution && <Note tone="info" text={t('proba.picker.solution')} />}
      {locked && <Note tone="info" text={t('proba.picker.exhausted')} />}
      {live && (
        <ActionButton
          label={t('proba.picker.check')}
          primary
          disabled={selected.length === 0}
          onPress={submit}
          testID="picker-check"
        />
      )}
    </Panel>
  );
}
