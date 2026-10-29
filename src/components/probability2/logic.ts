/**
 * Pure model of GroupBoxes and ChoiceProduct: every number the views show,
 * computed by the engine from the props; the findings and the `reveals`
 * declarations. No React here (the guard and the tests import it).
 */
import {
  arrangements,
  choose,
  factorial,
} from '../../engine/combinatorics';
import {
  chooseLine,
  productLine,
  sumLine,
} from '../../engine/calcLines';
import {
  listBoxes,
  sliceCountsFor,
  type Box,
  type SliceCount,
} from '../../engine/grouping';
import { frac, type Fraction } from '../../engine/rational';
import { ballLabels } from '../probability/logic';
import type { BallColor } from '../../engine/probability';
import type { RevealRule } from '../reveals';
import {
  makeFinding,
  type FindingHow,
  type FindingPayload,
} from './finding';
import {
  ChoiceProductPropsSchema,
  GroupBoxesPropsSchema,
  resolvedBoxMode,
  type ChoiceProductProps,
  type GroupBoxesProps,
} from './schemas';

const int = (n: number): Fraction => frac(n);

// ---------------------------------------------------------------------------
// GroupBoxes

export interface BoxesModel {
  n: number;
  k: number;
  /** C(n,k): the boxes. */
  boxes: number;
  /** k!: the orderings inside one box. */
  perBox: number;
  /** A(n,k): the ordered draws. */
  ordered: number;
  groupBy: GroupBoxesProps['groupBy'];
  mode: 'show_all' | 'one_box_expanded';
  /** Ball id -> label (R1, N2). */
  labels: Map<string, string>;
  /** The boxes in urn order (ball_set), else null. */
  list: Box[] | null;
  /**
   * The box shown first when boxes come one at a time: the first one with
   * balls of two colours (a box of three reds shows less), else the first.
   */
  start: number;
  /** Boxes per number of balls with the property (property), else null. */
  slices: SliceCount[] | null;
  /** The calculation, built by the engine. */
  calc: string[];
}

export function boxesModel(p: GroupBoxesProps): BoxesModel {
  const n = p.balls.length;
  const boxes = choose(n, p.k);
  const perBox = factorial(p.k);
  const ordered = arrangements(n, p.k);
  const property = p.groupBy === 'ball_set' ? null : p.groupBy.property.value;
  const slices =
    property === null ? null : sliceCountsFor(p.balls, 'simultaneous', p.k, property);
  const list = property === null ? listBoxes(p.balls, p.k) : null;
  const colour = new Map(p.balls.map(b => [b.id, b.color]));
  const mixed = list?.findIndex(b => new Set(b.ballIds.map(id => colour.get(id))).size > 1) ?? -1;
  return {
    n,
    k: p.k,
    boxes,
    perBox,
    ordered,
    groupBy: p.groupBy,
    mode: resolvedBoxMode(p),
    labels: ballLabels(p.balls, true),
    list,
    start: Math.max(mixed, 0),
    slices,
    calc:
      slices === null
        ? [productLine([boxes, perBox]), chooseLine(n, p.k)]
        : [sumLine(slices.map(s => s.count)), chooseLine(n, p.k)],
  };
}

export function boxesFinding(
  m: BoxesModel,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const numbers: Record<string, string> =
    m.slices === null
      ? {
          boxes: String(m.boxes),
          perBox: String(m.perBox),
          ordered: String(m.ordered),
        }
      : {
          total: String(m.boxes),
          ...Object.fromEntries(m.slices.map((s, i) => [`slice${i}`, String(s.count)])),
        };
  return makeFinding({
    findingId:
      m.slices === null ? 'groupboxes.orderings_per_box' : 'groupboxes.slices',
    numbers,
    route: route.slice(0, 12),
    how,
    correct: null,
    calc: m.calc,
  });
}

const parseBoxes = (props: Record<string, unknown>): BoxesModel | null => {
  const r = GroupBoxesPropsSchema.safeParse(props);
  return r.success ? boxesModel(r.data) : null;
};

export const GROUP_BOXES_REVEALS: readonly RevealRule[] = [
  {
    value: 'box_list',
    note: 'every box is listed, so the number of boxes can be counted on screen',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseBoxes(p);
      return m && m.list !== null && m.mode === 'show_all' ? [int(m.boxes)] : [];
    },
  },
  {
    value: 'totals',
    note: 'the number of boxes, the orderings of a box and the ordered draws, written once a box is opened',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseBoxes(p);
      return m && m.slices === null
        ? [int(m.boxes), int(m.perBox), int(m.ordered)]
        : [];
    },
  },
  {
    value: 'slice_counts',
    note: 'the number of boxes in each slice, and their total',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseBoxes(p);
      return m && m.slices !== null
        ? [...m.slices.map(s => int(s.count)), int(m.boxes)]
        : [];
    },
  },
];

// ---------------------------------------------------------------------------
// ChoiceProduct

export interface Item {
  id: string;
  label: string;
  color?: BallColor;
}

export function combinations<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  const walk = (start: number, picked: T[]): void => {
    if (picked.length === size) {
      out.push(picked);
      return;
    }
    for (let i = start; i < items.length; i++) {
      walk(i + 1, [...picked, items[i]!]);
    }
  };
  walk(0, []);
  return out;
}

export interface StageModel {
  title: ChoiceProductProps['stages'][number]['title'];
  /** The items the student picks from. */
  items: Item[];
  /** Pick this many. */
  size: number;
  /** Every way to pick them, in reading order: the chips. */
  options: Item[][];
  /** More than one item per option: a subset (a pair). */
  subset: boolean;
  /** C(n,size). */
  count: number;
}

export interface ChoiceModel {
  stages: StageModel[];
  /** The two stage counts. */
  counts: [number, number];
  product: number;
  sum: number;
}

export function choiceModel(p: ChoiceProductProps): ChoiceModel {
  const stages = p.stages.map<StageModel>(s => {
    const labels = s.balls ? ballLabels(s.balls, true) : null;
    const items: Item[] = s.balls
      ? s.balls.map(b => ({
          id: b.id,
          label: labels!.get(b.id) ?? b.id,
          ...(b.color !== undefined && { color: b.color }),
        }))
      : s.labels!.map(l => ({ id: l, label: l }));
    return {
      title: s.title,
      items,
      size: s.size,
      options: combinations(items, s.size),
      subset: s.size > 1,
      count: choose(items.length, s.size),
    };
  });
  const a = stages[0]!.count;
  const b = stages[1]!.count;
  return { stages, counts: [a, b], product: a * b, sum: a + b };
}

/** The calculation of the student's picks: the count of each subset stage, then the product or the sum. */
export function choiceCalc(m: ChoiceModel, mode: 'and' | 'or'): string[] {
  const subsets = m.stages.flatMap(s =>
    s.subset ? [chooseLine(s.items.length, s.size)] : [],
  );
  return [
    ...subsets,
    mode === 'and' ? productLine(m.counts) : sumLine(m.counts),
  ];
}

export function choiceFinding(
  m: ChoiceModel,
  mode: 'and' | 'or',
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  return makeFinding({
    findingId: `choiceproduct.${mode}`,
    numbers: {
      stage1: String(m.counts[0]),
      stage2: String(m.counts[1]),
      total: String(mode === 'and' ? m.product : m.sum),
    },
    route: route.slice(0, 12),
    how,
    correct: null,
    calc: choiceCalc(m, mode),
  });
}

const parseChoice = (props: Record<string, unknown>): ChoiceModel | null => {
  const r = ChoiceProductPropsSchema.safeParse(props);
  return r.success ? choiceModel(r.data) : null;
};

export const CHOICE_PRODUCT_REVEALS: readonly RevealRule[] = [
  {
    value: 'stage_sizes',
    note: 'the options of each stage are listed, so how many there are can be counted on screen',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseChoice(p);
      return m ? m.counts.map(int) : [];
    },
  },
  {
    value: 'total',
    note: 'the product (and the sum) of the two counts, written once the student has picked in both stages',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseChoice(p);
      return m ? [int(m.product), int(m.sum)] : [];
    },
  },
];
