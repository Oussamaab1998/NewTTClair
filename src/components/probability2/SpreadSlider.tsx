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

import { productLine } from '../../engine/calcLines';
import { parseExpression, toLatex } from '../../engine/expression';
import { div, toNumber, type Fraction } from '../../engine/rational';
import {
  findEndsExpression,
  largerSpread,
} from '../../engine/spreadChecks';
import { parseRat, ratToLatex, ratToString } from '../../engine/rationalFormat';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { Slider } from '../analysis/Slider';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import type { SpreadSliderProps } from './schemas';
import { spreadCalc, spreadFinding, spreadModel } from './spread';

const SnapshotSchema = z.object({
  index: z.number().int().min(0).max(20),
  visited: z.array(z.number().int().min(0).max(20)).max(21),
  answer: z.number().int().min(0).max(4).nullable(),
  correct: z.boolean(),
  unlocked: z.boolean(),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/** Layout only: a share of a track (0 to 1) from two exact fractions. */
const share = (x: Fraction, of: Fraction): number =>
  of[0] === 0 ? 0 : Math.min(1, toNumber(div(x, of)));

/**
 * The spread of a variable, made visible: the distance of each value to the
 * mean (a bar), the square of that distance (a square at one fixed scale), its
 * contribution p x distance squared (a piece of a stacked bar), and, only
 * after the student has looked at enough DISTINCT positions, the total. A
 * Bernoulli variable is moved with a stepped slider over p; "scenarios" are
 * laws with the same mean and different spreads; a "fixed" law is looked at
 * value by value. Optional checkpoint: which p gives the larger spread, or
 * which formula is 0 at p = 0 and p = 1 and largest at 1/2 (both graded by the
 * engine). Opens its gate (`explored`) once enough positions were visited;
 * "I do not know, show me" writes the total and logs `how: skipped`.
 */
export function SpreadSlider(p: ViewProps<SpreadSliderProps>) {
  const { t } = useTranslation();
  const model = useMemo(() => spreadModel(p.props), [p.props]);
  const last = model.positions.length - 1;
  const checkpoint = p.props.checkpoint;

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success && s.data.index <= last && s.data.visited.every(v => v <= last)
      ? s.data
      : {
          index: model.init,
          visited: [] as number[],
          answer: null as number | null,
          correct: false,
          unlocked: false,
          explored: null as 'done' | 'skipped' | null,
        };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(initial.index);
  const [visited, setVisited] = useState(initial.visited);
  const [answer, setAnswer] = useState(initial.answer);
  const [correct, setCorrect] = useState(initial.correct);
  const [unlocked, setUnlocked] = useState(initial.unlocked);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const visitedRef = useRef(initial.visited);
  const route = useRef<string[]>([]);
  const emit = useEmit('SpreadSlider', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({ index, visited, answer, correct, unlocked, explored }),
    }),
    [index, visited, answer, correct, unlocked, explored],
  );

  const here = model.positions[index]!;
  const frame = here.frame;
  const totalShown = model.show.total && (unlocked || visited.length >= model.lock);

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped', at: number) => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit('finding', spreadFinding(model, at, route.current, how === 'done' ? 'found' : 'skipped'));
    },
    [emit, model],
  );

  const visit = (i: number) => {
    if (!live) {
      return;
    }
    const seen = visitedRef.current.includes(i)
      ? visitedRef.current
      : [...visitedRef.current, i];
    visitedRef.current = seen;
    setVisited(seen);
    const label = model.positions[i]!.label;
    // route tokens are ASCII: the real minus of a label becomes a hyphen here only
    route.current.push(`moved:${label.replace('\u2212', '-')}`);
    if (model.family === 'bernoulli') {
      emit('slider_changed', { index: i, p: label, visited: seen.length });
    } else if (model.family === 'scenarios') {
      emit('scenario_selected', { id: label, visited: seen.length });
    } else {
      emit('value_focused', { x: model.values[i]!, visited: seen.length });
    }
    if (seen.length >= Math.max(model.lock, 1)) {
      finish(model.lock > 0 ? `${model.lock}_positions` : 'first_move', 'done', i);
    }
  };

  const moveTo = (i: number) => {
    setIndex(i);
    visit(i);
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    setUnlocked(true);
    route.current.push('reveal');
    finish('reveal', 'skipped', index);
  };

  const choices: string[] =
    checkpoint?.kind === 'larger_spread'
      ? checkpoint.options.map(o => ratToString(parseRat(o)!))
      : checkpoint?.kind === 'zero_at_ends'
      ? checkpoint.expressions
      : [];
  const rightIndex = (() => {
    if (checkpoint?.kind === 'larger_spread') {
      const r = largerSpread(checkpoint.options.map(o => parseRat(o)!));
      return r.ok ? r.index : -1;
    }
    if (checkpoint?.kind === 'zero_at_ends') {
      const r = findEndsExpression(checkpoint.expressions);
      return r.ok ? r.index : -1;
    }
    return -1;
  })();
  const answerCheckpoint = (i: number) => {
    if (!live || correct || !checkpoint) {
      return;
    }
    const ok = i === rightIndex;
    setAnswer(i);
    setCorrect(ok);
    route.current.push(`checkpoint:${choices[i]}`);
    emit('checkpoint_answered', { checkpoint: checkpoint.kind, choice: choices[i]!, correct: ok });
    if (ok && exploredRef.current === 'done') {
      emit('finding', spreadFinding(model, index, route.current, 'found', true));
    }
  };

  const sumLine = spreadCalc(frame).at(-1)!;
  const focus = model.family === 'fixed' ? index : -1;

  return (
    <Panel testID={`spread-slider-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}

      {model.family === 'bernoulli' && (
        <View style={styles.block}>
          <Text style={ui.readoutLabel}>{t('pv2.spread.move')}</Text>
          <View testID="spread-p">
            <MathBlock
              latex={`p = ${ratToLatex(here.p!)}`}
              fontSize={theme.font.size.bodyLarge}
            />
          </View>
          <Slider
            min={0}
            max={last}
            step={1}
            value={index}
            onChange={setIndex}
            onCommit={visit}
            disabled={!live}
            accessibilityLabel={t('pv2.spread.sliderLabel', { p: here.label })}
            testID="spread-slider"
          />
        </View>
      )}

      {model.family === 'scenarios' && (
        <View style={styles.block}>
          <Text style={ui.readoutLabel}>{t('pv2.spread.scenario')}</Text>
          <View style={styles.chips}>
            {model.positions.map((x, i) => (
              <Pressable
                key={x.label}
                disabled={!live}
                onPress={() => moveTo(i)}
                accessibilityRole="button"
                accessibilityLabel={t('pv2.spread.scenarioChip', { id: x.label })}
                accessibilityState={{ selected: index === i, disabled: !live }}
                testID={`spread-scenario-${i}`}
                style={[styles.chip, index === i && styles.chipOn]}
              >
                <Text style={styles.chipText}>{x.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {model.family === 'fixed' && live && (
        <ActionButton
          label={t('pv2.spread.next')}
          onPress={() => moveTo((index + 1) % model.positions.length)}
          testID="spread-next"
        />
      )}

      <View style={styles.pair}>
        <Text style={ui.readoutLabel}>{t('pv2.spread.mean')}</Text>
        <View testID="spread-mean">
          <MathBlock latex={ratToLatex(frame.mean)} fontSize={theme.font.size.bodyLarge} />
        </View>
      </View>

      {frame.rows.map((r, i) => (
        <View
          key={i}
          style={[styles.row, focus === i && styles.rowOn]}
          testID={`spread-row-${i}`}
        >
          <MathBlock
            latex={`x = ${r.x < 0 ? '-' : ''}${Math.abs(r.x)},\\; P = ${ratToLatex(r.p)}`}
            fontSize={theme.font.size.body}
          />
          {model.show.distances && (
            <View style={styles.pair}>
              <Text style={ui.readoutLabel}>{t('pv2.spread.distance')}</Text>
              <View style={styles.track}>
                <View
                  style={[styles.dist, { flex: share(r.dist, model.maxDist) }]}
                  testID={`spread-dist-${i}`}
                />
                <View style={{ flex: 1 - share(r.dist, model.maxDist) }} />
              </View>
              <MathBlock latex={ratToLatex(r.dist)} fontSize={theme.font.size.body} />
            </View>
          )}
          {model.show.squares && (
            <View style={styles.pair}>
              <Text style={ui.readoutLabel}>{t('pv2.spread.square')}</Text>
              <View
                style={[
                  styles.square,
                  {
                    width: share(r.dist, model.maxDist) * theme.pv2.spreadSquare,
                    height: share(r.dist, model.maxDist) * theme.pv2.spreadSquare,
                  },
                ]}
                testID={`spread-square-${i}`}
              />
              <MathBlock latex={ratToLatex(r.d2)} fontSize={theme.font.size.body} />
            </View>
          )}
          {model.show.contributions && (
            <View style={styles.pair}>
              <Text style={ui.readoutLabel}>{t('pv2.spread.contribution')}</Text>
              <View testID={`spread-w-${i}`}>
                <MathBlock latex={productLine([r.p, r.d2])} fontSize={theme.font.size.body} />
              </View>
            </View>
          )}
        </View>
      ))}

      {model.show.contributions && (
        <View
          style={styles.stack}
          testID="spread-stack"
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('pv2.spread.stackLabel')}
        >
          {frame.rows.map((r, i) => (
            <View
              key={i}
              style={[i % 2 === 0 ? styles.segA : styles.segB, { flex: share(r.w, model.maxVar) }]}
              testID={`spread-seg-${i}`}
            />
          ))}
          <View
            style={{
              flex: Math.max(
                0,
                1 - frame.rows.reduce((s, r) => s + share(r.w, model.maxVar), 0),
              ),
            }}
          />
        </View>
      )}

      {model.show.total &&
        (totalShown ? (
          <View style={styles.pair} testID="spread-total">
            <Text style={ui.readoutLabel}>{t('pv2.spread.total')}</Text>
            <MathBlock latex={sumLine} fontSize={theme.font.size.bodyLarge} />
          </View>
        ) : (
          <Text style={ui.readoutLabel} testID="spread-locked">
            {t('pv2.spread.locked')}
          </Text>
        ))}

      {checkpoint && explored !== null && (
        <View style={styles.block} testID="spread-checkpoint">
          <Text style={ui.readoutLabel}>
            {t(checkpoint.kind === 'larger_spread' ? 'pv2.spread.checkLarger' : 'pv2.spread.checkEnds')}
          </Text>
          <View style={styles.chips}>
            {choices.map((c, i) => (
              <Pressable
                key={c}
                disabled={!live || correct}
                onPress={() => answerCheckpoint(i)}
                accessibilityRole="button"
                accessibilityLabel={c}
                accessibilityState={{ selected: answer === i, disabled: !live || correct }}
                testID={`spread-choice-${i}`}
                style={[styles.chip, answer === i && styles.chipOn]}
              >
                {checkpoint.kind === 'zero_at_ends' ? (
                  <MathBlock
                    latex={toLatexOf(c)}
                    fontSize={theme.font.size.body}
                  />
                ) : (
                  <Text style={styles.chipText}>{c}</Text>
                )}
              </Pressable>
            ))}
          </View>
          {answer !== null && (
            <Text style={[ui.readoutLabel, styles.note]} testID="spread-verdict">
              {correct
                ? `${theme.feedback.success.icon} ${t('pv2.spread.right')}`
                : `${theme.feedback.warning.icon} ${t('pv2.spread.wrong')}`}
            </Text>
          )}
        </View>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="spread-reveal"
        />
      )}
    </Panel>
  );
}

/** A candidate formula in the safe grammar, drawn as math. */
function toLatexOf(source: string): string {
  const r = parseExpression(source, { variables: ['p'] });
  return r.ok ? toLatex(r.ast) : source;
}

const styles = StyleSheet.create({
  block: { gap: theme.space.xs },
  pair: { gap: theme.space.xxs },
  row: {
    gap: theme.space.xs,
    padding: theme.space.xs,
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  rowOn: {
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.surfaceSelected,
  },
  track: {
    flexDirection: theme.mathSide.row,
    height: theme.pv2.spreadBar,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  dist: {
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  // The square of the distance: one scale for every position (its side is the distance).
  square: {
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  stack: {
    flexDirection: theme.mathSide.row,
    height: theme.pv2.spreadBar,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  segA: {
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  segB: {
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.surfaceMuted,
  },
  chips: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  chip: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.sm,
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
  note: { fontFamily: theme.font.family.ui.bold },
});
