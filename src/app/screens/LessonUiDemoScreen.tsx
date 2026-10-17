import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { NumericKeypad } from '../../lesson/feed/NumericKeypad';
import { OptionsQuestion } from '../../lesson/feed/OptionsQuestion';
import { TutorText } from '../../lesson/feed/TutorText';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';

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
  const [menu, setMenu] = useState<string | null>(null);
  const push = (line: string) => setLog(l => [line, ...l].slice(0, 8));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="lesson-ui-demo"
    >
      <Section title="log">
        {log.map((l, i) => (
          <Text key={i} style={styles.log}>
            {l}
          </Text>
        ))}
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
          content={{ kind: 'quote', mode: 'why', quoted: 'الحدث B' }}
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
      <LongPressMenu
        quoted={menu}
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
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
