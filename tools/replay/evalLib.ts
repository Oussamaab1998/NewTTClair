/**
 * AI tutor v2 evaluation (D22): decision points from hand-written scenarios
 * (tools/replay/scenarios/*.json) and from logged sessions, a token-count
 * cost estimate (no generation), a capped live run per model, a report and a
 * darija review sample. Pure where possible; network only through the
 * functions given to it (tests pass fakes).
 */
import ex2 from '../../src/content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../src/content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../../src/content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../src/content/exercises/bac2022c-ex4.misconceptions.json';
import exSc2 from '../../src/content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../../src/content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { nextRightAction } from '../../src/app/dev/answerAll';
import { LLM_CONFIG } from '../../src/config/llm';
import { loadExercise, type LoadedExercise } from '../../src/content/loader';
import {
  buildContent,
  startLesson,
  type LessonContent,
} from '../../src/lesson/session/lesson';
import { stepSync } from '../../src/lesson/session/orchestrate';
import type { LessonAction, LessonState } from '../../src/lesson/session/types';
import type {
  LlmRequest,
  LlmTiming,
  LlmTransport,
  LlmUsage,
} from '../../src/planner/llm/client';
import {
  buildPlanPack,
  serializeDynamic,
  serializeStatic,
} from '../../src/planner/llm/contextPack';
import {
  consultReason,
  consultWith,
  type ConsultReason,
} from '../../src/planner/llm/consult';
import { decisionTexts } from '../../src/planner/llm/guard';
import { quantile, summarizeLatency } from '../../src/planner/llm/latency';
import {
  nearMisses,
  solutionConcepts,
} from '../../src/planner/llm/solutionConcepts';
import { withCostCap, type SpendLedger } from '../../src/planner/llm/costCap';
import { DevRawLog } from '../../src/planner/llm/devRaw';
import {
  estimateCostUsd,
  modelInfo,
  worstCaseCostUsd,
} from '../../src/planner/llm/models';
import {
  createDirectClient,
  planFormatFor,
} from '../../src/planner/llm/plannerClient';
import { planInstructions } from '../../src/planner/llm/prompts';
import { PlannerWireSchema } from '../../src/planner/llm/wireFormat';
import { createRulesPlanner } from '../../src/planner/rules';
import type { Decision } from '../../src/planner/schema';
import {
  buildSituation,
  triggerOf,
  type Situation,
} from '../../src/planner/situation';
import type { Event } from '../../src/telemetry/events';
import { EventLog, fixedClock } from '../../src/telemetry/log';

/** The planner timeout an answer must beat to be used in the app. */
export const PLANNER_TIMEOUT_MS = LLM_CONFIG.plannerTimeoutMs;
/** The planner limit until 2026-10-22, kept as a column for comparison. */
const OLD_LIMIT_MS = 3500;
/** Assumed typical output for the estimate (wire JSON, 1-3 darija blocks). */
export const TYPICAL_OUTPUT_TOKENS = 450;

export const DEFAULT_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-haiku-5-5',
  'claude-sonnet-5-5',
  'gpt-6-luna',
];

export interface DecisionPoint {
  id: string;
  source: 'scenario' | 'log';
  exerciseId: string;
  questionId: string;
  content: LessonContent;
  situation: Situation;
  rules: Decision;
  reason: ConsultReason;
  note?: string;
  preferred?: string[];
  sample?: boolean;
}

export function loadExercises(): Map<string, LoadedExercise> {
  const out = new Map<string, LoadedExercise>();
  for (const [ex, m] of [
    [ex2, ex2Misconceptions],
    [exSc2, exSc2Misconceptions],
    [ex4, ex4Misconceptions],
  ] as const) {
    const r = loadExercise(ex as never, m as never);
    if (!r.ok) {
      throw new Error(r.errors.join('\n'));
    }
    out.set(r.loaded.exercise.id, r.loaded);
  }
  return out;
}

// --- scenarios ---------------------------------------------------------------

type ScenarioAction = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

export interface ScenarioFile {
  part: string;
  exercise: string;
  teacherReviewed: boolean;
  scenarios: {
    id: string;
    goTo: string;
    actions: ScenarioAction[];
    note?: string;
    preferred?: string[];
    sample?: boolean;
  }[];
}

const atStep = (s: LessonState, stepId: string) => {
  const ref = s.stack[s.stack.length - 1]?.ref;
  const openCard = s.items.some(
    i => i.kind === 'choice_card' && i.status === 'open',
  );
  return (
    !s.pending &&
    !s.gate &&
    !openCard &&
    ref?.scope === 'main' &&
    ref.stepId === stepId
  );
};

/** Plays a scenario through the reducer + rules; the AI's decision point at the end. */
export function scenarioPoints(
  file: ScenarioFile,
  exercises: Map<string, LoadedExercise>,
): DecisionPoint[] {
  const loaded = exercises.get(file.exercise);
  if (!loaded) {
    throw new Error(`unknown exercise ${file.exercise}`);
  }
  return file.scenarios.map(sc => {
    const content = buildContent(loaded, file.part);
    const log = new EventLog(
      {
        sessionId: `eval-${sc.id}`,
        studentId: 'eval',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    const rules = createRulesPlanner(content.menu);
    const start = startLesson(content);
    log.append(start.events);
    let state = start.state;
    let t = 0;
    // Never "suspiciously fast": 20 s per action.
    const act = (a: ScenarioAction) => {
      t += 20000;
      state = stepSync(
        content,
        state,
        { ...a, at: t } as LessonAction,
        log,
        rules,
      );
    };
    for (let i = 0; i < 200 && !atStep(state, sc.goTo); i += 1) {
      const next = nextRightAction(state, loaded);
      if (!next) {
        throw new Error(`${sc.id}: cannot reach ${sc.goTo}`);
      }
      act(next as ScenarioAction);
    }
    if (!atStep(state, sc.goTo)) {
      throw new Error(`${sc.id}: did not reach ${sc.goTo}`);
    }
    sc.actions.forEach(act);
    const events = log.all();
    let at = events.length - 1;
    while (at >= 0 && triggerOf(events[at]!) === null) {
      at -= 1;
    }
    const situation = buildSituation(events.slice(0, at + 1), content.catalog);
    if (!situation) {
      throw new Error(`${sc.id}: no decision point`);
    }
    const decision = rules.decideSync(situation);
    return {
      id: sc.id,
      source: 'scenario' as const,
      exerciseId: loaded.exercise.id,
      questionId: file.part,
      content,
      situation,
      rules: decision,
      // Where only the pilot flag would ask, the AI is asked as "every_mistake".
      reason:
        consultReason(situation, decision, { everyMistake: true }) ?? 'forced',
      ...(sc.note && { note: sc.note }),
      ...(sc.preferred && { preferred: sc.preferred }),
      ...(sc.sample && { sample: true }),
    };
  });
}

/** Decision points of a logged session where the normal triggers would ask the AI. */
export function logPoints(
  events: readonly Event[],
  exercises: Map<string, LoadedExercise>,
  label: string,
): DecisionPoint[] {
  const out: DecisionPoint[] = [];
  const contents = new Map<string, LessonContent>();
  events.forEach((e, i) => {
    const trig = triggerOf(e);
    if (trig !== 'wrong' && trig !== 'not_sure' && trig !== 'line_invalid') {
      return;
    }
    const loaded = exercises.get(e.exerciseId);
    if (!loaded) {
      return;
    }
    const key = `${e.exerciseId}/${e.questionId}`;
    let content = contents.get(key);
    if (!content) {
      try {
        content = buildContent(loaded, e.questionId);
      } catch {
        return;
      }
      contents.set(key, content);
    }
    const situation = buildSituation(events, content.catalog, { at: i });
    if (!situation) {
      return;
    }
    const decision = createRulesPlanner(content.menu).decideSync(situation);
    const reason = consultReason(situation, decision);
    if (reason) {
      out.push({
        id: `${label}#${i}`,
        source: 'log',
        exerciseId: e.exerciseId,
        questionId: e.questionId,
        content,
        situation,
        rules: decision,
        reason,
      });
    }
  });
  return out;
}

// --- requests ------------------------------------------------------------------

/** The request the app would send for this point (same builder as DirectClient). */
export function requestFor(
  p: DecisionPoint,
  model: string,
): LlmRequest<unknown> {
  const pack = buildPlanPack(p.content, p.situation, { reason: p.reason });
  return {
    requestId: `est-${p.id}`,
    model,
    instructions: planInstructions(),
    inputPrefix: serializeStatic(pack),
    input: serializeDynamic(pack),
    format: planFormatFor(pack),
    maxOutputTokens: LLM_CONFIG.maxOutputTokens.plan,
    timeoutMs: 30000,
  };
}

// --- estimate ------------------------------------------------------------------

/** Anthropic token counter: (model, system, user parts) -> input tokens. */
export type CountTokens = (
  model: string,
  system: string,
  userParts: string[],
) => Promise<number>;

export interface EstimateRow {
  model: string;
  provider: string;
  calls: number;
  /** Average total input tokens per call. */
  avgInput: number;
  /** System + static pack (the cacheable prefix), average. */
  avgPrefix: number;
  cacheable: boolean;
  counted: 'exact' | 'approx';
  /** Typical: cache writes then reads as the run would order them, typical output. */
  typicalUsd: number;
  /** Every call at the cache-write rate with the full output budget. */
  worstUsd: number;
  error?: string;
}

/** Points grouped per (exercise, question): the cache prefix is per question. */
const prefixKey = (p: DecisionPoint) => `${p.exerciseId}/${p.questionId}`;

export async function estimate(
  points: readonly DecisionPoint[],
  models: readonly string[],
  count: CountTokens,
  passes = 2,
): Promise<EstimateRow[]> {
  const rows: EstimateRow[] = [];
  for (const model of models) {
    const info = modelInfo(model);
    if (!info) {
      rows.push({
        model,
        provider: '?',
        calls: 0,
        avgInput: 0,
        avgPrefix: 0,
        cacheable: false,
        counted: 'approx',
        typicalUsd: 0,
        worstUsd: 0,
        error: 'no price in models.ts',
      });
      continue;
    }
    let inputSum = 0;
    let prefixSum = 0;
    let typical = 0;
    let worst = 0;
    let error: string | undefined;
    const seenPrefix = new Set<string>();
    const exact = info.provider === 'anthropic';
    const prefixCache = new Map<string, number>();
    for (const p of points) {
      const req = requestFor(p, model);
      let total: number;
      let prefix: number;
      try {
        if (exact) {
          const k = prefixKey(p);
          prefix =
            prefixCache.get(k) ??
            (await count(model, req.instructions, [req.inputPrefix ?? '']));
          prefixCache.set(k, prefix);
          total = await count(model, req.instructions, [
            req.inputPrefix ?? '',
            req.input,
          ]);
        } else {
          // OpenAI: no free counter here; ~3 characters per token (approximate).
          prefix = Math.ceil(
            (req.instructions.length + (req.inputPrefix ?? '').length) / 3,
          );
          total = prefix + Math.ceil(req.input.length / 3);
        }
      } catch (e) {
        error = String(e).slice(0, 120);
        break;
      }
      inputSum += total;
      prefixSum += prefix;
      const minCache =
        info.anthropic?.minCacheTokens ?? Number.POSITIVE_INFINITY;
      const cacheable = exact && prefix >= minCache;
      for (let pass = 0; pass < passes; pass += 1) {
        const k = prefixKey(p);
        const first = !seenPrefix.has(k);
        seenPrefix.add(k);
        const usage = cacheable
          ? {
              inputTokens: total,
              cachedInputTokens: first ? 0 : prefix,
              cacheWriteInputTokens: first ? prefix : 0,
              outputTokens: TYPICAL_OUTPUT_TOKENS,
            }
          : {
              inputTokens: total,
              cachedInputTokens: 0,
              outputTokens: TYPICAL_OUTPUT_TOKENS,
            };
        typical += estimateCostUsd(info, usage);
        worst += worstCaseCostUsd(info, total, req.maxOutputTokens);
      }
    }
    const n = points.length;
    rows.push({
      model,
      provider: info.provider,
      calls: n * passes,
      avgInput: n ? Math.round(inputSum / n) : 0,
      avgPrefix: n ? Math.round(prefixSum / n) : 0,
      cacheable:
        exact &&
        n > 0 &&
        prefixSum / n >= (info.anthropic?.minCacheTokens ?? 0),
      counted: exact ? 'exact' : 'approx',
      typicalUsd: typical,
      worstUsd: worst,
      ...(error && { error }),
    });
  }
  return rows;
}

export function formatEstimate(
  rows: readonly EstimateRow[],
  o: { points: number; passes: number },
): string {
  const usd = (v: number) => `$${v.toFixed(4)}`;
  const lines = [
    `Decision points: ${o.points}; each sent ${o.passes}x per model (cold, then warm).`,
    '',
    '| model | calls | avg input tok | cacheable prefix tok | caches? | count | typical | worst case |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      r =>
        `| ${r.model} | ${r.calls} | ${r.avgInput} | ${r.avgPrefix} | ${
          r.cacheable ? 'yes' : 'no'
        } | ${r.counted} | ${usd(r.typicalUsd)} | ${usd(r.worstUsd)} |${
          r.error ? ` ERROR: ${r.error}` : ''
        }`,
    ),
    '',
    `Total typical ${usd(
      rows.reduce((a, r) => a + r.typicalUsd, 0),
    )}; total worst case ${usd(rows.reduce((a, r) => a + r.worstUsd, 0))}.`,
    `Assumptions: ${TYPICAL_OUTPUT_TOKENS} output tokens typical, ${LLM_CONFIG.maxOutputTokens.plan} worst; the structured-output schema is not in the count (count_tokens does not document output_config); OpenAI counts are characters / 3 and assume no cache.`,
  ];
  return lines.join('\n');
}

// --- live run ------------------------------------------------------------------

export interface RunRow {
  model: string;
  pass: number;
  pointId: string;
  reason: ConsultReason;
  outcome: string;
  reasons: string[];
  latencyMs: number;
  usage?: LlmUsage;
  costUsd?: number;
  /** Arrived inside the planner timeout and passed schema + content + guard. */
  usable: boolean;
  action?: string;
  diagnosis?: { misconceptionIds: string[]; summary: string };
  why?: string;
  /** The model's output as returned (local review only). */
  raw?: string;
  /** Passed, but close to the current answer (solutionConcepts.ts nearMisses). */
  nearMisses?: string[];
  /** Request building, fetch until headers, body read (ms). */
  timing?: LlmTiming;
}

export interface ModelSkip {
  model: string;
  why: string;
}

export interface LiveDeps {
  transportFor: (model: string) => LlmTransport | null;
  ledger: SpendLedger;
  capUsd: number;
  passes: number;
  /** Called once, after the first call that returned usage. */
  onFirstCall?: (row: RunRow, estimateUsd: number) => void;
  /** Eval-only call limit (ms); the app keeps its own planner timeout. Default 30 s. */
  timeoutMs?: number;
  /** Eval-only planner output cap (tokens); default LLM_CONFIG.maxOutputTokens.plan. */
  maxOutputTokens?: number;
  log?: (line: string) => void;
}

const STOP_MODEL = new Set([
  'rate_limited',
  'no_credit',
  'spend_limit',
  'auth',
  'config',
]);

export async function runLive(
  points: readonly DecisionPoint[],
  models: readonly string[],
  d: LiveDeps,
): Promise<{ rows: RunRow[]; skipped: ModelSkip[]; capped: boolean }> {
  const rows: RunRow[] = [];
  const skipped: ModelSkip[] = [];
  let capped = false;
  let first = true;
  for (const model of models) {
    if (capped) {
      skipped.push({ model, why: 'run cap reached' });
      continue;
    }
    const transport = d.transportFor(model);
    if (!transport) {
      skipped.push({ model, why: 'no key' });
      continue;
    }
    const check = await transport.checkModel(model, 15000);
    if (!check.ok) {
      skipped.push({
        model,
        why: `model check: ${check.error}${
          check.status ? ` (${check.status})` : ''
        }`,
      });
      continue;
    }
    const raw = new DevRawLog();
    const client = withCostCap(
      createDirectClient({
        transport,
        model,
        maxOutputTokens: {
          ...LLM_CONFIG.maxOutputTokens,
          ...(d.maxOutputTokens !== undefined && { plan: d.maxOutputTokens }),
        },
      }),
      {
        capUsd: d.capUsd,
        maxOutputTokens: {
          ...LLM_CONFIG.maxOutputTokens,
          ...(d.maxOutputTokens !== undefined && { plan: d.maxOutputTokens }),
        },
        ledger: d.ledger,
      },
    );
    const info = modelInfo(model);
    let stop: string | null = null;
    for (let pass = 1; pass <= d.passes && !stop; pass += 1) {
      for (const p of points) {
        const requestId = `eval-${model}-${pass}-${p.id}`;
        const r = await consultWith(client, p.content, p.situation, {
          requestId,
          // Measure the real latency; "usable" compares it with the app timeout.
          timeoutMs: d.timeoutMs ?? EVAL_TIMEOUT_MS,
          reason: p.reason,
          devRaw: raw,
        });
        const rec = r.record;
        const rawText = raw.all().find(x => x.requestId === requestId)?.raw;
        const row: RunRow = {
          model,
          pass,
          pointId: p.id,
          reason: p.reason,
          outcome: rec.outcome,
          reasons: rec.reasons ?? [],
          latencyMs: rec.latencyMs,
          ...(rec.usage && { usage: rec.usage }),
          ...(rec.costUsd !== undefined && { costUsd: rec.costUsd }),
          usable: r.decision !== null && rec.latencyMs <= PLANNER_TIMEOUT_MS,
          ...(r.trace?.action && { action: r.trace.action }),
          ...(r.trace?.diagnosis && { diagnosis: r.trace.diagnosis }),
          ...(r.trace?.why && { why: r.trace.why }),
          ...(rawText !== undefined && { raw: rawText }),
          ...(rec.timing && { timing: rec.timing }),
        };
        const near = r.decision ? nearMissesOf(p, r.decision) : [];
        if (near.length > 0) {
          row.nearMisses = near;
        }
        rows.push(row);
        d.log?.(
          `${model} p${pass} ${p.id}: ${row.outcome} ${row.latencyMs} ms ${
            row.costUsd !== undefined ? `$${row.costUsd.toFixed(5)}` : ''
          } ${row.reasons.join(',')}`,
        );
        if (first && rec.usage && info) {
          first = false;
          const req = requestFor(p, model);
          const est = estimateCostUsd(info, {
            inputTokens: Math.ceil(
              (req.instructions.length +
                (req.inputPrefix ?? '').length +
                req.input.length) /
                3,
            ),
            cachedInputTokens: 0,
            outputTokens: TYPICAL_OUTPUT_TOKENS,
          });
          d.onFirstCall?.(row, est);
        }
        if (rec.outcome === 'capped') {
          capped = true;
          stop = 'run cap reached';
          break;
        }
        if (STOP_MODEL.has(rec.outcome)) {
          stop = rec.outcome;
          break;
        }
      }
    }
    if (stop) {
      skipped.push({ model, why: `stopped: ${stop}` });
    }
  }
  return { rows, skipped, capped };
}

/** A passed decision's texts that come close to the current answer (hints left only). */
export function nearMissesOf(
  p: { content: LessonContent; situation: Situation },
  d: Decision,
): string[] {
  const st = p.situation.step;
  if (st.hintsUsed >= st.hintCount || st.revealed) {
    return [];
  }
  const c = solutionConcepts(p.content, st.key, { hintsUsed: st.hintsUsed });
  return [...new Set(decisionTexts(d).flatMap(t => nearMisses(c, t)))];
}

/** Default eval call limit: long enough to measure the real latency. */
export const EVAL_TIMEOUT_MS = 30000;
/** Rows in the token usage table, per model. */
const TOKEN_ROWS = 5;

const REASON_LABEL: Record<string, string> = {
  final_answer_early: 'leak (final_answer_early)',
  option_list: 'option list (option_list)',
};

// --- report -------------------------------------------------------------------

const pct = (a: number, b: number) =>
  b ? `${Math.round((100 * a) / b)}%` : '-';

export function formatReport(
  rows: readonly RunRow[],
  skipped: readonly ModelSkip[],
  o: {
    points: number;
    passes: number;
    capUsd: number;
    spentUsd: number;
    /** The eval call limit used (ms). */
    timeoutMs?: number;
  },
): string {
  const limitS = (o.timeoutMs ?? EVAL_TIMEOUT_MS) / 1000;
  const models = [...new Set(rows.map(r => r.model))];
  const out = [
    `# AI tutor v2: model comparison`,
    '',
    `${o.points} decision points x ${o.passes} passes per model. Run cap $${
      o.capUsd
    }; spent $${o.spentUsd.toFixed(
      4,
    )} (list-price estimate from usage; check the provider console for the billed amount).`,
    `"valid" = schema + content + guard passed; "usable at ${
      PLANNER_TIMEOUT_MS / 1000
    } s" = valid AND arrived inside the planner timeout (a good but late answer is not used by the app).`,
    '',
    `| model | calls | valid | usable at ${
      PLANNER_TIMEOUT_MS / 1000
    } s | latency p50 / p95 | $ / decision (cold) | $ / decision (warm) | avg input tok (uncached / read / write) | avg output tok | total $ | darija quality (you) |`,
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const m of models) {
    const rs = rows.filter(r => r.model === m);
    const valid = rs.filter(r => r.outcome === 'ok').length;
    const usable = rs.filter(r => r.usable).length;
    const lat = rs.map(r => r.latencyMs);
    const withUsage = rs.filter(r => r.usage && r.costUsd !== undefined);
    const cold = withUsage.filter(r => (r.usage!.cachedInputTokens ?? 0) === 0);
    const warm = withUsage.filter(r => (r.usage!.cachedInputTokens ?? 0) > 0);
    const avg = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const u = (f: (x: LlmUsage) => number) =>
      Math.round(avg(withUsage.map(r => f(r.usage!))));
    const total = withUsage.reduce((a, r) => a + r.costUsd!, 0);
    out.push(
      `| ${m} | ${rs.length} | ${pct(valid, rs.length)} | ${pct(
        usable,
        rs.length,
      )} | ${quantile(lat, 0.5)} / ${quantile(lat, 0.95)} ms | ${
        cold.length ? `$${avg(cold.map(r => r.costUsd!)).toFixed(5)}` : '-'
      } | ${
        warm.length ? `$${avg(warm.map(r => r.costUsd!)).toFixed(5)}` : '-'
      } | ${u(
        x =>
          x.inputTokens - x.cachedInputTokens - (x.cacheWriteInputTokens ?? 0),
      )} / ${u(x => x.cachedInputTokens)} / ${u(
        x => x.cacheWriteInputTokens ?? 0,
      )} | ${u(x => x.outputTokens)} | $${total.toFixed(4)} |  |`,
    );
  }
  out.push(
    '',
    '## Latency (planner)',
    '',
    `To choose the planner timeout from data (it stays ${
      PLANNER_TIMEOUT_MS / 1000
    } s until then). "over ${
      PLANNER_TIMEOUT_MS / 1000
    } s" = the share the app would time out on; "within" = the share it would use in time. First call = the model's first request of the run (cold: no prompt cache, a new schema); warm = every later call. Calls are measured with a ${limitS} s limit; a call that hit it counts at ${limitS} s.`,
    '',
    `| model | calls | over ${
      PLANNER_TIMEOUT_MS / 1000
    } s (timeout rate) | first call | warm calls | warm p50 / p95 | within ${
      PLANNER_TIMEOUT_MS / 1000
    } s | within ${OLD_LIMIT_MS / 1000} s (old limit) |`,
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  const oldWithin = (m: string) => {
    const rs = rows.filter(r => r.model === m && r.outcome !== 'capped');
    const n = rs.filter(
      r => r.outcome !== 'timeout' && r.latencyMs <= OLD_LIMIT_MS,
    ).length;
    return `${n} (${pct(n, rs.length)})`;
  };
  for (const m of models) {
    const s = summarizeLatency(
      rows
        .filter(r => r.model === m && r.outcome !== 'capped')
        .map(r => ({
          latencyMs: r.latencyMs,
          timedOut:
            r.outcome === 'timeout' || r.latencyMs > PLANNER_TIMEOUT_MS,
        })),
    );
    if (s) {
      out.push(
        `| ${m} | ${s.calls} | ${s.timeouts} (${pct(s.timeouts, s.calls)}) | ${
          s.first.latencyMs
        } ms | ${s.warm.calls} | ${
          s.warm.calls > 0 ? `${s.warm.p50} / ${s.warm.p95} ms` : '-'
        } | ${s.calls - s.timeouts} (${pct(s.calls - s.timeouts, s.calls)}) | ${
          oldWithin(m)
        } |`,
      );
    }
  }
  out.push(
    '',
    '## Request timing',
    '',
    'Where the time goes, per call (ms): building the request before fetch; fetch until the response headers (connection, upload and the model; fetch has no separate connect time); reading the body. First call apart (cold).',
    '',
    '| model | calls with headers | first call: prep / headers / body | warm p50 prep / headers / body | warm p95 headers |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const m of models) {
    const timed = rows.filter(
      r => r.model === m && r.timing?.headersMs !== undefined,
    );
    const [first, ...warm] = timed;
    if (!first) {
      continue;
    }
    const t = (r: RunRow) =>
      `${r.timing!.prepMs} / ${r.timing!.headersMs} / ${r.timing!.bodyMs ?? '-'}`;
    const q = (f: (r: RunRow) => number | undefined, p: number) =>
      quantile(
        warm.map(f).filter((x): x is number => x !== undefined),
        p,
      );
    out.push(
      `| ${m} | ${timed.length} | ${t(first)} | ${
        warm.length > 0
          ? `${q(r => r.timing!.prepMs, 0.5)} / ${q(
              r => r.timing!.headersMs,
              0.5,
            )} / ${q(r => r.timing!.bodyMs, 0.5)}`
          : '-'
      } | ${warm.length > 0 ? q(r => r.timing!.headersMs, 0.95) : '-'} |`,
    );
  }
  out.push(
    '',
    '## Planner token usage (first successful calls)',
    '',
    `The first ${TOKEN_ROWS} calls per model that returned an answer, as the provider counted them. Input = uncached + cache read + cache write.`,
    '',
    '| model | point | pass | input uncached | cache read | cache write | output | $ |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const m of models) {
    for (const r of rows
      .filter(x => x.model === m && x.usage && x.outcome !== 'timeout')
      .slice(0, TOKEN_ROWS)) {
      const u = r.usage!;
      const write = u.cacheWriteInputTokens ?? 0;
      out.push(
        `| ${m} | ${r.pointId} | ${r.pass} | ${
          u.inputTokens - u.cachedInputTokens - write
        } | ${u.cachedInputTokens} | ${write} | ${u.outputTokens} | ${
          r.costUsd !== undefined ? `$${r.costUsd.toFixed(5)}` : '-'
        } |`,
      );
    }
  }
  // Rejection reasons: guard / content reasons of rejected answers; for any
  // other failure, its outcome (timeout, invalid, provider, ...).
  const reasonCounts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.outcome === 'ok') {
      continue;
    }
    const keys = r.outcome === 'rejected' ? r.reasons : [r.outcome];
    for (const k of keys) {
      const label = REASON_LABEL[k] ?? k;
      const perModel = reasonCounts.get(label) ?? new Map<string, number>();
      perModel.set(r.model, (perModel.get(r.model) ?? 0) + 1);
      reasonCounts.set(label, perModel);
    }
  }
  out.push(
    '',
    '## Rejection reasons',
    '',
    `| reason | ${models.join(' | ')} |`,
    `| --- | ${models.map(() => '---').join(' | ')} |`,
    ...[...reasonCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(
        ([label, per]) =>
          `| ${label} | ${models.map(m => per.get(m) ?? 0).join(' | ')} |`,
      ),
  );
  const near = rows.filter(r => (r.nearMisses?.length ?? 0) > 0);
  out.push(
    '',
    '## Near misses (passed, close to the answer)',
    '',
    'Not rejected: a misspelled answer word, half of an answer phrase, a part of the answer value, or its complement. Read these to decide whether the leak check needs more phrases.',
    '',
    ...(near.length === 0
      ? ['none']
      : [
          '| model | point | close to the answer |',
          '| --- | --- | --- |',
          ...near.map(
            r => `| ${r.model} | ${r.pointId} | ${r.nearMisses!.join(', ')} |`,
          ),
        ]),
  );
  out.push('', '## Rejections and errors per model', '');
  for (const m of models) {
    const tally = new Map<string, number>();
    for (const r of rows.filter(x => x.model === m && x.outcome !== 'ok')) {
      const keys =
        r.reasons.length > 0
          ? r.reasons.map(x => `${r.outcome}:${x}`)
          : [r.outcome];
      for (const k of keys) {
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
    }
    out.push(
      `- ${m}: ${
        [...tally.entries()].map(([k, v]) => `${k} ${v}`).join(', ') || 'none'
      }`,
    );
  }
  if (skipped.length > 0) {
    out.push(
      '',
      '## Skipped or stopped',
      '',
      ...skipped.map(s => `- ${s.model}: ${s.why}`),
    );
  }
  return out.join('\n');
}

/** A wire answer (or the raw text) as readable review lines. */
export function readable(raw: string | undefined): string[] {
  if (raw === undefined) {
    return ['(no output)'];
  }
  let w: unknown;
  try {
    w = JSON.parse(raw);
  } catch {
    return [raw.slice(0, 600)];
  }
  const parsed = PlannerWireSchema.safeParse(w);
  if (!parsed.success) {
    return [JSON.stringify(w).slice(0, 600)];
  }
  const v = parsed.data;
  const lines = [
    `action: ${v.action}${v.target ? ` → ${v.target}` : ''}${
      v.propsJson ? ` props ${v.propsJson.slice(0, 200)}` : ''
    }`,
    `diagnosis: ${v.diagnosis.misconceptionId || '-'} (${
      v.diagnosis.description
    })`,
  ];
  v.blocks.forEach((b, i) => {
    lines.push(
      b.type === 'math'
        ? `  ${i + 1}. [math] ${b.latex}`
        : `  ${i + 1}. ${b.runs
            .map(r => (r.lang === 'fr' ? `«${r.text}»` : r.text))
            .join(' ')}`,
    );
  });
  return lines;
}

/** Side-by-side review of the sampled points (first pass), with an empty score per model. */
export function formatReview(
  points: readonly DecisionPoint[],
  rows: readonly RunRow[],
): string {
  const models = [...new Set(rows.map(r => r.model))];
  const out = [
    '# Darija review sample',
    '',
    'Score each answer 1-5 for darija quality (natural Tunisian Arabic, French terms kept, short, warm) and note any math or pedagogy problem. Only the sampled points (6 A1, 6 2.a), first pass. Arabic here is unreviewed model output.',
  ];
  for (const p of points.filter(x => x.sample)) {
    const s = p.situation;
    out.push(
      '',
      `## ${p.id} (${p.reason})`,
      '',
      `Step ${s.step.key}, trigger ${s.trigger}; wrong values ${JSON.stringify(
        s.step.wrongValues,
      )}${s.step.line ? `; line ${JSON.stringify(s.step.line)}` : ''}. ${
        p.note ?? ''
      }`,
      `Rules answered: ${p.rules.ruleId} → ${
        p.rules.next.kind
      }. Preferred (guess): ${p.preferred?.join(', ') ?? '-'}.`,
    );
    for (const m of models) {
      const r = rows.find(
        x => x.model === m && x.pointId === p.id && x.pass === 1,
      );
      out.push(
        '',
        `### ${m}: ${
          r
            ? `${r.outcome}${
                r.reasons.length ? ` (${r.reasons.join(', ')})` : ''
              }, ${r.latencyMs} ms`
            : 'not run'
        }`,
        '',
        '```',
        ...readable(r?.raw),
        '```',
        '',
        'darija score (1-5): ___   notes: ___',
      );
    }
  }
  return out.join('\n');
}

// --- keys and ledger (Node only) -------------------------------------------------

/** KEY=value lines (same rules as tools/llm-config/gen.js); values never printed. */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith('#')) {
      out[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return out;
}

export interface SpendFile {
  days: Record<string, number>;
  runs: {
    id: string;
    at: string;
    capUsd: number;
    usd: number;
    models: string[];
  }[];
}

/** A run's spend, persisted after every change (a crash cannot reset the cap). */
export function fileLedger(
  read: () => SpendFile,
  write: (f: SpendFile) => void,
  runId: string,
  day: string,
): SpendLedger {
  const run = () => read().runs.find(r => r.id === runId);
  return {
    get: () => run()?.usd ?? 0,
    add: usd => {
      const f = read();
      const r = f.runs.find(x => x.id === runId);
      if (r) {
        r.usd += usd;
      }
      f.days[day] = (f.days[day] ?? 0) + usd;
      write(f);
    },
  };
}
