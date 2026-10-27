/**
 * LLM runtime state for one app run (Phase 4 Step 2): mode, daily cap, kill
 * switch, startup model check, last outcome. Anything that stops a call
 * (no key, kill switch, cap, failed model check) means rules only, silently:
 * students never see a message about it; the dev screen does.
 */
import type { KeyValueStore } from '../../storage/kv';
import type {
  LlmErrorKind,
  LlmResult,
  LlmTiming,
  LlmUsage,
} from './client';
import {
  latencyLine,
  summarizeLatency,
  type LatencySample,
  type LatencySummary,
} from './latency';
import { estimateCostUsd, modelInfo } from './models';
import type { DevRawLog } from './devRaw';
import type { DecisionTraceLog } from './trace';
import type { PlannerClient } from './plannerClient';

export type LlmMode = 'llm' | 'rules_only';
export type ModeReason = 'on' | 'no_key' | 'kill_switch' | 'model_check_failed';

export type CallOutcome =
  | 'ok'
  | 'rejected'
  | 'stale'
  | Exclude<LlmErrorKind, never>;

/** One call (or skipped call) as logged in an `llm_call` event. */
export interface LlmCallRecord {
  requestId: string;
  purpose: 'plan' | 'tutor';
  model: string;
  outcome: CallOutcome;
  statusClass: 'none' | '2xx' | '4xx' | '5xx';
  latencyMs: number;
  usage?: LlmUsage;
  costUsd?: number;
  reasons?: string[];
  /** Why the AI was asked (consult.ts ConsultReason). */
  trigger?: string;
  /** Where the time went (Anthropic transport). */
  timing?: LlmTiming;
}

export function statusClass(status?: number): LlmCallRecord['statusClass'] {
  if (status === undefined) {
    return 'none';
  }
  if (status >= 500) {
    return '5xx';
  }
  return status >= 400 ? '4xx' : '2xx';
}

/** LlmResult -> record (no provider text, no value). */
export function recordOf(
  purpose: LlmCallRecord['purpose'],
  r: LlmResult<unknown>,
  outcome?: CallOutcome,
  reasons?: string[],
): LlmCallRecord {
  const info = modelInfo(r.model);
  const usage = r.usage ?? undefined;
  return {
    requestId: r.requestId,
    purpose,
    model: r.model,
    outcome: outcome ?? (r.ok ? 'ok' : r.error),
    statusClass: r.ok ? '2xx' : statusClass(r.status),
    latencyMs: Math.round(r.latencyMs),
    ...(usage && { usage }),
    ...(usage && info && { costUsd: estimateCostUsd(info, usage) }),
    ...(r.timing && { timing: r.timing }),
    ...(reasons && reasons.length > 0 && { reasons: reasons.slice(0, 10) }),
    ...(!r.ok && r.detail && !reasons && { reasons: [r.detail.slice(0, 80)] }),
  };
}

const CAP_KEY = 'llm.cap.v1';
const KILL_KEY = 'llm.killSwitch';

/** MMKV key of the last startup model check (Tutor intelligence 1, A1). */
export const MODEL_CHECK_KEY = 'llm.modelCheck.v1';

/**
 * The startup model check as saved, shown and logged: our codes only, never
 * provider message text. `providerType` is an allowlisted `error.type`
 * (providerErrors.ts); `returnedId` the id a 200 answered with, if not ours.
 */
export interface ModelCheckRecord {
  /** Epoch ms when the check settled. */
  at: number;
  /** PlannerClient id ("direct:anthropic:claude-haiku-5-5+cap"). */
  client: string;
  model: string;
  result: 'ok' | LlmErrorKind;
  statusClass: LlmCallRecord['statusClass'];
  latencyMs: number;
  providerType?: string;
  returnedId?: string;
}

const RESULTS: readonly ModelCheckRecord['result'][] = [
  'ok',
  'timeout',
  'network',
  'rate_limited',
  'no_credit',
  'spend_limit',
  'auth',
  'provider',
  'refused',
  'incomplete',
  'invalid',
  'disabled',
  'capped',
  'config',
];

/** A saved record, or undefined when the value is missing or damaged. */
function readCheck(store: KeyValueStore): ModelCheckRecord | undefined {
  try {
    const v = JSON.parse(store.getString(MODEL_CHECK_KEY) ?? 'null') as Record<
      string,
      unknown
    > | null;
    if (
      v &&
      typeof v.at === 'number' &&
      typeof v.client === 'string' &&
      typeof v.model === 'string' &&
      typeof v.latencyMs === 'number' &&
      RESULTS.includes(v.result as ModelCheckRecord['result']) &&
      ['none', '2xx', '4xx', '5xx'].includes(v.statusClass as string)
    ) {
      return v as unknown as ModelCheckRecord;
    }
  } catch {
    // Damaged value: as if there were none.
  }
  return undefined;
}

/** MMKV key of the "AI on every mistake" pilot cap (D22). */
export const EVERY_MISTAKE_KEY = 'llm.everyMistake.v1';

/** Calls per local day, persisted (MMKV). */
export class DailyCap {
  constructor(
    private readonly store: KeyValueStore,
    readonly limit: number,
    private readonly today: () => string,
    private readonly key: string = CAP_KEY,
  ) {}

  private read(): { day: string; used: number } {
    try {
      const v = JSON.parse(this.store.getString(this.key) ?? 'null') as {
        day?: unknown;
        used?: unknown;
      } | null;
      if (v && v.day === this.today() && typeof v.used === 'number') {
        return { day: v.day, used: v.used };
      }
    } catch {
      // Corrupt value: start the day again.
    }
    return { day: this.today(), used: 0 };
  }

  remaining(): number {
    return Math.max(0, this.limit - this.read().used);
  }

  /** Counts one call; false when the day's cap is reached (no call then). */
  take(): boolean {
    const s = this.read();
    if (s.used >= this.limit) {
      return false;
    }
    this.store.set(this.key, JSON.stringify({ day: s.day, used: s.used + 1 }));
    return true;
  }
}

/** Local stand-in for a remote kill switch (same interface later). */
export interface RemoteFlags {
  killSwitch(): boolean;
  setKillSwitch(on: boolean): void;
}

export function localFlags(store: KeyValueStore): RemoteFlags {
  return {
    killSwitch: () => store.getString(KILL_KEY) === '1',
    setKillSwitch: on =>
      on ? store.set(KILL_KEY, '1') : store.remove(KILL_KEY),
  };
}

export interface LlmStatus {
  mode: LlmMode;
  reason: ModeReason;
  clientId: string | null;
  modelCheck: 'pending' | 'ok' | 'failed' | 'skipped';
  last?: {
    purpose: string;
    outcome: CallOutcome;
    statusClass: string;
    latencyMs: number;
  };
  capRemaining: number;
  capLimit: number;
  calls: number;
  /** "AI on every mistake" pilot: calls left today (absent when the flag is off). */
  everyMistake?: { remaining: number; limit: number };
  /** Today's spend under the daily money cap (absent without a cap). */
  spend?: { usd: number; capUsd: number };
  /** This run's model check, once it settled. */
  check?: ModelCheckRecord;
  /** The last saved check from an earlier run (shown while this one is pending). */
  previousCheck?: ModelCheckRecord;
  /** Where calls go: host and API version header (dev display). */
  endpoint?: { host: string; apiVersion?: string };
  /** Latency of this run's real calls per purpose (not disabled / capped). */
  latency?: { plan?: LatencySummary; tutor?: LatencySummary };
  /** The app's planner limit (ms). */
  planLimitMs?: number;
}

export interface LlmRuntime {
  client: PlannerClient | null;
  /** Current mode (checked before every call). */
  mode(): LlmMode;
  /** Reserves one call against the cap; false = skip (logged as capped). */
  take(): boolean;
  /** After every call or skipped call. */
  note(record: LlmCallRecord): void;
  status(): LlmStatus;
  subscribe(l: () => void): () => void;
  flags: RemoteFlags;
  /** Startup check (GET /models/{id}); failure = rules only for this run. */
  checkModel(timeoutMs: number): Promise<void>;
  /** Debug builds: raw model outputs for the dev screen (null otherwise). */
  devRaw: DevRawLog | null;
  /** Debug builds: one row per settled decision, for the AI trace panel (null otherwise). */
  trace: DecisionTraceLog | null;
  /** "AI on every mistake" pilot flag (D22). */
  everyMistakeOn(): boolean;
  /** Reserves one every-mistake call; false = cap reached (normal triggers only). */
  takeEveryMistake(): boolean;
  /** This run's settled model check, once (for one `llm_model_check` event); null otherwise. */
  modelCheckToLog(): ModelCheckRecord | null;
}

export interface LlmRuntimeOptions {
  /** Null when there is no key (rules only). */
  client: PlannerClient | null;
  store: KeyValueStore;
  dailyCap: number;
  today?: () => string;
  devRaw?: DevRawLog;
  trace?: DecisionTraceLog;
  /** "AI on every mistake" pilot: on, with its own calls-per-day cap. */
  everyMistake?: { limit: number };
  /** The daily money cap (for the status line and dev trace). */
  spend?: { capUsd: number; spentUsd: () => number };
  /** Epoch ms (model check time and latency); Date.now by default. */
  now?: () => number;
  /** Host and API version the transport uses (dev display only). */
  endpoint?: { host: string; apiVersion?: string };
  /** The app's planner limit (ms): the trace shows the share of calls inside it. */
  planLimitMs?: number;
}

/**
 * Dev display of the model check (status line, trace header): codes only.
 * "check: failed · invalid 2xx not_found_error · m → m-2026 · 412 ms · api.anthropic.com 2026-10-21";
 * while pending, the previous run's result.
 */
export function modelCheckLine(s: LlmStatus): string {
  const where = s.endpoint
    ? [s.endpoint.host, s.endpoint.apiVersion].filter(Boolean).join(' ')
    : '';
  const of = (c: ModelCheckRecord) =>
    [
      [c.result === 'ok' ? '' : c.result, c.statusClass, c.providerType ?? '']
        .filter(Boolean)
        .join(' '),
      c.returnedId ? `${c.model} → ${c.returnedId}` : c.model,
      `${c.latencyMs} ms`,
    ].join(' · ');
  const head =
    s.check !== undefined
      ? `check: ${s.modelCheck} · ${of(s.check)}`
      : s.previousCheck !== undefined && s.modelCheck === 'pending'
      ? `check: pending (last run: ${of(s.previousCheck)})`
      : `check: ${s.modelCheck}`;
  return where ? `${head} · ${where}` : head;
}

/** Dev display of this run's latency per purpose (trace header). */
export function latencyLines(s: LlmStatus): string[] {
  return (['plan', 'tutor'] as const).flatMap(p => {
    const l = s.latency?.[p];
    return l
      ? [latencyLine(p, l, p === 'plan' ? s.planLimitMs : undefined)]
      : [];
  });
}

export const localDay = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function createLlmRuntime(o: LlmRuntimeOptions): LlmRuntime {
  const cap = new DailyCap(o.store, o.dailyCap, o.today ?? localDay);
  const everyMistake = o.everyMistake
    ? new DailyCap(
        o.store,
        o.everyMistake.limit,
        o.today ?? localDay,
        EVERY_MISTAKE_KEY,
      )
    : null;
  const flags = localFlags(o.store);
  const listeners = new Set<() => void>();
  let modelCheck: LlmStatus['modelCheck'] = o.client ? 'pending' : 'skipped';
  let last: LlmStatus['last'];
  let calls = 0;
  let snapshot: LlmStatus | null = null;
  const now = o.now ?? (() => Date.now());
  const previousCheck = o.client ? readCheck(o.store) : undefined;
  let check: ModelCheckRecord | undefined;
  let checkLogged = false;
  const samples: Record<'plan' | 'tutor', LatencySample[]> = {
    plan: [],
    tutor: [],
  };

  const reason = (): ModeReason => {
    if (!o.client) {
      return 'no_key';
    }
    if (flags.killSwitch()) {
      return 'kill_switch';
    }
    return modelCheck === 'failed' ? 'model_check_failed' : 'on';
  };
  const changed = () => {
    snapshot = null;
    for (const l of listeners) {
      l();
    }
  };

  return {
    client: o.client,
    devRaw: o.devRaw ?? null,
    trace: o.trace ?? null,
    flags: {
      killSwitch: flags.killSwitch,
      setKillSwitch: on => {
        flags.setKillSwitch(on);
        changed();
      },
    },
    mode: () => (reason() === 'on' ? 'llm' : 'rules_only'),
    everyMistakeOn: () => everyMistake !== null,
    takeEveryMistake: () => {
      const ok = everyMistake?.take() ?? false;
      changed();
      return ok;
    },
    take: () => {
      const ok = cap.take();
      changed();
      return ok;
    },
    note: r => {
      // Skipped calls made no request: no latency.
      if (r.outcome !== 'disabled' && r.outcome !== 'capped') {
        samples[r.purpose].push({
          latencyMs: r.latencyMs,
          timedOut: r.outcome === 'timeout',
        });
      }
      calls += 1;
      last = {
        purpose: r.purpose,
        outcome: r.outcome,
        statusClass: r.statusClass,
        latencyMs: r.latencyMs,
      };
      changed();
    },
    status: () => {
      if (!snapshot) {
        const rs = reason();
        snapshot = {
          mode: rs === 'on' ? 'llm' : 'rules_only',
          reason: rs,
          clientId: o.client?.id ?? null,
          modelCheck,
          ...(last && { last }),
          capRemaining: cap.remaining(),
          capLimit: cap.limit,
          calls,
          ...(everyMistake && {
            everyMistake: {
              remaining: everyMistake.remaining(),
              limit: everyMistake.limit,
            },
          }),
          ...(o.spend && {
            spend: { usd: o.spend.spentUsd(), capUsd: o.spend.capUsd },
          }),
          ...(check && { check }),
          ...(previousCheck && { previousCheck }),
          ...(o.endpoint && { endpoint: o.endpoint }),
          ...(o.planLimitMs !== undefined && { planLimitMs: o.planLimitMs }),
        };
        const plan = summarizeLatency(samples.plan);
        const tutor = summarizeLatency(samples.tutor);
        if (plan || tutor) {
          snapshot.latency = {
            ...(plan && { plan }),
            ...(tutor && { tutor }),
          };
        }
      }
      return snapshot;
    },
    subscribe: l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    checkModel: async timeoutMs => {
      if (!o.client) {
        return;
      }
      const t0 = now();
      const r = await o.client.checkModel(timeoutMs);
      const at = now();
      // A network failure at startup is not a verdict on the model: stay on.
      modelCheck =
        r.ok || r.error === 'network' || r.error === 'timeout'
          ? 'ok'
          : 'failed';
      const type = r.ok ? null : r.provider?.type;
      check = {
        at,
        client: o.client.id,
        model: o.client.model,
        result: r.ok ? 'ok' : r.error,
        statusClass: r.ok ? '2xx' : statusClass(r.status),
        latencyMs: Math.max(0, Math.round(at - t0)),
        ...(type && type !== 'unknown' && { providerType: type }),
        ...(!r.ok && r.returnedId !== undefined && {
          returnedId: r.returnedId,
        }),
      };
      o.store.set(MODEL_CHECK_KEY, JSON.stringify(check));
      changed();
    },
    modelCheckToLog: () => {
      if (!check || checkLogged) {
        return null;
      }
      checkLogged = true;
      return check;
    },
  };
}
