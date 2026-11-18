/**
 * The help «ما نعرفش» opens on a step (student test 2026-11-18, mockups
 * 2a-2c), one level per press, each one giving and never asking:
 * 1. «الفكرة»: the idea in words, with the step's symbols one per row;
 * 2. «مثال محلول»: a small example solved in front of him (its own
 *    numbers, a counted tree when there is one), the rule it shows, the
 *    bridge back to the exercise;
 * 3. «الطريقة على أعدادنا»: the method on the exercise's numbers, the
 *    general formula and, on a step where he writes a line, the line to
 *    fill (FillLine).
 * The levels already read fold to one line each (he can open one again);
 * the one just opened is shown whole. Content: src/content/help.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Ladder } from '../../../../content/help/schema';
import type { Rich } from '../../../../content/schema';
import { RichView } from '../../../../lesson/feed/RichView';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { theme } from '../../../../theme';
import { FigureView } from '../FigureView';
import { FillLine } from './FillLine';

const FOLDED_MARK = '◂';
/** The help mark on a level's title (an «i» in a circle). */
const INFO_MARK = 'i';
const OPEN_MARK = '▾';
const LEVELS = [1, 2, 3] as const;
type Level = (typeof LEVELS)[number];

const KIND: Record<Level, 'idea' | 'example' | 'method'> = {
  1: 'idea',
  2: 'example',
  3: 'method',
};

/** A row of the legend: the symbol, then what it says. */
function Legend({
  rows,
  testID,
}: {
  rows: readonly { math: string; text: Rich }[];
  testID: string;
}) {
  return (
    <View style={styles.legend} testID={testID}>
      {rows.map((r, i) => (
        <View key={i} style={styles.legendRow}>
          <View style={styles.symbol}>
            <MathBlock latex={r.math} fontSize={theme.font.size.bodyLarge} />
          </View>
          <View style={styles.legendText}>
            <RichView rich={r.text} fontSize={theme.font.size.callout} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Paragraphs({ list }: { list: readonly Rich[] }) {
  return (
    <>
      {list.map((r, i) => (
        <RichView key={i} rich={r} fontSize={theme.font.size.callout} />
      ))}
    </>
  );
}

/** The dots and «الأوّل من ثلاثة»: where this level is on the ladder. */
function Dots({ level }: { level: Level }) {
  const { t } = useTranslation();
  return (
    <View style={styles.dots}>
      {LEVELS.map(l => (
        <View key={l} style={[styles.dot, l <= level && styles.dotOn]} />
      ))}
      <Text style={styles.dotsText}>{t(`hybrid.ladder.of${level}`)}</Text>
    </View>
  );
}

function Title({ level }: { level: Level }) {
  const { t } = useTranslation();
  return (
    <View style={styles.titleRow}>
      <View style={[styles.mark, level === 2 && styles.markExample]}>
        <Text style={styles.markText}>{INFO_MARK}</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t(`hybrid.ladder.${KIND[level]}`)}
      </Text>
      <Dots level={level} />
    </View>
  );
}

/** One line for a level already read (opens it again). */
function Folded({
  level,
  summary,
  open,
  onToggle,
}: {
  level: Level;
  summary: Rich;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={styles.folded}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      testID={`ladder-fold-${level}`}
      onPress={onToggle}
    >
      <Text style={styles.foldMark}>{open ? OPEN_MARK : FOLDED_MARK}</Text>
      <Text style={styles.foldLabel}>{t(`hybrid.ladder.${KIND[level]}`)}</Text>
      <View style={styles.foldText}>
        <RichView
          rich={summary.ar ? { ar: summary.ar } : summary}
          numberOfLines={1}
          mathScroll={false}
          fontSize={theme.font.size.small}
          color={theme.color.textSecondary}
        />
      </View>
    </Pressable>
  );
}

function IdeaCard({ ladder }: { ladder: Ladder }) {
  return (
    <View style={[styles.card, styles.idea]} testID="ladder-level-1">
      <Title level={1} />
      <Paragraphs list={ladder.idea.text} />
      {ladder.idea.legend && (
        <Legend rows={ladder.idea.legend} testID="ladder-idea-legend" />
      )}
    </View>
  );
}

function ExampleCard({ ladder }: { ladder: Ladder }) {
  const ex = ladder.example;
  return (
    <View style={[styles.card, styles.example]} testID="ladder-level-2">
      <Title level={2} />
      <Paragraphs list={ex.story} />
      {ex.legend && <Legend rows={ex.legend} testID="ladder-example-legend" />}
      {ex.figure && (
        <FigureView
          spec={ex.figure}
          signature="ladder-example"
          testID="ladder-example-figure"
        />
      )}
      {ex.lines.map((l, i) => (
        <View key={i} style={styles.solved} testID={`ladder-example-line-${i}`}>
          {l.say && (
            <RichView rich={l.say} fontSize={theme.font.size.callout} />
          )}
          <View style={styles.math}>
            <MathBlock latex={l.math} fontSize={theme.font.size.reading} />
          </View>
        </View>
      ))}
      <View style={styles.rule} testID="ladder-example-rule">
        <RichView
          rich={ex.rule}
          fontSize={theme.font.size.body}
          fontFamily={theme.font.family.ui.bold}
        />
      </View>
      <RichView rich={ex.bridge} fontSize={theme.font.size.callout} />
    </View>
  );
}

function MethodCard({
  ladder,
  lines,
  disabled,
  busy,
  onLine,
}: {
  ladder: Ladder;
  lines: boolean;
  disabled: boolean;
  busy: boolean;
  onLine: (raw: string) => void;
}) {
  const m = ladder.method;
  return (
    <View style={styles.method} testID="ladder-level-3">
      <View style={[styles.card, styles.idea]}>
        <Title level={3} />
        <Paragraphs list={m.text.slice(0, 1)} />
        {m.formula !== undefined && (
          <View style={styles.formula}>
            <MathBlock latex={m.formula} fontSize={theme.font.size.bodyLarge} />
          </View>
        )}
        <Paragraphs list={m.text.slice(1)} />
      </View>
      {lines && m.fill && (
        <FillLine
          fill={m.fill}
          disabled={disabled}
          busy={busy}
          onLine={onLine}
        />
      )}
    </View>
  );
}

/** What a folded level says in one line. */
const summaryOf = (ladder: Ladder, level: Level): Rich =>
  level === 1
    ? ladder.idea.text[0]!
    : level === 2
    ? ladder.example.rule
    : ladder.method.text[0]!;

export function LadderView({
  ladder,
  level,
  lines,
  disabled,
  busy,
  onLine,
}: {
  ladder: Ladder;
  /** The levels opened so far (1 to 3); 0 shows nothing. */
  level: number;
  /** A step where he writes a line (the third level has a line to fill). */
  lines: boolean;
  disabled: boolean;
  busy: boolean;
  onLine: (raw: string) => void;
}) {
  const [opened, setOpened] = useState<ReadonlySet<Level>>(new Set());
  if (level < 1) {
    return null;
  }
  const now = Math.min(level, 3) as Level;
  const toggle = (l: Level) =>
    setOpened(o => {
      const next = new Set(o);
      if (!next.delete(l)) {
        next.add(l);
      }
      return next;
    });
  const card = (l: Level) =>
    l === 1 ? (
      <IdeaCard ladder={ladder} />
    ) : l === 2 ? (
      <ExampleCard ladder={ladder} />
    ) : (
      <MethodCard
        ladder={ladder}
        lines={lines}
        disabled={disabled}
        busy={busy}
        onLine={onLine}
      />
    );
  return (
    <View style={styles.wrap} testID={`ladder-${now}`}>
      {LEVELS.filter(l => l < now).map(l => (
        <View key={l} style={styles.wrap}>
          <Folded
            level={l}
            summary={summaryOf(ladder, l)}
            open={opened.has(l)}
            onToggle={() => toggle(l)}
          />
          {opened.has(l) && card(l)}
        </View>
      ))}
      {card(now)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.sm },
  card: {
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  idea: {
    backgroundColor: theme.color.draft.bg,
    borderWidth: theme.border.line,
    borderColor: theme.color.draft.border,
  },
  example: {
    backgroundColor: theme.color.deepDive.bg,
    borderWidth: theme.border.line,
    borderColor: theme.color.deepDive.edge,
    borderStyle: 'dashed',
  },
  method: { gap: theme.space.md },
  titleRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  mark: {
    width: theme.size.ladderMark,
    height: theme.size.ladderMark,
    borderRadius: theme.size.ladderMark / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markExample: { borderColor: theme.color.pen, borderStyle: 'dashed' },
  markText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
  },
  title: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    flex: 1,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  dots: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
  },
  dot: {
    width: theme.size.ladderDot,
    height: theme.size.ladderDot,
    borderRadius: theme.size.ladderDot / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
  },
  dotOn: { backgroundColor: theme.color.ink, borderColor: theme.color.ink },
  dotsText: {
    ...theme.font.small,
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    marginStart: theme.space.xxs,
  },
  legend: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.chip,
    padding: theme.space.sm,
    gap: theme.space.xs,
  },
  legendRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
  },
  symbol: {
    minWidth: theme.size.legendSymbol,
    alignItems: 'center',
    direction: 'ltr',
  },
  legendText: { flex: 1 },
  solved: { gap: theme.space.xxs },
  math: { direction: 'ltr', alignItems: 'center' },
  formula: {
    direction: 'ltr',
    alignItems: 'center',
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.chip,
    padding: theme.space.sm,
  },
  rule: {
    backgroundColor: theme.color.highlighter,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
  },
  folded: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: theme.size.touch,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.card,
    paddingHorizontal: theme.space.md,
  },
  foldMark: { ...theme.font.small, color: theme.color.textSecondary },
  foldLabel: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  foldText: { flex: 1 },
});
