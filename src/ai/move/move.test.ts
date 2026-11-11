import type { StudentAct } from '../checks/autoCheck';
import { CATALOG } from '../../app/exercises';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
} from '../../hybrid/conductor/conductor';
import { createAllowance } from '../../hybrid/allowance';
import type { Allowance, MoveRequest } from '../../hybrid/mover';
import { passTour } from '../../hybrid/tour/passTour';
import { memoryLedger } from '../../planner/llm/costCap';
import { aiCostUsd } from '../config';
import { bannedSentence } from '../prompt/lexicon';
import type { MessagesTransport, SendResult } from '../transport/messagesApi';
import type {
  ContentBlock,
  MessagesRequest,
  ToolResultBlock,
} from '../transport/wire';
import { createMover, type MoverConfig } from './mover';
import { movePack, PACK_MAX } from './pack';
import { movePrompt, MOVE_PROMPT_MAX } from './prompt';
import { buildSituation, SITUATION_MAX, type MoveMemory } from './situation';
import { allowedMoves, caseHidesSlip, checkMove, MOVE_TOOL } from './tool';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const ctxOf = (q: string) => questionCtx(loaded!, entry.raw as never, q);
const ctx = ctxOf('1');

/** Plays acts with the prepared replies shown (as with no AI). */
function play(acts: StudentAct[], from = startQuestion(ctx)) {
  let state = from;
  for (const a of acts) {
    const r = act(ctx, state, a);
    state = applyFallback(r.state, r.out);
  }
  return state;
}

const TOUR: StudentAct[] = passTour(ctx);

const line = (raw: string): StudentAct => ({ kind: 'line', raw });
const SLIP = line('10*3=30');

/** A request after his act (the conductor's answer and state). */
function request(a: StudentAct, before = play(TOUR)): MoveRequest {
  const r = act(ctx, before, a);
  return { act: a, out: r.out, state: r.state };
}
/** The same slip twice at the total: light, slip_again. */
const lightReq = () => request(SLIP, play([...TOUR, SLIP]));
/** A wrong line the engine does not know at the favourable count: deep. */
const deepReq = () =>
  request(line('4*6=24'), play([...TOUR, line('10*9*8/6=120')]));

const USAGE = {
  input: 100,
  cacheRead: 3_000,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 200,
};

let seq = 0;
const tool = (name: string, input: unknown): ContentBlock => ({
  type: 'tool_use',
  id: `toolu_${++seq}`,
  name,
  input,
});
const move = (input: Record<string, unknown>) =>
  tool(MOVE_TOOL, { component: null, case: null, ...input });

const GOOD = move({
  move: 'repair',
  message: [
    { type: 'student_line', line_id: 'L2' },
    { type: 'ar', text: 'السطر متاعك يعدّ حاجة أخرى. شنوّة يعدّ بالضبط؟' },
  ],
});
/** Shows the total (120) before he found it. */
const LEAK = move({
  move: 'repair',
  message: [{ type: 'ar', text: 'الكل هو 120 تيراج، موش 30.' }],
});

function fake(
  responses: { content: ContentBlock[]; stop?: string; model?: string }[],
) {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(JSON.parse(JSON.stringify(body)) as MessagesRequest);
      const next = responses.shift();
      if (!next) {
        return {
          ok: false,
          error: 'network',
          retryable: true,
          latencyMs: 1,
          attempts: 1,
        };
      }
      return {
        ok: true,
        latencyMs: 5,
        attempts: 1,
        response: {
          id: 'm',
          model: next.model ?? body.model,
          content: next.content,
          stopReason: next.stop ?? 'tool_use',
          refusalCategory: null,
          usage: USAGE,
        },
      };
    }),
  };
  return { transport, bodies };
}

function allowance(permit = true) {
  return {
    mode: () => 'full' as const,
    permits: jest.fn((_t: unknown, _r: unknown) => permit),
    permitsHandover: jest.fn((_r: unknown) => permit),
    add: jest.fn(),
  } satisfies Allowance;
}

/** The request body as sent (the move mode adds tool_choice). */
type Sent = MessagesRequest & {
  tool_choice?: { type: string; name?: string };
  thinking: { type: string };
};
const sent = (b: MessagesRequest | undefined) => b as Sent;
/** The situation: the text of the first user message. */
const situationOf = (b: MessagesRequest | undefined): string => {
  const c = b?.messages[0]?.content;
  const first = Array.isArray(c) ? c[0] : undefined;
  return typeof first?.text === 'string' ? first.text : '';
};

describe('move mode: sizes', () => {
  it('keeps the core prompt under 10,000 characters and byte-stable', () => {
    const core = movePrompt();
    expect(core.length).toBeLessThanOrEqual(MOVE_PROMPT_MAX);
    expect(movePrompt()).toBe(core);
    expect(core).toContain(bannedSentence());
    expect(core).toContain('tutor_move');
  });

  it.each(['1', '2', '3a', '3b'])(
    'keeps the pack of question %s under 8,000 characters, with its own cases',
    q => {
      const pack = movePack(ctxOf(q));
      expect(pack.text.length).toBeLessThanOrEqual(PACK_MAX);
      expect(pack.text).toContain(`(id "${q}")`);
      expect(pack.prepared.length).toBeGreaterThanOrEqual(2);
      expect(pack.text).toContain('- S1: ');
      // Only this question: no other question's wording.
      for (const other of ['1', '2', '3a', '3b'].filter(x => x !== q)) {
        expect(pack.text).not.toContain(`(id "${other}")`);
      }
    },
  );

  it('never prints a prepared value equal to an unearned value of the question', () => {
    // Question 1's small urn S3 has 6*5*4 = 120 ordered draws: the total.
    const s3 = movePack(ctx)
      .text.split('\n')
      .find(l => l.startsWith('- S3: '))!;
    expect(s3).toContain('ord (a value of this question: never show)');
    expect(s3).not.toMatch(/\b120\b/);
  });

  it('keeps the situation under 4,000 characters when everything is long', () => {
    let state = play(TOUR);
    for (let i = 0; i < 12; i++) {
      state = play([line(`10*9*8/(3*2*1)+${i}*7*7*7*7=${i}`)], state);
    }
    const free: StudentAct = { kind: 'free', text: 'ya3ni '.repeat(300) };
    const r = act(ctx, state, free);
    const memory: MoveMemory = {
      lastTurn: 1,
      exchanges: Array.from({ length: 8 }, (_, i) => ({
        turn: i,
        frameId: 'm1.c_total',
        reason: 'slip_again' as const,
        tier: 'light' as const,
        act: 'x'.repeat(500),
        shown: 'y'.repeat(500),
        by: 'ai' as const,
        move: 'repair' as const,
        caseLabel: 'S1',
      })),
    };
    const text = buildSituation({
      ctx,
      req: { act: free, out: r.out, state: r.state },
      tier: 'light',
      allowed: allowedMoves('free_text', 'light'),
      memory,
      profile: 'p'.repeat(2_500),
    });
    expect(text.length).toBeLessThanOrEqual(SITUATION_MAX);
    // The reason, his act and the allowed moves always stay.
    expect(text).toContain('reason free_text');
    expect(text).toContain('ya3ni');
    expect(text).toContain('Allowed moves: say, probe');
  });

  it('says why, what he did and what the prepared reply is', () => {
    const req = lightReq();
    expect(req.out).toMatchObject({ tier: 'light', reason: 'slip_again' });
    const text = buildSituation({
      ctx,
      req,
      tier: 'light',
      allowed: allowedMoves('slip_again', 'light'),
      memory: null,
      profile: null,
    });
    expect(text).toContain('reason slip_again');
    expect(text).toContain('His act (verbatim):\nline «10*3=30»');
    expect(text).toMatch(/L2 «10\*3=30»/);
    expect(text).toContain('Step he acted on: m1.c_total');
    expect(text).toContain('Prepared reply');
    expect(text).toContain('escalate');
  });
});

describe('move mode: checks', () => {
  const env = (
    req: MoveRequest,
    allowed = allowedMoves('slip_again', 'light'),
  ) => {
    const pack = movePack(ctx);
    const state = JSON.parse(JSON.stringify(req.state.session));
    for (const c of pack.prepared) {
      state.cases[c.id] = c.spec;
    }
    return {
      rt: { state, graphs: new Map([['main', ctx.pack.main!]]) },
      pack: ctx.pack,
      experiment: pack.experiment,
      allowed,
      slip: 'n_times_k',
      prepared: Object.fromEntries(pack.prepared.map(c => [c.id, c.facts])),
    };
  };

  it('passes a move that cites his line by reference', () => {
    const r = checkMove(GOOD.input, env(lightReq()));
    expect(r).toMatchObject({ ok: true, kind: 'repair' });
    expect(r.ok && r.blocks[0]).toMatchObject({
      type: 'student_line',
      raw: '10*3=30',
    });
  });

  it('refuses a leak, a line id, a non-Tunisian word and a move not allowed', () => {
    const e = env(lightReq());
    expect(checkMove(LEAK.input, e)).toMatchObject({ ok: false });
    const words = checkMove(
      move({
        move: 'probe',
        message: [{ type: 'ar', text: 'شحال من تيراج في L2؟' }],
      }).input,
      e,
    );
    expect(words.ok).toBe(false);
    expect(!words.ok && words.reasons.join(' ')).toMatch(/line id/);
    expect(!words.ok && words.reasons.join(' ')).toMatch(/شحال/);
    expect(
      checkMove(
        move({ move: 'say', message: [{ type: 'ar', text: 'باهي.' }] }).input,
        e,
      ),
    ).toMatchObject({ ok: false });
  });

  it('draws a prepared case, and refuses one where his slip gives the right number', () => {
    const urn = move({
      move: 'component',
      message: [{ type: 'ar', text: 'اختار كورتين مع بعض من الصندوق الصغير.' }],
      component: {
        name: 'Urn',
        props_json: '{"mode":"select"}',
        case_id: 'S1',
      },
    });
    const ok = checkMove(urn.input, env(lightReq()));
    expect(ok.ok && ok.component).toMatchObject({ name: 'Urn', caseId: 'S1' });
    expect(ok.ok && ok.component?.experiment?.urn).toHaveLength(4);
    // S1 (pairs) hides a division by k: refused after that slip.
    const hiding = { ...env(lightReq()), slip: 'divide_by_k_not_k_factorial' };
    expect(checkMove(urn.input, hiding)).toMatchObject({ ok: false });
    expect(
      caseHidesSlip(['groups = ordered/k'], 'divide_by_k_not_k_factorial'),
    ).toBe(true);
    expect(caseHidesSlip(['n_times_k at fav_red'], 'n_times_k')).toBe(true);
    expect(caseHidesSlip(['n_times_k at fav_red'], null)).toBe(false);
  });

  it('builds a new case with the engine', () => {
    const r = checkMove(
      move({
        move: 'case',
        message: [
          { type: 'ar', text: 'صندوق صغير فيه خمسة حروف. قدّاش من مجموعة؟' },
        ],
        case: { kind: 'box', n: 5, k: 3 },
      }).input,
      env(lightReq()),
    );
    expect(r).toMatchObject({
      ok: true,
      made: { spec: { kind: 'box', n: 5, k: 3 } },
    });
  });
});

describe('move mode: the mover', () => {
  it('sends Haiku one light call with no fallbacks and pays for it', async () => {
    const { transport, bodies } = fake([{ content: [GOOD] }]);
    const al = allowance();
    const mover = createMover({ transport, allowance: al });
    const m = await mover(ctx, lightReq());
    expect(m).toMatchObject({ tier: 'light' });
    expect(m?.blocks[0]).toMatchObject({ type: 'student_line' });
    expect(bodies).toHaveLength(1);
    const b = sent(bodies[0]);
    expect(b.model).toBe('claude-haiku-5-5');
    expect(b.fallbacks).toBeUndefined();
    expect(b.tool_choice).toEqual({ type: 'auto' });
    expect(b.thinking).toEqual({ type: 'adaptive' });
    expect(b.output_config).toEqual({ effort: 'low' });
    expect(b.tools.map(t => t.name)).toEqual([MOVE_TOOL]);
    expect(b.tools[0]!.strict).toBeUndefined();
    expect(b.system).toHaveLength(2);
    expect(b.system[0]!.text).toBe(movePrompt());
    expect(b.system.map(s => s.cache_control)).toEqual([
      { type: 'ephemeral', ttl: '1h' },
      { type: 'ephemeral', ttl: '1h' },
    ]);
    expect(b.messages).toHaveLength(1);
    const cost = aiCostUsd('claude-haiku-5-5', USAGE);
    expect(al.permits).toHaveBeenCalledWith('light', 'slip_again');
    expect(al.add).toHaveBeenCalledWith('light', cost);
    expect(m?.costUsd).toBeCloseTo(cost, 12);
  });

  it('can force the tool on Haiku, with thinking off', async () => {
    const { transport, bodies } = fake([{ content: [GOOD] }]);
    const config: Partial<MoverConfig> = {
      light: {
        model: 'claude-haiku-5-5',
        effort: 'low',
        maxTokens: 1_000,
        timeoutMs: 1_000,
        toolChoice: 'forced',
        maxCalls: 2,
        compute: false,
      },
    };
    await createMover({ transport, allowance: allowance(), config })(
      ctx,
      lightReq(),
    );
    expect(sent(bodies[0]).tool_choice).toEqual({
      type: 'tool',
      name: MOVE_TOOL,
    });
    expect(sent(bodies[0]).thinking).toEqual({ type: 'disabled' });
  });

  it('sends Sonnet a deep call with auto tool choice, compute tools and fallbacks', async () => {
    const req = deepReq();
    expect(req.out).toMatchObject({ tier: 'deep', reason: 'undiagnosed' });
    const { transport, bodies } = fake([
      { content: [tool('evaluate', { lines: ['4*6=24'] })] },
      {
        content: [
          move({
            move: 'probe',
            message: [{ type: 'ar', text: 'السطر متاعك شنوّة يعدّ؟' }],
          }),
        ],
      },
    ]);
    const al = allowance();
    const m = await createMover({ transport, allowance: al })(ctx, req);
    expect(m).toMatchObject({ tier: 'deep' });
    expect(bodies).toHaveLength(2);
    const b = sent(bodies[0]);
    expect(b.model).toBe('claude-sonnet-5-5');
    expect(b.tool_choice).toEqual({ type: 'auto' });
    expect(b.fallbacks).toBe('default');
    expect(b.tools.map(t => t.name)).toEqual([
      'evaluate',
      'list_outcomes',
      'test_rule',
      MOVE_TOOL,
    ]);
    // One compute hop: its result, then the app asks for the move.
    const second = bodies[1]!.messages;
    expect(second.map(x => x.role)).toEqual([
      'user',
      'assistant',
      'user',
      'system',
    ]);
    const res = second[2]!.content as ToolResultBlock[];
    expect(res[0]!.is_error).toBeUndefined();
    expect(al.add).toHaveBeenCalledTimes(1);
    expect(al.add).toHaveBeenCalledWith(
      'deep',
      2 * aiCostUsd('claude-sonnet-5-5', USAGE),
    );
  });

  it('gives a refused move one retry with the reasons, then returns null', async () => {
    const { transport, bodies } = fake([
      { content: [LEAK] },
      { content: [LEAK] },
      { content: [GOOD] },
    ]);
    const al = allowance();
    const m = await createMover({ transport, allowance: al })(ctx, lightReq());
    expect(m).toBeNull();
    expect(bodies).toHaveLength(2);
    const retry = bodies[1]!.messages;
    const res = retry[retry.length - 1]!.content as ToolResultBlock[];
    expect(res[0]).toMatchObject({ is_error: true });
    expect(res[0]!.content).toMatch(/120 is the value of "total"/);
    // Both calls are paid for, once.
    expect(al.add).toHaveBeenCalledWith(
      'light',
      2 * aiCostUsd('claude-haiku-5-5', USAGE),
    );
  });

  it('shows a move fixed on the retry', async () => {
    const { transport } = fake([{ content: [LEAK] }, { content: [GOOD] }]);
    const m = await createMover({ transport, allowance: allowance() })(
      ctx,
      lightReq(),
    );
    expect(m?.blocks).toHaveLength(2);
  });

  it('makes no call when the allowance does not permit it', async () => {
    const { transport } = fake([{ content: [GOOD] }]);
    const al = allowance(false);
    const m = await createMover({ transport, allowance: al })(ctx, lightReq());
    expect(m).toBeNull();
    expect(transport.send).not.toHaveBeenCalled();
    expect(al.add).not.toHaveBeenCalled();
  });

  it('makes no call for an instant act', async () => {
    const { transport } = fake([{ content: [GOOD] }]);
    const req = request(SLIP);
    expect(req.out.tier).toBe('instant');
    expect(
      await createMover({ transport, allowance: allowance() })(ctx, req),
    ).toBeNull();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('hands an escalated moment to the deep tier', async () => {
    const { transport, bodies } = fake([
      { content: [move({ move: 'escalate', message: [] })] },
      { content: [GOOD] },
    ]);
    const al = allowance();
    const m = await createMover({ transport, allowance: al })(ctx, lightReq());
    expect(m).toMatchObject({ tier: 'deep' });
    expect(bodies.map(b => b.model)).toEqual([
      'claude-haiku-5-5',
      'claude-sonnet-5-5',
    ]);
    // The hand-over has its own permit; a light reason is never asked deep.
    expect(al.permitsHandover).toHaveBeenCalledWith('slip_again');
    expect(al.permits).not.toHaveBeenCalledWith('deep', 'slip_again');
    expect(situationOf(bodies[1])).toContain(
      'The light tutor handed this moment to you',
    );
  });

  it('hands an escalated moment over under the real allowance', async () => {
    const { transport, bodies } = fake([
      { content: [move({ move: 'escalate', message: [] })] },
      { content: [GOOD] },
    ]);
    const ledger = memoryLedger();
    const al = createAllowance({ ledger });
    expect(al.permits('deep', 'slip_again')).toBe(false);
    const m = await createMover({ transport, allowance: al })(ctx, lightReq());
    expect(m).toMatchObject({ tier: 'deep' });
    expect(bodies.map(b => b.model)).toEqual([
      'claude-haiku-5-5',
      'claude-sonnet-5-5',
    ]);
    // Both calls charged; the hand-over used one of the question's deep calls.
    expect(ledger.get()).toBeCloseTo(
      aiCostUsd('claude-haiku-5-5', USAGE) +
        aiCostUsd('claude-sonnet-5-5', USAGE),
      12,
    );
    al.add('deep', 0.001);
    expect(al.permitsHandover('slip_again')).toBe(false);
  });

  it('in essential mode, hands over a moment the student needs answered', async () => {
    const free: StudentAct = {
      kind: 'free',
      text: 'ma fhemtech chnowa na3mel',
    };
    const req = request(free);
    expect(req.out).toMatchObject({ tier: 'light', reason: 'free_text' });
    const { transport, bodies } = fake([
      { content: [move({ move: 'escalate', message: [] })] },
      { content: [GOOD] },
    ]);
    const ledger = memoryLedger();
    ledger.add(0.07);
    const al = createAllowance({ ledger });
    expect(al.mode()).toBe('essential');
    await createMover({ transport, allowance: al })(ctx, req);
    expect(bodies[0]?.model).toBe('claude-haiku-5-5');
    expect(bodies[1]?.model).toBe('claude-sonnet-5-5');
    expect(situationOf(bodies[1])).toContain(
      'The light tutor handed this moment to you',
    );
  });

  it('pays Haiku and shows the prepared reply when the deep calls are used up', async () => {
    const { transport, bodies } = fake([
      { content: [move({ move: 'escalate', message: [] })] },
      { content: [GOOD] },
    ]);
    const al = createAllowance({ ledger: memoryLedger() });
    al.add('deep', 0.001);
    al.add('deep', 0.001);
    const m = await createMover({ transport, allowance: al })(ctx, lightReq());
    expect(m).toBeNull();
    expect(bodies.map(b => b.model)).toEqual(['claude-haiku-5-5']);
  });

  it('never throws and remembers what he was shown', async () => {
    const transport: MessagesTransport = {
      send: jest.fn(async () => {
        throw new Error('boom');
      }),
    };
    const mover = createMover({ transport, allowance: allowance() });
    expect(await mover(ctx, lightReq())).toBeNull();
    // The next call's situation lists that exchange (the prepared reply).
    const f = fake([{ content: [GOOD] }]);
    transport.send = f.transport.send;
    const later = lightReq();
    later.state = { ...later.state, turn: later.state.turn + 1 };
    await mover(ctx, later);
    const text = situationOf(f.bodies[0]);
    expect(text).toContain('Last exchanges');
    expect(text).toContain('shown (prepared)');
  });

  it('returns null on a refusal or plain text', async () => {
    const refusal = fake([{ content: [], stop: 'refusal' }]);
    expect(
      await createMover({
        transport: refusal.transport,
        allowance: allowance(),
      })(ctx, lightReq()),
    ).toBeNull();
    const text = fake([
      { content: [{ type: 'text', text: 'hello' }], stop: 'end_turn' },
      { content: [{ type: 'text', text: 'hello' }], stop: 'end_turn' },
    ]);
    expect(
      await createMover({ transport: text.transport, allowance: allowance() })(
        ctx,
        lightReq(),
      ),
    ).toBeNull();
    expect(text.bodies).toHaveLength(2);
  });
});
