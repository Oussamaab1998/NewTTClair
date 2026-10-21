/**
 * Variation table task logic (no React): cells the student fills, the
 * engine's answer, and a diagnosis with misconception hints.
 */
import type { Sign } from '../../engine/analysis';
import type { VariationColumns } from './plot';

export type CellValue = '+' | '-' | 'up' | 'down' | 'max' | 'min' | 'none';
export type Cells = Partial<Record<string, CellValue>>;

/** Tap order of each kind of cell. */
export const CYCLE: Record<'sign' | 'arrow' | 'extremum', CellValue[]> = {
  sign: ['+', '-'],
  arrow: ['up', 'down'],
  extremum: ['max', 'min', 'none'],
};

export const kindOf = (id: string) =>
  id.split('-')[0] as 'sign' | 'arrow' | 'extremum';

/** sign-i / arrow-i per interval, extremum-j per inner point (j = 1..n-1). */
export function cellIds(cols: VariationColumns): string[] {
  const ids: string[] = [];
  cols.signs.forEach((_, i) => {
    ids.push(`sign-${i}`, `arrow-${i}`);
    if (i > 0) {
      ids.push(`extremum-${i}`);
    }
  });
  return ids;
}

const arrowOf = (s: Sign): CellValue => (s === '+' ? 'up' : 'down');
const extremumOf = (
  before: CellValue | undefined,
  after: CellValue | undefined,
) =>
  before === '+' && after === '-'
    ? 'max'
    : before === '-' && after === '+'
    ? 'min'
    : 'none';

export function solutionCells(cols: VariationColumns): Cells {
  const out: Cells = {};
  cols.signs.forEach((s, i) => {
    out[`sign-${i}`] = s;
    out[`arrow-${i}`] = arrowOf(s);
    if (i > 0) {
      out[`extremum-${i}`] = extremumOf(cols.signs[i - 1], s);
    }
  });
  return out;
}

export interface VariationDiagnosis {
  isCorrect: boolean;
  wrong: string[];
  missing: string[];
  misconceptionHints: string[];
}

export function diagnoseVariation(
  cells: Cells,
  cols: VariationColumns,
): VariationDiagnosis {
  const solution = solutionCells(cols);
  const ids = cellIds(cols);
  const missing = ids.filter(id => cells[id] === undefined);
  const wrong = ids.filter(
    id => cells[id] !== undefined && cells[id] !== solution[id],
  );
  const hints = new Set<string>();
  cols.signs.forEach((_, i) => {
    const s = cells[`sign-${i}`];
    const a = cells[`arrow-${i}`];
    if (s && a && a !== arrowOf(s as Sign)) {
      hints.add('sign_arrow_mismatch');
    }
    const e = cells[`extremum-${i}`];
    if (i > 0 && (e === 'max' || e === 'min')) {
      const own = extremumOf(cells[`sign-${i - 1}`], s);
      if (own === 'none' && cells[`sign-${i - 1}`] && s) {
        hints.add('extremum_without_sign_change');
      }
    }
  });
  return {
    isCorrect: missing.length === 0 && wrong.length === 0,
    wrong,
    missing,
    misconceptionHints: [...hints],
  };
}
