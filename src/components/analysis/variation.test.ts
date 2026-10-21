import {
  cellIds,
  diagnoseVariation,
  solutionCells,
  type Cells,
} from './variation';
import { variationColumns } from './plot';

const cols = variationColumns('f_ex4', [-5, 5]);

describe('variation table cells', () => {
  it('f_ex4: two intervals and one critical point', () => {
    expect(cellIds(cols)).toEqual([
      'sign-0',
      'arrow-0',
      'sign-1',
      'arrow-1',
      'extremum-1',
    ]);
    expect(solutionCells(cols)).toEqual({
      'sign-0': '+',
      'arrow-0': 'up',
      'sign-1': '-',
      'arrow-1': 'down',
      'extremum-1': 'max',
    });
  });
});

describe('diagnoseVariation', () => {
  const right: Cells = solutionCells(cols);
  it('accepts the engine table', () => {
    const d = diagnoseVariation(right, cols);
    expect(d.isCorrect).toBe(true);
    expect(d.wrong).toEqual([]);
    expect(d.misconceptionHints).toEqual([]);
  });
  it('flags an arrow that contradicts the student own sign', () => {
    const d = diagnoseVariation({ ...right, 'arrow-1': 'up' }, cols);
    expect(d.wrong).toEqual(['arrow-1']);
    expect(d.misconceptionHints).toEqual(['sign_arrow_mismatch']);
  });
  it('flags an extremum where the student signs do not change', () => {
    const d = diagnoseVariation(
      { ...right, 'sign-1': '+', 'arrow-1': 'up' },
      cols,
    );
    expect(d.wrong.sort()).toEqual(['arrow-1', 'sign-1']);
    expect(d.misconceptionHints).toEqual(['extremum_without_sign_change']);
  });
  it('a consistent but reversed table is wrong without a hint about consistency', () => {
    const d = diagnoseVariation(
      {
        'sign-0': '-',
        'arrow-0': 'down',
        'sign-1': '+',
        'arrow-1': 'up',
        'extremum-1': 'min',
      },
      cols,
    );
    expect(d.isCorrect).toBe(false);
    expect(d.wrong).toHaveLength(5);
    expect(d.misconceptionHints).toEqual([]);
  });
  it('an empty cell is reported as missing, not as a wrong value', () => {
    const partial: Cells = { ...right };
    delete partial['extremum-1'];
    const d = diagnoseVariation(partial, cols);
    expect(d.missing).toEqual(['extremum-1']);
    expect(d.isCorrect).toBe(false);
  });
});
