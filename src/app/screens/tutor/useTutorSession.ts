/**
 * One AI-led question on screen: creates the tutor (src/ai) with the app's
 * key, money caps and the student's profile, keeps the thread the student
 * sees, and sends his acts. Internet only (owner, 2026-10-29): a failed call
 * shows a retry, nothing else.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { StudentAct } from '../../../ai/checks/autoCheck';
import { AI_TUTOR } from '../../../ai/config';
import { profileDigest } from '../../../ai/profile/digest';
import {
  applySession,
  emptyProfile,
  loadProfile,
  saveProfile,
} from '../../../ai/profile/profile';
import { createBudget } from '../../../ai/session/budget';
import { carriedSummary } from '../../../ai/session/carry';
import type { TurnOutcome } from '../../../ai/session/loop';
import type { Roadmap, SessionState } from '../../../ai/session/state';
import type { AskInput } from '../../../ai/tools/schemas';
import {
  createMessagesTransport,
  type MessagesTransport,
} from '../../../ai/transport/messagesApi';
import { createTutor, exercisePack, type TutorSetup } from '../../../ai/tutor';
import type { RenderBlock, ShownComponent } from '../../../ai/verify/message';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentResult,
  JsonObject,
} from '../../../components/contract';
import { localLlmConfig } from '../../../config/llm';
import type { LoadedExercise } from '../../../content/loader';
import { storeLedger } from '../../../planner/llm/costCap';
import { appDoneRecord } from '../../appDoneRecord';
import type { DoneRecord } from '../../../state/doneParts';
import { appStore } from '../../../storage/appStore';
import { aiPartDone } from './done';
import type { KeyValueStore } from '../../../storage/kv';

/** A component inside a tutor message: live while it is the step, then replayed as he left it. */
export interface ThreadComponent {
  view: ShownComponent;
  done: boolean;
  snapshot: JsonObject | null;
}

export type ThreadItem =
  | {
      id: string;
      kind: 'tutor';
      blocks: RenderBlock[];
      component: ThreadComponent | null;
    }
  | { id: string; kind: 'student'; text: string; line: boolean }
  | { id: string; kind: 'ended'; outcome: string };

export interface TutorView {
  items: ThreadItem[];
  /** What the student is asked to do now (null while waiting or after the end). */
  input: AskInput | null;
  waiting: boolean;
  /** Waiting longer than SLOW_MS. */
  slow: boolean;
  error: { kind: string; retryable: boolean } | null;
  roadmap: Roadmap | null;
  paper: SessionState['paper'];
  /** Balls of a case the student lists (ListBuilder). */
  caseBalls: (caseId: string) => { id: string; label: string }[];
  send: (act: StudentAct, shown: string, line?: boolean) => void;
  retry: () => void;
  /** The live component of the current step reports here. */
  component: {
    onEvent: (e: ComponentEvent) => void;
    onResult: (r: ComponentResult) => void;
    handle: React.RefObject<ComponentHandle | null>;
    /** «كمّلت»: what he did goes to the tutor; the component stays, replayed. */
    finish: (shown: string) => void;
  };
}

export const SLOW_MS = 20_000;
const SPEND_KEY = 'ai.spend.v1';
const carriedKey = (exerciseId: string, questionId: string) =>
  `ai.carried.v1.${exerciseId}.${questionId}`;
const today = () => new Date().toISOString().slice(0, 10);

let seq = 0;
const nextId = () => `t${++seq}`;

export function useTutorSession(o: {
  loaded: LoadedExercise;
  raw: unknown;
  questionId: string;
  /** Tests inject a fake transport and a memory store. */
  transport?: MessagesTransport;
  store?: KeyValueStore;
  doneRecord?: DoneRecord;
}): TutorView {
  const store = o.store ?? appStore();
  const doneRecord = o.doneRecord ?? appDoneRecord();
  const setup = useRef<TutorSetup | null>(null);
  const events = useRef<{ name: string; payload: unknown }[]>([]);
  const result = useRef<{ correct: boolean | null; details: unknown } | null>(
    null,
  );
  const handleRef = useRef<ComponentHandle | null>(null);
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [input, setInput] = useState<AskInput | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<TutorView['error']>(null);
  // Bumped after each outcome: the session state (roadmap, paper) is read on render.
  const [, setTick] = useState(0);

  const handle = useCallback(
    (out: TurnOutcome) => {
      const t = setup.current;
      if (!t) {
        return;
      }
      if (out.kind === 'ask') {
        events.current = [];
        result.current = null;
        setItems(prev => [
          ...prev,
          {
            id: nextId(),
            kind: 'tutor',
            blocks: out.blocks,
            component: out.component
              ? { view: out.component, done: false, snapshot: null }
              : null,
          },
        ]);
        setInput(out.input);
        setError(null);
      } else if (out.kind === 'ended') {
        setItems(prev => [
          ...prev,
          { id: nextId(), kind: 'ended', outcome: out.outcome },
        ]);
        setInput(null);
        // What he found carries to the next questions of this exercise.
        const carried = carriedSummary([t.rt.state]);
        if (carried) {
          store.set(
            carriedKey(t.rt.state.exerciseId, t.rt.state.questionId),
            carried,
          );
        }
        // Solved with his own lines: the question counts as done in the picker.
        const answered = (t.rt.state.credited.main ?? []).length;
        if (out.outcome.startsWith('solved') && answered > 0) {
          doneRecord.note(
            aiPartDone({
              exerciseId: t.rt.state.exerciseId,
              contentVersion: o.loaded.exercise.contentVersion,
              questionId: t.rt.state.questionId,
              answered,
              now: Date.now(),
            }),
          );
        }
        const profile = loadProfile(store) ?? emptyProfile(Date.now());
        saveProfile(
          store,
          applySession(profile, {
            state: t.rt.state,
            outcome: out.outcome,
            summary: out.summary,
            nextTime: out.nextTime,
            now: Date.now(),
          }),
        );
      } else {
        setError({ kind: out.error, retryable: out.retryable });
      }
      setTick(n => n + 1);
    },
    [store, doneRecord, o.loaded],
  );

  const run = useCallback(
    async (call: () => Promise<TurnOutcome>) => {
      setWaiting(true);
      setSlow(false);
      const timer = setTimeout(() => setSlow(true), SLOW_MS);
      try {
        handle(await call());
      } catch {
        setError({ kind: 'network', retryable: true });
      } finally {
        clearTimeout(timer);
        setWaiting(false);
        setSlow(false);
      }
    },
    [handle],
  );

  useEffect(() => {
    const transport =
      o.transport ??
      createMessagesTransport({ apiKey: localLlmConfig().anthropicApiKey });
    const budget = createBudget({
      sessionCapUsd: AI_TUTOR.sessionCapUsd,
      daily: {
        ledger: storeLedger(store, SPEND_KEY, today),
        capUsd: AI_TUTOR.dailyCapUsd,
      },
    });
    const pack = exercisePack(o.loaded, o.raw as never);
    const q = pack.questions.get(o.questionId);
    const profile = loadProfile(store);
    // Earlier questions of this exercise (in exam order) he finished before.
    const order = [...pack.questions.keys()];
    const carried = order
      .slice(0, Math.max(0, order.indexOf(o.questionId)))
      .map(id => store.getString(carriedKey(pack.exerciseId, id)))
      .filter((c): c is string => typeof c === 'string' && c !== '')
      .join(' | ');
    const t = createTutor({
      loaded: o.loaded,
      raw: o.raw as never,
      questionId: o.questionId,
      transport,
      budget,
      profile: profileDigest(profile, q?.notes ?? null),
      carried: carried === '' ? null : carried,
    });
    setup.current = t;
    run(() => t.session.start(t.context));
    // One session per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    (act: StudentAct, shown: string, line = false) => {
      const t = setup.current;
      if (!t || waiting) {
        return;
      }
      setItems(prev => [
        ...prev,
        { id: nextId(), kind: 'student', text: shown, line },
      ]);
      setInput(null);
      run(() => t.session.reply(act));
    },
    [run, waiting],
  );

  const finish = useCallback(
    (shown: string) => {
      let snapshot: JsonObject | null = null;
      try {
        snapshot = handleRef.current?.getStateSnapshot() ?? null;
      } catch {
        snapshot = null;
      }
      // The live component becomes the replay of what he did.
      setItems(prev => {
        const i = prev
          .map(
            x =>
              x.kind === 'tutor' && x.component !== null && !x.component.done,
          )
          .lastIndexOf(true);
        if (i < 0) {
          return prev;
        }
        const item = prev[i]!;
        if (item.kind !== 'tutor' || !item.component) {
          return prev;
        }
        const next = [...prev];
        next[i] = {
          ...item,
          component: { ...item.component, done: true, snapshot },
        };
        return next;
      });
      send(
        {
          kind: 'component',
          events: [...events.current],
          result: result.current,
        },
        shown,
      );
    },
    [send],
  );

  const retry = useCallback(() => {
    const t = setup.current;
    if (t && !waiting) {
      setError(null);
      run(() => t.session.retry());
    }
  }, [run, waiting]);

  const state = setup.current?.rt.state;
  return {
    items,
    input,
    waiting,
    slow,
    error,
    roadmap: state?.roadmap ?? null,
    paper: state?.paper ?? [],
    caseBalls: (caseId: string) => {
      const spec = state?.cases[caseId];
      if (!spec) {
        return [];
      }
      if (spec.kind === 'box') {
        return 'abcdefgh'
          .slice(0, spec.n)
          .split('')
          .map(id => ({ id, label: id }));
      }
      return [
        ...Array.from({ length: spec.reds }, (_, i) => ({
          id: `r${i + 1}`,
          label: `R${i + 1}`,
        })),
        ...Array.from({ length: spec.blacks }, (_, i) => ({
          id: `n${i + 1}`,
          label: `N${i + 1}`,
        })),
      ];
    },
    send,
    retry,
    component: {
      onEvent: e => {
        events.current.push({ name: e.name, payload: e.payload });
      },
      onResult: r => {
        result.current = { correct: r.correct, details: r.details };
      },
      handle: handleRef,
      finish,
    },
  };
}
