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

import { ratToString } from '../../engine/rationalFormat';
import { RichView } from '../../lesson/feed/RichView';
import { MathBlock } from '../../lesson/math/MathBlock';
import { theme } from '../../theme';
import { ActionButton, Panel, styles as ui } from '../probability/ui';
import { useEmit, type ViewProps } from '../host';
import {
  areaFinding,
  areaModel,
  overlayResult,
  probabilityOf,
} from './area';
import { makeExplored } from './finding';
import { OVERLAYS, type EventAreaModelProps, type Overlay } from './schemas';
import { SliceBar, type SliceItem } from './SliceBar';

const SnapshotSchema = z.object({
  selected: z.array(z.string().max(10)).max(2),
  overlay: z.enum(OVERLAYS).nullable(),
  tried: z.array(z.enum(OVERLAYS)).max(4),
  explored: z.enum(['done', 'skipped']).nullable(),
});

const OVERLAY_LABEL = {
  complement: 'pv2.area.complement',
  intersection: 'pv2.area.intersection',
  union: 'pv2.area.union',
  conditional: 'pv2.area.conditional',
} as const satisfies Record<Overlay, string>;

/**
 * A sample space as one bar whose slices follow their counts (the 4R6N urn by
 * the number of reds: 20, 60, 36, 4 of 120), events as sets of slices, and
 * four views of them: the complement, the intersection, the union and the
 * conditional (a zoom into the first event, which becomes the whole). The
 * complement trap is on the bar: the complement of A (60 draws = 20 + 36 + 4)
 * is not B (20 draws). Slices narrower than a touch target are still drawn at
 * that width by the shared SliceBar, and every slice is listed with its number.
 * Opens its gate (`explored`) once two views were tried (one, if only one is
 * offered); "I do not know, show me" lights the first event and its first view.
 */
export function EventAreaModel(p: ViewProps<EventAreaModelProps>) {
  const { t } = useTranslation();
  const m = useMemo(() => areaModel(p.props), [p.props]);
  const need = Math.min(2, m.overlays.length);

  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success && s.data.selected.every(id => m.events.some(e => e.id === id))
      ? s.data
      : {
          selected: [] as string[],
          overlay: null as Overlay | null,
          tried: [] as Overlay[],
          explored: null as 'done' | 'skipped' | null,
        };
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selected, setSelected] = useState(initial.selected);
  const [overlay, setOverlay] = useState(initial.overlay);
  const [tried, setTried] = useState(initial.tried);
  const [explored, setExplored] = useState(initial.explored);
  const exploredRef = useRef(initial.explored);
  const triedRef = useRef(initial.tried);
  const route = useRef<string[]>([]);
  const emit = useEmit('EventAreaModel', p);
  const live = p.mode === 'interactive';

  useImperativeHandle(
    p.ref,
    () => ({ getStateSnapshot: () => ({ selected, overlay, tried, explored }) }),
    [selected, overlay, tried, explored],
  );

  const events = selected.map(id => m.events.find(e => e.id === id)!);
  const result = overlay ? overlayResult(m, overlay, events) : null;
  const lit = new Set(events.flatMap(e => e.slices));
  const marked = new Set(overlay && overlay !== 'conditional' ? result?.slices ?? [] : []);

  const finish = useCallback(
    (why: string, how: 'done' | 'skipped', sel: typeof events) => {
      if (exploredRef.current !== null) {
        return;
      }
      exploredRef.current = how;
      setExplored(how);
      emit('explored', makeExplored(why, how));
      emit(
        'finding',
        areaFinding(m, sel, triedRef.current, route.current, how === 'done' ? 'found' : 'skipped'),
      );
    },
    [emit, m],
  );

  const pickEvent = (id: string) => {
    if (!live) {
      return;
    }
    const next = selected.includes(id)
      ? selected.filter(x => x !== id)
      : [...selected, id].slice(-2);
    setSelected(next);
    route.current.push(`event:${id}`);
    emit('event_selected', { ids: next });
  };
  const pickOverlay = (o: Overlay) => {
    if (!live) {
      return;
    }
    const next = overlay === o ? null : o;
    setOverlay(next);
    const r = next ? overlayResult(m, next, events) : null;
    if (next) {
      emit('overlay_selected', { overlay: next, valid: r !== null });
      route.current.push(`overlay:${next}`);
    }
    if (r && next && !triedRef.current.includes(next)) {
      triedRef.current = [...triedRef.current, next];
      setTried(triedRef.current);
      if (triedRef.current.length >= need) {
        finish('overlays_tried', 'done', events);
      }
    }
  };
  const reveal = () => {
    if (!live || exploredRef.current !== null) {
      return;
    }
    const first = m.events[0]!;
    const o = m.overlays.find(x => x !== 'intersection' && x !== 'union') ?? m.overlays[0]!;
    setSelected([first.id]);
    setOverlay(o);
    route.current.push('reveal');
    finish('reveal', 'skipped', [first]);
  };

  const items: SliceItem[] = m.slices.map(s => ({ key: s.id, label: s.label, count: s.count }));
  const valueText = (s: SliceItem) =>
    m.labels === 'counts' ? String(s.count) : ratToString(probabilityOf(m, s.count));
  const a11yLabel = (s: SliceItem) =>
    t('pv2.area.slice', { label: s.label, value: valueText(s) });
  const zoom: SliceItem[] =
    overlay === 'conditional' && events[0]
      ? items.filter(s => events[0]!.slices.includes(s.key))
      : [];

  return (
    <Panel testID={`event-area-${p.instanceId}`}>
      {p.props.insight && <RichView rich={p.props.insight} fontSize={theme.font.size.body} />}

      <Text style={ui.readoutLabel}>{t('pv2.area.pick')}</Text>
      <View style={styles.chips}>
        {m.events.map(e => {
          const on = selected.includes(e.id);
          return (
            <Pressable
              key={e.id}
              disabled={!live}
              onPress={() => pickEvent(e.id)}
              accessibilityRole="button"
              accessibilityLabel={t('pv2.area.eventChip', { label: e.label })}
              accessibilityState={{ selected: on, disabled: !live }}
              testID={`area-event-${e.id}`}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={styles.chipText}>
                {on ? `${theme.feedback.success.icon} ` : ''}
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SliceBar
        slices={items}
        selectedKeys={lit}
        markedKeys={marked}
        valueText={valueText}
        a11yLabel={a11yLabel}
        testIDPrefix="area-slice"
      />
      <View style={styles.pair} testID="area-total">
        <Text style={ui.readoutLabel}>{t('pv2.area.total')}</Text>
        <MathBlock latex={String(m.total)} fontSize={theme.font.size.bodyLarge} />
      </View>

      <View style={styles.chips}>
        {m.overlays.map(o => {
          const needTwo = o === 'intersection' || o === 'union';
          const off = !live || events.length === 0 || (needTwo && events.length < 2);
          return (
            <Pressable
              key={o}
              disabled={off}
              onPress={() => pickOverlay(o)}
              accessibilityRole="button"
              accessibilityLabel={t(OVERLAY_LABEL[o])}
              accessibilityState={{ selected: overlay === o, disabled: off }}
              testID={`area-overlay-${o}`}
              style={[styles.chip, overlay === o && styles.chipOn, off && styles.chipOff]}
            >
              <Text style={styles.chipText}>
                {overlay === o ? `${theme.feedback.success.icon} ` : ''}
                {t(OVERLAY_LABEL[o])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {result && overlay && (
        <View style={styles.pair} testID="area-result">
          <Text style={ui.readoutLabel}>{t(OVERLAY_LABEL[overlay])}</Text>
          {result.lines.map(line => (
            <MathBlock key={line} latex={line} fontSize={theme.font.size.bodyLarge} />
          ))}
          {result.complementIsOther !== undefined && (
            <Text style={[ui.readoutLabel, styles.note]} testID="area-compare">
              {t(result.complementIsOther ? 'pv2.area.sameEvent' : 'pv2.area.notSameEvent')}
            </Text>
          )}
          {overlay === 'conditional' && (
            <>
              <Text style={ui.readoutLabel}>{t('pv2.area.zoomNote')}</Text>
              <SliceBar
                slices={zoom}
                valueText={s => String(s.count)}
                a11yLabel={a11yLabel}
                testIDPrefix="area-zoom"
              />
            </>
          )}
        </View>
      )}
      {overlay && !result && (
        <Text style={ui.readoutLabel} testID="area-need-two">
          {t('pv2.area.needTwo')}
        </Text>
      )}

      {explored === null && live && (
        <ActionButton
          label={t('primitives.predict.reveal')}
          onPress={reveal}
          testID="area-reveal"
        />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  pair: { gap: theme.space.xxs },
  chips: { flexDirection: theme.mathSide.row, flexWrap: 'wrap', gap: theme.space.sm },
  chip: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: theme.reading.row,
    paddingHorizontal: theme.space.sm,
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
  chipOff: { opacity: theme.opacity.disabled },
  chipText: {
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.callout,
    color: theme.color.ink,
  },
  note: { fontFamily: theme.font.family.ui.bold },
});

