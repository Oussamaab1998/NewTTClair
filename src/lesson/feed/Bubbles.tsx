/** Small feed blocks: student bubble, feedback, hint, answer, ask answer, dividers, writeup. */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich, VariantKind } from '../../content/schema';
import type { StudentContent, UiMessage } from '../session/types';
import { RichView } from './RichView';
import { theme, type FeedbackTone } from '../../theme';
import { isolateInline } from '../rich/runs';

/**
 * Feed pencils (DESIGN.md §3): green = correct, red pencil = a wrong answer's
 * note (the reducer's `warning` tone; `danger` looks the same), highlighter =
 * hint / revealed answer / info. Icon + text, never color alone. Components
 * keep `theme.feedback` until D3.
 */
const RED_PENCIL = {
  surface: theme.color.error.noteBg,
  edge: theme.color.error.noteBorder,
  text: theme.color.error.noteText,
  mark: theme.color.error.ink,
};
const TONE: Record<
  FeedbackTone,
  { surface: string; edge: string; text: string; mark: string }
> = {
  success: {
    surface: theme.color.correct.bg,
    edge: theme.color.correct.ink,
    text: theme.color.correct.text,
    mark: theme.color.correct.ink,
  },
  danger: RED_PENCIL,
  info: {
    surface: theme.color.highlighterSoft,
    edge: theme.color.highlighter,
    text: theme.color.ink,
    mark: theme.color.ink,
  },
  warning: RED_PENCIL,
};

export const StudentBubble = memo(function StudentBubbleImpl({
  content,
}: {
  content: StudentContent;
}) {
  const { t } = useTranslation();
  let body: React.ReactNode;
  switch (content.kind) {
    case 'rich':
      body = <RichView rich={content.rich} />;
      break;
    case 'typed':
      body = <Text style={styles.typed}>{content.raw}</Text>;
      break;
    case 'message':
      body = <Text style={styles.rtl}>{t(`lesson.${content.message}`)}</Text>;
      break;
    case 'quote':
      body = (
        <>
          <Text style={[styles.rtl, styles.quote]} numberOfLines={3}>
            {isolateInline(content.quoted)}
          </Text>
          <Text style={styles.rtl}>{t(`lesson.askMode.${content.mode}`)}</Text>
        </>
      );
      break;
    case 'text':
      body = <Text style={styles.rtl}>{isolateInline(content.text)}</Text>;
      break;
  }
  return (
    <View style={styles.student} testID="student-bubble">
      {body}
    </View>
  );
});

interface ToneBlockProps {
  tone: FeedbackTone;
  message?: UiMessage;
  rich?: Rich;
  label?: React.ReactNode;
  testID?: string;
  children?: React.ReactNode;
}

/** Colored block with an icon (shape + color, never color alone). */
export const ToneBlock = memo(function ToneBlockImpl({
  tone,
  message,
  rich,
  label,
  testID,
  children,
}: ToneBlockProps) {
  const { t } = useTranslation();
  const c = TONE[tone];
  const icon = theme.feedback[tone].icon;
  return (
    <View
      style={[styles.tone, { backgroundColor: c.surface, borderColor: c.edge }]}
      testID={testID ?? `feedback-${tone}`}
    >
      <View style={styles.toneHeader}>
        <View style={[styles.icon, { borderColor: c.mark }]}>
          <Text style={[styles.iconText, { color: c.mark }]}>{icon}</Text>
        </View>
        {label}
      </View>
      {message && (
        <Text style={[styles.rtl, { color: c.text }]}>
          {t(`lesson.${message}`)}
        </Text>
      )}
      {rich && <RichView rich={rich} color={c.text} />}
      {children}
    </View>
  );
});

export function HintBlock({
  level,
  total,
  rich,
}: {
  level: number;
  total: number;
  rich: Rich;
}) {
  const { t } = useTranslation();
  return (
    <ToneBlock
      tone="info"
      rich={rich}
      testID={`hint-${level}`}
      label={<LevelLabel text={t('lesson.hint')} level={level} total={total} />}
    />
  );
}

const levelText = (level: number, total: number) => `${level}/${total}`;

/** "تلميح" and "1/3" as separate runs: digits never share a line with Arabic words. */
export function LevelLabel({
  text,
  level,
  total,
  muted = false,
}: {
  text: string;
  level: number;
  total: number;
  /** A used-up ladder: the disabled label colour (still 4.59:1). */
  muted?: boolean;
}) {
  return (
    <View style={styles.levelLabel}>
      <Text style={[styles.ltrCount, muted && styles.muted]}>
        {levelText(level, total)}
      </Text>
      <Text style={[styles.rtl, muted && styles.muted]}>{text}</Text>
    </View>
  );
}

export function AnswerBlock({ rich }: { rich: Rich }) {
  return (
    <ToneBlock tone="info" message="revealed" testID="revealed-answer">
      <RichView rich={rich} />
    </ToneBlock>
  );
}

export function AskAnswer({ parts }: { parts: Rich[] }) {
  const { t } = useTranslation();
  const source = `${t('lesson.fromLesson')} · ${t('lesson.draft')}`;
  return (
    <View style={styles.askAnswer} testID="ask-answer">
      <Text style={styles.source}>{source}</Text>
      {parts.map((p, i) => (
        <RichView key={i} rich={p} />
      ))}
    </View>
  );
}

export function DeepDiveStart() {
  const { t } = useTranslation();
  return (
    <View style={styles.diveStart} testID="deep-dive-start">
      <Text style={[styles.rtl, styles.diveTitle]}>
        {t('lesson.deepDiveTitle')}
      </Text>
    </View>
  );
}

/** Header of an authored variant (another way, a simpler example, a changed question, a base first). */
export function VariantStart({ kind }: { kind: VariantKind }) {
  const { t } = useTranslation();
  return (
    <View style={styles.diveStart} testID={`variant-start-${kind}`}>
      <Text style={[styles.rtl, styles.diveTitle]}>
        {t(`lesson.variantStart.${kind}`)}
      </Text>
    </View>
  );
}

export function ReturnDivider() {
  const { t } = useTranslation();
  return (
    <View style={styles.divider} testID="return-divider">
      <View style={styles.rule} />
      <Text style={styles.dividerText}>{t('lesson.returnToQuestion')}</Text>
      <View style={styles.rule} />
    </View>
  );
}

export function Writeup({ lines }: { lines: string[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.paper} testID="writeup">
      <Text style={[styles.rtl, styles.paperTitle]}>
        {t('lesson.writeupTitle')}
      </Text>
      {lines.map((line, i) => (
        <Text key={i} style={styles.paperLine} accessibilityLanguage="fr">
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
    ...theme.font.body,
    color: theme.color.ink,
  },
  // Blue pen: what the student wrote or chose, on the reading end side.
  student: {
    alignSelf: theme.reading.endAlign,
    maxWidth: '85%',
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    marginVertical: theme.space.xxs,
  },
  typed: {
    writingDirection: 'ltr',
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.title,
    color: theme.color.pen,
  },
  quote: { color: theme.color.inkMuted, fontStyle: theme.font.style.italic },
  tone: {
    borderWidth: theme.border.line,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    marginVertical: theme.space.xxs,
  },
  toneHeader: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  icon: {
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.size.toneIcon / 2,
    borderWidth: theme.border.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
  },
  muted: { color: theme.color.inkDisabled },
  levelLabel: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  ltrCount: {
    writingDirection: 'ltr',
    fontFamily: theme.font.family.ui.medium,
    color: theme.color.ink,
    fontSize: theme.font.size.small,
  },
  // A quiet card (no rail, DESIGN.md §1).
  askAnswer: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    marginVertical: theme.space.xxs,
  },
  source: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // The detour's start item is the tab on its sheet's top edge.
  diveStart: {
    alignSelf: theme.reading.startAlign,
    marginTop: theme.offset.cardTab,
    marginBottom: theme.space.xs,
    backgroundColor: theme.color.pen,
    borderRadius: theme.radius.tag,
    paddingHorizontal: theme.space.md,
  },
  diveTitle: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginVertical: theme.space.md,
  },
  rule: {
    flex: 1,
    borderTopWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.border,
  },
  dividerText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  paper: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    marginVertical: theme.space.sm,
  },
  paperTitle: {
    fontFamily: theme.font.family.ui.bold,
    marginBottom: theme.space.xs,
  },
  paperLine: {
    writingDirection: 'ltr',
    textAlign: 'left',
    ...theme.font.paper,
    color: theme.color.ink,
  },
});
