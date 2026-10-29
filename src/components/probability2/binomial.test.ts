import { frac, type Fraction } from '../../engine/rational';
import { ratToString } from '../../engine/rationalFormat';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import {
  BINOMIAL_EXPLORER_REVEALS,
  barShares,
  binomialFinding,
  binomialModel,
  binomialTerms,
  momentLines,
  termLine,
} from './binomial';
import { BinomialExplorerPropsSchema } from './schemas';

const f = (n: number, d = 1): Fraction => frac(n, d);
const model = (p: Record<string, unknown>) => binomialModel(BinomialExplorerPropsSchema.parse(p));
const base = {
  n: { min: 2, max: 8, init: 5 },
  p: { min: '1/10', max: '9/10', step: '1/10', init: '3/10' },
};
const is = (n: number, d = 1) => (x: readonly [number, number]) => x[0] === n && x[1] === d;

describe('binomialTerms: every term exact', () => {
  it('B(3, 1/2): 1/8, 3/8, 3/8, 1/8', () => {
    expect(binomialTerms(3, f(1, 2)).map(t => ratToString(t.p))).toEqual(['1/8', '3/8', '3/8', '1/8']);
  });

  it('B(5, 3/10): the terms add up to 1', () => {
    const ts = binomialTerms(5, f(3, 10));
    expect(ts.map(t => ratToString(t.p))).toEqual([
      '16807/100000',
      '7203/20000',
      '3087/10000',
      '1323/10000',
      '567/20000',
      '243/100000',
    ]);
  });
});

describe('termLine: C(n,k) p^k q^(n-k) with the actual numbers', () => {
  it('k = 2 of B(5, 3/10)', () => {
    const line = termLine(5, 2, f(3, 10));
    expect(line).toBe('C_{5}^{2} \\times (\\frac{3}{10})^{2} \\times (\\frac{7}{10})^{3} = \\frac{3087}{10000}');
    expect(() => parseLatexSubset(line)).not.toThrow();
  });

  it('an exponent of 0 or 1 is written out the same way (no hidden step)', () => {
    expect(() => parseLatexSubset(termLine(5, 0, f(3, 10)))).not.toThrow();
    expect(() => parseLatexSubset(termLine(5, 5, f(3, 10)))).not.toThrow();
  });
});

describe('momentLines: np and npq, never a sum', () => {
  it('B(5, 3/10): np = 3/2, npq = 21/20', () => {
    expect(momentLines(5, f(3, 10))).toEqual([
      '5 \\times \\frac{3}{10} = \\frac{3}{2}',
      '5 \\times \\frac{3}{10} \\times \\frac{7}{10} = \\frac{21}{20}',
    ]);
  });
});

describe('barShares: heights relative to the largest term (layout only)', () => {
  it('the largest bar fills the chart', () => {
    const s = barShares(binomialTerms(4, f(1, 2)));
    expect(Math.max(...s)).toBe(1);
    expect(s[2]).toBe(1);
    expect(s[0]).toBeCloseTo(1 / 6);
  });
});

describe('binomialModel', () => {
  it('a grid of n and of p', () => {
    const m = model(base);
    expect(m.ns).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(m.ps).toHaveLength(9);
    expect(m.initN).toBe(5);
    expect(m.initP).toBe(2);
  });

  it('a fixed p', () => {
    const m = model({ n: { min: 1, max: 6, init: 3 }, p: { fixed: '1/6' } });
    expect(m.ps).toEqual([f(1, 6)]);
    expect(m.fixedP).toBe(true);
  });
});

describe('the finding', () => {
  const m = model(base);

  it('found: n, p, the two bars, the mean and the variance as np and npq, with the engine lines', () => {
    const fd = binomialFinding(m, { n: 5, pIndex: 2, taps: [2, 3] }, ['bar:2', 'bar:3'], 'found');
    expect(FindingPayloadSchema.safeParse(fd).success).toBe(true);
    expect(fd).toMatchObject({
      findingId: 'binomial.formula',
      numbers: { n: '5', p: '3/10', k1: '2', k2: '3', mean: '3/2', variance: '21/20' },
      how: 'found',
      correct: null,
    });
    expect(fd.calc).toHaveLength(4);
  });

  it('skipped: no calculation', () => {
    const fd = binomialFinding(m, { n: 5, pIndex: 2, taps: [] }, ['reveal'], 'skipped');
    expect(fd.calc).toBeUndefined();
    expect(fd.how).toBe('skipped');
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(BINOMIAL_EXPLORER_REVEALS)).toBe(true);
  });

  it('no number is on screen at the start: by props the bars are shapes only', () => {
    const byProps = BINOMIAL_EXPLORER_REVEALS.filter(r => r.by === 'props');
    expect(revealedByRules(byProps, base, undefined, is(1, 2))).toBeNull();
    expect(revealedByRules(byProps, base, undefined, is(3087, 10000))).toBeNull();
  });

  it('the terms and np, npq are by state (after a tap or a toggle)', () => {
    const term = revealedByRules(BINOMIAL_EXPLORER_REVEALS, base, undefined, is(3087, 10000));
    expect(term?.value).toBe('terms');
    expect(term?.by).toBe('state');
    const mean = revealedByRules(BINOMIAL_EXPLORER_REVEALS, base, undefined, is(3, 2));
    expect(mean?.value).toBe('mean_variance');
  });

  it('invalid props reveal nothing', () => {
    expect(revealedByRules(BINOMIAL_EXPLORER_REVEALS, { n: 1 }, undefined, is(3, 2))).toBeNull();
  });
});
