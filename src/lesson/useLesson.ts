import { useCallback, useMemo, useRef, useState } from 'react';

import type { LoadedExercise } from '../content/loader';
import type { Planner } from '../planner/planner';
import { createRulesPlanner } from '../planner/rules';
import { nowMs } from '../telemetry/clock';
import type { EventDraft } from '../telemetry/events';
import { EventLog, type LogClock, type SessionInfo } from '../telemetry/log';
import { TeacherNoteQueue } from '../telemetry/notes';
import {
  buildContent,
  reduce,
  startLesson,
  type LessonContent,
} from './session/lesson';
import { decide, decideSync } from './session/orchestrate';
import type { LessonAction, LessonState } from './session/types';

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

/** UI-only events (menu opened/dismissed): they do not change the feed. */
export type UiEventDraft = Extract<EventDraft, { t: 'component_event' }>;

/** How long an async planner may take before the rules answer instead (untuned guess). */
const PLANNER_TIMEOUT_MS = 4000;

export interface LessonController {
  content: LessonContent;
  state: LessonState;
  log: EventLog;
  notes: TeacherNoteQueue;
  dispatch: (action: Exclude<ActionInput, { type: 'apply_plan' }>) => void;
  /** `stepId` defaults to the active step. */
  logUi: (
    component: string,
    name: string,
    payload: UiEventDraft['payload'],
    stepId?: string,
  ) => void;
  logError: (
    stepId: string,
    component: string,
    reason: ComponentErrorDraft['reason'],
    detail: string,
  ) => void;
}

type ComponentErrorDraft = Extract<EventDraft, { t: 'component_error' }>;

/**
 * Binds the pure lesson reducer to React state, the event log and a planner
 * (rules by default; any `Planner` can be injected, e.g. an LLM one later).
 */
export function useLesson(
  loaded: LoadedExercise,
  questionId: string,
  session: Omit<SessionInfo, 'exerciseId' | 'contentVersion'>,
  clock?: LogClock,
  planner?: Planner,
): LessonController {
  const content = useMemo(
    () => buildContent(loaded, questionId),
    [loaded, questionId],
  );
  const rules = useMemo(() => createRulesPlanner(content.menu), [content]);
  const log = useMemo(
    () =>
      new EventLog(
        {
          ...session,
          exerciseId: loaded.exercise.id,
          contentVersion: loaded.exercise.contentVersion,
        },
        clock,
      ),
    // One log per lesson session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, questionId],
  );
  const notes = useMemo(() => new TeacherNoteQueue(log), [log]);
  const now = clock?.monotonic ?? nowMs;
  const stateRef = useRef<LessonState | null>(null);
  if (stateRef.current === null) {
    const start = startLesson(content, now());
    stateRef.current = start.state;
    log.append(start.events);
  }
  const [state, setState] = useState<LessonState>(stateRef.current);
  const active = planner ?? rules;

  const apply = useCallback(
    (action: LessonAction) => {
      const r = reduce(content, stateRef.current!, action);
      stateRef.current = r.state;
      log.append(r.events);
    },
    [content, log],
  );

  /** Settles pending decisions; sync planners apply in the same render. */
  const settle = useCallback(() => {
    const pending = stateRef.current!.pending;
    if (!pending) {
      return;
    }
    if (active === rules) {
      // Synchronous: applied before the next render (no flicker, no wait).
      for (let i = 0; stateRef.current!.pending && i < 4; i += 1) {
        apply({
          type: 'apply_plan',
          decision: decideSync(content, log, rules),
          at: now(),
        });
      }
      return;
    }
    decide(content, log, active, rules, PLANNER_TIMEOUT_MS).then(decision => {
      // Drop stale answers (the state moved on meanwhile).
      if (stateRef.current!.pending !== pending) {
        return;
      }
      apply({ type: 'apply_plan', decision, at: now() });
      setState(stateRef.current!);
    });
  }, [active, rules, content, log, apply, now]);

  const dispatch = useCallback(
    (action: Exclude<ActionInput, { type: 'apply_plan' }>) => {
      apply({ ...action, at: now() } as LessonAction);
      settle();
      setState(stateRef.current!);
    },
    [apply, settle, now],
  );

  const logUi = useCallback(
    (
      component: string,
      name: string,
      payload: UiEventDraft['payload'],
      stepId?: string,
    ) => {
      const s = stateRef.current!;
      const frame = s.stack[s.stack.length - 1];
      log.append([
        {
          t: 'component_event',
          questionId: s.questionId,
          stepId: stepId ?? frame?.stepId ?? 'none',
          component,
          name,
          payload,
        },
      ]);
    },
    [log],
  );

  const logError = useCallback(
    (
      stepId: string,
      component: string,
      reason: ComponentErrorDraft['reason'],
      detail: string,
    ) => {
      log.append([
        {
          t: 'component_error',
          questionId: stateRef.current!.questionId,
          stepId,
          component,
          reason,
          detail: detail.slice(0, 500),
        },
      ]);
    },
    [log],
  );

  return { content, state, log, notes, dispatch, logUi, logError };
}
