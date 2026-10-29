import {
  assertNoCoincidence,
  coincidences,
  distinctAtGrid,
  evaluateAtRational,
  wrongMethodValues,
  type CoincidenceSpec,
} from './coincidence';
import { parseExpression } from './expression';
import { EngineError, frac, type Fraction } from './rational';
import { ratToString } from './rationalFormat';

const f = (n: number, d = 1): Fraction => frac(n, d);
const values = (spec: CoincidenceSpec) =>
  Object.fromEntries(
    wrongMethodValues(spec).wrong.map(w => [w.id, ratToString(w.value)]),
  );

describe('staged counts: AND multiplies, OR adds', () => {
  const real: CoincidenceSpec = {
    kind: 'staged',
    mode: 'and',
    stages: [{ options: 4 }, { n: 6, k: 2 }],
  };

  it('the exercise: 4 reds AND 2 of 6 blacks = 4 x 15 = 60, and every slip has its own number', () => {
    const { correct, wrong } = wrongMethodValues(real);
    expect(correct).toEqual([60, 1]);
    expect(values(real)).toMatchObject({
      sum_instead_of_product: '19', // 4 + 15
      subset_as_n: '24', // 4 x 6
      subset_as_arrangements: '120', // 4 x 30
      subset_as_nk: '48', // 4 x 12
    });
    expect(wrong.length).toBeGreaterThanOrEqual(4);
    expect(coincidences(real)).toEqual([]);
    expect(() => assertNoCoincidence(real)).not.toThrow();
  });

  it('OR is the sum, and the slip is the product', () => {
    const or: CoincidenceSpec = { kind: 'staged', mode: 'or', stages: [{ options: 4 }, { n: 6, k: 2 }] };
    expect(wrongMethodValues(or).correct).toEqual([19, 1]);
    expect(values(or).product_instead_of_sum).toBe('60');
  });

  it('a + b = a x b only for a = b = 2 (two stages)', () => {
    const bad: number[][] = [];
    for (let a = 1; a <= 12; a++) {
      for (let b = 1; b <= 12; b++) {
        const spec: CoincidenceSpec = {
          kind: 'staged',
          mode: 'and',
          stages: [{ options: a }, { options: b }],
        };
        if (coincidences(spec).some(c => c.id === 'sum_instead_of_product')) {
          bad.push([a, b]);
        }
      }
    }
    expect(bad).toEqual([[2, 2]]);
    expect(() =>
      assertNoCoincidence({ kind: 'staged', mode: 'and', stages: [{ options: 2 }, { options: 2 }] }),
    ).toThrow(EngineError);
  });

  it('three stages: 1 + 2 + 3 = 1 x 2 x 3 is caught too', () => {
    const spec: CoincidenceSpec = {
      kind: 'staged',
      mode: 'and',
      stages: [{ options: 1 }, { options: 2 }, { options: 3 }],
    };
    expect(coincidences(spec).map(c => c.id)).toEqual(['sum_instead_of_product']);
  });

  it('a subset stage whose choices equal its balls (C(n,1) = n) hides the "balls, not choices" slip', () => {
    const spec: CoincidenceSpec = { kind: 'staged', mode: 'and', stages: [{ options: 4 }, { n: 6, k: 1 }] };
    expect(coincidences(spec).map(c => c.id)).toEqual(
      expect.arrayContaining(['subset_as_n', 'subset_as_nk', 'subset_as_arrangements']),
    );
  });

  it('refuses bad stages', () => {
    expect(() => wrongMethodValues({ kind: 'staged', mode: 'and', stages: [{ options: 4 }] })).toThrow(EngineError);
    expect(() => wrongMethodValues({ kind: 'staged', mode: 'and', stages: [{ options: 0 }, { options: 3 }] })).toThrow(EngineError);
    expect(() => wrongMethodValues({ kind: 'staged', mode: 'and', stages: [{ options: 4 }, { n: 3, k: 5 }] })).toThrow(EngineError);
  });
});

describe('counting the choices of k among n: C(n,k) against its look-alikes', () => {
  it('C(6,2) = 15: the typed 12 (6 x 2), 30 (6 x 5) are named; 36 and 8 as well', () => {
    const spec: CoincidenceSpec = { kind: 'subset', n: 6, k: 2 };
    expect(wrongMethodValues(spec).correct).toEqual([15, 1]);
    expect(values(spec)).toMatchObject({
      n_times_k: '12',
      arrangements: '30',
      n_power_k: '36',
      n_plus_k: '8',
    });
    expect(coincidences(spec)).toEqual([]);
  });

  it('where two methods give the same number', () => {
    // k = 1: C(n,1) = n = n x 1 = A(n,1) = n^1
    expect(coincidences({ kind: 'subset', n: 2, k: 1 }).map(c => c.id).sort()).toEqual([
      'arrangements',
      'n_power_k',
      'n_times_k',
    ]);
    expect(coincidences({ kind: 'subset', n: 5, k: 1 }).map(c => c.id).sort()).toEqual([
      'arrangements',
      'n_power_k',
      'n_times_k',
    ]);
    // n = 4, k = 2: n + k = 6 = C(4,2), a coincidence of the sum with the count
    expect(coincidences({ kind: 'subset', n: 4, k: 2 }).map(c => c.id)).toEqual(['n_plus_k']);
  });

  it('k = 2 does not make a count and its orderings agree (k = k!), but it makes A(n,2) = 2 C(n,2)', () => {
    const spec: CoincidenceSpec = { kind: 'subset', n: 6, k: 2 };
    expect(wrongMethodValues(spec).wrong.find(w => w.id === 'arrangements')!.value).toEqual([30, 1]);
  });
});

describe('boxes: dividing the ordered draws by the number of orderings, not of balls', () => {
  it('10 balls, k = 3: 720 / 6 = 120 boxes; the slip 720 / 3 = 240', () => {
    const spec: CoincidenceSpec = { kind: 'boxes', n: 10, k: 3 };
    expect(wrongMethodValues(spec).correct).toEqual([120, 1]);
    expect(values(spec)).toMatchObject({ divide_by_k: '240', ordered_total: '720' });
    expect(coincidences(spec)).toEqual([]);
  });
  it('4 balls, k = 3: 24 / 6 = 4 boxes; the slip 24 / 3 = 8', () => {
    const spec: CoincidenceSpec = { kind: 'boxes', n: 4, k: 3 };
    expect(wrongMethodValues(spec).correct).toEqual([4, 1]);
    expect(values(spec).divide_by_k).toBe('8');
  });
  it('k = 2 (and k = 1): k = k!, so the two divisions agree and the example proves nothing', () => {
    const two: CoincidenceSpec = { kind: 'boxes', n: 6, k: 2 };
    expect(coincidences(two).map(c => c.id)).toEqual(['divide_by_k']);
    expect(() => assertNoCoincidence(two)).toThrow(EngineError);
    // k = 1: a box holds one ball, so "do not divide" is right as well
    const one: CoincidenceSpec = { kind: 'boxes', n: 6, k: 1 };
    expect(coincidences(one).map(c => c.id)).toEqual(['divide_by_k', 'ordered_total']);
    expect(() => assertNoCoincidence(one)).toThrow(EngineError);
    for (const k of [3, 4]) {
      expect(coincidences({ kind: 'boxes', n: 8, k })).toEqual([]);
    }
  });
});

describe('Bernoulli variance: p(1 - p) against p^2, p / 2, (1 - p)^2', () => {
  it('at p = 1/2 three wrong formulas all give 1/4', () => {
    const spec: CoincidenceSpec = { kind: 'bernoulli_variance', p: f(1, 2) };
    expect(coincidences(spec).map(c => c.id).sort()).toEqual(
      ['p_over_2', 'p_squared', 'q_squared'].sort(),
    );
  });
  it('at p = 3/10 none do; the numbers are 21/100, 9/100, 3/20, 49/100', () => {
    const spec: CoincidenceSpec = { kind: 'bernoulli_variance', p: f(3, 10) };
    expect(coincidences(spec)).toEqual([]);
    expect(wrongMethodValues(spec).correct).toEqual([21, 100]);
    expect(values(spec)).toMatchObject({ p_squared: '9/100', p_over_2: '3/20', q_squared: '49/100' });
  });
  it('p outside [0, 1] is refused', () => {
    expect(() => wrongMethodValues({ kind: 'bernoulli_variance', p: f(3, 2) })).toThrow(EngineError);
  });
});

describe('evaluateAtRational: a safe-parser expression at an exact rational, no eval', () => {
  const ast = (s: string) => {
    const r = parseExpression(s, { variables: ['p'] });
    if (!r.ok) {
      throw new Error(s);
    }
    return r.ast;
  };
  it('p(1-p) at 3/10 is 21/100; p^2 at 1/6 is 1/36', () => {
    expect(evaluateAtRational(ast('p*(1-p)'), 'p', f(3, 10))).toEqual([21, 100]);
    expect(evaluateAtRational(ast('p^2'), 'p', f(1, 6))).toEqual([1, 36]);
    expect(evaluateAtRational(ast('1-p'), 'p', f(0))).toEqual([1, 1]);
  });
  it('null when the value is not rational or the expression divides by zero', () => {
    expect(evaluateAtRational(ast('1/p'), 'p', f(0))).toBeNull();
    expect(evaluateAtRational(ast('sqrt(p)'), 'p', f(1, 2))).toBeNull();
  });
});

describe('distinctAtGrid: candidate expressions must be told apart in at least 2 places', () => {
  const grid = Array.from({ length: 11 }, (_, i) => f(i, 10));
  it('p, p^2, p(1-p), 1-p are all different at 8 of the 11 positions, but not at 0, 1/2, 1', () => {
    const r = distinctAtGrid(['p', 'p^2', 'p*(1-p)', '1-p'], 'p', grid);
    expect(r.ok).toBe(true);
    expect(r.positions.map(ratToString)).not.toContain('1/2');
    expect(r.positions.map(ratToString)).not.toContain('0');
    expect(r.positions.map(ratToString)).not.toContain('1');
    expect(r.positions).toHaveLength(8);
  });
  it('two spellings of the same function are never told apart', () => {
    const r = distinctAtGrid(['p*(1-p)', 'p-p^2'], 'p', grid);
    expect(r.ok).toBe(false);
    expect(r.positions).toEqual([]);
  });
  it('a grid of only the end points and 1/2 tells nothing', () => {
    const r = distinctAtGrid(['p', 'p^2', 'p*(1-p)', '1-p'], 'p', [f(0), f(1, 2), f(1)]);
    expect(r.ok).toBe(false);
  });
  it('an expression that does not parse, or does not evaluate, is an error, not a silent skip', () => {
    expect(() => distinctAtGrid(['p*', 'p'], 'p', grid)).toThrow(EngineError);
    expect(() => distinctAtGrid(['sqrt(p)', 'p'], 'p', grid)).toThrow(EngineError);
  });
});
