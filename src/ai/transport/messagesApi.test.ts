import { ANTHROPIC_VERSION } from '../../planner/llm/anthropic';
import {
  createMessagesTransport,
  FALLBACK_BETA,
  readUsage,
} from './messagesApi';
import type { MessagesRequest } from './wire';

// A fake key: never a real one in tests.
const SENTINEL = 'sk-ant-api03-SENTINELabcdefghijklmnopqrstuvWXYZ';

const request = (over: Partial<MessagesRequest> = {}): MessagesRequest => ({
  model: 'claude-sonnet-5-5',
  max_tokens: 100,
  system: [
    {
      type: 'text',
      text: 'core',
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
  ],
  messages: [{ role: 'user', content: 'start' }],
  tools: [
    {
      name: 'ask_student',
      description: 'd',
      input_schema: { type: 'object' },
    },
  ],
  thinking: { type: 'adaptive' },
  output_config: { effort: 'medium' },
  cache_control: { type: 'ephemeral' },
  ...over,
});

const THINKING = {
  type: 'thinking',
  thinking: '',
  signature: 'sig-abc',
};
const TOOL_USE = {
  type: 'tool_use',
  id: 'toolu_1',
  name: 'ask_student',
  input: { message: [] },
};

const okBody = (extra: Record<string, unknown> = {}) => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-5-5',
  content: [THINKING, TOOL_USE],
  stop_reason: 'tool_use',
  usage: {
    input_tokens: 4,
    cache_read_input_tokens: 2000,
    cache_creation_input_tokens: 1300,
    cache_creation: {
      ephemeral_5m_input_tokens: 1000,
      ephemeral_1h_input_tokens: 300,
    },
    output_tokens: 40,
  },
  ...extra,
});

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: jest.fn(async () => {
      if (typeof body === 'string') {
        throw new SyntaxError('not json');
      }
      return body;
    }),
  } as unknown as Response;
}

function make(fetchImpl: jest.Mock, over: Record<string, unknown> = {}) {
  const sleep = jest.fn(async (_ms: number) => {});
  const t = createMessagesTransport({
    apiKey: SENTINEL,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => 0,
    sleep,
    random: () => 0,
    ...over,
  });
  return { t, sleep };
}

const initOf = (f: jest.Mock, i = 0) =>
  f.mock.calls[i]?.[1] as {
    body: string;
    headers: Record<string, string>;
    method: string;
  };

describe('AI messages transport: request', () => {
  it('posts the body unchanged to /v1/messages with the version header', async () => {
    const f = jest.fn(async () => response(200, okBody()));
    const { t } = make(f);
    const body = request();
    const r = await t.send(body, { timeoutMs: 1000 });
    expect(r.ok).toBe(true);
    expect((f.mock.calls[0] as unknown[] | undefined)?.[0]).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    const init = initOf(f);
    expect(init.method).toBe('POST');
    expect(init.headers['anthropic-version']).toBe(ANTHROPIC_VERSION);
    expect(init.headers['x-api-key']).toBe(SENTINEL);
    expect(init.headers['anthropic-beta']).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it('adds the fallback beta header only when the body asks for fallbacks', async () => {
    const f = jest.fn(async () => response(200, okBody()));
    const { t } = make(f, { betas: ['x-beta'] });
    await t.send(request({ fallbacks: 'default' }), { timeoutMs: 1000 });
    expect(initOf(f).headers['anthropic-beta']).toBe(`x-beta,${FALLBACK_BETA}`);
  });

  it('makes no request without a key', async () => {
    const f = jest.fn();
    const { t } = make(f, { apiKey: '' });
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r).toMatchObject({ ok: false, error: 'disabled', retryable: false });
    expect(f).not.toHaveBeenCalled();
  });

  it('refuses a host outside the allowlist without a request', async () => {
    const f = jest.fn();
    const { t } = make(f, { baseUrl: 'https://evil.example.com/v1' });
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r).toMatchObject({ ok: false, error: 'config' });
    expect(f).not.toHaveBeenCalled();
  });
});

describe('AI messages transport: response', () => {
  it('returns the content blocks verbatim, thinking signatures included', async () => {
    const f = jest.fn(async () => response(200, okBody()));
    const { t } = make(f);
    const r = await t.send(request(), { timeoutMs: 1000 });
    if (!r.ok) {
      throw new Error('expected ok');
    }
    expect(r.response.content).toEqual([THINKING, TOOL_USE]);
    expect(r.response.stopReason).toBe('tool_use');
    expect(r.response.usage).toEqual({
      input: 4,
      cacheRead: 2000,
      cacheWrite5m: 1000,
      cacheWrite1h: 300,
      output: 40,
    });
  });

  it('reads the refusal category', async () => {
    const f = jest.fn(async () =>
      response(
        200,
        okBody({
          content: [],
          stop_reason: 'refusal',
          stop_details: { type: 'refusal', category: 'cyber' },
        }),
      ),
    );
    const { t } = make(f);
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r.ok && r.response.refusalCategory).toBe('cyber');
  });

  it('counts writes without a breakdown as 5-minute writes', () => {
    expect(
      readUsage({
        usage: {
          input_tokens: 1,
          cache_creation_input_tokens: 70,
          output_tokens: 2,
        },
      }),
    ).toEqual({
      input: 1,
      cacheRead: 0,
      cacheWrite5m: 70,
      cacheWrite1h: 0,
      output: 2,
    });
  });

  it('rejects a body without content blocks', async () => {
    const f = jest.fn(async () => response(200, { stop_reason: 'end_turn' }));
    const { t } = make(f);
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r).toMatchObject({
      ok: false,
      error: 'invalid',
      detail: 'content_not_blocks',
      retryable: false,
    });
  });
});

describe('AI messages transport: retries', () => {
  it('retries 529 with backoff and then succeeds', async () => {
    const f = jest
      .fn()
      .mockResolvedValueOnce(
        response(529, { type: 'error', error: { type: 'overloaded_error' } }),
      )
      .mockResolvedValueOnce(response(200, okBody()));
    const { t, sleep } = make(f);
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r).toMatchObject({ ok: true, attempts: 2 });
    expect(sleep).toHaveBeenCalledWith(1000);
    // The retry is an identical re-send.
    expect(initOf(f, 1).body).toBe(initOf(f, 0).body);
  });

  it('honours retry-after on 429 (capped at 10 s)', async () => {
    const f = jest
      .fn()
      .mockResolvedValueOnce(
        response(
          429,
          { type: 'error', error: { type: 'rate_limit_error' } },
          { 'retry-after': '30' },
        ),
      )
      .mockResolvedValueOnce(response(200, okBody()));
    const { t, sleep } = make(f);
    await t.send(request(), { timeoutMs: 1000 });
    expect(sleep).toHaveBeenCalledWith(10_000);
  });

  it('gives up after maxRetries and says the request may be retried', async () => {
    const f = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const { t, sleep } = make(f);
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r).toMatchObject({
      ok: false,
      error: 'network',
      retryable: true,
      attempts: 3,
    });
    expect(sleep.mock.calls.map(c => c[0])).toEqual([1000, 3000]);
  });

  it.each([
    [400, 'invalid_request_error', 'provider'],
    [401, 'authentication_error', 'auth'],
  ])('never retries %i', async (status, type, kind) => {
    const f = jest.fn(async () =>
      response(status, { type: 'error', error: { type, message: SENTINEL } }),
    );
    const { t, sleep } = make(f);
    const r = await t.send(request(), { timeoutMs: 1000 });
    expect(r).toMatchObject({
      ok: false,
      error: kind,
      status,
      retryable: false,
      attempts: 1,
    });
    expect(sleep).not.toHaveBeenCalled();
    // The error message (which can echo a key) is never kept.
    expect(JSON.stringify(r)).not.toContain(SENTINEL);
  });

  it('does not retry its own timeout', async () => {
    const f = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const { t, sleep } = make(f);
    const r = await t.send(request(), { timeoutMs: 5 });
    expect(r).toMatchObject({
      ok: false,
      error: 'timeout',
      retryable: true,
      attempts: 1,
    });
    expect(sleep).not.toHaveBeenCalled();
  });
});
