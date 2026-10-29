import { RepeatedRunsPropsSchema } from './schemas';

const fraction = (over: Record<string, unknown> = {}) => ({
  N: 36,
  mode: 'fraction_of_total',
  stages: [{ p: '1/6' }],
  ...over,
});

describe('RepeatedRuns props', () => {
  const ok = (p: unknown) => RepeatedRunsPropsSchema.safeParse(p);
  const messages = (p: unknown) => {
    const r = ok(p);
    return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  };

  it('accepts the demo cases', () => {
    expect(ok(fraction()).success).toBe(true);
    expect(ok(fraction({ interaction: 'shade' })).success).toBe(true);
    expect(ok({ N: 36, mode: 'two_stage', stages: [{ p: '1/6' }, { p: '1/6' }] }).success).toBe(true);
    expect(ok({ N: 60, mode: 'two_stage', stages: [{ p: '1/5' }, { p: '1/3' }] }).success).toBe(true);
    expect(
      ok({
        N: 60,
        mode: 'tally',
        tally: { values: [1, 2, 3, 4, 5, 6], probabilities: ['1/6', '1/6', '1/6', '1/6', '1/6', '1/6'] },
      }).success,
    ).toBe(true);
  });

  it('defaults: watch, 6 columns', () => {
    expect(RepeatedRunsPropsSchema.parse(fraction())).toMatchObject({ interaction: 'watch', cols: 6 });
  });

  it('the loader rejects counts that are not whole numbers: N = 36 and p = 1/5 is 7.2', () => {
    expect(ok(fraction({ stages: [{ p: '1/5' }] })).success).toBe(false);
    expect(messages(fraction({ stages: [{ p: '1/5' }] })).join(' ')).toMatch(/whole numbers at stage 1/);
    // the second stage: 36 -> 6 -> 6 x 1/4 = 3/2
    expect(messages({ N: 36, mode: 'two_stage', stages: [{ p: '1/6' }, { p: '1/4' }] }).join(' ')).toMatch(/stage 2/);
  });

  it('N from 4 to 60, and the last stage must have a run', () => {
    expect(ok(fraction({ N: 3 })).success).toBe(false);
    expect(ok(fraction({ N: 61 })).success).toBe(false);
    expect(ok(fraction({ stages: [{ p: '0' }] })).success).toBe(false);
  });

  it('the number of stages follows the mode', () => {
    expect(ok(fraction({ stages: [{ p: '1/6' }, { p: '1/6' }] })).success).toBe(false);
    expect(ok({ N: 36, mode: 'two_stage', stages: [{ p: '1/6' }] }).success).toBe(false);
    expect(ok({ N: 36, mode: 'two_stage' }).success).toBe(false);
  });

  it('shading: only fraction_of_total, at most 36 runs, at most 6 columns', () => {
    expect(ok({ N: 36, mode: 'two_stage', stages: [{ p: '1/6' }, { p: '1/6' }], interaction: 'shade' }).success).toBe(false);
    expect(ok(fraction({ N: 60, interaction: 'shade' })).success).toBe(false);
    expect(ok(fraction({ interaction: 'shade', cols: 8 })).success).toBe(false);
    expect(ok(fraction({ N: 60, cols: 10 })).success).toBe(true);
  });

  it('tally: needs the law, no stages, whole numbers of runs per value, a law that adds up to 1', () => {
    const t = (over: Record<string, unknown>) => ({
      N: 60,
      mode: 'tally',
      tally: { values: [1, 2], probabilities: ['1/2', '1/2'] },
      ...over,
    });
    expect(ok(t({})).success).toBe(true);
    expect(ok(t({ tally: undefined })).success).toBe(false);
    expect(ok(t({ stages: [{ p: '1/2' }] })).success).toBe(false);
    expect(ok(t({ N: 7 })).success).toBe(false);
    expect(ok(t({ tally: { values: [1, 2], probabilities: ['1/2', '1/3'] } })).success).toBe(false);
    expect(ok(t({ interaction: 'shade' })).success).toBe(false);
    expect(ok(fraction({ tally: { values: [1, 2], probabilities: ['1/2', '1/2'] } })).success).toBe(false);
  });

  it('is strict about unknown keys', () => {
    expect(ok(fraction({ speed: 2 })).success).toBe(false);
  });
});
