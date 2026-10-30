/// <reference types="node" />
/**
 * Step 1 of the AI-tutor plan: at most 3 live calls to Claude Sonnet 5.5 with
 * two tools (ask_student, evaluate), through the app's own transport
 * (src/ai/transport/messagesApi.ts). It checks, and prints:
 * - the model ends its turn with a tool call (stop_reason tool_use);
 * - replayed thinking blocks are accepted (calls 2 and 3 resend them);
 * - prompt caching works (cache reads > 0 on calls 2 and 3);
 * - latency and cost per call.
 * Key: CLAUDE_API_KEY from the shell, else .env.llm.local; never printed.
 * Raw responses (no key) go to tools/tutor-harness/out/ (gitignored).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AI_TUTOR, aiCostUsd } from '../../src/ai/config';
import { principlesText } from '../../src/ai/prompt/principles';
import { createMessagesTransport } from '../../src/ai/transport/messagesApi';
import {
  isToolUse,
  type ApiMessage,
  type ContentBlock,
  type MessagesRequest,
  type ToolDefinition,
} from '../../src/ai/transport/wire';
import { evaluateExact, parseExpression } from '../../src/engine/expression';
import { normalizeCounting } from '../../src/engine/expression/counting';
import { fractionToPlain } from '../../src/engine/format';
import { parseEnv } from '../replay/evalLib';

const root = path.resolve(__dirname, '..', '..');
const MAX_CALLS = 3;

function apiKey(): string {
  const envPath = path.join(root, '.env.llm.local');
  const file = existsSync(envPath)
    ? parseEnv(readFileSync(envPath, 'utf8'))
    : {};
  return process.env.CLAUDE_API_KEY ?? file.CLAUDE_API_KEY ?? '';
}

/** Exact value of each side of a line (counting notation allowed). */
function evaluateLine(raw: string): unknown {
  const sides = raw.split('=').map(s => s.trim());
  const values = sides.map(side => {
    const n = normalizeCounting(side);
    if (!n.ok) {
      return { side, error: n.reason };
    }
    const p = parseExpression(n.text, { variables: [], constants: [] });
    if (!p.ok) {
      return { side, error: p.error.code };
    }
    const v = evaluateExact(p.ast);
    return v ? { side, value: fractionToPlain(v) } : { side, error: 'inexact' };
  });
  const vals = values.map(v => ('value' in v ? v.value : null));
  return {
    sides: values,
    equal:
      vals.length > 1 ? vals.every(v => v !== null && v === vals[0]) : null,
  };
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'ask_student',
    description:
      'Show the student one message and one thing to do, then wait for his answer. Every message to the student goes through this tool. Call it alone, after reading any engine results.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['message', 'input'],
      properties: {
        message: {
          type: 'array',
          description:
            'Blocks in reading order. "ar": Tunisian darija (French maths words allowed, no digits or formulas). "math": one LaTeX formula, shown left to right on its own line.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'text'],
            properties: {
              type: { type: 'string', enum: ['ar', 'math'] },
              text: { type: 'string' },
            },
          },
        },
        input: {
          type: 'string',
          enum: ['free', 'line', 'continue'],
          description:
            '"line": he writes a calculation line on a pad; "free": free text; "continue": a button.',
        },
      },
    },
  },
  {
    name: 'evaluate',
    description:
      'Exact value of each side of calculation lines (e.g. "10*9*8/(3*2*1)=120", "C(10,3)"). Use it before writing any number the student has not written himself.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['lines'],
      properties: {
        lines: { type: 'array', items: { type: 'string' } },
      },
    },
  },
];

const CORE = [
  'You are a maths tutor for Tunisian baccalauréat students. You lead the lesson in a chat, one message at a time, in Tunisian darija; French maths words (simultanément, tirage, probabilité) stay in French. Formulas and numbers go in "math" blocks, never inside Arabic text.',
  'Your goal: the student can start a new question alone on paper, say the plan, and solve it. You never give the how; he finds it. A math engine checks every number: before you show a number he has not written, compute it with the evaluate tool.',
  'Every message to the student goes through ask_student, with exactly one question or task.',
  '',
  'The method (25 principles):',
  principlesText(),
  '',
  'Example of the style that worked (another urn, 8 balls, 3 drawn together). The student wrote "8+3=11 then 11*10*9". The tutor did not say wrong; it said: "I see how you think: start from the number of balls and go down by one each time, as many numbers as balls drawn. That idea is right. Let\'s test the starting number on a small box: 4 balls a b c d, draw 2 in order. What does your rule give, and how many do you count when you list them?" The student predicted 4*3=12, listed 9 (forgot d), then found d and the 12 himself.',
].join('\n');

const PACK = [
  "Exercise (French, exam wording): Une urne contient quatre boules rouges et six boules noires, indiscernables au toucher. Une épreuve consiste à tirer simultanément trois boules de l'urne.",
  "Question 1: On considère l'événement A : « Obtenir une seule boule rouge ». Montrer que P(A) = 1/2.",
  'Private solution graph (never reveal a value the student has not earned): ordered draws 720; orderings of 3 balls 6; total draws 120; red part 4; black part 15; favourable 60; P(A) = 60/120 = 1/2.',
  'Plan cards (coarse): count all draws; count the favourable draws; divide.',
].join('\n');

async function main(): Promise<void> {
  const key = apiKey();
  if (!key) {
    throw new Error('no CLAUDE_API_KEY (shell or .env.llm.local)');
  }
  const transport = createMessagesTransport({ apiKey: key });
  // SPIKE_STRICT=0: send the same tools without strict mode (constrained decoding).
  const strict = process.env.SPIKE_STRICT !== '0';
  const tools = TOOLS.map(({ strict: _s, ...t }) =>
    strict ? { ...t, strict: true } : t,
  );
  console.log(`strict tools: ${strict}`);
  const studentReplies = [
    '7asb ma fi mo5i 8+3=11 o madem bch nejbdou 3 na3ml 11*10*9',
    'ma na3rfch',
  ];
  const messages: ApiMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Session context: new student, no history. Start question 1.',
        },
      ],
    },
  ];
  const log: unknown[] = [];
  let totalUsd = 0;
  for (let call = 1; call <= MAX_CALLS; call++) {
    const body: MessagesRequest = {
      model: AI_TUTOR.model,
      max_tokens: AI_TUTOR.maxTokens,
      tools,
      thinking: { type: 'adaptive' },
      output_config: { effort: AI_TUTOR.effort },
      system: [
        {
          type: 'text',
          text: CORE,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
        {
          type: 'text',
          text: PACK,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      cache_control: { type: 'ephemeral' },
      messages,
      ...(AI_TUTOR.fallbacks && { fallbacks: 'default' as const }),
    };
    const r = await transport.send(body, {
      timeoutMs: AI_TUTOR.requestTimeoutMs,
    });
    if (!r.ok) {
      console.log(
        `call ${call}: FAILED ${r.error} status=${r.status ?? '-'} type=${
          r.provider?.type ?? '-'
        } code=${r.provider?.code ?? '-'} detail=${r.detail ?? '-'} attempts=${
          r.attempts
        }`,
      );
      log.push({
        call,
        error: r.error,
        status: r.status,
        provider: r.provider,
      });
      break;
    }
    const res = r.response;
    const usd = aiCostUsd(res.model || AI_TUTOR.model, res.usage);
    totalUsd += usd;
    const kinds = res.content.map(b => b.type);
    const thinking = res.content.filter(b => b.type === 'thinking');
    const signed = thinking.filter(
      b => typeof b.signature === 'string' && b.signature.length > 0,
    ).length;
    const calls = res.content.filter(isToolUse);
    console.log(
      `call ${call}: stop=${res.stopReason} model=${
        res.model
      } blocks=[${kinds.join(',')}] thinking=${
        thinking.length
      } (signed ${signed}) tools=[${calls.map(c => c.name).join(',')}]`,
    );
    console.log(
      `  usage: input=${res.usage.input} cacheRead=${
        res.usage.cacheRead
      } write5m=${res.usage.cacheWrite5m} write1h=${
        res.usage.cacheWrite1h
      } output=${res.usage.output} | ${r.latencyMs} ms | $${usd.toFixed(
        4,
      )} | attempts=${r.attempts}`,
    );
    for (const c of calls) {
      console.log(`  ${c.name}: ${JSON.stringify(c.input).slice(0, 600)}`);
    }
    log.push({ call, latencyMs: r.latencyMs, response: res });
    messages.push({ role: 'assistant', content: res.content });
    if (calls.length === 0) {
      console.log('  (no tool call: plain text turn)');
      break;
    }
    const results: ContentBlock[] = [];
    let studentText: string | null = null;
    for (const c of calls) {
      if (c.name === 'evaluate') {
        const lines = (c.input as { lines?: unknown }).lines;
        const out = Array.isArray(lines)
          ? lines.map(l => (typeof l === 'string' ? evaluateLine(l) : null))
          : [];
        results.push({
          type: 'tool_result',
          tool_use_id: c.id,
          content: JSON.stringify(out),
        });
      } else if (c.name === 'ask_student') {
        const reply = studentReplies.shift() ?? 'ma na3rfch';
        studentText = reply;
        results.push({
          type: 'tool_result',
          tool_use_id: c.id,
          content: JSON.stringify({
            shown: true,
            reply: {
              kind: 'free',
              math: evaluateLine(
                reply
                  .replace(/[^0-9+*/=().-]+/g, ' ')
                  .trim()
                  .split(/\s+/)
                  .pop() ?? '',
              ),
            },
          }),
        });
      } else {
        results.push({
          type: 'tool_result',
          tool_use_id: c.id,
          content: `unknown tool ${c.name}`,
          is_error: true,
        });
      }
    }
    const content: ContentBlock[] = [...results];
    if (studentText !== null) {
      content.push({ type: 'text', text: `Student wrote: «${studentText}»` });
    }
    messages.push({ role: 'user', content });
  }
  console.log(`total: $${totalUsd.toFixed(4)}`);
  const outDir = path.join(__dirname, 'out');
  mkdirSync(outDir, { recursive: true });
  const file = path.join(
    outDir,
    `spike-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  writeFileSync(file, JSON.stringify(log, null, 2));
  console.log(`raw: ${path.relative(root, file)}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'failed');
  process.exitCode = 1;
});
