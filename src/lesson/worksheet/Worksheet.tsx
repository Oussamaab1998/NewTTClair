/**
 * The worksheet: he writes a calculation line by line, like on paper
 * (`10 × 9 × 8 = 720`, then `720 ÷ (3 × 2 × 1) = 120`), each line under the
 * label of the plan step it belongs to. Lines are drawn stacked (÷ is a
 * fraction, so a divisor is always grouped); a tap on an earlier line
 * reopens it to fix it. Number tiles insert the statement's numbers and the
 * values he earned. A scaffold, built only from his own earlier line, can
 * show that line, or give the same shape with blanks to fill.
 *
 * The caller keeps the page (model.ts) and judges each line with the engine:
 * this component only edits and sends lines. Typing redraws the line being
 * written, not the page (memoized lines, keys and tiles). While the caller
 * waits for an answer, every control is off and dimmed (`disabled`), and
 * «نثبّت» shows a spinner when his line is the act being answered (`busy`).
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Rich } from '../../content/schema';
import { RichView } from '../feed/RichView';
import { isEmpty, type Key, type Node } from '../lines/editor';
import {
  EditorLine,
  KEY_LABEL,
  KeyButton,
  MathLine,
  type KeyId,
} from '../lines/MathEditor';
import { theme } from '../../theme';
import {
  finish,
  newDraft,
  press,
  reopen,
  stepRuns,
  type Draft,
  type LineMark,
  type SheetLine,
  type SheetStep,
} from './model';
import type { Scaffold } from './scaffold';
import type { Tile } from './tiles';

export interface SubmitInfo {
  /** The line as written (blanks of a scaffold included), for the page. */
  nodes: Node[];
  /** The earlier line he rewrote (its id), or null for a new line. */
  fixes: string | null;
  /** Keys pressed for this line (event log). */
  keys: string[];
}

export interface WorksheetProps {
  /** The plan step his next line belongs to (its label heads that part of the page). */
  step: SheetStep;
  /** What to write now, or null. */
  prompt: Rich | null;
  /** The page so far, oldest first (kept by the caller with model.ts). */
  lines: readonly SheetLine[];
  /** Number tiles (tiles.ts); keep the array stable between renders. */
  tiles: readonly Tile[];
  /** Support from his own earlier line (scaffold.ts), or null; keep it stable (useMemo). */
  scaffold: Scaffold | null;
  /**
   * A finished, readable line in the engine's syntax: "10*9*8=720",
   * "720/(3*2*1)=120", "C(10,3)=120". Never ambiguous: a divisor of more
   * than one number is always in parentheses (no readback needed).
   */
  onSubmit: (raw: string, info: SubmitInfo) => void;
  /** Keys for counting formulas: n, k, ! and C(n, k). */
  counting?: boolean;
  /** Replay or a finished question: the page only. */
  readonly?: boolean;
  /**
   * An answer is on its way: the keys, tiles and «نثبّت» are off and dimmed
   * (the page and the line being written stay as they are).
   */
  disabled?: boolean;
  /** His line is the act being answered: «نثبّت» shows a spinner. */
  busy?: boolean;
  testID?: string;
}

type PadKey = KeyId | 'back' | 'left' | 'right';

/** Calculator rows, left to right whatever the UI language. */
const ROWS: readonly (readonly PadKey[])[] = [
  ['7', '8', '9', 'group', 'close', 'back'],
  ['4', '5', '6', '*', 'div', 'left'],
  ['1', '2', '3', '+', '-', 'right'],
  ['0', ',', '='],
];
const COUNTING_ROW: readonly PadKey[] = ['n', 'k', '!', 'choose'];
const TOOLS: readonly PadKey[] = ['back', 'left', 'right'];

/** Spoken names of the keys that are not digits (i18n worksheet.key.*). */
const A11Y = {
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  div: 'div',
  '=': 'equals',
  ',': 'comma',
  group: 'open',
  close: 'close',
  back: 'back',
  left: 'left',
  right: 'right',
  n: 'n',
  k: 'k',
  '!': 'factorial',
  choose: 'choose',
} as const;
const a11yName = (k: PadKey) =>
  k in A11Y ? A11Y[k as keyof typeof A11Y] : null;

const CHECK_MARK = '✓';
/** The engine's mark beside a line: a shape first, colour second. */
const MARKS: Record<LineMark, { icon: string; color: string }> = {
  pending: { icon: '…', color: theme.color.inkMuted },
  right: {
    icon: theme.feedback.success.icon,
    color: theme.feedback.success.text,
  },
  wrong: {
    icon: theme.feedback.danger.icon,
    color: theme.feedback.danger.text,
  },
  neutral: { icon: '○', color: theme.color.inkMuted },
};

export function Worksheet({
  step,
  prompt,
  lines,
  tiles,
  scaffold,
  onSubmit,
  counting = false,
  readonly = false,
  disabled = false,
  busy = false,
  testID = 'worksheet',
}: WorksheetProps) {
  const { t } = useTranslation();
  const template = scaffold?.level === 3 ? scaffold.template : null;
  const [draft, setDraft] = useState<Draft>(() => newDraft(template));
  const [dropped, setDropped] = useState(false);
  const [ownShown, setOwnShown] = useState(false);
  // Another scaffold (one more «ما نعرفش») replaces a line he has not started.
  useEffect(() => {
    setDropped(false);
    setOwnShown(false);
    setDraft(d => (d.touched || d.fixing !== null ? d : newDraft(template)));
  }, [scaffold, template]);

  const onKey = useCallback((k: Key) => setDraft(d => press(d, k)), []);
  const onOpen = useCallback((line: SheetLine) => setDraft(reopen(line)), []);
  const fresh = () => newDraft(dropped ? null : template);
  const submit = () => {
    const r = finish(draft);
    if (!r.ok) {
      setDraft(r.draft);
      return;
    }
    onSubmit(r.raw, { nodes: r.nodes, fixes: r.fixes, keys: r.keys });
    setDraft(fresh());
  };

  const runs = stepRuns(lines);
  const numberOf = new Map(lines.map((l, i) => [l.id, i + 1]));
  const lastStep = runs[runs.length - 1]?.step.id;
  const empty = isEmpty(draft.editor);
  const canSubmit = !empty && !disabled;
  const issue =
    draft.issue &&
    `${theme.feedback.warning.icon} ${t(
      `worksheet.issue.${draft.issue.kind}`,
    )}`;
  const submitLabel = `${CHECK_MARK} ${t('worksheet.submit')}`;
  return (
    <View style={styles.root} testID={testID}>
      {prompt && (
        <RichView
          rich={prompt}
          fontFamily={theme.font.family.ui.bold}
          testID={`${testID}-prompt`}
        />
      )}
      <View accessibilityLabel={t('worksheet.page')} style={styles.page}>
        {runs.map((run, r) => (
          <View key={`${r}-${run.step.id}`} style={styles.run}>
            <StepLabel step={run.step} testID={`${testID}-step-${r}`} />
            {run.lines.map(line => (
              <PageLine
                key={line.id}
                line={line}
                n={numberOf.get(line.id) ?? 0}
                fixing={draft.fixing === line.id}
                onOpen={readonly || disabled ? null : onOpen}
                testID={testID}
              />
            ))}
          </View>
        ))}
      </View>
      {!readonly && (
        <View style={styles.writing}>
          {lastStep !== step.id && (
            <StepLabel step={step} testID={`${testID}-step-now`} />
          )}
          {draft.fixing !== null && (
            <View style={styles.banner} testID={`${testID}-fixing`}>
              <Text style={styles.arabic}>{t('worksheet.fixing')}</Text>
              <Pressable
                onPress={() => setDraft(fresh())}
                disabled={disabled}
                style={[styles.textButton, disabled && styles.off]}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                testID={`${testID}-fix-cancel`}
              >
                <Text style={styles.textButtonLabel}>
                  {t('worksheet.cancelFix')}
                </Text>
              </Pressable>
            </View>
          )}
          {scaffold && !dropped && draft.fixing === null && (
            <ScaffoldView
              scaffold={scaffold}
              shown={ownShown}
              disabled={disabled}
              onToggle={() => setOwnShown(s => !s)}
              onDrop={() => {
                setDropped(true);
                setDraft(newDraft(null));
              }}
              testID={testID}
            />
          )}
          <View accessibilityLabel={t('worksheet.line')}>
            <EditorLine
              state={draft.editor}
              onKey={onKey}
              {...(draft.issue && { mark: draft.issue })}
              testID={`${testID}-draft`}
            />
          </View>
          {issue && (
            <Text
              style={[styles.arabic, styles.issue]}
              testID={`${testID}-issue`}
            >
              {issue}
            </Text>
          )}
          <Tiles
            tiles={tiles}
            onKey={onKey}
            disabled={disabled}
            testID={testID}
          />
          <Pad
            counting={counting}
            onKey={onKey}
            disabled={disabled}
            testID={testID}
          />
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[styles.submit, !canSubmit && styles.submitDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy }}
            testID={`${testID}-submit`}
          >
            <View style={styles.submitRow}>
              {busy && (
                <ActivityIndicator
                  size="small"
                  color={theme.color.textOnAccent}
                  testID={`${testID}-submit-busy`}
                />
              )}
              <Text style={styles.submitLabel}>{submitLabel}</Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const StepLabel = memo(function StepLabelImpl({
  step,
  testID,
}: {
  step: SheetStep;
  testID: string;
}) {
  return (
    <RichView
      rich={step.label}
      fontSize={theme.font.size.small}
      color={theme.color.textSecondary}
      fontFamily={theme.font.family.ui.bold}
      testID={testID}
    />
  );
});

/** One line of the page: its number, the line as written, the engine's mark. */
const PageLine = memo(function PageLineImpl({
  line,
  n,
  fixing,
  onOpen,
  testID,
}: {
  line: SheetLine;
  n: number;
  fixing: boolean;
  onOpen: ((line: SheetLine) => void) | null;
  testID: string;
}) {
  const { t } = useTranslation();
  const mark = MARKS[line.mark];
  return (
    <Pressable
      disabled={!onOpen}
      {...(onOpen && {
        onPress: () => onOpen(line),
        accessibilityRole: 'button' as const,
        accessibilityHint: t('worksheet.fixHint'),
      })}
      style={[styles.pageLine, fixing && styles.fixingLine]}
      testID={`${testID}-line-${line.id}`}
    >
      <View style={styles.lineRow}>
        <Text style={styles.lineNumber}>{n}</Text>
        <View style={styles.lineMath}>
          <MathLine nodes={line.nodes} testID={`${testID}-math-${line.id}`} />
        </View>
        <Text
          style={[styles.mark, { color: mark.color }]}
          accessibilityLabel={t(`worksheet.mark.${line.mark}`)}
          testID={`${testID}-mark-${line.id}`}
        >
          {mark.icon}
        </Text>
      </View>
      {line.history.length > 0 && (
        <Text style={[styles.arabic, styles.fixed]}>
          {t('worksheet.fixed')}
        </Text>
      )}
    </Pressable>
  );
});

function ScaffoldView({
  scaffold,
  shown,
  disabled,
  onToggle,
  onDrop,
  testID,
}: {
  scaffold: Scaffold;
  shown: boolean;
  disabled: boolean;
  onToggle: () => void;
  onDrop: () => void;
  testID: string;
}) {
  const { t } = useTranslation();
  if (scaffold.level === 1) {
    return (
      <View style={styles.scaffold}>
        <Pressable
          onPress={onToggle}
          disabled={disabled}
          style={[styles.chip, disabled && styles.off]}
          accessibilityRole="button"
          accessibilityState={{ expanded: shown, disabled }}
          testID={`${testID}-scaffold-chip`}
        >
          <Text style={styles.chipLabel}>{t('worksheet.scaffold.chip')}</Text>
        </Pressable>
        {shown && (
          <MathLine
            nodes={scaffold.from.nodes}
            testID={`${testID}-scaffold-yours`}
          />
        )}
      </View>
    );
  }
  if (scaffold.level === 2) {
    return (
      <View style={styles.scaffold}>
        <Text style={styles.arabic}>{t('worksheet.scaffold.yours')}</Text>
        <MathLine
          nodes={scaffold.from.nodes}
          testID={`${testID}-scaffold-yours`}
        />
      </View>
    );
  }
  return (
    <View style={styles.scaffold}>
      <Text style={styles.arabic} testID={`${testID}-scaffold-same`}>
        {t('worksheet.scaffold.same')}
      </Text>
      <Pressable
        onPress={onDrop}
        disabled={disabled}
        style={[styles.textButton, disabled && styles.off]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={`${testID}-scaffold-drop`}
      >
        <Text style={styles.textButtonLabel}>
          {t('worksheet.scaffold.drop')}
        </Text>
      </Pressable>
    </View>
  );
}

const Tiles = memo(function TilesImpl({
  tiles,
  onKey,
  disabled,
  testID,
}: {
  tiles: readonly Tile[];
  onKey: (k: Key) => void;
  disabled: boolean;
  testID: string;
}) {
  const { t } = useTranslation();
  if (tiles.length === 0) {
    return null;
  }
  return (
    <View style={styles.tiles} accessibilityLabel={t('worksheet.tiles')}>
      {tiles.map((tile, i) => (
        <Pressable
          key={tile.text}
          onPress={() => onKey({ insert: tile.nodes })}
          disabled={disabled}
          style={({ pressed }) => [
            styles.tile,
            pressed && styles.pressed,
            disabled && styles.off,
          ]}
          accessibilityRole="button"
          accessibilityLabel={tile.text}
          accessibilityHint={t('worksheet.tile')}
          accessibilityState={{ disabled }}
          testID={`${testID}-tile-${i}`}
        >
          <Text style={styles.tileText}>{tile.text}</Text>
        </Pressable>
      ))}
    </View>
  );
});

const Pad = memo(function PadImpl({
  counting,
  onKey,
  disabled,
  testID,
}: {
  counting: boolean;
  onKey: (k: Key) => void;
  disabled: boolean;
  testID: string;
}) {
  const { t } = useTranslation();
  const rows = counting ? [...ROWS, COUNTING_ROW] : ROWS;
  return (
    <View style={styles.pad}>
      {rows.map((row, r) => (
        <View key={r} style={styles.padRow}>
          {row.map(k => {
            const name = a11yName(k);
            return (
              <KeyButton<PadKey>
                key={k}
                k={k}
                onKey={onKey}
                label={KEY_LABEL[k] ?? k}
                a11y={name ? t(`worksheet.key.${name}`) : k}
                tool={TOOLS.includes(k)}
                emphasis={k === 'div' || k === 'choose'}
                disabled={disabled}
                testID={`${testID}-key-${k}`}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: theme.space.sm },
  page: { gap: theme.space.sm },
  run: { gap: theme.space.xxs },
  writing: { gap: theme.space.sm },
  pageLine: {
    borderRadius: theme.radius.button,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xxs,
    minHeight: theme.size.touch,
    justifyContent: 'center',
  },
  // The line being fixed: pen border (and the banner says so in words).
  fixingLine: {
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
  },
  lineRow: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xs,
    direction: 'ltr',
  },
  lineNumber: {
    width: theme.editor.markColumn,
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.small,
    color: theme.color.textSecondary,
    writingDirection: 'ltr',
  },
  lineMath: { flex: 1 },
  mark: {
    width: theme.editor.markColumn,
    fontSize: theme.editor.mark,
    textAlign: 'center',
  },
  fixed: { fontSize: theme.font.size.caption, color: theme.color.inkMuted },
  arabic: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.small,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  issue: {
    padding: theme.space.sm,
    borderRadius: theme.radius.button,
    backgroundColor: theme.feedback.warning.surface,
    color: theme.feedback.warning.text,
  },
  banner: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    padding: theme.space.sm,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.highlighterSoft,
  },
  textButton: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.pen,
    textDecorationLine: 'underline',
  },
  scaffold: {
    gap: theme.space.xs,
    padding: theme.space.sm,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.thin,
    borderStyle: 'dashed',
    borderColor: theme.color.pen,
    backgroundColor: theme.color.surfaceMuted,
  },
  chip: {
    alignSelf: theme.reading.startAlign,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.card,
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    color: theme.color.pen,
    writingDirection: 'rtl',
  },
  tiles: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.xs,
    direction: 'ltr',
  },
  tile: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: theme.color.highlighterSoft },
  tileText: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.title,
    color: theme.color.ink,
    writingDirection: 'ltr',
  },
  pad: { gap: theme.editor.keyGap, direction: 'ltr' },
  padRow: { flexDirection: theme.mathSide.row, gap: theme.editor.keyGap },
  submit: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { backgroundColor: theme.color.inkDisabled },
  submitRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  // Off while an answer is on its way: dimmed, and announced as disabled.
  off: { opacity: theme.opacity.disabled },
  submitLabel: {
    color: theme.color.textOnAccent,
    fontSize: theme.font.size.body,
    fontFamily: theme.font.family.ui.bold,
  },
});
