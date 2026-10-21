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
