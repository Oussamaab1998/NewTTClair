/**
 * The teacher's own screen (approved mockups Teacher and TeacherTyping,
 * 2026-11-18): over the whole lesson, the header with ✕, «الأستاذ» and
 * «يفسّرلك حتى تفهم»; the context chip («على: <exercise>، السؤال <n>» with
 * ✕ to make it a general question, or «سؤال عام، موش على التمرين» with
 * «رجّع التمرين»); the thread (his bubbles, the teacher's answers drawn like
 * the lesson's blocks); «فهمت ✓» / «مازال ما فهمتش» and «نرجعو للتمرين»
 * under the last answer; and the input with its row of math keys, always
 * above the phone keyboard (useKeyboardInset.ts says why it is not a Modal).
 *
 * A long-press request (AskProvider) arrives as `initial` and is sent at
 * once: a glossary entry answers it free (no call), otherwise the AI
 * teacher. «نكتب سؤالي وحدي» puts what he pressed in his question instead.
 * A previous long answer folds to one line when a new one arrives. The AI's
 * answers carry «written by the AI, numbers checked by the engine». When the
 * day's allowance is spent the screen says the teacher is back tomorrow
 * (glossary answers still work); a failed call says it could not answer now.
 *
 * Render it as the last child of the board's root view: it fills its parent.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
  type TextInputSelectionChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { blocksText } from '../../../../ai/move/mover';
import { arabiziNotes } from '../../../../ai/teacher/arabizi';
import { teacherContext } from '../../../../ai/teacher/context';
import { glossaryAnswer, pickEntry } from '../../../../ai/teacher/glossary';
import {
  TEACHER_HISTORY,
  type TeacherAi,
  type TeacherBlock,
  type TeacherContext,
  type TeacherRequest,
  type TeacherTurn,
} from '../../../../ai/teacher/types';
import { glossaryMatches, helpFor } from '../../../../content/help/help';
import type { Rich } from '../../../../content/schema';
import { RichText } from '../../../../lesson/blocks/RichText';
import { RichView } from '../../../../lesson/feed/RichView';
import { AskProvider } from './AskProvider';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { toPlainText } from '../../../../lesson/rich/runs';
import { theme } from '../../../../theme';
import { TypingBubble } from '../TypingBubble';
import { MathKeys } from './MathKeys';
import { insertKey, latexToTyped, type MathKey } from './typed';
import type {
  AskKind,
  AskRequest,
  TeacherEvent,
  TeacherQuestion,
} from './types';
import { useKeyboardInset } from './useKeyboardInset';

const MAX_TEXT = 600;
const CLOSE_MARK = '✕';
/** Send: an arrow toward the reading direction (the label is for screen readers). */
const SEND_MARK = '←';
const FOLDED_MARK = '◂';
const OPEN_MARK = '▾';
/** A previous answer longer than this folds to one line when a new one arrives. */
const FOLD_CHARS = 160;
const FOLD_BLOCKS = 3;

type His =
  | { kind: 'typed'; text: string }
  | { kind: 'menu'; ask: AskKind; pressed: AskRequest['pressed'] }
  | { kind: 'simpler' }
  | { kind: 'understood' };

type Answer =
  | { kind: 'pending' }
  | {
      kind: 'blocks';
      blocks: TeacherBlock[];
      source: 'glossary' | 'ai' | 'canned';
    }
  | { kind: 'none'; reason: 'spent' | 'failed' };

interface Turn {
  id: string;
  his: His;
  /** null: his «فهمت ✓», which needs no answer. */
  answer: Answer | null;
}

export interface TeacherScreenProps {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  /** The question open on the board (null: none; every question is then general). */
  question: TeacherQuestion | null;
  ai: TeacherAi;
  /** A long-press request to send when the screen opens (a new object each time). */
  initial: AskRequest | null;
  /** His acts and the answers, for the event log. */
  onEvent?: (e: TeacherEvent) => void;
}

const answerChars = (blocks: readonly TeacherBlock[]): number =>
  blocksText(blocks).length;

/** The teacher's blocks, drawn like the lesson's (Arabic runs, the paper's French, formulas). */
/** Words he selected, between quotes as a quote. */
const quoted = (s: string): string => ['«', s, '»'].join('');

function AnswerBlocks({ blocks }: { blocks: readonly TeacherBlock[] }) {
  return (
    <View style={styles.blocks}>
      {blocks.map((b, i) =>
        b.type === 'ar' ? (
          <RichView key={i} rich={{ ar: b.runs }} />
        ) : b.type === 'fr' ? (
          <RichView key={i} rich={{ fr: b.text }} variant="paper" />
        ) : (
          <RichView key={i} rich={{ math: b.latex }} />
        ),
      )}
    </View>
  );
}

/** The first words of an answer, on one line (a folded answer). */
function Preview({ blocks }: { blocks: readonly TeacherBlock[] }) {
  const { t } = useTranslation();
  const first = blocks.find(b => b.type !== 'math');
  const rich: Rich | null =
    first?.type === 'ar'
      ? { ar: [{ ar: `${t('hybrid.teacher.folded')} ` }, ...first.runs] }
      : first?.type === 'fr'
      ? { fr: first.text }
      : null;
  return rich ? (
    <RichView
      rich={rich}
      fontSize={theme.font.size.small}
      color={theme.color.textSecondary}
      numberOfLines={1}
      mathScroll={false}
    />
  ) : null;
}

/** His bubble: what he typed, or the option he chose with what he pressed. */
function HisBubble({ his }: { his: His }) {
  const { t } = useTranslation();
  const notes = his.kind === 'typed' ? arabiziNotes(his.text) : [];
  return (
    <View style={styles.hisBox}>
      <View style={styles.his} testID="teacher-his">
        {his.kind === 'typed' && (
          <Text
            style={[
              styles.hisText,
              /^[\s\u0600-\u06FF]*[\u0600-\u06FF]/.test(his.text)
                ? styles.rtl
                : styles.ltr,
            ]}
          >
            {his.text}
          </Text>
        )}
        {his.kind === 'menu' && (
          <>
            <Text style={[styles.hisText, styles.rtl]}>
              {t(`hybrid.teacher.menu.${his.ask}`)}
            </Text>
            {his.pressed.kind === 'math' ? (
              <MathBlock
                latex={his.pressed.text}
                color={theme.color.textOnAccent}
                fontSize={theme.font.size.bodyLarge}
              />
            ) : his.pressed.kind === 'ar' ? (
              <Text style={[styles.hisText, styles.rtl]}>
                {quoted(his.pressed.text)}
              </Text>
            ) : (
              <Text style={[styles.hisText, styles.ltr, styles.paper]}>
                {his.pressed.text}
              </Text>
            )}
          </>
        )}
        {his.kind === 'simpler' && (
          <Text style={[styles.hisText, styles.rtl]}>
            {t('hybrid.teacher.notYet')}
          </Text>
        )}
        {his.kind === 'understood' && (
          <Text style={[styles.hisText, styles.rtl]}>
            {t('hybrid.teacher.understood')}
          </Text>
        )}
      </View>
      {notes.length > 0 && (
        <RichText
          runs={[
            { ar: `${t('hybrid.teacher.read')} ` },
            {
              fr: notes.map(n => `${n.word} = ${n.symbol}`).join(', '),
            },
          ]}
          style={styles.note}
          testID="teacher-read"
        />
      )}
    </View>
  );
}

/** What he asked, as the model reads it (the thread's history). */
function hisText(h: His, t: (k: string) => string): string {
  switch (h.kind) {
    case 'typed':
      return h.text;
    case 'menu':
      return `${t(`hybrid.teacher.menu.${h.ask}`)} «${h.pressed.text}»`;
    case 'simpler':
      return t('hybrid.teacher.notYet');
    case 'understood':
      return t('hybrid.teacher.understood');
  }
}

export function TeacherScreen({
  visible,
  onClose,
  exerciseId,
  question,
  ai,
  initial,
  onEvent,
}: TeacherScreenProps) {
  const { t } = useTranslation();
  const [turns, setTurnsState] = useState<Turn[]>([]);
  // The thread as the next request reads it (state updates land later).
  const thread = useRef<Turn[]>([]);
  const setTurns = useCallback((f: (ts: Turn[]) => Turn[]) => {
    thread.current = f(thread.current);
    setTurnsState(thread.current);
  }, []);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [general, setGeneral] = useState(false);
  const [text, setText] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  // Set right after a key writes into the field, cleared on the next selection change.
  const [forced, setForced] = useState<{ start: number; end: number } | null>(
    null,
  );
  const root = useRef<ComponentRef<typeof View>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const next = useRef(0);
  const handled = useRef<AskRequest | null>(null);
  const aborts = useRef(new Set<AbortController>());
  const { inset, onLayout } = useKeyboardInset(root, visible);
  const isGeneral = general || question === null;

  // A new exercise: a new thread.
  useEffect(() => {
    setTurns(() => []);
    setOpened(new Set());
    setGeneral(false);
  }, [exerciseId, setTurns]);
  useEffect(() => {
    const all = aborts.current;
    return () => all.forEach(a => a.abort());
  }, []);
  // Android back: close the teacher, not the lesson.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onEvent?.({ t: 'teacher_close' });
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose, onEvent]);

  const pending = turns.some(x => x.answer?.kind === 'pending');

  const history = useCallback(
    (ts: readonly Turn[]): TeacherTurn[] =>
      ts
        .filter(x => x.answer?.kind === 'blocks')
        .slice(-TEACHER_HISTORY)
        .map(x => ({
          his: hisText(x.his, k => t(k as never)),
          answer:
            x.answer?.kind === 'blocks' ? blocksText(x.answer.blocks) : '',
        })),
    [t],
  );

  const contextNow = useCallback((): TeacherContext | null => {
    if (!question) {
      return null;
    }
    try {
      return teacherContext(question.ctx, question.state);
    } catch {
      return null;
    }
  }, [question]);

  const land = useCallback(
    (id: string, answer: Answer) =>
      setTurns(ts => ts.map(x => (x.id === id ? { ...x, answer } : x))),
    [setTurns],
  );

  /** Ask the AI teacher; the answer lands on the turn `id`. */
  const callAi = useCallback(
    async (id: string, req: TeacherRequest) => {
      const ac = new AbortController();
      aborts.current.add(ac);
      try {
        const r = await ai(req, ac.signal);
        if (ac.signal.aborted) {
          return;
        }
        if (r.ok) {
          land(id, {
            kind: 'blocks',
            blocks: r.answer.blocks,
            source: r.answer.source,
          });
          onEvent?.({
            t: 'teacher_answer',
            source: r.answer.source,
            costUsd: r.answer.costUsd,
          });
        } else {
          land(id, { kind: 'none', reason: r.reason });
          onEvent?.({ t: 'teacher_no_answer', reason: r.reason });
        }
      } catch {
        land(id, { kind: 'none', reason: 'failed' });
      } finally {
        aborts.current.delete(ac);
      }
    },
    [ai, land, onEvent],
  );

  /** A new turn of his, answered by the glossary (free) or the AI. */
  const send = useCallback(
    (
      his: His,
      build: (h: TeacherTurn[]) => TeacherRequest,
      free: TeacherBlock[] | null,
    ) => {
      const id = `t${next.current++}`;
      // The request reads the thread before this turn.
      const h = history(thread.current);
      setTurns(ts => [
        ...ts,
        {
          id,
          his,
          answer: free
            ? { kind: 'blocks', blocks: free, source: 'glossary' }
            : { kind: 'pending' },
        },
      ]);
      if (free) {
        onEvent?.({ t: 'teacher_answer', source: 'glossary', costUsd: 0 });
      } else {
        callAi(id, build(h)).catch(() => {});
      }
    },
    [callAi, history, onEvent, setTurns],
  );

  const askMenu = useCallback(
    (r: AskRequest) => {
      if (r.kind === 'own') {
        const typed =
          r.pressed.kind === 'math'
            ? latexToTyped(r.pressed.text)
            : r.pressed.text;
        setText(cur => (cur.trim() === '' ? `${typed} ` : `${cur} ${typed} `));
        setTimeout(() => input.current?.focus(), 0);
        return;
      }
      onEvent?.({
        t: 'teacher_ask',
        from: 'menu',
        kind: r.kind,
        general: isGeneral,
      });
      const entries =
        r.entryId !== null
          ? helpFor(exerciseId)?.glossary ?? []
          : glossaryMatches(exerciseId, r.pressed.text);
      const entry = pickEntry(entries, r.entryId);
      const free = entry ? glossaryAnswer(entry, r.kind) : null;
      const context = contextNow();
      send(
        { kind: 'menu', ask: r.kind, pressed: r.pressed },
        h => ({
          mode: 'ask',
          question: t(`hybrid.teacher.menu.${r.kind}`),
          pressed: r.pressed.text,
          context,
          general: isGeneral,
          history: h,
        }),
        free,
      );
    },
    [contextNow, exerciseId, isGeneral, onEvent, send, t],
  );

  // A long-press request: sent once, when the screen shows it.
  useEffect(() => {
    if (visible && initial && handled.current !== initial) {
      handled.current = initial;
      askMenu(initial);
    }
  }, [visible, initial, askMenu]);

  const submit = () => {
    const v = text.trim();
    if (v === '' || pending) {
      return;
    }
    setText('');
    setSelection({ start: 0, end: 0 });
    onEvent?.({
      t: 'teacher_ask',
      from: 'typed',
      kind: null,
      general: isGeneral,
    });
    const context = contextNow();
    send(
      { kind: 'typed', text: v.slice(0, MAX_TEXT) },
      h => ({
        mode: 'ask',
        question: v.slice(0, MAX_TEXT),
        pressed: null,
        context,
        general: isGeneral,
        history: h,
      }),
      null,
    );
  };

  const understood = () => {
    onEvent?.({ t: 'teacher_understood' });
    setTurns(ts => [
      ...ts,
      { id: `t${next.current++}`, his: { kind: 'understood' }, answer: null },
    ]);
  };

  const simpler = () => {
    onEvent?.({
      t: 'teacher_ask',
      from: 'simpler',
      kind: null,
      general: isGeneral,
    });
    const context = contextNow();
    send(
      { kind: 'simpler' },
      h => ({
        mode: 'simpler',
        question: t('hybrid.teacher.notYet'),
        pressed: null,
        context,
        general: isGeneral,
        history: h,
      }),
      null,
    );
  };

  const onKey = (k: MathKey) => {
    onEvent?.({ t: 'teacher_key', key: k.id });
    const r = insertKey(text, selection, k);
    setText(r.text);
    const sel = { start: r.cursor, end: r.cursor };
    setSelection(sel);
    setForced(sel);
  };

  const onSelectionChange = (e: TextInputSelectionChangeEvent) => {
    setSelection(e.nativeEvent.selection);
    setForced(null);
  };

  const toggleGeneral = (to: boolean) => {
    setGeneral(to);
    onEvent?.({ t: 'teacher_context', general: to });
  };

  const close = () => {
    onEvent?.({ t: 'teacher_close' });
    onClose();
  };

  // The last answer the buttons belong to (none after his «فهمت ✓»).
  const last = turns[turns.length - 1];
  const lastAnswered = last?.answer?.kind === 'blocks' ? last.id : null;
  const newestBlocks = useMemo(
    () =>
      [...turns].reverse().find(x => x.answer?.kind === 'blocks')?.id ?? null,
    [turns],
  );

  if (!visible) {
    return null;
  }

  const title = question
    ? (question.ctx.loaded.exercise.title as Rich | undefined) ?? null
    : null;
  const exerciseName = title?.ar ? toPlainText(title.ar) : title?.fr ?? '';
  const fieldRtl = text === '' || /^[\s]*[\u0600-\u06FF]/.test(text);

  return (
    // His own text and the answers are selectable too: a selection asks here.
    <AskProvider exerciseId={exerciseId} onAsk={askMenu}>
      <View
        ref={root}
        style={[styles.root, { paddingBottom: inset }]}
        onLayout={onLayout}
        accessibilityViewIsModal
        testID="teacher-screen"
      >
        <View style={styles.header}>
          <Pressable
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={t('hybrid.teacher.back')}
            testID="teacher-close"
            onPress={close}
          >
            <Text style={styles.closeMark}>{CLOSE_MARK}</Text>
          </Pressable>
          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header">
              {t('hybrid.teacher.title')}
            </Text>
            <Text style={styles.subtitle}>{t('hybrid.teacher.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          {!isGeneral && question ? (
            <View style={styles.chip} testID="teacher-chip-exercise">
              <RichText
                runs={[
                  {
                    ar: `${t('hybrid.teacher.about', {
                      exercise: exerciseName,
                    })} `,
                  },
                  { fr: question.ctx.pack.label },
                ]}
                style={styles.chipText}
                numberOfLines={1}
              />
              <Pressable
                style={styles.chipClose}
                accessibilityRole="button"
                accessibilityLabel={t('hybrid.teacher.aboutOff')}
                hitSlop={theme.space.sm}
                testID="teacher-chip-off"
                onPress={() => toggleGeneral(true)}
              >
                <Text style={styles.chipCloseMark}>{CLOSE_MARK}</Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[styles.chip, styles.chipGeneral]}
              testID="teacher-chip-general"
            >
              <Text style={styles.chipText}>{t('hybrid.teacher.general')}</Text>
              {question && (
                <Pressable
                  style={styles.chipBack}
                  accessibilityRole="button"
                  testID="teacher-chip-back"
                  onPress={() => toggleGeneral(false)}
                >
                  <Text style={styles.chipBackText}>
                    {t('hybrid.teacher.backToExercise')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <ScrollView
          ref={scroll}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scroll.current?.scrollToEnd({ animated: true })
          }
          testID="teacher-thread"
        >
          {turns.length === 0 && (
            <Text style={styles.empty} testID="teacher-empty">
              {t('hybrid.teacher.empty')}
            </Text>
          )}
          {turns.map(x => {
            const a = x.answer;
            const long =
              a?.kind === 'blocks' &&
              (a.blocks.length > FOLD_BLOCKS ||
                answerChars(a.blocks) > FOLD_CHARS);
            const folded =
              a?.kind === 'blocks' &&
              long &&
              x.id !== newestBlocks &&
              !opened.has(x.id);
            return (
              <View key={x.id} style={styles.turn}>
                <HisBubble his={x.his} />
                {a?.kind === 'pending' && (
                  <TypingBubble testID="teacher-waiting" />
                )}
                {a?.kind === 'none' && (
                  <View style={styles.notice} testID={`teacher-${a.reason}`}>
                    <Text style={styles.noticeText}>
                      {t(
                        a.reason === 'spent'
                          ? 'hybrid.teacher.spent'
                          : 'hybrid.teacher.failed',
                      )}
                    </Text>
                  </View>
                )}
                {a?.kind === 'blocks' && folded && (
                  <Pressable
                    style={styles.folded}
                    accessibilityRole="button"
                    accessibilityLabel={t('hybrid.teacher.openAnswer')}
                    accessibilityState={{ expanded: false }}
                    testID="teacher-folded"
                    onPress={() => setOpened(o => new Set(o).add(x.id))}
                  >
                    <Text style={styles.foldMark}>{FOLDED_MARK}</Text>
                    <View style={styles.foldText}>
                      <Preview blocks={a.blocks} />
                    </View>
                  </Pressable>
                )}
                {a?.kind === 'blocks' && !folded && (
                  <View style={styles.answer} testID="teacher-answer">
                    {long && x.id !== newestBlocks && (
                      <Pressable
                        style={styles.foldButton}
                        accessibilityRole="button"
                        accessibilityLabel={t('hybrid.teacher.foldAnswer')}
                        accessibilityState={{ expanded: true }}
                        testID="teacher-fold"
                        onPress={() =>
                          setOpened(o => {
                            const n = new Set(o);
                            n.delete(x.id);
                            return n;
                          })
                        }
                      >
                        <Text style={styles.foldMark}>{OPEN_MARK}</Text>
                      </Pressable>
                    )}
                    <AnswerBlocks blocks={a.blocks} />
                    <Text
                      style={styles.mark}
                      testID={`teacher-mark-${a.source}`}
                    >
                      {t(
                        a.source === 'glossary'
                          ? 'hybrid.teacher.glossaryMark'
                          : 'hybrid.teacher.aiMark',
                      )}
                    </Text>
                    {x.id === lastAnswered && (
                      <>
                        <View style={styles.buttons}>
                          <Pressable
                            style={[styles.primary, pending && styles.off]}
                            accessibilityRole="button"
                            disabled={pending}
                            testID="teacher-understood"
                            onPress={understood}
                          >
                            <Text style={styles.primaryText}>
                              {t('hybrid.teacher.understood')}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.secondary, pending && styles.off]}
                            accessibilityRole="button"
                            disabled={pending}
                            testID="teacher-not-yet"
                            onPress={simpler}
                          >
                            <Text style={styles.secondaryText}>
                              {t('hybrid.teacher.notYet')}
                            </Text>
                          </Pressable>
                        </View>
                        <Pressable
                          style={styles.link}
                          accessibilityRole="button"
                          testID="teacher-back"
                          onPress={close}
                        >
                          <Text style={styles.linkText}>
                            {t('hybrid.teacher.back')}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.bar}>
          <MathKeys onKey={onKey} />
          <View style={styles.inputRow}>
            <TextInput
              ref={input}
              style={[styles.field, fieldRtl ? styles.rtl : styles.ltr]}
              value={text}
              onChangeText={setText}
              onSelectionChange={onSelectionChange}
              {...(forced && { selection: forced })}
              placeholder={t('hybrid.teacher.placeholder')}
              placeholderTextColor={theme.color.textSecondary}
              accessibilityLabel={t('hybrid.teacher.input')}
              maxLength={MAX_TEXT}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              testID="teacher-input"
            />
            <Pressable
              style={[
                styles.send,
                (pending || text.trim() === '') && styles.sendOff,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('hybrid.teacher.send')}
              accessibilityState={{
                disabled: pending || text.trim() === '',
                busy: pending,
              }}
              disabled={pending || text.trim() === ''}
              testID="teacher-send"
              onPress={submit}
            >
              <Text style={styles.sendText}>{SEND_MARK}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AskProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    // Over the whole board: the last child of its root is drawn on top.
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.color.backgroundApp,
  },
  header: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.lg,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.md,
    backgroundColor: theme.color.surfaceCard,
    borderBottomWidth: theme.border.thin,
    borderBottomColor: theme.color.border,
  },
  close: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: { ...theme.font.body, color: theme.color.textPrimary },
  titles: { flex: 1 },
  title: {
    ...theme.font.header,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chipRow: {
    flexDirection: theme.reading.row,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.sm,
  },
  chip: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
    maxWidth: '100%',
    backgroundColor: theme.color.surfaceCard,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sheet,
    paddingVertical: theme.space.xxs,
    paddingHorizontal: theme.space.md,
  },
  chipGeneral: {
    backgroundColor: theme.color.draft.bg,
    borderColor: theme.color.draft.border,
  },
  chipText: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  chipClose: {
    width: theme.size.toneIcon,
    height: theme.size.toneIcon,
    borderRadius: theme.size.toneIcon / 2,
    backgroundColor: theme.color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCloseMark: { ...theme.font.small, color: theme.color.textPrimary },
  chipBack: {
    minHeight: theme.size.askChipMinHeight,
    justifyContent: 'center',
    borderRadius: theme.radius.sheet,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceCard,
    paddingHorizontal: theme.space.md,
  },
  chipBackText: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  thread: { flex: 1 },
  threadContent: {
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.space.lg,
    gap: theme.space.md,
  },
  empty: {
    ...theme.font.body,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingTop: theme.space.lg,
  },
  turn: { gap: theme.space.sm },
  hisBox: { alignItems: theme.reading.endAlign, gap: theme.space.xxs },
  his: {
    maxWidth: '85%',
    backgroundColor: theme.color.pen,
    borderRadius: theme.radius.sheet,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    gap: theme.space.xxs,
  },
  hisText: {
    ...theme.font.body,
    color: theme.color.textOnAccent,
  },
  paper: { fontFamily: theme.font.family.math.family },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  note: {
    ...theme.font.small,
    color: theme.color.textSecondary,
  },
  notice: {
    backgroundColor: theme.color.draft.bg,
    borderColor: theme.color.draft.border,
    borderWidth: theme.border.thin,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  noticeText: {
    ...theme.font.body,
    color: theme.color.draft.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  answer: {
    backgroundColor: theme.color.surfaceCard,
    borderColor: theme.color.border,
    borderWidth: theme.border.thin,
    borderRadius: theme.radius.sheet,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.lg,
    gap: theme.space.sm,
  },
  blocks: { gap: theme.space.sm },
  mark: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  folded: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: theme.size.touch,
    backgroundColor: theme.color.surfaceCard,
    borderColor: theme.color.border,
    borderWidth: theme.border.thin,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.space.lg,
  },
  foldButton: {
    alignSelf: theme.reading.startAlign,
    minWidth: theme.size.touch,
    minHeight: theme.size.askChipMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foldMark: { ...theme.font.small, color: theme.color.textSecondary },
  foldText: { flex: 1 },
  buttons: {
    flexDirection: theme.reading.row,
    gap: theme.space.sm,
    paddingTop: theme.space.sm,
  },
  primary: {
    flex: 1,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
  },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
  secondary: {
    flex: 1,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
  },
  secondaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  off: { opacity: theme.opacity.disabled },
  link: {
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.pen,
    writingDirection: 'rtl',
  },
  bar: {
    backgroundColor: theme.color.surfaceCard,
    borderTopWidth: theme.border.thin,
    borderTopColor: theme.color.border,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    gap: theme.space.sm,
  },
  inputRow: {
    flexDirection: theme.reading.row,
    alignItems: 'flex-end',
    gap: theme.space.sm,
  },
  field: {
    flex: 1,
    minHeight: theme.size.touch,
    maxHeight: theme.size.touch * 3,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    ...theme.font.body,
    color: theme.color.textPrimary,
  },
  send: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: theme.color.inkDisabled },
  sendText: { ...theme.font.header, color: theme.color.textOnAccent },
});
