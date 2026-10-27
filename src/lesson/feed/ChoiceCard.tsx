/**
 * Small planner card: a question with 2-3 one-tap answers (what is unclear,
 * understood or guessed, compress, a repair picture, a note for the teacher,
 * how a typed value was found).
 * Labels come from i18n; the choice ids route the answer.
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CardPurpose, FeedItemOf } from '../session/types';
import { theme } from '../../theme';
import { LongPressBlock, type MenuVia } from './BlockActions';

const TITLES = {
  clarify: 'lesson.card.clarify.title',
  self_report: 'lesson.card.self_report.title',
  compress: 'lesson.card.compress.title',
  repair: 'lesson.card.repair.title',
  teacher_note: 'lesson.card.teacher_note.title',
  probe: 'lesson.card.probe.title',
  ask_next: 'lesson.card.ask_next.title',
} as const;

const LABELS = {
  counting: 'lesson.clarify.counting',
  why: 'lesson.clarify.why',
  link: 'lesson.clarify.link',
  understood: 'lesson.selfReport.understood',
  guessed: 'lesson.selfReport.guessed',
  dismissed: 'lesson.selfReport.dismissed',
} as const;

const PROBE = {
  counts_balls_not_pairs: 'lesson.card.probe.counts_balls_not_pairs',
  confuses_event_and_complement:
    'lesson.card.probe.confuses_event_and_complement',
  counts_all_outcomes: 'lesson.card.probe.counts_all_outcomes',
  counts_ordered_pairs: 'lesson.card.probe.counts_ordered_pairs',
  complement_ordered: 'lesson.card.probe.counts_ordered_pairs',
  merges_identical_balls: 'lesson.card.probe.merges_identical_balls',
  reuses_earlier_result: 'lesson.card.probe.reuses_earlier_result',
  dismissed: 'lesson.card.probe.dismissed',
} as const;

const ASK_NEXT = {
  hint: 'lesson.card.ask_next.hint',
  deep_dive: 'lesson.card.ask_next.deep_dive',
  dismissed: 'lesson.card.ask_next.dismissed',
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
  if (purpose === 'ask_next') {
    return ASK_NEXT[choice as keyof typeof ASK_NEXT] ?? ASK_NEXT.dismissed;
  }
  if (purpose === 'probe') {
    // C3: one short line per candidate misconception; unknown ids fall back to "not now".
    return choice in PROBE
      ? PROBE[choice as keyof typeof PROBE]
      : PROBE.dismissed;
  }
  return LABELS[choice as keyof typeof LABELS] ?? LABELS.why;
}

export const ChoiceCard = memo(function ChoiceCardImpl({
  item,
  onChoose,
  onTitleMenu,
}: {
  item: FeedItemOf<'choice_card'>;
  onChoose: (purpose: CardPurpose, choice: string) => void;
  /** Long-press on the title only (the buttons stay plain taps): trust + Report. */
  onTitleMenu?: (via: MenuVia) => void;
}) {
  const { t } = useTranslation();
  const open = item.status === 'open';
  return (
    <View
      style={[styles.card, !open && styles.inactive]}
      testID={`card-${item.purpose}-${item.status}`}
      accessibilityState={{ disabled: !open }}
    >
      {onTitleMenu ? (
        <LongPressBlock
          testID={`card-${item.purpose}-title-longpress`}
          label={t(TITLES[item.purpose])}
          onMenu={onTitleMenu}
        >
          <Text style={styles.title}>{t(TITLES[item.purpose])}</Text>
        </LongPressBlock>
      ) : (
        <Text style={styles.title}>{t(TITLES[item.purpose])}</Text>
      )}
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
  // Self-report / clarify / teacher-note: white, dashed edge, quiet buttons.
  card: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.inkMuted,
    padding: theme.space.lg,
    marginVertical: theme.space.xs,
    gap: theme.space.sm,
  },
  inactive: { opacity: theme.opacity.inactive },
  title: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  row: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  button: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    justifyContent: 'center',
  },
  chosen: {
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  buttonText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.medium,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  closed: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
