/**
 * The AI side of the hybrid lesson (plan v2 A5): a Mover that makes ONE move
 * per call, stateless towards the conductor. Each call is
 *   tools -> system[0] core prompt (1-hour cache) -> system[1] question pack
 *   (1-hour cache) -> user: the situation.
 * - Light (Haiku 5.5): one call, tool_choice auto and effort low; a config
 *   can force the tool instead (thinking off) so the harness compares both.
 *   No `fallbacks`: Haiku has no server-side fallback.
 * - Deep (Sonnet 5.5): tutor_move plus evaluate, test_rule, list_outcomes;
 *   at most 2 calls (one compute hop, then the move); tool_choice auto
 *   (Sonnet 5.5 refuses a forced tool); `fallbacks: 'default'`.
 * A refused move gets ONE retry with the reasons (an is_error tool_result)
 * when the call budget allows; then the mover returns null and the screen
 * shows the conductor's prepared reply. The allowance is asked first (a
 * hand-over from light to deep by its own permit) and told the charge
 * after. It never throws: any failure is null.
 * The mover keeps its own memory per question (the exchanges it saw); the
 * conductor state stays the only source of truth for where he is.
 */
import type { QuestionCtx } from '../../hybrid/conductor/conductor';
import type { DeepReason, LightReason } from '../../hybrid/conductor/types';
import type {
  AiTier,
  Allowance,
  Move,
  MoveRequest,
  Mover,
} from '../../hybrid/mover';
import { numbersIn } from '../../planner/llm/numbers';
import { mathSegments } from '../checks/freeText';
import { readLine } from '../checks/lines';
import {
  AI_MODELS,
  aiChargeUsd,
  aiCostUsd,
  aiWorstCaseUsd,
  hasServerFallback,
} from '../config';
import {
  addKnown,
  boxValues,
  restoreRuntime,
  type CaseSpec,
  type SessionRuntime,
  type SessionState,
} from '../session/state';
import { COMPUTE } from '../tools/compute';
import { toolDefinitions, toolNamed } from '../tools/schemas';
import type { MessagesTransport } from '../transport/messagesApi';
import {
  isToolUse,
  type AiUsage,
  type ApiMessage,
  type Effort,
  type MessagesRequest,
  type SystemBlock,
  type ToolDefinition,
  type ToolResultBlock,
  type ToolUseBlock,
} from '../transport/wire';
import type { RenderBlock } from '../verify/message';
import { movePack, type MovePack } from './pack';
import { movePrompt } from './prompt';
import {
  actedFrame,
  actText,
  buildSituation,
  diagnose,
  replyLines,
  replyText,
  type MoveMemory,
} from './situation';
import {
  ALLOWED_MOVES,
  allowedMoves,
  checkMove,
  MOVE_TOOL,
  moveToolDefinition,
  type CaseFacts,
  type MoveKind,
} from './tool';

export interface TierConfig {
  model: string;
  effort: Effort;
  maxTokens: number;
  timeoutMs: number;
  /**
   * 'auto': adaptive thinking, the model calls the tool itself. 'forced':
   * tool_choice tutor_move with thinking off (Haiku 5.5 only; Sonnet 5.5
   * answers a forced tool with a 400, so it always runs 'auto').
   */
  toolChoice: 'auto' | 'forced';
  /** Model calls for one move at most (a compute hop and the retry count). */
  maxCalls: number;
  /** evaluate, test_rule and list_outcomes are offered (deep). */
  compute: boolean;
}

export interface MoverConfig {
  light: TierConfig;
  deep: TierConfig;
}

/** First guesses, to be measured with the harness (plan v2 A6). */
export const DEFAULT_MOVER_CONFIG: MoverConfig = {
  light: {
    model: AI_MODELS.haiku,
    effort: 'low',
    maxTokens: 2_000,
    timeoutMs: 20_000,
    toolChoice: 'auto',
    maxCalls: 2,
    compute: false,
  },
  deep: {
    model: AI_MODELS.sonnet,
    effort: 'low',
    maxTokens: 6_000,
    timeoutMs: 45_000,
    toolChoice: 'auto',
    maxCalls: 2,
    compute: true,
  },
};

/** The compute tools of the deep tier. */
export const DEEP_COMPUTE = ['evaluate', 'list_outcomes', 'test_rule'] as const;

/** Models that accept a forced tool (with thinking off). */
const FORCED_TOOL_MODELS: ReadonlySet<string> = new Set([AI_MODELS.haiku]);

/** One model call, for the harness and the dev overlay. */
export interface MoveCallLog {
  tier: AiTier;
  model: string;
  call: number;
  stopReason: string;
  latencyMs: number;
  usage: AiUsage;
  costUsd: number;
  tools: string[];
  /** Why the move was refused (each reason, shortened). */
  rejected: string[];
}

export interface MoverOptions {
  transport: MessagesTransport;
  allowance: Allowance;
  /** The profile digest (src/ai/profile/digest.ts), when the app has one. */
  profileDigest?: string | null;
  config?: Partial<MoverConfig>;
  onCall?: (log: MoveCallLog) => void;
}

/** A request body of the move mode: the wire type plus tool_choice and thinking off. */
type MoveBody = MessagesRequest &
  Required<Pick<MessagesRequest, 'tool_choice'>>;

const MOVE_ALONE =
  'Now call tutor_move alone, with what the tools returned; no more computing.';
const TEXT_NOT_SHOWN =
  '(That text was not shown to the student.) Answer with one tutor_move call.';

const toolResult = (
  id: string,
  content: unknown,
  isError = false,
): ToolResultBlock => ({
  type: 'tool_result',
  tool_use_id: id,
  content: typeof content === 'string' ? content : JSON.stringify(content),
  ...(isError && { is_error: true }),
});

let deepTools: ToolDefinition[] | null = null;
let lightTools: ToolDefinition[] | null = null;

/** Byte-stable tool lists (the first part of the cached prefix), sorted by name. */
export function moveTools(compute: boolean): ToolDefinition[] {
  if (compute) {
    deepTools ??= [
      ...toolDefinitions().filter(t =>
        (DEEP_COMPUTE as readonly string[]).includes(t.name),
      ),
      moveToolDefinition(),
    ].sort((a, b) => a.name.localeCompare(b.name));
    return deepTools;
  }
  lightTools ??= [moveToolDefinition()];
  return lightTools;
}

export function moveSystem(pack: MovePack): SystemBlock[] {
  return [
    {
      type: 'text',
      text: movePrompt(),
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
    {
      type: 'text',
      text: pack.text,
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
  ];
}

export function moveBody(
  cfg: TierConfig,
  pack: MovePack,
  messages: ApiMessage[],
): MoveBody {
  const forced =
    cfg.toolChoice === 'forced' &&
    !cfg.compute &&
    FORCED_TOOL_MODELS.has(cfg.model);
  return {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    system: moveSystem(pack),
    messages: [...messages],
    tools: moveTools(cfg.compute),
    thinking: forced ? { type: 'disabled' } : { type: 'adaptive' },
    output_config: { effort: cfg.effort },
    tool_choice: forced ? { type: 'tool', name: MOVE_TOOL } : { type: 'auto' },
    // Server-side refusal fallback exists for Sonnet 5.5, never for Haiku.
    ...(hasServerFallback(cfg.model) && { fallbacks: 'default' as const }),
  };
}

/** Numbers he wrote himself (free text, a similar question's lines): he may read them back. */
function hisNumbers(texts: readonly string[]): ReturnType<typeof numbersIn> {
  const out: ReturnType<typeof numbersIn> = [];
  for (const t of texts) {
    for (const seg of mathSegments(t)) {
      out.push(...numbersIn(seg));
      const c = readLine(seg).chain;
      if (c.kind === 'chain') {
        out.push(...c.sides.map(x => x.value));
      } else if (c.kind !== 'unreadable') {
        out.push(c.side.value);
      }
    }
  }
  return out;
}

/**
 * A copy of the conductor's evidence store for this call, with the pack's
 * prepared cases (ids S1..S4, their engine values known) and the numbers of
 * his own act. Compute tools write into it; the conductor state is never
 * touched.
 */
/** The case a move works on, with its spec (made now, prepared, or made earlier). */
function caseOf(
  caseId: string | null,
  made: { id: string; spec: CaseSpec } | null,
  pack: MovePack,
  req: MoveRequest,
): { id: string; spec: CaseSpec } | null {
  if (made) {
    return made;
  }
  if (caseId === null) {
    return null;
  }
  const spec =
    pack.prepared.find(c => c.id === caseId)?.spec ??
    req.state.session.cases[caseId];
  return spec ? { id: caseId, spec } : null;
}

function callRuntime(
  ctx: QuestionCtx,
  req: MoveRequest,
  pack: MovePack,
): SessionRuntime {
  const state = JSON.parse(JSON.stringify(req.state.session)) as SessionState;
  for (const c of pack.prepared) {
    state.cases[c.id] = c.spec;
  }
  const rt = restoreRuntime(state, ctx.pack.main);
  for (const c of pack.prepared) {
    const values =
      c.spec.kind === 'box'
        ? Object.values(boxValues(c.spec.n, c.spec.k))
        : rt.graphs.get(c.id)?.graph.nodes.map(n => n.value) ?? [];
    addKnown(state, values);
  }
  const own = [
    ...(req.act.kind === 'free' ? [req.act.text] : []),
    ...replyLines(req.out.reply),
  ];
  addKnown(state, hisNumbers(own));
  return rt;
}

/** A per-attempt copy (a refused move's new case must not stay). */
const copyRuntime = (ctx: QuestionCtx, rt: SessionRuntime): SessionRuntime =>
  restoreRuntime(
    JSON.parse(JSON.stringify(rt.state)) as SessionState,
    ctx.pack.main,
  );

function blocksText(blocks: readonly RenderBlock[]): string {
  return blocks
    .map(b =>
      b.type === 'ar'
        ? b.runs.map(r => ('ar' in r ? r.ar : r.fr)).join('')
        : b.type === 'fr'
        ? b.text
        : b.type === 'math'
        ? `$${b.latex}$`
        : b.type === 'student_line'
        ? `[his line ${b.lineId}]`
        : `[his lines ${b.lines[0].id} | ${b.lines[1].id}]`,
    )
    .join(' ');
}

interface Attempt {
  move: Move | null;
  kind: MoveKind | null;
  caseLabel: string | null;
  costUsd: number;
}

export function createMover(o: MoverOptions): Mover {
  const config: MoverConfig = {
    light: { ...DEFAULT_MOVER_CONFIG.light, ...o.config?.light },
    deep: { ...DEFAULT_MOVER_CONFIG.deep, ...o.config?.deep },
  };
  const memories = new Map<string, MoveMemory>();

  function memoryFor(req: MoveRequest): MoveMemory {
    const key = `${req.state.exerciseId}/${req.state.questionId}`;
    let m = memories.get(key);
    // A turn count going back is a new start of the question.
    if (!m || req.state.turn < m.lastTurn) {
      m = { exchanges: [], lastTurn: 0 };
      memories.set(key, m);
    }
    return m;
  }

  async function attempt(
    tier: AiTier,
    ctx: QuestionCtx,
    req: MoveRequest,
    memory: MoveMemory,
    escalated: boolean,
    signal: AbortSignal | undefined,
  ): Promise<Attempt> {
    const reason = req.out.reason as LightReason | DeepReason;
    const none: Attempt = {
      move: null,
      kind: null,
      caseLabel: null,
      costUsd: 0,
    };
    // A hand-over has its own permit (a light reason is never sent deep).
    const permitted = escalated
      ? o.allowance.permitsHandover(reason)
      : o.allowance.permits(tier, reason);
    if (!permitted) {
      return none;
    }
    const cfg = config[tier];
    const pack = movePack(ctx);
    const rt = callRuntime(ctx, req, pack);
    const diagnosis = diagnose(ctx, req);
    const allowed = allowedMoves(reason, tier);
    const prepared: Record<string, CaseFacts> = Object.fromEntries(
      pack.prepared.map(c => [c.id, c.facts]),
    );
    const messages: ApiMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildSituation({
              ctx,
              req,
              tier,
              allowed,
              memory,
              profile: o.profileDigest ?? null,
              escalated,
              diagnosis,
            }),
          },
        ],
      },
    ];
    let cost = 0;
    let charge = 0;
    let rejections = 0;
    let result: Attempt = none;
    try {
      for (let call = 1; call <= cfg.maxCalls; call++) {
        if (signal?.aborted) {
          break;
        }
        const body = moveBody(cfg, pack, messages);
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
        const charged = aiChargeUsd(res.model || cfg.model, res.usage);
        charge += Number.isFinite(charged) ? charged : c;
        const log: MoveCallLog = {
          tier,
          model: res.model || cfg.model,
          call,
          stopReason: res.stopReason,
          latencyMs: r.latencyMs,
          usage: res.usage,
          costUsd: c,
          tools: res.content.filter(isToolUse).map(b => b.name),
          rejected: [],
        };
        const done = () => o.onCall?.(log);
        // A refusal, a cut-off or anything else: the prepared reply.
        if (res.stopReason !== 'tool_use' && res.stopReason !== 'end_turn') {
          done();
          break;
        }
        messages.push({ role: 'assistant', content: res.content });
        const calls = res.content.filter(isToolUse);
        if (calls.length === 0) {
          rejections += 1;
          log.rejected.push('plain_text');
          done();
          if (rejections > 1) {
            break;
          }
          messages.push({
            role: 'user',
            content: [{ type: 'text', text: TEXT_NOT_SHOWN }],
          });
          continue;
        }
        const results: ToolResultBlock[] = [];
        let moveCall: ToolUseBlock | null = null;
        for (const t of calls) {
          if (t.name.toLowerCase() === MOVE_TOOL) {
            if (moveCall) {
              results.push(
                toolResult(t.id, 'One tutor_move per answer.', true),
              );
            } else {
              moveCall = t;
            }
            continue;
          }
          const spec = toolNamed(t.name);
          const run =
            cfg.compute &&
            spec &&
            (DEEP_COMPUTE as readonly string[]).includes(spec.name)
              ? COMPUTE[spec.name]
              : undefined;
          if (!spec || !run) {
            log.rejected.push(`unknown:${t.name.slice(0, 40)}`);
            results.push(toolResult(t.id, `No tool "${t.name}" here.`, true));
            continue;
          }
          const parsed = spec.schema.safeParse(t.input);
          const out = parsed.success
            ? run({ rt, experiment: pack.experiment }, parsed.data as never)
            : { ok: false as const, error: 'invalid input' };
          results.push(
            out.ok
              ? toolResult(t.id, out.result)
              : toolResult(t.id, out.error, true),
          );
        }
        if (moveCall) {
          const chk = checkMove(moveCall.input, {
            rt: copyRuntime(ctx, rt),
            pack: ctx.pack,
            experiment: pack.experiment,
            allowed,
            slip: diagnosis.slip,
            prepared,
          });
          if (chk.ok) {
            done();
            const made = chk.made;
            result = {
              move:
                chk.kind === 'escalate'
                  ? null
                  : {
                      blocks: chk.blocks,
                      component: chk.component,
                      tier,
                      costUsd: 0,
                      case: caseOf(chk.caseId, chk.made, pack, req),
                    },
              kind: chk.kind,
              caseLabel:
                made !== null
                  ? made.spec.kind === 'box'
                    ? `new box n=${made.spec.n} k=${made.spec.k}`
                    : `new urn ${made.spec.reds} red ${made.spec.blacks} black k=${made.spec.k} j=${made.spec.j}`
                  : chk.caseId,
              costUsd: 0,
            };
            break;
          }
          rejections += 1;
          log.rejected.push(...chk.reasons.map(x => x.slice(0, 120)));
          done();
          if (rejections > 1) {
            break;
          }
          results.push(
            toolResult(
              moveCall.id,
              `Not shown to the student. Fix and call tutor_move again: ${chk.reasons.join(
                ' | ',
              )}`,
              true,
            ),
          );
          messages.push({ role: 'user', content: results });
          continue;
        }
        // Computing only (deep): the results, then the move on the next call.
        done();
        messages.push(
          { role: 'user', content: results },
          { role: 'system', content: MOVE_ALONE },
        );
      }
    } catch {
      // A transport that throws (it should not): the prepared reply.
    }
    // The allowance pays the call as if the prompt were already cached.
    if (charge > 0) {
      o.allowance.add(tier, charge);
    }
    return {
      ...result,
      move: result.move ? { ...result.move, costUsd: cost } : null,
      costUsd: cost,
    };
  }

  return async (ctx, req, signal) => {
    try {
      const { out } = req;
      if (out.tier === 'instant' || !(out.reason in ALLOWED_MOVES)) {
        return null;
      }
      const memory = memoryFor(req);
      let tier: AiTier = out.tier;
      let r = await attempt(tier, ctx, req, memory, false, signal);
      let spent = r.costUsd;
      // The light tier hands the moment over: one deep move, if permitted.
      if (r.kind === 'escalate' && tier === 'light') {
        tier = 'deep';
        r = await attempt(tier, ctx, req, memory, true, signal);
        spent += r.costUsd;
      }
      const move: Move | null = r.move ? { ...r.move, costUsd: spent } : null;
      const step = actedFrame(ctx, req);
      memory.lastTurn = req.state.turn;
      memory.exchanges.push({
        turn: req.state.turn,
        frameId: step?.id ?? '-',
        reason: out.reason,
        tier,
        act: actText(req.act, step),
        shown: move ? blocksText(move.blocks) : replyText(out.reply),
        by: move ? 'ai' : 'prepared',
        move: move ? r.kind : null,
        caseLabel: move ? r.caseLabel : null,
      });
      if (memory.exchanges.length > 8) {
        memory.exchanges.splice(0, memory.exchanges.length - 8);
      }
      return move;
    } catch {
      return null;
    }
  };
}
