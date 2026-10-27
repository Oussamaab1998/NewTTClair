import {
  estimateCostUsd,
  MODELS,
  modelInfo,
  worstCaseCostUsd,
  type ModelInfo,
} from './models';

const info = (id: string): ModelInfo => {
  const m = modelInfo(id);
  if (!m) {
    throw new Error(`missing ${id}`);
  }
  return m;
};

describe('models: Anthropic entries', () => {
  it('every Anthropic model has official sources, a check date and a cache write price', () => {
    const anthropic = (Object.values(MODELS) as ModelInfo[]).filter(
      m => m.provider === 'anthropic',
    );
    expect(anthropic.map(m => m.id).sort()).toEqual([
      'claude-haiku-4-5-20251001',
      'claude-haiku-5-5',
      'claude-sonnet-5-5',
    ]);
    for (const m of anthropic) {
      expect(m.sources.model).toMatch(
        /^https:\/\/platform\.claude\.com\/docs\//,
      );
      expect(m.sources.pricing).toMatch(
        /^https:\/\/platform\.claude\.com\/docs\//,
      );
      expect(m.sources.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.priceUsdPerMTok.cacheWrite).toBeGreaterThan(
        m.priceUsdPerMTok.input,
      );
      expect(m.anthropic?.minCacheTokens).toBeGreaterThan(0);
    }
  });

  it('bills uncached input, cache reads, cache writes and output at their own rates', () => {
    // Sonnet 5.5: input 2, write 2.5, read 0.1, output 10 ($ / MTok).
    const cost = estimateCostUsd(info('claude-sonnet-5-5'), {
      inputTokens: 1_000_000 + 2_000_000 + 4_000_000,
      cachedInputTokens: 2_000_000,
      cacheWriteInputTokens: 4_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(2 + 0.2 + 10 + 10, 10);
  });

  it('OpenAI usage without cache writes is billed as before', () => {
    const cost = estimateCostUsd(info('gpt-6-luna'), {
      inputTokens: 1_000_000,
      cachedInputTokens: 500_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.05 + 0.005 + 0.5, 10);
  });

  it('the worst case prices every input token at the cache write rate', () => {
    const m = info('claude-haiku-4-5-20251001');
    expect(worstCaseCostUsd(m, 1_000_000, 1_000_000)).toBeCloseTo(1.25 + 5, 10);
    expect(worstCaseCostUsd(m, 1000, 600)).toBeGreaterThanOrEqual(
      estimateCostUsd(m, {
        inputTokens: 1000,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 1000,
        outputTokens: 600,
      }),
    );
  });
});
