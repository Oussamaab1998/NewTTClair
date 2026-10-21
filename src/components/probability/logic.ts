/**
 * Pure logic behind the probability components: labels, selection diagnosis,
 * law tables, sum check and E / E(X²) / V formulas. No React; every number
 * comes from src/engine (CLAUDE.md hard rule 1).
 */
import { fractionToLatex, parseNumeric } from '../../engine/format';
import {
  enumerateOutcomes,
  evaluateValueFn,
  expectation,
  law,
  satisfies,
  secondMoment,
  variance,
  type Ball,
  type Draw,
  type EventContext,
  type EventSpec,
  type Outcome,
  type ValueFn,
} from '../../engine/probability';
import { add, equals, frac, mul, type Fraction } from '../../engine/rational';
import type { MomentStep } from './schemas';

export interface ExperimentProps {
  balls: Ball[];
  draw: Draw;
  k: number;
}

export const outcomesOf = (p: ExperimentProps): Outcome[] =>
  enumerateOutcomes(p.balls, p.draw, p.k);

/** The real minus sign (U+2212), as in the editor and the formulas. */
export const MINUS = '\u2212';
const PRIME = '′';

/** Integer with a real minus sign (−1), for chips and readouts. */
export const formatInt = (n: number): string =>
  n < 0 ? `${MINUS}${Math.abs(n)}` : String(n);

/** Fraction as plain text with a real minus sign (−1/10). */
export function formatFraction([num, den]: Fraction): string {
  const n = formatInt(num);
  return den === 1 ? n : `${n}/${den}`;
}

/**
 * Ball id -> label. With `markDuplicates`, the second ball carrying a value
 * gets a prime (0, 0′), the third two primes, so equal values stay distinguishable.
 */
export function ballLabels(
  balls: readonly Ball[],
  markDuplicates: boolean,
): Map<string, string> {
  const seen = new Map<number, number>();
  const out = new Map<string, string>();
  for (const b of balls) {
    const n = seen.get(b.value) ?? 0;
    seen.set(b.value, n + 1);
    out.set(b.id, formatInt(b.value) + (markDuplicates ? PRIME.repeat(n) : ''));
  }
  return out;
}

/** "{−1 ; 2}" for a simultaneous draw (unordered), "(−1 ; 2)" for ordered draws. */
export function outcomeLabel(
  o: Outcome,
  labels: ReadonlyMap<string, string>,
  draw: Draw,
): string {
  const inner = o.ballIds.map(id => labels.get(id) ?? id).join(' ; ');
  return draw === 'simultaneous' ? `{${inner}}` : `(${inner})`;
}

/** Normalizes -0 to 0 so values can be used as keys. */
export const valueOf = (fn: ValueFn, o: Outcome): number =>
  evaluateValueFn(fn, o) + 0;

// ---------------------------------------------------------------------------
// EventPicker

export interface SelectionDiagnosis {
  selected: string[];
  /** Outcome ids that satisfy the event (the engine's answer). */
  correct: string[];
  missed: string[];
  extra: string[];
  isCorrect: boolean;
  /** What the student counted: selected / possible, not reduced. */
  fraction: [number, number];
  misconceptionHints: string[];
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every(x => b.includes(x));

/** Every ball of the outcome carries the same value, and that value is on several balls. */
function isDuplicateValueOutcome(o: Outcome): boolean {
  return (
    o.balls.length > 1 && o.balls.every(b => b.value === o.balls[0]!.value)
  );
}

/**
 * Compares a selection with the event. Hints name patterns from
 * COMPONENTS_PROBABILITY.md §3 (extend with real data):
 * - selects_all: everything selected while the event is a strict subset.
 * - selects_complement: exactly the outcomes NOT in the event.
 * - misses_duplicate_value_pair: only pairs like {0 ; 0′} are missing.
 */
export function diagnoseSelection(
  selectedIds: readonly string[],
  outcomes: readonly Outcome[],
  event: EventSpec,
  ctx: EventContext = {},
): SelectionDiagnosis {
  const known = new Set(outcomes.map(o => o.id));
  // Outcome order, not tap order, so the payload is stable.
  const selected = outcomes
    .map(o => o.id)
    .filter(id => selectedIds.includes(id) && known.has(id));
  const correct = outcomes.filter(o => satisfies(event, o, ctx)).map(o => o.id);
  const missed = correct.filter(id => !selected.includes(id));
  const extra = selected.filter(id => !correct.includes(id));
  const isCorrect = missed.length === 0 && extra.length === 0;

  const hints: string[] = [];
  if (!isCorrect) {
    const complement = outcomes
      .map(o => o.id)
      .filter(id => !correct.includes(id));
    if (
      selected.length === outcomes.length &&
      correct.length < outcomes.length
    ) {
      hints.push('selects_all');
    } else if (selected.length > 0 && sameSet(selected, complement)) {
      hints.push('selects_complement');
    } else if (
      extra.length === 0 &&
      missed.length > 0 &&
      missed.every(id =>
        isDuplicateValueOutcome(outcomes.find(o => o.id === id)!),
      )
    ) {
      hints.push('misses_duplicate_value_pair');
    }
  }
  return {
    selected,
    correct,
    missed,
    extra,
    isCorrect,
    fraction: [selected.length, outcomes.length],
    misconceptionHints: hints,
  };
}

// ---------------------------------------------------------------------------
// LawBuilder

export interface LawRowView {
  value: number;
  outcomeIds: string[];
  p: Fraction;
}

export function lawRows(p: ExperimentProps, valueFn: ValueFn): LawRowView[] {
  return law(valueFn, outcomesOf(p)).map(r => ({
    value: r.value,
    outcomeIds: r.outcomes.map(o => o.id),
    p: r.p,
  }));
}

export type CellCheck =
  | { ok: false; reason: 'syntax' | 'not_a_number' }
  | { ok: true; value: Fraction; correct: boolean };

/** A typed cell, checked exactly (1/10 = 0,1 = 2/20). */
export function checkCell(raw: string, expected: Fraction): CellCheck {
  const parsed = parseNumeric(raw);
  if (!parsed.ok) {
    return parsed;
  }
  return {
    ok: true,
    value: parsed.value,
    correct: equals(parsed.value, expected),
  };
}

export const sumFractions = (fs: readonly Fraction[]): Fraction =>
  fs.reduce<Fraction>((s, f) => add(s, f), [0, 1]);

export interface LawTableState {
  /** Keyed by value (String(value)): the student's exact entry. */
  cells: Record<string, Fraction>;
}

export interface LawCheck {
  table: { value: number; entered: Fraction | null; correct: boolean }[];
  sum: Fraction;
  sumIsOne: boolean;
  complete: boolean;
  correctCells: number[];
  wrongCells: number[];
}

export function checkLaw(
  rows: readonly LawRowView[],
  cells: Readonly<Record<string, Fraction>>,
): LawCheck {
  const table = rows.map(r => {
    const entered = cells[String(r.value)] ?? null;
    return {
      value: r.value,
      entered,
      correct: entered !== null && equals(entered, r.p),
    };
  });
  const entered = table
    .map(t => t.entered)
    .filter((e): e is Fraction => e !== null);
  const sum = sumFractions(entered);
  return {
    table,
    sum,
    sumIsOne: equals(sum, [1, 1]),
    complete: entered.length === rows.length,
    correctCells: table.filter(t => t.correct).map(t => t.value),
    wrongCells: table
      .filter(t => t.entered !== null && !t.correct)
      .map(t => t.value),
  };
}

/** Probability of a value from the outcomes assigned to it (assign_outcomes mode). */
export const countFraction = (count: number, total: number): Fraction =>
  frac(count, total);

// ---------------------------------------------------------------------------
// LawChart

export interface MomentView {
  step: MomentStep;
  /** Left side, e.g. "E(X)". */
  name: string;
  /** Expanded sum, one LaTeX line (Σ x·p with the actual numbers). */
  expanded: string;
  value: Fraction;
  decimal: number;
}

const NAMES: Record<MomentStep, string> = {
  E: 'E(X)',
  E2: 'E(X^2)',
  V: 'V(X)',
};

const factor = (x: number) => (x < 0 ? `(${x})` : String(x));

/** E(X), E(X²), V(X) with their expanded formulas, all exact. */
export function moments(
  rows: readonly { value: number; p: Fraction }[],
): Record<MomentStep, MomentView> {
  const E = expectation(rows);
  const E2 = secondMoment(rows);
  const V = variance(rows);
  const terms = (f: (x: number) => string) =>
    rows.map(r => `${f(r.value)} \\times ${fractionToLatex(r.p)}`).join(' + ');
  return {
    E: {
      step: 'E',
      name: NAMES.E,
      expanded: terms(factor),
      value: E.fraction,
      decimal: E.decimal,
    },
    E2: {
      step: 'E2',
      name: NAMES.E2,
      expanded: terms(x => `${factor(x)}^2`),
      value: E2.fraction,
      decimal: E2.decimal,
    },
    V: {
      step: 'V',
      name: NAMES.V,
      expanded: `${fractionToLatex(E2.fraction)} - \\left(${fractionToLatex(
        E.fraction,
      )}\\right)^2`,
      value: V.fraction,
      decimal: V.decimal,
    },
  };
}

/** x·p contributions (for the E marker and the readout). */
export const contribution = (value: number, p: Fraction): Fraction =>
  mul(frac(value), p);

/** Decimal with a French comma (0,89; −0,1). Exact for these denominators up to 6 digits. */
export function frenchDecimal(x: number): string {
  const s = String(Math.round(x * 1e6) / 1e6).replace('.', ',');
  return s.startsWith('-') ? `${MINUS}${s.slice(1)}` : s;
}

/** Decimal as LaTeX with a French comma: -0.1 -> "-0{,}1". */
export const decimalLatex = (x: number): string =>
  String(Math.round(x * 1e6) / 1e6).replace('.', '{,}');

/** How a draw's value is obtained, e.g. "(−1) × 2 = −2" for a product. */
export function valueExpression(fn: ValueFn, o: Outcome): string {
  const v = formatInt(valueOf(fn, o));
  const parts = o.balls.map(b =>
    b.value < 0 ? `(${formatInt(b.value)})` : formatInt(b.value),
  );
  if (fn === 'product' && parts.length > 1) {
    return `${parts.join(' × ')} = ${v}`;
  }
  if (fn === 'sum' && parts.length > 1) {
    return `${parts.join(' + ')} = ${v}`;
  }
  return v;
}
