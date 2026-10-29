/**
 * Pure model of SlotsPattern: the patterns of S and F over n slots with
 * exactly k S, the student's list, the help ladder, the finding and the
 * `reveals` declaration. Every number comes from the engine. No React here
 * (the guard and the tests import it).
 *
 * The help ladder never says how many patterns are missing (product owner,
 * 2026-10-27): level 1 is the same plan whatever the number missing; level 2
 * names where the first S of the first missing pattern is; level 3 is that
 * pattern. A count of free slots was dropped: a slot no listed pattern marks
 * proves that every pattern with an S there is missing.
 */
import {
  chooseLine,
  chooseSymmetryLine,
  sumLine,
} from '../../engine/calcLines';
import {
  choose,
  enumeratePatterns,
  pascalRow,
} from '../../engine/combinatorics';
import { EngineError, frac, type Fraction } from '../../engine/rational';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import { SlotsPatternPropsSchema } from './schemas';

const int = (n: number): Fraction => frac(n);

// ---------------------------------------------------------------------------
// Patterns

export const patternOf = (marks: readonly boolean[]): string =>
  marks.map(m => (m ? 'S' : 'F')).join('');

export const marksOf = (pattern: string): boolean[] =>
  [...pattern].map(c => c === 'S');

export const markedCount = (marks: readonly boolean[]): number =>
  marks.filter(Boolean).length;

/** Every pattern of n slots with k S, in reading order (SSFF first). */
export const allPatterns = (n: number, k: number): string[] =>
  enumeratePatterns(n, k);

export function missingPatterns(
  n: number,
  k: number,
  list: readonly string[],
): string[] {
  const have = new Set(list);
  return allPatterns(n, k).filter(p => !have.has(p));
}

export const isComplete = (
  n: number,
  k: number,
  list: readonly string[],
): boolean => missingPatterns(n, k, list).length === 0;

/** More patterns than the cap: the component counts and does not list. */
export const countsOnly = (n: number, k: number, listCap: number): boolean =>
  choose(n, k) > listCap;

export type AddResult =
  | { status: 'added'; list: string[] }
  | { status: 'duplicate'; of: number }
  | { status: 'wrong_count' };

/** Adds the marked pattern to the list: refused when it has not k marks, or is already there. */
export function addPattern(
  n: number,
  k: number,
  list: readonly string[],
  marks: readonly boolean[],
): AddResult {
  if (marks.length !== n || markedCount(marks) !== k) {
    return { status: 'wrong_count' };
  }
  const pattern = patternOf(marks);
  const at = list.indexOf(pattern);
  return at >= 0
    ? { status: 'duplicate', of: at }
    : { status: 'added', list: [...list, pattern] };
}

// ---------------------------------------------------------------------------
// Help ladder

export type HelpPlan =
  /** At least one is missing. Carries nothing, so it cannot tell how many. */
  | { level: 1 }
  /** A missing pattern has its first S in this slot (from 1, from the left); null when it has no S. */
  | { level: 2; slot: number | null }
  /** The first missing pattern, to fill in the slots. */
  | { level: 3; pattern: string };

export function helpPlan(
  n: number,
  k: number,
  list: readonly string[],
  level: 1 | 2 | 3,
): HelpPlan | null {
  const first = missingPatterns(n, k, list)[0];
  if (first === undefined) {
    return null;
  }
  if (level === 1) {
    return { level: 1 };
  }
  if (level === 2) {
    const at = first.indexOf('S');
    return { level: 2, slot: at < 0 ? null : at + 1 };
  }
  return { level: 3, pattern: first };
}

// ---------------------------------------------------------------------------
// Guided

/**
 * Guided mode fixes where the first marked slot goes: the slots before it
 * are empty and locked, it is marked and locked, the others are free. It must
 * leave room for the other k - 1 marks.
 */
export function guidedLocks(
  n: number,
  k: number,
  fixed: number,
): { locked: boolean[]; marks: boolean[] } {
  if (!Number.isInteger(fixed) || fixed < 0 || fixed > n - k) {
    throw new EngineError('the first marked slot must leave room for the other marks');
  }
  return {
    locked: Array.from({ length: n }, (_, i) => i <= fixed),
    marks: Array.from({ length: n }, (_, i) => i === fixed),
  };
}

// ---------------------------------------------------------------------------
// Pascal

export interface PascalCell {
  k: number;
  /** C(n,k), only once the student's list for this k is complete. */
  count: number | null;
}

export function pascalCells(
  n: number,
  lists: Readonly<Record<number, readonly string[]>>,
): PascalCell[] {
  return Array.from({ length: n + 1 }, (_, k) => ({
    k,
    count: isComplete(n, k, lists[k] ?? []) ? choose(n, k) : null,
  }));
}

// ---------------------------------------------------------------------------
// Finding

/** Consecutive adds become one token (`added:3`); at most 12 tokens. */
export function compressRoute(tokens: readonly string[]): string[] {
  const out: string[] = [];
  let run = 0;
  const flush = () => {
    if (run > 0) {
      out.push(`added:${run}`);
      run = 0;
    }
  };
  for (const t of tokens) {
    if (t === 'added') {
      run += 1;
    } else {
      flush();
      out.push(t);
    }
  }
  flush();
  return out.slice(0, 12);
}

export interface SlotsFindingState {
  /** The size of the list the student built (complete) or was shown. */
  count: number;
  flipped: boolean;
  /** build_pascal: C(n,0) ... C(n,n). */
  row: number[] | null;
}

export function slotsFinding(
  p: { n: number; k: number; mode: string },
  st: SlotsFindingState,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found' || how === 'helped';
  if (p.mode === 'build_pascal' && st.row !== null) {
    return makeFinding({
      findingId: 'slots.pascal_row',
      numbers: {
        n: String(p.n),
        ...Object.fromEntries(st.row.map((c, k) => [`c${k}`, String(c)])),
      },
      route: compressRoute(route),
      how,
      correct: own ? true : null,
      ...(own && { calc: [sumLine(st.row)] }),
    });
  }
  return makeFinding({
    findingId: 'slots.pattern_list',
    numbers: { n: String(p.n), k: String(p.k), count: String(st.count) },
    route: compressRoute(route),
    how,
    correct: own ? true : null,
    ...(own && {
      calc: [
        chooseLine(p.n, p.k),
        ...(st.flipped ? [chooseSymmetryLine(p.n, p.k)] : []),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Reveals

const parseSlots = (props: Record<string, unknown>) => {
  const r = SlotsPatternPropsSchema.safeParse(props);
  return r.success ? r.data : null;
};

export const SLOTS_PATTERN_REVEALS: readonly RevealRule[] = [
  {
    value: 'slot_shape',
    note: 'n slots are drawn and k of them are to be marked, so n, k and n - k are on screen',
    by: 'props',
    minHint: 0,
    values: p => {
      const s = parseSlots(p);
      return s ? [int(s.n), int(s.k), int(s.n - s.k)] : [];
    },
  },
  {
    value: 'pattern_count',
    note: 'the number of patterns C(n,k), written after the student has listed them all or reached the end of the ladder',
    by: 'state',
    lockedBy: () => false,
    minHint: 'ladder_end',
    values: p => {
      const s = parseSlots(p);
      return s ? [int(choose(s.n, s.k))] : [];
    },
  },
  {
    value: 'pascal_row',
    note: 'the counts C(n,0) ... C(n,n) of the Pascal row, each written once its list is complete',
    by: 'state',
    lockedBy: () => false,
    minHint: 'ladder_end',
    values: p => {
      const s = parseSlots(p);
      return s && s.mode === 'build_pascal' ? pascalRow(s.n).map(int) : [];
    },
  },
];
