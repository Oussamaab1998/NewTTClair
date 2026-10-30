/**
 * Messages API transport for the AI tutor: multi-turn, tools, adaptive
 * thinking, prompt caching. Plain fetch like the planner transport (D11: no
 * SDK; Hermes fetch has no ReadableStream, so no streaming either). It never
 * throws and keeps only allowlisted error codes (providerErrors.ts), never an
 * error message. Assistant content comes back verbatim: thinking blocks and
 * their signatures must be sent back unchanged on the next request.
 *
 * Retries (at most `maxRetries`): network errors, 408, 429, 5xx and 529, with
 * ~1 s then ~3 s backoff (retry-after honoured, at most 10 s). Never retried:
 * timeouts (the turn budget is the caller's), 400, 401/403, out of credit,
 * spend limit. The URL is fixed and checked against the host allowlist.
 */
import {
  ANTHROPIC_ALLOWED_HOSTS,
  ANTHROPIC_BASE_URL,
  checkEndpoint,
} from '../../config/llm';
import { ANTHROPIC_VERSION } from '../../planner/llm/anthropic';
import type { LlmErrorKind } from '../../planner/llm/client';
import {
  errorKind,
  readAnthropicErrorCodes,
  readAnthropicRateLimit,
  type ProviderErrorInfo,
} from '../../planner/llm/providerErrors';
import {
  isObject,
  type AiUsage,
  type ContentBlock,
  type JsonObject,
  type MessagesRequest,
  type MessagesResponse,
} from './wire';

export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface MessagesTransportOptions {
  apiKey: string;
  /** Extra beta headers (the fallback beta is added when the body uses it). */
  betas?: readonly string[];
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  /** Monotonic ms. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Jitter source in [0, 1) (tests pass a constant). */
  random?: () => number;
  /** Tests only: the URL is still checked against `allowedHosts`. */
  baseUrl?: string;
  allowedHosts?: readonly string[];
}

export interface SendOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

interface ResultBase {
  latencyMs: number;
  attempts: number;
  providerRequestId?: string;
}

export type SendResult =
  | (ResultBase & { ok: true; response: MessagesResponse })
  | (ResultBase & {
      ok: false;
      error: LlmErrorKind;
      /** True when re-sending the same request may succeed. */
      retryable: boolean;
      status?: number;
      provider?: ProviderErrorInfo;
      detail?: string;
    });

export interface MessagesTransport {
  send(body: MessagesRequest, opts: SendOptions): Promise<SendResult>;
}

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);
const BACKOFF_MS = [1000, 3000];
const MAX_RETRY_AFTER_MS = 10_000;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,80}$/;

const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/** Billed token counts; 1-hour writes are read from usage.cache_creation when present. */
export function readUsage(body: JsonObject): AiUsage {
  const u = isObject(body.usage) ? body.usage : {};
  const creation = isObject(u.cache_creation) ? u.cache_creation : null;
  const write = num(u.cache_creation_input_tokens);
  const write1h = creation ? num(creation.ephemeral_1h_input_tokens) : 0;
  const write5m = creation
    ? num(creation.ephemeral_5m_input_tokens)
    : write - write1h;
  return {
    input: num(u.input_tokens),
    cacheRead: num(u.cache_read_input_tokens),
    cacheWrite5m: Math.max(0, write5m),
    cacheWrite1h: write1h,
    output: num(u.output_tokens),
  };
}

/** The response body as we use it, or why it cannot be used. */
export function readResponse(
  json: unknown,
): { ok: true; response: MessagesResponse } | { ok: false; detail: string } {
  if (!isObject(json)) {
    return { ok: false, detail: 'body_not_object' };
  }
  const content = json.content;
  if (
    !Array.isArray(content) ||
    !content.every(b => isObject(b) && typeof b.type === 'string')
  ) {
    return { ok: false, detail: 'content_not_blocks' };
  }
  const stop = json.stop_reason;
  if (typeof stop !== 'string') {
    return { ok: false, detail: 'no_stop_reason' };
  }
  const details = isObject(json.stop_details) ? json.stop_details : null;
  const category =
    stop === 'refusal' && details && typeof details.category === 'string'
      ? details.category.slice(0, 40)
      : null;
  return {
    ok: true,
    response: {
      id: typeof json.id === 'string' ? json.id : '',
      model: typeof json.model === 'string' ? json.model : '',
      content: content as ContentBlock[],
      stopReason: stop,
      refusalCategory: category,
      usage: readUsage(json),
    },
  };
}

function retryAfterMs(provider: ProviderErrorInfo | undefined): number | null {
  const s = provider?.rateLimit?.retryAfterSec;
  return s === undefined ? null : Math.min(s * 1000, MAX_RETRY_AFTER_MS);
}

export function createMessagesTransport(
  opts: MessagesTransportOptions,
): MessagesTransport {
  const endpoint = checkEndpoint(
    opts.baseUrl ?? ANTHROPIC_BASE_URL,
    opts.allowedHosts ?? ANTHROPIC_ALLOWED_HOSTS,
  );
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise(r => setTimeout(r, ms)));
  const random = opts.random ?? Math.random;
  const maxRetries = opts.maxRetries ?? 2;
  // The key lives only in this closure and in the x-api-key header.
  const apiKey = opts.apiKey;

  type Attempt =
    | { kind: 'ok'; json: unknown; requestId?: string }
    | {
        kind: 'fail';
        error: LlmErrorKind;
        status?: number;
        provider?: ProviderErrorInfo;
        requestId?: string;
        retry: boolean;
      };

  async function attempt(
    payload: string,
    betas: string,
    o: SendOptions,
  ): Promise<Attempt> {
    const ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, o.timeoutMs);
    const onOuter = () => ac.abort();
    o.signal?.addEventListener('abort', onOuter);
    try {
      let res: Response;
      try {
        res = await doFetch(
          `${(endpoint as { baseUrl: string }).baseUrl}/messages`,
          {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': ANTHROPIC_VERSION,
              'content-type': 'application/json',
              ...(betas !== '' && { 'anthropic-beta': betas }),
            },
            body: payload,
            signal: ac.signal,
          },
        );
      } catch {
        // The thrown error is not inspected or kept (it may describe the request).
        const aborted = timedOut || o.signal?.aborted === true;
        return {
          kind: 'fail',
          error: aborted ? 'timeout' : 'network',
          retry: !aborted,
        };
      }
      const id = res.headers.get('request-id');
      const rid = id && REQUEST_ID.test(id) ? { requestId: id } : {};
      if (!res.ok) {
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        const codes = readAnthropicErrorCodes(body);
        body = null;
        const rateLimit = readAnthropicRateLimit(res.headers);
        const error = errorKind(res.status, codes);
        return {
          kind: 'fail',
          error,
          status: res.status,
          provider: { ...codes, ...(rateLimit && { rateLimit }) },
          ...rid,
          retry:
            RETRY_STATUS.has(res.status) &&
            error !== 'no_credit' &&
            error !== 'spend_limit' &&
            error !== 'auth',
        };
      }
      try {
        return { kind: 'ok', json: await res.json(), ...rid };
      } catch {
        return {
          kind: 'fail',
          error: timedOut ? 'timeout' : 'invalid',
          status: res.status,
          ...rid,
          retry: false,
        };
      }
    } finally {
      clearTimeout(timer);
      o.signal?.removeEventListener('abort', onOuter);
    }
  }

  async function send(
    body: MessagesRequest,
    o: SendOptions,
  ): Promise<SendResult> {
    const t0 = now();
    if (!endpoint.ok) {
      return {
        ok: false,
        error: 'config',
        retryable: false,
        detail: endpoint.reason,
        latencyMs: 0,
        attempts: 0,
      };
    }
    if (apiKey.length === 0) {
      return {
        ok: false,
        error: 'disabled',
        retryable: false,
        detail: 'no_key',
        latencyMs: 0,
        attempts: 0,
      };
    }
    const betas = [
      ...(opts.betas ?? []),
      ...(body.fallbacks !== undefined ? [FALLBACK_BETA] : []),
    ].join(',');
    const payload = JSON.stringify(body);
    let attempts = 0;
    for (;;) {
      attempts += 1;
      const a = await attempt(payload, betas, o);
      const base = {
        latencyMs: now() - t0,
        attempts,
        ...(a.requestId !== undefined && { providerRequestId: a.requestId }),
      };
      if (a.kind === 'ok') {
        const read = readResponse(a.json);
        return read.ok
          ? { ...base, ok: true, response: read.response }
          : {
              ...base,
              ok: false,
              error: 'invalid',
              retryable: false,
              detail: read.detail,
            };
      }
      if (a.retry && attempts <= maxRetries && o.signal?.aborted !== true) {
        const wait =
          retryAfterMs(a.provider) ??
          (BACKOFF_MS[attempts - 1] ?? 3000) + Math.floor(random() * 250);
        await sleep(wait);
        continue;
      }
      return {
        ...base,
        ok: false,
        error: a.error,
        retryable:
          a.retry ||
          a.error === 'timeout' ||
          a.error === 'network' ||
          a.error === 'rate_limited',
        ...(a.status !== undefined && { status: a.status }),
        ...(a.provider !== undefined && { provider: a.provider }),
      };
    }
  }

  return { send };
}
