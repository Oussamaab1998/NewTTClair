import { numericDerivative } from './analysis';
import { generateExample, EXAMPLE_TEMPLATES } from './examples';
import { evaluateReal, parseExpression } from './expression';
import { parseLatexSubset } from '../lesson/math/latexSubset';

const fnOf = (expr: string) => {
  const r = parseExpression(expr);
  if (!r.ok) {
    throw new Error(expr);
  }
  return (x: number) => evaluateReal(r.ast, { x });
};

describe('generateExample', () => {
  it('is deterministic per seed', () => {
    for (const id of EXAMPLE_TEMPLATES) {
      expect(generateExample(id, 7)).toEqual(generateExample(id, 7));
    }
  });
  it('quotient_linear: the final derivative matches the numeric derivative', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const ex = generateExample('quotient_linear', seed);
      const h = fnOf(ex.exprs.f);
      const hp = fnOf(ex.exprs.answer);
      const { c, d } = ex.params as Record<string, number>;
      for (const x of [-2.5, -0.3, 0, 0.7, 3]) {
        if (Math.abs(c! * x + d!) < 0.2) {
          continue;
        }
        expect(numericDerivative(h, x)).toBeCloseTo(hp(x), 6);
      }
    }
  });
  it('quotient_linear: never a constant function (ad - bc != 0)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { a, b, c, d } = generateExample('quotient_linear', seed)
        .params as Record<string, number>;
      expect(a! * d! - b! * c!).not.toBe(0);
    }
  });
  it('parity_exp: the verdict agrees with g(-x) vs g(x) at sample points', () => {
    const seen = new Set<boolean>();
    for (let seed = 1; seed <= 40; seed++) {
      const ex = generateExample('parity_exp', seed);
      const g = fnOf(ex.exprs.f);
      const even = [0.3, 1, 2].every(x => Math.abs(g(-x) - g(x)) < 1e-12);
      expect(ex.even).toBe(even);
      seen.add(even);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });
  it('every line renders with the native math renderer', () => {
    for (const id of EXAMPLE_TEMPLATES) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const line of generateExample(id, seed).lines) {
          expect(() => parseLatexSubset(line)).not.toThrow();
        }
      }
    }
  });
  it('writes coefficients without 1x or +-', () => {
    const lines = Array.from({ length: 40 }, (_, i) =>
      generateExample('quotient_linear', i + 1).lines.join(' '),
    ).join(' ');
    expect(lines).not.toMatch(/(^|[^0-9])1x|\+-|-\+/);
  });
});
