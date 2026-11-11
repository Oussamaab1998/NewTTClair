import type { StudentAct } from '../ai/checks/autoCheck';
import type {
  MessagesTransport,
  SendResult,
} from '../ai/transport/messagesApi';
import type { MessagesRequest } from '../ai/transport/wire';
import { slowMover } from '../app/dev/launch';
import { CATALOG } from '../app/exercises';
import { memoryStore } from '../storage/kv';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
} from './conductor/conductor';
import { HYBRID_QUESTIONS_KEY, HYBRID_SPEND_KEY, liveAi } from './live';
import { passTour } from './tour/passTour';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const ctx = questionCtx(
  entry.result.ok ? entry.result.loaded : (null as never),
  entry.raw as never,
  '1',
);

/** Every call fails (no charge), or is a refusal that is paid for. */
function fakeTransport(answer: 'fail' | 'refusal' = 'fail') {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(body);
      return answer === 'fail'
        ? {
            ok: false,
            error: 'network',
            retryable: true,
            latencyMs: 1,
            attempts: 1,
          }
        : {
            ok: true,
            latencyMs: 1,
            attempts: 1,
            response: {
              id: 'm',
              model: body.model,
              content: [],
              stopReason: 'refusal',
              refusalCategory: null,
              usage: {
                input: 100,
                cacheRead: 3_000,
                cacheWrite5m: 0,
                cacheWrite1h: 0,
                output: 200,
              },
            },
          };
    }),
  };
  return { transport, bodies };
}

const QUESTION = { exerciseId: 'bac2022c-sc-ex2', questionId: '1' };

/** The state and the conductor's answer after an undiagnosed line (a deep reason). */
function undiagnosed() {
  const acts: StudentAct[] = [
    ...passTour(ctx),
    { kind: 'line', raw: '10*9*8/6=120' },
  ];
  let state = startQuestion(ctx);
  for (const a of acts) {
    const r = act(ctx, state, a);
    state = applyFallback(r.state, r.out);
  }
  const studentAct: StudentAct = { kind: 'line', raw: '4*6=24' };
  const r = act(ctx, state, studentAct);
  expect(r.out).toMatchObject({ tier: 'deep', reason: 'undiagnosed' });
  return { act: studentAct, out: r.out, state: r.state };
}

const today = () => new Date().toISOString().slice(0, 10);

describe('the live AI side of the board', () => {
  it('calls Sonnet for a deep reason while the day is young, and shows the prepared reply when the call fails', async () => {
    const f = fakeTransport();
    const ai = liveAi({
      store: memoryStore(),
      apiKey: 'test',
      ...QUESTION,
      notes: null,
      transport: f.transport,
    });
    expect(await ai.mover(ctx, undiagnosed())).toBeNull();
    expect(f.bodies[0]?.model).toBe('claude-sonnet-5-5');
  });

  it('makes no call once the day is nearly spent (prepared replies only)', async () => {
    const store = memoryStore();
    store.set(HYBRID_SPEND_KEY, JSON.stringify({ day: today(), usd: 0.095 }));
    const f = fakeTransport();
    const ai = liveAi({
      store,
      apiKey: 'test',
      ...QUESTION,
      notes: null,
      transport: f.transport,
    });
    expect(await ai.mover(ctx, undiagnosed())).toBeNull();
    expect(f.transport.send).not.toHaveBeenCalled();
  });

  it("keeps the question's deep calls when he leaves and reopens it", async () => {
    const store = memoryStore();
    const open = (f: ReturnType<typeof fakeTransport>) =>
      liveAi({
        store,
        apiKey: 'test',
        ...QUESTION,
        notes: null,
        transport: f.transport,
      });
    for (let visit = 0; visit < 2; visit++) {
      const f = fakeTransport('refusal');
      expect(await open(f).mover(ctx, undiagnosed())).toBeNull();
      expect(f.bodies.map(b => b.model)).toEqual(['claude-sonnet-5-5']);
    }
    const record = JSON.parse(store.getString(HYBRID_QUESTIONS_KEY)!);
    expect(record.day).toBe(today());
    expect(record.questions['bac2022c-sc-ex2/1']).toMatchObject({
      deep: 2,
      light: 0,
    });
    // Third visit: no deep call left, so the deep reason is answered light.
    const f = fakeTransport('refusal');
    await open(f).mover(ctx, undiagnosed());
    expect(f.bodies.map(b => b.model)).toEqual(['claude-haiku-5-5']);
  });

  it('with -devMover slow: the stand-in, no call and nothing spent', async () => {
    jest.useFakeTimers();
    try {
      const store = memoryStore();
      const f = fakeTransport('refusal');
      const ai = liveAi({
        store,
        apiKey: 'test',
        ...QUESTION,
        notes: null,
        transport: f.transport,
        devMover: slowMover(),
      });
      let result: unknown = 'pending';
      const p = ai.mover(ctx, undiagnosed()).then(m => (result = m));
      await jest.advanceTimersByTimeAsync(4_900);
      expect(result).toBe('pending');
      await jest.advanceTimersByTimeAsync(200);
      await p;
      expect(result).toBeNull();
      expect(f.transport.send).not.toHaveBeenCalled();
      expect(store.getString(HYBRID_SPEND_KEY)).toBeUndefined();
      expect(store.getString(HYBRID_QUESTIONS_KEY)).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops the slow stand-in when the screen aborts', async () => {
    jest.useFakeTimers();
    try {
      const c = new AbortController();
      let result: unknown = 'pending';
      const p = slowMover()(ctx, undiagnosed(), c.signal).then(
        m => (result = m),
      );
      await jest.advanceTimersByTimeAsync(1_000);
      c.abort();
      await p;
      expect(result).toBeNull();
      const aborted = new AbortController();
      aborted.abort();
      expect(await slowMover()(ctx, undiagnosed(), aborted.signal)).toBeNull();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
