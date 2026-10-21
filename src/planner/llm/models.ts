/**
 * Pinned model ids, prices and lifecycle, from OpenAI's official pages only.
 * Every entry records where each fact came from and when it was checked.
 * Prices are list prices (standard tier, per 1M tokens) used for ESTIMATES only.
 * The newer models have no dated snapshot (the alias is the only id): rerun the
 * replay comparison before every release (docs/DECISIONS.md).
 */

export interface ModelInfo {
  id: string;
  provider: 'openai';
  /** Accepts `reasoning.effort`; the lowest value the model page lists. */
  reasoning: { minEffort: 'none' | 'low' } | null;
  /** 'dated' = fixed snapshot; 'alias' = the only id, can change under the same name. */
  snapshot: 'dated' | 'alias';
  priceUsdPerMTok: { input: number; cachedInput: number; output: number };
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
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/** Estimated cost in USD from list prices (cached input billed at the cached rate). */
export function estimateCostUsd(info: ModelInfo, u: TokenUsage): number {
  const p = info.priceUsdPerMTok;
  const uncached = Math.max(0, u.inputTokens - u.cachedInputTokens);
  return (
    (uncached * p.input +
      u.cachedInputTokens * p.cachedInput +
      u.outputTokens * p.output) /
    1_000_000
  );
}
