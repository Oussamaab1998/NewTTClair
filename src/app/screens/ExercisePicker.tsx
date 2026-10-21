import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toPlainText } from '../../lesson/rich/runs';
import { theme } from '../../theme';
import {
  DEV_REVEAL_MS,
  devRevealAvailable,
  devToolsEnabled,
  setDevTools,
} from '../devFlags';
import {
  CATALOG,
  partLabel,
  type CatalogEntry,
  type Opened,
} from '../exercises';

interface ExercisePickerProps {
  onOpen: (opened: Opened) => void;
  catalog?: readonly CatalogEntry[];
}

/** One card per exercise; title and parts come from the exercise JSON. */
export function ExercisePicker({
  onOpen,
  catalog = CATALOG,
}: ExercisePickerProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.list}
      testID="exercise-picker"
    >
      <Pressable
        disabled={!devRevealAvailable()}
        delayLongPress={DEV_REVEAL_MS}
        onLongPress={() => setDevTools(!devToolsEnabled())}
        testID="picker-title"
      >
        <Text style={styles.heading}>{t('picker.title')}</Text>
      </Pressable>
      {catalog.map(e => (
        <ExerciseCard key={e.id} entry={e} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

function ExerciseCard({
  entry,
  onOpen,
}: {
  entry: CatalogEntry;
  onOpen: (opened: Opened) => void;
}) {
  const { t } = useTranslation();
  if (!entry.result.ok) {
    // Content CI catches this; never crash in the app.
    return (
      <View style={styles.card} testID={`exercise-${entry.id}-error`}>
        <Text style={styles.mono}>{entry.id}</Text>
        <Text>{t('lesson.loadError')}</Text>
        {entry.result.errors.map(e => (
          <Text key={e} style={styles.mono}>
            {e}
          </Text>
        ))}
      </View>
    );
  }
  const { exercise } = entry.result.loaded;
  return (
    <View style={styles.card} testID={`exercise-${entry.id}`}>
      <Text style={styles.title}>{toPlainText(exercise.title.ar)}</Text>
      <Text style={styles.titleFr}>{exercise.title.fr}</Text>
      {!exercise.reviewed && (
        <Text style={styles.badge}>{t('lesson.unreviewed')}</Text>
      )}
      <View style={styles.parts}>
        {exercise.parts.map(p => (
          <Pressable
            key={p.id}
            onPress={() => onOpen({ exerciseId: entry.id, partId: p.id })}
            style={styles.part}
            accessibilityRole="button"
            accessibilityLabel={`${t('lesson.part')} ${partLabel(p.id)}`}
            testID={`open-${p.id}`}
          >
            <Text style={styles.partText}>{partLabel(p.id)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  list: { padding: theme.space.lg, gap: theme.space.lg },
  heading: {
    fontSize: theme.font.size.title,
    fontWeight: theme.font.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  card: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  title: {
    fontSize: theme.font.size.reading,
    fontWeight: theme.font.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
  },
  titleFr: {
    fontSize: theme.font.size.small,
    color: theme.color.textSecondary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  badge: {
    fontSize: theme.font.size.caption,
    color: theme.feedback.warning.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  parts: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  part: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thick,
    borderColor: theme.color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
  },
  partText: {
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.semibold,
    writingDirection: 'ltr',
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    fontSize: theme.font.size.micro,
    writingDirection: 'ltr',
  },
});
