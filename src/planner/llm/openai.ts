/**
 * OpenAI transport over plain fetch (no SDK in the app bundle; the official
 * SDK says React Native is not supported). Endpoint: POST {baseUrl}/responses
 * with Structured Outputs (`text.format` json_schema, strict) and `store: false`
 * (the API reference: `store` "Defaults to true when omitted"; stored responses
 * are kept at least 30 days). Model check: GET {baseUrl}/models/{id}.
 * No retries. On an HTTP error only allowlisted error.code / error.type values
 * and numeric rate-limit headers are kept (providerErrors.ts).
 */
import { checkEndpoint, ALLOWED_HOSTS } from '../../config/llm';
import type {
  LlmErrorKind,
  LlmRequest,
  LlmResult,
  LlmTransport,
  LlmUsage,
  ModelCheck,
} from './client';
import { modelInfo } from './models';
import {
  errorKind,
  readErrorCodes,
  readRateLimit,
  type ProviderErrorInfo,
} from './providerErrors';
import { parseAnswer, toStrictSchema, type JsonSchema } from './strictSchema';

const strictWire = new WeakMap<JsonSchema, JsonSchema>();
function strictOfWire(schema: JsonSchema): JsonSchema {
  let s = strictWire.get(schema);
  if (!s) {
    s = toStrictSchema(schema);
    strictWire.set(schema, s);
  }
  return s;
}

export interface OpenAiTransportOptions {
  apiKey: string;
  baseUrl: string;
  allowedHosts?: readonly string[];
  fetchImpl?: typeof fetch;
  /** Monotonic ms. */
  now?: () => number;
  /** Keep the model's output text on results (dev screen; debug builds only). */
  captureRaw?: boolean;
  /**
   * Answer the flat wire format when the request's format has one (replay
   * comparisons: the same output shape as the Anthropic transport).
   */
  useWire?: boolean;
}

type Json = { [key: string]: unknown };
const isObj = (v: unknown): v is Json =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/**
 * An HTTP error response -> our class + allowlisted provider info. The body is
 * parsed only to read error.code / error.type; nothing else leaves this function.
 */
async function readHttpError(
  res: Response,
): Promise<{ error: LlmErrorKind; provider: ProviderErrorInfo }> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const codes = readErrorCodes(body);
  body = null;
  const rateLimit = readRateLimit(res.headers);
  return {
    error: errorKind(res.status, codes),
    provider: { ...codes, ...(rateLimit && { rateLimit }) },
  };
}

function readUsage(body: Json): LlmUsage | null {
  const u = body.usage;
  if (!isObj(u)) {
    return null;
  }
  const inD = isObj(u.input_tokens_details) ? u.input_tokens_details : {};
  const outD = isObj(u.output_tokens_details) ? u.output_tokens_details : {};
  return {
    inputTokens: num(u.input_tokens),
    cachedInputTokens: num(inD.cached_tokens),
    outputTokens: num(u.output_tokens),
    reasoningTokens: num(outD.reasoning_tokens),
  };
}

/** The assistant message: its output_text, or a refusal. */
function readOutput(body: Json): { text?: string; refused: boolean } {
  const output = Array.isArray(body.output) ? body.output : [];
  let text: string | undefined;
  let refused = false;
  for (const item of output) {
    if (
      !isObj(item) ||
      item.type !== 'message' ||
      !Array.isArray(item.content)
    ) {
      continue;
    }
    for (const c of item.content) {
      if (isObj(c) && c.type === 'refusal') {
        refused = true;
      } else if (
        isObj(c) &&
        c.type === 'output_text' &&
        typeof c.text === 'string'
      ) {
        text = (text ?? '') + c.text;
      }
    }
  }
  return { ...(text !== undefined && { text }), refused };
}

/** Our own codes for zod issues: path + issue code, never the value. */
export function issueCodes(
  issues: readonly { path: PropertyKey[]; code: string }[],
) {
  return issues
    .slice(0, 5)
    .map(i => `${i.path.map(String).join('.')}:${i.code}`)
    .join(';')
    .slice(0, 300);
}

/** Dev screen limit for a raw model output. */
const RAW_MAX = 6000;

export function createOpenAiTransport(
  opts: OpenAiTransportOptions,
): LlmTransport {
  const endpoint = checkEndpoint(
    opts.baseUrl,
    opts.allowedHosts ?? ALLOWED_HOSTS,
  );
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  // The key lives only in this closure and in the Authorization header.
  const authHeader = `Bearer ${opts.apiKey}`;
  const hasKey = opts.apiKey.length > 0;

  const blocked = (): { error: LlmErrorKind; detail: string } | null => {
    if (!endpoint.ok) {
      return { error: 'config', detail: endpoint.reason };
    }
    return hasKey ? null : { error: 'disabled', detail: 'no_key' };
  };

  /** fetch with our own timeout; maps throws to timeout / network. */
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
            Authorization: authHeader,
            ...(init.body !== undefined && {
              'Content-Type': 'application/json',
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
    const info = modelInfo(req.model);
    const wire = opts.useWire ? req.format.wire : undefined;
    const shape = wire
      ? {
          strict: strictOfWire(wire.schema),
          original: wire.schema,
          zod: wire.zod,
        }
      : req.format;
    const body = {
      model: req.model,
      instructions: req.instructions,
      input:
        req.inputPrefix !== undefined
          ? `${req.inputPrefix}\n${req.input}`
          : req.input,
      store: false,
      max_output_tokens: req.maxOutputTokens,
      text: {
        format: {
          type: 'json_schema',
          name: req.format.name,
          strict: true,
          schema: shape.strict,
        },
      },
      ...(info?.reasoning && {
        reasoning: { effort: info.reasoning.minEffort },
      }),
    };
    const sent = await send(
      '/responses',
      { method: 'POST', body: JSON.stringify(body) },
      req.timeoutMs,
      req.signal,
    );
    if ('error' in sent) {
      return fail(sent.error);
    }
    const { res } = sent;
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
    if (!isObj(json)) {
      return fail('invalid', { status: res.status, detail: 'body_not_object' });
    }
    const usage = readUsage(json);
    const model = typeof json.model === 'string' ? json.model : req.model;
    if (json.status === 'incomplete') {
      const reason = isObj(json.incomplete_details)
        ? json.incomplete_details.reason
        : null;
      return fail('incomplete', {
        usage,
        detail: typeof reason === 'string' ? reason.slice(0, 40) : 'unknown',
      });
    }
    const out = readOutput(json);
    if (out.refused) {
      return fail('refused', { usage });
    }
    const raw =
      opts.captureRaw && out.text !== undefined
        ? { raw: out.text.slice(0, RAW_MAX) }
        : {};
    if (json.status !== 'completed' || out.text === undefined) {
      return fail('invalid', {
        usage,
        detail: `status_${String(json.status).slice(0, 20)}`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(out.text);
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
      model,
      ok: true,
      value: checked.data,
      usage,
      latencyMs: now() - t0,
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
        // A missing model is a configuration problem whatever the body says.
        error: sent.res.status === 404 ? 'config' : e.error,
        status: sent.res.status,
        provider: e.provider,
      };
    }
    try {
      const j: unknown = await sent.res.json();
      return isObj(j) && j.id === id
        ? { ok: true, id }
        : { ok: false, id, error: 'invalid', status: sent.res.status };
    } catch {
      return { ok: false, id, error: 'invalid', status: sent.res.status };
    }
  }

  return { provider: 'openai', respond, checkModel };
}
