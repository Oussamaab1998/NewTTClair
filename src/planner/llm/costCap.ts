/**
 * A hard money cap around a PlannerClient (debug scenario runs): before each
 * call the worst case (input estimated at 2.5 characters per token, plus the
 * full output budget, at list price) must fit under the cap, else the call is
 * refused as `capped` without a request. Afterwards the real usage counts (a
 * call without usage counts at its worst case). No retries.
 */
import type { KeyValueStore } from '../../storage/kv';
import type { LlmResult } from './client';
import type { PlanContextPack, TutorContextPack } from './contextPack';
import { serializePack } from './contextPack';
import { estimateCostUsd, modelInfo, worstCaseCostUsd } from './models';
import { planFormatFor, type PlannerClient } from './plannerClient';
import { planInstructions, TUTOR_INSTRUCTIONS } from './prompts';
import { tutorFormat } from './tutorFormat';

export interface CostCap {
  readonly capUsd: number;
  spentUsd(): number;
}

/** Where the spend lives: persisted (MMKV) so remounts and relaunches cannot reset the cap. */
export interface SpendLedger {
  get(): number;
  add(usd: number): void;
}

export function memoryLedger(): SpendLedger {
  let spent = 0;
  return { get: () => spent, add: usd => (spent += usd) };
}

/** Spend per local day in a KeyValueStore. */
export function storeLedger(
  store: KeyValueStore,
  key: string,
  today: () => string,
): SpendLedger {
  const read = () => {
    try {
      const v = JSON.parse(store.getString(key) ?? 'null') as {
        day?: unknown;
        usd?: unknown;
      } | null;
      return v && v.day === today() && typeof v.usd === 'number' ? v.usd : 0;
    } catch {
      return 0;
    }
  };
  return {
    get: read,
    add: usd =>
      store.set(key, JSON.stringify({ day: today(), usd: read() + usd })),
  };
}

export function withCostCap(
  inner: PlannerClient,
  o: {
    capUsd: number;
    maxOutputTokens: { plan: number; tutor: number };
    ledger?: SpendLedger;
  },
): PlannerClient & CostCap {
  const ledger = o.ledger ?? memoryLedger();
  const info = modelInfo(inner.model);

  // Worst case: every input token at the highest input rate (a cache write
  // costs more than plain input on Anthropic).
  const worst = (chars: number, out: number) =>
    info
      ? worstCaseCostUsd(info, Math.ceil(chars / 2.5), out)
      : Number.POSITIVE_INFINITY;

  async function guarded<T>(
    chars: number,
    out: number,
    requestId: string,
    call: () => Promise<LlmResult<T>>,
  ): Promise<LlmResult<T>> {
    const w = worst(chars, out);
    if (ledger.get() + w > o.capUsd) {
      return {
        ok: false,
        error: 'capped',
        requestId,
        model: inner.model,
        latencyMs: 0,
        usage: null,
      };
    }
    // Reserve the worst case first (parallel calls cannot overshoot), then settle.
    ledger.add(w);
    const r = await call();
    if (r.usage && info) {
      ledger.add(estimateCostUsd(info, r.usage) - w);
    }
    return r;
  }

  const planChars = (p: PlanContextPack) =>
    serializePack(p).length +
    // The larger of the two formats a transport may send.
    Math.max(
      JSON.stringify(planFormatFor(p).strict).length,
      JSON.stringify(planFormatFor(p).wire.schema).length,
    ) +
    planInstructions().length;
  const tutorChars = (p: TutorContextPack) =>
    serializePack(p).length +
    JSON.stringify(tutorFormat().strict).length +
    TUTOR_INSTRUCTIONS.length;

  return {
    id: `${inner.id}+cap`,
    model: inner.model,
    capUsd: o.capUsd,
    spentUsd: () => ledger.get(),
    plan: (pack, c) =>
      guarded(planChars(pack), o.maxOutputTokens.plan, c.requestId, () =>
        inner.plan(pack, c),
      ),
    tutor: (pack, c) =>
      guarded(tutorChars(pack), o.maxOutputTokens.tutor, c.requestId, () =>
        inner.tutor(pack, c),
      ),
    checkModel: t => inner.checkModel(t),
  };
}
