/**
 * LLM endpoint configuration for test builds (docs/DECISIONS.md).
 * The key comes from the gitignored generated module; only the transport
 * factory reads it. Calls go only to allowlisted hosts: api.openai.com, plus
 * hosts listed here explicitly (the future backend proxy).
 */
import { LLM_LOCAL } from './llmLocal.generated';

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

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
}

export function localLlmConfig(): LocalLlmConfig {
  return {
    apiKey: LLM_LOCAL.openaiApiKey,
    baseUrl: LLM_LOCAL.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL,
  };
}

/**
 * LLM settings (Phase 4). Mode: on whenever a key is present in
 * .env.llm.local, rules-only (silently) without one (product owner,
 * 2026-10-17). Every number here is an untuned guess, to be measured.
 */
export const LLM_CONFIG = {
  /** gpt-6-luna: the only pinned model with credit on the test account (2026-10-17). */
  plannerModel: 'gpt-6-luna',
  tutorModel: 'gpt-6-luna',
  /** Network calls per device per local day (planner + tutor). */
  dailyCallCap: 200,
  /** Short: a provisional rules answer is on screen meanwhile. */
  plannerTimeoutMs: 3500,
  /** The drawer shows a loading state, no provisional answer. */
  tutorTimeoutMs: 15000,
  modelCheckTimeoutMs: 8000,
  maxOutputTokens: { plan: 600, tutor: 900 },
} as const;
