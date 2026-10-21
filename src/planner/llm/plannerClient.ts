/**
 * PlannerClient: what the app asks of "an LLM", provider- and transport-
 * agnostic (Phase 4 Step 1). Requests carry context packs, not prompts, so
 * the future backend proxy receives exactly what DirectClient builds its
 * prompt from: moving to the proxy is a config change (DirectClient ->
 * ProxyClient). FakeClient serves scripted / recorded answers for tests and
 * replay without a model.
 */
import { checkEndpoint, ALLOWED_HOSTS } from '../../config/llm';
import type {
  LlmErrorKind,
  LlmResult,
  LlmTransport,
  ModelCheck,
  StructuredFormat,
} from './client';
import type { PlanContextPack, TutorContextPack } from './contextPack';
import { serializePack } from './contextPack';
import { plannerFormat, type LlmPlannerOutput } from './plannerFormat';
import {
  PLAN_INSTRUCTIONS,
  PROMPT_VERSION,
  TUTOR_INSTRUCTIONS,
} from './prompts';
import { issueCodes } from './openai';
import { denull } from './strictSchema';
import { tutorFormat, type TutorOutput } from './tutorFormat';

export interface CallOptions {
  requestId: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface PlannerClient {
  /** e.g. "direct:openai:gpt-6-luna" (dev screen, llm_call events). */
  readonly id: string;
  readonly model: string;
  plan(
    pack: PlanContextPack,
    o: CallOptions,
  ): Promise<LlmResult<LlmPlannerOutput>>;
  tutor(
    pack: TutorContextPack,
    o: CallOptions,
  ): Promise<LlmResult<TutorOutput>>;
  checkModel(timeoutMs: number): Promise<ModelCheck>;
}

/** Planner format for a pack: only components teaching the step's skills. */
const formats = new Map<string, ReturnType<typeof plannerFormat>>();
export function planFormatFor(pack: PlanContextPack) {
  const skills = [...pack.dynamic.situation.step.skills].sort();
  const key = skills.join('|');
  let f = formats.get(key);
  if (!f) {
    f = plannerFormat(skills);
    formats.set(key, f);
  }
  return f;
}

export interface DirectClientOptions {
  transport: LlmTransport;
  model: string;
  maxOutputTokens: { plan: number; tutor: number };
}

export function createDirectClient(o: DirectClientOptions): PlannerClient {
  return {
    id: `direct:${o.transport.provider}:${o.model}`,
    model: o.model,
    plan: (pack, c) =>
      o.transport.respond({
        requestId: c.requestId,
        model: o.model,
        instructions: PLAN_INSTRUCTIONS,
        input: serializePack(pack),
        format: planFormatFor(pack),
        maxOutputTokens: o.maxOutputTokens.plan,
        timeoutMs: c.timeoutMs,
        ...(c.signal && { signal: c.signal }),
      }),
    tutor: (pack, c) =>
      o.transport.respond({
        requestId: c.requestId,
        model: o.model,
        instructions: TUTOR_INSTRUCTIONS,
        input: serializePack(pack),
        format: tutorFormat(),
        maxOutputTokens: o.maxOutputTokens.tutor,
        timeoutMs: c.timeoutMs,
        ...(c.signal && { signal: c.signal }),
      }),
    checkModel: timeoutMs => o.transport.checkModel(o.model, timeoutMs),
  };
}

// ---------------------------------------------------------------------------
// Proxy (contract only: the server is not built yet, docs/DECISIONS.md D4).

/** Request body the proxy receives: POST {baseUrl}/plan or /tutor. */
export interface ProxyRequest {
  v: 1;
  promptVersion: string;
  requestId: string;
  model: string;
  pack: PlanContextPack | TutorContextPack;
}

export interface ProxyClientOptions {
  baseUrl: string;
  model: string;
  /** App credential for the proxy (not a provider key). */
  token: string;
  allowedHosts?: readonly string[];
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/**
 * The proxy answers with an LlmResult as JSON (it runs the same transport and
 * validation server-side). The client validates the value again with zod.
 */
export function createProxyClient(o: ProxyClientOptions): PlannerClient {
  const endpoint = checkEndpoint(o.baseUrl, o.allowedHosts ?? ALLOWED_HOSTS);
  const doFetch = o.fetchImpl ?? fetch;
  const now = o.now ?? (() => Date.now());

  async function call<T>(
    path: 'plan' | 'tutor',
    pack: PlanContextPack | TutorContextPack,
    format: StructuredFormat<T>,
    c: CallOptions,
  ): Promise<LlmResult<T>> {
    const t0 = now();
    const fail = (error: LlmErrorKind, status?: number): LlmResult<T> => ({
      ok: false,
      requestId: c.requestId,
      model: o.model,
      latencyMs: now() - t0,
      usage: null,
      error,
      ...(status !== undefined && { status }),
    });
    if (!endpoint.ok) {
      return fail('config');
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), c.timeoutMs);
    c.signal?.addEventListener('abort', () => ac.abort());
    try {
      const body: ProxyRequest = {
        v: 1,
        promptVersion: PROMPT_VERSION,
        requestId: c.requestId,
        model: o.model,
        pack,
      };
      const res = await doFetch(`${endpoint.baseUrl}/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${o.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        return fail(
          res.status === 401 || res.status === 403
            ? 'auth'
            : res.status === 429
            ? 'rate_limited'
            : 'provider',
          res.status,
        );
      }
      const json = (await res.json()) as Partial<LlmResult<unknown>> | null;
      if (!json || typeof json !== 'object' || typeof json.ok !== 'boolean') {
        return fail('invalid', res.status);
      }
      if (!json.ok) {
        const e = json as { error?: unknown };
        return fail(
          typeof e.error === 'string' ? (e.error as LlmErrorKind) : 'provider',
        );
      }
      const checked = format.zod.safeParse(
        denull((json as { value?: unknown }).value, format.original),
      );
      if (!checked.success) {
        return fail('invalid', res.status);
      }
      return {
        ok: true,
        requestId: c.requestId,
        model: typeof json.model === 'string' ? json.model : o.model,
        latencyMs: now() - t0,
        usage: json.usage ?? null,
        value: checked.data,
      };
    } catch {
      return fail(ac.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id: `proxy:${o.model}`,
    model: o.model,
    plan: (pack, c) => call('plan', pack, planFormatFor(pack), c),
    tutor: (pack, c) => call('tutor', pack, tutorFormat(), c),
    checkModel: async () =>
      endpoint.ok
        ? { ok: true, id: o.model }
        : { ok: false, id: o.model, error: 'config' },
  };
}

// ---------------------------------------------------------------------------
// Fake (tests, replay without a model).

export type FakeAnswer =
  | { value: unknown; latencyMs?: number }
  | { error: LlmErrorKind; status?: number; latencyMs?: number };

export interface FakeClientOptions {
  model?: string;
  plan?: (
    pack: PlanContextPack,
    c: CallOptions,
  ) => FakeAnswer | Promise<FakeAnswer>;
  tutor?: (
    pack: TutorContextPack,
    c: CallOptions,
  ) => FakeAnswer | Promise<FakeAnswer>;
}

/** Scripted answers go through the same zod validation as real ones. */
export function createFakeClient(o: FakeClientOptions): PlannerClient {
  const model = o.model ?? 'fake';
  async function run<T>(
    answer: FakeAnswer | undefined,
    format: StructuredFormat<T>,
    c: CallOptions,
  ): Promise<LlmResult<T>> {
    const base = { requestId: c.requestId, model, usage: null };
    if (!answer) {
      return { ...base, ok: false, error: 'disabled', latencyMs: 0 };
    }
    const latencyMs = answer.latencyMs ?? 0;
    if ('error' in answer) {
      return {
        ...base,
        ok: false,
        error: answer.error,
        latencyMs,
        ...(answer.status !== undefined && { status: answer.status }),
      };
    }
    const r = format.zod.safeParse(denull(answer.value, format.original));
    const raw = { raw: JSON.stringify(answer.value) };
    return r.success
      ? { ...base, ok: true, value: r.data, latencyMs, ...raw }
      : {
          ...base,
          ok: false,
          error: 'invalid',
          latencyMs,
          detail: issueCodes(r.error.issues),
          ...raw,
        };
  }
  /** Like the real transport: our timer or the caller's abort -> timeout. */
  function bounded<A>(
    answer: A | Promise<A>,
    c: CallOptions,
  ): Promise<A | 'timeout'> {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve('timeout'), c.timeoutMs);
      c.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve('timeout');
      });
      Promise.resolve(answer).then(a => {
        clearTimeout(timer);
        resolve(a);
      });
    });
  }
  const timedOut = (c: CallOptions) => ({
    requestId: c.requestId,
    model,
    usage: null,
    ok: false as const,
    error: 'timeout' as const,
    latencyMs: c.timeoutMs,
  });
  return {
    id: `fake:${model}`,
    model,
    plan: async (pack, c) => {
      const a = await bounded(o.plan?.(pack, c), c);
      return a === 'timeout' ? timedOut(c) : run(a, planFormatFor(pack), c);
    },
    tutor: async (pack, c) => {
      const a = await bounded(o.tutor?.(pack, c), c);
      return a === 'timeout' ? timedOut(c) : run(a, tutorFormat(), c);
    },
    checkModel: async () => ({ ok: true, id: model }),
  };
}
