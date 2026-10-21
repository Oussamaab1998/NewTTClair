/**
 * The app's LLM wiring (Phase 4). On whenever .env.llm.local has a key
 * (product owner, 2026-10-17); without one there is no client and the lesson
 * is exactly the rules-only lesson (no extra events). Created on first use;
 * the startup model check runs once, in the background.
 */
import { LLM_CONFIG, localLlmConfig } from '../config/llm';
import { createOpenAiTransport } from '../planner/llm/openai';
import { createDirectClient } from '../planner/llm/plannerClient';
import {
  createLlmRuntime,
  localDay,
  type LlmRuntime,
} from '../planner/llm/runtime';
import type { LessonLlm } from '../lesson/useLesson';
import { appStore } from '../storage/appStore';
import { storeLedger, withCostCap } from '../planner/llm/costCap';
import { DevRawLog } from '../planner/llm/devRaw';
import type * as DevOnly from './dev';

/** Debug builds only; Metro drops this require in release (`__DEV__` false). */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('./dev') as typeof DevOnly)
  : null;
const devScenario = () => devOnly?.devScenario() ?? null;

let runtime: LlmRuntime | null = null;

export const newRequestId = () =>
  `llm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function appLlmRuntime(): LlmRuntime {
  if (!runtime) {
    const cfg = localLlmConfig();
    const debug = typeof __DEV__ !== 'undefined' && __DEV__;
    const direct = cfg.apiKey
      ? createDirectClient({
          transport: createOpenAiTransport({
            apiKey: cfg.apiKey,
            baseUrl: cfg.baseUrl,
            captureRaw: debug,
          }),
          model: LLM_CONFIG.plannerModel,
          maxOutputTokens: LLM_CONFIG.maxOutputTokens,
        })
      : null;
    // A scripted live check runs under a hard money cap.
    const client =
      direct && devScenario()
        ? withCostCap(direct, {
            capUsd: devOnly?.SCENARIO_CAP_USD ?? 0,
            maxOutputTokens: LLM_CONFIG.maxOutputTokens,
            // Persisted per day: no remount, Fast Refresh or relaunch resets it.
            ledger: storeLedger(appStore(), 'scenario.spend.v1', localDay),
          })
        : direct;
    runtime = createLlmRuntime({
      client,
      store: appStore(),
      dailyCap: LLM_CONFIG.dailyCallCap,
      ...(debug && { devRaw: new DevRawLog() }),
    });
    runtime.checkModel(LLM_CONFIG.modelCheckTimeoutMs).catch(() => undefined);
  }
  return runtime;
}

/** Lesson wiring, or undefined when there is no key (rules only). */
export function appLessonLlm(): LessonLlm | undefined {
  const rt = appLlmRuntime();
  return rt.client
    ? {
        runtime: rt,
        newRequestId,
        timeoutMs: LLM_CONFIG.plannerTimeoutMs,
        // The scripted check asks at its decision point even where rules could answer.
        ...(devScenario() && { consultAll: true }),
      }
    : undefined;
}
