/**
 * Pinned model ids, prices and lifecycle, from each provider's official pages
 * only (OpenAI: developers.openai.com; Anthropic: platform.claude.com).
 * Every entry records where each fact came from and when it was checked.
 * Prices are list prices (standard tier, per 1M tokens) used for ESTIMATES only.
 * The newer models have no dated snapshot (the alias is the only id): rerun the
 * replay comparison before every release (docs/DECISIONS.md).
 */

export interface ModelInfo {
  id: string;
  provider: 'openai' | 'anthropic';
  /** OpenAI: accepts `reasoning.effort`; the lowest value the model page lists. */
  reasoning: { minEffort: 'none' | 'low' } | null;
  /**
   * Anthropic: `output_config.effort` we send (null = the model takes no
   * effort parameter); `thinking` we send (null = omit: Haiku 4.5 then runs
   * without thinking); the minimum cacheable prompt length (caching page).
   * Thinking is turned off to keep latency inside the planner timeout.
   */
  anthropic?: {
    effort: 'low' | null;
    thinking: { type: 'disabled' } | { type: 'between_tools' } | null;
    minCacheTokens: number;
  };
  /**
   * 'dated' = fixed snapshot; 'alias' = the only id, can change under the same
   * name; 'pinned' = a dateless id the provider states is a pinned snapshot.
   */
  snapshot: 'dated' | 'alias' | 'pinned';
  /** cachedInput = cache read; cacheWrite = 5-minute cache write (Anthropic). */
  priceUsdPerMTok: {
    input: number;
    cachedInput: number;
    output: number;
    cacheWrite?: number;
  };
  /** Announced shutdown (deprecations page), if any. */
  shutdown?: { date: string; announced: string; replacement: string };
  sources: {
    model: string;
    pricing: string;
    deprecations: string;
    checkedOn: string;
    /** Anything the pages did not state directly. */
    note?: string;
  };
}

const PRICING = 'https://developers.openai.com/api/docs/pricing';
const DEPRECATIONS = 'https://developers.openai.com/api/docs/deprecations';
const CHECKED = '2026-10-17';

const A_PRICING = 'https://platform.claude.com/docs/en/about-claude/pricing';
const A_DEPRECATIONS =
  'https://platform.claude.com/docs/en/about-claude/model-deprecations';
const A_CHECKED = '2026-10-21';

export const MODELS = {
  'gpt-4o-2024-08-06': {
    id: 'gpt-4o-2024-08-06',
    provider: 'openai',
    reasoning: null,
    snapshot: 'dated',
    priceUsdPerMTok: { input: 2.5, cachedInput: 1.25, output: 10 },
    shutdown: {
      date: '2027-01-14',
      announced: '2026-10-14',
      replacement: 'gpt-6-luna',
    },
    sources: {
      model: 'https://developers.openai.com/api/docs/models/gpt-4o',
      pricing: PRICING,
      deprecations: DEPRECATIONS,
      checkedOn: CHECKED,
      note: 'Pricing page lists the alias gpt-4o; the dated snapshot is not listed separately (model page: default snapshot of gpt-4o). The model page does not mark it deprecated; the deprecations page does.',
    },
  },
  'gpt-6-luna': {
    id: 'gpt-6-luna',
    provider: 'openai',
    reasoning: { minEffort: 'none' },
    snapshot: 'alias',
    priceUsdPerMTok: { input: 0.1, cachedInput: 0.01, output: 0.5 },
    sources: {
      model: 'https://developers.openai.com/api/docs/models/gpt-6-luna',
      pricing: PRICING,
      deprecations: DEPRECATIONS,
      checkedOn: CHECKED,
    },
  },
  'gpt-6.1-sol': {
    id: 'gpt-6.1-sol',
    provider: 'openai',
    reasoning: { minEffort: 'low' },
    snapshot: 'alias',
    priceUsdPerMTok: { input: 2, cachedInput: 0.1, output: 10 },
    sources: {
      model: 'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
      pricing: PRICING,
      deprecations: DEPRECATIONS,
      checkedOn: CHECKED,
      note: 'Model page also lists cache writes at $2.50 / 1M tokens.',
    },
  },
  // Anthropic. Prices: pricing page "Model pricing" table (base input, 5m cache
  // write, cache hits, output). Minimum cacheable length: prompt-caching page.
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    reasoning: null,
    // Effort: "Not supported" on the model page; thinking stays off (omitted).
    anthropic: { effort: null, thinking: null, minCacheTokens: 4096 },
    snapshot: 'dated',
    priceUsdPerMTok: {
      input: 1,
      cacheWrite: 1.25,
      cachedInput: 0.1,
      output: 5,
    },
    sources: {
      model: 'https://platform.claude.com/docs/en/models/haiku-4-5/overview',
      pricing: A_PRICING,
      deprecations: A_DEPRECATIONS,
      checkedOn: A_CHECKED,
      note: 'Legacy (model page). Deprecations page: Active, tentative retirement "Not sooner than October 15, 2026" (already passed on the check date; no retirement announced). Alias claude-haiku-4-5 resolves to this snapshot.',
    },
  },
  'claude-haiku-5-5': {
    id: 'claude-haiku-5-5',
    provider: 'anthropic',
    reasoning: null,
    anthropic: {
      effort: 'low',
      // errors page: Haiku 5.5 accepts "disabled" at effort high or below.
      thinking: { type: 'disabled' },
      minCacheTokens: 512,
    },
    snapshot: 'pinned',
    // Prompts up to 100,000 tokens; above that $0.50 / $0.625 / $0.05 / $2.50.
    priceUsdPerMTok: {
      input: 0.1,
      cacheWrite: 0.125,
      cachedInput: 0.01,
      output: 0.5,
    },
    sources: {
      model: 'https://platform.claude.com/docs/en/models/haiku-5-5/overview',
      pricing: A_PRICING,
      deprecations: A_DEPRECATIONS,
      checkedOn: A_CHECKED,
      note: 'Models overview: "Every Claude model ID is a pinned snapshot, including the dateless IDs". Retirement not sooner than October 7, 2027. Long-context prices apply over 100,000 prompt tokens (never reached by our packs).',
    },
  },
  'claude-sonnet-5-5': {
    id: 'claude-sonnet-5-5',
    provider: 'anthropic',
    reasoning: null,
    anthropic: {
      effort: 'low',
      // errors page: Sonnet 5.5 rejects "disabled"; "between_tools" turns
      // off up-front thinking (effort high or below).
      thinking: { type: 'between_tools' },
      minCacheTokens: 512,
    },
    snapshot: 'pinned',
    priceUsdPerMTok: {
      input: 2,
      cacheWrite: 2.5,
      cachedInput: 0.1,
      output: 10,
    },
    sources: {
      model: 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview',
      pricing: A_PRICING,
      deprecations: A_DEPRECATIONS,
      checkedOn: A_CHECKED,
      note: 'Cache hits are 0.05x base input on this model (pricing page footnote 2). Retirement not sooner than September 28, 2027.',
    },
  },
} as const satisfies Record<string, ModelInfo>;

export type ModelId = keyof typeof MODELS;

export function modelInfo(id: string): ModelInfo | undefined {
  return Object.prototype.hasOwnProperty.call(MODELS, id)
    ? MODELS[id as ModelId]
    : undefined;
}

/** Days until the announced shutdown (negative = already shut down), or null. */
export function daysToShutdown(
  info: ModelInfo,
  todayIso: string,
): number | null {
  if (!info.shutdown) {
    return null;
  }
  const ms = Date.parse(info.shutdown.date) - Date.parse(todayIso);
  return Math.floor(ms / 86_400_000);
}

export interface TokenUsage {
  /** All input tokens (uncached + cache read + cache write). */
  inputTokens: number;
  /** Cache reads. */
  cachedInputTokens: number;
  /** Cache writes (Anthropic); billed at `cacheWrite`. */
  cacheWriteInputTokens?: number;
  outputTokens: number;
}

/**
 * Estimated cost in USD from list prices: uncached input at the input rate,
 * cache reads at the cached rate, cache writes at the write rate (the input
 * rate when the model has none).
 */
export function estimateCostUsd(info: ModelInfo, u: TokenUsage): number {
  const p = info.priceUsdPerMTok;
  const written = u.cacheWriteInputTokens ?? 0;
  const uncached = Math.max(0, u.inputTokens - u.cachedInputTokens - written);
  return (
    (uncached * p.input +
      u.cachedInputTokens * p.cachedInput +
      written * (p.cacheWrite ?? p.input) +
      u.outputTokens * p.output) /
    1_000_000
  );
}

/** The most a request can cost: every input token at the highest input rate, the full output budget. */
export function worstCaseCostUsd(
  info: ModelInfo,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = info.priceUsdPerMTok;
  const inRate = Math.max(p.input, p.cacheWrite ?? 0);
  return (inputTokens * inRate + outputTokens * p.output) / 1_000_000;
}
