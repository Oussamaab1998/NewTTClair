import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import type { ReportTarget } from './reportTarget';

export const REPORT_REASONS = [
  'wrong_math',
  'unclear',
  'wording',
  'bug',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Matches the event schema's short-text limit, kept shorter for a minor's note. */
export const REPORT_TEXT_MAX = 300;

/** Taps inside the sheet (incl. on a disabled button) never reach the backdrop. */
const swallow = () => undefined;

/** One entry of a question card's "⋯" menu (DESIGN.md §3); keeps its old testID. */
export interface CardAction {
  label: string;
  testID: string;
  onPress: () => void;
}

/** A menu opened from a question card: its step key (events) and its own actions. */
export interface CardMenu {
  stepKey: string;
  actions: CardAction[];
  /** Puts the screen reader back on the card's "⋯" when the menu closes. */
  focusBack?: () => void;
}

export type ReportSheetState =
  | { stage: 'menu' | 'report'; target: ReportTarget; card?: CardMenu }
  | { stage: 'thanks' }
  | null;

interface ReportSheetProps {
  state: ReportSheetState;
  onOpenReport: (target: ReportTarget, card?: CardMenu) => void;
  onSend: (target: ReportTarget, reason: ReportReason, text?: string) => void;
  /** A card action was chosen: the menu closes, then the action runs. */
  onAction: (action: CardAction) => void;
  onDismiss: () => void;
}

/**
 * Block menu, question-card menu and report sheet (docs/FEEDBACK_AND_TRUST.md):
 * one tap for a reason, optional short text, then a kind confirmation; no
 * lecture. A card menu lists the card's actions first, then its trust label
 * and Report; it closes on a tap outside or the back gesture.
 */
export function ReportSheet({
  state,
  onOpenReport,
  onSend,
  onAction,
  onDismiss,
}: ReportSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [text, setText] = useState('');
  const stage = state?.stage;
  useEffect(() => {
    if (stage === 'report') {
      setReason(null);
      setText('');
    }
  }, [stage]);

  return (
    <Modal
      visible={state !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID="report-modal"
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        testID="report-backdrop"
      >
        <Pressable
          style={styles.sheet}
          onPress={swallow}
          accessible={false}
          testID="report-sheet"
        >
          {state?.stage === 'menu' && (
            <>
              {state.card?.actions.map(a => (
                <Option
                  key={a.testID}
                  label={a.label}
                  onPress={() => onAction(a)}
                  testID={a.testID}
                />
              ))}
              <Text style={styles.label} testID="report-trust">
                {t(`lesson.trust.${state.target.trust}`)}
              </Text>
              <Option
                label={t('lesson.report.button')}
                onPress={() => onOpenReport(state.target, state.card)}
                // A card's Report keeps the id it had as a visible button.
                testID={
                  state.card
                    ? `block-report-${state.target.itemKey}`
                    : 'report-open'
                }
              />
            </>
          )}
          {state?.stage === 'report' && (
            <>
              <Text style={styles.title}>{t('lesson.report.title')}</Text>
              {REPORT_REASONS.map(r => (
                <Option
                  key={r}
                  label={t(`lesson.report.reasons.${r}`)}
                  selected={reason === r}
                  onPress={() => setReason(r)}
                  testID={`report-reason-${r}`}
                />
              ))}
              <TextInput
                value={text}
                onChangeText={v => setText(v.slice(0, REPORT_TEXT_MAX))}
                placeholder={t('lesson.report.textPlaceholder')}
                placeholderTextColor={theme.color.textSecondary}
                multiline
                maxLength={REPORT_TEXT_MAX}
                style={styles.input}
                testID="report-text"
              />
              <Pressable
                disabled={reason === null}
                onPress={() => {
                  if (reason !== null) {
                    const trimmed = text.trim();
                    onSend(
                      state.target,
                      reason,
                      trimmed.length > 0 ? trimmed : undefined,
                    );
                  }
                }}
                style={[styles.send, reason === null && styles.sendDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: reason === null }}
                testID="report-send"
              >
                <Text style={styles.sendText}>{t('lesson.report.send')}</Text>
              </Pressable>
            </>
          )}
          {state?.stage === 'thanks' && (
            <>
              <Text style={styles.title} testID="report-thanks">
                {t('lesson.report.thanks')}
              </Text>
              <Option
                label={t('lesson.report.continue')}
                onPress={onDismiss}
                testID="report-continue"
              />
            </>
          )}
          {state?.stage !== 'thanks' && (
            <Option
              label={t('lesson.cancel')}
              onPress={onDismiss}
              muted
              testID="report-cancel"
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  label,
  onPress,
  selected,
  muted,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  muted?: boolean;
  testID: string;
}) {
  const text = `${selected ? '● ' : ''}${label}`;
  return (
    <Pressable
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selected === true }}
      testID={testID}
    >
      <Text style={[styles.optionText, muted && styles.muted]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.color.overlayScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.color.surfaceCard,
    borderTopLeftRadius: theme.radius.sheetTop,
    borderTopRightRadius: theme.radius.sheetTop,
    padding: theme.space.xxl,
    paddingBottom: theme.space.sheetBottom,
  },
  title: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
    marginBottom: theme.space.sm,
  },
  label: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.footnote,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: theme.space.sm,
  },
  option: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.borderDefault,
  },
  optionSelected: { backgroundColor: theme.color.surfaceSelected },
  optionText: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.reading,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.actionPrimary,
  },
  muted: { color: theme.color.textSecondary },
  input: {
    minHeight: theme.size.reportInputMinHeight,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.md,
    padding: theme.space.sm,
    marginVertical: theme.space.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  send: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.sm,
  },
  sendText: {
    color: theme.color.textOnAccent,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
  },
  // Solid, not opacity: the white label stays at 4.59:1.
  sendDisabled: { backgroundColor: theme.color.inkDisabled },
});
