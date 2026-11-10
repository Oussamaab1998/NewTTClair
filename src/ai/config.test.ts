import {
  aiChargeUsd,
  aiCostUsd,
  aiWorstCaseUsd,
  hasServerFallback,
} from './config';

const usage = (input: number, cacheRead: number, output: number) => ({
  input,
  cacheRead,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output,
});

describe('AI prices', () => {
  it('prices Haiku 5.5 at a twentieth of Sonnet 5.5', () => {
    const u = usage(1_000, 30_000, 400);
    expect(aiCostUsd('claude-haiku-5-5', u)).toBeCloseTo(0.0006, 6);
    expect(aiCostUsd('claude-sonnet-5-5', u)).toBeCloseTo(0.012, 6);
  });

  it('uses the Haiku long-prompt card above 100K tokens', () => {
    expect(aiCostUsd('claude-haiku-5-5', usage(200_000, 0, 0))).toBeCloseTo(
      0.1,
      6,
    );
    expect(aiWorstCaseUsd('claude-haiku-5-5', 2_500_000, 0)).toBeCloseTo(1, 6);
  });

  it('charges a cold call as if the prompt were already cached', () => {
    const cold = {
      input: 200,
      cacheRead: 0,
      cacheWrite5m: 0,
      cacheWrite1h: 9_000,
      output: 300,
    };
    expect(aiCostUsd('claude-sonnet-5-5', cold)).toBeCloseTo(0.0394, 4);
    expect(aiChargeUsd('claude-sonnet-5-5', cold)).toBeCloseTo(0.0052, 4);
  });

  it('treats an unknown model as over every cap', () => {
    expect(aiCostUsd('claude-x', usage(1, 0, 1))).toBeNaN();
  });

  it('sends a server fallback only where one exists', () => {
    expect(hasServerFallback('claude-sonnet-5-5')).toBe(true);
    expect(hasServerFallback('claude-haiku-5-5')).toBe(false);
  });
});
