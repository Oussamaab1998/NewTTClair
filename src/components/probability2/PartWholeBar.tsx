import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { productLine } from '../../engine/calcLines';
import { placeOnBar } from '../../engine/partWhole';
import {
  ratToLatex,
  ratToString,
  sameRat,
} from '../../engine/rationalFormat';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { Slider } from '../analysis/Slider';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import {
  barParts,
  partWholeFinding,
  partWholeModel,
  ratioLine,
} from './partWhole';
import type { PartWholeBarProps } from './schemas';

const SnapshotSchema = z.object({
  index: z.number().int().min(0).max(24),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/**
 * The arrow past the whole (shape, with the words and the dashed end: never
 * colour alone). A plain arrow: U+25B6 is drawn as a blue play-button emoji on iOS.
 */
const ARROW = '\u2192';
/** The start of the bar. */
const ZERO_LABEL = '0';

/**
 * A value on a bar from 0 to the whole, and past it. `place`: a stepped
 * control puts the student's value on the bar; a value above the whole gets
 * an arrow, the words "more than the whole" and a dashed end. `fraction_of_quantity`
 * (1/6 of 36): the engine writes the calculation only after a value is placed.
 * `feedback`: a picture of the value the student wrote ("12 of 6"), readonly,
 * with nothing about the right value. Opens its gate (`explored`) at the first
 * placed value; "I do not know, show me" places the whole (place) or the
 * right part (fraction_of_quantity) and logs `how: skipped`.
 */
export function PartWholeBar(p: ViewProps<PartWholeBarProps>) {
  const { t } = useTranslation();
  const model = useMemo(() => partWholeModel(p.props), [p.props]);
  const last = model.positions.length - 1;
  const wholeAt = model.positions.findIndex(x => sameRat(x, model.whole));
  const targetAt =
    model.target === null
      ? -1
      : model.positions.findIndex(x => sameRat(x, model.target!));

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success && s.data.index <= Math.max(last, 0)
      ? s.data
      : { index: 0, explored: null as 'done' | 'skipped' | null };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(initial.index);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const committed = useRef(initial.index);
  /** fraction_of_quantity: a finding that said "correct" was already sent. */
  const matchedSent = useRef(false);
  const route = useRef<string[]>([]);
  const emit = useEmit('PartWholeBar', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ index, explored }) }),
    [index, explored],
  );

  const feedbackMode = model.mode === 'feedback';
  const value = feedbackMode ? model.part! : model.positions[index]!;
  const parts = barParts(model, value);
  const placed = feedbackMode || explored !== null;

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped', at: number) => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      const v = model.positions[at]!;
      const matches = model.target !== null && sameRat(v, model.target);
      matchedSent.current = how === 'done' && matches;
      emit(
        'finding',
        partWholeFinding(model, v, route.current, how === 'done' ? 'found' : 'skipped'),
      );
    },
    [emit, model],
  );

  const commit = (i: number) => {
    if (!live || i === committed.current) {
      return;
    }
    committed.current = i;
    const v = model.positions[i]!;
    const at = placeOnBar(model.whole, v);
    const matches = model.target !== null && sameRat(v, model.target);
    route.current.push(`placed:${ratToString(v)}`);
    emit('value_placed', {
      value: ratToString(v),
      whole: ratToString(model.whole),
      ratio: ratToString(at.ratio),
      ...(model.target !== null && { matches }),
    });
    if (at.exceeds) {
      emit('exceeds_whole', {
        value: ratToString(v),
        whole: ratToString(model.whole),
      });
    }
    if (exploredRef.current === null) {
      finish('value_placed', 'done', i);
    } else if (matches && !matchedSent.current) {
      // The first value was wrong and this one is right: one more finding.
      matchedSent.current = true;
      emit('finding', partWholeFinding(model, v, route.current, 'found'));
    }
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    const at = model.mode === 'fraction_of_quantity' ? targetAt : wholeAt;
    committed.current = at;
    setIndex(at);
    route.current.push('reveal');
    finish('reveal', 'skipped', at);
  };

  const ratio = placeOnBar(model.whole, value);
  const matches = model.target !== null && sameRat(value, model.target);
  const line = ratioLine(value, model.whole);
  const showCalc =
    (feedbackMode && line !== null) ||
    (model.mode === 'place' && placed && ratio.exceeds && line !== null) ||
    (model.mode === 'fraction_of_quantity' && placed);
  /** Nothing is "the value I placed" before the student has moved the handle. */
  const showValue = feedbackMode || placed || index > 0;

  return (
    <Panel testID={`part-whole-${p.instanceId}`}>
      {p.props.insight && (
        <RichView rich={p.props.insight} fontSize={theme.font.size.body} />
      )}

      <Text style={ui.readoutLabel}>
        {t(
          model.mode === 'place'
            ? 'pv2.part.place'
            : model.mode === 'fraction_of_quantity'
            ? 'pv2.part.fraction'
            : 'pv2.part.feedbackCaption',
        )}
      </Text>

      {model.fraction !== null && (
        <View style={styles.pair}>
          <Text style={ui.readoutLabel}>{t('pv2.part.fractionLabel')}</Text>
          <MathBlock latex={ratToLatex(model.fraction)} fontSize={theme.font.size.bodyLarge} />
        </View>
      )}

      <View style={styles.barWrap}>
        <View
          style={styles.bar}
          testID="part-bar"
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('pv2.part.barLabel')}
        >
          {parts.fill > 0 && (
            <View style={[styles.fill, { flex: parts.fill }]} testID="part-fill" />
          )}
          <View style={{ flex: parts.gap }} />
          <View style={styles.wholeMark} testID="part-whole-mark" />
          {parts.exceeds && (
            <View style={[styles.over, { flex: parts.over }]} testID="part-over">
              <Text style={styles.arrow} testID="part-arrow">
                {ARROW}
              </Text>
            </View>
          )}
          <View style={{ flex: parts.rest }} />
        </View>
        <View style={styles.labels}>
          <View style={[styles.labelsFirst, { flex: toShare(model.whole, model.scale) }]}>
            <Text style={styles.tick}>{ZERO_LABEL}</Text>
            <Text style={styles.tick}>{ratToString(model.whole)}</Text>
          </View>
          <View style={{ flex: 1 - toShare(model.whole, model.scale) }} />
        </View>
      </View>

      <View style={styles.pair}>
        <Text style={ui.readoutLabel}>{t('pv2.part.wholeLabel')}</Text>
        <MathBlock latex={ratToLatex(model.whole)} fontSize={theme.font.size.bodyLarge} />
        {p.props.unit && <RichView rich={p.props.unit} fontSize={theme.font.size.callout} />}
      </View>

      {showValue && (
        <View style={styles.pair}>
          <Text style={ui.readoutLabel}>{t('pv2.part.valueLabel')}</Text>
          <View testID="part-value">
            <MathBlock latex={ratToLatex(value)} fontSize={theme.font.size.bodyLarge} />
          </View>
        </View>
      )}

      {parts.exceeds && (
        <Text style={[ui.readoutLabel, styles.exceeds]} testID="part-over-note">
          {t('pv2.part.exceeds')}
        </Text>
      )}

      {!feedbackMode && (
        <Slider
          min={0}
          max={last}
          step={1}
          value={index}
          onChange={setIndex}
          onCommit={commit}
          disabled={!live}
          accessibilityLabel={t('pv2.part.sliderLabel', { value: ratToString(value) })}
          testID="part-slider"
        />
      )}

      {showCalc && (
        <View style={styles.calc} testID="part-calc">
          {model.mode === 'fraction_of_quantity' && model.fraction !== null ? (
            <MathBlock
              latex={productLine([model.fraction, model.whole])}
              fontSize={theme.font.size.bodyLarge}
            />
          ) : (
            <MathBlock latex={line!} fontSize={theme.font.size.bodyLarge} />
          )}
          {model.mode === 'fraction_of_quantity' && placed && explored !== 'skipped' && (
            <Text style={ui.readoutLabel}>
              {t(matches ? 'pv2.part.same' : 'pv2.part.notSame')}
            </Text>
          )}
        </View>
      )}

      {explored === null && live && !feedbackMode && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="part-reveal"
        />
      )}
    </Panel>
  );
}

/** The whole's share of the bar (layout only). */
const toShare = (whole: readonly [number, number], scale: readonly [number, number]): number =>
  (whole[0] * scale[1]) / (whole[1] * scale[0]);

const styles = StyleSheet.create({
  pair: { gap: theme.space.xxs },
  barWrap: {
    paddingHorizontal: theme.pv2.barInset,
    gap: theme.space.xxs,
  },
  bar: {
    flexDirection: theme.mathSide.row,
    height: theme.pv2.bar,
    alignItems: 'stretch',
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  // The part: highlighter with an ink edge (the pair is in the contrast test).
  fill: {
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  wholeMark: {
    width: theme.border.selected,
    backgroundColor: theme.color.ink,
  },
  // Past the whole: a dashed ink end, an arrow, and the words below.
  over: {
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.ink,
    backgroundColor: theme.color.card,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  arrow: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
    color: theme.color.ink,
  },
  labels: { flexDirection: theme.mathSide.row },
  labelsFirst: {
    flexDirection: theme.mathSide.row,
    justifyContent: 'space-between',
  },
  tick: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  exceeds: { fontFamily: theme.font.family.ui.bold },
  calc: { gap: theme.space.xxs },
});
