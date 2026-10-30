import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LoadedExercise } from '../content/loader';
import { continueDecision } from '../planner/planner';
import type { Decision } from '../planner/schema';
import { buildSituation } from '../planner/situation';
import {
  consultPlanner,
  consultReason,
  type ConsultReason,
} from '../planner/llm/consult';
import { actionLabel } from '../planner/llm/trace';
import type { LlmCallRecord, LlmRuntime } from '../planner/llm/runtime';
import { createRulesPlanner, type HelpTargets } from '../planner/rules';
import { nowMs } from '../telemetry/clock';
import type { EventDraft } from '../telemetry/events';
import { EventLog, type LogClock, type SessionInfo } from '../telemetry/log';
import { TeacherNoteQueue } from '../telemetry/notes';
import type { EventStore } from '../telemetry/eventStore';
import type { DoneRecord } from '../state/doneParts';
import {
  contextFor,
  type DeviceContext,
  type LocalQueue,
} from '../telemetry/reports';
import type { JsonObject } from '../components/contract';
import {
  buildContent,
  isMethodStep,
  reduce,
  startLesson,
  type LessonContent,
} from './session/lesson';
import {
  decideSync,
  helpTargetsAt,
  settleProbe,
  withHistory,
} from './session/orchestrate';
import type { LessonAction, LessonState } from './session/types';

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

/** UI-only events (menu opened/dismissed): they do not change the feed. */
export type UiEventDraft = Extract<EventDraft, { t: 'component_event' }>;

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
  /** Logs a `report` event and queues it with its context (docs/FEEDBACK_AND_TRUST.md). */
  report: (input: ReportInput) => void;
  /** The student dragged the feed: a provisional answer becomes final. */
  studentScrolled: () => void;
  /** Tutor drawer: where the student is (step, ladder, skills) for the context pack. */
  tutorContext: () => TutorContext;
  /** Tutor drawer: the free-text ask, the LLM call (if any) and the answer, as events. */
  logTutor: (t: TutorLog) => void;
  /** End-of-question feedback card (D19): event + queue entry. */
  sendFeedback: (choice: 'disliked' | 'ok' | 'liked', text?: string) => void;
  /** Help buttons of the active card: shown only with an authored answer. */
  help: HelpTargets | null;
}

export interface TutorContext {
  stepKey: string | null;
  stepId: string;
  hintsUsed: number;
  hintCount: number;
  skills: Record<string, { status: string; representationsTried: string[] }>;
}

export interface TutorLog {
  text: string;
  components?: JsonObject;
  answerSource: 'verified' | 'ai' | 'saved';
  record?: LlmCallRecord;
  requestId?: string;
  counts: {
    blocks: number;
    verified: number;
    unverified: number;
    dropped: number;
  };
}

export interface ReportInput {
  blockId: string;
  source: 'lesson' | 'ai' | 'component';
  reason: Extract<EventDraft, { t: 'report' }>['reason'];
  text?: string;
  snapshot?: JsonObject;
  componentSpec?: JsonObject;
  llmRequestId?: string;
}

export interface LessonLlm {
  runtime: LlmRuntime;
  newRequestId: () => string;
  /** Planner call timeout (short: the provisional answer is on screen). */
  timeoutMs: number;
  /** Ask at every decision point (replay / tests), not only where the rules cannot diagnose. */
  consultAll?: boolean;
}

export interface LessonServices {
  /** Report / question queue; reports are only logged when absent. */
  queue?: LocalQueue;
  device?: () => DeviceContext;
  /** LLM planner; absent or off = rules only. */
  llm?: LessonLlm;
  /** Persistent copy of the log (survives relaunch). */
  eventStore?: EventStore;
  /** Done parts, kept apart from the log so its cap never erases them. */
  doneRecord?: Pick<DoneRecord, 'note'>;
}

interface Provisional {
  requestId: string;
  rules: Decision;
  abort: AbortController;
  preview: LessonState;
}

type ComponentErrorDraft = Extract<EventDraft, { t: 'component_error' }>;

/**
 * Binds the pure lesson reducer to React state, the event log and the
 * planners. Rules decide at once. Where the rules cannot diagnose and the LLM
 * is on, the rules answer is shown provisionally (not logged) with a "..."
 * marker while the LLM is asked; it is swapped for the LLM's answer only if
 * the student has neither acted nor scrolled meanwhile. Any failure keeps the
 * rules answer, silently. Every call, skipped ones too, is an `llm_call` event.
 */
export function useLesson(
  loaded: LoadedExercise,
  questionId: string,
  session: Omit<SessionInfo, 'exerciseId' | 'contentVersion'>,
  clock?: LogClock,
  services: LessonServices = {},
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
        {
          append: events => {
            services.eventStore?.append(events);
            for (const e of events) {
              services.doneRecord?.note(e);
            }
          },
        },
      ),
    // One log per lesson session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, questionId],
  );
  const notes = useMemo(() => new TeacherNoteQueue(log), [log]);
  /**
   * Earlier sessions of this exercise from the persistent store, read once:
   * the derived skill state (statuses, representations tried, transfers)
   * spans sessions; per-step counters stay per session (situation.ts).
   */
  const planLog = useMemo(() => {
    const history = (services.eventStore?.load() ?? []).filter(
      e =>
        e.exerciseId === loaded.exercise.id &&
        e.sessionId !== session.sessionId,
    );
    return withHistory(history, log);
    // Read once per lesson session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);
  const now = clock?.monotonic ?? nowMs;
  const stateRef = useRef<LessonState | null>(null);
  if (stateRef.current === null) {
    const start = startLesson(content, now());
    stateRef.current = start.state;
    log.append(start.events);
  }
  const [state, setStateRaw] = useState<LessonState>(stateRef.current);
  const setState = useCallback((st: LessonState) => setStateRaw(st), []);
  const { llm } = services;
  /** The provisional rules answer on screen while the LLM is asked. */
  const provisional = useRef<Provisional | null>(null);

  const apply = useCallback(
    (action: LessonAction) => {
      const before = stateRef.current!;
      const r = reduce(content, before, action);
      log.append(r.events);
      // A probe card only when its answers lead to different actions.
      const settled = settleProbe(
        content,
        before,
        r.state,
        log,
        rules,
        action.at,
      );
      log.append(settled.events);
      stateRef.current = settled.state;
    },
    [content, log, rules],
  );

  // The startup model check, once per app run: the first lesson that sees it
  // settled logs it (A1b), whether it settled before or during this lesson.
  useEffect(() => {
    const rt = llm?.runtime;
    if (!rt) {
      return;
    }
    const logCheck = () => {
      const c = rt.modelCheckToLog();
      if (!c) {
        return;
      }
      const apiVersion = rt.status().endpoint?.apiVersion;
      log.append([
        {
          t: 'llm_model_check',
          questionId: stateRef.current!.questionId,
          stepId: 'none',
          client: c.client,
          model: c.model,
          result: c.result,
          statusClass: c.statusClass,
          latencyMs: c.latencyMs,
          ...(c.providerType !== undefined && {
            providerType: c.providerType,
          }),
          ...(c.returnedId !== undefined && { returnedId: c.returnedId }),
          ...(apiVersion !== undefined && { apiVersion }),
        },
      ]);
    };
    logCheck();
    return rt.subscribe(logCheck);
  }, [llm, log]);

  const logCall = useCallback(
    (record: LlmCallRecord, stepId: string) => {
      const u = record.usage;
      log.append([
        {
          t: 'llm_call',
          questionId: stateRef.current!.questionId,
          stepId,
          requestId: record.requestId,
          purpose: record.purpose,
          model: record.model,
          outcome: record.outcome,
          statusClass: record.statusClass,
          latencyMs: record.latencyMs,
          ...(u && {
            inputTokens: u.inputTokens,
            cachedInputTokens: u.cachedInputTokens,
            ...(u.cacheWriteInputTokens !== undefined && {
              cacheWriteInputTokens: u.cacheWriteInputTokens,
            }),
            outputTokens: u.outputTokens,
          }),
          ...(record.trigger && {
            trigger: record.trigger as ConsultReason,
          }),
          ...(record.costUsd !== undefined && { costUsd: record.costUsd }),
          ...(record.reasons && { reasons: record.reasons }),
          ...(record.timing && {
            prepMs: record.timing.prepMs,
            ...(record.timing.headersMs !== undefined && {
              headersMs: record.timing.headersMs,
            }),
            ...(record.timing.bodyMs !== undefined && {
              bodyMs: record.timing.bodyMs,
            }),
          }),
        },
      ]);
      llm?.runtime.note(record);
    },
    [log, llm],
  );

  /** Remaining decision points after a commit are settled by the rules. */
  const settleRules = useCallback(() => {
    for (let i = 0; stateRef.current!.pending && i < 4; i += 1) {
      apply({
        type: 'apply_plan',
        decision: decideSync(content, planLog, rules),
        at: now(),
      });
    }
  }, [apply, content, planLog, rules, now]);

  /**
   * Commits the provisional answer (the student acted or scrolled, the LLM
   * failed or timed out), or the LLM's decision when the student did nothing
   * since the provisional answer appeared. Logged with `shownSource`.
   */
  const commit = useCallback(
    (decision: Decision, shownSource: 'rules' | 'llm') => {
      provisional.current = null;
      if (shownSource === 'llm') {
        // The reducer may still refuse it in this state: then the rules stand.
        const trial = reduce(content, stateRef.current!, {
          type: 'apply_plan',
          decision,
          shownSource,
          at: now(),
        });
        const plan = trial.events.find(e => e.t === 'plan');
        if (
          plan?.t === 'plan' &&
          plan.decision.ruleId === 'fallback.not_applicable'
        ) {
          return false;
        }
      }
      apply({ type: 'apply_plan', decision, shownSource, at: now() });
      settleRules();
      return true;
    },
    [apply, content, settleRules, now],
  );

  const commitProvisional = useCallback(() => {
    const p = provisional.current;
    if (p) {
      p.abort.abort();
      commit(p.rules, 'rules');
    }
  }, [commit]);

  /** Settles pending decisions: rules at once, or provisional rules + LLM. */
  const settle = useCallback(() => {
    const pending = stateRef.current!.pending;
    if (!pending) {
      return;
    }
    const situation = buildSituation(planLog.all(), content.catalog);
    const rulesDecision = situation
      ? rules.decideSync(situation)
      : continueDecision();
    const trace = llm?.runtime.trace ?? null;
    const traceBase = {
      stepId: pending.stepId,
      lessonTrigger: pending.trigger,
      ruleId: rulesDecision.ruleId,
    };
    let reason: ConsultReason | null = null;
    // Method steps never ask the AI (D40: no model call anywhere in v1).
    const methodStep =
      !!situation && isMethodStep(content, situation.step.key);
    if (llm && situation && !methodStep) {
      reason = llm.consultAll
        ? 'forced'
        : consultReason(situation, rulesDecision, {
            everyMistake:
              llm.runtime.everyMistakeOn() && llm.runtime.mode() === 'llm',
          });
      // The pilot's own cap: once used up, only the normal triggers ask.
      if (reason === 'every_mistake' && !llm.runtime.takeEveryMistake()) {
        reason = null;
      }
    }
    if (!llm || !situation || reason === null) {
      trace?.add({
        ...traceBase,
        at: now(),
        source: 'rules',
        action: actionLabel(rulesDecision.next),
      });
      settleRules();
      return;
    }
    const requestId = llm.newRequestId();
    if (llm.runtime.mode() !== 'llm' || llm.runtime.client === null) {
      // Rules only, silently; the skipped call is still on record.
      logCall(
        {
          requestId,
          purpose: 'plan',
          model: llm.runtime.client?.model ?? 'none',
          outcome: 'disabled',
          statusClass: 'none',
          latencyMs: 0,
          trigger: reason,
        },
        pending.stepId,
      );
      trace?.add({
        ...traceBase,
        at: now(),
        source: 'rules',
        aiTrigger: reason,
        action: actionLabel(rulesDecision.next),
        outcome: 'disabled',
      });
      settleRules();
      return;
    }
    // Provisional: the rules answer is shown (not logged) while the LLM is asked.
    const preview = reduce(content, stateRef.current!, {
      type: 'apply_plan',
      decision: rulesDecision,
      shownSource: 'rules',
      at: now(),
    }).state;
    const abort = new AbortController();
    provisional.current = { requestId, rules: rulesDecision, abort, preview };
    const stepId = pending.stepId;
    consultPlanner(llm.runtime, content, situation, {
      requestId,
      timeoutMs: llm.timeoutMs,
      signal: abort.signal,
      reason,
    }).then(({ decision, record, trace: ai }) => {
      const p = provisional.current;
      const row = (source: 'rules' | 'llm' | 'fallback', outcome: string) =>
        trace?.add({
          ...traceBase,
          at: now(),
          source,
          aiTrigger: reason!,
          action: actionLabel(
            source === 'llm' && decision ? decision.next : rulesDecision.next,
          ),
          ...(ai?.action && { aiAction: ai.action }),
          ...(ai?.diagnosis && { diagnosis: ai.diagnosis }),
          ...(ai?.why && { why: ai.why }),
          model: record.model,
          outcome,
          latencyMs: record.latencyMs,
          ...(record.usage && { usage: record.usage }),
          ...(record.costUsd !== undefined && { costUsd: record.costUsd }),
          ...(record.reasons && { reasons: record.reasons }),
          ...(record.timing && { timing: record.timing }),
        });
      if (!p || p.requestId !== requestId) {
        // The student acted or scrolled first: the rules answer stayed.
        logCall({ ...record, outcome: 'stale' }, stepId);
        row('rules', 'stale');
        return;
      }
      logCall(record, stepId);
      const swapped = decision !== null && commit(decision, 'llm');
      if (!swapped) {
        commit({ ...p.rules, source: 'fallback' }, 'rules');
      }
      row(
        swapped ? 'llm' : 'fallback',
        decision !== null && !swapped ? 'not_applicable' : record.outcome,
      );
      setState(stateRef.current!);
    });
  }, [
    llm,
    planLog,
    content,
    rules,
    settleRules,
    logCall,
    commit,
    setState,
    now,
  ]);

  /** What the feed shows: the provisional preview + "..." while asking. */
  const visible = useCallback((): LessonState => {
    const p = provisional.current;
    if (!p) {
      return stateRef.current!;
    }
    const items = [...p.preview.items];
    const marker = {
      key: `thinking-${p.requestId}`,
      kind: 'thinking' as const,
      depth: 0,
    };
    // Above the active card, which always stays last.
    const card = p.preview.stack[p.preview.stack.length - 1]?.cardKey;
    const at =
      card !== undefined && items[items.length - 1]?.key === card
        ? items.length - 1
        : items.length;
    items.splice(at, 0, marker);
    return { ...p.preview, items };
  }, []);

  const dispatch = useCallback(
    (action: Exclude<ActionInput, { type: 'apply_plan' }>) => {
      // Acting on a provisional answer makes it final (DECISIONS.md D6 update).
      commitProvisional();
      apply({ ...action, at: now() } as LessonAction);
      settle();
      setState(visible());
    },
    [apply, settle, now, commitProvisional, visible, setState],
  );

  /** The student scrolled the feed: no swap any more. */
  const studentScrolled = useCallback(() => {
    if (provisional.current) {
      commitProvisional();
      setState(stateRef.current!);
    }
  }, [commitProvisional, setState]);

  const logUi = useCallback(
    (
      component: string,
      name: string,
      payload: UiEventDraft['payload'],
      stepId?: string,
    ) => {
      // Any interaction (a component tap, a menu) makes a provisional answer final.
      if (provisional.current) {
        commitProvisional();
        setState(stateRef.current!);
      }
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
    [log, commitProvisional, setState],
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

  const { queue, device } = services;
  const report = useCallback(
    (r: ReportInput) => {
      const s = stateRef.current!;
      const frame = s.stack[s.stack.length - 1];
      const before = log.all();
      const [event] = log.append([
        {
          t: 'report',
          questionId: s.questionId,
          stepId: frame?.stepId ?? 'none',
          blockId: r.blockId,
          reason: r.reason,
          source: r.source,
          ...(r.text !== undefined && { text: r.text.slice(0, 500) }),
          ...(r.snapshot && { snapshot: r.snapshot }),
        },
      ]);
      if (queue && device && event?.t === 'report') {
        queue.add({
          kind: 'report',
          id: event.id,
          event,
          context: contextFor(before, device(), {
            ...(r.llmRequestId !== undefined && {
              llmRequestId: r.llmRequestId,
            }),
            ...(r.componentSpec && { componentSpec: r.componentSpec }),
          }),
        });
      }
    },
    [log, queue, device],
  );

  const tutorContext = useCallback((): TutorContext => {
    const st = stateRef.current!;
    const frame = st.stack[st.stack.length - 1];
    const step = frame ? content.steps.get(frame.stepKey) : undefined;
    const situation = buildSituation(planLog.all(), content.catalog);
    return {
      stepKey: frame?.stepKey ?? null,
      stepId: frame?.stepId ?? 'none',
      hintsUsed: frame?.hintLevel ?? 0,
      hintCount: step && 'hints' in step ? step.hints?.length ?? 0 : 0,
      skills: situation?.skills ?? {},
    };
  }, [content, planLog]);

  const logTutor = useCallback(
    (x: TutorLog) => {
      const ctx = tutorContext();
      const st = stateRef.current!;
      log.append([
        {
          t: 'ask',
          questionId: st.questionId,
          stepId: ctx.stepId,
          via: 'field',
          text: x.text.slice(0, 500),
          source: x.answerSource === 'ai' ? 'ai' : 'local',
          snapshot: {
            stepKey: ctx.stepKey ?? 'none',
            hintLevel: ctx.hintsUsed,
            drawer: true,
            ...(x.components && { components: x.components }),
          },
        },
      ]);
      if (x.record) {
        logCall(x.record, ctx.stepId);
      }
      log.append([
        {
          t: 'tutor_answer',
          questionId: st.questionId,
          stepId: ctx.stepId,
          source: x.answerSource,
          ...(x.requestId !== undefined && { requestId: x.requestId }),
          blocks: x.counts.blocks,
          mathVerified: x.counts.verified,
          mathUnverified: x.counts.unverified,
          mathDropped: x.counts.dropped,
        },
      ]);
    },
    [log, logCall, tutorContext],
  );

  const sendFeedback = useCallback(
    (choice: 'disliked' | 'ok' | 'liked', text?: string) => {
      const before = log.all();
      const [event] = log.append([
        {
          t: 'feedback',
          questionId: stateRef.current!.questionId,
          stepId: 'none',
          choice,
          ...(text !== undefined && { text: text.slice(0, 300) }),
        },
      ]);
      if (queue && device && event?.t === 'feedback') {
        queue.add({
          kind: 'feedback',
          id: event.id,
          event,
          context: contextFor(before, device()),
        });
      }
    },
    [log, queue, device],
  );

  // Stable while unchanged: every question card reads it from a context.
  const helpRef = useRef<HelpTargets | null>(null);
  const help = useMemo(() => {
    const next = helpTargetsAt(content, state, planLog, rules);
    const prev = helpRef.current;
    if (
      prev !== null &&
      next !== null &&
      prev.changeMethod === next.changeMethod &&
      prev.simpler === next.simpler
    ) {
      return prev;
    }
    helpRef.current = next;
    return next;
  }, [content, state, planLog, rules]);

  return {
    content,
    state,
    log,
    notes,
    help,
    dispatch,
    logUi,
    logError,
    report,
    studentScrolled,
    tutorContext,
    logTutor,
    sendFeedback,
  };
}
