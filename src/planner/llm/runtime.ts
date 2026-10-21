/**
 * LLM runtime state for one app run (Phase 4 Step 2): mode, daily cap, kill
 * switch, startup model check, last outcome. Anything that stops a call
 * (no key, kill switch, cap, failed model check) means rules only, silently:
 * students never see a message about it; the dev screen does.
 */
import type { KeyValueStore } from '../../storage/kv';
import type { LlmErrorKind, LlmResult, LlmUsage } from './client';
import { estimateCostUsd, modelInfo } from './models';
import type { DevRawLog } from './devRaw';
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
    ...(reasons && reasons.length > 0 && { reasons: reasons.slice(0, 10) }),
    ...(!r.ok && r.detail && !reasons && { reasons: [r.detail.slice(0, 80)] }),
  };
}

const CAP_KEY = 'llm.cap.v1';
const KILL_KEY = 'llm.killSwitch';

/** Calls per local day, persisted (MMKV). */
export class DailyCap {
  constructor(
    private readonly store: KeyValueStore,
    readonly limit: number,
    private readonly today: () => string,
  ) {}

  private read(): { day: string; used: number } {
    try {
      const v = JSON.parse(this.store.getString(CAP_KEY) ?? 'null') as {
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
    this.store.set(CAP_KEY, JSON.stringify({ day: s.day, used: s.used + 1 }));
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
}

export interface LlmRuntimeOptions {
  /** Null when there is no key (rules only). */
  client: PlannerClient | null;
  store: KeyValueStore;
  dailyCap: number;
  today?: () => string;
  devRaw?: DevRawLog;
}

export const localDay = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function createLlmRuntime(o: LlmRuntimeOptions): LlmRuntime {
  const cap = new DailyCap(o.store, o.dailyCap, o.today ?? localDay);
  const flags = localFlags(o.store);
  const listeners = new Set<() => void>();
  let modelCheck: LlmStatus['modelCheck'] = o.client ? 'pending' : 'skipped';
  let last: LlmStatus['last'];
  let calls = 0;
  let snapshot: LlmStatus | null = null;

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
    flags: {
      killSwitch: flags.killSwitch,
      setKillSwitch: on => {
        flags.setKillSwitch(on);
        changed();
      },
    },
    mode: () => (reason() === 'on' ? 'llm' : 'rules_only'),
    take: () => {
      const ok = cap.take();
      changed();
      return ok;
    },
    note: r => {
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
        };
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
      const r = await o.client.checkModel(timeoutMs);
      // A network failure at startup is not a verdict on the model: stay on.
      modelCheck =
        r.ok || r.error === 'network' || r.error === 'timeout'
          ? 'ok'
          : 'failed';
      changed();
    },
  };
}
