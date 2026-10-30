import { buildGraphFor } from '../../method/templates';
import { mutationsFor } from '../../method/mutations';
import type { QuestionPack } from '../packs/build';
import type { MessagesTransport, SendResult } from '../transport/messagesApi';
import type {
  ContentBlock,
  MessagesRequest,
  ToolResultBlock,
} from '../transport/wire';
import { createBudget } from './budget';
import { TutorSession, type TutorConfig } from './loop';
import { newSession } from './state';

const graph = buildGraphFor(
  { template: 'urn_exactly_j', args: { j: 1 } },
  { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
);
const main = { id: 'main', graph, table: mutationsFor(graph), extra: [] };
const pack: QuestionPack = {
  questionId: '1',
  label: '1',
  wording: 'Montrer que P(A)= 0.5',
  main,
  plan: [],
  read: [{ token: 'simultanément', effect: { order: 'unordered' } }],
  recipe: null,
  notes: null,
  given: ['3', '4', '6', '10', '0.5', '1/2'],
};

const CONFIG: TutorConfig = {
  model: 'claude-sonnet-5-5',
  effort: 'medium',
  maxTokens: 100,
  maxTokensRetry: 200,
  requestTimeoutMs: 1000,
  maxHops: 6,
  hopNotice: 5,
  fallbacks: false,
};

const USAGE = {
  input: 10,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 10,
};

let seq = 0;
const tool = (name: string, input: unknown): ContentBlock => ({
  type: 'tool_use',
  id: `toolu_${++seq}`,
  name,
  input,
});
const ask = (
  text = 'قدّاش من تيراج ممكن؟',
  input: unknown = { kind: 'free' },
) =>
  tool('ask_student', {
    message: [{ type: 'ar', text }],
    input,
    intent: 'compute',
  });
const THINKING = { type: 'thinking', thinking: '', signature: 'sig' };

function fake(responses: { content: ContentBlock[]; stop?: string }[]) {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(JSON.parse(JSON.stringify(body)) as MessagesRequest);
      const next = responses.shift();
      if (!next) {
        throw new Error('no more responses');
      }
      return {
        ok: true,
        latencyMs: 5,
        attempts: 1,
        response: {
          id: 'm',
          model: 'claude-sonnet-5-5',
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

function session(
  responses: { content: ContentBlock[]; stop?: string }[],
  capUsd = 10,
) {
  const f = fake(responses);
  const rt = newSession('bac2022c-sc-ex2', '1', main, pack.given);
  const s = new TutorSession({
    system: [{ type: 'text', text: 'core' }],
    tools: [],
    rt,
    pack,
    experiment: null,
    transport: f.transport,
    budget: createBudget({ sessionCapUsd: capUsd }),
    config: CONFIG,
  });
  return { s, rt, ...f };
}

const lastUser = (b: MessagesRequest) => {
  const m = b.messages[b.messages.length - 1]!;
  return m.content as ToolResultBlock[];
};

describe('TutorSession turn protocol', () => {
  it('pauses on ask_student and sends the judged reply with his words apart', async () => {
    const { s, bodies } = session([
      {
        content: [
          THINKING,
          ask('اكتب الحساب.', {
            kind: 'line',
            expect: { kind: 'node', graph: 'main', node: 'total' },
          }),
        ],
      },
      { content: [ask()] },
    ]);
    const first = await s.start('Start question 1.');
    expect(first).toMatchObject({ kind: 'ask', input: { kind: 'line' } });
    await s.reply({ kind: 'line', raw: '720/6=120' });
    const content = lastUser(bodies[1]!);
    expect(content[0]).toMatchObject({ type: 'tool_result' });
    expect(JSON.parse(content[0]!.content)).toMatchObject({
      reply: 'line',
      line_id: 'L1',
      engine: { value: '120', match: { verdict: 'credit', node: 'total' } },
    });
    expect(content[1]).toEqual({
      type: 'text',
      text: 'Student (line L1): 720/6=120',
    });
    // Append-only: the first request is a prefix of the second.
    expect(bodies[1]!.messages.slice(0, bodies[0]!.messages.length)).toEqual(
      bodies[0]!.messages,
    );
    // The thinking block went back unchanged.
    expect(bodies[1]!.messages[1]!.content).toEqual(
      expect.arrayContaining([THINKING]),
    );
  });

  it('refuses ask_student next to a compute tool, then accepts it alone', async () => {
    const { s, bodies } = session([
      { content: [tool('evaluate', { lines: ['10*9*8'] }), ask()] },
      { content: [ask()] },
    ]);
    const out = await s.start('go');
    expect(out.kind).toBe('ask');
    const results = lastUser(bodies[1]!);
    expect(JSON.parse(results[0]!.content)).toMatchObject([{ value: '720' }]);
    expect(results[1]).toMatchObject({ is_error: true });
    expect(s.calls.map(c => c.rejected)).toEqual([['alone:ask_student'], []]);
  });

  it('sends a verification failure back and shows the corrected message', async () => {
    const { s, bodies } = session([
      // 120 is the total he has not found yet.
      {
        content: [
          tool('ask_student', {
            message: [{ type: 'math', latex: '120' }],
            input: { kind: 'free' },
            intent: 'other',
          }),
        ],
      },
      { content: [ask()] },
    ]);
    const out = await s.start('go');
    expect(out.kind).toBe('ask');
    const r = lastUser(bodies[1]!)[0]!;
    expect(r.is_error).toBe(true);
    expect(r.content).toContain('120 is the value of "total"');
  });

  it('defers bookkeeping results into the reply message', async () => {
    const roadmap = tool('set_roadmap', {
      stages: [
        { id: 'plan', title: 'الخطة' },
        { id: 'total', title: 'الكل' },
      ],
      current: 'plan',
      done: [],
      now: 'نرتّبو',
      why: 'باش نعرفو',
      next: 'نعدّو',
    });
    const { s, rt, bodies } = session([
      { content: [roadmap, ask()] },
      { content: [ask()] },
    ]);
    await s.start('go');
    expect(rt.state.roadmap?.current).toBe('plan');
    expect(bodies).toHaveLength(1);
    await s.reply({ kind: 'dont_know' });
    const content = lastUser(bodies[1]!);
    expect(content.map(b => b.type)).toEqual([
      'tool_result',
      'tool_result',
      'text',
    ]);
    expect(content[0]!.tool_use_id).toBe(
      (roadmap as unknown as { id: string }).id,
    );
  });

  it('shows plain text that passes the checks, with a free input', async () => {
    const { s } = session([
      {
        content: [{ type: 'text', text: 'شنوّة تحب نعاودو؟' }],
        stop: 'end_turn',
      },
    ]);
    expect(await s.start('go')).toMatchObject({
      kind: 'ask',
      input: { kind: 'free' },
    });
  });

  it('re-sends a cut-off response with more room, history unchanged', async () => {
    const { s, bodies } = session([
      { content: [THINKING], stop: 'max_tokens' },
      { content: [ask()] },
    ]);
    expect((await s.start('go')).kind).toBe('ask');
    expect(bodies[1]!.max_tokens).toBe(200);
    expect(bodies[1]!.messages).toEqual(bodies[0]!.messages);
  });

  it('ends the question', async () => {
    const { s } = session([
      {
        content: [
          tool('end_question', {
            outcome: 'solved_alone',
            summary: 'He did it.',
            next_time: '',
          }),
        ],
      },
    ]);
    expect(await s.start('go')).toMatchObject({
      kind: 'ended',
      outcome: 'solved_alone',
    });
  });

  it('makes no call over the money cap', async () => {
    const { s, transport } = session([{ content: [ask()] }], 0);
    expect(await s.start('go')).toEqual({
      kind: 'error',
      error: 'capped',
      retryable: false,
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('turns an unknown tool and a bad input into is_error results', async () => {
    const { s, bodies } = session([
      { content: [tool('bash', {}), tool('evaluate', { lines: [] })] },
      { content: [ask()] },
    ]);
    await s.start('go');
    const results = lastUser(bodies[1]!);
    expect(results.every(r => r.is_error)).toBe(true);
    expect(results[1]!.content).toContain('Invalid input for evaluate');
  });

  it('reminds the model once to use a component after he settles a step', async () => {
    const f = fake([
      {
        content: [
          ask('اكتب الكل.', {
            kind: 'line',
            expect: { kind: 'node', graph: 'main', node: 'total' },
          }),
        ],
      },
      {
        content: [
          ask('باهي.', {
            kind: 'line',
            expect: { kind: 'node', graph: 'main', node: 'fav' },
          }),
        ],
      },
      { content: [ask('كمّل.', { kind: 'free' })] },
    ]);
    const rt = newSession('bac2022c-sc-ex2', '1', main, pack.given);
    const s = new TutorSession({
      system: [{ type: 'text', text: 'core' }],
      tools: [],
      rt,
      pack: {
        ...pack,
        notes: {
          route: [],
          notationAfter: null,
          skills: [],
          prerequisites: [],
          components: [{ name: 'GroupBoxes', when: 'after he divides' }],
        },
      },
      experiment: null,
      transport: f.transport,
      budget: createBudget({ sessionCapUsd: 10 }),
      config: CONFIG,
    });
    await s.start('go');
    await s.reply({ kind: 'line', raw: '720/6=120' });
    const second = f.bodies[1]!.messages;
    expect(second[second.length - 1]).toMatchObject({ role: 'system' });
    expect(String(second[second.length - 1]!.content)).toContain('GroupBoxes');
    // Once only.
    await s.reply({ kind: 'line', raw: '4*15=60' });
    const third = f.bodies[2]!.messages;
    expect(third.filter(m => m.role === 'system')).toHaveLength(1);
  });
});
