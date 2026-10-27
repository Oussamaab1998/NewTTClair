/**
 * The app's LLM wiring (Phase 4, AI tutor v2). On whenever .env.llm.local has
 * a key for the selected provider (product owner, 2026-10-17); without one
 * there is no client and the lesson is exactly the rules-only lesson (no
 * extra events). Every live call is under the daily money cap. Created on
 * first use; the startup model check runs once, in the background.
 */
import {
  ANTHROPIC_BASE_URL,
  LLM_CONFIG,
  localLlmConfig,
} from '../config/llm';
import {
  ANTHROPIC_VERSION,
  createAnthropicTransport,
} from '../planner/llm/anthropic';
import type { LlmTransport } from '../planner/llm/client';
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
import { DecisionTraceLog } from '../planner/llm/trace';
import type { PlannerClient } from '../planner/llm/plannerClient';
import type * as DevOnly from './dev';

/** Debug builds only; Metro drops this require in release (`__DEV__` false). */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('./dev') as typeof DevOnly)
  : null;
const devScenario = () => devOnly?.devScenario() ?? null;

let runtime: LlmRuntime | null = null;

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid_url';
  }
};

/** The selected provider's transport, model and endpoint, or null without its key. */
function selectedTransport(debug: boolean): {
  transport: LlmTransport;
  model: string;
  endpoint: { host: string; apiVersion?: string };
} | null {
  const cfg = localLlmConfig();
  if (LLM_CONFIG.provider === 'anthropic') {
    return cfg.anthropicApiKey
      ? {
          transport: createAnthropicTransport({
            apiKey: cfg.anthropicApiKey,
            captureRaw: debug,
          }),
          model: LLM_CONFIG.plannerModel,
          endpoint: {
            host: new URL(ANTHROPIC_BASE_URL).host,
            apiVersion: ANTHROPIC_VERSION,
          },
        }
      : null;
  }
  return cfg.apiKey
    ? {
        transport: createOpenAiTransport({
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          captureRaw: debug,
          // p3 asks for the flat wire answer (D22).
          useWire: true,
        }),
        model: LLM_CONFIG.openaiModel,
        endpoint: { host: hostOf(cfg.baseUrl) },
      }
    : null;
}

/** MMKV key of the daily spend ledger (also read by the dev trace panel). */
export const SPEND_KEY = 'llm.spend.v1';

export const newRequestId = () =>
  `llm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function appLlmRuntime(): LlmRuntime {
  if (!runtime) {
    const debug = typeof __DEV__ !== 'undefined' && __DEV__;
    const launch = devOnly?.devLlmAtLaunch() ?? null;
    // `-devLlm off`: no client, so the lesson runs on the rules alone.
    const off = launch === 'off';
    const fake = launch === 'off' ? null : launch;
    const selected = fake || off ? null : selectedTransport(debug);
    const direct: PlannerClient | null = fake
      ? devOnly!.fakeLlmClient(fake)
      : selected
      ? createDirectClient({
          transport: selected.transport,
          model: selected.model,
          maxOutputTokens: LLM_CONFIG.maxOutputTokens,
        })
      : null;
    // A scripted live check runs under its own, smaller money cap.
    const scenario =
      direct && devScenario()
        ? withCostCap(direct, {
            capUsd: devOnly?.SCENARIO_CAP_USD ?? 0,
            maxOutputTokens: LLM_CONFIG.maxOutputTokens,
            // Persisted per day: no remount, Fast Refresh or relaunch resets it.
            // Each scenario has its own daily ledger (live1 keeps its key).
            ledger: storeLedger(
              appStore(),
              devScenario() === 'timing'
                ? 'timing.spend.v1'
                : 'scenario.spend.v1',
              localDay,
            ),
          })
        : direct;
    // Every live call: the daily money cap per device (worst case reserved
    // first). The free fake client has no price: no cap around it.
    const capped =
      scenario && !fake
        ? withCostCap(scenario, {
            capUsd: LLM_CONFIG.dailySpendCapUsd,
            maxOutputTokens: LLM_CONFIG.maxOutputTokens,
            ledger: storeLedger(appStore(), SPEND_KEY, localDay),
          })
        : null;
    const client = capped ?? scenario;
    const everyMistake =
      LLM_CONFIG.aiOnEveryMistake ||
      (devOnly?.aiEveryMistakeAtLaunch() ?? false);
    runtime = createLlmRuntime({
      client,
      store: appStore(),
      dailyCap: LLM_CONFIG.dailyCallCap,
      ...(debug && {
        devRaw: new DevRawLog(),
        trace: new DecisionTraceLog(),
      }),
      ...(everyMistake && {
        everyMistake: { limit: LLM_CONFIG.everyMistakeDailyCap },
      }),
      ...(capped && {
        spend: { capUsd: capped.capUsd, spentUsd: () => capped.spentUsd() },
      }),
      ...(selected && { endpoint: selected.endpoint }),
      planLimitMs: LLM_CONFIG.plannerTimeoutMs,
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
