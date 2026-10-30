/**
 * A simulated student: a second model (Sonnet 5.5, low effort) that reads the
 * tutor's message as the student sees it and answers through one tool, "act".
 * Its own conversation is append-only (cached persona + statement).
 */
import { z } from 'zod';

import type { StudentAct } from '../../src/ai/checks/autoCheck';
import { aiCostUsd } from '../../src/ai/config';
import type { Budget } from '../../src/ai/session/budget';
import type { AskInput } from '../../src/ai/tools/schemas';
import type { MessagesTransport } from '../../src/ai/transport/messagesApi';
import {
  isToolUse,
  type ApiMessage,
  type ContentBlock,
} from '../../src/ai/transport/wire';
import type { RenderBlock } from '../../src/ai/verify/message';
import { zodToJsonSchema } from '../../src/planner/llm/strictSchema';
import { describeComponent, type ComponentContext } from './describeComponent';
import type { Persona } from './personas';

const ActSchema = z.strictObject({
  kind: z.enum([
    'free',
    'dont_know',
    'line',
    'choice',
    'order',
    'tap_word',
    'list',
    'continue',
    'component',
    'formula',
  ]),
  text: z.string().max(800).nullable(),
  raw: z.string().max(200).nullable(),
  option_id: z.string().max(40).nullable(),
  ids: z.array(z.string()).max(10).nullable(),
  token: z.string().max(40).nullable(),
  groups: z.array(z.array(z.string()).max(4)).max(40).nullable(),
});

const ACT_TOOL = {
  name: 'act',
  description:
    'Your answer as the student. Fill only the field of your kind: free -> text; line -> raw; formula -> raw (letters n, k allowed); choice -> option_id; order -> ids; tap_word -> token; list -> groups (ball labels); component -> text (what you did with it and what you noticed, in your own words); dont_know/continue -> nothing.',
  input_schema: (() => {
    const s = zodToJsonSchema(ActSchema);
    delete s.$schema;
    return s;
  })(),
};

export function renderForStudent(blocks: RenderBlock[]): string {
  return blocks
    .map(b => {
      switch (b.type) {
        case 'ar':
          return b.runs.map(r => ('ar' in r ? r.ar : r.fr)).join('');
        case 'fr':
          return b.text;
        case 'math':
          return `[formula] ${b.latex}`;
        case 'student_line':
          return `[your line ${b.lineId}] ${b.raw}`;
        case 'compare':
          return `[your two lines]\n${b.lines[0].raw}\n${b.lines[1].raw}`;
      }
    })
    .join('\n');
}

export function describeInput(input: AskInput, ctx?: ComponentContext): string {
  switch (input.kind) {
    case 'line':
      return 'input: a calculation pad (write one line)';
    case 'choice':
      return `input: choose one of ${input.options
        .map(o => `[${o.id}] ${o.text}`)
        .join(' | ')}`;
    case 'order':
      return `input: put these cards in order (give ids): ${input.cards
        .map(c => `[${c.id}] ${c.text}`)
        .join(' | ')}`;
    case 'tap_word':
      return `input: tap one word of this sentence: ${input.sentence_fr}`;
    case 'list':
      return `input: list every group of ${input.size} balls of case ${input.case_id} (labels as shown by the tutor)`;
    case 'component':
      return ctx
        ? `input: an interactive component on screen. ${describeComponent(
            input,
            ctx,
          )} Use it, then answer with kind "component" saying what you did and noticed`
        : `input: an interactive component (${input.name}); use it, then answer with kind "component"`;
    case 'continue':
      return 'input: a continue button';
    case 'free':
      return 'input: free text';
    case 'formula':
      return 'input: a text field for a formula (letters n and k allowed: C(n,k), ^, *, /); answer with kind "formula" and the formula in raw';
  }
}

export class SimStudent {
  private readonly messages: ApiMessage[] = [];

  constructor(
    private readonly o: {
      persona: Persona;
      statement: string;
      transport: MessagesTransport;
      budget: Budget;
      model: string;
    },
  ) {}

  async answer(
    blocks: RenderBlock[],
    input: AskInput,
    ctx?: ComponentContext,
  ): Promise<{ act: StudentAct; costUsd: number }> {
    const text = `Tutor:\n${renderForStudent(blocks)}\n\n(${describeInput(
      input,
      ctx,
    )}; you can also write free text or tap dont_know)`;
    const last = this.messages[this.messages.length - 1];
    const prevTool =
      last && last.role === 'assistant' && Array.isArray(last.content)
        ? last.content.find(isToolUse)
        : undefined;
    const content: ContentBlock[] = [
      ...(prevTool
        ? [{ type: 'tool_result', tool_use_id: prevTool.id, content: 'sent' }]
        : []),
      { type: 'text', text },
    ];
    this.messages.push({ role: 'user', content });
    const r = await this.o.transport.send(
      {
        model: this.o.model,
        max_tokens: 2000,
        system: [
          {
            type: 'text',
            text: `${this.o.persona.card}\n\nThe exercise statement you see: ${this.o.statement}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: this.messages,
        tools: [ACT_TOOL],
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
        cache_control: { type: 'ephemeral' },
      },
      { timeoutMs: 90_000 },
    );
    if (!r.ok) {
      throw new Error(`student model: ${r.error}`);
    }
    const costUsd = aiCostUsd(this.o.model, r.response.usage);
    this.o.budget.add(costUsd);
    this.messages.push({ role: 'assistant', content: r.response.content });
    const call = r.response.content.find(isToolUse);
    const parsed = call ? ActSchema.safeParse(call.input) : null;
    if (!call || !parsed?.success) {
      // A student who did not answer in the tool: his text as free text.
      const words = r.response.content
        .map(b =>
          b.type === 'text' && typeof b.text === 'string' ? b.text : '',
        )
        .join(' ')
        .trim();
      if (call) {
        this.messages.push({
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: call.id, content: 'sent' },
          ],
        });
        this.messages.push({
          role: 'assistant',
          content: [{ type: 'text', text: words || '...' }],
        });
      }
      return { act: { kind: 'free', text: words || 'ma na3rfch' }, costUsd };
    }
    return { act: toAct(parsed.data), costUsd };
  }
}

export type SimAct = z.infer<typeof ActSchema>;

/** The student model's act as the app's StudentAct. */
export function toAct(a: SimAct): StudentAct {
  switch (a.kind) {
    case 'free':
      return { kind: 'free', text: a.text ?? '' };
    case 'line':
      return { kind: 'line', raw: a.raw ?? a.text ?? '' };
    case 'formula':
      return { kind: 'formula', raw: a.raw ?? a.text ?? '' };
    case 'component':
      // What a real screen would report as events; the harness has only his words.
      return {
        kind: 'component',
        events: [
          { name: 'explored', payload: { how: 'done', note: a.text ?? '' } },
        ],
        result: null,
      };
    case 'choice':
      return { kind: 'choice', optionId: a.option_id ?? '' };
    case 'order':
      return { kind: 'order', ids: a.ids ?? [] };
    case 'tap_word':
      return { kind: 'tap_word', token: a.token ?? '' };
    case 'list':
      return { kind: 'list', groups: a.groups ?? [] };
    case 'continue':
      return { kind: 'continue' };
    case 'dont_know':
      return { kind: 'dont_know' };
  }
}

/** The act as a line of the transcript. */
export function actText(act: StudentAct): string {
  switch (act.kind) {
    case 'free':
      return `free: ${act.text}`;
    case 'line':
      return `line: ${act.raw}`;
    case 'formula':
      return `formula: ${act.raw}`;
    case 'choice':
      return `choice: ${act.optionId}`;
    case 'order':
      return `order: ${act.ids.join(' > ')}`;
    case 'tap_word':
      return `tap: ${act.token}`;
    case 'list':
      return `list: ${act.groups.map(g => g.join('')).join(', ')}`;
    case 'component': {
      const note = act.events
        .map(e => {
          const p = e.payload;
          return p !== null &&
            typeof p === 'object' &&
            'note' in p &&
            typeof p.note === 'string'
            ? p.note
            : e.name;
        })
        .join(' / ');
      return `component: ${note}`;
    }
    case 'continue':
      return 'continue';
    case 'dont_know':
      return '«ما نعرفش»';
  }
}
