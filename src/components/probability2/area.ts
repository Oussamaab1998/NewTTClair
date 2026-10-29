/**
 * Pure model of EventAreaModel: a sample space cut in slices whose areas are
 * their counts (the 4R6N urn by number of reds: 20, 60, 36, 4 of 120), events
 * as sets of slices, and the overlays complement, intersection, union and
 * conditional, every number from the engine. The complement trap: the
 * complement of A (60 draws = 20 + 36 + 4) is NOT B (20 draws). No React.
 */
import { divisionLine, sumLine } from '../../engine/calcLines';
import { choose } from '../../engine/combinatorics';
import { frac, type Fraction } from '../../engine/rational';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import {
  EventAreaModelPropsSchema,
  type EventAreaModelProps,
  type Overlay,
} from './schemas';

export interface AreaSlice {
  id: string;
  label: string;
  count: number;
}
export interface AreaEvent {
  id: string;
  label: string;
  slices: string[];
}
export interface AreaModel {
  slices: AreaSlice[];
  total: number;
  events: AreaEvent[];
  overlays: Overlay[];
  labels: 'counts' | 'probabilities';
}

export function areaModel(p: EventAreaModelProps): AreaModel {
  let slices: AreaSlice[];
  if (p.source.kind === 'urn') {
    const { reds, blacks, k } = p.source;
    slices = Array.from({ length: k + 1 }, (_, j) => ({
      id: `s${j}`,
      label: String(j),
      count: j > reds || k - j > blacks ? 0 : choose(reds, j) * choose(blacks, k - j),
    }));
  } else {
    slices = p.source.slices.map(s => ({ ...s }));
  }
  return {
    slices,
    total: slices.reduce((a, s) => a + s.count, 0),
    events: p.events.map(e => ({ ...e })),
    overlays: p.overlays,
    labels: p.labels,
  };
}

/** The number of outcomes in these slices. */
export const countOf = (m: AreaModel, ids: Iterable<string>): number => {
  const set = new Set(ids);
  return m.slices.filter(s => set.has(s.id)).reduce((a, s) => a + s.count, 0);
};

/** count / total, exact. */
export const probabilityOf = (m: AreaModel, count: number): Fraction =>
  frac(count, m.total);

const idsOf = (m: AreaModel, slices: readonly string[]) =>
  m.slices.filter(s => slices.includes(s.id)).map(s => s.id);

/** The slices an overlay lights, in slice order, for the selected events (first, second). */
export function overlaySlices(
  m: AreaModel,
  overlay: Overlay,
  selected: readonly AreaEvent[],
): string[] {
  const [a, b] = selected;
  if (!a) {
    return [];
  }
  switch (overlay) {
    case 'complement':
      return m.slices.filter(s => !a.slices.includes(s.id)).map(s => s.id);
    case 'intersection':
      return b ? idsOf(m, a.slices.filter(s => b.slices.includes(s))) : [];
    case 'union':
      return b ? idsOf(m, [...a.slices, ...b.slices]) : [];
    case 'conditional':
      return idsOf(m, a.slices);
  }
}

/** `20 + 36 + 4 = 60`, or the bare number when there is one slice (or `0`). */
function countLine(m: AreaModel, ids: readonly string[]): string {
  const counts = m.slices.filter(s => ids.includes(s.id)).map(s => s.count);
  return counts.length >= 2 ? sumLine(counts) : String(counts[0] ?? 0);
}

export interface OverlayResult {
  /** The slices lit. */
  slices: string[];
  /** Engine lines (LaTeX): the count, then the probability. */
  lines: string[];
  /** complement with two events: is the complement of the first the second? */
  complementIsOther?: boolean;
  /** conditional: the zoomed total (the count of the first event). */
  zoomTotal?: number;
}

export function overlayResult(
  m: AreaModel,
  overlay: Overlay,
  selected: readonly AreaEvent[],
): OverlayResult | null {
  const [a, b] = selected;
  if (!a || ((overlay === 'intersection' || overlay === 'union') && !b)) {
    return null;
  }
  const slices = overlaySlices(m, overlay, selected);
  const count = countOf(m, slices);
  if (overlay === 'conditional') {
    const base = countOf(m, a.slices);
    const inter = b ? countOf(m, overlaySlices(m, 'intersection', selected)) : base;
    return {
      slices,
      zoomTotal: base,
      lines: [divisionLine(inter, base)],
    };
  }
  const lines = [countLine(m, slices), divisionLine(count, m.total)];
  return {
    slices,
    lines,
    ...(overlay === 'complement' &&
      b && {
        complementIsOther:
          slices.length === b.slices.length && slices.every(s => b.slices.includes(s)),
      }),
  };
}

export function areaFinding(
  m: AreaModel,
  selected: readonly AreaEvent[],
  tried: readonly Overlay[],
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found' || how === 'helped';
  const [a, b] = selected;
  const numbers: Record<string, string> = { total: String(m.total) };
  const calc: string[] = [];
  if (a) {
    numbers.a = String(countOf(m, a.slices));
    if (tried.includes('complement')) {
      const r = overlayResult(m, 'complement', selected);
      numbers.complement = String(countOf(m, r!.slices));
      calc.push(...r!.lines);
    }
  }
  if (b) {
    numbers.b = String(countOf(m, b.slices));
  }
  return makeFinding({
    findingId: 'area.events',
    numbers,
    route: route.slice(0, 12),
    how,
    correct: null,
    ...(own && calc.length > 0 && { calc }),
  });
}

// ---------------------------------------------------------------------------
// Reveals

const parseArea = (props: Record<string, unknown>): AreaModel | null => {
  const r = EventAreaModelPropsSchema.safeParse(props);
  return r.success ? areaModel(r.data) : null;
};

export const EVENT_AREA_REVEALS: readonly RevealRule[] = [
  {
    value: 'slices',
    note: 'the number of outcomes of each slice, their total, and the probability of each slice are written on the bar',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseArea(p);
      return m
        ? [
            ...m.slices.map(s => frac(s.count)),
            frac(m.total),
            ...m.slices.filter(s => s.count > 0).map(s => probabilityOf(m, s.count)),
          ]
        : [];
    },
  },
  {
    value: 'overlay_results',
    note: 'the count and the probability of an event, of its complement, of an intersection, a union or a conditional, written after the student switches the overlay on',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseArea(p);
      if (!m) {
        return [];
      }
      const out: Fraction[] = [];
      const sets = m.events.flatMap(a => [
        a,
        ...m.events.filter(b => b.id !== a.id).map(b => [a, b] as const),
      ]);
      for (const entry of sets) {
        const sel = Array.isArray(entry) ? [...entry] : [entry as AreaEvent];
        for (const o of m.overlays) {
          const r = overlayResult(m, o, sel);
          if (r) {
            const c = countOf(m, r.slices);
            out.push(frac(c), probabilityOf(m, c));
          }
        }
      }
      return out;
    },
  },
];

