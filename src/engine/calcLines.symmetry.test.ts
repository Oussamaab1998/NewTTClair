import { chooseSymmetryLine } from './calcLines';
import { EngineError } from './rational';
import { parseLatexSubset } from '../lesson/math/latexSubset';

describe('chooseSymmetryLine: choosing k to take is choosing n - k to leave', () => {
  it('C(6,2) = C(6,4) = 15', () => {
    expect(chooseSymmetryLine(6, 2)).toBe('C_{6}^{2} = C_{6}^{4} = 15');
  });

  it('C(7,3) = C(7,4) = 35, and the flipped side first when k is the larger', () => {
    expect(chooseSymmetryLine(7, 3)).toBe('C_{7}^{3} = C_{7}^{4} = 35');
    expect(chooseSymmetryLine(7, 4)).toBe('C_{7}^{4} = C_{7}^{3} = 35');
  });

  it('parses with the native math renderer and holds no Arabic (the finding rule for calc)', () => {
    expect(() => parseLatexSubset(chooseSymmetryLine(6, 2))).not.toThrow();
    expect(chooseSymmetryLine(6, 2)).not.toMatch(/[؀-ۿ]/);
  });

  it('refuses k = n - k (nothing changes when the S and the F swap) and k outside 0..n', () => {
    expect(() => chooseSymmetryLine(4, 2)).toThrow(EngineError);
    expect(() => chooseSymmetryLine(4, 5)).toThrow(EngineError);
    expect(() => chooseSymmetryLine(4, -1)).toThrow(EngineError);
  });
});
