import { evalFn } from '../../engine/analysis';
import {
  autoRange,
  curvePath,
  lineAcross,
  foldOverlap,
  foldPath,
  makeView,
  plainNumber,
  readoutNumber,
  readoutPair,
  scientific,
  valueLine,
  regionOf,
  variationColumns,
  sampleCurve,
  shadePath,
  signedPaths,
} from './plot';

const view = makeView([-4, 4], [0, 1], 400, 200, 0);

describe('makeView', () => {
  it('maps the domain and range to pixels (y grows downwards)', () => {
    expect(view.px(-4)).toBe(0);
    expect(view.px(4)).toBe(400);
    expect(view.py(1)).toBe(0);
    expect(view.py(0)).toBe(200);
    expect(view.xOf(200)).toBe(0);
  });
});

describe('sampleCurve', () => {
  it('samples the engine function; undefined points are null', () => {
    const pts = sampleCurve('quot_demo', [-3, 1], 4);
    expect(pts.map(p => p.x)).toEqual([-3, -2, -1, 0, 1]);
    expect(pts[2]!.y).toBeNull();
    expect(pts[3]!.y).toBe(0);
    expect(sampleCurve('f_ex4', [0, 0], 1)).toHaveLength(2);
  });
});

describe('autoRange', () => {
  it('covers f_ex4 on [-4, 4] with the x-axis and its maximum', () => {
    const [lo, hi] = autoRange('f_ex4', [-4, 4]);
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(evalFn('f_ex4', 0));
  });
  it('clips poles instead of stretching to infinity', () => {
    const [lo, hi] = autoRange('quot_demo', [-3, 2]);
    expect(lo).toBeGreaterThanOrEqual(-11);
    expect(hi).toBeLessThanOrEqual(11);
  });
});

describe('curvePath', () => {
  it('draws one subpath for a continuous function', () => {
    const d = curvePath(sampleCurve('f_ex4', [-4, 4], 40), view);
    expect(d.match(/M/g)).toHaveLength(1);
    expect(d.startsWith('M0.00,')).toBe(true);
  });
  it('breaks at a pole (no vertical line across the asymptote)', () => {
    const v = makeView([-3, 2], [-10, 10], 400, 200, 0);
    const d = curvePath(sampleCurve('quot_demo', [-3, 2], 50), v);
    expect(d.match(/M/g)!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('signedPaths', () => {
  it("splits f' at its sign change: + then -", () => {
    const parts = signedPaths('f_ex4_prime', [-3, 3], view, 60);
    expect(parts.map(p => p.sign)).toEqual(['+', '-']);
    expect(parts.every(p => p.d.startsWith('M'))).toBe(true);
  });
});

describe('shadePath', () => {
  it('closes the area down to the x-axis, in either bound order', () => {
    const d = shadePath('f_ex4', 1, -1, view, 20);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain(`${view.px(-1).toFixed(2)},${view.py(0).toFixed(2)}`);
  });
});

describe('plainNumber', () => {
  it('writes engine values for SVG labels', () => {
    expect(plainNumber(0.5)).toBe('1/2');
    expect(plainNumber(-1)).toBe('\u22121');
    expect(plainNumber(Math.E)).toBe('2,72');
  });
});

describe('fold', () => {
  it('overlap is true for the even f, false for the sigmoid', () => {
    expect(foldOverlap('f_ex4', 3)).toBe(true);
    expect(foldOverlap('sigmoid_demo', 3)).toBe(false);
  });
  it('k = 1 draws the left half at -x (the mirror image)', () => {
    const v = makeView([-3, 3], [0, 1], 300, 100, 0);
    const folded = foldPath('sigmoid_demo', [-3, 3], 1, v, 3);
    // x = -3 lands on px(3); y stays f(-3).
    expect(folded.startsWith(`M${v.px(3).toFixed(2)},`)).toBe(true);
    expect(folded).toContain(`${v.py(evalFn('sigmoid_demo', -3)).toFixed(2)}`);
  });
});

describe('readoutNumber', () => {
  it('uses fractions, 3 decimals, or scientific notation for huge / tiny values', () => {
    expect(readoutNumber(0.5)).toBe('1/2');
    expect(readoutNumber(Math.E)).toBe('2,718');
    expect(readoutNumber(0.01)).toBe('0,01');
    expect(readoutNumber(2.7)).toBe('2,7');
    expect(readoutNumber(1.5, { fractions: false })).toBe('1,5');
    expect(readoutNumber(Math.exp(60))).toBe('1,14 × 10²⁶');
    expect(readoutNumber(Math.exp(-20))).toBe('2,06 × 10⁻⁹');
  });
});

describe('variationColumns', () => {
  it("f_ex4: one column at 0, f' + then -", () => {
    const c = variationColumns('f_ex4', [-5, 5]);
    expect(c.xs).toEqual([-5, 0, 5]);
    expect(c.signs).toEqual(['+', '-']);
    expect(regionOf(c, -2)).toBe(0);
    expect(regionOf(c, 0.5)).toBe(1);
    expect(regionOf(c, 5)).toBe(1);
  });
});

describe('lineAcross', () => {
  it('keeps both endpoints on the line, even for a steep slope', () => {
    const v = makeView([-3, 3], [0, 0.5], 300, 100, 0);
    for (const slope of [0.25, 5, -40]) {
      const l = lineAcross(v, -1, 0.3, slope);
      const pxSlope = (l.y2 - l.y1) / (l.x2 - l.x1);
      // Pixel slope = -slope · (px per unit y) / (px per unit x).
      expect(pxSlope).toBeCloseTo((-slope * (100 / 0.5)) / (300 / 6), 9);
      const xMid = v.xOf((l.x1 + l.x2) / 2);
      expect(v.py(0.3 + slope * (xMid + 1))).toBeCloseTo((l.y1 + l.y2) / 2, 6);
    }
  });
});

describe('readoutPair', () => {
  it('uses the same number of decimals for both sides', () => {
    expect(readoutPair(Math.E / (Math.E ** 2 + 2), 0.324)).toEqual([
      '0,290',
      '0,324',
    ]);
    expect(readoutPair(0.5, 0.25)).toEqual(['1/2', '1/4']);
    expect(readoutPair(0.5, 0.324)).toEqual(['0,500', '0,324']);
    expect(readoutPair(Math.exp(-20), 0.1)).toEqual([
      '2,06 × 10⁻⁹',
      '1,00 × 10⁻¹',
    ]);
  });
});

describe('readouts use the real minus sign (U+2212), never a hyphen', () => {
  const M = '\u2212';
  it.each([
    [readoutNumber(-1), `${M}1`],
    [readoutNumber(-0.5), `${M}1/2`],
    [readoutNumber(-0.324, { fractions: false }), `${M}0,324`],
    [valueLine('f', -1, 0.324), `f(${M}1) = 0,324`],
    [readoutPair(-0.1234, 0.1234)[0], `${M}0,123`],
    [scientific(-123456), `${M}1,23 \u00d7 10\u2075`],
  ])('%s', (shown, expected) => {
    expect(shown).toBe(expected);
    expect(shown).not.toContain('-');
  });
});
