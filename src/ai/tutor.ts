/**
 * Opens a tutored question: the exercise pack, the session state seeded with
 * the question's graph and given numbers, the cached system prompt, and the
 * first user message (question id + the student's profile digest). Used by the
 * app screen and by the harness, so both run exactly the same tutor.
 */
import type { LoadedExercise } from '../content/loader';
import { AI_TUTOR } from './config';
import { buildExercisePack, type ExercisePack } from './packs/build';
import { buildCorePrompt, TUTOR_PROMPT_VERSION } from './prompt/core';
import type { Budget } from './session/budget';
import { TutorSession, type CallLog, type TutorConfig } from './session/loop';
import { newSession, type SessionRuntime } from './session/state';
import { toolDefinitions } from './tools/schemas';
import type { MessagesTransport } from './transport/messagesApi';
import type { SystemBlock } from './transport/wire';

export const DEFAULT_TUTOR_CONFIG: TutorConfig = {
  model: AI_TUTOR.model,
  effort: AI_TUTOR.effort,
  maxTokens: AI_TUTOR.maxTokens,
  maxTokensRetry: AI_TUTOR.maxTokensRetry,
  requestTimeoutMs: AI_TUTOR.requestTimeoutMs,
  maxHops: AI_TUTOR.maxHops,
  hopNotice: AI_TUTOR.hopNotice,
  fallbacks: AI_TUTOR.fallbacks,
};

let corePrompt: string | null = null;
/** The core prompt is built once (byte-stable: it is the cached prefix). */
export function core(): string {
  corePrompt ??= buildCorePrompt();
  return corePrompt;
}

const packs = new Map<string, ExercisePack>();
export function exercisePack(
  loaded: LoadedExercise,
  raw: Parameters<typeof buildExercisePack>[1],
): ExercisePack {
  const key = `${loaded.exercise.id}@${loaded.exercise.contentVersion}`;
  let p = packs.get(key);
  if (!p) {
    p = buildExercisePack(loaded, raw);
    packs.set(key, p);
  }
  return p;
}

export function systemBlocks(pack: ExercisePack): SystemBlock[] {
  return [
    {
      type: 'text',
      text: core(),
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
    {
      type: 'text',
      text: pack.text,
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
  ];
}

export function sessionContext(o: {
  exerciseId: string;
  questionId: string;
  label: string;
  profile: string | null;
  /** What he did in the earlier questions of this exercise (results he found, slips). */
  carried?: string | null;
}): string {
  return [
    `Session context (prompt ${TUTOR_PROMPT_VERSION}). Exercise ${o.exerciseId}, question ${o.label} (id "${o.questionId}").`,
    `Student profile: ${o.profile ?? 'new student, no history yet.'}`,
    ...(o.carried
      ? [
          `Earlier questions of this exercise (his own results; he may reuse them): ${o.carried}`,
        ]
      : []),
    `Start question ${o.label}.`,
  ].join('\n');
}

export interface TutorSetup {
  session: TutorSession;
  rt: SessionRuntime;
  pack: ExercisePack;
  context: string;
}

export function createTutor(o: {
  loaded: LoadedExercise;
  raw: Parameters<typeof buildExercisePack>[1];
  questionId: string;
  transport: MessagesTransport;
  budget: Budget;
  config?: TutorConfig;
  profile?: string | null;
  carried?: string | null;
  onCall?: (log: CallLog) => void;
}): TutorSetup {
  const pack = exercisePack(o.loaded, o.raw);
  const q = pack.questions.get(o.questionId);
  if (!q) {
    throw new Error(`no question ${o.questionId} in ${pack.exerciseId}`);
  }
  // Numbers he found in earlier questions are his: the tutor may show them.
  const carriedNumbers = o.carried?.match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) ?? [];
  const rt = newSession(pack.exerciseId, q.questionId, q.main, [
    ...q.given,
    ...carriedNumbers,
  ]);
  const session = new TutorSession({
    system: systemBlocks(pack),
    tools: toolDefinitions(),
    rt,
    pack: q,
    experiment: pack.experiment,
    transport: o.transport,
    budget: o.budget,
    config: o.config ?? DEFAULT_TUTOR_CONFIG,
    ...(o.onCall && { onCall: o.onCall }),
  });
  return {
    session,
    rt,
    pack,
    context: sessionContext({
      exerciseId: pack.exerciseId,
      questionId: q.questionId,
      label: q.label,
      profile: o.profile ?? null,
      carried: o.carried ?? null,
    }),
  };
}
