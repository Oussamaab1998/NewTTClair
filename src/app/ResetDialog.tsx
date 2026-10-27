import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { resetExercise, type DoneRecord } from '../state/doneParts';
import type { Event } from '../telemetry/events';
import { EventLog, type LogClock } from '../telemetry/log';
import { theme } from '../theme';

/** Swallows taps inside the dialog (they never reach the scrim). */
const swallow = () => undefined;

export type ResetCancelVia = 'no' | 'scrim' | 'back_gesture';

interface ResetDialogProps {
  /** The exercise to reset; null = closed. */
  exercise: { id: string; contentVersion: string } | null;
  eventStore: { append(events: readonly Event[]): void };
  doneRecord: Pick<DoneRecord, 'clearExercise'>;
  clock?: LogClock;
  /** Closed: `true` after a reset (the caller reads its done parts again). */
  onClose: (reset: boolean) => void;
}

/**
 * "Start the exercise from scratch" (DESIGN.md §4.5): one question, «لا» (the
 * filled, focused, safe answer) and «ابدا من جديد». Tapping outside or the back
 * gesture cancels. Confirming logs `exercise_reset` and clears the exercise's
 * done marks; its history stays (DECISIONS.md D25). Events: `ResetDialog
 * opened / cancelled { via } / confirmed`, all with the exercise id.
 */
export function ResetDialog({
  exercise,
  eventStore,
  doneRecord,
  clock,
  onClose,
}: ResetDialogProps) {
  const { t } = useTranslation();
  const no = useRef<React.ComponentRef<typeof View>>(null);
  // One log (one short session) per opening: the dialog's events and the reset.
  const [log, setLog] = useState<EventLog | null>(null);
  const logUi = (l: EventLog, name: string, payload: Record<string, string>) =>
    l.append([
      {
        t: 'component_event',
        questionId: 'exercise',
        stepId: 'reset',
        component: 'ResetDialog',
        name,
        payload,
      },
    ]);
  useEffect(() => {
    if (!exercise) {
      setLog(null);
      return;
    }
    const l = new EventLog(
      {
        sessionId: `reset-${Date.now().toString(36)}`,
        studentId: 'local-anon',
        exerciseId: exercise.id,
        contentVersion: exercise.contentVersion,
      },
      clock,
      eventStore,
    );
    setLog(l);
    logUi(l, 'opened', { exerciseId: exercise.id });
    // Focus starts on the safe answer.
    if (no.current) {
      AccessibilityInfo.sendAccessibilityEvent(no.current, 'focus');
    }
    // Once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id]);

  const cancel = (via: ResetCancelVia) => {
    if (exercise && log) {
      logUi(log, 'cancelled', { exerciseId: exercise.id, via });
    }
    onClose(false);
  };
  const confirm = () => {
    if (exercise && log) {
      logUi(log, 'confirmed', { exerciseId: exercise.id });
      resetExercise(exercise, { eventStore, doneRecord, log });
    }
    onClose(true);
  };

  return (
    <Modal
      visible={exercise !== null}
      transparent
      animationType="fade"
      onRequestClose={() => cancel('back_gesture')}
      testID="reset-modal"
    >
      <Pressable
        style={styles.scrim}
        onPress={() => cancel('scrim')}
        testID="reset-scrim"
      >
        <Pressable
          style={styles.dialog}
          onPress={swallow}
          accessible={false}
          testID="reset-dialog"
        >
          <Text style={styles.question}>{t('reset.question')}</Text>
          {/* Reading order: «لا» first (right), then the reset. */}
          <View style={styles.buttons}>
            <Pressable
              ref={no}
              onPress={() => cancel('no')}
              style={[styles.button, styles.no]}
              accessibilityRole="button"
              testID="reset-cancel"
            >
              <Text style={styles.noText}>{t('reset.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              style={[styles.button, styles.confirm]}
              accessibilityRole="button"
              testID="reset-confirm"
            >
              <Text style={styles.confirmText}>{t('reset.confirm')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** «ابدا من جديد»: quiet, under the primary button (mockup 07). */
export function ResetLink({
  exerciseId,
  onPress,
}: {
  exerciseId: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={styles.link}
      accessibilityRole="button"
      testID={`reset-${exerciseId}`}
    >
      <Text style={styles.linkText}>{t('reset.link')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Quiet: the primary action stays the button above.
  link: {
    minHeight: theme.size.touch,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
  },
  linkText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.pen,
    writingDirection: 'rtl',
  },
  scrim: {
    flex: 1,
    backgroundColor: theme.color.scrim,
    justifyContent: 'center',
    paddingHorizontal: theme.layout.gutter,
  },
  dialog: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    padding: theme.space.xxl,
    gap: theme.space.lg,
  },
  question: {
    ...theme.font.body,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  buttons: { flexDirection: theme.reading.row, gap: theme.space.sm },
  button: {
    flex: 1,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
  },
  // The safe answer: filled ink.
  no: { backgroundColor: theme.color.ink },
  noText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
  // The reset: outlined in the error colour, said in words (not colour alone).
  confirm: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.error.ink,
  },
  confirmText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.error.ink,
    writingDirection: 'rtl',
  },
});
