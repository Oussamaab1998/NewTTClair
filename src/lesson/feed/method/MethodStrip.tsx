/**
 * A quiet strip under the progress bar (addendum E, 21): what the student is
 * doing now and what comes next, and one tap to open the sheet with the whole
 * route. Shown only in a lesson that has a method block. Colour is never
 * alone: a done step carries a check, the current one a thicker ring.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Roadmap } from '../../../method/roadmap';
import { theme } from '../../../theme';
import { RichView } from '../RichView';

const CHECK = '✓';
const CHEVRON = '▴';

export function MethodStrip({
  roadmap,
  onOpen,
  compact = false,
}: {
  roadmap: Roadmap;
  onOpen: () => void;
  /** One line (what now) while the keypad is open on a narrow phone. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { current } = roadmap;
  return (
    <Pressable
      onPress={onOpen}
      style={styles.strip}
      hitSlop={theme.size.blockMenuSlop}
      accessibilityRole="button"
      accessibilityLabel={t('method.strip.open')}
      testID="method-strip"
    >
      <View style={styles.dots}>
        {roadmap.entries.map(e => (
          <View
            key={e.id}
            style={[
              styles.dot,
              e.status === 'done' && styles.dotDone,
              e.status === 'current' && styles.dotCurrent,
            ]}
            testID={`strip-dot-${e.id}-${e.status}`}
          >
            {e.status === 'done' && <Text style={styles.check}>{CHECK}</Text>}
          </View>
        ))}
      </View>
      <View style={styles.lines}>
        <View style={styles.line} testID="strip-now">
          <Text style={styles.label}>{t('method.strip.now')}</Text>
          <View style={styles.text}>
            <RichView
              rich={current.header.now}
              fontSize={theme.font.size.small}
              fontFamily={theme.font.family.ui.bold}
            />
          </View>
        </View>
        {!compact && (
          <View style={styles.line} testID="strip-next">
            <Text style={styles.label}>{t('method.strip.next')}</Text>
            <View style={styles.text}>
              <RichView
                rich={current.header.next}
                fontSize={theme.font.size.small}
                color={theme.color.textSecondary}
              />
            </View>
          </View>
        )}
      </View>
      <Text style={styles.chevron}>{CHEVRON}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.xs,
    backgroundColor: theme.color.paper,
    borderBottomWidth: theme.border.line,
    borderBottomColor: theme.color.border,
  },
  dots: { flexDirection: theme.mathSide.row, gap: theme.space.xxs },
  dot: {
    width: theme.space.md,
    height: theme.space.md,
    borderRadius: theme.space.md,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: theme.color.pen, borderColor: theme.color.pen },
  dotCurrent: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
    backgroundColor: theme.color.highlighter,
  },
  check: { color: theme.color.textOnAccent, fontSize: theme.font.size.small },
  lines: { flex: 1, gap: theme.space.xxs },
  line: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.font.size.small,
    writingDirection: 'rtl',
  },
  text: { flex: 1 },
  chevron: { color: theme.color.ink, fontSize: theme.font.size.body },
});
