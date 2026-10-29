import { bernoulliSpread } from '../../engine/spreadChecks';
import { frac, type Fraction } from '../../engine/rational';
import { ratToString } from '../../engine/rationalFormat';
import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import { SpreadSliderPropsSchema } from './schemas';
import {
  SPREAD_SLIDER_REVEALS,
  spreadCalc,
  spreadFinding,
  spreadModel,
} from './spread';

const tenths = (extra: Record<string, unknown> = {}) => ({
  family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/10', init: '3/10' } },
  ...extra,
});
const model = (p: Record<string, unknown>) => spreadModel(SpreadSliderPropsSchema.parse(p));
const s = (f: Fraction) => ratToString(f);
const is = (n: number, d = 1) => (f: readonly [number, number]) => f[0] === n && f[1] === d;

describe('spreadModel: the Bernoulli family on tenths', () => {
  const m = model(tenths());

  it('11 positions, p = 0, 1/10, ... 1, starting on 3/10', () => {
    expect(m.positions).toHaveLength(11);
    expect(m.positions.map(x => x.label)).toEqual(['0', '1/10', '1/5', '3/10', '2/5', '1/2', '3/5', '7/10', '4/5', '9/10', '1']);
    expect(m.init).toBe(3);
  });

  it('p = 3/10 on 0 and 1: distances 3/10 and 7/10, squares 9/100 and 49/100, contributions 63/1000 and 147/1000, total 21/100', () => {
    const f = m.positions[3]!.frame;
    expect(s(f.mean)).toBe('3/10');
    expect(f.rows.map(r => s(r.dist))).toEqual(['3/10', '7/10']);
    expect(f.rows.map(r => s(r.d2))).toEqual(['9/100', '49/100']);
    expect(f.rows.map(r => s(r.w))).toEqual(['63/1000', '147/1000']);
    expect(s(f.variance)).toBe('21/100');
  });

  it('the total at every position is p(1 - p)', () => {
    for (const x of m.positions) {
      expect(x.p).not.toBeNull();
      expect(x.frame.variance).toEqual(bernoulliSpread(x.p!));
    }
  });

  it('the scales: the largest distance is 1 and the largest total is 1/4 (so the picture never changes scale)', () => {
    expect(m.maxDist).toEqual(frac(1));
    expect(m.maxVar).toEqual(frac(1, 4));
  });

  it('the total waits for 3 distinct positions by default; a lock of 5, or none when no total is shown', () => {
    expect(m.lock).toBe(3);
    expect(model(tenths({ totalLockedUntil: { positions: 5 } })).lock).toBe(5);
    expect(model(tenths({ show: { total: false } })).lock).toBe(0);
  });

  it('a grid of twentieths has 21 positions', () => {
    const m20 = model({ family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/20', init: '1/2' } } });
    expect(m20.positions).toHaveLength(21);
    expect(m20.init).toBe(10);
  });
});

describe('spreadModel: scenarios with the same mean and different spreads', () => {
  const m = model({
    values: [1, 2, 3],
    family: {
      kind: 'scenarios',
      sameMean: true,
      scenarios: [
        { id: 'a', probabilities: ['1/3', '1/3', '1/3'] },
        { id: 'b', probabilities: ['1/2', '0', '1/2'] },
        { id: 'c', probabilities: ['0', '1', '0'] },
      ],
    },
  });

  it('mean 2 for all three; variances 2/3, 1 and 0', () => {
    expect(m.positions.map(x => s(x.frame.mean))).toEqual(['2', '2', '2']);
    expect(m.positions.map(x => s(x.frame.variance))).toEqual(['2/3', '1', '0']);
    expect(m.positions.map(x => x.label)).toEqual(['a', 'b', 'c']);
    expect(m.positions.every(x => x.p === null)).toBe(true);
  });
});

describe('spreadModel: a fixed law (Exercise 2: -2, -1, 0, 2)', () => {
  const m = model({
    values: [-2, -1, 0, 2],
    family: { kind: 'fixed', probabilities: ['1/6', '1/2', '3/10', '1/30'] },
  });

  it('one position per value to look at, the same law behind each', () => {
    expect(m.positions).toHaveLength(4);
    expect(m.positions.map(x => x.label)).toEqual(['−2', '−1', '0', '2']);
    const variances = new Set(m.positions.map(x => s(x.frame.variance)));
    expect(variances.size).toBe(1);
  });
});

describe('spreadCalc: the engine writes the calculation', () => {
  it('p x square for each value, then their sum', () => {
    const f = model(tenths()).positions[3]!.frame;
    expect(spreadCalc(f)).toEqual([
      '\\frac{7}{10} \\times \\frac{9}{100} = \\frac{63}{1000}',
      '\\frac{3}{10} \\times \\frac{49}{100} = \\frac{147}{1000}',
      '\\frac{63}{1000} + \\frac{147}{1000} = \\frac{21}{100}',
    ]);
  });
});

describe('the finding', () => {
  const m = model(tenths());

  it('found: p, the mean and the variance of the last position, with the calculation', () => {
    const f = spreadFinding(m, 3, ['moved:1/10', 'moved:1/2', 'moved:3/10'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'spread.bernoulli',
      numbers: { p: '3/10', mean: '3/10', variance: '21/100' },
      how: 'found',
      correct: null,
      calc: [
        '\\frac{7}{10} \\times \\frac{9}{100} = \\frac{63}{1000}',
        '\\frac{3}{10} \\times \\frac{49}{100} = \\frac{147}{1000}',
        '\\frac{63}{1000} + \\frac{147}{1000} = \\frac{21}{100}',
      ],
    });
  });

  it('skipped: never correct, no calculation (the total was shown, not found)', () => {
    const f = spreadFinding(m, 3, ['reveal'], 'skipped');
    expect(f.how).toBe('skipped');
    expect(f.correct).toBeNull();
    expect(f.calc).toBeUndefined();
  });

  it('the checkpoint answer goes into the finding when it was given', () => {
    const f = spreadFinding(m, 3, ['moved:1/2', 'checkpoint:p*(1-p)'], 'found', true);
    expect(f.correct).toBe(true);
    expect(spreadFinding(m, 3, [], 'found', false).correct).toBe(false);
  });

  it('scenarios: the mean and the variance of each', () => {
    const sc = model({
      values: [1, 2, 3],
      family: {
        kind: 'scenarios',
        scenarios: [
          { id: 'a', probabilities: ['1/3', '1/3', '1/3'] },
          { id: 'b', probabilities: ['1/2', '0', '1/2'] },
          { id: 'c', probabilities: ['0', '1', '0'] },
        ],
      },
    });
    const f = spreadFinding(sc, 1, ['moved:a', 'moved:b', 'moved:c'], 'found');
    expect(f.findingId).toBe('spread.scenarios');
    expect(f.numbers).toMatchObject({ m0: '2', v0: '2/3', m1: '2', v1: '1', m2: '2', v2: '0' });
  });

  it('the route has at most 12 tokens', () => {
    const long = Array.from({ length: 30 }, () => 'moved:1/2');
    expect(spreadFinding(m, 5, long, 'found').route).toHaveLength(12);
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(SPREAD_SLIDER_REVEALS)).toBe(true);
  });

  const locked = tenths({ totalLockedUntil: { positions: 3 } });

  it('the total (21/100) is by state; safe only when the lock is written in the props', () => {
    expect(revealedByRules(SPREAD_SLIDER_REVEALS, locked, undefined, is(21, 100))).toBeNull();
    const unlocked = revealedByRules(SPREAD_SLIDER_REVEALS, tenths(), undefined, is(21, 100));
    expect(unlocked?.value).toBe('variance_total');
    expect(unlocked?.by).toBe('state');
    expect(unlocked?.minHint).toBe('ladder_end');
    // no total shown at all: nothing to reveal
    expect(
      revealedByRules(SPREAD_SLIDER_REVEALS, tenths({ show: { total: false } }), undefined, is(21, 100)),
    ).toBeNull();
  });

  it('the distances, squares and contributions at the starting p are on screen from the start', () => {
    for (const [n, d] of [[3, 10], [7, 10], [9, 100], [49, 100], [63, 1000], [147, 1000]] as const) {
      expect(revealedByRules(SPREAD_SLIDER_REVEALS, locked, undefined, is(n, d))?.value).toBe('frame');
    }
  });

  it('a value that is none of them is not revealed', () => {
    expect(revealedByRules(SPREAD_SLIDER_REVEALS, locked, undefined, is(60))).toBeNull();
  });

  it('invalid props reveal nothing', () => {
    expect(revealedByRules(SPREAD_SLIDER_REVEALS, { family: 3 }, undefined, is(3, 10))).toBeNull();
  });
});
