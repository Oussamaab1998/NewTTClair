/**
 * Debug builds only (loaded through src/app/dev/index.ts, never in release
 * bundles): a scripted live check started by the iOS launch argument
 * `-devScenario live1` (xcrun simctl launch ... -devScenario live1).
 * live1: in 1.b, one wrong answer (the planner is asked: provisional rules,
 * then the LLM), then one free-text tutor question; at most $0.01 in total
 * (costCap.ts), no retries. Prints `[dev-scenario]` lines (no key, no ids of
 * people) and leaves the raw outputs on the dev screen.
 * Release builds: `__DEV__` is false, so `devScenario()` is always null.
 */
import { Settings } from 'react-native';

import type { CostCap } from '../../planner/llm/costCap';
import type { LlmCallRecord, LlmRuntime } from '../../planner/llm/runtime';
import type { Event } from '../../telemetry/events';
import type { EventLog } from '../../telemetry/log';

export type DevScenario = 'live1' | 'timing';

export const SCENARIO_CAP_USD = 0.01;

export function devScenario(): DevScenario | null {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return null;
  }
  try {
    const v = Settings.get('devScenario');
    return v === 'live1' || v === 'timing' ? v : null;
  } catch {
    return null; // no native Settings module (Jest)
  }
}

export const scenarioLog = (label: string, data?: unknown) =>
  console.log(
    `[dev-scenario] ${label}${
      data === undefined ? '' : ` ${JSON.stringify(data)}`
    }`,
  );

export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export async function waitUntil(check: () => boolean, timeoutMs: number) {
  const end = Date.now() + timeoutMs;
  while (!check() && Date.now() < end) {
    await sleep(200);
  }
  return check();
}

export interface Live1Api {
  runtime: LlmRuntime;
  log: EventLog;
  answerWrong: () => void;
  ask: (text: string) => void;
  closeDrawer: () => void;
  showDevTools: () => void;
}

/**
 * live1: one wrong answer (planner), one tutor question, then the raw outputs.
 * At most once per app process: the flag lives on globalThis so a Fast Refresh
 * (which re-runs modules and remounts screens) cannot start it again.
 */
export function runLive1(a: Live1Api) {
  const g = globalThis as { __tteLive1Ran?: boolean };
  if (g.__tteLive1Ran) {
    scenarioLog('skip', { reason: 'already ran in this app process' });
    return;
  }
  g.__tteLive1Ran = true;
  const rt = a.runtime;
  const calls = () => rt.status().calls;
  const spent = () => (rt.client as Partial<CostCap> | null)?.spentUsd?.() ?? 0;
  const last = <T extends Event['t']>(t: T) =>
    a.log
      .all()
      .filter((e): e is Extract<Event, { t: T }> => e.t === t)
      .at(-1);
  (async () => {
    a.showDevTools();
    await waitUntil(() => rt.status().modelCheck !== 'pending', 10000);
    scenarioLog('start', {
      mode: rt.status().mode,
      client: rt.status().clientId,
      modelCheck: rt.status().modelCheck,
      capUsd: SCENARIO_CAP_USD,
    });
    await sleep(1500);
    a.answerWrong();
    await waitUntil(() => calls() >= 1, 15000);
    await sleep(300);
    const plan = last('plan');
    scenarioLog('planner', {
      last: rt.status().last,
      shownSource: plan?.shownSource ?? null,
      decision: plan
        ? { source: plan.decision.source, next: plan.decision.next.kind }
        : null,
    });
    await sleep(1500);
    a.ask('كيفاش نعرف الحدث العكسي كي يكون فيه au moins une ؟');
    await waitUntil(() => calls() >= 2, 25000);
    await sleep(300);
    scenarioLog('tutor', {
      last: rt.status().last,
      answer: last('tutor_answer'),
    });
    for (const e of rt.devRaw?.all() ?? []) {
      scenarioLog('raw', e);
    }
    scenarioLog('spent', { usd: Number(spent().toFixed(6)) });
    scenarioLog('drawer-ready');
    await sleep(8000);
    a.closeDrawer();
    scenarioLog('raw-ready');
  })().catch(e =>
    scenarioLog('crash', { name: e instanceof Error ? e.name : typeof e }),
  );
}

export interface TimingApi {
  runtime: Pick<LlmRuntime, 'status'>;
  /** Student actions in 1.b that each ask the planner (consultAll). */
  actions: (() => void)[];
  /** One direct planner call on the current situation with this limit (ms), outside the lesson. */
  measurePlan: (timeoutMs: number) => Promise<LlmCallRecord>;
  showDevTools: () => void;
}

/**
 * timing (2026-10-22): why in-app planner calls are slower than the eval's.
 * Three planner calls through the lesson (the app's 3.5 s limit, unchanged),
 * then one direct call with a 15 s limit outside the lesson, so the full
 * time of the same request is seen. Its own $0.01 cap (appLlm.ts). The
 * records (with timing) are kept on globalThis.__tteTiming for the dev
 * inspector and printed as [dev-scenario] lines. Once per app process.
 */
export function runTiming(a: TimingApi): Promise<void> {
  const g = globalThis as {
    __tteTimingRan?: boolean;
    __tteTiming?: LlmCallRecord[];
  };
  if (g.__tteTimingRan) {
    scenarioLog('skip', { reason: 'already ran in this app process' });
    return Promise.resolve();
  }
  g.__tteTimingRan = true;
  const records: LlmCallRecord[] = [];
  g.__tteTiming = records;
  const calls = () => a.runtime.status().calls;
  return (async () => {
    a.showDevTools();
    await waitUntil(() => a.runtime.status().modelCheck !== 'pending', 10000);
    for (const act of a.actions) {
      const before = calls();
      await sleep(1500);
      act();
      await waitUntil(() => calls() > before, 15000);
    }
    await sleep(1500);
    const r = await a.measurePlan(15000);
    records.push(r);
    scenarioLog('measured', {
      outcome: r.outcome,
      latencyMs: r.latencyMs,
      timing: r.timing,
      usage: r.usage,
    });
    scenarioLog('timing-done');
  })().catch(e =>
    scenarioLog('crash', { name: e instanceof Error ? e.name : typeof e }),
  );
}
