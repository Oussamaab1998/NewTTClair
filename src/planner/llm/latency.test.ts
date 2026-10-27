import { LLM_CONFIG } from '../../config/llm';
import { latencyLine, quantile, summarizeLatency } from './latency';

describe('latency summary (timeout chosen from measured data)', () => {
  it('first call apart from warm calls; timeout rate; p50 / p95 of warm calls', () => {
    const s = summarizeLatency([
      { latencyMs: 3535, timedOut: true },
      { latencyMs: 1200, timedOut: false },
      { latencyMs: 900, timedOut: false },
      { latencyMs: 3540, timedOut: true },
      { latencyMs: 1500, timedOut: false },
    ])!;
    expect(s).toEqual({
      calls: 5,
      timeouts: 2,
      timeoutRate: 0.4,
      first: { latencyMs: 3535, timedOut: true },
      warm: { calls: 4, p50: 1500, p95: 3540 },
    });
    expect(latencyLine('plan', s)).toBe(
      'plan: 5 calls · timeouts 2 (40%) · first 3535 ms (timeout) · warm p50 1500 / p95 3540 ms',
    );
  });

  it('no calls: nothing to show; one call: no warm numbers', () => {
    expect(summarizeLatency([])).toBeNull();
    const one = summarizeLatency([{ latencyMs: 800, timedOut: false }])!;
    expect(one.warm).toEqual({ calls: 0, p50: 0, p95: 0 });
    expect(latencyLine('tutor', one)).toBe(
      'tutor: 1 call · timeouts 0 (0%) · first 800 ms · warm -',
    );
  });

  it('quantile: the same definition as the replay report', () => {
    expect(quantile([5, 1, 3], 0.5)).toBe(3);
    expect(quantile([], 0.95)).toBe(0);
  });
});

describe('the share within the app limit (planner 5 s, 2026-10-22)', () => {
  it('is shown when a limit is given', () => {
    const s = summarizeLatency([
      { latencyMs: 3200, timedOut: false },
      { latencyMs: 5000, timedOut: true },
    ])!;
    expect(latencyLine('plan', s, 5000)).toBe(
      'plan: 2 calls · timeouts 1 (50%) · first 3200 ms · warm p50 5000 / p95 5000 ms · within 5 s 1 (50%)',
    );
  });

  it('the app planner timeout is 5000 ms', () => {
    expect(LLM_CONFIG.plannerTimeoutMs).toBe(5000);
  });
});

