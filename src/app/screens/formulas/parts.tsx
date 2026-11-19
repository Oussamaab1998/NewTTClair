/**
 * Shared pieces of the «Formules» screens (docs/FORMULAS_PLAN.md, stage 4):
 * the header, the status pill (a shape and a word, never colour alone),
 * notes, buttons and the bottom bar. Same look as «Mes erreurs».
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FormulaStatus } from '../../../formulas/log';
import type { DueWords } from '../../../formulas/session';
import { MathBlock } from '../../../lesson/math/MathBlock';
import { theme } from '../../../theme';

const BACK_MARK = '→';
const CLOSE_MARK = '×';
const STATUS_MARK: Record<FormulaStatus, string> = {
  nouvelle: '○',
  en_cours: '◐',
  retenue: '✓',
};

export function FormulasHeader({
  title,
  subtitle,
  onBack,
  mark = 'back',
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  mark?: 'back' | 'close';
}) {
  const { t } = useTranslation('formulas');
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel={mark === 'back' ? t('back') : t('close')}
        testID="formulas-back"
        onPress={onBack}
      >
        <Text style={styles.headerMark}>{mark === 'back' ? BACK_MARK : CLOSE_MARK}</Text>
      </Pressable>
      <View style={styles.headerTitle}>
        <Text style={styles.headerText}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.headerSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export function StatusPill({ status }: { status: FormulaStatus }) {
  const { t } = useTranslation('formulas');
  const tone =
    status === 'retenue' ? pill.done : status === 'en_cours' ? pill.on : pill.new;
  return (
    <View style={[pill.box, tone.box]} testID={`formula-status-${status}`}>
      <Text style={[pill.text, tone.text]}>{STATUS_MARK[status]}</Text>
      <Text style={[pill.text, tone.text]}>{t(`status.${status}`)}</Text>
    </View>
  );
}

export function DueText({ words }: { words: DueWords }) {
  const { t } = useTranslation('formulas');
  if (words === null) {
    return null;
  }
  const text =
    words.kind === 'today'
      ? t('due.today')
      : words.kind === 'tomorrow'
        ? t('due.tomorrow')
        : t('due.days', { count: words.count });
  return <Text style={styles.small}>{text}</Text>;
}

export type Tone = 'ok' | 'err' | 'draft';
const TONE_MARK: Record<Tone, string> = {
  ok: theme.feedback.success.icon,
  err: theme.feedback.danger.icon,
  draft: theme.feedback.warning.icon,
};

/** A feedback box: the tone's mark and a title, then what follows. */
export function Note({
  tone,
  title,
  children,
  testID,
}: {
  tone: Tone;
  title: string;
  children?: React.ReactNode;
  testID?: string;
}) {
  const look = tone === 'ok' ? note.ok : tone === 'err' ? note.err : note.draft;
  return (
    <View style={[note.box, look.box]} testID={testID}>
      <Text style={[note.title, look.text]}>
        {TONE_MARK[tone]} {title}
      </Text>
      {children}
    </View>
  );
}

/** A formula as its own left-to-right block. */
export function Formula({
  latex,
  size = 'body',
  testID,
}: {
  latex: string;
  size?: 'body' | 'reading' | 'title';
  testID?: string;
}) {
  const fontSize =
    size === 'title'
      ? theme.font.size.title
      : size === 'reading'
        ? theme.font.size.reading
        : theme.font.size.body;
  return (
    <View style={styles.formula}>
      <MathBlock latex={latex} fontSize={fontSize} {...(testID !== undefined ? { testID } : {})} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  testID,
  grow = false,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet' | 'dashed';
  testID?: string;
  grow?: boolean;
}) {
  const look =
    kind === 'primary' ? button.primary : kind === 'dashed' ? button.dashed : button.quiet;
  return (
    <Pressable
      style={({ pressed }) => [
        button.box,
        look.box,
        grow && button.grow,
        pressed && button.pressed,
      ]}
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
    >
      <Text style={[button.text, look.text]}>{label}</Text>
    </Pressable>
  );
}

/** The bottom bar: the main action first, at the reading start. */
export function Bar({ children }: { children: React.ReactNode }) {
  return <View style={styles.bar}>{children}</View>;
}

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  content: {
    padding: theme.layout.gutter,
    gap: theme.space.lg,
    paddingBottom: theme.space.section,
  },
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    gap: theme.space.md,
    borderBottomColor: theme.color.borderDefault,
    borderBottomWidth: theme.border.line,
  },
  headerButton: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    borderColor: theme.color.borderControl,
    borderWidth: theme.border.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  headerMark: { ...theme.font.header, color: theme.color.textPrimary },
  headerTitle: { flex: 1 },
  headerText: { ...theme.font.header, color: theme.color.textPrimary, textAlign: 'right' },
  headerSub: { ...theme.font.small, color: theme.color.textSecondary, textAlign: 'right' },
  card: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  cardTop: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  name: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    flexShrink: 1,
  },
  label: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
  },
  text: { ...theme.font.body, color: theme.color.textPrimary },
  small: { ...theme.font.small, color: theme.color.textSecondary },
  paper: { ...theme.font.paper, color: theme.color.textPrimary },
  formula: { alignItems: 'flex-start' },
  bar: {
    flexDirection: theme.reading.row,
    gap: theme.space.sm,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.md,
    borderTopColor: theme.color.borderDefault,
    borderTopWidth: theme.border.line,
    backgroundColor: theme.color.backgroundApp,
  },
  questionCard: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    padding: theme.space.lg,
    paddingTop: theme.space.xxl,
    gap: theme.space.md,
  },
  questionTab: {
    position: 'absolute',
    top: -theme.space.md,
    ...theme.reading.startEdge(theme.space.lg),
    backgroundColor: theme.color.pen,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.sm,
  },
  questionTabText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
  },
  prompt: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
  },
});

const pill = {
  ...StyleSheet.create({
    box: {
      flexDirection: theme.mathSide.row,
      alignItems: 'center',
      gap: theme.space.xxs,
      borderRadius: theme.radius.tag,
      borderWidth: theme.border.line,
      paddingHorizontal: theme.space.sm,
    },
    text: { ...theme.font.small, fontFamily: theme.font.family.ui.bold },
  }),
  new: StyleSheet.create({
    box: { borderColor: theme.color.borderControl, backgroundColor: theme.color.card },
    text: { color: theme.color.textSecondary },
  }),
  on: StyleSheet.create({
    box: { borderColor: theme.color.draft.border, backgroundColor: theme.color.draft.bg },
    text: { color: theme.color.draft.text },
  }),
  done: StyleSheet.create({
    box: { borderColor: theme.color.correct.ink, backgroundColor: theme.color.correct.bg },
    text: { color: theme.color.correct.text },
  }),
};

const note = {
  ...StyleSheet.create({
    box: {
      borderRadius: theme.radius.xl,
      borderWidth: theme.border.line,
      padding: theme.space.md,
      gap: theme.space.xs,
    },
    title: { ...theme.font.small, fontFamily: theme.font.family.ui.bold },
  }),
  ok: StyleSheet.create({
    box: { borderColor: theme.color.correct.ink, backgroundColor: theme.color.correct.bg },
    text: { color: theme.color.correct.text },
  }),
  err: StyleSheet.create({
    box: { borderColor: theme.color.error.noteBorder, backgroundColor: theme.color.error.noteBg },
    text: { color: theme.color.error.noteText },
  }),
  draft: StyleSheet.create({
    box: { borderColor: theme.color.draft.border, backgroundColor: theme.color.draft.bg },
    text: { color: theme.color.draft.text },
  }),
};

const button = {
  ...StyleSheet.create({
    box: {
      minHeight: theme.size.touch,
      borderRadius: theme.radius.button,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.space.lg,
    },
    grow: { flex: 1 },
    pressed: { opacity: theme.opacity.pressed },
    text: { ...theme.font.body, fontFamily: theme.font.family.ui.bold },
  }),
  primary: StyleSheet.create({
    box: { backgroundColor: theme.color.ink },
    text: { color: theme.color.textOnAccent },
  }),
  quiet: StyleSheet.create({
    box: {
      backgroundColor: theme.color.card,
      borderWidth: theme.border.line,
      borderColor: theme.color.borderControl,
    },
    text: { color: theme.color.textPrimary },
  }),
  dashed: StyleSheet.create({
    box: {
      backgroundColor: theme.color.card,
      borderWidth: theme.border.line,
      borderColor: theme.color.borderControl,
      borderStyle: 'dashed',
    },
    text: { color: theme.color.textPrimary },
  }),
};
