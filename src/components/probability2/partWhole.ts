/**
 * Pure model of PartWholeBar: where a value sits on a bar from 0 to the
 * whole (and past it), the widths of the bar's parts, the finding and the
 * `reveals` declaration. Every number comes from the engine
 * (`engine/partWhole.ts`). No React here (the guard and the tests import it).
 */
import { divisionLine, productLine } from '../../engine/calcLines';
import {
  barPositions,
  placeOnBar,
  quantityOf,
} from '../../engine/partWhole';
import {
  EngineError,
  compare,
  div,
  frac,
  mul,
  sub,
  toNumber,
  type Fraction,
} from '../../engine/rational';
import {
  isInteger,
  parseRat,
  ratToString,
  sameRat,
} from '../../engine/rationalFormat';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import { PartWholeBarPropsSchema, type PartWholeBarProps } from './schemas';

export interface PartWholeModel {
  mode: PartWholeBarProps['mode'];
  whole: Fraction;
  ticks: number;
  fraction: Fraction | null;
  /** The values the control can take (empty in feedback mode). */
  positions: Fraction[];
  /** The value at the right end of the bar. */
  scale: Fraction;
  /** fraction_of_quantity: whole x fraction. */
  target: Fraction | null;
  /** feedback: the student's value. */
  part: Fraction | null;
}

export function partWholeModel(p: PartWholeBarProps): PartWholeModel {
  const whole = parseRat(p.whole);
  if (whole === null) {
    throw new EngineError('whole is not a rational');
  }
  const twice = mul(whole, frac(2));
  if (p.mode === 'feedback') {
    const part = parseRat(p.part ?? '');
    if (part === null) {
      throw new EngineError('feedback needs the part');
    }
    return {
      mode: p.mode,
      whole,
      ticks: p.ticks,
      fraction: null,
      positions: [],
      scale: compare(part, twice) > 0 ? part : twice,
      target: null,
      part,
    };
  }
  if (p.mode === 'fraction_of_quantity') {
    const fraction = parseRat(p.fraction ?? '');
    if (fraction === null) {
      throw new EngineError('fraction_of_quantity needs the fraction');
    }
    return {
      mode: p.mode,
      whole,
      ticks: p.ticks,
      fraction,
      positions: barPositions(whole, p.ticks, false),
      scale: whole,
      target: quantityOf(whole, fraction),
      part: null,
    };
  }
  return {
    mode: p.mode,
    whole,
    ticks: p.ticks,
    fraction: null,
    positions: barPositions(whole, p.ticks, true),
    scale: twice,
    target: null,
    part: null,
  };
}

/**
 * The calculation of a value against the whole (`\\frac{12}{6} = 2`), or null
 * when it says nothing or would not read well: a whole of 1, a fraction
 * already in lowest terms (`\\frac{1}{6} = \\frac{1}{6}`), or a value or a
 * whole that is itself a fraction (a fraction over a fraction).
 */
export function ratioLine(value: Fraction, whole: Fraction): string | null {
  if (!isInteger(value) || !isInteger(whole) || sameRat(whole, frac(1))) {
    return null;
  }
  const line = divisionLine(value, whole);
  const [left, right] = line.split(' = ');
  return left === right ? null : line;
}

export interface BarParts {
  /** Widths as fractions of the bar (they add up to 1). Layout only, never shown. */
  fill: number;
  /** Empty, from the value to the whole mark. */
  gap: number;
  /** Past the whole mark. */
  over: number;
  rest: number;
  exceeds: boolean;
}

export function barParts(m: PartWholeModel, value: Fraction): BarParts {
  const placed = placeOnBar(m.whole, value);
  const inside = placed.exceeds ? m.whole : value;
  const end = placed.exceeds ? value : m.whole;
  return {
    fill: toNumber(div(inside, m.scale)),
    gap: toNumber(div(sub(m.whole, inside), m.scale)),
    over: placed.exceeds ? toNumber(div(placed.overflow, m.scale)) : 0,
    rest: toNumber(div(sub(m.scale, end), m.scale)),
    exceeds: placed.exceeds,
  };
}

export function partWholeFinding(
  m: PartWholeModel,
  value: Fraction,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found';
  const base = { whole: ratToString(m.whole), value: ratToString(value) };
  if (m.mode === 'place') {
    const line = ratioLine(value, m.whole);
    return makeFinding({
      findingId: 'partwhole.place',
      numbers: { ...base, ratio: ratToString(placeOnBar(m.whole, value).ratio) },
      route: route.slice(0, 12),
      how,
      correct: null,
      ...(own && line !== null && { calc: [line] }),
    });
  }
  if (m.mode === 'fraction_of_quantity' && m.fraction && m.target) {
    const matches = sameRat(value, m.target);
    return makeFinding({
      findingId: 'partwhole.fraction',
      numbers: {
        ...base,
        fraction: ratToString(m.fraction),
        quantity: ratToString(m.target),
      },
      route: route.slice(0, 12),
      how,
      correct: how === 'skipped' ? null : matches,
      ...(own && matches && { calc: [productLine([m.fraction, m.whole])] }),
    });
  }
  throw new EngineError('feedback mode has no finding');
}

// ---------------------------------------------------------------------------
// Reveals

const parseBar = (props: Record<string, unknown>): PartWholeModel | null => {
  const r = PartWholeBarPropsSchema.safeParse(props);
  return r.success ? partWholeModel(r.data) : null;
};

export const PART_WHOLE_REVEALS: readonly RevealRule[] = [
  {
    value: 'whole',
    note: 'the whole is written at the end of the bar',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseBar(p);
      return m ? [m.whole] : [];
    },
  },
  {
    value: 'feedback_values',
    note: 'feedback mode writes the value the student wrote and its ratio to the whole, nothing about the correct value',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseBar(p);
      return m && m.part ? [m.part, div(m.part, m.whole)] : [];
    },
  },
  {
    value: 'quantity',
    note: 'the fraction of the quantity (1/6 of 36 = 6), written once the student has placed a value',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseBar(p);
      return m && m.target ? [m.target] : [];
    },
  },
];
