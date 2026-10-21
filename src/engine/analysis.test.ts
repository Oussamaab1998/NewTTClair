/**
 * Exercise 4 facts (docs/COMPONENTS_ANALYSIS.md "Verified facts",
 * docs/exercises/EX4_ANALYSIS.md), recomputed by the engine. Nothing here is
 * trusted from the docs: each value is computed and compared.
 */
import {
  derivative,
  equivalentExpressions,
  evalFn,
  FUNCTION_REGISTRY,
  integrate,
  limitProbe,
  matchesFn,
  parity,
  signChange,
  signChangeOf,
  simpson,
  toRational,
  type FnId,
} from './analysis';
import { runEngineCall } from './calls';
import { EngineError } from './rational';

const f = (x: number) => evalFn('f_ex4', x);
const F = (x: number) => integrate('f_ex4', 0, Math.log(x));
const SAMPLES = [-3, -1.5, -1, -0.5, -0.01, 0, 0.001, 0.3, 1, 2.5, 4];

describe('function registry', () => {
  it('has unique ids and parses every expression (safe parser)', () => {
    const ids = FUNCTION_REGISTRY.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of FUNCTION_REGISTRY) {
      expect(Number.isFinite(evalFn(e.id, 0.5))).toBe(true);
    }
  });
  it('f_ex4 is e^x / (1 + e^{2x})', () => {
    expect(f(0)).toBeCloseTo(0.5, 14);
    expect(f(1)).toBeCloseTo(Math.E / (1 + Math.E ** 2), 14);
  });
  it('the numerator / denominator split and the simplified form agree with f', () => {
    for (const x of SAMPLES) {
      expect(evalFn('f_ex4_num', x) / evalFn('f_ex4_den', x)).toBeCloseTo(
        f(x),
        12,
      );
      expect(evalFn('f_ex4_simplified', x)).toBeCloseTo(f(x), 12);
    }
  });
  it('x/(x+1) is undefined at -1 (outside its domain)', () => {
    expect(Number.isFinite(evalFn('quot_demo', -1))).toBe(false);
  });
});

describe('A1: f is even', () => {
  it('f(-x) = f(x) at sample points, including negatives and near 0', () => {
    for (const x of SAMPLES) {
      expect(f(-x)).toBeCloseTo(f(x), 14);
    }
  });
  it('the A1 transfer function g(x) = e^{2x}/(1+e^{4x}) is even too', () => {
    for (const x of SAMPLES) {
      expect(evalFn('g_ex4_transfer', -x)).toBeCloseTo(
        evalFn('g_ex4_transfer', x),
        14,
      );
    }
  });
  it('the comparison function is not even', () => {
    expect(
      Math.abs(evalFn('sigmoid_demo', -1) - evalFn('sigmoid_demo', 1)),
    ).toBeGreaterThan(0.1);
  });
  it('f(-x) written out simplifies to f(x) (numeric samples)', () => {
    expect(
      equivalentExpressions('e^(-x)/(1+e^(-2x))', 'e^x/(1+e^(2x))').verdict,
    ).toBe('equivalent');
  });
});

describe('parity (the A1 conclusion is derived from it)', () => {
  it('classifies the registry functions', () => {
    expect(parity('f_ex4')).toBe('even');
    expect(parity('f_ex4_simplified')).toBe('even');
    expect(parity('g_ex4_transfer')).toBe('even');
    expect(parity('f_ex4_prime')).toBe('odd');
    expect(parity('sigmoid_demo')).toBe('neither');
    expect(parity('exp_neg')).toBe('neither');
  });
  it('skips excluded points (x/(x+1) at x = -1) and is still not even', () => {
    expect(parity('quot_demo', [0.5, 1, 2, 3])).toBe('neither');
  });
  it('a function equal at one sample pair only is not even', () => {
    // sigmoid_demo(-x) = 1 - sigmoid_demo(x): equal to it only near the value 1/2.
    expect(parity('sigmoid_demo', [1e-12, 1, 2])).toBe('neither');
  });
  it('keeps to the safe range and refuses too few samples', () => {
    expect(parity('f_ex4', [1, 2, 3, 1000])).toBe('even');
    expect(() => parity('f_ex4', [1, 1000])).toThrow('too few samples');
  });
});

describe('A2: limit at +infinity', () => {
  it('f(x) -> 0 at +infinity and stays positive', () => {
    const p = limitProbe('f_ex4', '+inf');
    expect(p.converges).toBe(true);
    expect(p.estimate).toBeCloseTo(0, 8);
    expect(p.samples.every(s => s.fx > 0)).toBe(true);
    expect(toRational(p.estimate, { tol: 1e-8 })).toEqual([0, 1]);
  });
  it('numerator and denominator both grow (forme indéterminée ∞/∞)', () => {
    const p = limitProbe('f_ex4_num', '+inf');
    const q = limitProbe('f_ex4_den', '+inf');
    expect(p.diverges).toBe('+inf');
    expect(q.diverges).toBe('+inf');
  });
  it('e^{-x} -> 0 at +infinity, and is positive (not -infinity, not 1)', () => {
    const p = limitProbe('exp_neg', '+inf');
    expect(p.estimate).toBeCloseTo(0, 8);
    expect(p.samples.every(s => s.fx > 0)).toBe(true);
  });
  it('the factored form 1/(e^{-x} + e^x) equals f', () => {
    expect(
      equivalentExpressions('1/(e^(-x)+e^x)', 'e^x/(1+e^(2x))').verdict,
    ).toBe('equivalent');
  });
  it('throws a clear error beyond the safe range instead of a silent 0 / NaN', () => {
    expect(() => f(355)).toThrow(/f_ex4: x = 355 is outside the safe range/);
    expect(() => f(-400)).toThrow(EngineError);
    expect(() => evalFn('f_ex4_prime', 178)).toThrow(EngineError);
    expect(() => f(Number.POSITIVE_INFINITY)).toThrow(EngineError);
  });
  it('is finite and correct up to each safe bound', () => {
    for (const e of FUNCTION_REGISTRY) {
      const bound = 'safeAbsX' in e ? e.safeAbsX : 1e6;
      for (const x of [bound, -bound]) {
        expect(Number.isFinite(evalFn(e.id, x))).toBe(true);
      }
    }
    expect(f(354)).toBeCloseTo(evalFn('f_ex4_simplified', 354), 300);
    expect(f(354) / evalFn('f_ex4_simplified', 354)).toBeCloseTo(1, 12);
  });
});

describe("A3: f' and the variation table", () => {
  it("f'(x) = (1 - e^{2x}) e^x / (1 + e^{2x})^2 matches the numeric derivative", () => {
    for (const x of [-3, -1, -0.1, -1e-3, 0, 1e-3, 0.1, 1, 3]) {
      expect(derivative('f_ex4', x)).toBeCloseTo(evalFn('f_ex4_prime', x), 7);
    }
  });
  it("f' changes sign once, + to -, at 0: maximum f(0) = 1/2", () => {
    const s = signChange('f_ex4_prime', [-5, 5]);
    expect(s.changes).toHaveLength(1);
    expect(s.changes[0]!.x).toBeCloseTo(0, 9);
    expect(s.changes[0]!.from).toBe('+');
    expect(s.changes[0]!.to).toBe('-');
    expect(s.regions.map(r => r.sign)).toEqual(['+', '-']);
    expect(toRational(f(0))).toEqual([1, 2]);
  });
  it('0 < f <= 1/2', () => {
    for (let x = -8; x <= 8; x += 0.25) {
      expect(f(x)).toBeGreaterThan(0);
      expect(f(x)).toBeLessThanOrEqual(0.5 + 1e-15);
    }
  });
  it("quotient-rule example: (x/(x+1))' = 1/(x+1)^2", () => {
    for (const x of [-3, -0.5, 0, 2]) {
      expect(derivative('quot_demo', x)).toBeCloseTo(1 / (x + 1) ** 2, 7);
    }
  });
});

describe('Part B / C facts (recomputed now, used later)', () => {
  it('F(x) = ∫_0^{ln x} f = arctan(x) - π/4, F(1) = 0', () => {
    expect(F(1)).toBe(0);
    for (const x of [0.2, 0.5, 2, 5, 30]) {
      expect(F(x)).toBeCloseTo(Math.atan(x) - Math.PI / 4, 9);
    }
  });
  it('A(λ) = ∫_{-λ}^{λ} f = 2F(e^λ) -> π/2', () => {
    for (const l of [0.5, 1, 3]) {
      expect(integrate('f_ex4', -l, l)).toBeCloseTo(2 * F(Math.exp(l)), 9);
    }
    expect(integrate('f_ex4', -30, 30)).toBeCloseTo(Math.PI / 2, 9);
  });
  it('I_n bounds: 0 <= I_n <= π/(4(n+1)), and n·I_n -> F(e) ≈ 0.4328', () => {
    const Fe = (t: number) => Math.atan(Math.exp(t)) - Math.PI / 4;
    // Fine grid: t^n peaks in a band of width ~1/n near 1.
    const I = (n: number) => simpson(t => t ** n * Fe(t), 0, 1, 100000);
    for (const n of [1, 5, 20, 100]) {
      expect(I(n)).toBeGreaterThanOrEqual(0);
      expect(I(n)).toBeLessThanOrEqual(Math.PI / (4 * (n + 1)));
    }
    const target = Math.atan(Math.E) - Math.PI / 4;
    // The docs write "≈ 0.4328" (truncated); rounded it is 0.4329.
    expect(target).toBeCloseTo(0.43288, 5);
    expect(Math.abs(2000 * I(2000) - target)).toBeLessThan(
      Math.abs(20 * I(20) - target),
    );
    expect(2000 * I(2000)).toBeCloseTo(target, 2);
  });
  it('by parts: I_n = F(e)/(n+1) - 1/(n+1)·∫_0^1 t^{n+1} f(t) dt', () => {
    const Fe = (t: number) => Math.atan(Math.exp(t)) - Math.PI / 4;
    for (const n of [1, 4]) {
      const I = simpson(t => t ** n * Fe(t), 0, 1, 2000);
      const rhs =
        Fe(1) / (n + 1) -
        simpson(t => t ** (n + 1) * f(t), 0, 1, 2000) / (n + 1);
      expect(I).toBeCloseTo(rhs, 10);
    }
  });
});

describe('integrate (Simpson)', () => {
  it('is exact on a cubic', () => {
    expect(simpson(x => x ** 3 - 2 * x, 0, 2, 2)).toBeCloseTo(0, 12);
    expect(simpson(x => x ** 3, 0, 2, 2)).toBeCloseTo(4, 12);
  });
  it('is negative when the bounds are reversed', () => {
    expect(integrate('f_ex4', 1, 0)).toBeCloseTo(-integrate('f_ex4', 0, 1), 14);
    expect(integrate('f_ex4', 1, 0)).toBeLessThan(0);
  });
});

describe('signChange', () => {
  it('finds no change on a positive function', () => {
    const s = signChange('f_ex4', [-5, 5]);
    expect(s.changes).toEqual([]);
    expect(s.regions).toEqual([{ from: -5, to: 5, sign: '+' }]);
  });
  it('skips a point outside the domain instead of reporting a zero', () => {
    const s = signChange('quot_demo', [-3, 2]);
    expect(s.changes.map(c => Math.round(c.x * 1e6) / 1e6 + 0)).toEqual([0]);
    expect(s.undefinedAt.map(x => Math.round(x))).toEqual([-1]);
  });
});

describe('toRational', () => {
  it('recovers small fractions and refuses irrationals', () => {
    expect(toRational(0.5)).toEqual([1, 2]);
    expect(toRational(-0.75)).toEqual([-3, 4]);
    expect(toRational(Math.PI)).toBeNull();
    expect(toRational(Math.exp(60))).toBeNull(); // too big, never a throw
    expect(toRational(Math.atan(Math.E) - Math.PI / 4)).toBeNull();
  });
});

describe('engine calls (content answers)', () => {
  it('fnAt gives f(0) = 1/2 exactly', () => {
    expect(
      runEngineCall({ fn: 'fnAt', args: { fn: 'f_ex4', x: 0 } }, {}),
    ).toEqual({
      ok: true,
      value: [1, 2],
    });
  });
  it('limitAt gives lim f = 0 at +infinity', () => {
    expect(
      runEngineCall(
        { fn: 'limitAt', args: { fn: 'f_ex4', direction: '+inf' } },
        {},
      ),
    ).toEqual({ ok: true, value: [0, 1] });
  });
  it('refuses a value that is not a small fraction, and unknown ids', () => {
    expect(
      runEngineCall({ fn: 'fnAt', args: { fn: 'f_ex4', x: 1 } }, {}).ok,
    ).toBe(false);
    expect(
      runEngineCall({ fn: 'fnAt', args: { fn: 'nope', x: 1 } }, {}).ok,
    ).toBe(false);
    expect(
      runEngineCall(
        { fn: 'limitAt', args: { fn: 'f_ex4_num', direction: '+inf' } },
        {},
      ).ok,
    ).toBe(false);
  });
});

describe('equivalentExpressions', () => {
  it('rejects input the safe parser refuses (never evaluated as code)', () => {
    const r = equivalentExpressions('alert(1)', 'x');
    expect(r.verdict).toBe('parse_error');
  });
  it('finds a counterexample for a wrong simplification (cancel leaves 0)', () => {
    const r = equivalentExpressions('0/(e^(-x)+e^x)', 'e^x/(1+e^(2x))');
    expect(r.verdict).toBe('different');
  });
  it('checks a content expression against a registry function', () => {
    const ids: FnId[] = ['f_ex4', 'f_ex4_prime', 'f_ex4_simplified'];
    for (const id of ids) {
      const e = FUNCTION_REGISTRY.find(x => x.id === id)!;
      expect(equivalentExpressions(e.expr, e.expr).verdict).toBe('equivalent');
    }
  });
});

describe('signChangeOf (numeric derivative)', () => {
  it("finds the sign change of f' from the numeric derivative alone", () => {
    const s = signChangeOf(x => derivative('f_ex4', x), [-5, 5]);
    expect(s.changes).toHaveLength(1);
    expect(s.changes[0]!.x).toBeCloseTo(0, 6);
    expect(s.regions.map(r => r.sign)).toEqual(['+', '-']);
  });
});

describe('matchesFn (content expressions checked against the engine)', () => {
  it("accepts f, f(-x) and f' written out", () => {
    expect(
      matchesFn('e^x/(1+e^(2x))', { fn: 'f_ex4', transform: 'id' }).ok,
    ).toBe(true);
    expect(
      matchesFn('e^(-x)/(1+e^(-2x))', { fn: 'f_ex4', transform: 'neg' }).ok,
    ).toBe(true);
    expect(
      matchesFn('((1-e^(2x))e^x)/((1+e^(2x))^2)', {
        fn: 'f_ex4',
        transform: 'derivative',
      }).ok,
    ).toBe(true);
  });
  it('refuses a wrong formula and names a point where it differs', () => {
    const r = matchesFn('((1-e^(x))e^x)/((1+e^(2x))^2)', {
      fn: 'f_ex4',
      transform: 'derivative',
    });
    expect(r.ok).toBe(false);
    expect(r.at).toBeDefined();
  });
  it('skips points where the function is undefined', () => {
    expect(matchesFn('x/(x+1)', { fn: 'quot_demo', transform: 'id' }).ok).toBe(
      true,
    );
  });
  it('refuses unparsable input', () => {
    expect(matchesFn('alert(1)', { fn: 'f_ex4', transform: 'id' }).ok).toBe(
      false,
    );
  });
});
