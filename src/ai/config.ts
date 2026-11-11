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
 * List prices, USD per million tokens. Source: the Claude API reference.
 * Sonnet 5.5: cache reads 0.20, 1-hour writes 4 (src/planner/llm/models.ts
 * lists cache reads at 0.10 with a pricing-page note of 0.05x; until the
 * owner re-checks the pricing page, the tutor uses the higher figure so caps
 * err on the safe side). Haiku 5.5 (plan v2, the light tier): two rate
 * cards by prompt length, x5 above 100K prompt tokens; cache reads 0.1x the
 * input rate, 5-minute writes 1.25x, 1-hour writes 2x.
 */
export const AI_PRICES: Record<
  string,
  {
    input: number;
    cacheWrite5m: number;
    cacheWrite1h: number;
    cacheRead: number;
    output: number;
    /** Every rate times `factor` when the prompt is over `tokens`. */
    long?: { tokens: number; factor: number };
  }
> = {
  'claude-sonnet-5-5': {
    input: 2,
    cacheWrite5m: 2.5,
    cacheWrite1h: 4,
    cacheRead: 0.2,
    output: 10,
  },
  'claude-haiku-5-5': {
    input: 0.1,
    cacheWrite5m: 0.125,
    cacheWrite1h: 0.2,
    cacheRead: 0.01,
    output: 0.5,
    long: { tokens: 100_000, factor: 5 },
  },
};

/** The models the tutor can run on (harness --model). */
export const AI_MODELS = {
  sonnet: 'claude-sonnet-5-5',
  haiku: 'claude-haiku-5-5',
} as const;

/** Server-side refusal fallback exists for Sonnet 5.5, not for Haiku 5.5. */
export const hasServerFallback = (model: string): boolean =>
  model !== AI_MODELS.haiku;

/** Cost of one response; unknown models cost NaN (callers treat it as over the cap). */
export function aiCostUsd(model: string, u: AiUsage): number {
  const p = AI_PRICES[model];
  if (!p) {
    return Number.NaN;
  }
  const prompt = u.input + u.cacheRead + u.cacheWrite5m + u.cacheWrite1h;
  const factor = p.long && prompt > p.long.tokens ? p.long.factor : 1;
  return (
    (factor *
      (u.input * p.input +
        u.cacheRead * p.cacheRead +
        u.cacheWrite5m * p.cacheWrite5m +
        u.cacheWrite1h * p.cacheWrite1h +
        u.output * p.output)) /
    1_000_000
  );
}

/**
 * What a call is charged to a student's allowance: its cost with the cache
 * writes priced as cache reads. Writing the core prompt and the question's
 * pack to the cache is paid once and then shared by every student and
 * question that reuses it (owner's screenshot, 2026-10-30: one cold Sonnet
 * call cost $0.04, the whole per-question limit); the real cost is still
 * what the dev overlay shows.
 */
export function aiChargeUsd(model: string, u: AiUsage): number {
  return aiCostUsd(model, {
    ...u,
    cacheRead: u.cacheRead + u.cacheWrite5m + u.cacheWrite1h,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
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
  const tokens = Math.ceil(promptChars / 2.5);
  const factor = p.long && tokens > p.long.tokens ? p.long.factor : 1;
  return (factor * (tokens * inRate + maxTokens * p.output)) / 1_000_000;
}

/**
 * A typical move call of the hybrid lesson, in tokens (src/ai/move/mover.ts).
 * First guesses, to be measured in A6. The cached prefix is the tools, the
 * core prompt and the question pack (about 22,000 characters; the cold deep
 * call of 2026-11-02 wrote about 9,000 tokens); the situation is not cached;
 * at effort low the thinking and the tutor_move call stay far under maxTokens
 * (2,000 light, 6,000 deep).
 */
export const TYPICAL_MOVE_CALL: AiUsage = {
  input: 1_500,
  cacheRead: 9_000,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 1_000,
};

/**
 * What one move is expected to be charged to the allowance, in aiChargeUsd
 * units (the prefix priced as cache reads), so that a call that would pass
 * the per-question limit is not made (src/hybrid/allowance.ts). First guesses,
 * to be measured in A6. An estimate, not the worst case: Sonnet's worst case
 * (2 calls x 6,000 output tokens) is over $0.12 and would leave no deep call.
 * - light, about $0.0015: Haiku 5.5, both its calls (a refused move's retry);
 * - deep, about $0.0148: Sonnet 5.5, one call (a compute hop adds a second
 *   call that mostly re-reads the cached prefix); two of them fit the
 *   question's $0.04 with room for light calls.
 */
export const MOVE_EXPECTED_CHARGE_USD: Readonly<
  Record<'light' | 'deep', number>
> = {
  light: 2 * aiChargeUsd(AI_MODELS.haiku, TYPICAL_MOVE_CALL),
  deep: aiChargeUsd(AI_MODELS.sonnet, TYPICAL_MOVE_CALL),
};
