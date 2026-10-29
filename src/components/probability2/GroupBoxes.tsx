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

import { boxesInSlice, orderingsOfBox, type Box } from '../../engine/grouping';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { colorIndexes } from '../probability/logic';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import { makeExplored } from './finding';
import { boxesFinding, boxesModel, type Item } from './logic';
import type { GroupBoxesProps } from './schemas';
import { SliceBar } from './SliceBar';
import { Dots } from './ui';

const SnapshotSchema = z.object({
  expanded: z.string().nullable(),
  slice: z.number().int().nullable(),
  sample: z.number().int().min(0),
  explored: z.enum(['done', 'skipped']).nullable(),
});

/** The chevron of a box: pointing down when open (shape, not colour alone). */
const OPEN = '\u25be';
const CLOSED = '\u25b8';
/** Boxes of a slice listed at once. */
const SLICE_BOXES = 6;

/**
 * Ordered draws grouped in boxes: a box is the SET of k balls (its balls on
 * top), and holds the k! orderings of those balls. The student opens one box
 * at a time. It answers "why do I divide by 6 and not by 3": 3 is the number
 * of balls in a box, 6 the number of orderings. The real urn (120 boxes) is
 * never listed: one box at a time, or slices by a count of balls.
 *
 * Opens its gate (`explored`) on the first box opened, the first "another
 * box", or the first slice; "I do not know, show me" opens it too and logs
 * `how: skipped`.
 */
export function GroupBoxes(p: ViewProps<GroupBoxesProps>) {
  const { t } = useTranslation();
  const model = useMemo(() => boxesModel(p.props), [p.props]);
  const items = useMemo(() => {
    const idx = colorIndexes(p.props.balls);
    const byId = new Map<string, Item>();
    for (const b of p.props.balls) {
      byId.set(b.id, {
        id: b.id,
        label: model.labels.get(b.id) ?? b.id,
        ...(b.color !== undefined && { color: b.color }),
      });
    }
    const spoken = (id: string) => {
      const b = p.props.balls.find(x => x.id === id)!;
      return b.color
        ? t(`proba.ball.${b.color}`, { n: idx.get(id) })
        : model.labels.get(id) ?? id;
    };
    return { byId, spoken };
  }, [model.labels, p.props.balls, t]);

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success
      ? s.data
      : { expanded: null, slice: null, sample: model.start, explored: null };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [expanded, setExpanded] = useState<string | null>(initial.expanded);
  const [slice, setSlice] = useState<number | null>(initial.slice);
  const [sample, setSample] = useState(initial.sample);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const route = useRef<string[]>([]);
  const emit = useEmit('GroupBoxes', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => ({ expanded, slice, sample, explored }),
    }),
    [expanded, slice, sample, explored],
  );

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped') => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit('finding', boxesFinding(model, route.current, how === 'done' ? 'found' : 'skipped'));
    },
    [emit, model],
  );

  const property = p.props.groupBy === 'ball_set' ? null : p.props.groupBy.property.value;
  const sliceBoxes = useMemo<Box[]>(
    () =>
      property !== null && slice !== null
        ? boxesInSlice(p.props.balls, p.props.k, property, slice, SLICE_BOXES)
        : [],
    [p.props.balls, p.props.k, property, slice],
  );

  const openBox = (key: string) => {
    if (!live) {
      return;
    }
    if (expanded === key) {
      setExpanded(null);
      emit('box_collapsed', { key });
      return;
    }
    setExpanded(key);
    route.current.push(`expand:${key}`);
    emit('box_expanded', { key, orderings: model.perBox });
    finish('box_expanded', 'done');
  };
  const nextBox = () => {
    if (!live || model.list === null) {
      return;
    }
    const next = (sample + 1) % model.list.length;
    setSample(next);
    route.current.push(`next:${next}`);
    emit('next_box', { index: next });
    finish('next_box', 'done');
  };
  const pickSlice = (j: number) => {
    if (!live) {
      return;
    }
    setSlice(j);
    setExpanded(null);
    route.current.push(`slice:${j}`);
    emit('slice_selected', { j, count: model.slices?.[j]?.count ?? 0 });
    finish('slice_selected', 'done');
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    route.current.push('reveal');
    if (property !== null) {
      const first = model.slices?.findIndex(s => s.count > 0) ?? 0;
      setSlice(first);
    } else if (model.mode === 'show_all' && model.list) {
      setExpanded(model.list[0]!.key);
    }
    finish('reveal', 'skipped');
  };

  const label = (ids: readonly string[]) => ids.map(id => items.byId.get(id)!);
  const boxA11y = (ids: readonly string[]) =>
    t('pv2.boxes.box', { balls: ids.map(items.spoken).join('\u060c ') });

  /** The box of the one-box mode: always open, so not a button. */
  const renderOpenBox = (box: Box) => (
    <View
      key={box.key}
      accessible
      accessibilityRole="image"
      accessibilityLabel={boxA11y(box.ballIds)}
      testID={`group-box-${box.key}`}
      style={[styles.box, styles.boxOn]}
    >
      <Dots items={label(box.ballIds)} />
      <Text style={styles.chevron}>{OPEN}</Text>
    </View>
  );

  const renderBox = (box: Box) => {
    const on = expanded === box.key;
    return (
      <Pressable
        key={box.key}
        disabled={!live}
        onPress={() => openBox(box.key)}
        accessibilityRole="button"
        accessibilityLabel={boxA11y(box.ballIds)}
        accessibilityState={{ expanded: on, disabled: !live }}
        testID={`group-box-${box.key}`}
        style={[styles.box, on && styles.boxOn]}
      >
        <Dots items={label(box.ballIds)} />
        <Text style={styles.chevron}>{on ? OPEN : CLOSED}</Text>
      </Pressable>
    );
  };

  /** The orderings of the open box: the same balls, in every order. */
  const renderOrderings = (key: string) => (
    <View style={styles.orderings} testID={`group-orderings-${key}`}>
      <Text style={ui.readoutLabel}>{t('pv2.boxes.orderings')}</Text>
      <View style={styles.orderGrid}>
        {orderingsOfBox(key.split('-')).map((o, i) => (
          <View
            key={o}
            style={styles.ordering}
            testID={`group-order-${key}-${i}`}
          >
            <Dots items={label(o.split('-'))} size="ordering" />
          </View>
        ))}
      </View>
    </View>
  );

  const sampleBox = model.list?.[sample];
  const openKey = model.mode === 'one_box_expanded' && property === null ? sampleBox?.key ?? null : expanded;

  return (
    <Panel testID={`group-boxes-${p.instanceId}`}>
      {p.props.insight && (
        <RichView rich={p.props.insight} fontSize={theme.font.size.body} />
      )}

      {property === null && model.mode === 'show_all' && model.list && (
        <View style={styles.grid}>{model.list.map(renderBox)}</View>
      )}

      {property === null && model.mode === 'one_box_expanded' && sampleBox && (
        <View style={styles.grid}>
          {renderOpenBox(sampleBox)}
          {live && (
            <ActionButton
              label={t('pv2.boxes.next')}
              onPress={nextBox}
              testID="group-next"
            />
          )}
        </View>
      )}

      {property !== null && model.slices && (
        <>
          <Text style={ui.readoutLabel}>{t('pv2.boxes.sliceCaption')}</Text>
          <SliceBar
            slices={model.slices.map(s => ({
              key: String(s.j),
              label: String(s.j),
              count: s.count,
            }))}
            selectedKey={slice === null ? null : String(slice)}
            {...(live && { onSelect: (k: string) => pickSlice(Number(k)) })}
            a11yLabel={s =>
              t('pv2.boxes.slice', { j: s.label, count: s.count, total: model.boxes })
            }
          />
          {slice !== null && (
            <View style={styles.grid}>{sliceBoxes.map(renderBox)}</View>
          )}
        </>
      )}

      {openKey !== null && renderOrderings(openKey)}

      {explored === null && live && (
        <Text style={ui.readoutLabel}>
          {t(
            property !== null
              ? 'pv2.boxes.sliceTap'
              : model.mode === 'one_box_expanded'
              ? 'pv2.boxes.nextTap'
              : 'pv2.boxes.tap',
          )}
        </Text>
      )}

      {explored !== null && (
        <View style={styles.calc} testID="group-calc">
          <Text style={ui.readoutLabel}>
            {t(property !== null ? 'pv2.boxes.sliceFooter' : 'pv2.boxes.footer')}
          </Text>
          {model.calc.map(line => (
            <MathBlock key={line} latex={line} fontSize={theme.font.size.bodyLarge} />
          ))}
        </View>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="group-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  box: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.xxs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xs,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  // Open box: highlighter and an ink border; the chevron turns down (shape, not colour alone).
  boxOn: {
    borderColor: theme.color.ink,
    borderWidth: theme.border.selected,
    backgroundColor: theme.color.surfaceSelected,
  },
  chevron: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.footnote,
    color: theme.color.textPrimary,
  },
  orderings: { gap: theme.space.xs },
  orderGrid: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  ordering: {
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  calc: { gap: theme.space.xxs },
});
