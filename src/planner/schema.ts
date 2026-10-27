/**
 * Planner output (docs/PLANNER.md). Validated before use; anything invalid -> rules / next authored step.
 * The LLM chooses and phrases; it never supplies answers. Quizzes therefore reference verified
 * content by step id instead of carrying their own question and answer.
 */
import { z } from 'zod';

import { ComponentSpecSchema } from '../components/contract';
import {
  blockBodies,
  ClarifyChoiceSchema,
  RichSchema,
} from '../content/schema';

const Id = z.string().min(1);

/** Blocks the planner may emit; code adds blockId and trust (source "ai_generated"). */
export const PlannerBlockSchema = z.discriminatedUnion('type', [
  blockBodies.tutor_text,
  blockBodies.math,
  blockBodies.component,
  blockBodies.recap,
]);

export const ActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('show_component'),
    component: ComponentSpecSchema,
    instruction: RichSchema,
  }),
  z.strictObject({
    kind: z.literal('explain'),
    blocks: z.array(PlannerBlockSchema).min(1).max(6),
  }),
  z.strictObject({
    kind: z.literal('example'),
    variantId: Id.optional(),
    blocks: z.array(PlannerBlockSchema).min(1).max(6),
  }),
  z.strictObject({
    kind: z.literal('quiz'),
    stepId: Id,
    variantId: Id.optional(),
  }),
  z.strictObject({
    kind: z.literal('hint'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.strictObject({
    kind: z.literal('ask_clarify'),
    options: z.array(RichSchema).min(2).max(3),
    /** What each option means (same order); lets the lesson route the answer. */
    choices: z.array(ClarifyChoiceSchema).min(2).max(3).optional(),
  }),
  z.strictObject({ kind: z.literal('revisit_prerequisite'), skillId: Id }),
  /** Opt-in offer to skip the remaining explanation blocks of the question. */
  z.strictObject({ kind: z.literal('compress_steps') }),
  // Kinds below reference authored content by id (the rules planner uses them).
  z.strictObject({ kind: z.literal('deep_dive'), deepDiveId: Id }),
  z.strictObject({
    kind: z.literal('variant'),
    variantId: Id,
    /** Offered (the student may decline) instead of shown. */
    offer: z.boolean().optional(),
  }),
  /** "Your value + known = sum", computed by the engine from the last answer. */
  z.strictObject({ kind: z.literal('numeric_check') }),
  z.strictObject({ kind: z.literal('self_report') }),
  /** A note for the teacher, queued silently (B4, 2026-10-22: no card any more). */
  z.strictObject({ kind: z.literal('teacher_note') }),
  /** B4: the step's authored guided walk-through (rules only; lines by tap, then the card again). */
  z.strictObject({ kind: z.literal('walkthrough') }),
  /** Nothing special: the next authored step (or the card stays as it is). */
  z.strictObject({ kind: z.literal('continue') }),
]);
export type Action = z.infer<typeof ActionSchema>;
export type ActionKind = Action['kind'];

export const PlannerOutputSchema = z.strictObject({
  diagnosis: z.strictObject({
    skillIds: z.array(Id),
    misconceptionIds: z.array(Id),
    confidence: z.number().min(0).max(1),
    /** Dev-only, never shown to the student. */
    summary: z.string().max(300),
  }),
  avoid: z.array(Id),
  next: ActionSchema,
  followUp: ActionSchema.optional(),
  /** Which rule fired (rules planner); the LLM client sets "llm". */
  ruleId: Id.optional(),
});
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

/** What happened just before the planner is asked. */
export const TriggerSchema = z.enum([
  'wrong',
  'not_sure',
  'correct',
  /** A deep dive or variant ended; its parent question is about to be re-asked. */
  'detour_closed',
  'request',
  'clarify',
  'self_report',
  'offer_response',
  /** Lines: a line the editor cannot read or the engine cannot check (not graded). */
  'line_invalid',
  /** D2: a main step's answer was revealed (end of the ladder); the lesson waits for the planner. */
  'revealed',
]);
export type Trigger = z.infer<typeof TriggerSchema>;

/** A validated planner output as the lesson applies it (and as it is logged). */
export const DecisionSchema = PlannerOutputSchema.extend({
  ruleId: Id,
  source: z.enum(['rules', 'llm', 'fallback']),
  /** Representation the decision shows, if any (for representationsTried / reaction). */
  representation: Id.optional(),
  /** LLM decisions: the request that produced it (reports on AI blocks point here). */
  llmRequestId: Id.optional(),
  /** E2 (rules): the nextMove behind this decision (logged as a `next_move` event). */
  nextMove: z
    .strictObject({
      outcome: Id,
      wanted: z.enum(['move_on', 'repeat', 'step_back']),
      move: z.enum(['move_on', 'repeat', 'step_back']),
      stoppedBy: Id.optional(),
    })
    .optional(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export type PlannerParse =
  | { ok: true; output: PlannerOutput }
  | { ok: false; issues: string[] };

/** Accepts raw model text or an object. Never throws. */
export function parsePlannerOutput(raw: unknown): PlannerParse {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ok: false, issues: ['not valid JSON'] };
    }
  }
  const r = PlannerOutputSchema.safeParse(value);
  return r.success
    ? { ok: true, output: r.data }
    : {
        ok: false,
        issues: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      };
}
