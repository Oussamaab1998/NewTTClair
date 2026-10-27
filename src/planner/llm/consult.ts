/**
 * One LLM planner consultation: mode + cap -> context pack -> client ->
 * schema + content validation -> guard -> Decision, or null (rules then).
 * Always returns the `llm_call` record, also for skipped calls.
 */
import type { LessonContent } from '../../lesson/session/lesson';
import { validateDecision } from '../planner';
import type { Action, Decision } from '../schema';
import { isolateLlmRuns, spaceRunBoundaries } from '../../lesson/rich/runs';
import type { Rich } from '../../content/schema';
import type { Situation } from '../situation';
import { buildPlanPack } from './contextPack';
import { guardDecision } from './guard';
import { planFormatFor, type PlannerClient } from './plannerClient';
import type { LlmPlannerOutput } from './plannerFormat';
import type { DevRawLog } from './devRaw';
import { recordOf, type LlmCallRecord, type LlmRuntime } from './runtime';

/**
 * Why the AI is asked (AI tutor v2, D22). The rules always answer first.
 * - unknown_wrong: a wrong answer with no known misconception;
 * - second_struggle: the 2nd (or later) struggle signal on the step;
 * - line_wrong / line_invalid: a wrong, or an unreadable / unchecked, typed line;
 * - every_mistake: the pilot flag, under its own daily cap;
 * - request: a free-text request; rules_fallback: the rules fell back.
 * `forced`: replay or a dev scenario asked at every decision point.
 */
export type ConsultReason =
  | 'unknown_wrong'
  | 'second_struggle'
  | 'line_wrong'
  | 'line_invalid'
  | 'every_mistake'
  | 'request'
  | 'rules_fallback'
  | 'forced';

export interface ConsultResult {
  decision: Decision | null;
  record: LlmCallRecord;
  /** Dev trace: the model's diagnosis and reason, guard verdict (never logged). */
  trace?: {
    diagnosis?: { misconceptionIds: string[]; summary: string };
    why?: string;
    action?: string;
  };
}

export interface ConsultOptions {
  requestId: string;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Debug builds: receives the raw output and the verdict. */
  devRaw?: DevRawLog | null;
  reason?: ConsultReason;
}

const skipped = (
  requestId: string,
  model: string,
  outcome: LlmCallRecord['outcome'],
  reason?: ConsultReason,
): ConsultResult => ({
  decision: null,
  record: {
    requestId,
    purpose: 'plan',
    model,
    outcome,
    statusClass: 'none',
    latencyMs: 0,
    ...(reason && { trigger: reason }),
  },
});

/** One action per answer (D22): followUp and the dev-only `why` never reach the Decision. */
function oneAction(
  value: LlmPlannerOutput,
  content: LessonContent,
): { output: Omit<LlmPlannerOutput, 'followUp' | 'why'>; why?: string } {
  const { why, ...withFollowUp } = value;
  const rest = { ...withFollowUp };
  delete rest.followUp;
  // Only misconception ids of this exercise; anything else stays a description.
  const known = rest.diagnosis.misconceptionIds.filter(id =>
    content.loaded.misconceptions.has(id),
  );
  const unknown = rest.diagnosis.misconceptionIds.filter(
    id => !known.includes(id),
  );
  const summary =
    unknown.length > 0
      ? `${rest.diagnosis.summary} [unknown id: ${unknown.join(', ')}]`
      : rest.diagnosis.summary;
  return {
    output: {
      ...rest,
      diagnosis: {
        ...rest.diagnosis,
        misconceptionIds: known,
        summary: summary.slice(0, 300),
      },
    },
    ...(why !== undefined && { why }),
  };
}

/** The full pipeline with an explicit client (replay, tests). */
export async function consultWith(
  client: PlannerClient,
  content: LessonContent,
  situation: Situation,
  o: ConsultOptions,
): Promise<ConsultResult> {
  const pack = buildPlanPack(content, situation, {
    ...(o.reason && { reason: o.reason }),
  });
  const offered = planFormatFor(pack).components;
  const tag = (rec: LlmCallRecord): LlmCallRecord =>
    o.reason ? { ...rec, trigger: o.reason } : rec;
  const r = await client.plan(pack, {
    requestId: o.requestId,
    timeoutMs: o.timeoutMs,
    ...(o.signal && { signal: o.signal }),
  });
  const done = (res: ConsultResult): ConsultResult => {
    if (o.devRaw && r.raw !== undefined) {
      o.devRaw.add({
        requestId: o.requestId,
        purpose: 'plan',
        model: r.model,
        outcome: res.record.outcome,
        reasons: res.record.reasons ?? [],
        raw: r.raw,
      });
    }
    return res;
  };
  if (!r.ok) {
    return done({ decision: null, record: tag(recordOf('plan', r)) });
  }
  const { output: parsed, why } = oneAction(r.value, content);
  // RTL: Latin, digits and short formulas get their own run; what cannot be
  // fixed that way (LaTeX or a long formula in an Arabic run) is rejected.
  const next = isolateAction(parsed.next);
  if (next === null) {
    return done({
      decision: null,
      record: tag(recordOf('plan', r, 'rejected', ['rtl_formula_in_text'])),
    });
  }
  const output = { ...parsed, next };
  const trace = {
    diagnosis: {
      misconceptionIds: output.diagnosis.misconceptionIds,
      summary: output.diagnosis.summary,
    },
    ...(why !== undefined && { why }),
    action:
      output.next.kind === 'show_component'
        ? `show_component:${output.next.component.component}`
        : output.next.kind,
  };
  const d = validateDecision(
    { ...output, ruleId: 'llm', llmRequestId: o.requestId },
    content.menu,
    'llm',
  );
  if (d.source !== 'llm') {
    return done({
      decision: null,
      record: tag(
        recordOf('plan', r, 'rejected', [
          `content:${d.diagnosis.summary}`.slice(0, 80),
        ]),
      ),
      trace,
    });
  }
  const g = guardDecision(d, { content, situation, offered });
  if (!g.ok) {
    return done({
      decision: null,
      record: tag(recordOf('plan', r, 'rejected', g.reasons)),
      trace,
    });
  }
  return done({
    decision: spaceDecision(d),
    record: tag(recordOf('plan', r)),
    trace,
  });
}

/** App path: honours mode (no key, kill switch, model check) and the daily cap. */
export async function consultPlanner(
  runtime: LlmRuntime,
  content: LessonContent,
  situation: Situation,
  o: ConsultOptions,
): Promise<ConsultResult> {
  const client = runtime.client;
  if (!client || runtime.mode() !== 'llm') {
    return skipped(o.requestId, client?.model ?? 'none', 'disabled', o.reason);
  }
  if (!runtime.take()) {
    return skipped(o.requestId, client.model, 'capped', o.reason);
  }
  return consultWith(client, content, situation, {
    ...o,
    devRaw: runtime.devRaw,
  });
}

/**
 * When the AI is asked (docs/PLANNER.md layer 2, D22), or null: the rules'
 * answer stands. `everyMistake`: the pilot flag (its cap is checked by the
 * caller; when it is used up, call again without it).
 */
export function consultReason(
  s: Situation,
  rules: Decision,
  o: { everyMistake?: boolean } = {},
): ConsultReason | null {
  if (s.request?.text) {
    return 'request';
  }
  if (s.trigger === 'line_invalid') {
    return 'line_invalid';
  }
  const struggleTrigger =
    s.trigger === 'wrong' ||
    s.trigger === 'not_sure' ||
    s.trigger === 'request';
  if (!struggleTrigger) {
    return null;
  }
  if (s.trigger === 'wrong' && s.step.line?.verdict === 'wrong') {
    return 'line_wrong';
  }
  if (rules.source === 'fallback' || rules.ruleId.startsWith('fallback.')) {
    return 'rules_fallback';
  }
  const lastWrong = s.step.wrongValues[s.step.wrongValues.length - 1];
  if (s.trigger === 'wrong' && lastWrong && !lastWrong.misconceptionId) {
    return 'unknown_wrong';
  }
  if (s.step.struggle >= 2) {
    return 'second_struggle';
  }
  if (o.everyMistake && s.trigger !== 'request') {
    return 'every_mistake';
  }
  return null;
}

/** consultReason without the pilot flag, as a yes / no. */
export function shouldConsult(s: Situation, rules: Decision): boolean {
  return consultReason(s, rules) !== null;
}

type LlmAction = LlmPlannerOutput['next'];

/** A rich text with its Arabic runs isolated (runs.ts), or null when that cannot be done. */
function isolateRich<R extends { ar?: Rich['ar'] }>(r: R): R | null {
  if (!r.ar) {
    return r;
  }
  const ar = isolateLlmRuns(r.ar);
  return ar ? { ...r, ar } : null;
}

/** Every rich text of an action isolated, or null when one cannot be. */
function isolateAction(a: LlmAction): LlmAction | null {
  const all = <T>(xs: T[], f: (x: T) => T | null): T[] | null => {
    const out = xs.map(f);
    return out.every(x => x !== null) ? (out as T[]) : null;
  };
  switch (a.kind) {
    case 'show_component': {
      const instruction = isolateRich(a.instruction);
      return instruction ? { ...a, instruction } : null;
    }
    case 'explain':
    case 'example': {
      const blocks = all(a.blocks, b => {
        if (b.type === 'tutor_text') {
          const text = isolateRich(b.text);
          return text ? { ...b, text } : null;
        }
        return b;
      });
      return blocks ? ({ ...a, blocks } as LlmAction) : null;
    }
    case 'ask_clarify': {
      const options = all(a.options, isolateRich);
      return options ? { ...a, options } : null;
    }
    default:
      return a;
  }
}

/** Adds the boundary spaces LLM text runs often lack (runs.ts). */
function spaceRich(r: Rich): Rich {
  return r.ar ? { ...r, ar: spaceRunBoundaries(r.ar) } : r;
}

function spaceAction(a: Action): Action {
  switch (a.kind) {
    case 'show_component':
      return { ...a, instruction: spaceRich(a.instruction) };
    case 'explain':
    case 'example':
      return {
        ...a,
        blocks: a.blocks.map(b =>
          b.type === 'tutor_text'
            ? { ...b, text: spaceRich(b.text) }
            : b.type === 'recap'
            ? { ...b, items: b.items.map(spaceRich) }
            : b,
        ),
      };
    case 'ask_clarify':
      return { ...a, options: a.options.map(spaceRich) };
    default:
      return a;
  }
}

function spaceDecision(d: Decision): Decision {
  return {
    ...d,
    next: spaceAction(d.next),
    ...(d.followUp && { followUp: spaceAction(d.followUp) }),
  };
}
