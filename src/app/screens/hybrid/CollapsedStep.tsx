/**
 * A finished step, folded to one line above the step card: a check, its
 * title, and his own work on it (his line, the word he found, his plan);
 * a step reused from an earlier question says so. One tap opens «الطريق»
 * where the whole step is.
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { BoardStep } from '../../../hybrid/board';
import { RichView } from '../../../lesson/feed/RichView';
import { MathBlock } from '../../../lesson/math/MathBlock';
import { lineLatex } from '../../../method/lineChain';
import { theme } from '../../../theme';

const CHECK = '✓';
/** Between the steps of his plan, toward the reading end. */
const THEN = '←';

export const CollapsedStep = memo(function CollapsedStepImpl({
  step,
  fromLabel,
  onPress,
}: {
  step: BoardStep;
  /** The earlier question's label, for a step he reused from it. */
  fromLabel: string | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const last = step.work.lines[step.work.lines.length - 1];
  return (
    <Pressable
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={t('hybrid.collapsed.open')}
      testID={`collapsed-${step.key}`}
      onPress={onPress}
    >
      <View style={styles.mark}>
        <Text style={styles.markText}>{CHECK}</Text>
      </View>
      <View style={styles.title}>
        {step.short ? (
          <RichView
            rich={step.short}
            fontSize={theme.font.size.small}
            fontFamily={theme.font.family.ui.bold}
            numberOfLines={1}
          />
        ) : (
          <Text style={styles.titleText} numberOfLines={1}>
            {t(`hybrid.kind.${step.kind}`)}
          </Text>
        )}
        {fromLabel !== null && (
          <View style={styles.from} testID={`collapsed-${step.key}-reused`}>
            <Text style={styles.fromText}>{t('hybrid.road.from')}</Text>
            <Text style={styles.fromLabel}>{fromLabel}</Text>
          </View>
        )}
      </View>
      <View style={styles.work}>
        {last !== undefined && (
          <MathBlock latex={lineLatex(last)} fontSize={theme.font.size.small} />
        )}
        {step.work.word !== null && (
          <Text style={styles.word} numberOfLines={1}>
            {step.work.word}
          </Text>
        )}
        {step.work.plan.length > 0 && (
          <View style={styles.plan}>
            {step.work.plan.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={styles.then}>{THEN}</Text>}
                <RichView
                  rich={r}
                  fontSize={theme.font.size.small}
                  numberOfLines={1}
                />
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  mark: {
    width: theme.space.xl,
    height: theme.space.xl,
    borderRadius: theme.space.xl,
    backgroundColor: theme.color.pen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.small,
  },
  title: { flexShrink: 0 },
  titleText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  work: {
    flex: 1,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    overflow: 'hidden',
  },
  word: {
    ...theme.font.paper,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  plan: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
  },
  then: { ...theme.font.small, color: theme.color.textSecondary },
  from: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
  },
  fromText: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  fromLabel: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
  },
});
