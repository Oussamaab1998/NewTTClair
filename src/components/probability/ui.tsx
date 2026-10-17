/**
 * Small building blocks shared by the probability components. Numbers and
 * labels are LTR Text runs, never inside an Arabic Text (CLAUDE.md RTL rules);
 * marks carry a symbol, not only a color.
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { probe } from '../../perf/probe';
import { theme } from '../../theme';

/** Value colors (always shown with the value as text: never color alone). */
export const VALUE_COLORS = theme.dataSeries;

export type ChipMark = 'selected' | 'correct' | 'extra' | 'solution' | null;

const MARK_ICON: Record<Exclude<ChipMark, null>, string> = {
  selected: '●',
  correct: theme.feedback.success.icon,
  extra: theme.feedback.danger.icon,
  solution: '◆',
};

interface OutcomeChipProps {
  id: string;
  label: string;
  /** Value of the draw (e.g. the product), shown under the label. */
  badge?: string;
  tint?: string;
  mark: ChipMark;
  focused?: boolean;
  dim?: boolean;
  disabled: boolean;
  onPress?: (id: string) => void;
  testIDPrefix: string;
}

/** One draw. Memoized with a stable onPress, so a tap re-renders only the chip it changes. */
export const OutcomeChip = memo(function OutcomeChipImpl({
  id,
  label,
  badge,
  tint,
  mark,
  focused = false,
  dim = false,
  disabled,
  onPress,
  testIDPrefix,
}: OutcomeChipProps) {
  probe.count('OutcomeChip');
  const tone =
    mark === 'correct'
      ? theme.feedback.success
      : mark === 'extra'
      ? theme.feedback.danger
      : mark === 'solution'
      ? theme.feedback.info
      : null;
  return (
    <Pressable
      onPress={onPress && (() => onPress(id))}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={badge === undefined ? label : `${label}, ${badge}`}
      accessibilityState={{
        selected: mark === 'selected' || mark === 'correct',
        disabled,
      }}
      testID={`${testIDPrefix}-${id}`}
      style={({ pressed }) => [
        styles.chip,
        tint !== undefined && { borderColor: tint },
        mark === 'selected' && styles.selected,
        tone && { borderColor: tone.text, backgroundColor: tone.surface },
        (mark === 'extra' || mark === 'solution') && styles.dashed,
        focused && styles.focused,
        dim && styles.dim,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
      {badge !== undefined && (
        <Text style={[styles.badge, tint !== undefined && { color: tint }]}>
          {badge}
        </Text>
      )}
      {mark && (
        <Text
          style={[
            styles.mark,
            { color: tone ? tone.text : theme.color.actionPrimary },
          ]}
          testID={`${testIDPrefix}-${id}-mark-${mark}`}
        >
          {MARK_ICON[mark]}
        </Text>
      )}
    </Pressable>
  );
});

/** Arabic label + LTR value, as two separate runs. */
export function Readout({
  label,
  value,
  testID,
  tone,
}: {
  label: string;
  value: string;
  testID?: string;
  tone?: keyof typeof theme.feedback;
}) {
  const color = tone ? theme.feedback[tone].text : theme.color.textPrimary;
  return (
    <View style={styles.readout}>
      <Text style={[styles.readoutLabel, { color }]}>{label}</Text>
      <Text style={[styles.readoutValue, { color }]} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/** A one-line message with its tone icon (not color alone). */
export function Note({
  tone,
  text,
  testID,
}: {
  tone: keyof typeof theme.feedback;
  text: string;
  testID?: string;
}) {
  const t = theme.feedback[tone];
  return (
    <View style={[styles.note, { backgroundColor: t.surface }]} testID={testID}>
      <Text style={[styles.noteText, { color: t.text }]}>{text}</Text>
      <Text style={[styles.noteIcon, { color: t.text }]}>{t.icon}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  disabled = false,
  primary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      style={[
        styles.button,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.primaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Frame of every component: full feed width, collapsed height kept small. */
export function Panel({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.panel} testID={testID}>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    padding: theme.space.md,
    marginVertical: theme.space.xs,
    gap: theme.space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    direction: 'ltr',
  },
  list: { gap: theme.space.xs, direction: 'ltr' },
  chip: {
    minHeight: theme.size.touch,
    minWidth: theme.size.chipMinWidth,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderDefault,
    backgroundColor: theme.color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  dashed: { borderStyle: 'dashed', borderWidth: theme.border.thick },
  focused: { borderWidth: theme.border.focus },
  dim: { opacity: theme.opacity.dimmed },
  pressed: { opacity: theme.opacity.pressed },
  chipLabel: {
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  badge: {
    fontSize: theme.font.size.footnote,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'ltr',
  },
  mark: {
    position: 'absolute',
    top: theme.offset.chipMarkTop,
    right: theme.offset.chipMarkEnd,
    fontSize: theme.font.size.tiny,
    fontWeight: theme.font.weight.bold,
  },
  readout: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.space.sm,
    flexWrap: 'wrap',
  },
  readoutLabel: { fontSize: theme.font.size.callout, writingDirection: 'rtl' },
  readoutValue: {
    fontSize: theme.font.size.bodyLarge,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'ltr',
  },
  note: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.space.sm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
  },
  noteText: {
    flex: 1,
    fontSize: theme.font.size.callout,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  noteIcon: {
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.bold,
  },
  button: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: theme.color.actionPrimary,
    borderColor: theme.color.actionPrimary,
  },
  disabled: { opacity: theme.opacity.disabled },
  buttonText: {
    fontSize: theme.font.size.callout,
    color: theme.color.actionPrimary,
    writingDirection: 'rtl',
  },
  primaryText: {
    color: theme.color.textOnAccent,
    fontWeight: theme.font.weight.semibold,
  },
  ltr: {
    writingDirection: 'ltr',
    color: theme.color.textPrimary,
    fontSize: theme.font.size.body,
  },
  rowEnd: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
});
