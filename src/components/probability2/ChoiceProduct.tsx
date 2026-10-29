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

import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { colorIndexes } from '../probability/logic';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import {
  choiceCalc,
  choiceFinding,
  choiceModel,
  type Item,
} from './logic';
import type { ChoiceProductProps } from './schemas';
import { SliceBar } from './SliceBar';
import { Dots } from './ui';

const SnapshotSchema = z.object({
  picks: z.tuple([z.number().int().nullable(), z.number().int().nullable()]),
  mode: z.enum(['and', 'or']),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/** A cell above this many is not drawn one by one: the picture is a block. */
const MAX_CELLS = 60;
/** Stage names are words, never digits: a digit does not share a line with Arabic words. */
const STAGE_NAME = ['pv2.choice.stageFirst', 'pv2.choice.stageSecond'] as const;
/** The cell the student's picks light. */
const MARK = '●';

/**
 * Two stages of choice and what they make together. The student picks one
 * option in each stage: AND shows rows x columns (the picked row and column,
 * and the one cell where they meet), OR shows the two lists end to end (the
 * sum). A stage that picks 2 of 6 lists its 15 pairs. The product (or the
 * sum) is written, with the engine's own calculation, only once both picks
 * are made. Opens its gate (`explored`) at the second pick; "I do not know,
 * show me" picks for the student and logs `how: skipped`.
 */
export function ChoiceProduct(p: ViewProps<ChoiceProductProps>) {
  const { t } = useTranslation();
  const model = useMemo(() => choiceModel(p.props), [p.props]);
  const spoken = useMemo(() => {
    const names = new Map<string, string>();
    for (const s of p.props.stages) {
      if (s.balls) {
        const idx = colorIndexes(s.balls);
        for (const b of s.balls) {
          names.set(
            b.id,
            b.color ? t(`proba.ball.${b.color}`, { n: idx.get(b.id) }) : b.id,
          );
        }
      }
    }
    return (it: Item) => names.get(it.id) ?? it.label;
  }, [p.props.stages, t]);

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success
      ? s.data
      : { picks: [null, null] as [number | null, number | null], mode: p.props.mode, explored: null };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [picks, setPicks] = useState<[number | null, number | null]>(initial.picks);
  const [mode, setMode] = useState<'and' | 'or'>(initial.mode);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const picksRef = useRef(initial.picks);
  const modeRef = useRef(initial.mode);
  const route = useRef<string[]>([]);
  const emit = useEmit('ChoiceProduct', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ picks, mode, explored }) }),
    [picks, mode, explored],
  );

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped') => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit(
        'finding',
        choiceFinding(model, modeRef.current, route.current, how === 'done' ? 'found' : 'skipped'),
      );
    },
    [emit, model],
  );

  const pick = (stage: 0 | 1, option: number) => {
    if (!live) {
      return;
    }
    const next: [number | null, number | null] = [...picksRef.current];
    next[stage] = option;
    picksRef.current = next;
    setPicks(next);
    route.current.push(`pick:${stage + 1}:${option}`);
    emit('option_picked', {
      stage,
      option,
      items: model.stages[stage]!.options[option]!.map(i => i.id),
    });
    if (next[0] !== null && next[1] !== null) {
      finish('both_stages', 'done');
    }
  };
  const switchMode = (m: 'and' | 'or') => {
    if (!live || m === modeRef.current) {
      return;
    }
    modeRef.current = m;
    setMode(m);
    route.current.push(`switch:${m}`);
    emit('mode_switched', { mode: m });
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    const next: [number | null, number | null] = [picksRef.current[0] ?? 0, picksRef.current[1] ?? 0];
    picksRef.current = next;
    setPicks(next);
    route.current.push('reveal');
    finish('reveal', 'skipped');
  };

  const [rows, cols] = [model.stages[0]!.count, model.stages[1]!.count];
  const both = picks[0] !== null && picks[1] !== null;
  const blockText = `${rows} \u00d7 ${cols}`;
  const itemsText = (opt: readonly Item[]) => opt.map(spoken).join('، ');

  return (
    <Panel testID={`choice-product-${p.instanceId}`}>
      {p.props.insight && (
        <RichView rich={p.props.insight} fontSize={theme.font.size.body} />
      )}

      {model.stages.map((stage, si) => (
        <View key={si} style={styles.stage}>
          {stage.title ? (
            <RichView rich={stage.title} fontSize={theme.font.size.callout} />
          ) : (
            <Text style={ui.readoutLabel}>{t(STAGE_NAME[si]!)}</Text>
          )}
          <View style={styles.options}>
            {stage.options.map((opt, oi) => {
              const on = picks[si] === oi;
              return (
                <Pressable
                  key={oi}
                  disabled={!live}
                  onPress={() => pick(si as 0 | 1, oi)}
                  accessibilityRole="button"
                  accessibilityLabel={t('pv2.choice.option', { items: itemsText(opt) })}
                  accessibilityState={{ selected: on, disabled: !live }}
                  testID={`choice-option-${si}-${oi}`}
                  style={[styles.option, on && styles.optionOn]}
                >
                  {opt.some(i => i.color) ? (
                    <Dots items={opt} />
                  ) : (
                    <Text style={styles.word}>{opt.map(i => i.label).join(' ')}</Text>
                  )}
                  {on && <Text style={styles.check}>{theme.feedback.success.icon}</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {explored === null && live && (
        <Text style={ui.readoutLabel}>{t('pv2.choice.pick')}</Text>
      )}

      {p.props.allowSwitch && (
        <View style={styles.modes}>
          {(['and', 'or'] as const).map(m => (
            <Pressable
              key={m}
              disabled={!live}
              onPress={() => switchMode(m)}
              accessibilityRole="button"
              accessibilityLabel={t(`pv2.choice.${m}`)}
              accessibilityState={{ selected: mode === m, disabled: !live }}
              testID={`choice-mode-${m}`}
              style={[styles.mode, mode === m && styles.modeOn]}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextOn]}>
                {mode === m ? `${MARK} ` : ''}
                {t(`pv2.choice.${m}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {mode === 'and' ? (
        rows * cols <= MAX_CELLS ? (
          <View style={styles.matrix} testID="choice-matrix">
            {Array.from({ length: rows }, (_row, r) => (
              <View key={r} style={styles.matrixRow}>
                {Array.from({ length: cols }, (_col, c) => {
                  const hit = both && picks[0] === r && picks[1] === c;
                  const line = (picks[0] === r && picks[1] !== null) || (picks[1] === c && picks[0] !== null);
                  return (
                    <View
                      key={c}
                      testID={`choice-cell-${r}-${c}`}
                      style={[styles.cell, line && styles.cellLine, hit && styles.cellHit]}
                    >
                      {hit && <Text style={styles.cellMark}>{MARK}</Text>}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.block} testID="choice-block">
            <Text style={styles.word}>{blockText}</Text>
          </View>
        )
      ) : (
        <SliceBar
          slices={model.stages.map((s, i) => ({
            key: String(i),
            label: t(STAGE_NAME[i]!),
            count: s.count,
          }))}
          a11yLabel={s => `${s.label}: ${s.count}`}
          testIDPrefix="slice"
        />
      )}

      {both && (
        <View style={styles.calc} testID="choice-calc">
          <Text style={ui.readoutLabel}>{t('pv2.choice.total')}</Text>
          {choiceCalc(model, mode).map(line => (
            <MathBlock key={line} latex={line} fontSize={theme.font.size.bodyLarge} />
          ))}
        </View>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="choice-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  stage: { gap: theme.space.xs },
  options: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  option: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xxs,
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.space.xs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  optionOn: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  word: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  check: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
    // Ink on the highlighter (12:1); the green of the success tone is 4.28:1 there.
    color: theme.color.textPrimary,
  },
  modes: { flexDirection: theme.reading.row, gap: theme.space.sm },
  mode: {
    flex: 1,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  modeOn: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  modeText: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.callout,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  modeTextOn: { fontFamily: theme.font.family.ui.bold },
  matrix: { gap: theme.pv2.cellGap, alignSelf: 'center' },
  matrixRow: { flexDirection: theme.mathSide.row, gap: theme.pv2.cellGap },
  cell: {
    width: theme.pv2.cell,
    height: theme.pv2.cell,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  // The picked row and column: a tint. The cell where they meet: ink border, highlighter and a dot.
  cellLine: { backgroundColor: theme.color.surfaceMuted },
  cellHit: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  cellMark: {
    fontSize: theme.font.size.micro,
    color: theme.color.textPrimary,
  },
  block: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.size.touch,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceMuted,
  },
  calc: { gap: theme.space.xxs },
});
