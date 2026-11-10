import type { StudentAct } from '../ai/checks/autoCheck';
import type {
  MessagesTransport,
  SendResult,
} from '../ai/transport/messagesApi';
import type { MessagesRequest } from '../ai/transport/wire';
import { CATALOG } from '../app/exercises';
import { memoryStore } from '../storage/kv';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
} from './conductor/conductor';
import { HYBRID_SPEND_KEY, liveAi } from './live';
import { passTour } from './tour/passTour';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const ctx = questionCtx(
  entry.result.ok ? entry.result.loaded : (null as never),
  entry.raw as never,
  '1',
);

function fakeTransport() {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(body);
      return {
        ok: false,
        error: 'network',
        retryable: true,
        latencyMs: 1,
        attempts: 1,
      };
    }),
  };
  return { transport, bodies };
}

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
      notes: null,
      transport: f.transport,
    });
    expect(await ai.mover(ctx, undiagnosed())).toBeNull();
    expect(f.transport.send).not.toHaveBeenCalled();
  });
});
