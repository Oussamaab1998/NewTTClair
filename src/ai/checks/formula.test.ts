import { checkFormula } from './formula';

// bac2022c-sc-ex2 Question 3a: the law of X, n trials, p = 1/2.
const LAW = 'C(n,k)*(1/2)^n';
const NK = ['n', 'k'] as const;
const N = ['n'] as const;

describe('checkFormula: equivalent ways of writing', () => {
  it.each([
    'C(n,k)*(1/2)^n',
    'C(n,k)/2^n',
    '(1/2)^k*(1/2)^(n-k)*C(n,k)',
    'C(n;k)×(1/2)^n',
    'C_n^k*(1/2)^n',
    'C(n,k)·0,5^n',
    'C(n,k)(1/2)^n',
    'P(X=k)=C(n,k)×(1/2)^n',
    'p(X=k) = C(n,k)/2^n',
  ])('the law of X: %s', raw => {
    const v = checkFormula(raw, LAW, NK);
    expect(v).toMatchObject({
      readable: true,
      equivalent: true,
      counterexample: null,
    });
    // n = 2..12 and k = 0..n.
    expect(v.tested).toBe(88);
    expect(v.usedLetters).toEqual(['k', 'n']);
  });

  it('keeps a leading label apart', () => {
    expect(checkFormula('P(X=k)=C(n,k)/2^n', LAW, NK).label).toBe('P(X=k)');
    expect(checkFormula('E(X)=n/2', 'n/2', N).label).toBe('E(X)');
    expect(checkFormula('n/2', 'n/2', N).label).toBeNull();
  });

  it.each([
    ['n/2', 'n/2'],
    ['n*1/2', 'n/2'],
    ['n×0,5', 'n/2'],
    ['2n/4', 'n/2'],
    ['E(X)=n*1/2=n/2', 'n/2'],
    ['n/4', 'n/4'],
    ['n*(1/2)*(1/2)', 'n/4'],
    ['n×1/4', 'n/4'],
    ['V(X) = n·1/4', 'n/4'],
    ['n*1/2*(1-1/2)', 'n/4'],
  ])('the moments of X: %s = %s', (raw, ref) => {
    expect(checkFormula(raw, ref, N)).toMatchObject({
      readable: true,
      equivalent: true,
      tested: 11,
    });
  });

  it('reads n glued to C( as a product', () => {
    expect(checkFormula('nC(n,1)', 'n*n', N).equivalent).toBe(true);
  });
});

describe('checkFormula: slips give a counterexample at his own point', () => {
  it('C(n,k)/2^k is not the law', () => {
    expect(checkFormula('C(n,k)/2^k', LAW, NK)).toEqual({
      readable: true,
      label: null,
      equivalent: false,
      tested: 1,
      counterexample: { n: 2, k: 0, his: '1', expected: '1/4' },
      usedLetters: ['k', 'n'],
    });
  });

  it('one sequence (1/2)^n is not the law (the count is missing)', () => {
    expect(checkFormula('(1/2)^n', LAW, NK)).toMatchObject({
      equivalent: false,
      counterexample: { n: 2, k: 1, his: '1/4', expected: '1/2' },
    });
  });

  it('n^2/4 is not the variance', () => {
    expect(checkFormula('n^2/4', 'n/4', N)).toMatchObject({
      equivalent: false,
      counterexample: { n: 2, his: '1', expected: '1/2' },
    });
  });

  it('the mean of one trial is not the mean of n trials', () => {
    expect(checkFormula('1/2', 'n/2', N)).toMatchObject({
      equivalent: false,
      counterexample: { n: 2, his: '1/2', expected: '1' },
      usedLetters: [],
    });
  });

  it('every side of a chain must hold: the first false side is reported', () => {
    expect(checkFormula('E(X)=n*1/2=n/4', 'n/2', N)).toMatchObject({
      label: 'E(X)',
      equivalent: false,
      counterexample: { n: 2, his: '1/2', expected: '1' },
    });
  });

  it('variance as p squared times n (n*(1/2)^2) is right only because p = 1/2', () => {
    // The exam's p = 1/2 makes p*q = p^2: the engine cannot tell them apart here.
    expect(checkFormula('n*(1/2)^2', 'n/4', N).equivalent).toBe(true);
  });
});

describe('checkFormula: unreadable inputs', () => {
  it.each([
    ['x/2', 'unknown letter x'],
    ['p*n', 'unknown letter p'],
    ['n/', 'syntax'],
    ['(n+1', 'syntax'],
    ['', 'empty'],
    ['E(X)=', 'empty'],
    ['n==2', 'syntax'],
  ])('%s', (raw, reason) => {
    expect(checkFormula(raw, 'n/2', N)).toMatchObject({
      readable: false,
      reason,
      equivalent: null,
      tested: 0,
    });
  });

  it('a letter that is not a variable of this formula is unknown', () => {
    expect(checkFormula('C(n,k)/2^n', 'n/2', N)).toMatchObject({
      readable: false,
      reason: 'unknown letter k',
    });
  });

  it('says when too few points could be compared', () => {
    // Undefined (division by zero) at n = 2..10: only n = 11 and 12 remain.
    const zero = '0/((n-2)*(n-3)*(n-4)*(n-5)*(n-6)*(n-7)*(n-8)*(n-9)*(n-10))';
    expect(checkFormula(`n/2+${zero}`, 'n/2', N)).toMatchObject({
      readable: true,
      equivalent: null,
      tested: 2,
      reason: 'too few points could be compared',
    });
  });
});
