import { SpreadSliderPropsSchema } from './schemas';

const bern = (over: Record<string, unknown> = {}) => ({
  family: {
    kind: 'bernoulli',
    p: { min: '0', max: '1', step: '1/10', init: '3/10' },
  },
  ...over,
});

describe('SpreadSlider props', () => {
  const ok = (p: unknown) => SpreadSliderPropsSchema.safeParse(p);
  const messages = (p: unknown) => {
    const r = ok(p);
    return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  };

  it('accepts the demo cases', () => {
    expect(ok(bern()).success).toBe(true);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/20', init: '1/2' } } })).success).toBe(true);
    // three laws on 1, 2, 3 with the same mean 2: variances 2/3, 1, 0
    expect(
      ok({
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
      }).success,
    ).toBe(true);
    // the Exercise 2 law
    expect(
      ok({
        values: [-2, -1, 0, 2],
        family: { kind: 'fixed', probabilities: ['1/6', '1/2', '3/10', '1/30'] },
      }).success,
    ).toBe(true);
  });

  it('defaults: values 0 and 1, everything shown, the total waits for 3 positions', () => {
    const r = SpreadSliderPropsSchema.parse(bern());
    expect(r.values).toEqual([0, 1]);
    expect(r.show).toEqual({ distances: true, squares: true, contributions: true, total: true });
    expect(r.totalLockedUntil).toBeUndefined();
  });

  it('bernoulli: two values, p inside [0, 1] on a grid of at most 21 positions, init on the grid', () => {
    expect(ok({ ...bern(), values: [0, 1, 2] }).success).toBe(false);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '0', max: '3/2', step: '1/10', init: '1/2' } } })).success).toBe(false);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '1/2', max: '1/2', step: '1/10', init: '1/2' } } })).success).toBe(false);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/30', init: '1/2' } } })).success).toBe(false);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/3', init: '1/2' } } })).success).toBe(false);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/10', init: '1/20' } } })).success).toBe(false);
    expect(ok(bern({ family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1/10', init: '3/2' } } })).success).toBe(false);
  });

  it('fixed and scenarios: one probability per value, each at least 0, adding up to 1', () => {
    expect(ok({ values: [0, 1, 2], family: { kind: 'fixed', probabilities: ['1/2', '1/2'] } }).success).toBe(false);
    expect(ok({ values: [0, 1], family: { kind: 'fixed', probabilities: ['1/2', '1/3'] }, show: { total: false } }).success).toBe(false);
    expect(ok({ values: [0, 1], family: { kind: 'fixed', probabilities: ['3/2', '-1/2'] }, show: { total: false } }).success).toBe(false);
    expect(ok({ values: [0, 0], family: { kind: 'fixed', probabilities: ['1/2', '1/2'] } }).success).toBe(false);
  });

  it('sameMean: the loader rejects scenarios whose means differ', () => {
    const scenarios = (sameMean: boolean) => ({
      values: [1, 2, 3],
      family: {
        kind: 'scenarios',
        sameMean,
        scenarios: [
          { id: 'a', probabilities: ['1/3', '1/3', '1/3'] },
          { id: 'b', probabilities: ['1/2', '1/2', '0'] },
        ],
      },
      show: { total: false },
    });
    expect(ok(scenarios(false)).success).toBe(true);
    expect(ok(scenarios(true)).success).toBe(false);
    expect(messages(scenarios(true)).join(' ')).toMatch(/means differ/);
  });

  it('the total lock: needs the total shown and no more positions than exist', () => {
    expect(ok(bern({ totalLockedUntil: { positions: 5 } })).success).toBe(true);
    expect(ok(bern({ totalLockedUntil: { positions: 12 } })).success).toBe(false);
    expect(ok(bern({ show: { total: false }, totalLockedUntil: { positions: 3 } })).success).toBe(false);
    // the default lock of 3 needs 3 positions: a Bernoulli grid of 2 cannot hold it
    expect(
      ok({
        family: { kind: 'bernoulli', p: { min: '0', max: '1', step: '1', init: '0' } },
      }).success,
    ).toBe(false);
  });

  it('checkpoint larger_spread: one winner (p and 1 - p tie, so both cannot be options)', () => {
    const c = (options: string[]) => bern({ checkpoint: { kind: 'larger_spread', options } });
    expect(ok(c(['1/10', '3/10', '1/2'])).success).toBe(true);
    expect(ok(c(['1/10', '9/10'])).success).toBe(false);
    expect(messages(c(['1/10', '9/10'])).join(' ')).toMatch(/tie/);
    expect(ok(c(['1/2', '3/2'])).success).toBe(false);
  });

  it('checkpoint zero_at_ends: exactly one expression has the property, none coincides on the sample points', () => {
    const c = (expressions: string[]) => bern({ checkpoint: { kind: 'zero_at_ends', expressions } });
    expect(ok(c(['p', 'p^2', 'p*(1-p)', '1-p'])).success).toBe(true);
    expect(ok(c(['p', 'p^2', '1-p'])).success).toBe(false);
    expect(ok(c(['p*(1-p)', '4*p*(1-p)', 'p^2'])).success).toBe(false);
    // 2*p*(1-p)/2 is p*(1-p) written differently: the same value at every sample point
    expect(ok(c(['p*(1-p)', 'p*(1-p)*2/2', 'p^2'])).success).toBe(false);
    expect(ok(c(['p +', 'p^2', 'p*(1-p)'])).success).toBe(false);
  });

  it('checkpoints are for the Bernoulli family only', () => {
    expect(
      ok({
        values: [0, 1, 2],
        family: { kind: 'fixed', probabilities: ['1/2', '1/4', '1/4'] },
        checkpoint: { kind: 'larger_spread', options: ['1/10', '1/2'] },
      }).success,
    ).toBe(false);
  });

  it('is strict about unknown keys', () => {
    expect(ok({ ...bern(), speed: 2 }).success).toBe(false);
  });
});
