import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import { memoryStore } from '../../storage/kv';
import { buildTutorPack } from './contextPack';
import { storeLedger, withCostCap } from './costCap';
import { createFakeClient } from './plannerClient';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const content = buildContent(r.loaded, '1b');
const pack = buildTutorPack(content, {
  stepKey: '1b/s3',
  hintsUsed: 0,
  hintCount: 3,
  skills: {},
  history: [],
  studentText: 'سؤال',
});
const answer = {
  value: {
    blocks: [{ type: 'text', text: { ar: [{ ar: 'جواب.' }] } }],
    needsTeacher: false,
  },
};
const usage = {
  inputTokens: 2000,
  cachedInputTokens: 0,
  outputTokens: 100,
  reasoningTokens: 0,
};

function capped(store = memoryStore(), day = '2026-10-17', capUsd = 0.002) {
  const inner = createFakeClient({ model: 'gpt-6-luna', tutor: () => answer });
  const calls = jest.fn();
  const counting = {
    ...inner,
    tutor: async (
      p: typeof pack,
      c: { requestId: string; timeoutMs: number },
    ) => {
      calls();
      return { ...(await inner.tutor(p, c)), usage };
    },
  };
  return {
    calls,
    client: withCostCap(counting, {
      capUsd,
      maxOutputTokens: { plan: 600, tutor: 900 },
      ledger: storeLedger(store, 'spend', () => day),
    }),
  };
}

describe('withCostCap: a hard money cap', () => {
  it('refuses a call whose worst case would pass the cap, without a request', async () => {
    const { client, calls } = capped(memoryStore(), '2026-10-17', 0.0001);
    const res = await client.tutor(pack, { requestId: 'a', timeoutMs: 100 });
    expect(res).toMatchObject({ ok: false, error: 'capped' });
    expect(calls).not.toHaveBeenCalled();
  });

  it('persisted spend: a new wrapper (remount, Fast Refresh, relaunch) does not reset it', async () => {
    const store = memoryStore();
    const first = capped(store);
    let ok = 0;
    for (let i = 0; i < 50; i += 1) {
      const res = await first.client.tutor(pack, {
        requestId: `a${i}`,
        timeoutMs: 100,
      });
      ok += res.ok ? 1 : 0;
    }
    const spent = first.client.spentUsd();
    expect(spent).toBeLessThanOrEqual(0.002);
    const second = capped(store);
    expect(second.client.spentUsd()).toBeCloseTo(spent, 10);
    const more = await second.client.tutor(pack, {
      requestId: 'b',
      timeoutMs: 100,
    });
    expect(more).toMatchObject({ error: 'capped' });
    expect(ok).toBeGreaterThan(0);
    // A new day starts again.
    expect(capped(store, '2026-10-18').client.spentUsd()).toBe(0);
  });

  it('parallel calls cannot overshoot: the worst case is reserved before each call', async () => {
    const { client, calls } = capped(memoryStore(), '2026-10-17', 0.002);
    await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        client.tutor(pack, { requestId: `p${i}`, timeoutMs: 100 }),
      ),
    );
    expect(client.spentUsd()).toBeLessThanOrEqual(0.002);
    expect(calls.mock.calls.length).toBeLessThan(30);
  });
});
