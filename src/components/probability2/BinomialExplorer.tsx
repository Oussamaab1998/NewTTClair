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
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { Slider } from '../analysis/Slider';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import {
  barShares,
  binomialFinding,
  binomialModel,
  binomialTerms,
  momentLines,
  termLine,
} from './binomial';
import { makeExplored } from './finding';
import {
  MAX_TAPPABLE_BARS,
  SlotsPatternPropsSchema,
  type BinomialExplorerProps,
} from './schemas';
import { SlotsPattern } from './SlotsPattern';
import { allPatterns } from './slots';

const SnapshotSchema = z.object({
  n: z.number().int().min(1).max(15),
  pIndex: z.number().int().min(0).max(20),
  taps: z.array(z.number().int().min(0).max(15)).max(16),
  selected: z.number().int().min(0).max(15).nullable(),
  mean: z.boolean(),
  variance: z.boolean(),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/** The minus sign of the stepper (U+2212, never a hyphen). */
const MINUS = '−';
const PLUS = '+';

/**
 * The binomial law B(n, p), explored: bars of P(X = k) from the engine, a tap
 * (or a stepper, from 6 trials: 7 bars of 44 pt do not fit the column) shows
 * the term C(n,k) p^k q^(n-k) with the actual numbers, and the mean and the
 * variance as the terms np and npq, never as a sum of the terms (that
 * overflows for large n). The general formula appears only after two distinct
 * bars were looked at. Opens its gate (`explored`) then; "I do not know, show
 * me" looks at two bars for the student and logs `how: skipped`.
 */
export function BinomialExplorer(p: ViewProps<BinomialExplorerProps>) {
  const { t } = useTranslation();
  const m = useMemo(() => binomialModel(p.props), [p.props]);
  const nMin = m.ns[0]!;
  const nMax = m.ns[m.ns.length - 1]!;

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success &&
      s.data.n >= nMin &&
      s.data.n <= nMax &&
      s.data.pIndex < m.ps.length &&
      s.data.taps.every(k => k <= s.data.n)
      ? s.data
      : {
          n: m.initN,
          pIndex: m.initP,
          taps: [] as number[],
          selected: null as number | null,
          mean: false,
          variance: false,
          explored: null as 'done' | 'skipped' | null,
        };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [n, setN] = useState(initial.n);
  const [pIndex, setPIndex] = useState(initial.pIndex);
  const [taps, setTaps] = useState(initial.taps);
  const [selected, setSelected] = useState(initial.selected);
  const [mean, setMean] = useState(initial.mean);
  const [variance, setVariance] = useState(initial.variance);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const tapsRef = useRef(initial.taps);
  const route = useRef<string[]>([]);
  const emit = useEmit('BinomialExplorer', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({ n, pIndex, taps, selected, mean, variance, explored }),
    }),
    [n, pIndex, taps, selected, mean, variance, explored],
  );

  const prob = m.ps[pIndex]!;
  const terms = useMemo(() => binomialTerms(n, prob), [n, prob]);
  const shares = useMemo(() => barShares(terms), [terms]);
  const tappable = n + 1 <= MAX_TAPPABLE_BARS;
  const sel = selected !== null && selected <= n ? selected : null;
  const enough = taps.length >= Math.max(m.lock, 1);

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
        binomialFinding(
          m,
          { n, pIndex, taps: tapsRef.current },
          route.current,
          how === 'done' ? 'found' : 'skipped',
        ),
      );
    },
    [emit, m, n, pIndex],
  );

  const look = (k: number, via: 'bar' | 'step') => {
    if (!live) {
      return;
    }
    setSelected(k);
    route.current.push(`bar:${k}`);
    emit('bar_tapped', { k, via });
    if (!tapsRef.current.includes(k)) {
      tapsRef.current = [...tapsRef.current, k];
      setTaps(tapsRef.current);
    }
    if (tapsRef.current.length >= Math.max(m.lock, 1)) {
      finish(m.lock > 0 ? `${m.lock}_bars` : 'first_bar', 'done');
    }
  };
  const step = (dir: 1 | -1) => {
    const from = sel ?? (dir === 1 ? -1 : n + 1);
    look(Math.min(n, Math.max(0, from + dir)), 'step');
  };
  const toggle = (name: 'mean' | 'variance') => {
    if (!live) {
      return;
    }
    const on = name === 'mean' ? !mean : !variance;
    (name === 'mean' ? setMean : setVariance)(on);
    route.current.push(`${name}:${on ? 'on' : 'off'}`);
    emit('toggle_changed', { name, on });
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    tapsRef.current = [0, 1].filter(k => k <= n);
    setTaps(tapsRef.current);
    setSelected(1);
    setMean(true);
    setVariance(true);
    route.current.push('reveal');
    finish('reveal', 'skipped');
  };

  const showSlots =
    m.linkSlots && sel !== null && sel >= 1 && sel <= n - 1 && n <= 7;
  const slotsProps = showSlots
    ? SlotsPatternPropsSchema.parse({ n, k: sel, mode: 'free', meantToDistinguish: false })
    : null;

  return (
    <Panel testID={`binomial-explorer-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}

      <Text style={ui.readoutLabel}>{t('pv2.binom.move')}</Text>
      {nMin < nMax && (
        <View style={styles.pair}>
          <View testID="binom-n">
            <MathBlock latex={`n = ${n}`} fontSize={theme.font.size.bodyLarge} />
          </View>
          <Slider
            min={nMin}
            max={nMax}
            step={1}
            value={n}
            onChange={setN}
            onCommit={v => {
              if (live) {
                route.current.push(`n:${v}`);
                emit('n_changed', { n: v });
              }
            }}
            disabled={!live}
            accessibilityLabel={t('pv2.binom.nLabel', { n })}
            testID="binom-n-slider"
          />
        </View>
      )}
      <View style={styles.pair}>
        <View testID="binom-p">
          <MathBlock latex={`p = ${ratToLatex(prob)}`} fontSize={theme.font.size.bodyLarge} />
        </View>
        {!m.fixedP && (
          <Slider
            min={0}
            max={m.ps.length - 1}
            step={1}
            value={pIndex}
            onChange={setPIndex}
            onCommit={i => {
              if (live) {
                route.current.push(`p:${ratToString(m.ps[i]!)}`);
                emit('p_changed', { p: ratToString(m.ps[i]!) });
              }
            }}
            disabled={!live}
            accessibilityLabel={t('pv2.binom.pLabel', { p: ratToString(prob) })}
            testID="binom-p-slider"
          />
        )}
      </View>

      <Text style={ui.readoutLabel}>
        {t(tappable ? 'pv2.binom.tapBar' : 'pv2.binom.stepBar')}
      </Text>
      <View style={styles.bars} testID="binom-bars">
        {terms.map((term, k) => {
          const bar = (
            <>
              <View style={styles.chart}>
                <View
                  style={[
                    styles.bar,
                    sel === k && styles.barOn,
                    tappable && styles.barTap,
                    { height: Math.max(shares[k]! * theme.pv2.barChart, 1) },
                  ]}
                  testID={`binom-barfill-${k}`}
                />
              </View>
              <Text style={[styles.label, tappable && styles.labelButton]}>{k}</Text>
            </>
          );
          return tappable ? (
            <Pressable
              key={k}
              disabled={!live}
              onPress={() => look(k, 'bar')}
              accessibilityRole="button"
              accessibilityLabel={t('pv2.binom.barLabel', { k })}
              accessibilityState={{ selected: sel === k, disabled: !live }}
              testID={`binom-bar-${k}`}
              style={styles.column}
            >
              {bar}
            </Pressable>
          ) : (
            <View key={k} style={styles.columnSmall} testID={`binom-bar-${k}`}>
              {bar}
            </View>
          );
        })}
      </View>
      {!tappable && (
        <View style={styles.stepper}>
          <ActionButton
            label={MINUS}
            onPress={() => step(-1)}
            disabled={!live}
            testID="binom-step-down"
          />
          <View testID="binom-k">
            {sel !== null && (
              <MathBlock latex={`k = ${sel}`} fontSize={theme.font.size.bodyLarge} />
            )}
          </View>
          <ActionButton
            label={PLUS}
            onPress={() => step(1)}
            disabled={!live}
            testID="binom-step-up"
          />
        </View>
      )}

      {sel !== null && (
        <View style={styles.pair} testID="binom-term">
          <Text style={ui.readoutLabel}>{t('pv2.binom.term')}</Text>
          <MathBlock latex={termLine(n, sel, prob)} fontSize={theme.font.size.body} />
        </View>
      )}

      {showSlots && slotsProps && (
        <SlotsPattern
          props={slotsProps}
          mode="readonly"
          locale={p.locale}
          instanceId={`${p.instanceId}:slots`}
          onEvent={() => undefined}
          snapshot={{
            marks: Array.from({ length: n }, () => false),
            lists: { [String(sel)]: allPatterns(n, sel!) },
            k: sel!,
            fixed: null,
            level: 0,
            help: null,
            message: 'none',
            dup: null,
            flipped: false,
            confirmed: [sel!],
            revealed: false,
            explored: 'done',
          }}
        />
      )}

      <View style={styles.chips}>
        {(['mean', 'variance'] as const).map(name => {
          const on = name === 'mean' ? mean : variance;
          return (
            <Pressable
              key={name}
              disabled={!live}
              onPress={() => toggle(name)}
              accessibilityRole="button"
              accessibilityLabel={t(`pv2.binom.${name}`)}
              accessibilityState={{ selected: on, disabled: !live }}
              testID={`binom-toggle-${name}`}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={styles.chipText}>
                {on ? `${theme.feedback.success.icon} ` : ''}
                {t(`pv2.binom.${name}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {mean && (
        <View testID="binom-mean">
          <MathBlock latex={momentLines(n, prob)[0]!} fontSize={theme.font.size.bodyLarge} />
        </View>
      )}
      {variance && (
        <View testID="binom-variance">
          <MathBlock latex={momentLines(n, prob)[1]!} fontSize={theme.font.size.bodyLarge} />
        </View>
      )}

      {enough || m.lock === 0 ? (
        <View style={styles.pair} testID="binom-formula">
          <Text style={ui.readoutLabel}>{t('pv2.binom.formula')}</Text>
          <MathBlock
            latex="P(X = k) = C_{n}^{k} \times p^{k} \times q^{n-k}"
            fontSize={theme.font.size.bodyLarge}
          />
        </View>
      ) : (
        <Text style={ui.readoutLabel} testID="binom-locked">
          {t('pv2.binom.locked')}
        </Text>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="binom-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  pair: { gap: theme.space.xxs },
  bars: { flexDirection: theme.mathSide.row, alignItems: 'flex-end' },
  column: {
    width: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  columnSmall: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chart: {
    height: theme.pv2.barChart,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // A bar: muted with a control edge; the looked-at one: highlighter with a thick ink edge.
  bar: {
    alignSelf: 'stretch',
    marginHorizontal: theme.space.xs,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceMuted,
  },
  // A bar that can be tapped has a control edge and a button for its number: it must look tappable.
  barTap: {
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
  },
  labelButton: {
    minWidth: theme.space.section,
    textAlign: 'center',
    paddingVertical: theme.space.xxxs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    overflow: 'hidden',
  },
  barOn: {
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  label: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  stepper: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: { flexDirection: theme.reading.row, gap: theme.space.sm },
  chip: {
    flex: 1,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.button,
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
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.callout,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
});

