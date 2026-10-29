import { enumerateOutcomes, type Ball, type Draw } from './probability';
import {
  MAX_ENUMERATION,
  MAX_FACTORIAL,
  arrangements,
  choose,
  enumeratePatterns,
  factorial,
  orderingsPerSet,
  outcomeCountOf,
  pascalRow,
} from './combinatorics';
import { EngineError } from './rational';

const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const ONE = BigInt(1);

/** Reference values: BigInt, no rounding anywhere. */
function bigChoose(n: number, k: number): bigint {
  let r = ONE;
  for (let i = 1; i <= Math.min(k, n - k); i++) {
    r = (r * BigInt(n - i + 1)) / BigInt(i);
  }
  return r;
}
function bigArrangements(n: number, k: number): bigint {
  let r = ONE;
  for (let i = 0; i < k; i++) {
    r *= BigInt(n - i);
  }
  return r;
}
const urn = (n: number): Ball[] =>
  Array.from({ length: n }, (_, i) => ({ id: `b${i}`, value: i }));

describe('choose (the fix): exact whenever the result fits, an error otherwise, never wrong', () => {
  it('equals BigInt for every pair with n <= 60 whose result is a safe integer', () => {
    const wrong: string[] = [];
    for (let n = 0; n <= 60; n++) {
      for (let k = 0; k <= n; k++) {
        const want = bigChoose(n, k);
        if (want <= SAFE) {
          let got: number | string;
          try {
            got = choose(n, k);
          } catch (e) {
            got = `throws ${(e as Error).message}`;
          }
          if (got !== Number(want)) {
            wrong.push(`C(${n},${k}) got ${got} want ${want}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('throws EngineError, instead of rounding, when the result is above 2^53', () => {
    for (let n = 0; n <= 60; n++) {
      for (let k = 0; k <= n; k++) {
        if (bigChoose(n, k) > SAFE) {
          expect(() => choose(n, k)).toThrow(EngineError);
        }
      }
    }
  });

  it('keeps its old behaviour on the small cases', () => {
    expect(choose(10, 3)).toBe(120);
    expect(choose(6, 2)).toBe(15);
    expect(choose(4, 1)).toBe(4);
    expect(choose(5, 6)).toBe(0);
    expect(choose(0, 0)).toBe(1);
    expect(() => choose(-1, 0)).toThrow(EngineError);
    expect(() => choose(5, 1.5)).toThrow(EngineError);
  });

  it('the two inputs that used to be silently wrong are now right', () => {
    expect(choose(59, 22)).toBe(8964377427999630);
    expect(choose(59, 37)).toBe(8964377427999630);
  });

  it('the 27 inputs that used to throw although the result fits now return it', () => {
    expect(choose(55, 26)).toBe(3560597348629860);
    expect(choose(55, 27)).toBe(3824345300380220);
    expect(choose(56, 24)).toBe(4355031703297275);
  });
});

describe('factorial', () => {
  it('matches BigInt up to the last safe value', () => {
    let f = ONE;
    for (let n = 0; n <= MAX_FACTORIAL; n++) {
      if (n > 0) {
        f *= BigInt(n);
      }
      expect(BigInt(factorial(n))).toBe(f);
    }
    expect(MAX_FACTORIAL).toBe(18);
    expect(factorial(3)).toBe(6);
    expect(factorial(0)).toBe(1);
  });
  it('refuses what it cannot compute exactly', () => {
    expect(() => factorial(19)).toThrow(EngineError);
    expect(() => factorial(-1)).toThrow(EngineError);
    expect(() => factorial(2.5)).toThrow(EngineError);
  });
  it('orderingsPerSet is k!: 2, 6, 24 for k = 2, 3, 4', () => {
    expect([2, 3, 4].map(orderingsPerSet)).toEqual([2, 6, 24]);
  });
});

describe('arrangements A(n,k)', () => {
  it('equals BigInt when it fits and throws when it does not (n <= 60)', () => {
    for (let n = 0; n <= 60; n += 3) {
      for (let k = 0; k <= n; k++) {
        const want = bigArrangements(n, k);
        if (want <= SAFE) {
          expect(arrangements(n, k)).toBe(Number(want));
        } else {
          expect(() => arrangements(n, k)).toThrow(EngineError);
        }
      }
    }
  });
  it('the exercise numbers: A(10,3) = 720 = C(10,3) * 3!', () => {
    expect(arrangements(10, 3)).toBe(720);
    expect(choose(10, 3) * factorial(3)).toBe(720);
  });
  it('A(n,k) = C(n,k) * k! on a grid', () => {
    for (let n = 0; n <= 12; n++) {
      for (let k = 0; k <= Math.min(n, 6); k++) {
        expect(arrangements(n, k)).toBe(choose(n, k) * factorial(k));
      }
    }
  });
  it('0 when k > n, like choose', () => {
    expect(arrangements(3, 5)).toBe(0);
  });
});

describe('identities of the binomial coefficient', () => {
  it('C(n,k) = C(n,n-k) and the row sums to 2^n (n <= 40)', () => {
    for (let n = 0; n <= 40; n++) {
      const row = pascalRow(n);
      expect(row).toHaveLength(n + 1);
      expect(row[0]).toBe(1);
      expect(row[n]).toBe(1);
      expect(row.map((_, k) => row[n - k])).toEqual(row);
      expect(row.reduce((s, c) => s + c, 0)).toBe(2 ** n);
    }
  });
  it('Pascal rows n = 2..5 are the ones the SlotsPattern counts build', () => {
    expect(pascalRow(2)).toEqual([1, 2, 1]);
    expect(pascalRow(3)).toEqual([1, 3, 3, 1]);
    expect(pascalRow(4)).toEqual([1, 4, 6, 4, 1]);
    expect(pascalRow(5)).toEqual([1, 5, 10, 10, 5, 1]);
  });
  it('Pascal rule C(n,k) = C(n-1,k-1) + C(n-1,k)', () => {
    for (let n = 1; n <= 30; n++) {
      for (let k = 1; k < n; k++) {
        expect(choose(n, k)).toBe(choose(n - 1, k - 1) + choose(n - 1, k));
      }
    }
  });
  it('pascalRow refuses a row with a coefficient above 2^53', () => {
    expect(() => pascalRow(60)).toThrow(EngineError);
  });
});

describe('outcomeCountOf: the number of draws by formula, no enumeration', () => {
  it('the exercise: 10 balls, 3 drawn: 120 simultaneous, 720 ordered, 1000 with replacement', () => {
    expect(outcomeCountOf('simultaneous', 10, 3)).toBe(120);
    expect(outcomeCountOf('ordered', 10, 3)).toBe(720);
    expect(outcomeCountOf('ordered_with_replacement', 10, 3)).toBe(1000);
  });
  it('agrees with enumerateOutcomes on every small urn', () => {
    const kinds: Draw[] = ['simultaneous', 'ordered', 'ordered_with_replacement'];
    for (const draw of kinds) {
      for (let n = 1; n <= 7; n++) {
        for (let k = 1; k <= 4; k++) {
          if (draw !== 'ordered_with_replacement' && k > n) {
            expect(() => outcomeCountOf(draw, n, k)).toThrow(EngineError);
            continue;
          }
          expect(outcomeCountOf(draw, n, k)).toBe(
            enumerateOutcomes(urn(n), draw, k).length,
          );
        }
      }
    }
  });
  it('12 balls, k = 4, with replacement: 20736 without building them', () => {
    expect(outcomeCountOf('ordered_with_replacement', 12, 4)).toBe(20736);
  });
  it('throws when the count is not a safe integer', () => {
    expect(() => outcomeCountOf('ordered_with_replacement', 10, 17)).toThrow(
      EngineError,
    );
  });
});

describe('enumeratePatterns: the strings of S and F with exactly k S', () => {
  it('n = 4, k = 2: the six patterns, S first, in reading order', () => {
    expect(enumeratePatterns(4, 2)).toEqual([
      'SSFF',
      'SFSF',
      'SFFS',
      'FSSF',
      'FSFS',
      'FFSS',
    ]);
  });
  it('the patterns the evidence mentions are in the list: SSFF, FSSF, and the 3-slot SFS', () => {
    expect(enumeratePatterns(4, 2)).toEqual(
      expect.arrayContaining(['SSFF', 'FSSF']),
    );
    expect(enumeratePatterns(3, 2)).toEqual(['SSF', 'SFS', 'FSS']);
  });
  it('has C(n,k) distinct patterns, each with k S, for every n <= 8', () => {
    for (let n = 0; n <= 8; n++) {
      for (let k = 0; k <= n; k++) {
        const ps = enumeratePatterns(n, k);
        expect(ps).toHaveLength(choose(n, k));
        expect(new Set(ps).size).toBe(ps.length);
        for (const p of ps) {
          expect(p).toHaveLength(n);
          expect(p.split('S').length - 1).toBe(k);
        }
      }
    }
  });
  it('C(n,k) = C(n,n-k): swapping S and F is a bijection between the two lists', () => {
    const swap = (p: string) =>
      [...p].map(c => (c === 'S' ? 'F' : 'S')).join('');
    const a = enumeratePatterns(6, 2);
    const b = new Set(enumeratePatterns(6, 4));
    expect(a.map(swap).every(p => b.has(p))).toBe(true);
    expect(a).toHaveLength(b.size);
  });
  it('edge cases: k = 0 and k = n give one pattern', () => {
    expect(enumeratePatterns(3, 0)).toEqual(['FFF']);
    expect(enumeratePatterns(3, 3)).toEqual(['SSS']);
    expect(enumeratePatterns(0, 0)).toEqual(['']);
  });
  it('takes other symbols', () => {
    expect(enumeratePatterns(3, 1, ['R', 'N'])).toEqual(['RNN', 'NRN', 'NNR']);
  });
  it('refuses a bad request and a list it would not build', () => {
    expect(() => enumeratePatterns(3, 4)).toThrow(EngineError);
    expect(() => enumeratePatterns(-1, 0)).toThrow(EngineError);
    expect(() => enumeratePatterns(3, 1.5)).toThrow(EngineError);
    expect(() => enumeratePatterns(3, 1, ['S', 'S'])).toThrow(EngineError);
    // C(20,10) = 184756 > the cap: the count comes from choose, not from a list
    expect(MAX_ENUMERATION).toBe(20000);
    expect(() => enumeratePatterns(20, 10)).toThrow(EngineError);
    expect(choose(20, 10)).toBe(184756);
  });
});
