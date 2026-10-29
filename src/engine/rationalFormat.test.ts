import { fractionToLatex } from './format';
import {
  RatSchema,
  floorRat,
  isInteger,
  maxRat,
  minRat,
  mulInt,
  parseRat,
  sameRat,
  ratToDecimal,
  ratToLatex,
  ratToString,
  sumRat,
} from './rationalFormat';
import { binomialPmf } from './probability';
import { EngineError, add, equals, frac, type Fraction } from './rational';

const MINUS = '−';

describe('ratToString: plain text with the real minus sign', () => {
  it('writes fractions and integers', () => {
    expect(ratToString([3, 10])).toBe('3/10');
    expect(ratToString([1, 2])).toBe('1/2');
    expect(ratToString([5, 1])).toBe('5');
    expect(ratToString([0, 1])).toBe('0');
  });
  it('uses U+2212, never the hyphen-minus', () => {
    expect(ratToString([-1, 2])).toBe(`${MINUS}1/2`);
    expect(ratToString([-3, 1])).toBe(`${MINUS}3`);
    for (const f of [frac(-3, 4), frac(-7, 1), frac(-1, 6)]) {
      expect(ratToString(f)).not.toContain('-');
    }
  });
  it('reduces what it is given through frac, never prints an unreduced pair', () => {
    expect(ratToString(frac(60, 120))).toBe('1/2');
  });
});

describe('ratToLatex', () => {
  it('agrees with the existing fractionToLatex on every value it covers', () => {
    for (const f of [frac(7, 10), frac(3, 1), frac(-1, 10), frac(0, 5)]) {
      expect(ratToLatex(f)).toBe(fractionToLatex(f));
    }
    expect(ratToLatex([-1, 10])).toBe('-\\frac{1}{10}');
  });
});

describe('ratToDecimal: exact, with a French comma, or null', () => {
  it('terminating decimals', () => {
    expect(ratToDecimal([3, 10])).toBe('0,3');
    expect(ratToDecimal([21, 100])).toBe('0,21'); // the SpreadSlider total at p = 3/10
    expect(ratToDecimal([7, 2])).toBe('3,5');
    expect(ratToDecimal([1, 8])).toBe('0,125');
    expect(ratToDecimal([1, 64])).toBe('0,015625');
    expect(ratToDecimal([5, 1])).toBe('5');
    expect(ratToDecimal([0, 1])).toBe('0');
    expect(ratToDecimal([1, 2])).toBe('0,5');
  });
  it('real minus sign on a negative value', () => {
    expect(ratToDecimal([-1, 10])).toBe(`${MINUS}0,1`);
    expect(ratToDecimal([-7, 2])).toBe(`${MINUS}3,5`);
  });
  it('null when the decimal never ends', () => {
    expect(ratToDecimal([1, 6])).toBeNull();
    expect(ratToDecimal([1, 3])).toBeNull();
    expect(ratToDecimal([5, 6])).toBeNull();
    expect(ratToDecimal([1, 30])).toBeNull();
  });
  it('null when it ends but is longer than the digits asked for (default 6)', () => {
    expect(ratToDecimal([1, 1024])).toBeNull();
    expect(ratToDecimal([1, 1024], 10)).toBe('0,0009765625');
  });
  it('is exact where a float is not: 1/10 + 2/10 is 0,3', () => {
    expect(ratToDecimal(add([1, 10], [2, 10]))).toBe('0,3');
    expect(0.1 + 0.2).not.toBe(0.3); // the float would have said 0,30000000000000004
  });
});

describe('parseRat: exact, through the existing safe parser', () => {
  it('0,3 and 0.3 and 3/10 are the same value', () => {
    const a = parseRat('3/10')!;
    expect(equals(a, [3, 10])).toBe(true);
    expect(equals(parseRat('0,3')!, a)).toBe(true);
    expect(equals(parseRat('0.3')!, a)).toBe(true);
    expect(equals(parseRat(`${MINUS}1/2`)!, [-1, 2])).toBe(true);
  });
  it('null for what is not a constant number', () => {
    expect(parseRat('1/0')).toBeNull();
    expect(parseRat('abc')).toBeNull();
    expect(parseRat('')).toBeNull();
    expect(parseRat('sqrt(2)')).toBeNull();
  });
});

describe('RatSchema: the way a rational travels in props and events', () => {
  it('accepts the forms an author writes', () => {
    for (const s of ['1/6', '3/10', '0,3', '0.3', '-2', `${MINUS}1/2`, '7', '0']) {
      expect(RatSchema.safeParse(s).success).toBe(true);
    }
  });
  it('rejects what could be an expression, a typo or a division by zero', () => {
    for (const s of ['', ' 1/6', '1/', '/6', '1/0', '0.3.3', 'x', '1+1', '1/2/3', '1 / 6', '[1,6]']) {
      expect(RatSchema.safeParse(s).success).toBe(false);
    }
  });
  it('a number is not accepted: strings only', () => {
    expect(RatSchema.safeParse(0.5).success).toBe(false);
    expect(RatSchema.safeParse([1, 2]).success).toBe(false);
  });
});

describe('small helpers', () => {
  it('sameRat compares reduced tuples; equals() overflows on 1/10^12 terms', () => {
    expect(sameRat([2, 4], [1, 2])).toBe(true);
    expect(sameRat([1, 2], [1, 3])).toBe(false);
    const a = binomialPmf(12, [7, 10], 6);
    expect(sameRat(a, binomialPmf(12, [7, 10], 6))).toBe(true);
    expect(() => equals(a, binomialPmf(12, [7, 10], 6))).toThrow(EngineError);
  });
  it('isInteger', () => {
    expect(isInteger([6, 1])).toBe(true);
    expect(isInteger(frac(36, 6))).toBe(true);
    expect(isInteger([36, 5])).toBe(false);
  });
  it('mulInt: 36 x 1/6 = 6, and 36 x 1/5 is not an integer', () => {
    expect(mulInt([1, 6], 36)).toEqual([6, 1]);
    expect(isInteger(mulInt([1, 5], 36))).toBe(false);
    expect(mulInt([1, 5], 36)).toEqual([36, 5]);
  });
  it('floorRat rounds towards minus infinity', () => {
    expect(floorRat([7, 2])).toBe(3);
    expect(floorRat([-7, 2])).toBe(-4);
    expect(floorRat([5, 1])).toBe(5);
    expect(floorRat([-5, 1])).toBe(-5);
    expect(floorRat([0, 1])).toBe(0);
  });
  it('minRat, maxRat', () => {
    const xs: Fraction[] = [[1, 2], [1, 3], [3, 4]];
    expect(minRat(xs)).toEqual([1, 3]);
    expect(maxRat(xs)).toEqual([3, 4]);
    expect(() => minRat([])).toThrow(EngineError);
    expect(() => maxRat([])).toThrow(EngineError);
  });
  it('sumRat: 1/6 + 1/2 + 3/10 + 1/30 = 1 (the law of the number of reds)', () => {
    expect(sumRat([[1, 6], [1, 2], [3, 10], [1, 30]])).toEqual([1, 1]);
    expect(sumRat([])).toEqual([0, 1]);
  });
  it('sumRat adds terms over a large common denominator that add() cannot: B(12, 7/10) sums to 1', () => {
    const terms = Array.from({ length: 13 }, (_, k) => binomialPmf(12, [7, 10], k));
    expect(terms.some(t => t[1] >= 10 ** 9)).toBe(true);
    expect(() => terms.reduce((s, t) => add(s, t), [0, 1] as Fraction)).toThrow(EngineError);
    expect(sumRat(terms)).toEqual([1, 1]);
  });
  it('sumRat refuses a sum that does not fit', () => {
    expect(() => sumRat([[1, 3 ** 33], [1, 2 ** 20]])).toThrow(EngineError);
  });
});
