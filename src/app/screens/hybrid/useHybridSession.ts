/**
 * One hybrid question on screen (plan v2, track B): runs the conductor
 * (src/hybrid/conductor) on each of his acts. A question opens with its
 * trip (src/hybrid/tour: the map, then «نبداو»), started with his results
 * of the earlier questions (their records); the same map is «الطريق» and
 * the strip afterwards. An instant act shows the prepared reply at once (or
 * the Templates' version with his numbers). An act for the AI (light or
 * deep) shows his act at once, then asks the Mover for a move: its blocks
 * are shown, or, with no move, the prepared reply (and applyFallback counts
 * the hint it carries). Only the engine moves the route. After each act the question's record and its resume state are
 * saved; at the end the question counts as done, like the AI-led one.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { StudentAct } from '../../../ai/checks/autoCheck';
import {
  applySession,
  emptyProfile,
  levelOf as levelOfRecord,
  loadProfile,
  NODE_SKILL,
  type SkillLevel,
  saveProfile,
} from '../../../ai/profile/profile';
import type { RenderBlock } from '../../../ai/verify/message';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentResult,
  ComponentSpec,
  JsonObject,
} from '../../../components/contract';
import type { LoadedExercise } from '../../../content/loader';
import { appPaperQuestions } from '../../../content/paper';
import {
  boardSteps,
  carriedOf,
  exerciseSheet,
  foundInputOf,
  foundSheet,
  reusedSteps,
  roadSheet,
  stripOf,
  tappedWords,
  type BoardStep,
  type ComponentUse,
  type ExerciseSheet,
  type FoundQuestion,
  type ReusedStep,
  type RoadSheet,
  type Strip,
} from '../../../hybrid/board';
import {
  act,
  applyFallback,
  applyMove,
  questionCtx,
  startQuestion,
  view,
  type QuestionCtx,
} from '../../../hybrid/conductor/conductor';
import type {
  ActOut,
  ConductorState,
  FrameView,
  Reason,
  Tier,
} from '../../../hybrid/conductor/types';
import {
  noMover,
  noTemplates,
  type Move,
  type Mover,
  type Templates,
} from '../../../hybrid/mover';
import { isTouring, roadView, type RoadView } from '../../../hybrid/tour/tour';
import {
  clearResume,
  earlierRecords,
  foundInputOfRecord,
  loadRecord,
  loadResume,
  noExtras,
  recordFrom,
  saveRecord,
  saveResume,
  type RecordExtras,
} from '../../../hybrid/records';
import type { ReplyPart } from '../../../method/replies';
import type { StudentContent } from '../../../lesson/session/types';
import { appDoneRecord } from '../../appDoneRecord';
import { partKey, type DoneRecord } from '../../../state/doneParts';
import { appStore } from '../../../storage/appStore';
import type { KeyValueStore } from '../../../storage/kv';
import { aiPartDone } from '../tutor/done';
import type { ThreadComponent } from '../tutor/useTutorSession';

/** What the tutor said: the prepared reply, or blocks (a move, or a template with his numbers). */
export type Said =
  | { kind: 'parts'; parts: ReplyPart[] }
  | {
      kind: 'blocks';
      blocks: RenderBlock[];
      component: ThreadComponent | null;
      /** Written by the AI (a move), not prepared. */
      ai: boolean;
    };

/** One act of his and the answer to it (null while the AI is asked). */
export interface Exchange {
  id: string;
  his: StudentContent[];
  /** Null: nothing said (he wrote a line of a similar question, the review comes later). */
  said: Said | null;
  /** The AI is asked; the answer replaces this exchange. */
  pending: boolean;
  tier: Tier;
  reason: Reason;
}

/** One line of the dev overlay: who answered an act, why, and what it cost. */
export interface DevEntry {
  id: string;
  frameId: string;
  tier: Tier;
  reason: Reason;
  by: 'instant' | 'move' | 'prepared';
  costUsd: number;
  ms: number;
}

export interface LiveComponent {
  onEvent: (e: ComponentEvent) => void;
  onResult: (r: ComponentResult) => void;
  handle: React.RefObject<ComponentHandle | null>;
}

export interface HybridView {
  ctx: QuestionCtx;
  state: ConductorState;
  /** The trip is shown (the question's map, before «نبداو»). */
  touring: boolean;
  /** The question's map with where he is (the trip, «الطريق», the strip). */
  road: RoadView;
  /** The steps he has from an earlier question (its label, his line), by card id. */
  reused: Record<string, ReusedStep>;
  /** The frame he is on (null during the trip and after the end). */
  frame: FrameView | null;
  steps: BoardStep[];
  strip: Strip;
  /** Exchanges on the step now (the reply that moved him here first). */
  card: Exchange[];
  /** Free text and its answers (the chat drawer). */
  chat: Exchange[];
  /** An ambiguous division: both readings, he says which he meant. */
  readback: { literal: string; grouped: string } | null;
  waiting: boolean;
  ended: boolean;
  dev: DevEntry[];
  send: (a: StudentAct) => void;
  chooseReadback: (choice: 'grouped' | 'literal') => void;
  /** His level on a node's skill when the question opened. */
  levelOf: (node: string | null) => SkillLevel;
  live: LiveComponent;
  /** «كمّلت» under a live component: a move's (by exchange id) or the step's own picture. */
  finishComponent: (
    from: { exchangeId: string } | { spec: ComponentSpec },
  ) => void;
  /** The sheets, computed when one opens. */
  sheets: {
    exercise: () => ExerciseSheet;
    road: () => RoadSheet;
    found: () => FoundQuestion[];
  };
}

/** Exchanges kept on the step card (older ones scroll off; the sheets keep his work). */
const CARD_MAX = 6;

const ctxCache = new WeakMap<LoadedExercise, Map<string, QuestionCtx | null>>();

/** The conductor's context of a question, built once (null when it has none). */
export function hybridCtx(
  loaded: LoadedExercise,
  raw: unknown,
  questionId: string,
): QuestionCtx | null {
  let byQuestion = ctxCache.get(loaded);
  if (!byQuestion) {
    byQuestion = new Map();
    ctxCache.set(loaded, byQuestion);
  }
  if (!byQuestion.has(questionId)) {
    let ctx: QuestionCtx | null = null;
    try {
      ctx = questionCtx(loaded, raw as never, questionId);
    } catch {
      ctx = null;
    }
    byQuestion.set(questionId, ctx);
  }
  return byQuestion.get(questionId) ?? null;
}

/** Can the hybrid board lead this question (its method frames exist)? */
export const hasConductorFrames = (
  loaded: LoadedExercise,
  raw: unknown,
  questionId: string,
): boolean => (hybridCtx(loaded, raw, questionId)?.frames.size ?? 0) > 0;

let seq = 0;
const nextId = () => `h${++seq}`;

/**
 * His act as he sees it again: his own words, a «ما نعرفش» chip, else what
 * the prepared reply quotes.
 */
function hisOf(a: StudentAct, out: ActOut): StudentContent[] {
  if (a.kind === 'free') {
    return [{ kind: 'text', text: a.text }];
  }
  if (a.kind === 'dont_know') {
    return [{ kind: 'message', message: 'notSure' }];
  }
  return out.reply.flatMap(p => (p.kind === 'student' ? [p.content] : []));
}

/** The prepared reply (without his act, shown apart), or the Templates' version of it. */
function prepared(
  ctx: QuestionCtx,
  state: ConductorState,
  out: ActOut,
  templates: Templates,
): Said | null {
  let blocks: RenderBlock[] | null = null;
  try {
    blocks = templates(ctx, state, out);
  } catch {
    blocks = null;
  }
  if (blocks) {
    return { kind: 'blocks', blocks, component: null, ai: false };
  }
  const parts = out.reply.filter(p => p.kind !== 'student');
  return parts.length > 0 ? { kind: 'parts', parts } : null;
}

const saidOfMove = (m: Move): Said => ({
  kind: 'blocks',
  blocks: m.blocks,
  component: m.component
    ? { view: m.component, done: false, snapshot: null }
    : null,
  ai: true,
});

export function useHybridSession(o: {
  loaded: LoadedExercise;
  raw: unknown;
  questionId: string;
  mover?: Mover;
  templates?: Templates;
  store?: KeyValueStore;
  doneRecord?: DoneRecord;
}): HybridView {
  const ctx = hybridCtx(o.loaded, o.raw, o.questionId);
  if (!ctx) {
    throw new Error(`no hybrid question ${o.questionId}`);
  }
  const mover = o.mover ?? noMover;
  const templates = o.templates ?? noTemplates;
  const [store] = useState(() => o.store ?? appStore());
  // His profile as the question opened (the worksheet's scaffold fading).
  const [profileAtStart] = useState(() => loadProfile(store));
  const levelOf = useCallback(
    (node: string | null): SkillLevel => {
      const skill = node === null ? undefined : NODE_SKILL[node];
      const rec = skill ? profileAtStart?.skills[skill] : undefined;
      return rec ? levelOfRecord(rec) : 'unknown';
    },
    [profileAtStart],
  );
  const [doneRecord] = useState(() => o.doneRecord ?? appDoneRecord());
  // Resume an unfinished question where he left it (after «نبداو» the trip
  // is not shown again); a new one starts with his results of the earlier questions.
  const [start] = useState(() => loadResume(store, ctx));
  const [state, setState] = useState<ConductorState>(() =>
    start
      ? start.state
      : startQuestion(ctx, {
          carried: carriedOf(
            earlierRecords(
              store,
              ctx.exerciseId,
              appPaperQuestions(ctx.loaded.exercise).map(q => q.id),
              ctx.questionId,
            ),
          ),
        }),
  );
  const stateRef = useRef(state);
  const extras = useRef<RecordExtras>(start?.extras ?? noExtras());
  const [components, setComponents] = useState<ComponentUse[]>(
    () => extras.current.components,
  );
  const [card, setCard] = useState<Exchange[]>([]);
  const [chat, setChat] = useState<Exchange[]>([]);
  const [readback, setReadback] = useState<HybridView['readback']>(null);
  const [waiting, setWaiting] = useState(false);
  const [dev, setDev] = useState<DevEntry[]>([]);
  const busy = useRef(false);
  const alive = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const events = useRef<{ name: string; payload: unknown }[]>([]);
  const result = useRef<{ correct: boolean | null; details: unknown } | null>(
    null,
  );
  const handle = useRef<ComponentHandle | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);

  /** The record and the resume state after an act; the end of the question once. */
  const persist = useCallback(
    (prev: ConductorState, next: ConductorState) => {
      const now = Date.now();
      saveRecord(store, recordFrom(ctx, next, extras.current, now));
      if (!next.done) {
        saveResume(store, ctx, next, extras.current);
        return;
      }
      clearResume(store, ctx.exerciseId, ctx.questionId);
      if (prev.done) {
        return;
      }
      // Finished with his own lines: the question counts as done in the picker.
      const answered = (next.session.credited.main ?? []).length;
      if (answered > 0) {
        doneRecord.note(
          aiPartDone({
            exerciseId: ctx.exerciseId,
            contentVersion: ctx.loaded.exercise.contentVersion,
            questionId: ctx.questionId,
            answered,
            now,
          }),
        );
      }
      const profile = loadProfile(store) ?? emptyProfile(now);
      saveProfile(
        store,
        applySession(profile, {
          state: next.session,
          outcome: 'solved',
          summary: '',
          nextTime: '',
          now,
        }),
      );
    },
    [store, doneRecord, ctx],
  );

  /** Puts an exchange on the card (or in the chat); a step that moved starts its card with it. */
  const show = useCallback((x: Exchange, toChat: boolean, moved: boolean) => {
    const put = (list: Exchange[]) => {
      const i = list.findIndex(e => e.id === x.id);
      if (i >= 0) {
        const copy = [...list];
        copy[i] = x;
        return copy;
      }
      return [...list, x].slice(-CARD_MAX);
    };
    const visible = x.said !== null || x.his.length > 0 || x.pending;
    if (toChat) {
      setChat(put);
      if (moved) {
        setCard([]);
      }
    } else if (moved) {
      setCard(visible ? [x] : []);
    } else if (visible) {
      setCard(put);
    }
  }, []);

  const send = useCallback(
    async (a: StudentAct) => {
      if (busy.current || stateRef.current.done) {
        return;
      }
      const before = stateRef.current;
      const frameId =
        view(ctx, before)?.frameId ?? (isTouring(ctx, before) ? 'trip' : '');
      const t0 = Date.now();
      const r = act(ctx, before, a);
      const id = nextId();
      const toChat = a.kind === 'free';
      // «نبداو» starts his first step's card, as a step that moved.
      const moved =
        r.out.advanced || isTouring(ctx, before) !== isTouring(ctx, r.state);
      const his = hisOf(a, r.out);
      const base = {
        id,
        his,
        pending: false,
        tier: r.out.tier,
        reason: r.out.reason,
      };
      const log = (by: DevEntry['by'], costUsd: number) =>
        setDev(d =>
          [
            ...d,
            {
              id,
              frameId,
              tier: r.out.tier,
              reason: r.out.reason,
              by,
              costUsd,
              ms: Date.now() - t0,
            },
          ].slice(-50),
        );
      setReadback(r.out.readback ?? null);
      if (r.out.tier === 'instant') {
        stateRef.current = r.state;
        setState(r.state);
        show(
          { ...base, said: prepared(ctx, r.state, r.out, templates) },
          toChat,
          moved,
        );
        log('instant', 0);
        persist(before, r.state);
        return;
      }
      // For the AI: his act shows now, the answer when the move (or the prepared reply) is here.
      busy.current = true;
      setWaiting(true);
      show({ ...base, said: null, pending: true }, toChat, false);
      const controller = new AbortController();
      abort.current = controller;
      let move: Move | null = null;
      try {
        move = await mover(
          ctx,
          { act: a, out: r.out, state: r.state },
          controller.signal,
        );
      } catch {
        move = null;
      }
      if (!alive.current) {
        return;
      }
      // An AI move never moves the route (a move on a small case keeps the
      // case); with none, the prepared reply's hint counts.
      const next = move
        ? applyMove(r.state, move)
        : applyFallback(r.state, r.out);
      stateRef.current = next;
      setState(next);
      show(
        {
          ...base,
          said: move ? saidOfMove(move) : prepared(ctx, next, r.out, templates),
        },
        toChat,
        moved,
      );
      log(move ? 'move' : 'prepared', move?.costUsd ?? 0);
      persist(before, next);
      busy.current = false;
      setWaiting(false);
    },
    [ctx, mover, templates, show, persist],
  );

  const chooseReadback = useCallback(
    (choice: 'grouped' | 'literal') => {
      const rb = readback;
      if (rb) {
        send({ kind: 'line', raw: rb.literal, readback: choice });
      }
    },
    [readback, send],
  );

  const finishComponent = useCallback(
    (from: { exchangeId: string } | { spec: ComponentSpec }) => {
      let snapshot: JsonObject | null = null;
      try {
        snapshot = handle.current?.getStateSnapshot() ?? null;
      } catch {
        snapshot = null;
      }
      const frameId = view(ctx, stateRef.current)?.frameId ?? '';
      let use: ComponentUse | null = null;
      if ('spec' in from) {
        use = {
          id: nextId(),
          frameId,
          name: from.spec.component,
          props: from.spec.props as Record<string, unknown>,
          experiment: null,
          caseId: null,
          snapshot,
          source: 'content',
        };
      } else {
        const x = card.find(e => e.id === from.exchangeId);
        const c = x?.said?.kind === 'blocks' ? x.said.component : null;
        if (x && c && x.said?.kind === 'blocks') {
          use = {
            id: nextId(),
            frameId,
            name: c.view.name,
            props: c.view.props,
            experiment: c.view.experiment,
            caseId: c.view.caseId,
            snapshot,
            source: 'move',
          };
          // The live component becomes the replay of what he did.
          show(
            {
              ...x,
              said: { ...x.said, component: { ...c, done: true, snapshot } },
            },
            false,
            false,
          );
        }
      }
      if (use) {
        const list = [...extras.current.components, use];
        extras.current = { ...extras.current, components: list };
        setComponents(list);
      }
      const done = { events: [...events.current], result: result.current };
      events.current = [];
      result.current = null;
      send({ kind: 'component', ...done });
    },
    [ctx, card, show, send],
  );

  // The recipe he built is his (records; the found sheet).
  const sendAct = useCallback(
    (a: StudentAct) => {
      if (
        a.kind === 'order' &&
        view(ctx, stateRef.current)?.type === 'recipe'
      ) {
        extras.current = { ...extras.current, recipe: [...a.ids] };
      }
      send(a);
    },
    [ctx, send],
  );

  const steps = useMemo(() => boardSteps(ctx, state), [ctx, state]);
  const road = useMemo(() => roadView(ctx, state), [ctx, state]);
  const touring = isTouring(ctx, state);
  const reused = useMemo(() => reusedSteps(ctx, state), [ctx, state]);
  const strip = useMemo(() => stripOf(steps, road), [steps, road]);
  const frame = useMemo(() => view(ctx, state), [ctx, state]);

  const sheets = useMemo(
    () => ({
      exercise: () => {
        const done = new Set(
          appPaperQuestions(ctx.loaded.exercise)
            .map(q => q.id)
            .filter(
              id =>
                id !== ctx.questionId &&
                (loadRecord(store, ctx.exerciseId, id)?.done === true ||
                  doneRecord.all()[partKey(ctx.exerciseId, id)] !== undefined),
            ),
        );
        const earlierTaps = earlierRecords(
          store,
          ctx.exerciseId,
          appPaperQuestions(ctx.loaded.exercise).map(q => q.id),
          ctx.questionId,
        ).flatMap(r => r.taps);
        return exerciseSheet(ctx.loaded, ctx.questionId, done, [
          ...earlierTaps,
          ...tappedWords(ctx, state),
        ]);
      },
      road: () => roadSheet(ctx, state, road, steps, components),
      found: () =>
        foundSheet(
          ctx.loaded,
          earlierRecords(
            store,
            ctx.exerciseId,
            appPaperQuestions(ctx.loaded.exercise).map(q => q.id),
            ctx.questionId,
          ).map(foundInputOfRecord),
          foundInputOf(ctx, state, extras.current.rules),
        ),
    }),
    [ctx, state, road, steps, components, store, doneRecord],
  );

  return {
    ctx,
    state,
    touring,
    road,
    reused,
    frame,
    steps,
    strip,
    card,
    chat,
    readback,
    waiting,
    ended: state.done,
    dev,
    send: sendAct,
    chooseReadback,
    levelOf,
    live: {
      onEvent: e => {
        events.current.push({ name: e.name, payload: e.payload });
      },
      onResult: r => {
        result.current = { correct: r.correct, details: r.details };
      },
      handle,
    },
    finishComponent,
    sheets,
  };
}
