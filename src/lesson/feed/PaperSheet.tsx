import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { LoadedExercise } from '../../content/loader';
import { appPaperParts, appPaperQuestions } from '../../content/paper';
import type { PaperQuestion, Rich } from '../../content/schema';
import { partKey } from '../../state/doneParts';
import { PaperBackground } from '../paper/PaperBackground';
import { theme, type PaperStyle } from '../../theme';
import { RichView } from './RichView';

const CLOSE_MARK = '×';
const DONE_MARK = '✓';
const doneTag = (label: string) => `${DONE_MARK} ${label}`;
/** Swallows taps inside the sheet (they never reach the scrim). */
const swallow = () => undefined;

export type PaperCloseVia = 'close' | 'scrim' | 'back_gesture' | 'return';
type RowState = 'done' | 'current' | 'available' | 'soon';

interface PaperSheetProps {
  visible: boolean;
  loaded: LoadedExercise;
  /** The part open now (highlighted, «انت هنا»). */
  currentPartId: string;
  /** Done part keys (stored sessions + this one). */
  done: ReadonlySet<string>;
  onClose: (via: PaperCloseVia) => void;
  /** The paper behind the sheet (DESIGN.md §6; default the theme's). */
  paperStyle?: PaperStyle;
}

/**
 * «الورقة» (DESIGN.md §4.3): the exam paper over the dimmed lesson. The
 * statement in the exam's wording, the question list (done ✓, the current one
 * «انت هنا», available, not built yet «قريبا»), and the results proven so far.
 * Rows are not tappable. Opens scrolled to the current question.
 */
export function PaperSheet({
  visible,
  loaded,
  currentPartId,
  done,
  onClose,
  paperStyle = theme.layout.paperStyle,
}: PaperSheetProps) {
  const { t } = useTranslation();
  const ex = loaded.exercise;
  const scroll = useRef<ScrollViewInstance>(null);
  const currentY = useRef<number | null>(null);
  const scrolled = useRef(false);
  useEffect(() => {
    if (!visible) {
      scrolled.current = false;
    }
  }, [visible]);
  const scrollToCurrent = () => {
    if (scrolled.current || currentY.current === null) {
      return;
    }
    scrolled.current = true;
    scroll.current?.scrollTo({
      y: Math.max(0, currentY.current - theme.space.section),
      animated: false,
    });
  };
  // The parts the app teaches (Parts B / C of ex4 are on the paper screen only).
  const questions = appPaperQuestions(ex);
  const section = appPaperParts(ex)[0]?.heading;
  const isDone = (id: string) => done.has(partKey(ex.id, id));
  const stateOf = (q: PaperQuestion): RowState =>
    q.status === 'soon'
      ? 'soon'
      : q.id === currentPartId
      ? 'current'
      : isDone(q.id)
      ? 'done'
      : 'available';
  const proven = ex.results.filter(r =>
    ex.parts.some(p => p.expected === r.id && isDone(p.id)),
  );
  const subtitle = [
    t('lesson.exerciseLabel', { n: ex.number }),
    ...(ex.section !== undefined
      ? [t(`lesson.sectionShort.${ex.section}`)]
      : []),
    ...(section?.fr !== undefined ? [section.fr] : []),
  ].join(' · ');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onClose('back_gesture')}
      testID="paper-modal"
    >
      <Pressable
        style={styles.scrim}
        onPress={() => onClose('scrim')}
        testID="paper-scrim"
      >
        <Pressable
          style={styles.sheet}
          onPress={swallow}
          accessible={false}
          testID="paper-sheet"
        >
          <PaperBackground style={paperStyle} />
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.titles}>
              <Text style={styles.title}>{t('paper.title')}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable
              onPress={() => onClose('close')}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('lesson.cancel')}
              testID="paper-close"
            >
              <Text style={styles.closeMark}>{CLOSE_MARK}</Text>
            </Pressable>
          </View>
          <ScrollView
            ref={scroll}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            testID="paper-scroll"
          >
            <View style={styles.statement} testID="paper-statement">
              <RichView rich={ex.statement} variant="paper" />
            </View>
            {questions.map(q => (
              <QuestionRow
                key={q.id}
                q={q}
                state={stateOf(q)}
                onLayout={
                  q.id === currentPartId
                    ? (e: LayoutChangeEvent) => {
                        currentY.current = e.nativeEvent.layout.y;
                        scrollToCurrent();
                      }
                    : undefined
                }
              />
            ))}
            {proven.length > 0 && (
              <View style={styles.proven} testID="paper-proven">
                <Text style={styles.provenTitle}>{t('paper.proven')}</Text>
                <View style={styles.provenTags}>
                  {proven.map(r => (
                    <ResultTag key={r.id} id={r.id} statement={r.statement} />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
          <Pressable
            onPress={() => onClose('return')}
            style={styles.primary}
            accessibilityRole="button"
            testID="paper-return"
          >
            <Text style={styles.primaryText}>{t('lesson.back')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function QuestionRow({
  q,
  state,
  onLayout,
}: {
  q: PaperQuestion;
  state: RowState;
  onLayout: ((e: LayoutChangeEvent) => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.row,
        state === 'current' && styles.rowCurrent,
        state === 'soon' && styles.rowSoon,
      ]}
      {...(onLayout && { onLayout })}
      accessible
      accessibilityState={{ disabled: state === 'soon' }}
      testID={`paper-q-${q.id}-${state}`}
    >
      <View style={[styles.num, state === 'current' && styles.numCurrent]}>
        <Text style={styles.numText}>{q.label}</Text>
      </View>
      <View style={styles.wording}>
        {(q.wording ?? []).map((w, i) => (
          <RichView
            key={i}
            rich={w}
            variant="paper"
            {...(state === 'soon' && { color: theme.color.inkDisabled })}
          />
        ))}
      </View>
      {state === 'done' && (
        <Text style={styles.doneTag}>{doneTag(q.label)}</Text>
      )}
      {state === 'current' && (
        <Text style={styles.hereTag}>{t('paper.here')}</Text>
      )}
      {state === 'soon' && (
        <Text style={styles.soonTag}>{t('picker.soon')}</Text>
      )}
    </View>
  );
}

function ResultTag({ id, statement }: { id: string; statement: Rich }) {
  return (
    <View style={styles.resultTag} testID={`paper-result-${id}`}>
      <Text style={styles.resultMark}>{DONE_MARK}</Text>
      <RichView
        rich={statement}
        variant="paper"
        color={theme.color.correct.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: theme.color.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.sheetTop,
    borderTopRightRadius: theme.radius.sheetTop,
    // The paper lines stop at the rounded top.
    overflow: 'hidden',
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.space.sheetBottom,
  },
  handle: {
    alignSelf: 'center',
    width: theme.size.touch,
    height: theme.space.xxs,
    borderRadius: theme.space.xxs,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.sm,
  },
  // Reading order: the titles at the start (right), the close button at the end.
  head: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  close: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.size.touch / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: { ...theme.font.header, color: theme.color.ink },
  titles: { flex: 1, alignItems: theme.reading.startAlign },
  title: {
    ...theme.font.header,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  subtitle: {
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'ltr',
  },
  body: { flexGrow: 0 },
  bodyContent: { gap: theme.space.md, paddingBottom: theme.space.lg },
  statement: {
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  // The exam's own (French, LTR) order: number, wording, then the state tag.
  row: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  rowCurrent: {
    backgroundColor: theme.color.highlighterSoft,
    borderWidth: theme.border.active,
    borderColor: theme.color.ink,
  },
  // Clearly unavailable: dashed, muted, never pressable.
  rowSoon: {
    backgroundColor: theme.color.paper,
    borderStyle: 'dashed',
  },
  num: {
    width: theme.size.paperNumber,
    height: theme.size.paperNumber,
    borderRadius: theme.size.paperNumber / 2,
    backgroundColor: theme.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numCurrent: { backgroundColor: theme.color.highlighter },
  numText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  wording: { flex: 1, gap: theme.space.xxs },
  doneTag: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.text,
    backgroundColor: theme.color.correct.bg,
    borderColor: theme.color.correct.ink,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.sm,
    writingDirection: 'ltr',
  },
  hereTag: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.md,
    writingDirection: 'rtl',
  },
  soonTag: {
    ...theme.font.small,
    color: theme.color.inkDisabled,
    writingDirection: 'rtl',
  },
  proven: { gap: theme.space.sm, alignItems: theme.reading.startAlign },
  provenTitle: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  provenTags: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  // A proven result (French, LTR): ✓ then the statement.
  resultTag: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xs,
    backgroundColor: theme.color.correct.bg,
    borderColor: theme.color.correct.ink,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    direction: 'ltr',
  },
  resultMark: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.ink,
  },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.space.sm,
  },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
});
