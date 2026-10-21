import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { ComponentHandle, JsonObject } from '../../components/contract';
import { readoutNumber, readoutPair } from '../../components/analysis/plot';
import { Note, Readout } from '../../components/probability/ui';
import { parseExpression, toLatex } from '../../engine/expression';
import { RichText } from '../blocks/RichText';
import { MathBlock } from '../math/MathBlock';
import { spaceRunBoundaries, type ArRuns } from '../rich/runs';
import { checkLine, type LineVerdict, type LinesSpec } from './check';
import {
  apply,
  deserialize,
  emptyEditor,
  fromExpression,
  isEmpty,
  serialize,
  type EditorState,
  type Key,
} from './editor';
import {
  DEFAULT_KEYS,
  EditorKeys,
  EditorLine,
  KEY_LABEL,
  KeyButton,
  KEY_GAP,
  type KeyId,
  type Mark,
} from './MathEditor';
import { theme } from '../../theme';

export const LinesSnapshotSchema = z.object({
  accepted: z.array(z.string()),
  editor: z.custom<EditorState>(
    v => typeof v === 'object' && v !== null && 'root' in v && 'cursor' in v,
  ),
  collapsed: z.boolean(),
  last: z.custom<LineVerdict | null>(v => v === null || typeof v === 'object'),
  done: z.boolean(),
});
export type LinesSnapshot = z.infer<typeof LinesSnapshotSchema>;

export const emptyLines = (): LinesSnapshot => ({
  accepted: [],
  editor: emptyEditor(),
  collapsed: false,
  last: null,
  done: false,
});

interface Props {
  spec: LinesSpec;
  /** LaTeX before the first line, e.g. "f(-x)" (lines then start with "="). */
  lhs?: string;
  /** LaTeX of the target shown on top (default: the goal expression). */
  goalLatex?: string;
  keys?: readonly KeyId[];
  readonly?: boolean;
  initial?: LinesSnapshot;
  /**
   * A line was checked (the card's verdict is for display; the lesson
   * reducer re-checks the same line and logs it).
   */
  onLine?: (raw: string, keys: string[], verdict: LineVerdict) => void;
  /** Editor inputs worth logging on their own (a copied line); not answers. */
  onInput?: (name: string, payload: JsonObject) => void;
  testID?: string;
  ref?: Ref<ComponentHandle>;
}

const latexOf = (src: string, vars: readonly string[]) => {
  const r = parseExpression(src, { variables: vars });
  return r.ok ? toLatex(r.ast) : src;
};

const CHECK = '✓';
/** A restored state without its one-time markers (no old flash or chip). */
const quiet = ({ flash: _f, change: _c, ...rest }: EditorState): EditorState =>
  rest;
/** Undo depth (editor states). */
const HISTORY = 50;
type CardKey = Key | 'undo' | 'redo';
interface History {
  past: EditorState[];
  future: EditorState[];
}
const COLLAPSE = '▾';
const EXPAND = '▴';

/**
 * Line-by-line writing: the goal on top, the notebook of accepted lines,
 * then the structured editor and its contextual keys (▾ folds them). Each
 * line is checked against the previous one by the engine; a wrong line is
 * localized and checked with the student's own value.
 */
export function LinesCard({
  spec,
  lhs,
  goalLatex,
  keys = DEFAULT_KEYS,
  readonly = false,
  initial,
  onLine,
  onInput,
  testID = 'lines',
  ref,
}: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<LinesSnapshot>(initial ?? emptyLines());
  const trace = useRef<string[]>([]);
  const vars = spec.variables;
  const checkLabel = `${CHECK} ${t('lesson.check')}`;
  const live = !readonly && !state.done;

  useImperativeHandle(
    ref,
    () => ({
      getStateSnapshot: () =>
        ({
          ...state,
          draft: serialize(state.editor.root),
        } as unknown as JsonObject),
    }),
    [state],
  );

  // Undo / redo: editor states, kept out of the snapshot (reports, restore).
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const press = (k: CardKey) => {
    trace.current.push(typeof k === 'object' ? 'focus' : k);
    const cur = state.editor;
    let editor: EditorState;
    if (k === 'undo' || k === 'redo') {
      const from = k === 'undo' ? history.past : history.future;
      const prev = from[from.length - 1];
      if (!prev) {
        return;
      }
      editor = quiet(prev);
      setHistory(h =>
        k === 'undo'
          ? { past: h.past.slice(0, -1), future: [...h.future, cur] }
          : { past: [...h.past, cur], future: h.future.slice(0, -1) },
      );
    } else {
      editor = apply(cur, k);
      if (editor.root !== cur.root) {
        setHistory(h => ({
          past: [...h.past, cur].slice(-HISTORY),
          future: [],
        }));
      }
    }
    // An unreadable-line warning points at a spot that editing moves; a
    // "same line" note goes once the student changes something.
    setState(s => ({
      ...s,
      editor,
      ...((s.last?.kind === 'unreadable' || s.last?.kind === 'unchanged') && {
        last: null,
      }),
    }));
  };

  // "Copy the previous line": the last accepted line, else the start
  // expression (without its "f(−x) =" label), as editable math.
  const previous = state.accepted[state.accepted.length - 1] ?? spec.start;
  const copySource = useMemo(
    () =>
      previous === undefined
        ? null
        : deserialize(previous) ?? fromExpression(previous, vars),
    [previous, vars],
  );
  const copyPrevious = () => {
    if (!copySource) {
      return;
    }
    trace.current.push('copy');
    const cur = state.editor;
    setHistory(h => ({ past: [...h.past, cur].slice(-HISTORY), future: [] }));
    setState(s => ({
      ...s,
      editor: { root: copySource, cursor: { path: [], at: copySource.length } },
      last: null,
    }));
    onInput?.('line_copied', {
      from: state.accepted.length > 0 ? 'last_line' : 'start',
    });
  };

  // A wrap outlines the wrapped part for a moment; with reduce motion it
  // stays (no blink) until the next key.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(on => setReduceMotion(on === true))
      .catch(() => undefined);
  }, []);
  // After a structural change: "<change> · تراجع" for a few seconds; it goes
  // with the next key (a new editor state).
  const change = state.editor.change;
  const [chipOn, setChipOn] = useState(false);
  useEffect(() => {
    setChipOn(change !== undefined);
    if (change === undefined) {
      return;
    }
    const timer = setTimeout(() => setChipOn(false), theme.editor.undoChipMs);
    return () => clearTimeout(timer);
  }, [state.editor, change]);
  const flash = state.editor.flash;
  const [flashOn, setFlashOn] = useState(false);
  useEffect(() => {
    setFlashOn(flash !== undefined);
    if (flash === undefined || reduceMotion) {
      return;
    }
    const timer = setTimeout(() => setFlashOn(false), theme.editor.flashMs);
    return () => clearTimeout(timer);
  }, [flash, reduceMotion]);

  const submit = () => {
    if (isEmpty(state.editor)) {
      return;
    }
    const raw = serialize(state.editor.root);
    const verdict = checkLine(spec, state.accepted, raw);
    onLine?.(raw, trace.current, verdict);
    trace.current = [];
    if (verdict.kind === 'accepted') {
      setHistory({ past: [], future: [] });
    }
    setState(s =>
      verdict.kind === 'accepted'
        ? {
            ...s,
            accepted: [...s.accepted, raw],
            editor: emptyEditor(),
            last: verdict,
            done: verdict.final,
          }
        : { ...s, last: verdict },
    );
  };

  const goal = useMemo(
    () => goalLatex ?? latexOf(spec.goal, vars),
    [goalLatex, spec.goal, vars],
  );
  const firstPrefix = lhs !== undefined ? `${lhs}=` : '';
  // The unreadable spot, or the faulty part of a wrong line written as one fraction.
  const last = state.last;
  const only = state.editor.root.length === 1 ? state.editor.root[0] : null;
  const mark: Mark | undefined =
    last?.kind === 'unreadable'
      ? last.issue
      : last?.kind === 'wrong' &&
        only?.k === 'frac' &&
        (last.where === 'numerator' || last.where === 'denominator')
      ? { path: [{ i: 0, slot: last.where === 'numerator' ? 'num' : 'den' }] }
      : undefined;
  const notebook = [
    ...(spec.start !== undefined ? [spec.start] : []),
    ...state.accepted,
  ];

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.goal}>
        <Text style={styles.label}>{t('lines.goal')}</Text>
        <Line latex={goal} testID={`${testID}-goal`} />
      </View>
      {notebook.map((src, i) => (
        <Line
          key={i}
          latex={`${i === 0 ? firstPrefix : '='}${latexOf(src, vars)}`}
          testID={`${testID}-line-${i}`}
        />
      ))}
      {state.last && (
        <Feedback verdict={state.last} testID={testID} />
      )}
      {live && (
        <>
          <View>
            <EditorLine
              state={state.editor}
              onKey={press}
              {...(mark && { mark })}
              showFlash={flashOn}
              testID={`${testID}-editor`}
            />
            {isEmpty(state.editor) && copySource && (
              <Pressable
                onPress={copyPrevious}
                accessibilityRole="button"
                style={styles.copy}
                testID={`${testID}-copy`}
              >
                <Text style={styles.copyText}>{t('lines.copyPrevious')}</Text>
              </Pressable>
            )}
            {chipOn && change && (
              <Pressable
                onPress={() => press('undo')}
                accessibilityRole="button"
                accessibilityLabel={`${t(`lines.change.${change}`)}، ${t(
                  'lines.undo',
                )}`}
                style={styles.undoChip}
                testID={`${testID}-undo-chip`}
              >
                <Text style={styles.undoChipText}>
                  {t(`lines.change.${change}`)}
                </Text>
                <Text style={[styles.undoChipText, styles.undoChipAction]}>
                  {t('lines.undo')}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.row}>
            {(['left', 'up', 'down', 'right', 'back'] as const).map(k => (
              <KeyButton
                key={k}
                k={k}
                onKey={press}
                label={KEY_LABEL[k]!}
                a11y={t(`lines.key.${k}`)}
                testID={`${testID}-key-${k}`}
              />
            ))}
          </View>
          <View style={styles.row}>
            {(['undo', 'redo'] as const).map(k => (
              <KeyButton
                key={k}
                k={k}
                onKey={press}
                // Undo is named, so it is easy to find.
                label={
                  k === 'undo'
                    ? `${KEY_LABEL.undo} ${t('lines.undo')}`
                    : KEY_LABEL[k]!
                }
                small={k === 'undo'}
                weight={k === 'undo' ? 2 : 1}
                a11y={t(`lines.key.${k}`)}
                disabled={
                  (k === 'undo' ? history.past : history.future).length === 0
                }
                testID={`${testID}-key-${k}`}
              />
            ))}
            <KeyButton
              k="widen"
              onKey={press}
              label={t('lines.widen')}
              small
              a11y={t('lines.key.widen')}
              testID={`${testID}-key-widen`}
            />
            <Pressable
              onPress={() => setState(s => ({ ...s, collapsed: !s.collapsed }))}
              accessibilityRole="button"
              accessibilityLabel={t(
                state.collapsed ? 'lesson.showKeys' : 'lesson.hideKeys',
              )}
              accessibilityState={{ expanded: !state.collapsed }}
              testID={`${testID}-collapse`}
              style={styles.fold}
            >
              <Text style={styles.foldText}>
                {state.collapsed ? EXPAND : COLLAPSE}
              </Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <Pressable
              onPress={submit}
              disabled={isEmpty(state.editor)}
              accessibilityRole="button"
              accessibilityState={{ disabled: isEmpty(state.editor) }}
              testID={`${testID}-check`}
              style={[styles.check, isEmpty(state.editor) && styles.disabled]}
            >
              <Text
                style={styles.checkText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={theme.font.minScale}
              >
                {checkLabel}
              </Text>
            </Pressable>
          </View>
          <EditorKeys
            keys={keys}
            collapsed={state.collapsed}
            onKey={press}
            testID={testID}
          />
        </>
      )}
    </View>
  );
}

/** A math line that may be wider than the screen: it scrolls, never overflows. */
function Line({ latex, testID }: { latex: string; testID: string }) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.lineContent}
      testID={testID}
    >
      <MathBlock latex={latex} fontSize={theme.font.size.bodyLarge} />
    </ScrollView>
  );
}

function Feedback({
  verdict: v,
  testID,
}: {
  verdict: LineVerdict;
  testID: string;
}) {
  const { t } = useTranslation();
  if (v.kind === 'accepted') {
    return v.final ? (
      <Note tone="success" text={t('lines.done')} testID={`${testID}-done`} />
    ) : null;
  }
  if (v.kind === 'unchanged') {
    return (
      <Note
        tone="info"
        text={t('lines.unchanged')}
        testID={`${testID}-unchanged`}
      />
    );
  }
  if (v.kind === 'unreadable') {
    return (
      <Note
        tone="warning"
        text={t(`lines.issue.${v.issue.kind}`)}
        testID={`${testID}-unreadable`}
      />
    );
  }
  if (v.kind === 'parse_error' || v.kind === 'undetermined') {
    const key =
      v.kind === 'undetermined' ? 'lines.undetermined' : 'lines.invalid';
    return <Note tone="info" text={t(key)} testID={`${testID}-invalid`} />;
  }
  const part =
    v.where === 'numerator' || v.where === 'denominator' ? v.where : null;
  const where: ArRuns = part
    ? [{ ar: t('lines.errorIn') }, { fr: t(`lines.termArticle.${part}`) }]
    : [{ ar: t('lines.errorWhole') }];
  return (
    <View style={styles.feedback} testID={`${testID}-wrong`}>
      <RichText
        runs={spaceRunBoundaries(where)}
        style={styles.warn}
        testID={`${testID}-where`}
      />
      {v.parentheses && (
        <RichText
          runs={spaceRunBoundaries([
            { ar: t('lines.parenthesesBefore') },
            { fr: t(`lines.termArticle.${v.parentheses}`) },
            { ar: t('lines.parenthesesAfter') },
          ])}
          style={styles.warn}
          testID={`${testID}-parentheses`}
        />
      )}
      {v.at && (
        <>
          <Readout
            label={t('lines.tryValue')}
            value={`x = ${readoutNumber(v.at.x, { fractions: false })}`}
          />
          <Readout
            label={t('lines.yours')}
            value={readoutPair(v.at.student, v.at.expected)[0]}
            testID={`${testID}-yours`}
          />
          <Readout
            label={t('lines.shouldGive')}
            value={readoutPair(v.at.student, v.at.expected)[1]}
            testID={`${testID}-expected`}
          />
        </>
      )}
      <RichText
        runs={spaceRunBoundaries(
          part
            ? [
                { ar: t('lines.fixBefore') },
                { fr: t(`lines.termArticle.${part}`) },
                { ar: t('lines.fixAfter') },
              ]
            : [{ ar: t('lines.fixWhole') }],
        )}
        style={styles.action}
        testID={`${testID}-action`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.space.sm },
  goal: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfacePaper,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderPaper,
    padding: theme.space.sm,
  },
  label: {
    fontSize: theme.font.size.callout,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  lineContent: { direction: 'ltr', alignItems: 'center' },
  feedback: {
    gap: theme.space.xxs,
    borderRadius: theme.radius.md,
    padding: theme.space.sm,
    backgroundColor: theme.feedback.warning.surface,
  },
  warn: {
    color: theme.feedback.warning.text,
    fontSize: theme.font.size.callout,
  },
  action: {
    color: theme.color.textPrimary,
    fontSize: theme.font.size.callout,
    fontWeight: theme.font.weight.semibold,
  },
  row: { flexDirection: 'row', gap: KEY_GAP, direction: 'ltr' },
  // Inside the empty field, at its start (right): the field's placeholder.
  copy: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: theme.space.xs,
    justifyContent: 'center',
  },
  copyText: {
    minHeight: theme.size.touch,
    textAlignVertical: 'center',
    lineHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    fontSize: theme.font.size.small,
    color: theme.color.actionPrimary,
    backgroundColor: theme.editor.color.activeSlotBackground,
    writingDirection: 'rtl',
  },
  // Above the field's end: no layout shift, the line and cursor stay visible.
  undoChip: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.space.xs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    marginBottom: theme.space.xxs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceCard,
    borderWidth: theme.border.thin,
    borderColor: theme.color.actionPrimary,
  },
  undoChipText: {
    fontSize: theme.font.size.small,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  undoChipAction: {
    color: theme.color.actionPrimary,
    fontWeight: theme.font.weight.semibold,
  },
  fold: {
    flex: 1,
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foldText: { fontSize: theme.font.size.title, color: theme.color.textPrimary },
  check: {
    flex: 1,
    paddingHorizontal: theme.space.xs,
    minHeight: theme.size.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: theme.opacity.disabled },
  checkText: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.semibold,
  },
});
