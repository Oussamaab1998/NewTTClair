/**
 * Debug builds only: one row per settled planner decision for the dev "AI
 * trace" panel (AI tutor v2, D22): who decided (rules / llm / fallback), why
 * the AI was asked, what it chose and diagnosed, latency, tokens, cost and
 * the guard's verdict. In memory; never logged, queued or exported (the
 * `llm_call` events carry the loggable part).
 */
import type { LlmTiming, LlmUsage } from './client';
import type { ConsultReason } from './consult';

export interface TraceEntry {
  /** Monotonic ms when the decision was settled. */
  at: number;
  stepId: string;
  /** The lesson's trigger (wrong, not_sure, line_invalid, ...). */
  lessonTrigger: string;
  source: 'rules' | 'llm' | 'fallback';
  /** Why the AI was asked; absent when it was not. */
  aiTrigger?: ConsultReason;
  /** The rule that answered (or answered first). */
  ruleId: string;
  /** Applied action ("show_component:NumericTwin", "hint", ...). */
  action: string;
  /** What the AI chose, when it answered (also when rejected). */
  aiAction?: string;
  diagnosis?: { misconceptionIds: string[]; summary: string };
  why?: string;
  model?: string;
  /** ok, rejected, stale, timeout, capped, ... */
  outcome?: string;
  latencyMs?: number;
  usage?: LlmUsage;
  costUsd?: number;
  /** Guard / schema reasons when rejected. */
  reasons?: string[];
  /** Request building, fetch until headers, body read (ms). */
  timing?: LlmTiming;
}

export const TRACE_KEEP = 20;

export class DecisionTraceLog {
  private entries: TraceEntry[] = [];
  private readonly listeners = new Set<() => void>();

  add(e: TraceEntry) {
    this.entries = [...this.entries, e].slice(-TRACE_KEEP);
    for (const l of this.listeners) {
      l();
    }
  }

  all(): readonly TraceEntry[] {
    return this.entries;
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

/** "show_component:NumericTwin" or the action kind. */
export function actionLabel(a: {
  kind: string;
  component?: { component: string };
}): string {
  return a.kind === 'show_component' && a.component
    ? `show_component:${a.component.component}`
    : a.kind;
}
