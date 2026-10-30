/**
 * One tutored question: the conversation with the model, where the student
 * is a tool. The model ends each turn with ask_student; the app shows it and
 * waits; the student's act comes back judged by the engine. History is
 * append-only (prompt cache, preserved thinking): an assistant message is
 * stored verbatim, and a failed call leaves the history as it was, so a retry
 * re-sends the same request.
 *
 * Within one student turn the model may call tools several times ("hops").
 * Rules:
 * - compute tools run at once; their results go back to the model;
 * - bookkeeping tools run at once; with ask_student their results wait and
 *   go in the same user message as the student's reply;
 * - ask_student must come alone (no compute tool in the same response), and
 *   passes verifyAsk; otherwise it gets an is_error result and the model
 *   tries again (one hop);
 * - plain text with no tool call is shown with a free-text input when it
 *   passes the same checks, else the model is told once to use ask_student.
 */
import type { Experiment } from '../../engine/calls';
import { autoCheck, type Checked, type StudentAct } from '../checks/autoCheck';
import { aiCostUsd, aiWorstCaseUsd } from '../config';
import type { QuestionPack } from '../packs/build';
import { BOOKKEEPING } from '../tools/bookkeeping';
import { COMPUTE, type ToolContext } from '../tools/compute';
import {
  AskStudentSchema,
  EndQuestionSchema,
  toolNamed,
  type AskInput,
  type AskStudent,
} from '../tools/schemas';
import type { MessagesTransport } from '../transport/messagesApi';
import {
  isText,
  isToolUse,
  type AiUsage,
  type ApiMessage,
  type ContentBlock,
  type Effort,
  type MessagesRequest,
  type SystemBlock,
  type ToolDefinition,
  type ToolResultBlock,
} from '../transport/wire';
import {
  verifyAsk,
  type RenderBlock,
  type ShownComponent,
} from '../verify/message';
import type { Budget } from './budget';
import type { SessionRuntime } from './state';

export interface TutorConfig {
  model: string;
  effort: Effort;
  maxTokens: number;
  maxTokensRetry: number;
  requestTimeoutMs: number;
  maxHops: number;
  hopNotice: number;
  fallbacks: boolean;
}

export type TurnOutcome =
  | {
      kind: 'ask';
      blocks: RenderBlock[];
      input: AskInput;
      intent: AskStudent['intent'];
      /** The interactive component of this message, when the input is one. */
      component: ShownComponent | null;
    }
  | { kind: 'ended'; outcome: string; summary: string; nextTime: string }
  | { kind: 'error'; error: string; retryable: boolean; detail?: string };

/** One model call, for the trace and the harness metrics. */
export interface CallLog {
  turn: number;
  hop: number;
  stopReason: string;
  latencyMs: number;
  attempts: number;
  usage: AiUsage;
  costUsd: number;
  tools: string[];
  /** Why a tool call was refused (verification, bad input). */
  rejected: string[];
}

interface Pending {
  toolUseId: string;
  input: AskInput;
  /** Results of the other tools of that response, sent with the reply. */
  deferred: ToolResultBlock[];
}

export interface TutorSessionOptions {
  system: SystemBlock[];
  tools: ToolDefinition[];
  rt: SessionRuntime;
  pack: QuestionPack;
  experiment: Experiment | null;
  transport: MessagesTransport;
  budget: Budget;
  config: TutorConfig;
  /** Restored history (resume); must end with a user message or a pending ask. */
  messages?: ApiMessage[];
  onCall?: (log: CallLog) => void;
}

const result = (
  id: string,
  content: unknown,
  isError = false,
): ToolResultBlock => ({
  type: 'tool_result',
  tool_use_id: id,
  content: typeof content === 'string' ? content : JSON.stringify(content),
  ...(isError && { is_error: true }),
});

const issuesOf = (e: { issues: { path: PropertyKey[]; message: string }[] }) =>
  e.issues
    .slice(0, 6)
    .map(i => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join('; ');

/**
 * The model sometimes sends a nested object as a JSON string ("input":
 * "{\"kind\": ...}"). A top-level field that parses as a JSON object or
 * array is used as that value; anything else is left for zod to judge.
 */
function unstringify(input: unknown): unknown {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && /^\s*[[{]/.test(v)) {
      try {
        out[k] = JSON.parse(v);
        continue;
      } catch {
        // not JSON: keep the string
      }
    }
    out[k] = v;
  }
  return out;
}

/** Plain text the model wrote outside ask_student, as message blocks. */
function textToAsk(text: string): AskStudent | null {
  const blocks: AskStudent['message'] = [];
  for (const part of text.split(/(\$\$?[^$]+\$\$?)/)) {
    const t = part.trim();
    if (t === '') {
      continue;
    }
    if (t.startsWith('$')) {
      blocks.push({ type: 'math', latex: t.replace(/^\$+|\$+$/g, '') });
    } else {
      blocks.push({ type: 'ar', text: t.slice(0, 500) });
    }
  }
  const ask = {
    message: blocks.slice(0, 6),
    input: { kind: 'free' },
    intent: 'other',
  };
  const p = AskStudentSchema.safeParse(ask);
  return p.success ? p.data : null;
}

export class TutorSession {
  readonly messages: ApiMessage[];
  readonly calls: CallLog[] = [];
  /** The engine's judgement of the last reply (trace, harness). */
  lastChecked: Checked | null = null;
  private pending: Pending | null = null;
  private refusals = 0;

  constructor(private readonly o: TutorSessionOptions) {
    this.messages = o.messages ? [...o.messages] : [];
  }

  /** The pending question (resume renders it again without a call). */
  get waitingFor(): AskInput | null {
    return this.pending?.input ?? null;
  }

  async start(context: string): Promise<TurnOutcome> {
    this.messages.push({
      role: 'user',
      content: [{ type: 'text', text: context }],
    });
    return this.runModel();
  }

  async reply(act: StudentAct): Promise<TurnOutcome> {
    const { rt, pack } = this.o;
    rt.state.turn += 1;
    const p = this.pending;
    const creditedBefore = (rt.state.credited.main ?? []).length;
    const checked = autoCheck(act, p?.input ?? null, rt, pack);
    this.lastChecked = checked;
    const settledAStep = (rt.state.credited.main ?? []).length > creditedBefore;
    if (p) {
      this.messages.push({
        role: 'user',
        content: [
          ...p.deferred,
          result(p.toolUseId, checked.result),
          { type: 'text', text: checked.text },
        ],
      });
    } else {
      // After a plain-text turn there is no tool call to answer.
      this.messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${checked.text}\n(engine: ${JSON.stringify(
              checked.result,
            )})`,
          },
        ],
      });
    }
    this.pending = null;
    this.nudgeComponent(settledAStep);
    return this.runModel();
  }

  /**
   * The app's components are how it teaches. Once per question, when he has
   * just settled a step himself and no component was shown yet, the model
   * gets a reminder of this question's components (a system message after
   * his reply: append-only, the cache and thinking stay valid).
   */
  private nudgeComponent(settledAStep: boolean): void {
    const s = this.o.rt.state;
    const fits = this.o.pack.notes?.components ?? [];
    if (
      !settledAStep ||
      s.componentNudged ||
      s.componentsShown.length > 0 ||
      fits.length === 0
    ) {
      return;
    }
    s.componentNudged = true;
    this.messages.push({
      role: 'system',
      content: `Reminder from the app (not from the student): no component has been shown in this question yet. He just settled a step himself: in your next message, show the component that fits best so he sees WHY his line is right (input "component"; a small case via make_case + case_id when it draws an urn), and ask him one thing to do with it. Components for this question:\n${fits
        .map(c => `- ${c.name}: ${c.when}`)
        .join('\n')}`,
    });
  }

  /** After an error: the same request again (the history did not change). */
  retry(): Promise<TurnOutcome> {
    return this.runModel();
  }

  private body(maxTokens: number): MessagesRequest {
    const c = this.o.config;
    return {
      model: c.model,
      max_tokens: maxTokens,
      system: this.o.system,
      messages: this.messages,
      tools: this.o.tools,
      thinking: { type: 'adaptive' },
      output_config: { effort: c.effort },
      cache_control: { type: 'ephemeral' },
      ...(c.fallbacks && { fallbacks: 'default' as const }),
    };
  }

  private async runModel(): Promise<TurnOutcome> {
    const c = this.o.config;
    const ctx: ToolContext = { rt: this.o.rt, experiment: this.o.experiment };
    let maxTokens = c.maxTokens;
    let nudged = false;
    for (let hop = 1; hop <= c.maxHops; hop++) {
      if (hop === c.hopNotice) {
        this.messages.push({
          role: 'system',
          content:
            'Ask the student now with ask_student, alone; no more computing this turn.',
        });
      }
      const body = this.body(maxTokens);
      const worst = aiWorstCaseUsd(
        c.model,
        JSON.stringify(body).length,
        maxTokens,
      );
      if (!this.o.budget.canSpend(worst)) {
        return { kind: 'error', error: 'capped', retryable: false };
      }
      const r = await this.o.transport.send(body, {
        timeoutMs: c.requestTimeoutMs,
      });
      if (!r.ok) {
        return {
          kind: 'error',
          error: r.error,
          retryable: r.retryable,
          ...(r.detail !== undefined && { detail: r.detail }),
        };
      }
      const res = r.response;
      const costUsd = aiCostUsd(res.model || c.model, res.usage);
      this.o.budget.add(costUsd);
      const log: CallLog = {
        turn: this.o.rt.state.turn,
        hop,
        stopReason: res.stopReason,
        latencyMs: r.latencyMs,
        attempts: r.attempts,
        usage: res.usage,
        costUsd,
        tools: res.content.filter(isToolUse).map(b => b.name),
        rejected: [],
      };
      const done = (o: TurnOutcome): TurnOutcome => {
        this.calls.push(log);
        this.o.onCall?.(log);
        return o;
      };
      if (res.stopReason === 'refusal') {
        this.refusals += 1;
        return done({
          kind: 'error',
          error: 'refused',
          retryable: this.refusals < 2,
          ...(res.refusalCategory !== null && {
            detail: res.refusalCategory,
          }),
        });
      }
      if (res.stopReason === 'max_tokens') {
        this.calls.push(log);
        this.o.onCall?.(log);
        if (maxTokens < c.maxTokensRetry) {
          // Never run tool calls from a cut-off response; ask again with more room.
          maxTokens = c.maxTokensRetry;
          continue;
        }
        return { kind: 'error', error: 'incomplete', retryable: true };
      }
      if (res.stopReason !== 'tool_use' && res.stopReason !== 'end_turn') {
        return done({
          kind: 'error',
          error: 'invalid',
          retryable: true,
          detail: `stop_${res.stopReason.slice(0, 20)}`,
        });
      }
      this.messages.push({ role: 'assistant', content: res.content });
      const calls = res.content.filter(isToolUse);

      if (calls.length === 0) {
        const text = res.content
          .filter(isText)
          .map(b => b.text)
          .join('\n')
          .trim();
        const ask = text === '' ? null : textToAsk(text);
        const v = ask ? verifyAsk(ask, { ...ctx, pack: this.o.pack }) : null;
        if (ask && v?.ok) {
          return done({
            kind: 'ask',
            blocks: v.blocks,
            input: ask.input,
            intent: ask.intent,
            component: null,
          });
        }
        if (nudged) {
          return done({
            kind: 'error',
            error: 'invalid',
            retryable: true,
            detail: 'plain_text',
          });
        }
        nudged = true;
        log.rejected.push('plain_text');
        this.messages.push(
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '(That text was not shown to the student.)',
              },
            ],
          },
          {
            role: 'system',
            content:
              'Every message to the student goes through the ask_student tool.',
          },
        );
        this.calls.push(log);
        this.o.onCall?.(log);
        continue;
      }

      // Validate and run every call (bookkeeping, then compute).
      const results = new Map<string, ToolResultBlock>();
      const terminal: { id: string; name: string; input: unknown }[] = [];
      let computed = 0;
      const ordered = [...calls].sort((a, b) => {
        const rank = (n: string) =>
          toolNamed(n)?.cls === 'bookkeeping' ? 0 : 1;
        return rank(a.name) - rank(b.name);
      });
      for (const call of ordered) {
        const spec = toolNamed(call.name);
        if (!spec) {
          log.rejected.push(`unknown:${call.name}`);
          results.set(
            call.id,
            result(call.id, `Unknown tool "${call.name}".`, true),
          );
          continue;
        }
        const parsed = spec.schema.safeParse(unstringify(call.input));
        if (!parsed.success) {
          log.rejected.push(`input:${spec.name}`);
          results.set(
            call.id,
            result(
              call.id,
              `Invalid input for ${spec.name}: ${issuesOf(parsed.error)}`,
              true,
            ),
          );
          continue;
        }
        if (spec.cls === 'terminal') {
          terminal.push({ id: call.id, name: spec.name, input: parsed.data });
          continue;
        }
        const run = (spec.cls === 'compute' ? COMPUTE : BOOKKEEPING)[spec.name];
        if (spec.cls === 'compute') {
          computed += 1;
        }
        const out = run
          ? run(ctx, parsed.data as never)
          : { ok: false as const, error: 'not available' };
        if (!out.ok) {
          log.rejected.push(`${spec.name}:${out.error.slice(0, 60)}`);
        }
        results.set(
          call.id,
          out.ok
            ? result(call.id, out.result)
            : result(call.id, out.error, true),
        );
      }
      const inOrder = (): ToolResultBlock[] =>
        calls.map(
          call => results.get(call.id) ?? result(call.id, 'No result.', true),
        );

      if (terminal.length > 1 || (terminal.length === 1 && computed > 0)) {
        for (const t of terminal) {
          log.rejected.push(`alone:${t.name}`);
          results.set(
            t.id,
            result(
              t.id,
              `${t.name} must be called alone, after you have read the other tools' results. Call it again now.`,
              true,
            ),
          );
        }
        this.pushResults(inOrder());
        this.calls.push(log);
        this.o.onCall?.(log);
        continue;
      }

      const t = terminal[0];
      if (t?.name === 'ask_student') {
        const ask = t.input as AskStudent;
        const v = verifyAsk(ask, { ...ctx, pack: this.o.pack });
        if (!v.ok) {
          log.rejected.push(...v.reasons.map(x => `verify:${x.slice(0, 80)}`));
          results.set(
            t.id,
            result(
              t.id,
              `Not shown to the student. Fix and call ask_student again: ${v.reasons.join(
                ' | ',
              )}`,
              true,
            ),
          );
          this.pushResults(inOrder());
          this.calls.push(log);
          this.o.onCall?.(log);
          continue;
        }
        this.pending = {
          toolUseId: t.id,
          input: ask.input,
          deferred: inOrder().filter(b => b.tool_use_id !== t.id),
        };
        if (v.component) {
          this.o.rt.state.componentsShown.push(v.component.name);
        }
        return done({
          kind: 'ask',
          blocks: v.blocks,
          input: ask.input,
          intent: ask.intent,
          component: v.component,
        });
      }
      if (t?.name === 'end_question') {
        const e = EndQuestionSchema.parse(t.input);
        results.set(t.id, result(t.id, { closed: true }));
        this.pushResults(inOrder());
        return done({
          kind: 'ended',
          outcome: e.outcome,
          summary: e.summary,
          nextTime: e.next_time,
        });
      }
      this.pushResults(inOrder());
      this.calls.push(log);
      this.o.onCall?.(log);
    }
    return { kind: 'error', error: 'hop_limit', retryable: true };
  }

  private pushResults(blocks: ContentBlock[]): void {
    this.messages.push({ role: 'user', content: blocks });
  }
}
