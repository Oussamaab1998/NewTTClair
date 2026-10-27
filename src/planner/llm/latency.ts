/**
 * Latency of LLM calls, to choose the planner timeout from measured data
 * (2026-10-22): timeout rate, the first call of a run apart (cold: no prompt
 * cache, a new schema), then p50 / p95 of the warm calls. A timed-out call
 * counts at its timeout, so p95 is a lower bound when there are timeouts.
 * Used by the dev trace header (runtime.ts) and the replay eval report.
 */
export interface LatencySample {
  latencyMs: number;
  timedOut: boolean;
}

export interface LatencySummary {
  calls: number;
  timeouts: number;
  timeoutRate: number;
  first: LatencySample;
  warm: { calls: number; p50: number; p95: number };
}

/** The q-quantile (nearest rank, rounded down); 0 for no values. */
export const quantile = (xs: readonly number[], q: number) => {
  if (xs.length === 0) {
    return 0;
  }
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

export function summarizeLatency(
  samples: readonly LatencySample[],
): LatencySummary | null {
  const [first, ...rest] = samples;
  if (!first) {
    return null;
  }
  const timeouts = samples.filter(x => x.timedOut).length;
  const warm = rest.map(x => x.latencyMs);
  return {
    calls: samples.length,
    timeouts,
    timeoutRate: timeouts / samples.length,
    first: { latencyMs: first.latencyMs, timedOut: first.timedOut },
    warm: {
      calls: warm.length,
      p50: quantile(warm, 0.5),
      p95: quantile(warm, 0.95),
    },
  };
}

/** One dev line: "plan: 5 calls · timeouts 2 (40%) · first 3535 ms (timeout) · warm p50 1500 / p95 3540 ms". */
export function latencyLine(
  label: string,
  s: LatencySummary,
  limitMs?: number,
): string {
  const within = s.calls - s.timeouts;
  return [
    `${label}: ${s.calls} call${s.calls === 1 ? '' : 's'}`,
    `timeouts ${s.timeouts} (${Math.round(100 * s.timeoutRate)}%)`,
    `first ${s.first.latencyMs} ms${s.first.timedOut ? ' (timeout)' : ''}`,
    s.warm.calls > 0
      ? `warm p50 ${s.warm.p50} / p95 ${s.warm.p95} ms`
      : 'warm -',
    ...(limitMs !== undefined
      ? [
          `within ${limitMs / 1000} s ${within} (${Math.round(
            (100 * within) / s.calls,
          )}%)`,
        ]
      : []),
  ].join(' · ');
}
