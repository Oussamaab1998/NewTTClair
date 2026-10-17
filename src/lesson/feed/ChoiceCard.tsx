/**
 * Small planner card: a question with 2-3 one-tap answers (what is unclear,
 * understood or guessed, compress, a repair picture, a note for the teacher).
 * Labels come from i18n; the choice ids route the answer.
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CardPurpose, FeedItemOf } from '../session/types';
import { theme } from '../../theme';

const TITLES = {
  clarify: 'lesson.card.clarify.title',
  self_report: 'lesson.card.self_report.title',
  compress: 'lesson.card.compress.title',
  repair: 'lesson.card.repair.title',
  teacher_note: 'lesson.card.teacher_note.title',
} as const;

const LABELS = {
  counting: 'lesson.clarify.counting',
  why: 'lesson.clarify.why',
  link: 'lesson.clarify.link',
  understood: 'lesson.selfReport.understood',
  guessed: 'lesson.selfReport.guessed',
  dismissed: 'lesson.selfReport.dismissed',
} as const;

const YES_NO = {
  compress: { yes: 'lesson.card.compress.yes', no: 'lesson.card.compress.no' },
  repair: { yes: 'lesson.card.repair.yes', no: 'lesson.card.repair.no' },
  teacher_note: {
    yes: 'lesson.card.teacher_note.yes',
    no: 'lesson.card.teacher_note.no',
  },
} as const;

function labelKey(purpose: CardPurpose, choice: string) {
  if (
    purpose === 'compress' ||
    purpose === 'repair' ||
    purpose === 'teacher_note'
  ) {
    return YES_NO[purpose][choice === 'yes' ? 'yes' : 'no'];
  }
  return LABELS[choice as keyof typeof LABELS] ?? LABELS.why;
}

export const ChoiceCard = memo(function ChoiceCardImpl({
  item,
  onChoose,
}: {
  item: FeedItemOf<'choice_card'>;
  onChoose: (purpose: CardPurpose, choice: string) => void;
}) {
  const { t } = useTranslation();
  const open = item.status === 'open';
  return (
    <View
      style={[styles.card, !open && styles.inactive]}
      testID={`card-${item.purpose}-${item.status}`}
      accessibilityState={{ disabled: !open }}
    >
      <Text style={styles.title}>{t(TITLES[item.purpose])}</Text>
      <View style={styles.row}>
        {item.choices.map(choice => {
          const chosen = item.choice === choice;
          return (
            <Pressable
              key={choice}
              disabled={!open}
              onPress={() => onChoose(item.purpose, choice)}
              style={[styles.button, chosen && styles.chosen]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !open, selected: chosen }}
              testID={`card-${item.purpose}-${choice}`}
            >
              <Text style={styles.buttonText}>
                {chosen ? `${CHOSEN_MARK} ` : ''}
                {t(labelKey(item.purpose, choice))}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {item.status === 'closed' && (
        <Text style={styles.closed}>{t('lesson.card.closed')}</Text>
      )}
    </View>
  );
});

/** Shape, not only color, marks the chosen answer. */
const CHOSEN_MARK = '✓';

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.thin,
    borderStyle: 'dashed',
    borderColor: theme.color.deepDiveRail,
    padding: theme.space.lg,
    marginVertical: theme.space.xs,
    gap: theme.space.sm,
  },
  inactive: { opacity: theme.opacity.inactive },
  title: {
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  button: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    justifyContent: 'center',
  },
  chosen: {
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.thick,
    backgroundColor: theme.color.surfaceSelected,
  },
  buttonText: {
    fontSize: theme.font.size.callout,
    color: theme.color.actionPrimary,
    writingDirection: 'rtl',
  },
  closed: {
    fontSize: theme.font.size.footnote,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
