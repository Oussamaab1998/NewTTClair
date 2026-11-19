import {
  checkLaw,
  differ,
  fillHole,
  MIN_POINTS,
  sameInX,
  slope,
} from './law';

describe('checkLaw: the slope of of(u, v) against d, on sample functions', () => {
  it.each([
    ['u/v', '(Uv-uV)/v^2'],
    ['uv', 'Uv+uV'],
    ['u^n', 'nUu^(n-1)'],
    ['e^u', 'Ue^u'],
    ['ln(u)', 'U/u'],
    ['sqrt(u)', 'U/(2sqrt(u))'],
    ['x^n', 'nx^(n-1)'],
  ])('(%s)′ = %s holds', (of, d) => {
    const v = checkLaw(of, d);
    expect(v.holds).toBe(true);
    if (v.holds === true) {
      expect(v.points).toBeGreaterThanOrEqual(MIN_POINTS);
    }
  });

  it.each([
    ['u/v', 'U/V'],
    ['u/v', '(uV-Uv)/v^2'],
    ['u/v', '(Uv-uV)/v'],
    ['uv', 'UV'],
    ['e^u', 'e^u'],
    ['ln(u)', '1/u'],
  ])('(%s)′ = %s is refused, with a counter-example', (of, d) => {
    const v = checkLaw(of, d);
    expect(v.holds).toBe(false);
    if (v.holds === false) {
      expect(v.counterexample.slope).not.toBeCloseTo(v.counterexample.d, 3);
    }
  });

  it('says nothing when almost no sample is defined', () => {
    expect(checkLaw('ln(-u^2-1)', 'U').holds).toBeNull();
  });
});

describe('the helpers', () => {
  it('slope measures a derivative', () => {
    expect(slope(x => x ** 3, 2)).toBeCloseTo(12, 6);
    expect(slope(Math.log, -1)).toBeNaN();
  });

  it('fillHole puts the tile in parentheses', () => {
    expect(fillHole('(Uv-?)/v^2', 'uV')).toBe('(Uv-(uV))/v^2');
  });

  it('differ tells two expressions apart, and not two forms of one', () => {
    expect(differ('Uv-uV', 'uV-Uv')).toBe(true);
    expect(differ('Uv+uV', 'uV+vU')).toBe(false);
  });

  it('sameInX finds where two functions part', () => {
    expect(sameInX(x => (x + 1) ** 2, x => x * x + 2 * x + 1).same).toBe(true);
    const r = sameInX(x => x * x, x => x * x + 1e-3);
    expect(r.same).toBe(false);
    expect(r.at).toBeDefined();
  });
});
