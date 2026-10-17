import {
  LatexSubsetError,
  parseLatexSubset,
  type MathNode,
} from './latexSubset';

const text = (v: string, italic = false): MathNode => ({
  t: 'text',
  v,
  italic,
});

describe('parseLatexSubset', () => {
  it('spaces relations and binary operators, uses a real minus sign', () => {
    expect(parseLatexSubset('1-3=-2')).toEqual(text('1 − 3 = −2'));
  });

  it('marks single letters italic and keeps digits upright', () => {
    expect(parseLatexSubset('2x')).toEqual({
      t: 'row',
      children: [text('2'), text('x', true)],
    });
  });

  it('parses fractions with nested scripts', () => {
    expect(parseLatexSubset('\\frac{e^{x}}{1+e^{2x}}')).toEqual({
      t: 'frac',
      num: { t: 'scripts', base: text('e', true), sup: text('x', true) },
      den: {
        t: 'row',
        children: [
          text('1 + '),
          {
            t: 'scripts',
            base: text('e', true),
            sup: { t: 'row', children: [text('2'), text('x', true)] },
          },
        ],
      },
    });
  });

  it('puts limit subscripts under lim', () => {
    const node = parseLatexSubset('\\lim_{x \\to +\\infty} f(x) = 0');
    expect(node.t).toBe('row');
    const first = node.t === 'row' ? node.children[0] : undefined;
    expect(first).toEqual({
      t: 'limits',
      base: text('lim'),
      under: { t: 'row', children: [text('x', true), text(' → +∞')] },
    });
  });

  it('supports the notation of exercises 2 and 4', () => {
    const samples = [
      'P(B) = 1 - P(\\bar{B}) = 1 - \\frac{3}{10} = \\frac{7}{10}',
      '\\binom{5}{2} = 10',
      'V(X) = E(X^2) - E(X)^2 = \\frac{89}{100}',
      "f'(x) = \\frac{(1 - e^{2x})e^{x}}{(1 + e^{2x})^2}",
      'F(x) = \\int_0^{\\ln x} f(t)\\,dt',
      '\\left( \\frac{3}{10} \\right)^{n-1}',
      'x \\in \\mathbb{R}',
      'n \\geq \\frac{50}{7} \\approx 7.14',
      'P(X = -2) = \\text{?}',
    ];
    for (const s of samples) {
      expect(() => parseLatexSubset(s)).not.toThrow();
    }
  });

  it('rejects unsupported or malformed input with LatexSubsetError', () => {
    for (const bad of [
      '\\begin{matrix}',
      '\\frac{1}',
      '{x',
      'x}',
      'x^^2',
      '^2',
      '\\',
    ]) {
      expect(() => parseLatexSubset(bad)).toThrow(LatexSubsetError);
    }
  });
});
