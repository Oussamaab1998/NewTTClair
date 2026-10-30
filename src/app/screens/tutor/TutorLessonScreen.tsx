/**
 * The AI-led lesson (owner, 2026-10-29): a chat thread where the tutor leads
 * one question, one message and one action at a time. Header (back, title,
 * «الورقة»), the roadmap strip (now / next), the thread, and the input dock.
 * Internet only: a failed call shows a retry.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LoadedExercise } from '../../../content/loader';
import type { Rich } from '../../../content/schema';
import { StudentBubble } from '../../../lesson/feed/Bubbles';
import { RichView } from '../../../lesson/feed/RichView';
import type { MessagesTransport } from '../../../ai/transport/messagesApi';
import type { KeyValueStore } from '../../../storage/kv';
import { theme } from '../../../theme';
import { InputDock } from './InputDock';
import { TutorMessage, type LiveComponent } from './TutorMessage';
import { useTutorSession, type ThreadItem } from './useTutorSession';

const BACK_MARK = '\u2192';
const ERROR_KEYS = {
  network: 'ai.error.network',
  timeout: 'ai.error.timeout',
  capped: 'ai.error.capped',
  disabled: 'ai.error.disabled',
} as const;
const PAPER_MARK = '\u25a4';

export interface TutorLessonScreenProps {
  loaded: LoadedExercise;
  raw: unknown;
  questionId: string;
  onBack: () => void;
  /** Opens another question of this exercise (the next one, after the end). */
  onNext?: (questionId: string) => void;
  /** Tests: a fake transport and a memory store. */
  transport?: MessagesTransport;
  store?: KeyValueStore;
}

function Item({
  item,
  live,
  nextLabel,
  onNext,
  onBack,
}: {
  item: ThreadItem;
  live: LiveComponent | null;
  /** The next question's label, when there is one. */
  nextLabel: string | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  switch (item.kind) {
    case 'tutor':
      return (
        <TutorMessage
          id={item.id}
          blocks={item.blocks}
          component={item.component}
          live={live}
        />
      );
    case 'student':
      return (
        <View style={styles.studentRow}>
          <StudentBubble
            content={
              item.line
                ? { kind: 'typed', raw: item.text }
                : { kind: 'text', text: item.text }
            }
          />
        </View>
      );
    case 'ended':
      return (
        <View style={styles.ended} testID="ai-ended">
          <Text style={styles.endedText}>{t('ai.ended')}</Text>
          <View style={styles.endedActions}>
            {nextLabel !== null && (
              <Pressable
                style={styles.retry}
                accessibilityRole="button"
                testID="ai-next-question"
                onPress={onNext}
              >
                <View style={styles.headerSubRow}>
                  <Text style={styles.retryText}>{t('ai.nextQuestion')}</Text>
                  <Text style={styles.retryText}>{nextLabel}</Text>
                </View>
              </Pressable>
            )}
            <Pressable
              style={styles.secondary}
              accessibilityRole="button"
              testID="ai-back-to-list"
              onPress={onBack}
            >
              <Text style={styles.secondaryText}>{t('ai.backToList')}</Text>
            </Pressable>
          </View>
        </View>
      );
  }
}

export function TutorLessonScreen(p: TutorLessonScreenProps) {
  const { t } = useTranslation();
  const s = useTutorSession({
    loaded: p.loaded,
    raw: p.raw,
    questionId: p.questionId,
    ...(p.transport && { transport: p.transport }),
    ...(p.store && { store: p.store }),
  });
  const [paperOpen, setPaperOpen] = useState(false);
  const list = useRef<FlatList<ThreadItem>>(null);
  const last = s.items[s.items.length - 1];
  useEffect(() => {
    // A new tutor message is read from its start; anything else shows the end.
    const id = setTimeout(() => {
      const index = s.items.length - 1;
      if (last?.kind === 'tutor' && !s.waiting) {
        list.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
      } else {
        list.current?.scrollToEnd({ animated: true });
      }
    }, 80);
    return () => clearTimeout(id);
  }, [s.items.length, s.waiting, last?.kind]);
  // The component of the newest tutor message is live while it is the step.
  const liveId =
    last?.kind === 'tutor' && last.component && !last.component.done
      ? last.id
      : null;

  const title = p.loaded.exercise.title as Rich;
  const label =
    p.loaded.exercise.paper?.parts
      .flatMap(part => part.questions)
      .find(q => q.id === p.questionId)?.label ?? p.questionId;
  // The next question of the exam paper, offered when this one is finished.
  const questions =
    p.loaded.exercise.paper?.parts.flatMap(part => part.questions) ?? [];
  const at = questions.findIndex(q => q.id === p.questionId);
  const nextQ = at >= 0 ? questions[at + 1] : undefined;
  const next =
    p.onNext && nextQ && nextQ.status === 'available'
      ? { id: nextQ.id, label: nextQ.label }
      : null;
  const errorKey = s.error
    ? ERROR_KEYS[s.error.kind as keyof typeof ERROR_KEYS] ?? 'ai.error.other'
    : null;
  const nowLine = s.roadmap ? `${t('ai.now')}: ${s.roadmap.now}` : '';
  const nextLine = s.roadmap ? `${t('ai.next')}: ${s.roadmap.next}` : '';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="tutor-screen"
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={t('ai.back')}
          testID="ai-back"
          onPress={p.onBack}
        >
          <Text style={styles.headerMark}>{BACK_MARK}</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <RichView
            rich={title.ar ? { ar: title.ar } : title}
            numberOfLines={1}
            mathScroll={false}
          />
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSub}>{t('ai.question')}</Text>
            <Text style={styles.headerSub}>{label}</Text>
          </View>
        </View>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={t('ai.paper')}
          testID="ai-paper-open"
          onPress={() => setPaperOpen(true)}
        >
          <Text style={styles.headerMark}>{PAPER_MARK}</Text>
        </Pressable>
      </View>
      {s.roadmap && (
        <View style={styles.strip} testID="ai-roadmap">
          <Text style={styles.stripNow} numberOfLines={1}>
            {nowLine}
          </Text>
          <Text style={styles.stripNext} numberOfLines={1}>
            {nextLine}
          </Text>
        </View>
      )}
      <FlatList
        ref={list}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        data={s.items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <Item
            item={item}
            live={item.id === liveId ? s.component : null}
            nextLabel={next?.label ?? null}
            onNext={() => next && p.onNext?.(next.id)}
            onBack={p.onBack}
          />
        )}
        onScrollToIndexFailed={() => list.current?.scrollToEnd()}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <View style={styles.footer}>
            {s.waiting && (
              <Text style={styles.typing} testID="ai-typing">
                {s.slow ? t('ai.slow') : t('ai.typing')}
              </Text>
            )}
            {errorKey && (
              <View style={styles.error} testID="ai-error">
                <Text style={styles.errorText}>{t(errorKey)}</Text>
                {s.error?.retryable && (
                  <Pressable
                    style={styles.retry}
                    accessibilityRole="button"
                    testID="ai-retry"
                    onPress={s.retry}
                  >
                    <Text style={styles.retryText}>{t('ai.retry')}</Text>
                  </Pressable>
                )}
              </View>
            )}
            <Text style={styles.aiMark}>{t('ai.aiMark')}</Text>
          </View>
        }
      />
      {!s.items.some(i => i.kind === 'ended') && (
        <InputDock
          input={s.input}
          disabled={s.waiting || s.error !== null}
          caseBalls={s.caseBalls}
          onAct={s.send}
          onFinishComponent={s.component.finish}
        />
      )}
      <Modal
        visible={paperOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPaperOpen(false)}
      >
        <View style={styles.scrim}>
          <View style={styles.sheet} testID="ai-paper">
            <Text style={styles.sheetTitle}>{t('ai.paper')}</Text>
            <ScrollView contentContainerStyle={styles.paperLines}>
              {s.paper.length === 0 ? (
                <Text style={styles.paperEmpty}>{t('ai.paperEmpty')}</Text>
              ) : (
                s.paper.map((l, i) => (
                  <RichView key={i} rich={{ fr: l.fr }} variant="paper" />
                ))
              )}
            </ScrollView>
            <Pressable
              style={styles.retry}
              accessibilityRole="button"
              testID="ai-paper-close"
              onPress={() => setPaperOpen(false)}
            >
              <Text style={styles.retryText}>{t('ai.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    gap: theme.space.md,
    borderBottomColor: theme.color.borderDefault,
    borderBottomWidth: theme.border.line,
  },
  headerButton: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  headerMark: { ...theme.font.header, color: theme.color.textPrimary },
  headerTitle: { flex: 1 },
  headerSubRow: {
    flexDirection: theme.reading.row,
    gap: theme.space.xs,
  },
  headerSub: { ...theme.font.small, color: theme.color.textSecondary },
  strip: {
    paddingHorizontal: theme.space.xxl,
    paddingVertical: theme.space.xs,
    backgroundColor: theme.color.surfaceMuted,
  },
  stripNow: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    textAlign: 'right',
  },
  stripNext: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
  },
  thread: { flex: 1 },
  threadContent: { padding: theme.space.lg, gap: theme.space.lg },
  studentRow: { alignItems: theme.reading.endAlign },
  ended: {
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surfaceSelected,
  },
  endedActions: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  secondary: {
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.xxl,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  secondaryText: { ...theme.font.body, color: theme.color.textPrimary },
  endedText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    textAlign: 'right',
  },
  footer: { gap: theme.space.sm, paddingBottom: theme.space.section },
  typing: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
  },
  error: { gap: theme.space.sm, alignItems: theme.reading.startAlign },
  errorText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    textAlign: 'right',
  },
  retry: {
    backgroundColor: theme.color.actionPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.xxl,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: { ...theme.font.body, color: theme.color.textOnAccent },
  aiMark: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
  },
  scrim: {
    flex: 1,
    backgroundColor: theme.color.overlayScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.color.surfacePaper,
    borderTopLeftRadius: theme.radius.sheetTop,
    borderTopRightRadius: theme.radius.sheetTop,
    padding: theme.space.xxl,
    gap: theme.space.lg,
    maxHeight: '80%',
  },
  sheetTitle: {
    ...theme.font.header,
    color: theme.color.textPrimary,
    textAlign: 'right',
  },
  paperLines: { gap: theme.space.sm },
  paperEmpty: {
    ...theme.font.body,
    color: theme.color.textSecondary,
    textAlign: 'right',
  },
});
