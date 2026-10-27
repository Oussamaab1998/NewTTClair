import { z } from 'zod';

import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { ANTHROPIC_VERSION, createAnthropicTransport } from './anthropic';
import {
  AnthropicSchemaError,
  anthropicSchemaStats,
  toAnthropicSchema,
} from './anthropicSchema';
import type { LlmRequest, StructuredFormat } from './client';
import { LIVE_TUTOR_OUTPUT } from './fixtures/liveOutputs';
import { plannerFormat } from './plannerFormat';
import { toStrictSchema, zodToJsonSchema } from './strictSchema';
import { tutorFormat } from './tutorFormat';
import { plannerWire, type PlannerWire } from './wireFormat';

// A fake key: never a real one in tests.
const SENTINEL = 'sk-ant-api03-SENTINELabcdefghijklmnopqrstuvWXYZ';
const BASE = 'https://api.anthropic.com/v1';

const Tiny = z.strictObject({
  kind: z.enum(['hint', 'continue']),
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
  model: 'claude-haiku-5-5',
  instructions: 'sys',
  input: '{"x":1}',
  format: tinyFormat,
  maxOutputTokens: 100,
  timeoutMs: 1000,
  ...(over as object),
});

const okBody = (text: string, extra: Record<string, unknown> = {}) => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-haiku-5-5',
  content: [{ type: 'text', text }],
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 50,
    cache_creation_input_tokens: 1000,
    cache_read_input_tokens: 2000,
    output_tokens: 40,
  },
  ...extra,
});

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
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
  return res as unknown as Response;
}

const transportWith = (
  fetchImpl: jest.Mock,
  over: Record<string, unknown> = {},
) =>
  createAnthropicTransport({
    apiKey: SENTINEL,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => 0,
    ...over,
  });

const bodyOf = (f: jest.Mock, i = 0) =>
  JSON.parse((f.mock.calls[i]?.[1] as { body: string }).body) as Record<
    string,
    unknown
  >;

describe('Anthropic transport: request shape', () => {
  it('posts to /v1/messages with the documented headers, a cached system block and output_config.format', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"hint","note":"abc"}')),
    );
    const r = await transportWith(f).respond(req());
    expect(r.ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [
      string,
      { method: string; headers: Record<string, string> },
    ];
    expect(url).toBe(`${BASE}/messages`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'x-api-key': SENTINEL,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    });
    const body = bodyOf(f);
    expect(body.system).toEqual([
      { type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } },
    ]);
    expect(body.messages).toEqual([{ role: 'user', content: '{"x":1}' }]);
    expect(body.max_tokens).toBe(100);
    expect(body.output_config).toEqual({
      format: { type: 'json_schema', schema: toAnthropicSchema(tinyOriginal) },
      effort: 'low',
    });
    // Haiku 5.5: thinking off (accepted at effort high or below).
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(JSON.stringify(body)).not.toContain(SENTINEL);
  });

  it('per model: Haiku 4.5 sends no effort and no thinking; Sonnet 5.5 sends between_tools', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"hint","note":"abc"}')),
    );
    const t = transportWith(f);
    await t.respond(req({ model: 'claude-haiku-4-5-20251001' }));
    await t.respond(req({ model: 'claude-sonnet-5-5' }));
    const haiku = bodyOf(f, 0);
    expect(haiku.thinking).toBeUndefined();
    expect(haiku.output_config).not.toHaveProperty('effort');
    const sonnet = bodyOf(f, 1);
    expect(sonnet.thinking).toEqual({ type: 'between_tools' });
    expect(sonnet.output_config).toHaveProperty('effort', 'low');
  });

  it('usage: total input = input + cache read + cache write; the request id header is kept', async () => {
    const f = jest.fn(async () =>
      response(200, okBody('{"kind":"continue","note":"abc"}'), {
        'request-id': 'req_011ABC',
      }),
    );
    const r = await transportWith(f).respond(req());
    expect(r.usage).toEqual({
      inputTokens: 3050,
      cachedInputTokens: 2000,
      cacheWriteInputTokens: 1000,
      outputTokens: 40,
      reasoningTokens: 0,
    });
    expect(r.providerRequestId).toBe('req_011ABC');
  });
});

describe('Anthropic transport: stop reasons and validation', () => {
  it('refusal -> refused; max_tokens -> incomplete; other stop -> invalid; usage kept', async () => {
    const t = (body: unknown) =>
      transportWith(jest.fn(async () => response(200, body))).respond(req());
    const refused = await t(okBody('', { stop_reason: 'refusal' }));
    expect(refused).toMatchObject({ ok: false, error: 'refused' });
    expect(refused.usage?.outputTokens).toBe(40);
    expect(
      await t(okBody('{"kind', { stop_reason: 'max_tokens' })),
    ).toMatchObject({ ok: false, error: 'incomplete', detail: 'max_tokens' });
    expect(await t(okBody('{}', { stop_reason: 'pause_turn' }))).toMatchObject({
      ok: false,
      error: 'invalid',
      detail: 'stop_pause_turn',
    });
  });

  it('not JSON or failing zod (a stripped minLength) -> invalid with our own codes', async () => {
    const t = (text: string) =>
      transportWith(jest.fn(async () => response(200, okBody(text)))).respond(
        req(),
      );
    expect(await t('not json')).toMatchObject({
      error: 'invalid',
      detail: 'json_parse',
    });
    const short = await t('{"kind":"hint","note":"x"}');
    expect(short).toMatchObject({ error: 'invalid' });
    expect(short.ok ? '' : short.detail).toContain('note:too_small');
  });
});

describe('Anthropic transport: errors, allowlist, no retries', () => {
  it('maps error.type values; keeps only allowlisted codes and numeric rate-limit headers', async () => {
    const t = (status: number, body: unknown, headers = {}) =>
      transportWith(
        jest.fn(async () => response(status, body, headers)),
      ).respond(req());
    const err = (type: string, details?: unknown) => ({
      type: 'error',
      error: {
        type,
        message: `echo ${SENTINEL}`,
        ...(details !== undefined && { details }),
      },
      request_id: 'req_x',
    });
    expect(await t(401, err('authentication_error'))).toMatchObject({
      error: 'auth',
    });
    expect(await t(402, err('billing_error'))).toMatchObject({
      error: 'no_credit',
    });
    expect(await t(529, err('overloaded_error'))).toMatchObject({
      error: 'provider',
      status: 529,
    });
    const limited = await t(429, err('rate_limit_error'), {
      'retry-after': '12',
      'anthropic-ratelimit-requests-remaining': '0',
      'anthropic-ratelimit-requests-reset': '2026-10-21T10:00:00Z',
    });
    expect(limited).toMatchObject({
      error: 'rate_limited',
      provider: {
        type: 'rate_limit_error',
        code: null,
        rateLimit: { retryAfterSec: 12, remainingRequests: 0 },
      },
    });
    const capped = await t(
      429,
      err('rate_limit_error', { error_code: 'enforced_spend_limit_reached' }),
    );
    expect(capped).toMatchObject({ error: 'spend_limit' });
    const odd = await t(400, err('something_new', { error_code: 'x' }));
    expect(odd).toMatchObject({
      error: 'provider',
      provider: { type: 'unknown', code: 'unknown' },
    });
    for (const r of [limited, capped, odd]) {
      expect(JSON.stringify(r)).not.toContain(SENTINEL);
      expect(JSON.stringify(r)).not.toContain('echo');
    }
  });

  it('one fetch per call (no retries); thrown fetch -> network; our timer -> timeout', async () => {
    const f = jest.fn(async () => response(529, { type: 'error' }));
    await transportWith(f).respond(req());
    expect(f).toHaveBeenCalledTimes(1);
    const thrown = await transportWith(
      jest.fn(async () => {
        throw new Error(`boom ${SENTINEL}`);
      }),
    ).respond(req());
    expect(thrown).toMatchObject({ error: 'network' });
    expect(JSON.stringify(thrown)).not.toContain(SENTINEL);
    jest.useFakeTimers();
    try {
      const hang = jest.fn(
        (_u: string, init: { signal: AbortSignal }) =>
          new Promise((_, reject) =>
            init.signal.addEventListener('abort', () => reject(new Error('x'))),
          ),
      );
      const p = transportWith(hang).respond(req({ timeoutMs: 50 }));
      jest.advanceTimersByTime(60);
      expect(await p).toMatchObject({ error: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('host allowlist and a missing key make no call', async () => {
    const f = jest.fn();
    expect(
      await transportWith(f, {
        baseUrl: 'https://evil.example.com/v1',
      }).respond(req()),
    ).toMatchObject({ error: 'config', detail: 'host_not_allowed' });
    expect(
      await transportWith(f, {
        baseUrl: 'http://api.anthropic.com/v1',
      }).respond(req()),
    ).toMatchObject({ error: 'config', detail: 'not_https' });
    expect(await transportWith(f, { apiKey: '' }).respond(req())).toMatchObject(
      { error: 'disabled', detail: 'no_key' },
    );
    expect(f).not.toHaveBeenCalled();
  });

  it('model check: GET /models/{id}; 404 -> config; 401 -> auth', async () => {
    const f = jest
      .fn()
      .mockResolvedValueOnce(
        response(200, { type: 'model', id: 'claude-haiku-5-5' }),
      )
      .mockResolvedValueOnce(response(404, { type: 'error' }))
      .mockResolvedValueOnce(
        response(401, {
          type: 'error',
          error: { type: 'authentication_error' },
        }),
      );
    const t = transportWith(f);
    expect(await t.checkModel('claude-haiku-5-5', 100)).toEqual({
      ok: true,
      id: 'claude-haiku-5-5',
    });
    expect(await t.checkModel('claude-haiku-5-5', 100)).toMatchObject({
      ok: false,
      error: 'config',
    });
    expect(await t.checkModel('claude-haiku-5-5', 100)).toMatchObject({
      ok: false,
      error: 'auth',
    });
    expect(f.mock.calls[0]?.[0]).toBe(`${BASE}/models/claude-haiku-5-5`);
    expect((f.mock.calls[0]?.[1] as { method: string }).method).toBe('GET');
  });

  it('timing (2026-10-22): preparation, time to response headers, body read; a timeout keeps the preparation only', async () => {
    let t = 0;
    const clock = () => t;
    const f = jest.fn(async () => {
      t += 3000; // the network until headers
      const r = response(200, okBody(JSON.stringify({ kind: 'hint', note: 'abc' })));
      const json = r.json;
      r.json = jest.fn(async () => {
        t += 40; // reading the body
        return json();
      });
      return r;
    });
    const tr = transportWith(f, { now: clock });
    const ok = await tr.respond(req());
    expect(ok.timing).toEqual({ prepMs: 0, headersMs: 3000, bodyMs: 40 });
    const hang = jest.fn(
      (_u: string, init: { signal: AbortSignal }) =>
        new Promise((_res, rej) =>
          init.signal.addEventListener('abort', () => rej(new Error('abort'))),
        ),
    );
    const late = await transportWith(hang, { now: clock }).respond(
      req({ timeoutMs: 20 }),
    );
    expect(late).toMatchObject({ ok: false, error: 'timeout' });
    expect(late.timing).toEqual({ prepMs: 0 });
  });

  it('tutor format: the exact live answer (empty fr / math strings) is ok, not invalid', async () => {
    const f = jest.fn(async () =>
      response(200, okBody(JSON.stringify(LIVE_TUTOR_OUTPUT))),
    );
    const r = await transportWith(f).respond({
      ...req(),
      format: tutorFormat(),
    } as LlmRequest<unknown>);
    expect(r).toMatchObject({ ok: true });
  });

  it('model check: a 200 for another id is invalid and keeps that id (a model id only)', async () => {
    const f = jest
      .fn()
      .mockResolvedValueOnce(
        response(200, { type: 'model', id: 'claude-haiku-5-5-20261001' }),
      )
      .mockResolvedValueOnce(
        response(200, { type: 'model', id: 'not a model id, some text' }),
      )
      .mockResolvedValueOnce(response(200, { type: 'model' }));
    const t = transportWith(f);
    expect(await t.checkModel('claude-haiku-5-5', 100)).toEqual({
      ok: false,
      id: 'claude-haiku-5-5',
      error: 'invalid',
      status: 200,
      returnedId: 'claude-haiku-5-5-20261001',
    });
    // Anything that does not look like a model id is not kept.
    expect(await t.checkModel('claude-haiku-5-5', 100)).toEqual({
      ok: false,
      id: 'claude-haiku-5-5',
      error: 'invalid',
      status: 200,
    });
    expect(await t.checkModel('claude-haiku-5-5', 100)).toEqual({
      ok: false,
      id: 'claude-haiku-5-5',
      error: 'invalid',
      status: 200,
    });
  });
});

describe('Anthropic structured-output subset', () => {
  it('strips constraints zod re-checks, keeps optional fields optional, closes objects', () => {
    const s = toAnthropicSchema(
      zodToJsonSchema(
        z.strictObject({
          a: z.string().min(2).max(5),
          b: z.number().min(0).max(1).optional(),
          c: z.array(z.string()).min(2).max(4),
        }),
      ),
    );
    expect(s).toEqual({
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
        c: { type: 'array', items: { type: 'string' }, minItems: 1 },
      },
      required: ['a', 'c'],
      additionalProperties: false,
    });
  });

  it('rejects recursion and schemas over the documented limits', () => {
    const tree: z.ZodType = z.lazy(() =>
      z.strictObject({ kids: z.array(tree) }),
    );
    expect(() =>
      toAnthropicSchema(zodToJsonSchema(z.strictObject({ t: tree }))),
    ).toThrow(AnthropicSchemaError);
    const many = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`f${i}`, z.string().optional()]),
    );
    expect(() =>
      toAnthropicSchema(zodToJsonSchema(z.strictObject(many))),
    ).toThrow(/too complex/);
  });

  it('the per-component planner schema is over the limits (why the wire format exists)', () => {
    expect(() => toAnthropicSchema(plannerFormat().original)).toThrow(
      AnthropicSchemaError,
    );
  });

  it('every step of A1 and 2.a: the request schema (wire) is within the limits, and so is the tutor schema', () => {
    const wire = toAnthropicSchema(plannerWire().schema);
    expect(anthropicSchemaStats(wire)).toEqual({
      optionalParams: 0,
      unionParams: 0,
    });
    const tutor = toAnthropicSchema(tutorFormat().original);
    const stats = anthropicSchemaStats(tutor);
    expect(stats.optionalParams).toBeLessThanOrEqual(24);
    expect(stats.unionParams).toBeLessThanOrEqual(16);
    // The wire schema does not depend on the step: one format for all steps.
    for (const [ex, m, part] of [
      [ex2, ex2Misconceptions, '2a'],
      [ex4, ex4Misconceptions, 'A1'],
    ] as const) {
      const r = loadExercise(ex as never, m as never);
      if (!r.ok) {
        throw new Error(r.errors.join('\n'));
      }
      const p = r.loaded.exercise.parts.find(x => x.id === part);
      const steps = p?.groups.flatMap(g => g.steps) ?? [];
      expect(steps.length).toBeGreaterThan(5);
      for (const s of steps) {
        const f = plannerFormat([...(s.skills ?? [])].sort());
        expect(f.components).toBeDefined();
      }
    }
  });
});

describe('wire format -> LlmPlannerOutput', () => {
  const parse = (w: Partial<PlannerWire>) =>
    plannerWire().zod.safeParse({
      diagnosis: { misconceptionId: '', description: 'x', confidence: 0.5 },
      why: 'because',
      action: 'continue',
      target: '',
      propsJson: '',
      blocks: [],
      ...w,
    });

  it('explain: text runs become Arabic runs with French terms; math stays math', () => {
    const r = parse({
      action: 'explain',
      blocks: [
        {
          type: 'text',
          runs: [
            { lang: 'ar', text: 'شوف الـ' },
            { lang: 'fr', text: 'domaine' },
          ],
          latex: '',
        },
        { type: 'math', runs: [], latex: 'f(-x)=f(x)' },
      ],
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      diagnosis: {
        skillIds: [],
        misconceptionIds: [],
        confidence: 0.5,
        summary: 'x',
      },
      avoid: [],
      why: 'because',
      next: {
        kind: 'explain',
        blocks: [
          {
            type: 'tutor_text',
            text: { ar: [{ ar: 'شوف الـ' }, { fr: 'domaine' }] },
          },
          { type: 'math', latex: 'f(-x)=f(x)' },
        ],
      },
    });
  });

  it('show_component: props from JSON, one text block as the instruction', () => {
    const r = parse({
      action: 'show_component',
      target: 'NumericTwin',
      propsJson: '{"symbol":"x"}',
      blocks: [
        { type: 'text', runs: [{ lang: 'ar', text: 'جرّب' }], latex: '' },
      ],
    });
    expect(r.data?.next).toEqual({
      kind: 'show_component',
      component: { component: 'NumericTwin', props: { symbol: 'x' } },
      instruction: { ar: [{ ar: 'جرّب' }] },
    });
    expect(
      parse({ ...r, action: 'show_component', propsJson: '{' }).success,
    ).toBe(false);
    expect(
      parse({ action: 'show_component', target: 'NumericTwin', blocks: [] })
        .success,
    ).toBe(false);
  });

  it('hint level from target; a digit inside an Arabic run passes the shape check (RTL is applied in consult.ts)', () => {
    expect(parse({ action: 'hint', target: '2' }).data?.next).toEqual({
      kind: 'hint',
      level: 2,
    });
    expect(parse({ action: 'hint', target: '4' }).success).toBe(false);
    // Changed 2026-10-22: the RTL rule moved from this parse to consult.ts,
    // which isolates the digit into its own run or rejects the decision
    // (guard fixtures latin-inside-arabic-isolated, latex-inside-arabic,
    // digit-inside-arabic). The run arrives unchanged here.
    expect(
      parse({
        action: 'explain',
        blocks: [
          { type: 'text', runs: [{ lang: 'ar', text: 'عندك 3' }], latex: '' },
        ],
      }).data?.next,
    ).toEqual({
      kind: 'explain',
      blocks: [{ type: 'tutor_text', text: { ar: [{ ar: 'عندك 3' }] } }],
    });
  });

  it('a diagnosed misconception id is carried over', () => {
    const r = parse({
      diagnosis: {
        misconceptionId: 'exponent_rules_gap',
        description: 'd',
        confidence: 0.8,
      },
    });
    expect(r.data?.diagnosis.misconceptionIds).toEqual(['exponent_rules_gap']);
  });
});
