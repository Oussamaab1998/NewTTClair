import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich } from '../../content/schema';
import {
  AskAnswer,
  DeepDiveStart,
  HintBlock,
  ReturnDivider,
  StudentBubble,
  ToneBlock,
  Writeup,
} from '../../lesson/feed/Bubbles';
import { LongPressMenu } from '../../lesson/feed/LongPressMenu';
import {
  ReportSheet,
  type ReportSheetState,
} from '../../lesson/feed/ReportSheet';
import type * as DevOnly from '../dev';
import { FeedDemo } from './feedDemo';
import { NumericKeypad } from '../../lesson/feed/NumericKeypad';
import { OptionsQuestion } from '../../lesson/feed/OptionsQuestion';
import { TutorText } from '../../lesson/feed/TutorText';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';

/** Debug builds only (launch arguments); Metro drops it in release. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('../dev') as typeof DevOnly)
  : null;

// Scripted feeds through the real reducer (feedDemo.tsx).
const WRONG = [{ type: 'answer', value: { optionId: 'one' } }] as const;
const NOT_SURE = [{ type: 'not_sure' }] as const;
const NONE = [] as const;
const RIGHT = [{ type: 'answer', value: { optionId: 'none' } }] as const;

// Demo-only sample content (not lesson content; unreviewed).
const SAMPLE: Rich = {
  ar: [
    { ar: 'الحدث ' },
    { fr: 'B' },
    { ar: ' معناه ' },
    { fr: 'au moins une' },
    { ar: ' كورة عليها صفر.' },
  ],
};
const OPTIONS = [
  { id: 'a', label: { math: '\\frac{3}{10}' } },
  { id: 'b', label: { math: '\\frac{7}{10}' } },
  { id: 'c', label: { fr: 'aucune boule numérotée 0' } },
];

/** Storybook-like screen: every lesson block in isolation, interactive and readonly. Titles are component ids. */
export function LessonUiDemoScreen() {
  const [log, setLog] = useState<string[]>([]);
  // `-devDemo longPressMenu` / `longPressMenuPlain`: the tutor long-press menu
  // open with / without its Report group (height check).
  const demo = devOnly?.devDemoAtLaunch();
  const [menu, setMenu] = useState<string | null>(() =>
    demo === 'longPressMenu' || demo === 'longPressMenuPlain'
      ? 'الحدث B معناه au moins une كورة عليها صفر.'
      : null,
  );
  const push = (line: string) => setLog(l => [line, ...l].slice(0, 8));
  const { t } = useTranslation();
  // `-devDemo cardMenu`: a question card's "⋯" menu open, as on a card with
  // authored help inside a deep dive (all three actions).
  const [cardMenu, setCardMenu] = useState<ReportSheetState>(() =>
    devOnly?.devDemoAtLaunch() === 'cardMenu'
      ? {
          stage: 'menu',
          target: {
            blockId: 'demo-card',
            source: 'lesson',
            trust: 'lesson_unreviewed',
            prominent: false,
            itemKey: 'demo-card',
          },
          card: {
            stepKey: 'demo',
            actions: [
              {
                label: t('lesson.changeMethod'),
                testID: 'demo-change',
                onPress: () => {},
              },
              {
                label: t('lesson.simpler'),
                testID: 'demo-simpler',
                onPress: () => {},
              },
              {
                label: t('lesson.back'),
                testID: 'demo-back',
                onPress: () => {},
              },
            ],
          },
        }
      : null,
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      // `-devScroll y` (screenshots without taps).
      contentOffset={{ x: 0, y: devOnly?.devScrollAtLaunch() ?? 0 }}
      testID="lesson-ui-demo"
    >
      <Section title="log">
        {log.map((l, i) => (
          <Text key={i} style={styles.log}>
            {l}
          </Text>
        ))}
      </Section>
      <Section title="A1 first card + ask bar (chips open) at 390 pt" bleed>
        <FeedDemo
          part="A1"
          actions={NONE}
          from="question"
          width={theme.size.demoWidthWide}
          askBar
        />
      </Section>
      <Section title="A1 first card + ask bar (chips open) at 360 pt" bleed>
        <FeedDemo
          part="A1"
          actions={NONE}
          from="question"
          width={theme.size.demoWidthNarrow}
          askBar
        />
      </Section>
      <Section title="feed: 1.b not sure (deep dive)">
        <FeedDemo part="1b" actions={NOT_SURE} from="student" />
      </Section>
      <Section title="feed: 1.b wrong (red-pencil note, offer card)">
        <FeedDemo part="1b" actions={WRONG} from="student" />
      </Section>
      <Section title="feed: 1.b right (done card)">
        <FeedDemo part="1b" actions={RIGHT} from="question" />
      </Section>
      <Section title="tutor_text">
        <TutorText
          rich={SAMPLE}
          blockId="demo-1"
          longPress
          onLongPress={(id, quoted) => {
            push(`longpress ${id}`);
            setMenu(quoted);
          }}
        />
      </Section>
      <Section title="math">
        <MathBlock latex="p(B) = 1 - p(\bar{B})" />
      </Section>
      <Section title="student_bubble">
        <StudentBubble content={{ kind: 'typed', raw: '7/10' }} />
        <StudentBubble content={{ kind: 'message', message: 'notSure' }} />
        <StudentBubble
          content={{
            kind: 'quote',
            mode: 'why',
            // An A1 sentence: math inside a quote must stay in LTR order.
            quoted:
              'والصورة متاع \u2212x هي نفس الصورة متاع x. وصلنا لـ f(\u2212x) = f(x)',
          }}
        />
      </Section>
      <Section title="feedback">
        <ToneBlock tone="success" message="correct" />
        <ToneBlock tone="warning" message="wrong" />
        <ToneBlock tone="danger" rich={SAMPLE} />
        <ToneBlock tone="info" message="noCannedAnswer" />
        <HintBlock level={2} total={3} rich={{ math: '\\binom{3}{2}' }} />
        <AskAnswer parts={[SAMPLE, { math: '\\{0 ; 2\\}' }]} />
      </Section>
      <Section title="OptionsQuestion">
        <OptionsQuestion
          options={OPTIONS}
          readonly={false}
          onSelect={id => push(`option ${id}`)}
        />
        <OptionsQuestion
          options={OPTIONS}
          readonly
          result={{ optionId: 'b', correct: false }}
          onSelect={() => {}}
        />
      </Section>
      <Section title="NumericKeypad">
        <NumericKeypad
          readonly={false}
          onSubmit={(raw, keys) => push(`typed ${raw} [${keys.join(' ')}]`)}
          testID="demo-keypad"
        />
        <NumericKeypad
          readonly
          value="0,7"
          onSubmit={() => {}}
          testID="demo-keypad-ro"
        />
      </Section>
      <Section title="deep_dive">
        <DeepDiveStart />
        <ReturnDivider />
      </Section>
      <Section title="writeup">
        <Writeup lines={['p(B) = 1 − p(B̄) = 1 − 3/10 = 7/10.']} />
      </Section>
      <ReportSheet
        state={cardMenu}
        onOpenReport={target => setCardMenu({ stage: 'report', target })}
        onSend={() => setCardMenu({ stage: 'thanks' })}
        onAction={a => {
          push(`card ${a.testID}`);
          setCardMenu(null);
        }}
        onDismiss={() => setCardMenu(null)}
      />
      <LongPressMenu
        quoted={menu}
        {...(demo !== 'longPressMenuPlain' && {
          trust: t('lesson.trust.lesson_unreviewed'),
          onReport: () => {
            push('longpress report');
            setMenu(null);
          },
        })}
        onChoose={mode => {
          push(`ask ${mode}`);
          setMenu(null);
        }}
        onDismiss={() => {
          push('menu dismissed');
          setMenu(null);
        }}
      />
    </ScrollView>
  );
}

function Section({
  title,
  bleed = false,
  children,
}: {
  title: string;
  /** Full screen width, no padding (width checks: nothing cut by the section). */
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={bleed ? styles.bleed : styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  content: {
    padding: theme.space.lg,
    gap: theme.space.lg,
    paddingBottom: theme.space.scrollEnd,
  },
  bleed: {
    marginHorizontal: -theme.space.lg,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  section: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    gap: theme.space.xs,
  },
  sectionTitle: {
    fontSize: theme.font.size.footnote,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.textSecondary,
  },
  log: {
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
