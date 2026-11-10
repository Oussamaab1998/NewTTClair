/**
 * What a hybrid question leaves behind (plan v2, track B), kept in a
 * KeyValueStore:
 * - a QuestionRecord per question: his credited lines by node and their
 *   engine values (the write-up's blanks), his plan order, picks, the words
 *   he found, his recipe, small cases, the components he used (with their
 *   snapshots), the rules he stated and the slips he fixed. Later questions
 *   read it (the «اللي لقيناه» sheet, the carried results), with no number
 *   scraping (it will replace carriedSummary in src/ai/session/carry.ts);
 * - the conductor state, to resume an unfinished question where he left it.
 * A finished record is never replaced by an unfinished run of the same
 * question (replaying it does not erase what later questions build on).
 * Damaged or out-of-date data reads as nothing, never a crash.
 */
import { z } from 'zod';

import type { CaseSpec } from '../ai/session/state';
import { fractionToPlain } from '../engine/format';
import { isExplained } from '../method/findings';
import { evalChain } from '../method/lineChain';
import type { KeyValueStore } from '../storage/kv';
import {
  slipsFixed,
  tappedWords,
  type ComponentUse,
  type FoundInput,
  type RuleStated,
  type SlipFixed,
} from './board';
import type { QuestionCtx } from './conductor/conductor';
import type { ConductorState } from './conductor/types';

export interface QuestionRecord {
  v: 1;
  exerciseId: string;
  questionId: string;
  contentVersion: string;
  updatedAt: number;
  done: boolean;
  planOrder: string[] | null;
  /** His credited line by main-graph node. */
  lines: Record<string, string>;
  /** The engine value of each explained line ("p/q"): what the write-up's blanks show. */
  values: Record<string, string>;
  /** The card he picked right, by pick frame id. */
  picks: Record<string, string>;
  /** Words he found in the statement. */
  taps: string[];
  /** His recipe (card ids, his order), once built. */
  recipe: string[] | null;
  cases: Record<string, CaseSpec>;
  components: ComponentUse[];
  rules: RuleStated[];
  fixed: SlipFixed[];
}

/** What the screen knows besides the conductor state (kept for resume too). */
export interface RecordExtras {
  recipe: string[] | null;
  components: ComponentUse[];
  rules: RuleStated[];
}

export const noExtras = (): RecordExtras => ({
  recipe: null,
  components: [],
  rules: [],
});

const recordKey = (exerciseId: string, questionId: string) =>
  `hybrid.record.v1.${exerciseId}.${questionId}`;
const resumeKey = (exerciseId: string, questionId: string) =>
  `hybrid.resume.v1.${exerciseId}.${questionId}`;

const Str = z.string();
const StrMap = z.record(z.string(), z.string());
const Json = z.record(z.string(), z.unknown());

const ComponentUseSchema = z.object({
  id: Str,
  frameId: Str,
  name: Str,
  props: Json,
  experiment: Json.nullable(),
  caseId: Str.nullable(),
  snapshot: Json.nullable(),
  source: z.enum(['content', 'move']),
});
const RuleSchema = z.object({ frameId: Str, text: Str, turn: z.number() });
const ExtrasSchema = z.object({
  recipe: z.array(Str).nullable(),
  components: z.array(ComponentUseSchema),
  rules: z.array(RuleSchema),
});
const CaseSchema = z.union([
  z.object({ kind: z.literal('box'), n: z.number(), k: z.number() }),
  z.object({
    kind: z.literal('urn'),
    reds: z.number(),
    blacks: z.number(),
    k: z.number(),
    j: z.number(),
  }),
]);

const RecordSchema = z.object({
  v: z.literal(1),
  exerciseId: Str,
  questionId: Str,
  contentVersion: Str,
  updatedAt: z.number(),
  done: z.boolean(),
  planOrder: z.array(Str).nullable(),
  lines: StrMap,
  values: StrMap,
  picks: StrMap,
  taps: z.array(Str),
  recipe: z.array(Str).nullable(),
  cases: z.record(z.string(), CaseSchema),
  components: z.array(ComponentUseSchema),
  rules: z.array(RuleSchema),
  fixed: z.array(z.object({ node: Str, before: Str, after: Str })),
});

/** The conductor state's outline: enough to trust it as the question's own. */
const ConductorOutline = z.object({
  v: z.literal(1),
  exerciseId: Str,
  questionId: Str,
  route: z.array(Str),
  at: z.number().int().min(0),
  done: z.boolean(),
  nodeLines: StrMap,
  picks: StrMap,
  session: z.object({ lines: z.array(z.unknown()), credited: Json }).loose(),
});
const ResumeSchema = z.object({
  v: z.literal(1),
  contentVersion: Str,
  state: ConductorOutline.loose(),
  extras: ExtrasSchema,
});

function read<T>(store: KeyValueStore, key: string, schema: z.ZodType<T>) {
  try {
    const raw = store.getString(key);
    if (raw === undefined) {
      return null;
    }
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // damaged data: as if none
  }
}

/** The engine value of each credited line he explained (the write-up's blanks). */
function valuesOf(
  ctx: QuestionCtx,
  lines: Readonly<Record<string, string>>,
): Record<string, string> {
  const graph = ctx.pack.main?.graph;
  const out: Record<string, string> = {};
  for (const [node, raw] of Object.entries(lines)) {
    const c = evalChain(raw);
    if (graph && c.kind !== 'unreadable' && isExplained(graph, node, raw)) {
      out[node] = fractionToPlain(c.value);
    }
  }
  return out;
}

/** The record of the question now, from the conductor state and the screen's extras. */
export function recordFrom(
  ctx: QuestionCtx,
  s: ConductorState,
  extras: RecordExtras,
  now: number,
): QuestionRecord {
  return {
    v: 1,
    exerciseId: ctx.exerciseId,
    questionId: ctx.questionId,
    contentVersion: ctx.loaded.exercise.contentVersion,
    updatedAt: now,
    done: s.done,
    planOrder: s.planOrder ? [...s.planOrder] : null,
    lines: { ...s.nodeLines },
    values: valuesOf(ctx, s.nodeLines),
    picks: { ...s.picks },
    taps: tappedWords(ctx, s),
    recipe: extras.recipe ? [...extras.recipe] : null,
    cases: { ...s.session.cases },
    components: extras.components.map(c => ({ ...c })),
    rules: extras.rules.map(r => ({ ...r })),
    fixed: slipsFixed(s.session),
  };
}

export function loadRecord(
  store: KeyValueStore,
  exerciseId: string,
  questionId: string,
): QuestionRecord | null {
  return read(
    store,
    recordKey(exerciseId, questionId),
    RecordSchema,
  ) as QuestionRecord | null;
}

/** Saves the record, unless it would replace a finished one with an unfinished run. */
export function saveRecord(store: KeyValueStore, rec: QuestionRecord): boolean {
  const before = loadRecord(store, rec.exerciseId, rec.questionId);
  if (before?.done && !rec.done) {
    return false;
  }
  store.set(recordKey(rec.exerciseId, rec.questionId), JSON.stringify(rec));
  return true;
}

/** The records of the questions before this one, in exam order (those that exist). */
export function earlierRecords(
  store: KeyValueStore,
  exerciseId: string,
  questionIds: readonly string[],
  questionId: string,
): QuestionRecord[] {
  const at = questionIds.indexOf(questionId);
  return questionIds
    .slice(0, Math.max(0, at))
    .map(id => loadRecord(store, exerciseId, id))
    .filter((r): r is QuestionRecord => r !== null);
}

/** A record as a found section's input («اللي لقيناه»). */
export const foundInputOfRecord = (r: QuestionRecord): FoundInput => ({
  questionId: r.questionId,
  lines: r.lines,
  picks: r.picks,
  done: r.done,
  recipeDone: r.recipe !== null,
  fixed: r.fixed,
  rules: r.rules,
});

/** What carries to the next questions, read from records (no number scraping). */
export function carriedFromRecords(
  records: readonly QuestionRecord[],
): string | null {
  const parts = records.flatMap(r => {
    const nodes = Object.keys(r.values).map(
      node => `${node} = ${r.values[node]} (his line ${r.lines[node] ?? ''})`,
    );
    return nodes.length > 0
      ? [`question ${r.questionId}: ${nodes.join('; ')}`]
      : [];
  });
  return parts.length > 0 ? parts.join(' | ') : null;
}

// ---------------------------------------------------------------------------
// Resume.

export function saveResume(
  store: KeyValueStore,
  ctx: QuestionCtx,
  state: ConductorState,
  extras: RecordExtras,
): void {
  store.set(
    resumeKey(ctx.exerciseId, ctx.questionId),
    JSON.stringify({
      v: 1,
      contentVersion: ctx.loaded.exercise.contentVersion,
      state,
      extras,
    }),
  );
}

/**
 * The unfinished question to resume, when it is this question's, of this
 * content version, and every frame of its route still exists.
 */
export function loadResume(
  store: KeyValueStore,
  ctx: QuestionCtx,
): { state: ConductorState; extras: RecordExtras } | null {
  const r = read(
    store,
    resumeKey(ctx.exerciseId, ctx.questionId),
    ResumeSchema,
  );
  if (
    !r ||
    r.contentVersion !== ctx.loaded.exercise.contentVersion ||
    r.state.exerciseId !== ctx.exerciseId ||
    r.state.questionId !== ctx.questionId ||
    r.state.done ||
    r.state.at >= r.state.route.length ||
    !r.state.route.every(id => ctx.frames.has(id)) ||
    // Saved before the question trip (2026-10-30: first no tour, then a
    // tour he built by tapping): the question starts again with its trip.
    !('tour' in r.state) ||
    !('carried' in r.state) ||
    (ctx.tour !== null &&
      (r.state.tour as { kind?: unknown } | null)?.kind !== 'trip')
  ) {
    return null;
  }
  return {
    state: r.state as unknown as ConductorState,
    extras: r.extras as RecordExtras,
  };
}

export function clearResume(
  store: KeyValueStore,
  exerciseId: string,
  questionId: string,
): void {
  store.remove(resumeKey(exerciseId, questionId));
}

/**
 * «ابدا من جديد»: the exercise starts from scratch, so its question records,
 * resume points and the AI-led screen's carried results go (the event log
 * keeps its history).
 */
export function clearExerciseProgress(
  store: KeyValueStore,
  exerciseId: string,
  questionIds: readonly string[],
): void {
  for (const q of questionIds) {
    store.remove(recordKey(exerciseId, q));
    store.remove(resumeKey(exerciseId, q));
    store.remove(`ai.carried.v1.${exerciseId}.${q}`);
  }
}
