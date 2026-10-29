import {
  arrangementLine,
  chooseLine,
  divisionLine,
  factorialLine,
  productLine,
  sumLine,
} from './calcLines';
import { EngineError, frac } from './rational';
import { parseLatexSubset } from '../lesson/math/latexSubset';

const lines = [
  productLine([4, 15]),
  sumLine([4, 15]),
  divisionLine(720, 6),
  chooseLine(6, 2),
  chooseLine(6, 2, 'binom'),
  arrangementLine(6, 2),
  factorialLine(6),
];

describe('calcLines: the calculation written with the student\'s own numbers, built by the engine', () => {
  it('the exercise calculations', () => {
    expect(productLine([4, 15])).toBe('4 \\times 15 = 60');
    expect(sumLine([4, 15])).toBe('4 + 15 = 19');
    expect(divisionLine(720, 6)).toBe('\\frac{720}{6} = 120');
    expect(chooseLine(6, 2)).toBe('C_{6}^{2} = 15');
    expect(chooseLine(10, 3)).toBe('C_{10}^{3} = 120');
    expect(chooseLine(6, 2, 'binom')).toBe('\\binom{6}{2} = 15');
    expect(arrangementLine(10, 3)).toBe('A_{10}^{3} = 720');
    expect(factorialLine(3)).toBe('3! = 6');
  });

  it('the result is computed from the operands, so a wrong method shows its own wrong number', () => {
    expect(divisionLine(720, 3)).toBe('\\frac{720}{3} = 240'); // the slip, not 120
    expect(divisionLine(24, 3)).toBe('\\frac{24}{3} = 8');
    expect(productLine([4, 6])).toBe('4 \\times 6 = 24');
    expect(productLine([4, 12])).toBe('4 \\times 12 = 48');
    expect(sumLine([2, 2])).toBe('2 + 2 = 4');
  });

  it('fractions and negatives', () => {
    expect(divisionLine(60, 120)).toBe('\\frac{60}{120} = \\frac{1}{2}');
    expect(productLine([frac(1, 2), frac(1, 2)])).toBe(
      '\\frac{1}{2} \\times \\frac{1}{2} = \\frac{1}{4}',
    );
    expect(sumLine([frac(-1, 2), 1])).toBe('-\\frac{1}{2} + 1 = \\frac{1}{2}');
    expect(productLine([36, frac(1, 6)])).toBe(
      '36 \\times \\frac{1}{6} = 6',
    );
  });

  it('every line parses with the native math renderer subset', () => {
    for (const l of lines) {
      expect(() => parseLatexSubset(l)).not.toThrow();
    }
  });

  it('refuses what it cannot write exactly', () => {
    expect(() => divisionLine(5, 0)).toThrow(EngineError);
    expect(() => productLine([])).toThrow(EngineError);
    expect(() => productLine([4])).toThrow(EngineError);
    expect(() => chooseLine(2, 5)).not.toThrow(); // C_2^5 = 0
    expect(chooseLine(2, 5)).toBe('C_{2}^{5} = 0');
    expect(() => factorialLine(19)).toThrow(EngineError);
    expect(() => chooseLine(-1, 2)).toThrow(EngineError);
  });
});
