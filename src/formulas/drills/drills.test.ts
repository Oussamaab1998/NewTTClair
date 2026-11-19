import {
  checkEquivalence,
  parseExpression,
  toString,
} from '../../engine/expression';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { parseLaw, sameInX, slope, valueIn } from '../law';
import type { FormulaRule } from '../schema';
import { ruleById, THEMES } from '../themes';
import { counterexample } from './counterexample';
import {
  calcItem,
  canRecognise,
  completeItem,
  judgeCalc,
  kindsFor,
  RECOGNISABLE,
  recogniseItem,
  shapeOf,
  trueFalseItem,
  type CalcItem,
} from './drills';
import { DRILL_EQUIVALENCE, hasSpec, instantiate, tidy } from './parts';

// 500 seeds per rule with 160-point equivalences: seconds per test when the
// whole suite runs in parallel, so the default 5 s limit would fail at random.
jest.setTimeout(60_000);

const RULES = THEMES.flatMap(t => t.rules);
/**
 * Dense points in [−9.7, 9.9], shifted off simple values so none sits on a
 * pole like x = −1/2: functions like ln(3x − 5) live on half the line.
 */
const DENSE = Array.from({ length: 50 }, (_, i) => -9.6863 + i * 0.4);
const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);
const rule = (id: string): FormulaRule => ruleById(id)!;

const drawable = (latex: string) => {
  expect(() => parseLatexSubset(latex)).not.toThrow();
};
const same = (a: Parameters<typeof checkEquivalence>[0], b: typeof a) =>
  checkEquivalence(a, b, DRILL_EQUIVALENCE).verdict;

describe('every rule has its «Calcule» generator', () => {
  it.each(RULES.map(r => [r.id]))('%s', id => {
    expect(hasSpec(id)).toBe(true);
  });
});

describe('«Calcule» on 500 seeds per rule', () => {
  it.each(RULES.map(r => [r.id, r] as const))('%s', (_id, r) => {
    for (const seed of SEEDS) {
      const inst = instantiate(r, seed);
      const where = `${r.id} seed ${seed}: ${toString(inst.f)}`;
      // f′ is the slope of f, on enough points.
      const fit = sameInX(x => slope(valueIn(inst.f), x), valueIn(inst.d), DENSE);
      expect({ where, same: fit.same, enough: fit.points >= 5 }).toEqual({
        where,
        same: true,
        enough: true,
      });
      // f is not a constant.
      expect({ where, v: same(inst.d, parseLaw('0')) }).toEqual({
        where,
        v: 'different',
      });
      // Tidying never changes a value.
      expect({ where, f: same(tidy(inst.f), inst.f), d: same(tidy(inst.d), inst.d) }).toEqual({
        where,
        f: 'equivalent',
        d: 'equivalent',
      });
      // The answer is no trap, and no two traps are the same: a slip is named once.
      for (const t of inst.traps) {
        expect({ where, trap: t.id, v: same(t.d, inst.d) }).toEqual({
          where,
          trap: t.id,
          v: 'different',
        });
      }
      inst.traps.forEach((a, i) =>
        inst.traps.slice(i + 1).forEach(b =>
          expect({ where, pair: [a.id, b.id], v: same(a.d, b.d) }).toEqual({
            where,
            pair: [a.id, b.id],
            v: 'different',
          }),
        ),
      );
    }
  });

  it.each(RULES.map(r => [r.id, r] as const))('%s: drawable, and judged right / trap', (_id, r) => {
    for (const seed of SEEDS.slice(0, 60)) {
      const item = calcItem(r, seed);
      [item.f, ...item.help.flat()].forEach(drawable);
      expect(judgeCalc(item, toString(tidy(item.expected)))).toEqual({ verdict: 'right' });
      expect(judgeCalc(item, `f'(x)=${toString(item.expected)}`)).toEqual({ verdict: 'right' });
      for (const t of item.traps) {
        expect(judgeCalc(item, toString(t.d))).toEqual({ verdict: 'trap', trapId: t.id });
      }
    }
  });
});

describe('judgeCalc on the quotient line of mockup 6', () => {
  // f(x) = (x + 2)/(x + 1): u′ = 1, v′ = 1, f′(x) = −1/(x + 1)².
  const parse = (s: string) => {
    const p = parseExpression(s);
    if (!p.ok) {
      throw new Error(s);
    }
    return p.ast;
  };
  const item: CalcItem = {
    kind: 'calc',
    ruleId: 'deriv.quotient',
    seed: 0,
    f: '',
    help: [[], [], []],
    expected: parse('(1*(x+1)-(x+2)*1)/(x+1)^2'),
    traps: [
      { id: 'quotient_of_derivatives', d: parse('1/1') },
      { id: 'order_swapped', d: parse('((x+2)*1-1*(x+1))/(x+1)^2') },
      { id: 'lost_square', d: parse('(1*(x+1)-(x+2)*1)/(x+1)') },
    ],
  };

  it('names the swapped order', () => {
    expect(judgeCalc(item, '((x+2)-(x+1))/(x+1)^2')).toEqual({
      verdict: 'trap',
      trapId: 'order_swapped',
    });
  });

  it('takes the simplified answer, with or without f′(x) =, and a chain', () => {
    expect(judgeCalc(item, '-1/(x+1)^2')).toEqual({ verdict: 'right' });
    expect(judgeCalc(item, 'f′(x) = −1/(x+1)^2')).toEqual({ verdict: 'right' });
    expect(judgeCalc(item, '((x+1)-(x+2))/(x+1)^2 = -1/(x+1)^2')).toEqual({
      verdict: 'right',
    });
  });

  it('a chain is judged at its first wrong side', () => {
    expect(judgeCalc(item, '((x+1)-(x+2))/(x+1)^2 = 1/(x+1)^2')).toEqual({
      verdict: 'trap',
      trapId: 'order_swapped',
    });
  });

  it('wrong, and unreadable', () => {
    expect(judgeCalc(item, 'x')).toEqual({ verdict: 'wrong' });
    expect(judgeCalc(item, '1/(x+1)^2 +').verdict).toBe('unreadable');
    expect(judgeCalc(item, "f'(x) =").verdict).toBe('unreadable');
  });
});

describe('«Complète»', () => {
  it.each(RULES.map(r => [r.id, r] as const))('%s: one right tile, all drawable', (_id, r) => {
    for (const seed of SEEDS.slice(0, 20)) {
      const item = completeItem(r, seed);
      expect(item.tiles.filter(t => t.right)).toHaveLength(1);
      [item.latex, item.answer, ...item.tiles.map(t => t.latex)].forEach(drawable);
    }
  });

  it('the tiles are shuffled by the seed', () => {
    const orders = new Set(
      SEEDS.slice(0, 30).map(s =>
        completeItem(rule('deriv.quotient'), s).tiles.map(t => t.latex).join('|'),
      ),
    );
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe('«Vrai ou faux»', () => {
  it.each(RULES.flatMap(r => r.traps.map(t => [r.id, t.id, r] as const)))(
    '%s, trap %s: a counter-example with nice numbers',
    (_r, trapId, r) => {
      const c = counterexample(r, trapId);
      expect(c).not.toBeNull();
      [...c!.parts, c!.truth, c!.trap].forEach(drawable);
    },
  );

  it('the quotient trap gets the mockup’s counter-example', () => {
    expect(counterexample(rule('deriv.quotient'), 'quotient_of_derivatives')).toEqual({
      parts: ['u=x', 'v=x'],
      x: 1,
      truth: "\\left(\\frac{u}{v}\\right)'=0",
      trap: "\\frac{u'}{v'}=1",
    });
  });

  it('the true rule comes up too, about once in three for a rule with two traps', () => {
    const items = SEEDS.map(s => trueFalseItem(rule('deriv.product'), s));
    const trues = items.filter(i => i.isTrue).length;
    expect(trues).toBeGreaterThan(120);
    expect(trues).toBeLessThan(220);
    for (const i of items) {
      expect(i.counterexample === null).toBe(i.isTrue);
      expect(i.trapId === null).toBe(i.isTrue);
    }
  });
});

describe('«Quelle règle ?»', () => {
  it.each(RECOGNISABLE.map(id => [id]))('%s: only the right option has the shape of f', id => {
    const r = rule(id);
    for (const seed of SEEDS.slice(0, 100)) {
      const item = recogniseItem(r, RULES, seed);
      const shape = shapeOf(instantiate(r, seed).f);
      expect(shape).toBe(shapeOf(parseLaw(r.law.of)));
      expect(item.options.filter(o => o.right).map(o => o.ruleId)).toEqual([id]);
      for (const o of item.options.filter(x => !x.right)) {
        expect({ id, other: o.ruleId, sameShape: shapeOf(parseLaw(rule(o.ruleId).law.of)) === shape }).toEqual({
          id,
          other: o.ruleId,
          sameShape: false,
        });
      }
      expect(item.options.length).toBeGreaterThanOrEqual(3);
      expect(item.options.length).toBeLessThanOrEqual(4);
      [item.f, ...item.parts, ...item.options.map(o => o.latex)].forEach(drawable);
    }
  });

  it('a 3ème pool still gives the quotient two other shapes, never 1/v', () => {
    const pool = RULES.filter(r => !['deriv.sqrt_u', 'deriv.exp_u', 'deriv.ln_u'].includes(r.id));
    expect(canRecognise(rule('deriv.quotient'), pool)).toBe(true);
    const item = recogniseItem(rule('deriv.quotient'), pool, 7);
    expect(item.options.map(o => o.ruleId).sort()).toEqual([
      'deriv.power_u',
      'deriv.product',
      'deriv.quotient',
    ]);
  });

  it('rules on x itself, the sum and k·u are not asked', () => {
    expect(kindsFor(rule('deriv.sqrt_x'), RULES)).toEqual(['complete', 'true_false', 'calc']);
    expect(kindsFor(rule('deriv.scalar'), RULES)).toEqual(['complete', 'true_false', 'calc']);
    expect(kindsFor(rule('deriv.quotient'), RULES)).toEqual([
      'complete',
      'true_false',
      'calc',
      'recognise',
    ]);
  });
});
