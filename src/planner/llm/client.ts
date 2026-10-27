/**
 * Provider-agnostic LLM types (Phase 4, docs/PLANNER.md layer 2).
 * A transport sends one structured-output request and returns an `LlmResult`;
 * it never throws. Errors carry our own error class, the HTTP status, and from
 * the provider only allowlisted `error.code` / `error.type` values and numeric
 * rate-limit headers (providerErrors.ts). Message text and the rest of an error
 * body are never stored or logged (they can echo a masked key).
 */
import type { z } from 'zod';

import type { ProviderErrorInfo } from './providerErrors';

import type { JsonSchema } from './strictSchema';

export type LlmErrorKind =
  /** Our timer aborted the request. */
  | 'timeout'
  /** fetch failed (offline, DNS, TLS). */
  | 'network'
  /** HTTP 429 (or an allowlisted rate-limit code). */
  | 'rate_limited'
  /** No credit left (insufficient_quota / credit_balance_exhausted). Never retried. */
  | 'no_credit'
  /** Organization or project spend / usage limit reached. Never retried. */
  | 'spend_limit'
  /** HTTP 401 / 403. */
  | 'auth'
  /** Any other HTTP error status. */
  | 'provider'
  /** The model refused (no usable JSON). */
  | 'refused'
  /** Output cut off (`incomplete_details.reason` in `detail`). */
  | 'incomplete'
  /** Not JSON, or failed zod after denull (our own issue codes in `detail`). */
  | 'invalid'
  /** No key, rules-only mode or kill switch. */
  | 'disabled'
  /** Daily cap or a run's cost cap reached. */
  | 'capped'
  /** Endpoint not allowed (host allowlist, not https, bad URL). */
  | 'config';

export interface LlmUsage {
  /** All input tokens (uncached + cache read + cache write). */
  inputTokens: number;
  /** Cache reads. */
  cachedInputTokens: number;
  /** Cache writes (Anthropic only; billed above the input rate). */
  cacheWriteInputTokens?: number;
  outputTokens: number;
  reasoningTokens: number;
}

interface ResultBase {
  requestId: string;
  model: string;
  latencyMs: number;
  /** Present whenever the provider reported it (also on refused/incomplete/invalid). */
  usage: LlmUsage | null;
  /** The provider's request id header (an opaque id, for support), when present. */
  providerRequestId?: string;
  /**
   * Debug builds only (`captureRaw`): the model's output text, for the dev
   * screen. Never logged, queued or exported.
   */
  raw?: string;
  /** Where the time went (2026-10-22, Anthropic transport). */
  timing?: LlmTiming;
}

/**
 * prepMs: building the request before fetch; headersMs: fetch until the
 * response headers (connection, upload, the model's work; fetch exposes no
 * separate connect time); bodyMs: reading the response body. A call that
 * timed out has prepMs only.
 */
export interface LlmTiming {
  prepMs: number;
  headersMs?: number;
  bodyMs?: number;
}

export type LlmResult<T> =
  | (ResultBase & { ok: true; value: T })
  | (ResultBase & {
      ok: false;
      error: LlmErrorKind;
      /** HTTP status, when there was a response. */
      status?: number;
      /** Our own short code (never provider text), e.g. "max_output_tokens", "json_parse". */
      detail?: string;
      /** HTTP errors only: allowlisted code/type and numeric rate-limit headers. */
      provider?: ProviderErrorInfo;
    });

/** A response format built once (converter errors happen at build time, not per call). */
export interface StructuredFormat<T> {
  name: string;
  /** Sent to the provider (strict-mode subset). */
  strict: JsonSchema;
  /** Pre-conversion schema; `denull` walks it. */
  original: JsonSchema;
  /** Validates every answer after denull (and `prepare`). */
  zod: z.ZodType<T>;
  /** Clean-up before zod (the tutor: "" in an optional field means absent). */
  prepare?: (value: unknown) => unknown;
  /**
   * Optional flat "wire" format (wireFormat.ts): the provider fills in
   * `schema` and `zod` maps the answer to T. Anthropic always uses it when
   * present (its grammar limits); OpenAI only when asked (`useWire`).
   */
  wire?: { schema: JsonSchema; zod: z.ZodType<T> };
}

export interface LlmRequest<T> {
  requestId: string;
  model: string;
  /** System-level instructions. */
  instructions: string;
  /**
   * Optional stable start of the user input (the static pack). Anthropic sends
   * it as its own block with a cache breakpoint; OpenAI prepends it to `input`.
   */
  inputPrefix?: string;
  /** User-level input (the context pack, serialized). Student text only inside it, as data. */
  input: string;
  format: StructuredFormat<T>;
  maxOutputTokens: number;
  timeoutMs: number;
  signal?: AbortSignal;
}

export type ModelCheck =
  | { ok: true; id: string }
  | {
      ok: false;
      id: string;
      error: LlmErrorKind;
      status?: number;
      provider?: ProviderErrorInfo;
      /** A 200 for another model id: that id (model-id characters only). */
      returnedId?: string;
    };

/** A model id as a provider returns it, or undefined when it does not look like one. */
export function modelIdOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' && /^[A-Za-z0-9._:@-]{1,100}$/.test(v)
    ? v
    : undefined;
}

export interface LlmTransport {
  readonly provider: string;
  respond<T>(req: LlmRequest<T>): Promise<LlmResult<T>>;
  /** Startup check: does this model id exist for this key? */
  checkModel(id: string, timeoutMs: number): Promise<ModelCheck>;
}
