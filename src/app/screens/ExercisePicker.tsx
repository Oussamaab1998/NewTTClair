import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RichText } from '../../lesson/blocks/RichText';
import { MathBlock } from '../../lesson/math/MathBlock';
import { doneParts, type DoneRecord } from '../../state/doneParts';
import type { EventStore } from '../../telemetry/eventStore';
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
  pickerChips,
  resumeTarget,
  statementLead,
  type CatalogEntry,
  type PickerChip,
  type Opened,
} from '../exercises';

const DONE_MARK = '✓';

interface ExercisePickerProps {
  onOpen: (opened: Opened) => void;
  catalog?: readonly CatalogEntry[];
  /** Stored sessions and the done-parts record: done parts are read on mount. */
  eventStore?: Pick<EventStore, 'load'>;
  doneRecord?: Pick<DoneRecord, 'all'>;
}

/**
 * One card per exercise (DESIGN.md §4.1): subject tag, «Exercice n», the
 * statement's key line, the Arabic title, the part chips (done ✓, current,
 * available, not built yet) and «كمّل من X». Everything from the JSON and the
 * stored sessions; no points, difficulty or tab bar (no such data / features).
 * Mounted again after each lesson, so done parts are fresh then.
 */
export function ExercisePicker({
  onOpen,
  catalog = CATALOG,
  eventStore,
  doneRecord,
}: ExercisePickerProps) {
  const { t } = useTranslation();
  const [done] = useState(() =>
    doneParts(eventStore?.load() ?? [], doneRecord),
  );
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
        <ExerciseCard key={e.id} entry={e} done={done} onOpen={onOpen} />
      ))}
      <View style={styles.more} testID="picker-more-soon">
        <Text style={styles.moreText}>{t('picker.moreSoon')}</Text>
      </View>
    </ScrollView>
  );
}

function ExerciseCard({
  entry,
  done,
  onOpen,
}: {
  entry: CatalogEntry;
  done: ReadonlySet<string>;
  onOpen: (opened: Opened) => void;
}) {
  const { t } = useTranslation();
  if (!entry.result.ok) {
    // Content CI catches this; never crash in the app.
    return (
      <View style={styles.error} testID={`exercise-${entry.id}-error`}>
        <Text style={styles.errorTitle}>{t('lesson.loadError')}</Text>
        <Text style={styles.mono}>{entry.id}</Text>
        {entry.result.errors.map(e => (
          <Text key={e} style={styles.mono}>
            {e}
          </Text>
        ))}
      </View>
    );
  }
  const { exercise } = entry.result.loaded;
  const lead = statementLead(exercise.statement);
  const chips = pickerChips(exercise, done);
  const next = resumeTarget(exercise, done);
  const open = (partId: string) => onOpen({ exerciseId: entry.id, partId });
  return (
    <View style={styles.card} testID={`exercise-${entry.id}`}>
      {/* Reading order: the tags (subject, draft), then «Exercice n». */}
      <View style={styles.top}>
        <View style={styles.tags}>
          <Text
            style={[
              styles.subject,
              { backgroundColor: theme.color.subject[exercise.subject] },
            ]}
            testID={`subject-${entry.id}`}
          >
            {t(`picker.subject.${exercise.subject}`)}
          </Text>
          {!exercise.reviewed && (
            <Text
              style={styles.draftTag}
              accessibilityLabel={t('lesson.unreviewed')}
            >
              {t('lesson.draftTag')}
            </Text>
          )}
        </View>
        <Text style={styles.number}>
          {t('lesson.exerciseLabel', { n: exercise.number })}
        </Text>
      </View>
      {'math' in lead ? (
        <View style={styles.lead}>
          <MathBlock latex={lead.math} />
        </View>
      ) : (
        <Text style={styles.leadFr} accessibilityLanguage="fr">
          {lead.fr}
        </Text>
      )}
      <RichText runs={exercise.title.ar} style={styles.title} />
      <View style={styles.chips}>
        {chips.map(c => (
          <PartChip key={c.id} chip={c} onOpen={open} />
        ))}
      </View>
      <Pressable
        onPress={() => open(next.partId)}
        style={styles.primary}
        accessibilityRole="button"
        accessibilityLabel={
          next.resume
            ? `${t('picker.resumeFrom')} ${partLabel(next.partId)}`
            : t('picker.start')
        }
        testID={`resume-${entry.id}`}
      >
        {next.resume ? (
          // Arabic, then the part label as its own LTR run.
          <RichText
            runs={[
              { ar: `${t('picker.resumeFrom')} ` },
              { fr: partLabel(next.partId) },
            ]}
            style={styles.primaryText}
          />
        ) : (
          <Text style={styles.primaryText}>{t('picker.start')}</Text>
        )}
      </Pressable>
    </View>
  );
}

/** A part chip: done (✓ + green), current (highlighter), available, or not built yet. */
function PartChip({
  chip,
  onOpen,
}: {
  chip: PickerChip;
  onOpen: (partId: string) => void;
}) {
  const { t } = useTranslation();
  const label = partLabel(chip.id);
  if (chip.state === 'soon') {
    // Clearly unavailable: dashed, muted, no press state at all.
    return (
      <View
        style={[styles.chip, styles.chipSoon]}
        accessible
        accessibilityLabel={`${t('lesson.part')} ${label}, ${t('picker.soon')}`}
        accessibilityState={{ disabled: true }}
        testID={`soon-${chip.id}`}
      >
        <Text style={[styles.chipText, styles.chipTextSoon]}>{label}</Text>
      </View>
    );
  }
  const state =
    chip.state === 'done'
      ? `, ${t('picker.done')}`
      : chip.state === 'current'
      ? `, ${t('picker.current')}`
      : '';
  return (
    <Pressable
      onPress={() => onOpen(chip.id)}
      style={[
        styles.chip,
        chip.state === 'done' && styles.chipDone,
        chip.state === 'current' && styles.chipCurrent,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${t('lesson.part')} ${label}${state}`}
      testID={`open-${chip.id}`}
    >
      <Text
        style={[styles.chipText, chip.state === 'done' && styles.chipTextDone]}
      >
        {chip.state === 'done' ? `${DONE_MARK}${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.paper },
  list: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.lg,
    gap: theme.space.lg,
  },
  heading: {
    ...theme.font.screenTitle,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.ink,
  },
  card: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    padding: theme.space.xxl,
    gap: theme.space.md,
  },
  top: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  number: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'ltr',
  },
  tags: {
    flexDirection: theme.reading.row,
    gap: theme.space.xs,
    alignItems: 'center',
  },
  subject: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.md,
    writingDirection: 'rtl',
  },
  draftTag: {
    ...theme.font.small,
    color: theme.color.draft.text,
    backgroundColor: theme.color.draft.bg,
    borderColor: theme.color.draft.border,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.xs,
    writingDirection: 'rtl',
  },
  lead: { alignItems: 'flex-start', direction: 'ltr' },
  leadFr: {
    ...theme.font.paper,
    color: theme.color.ink,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  title: { ...theme.font.body, color: theme.color.inkMuted },
  chips: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  chip: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDone: {
    borderColor: theme.color.correct.ink,
    backgroundColor: theme.color.correct.bg,
  },
  chipCurrent: {
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  chipSoon: {
    borderStyle: 'dashed',
    borderColor: theme.color.border,
    backgroundColor: theme.color.paper,
  },
  chipText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  chipTextDone: { color: theme.color.correct.text },
  chipTextSoon: {
    fontFamily: theme.font.family.ui.regular,
    color: theme.color.inkDisabled,
  },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
  },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    textAlign: 'center',
  },
  more: {
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.borderControl,
    padding: theme.space.xxl,
    alignItems: 'center',
  },
  moreText: {
    ...theme.font.body,
    color: theme.color.inkMuted,
    writingDirection: 'rtl',
  },
  error: {
    backgroundColor: theme.color.error.noteBg,
    borderColor: theme.color.error.noteBorder,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  errorTitle: {
    ...theme.font.body,
    color: theme.color.error.noteText,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mono: {
    fontFamily: theme.font.family.mono,
    fontSize: theme.font.size.micro,
    color: theme.color.error.noteText,
    writingDirection: 'ltr',
  },
});
