/**
 * Storybook-like screen for the worksheet (plan v2, track C): the page, the
 * keys, the number tiles and the four scaffold levels, with a demo profile
 * and a «ما نعرفش» button to watch the scaffold grow. Lines are marked by the
 * engine (`readLine`, and C(10, 3) for the expected count); nothing here is
 * lesson content (demo data, unreviewed).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SkillLevel } from '../../ai/profile/profile';
import { readLine } from '../../ai/checks/lines';
import { choose } from '../../engine/combinatorics';
import { sameRat } from '../../engine/rationalFormat';
import {
  emptyPage,
  fixLine,
  markLine,
  writeLine,
  type LineMark,
  type SheetStep,
} from '../../lesson/worksheet/model';
import {
  buildScaffold,
  scaffoldLevel,
  sourceFor,
} from '../../lesson/worksheet/scaffold';
import { studentLine } from '../../lesson/worksheet/sampleLines';
import { buildTiles } from '../../lesson/worksheet/tiles';
import { Worksheet } from '../../lesson/worksheet/Worksheet';
import { theme } from '../../theme';

// Demo-only: 10 balls, 3 drawn at once; his earlier small case (5 balls).
const GIVEN = ['10', '3'];
const HIS_LINES = [
  studentLine('L1', '5*4*3=60', 'credit', 'ordered'),
  studentLine('L2', '5*4*3/(3*2*1)=10', 'credit', 'total'),
];
const STEPS: SheetStep[] = [
  {
    id: 'ordered',
    label: { ar: [{ ar: 'نحسبو التيراجات بالترتيب' }] },
  },
  { id: 'total', label: { fr: 'Le nombre de tirages possibles' } },
];
const PROMPT = { fr: 'On tire simultanément 3 boules parmi 10.' };
const EXPECTED: readonly [number, number] = [choose(10, 3), 1];
const PROFILES: readonly SkillLevel[] = [
  'weak',
  'shaky',
  'ok',
  'solid',
  'unknown',
];

/** The engine's mark for the demo: sides that disagree, or the count reached. */
function markOf(raw: string): LineMark {
  const c = readLine(raw).chain;
  if (c.kind === 'unreadable') {
    return 'neutral';
  }
  if (c.kind === 'chain' && !c.equal) {
    return 'wrong';
  }
  return sameRat(c.value, EXPECTED) ? 'right' : 'neutral';
}

export function WorksheetDemoScreen() {
  const { t } = useTranslation();
  const [page, setPage] = useState(emptyPage);
  const [stepAt, setStepAt] = useState(0);
  const [profile, setProfile] = useState<SkillLevel>('shaky');
  const [dontKnows, setDontKnows] = useState(0);
  const [counting, setCounting] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const step = STEPS[stepAt]!;
  const level = scaffoldLevel(profile, dontKnows);
  const scaffold = useMemo(() => {
    const source = sourceFor(HIS_LINES, step.id);
    return source && buildScaffold(source, level);
  }, [step.id, level]);
  const tiles = useMemo(() => buildTiles(GIVEN, HIS_LINES), []);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="worksheet-demo"
    >
      <Section
        title={`scaffold level ${level} (profile ${profile}, «?» ×${dontKnows})`}
      >
        <View style={styles.row}>
          {PROFILES.map(p => (
            <DemoButton
              key={p}
              label={p}
              on={p === profile}
              onPress={() => setProfile(p)}
            />
          ))}
        </View>
        <View style={styles.row}>
          <DemoButton
            label={t('lesson.notSure')}
            onPress={() => setDontKnows(n => n + 1)}
          />
          <DemoButton label="step" onPress={() => setStepAt(i => 1 - i)} />
          <DemoButton
            label="n k ! C"
            on={counting}
            onPress={() => setCounting(c => !c)}
          />
          <DemoButton
            label="reset"
            onPress={() => {
              setPage(emptyPage());
              setDontKnows(0);
              setSent([]);
            }}
          />
        </View>
      </Section>
      <Section title={`worksheet (step: ${step.id})`}>
        <Worksheet
          step={step}
          prompt={PROMPT}
          lines={page.lines}
          tiles={tiles}
          scaffold={scaffold}
          counting={counting}
          onSubmit={(raw, info) => {
            setSent(s => [raw, ...s].slice(0, 6));
            setPage(p => {
              const out = info.fixes
                ? fixLine(p, info.fixes, info.nodes)
                : writeLine(p, step, info.nodes);
              return out ? markLine(out.page, out.line.id, markOf(raw)) : p;
            });
          }}
        />
      </Section>
      <Section title="sent to the engine (newest first)">
        {sent.map((raw, i) => (
          <Text key={i} style={styles.log}>
            {raw}
          </Text>
        ))}
      </Section>
    </ScrollView>
  );
}

function DemoButton({
  label,
  on = false,
  onPress,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, on && styles.buttonOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
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
  row: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  button: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    justifyContent: 'center',
  },
  // Selected: thicker pen border, not colour alone.
  buttonOn: {
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.highlighterSoft,
  },
  buttonText: { fontSize: theme.font.size.small, color: theme.color.ink },
  log: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.small,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
});
