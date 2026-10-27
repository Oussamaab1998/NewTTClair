/**
 * Anthropic transport over plain fetch (no SDK in the app bundle, as for
 * OpenAI, D11). Sources (platform.claude.com/docs, checked 2026-10-21):
 * - POST https://api.anthropic.com/v1/messages with headers x-api-key,
 *   anthropic-version (2026-10-21, the latest version: its breaking changes
 *   concern documents, citations and sampling parameters, none of which we
 *   send) and content-type;
 * - structured outputs: `output_config.format` {type: "json_schema", schema}
 *   (GA, no beta header; listed for every model we use). Chosen over tool use
 *   because forced tool_choice returns 400 on Sonnet 5.5;
 * - prompt caching: `cache_control: {type: "ephemeral"}` (5 minutes) on the
 *   system block; the instructions + catalog are the stable prefix, the pack
 *   is the user message;
 * - usage: input_tokens counts only tokens after the last cache breakpoint;
 *   total = input + cache_read + cache_creation;
 * - errors: {type: "error", error: {type, message, details?}}; only
 *   allowlisted error.type / details.error_code values are kept
 *   (providerErrors.ts), never the message;
 * - model check: GET /v1/models/{id}.
 * No retries. The URL is fixed and must pass the host allowlist.
 */
import {
  ANTHROPIC_ALLOWED_HOSTS,
  ANTHROPIC_BASE_URL,
  checkEndpoint,
} from '../../config/llm';
import type {
  LlmErrorKind,
  LlmRequest,
  LlmResult,
  LlmTransport,
  LlmTiming,
  LlmUsage,
  ModelCheck,
  StructuredFormat,
} from './client';
import { modelIdOrUndefined } from './client';
import { anthropicSchemaFor } from './anthropicSchema';
import { modelInfo } from './models';
import { issueCodes } from './openai';
import {
  errorKind,
  readAnthropicErrorCodes,
  readAnthropicRateLimit,
  type ProviderErrorInfo,
} from './providerErrors';
import { parseAnswer } from './strictSchema';

export const ANTHROPIC_VERSION = '2026-10-21';

export interface AnthropicTransportOptions {
  apiKey: string;
  /** Tests only: the fixed URL is still checked against `allowedHosts`. */
  baseUrl?: string;
  allowedHosts?: readonly string[];
  fetchImpl?: typeof fetch;
  /** Monotonic ms. */
  now?: () => number;
  /** Keep the model's output text on results (dev screen; debug builds only). */
  captureRaw?: boolean;
}

type Json = { [key: string]: unknown };
const isObj = (v: unknown): v is Json =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const RAW_MAX = 6000;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,80}$/;

function requestIdOf(res: Response): { providerRequestId?: string } {
  const id = res.headers.get('request-id');
  return id && REQUEST_ID.test(id) ? { providerRequestId: id } : {};
}

async function readHttpError(
  res: Response,
): Promise<{ error: LlmErrorKind; provider: ProviderErrorInfo }> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const codes = readAnthropicErrorCodes(body);
  body = null;
  const rateLimit = readAnthropicRateLimit(res.headers);
  return {
    error: errorKind(res.status, codes),
    provider: { ...codes, ...(rateLimit && { rateLimit }) },
  };
}

export function readAnthropicUsage(body: Json): LlmUsage | null {
  const u = body.usage;
  if (!isObj(u)) {
    return null;
  }
  const read = num(u.cache_read_input_tokens);
  const write = num(u.cache_creation_input_tokens);
  return {
    inputTokens: num(u.input_tokens) + read + write,
    cachedInputTokens: read,
    cacheWriteInputTokens: write,
    outputTokens: num(u.output_tokens),
    reasoningTokens: 0,
  };
}

/** Concatenated text blocks (thinking blocks, if any, are ignored). */
function textOf(body: Json): string | undefined {
  const content = Array.isArray(body.content) ? body.content : [];
  let text: string | undefined;
  for (const c of content) {
    if (isObj(c) && c.type === 'text' && typeof c.text === 'string') {
      text = (text ?? '') + c.text;
    }
  }
  return text;
}

/** What we send and how the answer is checked: the wire format when the format has one. */
function shapeOf<T>(format: StructuredFormat<T>) {
  return format.wire
    ? {
        schema: anthropicSchemaFor(format.wire.schema),
        original: format.wire.schema,
        zod: format.wire.zod,
      }
    : {
        schema: anthropicSchemaFor(format.original),
        original: format.original,
        zod: format.zod,
        ...(format.prepare && { prepare: format.prepare }),
      };
}

/** The request body (exported for tests and the replay token count). */
export function anthropicBody<T>(req: LlmRequest<T>, stream = false) {
  const info = modelInfo(req.model);
  const a = info?.anthropic;
  const shape = shapeOf(req.format);
  return {
    model: req.model,
    max_tokens: req.maxOutputTokens,
    system: [
      {
        type: 'text',
        text: req.instructions,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content:
          req.inputPrefix !== undefined
            ? [
                {
                  type: 'text',
                  text: req.inputPrefix,
                  cache_control: { type: 'ephemeral' },
                },
                { type: 'text', text: req.input },
              ]
            : req.input,
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: shape.schema },
      ...(a?.effort && { effort: a.effort }),
    },
    ...(a?.thinking && { thinking: a.thinking }),
    ...(stream && { stream: true }),
  };
}

export function createAnthropicTransport(
  opts: AnthropicTransportOptions,
): LlmTransport {
  const endpoint = checkEndpoint(
    opts.baseUrl ?? ANTHROPIC_BASE_URL,
    opts.allowedHosts ?? ANTHROPIC_ALLOWED_HOSTS,
  );
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  // The key lives only in this closure and in the x-api-key header.
  const apiKey = opts.apiKey;
  const hasKey = apiKey.length > 0;

  const blocked = (): { error: LlmErrorKind; detail: string } | null => {
    if (!endpoint.ok) {
      return { error: 'config', detail: endpoint.reason };
    }
    return hasKey ? null : { error: 'disabled', detail: 'no_key' };
  };

  async function send(
    path: string,
    init: { method: 'GET' | 'POST'; body?: string },
    timeoutMs: number,
    outer?: AbortSignal,
  ): Promise<{ res: Response } | { error: LlmErrorKind }> {
    const ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, timeoutMs);
    const onOuter = () => ac.abort();
    outer?.addEventListener('abort', onOuter);
    try {
      const res = await doFetch(
        `${(endpoint as { baseUrl: string }).baseUrl}${path}`,
        {
          method: init.method,
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            ...(init.body !== undefined && {
              'content-type': 'application/json',
            }),
          },
          ...(init.body !== undefined && { body: init.body }),
          signal: ac.signal,
        },
      );
      return { res };
    } catch {
      // The thrown error is not inspected or kept (it may describe the request).
      return {
        error: timedOut ? 'timeout' : outer?.aborted ? 'timeout' : 'network',
      };
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onOuter);
    }
  }

  async function respond<T>(req: LlmRequest<T>): Promise<LlmResult<T>> {
    const t0 = now();
    const base = { requestId: req.requestId, model: req.model };
    let rid: { providerRequestId?: string } = {};
    let timing: LlmTiming | undefined;
    const fail = (
      error: LlmErrorKind,
      extra: {
        status?: number;
        detail?: string;
        usage?: LlmUsage | null;
        provider?: ProviderErrorInfo;
      } = {},
    ): LlmResult<T> => ({
      ...base,
      ...rid,
      ...(timing && { timing: { ...timing } }),
      ok: false,
      error,
      latencyMs: now() - t0,
      usage: extra.usage ?? null,
      ...(extra.status !== undefined && { status: extra.status }),
      ...(extra.detail !== undefined && { detail: extra.detail }),
      ...(extra.provider !== undefined && { provider: extra.provider }),
    });
    const stop = blocked();
    if (stop) {
      return fail(stop.error, { detail: stop.detail });
    }
    let shape: ReturnType<typeof shapeOf<T>>;
    let body: ReturnType<typeof anthropicBody<T>>;
    try {
      shape = shapeOf(req.format);
      body = anthropicBody(req);
    } catch {
      // A schema outside the provider's subset: no call (found in tests).
      return fail('config', { detail: 'schema_unsupported' });
    }
    const payload = JSON.stringify(body);
    const tSend = now();
    timing = { prepMs: Math.round(tSend - t0) };
    const sent = await send(
      '/messages',
      { method: 'POST', body: payload },
      req.timeoutMs,
      req.signal,
    );
    if ('error' in sent) {
      return fail(sent.error);
    }
    const tHeaders = now();
    timing.headersMs = Math.round(tHeaders - tSend);
    const { res } = sent;
    rid = requestIdOf(res);
    if (!res.ok) {
      const e = await readHttpError(res);
      return fail(e.error, { status: res.status, provider: e.provider });
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return fail('invalid', { status: res.status, detail: 'body_not_json' });
    }
    timing.bodyMs = Math.round(now() - tHeaders);
    if (!isObj(json)) {
      return fail('invalid', { status: res.status, detail: 'body_not_object' });
    }
    const usage = readAnthropicUsage(json);
    const model = typeof json.model === 'string' ? json.model : req.model;
    const stopReason = json.stop_reason;
    if (stopReason === 'refusal') {
      return fail('refused', { usage });
    }
    if (stopReason === 'max_tokens') {
      return fail('incomplete', { usage, detail: 'max_tokens' });
    }
    const text = textOf(json);
    const raw =
      opts.captureRaw && text !== undefined
        ? { raw: text.slice(0, RAW_MAX) }
        : {};
    if (stopReason !== 'end_turn' || text === undefined) {
      return fail('invalid', {
        usage,
        detail: `stop_${String(stopReason).slice(0, 20)}`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ...fail('invalid', { usage, detail: 'json_parse' }), ...raw };
    }
    const checked = parseAnswer(shape, parsed);
    if (!checked.success) {
      return {
        ...fail('invalid', {
          usage,
          detail: issueCodes(checked.error.issues),
        }),
        ...raw,
      };
    }
    return {
      ...base,
      ...rid,
      model,
      ok: true,
      value: checked.data,
      usage,
      latencyMs: now() - t0,
      timing: { ...timing },
      ...raw,
    };
  }

  async function checkModel(
    id: string,
    timeoutMs: number,
  ): Promise<ModelCheck> {
    const stop = blocked();
    if (stop) {
      return { ok: false, id, error: stop.error };
    }
    const sent = await send(
      `/models/${encodeURIComponent(id)}`,
      { method: 'GET' },
      timeoutMs,
    );
    if ('error' in sent) {
      return { ok: false, id, error: sent.error };
    }
    if (!sent.res.ok) {
      const e = await readHttpError(sent.res);
      return {
        ok: false,
        id,
        error: sent.res.status === 404 ? 'config' : e.error,
        status: sent.res.status,
        provider: e.provider,
      };
    }
    try {
      const j: unknown = await sent.res.json();
      if (isObj(j) && j.id === id) {
        return { ok: true, id };
      }
      const returnedId = isObj(j) ? modelIdOrUndefined(j.id) : undefined;
      return {
        ok: false,
        id,
        error: 'invalid',
        status: sent.res.status,
        ...(returnedId !== undefined && { returnedId }),
      };
    } catch {
      return { ok: false, id, error: 'invalid', status: sent.res.status };
    }
  }

  return { provider: 'anthropic', respond, checkModel };
}
