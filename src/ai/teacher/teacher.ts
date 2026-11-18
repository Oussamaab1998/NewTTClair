/**
 * The AI teacher's call (student test 2026-11-18): one stateless request per
 * question he asks, apart from the lesson's moves (src/ai/move):
 *   tools [teacher_answer] -> system: the teacher's rules (1-hour cache) ->
 *   user: the exercise context, the last turns of his thread, his question.
 * Sonnet 5.5, effort low, adaptive thinking, tool_choice auto (Sonnet 5.5
 * refuses a forced tool), the server-side refusal fallback. The answer is
 * checked (verify.ts); a refused one goes back once with the reasons, then
 * the result is 'failed' and the screen says the teacher could not answer
 * now. Its own daily allowance (allowance.ts): when spent, no call, the
 * result is 'spent' (glossary answers still work; the lesson is never
 * blocked). Never throws.
 */
import {
  AI_MODELS,
  aiCostUsd,
  aiWorstCaseUsd,
  hasServerFallback,
} from '../config';
import type { MessagesTransport } from '../transport/messagesApi';
import { createMessagesTransport } from '../transport/messagesApi';
import {
  isToolUse,
  type AiUsage,
  type ApiMessage,
  type Effort,
  type MessagesRequest,
  type ToolResultBlock,
} from '../transport/wire';
import type { KeyValueStore } from '../../storage/kv';
import { storeTeacherAllowance, type TeacherAllowance } from './allowance';
import { cannedTeacher } from './canned';
import { TEACHER_PROMPT, teacherUserText } from './prompt';
import {
  TEACHER_TOOL,
  TeacherAnswerSchema,
  teacherToolDefinition,
} from './tool';
import type { TeacherAi, TeacherResult } from './types';
import { verifyTeacher } from './verify';

export interface TeacherConfig {
  model: string;
  effort: Effort;
  maxTokens: number;
  timeoutMs: number;
  /** Model calls for one answer at most (the first, and one retry with the reasons). */
  maxCalls: number;
}

/** First guesses, to be measured (the move's deep tier is the model). */
export const DEFAULT_TEACHER_CONFIG: TeacherConfig = {
  model: AI_MODELS.sonnet,
  effort: 'low',
  maxTokens: 4_000,
  timeoutMs: 45_000,
  maxCalls: 2,
};

/** One model call, for the dev overlay and the harness. */
export interface TeacherCallLog {
  model: string;
  call: number;
  stopReason: string;
  latencyMs: number;
  usage: AiUsage;
  costUsd: number;
  /** Why the answer was refused (each reason, shortened). */
  rejected: string[];
}

export interface TeacherOptions {
  transport: MessagesTransport;
  allowance: TeacherAllowance;
  config?: Partial<TeacherConfig>;
  onCall?: (log: TeacherCallLog) => void;
}

const TEXT_NOT_SHOWN = `(That text was not shown to the student.) Answer with one ${TEACHER_TOOL} call.`;

const toolResult = (
  id: string,
  content: string,
  isError = false,
): ToolResultBlock => ({
  type: 'tool_result',
  tool_use_id: id,
  content,
  ...(isError && { is_error: true }),
});

/** The request body of one teacher call (byte-stable prefix: tool, then the rules). */
export function teacherBody(
  cfg: TeacherConfig,
  messages: ApiMessage[],
): MessagesRequest {
  return {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    system: [
      {
        type: 'text',
        text: TEACHER_PROMPT,
        cache_control: { type: 'ephemeral', ttl: '1h' },
      },
    ],
    messages: [...messages],
    tools: [teacherToolDefinition()],
    thinking: { type: 'adaptive' },
    output_config: { effort: cfg.effort },
    tool_choice: { type: 'auto' },
    ...(hasServerFallback(cfg.model) && { fallbacks: 'default' as const }),
  };
}

const FAILED: TeacherResult = { ok: false, reason: 'failed' };

export function createTeacher(o: TeacherOptions): TeacherAi {
  const cfg: TeacherConfig = { ...DEFAULT_TEACHER_CONFIG, ...o.config };
  return async (req, signal) => {
    if (!o.allowance.permits()) {
      return { ok: false, reason: 'spent' };
    }
    const messages: ApiMessage[] = [
      { role: 'user', content: [{ type: 'text', text: teacherUserText(req) }] },
    ];
    let cost = 0;
    let rejections = 0;
    let result: TeacherResult = FAILED;
    try {
      for (let call = 1; call <= cfg.maxCalls; call++) {
        if (signal?.aborted) {
          break;
        }
        const body = teacherBody(cfg, messages);
        const r = await o.transport.send(body, {
          timeoutMs: cfg.timeoutMs,
          ...(signal && { signal }),
        });
        if (!r.ok) {
          break;
        }
        const res = r.response;
        let c = aiCostUsd(res.model || cfg.model, res.usage);
        if (!Number.isFinite(c)) {
          c = aiCostUsd(cfg.model, res.usage);
        }
        if (!Number.isFinite(c)) {
          c = aiWorstCaseUsd(
            cfg.model,
            JSON.stringify(body).length,
            cfg.maxTokens,
          );
        }
        cost += c;
        const log: TeacherCallLog = {
          model: res.model || cfg.model,
          call,
          stopReason: res.stopReason,
          latencyMs: r.latencyMs,
          usage: res.usage,
          costUsd: c,
          rejected: [],
        };
        // A refusal, a cut-off or anything else: no answer.
        if (res.stopReason !== 'tool_use' && res.stopReason !== 'end_turn') {
          o.onCall?.(log);
          break;
        }
        messages.push({ role: 'assistant', content: res.content });
        const calls = res.content.filter(isToolUse);
        const answer = calls.find(t => t.name.toLowerCase() === TEACHER_TOOL);
        if (!answer) {
          rejections += 1;
          log.rejected.push('plain_text');
          o.onCall?.(log);
          if (rejections > 1) {
            break;
          }
          messages.push({
            role: 'user',
            content: [
              ...calls.map(t =>
                toolResult(t.id, `No tool "${t.name}" here.`, true),
              ),
              { type: 'text', text: TEXT_NOT_SHOWN },
            ],
          });
          continue;
        }
        const parsed = TeacherAnswerSchema.safeParse(answer.input);
        const verdict = parsed.success
          ? verifyTeacher(parsed.data.blocks, req.context?.verify ?? null)
          : {
              ok: false as const,
              reasons: parsed.error.issues
                .slice(0, 6)
                .map(
                  i =>
                    `${i.path.map(String).join('.') || '(root)'}: ${i.message}`,
                ),
            };
        if (verdict.ok) {
          o.onCall?.(log);
          result = {
            ok: true,
            answer: { blocks: verdict.blocks, source: 'ai', costUsd: 0 },
          };
          break;
        }
        rejections += 1;
        log.rejected.push(...verdict.reasons.map(x => x.slice(0, 120)));
        o.onCall?.(log);
        if (rejections > 1) {
          break;
        }
        messages.push({
          role: 'user',
          content: [
            ...calls.map(t =>
              t.id === answer.id
                ? toolResult(
                    t.id,
                    `Not shown to the student. Fix and call ${TEACHER_TOOL} again: ${verdict.reasons.join(
                      ' | ',
                    )}`,
                    true,
                  )
                : toolResult(t.id, `No tool "${t.name}" here.`, true),
            ),
          ],
        });
      }
    } catch {
      // A transport that throws (it should not): no answer.
      result = FAILED;
    }
    if (cost > 0) {
      o.allowance.add(cost);
    }
    return result.ok
      ? { ok: true, answer: { ...result.answer, costUsd: cost } }
      : result;
  };
}

/** No teacher (no key, tests): every question gets 'failed' (glossary answers still work). */
export const noTeacher: TeacherAi = async () => FAILED;

/**
 * The live teacher of the app: the store's daily allowance and the
 * Messages API transport. `devTeacher: 'canned'` (debug builds, the
 * `-devTeacher canned` launch flag) answers with the fixed, checked example
 * and never calls (screenshots for free). No key: noTeacher.
 */
export function liveTeacher(o: {
  store: KeyValueStore;
  apiKey: string;
  devTeacher?: 'canned' | null;
  /** Tests inject a transport (never a real call). */
  transport?: MessagesTransport;
  dailyUsd?: number;
  onCall?: (log: TeacherCallLog) => void;
}): TeacherAi {
  if (o.devTeacher === 'canned') {
    return cannedTeacher();
  }
  if (!o.transport && o.apiKey.length === 0) {
    return noTeacher;
  }
  return createTeacher({
    transport: o.transport ?? createMessagesTransport({ apiKey: o.apiKey }),
    allowance: storeTeacherAllowance(o.store, {
      ...(o.dailyUsd !== undefined && { dailyUsd: o.dailyUsd }),
    }),
    ...(o.onCall && { onCall: o.onCall }),
  });
}
