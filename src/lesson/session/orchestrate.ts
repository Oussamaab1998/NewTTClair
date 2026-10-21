/**
 * Glue between the pure reducer, the event log and a planner. After each
 * student action: reduce -> log -> if a decision is pending, build the
 * situation from the log, ask the planner, and apply its decision.
 * The lesson only sees the `Planner` interface: an LLM planner can be added
 * without touching the lesson (rules stay its fallback).
 */
import { continueDecision, type Planner } from '../../planner/planner';
import type { HelpTargets, RulesPlanner } from '../../planner/rules';
import type { Decision } from '../../planner/schema';
import { buildSituation } from '../../planner/situation';
import type { Event, EventDraft } from '../../telemetry/events';
import { reduce, type LessonContent } from './lesson';
import type { LessonAction, LessonState } from './types';

export interface LogLike {
  append(drafts: readonly EventDraft[]): Event[];
  all(): readonly Event[];
}

/**
 * A log view with earlier sessions' events in front (cross-session student
 * state). Appends go to the current log only.
 */
export function withHistory(history: readonly Event[], log: LogLike): LogLike {
  if (history.length === 0) {
    return log;
  }
  return {
    append: drafts => log.append(drafts),
    all: () => [...history, ...log.all()],
  };
}

/**
 * What "change method" and "easier" would get on the active card right now:
 * the planner reads a hypothetical request on that step (never logged). The
 * card shows a help button only when it would get an authored answer.
 */
export function helpTargetsAt(
  content: LessonContent,
  state: LessonState,
  log: LogLike,
  planner: RulesPlanner,
): HelpTargets | null {
  const frame = state.stack[state.stack.length - 1];
  const events = log.all();
  const last = events[events.length - 1];
  if (!frame || frame.ref.scope === 'mini' || !last) {
    return null;
  }
  const probe: Event = {
    id: 'help-probe',
    ts: last.ts,
    sessionId: last.sessionId,
    studentId: last.studentId,
    exerciseId: last.exerciseId,
    contentVersion: last.contentVersion,
    questionId: state.questionId,
    stepId: frame.stepId,
    t: 'request',
    kind: 'simpler',
  };
  const situation = buildSituation([...events, probe], content.catalog);
  return situation ? planner.helpTargets(situation) : null;
}

/** The rules planner's decision for the log's last decision point. */
export function decideSync(
  content: LessonContent,
  log: LogLike,
  planner: RulesPlanner,
): Decision {
  const situation = buildSituation(log.all(), content.catalog);
  return situation ? planner.decideSync(situation) : continueDecision();
}

/** Bound on apply rounds per action (a decision never creates a new decision point). */
const MAX_ROUNDS = 4;

/** Reduces one action and settles any decision with a synchronous planner. Returns the new state. */
export function stepSync(
  content: LessonContent,
  state: LessonState,
  action: LessonAction,
  log: LogLike,
  planner: RulesPlanner,
): LessonState {
  let r = reduce(content, state, action);
  log.append(r.events);
  for (let i = 0; r.state.pending && i < MAX_ROUNDS; i += 1) {
    const decision = decideSync(content, log, planner);
    r = reduce(content, r.state, {
      type: 'apply_plan',
      decision,
      at: action.at,
    });
    log.append(r.events);
  }
  return r.state;
}

/**
 * Asks any planner (sync or async). An error, a timeout or an invalid output
 * falls back to the rules planner; the lesson never waits forever.
 */
export async function decide(
  content: LessonContent,
  log: LogLike,
  planner: Planner,
  fallback: RulesPlanner,
  timeoutMs: number,
): Promise<Decision> {
  const situation = buildSituation(log.all(), content.catalog);
  if (!situation) {
    return continueDecision();
  }
  const fromFallback = (): Decision => ({
    ...fallback.decideSync(situation),
    source: 'fallback',
  });
  try {
    const out = planner.decide(situation);
    if (!(out instanceof Promise)) {
      return out;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const result = await Promise.race([out, timeout]);
    clearTimeout(timer);
    return result ?? fromFallback();
  } catch {
    return fromFallback();
  }
}
