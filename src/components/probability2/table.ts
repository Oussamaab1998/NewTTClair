/**
 * Pure model of VariableTable: the outcomes of an experiment (S/F patterns of
 * n trials, or the draws of a small urn), the value of each (computed by the
 * engine, never authored), the law of the STUDENT's own mapping, and the four
 * student-triggered checks with their diagnoses. A check never says the right
 * counts: it says what is missing (named only after the second press or at
 * hint level 2), the student's own sum, that the law is not symmetric, or
 * which values have the wrong number of outcomes. No React.
 */
import { sumLine } from '../../engine/calcLines';
import { frac, type Fraction } from '../../engine/rational';
import { isSymmetric, patternWeight, type Dist } from '../../engine/distribution';
import { listBoxes } from '../../engine/grouping';
import { choose } from '../../engine/combinatorics';
import { parseRat, sameRat, sumRat } from '../../engine/rationalFormat';
import type { Ball } from '../../engine/probability';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import { VariableTablePropsSchema, type VariableTableProps } from './schemas';

export type CheckId = 'all_used' | 'sum' | 'symmetry' | 'law';

export interface TableItem {
  id: string;
  label: string;
  /** What the engine's rule gives (the number of S, the number of reds). Never shown before the law is right. */
  value: number;
  weight: Fraction;
}

export interface TableModel {
  items: TableItem[];
  /** 0 .. the largest value. */
  values: number[];
  trueCounts: number[];
  trueProbs: Fraction[];
  /** The true law is symmetric (so the symmetry check applies). */
  symmetric: boolean;
  checks: CheckId[];
}

const sumOf = sumRat;

export function tableModel(p: VariableTableProps): TableModel {
  let items: TableItem[];
  if (p.outcomes.kind === 'trials') {
    const n = p.outcomes.n;
    const total = 2 ** n;
    const prob = p.weights === 'uniform' ? null : parseRat(p.weights.p)!;
    items = Array.from({ length: total }, (_unused, mask) => {
      const label = Array.from({ length: n }, (_slot, j) =>
        Math.floor(mask / 2 ** (n - 1 - j)) % 2 === 1 ? 'F' : 'S',
      ).join('');
      return {
        id: label,
        label,
        value: label.split('S').length - 1,
        weight: prob === null ? frac(1, total) : patternWeight(label, prob),
      };
    });
  } else {
    const { reds, blacks, k } = p.outcomes;
    const balls: Ball[] = [
      ...Array.from({ length: reds }, (_, i) => ({ id: `r${i + 1}`, value: 1 })),
      ...Array.from({ length: blacks }, (_, i) => ({ id: `n${i + 1}`, value: 0 })),
    ];
    const boxes = listBoxes(balls, k);
    items = boxes.map(b => ({
      id: b.key,
      label: b.ballIds.map(id => id.toUpperCase()).join(' '),
      value: b.ballIds.filter(id => id.startsWith('r')).length,
      weight: frac(1, boxes.length),
    }));
  }
  const top = Math.max(...items.map(i => i.value));
  const values = Array.from({ length: top + 1 }, (_, v) => v);
  const trueCounts = values.map(v => items.filter(i => i.value === v).length);
  const trueProbs = values.map(v =>
    sumOf(items.filter(i => i.value === v).map(i => i.weight)),
  );
  const symmetric = isSymmetric(values.map((value, i) => ({ value, p: trueProbs[i]! })));
  return {
    items,
    values,
    trueCounts,
    trueProbs,
    symmetric,
    checks:
      p.checks ??
      (symmetric
        ? ['all_used', 'sum', 'symmetry', 'law']
        : ['all_used', 'sum', 'law']),
  };
}

export interface StudentLaw {
  counts: number[];
  probs: Fraction[];
  /** The sum of the probabilities of the outcomes the student placed. */
  sum: Fraction;
  unassigned: number[];
}

/** The law of the student's own mapping (outcome index -> value). */
export function studentLaw(
  m: TableModel,
  assign: Readonly<Record<number, number>>,
): StudentLaw {
  const counts = m.values.map(() => 0);
  const weights: Fraction[][] = m.values.map(() => []);
  const unassigned: number[] = [];
  m.items.forEach((it, i) => {
    const v = assign[i];
    if (v === undefined || v < 0 || v >= m.values.length) {
      unassigned.push(i);
      return;
    }
    counts[v] = counts[v]! + 1;
    weights[v]!.push(it.weight);
  });
  const probs = weights.map(w => (w.length === 0 ? frac(0) : sumOf(w)));
  return { counts, probs, sum: sumOf(probs), unassigned };
}

export interface CheckResult {
  check: CheckId;
  passed: boolean;
  detail: 'ok' | 'missing' | 'sum_not_one' | 'not_symmetric' | 'values_wrong';
  /** all_used: the first outcome with no value, only on the second press or at hint level 2. */
  named?: number;
  /** sum: the student's own sum. */
  sum?: Fraction;
  /** law: the values whose number of outcomes is wrong (never the right numbers). */
  wrongValues?: number[];
}

export function runCheck(
  m: TableModel,
  assign: Readonly<Record<number, number>>,
  check: CheckId,
  presses: number,
  hintLevel: number,
): CheckResult {
  const law = studentLaw(m, assign);
  switch (check) {
    case 'all_used': {
      if (law.unassigned.length === 0) {
        return { check, passed: true, detail: 'ok' };
      }
      return {
        check,
        passed: false,
        detail: 'missing',
        ...((presses >= 2 || hintLevel >= 2) && { named: law.unassigned[0]! }),
      };
    }
    case 'sum':
      return sameRat(law.sum, frac(1))
        ? { check, passed: true, detail: 'ok', sum: law.sum }
        : { check, passed: false, detail: 'sum_not_one', sum: law.sum };
    case 'symmetry': {
      const dist: Dist = m.values.map((value, i) => ({ value, p: law.probs[i]! }));
      return isSymmetric(dist)
        ? { check, passed: true, detail: 'ok' }
        : { check, passed: false, detail: 'not_symmetric' };
    }
    case 'law': {
      if (law.unassigned.length > 0) {
        return { check, passed: false, detail: 'missing' };
      }
      const wrongValues = m.values.filter(v => law.counts[v] !== m.trueCounts[v]);
      return wrongValues.length === 0
        ? { check, passed: true, detail: 'ok' }
        : { check, passed: false, detail: 'values_wrong', wrongValues };
    }
  }
}

export function tableFinding(
  m: TableModel,
  assign: Readonly<Record<number, number>>,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found' || how === 'helped';
  const counts = own ? studentLaw(m, assign).counts : m.trueCounts;
  return makeFinding({
    findingId: 'table.law',
    numbers: {
      outcomes: String(m.items.length),
      ...Object.fromEntries(counts.map((c, v) => [`c${v}`, String(c)])),
    },
    route: route.slice(0, 12),
    how,
    correct: own ? true : null,
    ...(own && counts.length >= 2 && { calc: [sumLine(counts)] }),
  });
}

/** The number of outcomes of a small urn: C(n, k). */
export const urnOutcomes = (reds: number, blacks: number, k: number): number =>
  choose(reds + blacks, k);

// ---------------------------------------------------------------------------
// Reveals

const parseTable = (props: Record<string, unknown>): TableModel | null => {
  const r = VariableTablePropsSchema.safeParse(props);
  return r.success ? tableModel(r.data) : null;
};

export const VARIABLE_TABLE_REVEALS: readonly RevealRule[] = [
  {
    value: 'outcome_rows',
    note: 'every outcome is a row, so the number of outcomes can be counted on screen',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseTable(p);
      return m ? [frac(m.items.length)] : [];
    },
  },
  {
    value: 'law_counts',
    note: 'the number of outcomes of each value and its probability: the student\'s own law is drawn as they place outcomes, and equals the true law once they are right',
    by: 'state',
    lockedBy: () => false,
    minHint: 'ladder_end',
    values: p => {
      const m = parseTable(p);
      return m ? [...m.trueCounts.map(c => frac(c)), ...m.trueProbs] : [];
    },
  },
];
