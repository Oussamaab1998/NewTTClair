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
  if (!frame || frame.ref.scope === 'mini') {
    return null;
  }
  // The lesson's first card has no event yet (help chips, 2026-10-22): the
  // probe takes the lesson's own ids, so "⋯" and the choice know the targets.
  const probe: Event = {
    id: 'help-probe',
    ts: last?.ts ?? 0,
    sessionId: last?.sessionId ?? 'help-probe',
    studentId: last?.studentId ?? 'help-probe',
    exerciseId: last?.exerciseId ?? content.loaded.exercise.id,
    contentVersion:
      last?.contentVersion ?? content.loaded.exercise.contentVersion,
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

/**
 * A probe card only when its answers lead to different next actions
 * (product owner, 2026-10-22). Right after an answer opened one, the rules
 * decide once per candidate (a hypothetical probe answer, never logged); if
 * they all give the same action, the card is dropped before it is shown.
 */
export function settleProbe(
  content: LessonContent,
  before: LessonState,
  state: LessonState,
  log: LogLike,
  planner: RulesPlanner,
  at: number,
): StepLike {
  const isOpenProbe = (s: LessonState) =>
    s.items.find(
      i =>
        i.kind === 'choice_card' &&
        i.purpose === 'probe' &&
        i.status === 'open',
    );
  const card = isOpenProbe(state);
  if (card?.kind !== 'choice_card' || isOpenProbe(before)?.key === card.key) {
    return { state, events: [] };
  }
  const events = log.all();
  const last = events[events.length - 1];
  if (!last) {
    return { state, events: [] };
  }
  const nexts = new Set(
    card.choices
      .filter(c => c !== 'dismissed')
      .map(choice => {
        const probe: Event = {
          ...last,
          id: 'probe-check',
          ts: last.ts + 1,
          stepId: card.stepId,
          t: 'probe',
          value: card.value ?? '',
          candidates: card.misconceptionIds ?? [],
          choice,
        } as Event;
        const situation = buildSituation([...events, probe], content.catalog);
        const d = situation
          ? planner.decideSync(situation)
          : continueDecision();
        return JSON.stringify([d.next, d.followUp ?? null]);
      }),
  );
  return nexts.size > 1
    ? { state, events: [] }
    : reduce(content, state, { type: 'probe_drop', at });
}

interface StepLike {
  state: LessonState;
  events: EventDraft[];
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
  const settled = settleProbe(content, state, r.state, log, planner, action.at);
  log.append(settled.events);
  r = { ...r, state: settled.state };
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
