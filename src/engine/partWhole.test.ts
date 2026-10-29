import { barPositions, placeOnBar, quantityOf } from './partWhole';
import { EngineError, equals, frac, type Fraction } from './rational';

const f = (n: number, d = 1): Fraction => frac(n, d);

describe('placeOnBar: a value against the whole, exact', () => {
  it('12 of 6 is more than the whole: ratio 2, overflow 6', () => {
    expect(placeOnBar(f(6), f(12))).toEqual({ ratio: f(2), exceeds: true, overflow: f(6) });
  });

  it('120 of 60 (the slip on the probability of step s8) is the same picture: ratio 2', () => {
    const r = placeOnBar(f(60), f(120));
    expect(r.exceeds).toBe(true);
    expect(equals(r.ratio, f(2))).toBe(true);
  });

  it('the whole itself is not more than the whole', () => {
    expect(placeOnBar(f(6), f(6))).toEqual({ ratio: f(1), exceeds: false, overflow: f(0) });
  });

  it('a part inside the whole: 5/6 of a probability bar, 0 at the start', () => {
    expect(placeOnBar(f(1), f(5, 6))).toEqual({ ratio: f(5, 6), exceeds: false, overflow: f(0) });
    expect(placeOnBar(f(1), f(0))).toEqual({ ratio: f(0), exceeds: false, overflow: f(0) });
  });

  it('fractions stay exact (no float): 6/7 of a bar of 3/7 is exactly 2', () => {
    const r = placeOnBar(f(3, 7), f(6, 7));
    expect(r.ratio).toEqual(f(2));
    expect(r.overflow).toEqual(f(3, 7));
  });

  it('refuses a whole that is not positive and a value below zero', () => {
    expect(() => placeOnBar(f(0), f(1))).toThrow(EngineError);
    expect(() => placeOnBar(f(-6), f(1))).toThrow(EngineError);
    expect(() => placeOnBar(f(6), f(-1))).toThrow(EngineError);
  });
});

describe('barPositions: the steps of the stepped control, 0 to the whole (and on to twice the whole)', () => {
  it('whole 6, 6 ticks: 0, 1, ... 6', () => {
    expect(barPositions(f(6), 6, false)).toEqual([0, 1, 2, 3, 4, 5, 6].map(n => f(n)));
  });

  it('a probability bar of 10 ticks: 0, 1/10, ... 1', () => {
    const p = barPositions(f(1), 10, false);
    expect(p).toHaveLength(11);
    expect(p[3]).toEqual(f(3, 10));
    expect(p[10]).toEqual(f(1));
  });

  it('with overshoot the bar goes to twice the whole: 2 x ticks + 1 positions', () => {
    const p = barPositions(f(1), 10, true);
    expect(p).toHaveLength(21);
    expect(p[20]).toEqual(f(2));
    expect(p[11]).toEqual(f(11, 10));
  });

  it('strictly increasing, and the whole is one of the positions', () => {
    for (const [whole, ticks] of [
      [f(36), 12],
      [f(20), 5],
      [f(3, 7), 3],
    ] as const) {
      const p = barPositions(whole, ticks, true);
      for (let i = 1; i < p.length; i++) {
        expect(p[i]![0] * p[i - 1]![1]).toBeGreaterThan(p[i - 1]![0] * p[i]![1]);
      }
      expect(p.some(x => equals(x, whole))).toBe(true);
    }
  });

  it('2 to 12 ticks only', () => {
    expect(() => barPositions(f(6), 1, false)).toThrow(EngineError);
    expect(() => barPositions(f(6), 13, false)).toThrow(EngineError);
    expect(() => barPositions(f(6), 2.5, false)).toThrow(EngineError);
    expect(barPositions(f(6), 2, false)).toHaveLength(3);
    expect(barPositions(f(12), 12, false)).toHaveLength(13);
  });
});

describe('quantityOf: a fraction of a quantity', () => {
  it('1/6 of 36 is 6; 3/4 of 20 is 15', () => {
    expect(quantityOf(f(36), f(1, 6))).toEqual(f(6));
    expect(quantityOf(f(20), f(3, 4))).toEqual(f(15));
  });

  it('is exact when the result is not a whole number: 1/5 of 36 is 36/5', () => {
    expect(quantityOf(f(36), f(1, 5))).toEqual(f(36, 5));
  });

  it('refuses a fraction above 1 or not above 0, and a whole that is not positive', () => {
    expect(() => quantityOf(f(36), f(0))).toThrow(EngineError);
    expect(() => quantityOf(f(36), f(7, 6))).toThrow(EngineError);
    expect(() => quantityOf(f(0), f(1, 6))).toThrow(EngineError);
  });
});
