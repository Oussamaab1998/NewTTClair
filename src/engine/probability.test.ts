/**
 * Facts from docs/exercises/EX2_PROBABILITY.md, recomputed by the engine.
 * Urn: -1, 0, 0, 1, 2 (two different balls carry 0), two balls drawn simultaneously.
 */
import {
  binomialExpectation,
  binomialPmf,
  enumerateOutcomes,
  EventSpecSchema,
  evaluateValueFn,
  expectation,
  law,
  matchingOutcomes,
  probability,
  secondMoment,
  smallestN,
  variance,
  type Ball,
  type EventSpec,
} from './probability';
import {
  add,
  choose,
  EngineError,
  frac,
  pow,
  sub,
  type Fraction,
} from './rational';

const URN: Ball[] = [
  { id: 'a', value: -1 },
  { id: 'b', value: 0 },
  { id: 'c', value: 0 },
  { id: 'd', value: 1 },
  { id: 'e', value: 2 },
];
const outcomes = enumerateOutcomes(URN, 'simultaneous', 2);
const A: EventSpec = { id: 'all_equal' };
const B: EventSpec = { id: 'any_value', args: { value: 0 } };

describe('rational helpers', () => {
  it('reduces and normalizes the sign', () => {
    expect(frac(14, 20)).toEqual([7, 10]);
    expect(frac(3, -6)).toEqual([-1, 2]);
    expect(frac(0, -5)).toEqual([0, 1]);
    expect(sub([1, 1], [3, 10])).toEqual([7, 10]);
    expect(() => frac(1, 0)).toThrow(EngineError);
  });
  it('counts combinations', () => {
    expect(choose(5, 2)).toBe(10);
    expect(choose(3, 2)).toBe(3);
    expect(choose(2, 3)).toBe(0);
  });
});

describe('outcomes', () => {
  it('has C(5,2) = 10 unordered pairs for a simultaneous draw', () => {
    expect(outcomes).toHaveLength(10);
    expect(new Set(outcomes.map(o => o.id)).size).toBe(10);
  });
  it("keeps the two 0 balls distinct, so the pair {0, 0'} exists once", () => {
    const zeroPairs = outcomes.filter(o => o.balls.every(b => b.value === 0));
    expect(zeroPairs.map(o => o.id)).toEqual(['b-c']);
  });
  it('never repeats a ball and never lists both (a,b) and (b,a)', () => {
    for (const o of outcomes) {
      expect(new Set(o.ballIds).size).toBe(2);
    }
    const keys = outcomes.map(o => [...o.ballIds].sort().join());
    expect(new Set(keys).size).toBe(10);
  });
  it('counts 20 ordered draws and 25 draws with replacement', () => {
    expect(enumerateOutcomes(URN, 'ordered', 2)).toHaveLength(20);
    expect(enumerateOutcomes(URN, 'ordered_with_replacement', 2)).toHaveLength(
      25,
    );
  });
  it('rejects invalid urns and sizes', () => {
    expect(() => enumerateOutcomes(URN, 'simultaneous', 6)).toThrow(
      EngineError,
    );
    expect(() => enumerateOutcomes(URN, 'simultaneous', 0)).toThrow(
      EngineError,
    );
    expect(() =>
      enumerateOutcomes(
        [
          { id: 'a', value: 1 },
          { id: 'a', value: 2 },
        ],
        'simultaneous',
        1,
      ),
    ).toThrow(EngineError);
    expect(() =>
      enumerateOutcomes([{ id: 'a-b', value: 1 }], 'simultaneous', 1),
    ).toThrow(EngineError);
  });
});

describe('value functions', () => {
  const pair = outcomes.find(o => o.id === 'a-e')!; // (-1, 2)
  it('computes product, sum, max, min, count_value', () => {
    expect(evaluateValueFn('product', pair)).toBe(-2);
    expect(evaluateValueFn('sum', pair)).toBe(1);
    expect(evaluateValueFn('max', pair)).toBe(2);
    expect(evaluateValueFn('min', pair)).toBe(-1);
    expect(
      evaluateValueFn(
        { id: 'count_value', args: { value: 0 } },
        outcomes.find(o => o.id === 'b-c')!,
      ),
    ).toBe(2);
  });
  it('allows identity only for single-ball draws', () => {
    const single = enumerateOutcomes(URN, 'simultaneous', 1);
    expect(single.map(o => evaluateValueFn('identity', o))).toEqual([
      -1, 0, 0, 1, 2,
    ]);
    expect(() => evaluateValueFn('identity', pair)).toThrow(EngineError);
  });
});

describe('Exercise 2, question 1', () => {
  it("P(A) = 1/10 (only {0, 0'})", () => {
    expect(probability(A, outcomes)).toEqual({
      num: 1,
      den: 10,
      reduced: [1, 10],
    });
  });
  it('P(B) = 7/10, and equals 1 - P(no 0) = 1 - 3/10', () => {
    const pB = probability(B, outcomes);
    expect(pB).toEqual({ num: 7, den: 10, reduced: [7, 10] });
    const notB = probability({ id: 'not', args: { event: B } }, outcomes);
    expect(notB.reduced).toEqual([3, 10]);
    expect(sub([1, 1], notB.reduced)).toEqual(pB.reduced);
  });
  it('lists the outcomes of an event (for EventPicker)', () => {
    expect(matchingOutcomes(B, outcomes).map(o => o.id)).toEqual([
      'a-b',
      'a-c',
      'b-c',
      'b-d',
      'b-e',
      'c-d',
      'c-e',
    ]);
  });
  it('supports and / or', () => {
    const both: EventSpec = { id: 'and', args: { events: [A, B] } };
    const either: EventSpec = { id: 'or', args: { events: [A, B] } };
    expect(probability(both, outcomes).reduced).toEqual([1, 10]);
    expect(probability(either, outcomes).reduced).toEqual([7, 10]);
  });
});

describe('Exercise 2, question 2 (X = product)', () => {
  const lawX = law('product', outcomes);

  it('X takes the values -2, -1, 0, 2 (product 1 is impossible)', () => {
    expect(lawX.map(r => r.value)).toEqual([-2, -1, 0, 2]);
  });
  it('has the law 1/10, 1/10, 7/10, 1/10 with sum 1', () => {
    expect(lawX.map(r => r.p)).toEqual([
      [1, 10],
      [1, 10],
      [7, 10],
      [1, 10],
    ]);
    expect(lawX.reduce<Fraction>((s, r) => add(s, r.p), [0, 1])).toEqual([
      1, 1,
    ]);
  });
  it('{X = 0} is exactly the event B', () => {
    const x0 = lawX.find(r => r.value === 0)!.outcomes.map(o => o.id);
    expect(x0).toEqual(matchingOutcomes(B, outcomes).map(o => o.id));
    const valueEq: EventSpec = {
      id: 'value_eq',
      args: { valueFn: 'product', value: 0 },
    };
    expect(probability(valueEq, outcomes).reduced).toEqual([7, 10]);
  });
  it('value_eq can take its value function from the component context', () => {
    const e: EventSpec = { id: 'value_eq', args: { value: -2 } };
    expect(probability(e, outcomes, { valueFn: 'product' }).reduced).toEqual([
      1, 10,
    ]);
    expect(() => probability(e, outcomes)).toThrow(EngineError);
  });
  it('E(X) = -1/10 = -0.1', () => {
    expect(expectation(lawX)).toEqual({ fraction: [-1, 10], decimal: -0.1 });
  });
  it('E(X²) = 9/10', () => {
    expect(secondMoment(lawX).fraction).toEqual([9, 10]);
  });
  it('V(X) = 89/100 = 0.89 (the official correction prints 8,9: typo)', () => {
    const v = variance(lawX);
    expect(v.fraction).toEqual([89, 100]);
    expect(v.decimal).toBeCloseTo(0.89, 12);
    expect(v.decimal).not.toBeCloseTo(8.9, 1);
  });
});

describe('Exercise 2, question 3 (Y ~ B(n, 7/10))', () => {
  const p: Fraction = [7, 10];

  it('P(Y = 1) = 7n·3^(n-1) / 10^n for n = 2..10', () => {
    for (let n = 2; n <= 10; n++) {
      const expected = frac(7 * n * 3 ** (n - 1), 10 ** n);
      expect(binomialPmf(n, p, 1)).toEqual(expected);
    }
  });
  it('the binomial law sums to 1', () => {
    let s: Fraction = [0, 1];
    for (let k = 0; k <= 6; k++) {
      s = add(s, binomialPmf(6, p, k));
    }
    expect(s).toEqual([1, 1]);
    expect(binomialPmf(6, p, 7)).toEqual([0, 1]);
  });
  it('E(Y) = 7n/10', () => {
    expect(binomialExpectation(7, p)).toEqual([49, 10]);
    expect(binomialExpectation(8, p)).toEqual([28, 5]);
  });
  it('the smallest n (n >= 2) with E(Y) >= 5 is 8', () => {
    expect(
      smallestN({ p, target: { type: 'E_at_least', value: [5, 1] }, nMin: 2 }),
    ).toBe(8);
  });
  it('respects nMin and exact boundaries', () => {
    expect(
      smallestN({
        p: [1, 2],
        target: { type: 'E_at_least', value: [3, 1] },
        nMin: 1,
      }),
    ).toBe(6);
    expect(
      smallestN({
        p: [1, 2],
        target: { type: 'E_at_least', value: [0, 1] },
        nMin: 2,
      }),
    ).toBe(2);
  });
  it('throws instead of losing precision on huge n', () => {
    expect(() => binomialPmf(40, p, 1)).toThrow(EngineError);
    expect(() => pow([7, 10], 40)).toThrow(EngineError);
  });
});

describe('EventSpecSchema (JSON from content and planner)', () => {
  it('accepts nested events', () => {
    const e = {
      id: 'not',
      args: { event: { id: 'or', args: { events: [A, B] } } },
    };
    expect(EventSpecSchema.safeParse(e).success).toBe(true);
  });
  it('rejects unknown event ids and code strings', () => {
    expect(
      EventSpecSchema.safeParse({ id: 'custom', args: { fn: 'x => x' } })
        .success,
    ).toBe(false);
    expect(
      EventSpecSchema.safeParse({ id: 'any_value', args: { value: 'x' } })
        .success,
    ).toBe(false);
  });
});

describe('coloured balls (red / black urns)', () => {
  const red = (id: string) => ({ id, value: 1, color: 'red' as const });
  const black = (id: string) => ({ id, value: 0, color: 'black' as const });
  it('colours do not change the draws: 4 red, 6 black, 3 at once = 120', () => {
    const urn = [
      ...['r1', 'r2', 'r3', 'r4'].map(red),
      ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(black),
    ];
    expect(enumerateOutcomes(urn, 'simultaneous', 3)).toHaveLength(120);
  });
  it('a colour must be on every ball, and carry one value', () => {
    expect(() =>
      enumerateOutcomes([red('r1'), { id: 'x', value: 0 }], 'simultaneous', 1),
    ).toThrow(/every ball or on none/);
    expect(() =>
      enumerateOutcomes(
        [red('r1'), { ...red('r2'), value: 2 }],
        'simultaneous',
        1,
      ),
    ).toThrow(/its own value/);
    expect(() =>
      enumerateOutcomes(
        [red('r1'), { ...black('n1'), value: 1 }],
        'simultaneous',
        1,
      ),
    ).toThrow(/its own value/);
  });
});
