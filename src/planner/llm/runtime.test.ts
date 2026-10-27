import { memoryStore } from '../../storage/kv';
import { createFakeClient } from './plannerClient';
import { DailyCap, createLlmRuntime, recordOf, statusClass } from './runtime';

describe('LLM runtime', () => {
  it('daily cap: counts per local day, persists, resets the next day', () => {
    const store = memoryStore();
    let day = '2026-10-17';
    const cap = new DailyCap(store, 2, () => day);
    expect([cap.take(), cap.take(), cap.take()]).toEqual([true, true, false]);
    expect(new DailyCap(store, 2, () => day).remaining()).toBe(0);
    day = '2026-10-18';
    expect(cap.remaining()).toBe(2);
    store.set('llm.cap.v1', 'garbage');
    expect(cap.take()).toBe(true);
  });

  it('mode: no key -> rules only; kill switch -> rules only; a failed model check -> rules only', async () => {
    expect(
      createLlmRuntime({
        client: null,
        store: memoryStore(),
        dailyCap: 5,
      }).status(),
    ).toMatchObject({
      mode: 'rules_only',
      reason: 'no_key',
      modelCheck: 'skipped',
    });
    const rt = createLlmRuntime({
      client: createFakeClient({}),
      store: memoryStore(),
      dailyCap: 5,
    });
    expect(rt.mode()).toBe('llm');
    rt.flags.setKillSwitch(true);
    expect(rt.status()).toMatchObject({
      mode: 'rules_only',
      reason: 'kill_switch',
    });
    rt.flags.setKillSwitch(false);
    const failing = createFakeClient({});
    failing.checkModel = async () => ({
      ok: false,
      id: 'x',
      error: 'auth',
      status: 401,
    });
    const rt2 = createLlmRuntime({
      client: failing,
      store: memoryStore(),
      dailyCap: 5,
    });
    await rt2.checkModel(100);
    expect(rt2.status()).toMatchObject({
      mode: 'rules_only',
      reason: 'model_check_failed',
    });
    // A network failure at startup is not a verdict on the model.
    const offline = createFakeClient({});
    offline.checkModel = async () => ({ ok: false, id: 'x', error: 'network' });
    const rt3 = createLlmRuntime({
      client: offline,
      store: memoryStore(),
      dailyCap: 5,
    });
    await rt3.checkModel(100);
    expect(rt3.mode()).toBe('llm');
  });

  it('records: outcome, status class, cost from usage; never the value', () => {
    expect([undefined, 200, 404, 503].map(statusClass)).toEqual([
      'none',
      '2xx',
      '4xx',
      '5xx',
    ]);
    const r = recordOf('plan', {
      ok: true,
      requestId: 'r',
      model: 'gpt-6-luna',
      latencyMs: 1734.4,
      usage: {
        inputTokens: 2404,
        cachedInputTokens: 0,
        outputTokens: 60,
        reasoningTokens: 0,
      },
      value: { secret: 'model text' },
    });
    expect(r).toEqual({
      requestId: 'r',
      purpose: 'plan',
      model: 'gpt-6-luna',
      outcome: 'ok',
      statusClass: '2xx',
      latencyMs: 1734,
      usage: {
        inputTokens: 2404,
        cachedInputTokens: 0,
        outputTokens: 60,
        reasoningTokens: 0,
      },
      costUsd: expect.closeTo(0.0002704, 7),
    });
    expect(JSON.stringify(r)).not.toContain('model text');
  });
});

describe('model check record (Tutor intelligence 1, A1)', () => {
  const clock = () => {
    let t = 1000;
    return () => (t += 250);
  };

  it('saves the result (ok, model, status class, latency) and shows it in the status', async () => {
    const store = memoryStore();
    const rt = createLlmRuntime({
      client: createFakeClient({ model: 'claude-haiku-5-5' }),
      store,
      dailyCap: 5,
      now: clock(),
      endpoint: { host: 'api.anthropic.com', apiVersion: '2026-10-21' },
    });
    expect(rt.status().check).toBeUndefined();
    await rt.checkModel(100);
    const check = {
      at: 1500,
      client: 'fake:claude-haiku-5-5',
      model: 'claude-haiku-5-5',
      result: 'ok',
      statusClass: '2xx',
      latencyMs: 250,
    };
    expect(rt.status()).toMatchObject({
      modelCheck: 'ok',
      check,
      endpoint: { host: 'api.anthropic.com', apiVersion: '2026-10-21' },
    });
    expect(JSON.parse(store.getString('llm.modelCheck.v1')!)).toEqual(check);
  });

  it('a failure keeps only our codes: error kind, status class, allowlisted provider type, returned id', async () => {
    const store = memoryStore();
    const failing = createFakeClient({ model: 'claude-haiku-5-5' });
    failing.checkModel = async () => ({
      ok: false,
      id: 'claude-haiku-5-5',
      error: 'invalid',
      status: 200,
      returnedId: 'claude-haiku-5-5-20261001',
      provider: { type: 'not_found_error', code: null },
    });
    const rt = createLlmRuntime({
      client: failing,
      store,
      dailyCap: 5,
      now: clock(),
    });
    await rt.checkModel(100);
    expect(rt.status()).toMatchObject({
      mode: 'rules_only',
      reason: 'model_check_failed',
    });
    expect(rt.status().check).toEqual({
      at: 1500,
      client: 'fake:claude-haiku-5-5',
      model: 'claude-haiku-5-5',
      result: 'invalid',
      statusClass: '2xx',
      latencyMs: 250,
      providerType: 'not_found_error',
      returnedId: 'claude-haiku-5-5-20261001',
    });
  });

  it('the previous run\'s result is shown until this run\'s check settles; a damaged value is ignored', async () => {
    const store = memoryStore();
    const first = createLlmRuntime({
      client: createFakeClient({ model: 'm' }),
      store,
      dailyCap: 5,
      now: clock(),
    });
    await first.checkModel(100);
    const second = createLlmRuntime({
      client: createFakeClient({ model: 'm' }),
      store,
      dailyCap: 5,
    });
    expect(second.status().check).toBeUndefined();
    expect(second.status().previousCheck).toMatchObject({
      result: 'ok',
      model: 'm',
    });
    for (const bad of ['garbage', '{"result":"ok"}', '{"at":"x"}']) {
      store.set('llm.modelCheck.v1', bad);
      expect(
        createLlmRuntime({
          client: createFakeClient({}),
          store,
          dailyCap: 5,
        }).status().previousCheck,
      ).toBeUndefined();
    }
  });

  it('hands the settled result to the event log once per run; nothing before it settles or without a client', async () => {
    const rt = createLlmRuntime({
      client: createFakeClient({ model: 'm' }),
      store: memoryStore(),
      dailyCap: 5,
    });
    expect(rt.modelCheckToLog()).toBeNull();
    await rt.checkModel(100);
    expect(rt.modelCheckToLog()).toMatchObject({ result: 'ok', model: 'm' });
    expect(rt.modelCheckToLog()).toBeNull();
    const none = createLlmRuntime({
      client: null,
      store: memoryStore(),
      dailyCap: 5,
    });
    await none.checkModel(100);
    expect(none.modelCheckToLog()).toBeNull();
    expect(none.status().check).toBeUndefined();
  });
});

describe('latency per purpose (2026-10-22)', () => {
  it('counts real calls only (not disabled / capped), first call apart, timeouts', () => {
    const rt = createLlmRuntime({
      client: createFakeClient({}),
      store: memoryStore(),
      dailyCap: 5,
    });
    const rec = (
      purpose: 'plan' | 'tutor',
      outcome: string,
      latencyMs: number,
    ) =>
      rt.note({
        requestId: 'r',
        purpose,
        model: 'm',
        outcome: outcome as 'ok',
        statusClass: 'none',
        latencyMs,
      });
    expect(rt.status().latency).toBeUndefined();
    rec('plan', 'timeout', 3535);
    rec('plan', 'disabled', 0);
    rec('plan', 'capped', 0);
    rec('plan', 'ok', 1200);
    rec('plan', 'stale', 2000);
    rec('tutor', 'invalid', 5362);
    expect(rt.status().latency).toEqual({
      plan: {
        calls: 3,
        timeouts: 1,
        timeoutRate: 1 / 3,
        first: { latencyMs: 3535, timedOut: true },
        warm: { calls: 2, p50: 2000, p95: 2000 },
      },
      tutor: {
        calls: 1,
        timeouts: 0,
        timeoutRate: 0,
        first: { latencyMs: 5362, timedOut: false },
        warm: { calls: 0, p50: 0, p95: 0 },
      },
    });
  });
});

describe('call timing in the record (2026-10-22)', () => {
  it('recordOf keeps the timing', () => {
    expect(
      recordOf('plan', {
        ok: false,
        requestId: 'r',
        model: 'm',
        error: 'timeout',
        latencyMs: 3524,
        usage: null,
        timing: { prepMs: 12 },
      }).timing,
    ).toEqual({ prepMs: 12 });
  });
});
