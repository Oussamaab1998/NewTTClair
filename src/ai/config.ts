/**
 * AI tutor route (owner, 2026-10-29: the AI leads the lesson; model Sonnet 5.5
 * for now). Every number here is a first guess, to be measured with the
 * harness (tools/tutor-harness).
 */
import type { AiUsage, Effort } from './transport/wire';

export const AI_TUTOR = {
  model: 'claude-sonnet-5-5',
  /** Adaptive thinking; the harness compares 'low' and 'medium'. */
  effort: 'medium' as Effort,
  maxTokens: 8192,
  /** One re-send after stop_reason max_tokens. */
  maxTokensRetry: 16000,
  requestTimeoutMs: 90_000,
  /** Model calls (hops) per student turn; at `hopNotice` the app asks it to stop computing. */
  maxHops: 6,
  hopNotice: 5,
  /** Retries per request (network, 408, 429, 5xx, 529 only). */
  maxRetries: 2,
  /** Server-side refusal fallback ('default' routing). */
  fallbacks: true,
  /** Money caps (owner to confirm): one question session, and per device per local day. */
  sessionCapUsd: 1.5,
  dailyCapUsd: 5,
} as const;

/**
 * List prices, USD per million tokens. Source: the Claude API reference for
 * Sonnet 5.5 (cache reads 0.20, 1-hour writes 4). src/planner/llm/models.ts
 * lists cache reads at 0.10 with a pricing-page note of 0.05x; until the
 * owner re-checks the pricing page, the tutor uses the higher figure so caps
 * err on the safe side.
 */
export const AI_PRICES: Record<
  string,
  {
    input: number;
    cacheWrite5m: number;
    cacheWrite1h: number;
    cacheRead: number;
    output: number;
  }
> = {
  'claude-sonnet-5-5': {
    input: 2,
    cacheWrite5m: 2.5,
    cacheWrite1h: 4,
    cacheRead: 0.2,
    output: 10,
  },
};

/** Cost of one response; unknown models cost NaN (callers treat it as over the cap). */
export function aiCostUsd(model: string, u: AiUsage): number {
  const p = AI_PRICES[model];
  if (!p) {
    return Number.NaN;
  }
  return (
    (u.input * p.input +
      u.cacheRead * p.cacheRead +
      u.cacheWrite5m * p.cacheWrite5m +
      u.cacheWrite1h * p.cacheWrite1h +
      u.output * p.output) /
    1_000_000
  );
}

/**
 * The most one request can cost: every prompt token written to the 1-hour
 * cache (the dearest input rate) and the whole output budget. Prompt tokens
 * are estimated from characters (2.5 per token, as the planner's cap does).
 */
export function aiWorstCaseUsd(
  model: string,
  promptChars: number,
  maxTokens: number,
): number {
  const p = AI_PRICES[model];
  if (!p) {
    return Number.NaN;
  }
  const inRate = Math.max(p.input, p.cacheWrite1h);
  return (
    (Math.ceil(promptChars / 2.5) * inRate + maxTokens * p.output) / 1_000_000
  );
}
