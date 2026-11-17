import React, {
  memo,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import type { ProbabilityTreeProps } from './schemas';
import {
  treeLayout,
  type LaidEdge,
  type LaidValue,
  type Pt,
  type TreeLayout,
} from './treeLayout';
import {
  describeTree,
  leafIds,
  pathKnown,
  pathLatex,
  pathOf,
  spokenLabel,
  treeFinding,
} from './treeModel';

const T = theme.tree;
const INK = theme.color.ink;
const UNKNOWN = '?';

const SnapshotSchema = z.object({
  selected: z.string().max(31).nullable(),
  tapped: z.array(z.string().max(31)).max(16),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/**
 * A probability tree as the exam prints it: the root at the left, two levels
 * of branches (A or not A, then F or not F), drawn left to right in every
 * locale. On a branch: its value as given, a value the student found (bold,
 * with a tick), a "?" in a box (the one asked for now has a thick edge), or
 * nothing. The branches of the current step are thicker and end with an
 * arrowhead. In counts mode the same tree counts people: a whole number at
 * the root and at the end of each branch, no probability. `compact` is the
 * step-card size (no frame). The picture computes nothing: every value is a
 * prop. Interactive: a tap on the end of a path marks it and writes its
 * visible values as a product, never the result; `explored` once every path
 * was looked at (it is not a gate: a read-only tree never holds the lesson).
 */
export function ProbabilityTree(p: ViewProps<ProbabilityTreeProps>) {
  const { t } = useTranslation();
  const { props } = p;
  const leaves = useMemo(() => leafIds(props), [props]);
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success &&
      [...s.data.tapped, ...(s.data.selected === null ? [] : [s.data.selected])].every(id =>
        leaves.includes(id),
      )
      ? s.data
      : {
          selected: null as string | null,
          tapped: [] as string[],
          explored: null as 'done' | 'skipped' | null,
        };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selected, setSelected] = useState(initial.selected);
  const [tapped, setTapped] = useState(initial.tapped);
  const [explored, setExplored] = useState(initial.explored);
  const tappedRef = useRef(initial.tapped);
  const exploredRef = useRef(initial.explored);
  const route = useRef<string[]>([]);
  const [width, setWidth] = useState<number>(T.defaultWidth);
  const emit = useEmit('ProbabilityTree', p);
  const live = p.mode === 'interactive';
  const counts = props.rootCount !== undefined;

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ selected, tapped, explored }) }),
    [selected, tapped, explored],
  );

  // Pure and memoised: a scroll or a parent render lays nothing out again.
  const layout = useMemo(
    () =>
      treeLayout(props, width, {
        ...(live && { minRow: theme.size.touch, leafSlot: theme.size.touch }),
        alsoMarked:
          selected === null ? [] : (pathOf(props, selected) ?? []).map(e => e.id),
      }),
    [props, width, live, selected],
  );
  const spoken = useMemo(() => describeTree(props, t), [props, t]);
  const expression = selected === null ? null : pathLatex(props, selected);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) {
      setWidth(w);
    }
  };

  const tap = (leaf: string) => {
    if (!live) {
      return;
    }
    setSelected(leaf);
    route.current.push(`leaf:${leaf}`);
    emit('path_selected', {
      leaf,
      path: (pathOf(props, leaf) ?? []).map(e => e.id),
      known: pathKnown(props, leaf),
    });
    if (!tappedRef.current.includes(leaf)) {
      tappedRef.current = [...tappedRef.current, leaf];
      setTapped(tappedRef.current);
    }
    if (
      exploredRef.current === null &&
      leaves.every(id => tappedRef.current.includes(id))
    ) {
      exploredRef.current = 'done';
      setExplored('done');
      emit('explored', makeExplored('all_leaves', 'done'));
      emit('finding', treeFinding(props, route.current));
    }
  };

  const body = (
    <>
      {live && <Text style={ui.readoutLabel}>{t('pv2.tree.hint')}</Text>}
      <View
        style={[styles.box, { height: layout.height }]}
        onLayout={onLayout}
        testID="tree-box"
      >
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={spoken}
          testID="tree-picture"
        >
          <TreeSvg layout={layout} />
        </View>
        {live &&
          layout.edges
            .filter(e => e.leaf)
            .map(e => (
              <Pressable
                key={e.id}
                onPress={() => tap(e.id)}
                accessibilityRole="button"
                accessibilityLabel={t('pv2.tree.leafButton', {
                  path: (pathOf(props, e.id) ?? [])
                    .map(x => spokenLabel(x.latex, t))
                    .join(', '),
                })}
                accessibilityState={{ selected: selected === e.id }}
                testID={`tree-leaf-${e.id}`}
                style={[
                  styles.leaf,
                  theme.mathSide.startEdge(e.row.x),
                  { top: e.row.y, width: e.row.w, height: e.row.h },
                ]}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.leafEdge,
                      selected === e.id && styles.leafOn,
                      pressed && styles.pressed,
                    ]}
                  />
                )}
              </Pressable>
            ))}
      </View>
      {!counts && (live || expression !== null) && (
        <View style={[styles.slot, live && styles.slotLive]} testID="tree-path-slot">
          {expression !== null && (
            <>
              <Text style={ui.readoutLabel}>{t('pv2.tree.pathCaption')}</Text>
              <MathBlock
                latex={expression}
                fontSize={theme.font.size.bodyLarge}
                testID="tree-path"
              />
            </>
          )}
        </View>
      )}
    </>
  );
  const testID = `probability-tree-${p.instanceId}`;
  return props.compact ? (
    <View style={styles.bare} testID={testID}>
      {body}
    </View>
  ) : (
    <Panel testID={testID}>{body}</Panel>
  );
}

const points = (pts: readonly Pt[]) => pts.map(q => `${q.x},${q.y}`).join(' ');

/** The drawing: redrawn only when the layout changes (new props, a new width, another path). */
const TreeSvg = memo(function TreeSvgImpl({ layout }: { layout: TreeLayout }) {
  const { root } = layout;
  return (
    <Svg width={layout.width} height={layout.height}>
      <Circle cx={root.x} cy={root.y} r={T.rootDot} fill={INK} />
      {root.count && (
        <SvgText
          testID="tree-root-count"
          x={root.count.x}
          y={root.count.y}
          fontSize={root.count.size}
          fontFamily={theme.font.family.math.family}
          fill={INK}
          textAnchor="end"
        >
          {root.count.text}
        </SvgText>
      )}
      {layout.edges.map(e => (
        <Edge key={e.id} edge={e} />
      ))}
    </Svg>
  );
});

function Edge({ edge: e }: { edge: LaidEdge }) {
  // The current step: the pen colour, and with it a thicker line and an arrowhead.
  const stroke = e.marked ? theme.color.pen : INK;
  return (
    <G testID={`tree-edge-${e.id}`}>
      {e.segments.map((s, i) => (
        <Line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={stroke}
          strokeWidth={e.marked ? T.markedWidth : T.branchWidth}
          strokeLinecap="round"
        />
      ))}
      {e.head && (
        <Polygon testID={`tree-mark-${e.id}`} points={points(e.head)} fill={stroke} />
      )}
      {e.value && <Value value={e.value} id={e.id} role="value" />}
      <SvgText
        testID={`tree-label-${e.id}`}
        x={e.label.x}
        y={e.label.y}
        fontSize={e.label.size}
        fontFamily={theme.font.family.math.family}
        {...(e.label.italic && { fontStyle: theme.font.style.italic })}
        fill={INK}
      >
        {e.label.text}
      </SvgText>
      {e.label.overline && (
        <Line
          testID={`tree-overline-${e.id}`}
          x1={e.label.overline.x1}
          y1={e.label.overline.y1}
          x2={e.label.overline.x2}
          y2={e.label.overline.y2}
          stroke={INK}
          strokeWidth={T.ruleWidth}
        />
      )}
      {e.count && <Value value={e.count} id={e.id} role="count" />}
    </G>
  );
}

/** A value on a branch, or a count at its end: digits, a stacked fraction, or a "?" in a box. */
function Value({
  value: v,
  id,
  role,
}: {
  value: LaidValue;
  id: string;
  role: 'value' | 'count';
}) {
  const text = {
    fontSize: v.size,
    fontFamily: theme.font.family.math.family,
    fill: INK,
    textAnchor: 'middle',
  } as const;
  if (v.kind === 'unknown') {
    return (
      <G testID={`tree-unknown-${id}`}>
        <Rect
          {...(v.ask && { testID: `tree-ask-${id}` })}
          x={v.box.x}
          y={v.box.y}
          width={v.box.w}
          height={v.box.h}
          rx={theme.radius.xs}
          fill={v.ask ? theme.color.surfaceSelected : 'none'}
          stroke={v.ask ? INK : theme.color.borderControl}
          strokeWidth={v.ask ? T.askWidth : T.ruleWidth}
        />
        <SvgText {...text} x={v.x} y={v.y}>
          {UNKNOWN}
        </SvgText>
      </G>
    );
  }
  const weight = v.found && { fontWeight: theme.font.weight.bold };
  return (
    <G testID={`tree-${role}-${id}`}>
      {v.kind === 'frac' ? (
        <>
          <SvgText {...text} {...weight} testID={`tree-num-${id}`} x={v.x} y={v.numY}>
            {v.num}
          </SvgText>
          <Line
            x1={v.bar.x1}
            y1={v.bar.y1}
            x2={v.bar.x2}
            y2={v.bar.y2}
            stroke={INK}
            strokeWidth={v.found ? T.tickWidth : T.ruleWidth}
          />
          <SvgText {...text} {...weight} testID={`tree-den-${id}`} x={v.x} y={v.denY}>
            {v.den}
          </SvgText>
        </>
      ) : (
        <SvgText {...text} {...weight} testID={`tree-text-${id}`} x={v.x} y={v.y}>
          {v.text}
        </SvgText>
      )}
      {v.tick && (
        <Polyline
          testID={`tree-found-${id}`}
          points={points(v.tick)}
          fill="none"
          stroke={INK}
          strokeWidth={T.tickWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </G>
  );
}

const styles = StyleSheet.create({
  bare: { alignSelf: 'stretch', gap: theme.space.xs },
  box: { direction: 'ltr', alignSelf: 'stretch' },
  // The touch target of the end of a path: the whole row band, at least 44 pt each way.
  leaf: { position: 'absolute', justifyContent: 'center' },
  // What is drawn of it: a control edge around the label, so it looks tappable.
  leafEdge: {
    height: theme.size.touch - theme.space.xxs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
  },
  leafOn: { borderColor: theme.color.ink, borderWidth: theme.border.selected },
  pressed: { backgroundColor: theme.color.highlighter, opacity: theme.opacity.dimmed },
  slot: { gap: theme.space.xxs },
  slotLive: { minHeight: T.pathSlot },
});
