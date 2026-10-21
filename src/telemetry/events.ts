/**
 * Event log schema (docs/DATA.md §2, docs/FEEDBACK_AND_TRUST.md, docs/AMENDMENTS.md A2).
 * Append-only; everything else (state, planner, review) is derived from it.
 * Identifiers are pseudonymous; free text is short and optional (minors' data).
 */
import { z } from 'zod';

import { JsonObjectSchema } from '../components/contract';
import { ClarifyChoiceSchema } from '../content/schema';
import { DecisionSchema, TriggerSchema } from '../planner/schema';

const Id = z.string().min(1);
const ShortText = z.string().max(500);

/** Set on events caused by a planner-driven action (which reaction, which representation). */
export const ReactionSchema = z.strictObject({
  reactionId: Id,
  representation: Id,
});

const base = {
  id: Id,
  ts: z.number().int().nonnegative(),
  sessionId: Id,
  studentId: Id,
  exerciseId: Id,
  /** Content version the session ran on: maps stepId -> skills when content changes. */
  contentVersion: Id,
  questionId: Id,
  stepId: Id,
  durationMs: z.number().nonnegative().optional(),
  reaction: ReactionSchema.optional(),
};
const attempt = z.number().int().min(1);

export const EventSchema = z.discriminatedUnion('t', [
  z.strictObject({
    ...base,
    t: z.literal('answer'),
    // 'task': the result of a task component (EventPicker, LawBuilder); value = its details.
    // 'lines': line-by-line writing; value = the line (wrong) or all lines (done).
    kind: z.enum(['choice', 'typed', 'ordering', 'task', 'lines']),
    value: z.json(),
    correct: z.boolean(),
    misconceptionId: Id.optional(),
    attempt,
    /** Lines: the goal form typed as the first line (no reasoning shown). */
    jumped: z.literal(true).optional(),
  }),
  z.strictObject({
    ...base,
    t: z.literal('not_sure'),
    /** Absent when no deep dive could be shown (already shown, or depth cap): a hint follows. */
    deepDiveId: Id.optional(),
    attempt,
  }),
  // The student reached the end of the hint ladder and asked for the answer (CLAUDE.md rule 6).
  z.strictObject({
    ...base,
    t: z.literal('reveal'),
    hintsUsed: z.number().int().min(0).max(3),
    attempt,
  }),
  z.strictObject({
    ...base,
    t: z.literal('hint'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.strictObject({
    ...base,
    t: z.literal('deepdive'),
    deepDiveId: Id,
    outcome: z.enum(['completed', 'abandoned']),
    miniCorrect: z.boolean().optional(),
    /**
     * Did the deep dive help? Choice / typed minis: right on the first try (= miniCorrect).
     * Task minis: right with at most one wrong try (revealed or 2 wrong tries = did not help).
     */
    helped: z.boolean().optional(),
  }),
  z.strictObject({
    ...base,
    t: z.literal('component_event'),
    component: Id,
    name: Id,
    payload: JsonObjectSchema,
  }),
  z.strictObject({
    ...base,
    t: z.literal('component_error'),
    component: Id,
    reason: z.enum(['unknown_component', 'invalid_props', 'runtime_error']),
    detail: ShortText.optional(),
  }),
  z.strictObject({
    ...base,
    t: z.literal('ask'),
    via: z.enum(['longpress', 'field']),
    mode: z.enum(['explain', 'why', 'example']).optional(),
    quoted: ShortText.optional(),
    text: ShortText.optional(),
    source: z.enum(['local', 'ai']),
    snapshot: JsonObjectSchema.optional(),
  }),
  z.strictObject({
    ...base,
    t: z.literal('mode'),
    value: z.enum(['guided', 'try_alone']),
    result: z.enum(['skip_ok', 'skip_fail']).optional(),
  }),
  z.strictObject({
    ...base,
    t: z.literal('self_report'),
    // dismissed: "not now" on the card; never evidence (docs/DATA.md).
    value: z.enum(['understood', 'guessed', 'dismissed']),
  }),
  // A transfer needs a changed variant of the task, never a mini-question (DATA.md).
  z.strictObject({
    ...base,
    t: z.literal('transfer'),
    skillId: Id,
    correct: z.boolean(),
    variantId: Id,
    hintsUsed: z.number().int().min(0).max(3),
  }),
  z.strictObject({ ...base, t: z.literal('admit'), resultId: Id }),
  // An optional task the student chose not to do. Derived state counts it as
  // neither pass nor fail (docs/DATA.md).
  z.strictObject({
    ...base,
    t: z.literal('skip'),
    reason: z.enum(['knows_it', 'not_now']),
  }),
  z.strictObject({
    ...base,
    t: z.literal('report'),
    blockId: Id,
    contentVersion: Id,
    reason: z.enum(['wrong_math', 'unclear', 'wording', 'bug', 'other']),
    text: ShortText.optional(),
    snapshot: JsonObjectSchema.optional(),
    source: z.enum(['lesson', 'ai', 'component']),
  }),
  z.strictObject({
    ...base,
    t: z.literal('example_round'),
    templateId: Id,
    round: z.number().int().min(1),
    outcome: z.enum(['correct', 'wrong', 'skipped']),
  }),
  // Buttons on the active card: "غيّر الطريقة" and "حاجة أسهل".
  z.strictObject({
    ...base,
    t: z.literal('request'),
    kind: z.enum(['change_method', 'simpler']),
  }),
  // Answer to ask_clarify ("what exactly is unclear?").
  z.strictObject({
    ...base,
    t: z.literal('clarify'),
    choice: ClarifyChoiceSchema,
  }),
  // Opt-in offers: compress steps, a repair picture, a note for the teacher.
  z.strictObject({
    ...base,
    t: z.literal('offer_response'),
    offer: z.enum(['compress', 'repair', 'teacher_note']),
    accepted: z.boolean(),
  }),
  // What the planner decided at a decision point. Replay re-applies it, so a
  // session replays the same even when the decision came from an LLM.
  z.strictObject({
    ...base,
    t: z.literal('plan'),
    trigger: TriggerSchema,
    decision: DecisionSchema,
    /** What the student ended up seeing (provisional rules, swapped for the LLM or not). */
    shownSource: z.enum(['rules', 'llm']).optional(),
  }),
  // One LLM call (or one skipped call): outcome and status class only, never
  // prompt, answer or provider text (docs/PLANNER.md measurement plan).
  z.strictObject({
    ...base,
    t: z.literal('llm_call'),
    requestId: Id,
    purpose: z.enum(['plan', 'tutor']),
    model: Id,
    outcome: z.enum([
      'ok',
      'rejected',
      'stale',
      'timeout',
      'network',
      'rate_limited',
      'no_credit',
      'spend_limit',
      'auth',
      'provider',
      'refused',
      'incomplete',
      'invalid',
      'disabled',
      'capped',
      'config',
    ]),
    statusClass: z.enum(['none', '2xx', '4xx', '5xx']),
    latencyMs: z.number().nonnegative(),
    inputTokens: z.number().int().nonnegative().optional(),
    cachedInputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    /** List-price estimate (models.ts). */
    costUsd: z.number().nonnegative().optional(),
    /** Our own codes: guard / schema reasons, never model text. */
    reasons: z.array(z.string().max(80)).max(10).optional(),
  }),
  // End-of-question feedback card (D19): one tap on a face, optional short note.
  z.strictObject({
    ...base,
    t: z.literal('feedback'),
    choice: z.enum(['disliked', 'ok', 'liked']),
    text: z.string().max(300).optional(),
  }),
  // What the tutor drawer answered with (no text: counts and source only).
  z.strictObject({
    ...base,
    t: z.literal('tutor_answer'),
    source: z.enum(['verified', 'ai', 'saved']),
    requestId: Id.optional(),
    blocks: z.number().int().nonnegative(),
    mathVerified: z.number().int().nonnegative(),
    mathUnverified: z.number().int().nonnegative(),
    mathDropped: z.number().int().nonnegative(),
  }),
  // A note queued for the teacher: ids only, no free text (CLAUDE.md rule 8).
  z.strictObject({
    ...base,
    t: z.literal('teacher_note'),
    noteId: Id,
    skillIds: z.array(Id).max(10),
    misconceptionIds: z.array(Id).max(10),
    ruleId: Id,
  }),
]);
export type Event = z.infer<typeof EventSchema>;
export type EventType = Event['t'];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** An event without the fields the session stamps (id, ts, session, student, exercise). */
export type EventDraft = DistributiveOmit<
  Event,
  'id' | 'ts' | 'sessionId' | 'studentId' | 'exerciseId' | 'contentVersion'
>;
