/**
 * LLM endpoint configuration for test builds (docs/DECISIONS.md).
 * The key comes from the gitignored generated module; only the transport
 * factory reads it. Calls go only to allowlisted hosts: api.openai.com, plus
 * hosts listed here explicitly (the future backend proxy).
 */
import { LLM_LOCAL } from './llmLocal.generated';

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

/** Fixed: the Anthropic transport has no base-URL override. */
export const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
export const ANTHROPIC_ALLOWED_HOSTS: readonly string[] = ['api.anthropic.com'];

/** Add the proxy host here when it exists (reviewed change, never from env). */
export const EXTRA_ALLOWED_HOSTS: readonly string[] = [];

export const ALLOWED_HOSTS: readonly string[] = [
  'api.openai.com',
  ...EXTRA_ALLOWED_HOSTS,
];

export type EndpointCheck =
  | { ok: true; baseUrl: string; host: string }
  | {
      ok: false;
      reason: 'invalid_url' | 'not_https' | 'host_not_allowed';
      host?: string;
    };

/** Base URL -> allowed endpoint, or why no call may be made. */
export function checkEndpoint(
  baseUrl: string,
  allowed: readonly string[] = ALLOWED_HOSTS,
): EndpointCheck {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'not_https', host: url.host };
  }
  if (!allowed.includes(url.host)) {
    return { ok: false, reason: 'host_not_allowed', host: url.host };
  }
  return { ok: true, baseUrl: baseUrl.replace(/\/+$/, ''), host: url.host };
}

export interface LocalLlmConfig {
  apiKey: string;
  baseUrl: string;
  anthropicApiKey: string;
}

export function localLlmConfig(): LocalLlmConfig {
  return {
    apiKey: LLM_LOCAL.openaiApiKey,
    baseUrl: LLM_LOCAL.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL,
    anthropicApiKey: LLM_LOCAL.anthropicApiKey,
  };
}

/**
 * LLM settings (Phase 4). Mode: on whenever a key is present in
 * .env.llm.local, rules-only (silently) without one (product owner,
 * 2026-10-17). Every number here is an untuned guess, to be measured.
 */
export const LLM_CONFIG = {
  /**
   * AI tutor v2 (D22): Anthropic, Claude Haiku 5.5 until the replay
   * comparison picks the default. The OpenAI adapter stays in the code,
   * unselected (it is still used by the comparison).
   */
  provider: 'anthropic' as 'anthropic' | 'openai',
  plannerModel: 'claude-haiku-5-5',
  /** OpenAI, when `provider` is 'openai' (gpt-6-luna: the only model with credit, 2026-10-17). */
  openaiModel: 'gpt-6-luna',
  /** Network calls per device per local day (planner + tutor). */
  dailyCallCap: 200,
  /**
   * A provisional rules answer is on screen meanwhile; the AI answer is
   * swapped in only if the student has not acted. 3.5 s -> 5 s (product
   * owner, 2026-10-22): simulation 2 had p95 3375 ms, live calls 2.1-3.5 s.
   */
  plannerTimeoutMs: 5000,
  /** The drawer shows a loading state, no provisional answer. */
  tutorTimeoutMs: 15000,
  modelCheckTimeoutMs: 8000,
  maxOutputTokens: { plan: 600, tutor: 900 },
  /** Money cap per device per local day, all live calls (product owner, 2026-10-21). */
  dailySpendCapUsd: 0.5,
  /**
   * Pilot: ask the AI on every mistake (wrong answer, "not sure", invalid
   * line), not only when the rules cannot diagnose. Off by default; dev
   * launch argument `-aiEveryMistake on`.
   */
  aiOnEveryMistake: false,
  /** Every-mistake calls per device per local day; after it, only the normal triggers (product owner, 2026-10-21). */
  everyMistakeDailyCap: 60,
} as const;
