import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { chooseLine, chooseSymmetryLine } from '../../engine/calcLines';
import { choose, pascalRow } from '../../engine/combinatorics';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { hintAllows, hintLevelOf } from '../reveals';
import { makeExplored } from './finding';
import type { SlotsPatternProps } from './schemas';
import {
  addPattern,
  allPatterns,
  countsOnly,
  guidedLocks,
  helpPlan,
  isComplete,
  markedCount,
  marksOf,
  pascalCells,
  patternOf,
  slotsFinding,
  type HelpPlan,
} from './slots';

const HelpSchema = z.union([
  z.object({ level: z.literal(1) }),
  z.object({ level: z.literal(2), slot: z.number().int().nullable() }),
  z.object({ level: z.literal(3), pattern: z.string().max(7) }),
]);
const SnapshotSchema = z.object({
  marks: z.array(z.boolean()).max(7),
  lists: z.record(z.string(), z.array(z.string().max(7))),
  k: z.number().int().min(0).max(7),
  fixed: z.number().int().min(0).max(6).nullable(),
  level: z.number().int().min(0).max(3),
  help: HelpSchema.nullable(),
  message: z.enum(['none', 'missing', 'duplicate']),
  dup: z.number().int().nullable(),
  flipped: z.boolean(),
  confirmed: z.array(z.number().int()),
  revealed: z.boolean(),
  explored: z.enum(['done', 'skipped']).nullable(),
});
type Snapshot = z.infer<typeof SnapshotSchema>;

/** A pattern is n symbols of S and F; a snapshot that says otherwise is ignored. */
const validPattern = (s: string, n: number): boolean => new RegExp(`^[SF]{${n}}$`).test(s);

const swapped = (pattern: string): string =>
  [...pattern].map(c => (c === 'S' ? 'F' : 'S')).join('');

/**
 * The patterns of S and F over n slots with exactly k S. The student marks
 * slots and adds the pattern to a list; a duplicate is refused at once with a
 * mark on the earlier row; "that is all" on an incomplete list says at least
 * one is missing and nothing more. The help ladder never says how many are
 * missing: 1 "at least one is missing", 2 "a missing one has its first S in
 * slot j", 3 fills the slots with it (needs the hint level, else the escape).
 * The count is written by the engine only after the student's own complete
 * list or the escape. Opens its gate (`explored`) when the list is confirmed
 * complete; "I do not know, show me" lists everything and logs `how: skipped`.
 */
export function SlotsPattern(p: ViewProps<SlotsPatternProps>) {
  const { t } = useTranslation();
  const { n, mode, listCap } = p.props;
  const live = p.mode === 'interactive';
  const emit = useEmit('SlotsPattern', p);
  const hintLevel = hintLevelOf(p.lessonState);
  const level3 = hintAllows({ minHint: 2 }, hintLevel, false) || p.showSolution === true;

  const initial = useMemo<Snapshot>(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    if (
      s.success &&
      s.data.marks.length === n &&
      Object.entries(s.data.lists).every(
        ([k, l]) =>
          Number(k) <= n &&
          l.every(x => validPattern(x, n) && markedCount(marksOf(x)) === Number(k)),
      )
    ) {
      return s.data;
    }
    return {
      marks: Array.from({ length: n }, () => false),
      lists: {},
      k: p.props.k,
      fixed: null,
      level: 0,
      help: null,
      message: 'none',
      dup: null,
      flipped: false,
      confirmed: [],
      revealed: false,
      explored: null,
    };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [marks, setMarks] = useState(initial.marks);
  const [lists, setLists] = useState<Record<string, string[]>>(initial.lists);
  const [k, setK] = useState(initial.k);
  const [fixed, setFixed] = useState(initial.fixed);
  const [level, setLevel] = useState(initial.level);
  const [help, setHelp] = useState<HelpPlan | null>(initial.help);
  const [message, setMessage] = useState(initial.message);
  const [dup, setDup] = useState(initial.dup);
  const [flipped, setFlipped] = useState(initial.flipped);
  const [confirmed, setConfirmed] = useState(initial.confirmed);
  const [revealed, setRevealed] = useState(initial.revealed);
  const [explored, setExplored] = useState(initial.explored);
  const [width, setWidth] = useState(0);
  const exploredRef = useRef(initial.explored);
  const helped = useRef(initial.level > 0);
  const flippedEver = useRef(initial.flipped);
  const route = useRef<string[]>([]);

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({
        marks, lists, k, fixed, level, help, message, dup, flipped, confirmed, revealed, explored,
      }),
    }),
    [marks, lists, k, fixed, level, help, message, dup, flipped, confirmed, revealed, explored],
  );

  const list = lists[String(k)] ?? [];
  const total = choose(n, k);
  const onlyCount = countsOnly(n, k, listCap);
  const complete = isComplete(n, k, list);
  const shownList = revealed ? allPatterns(n, k) : list;
  const showCount = confirmed.includes(k) || revealed;
  const pascal = mode === 'build_pascal';

  const clearNotes = () => {
    setMessage('none');
    setDup(null);
  };
  const freshMarks = (at: number | null) =>
    mode === 'guided' && at !== null
      ? guidedLocks(n, k, at).marks
      : Array.from({ length: n }, () => false);

  const markExplored = useCallback(
    (why: string, how: 'done' | 'skipped') => {
      if (exploredRef.current !== null) {
        return false;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      return true;
    },
    [emit],
  );
  const finding = (how: 'found' | 'helped' | 'skipped', row: number[] | null) =>
    emit(
      'finding',
      slotsFinding(
        { n, k, mode },
        { count: total, flipped: flippedEver.current, row },
        route.current,
        how,
      ),
    );

  // --- actions -----------------------------------------------------------

  const locked = (i: number) =>
    mode === 'guided' && (fixed === null || i <= fixed);
  const canPress = (i: number) =>
    live && !locked(i) && !flipped && !revealed;

  const pressSlot = (i: number) => {
    if (!canPress(i)) {
      return;
    }
    const next = marks.map((m, j) => (j === i ? !m : m));
    setMarks(next);
    clearNotes();
    emit('slot_toggled', { index: i, marked: next[i]! });
  };

  const add = () => {
    const r = addPattern(n, k, list, marks);
    if (r.status === 'wrong_count') {
      return;
    }
    const pattern = patternOf(marks);
    if (r.status === 'duplicate') {
      setMessage('duplicate');
      setDup(r.of);
      route.current.push('duplicate');
      emit('pattern_added', { pattern, k, duplicate: true });
      emit('duplicate', { pattern });
      return;
    }
    setLists({ ...lists, [String(k)]: r.list });
    setMarks(freshMarks(fixed));
    clearNotes();
    setHelp(null);
    route.current.push('added');
    emit('pattern_added', { pattern, k, duplicate: false });
  };

  const done = () => {
    if (!live || list.length === 0 || revealed) {
      return;
    }
    if (!complete) {
      setMessage('missing');
      route.current.push('check');
      emit('missing_hint_requested', { level: 0, missing: true });
      return;
    }
    const next = confirmed.includes(k) ? confirmed : [...confirmed, k];
    setConfirmed(next);
    setMessage('none');
    setHelp(null);
    route.current.push('confirmed');
    emit('count_confirmed', { n, k, value: String(list.length), correct: true });
    const how = helped.current ? 'helped' : 'found';
    if (!pascal) {
      markExplored('list_complete', 'done');
      finding(how, null);
      return;
    }
    markExplored('list_complete', 'done');
    if (next.length === n + 1) {
      finding(how, pascalRow(n));
    }
  };

  const askHelp = () => {
    if (!live || complete || revealed || level >= (level3 ? 3 : 2)) {
      return;
    }
    const next = (level + 1) as 1 | 2 | 3;
    const plan = helpPlan(n, k, list, next);
    if (!plan) {
      return;
    }
    helped.current = true;
    setLevel(next);
    setHelp(plan);
    clearNotes();
    route.current.push(`missing_hint:${next}`);
    emit('missing_hint_requested', { level: next, missing: true });
    if (plan.level === 3) {
      setMarks(marksOf(plan.pattern));
      if (mode === 'guided') {
        setFixed(plan.pattern.indexOf('S'));
      }
    }
  };

  const flip = () => {
    if (!live || mode !== 'bridge') {
      return;
    }
    const next = !flipped;
    setFlipped(next);
    flippedEver.current = flippedEver.current || next;
    route.current.push('flipped');
    emit('flipped', { flipped: next });
  };

  const pickK = (kk: number) => {
    if (!live || kk === k || revealed) {
      return;
    }
    setK(kk);
    setMarks(Array.from({ length: n }, () => false));
    setLevel(0);
    setHelp(null);
    clearNotes();
    route.current.push(`k:${kk}`);
    emit('k_selected', { k: kk });
  };

  const pickFirst = (j: number) => {
    if (!live || revealed) {
      return;
    }
    setFixed(j);
    setMarks(guidedLocks(n, k, j).marks);
    clearNotes();
    route.current.push(`first:${j}`);
    emit('first_slot_selected', { index: j });
  };

  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    setRevealed(true);
    setConfirmed(pascal ? Array.from({ length: n + 1 }, (_, i) => i) : [k]);
    clearNotes();
    setHelp(null);
    route.current.push('reveal');
    markExplored('reveal', 'skipped');
    finding('skipped', pascal ? pascalRow(n) : null);
  };

  // --- drawing -----------------------------------------------------------

  // Flipped, the row reads the pattern in progress the other way. With no
  // complete pattern marked there is nothing to read: every slot shows empty
  // (an all-S row would say "leave every ball", which is not a choice).
  const flippable = markedCount(marks) === k;
  const shown = (i: number) =>
    flipped ? flippable && !marks[i] : marks[i] === true;
  const perRow = width > 0 && width < n * theme.size.touch ? Math.ceil(n / 2) : n;
  const columns = Array.from({ length: n }, (_, i) => i);
  const chunks = Array.from({ length: Math.ceil(n / perRow) }, (_, r) =>
    columns.slice(r * perRow, (r + 1) * perRow),
  );
  const shape = (on: boolean, letter: string, small: boolean) => (
    <View
      style={[
        small ? styles.cellSmall : styles.cell,
        on ? styles.cellOn : styles.cellOff,
      ]}
    >
      <Text style={[small ? styles.letterSmall : styles.letter, on ? styles.letterOn : styles.letterOff]}>
        {letter}
      </Text>
    </View>
  );

  const renderColumn = (i: number) => {
    const on = shown(i);
    const enabled = canPress(i);
    return (
      <View key={i} style={styles.column}>
        {mode === 'bridge' && p.props.bridge && (
          <View
            testID={`slots-ball-${i}`}
            style={[styles.ball, on ? styles.ballOn : styles.ballOff]}
          >
            <Text style={styles.ballLabel}>{p.props.bridge.balls[i]!.label}</Text>
          </View>
        )}
        <Pressable
          disabled={!enabled}
          onPress={() => pressSlot(i)}
          accessibilityRole="button"
          accessibilityLabel={t(on ? 'pv2.slots.slotMarked' : 'pv2.slots.slotEmpty', { n: i + 1 })}
          accessibilityState={{ selected: on, disabled: !enabled }}
          testID={`slots-slot-${i}`}
          style={[styles.slot, !enabled && live && locked(i) && styles.slotLocked]}
        >
          {shape(on, on ? 'S' : 'F', false)}
        </Pressable>
      </View>
    );
  };

  const cells = pascal ? pascalCells(n, Object.fromEntries(
    Object.entries(lists).filter(([kk]) => confirmed.includes(Number(kk))),
  )) : [];

  return (
    <Panel testID={`slots-pattern-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}

      {explored === null && live && <Text style={ui.readoutLabel}>{t('pv2.slots.mark')}</Text>}

      {pascal && (
        <View style={styles.block}>
          <Text style={ui.readoutLabel}>{t('pv2.slots.pickK')}</Text>
          <View style={styles.chips}>
            {Array.from({ length: n + 1 }, (_, kk) => (
              <Pressable
                key={kk}
                disabled={!live}
                onPress={() => pickK(kk)}
                accessibilityRole="button"
                accessibilityLabel={t('pv2.slots.kChip', { k: kk })}
                accessibilityState={{ selected: k === kk, disabled: !live }}
                testID={`slots-k-${kk}`}
                style={[styles.chip, k === kk && styles.chipOn]}
              >
                <Text style={styles.chipText}>{kk}</Text>
                {confirmed.includes(kk) && (
                  <Text style={styles.chipText}>{theme.feedback.success.icon}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {mode === 'guided' && (
        <View style={styles.block}>
          <Text style={ui.readoutLabel}>{t('pv2.slots.firstSlot')}</Text>
          <View style={styles.chips}>
            {Array.from({ length: n - k + 1 }, (_, j) => (
              <Pressable
                key={j}
                disabled={!live || revealed}
                onPress={() => pickFirst(j)}
                accessibilityRole="button"
                accessibilityLabel={t('pv2.slots.firstChip', { n: j + 1 })}
                accessibilityState={{ selected: fixed === j, disabled: !live || revealed }}
                testID={`slots-first-${j}`}
                style={[styles.chip, fixed === j && styles.chipOn]}
              >
                <Text style={styles.chipText}>{j + 1}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {mode === 'bridge' && (
        <Text style={ui.readoutLabel}>
          {t(flipped ? 'pv2.slots.flipped' : 'pv2.slots.bridgeCaption')}
        </Text>
      )}

      <View
        style={styles.block}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {chunks.map((row, r) => (
          <View key={r} style={styles.slotsRow}>
            {row.map(renderColumn)}
          </View>
        ))}
      </View>

      {!revealed && (
        <View style={styles.pair}>
          <Text style={ui.readoutLabel}>{t('pv2.slots.markCount')}</Text>
          <Text style={styles.number} testID="slots-mark-count">
            {k}
          </Text>
        </View>
      )}

      {live && (
        <View style={styles.actions}>
          <ActionButton
            label={t('pv2.slots.add')}
            primary
            onPress={add}
            disabled={
              revealed ||
              flipped ||
              markedCount(marks) !== k ||
              (mode === 'guided' && fixed === null)
            }
            testID="slots-add"
          />
          <ActionButton
            label={t('pv2.slots.done')}
            onPress={done}
            disabled={list.length === 0 || revealed}
            testID="slots-done"
          />
          {!complete && !revealed && level < (level3 ? 3 : 2) && (
            <ActionButton label={t('pv2.slots.help')} onPress={askHelp} testID="slots-help" />
          )}
          {mode === 'bridge' && (
            <ActionButton label={t('pv2.slots.flip')} onPress={flip} testID="slots-flip" />
          )}
        </View>
      )}

      {message !== 'none' && (
        <Text style={[ui.readoutLabel, styles.note]} testID="slots-message">
          {t(message === 'missing' ? 'pv2.slots.missing' : 'pv2.slots.duplicate')}
        </Text>
      )}

      {help !== null && (
        <View style={styles.pair}>
          <Text style={ui.readoutLabel} testID="slots-help-text">
            {t(
              help.level === 1
                ? 'pv2.slots.helpOne'
                : help.level === 2
                ? help.slot === null
                  ? 'pv2.slots.helpTwoNone'
                  : 'pv2.slots.helpTwo'
                : 'pv2.slots.helpThree',
            )}
          </Text>
          {help.level === 2 && help.slot !== null && (
            <Text style={styles.number} testID="slots-help-slot">
              {help.slot}
            </Text>
          )}
        </View>
      )}

      {onlyCount ? (
        <View style={styles.pair}>
          <Text style={ui.readoutLabel}>{t('pv2.slots.countsOnly')}</Text>
          {!revealed && (
            <>
              <Text style={ui.readoutLabel}>{t('pv2.slots.soFar')}</Text>
              <Text style={styles.number} testID="slots-sofar">
                {list.length}
              </Text>
            </>
          )}
        </View>
      ) : (
        shownList.length > 0 && (
          <View style={styles.block}>
            <Text style={ui.readoutLabel}>{t('pv2.slots.listCaption')}</Text>
            <View style={styles.rows}>
            {shownList.map((pattern, i) => {
              const text = flipped ? swapped(pattern) : pattern;
              return (
                <View
                  key={pattern}
                  accessible
                  accessibilityLabel={`${t('pv2.slots.row', { n: i + 1 })}: ${text}`}
                  testID={`slots-row-${i}`}
                  style={[styles.row, dup === i && styles.rowDup]}
                >
                  {[...text].map((c, j) => (
                    <React.Fragment key={j}>{shape(c === 'S', c, true)}</React.Fragment>
                  ))}
                  {dup === i && (
                    <Text style={styles.dupMark} testID={`slots-dup-${i}`}>
                      {theme.feedback.warning.icon}
                    </Text>
                  )}
                </View>
              );
            })}
            </View>
          </View>
        )
      )}

      {pascal && cells.length > 0 && (
        <View style={styles.block}>
          <Text style={ui.readoutLabel}>{t('pv2.slots.pascalRow')}</Text>
          <View style={styles.chips}>
            {cells.map(c => (
              <View key={c.k} style={styles.cellCount} testID={`slots-pascal-${c.k}`}>
                <Text style={styles.chipText}>{c.count === null ? '?' : c.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {showCount && (
        <View style={styles.pair} testID="slots-count">
          <Text style={ui.readoutLabel}>{t('pv2.slots.total')}</Text>
          <MathBlock latex={chooseLine(n, k)} fontSize={theme.font.size.bodyLarge} />
        </View>
      )}

      {showCount && flipped && mode === 'bridge' && (
        <View style={styles.pair} testID="slots-symmetry">
          <Text style={ui.readoutLabel}>{t('pv2.slots.symmetry')}</Text>
          <MathBlock latex={chooseSymmetryLine(n, k)} fontSize={theme.font.size.bodyLarge} />
        </View>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="slots-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  block: { gap: theme.space.xs },
  pair: { gap: theme.space.xxs },
  actions: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  slotsRow: { flexDirection: theme.mathSide.row },
  column: { alignItems: 'center', gap: theme.space.xxxs },
  // The hit area: 44 pt both ways whatever the shape drawn inside it.
  slot: {
    width: theme.size.touch,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLocked: { opacity: theme.opacity.disabled },
  // S: a filled circle on the highlighter with an ink edge. F: a hollow square. The letter says it too.
  cell: {
    width: theme.pv2.slotShape,
    height: theme.pv2.slotShape,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSmall: {
    width: theme.pv2.orderingDot,
    height: theme.pv2.orderingDot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: {
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  cellOff: {
    borderRadius: theme.radius.xs,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  letter: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.callout,
    writingDirection: 'ltr',
  },
  letterSmall: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.micro,
    writingDirection: 'ltr',
  },
  letterOn: { color: theme.color.ink, fontWeight: theme.font.weight.bold },
  letterOff: { color: theme.color.inkMuted },
  ball: {
    width: theme.pv2.bridgeBall,
    height: theme.pv2.bridgeBall,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  ballOn: {
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.highlighter,
  },
  ballOff: {
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  ballLabel: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.caption,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  number: {
    fontFamily: theme.font.family.math.family,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.bodyLarge,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  note: { fontFamily: theme.font.family.ui.bold },
  chips: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  chip: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xxs,
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  chipOn: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  chipText: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
  },
  // A count, not a control: flat on the muted fill, no edge, square corners.
  cellCount: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xs,
    backgroundColor: theme.color.surfaceMuted,
  },
  rows: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  row: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xxxs,
    padding: theme.space.xxs,
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  // The earlier row of a duplicate: an ink edge on the highlighter and a mark.
  rowDup: {
    borderWidth: theme.border.selected,
    borderColor: theme.color.ink,
    backgroundColor: theme.color.surfaceSelected,
  },
  dupMark: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.callout,
    color: theme.color.textPrimary,
  },
});
