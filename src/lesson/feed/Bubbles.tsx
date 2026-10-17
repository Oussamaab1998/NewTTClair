/** Small feed blocks: student bubble, feedback, hint, answer, ask answer, dividers, writeup. */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich, VariantKind } from '../../content/schema';
import type { StudentContent, UiMessage } from '../session/types';
import { RichView } from './RichView';
import { theme, type FeedbackTone } from '../../theme';

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
            {content.quoted}
          </Text>
          <Text style={styles.rtl}>{t(`lesson.askMode.${content.mode}`)}</Text>
        </>
      );
      break;
    case 'text':
      body = <Text style={styles.rtl}>{content.text}</Text>;
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
  const c = theme.feedback[tone];
  return (
    <View
      style={[styles.tone, { backgroundColor: c.surface, borderColor: c.text }]}
      testID={testID ?? `feedback-${tone}`}
    >
      <View style={styles.toneHeader}>
        <View style={[styles.icon, { borderColor: c.text }]}>
          <Text style={[styles.iconText, { color: c.text }]}>{c.icon}</Text>
        </View>
        {label}
      </View>
      {message && (
        <Text style={[styles.rtl, { color: c.text }]}>
          {t(`lesson.${message}`)}
        </Text>
      )}
      {rich && (
        <RichView
          rich={rich}
          color={c.text}
          fontSize={theme.font.size.bodyLarge}
        />
      )}
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
}: {
  text: string;
  level: number;
  total: number;
}) {
  return (
    <View style={styles.levelLabel}>
      <Text style={styles.ltrCount}>{levelText(level, total)}</Text>
      <Text style={styles.rtl}>{text}</Text>
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
    fontSize: theme.font.size.bodyLarge,
    lineHeight: theme.font.lineHeight.relaxed,
    color: theme.color.textPrimary,
  },
  student: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: theme.color.surfaceSelected,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    marginVertical: theme.space.xxs,
  },
  typed: {
    writingDirection: 'ltr',
    fontSize: theme.font.size.title,
    color: theme.color.textPrimary,
  },
  quote: { color: theme.color.textSecondary, fontStyle: 'italic' },
  tone: {
    borderWidth: theme.border.thin,
    borderRadius: theme.radius.xl,
    padding: theme.space.md,
    marginVertical: theme.space.xxs,
  },
  toneHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  icon: {
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.size.toneIcon / 2,
    borderWidth: theme.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.small,
  },
  levelLabel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  ltrCount: {
    writingDirection: 'ltr',
    color: theme.feedback.info.text,
    fontSize: theme.font.size.small,
  },
  askAnswer: {
    borderRightWidth: theme.border.focus,
    borderRightColor: theme.color.actionPrimary,
    paddingRight: theme.space.md,
    marginVertical: theme.space.xxs,
  },
  source: {
    fontSize: theme.font.size.caption,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  diveStart: {
    borderRightWidth: theme.border.focus,
    borderRightColor: theme.color.deepDiveRail,
    paddingRight: theme.space.sm,
    marginTop: theme.space.sm,
  },
  diveTitle: {
    color: theme.color.deepDiveRail,
    fontWeight: theme.font.weight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginVertical: theme.space.md,
  },
  rule: {
    flex: 1,
    height: theme.size.divider,
    backgroundColor: theme.color.deepDiveRail,
  },
  dividerText: {
    color: theme.color.deepDiveRail,
    fontSize: theme.font.size.callout,
  },
  paper: {
    backgroundColor: theme.color.surfacePaper,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderPaper,
    borderRadius: theme.radius.md,
    padding: theme.space.lg,
    marginVertical: theme.space.sm,
  },
  paperTitle: {
    fontWeight: theme.font.weight.semibold,
    marginBottom: theme.space.xs,
  },
  paperLine: {
    writingDirection: 'ltr',
    textAlign: 'left',
    fontSize: theme.font.size.body,
    lineHeight: theme.font.lineHeight.body,
    color: theme.color.textPrimary,
  },
});
