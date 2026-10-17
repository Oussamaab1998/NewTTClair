import React, { useCallback, useRef, useState } from 'react';
import {
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { isRtlLocale, type Locale } from '../../i18n';
import { RichText } from '../../lesson/blocks/RichText';
import { MathBlock, type MathRenderer } from '../../lesson/math/MathBlock';
import {
  ISOLATION_STRATEGIES,
  type IsolationStrategy,
} from '../../lesson/rich/runs';
import { FEED_SAMPLE, MATH_SAMPLES, SENTENCES } from './bidiTestFixtures';
import { nowMs } from '../../telemetry/clock';
import { theme } from '../../theme';

const STRATEGY_LETTER: Record<IsolationStrategy, string> = {
  none: 'A',
  unicode: 'B',
  nested: 'C',
  both: 'D',
};
const RENDERERS: readonly MathRenderer[] = ['native', 'katex'];
const STRESS_COUNT = 20;

type Tab = 'feed' | 'sentences' | 'math' | 'stress';
const TABS: readonly Tab[] = ['feed', 'sentences', 'math', 'stress'];
/** Tab shown on launch (change locally to screenshot a tab without tapping). */
const INITIAL_TAB: Tab = 'feed';
const MATH_PAGE_SIZE = 4;
const MATH_PAGES = Math.ceil(MATH_SAMPLES.length / MATH_PAGE_SIZE);

/**
 * Phase 0 device check: Arabic + isolated French terms + LTR math blocks.
 * One view per tab so each check fits a single screenshot.
 * See docs/PROGRESS.md for the screenshot checklist.
 */
export function BidiTestScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const rtl = isRtlLocale(locale);
  const [tab, setTab] = useState<Tab>(INITIAL_TAB);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [mathPage, setMathPage] = useState(0);

  const toggleLocale = () => {
    i18n.changeLanguage(rtl ? 'fr' : 'ar-TN');
  };

  const sentence = SENTENCES[sentenceIndex];

  return (
    <ScrollView
      testID="bidi-test-screen"
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, rtl && styles.rtlText]}>
          {t('bidiTest.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={toggleLocale}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{t('bidiTest.switchLocale')}</Text>
        </Pressable>
      </View>
      <Text style={styles.ltrInfo}>
        {t('bidiTest.deviceInfo', {
          os: Platform.OS,
          version: String(Platform.Version),
          rtl: String(I18nManager.isRTL),
        })}
      </Text>
      <Text style={[styles.warning, rtl && styles.rtlText]}>
        {t('bidiTest.unreviewed')}
      </Text>

      <ChipRow
        items={TABS.map(id => ({ id, label: t(`bidiTest.tab.${id}`) }))}
        selected={tab}
        onSelect={setTab}
        testIDPrefix="tab"
      />

      {tab === 'feed' ? (
        <>
          <SectionTitle title={t('bidiTest.sectionFeed')} rtl={rtl} />
          <View style={styles.card} testID="feed-sample">
            <RichText runs={FEED_SAMPLE.intro} />
            <MathBlock latex={FEED_SAMPLE.formula} />
            <RichText runs={FEED_SAMPLE.question} />
            <MathBlock latex={FEED_SAMPLE.questionMath} />
          </View>
        </>
      ) : null}

      {tab === 'sentences' && sentence ? (
        <>
          <SectionTitle title={t('bidiTest.sectionSentences')} rtl={rtl} />
          <ChipRow
            items={SENTENCES.map((s, i) => ({ id: i, label: s.id }))}
            selected={sentenceIndex}
            onSelect={setSentenceIndex}
            testIDPrefix="sentence-chip"
          />
          <View style={styles.card} testID={`sentence-${sentence.id}`}>
            {ISOLATION_STRATEGIES.map(strategy => (
              <View key={strategy} style={styles.variant}>
                <View style={styles.variantHeader}>
                  <Text style={styles.variantLetter}>
                    {STRATEGY_LETTER[strategy]}
                  </Text>
                  <Text style={[styles.variantLabel, rtl && styles.rtlText]}>
                    {t(`bidiTest.strategy.${strategy}`)}
                  </Text>
                </View>
                <RichText
                  runs={sentence.runs}
                  strategy={strategy}
                  testID={`sentence-${sentence.id}-${strategy}`}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {tab === 'math' ? (
        <>
          <SectionTitle title={t('bidiTest.sectionMath')} rtl={rtl} />
          <ChipRow
            items={Array.from({ length: MATH_PAGES }, (_, i) => ({
              id: i,
              label: `${i * MATH_PAGE_SIZE + 1}–${Math.min(
                (i + 1) * MATH_PAGE_SIZE,
                MATH_SAMPLES.length,
              )}`,
            }))}
            selected={mathPage}
            onSelect={setMathPage}
            testIDPrefix="math-page"
          />
          {MATH_SAMPLES.slice(
            mathPage * MATH_PAGE_SIZE,
            (mathPage + 1) * MATH_PAGE_SIZE,
          ).map((latex, j) => {
            const i = mathPage * MATH_PAGE_SIZE + j;
            return (
              <View key={latex} style={styles.card} testID={`math-${i}`}>
                <Text style={styles.latex}>{latex}</Text>
                {RENDERERS.map(renderer => (
                  <TimedMath key={renderer} latex={latex} renderer={renderer} />
                ))}
              </View>
            );
          })}
        </>
      ) : null}

      {tab === 'stress' ? (
        <>
          <SectionTitle title={t('bidiTest.sectionStress')} rtl={rtl} />
          <StressTest />
        </>
      ) : null}
    </ScrollView>
  );
}

function ChipRow<T extends string | number>({
  items,
  selected,
  onSelect,
  testIDPrefix,
}: {
  items: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.chipRow}>
      {items.map(item => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityState={{ selected: item.id === selected }}
          onPress={() => onSelect(item.id)}
          style={[styles.tab, item.id === selected && styles.tabSelected]}
          testID={`${testIDPrefix}-${item.id}`}
        >
          <Text
            style={[
              styles.tabText,
              item.id === selected && styles.tabTextSelected,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionTitle({ title, rtl }: { title: string; rtl: boolean }) {
  return <Text style={[styles.section, rtl && styles.rtlText]}>{title}</Text>;
}

type RenderState =
  | { status: 'pending' }
  | { status: 'done'; ms: number }
  | { status: 'error' };

function TimedMath({
  latex,
  renderer,
}: {
  latex: string;
  renderer: MathRenderer;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<RenderState>({ status: 'pending' });
  const label =
    state.status === 'done'
      ? t('bidiTest.renderMs', { renderer, ms: state.ms.toFixed(0) })
      : state.status === 'error'
      ? t('bidiTest.renderError', { renderer })
      : t('bidiTest.renderPending', { renderer });
  return (
    <View style={styles.timed}>
      <Text style={styles.timing}>{label}</Text>
      <MathBlock
        latex={latex}
        renderer={renderer}
        onRendered={ms => setState({ status: 'done', ms })}
        onError={() => setState({ status: 'error' })}
      />
    </View>
  );
}

type StressState =
  | { status: 'idle' }
  | { status: 'running'; renderer: MathRenderer; run: number }
  | { status: 'done'; renderer: MathRenderer; run: number; ms: number };

/** Mounts STRESS_COUNT blocks at once and measures until all have rendered. */
function StressTest() {
  const { t } = useTranslation();
  const [state, setState] = useState<StressState>({ status: 'idle' });
  const started = useRef(0);
  const rendered = useRef(0);
  const runCounter = useRef(0);

  const start = (renderer: MathRenderer) => {
    runCounter.current += 1;
    rendered.current = 0;
    started.current = nowMs();
    setState({ status: 'running', renderer, run: runCounter.current });
  };

  const onBlockRendered = useCallback(() => {
    rendered.current += 1;
    if (rendered.current === STRESS_COUNT) {
      const ms = nowMs() - started.current;
      setState(s =>
        s.status === 'running' ? { ...s, status: 'done', ms } : s,
      );
    }
  }, []);

  return (
    <View style={styles.card} testID="stress">
      <View style={styles.buttonRow}>
        {RENDERERS.map(renderer => (
          <Pressable
            key={renderer}
            accessibilityRole="button"
            onPress={() => start(renderer)}
            style={styles.button}
            testID={`stress-${renderer}`}
          >
            <Text style={styles.buttonText}>
              {t('bidiTest.stressRun', { renderer })}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => setState({ status: 'idle' })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{t('bidiTest.stressClear')}</Text>
        </Pressable>
      </View>
      {state.status !== 'idle' ? (
        <>
          <Text style={styles.timing} testID="stress-result">
            {state.status === 'done'
              ? t('bidiTest.stressResult', {
                  renderer: state.renderer,
                  count: STRESS_COUNT,
                  ms: state.ms.toFixed(0),
                })
              : t('bidiTest.stressRunning', { renderer: state.renderer })}
          </Text>
          {Array.from({ length: STRESS_COUNT }, (_, i) => (
            <MathBlock
              key={`${state.run}-${i}`}
              latex={MATH_SAMPLES[i % MATH_SAMPLES.length] ?? ''}
              renderer={state.renderer}
              onRendered={onBlockRendered}
              onError={onBlockRendered}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundApp },
  content: {
    paddingHorizontal: theme.space.xxl,
    backgroundColor: theme.color.backgroundApp,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  title: {
    flex: 1,
    fontSize: theme.font.size.title,
    fontWeight: theme.font.weight.bold,
    color: theme.color.textPrimary,
  },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  ltrInfo: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
  },
  warning: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.footnote,
    color: theme.feedback.warning.text,
  },
  section: {
    marginTop: theme.space.section,
    marginBottom: theme.space.sm,
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.bold,
    color: theme.color.textPrimary,
  },
  card: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.xl,
    padding: theme.space.lg,
    marginBottom: theme.space.md,
    gap: theme.space.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.xl,
  },
  tab: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceMuted,
  },
  tabSelected: { backgroundColor: theme.color.surfaceInverse },
  tabText: {
    fontSize: theme.font.size.callout,
    color: theme.color.textPrimary,
  },
  tabTextSelected: {
    color: theme.color.textOnInverse,
    fontWeight: theme.font.weight.bold,
  },
  variant: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.borderDefault,
    paddingTop: theme.space.xs,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  variantLetter: {
    fontSize: theme.font.size.caption,
    fontWeight: theme.font.weight.bold,
    color: theme.color.textOnInverse,
    backgroundColor: theme.color.surfaceBadge,
    borderRadius: theme.radius.xs,
    paddingHorizontal: theme.space.badgeX,
    overflow: 'hidden',
  },
  variantLabel: {
    flex: 1,
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  latex: {
    fontSize: theme.font.size.tiny,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  timed: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.borderDefault,
    paddingTop: theme.space.xxs,
  },
  timing: {
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  button: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceMuted,
  },
  buttonText: {
    fontSize: theme.font.size.callout,
    color: theme.color.textPrimary,
  },
});
