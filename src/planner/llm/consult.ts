/**
 * One LLM planner consultation: mode + cap -> context pack -> client ->
 * schema + content validation -> guard -> Decision, or null (rules then).
 * Always returns the `llm_call` record, also for skipped calls.
 */
import type { LessonContent } from '../../lesson/session/lesson';
import { validateDecision } from '../planner';
import type { Action, Decision } from '../schema';
import { spaceRunBoundaries } from '../../lesson/rich/runs';
import type { Rich } from '../../content/schema';
import type { Situation } from '../situation';
import { buildPlanPack } from './contextPack';
import { guardDecision } from './guard';
import { planFormatFor, type PlannerClient } from './plannerClient';
import type { DevRawLog } from './devRaw';
import { recordOf, type LlmCallRecord, type LlmRuntime } from './runtime';

export interface ConsultResult {
  decision: Decision | null;
  record: LlmCallRecord;
}

export interface ConsultOptions {
  requestId: string;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Debug builds: receives the raw output and the verdict. */
  devRaw?: DevRawLog | null;
}

const skipped = (
  requestId: string,
  model: string,
  outcome: LlmCallRecord['outcome'],
): ConsultResult => ({
  decision: null,
  record: {
    requestId,
    purpose: 'plan',
    model,
    outcome,
    statusClass: 'none',
    latencyMs: 0,
  },
});

/** The full pipeline with an explicit client (replay, tests). */
export async function consultWith(
  client: PlannerClient,
  content: LessonContent,
  situation: Situation,
  o: ConsultOptions,
): Promise<ConsultResult> {
  const pack = buildPlanPack(content, situation);
  const offered = planFormatFor(pack).components;
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
    return done({ decision: null, record: recordOf('plan', r) });
  }
  const d = validateDecision(
    { ...r.value, ruleId: 'llm', llmRequestId: o.requestId },
    content.menu,
    'llm',
  );
  if (d.source !== 'llm') {
    return done({
      decision: null,
      record: recordOf('plan', r, 'rejected', [
        `content:${d.diagnosis.summary}`.slice(0, 80),
      ]),
    });
  }
  const g = guardDecision(d, { content, situation, offered });
  if (!g.ok) {
    return done({
      decision: null,
      record: recordOf('plan', r, 'rejected', g.reasons),
    });
  }
  return done({ decision: spaceDecision(d), record: recordOf('plan', r) });
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
    return skipped(o.requestId, client?.model ?? 'none', 'disabled');
  }
  if (!runtime.take()) {
    return skipped(o.requestId, client.model, 'capped');
  }
  return consultWith(client, content, situation, {
    ...o,
    devRaw: runtime.devRaw,
  });
}

/**
 * When the rules cannot diagnose (docs/PLANNER.md layer 2): a free-text
 * request, a wrong answer without a known misconception, repeated struggle
 * after rule actions, or the rules falling back to the next step on a
 * struggle trigger. Replay can force every decision point instead.
 */
export function shouldConsult(s: Situation, rules: Decision): boolean {
  if (s.request?.text) {
    return true;
  }
  const struggleTrigger =
    s.trigger === 'wrong' ||
    s.trigger === 'not_sure' ||
    s.trigger === 'request';
  if (!struggleTrigger) {
    return false;
  }
  if (rules.source === 'fallback' || rules.ruleId.startsWith('fallback.')) {
    return true;
  }
  const lastWrong = s.step.wrongValues[s.step.wrongValues.length - 1];
  if (s.trigger === 'wrong' && lastWrong && !lastWrong.misconceptionId) {
    return true;
  }
  return s.step.struggle >= 3 && s.decisions.length >= 2;
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
