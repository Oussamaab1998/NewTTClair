/**
 * Dev check (2026-10-22): is the "unusual answer time" self-report
 * reachable? It may follow a first-try correct answer faster than
 * THRESHOLDS.fastAnswerMs or slower than slowAnswerMs (rule.odd_timing).
 * Counts those first tries in a log and how often the rule fired.
 */
import { attemptOutcomes } from '../state/outcomes';
import type { Catalog } from '../state/catalog';
import { THRESHOLDS, type Thresholds } from '../state/config';
import type { Event } from './events';

export interface AnswerTimingStats {
  /** First-try correct answers on main steps. */
  firstTries: number;
  /** Of those, with a logged duration. */
  timed: number;
  fast: number;
  slow: number;
  /** rule.odd_timing decisions. */
  fired: number;
}

export function answerTimingStats(
  events: readonly Event[],
  catalog: Catalog,
  th: Thresholds = THRESHOLDS,
): AnswerTimingStats {
  const firsts = attemptOutcomes(events, catalog).filter(
    o => o.outcome === 'first_try',
  );
  const out: AnswerTimingStats = {
    firstTries: firsts.length,
    timed: 0,
    fast: 0,
    slow: 0,
    fired: 0,
  };
  for (const o of firsts) {
    const a = events.find(
      e =>
        e.t === 'answer' &&
        e.correct &&
        e.sessionId === o.session &&
        e.ts === o.ts,
    );
    const ms = a?.t === 'answer' ? a.durationMs : undefined;
    if (ms === undefined) {
      continue;
    }
    out.timed += 1;
    if (ms < th.fastAnswerMs) {
      out.fast += 1;
    } else if (ms > th.slowAnswerMs) {
      out.slow += 1;
    }
  }
  out.fired = events.filter(
    e => e.t === 'plan' && e.decision.ruleId === 'rule.odd_timing',
  ).length;
  return out;
}

export const formatAnswerTiming = (s: AnswerTimingStats) =>
  `odd time: fast ${s.fast} · slow ${s.slow} of ${s.timed} timed first tries · fired ${s.fired} (${s.firstTries} first tries)`;
