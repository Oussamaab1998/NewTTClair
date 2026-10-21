import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import type { FeedItem } from '../session/types';

export const FEEDBACK_CHOICES = ['disliked', 'ok', 'liked'] as const;
export type FeedbackChoice = (typeof FEEDBACK_CHOICES)[number];
export const FEEDBACK_TEXT_MAX = 300;

/** Shape + text, never color alone. */
const FACES: Record<FeedbackChoice, string> = {
  disliked: '☹',
  ok: '😐',
  liked: '☺',
};

/**
 * D19: after a question's "done" line, unless the last thing the question
 * showed was a self-report card (two "how was it" asks in a row).
 */
export function feedbackCardAllowed(items: readonly FeedItem[]): boolean {
  const done = items.findIndex(i => i.kind === 'done');
  if (done < 0) {
    return false;
  }
  let lastQuestion = -1;
  let lastSelfReport = -1;
  items.slice(0, done).forEach((i, n) => {
    if (i.kind === 'question') {
      lastQuestion = n;
    } else if (i.kind === 'choice_card' && i.purpose === 'self_report') {
      lastSelfReport = n;
    }
  });
  return lastSelfReport < lastQuestion;
}

/**
 * End-of-question feedback (D19): three faces with text, then an optional
 * short note; non-blocking (the student can just move on).
 */
export function FeedbackCard({
  onSend,
}: {
  onSend: (choice: FeedbackChoice, text?: string) => void;
}) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<FeedbackChoice | null>(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <Text style={styles.thanks} testID="feedback-thanks">
        {t('lesson.feedbackCard.thanks')}
      </Text>
    );
  }
  const send = (withNote: boolean) => {
    if (choice === null) {
      return;
    }
    const note = text.trim().slice(0, FEEDBACK_TEXT_MAX);
    onSend(choice, withNote && note ? note : undefined);
    setSent(true);
  };
  return (
    <View style={styles.card} testID="feedback-card">
      <Text style={styles.title}>{t('lesson.feedbackCard.title')}</Text>
      <View style={styles.faces}>
        {FEEDBACK_CHOICES.map(c => {
          const label = `${FACES[c]} ${t(`lesson.feedbackCard.${c}`)}`;
          return (
            <Pressable
              key={c}
              onPress={() => setChoice(c)}
              style={[styles.face, choice === c && styles.faceOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: choice === c }}
              testID={`feedback-${c}`}
            >
              <Text style={styles.faceText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {choice !== null && (
        <>
          <TextInput
            value={text}
            onChangeText={v => setText(v.slice(0, FEEDBACK_TEXT_MAX))}
            placeholder={t('lesson.feedbackCard.notePlaceholder')}
            placeholderTextColor={theme.color.textSecondary}
            maxLength={FEEDBACK_TEXT_MAX}
            style={styles.input}
            testID="feedback-note"
          />
          <View style={styles.faces}>
            <Pressable
              onPress={() => send(true)}
              style={[styles.face, styles.faceOn]}
              accessibilityRole="button"
              testID="feedback-send"
            >
              <Text style={styles.faceText}>
                {t('lesson.feedbackCard.send')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => send(false)}
              style={styles.face}
              accessibilityRole="button"
              testID="feedback-no-note"
            >
              <Text style={styles.faceText}>
                {t('lesson.feedbackCard.noNote')}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    padding: theme.space.md,
    marginVertical: theme.space.sm,
    gap: theme.space.sm,
  },
  title: {
    fontSize: theme.font.size.callout,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  faces: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  face: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    justifyContent: 'center',
  },
  faceOn: {
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.thick,
  },
  faceText: {
    fontSize: theme.font.size.callout,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.md,
    padding: theme.space.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  thanks: {
    fontSize: theme.font.size.footnote,
    color: theme.color.textSecondary,
    textAlign: 'center',
    marginVertical: theme.space.sm,
  },
});
