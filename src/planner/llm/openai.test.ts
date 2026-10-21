import { z } from 'zod';

import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent, reduce, startLesson } from '../../lesson/session/lesson';
import { decide } from '../../lesson/session/orchestrate';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildMenu } from '../planner';
import { createRulesPlanner } from '../rules';
import type { LlmRequest, StructuredFormat } from './client';
import { memoryStore } from '../../storage/kv';
import { contextFor, LocalQueue } from '../../telemetry/reports';
import { createLlmPlanner } from './llmPlanner';
import { createDirectClient, createFakeClient } from './plannerClient';
import { createLlmRuntime, recordOf } from './runtime';
import { createOpenAiTransport } from './openai';
import { toStrictSchema, zodToJsonSchema } from './strictSchema';

// A fake key: never a real one in tests. OpenAI error texts echo keys masked
// as first 8 + "****" + last 4 characters.
const SENTINEL = 'sk-SENTINELabcdefghijklmnopqrstuvWXYZ';
const FRAGMENTS = [
  SENTINEL,
  SENTINEL.slice(0, 8),
  SENTINEL.slice(-4),
  'SENTINEL',
];
const BASE = 'https://api.openai.com/v1';

const Tiny = z.strictObject({
  kind: z.enum(['hint', 'continue']),
  level: z.number().int().min(1).max(3).optional(),
  // minLength is stripped by the converter (not in the strict subset): zod enforces it.
  note: z.string().min(3),
});
const tinyOriginal = zodToJsonSchema(Tiny);
const tinyFormat: StructuredFormat<z.infer<typeof Tiny>> = {
  name: 'tiny',
  original: tinyOriginal,
  strict: toStrictSchema(tinyOriginal),
  zod: Tiny,
};

const req = (
  over: Partial<LlmRequest<unknown>> = {},
): LlmRequest<z.infer<typeof Tiny>> => ({
  requestId: 'r1',
  model: 'gpt-6-luna',
  instructions: 'sys',
  input: '{"x":1}',
  format: tinyFormat,
  maxOutputTokens: 100,
  timeoutMs: 1000,
  ...(over as object),
});

/** A successful Responses API body around `text`. */
const okBody = (text: string, extra: Record<string, unknown> = {}) => ({
  id: 'resp_1',
  status: 'completed',
  model: 'gpt-6-luna',
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text }],
    },
  ],
  usage: {
    input_tokens: 120,
    input_tokens_details: { cached_tokens: 20, cache_write_tokens: 0 },
    output_tokens: 15,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 135,
  },
  ...extra,
});

/** Response stub; reading the body of an error response fails the test. */
function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: jest.fn(async () => {
      if (typeof body === 'string') {
        throw new SyntaxError('not json');
      }
      return body;
    }),
    text: jest.fn(async () => {
      throw new Error('text() must not be used');
    }),
  };
  return res as unknown as Response & {
    json: jest.Mock;
    text: jest.Mock;
  };
}

function transportWith(
  fetchImpl: jest.Mock,
  over: Record<string, unknown> = {},
) {
  return createOpenAiTransport({
    apiKey: SENTINEL,
    baseUrl: BASE,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => 0,
    ...over,
  });
}

/** The LLM planner over the real OpenAI transport with a mocked fetch. */
function llmPlannerOver(
  fetchImpl: jest.Mock,
  content: ReturnType<typeof buildContent>,
  requestId: string,
) {
  return createLlmPlanner({
    client: createDirectClient({
      transport: transportWith(fetchImpl),
      model: 'gpt-6-luna',
      maxOutputTokens: { plan: 400, tutor: 400 },
    }),
    content,
    timeoutMs: 1000,
    newRequestId: () => requestId,
  });
}

describe('OpenAI transport: request shape (Responses API, structured outputs)', () => {
  it('posts to /responses with store:false, strict json_schema and the key only in the header', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"hint","level":1,"note":"abc"}')),
    );
    const r = await transportWith(f).respond(req());
    expect(r).toMatchObject({
      ok: true,
      value: { kind: 'hint', level: 1, note: 'abc' },
    });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/responses`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${SENTINEL}`,
    );
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: 'gpt-6-luna',
      instructions: 'sys',
      input: '{"x":1}',
      store: false,
      max_output_tokens: 100,
      reasoning: { effort: 'none' },
      text: { format: { type: 'json_schema', name: 'tiny', strict: true } },
    });
    expect(JSON.stringify(body)).not.toContain('SENTINEL');
    expect(JSON.stringify(body.text.format.schema)).not.toContain('minLength');
  });

  it('sends reasoning effort only to reasoning models (gpt-4o has none; sol minimum is low)', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"continue","level":null,"note":"abc"}')),
    );
    const t = transportWith(f);
    await t.respond(req({ model: 'gpt-4o-2024-08-06' }));
    await t.respond(req({ model: 'gpt-6.1-sol' }));
    const bodies = f.mock.calls.map(c =>
      JSON.parse((c as unknown as [string, RequestInit])[1].body as string),
    );
    expect(bodies[0].reasoning).toBeUndefined();
    expect(bodies[1].reasoning).toEqual({ effort: 'low' });
  });

  it('reads usage, including cached and reasoning tokens; null when absent', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"continue","level":null,"note":"abc"}')),
    );
    const r = await transportWith(f).respond(req());
    expect(r.usage).toEqual({
      inputTokens: 120,
      cachedInputTokens: 20,
      outputTokens: 15,
      reasoningTokens: 0,
    });
    const g = jest.fn(async () =>
      response(
        200,
        okBody('{"kind":"continue","level":null,"note":"abc"}', {
          usage: undefined,
        }),
      ),
    );
    expect((await transportWith(g).respond(req())).usage).toBeNull();
  });
});

describe('OpenAI transport: errors map to our classes, no retries', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate_limited'],
    [400, 'provider'],
    [500, 'provider'],
    [503, 'provider'],
  ])(
    'HTTP %i -> %s, one call, status kept, no message text kept',
    async (status, error) => {
      const res = response(status, {
        error: {
          message: `Incorrect API key provided: ${SENTINEL.slice(
            0,
            8,
          )}****${SENTINEL.slice(-4)}`,
        },
      });
      const f = jest.fn(async () => res);
      const r = await transportWith(f).respond(req());
      expect(r).toMatchObject({
        ok: false,
        error,
        status,
        provider: { code: null, type: null },
      });
      expect(f).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.text).not.toHaveBeenCalled();
      expect(JSON.stringify(r)).not.toContain('Incorrect');
    },
  );

  it('fetch throwing -> network; our timer -> timeout (request aborted)', async () => {
    const thrower = jest.fn(async () => {
      throw new TypeError(`Network request failed for key ${SENTINEL}`);
    });
    expect(await transportWith(thrower).respond(req())).toMatchObject({
      ok: false,
      error: 'network',
    });
    let seen: AbortSignal | undefined;
    const hang = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          seen = init.signal ?? undefined;
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const r = await transportWith(hang).respond(req({ timeoutMs: 5 }));
    expect(r).toMatchObject({ ok: false, error: 'timeout' });
    expect(seen?.aborted).toBe(true);
    expect(hang).toHaveBeenCalledTimes(1);
  });

  it('refusal -> refused; incomplete -> incomplete with its reason; usage kept', async () => {
    const refusal = okBody('', {
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'refusal', refusal: 'I cannot help' }],
        },
      ],
    });
    const r1 = await transportWith(
      jest.fn(async () => response(200, refusal)),
    ).respond(req());
    expect(r1).toMatchObject({ ok: false, error: 'refused' });
    expect(r1.usage?.inputTokens).toBe(120);
    expect(JSON.stringify(r1)).not.toContain('I cannot help');
    const cut = okBody('{"kind":', {
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
    });
    expect(
      await transportWith(jest.fn(async () => response(200, cut))).respond(
        req(),
      ),
    ).toMatchObject({
      ok: false,
      error: 'incomplete',
      detail: 'max_output_tokens',
    });
  });

  it('not JSON or failing zod -> invalid, with our own issue codes only', async () => {
    const r1 = await transportWith(
      jest.fn(async () => response(200, okBody('not json'))),
    ).respond(req());
    expect(r1).toMatchObject({
      ok: false,
      error: 'invalid',
      detail: 'json_parse',
    });
    const r2 = await transportWith(
      jest.fn(async () =>
        response(200, okBody('{"kind":"explode","level":null,"note":"abc"}')),
      ),
    ).respond(req());
    expect(r2).toMatchObject({ ok: false, error: 'invalid' });
    expect((r2 as { detail: string }).detail).toMatch(/^kind:/);
    expect((r2 as { detail: string }).detail).not.toContain('explode');
  });

  it('a constraint the converter stripped (minLength) is still rejected by zod', async () => {
    // The provider never saw minLength, so a schema-valid answer can violate it.
    const r = await transportWith(
      jest.fn(async () =>
        response(200, okBody('{"kind":"hint","level":1,"note":""}')),
      ),
    ).respond(req());
    expect(r).toMatchObject({ ok: false, error: 'invalid' });
    expect((r as { detail: string }).detail).toContain('note:too_small');
  });
});

describe('OpenAI transport: only allowlisted error.code / error.type, numeric rate-limit headers', () => {
  const errorOf = async (
    status: number,
    error: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) =>
    transportWith(
      jest.fn(async () => response(status, { error }, headers)),
    ).respond(req());

  it.each([
    [
      429,
      { type: 'insufficient_quota', code: 'credit_balance_exhausted' },
      'no_credit',
    ],
    [429, { code: 'insufficient_quota' }, 'no_credit'],
    [429, { code: 'project_spend_limit_exceeded' }, 'spend_limit'],
    [429, { code: 'organization_usage_limit_exceeded' }, 'spend_limit'],
    [429, { code: 'rate_limit_exceeded' }, 'rate_limited'],
    [429, { type: 'rate_limit_error', code: 'slow_down' }, 'rate_limited'],
    [401, { code: 'invalid_api_key', type: 'invalid_request_error' }, 'auth'],
    [404, { code: 'model_not_found', type: 'invalid_request_error' }, 'config'],
    [
      503,
      { type: 'service_unavailable_error', code: 'server_is_overloaded' },
      'provider',
    ],
  ])('HTTP %i %j -> %s (one call, no retry)', async (status, error, kind) => {
    const f = jest.fn(async () =>
      response(status, { error: { message: 'm', ...error } }),
    );
    const r = await transportWith(f).respond(req());
    expect(r).toMatchObject({ ok: false, error: kind, status });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('values outside the allowlist become "unknown"; the status mapping applies', async () => {
    const r = await errorOf(429, { code: 'brand_new_code', type: 'weird' });
    expect(r).toMatchObject({
      error: 'rate_limited',
      provider: { code: 'unknown', type: 'unknown' },
    });
    const n = await errorOf(500, { code: 42, type: { nested: true } });
    expect(n).toMatchObject({ provider: { code: 'unknown', type: 'unknown' } });
  });

  it('a body that is not JSON gives no codes', async () => {
    const r = await transportWith(
      jest.fn(async () => response(502, '<html>bad gateway</html>')),
    ).respond(req());
    expect(r).toMatchObject({
      error: 'provider',
      status: 502,
      provider: { code: null, type: null },
    });
  });

  it('rate-limit headers are kept as numbers only (durations in ms); anything else dropped', async () => {
    const r = await errorOf(
      429,
      { code: 'rate_limit_exceeded' },
      {
        'x-ratelimit-limit-requests': '60',
        'x-ratelimit-remaining-requests': '0',
        'x-ratelimit-reset-requests': '1s',
        'x-ratelimit-limit-tokens': '150000',
        'x-ratelimit-remaining-tokens': 'lots',
        'x-ratelimit-reset-tokens': '6m0s',
        'retry-after': '56',
      },
    );
    expect(!r.ok && r.provider?.rateLimit).toEqual({
      limitRequests: 60,
      remainingRequests: 0,
      resetRequestsMs: 1000,
      limitTokens: 150000,
      resetTokensMs: 360000,
      retryAfterSec: 56,
    });
  });
});

describe('a key echoed anywhere in an error response is never kept', () => {
  const masked = `${SENTINEL.slice(0, 8)}****${SENTINEL.slice(-4)}`;
  const echoBody = {
    error: {
      message: `Incorrect API key provided: ${SENTINEL} (${masked})`,
      code: SENTINEL,
      type: masked,
      param: SENTINEL,
      details: { key: SENTINEL, list: [masked] },
    },
    [SENTINEL]: masked,
  };
  const echoHeaders = {
    'x-ratelimit-limit-requests': SENTINEL,
    'x-ratelimit-reset-tokens': masked,
    'retry-after': SENTINEL,
  };

  function expectClean(label: string, value: unknown) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    for (const fragment of FRAGMENTS) {
      if (text.includes(fragment)) {
        throw new Error(`${label} contains a key fragment`);
      }
    }
  }

  it('LlmResults and model checks: only "unknown" codes, no headers', async () => {
    for (const status of [400, 401, 403, 404, 429, 500, 503]) {
      const t = transportWith(
        jest.fn(async () => response(status, echoBody, echoHeaders)),
      );
      const r = await t.respond(req());
      expect(r).toMatchObject({
        ok: false,
        provider: { code: 'unknown', type: 'unknown' },
      });
      expect(!r.ok && r.provider?.rateLimit).toBeFalsy();
      expectClean('result', r);
      expectClean('model check', await t.checkModel('gpt-6-luna', 100));
    }
  });

  it('events written by the lesson after an LLM failure, the report queue export, and console output', async () => {
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map(m =>
      jest.spyOn(console, m).mockImplementation(() => {}),
    );
    const r = loadExercise(ex2, ex2Misconceptions);
    if (!r.ok) {
      throw new Error(r.errors.join('\n'));
    }
    const menu = buildMenu(r.loaded);
    const content = buildContent(r.loaded, '1b');
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'a',
        exerciseId: r.loaded.exercise.id,
        contentVersion: r.loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const start = startLesson(content);
    log.append(start.events);
    const step = reduce(content, start.state, { type: 'not_sure', at: 1000 });
    log.append(step.events);
    for (const status of [401, 429, 500]) {
      const planner = llmPlannerOver(
        jest.fn(async () => response(status, echoBody, echoHeaders)),
        content,
        `req-${status}`,
      );
      const d = await decide(
        content,
        log,
        planner,
        createRulesPlanner(menu),
        1000,
      );
      expect(d.source).toBe('fallback');
      expectClean('decision', d);
    }
    const applied = reduce(content, step.state, {
      type: 'apply_plan',
      decision: await decide(
        content,
        log,
        llmPlannerOver(
          jest.fn(async () => response(429, echoBody, echoHeaders)),
          content,
          'req-x',
        ),
        createRulesPlanner(menu),
        1000,
      ),
      at: 2000,
    });
    log.append(applied.events);
    expect(log.all().some(e => e.t === 'plan')).toBe(true);
    expectClean('event log', log.all());
    // Reports sink: a report queued after the failures, and its JSONL export.
    const queue = new LocalQueue(memoryStore());
    const [reportEvent] = log.append([
      {
        t: 'report',
        questionId: '1b',
        stepId: 's1',
        blockId: 'q1b-s1',
        reason: 'wrong_math',
        source: 'ai',
      },
    ]);
    queue.add({
      kind: 'report',
      id: reportEvent!.id,
      event: reportEvent as Extract<typeof reportEvent, { t: 'report' }>,
      context: contextFor(log.all(), {
        appVersion: '0.0.1',
        platform: 'ios',
        osVersion: '26.5',
        locale: 'ar-TN',
      }),
    });
    expectClean('report queue export', queue.toJsonl());
    for (const spy of spies) {
      expectClean('console', spy.mock.calls);
      spy.mockRestore();
    }
  });

  it('llm_call events and the dev-screen metrics built from those results', async () => {
    const r = loadExercise(ex2, ex2Misconceptions);
    if (!r.ok) {
      throw new Error(r.errors.join('\n'));
    }
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'a',
        exerciseId: r.loaded.exercise.id,
        contentVersion: r.loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const runtime = createLlmRuntime({
      client: createFakeClient({}),
      store: memoryStore(),
      dailyCap: 10,
    });
    for (const status of [400, 401, 403, 404, 429, 500, 503]) {
      const result = await transportWith(
        jest.fn(async () => response(status, echoBody, echoHeaders)),
      ).respond(req());
      const record = recordOf('plan', result);
      runtime.note(record);
      log.append([
        {
          t: 'llm_call',
          questionId: '1b',
          stepId: 's3',
          requestId: record.requestId,
          purpose: record.purpose,
          model: record.model,
          outcome: record.outcome,
          statusClass: record.statusClass,
          latencyMs: record.latencyMs,
          ...(record.reasons && { reasons: record.reasons }),
        },
      ]);
    }
    expectClean('llm_call events', log.all());
    expectClean('dev-screen status', runtime.status());
  });
});

describe('OpenAI transport: host allowlist and missing key make no call', () => {
  it.each([
    ['https://evil.example.com/v1', 'host_not_allowed'],
    ['http://api.openai.com/v1', 'not_https'],
    ['not a url', 'invalid_url'],
    ['https://api.openai.com.evil.example/v1', 'host_not_allowed'],
  ])('%s -> config (%s), fetch never called', async (baseUrl, detail) => {
    const f = jest.fn();
    const t = transportWith(f, { baseUrl });
    expect(await t.respond(req())).toMatchObject({
      ok: false,
      error: 'config',
      detail,
    });
    expect(await t.checkModel('gpt-6-luna', 100)).toMatchObject({
      ok: false,
      error: 'config',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('a host listed explicitly in config is allowed', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"continue","level":null,"note":"abc"}')),
    );
    const t = transportWith(f, {
      baseUrl: 'https://proxy.example.org/v1',
      allowedHosts: ['api.openai.com', 'proxy.example.org'],
    });
    expect(await t.respond(req())).toMatchObject({ ok: true });
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://proxy.example.org/v1/responses',
    );
  });

  it('no key -> disabled, no call', async () => {
    const f = jest.fn();
    expect(await transportWith(f, { apiKey: '' }).respond(req())).toMatchObject(
      { ok: false, error: 'disabled' },
    );
    expect(f).not.toHaveBeenCalled();
  });
});

describe('OpenAI transport: model check (GET /models/{id})', () => {
  it('found, not found (404 -> config), key rejected (401 -> auth)', async () => {
    const f = jest
      .fn()
      .mockResolvedValueOnce(
        response(200, { id: 'gpt-6-luna', object: 'model' }),
      )
      .mockResolvedValueOnce(response(404, {}))
      .mockResolvedValueOnce(response(401, {}));
    const t = transportWith(f);
    expect(await t.checkModel('gpt-6-luna', 100)).toEqual({
      ok: true,
      id: 'gpt-6-luna',
    });
    expect(await t.checkModel('gpt-nope', 100)).toEqual({
      ok: false,
      id: 'gpt-nope',
      error: 'config',
      status: 404,
      provider: { code: null, type: null },
    });
    expect(await t.checkModel('gpt-6-luna', 100)).toMatchObject({
      ok: false,
      error: 'auth',
      status: 401,
    });
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      `${BASE}/models/gpt-6-luna`,
    );
    expect(
      (f.mock.calls[0] as unknown as [string, RequestInit])[1].method,
    ).toBe('GET');
  });
});

describe('the key never leaves the Authorization header (sentinel redaction)', () => {
  it('no result, error or console output contains the key or its masked fragments', async () => {
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map(m =>
      jest.spyOn(console, m).mockImplementation(() => {}),
    );
    const echo = {
      error: { message: `Incorrect API key provided: ${SENTINEL}` },
    };
    const scenarios: jest.Mock[] = [
      ...[401, 403, 429, 400, 500].map(s =>
        jest.fn(async () => response(s, echo)),
      ),
      jest.fn(async () => {
        throw new Error(`fetch failed: Authorization: Bearer ${SENTINEL}`);
      }),
      jest.fn(async () =>
        response(
          200,
          okBody(
            `{"kind":"hint","level":1,"note":"${SENTINEL}"}`.replace(
              SENTINEL,
              'abc',
            ),
          ),
        ),
      ),
      jest.fn(async () => response(200, okBody('not json'))),
      jest.fn(async () =>
        response(
          200,
          okBody('', {
            output: [
              {
                type: 'message',
                content: [{ type: 'refusal', refusal: SENTINEL }],
              },
            ],
          }),
        ),
      ),
    ];
    const outputs: unknown[] = [];
    for (const f of scenarios) {
      const t = transportWith(f);
      outputs.push(
        t,
        await t.respond(req()),
        await t.checkModel('gpt-6-luna', 100),
      );
    }
    const text = JSON.stringify(outputs) + outputs.map(String).join('|');
    for (const fragment of FRAGMENTS) {
      expect(text).not.toContain(fragment);
    }
    for (const spy of spies) {
      const logged = JSON.stringify(spy.mock.calls);
      for (const fragment of FRAGMENTS) {
        expect(logged).not.toContain(fragment);
      }
      spy.mockRestore();
    }
  });
});

describe('LLM planner: any rejected answer falls back to the rules', () => {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  const loaded = r.loaded;
  const menu = buildMenu(loaded);
  const rules = createRulesPlanner(menu);

  function session() {
    const content = buildContent(loaded, '1b');
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'a',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const start = startLesson(content);
    log.append(start.events);
    log.append(
      reduce(content, start.state, { type: 'not_sure', at: 1000 }).events,
    );
    return { content, log };
  }

  const plannerWith = (
    answer: unknown,
    content: ReturnType<typeof buildContent>,
  ) =>
    llmPlannerOver(
      jest.fn(async () => response(200, okBody(JSON.stringify(answer)))),
      content,
      'req-1',
    );

  const answer = (summary: string) => ({
    diagnosis: { skillIds: [], misconceptionIds: [], confidence: 0.5, summary },
    avoid: [],
    next: { kind: 'hint', level: 1 },
    followUp: null,
  });

  it('a valid answer is used (source llm)', async () => {
    const { content, log } = session();
    const d = await decide(
      content,
      log,
      plannerWith(answer('ok'), content),
      rules,
      1000,
    );
    expect(d).toMatchObject({
      source: 'llm',
      ruleId: 'llm',
      next: { kind: 'hint', level: 1 },
    });
  });

  it('an answer violating a stripped constraint (tutor text with an empty French run) -> rules fallback', async () => {
    const { content, log } = session();
    const bad = {
      ...answer('x'),
      next: {
        kind: 'explain',
        blocks: [
          { type: 'tutor_text', text: { ar: null, fr: '', math: null } },
        ],
      },
    };
    const d = await decide(
      content,
      log,
      plannerWith(bad, content),
      rules,
      1000,
    );
    expect(d.source).toBe('fallback');
    expect(d.ruleId).toBe('rule.not_sure.deep_dive');
  });

  it('refused, unknown component and transport errors -> rules fallback', async () => {
    const { content, log } = session();
    const unknownComponent = {
      ...answer('x'),
      next: {
        kind: 'show_component',
        component: { component: 'Hologram', props: {} },
        instruction: { fr: 'x', ar: null, math: null },
      },
    };
    for (const p of [
      plannerWith(unknownComponent, content),
      llmPlannerOver(
        jest.fn(async () => response(500, {})),
        content,
        'req-2',
      ),
    ]) {
      const d = await decide(content, log, p, rules, 1000);
      expect(d.source).toBe('fallback');
    }
  });
});
