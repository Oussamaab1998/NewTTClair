import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { LoadedExercise } from '../../content/loader';
import type { PaperPart, PaperQuestion, Rich } from '../../content/schema';
import { RichText } from '../../lesson/blocks/RichText';
import { RichView } from '../../lesson/feed/RichView';
import { PaperBackground } from '../../lesson/paper/PaperBackground';
import { doneParts, partKey, type DoneRecord } from '../../state/doneParts';
import type { EventStore } from '../../telemetry/eventStore';
import { EventLog, type LogClock } from '../../telemetry/log';
import { theme } from '../../theme';
import { partLabel, resumeTarget } from '../exercises';
import { ResetDialog, ResetLink } from '../ResetDialog';
import type * as DevOnly from '../dev';
import { paperStyle } from '../paperStyle';

/** Debug builds only (launch arguments); Metro drops it in release. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('../dev') as typeof DevOnly)
  : null;

const BACK_MARK = '→';
const DONE_MARK = '✓';
/** Question and sub-question numbering as printed: «1)», «a)». */
const numbered = (label: string) => `${label})`;
/** French decimal comma («3,5 points»). */
const frNumber = (n: number) => String(n).replace('.', ',');

type Mark = 'done' | 'current' | 'soon' | 'none';

interface ExamPaperScreenProps {
  loaded: LoadedExercise;
  /** Stored sessions and the done record: done parts, read on mount and after a reset. */
  eventStore: Pick<EventStore, 'load' | 'append'>;
  doneRecord: Pick<DoneRecord, 'all' | 'clearExercise'>;
  onBack: () => void;
  /** The bottom button: open this part (same target as the picker card). */
  onStart: (partId: string) => void;
  clock?: LogClock;
  /** Exposes the log (tests). */
  onLog?: (log: EventLog) => void;
}

/**
 * The whole exercise as printed on the exam paper (DESIGN.md §4.4, mockups 05 /
 * 06 / 07, without any gating): source line, «Exercice n (p points)», the
 * statement, every part with its questions and a) b) c) items, in the exam's
 * French (STIX). Marks: ✓ done, the current question highlighted, «قريبا»
 * where the wording is not transcribed. The bottom button is the picker's.
 */
export function ExamPaperScreen({
  loaded,
  eventStore,
  doneRecord,
  onBack,
  onStart,
  clock,
  onLog,
}: ExamPaperScreenProps) {
  const { t } = useTranslation();
  const ex = loaded.exercise;
  const [log] = useState(
    () =>
      new EventLog(
        {
          sessionId: `paper-${Date.now().toString(36)}`,
          studentId: 'local-anon',
          exerciseId: ex.id,
          contentVersion: ex.contentVersion,
        },
        clock,
        eventStore,
      ),
  );
  const readDone = () => doneParts(eventStore.load(), doneRecord);
  const [done, setDone] = useState(readDone);
  const [resetOpen, setResetOpen] = useState(false);
  const logUi = (name: string, payload: Record<string, string> = {}) =>
    log.append([
      {
        t: 'component_event',
        questionId: 'paper',
        stepId: 'paper',
        component: 'ExamPaper',
        name,
        payload,
      },
    ]);
  useEffect(() => {
    onLog?.(log);
    logUi('opened');
    // Once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [paper] = useState(paperStyle);

  const next = resumeTarget(ex, done);
  const markOf = (q: PaperQuestion): Mark =>
    done.has(partKey(ex.id, q.id))
      ? 'done'
      : q.id === next.partId
      ? 'current'
      : q.wording === undefined && q.subs === undefined
      ? 'soon'
      : 'none';
  const parts: PaperPart[] = ex.paper?.parts ?? [
    {
      questions: ex.parts.map(p => ({
        id: p.id,
        label: p.id,
        wording: [p.goal],
        status: 'available' as const,
      })),
    },
  ];
  const heading =
    ex.paper?.points !== undefined
      ? t('examPaper.heading', {
          n: ex.number,
          points: frNumber(ex.paper.points),
        })
      : t('lesson.exerciseLabel', { n: ex.number });
  const start = () => {
    logUi('start', { partId: next.partId });
    onStart(next.partId);
  };

  return (
    <View style={styles.root} testID="exam-paper">
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            logUi('closed', { via: 'back' });
            onBack();
          }}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('picker.back')}
          testID="exam-paper-back"
        >
          <Text style={styles.backGlyph}>{BACK_MARK}</Text>
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.title} accessibilityRole="header">
            {t('lesson.exerciseLabel', { n: ex.number })}
          </Text>
          <View style={styles.tags}>
            {ex.paper?.points !== undefined && (
              <Text style={styles.pointsTag} testID="exam-paper-points">
                {t('examPaper.points', { n: frNumber(ex.paper.points) })}
              </Text>
            )}
            {!ex.reviewed && (
              <Text
                style={styles.draftTag}
                accessibilityLabel={t('lesson.unreviewed')}
              >
                {t('lesson.draftTag')}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <PaperBackground style={paper} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          // `-devScroll y` (screenshots of Parts B / C without taps).
          contentOffset={{ x: 0, y: devOnly?.devScrollAtLaunch() ?? 0 }}
          testID="exam-paper-scroll"
        >
          <View style={styles.sheet} testID="exam-paper-sheet">
            {/* The source line; while it is not transcribed, the section tells two «Exercice 2» apart. */}
            {(ex.paper?.source !== undefined || ex.section !== undefined) && (
              <Text
                style={styles.source}
                accessibilityLanguage="fr"
                testID="exam-paper-source"
              >
                {ex.paper?.source ?? t(`lesson.sectionShort.${ex.section!}`)}
              </Text>
            )}
            <Text
              style={styles.exerciseHeading}
              accessibilityRole="header"
              accessibilityLanguage="fr"
              testID="exam-paper-heading"
            >
              {heading}
            </Text>
            <RichView rich={ex.statement} variant="paper" />
            {parts.map((part, i) => (
              <View key={i} style={styles.part} testID={`exam-part-${i}`}>
                {part.heading && (
                  <Text
                    style={styles.partHeading}
                    accessibilityRole="header"
                    accessibilityLanguage="fr"
                  >
                    {richText(part.heading)}
                  </Text>
                )}
                {(part.intro ?? []).map((r, j) => (
                  <RichView key={j} rich={r} variant="paper" />
                ))}
                {part.questions.map(q => (
                  <QuestionRow key={q.id} q={q} mark={markOf(q)} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.bottom}>
        <Pressable
          onPress={start}
          style={styles.primary}
          accessibilityRole="button"
          accessibilityLabel={
            next.resume
              ? `${t('picker.resumeFrom')} ${partLabel(next.partId)}`
              : t('picker.start')
          }
          testID="exam-paper-start"
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
        {ex.parts.some(p => done.has(partKey(ex.id, p.id))) && (
          <ResetLink exerciseId={ex.id} onPress={() => setResetOpen(true)} />
        )}
      </View>
      <ResetDialog
        exercise={resetOpen ? ex : null}
        eventStore={eventStore}
        doneRecord={doneRecord}
        {...(clock && { clock })}
        onClose={reset => {
          setResetOpen(false);
          if (reset) {
            setDone(readDone());
          }
        }}
      />
    </View>
  );
}

/** A heading's French text (headings are plain exam text, no formula). */
const richText = (r: Rich) => r.fr ?? '';

function QuestionRow({ q, mark }: { q: PaperQuestion; mark: Mark }) {
  const { t } = useTranslation();
  return (
    <View
      style={[styles.question, mark === 'current' && styles.questionCurrent]}
      testID={`exam-q-${q.id}-${mark}`}
    >
      <Text style={styles.number} accessibilityLanguage="fr">
        {numbered(q.label)}
      </Text>
      <View style={styles.wording}>
        {(q.wording ?? []).map((w, i) => (
          <RichView key={i} rich={w} variant="paper" />
        ))}
        {(q.subs ?? []).map(s => (
          <View
            key={s.label}
            style={styles.sub}
            testID={`exam-sub-${q.id}-${s.label}`}
          >
            <Text style={styles.number} accessibilityLanguage="fr">
              {numbered(s.label)}
            </Text>
            <View style={styles.wording}>
              {s.wording.map((w, i) => (
                <RichView key={i} rich={w} variant="paper" />
              ))}
            </View>
          </View>
        ))}
      </View>
      {mark === 'done' && (
        <View
          style={styles.doneMark}
          accessible
          accessibilityLabel={t('picker.done')}
        >
          <Text style={styles.doneMarkText}>{DONE_MARK}</Text>
        </View>
      )}
      {mark === 'current' && (
        <View
          style={styles.dot}
          accessible
          accessibilityLabel={t('picker.current')}
        />
      )}
      {mark === 'soon' && <Text style={styles.soon}>{t('picker.soon')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.paper },
  // Reading order: back at the reading start (right), then the title block.
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.lg,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.sm,
  },
  back: {
    width: theme.size.touch,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.card,
    borderColor: theme.color.ink,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
  },
  backGlyph: { ...theme.font.header, color: theme.color.ink },
  titleBox: { flex: 1, alignItems: theme.reading.startAlign },
  title: {
    ...theme.font.header,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  tags: {
    flexDirection: theme.reading.row,
    gap: theme.space.xs,
    alignItems: 'center',
  },
  pointsTag: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    backgroundColor: theme.color.ink,
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
  body: { flex: 1 },
  // Transparent: the paper (grid) is the body's background.
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.md,
  },
  // The white exam sheet: French, LTR, serif.
  sheet: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.xxl,
    gap: theme.space.md,
    direction: 'ltr',
  },
  source: {
    ...theme.font.paperSource,
    color: theme.color.inkMuted,
    textTransform: 'uppercase',
    writingDirection: 'ltr',
  },
  exerciseHeading: {
    ...theme.font.paperHeading,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    textDecorationLine: 'underline',
    writingDirection: 'ltr',
  },
  part: { gap: theme.space.md },
  partHeading: {
    ...theme.font.paperHeading,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    textDecorationLine: 'underline',
    writingDirection: 'ltr',
    marginTop: theme.space.sm,
  },
  // The exam's own (French, LTR) order: number, wording, then the mark.
  question: {
    flexDirection: theme.mathSide.row,
    alignItems: 'flex-start',
    gap: theme.space.md,
    borderRadius: theme.radius.chip,
    paddingVertical: theme.space.xxs,
  },
  questionCurrent: {
    backgroundColor: theme.color.highlighterSoft,
    marginHorizontal: -theme.space.sm,
    paddingHorizontal: theme.space.sm,
  },
  number: {
    ...theme.font.paper,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  wording: { flex: 1, gap: theme.space.xs },
  sub: { flexDirection: theme.mathSide.row, gap: theme.space.md },
  doneMark: {
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.size.toneIcon / 2,
    borderWidth: theme.border.active,
    borderColor: theme.color.correct.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.space.xxs,
  },
  doneMarkText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.ink,
  },
  dot: {
    width: theme.size.paperDot,
    height: theme.size.paperDot,
    borderRadius: theme.size.paperDot / 2,
    backgroundColor: theme.color.ink,
    marginTop: theme.space.sm,
  },
  soon: {
    ...theme.font.small,
    color: theme.color.inkDisabled,
    writingDirection: 'rtl',
  },
  bottom: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.sm,
    backgroundColor: theme.color.paper,
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
});
