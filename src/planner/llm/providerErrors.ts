/**
 * What we may read from an OpenAI error response (product owner, 2026-10-17):
 * only `error.code` and `error.type`, and only values in this allowlist
 * (anything else becomes 'unknown'); `x-ratelimit-*` headers and `Retry-After`
 * as numbers only. Message text and the rest of the body are never kept.
 *
 * Sources, checked 2026-10-17:
 * [E] https://developers.openai.com/api/docs/guides/error-codes
 * [R] https://developers.openai.com/api/docs/guides/rate-limits
 * [PO] listed by the product owner; NOT found on [E] or [R] (kept because
 *      clients commonly receive them; mapping is by meaning).
 * [AE] Anthropic https://platform.claude.com/docs/en/api/errors (error.type)
 * [AR] Anthropic https://platform.claude.com/docs/en/api/rate-limits
 *      (error.details.error_code, anthropic-ratelimit-* headers), both
 *      checked 2026-10-21.
 */
import type { LlmErrorKind } from './client';

/** Allowed values of `error.code` / `error.type`, with the result they map to (null = keep the status mapping). */
export const PROVIDER_CODES = {
  // [E] 429 "Credit balance exhausted": code credit_balance_exhausted, type can be insufficient_quota.
  credit_balance_exhausted: 'no_credit',
  insufficient_quota: 'no_credit', // [E] as type; [PO] as code
  // [E] 429 spend / usage limits: retrying does not help until the limit is raised or resets.
  organization_spend_limit_exceeded: 'spend_limit',
  project_spend_limit_exceeded: 'spend_limit',
  organization_usage_limit_exceeded: 'spend_limit',
  // [E][R] 429 "Slow down": type rate_limit_error, code slow_down.
  slow_down: 'rate_limited',
  rate_limit_error: 'rate_limited',
  rate_limit_exceeded: 'rate_limited', // [PO]; [R] mentions it as an older code
  // [E][R] 503 "Model temporarily overloaded": type service_unavailable_error, code server_is_overloaded.
  server_is_overloaded: 'provider',
  service_unavailable_error: 'provider',
  // [E] 400 type invalid_request_error.
  invalid_request_error: null,
  invalid_api_key: 'auth', // [PO]
  model_not_found: 'config', // [PO]
  // [AE] Anthropic error.type values (rate_limit_error and invalid_request_error above).
  authentication_error: 'auth', // 401
  permission_error: 'auth', // 403
  billing_error: 'no_credit', // 402
  not_found_error: 'config', // 404
  request_too_large: 'provider', // 413
  conflict_error: 'provider', // 409
  api_error: 'provider', // 500
  timeout_error: 'provider', // 504
  overloaded_error: 'provider', // 529
  // [AR] 429 rate_limit_error with this details.error_code: tier spend cap reached.
  enforced_spend_limit_reached: 'spend_limit',
} as const satisfies Record<string, LlmErrorKind | null>;

export type ProviderCode = keyof typeof PROVIDER_CODES;

export interface RateLimitInfo {
  limitRequests?: number;
  remainingRequests?: number;
  resetRequestsMs?: number;
  limitTokens?: number;
  remainingTokens?: number;
  resetTokensMs?: number;
  limitProjectTokens?: number;
  remainingProjectTokens?: number;
  resetProjectTokensMs?: number;
  retryAfterSec?: number;
}

export interface ProviderErrorInfo {
  code: ProviderCode | 'unknown' | null;
  type: ProviderCode | 'unknown' | null;
  rateLimit?: RateLimitInfo;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function allowed(v: unknown): ProviderCode | 'unknown' | null {
  if (v === undefined || v === null) {
    return null;
  }
  return typeof v === 'string' &&
    Object.prototype.hasOwnProperty.call(PROVIDER_CODES, v)
    ? (v as ProviderCode)
    : 'unknown';
}

/**
 * Reads `error.code` and `error.type` from a parsed error body. Nothing else is
 * looked at or returned; the caller drops the body right after.
 */
export function readErrorCodes(
  body: unknown,
): Pick<ProviderErrorInfo, 'code' | 'type'> {
  const err = isObj(body) ? body.error : undefined;
  if (!isObj(err)) {
    return { code: null, type: null };
  }
  return { code: allowed(err.code), type: allowed(err.type) };
}

/** Plain non-negative integer, else undefined. */
function intHeader(v: string | null): number | undefined {
  return v !== null && /^\d{1,12}$/.test(v.trim())
    ? Number(v.trim())
    : undefined;
}

/** "1s", "6m0s", "20ms", "1h2m3.5s" -> ms; anything else -> undefined. */
export function durationMs(v: string | null): number | undefined {
  if (v === null) {
    return undefined;
  }
  const m =
    /^(?:(\d{1,6})h)?(?:(\d{1,6})m(?!s))?(?:(\d{1,6}(?:\.\d{1,6})?)s)?(?:(\d{1,9})ms)?$/.exec(
      v.trim(),
    );
  if (!m || v.trim() === '') {
    return undefined;
  }
  const [, h, min, s, ms] = m;
  return Math.round(
    Number(h ?? 0) * 3_600_000 +
      Number(min ?? 0) * 60_000 +
      Number(s ?? 0) * 1000 +
      Number(ms ?? 0),
  );
}

/** [R] header names; numbers only. Undefined when no header is present. */
export function readRateLimit(headers: {
  get(name: string): string | null;
}): RateLimitInfo | undefined {
  const info: RateLimitInfo = {};
  const set = <K extends keyof RateLimitInfo>(k: K, v: number | undefined) => {
    if (v !== undefined) {
      info[k] = v;
    }
  };
  set('limitRequests', intHeader(headers.get('x-ratelimit-limit-requests')));
  set(
    'remainingRequests',
    intHeader(headers.get('x-ratelimit-remaining-requests')),
  );
  set('resetRequestsMs', durationMs(headers.get('x-ratelimit-reset-requests')));
  set('limitTokens', intHeader(headers.get('x-ratelimit-limit-tokens')));
  set(
    'remainingTokens',
    intHeader(headers.get('x-ratelimit-remaining-tokens')),
  );
  set('resetTokensMs', durationMs(headers.get('x-ratelimit-reset-tokens')));
  set(
    'limitProjectTokens',
    intHeader(headers.get('x-ratelimit-limit-project-tokens')),
  );
  set(
    'remainingProjectTokens',
    intHeader(headers.get('x-ratelimit-remaining-project-tokens')),
  );
  set(
    'resetProjectTokensMs',
    durationMs(headers.get('x-ratelimit-reset-project-tokens')),
  );
  set('retryAfterSec', intHeader(headers.get('retry-after')));
  return Object.keys(info).length > 0 ? info : undefined;
}

/** Result kind for an HTTP error: an allowlisted code/type wins over the status. */
export function errorKind(
  status: number,
  codes: Pick<ProviderErrorInfo, 'code' | 'type'>,
): LlmErrorKind {
  for (const v of [codes.code, codes.type]) {
    if (v !== null && v !== 'unknown') {
      const mapped = PROVIDER_CODES[v];
      if (mapped !== null) {
        return mapped;
      }
    }
  }
  if (status === 401 || status === 403) {
    return 'auth';
  }
  return status === 429 ? 'rate_limited' : 'provider';
}

/**
 * Anthropic error body: `error.type` and `error.details.error_code` ([AE],
 * [AR]); the message and request_id are not read.
 */
export function readAnthropicErrorCodes(
  body: unknown,
): Pick<ProviderErrorInfo, 'code' | 'type'> {
  const err = isObj(body) ? body.error : undefined;
  if (!isObj(err)) {
    return { code: null, type: null };
  }
  const details = isObj(err.details) ? err.details : undefined;
  return { code: allowed(details?.error_code), type: allowed(err.type) };
}

/**
 * [AR] header names, numbers only (the *-reset headers are RFC 3339 times
 * and are not kept). Undefined when no header is present.
 */
export function readAnthropicRateLimit(headers: {
  get(name: string): string | null;
}): RateLimitInfo | undefined {
  const info: RateLimitInfo = {};
  const set = <K extends keyof RateLimitInfo>(k: K, v: number | undefined) => {
    if (v !== undefined) {
      info[k] = v;
    }
  };
  const h = (n: string) => intHeader(headers.get(`anthropic-ratelimit-${n}`));
  set('limitRequests', h('requests-limit'));
  set('remainingRequests', h('requests-remaining'));
  set('limitTokens', h('tokens-limit'));
  set('remainingTokens', h('tokens-remaining'));
  set('retryAfterSec', intHeader(headers.get('retry-after')));
  return Object.keys(info).length > 0 ? info : undefined;
}
