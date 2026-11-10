/**
 * The question trip (owner, 2026-10-30): a clear map we SHOW him, in simple
 * darija, before he starts a question and any time after («الطريق»): the
 * exercise from above (its questions and how they connect), then this
 * question: what we have, what is asked, the steps with one plain sentence
 * each, the check at the end, and what comes after (the recipe, the similar
 * questions). He builds nothing; «نبداو» starts the first step. One file per
 * exercise (src/content/trips.<exercise>.json), reviewed: false until a
 * Tunisian teacher reads it.
 */
import { z } from 'zod';

import { RichSchema } from '../../content/schema';

const Id = z.string().regex(/^[A-Za-z0-9_.:-]+$/);

/** One line of the map: a plain sentence, maybe a French or math line under it. */
export const TripLineSchema = z.strictObject({
  says: RichSchema,
  /** Shown left to right on its own line (numbers, the exam's words). */
  fr: z.string().optional(),
  /** A result of an earlier question: shown with his own line when he has it. */
  carried: z.strictObject({ from: Id, node: Id }).optional(),
});

export const TripStepSchema = z.strictObject({
  /** The plan card this step is (its line credits it). */
  card: Id,
  title: RichSchema,
  says: RichSchema,
  fr: z.string().optional(),
  /** Found in an earlier question: reused when he has it (the step is done). */
  reuse: z.strictObject({ from: Id, node: Id }).optional(),
});

export const TripQuestionSchema = z.strictObject({
  /** Later questions: what changed since the one before. */
  changed: RichSchema.optional(),
  have: z.array(TripLineSchema).min(1),
  goal: TripLineSchema,
  steps: z.array(TripStepSchema).min(1),
  /** The check at the end. */
  finish: TripLineSchema,
  /** What comes after the steps. */
  after: z
    .array(
      z.strictObject({
        kind: z.enum(['recipe', 'similar']),
        says: RichSchema,
      }),
    )
    .default([]),
});

export const TripOverviewSchema = z.strictObject({
  says: RichSchema,
  questions: z.array(
    z.strictObject({
      id: Id,
      says: RichSchema,
      fr: z.string().optional(),
      /** How it feeds a later question. */
      link: RichSchema.optional(),
    }),
  ),
});

export const TripFileSchema = z.strictObject({
  exerciseId: z.string(),
  contentVersion: z.string(),
  reviewed: z.boolean(),
  overview: TripOverviewSchema,
  questions: z.record(z.string(), TripQuestionSchema),
});

export type TripLine = z.infer<typeof TripLineSchema>;
export type TripStep = z.infer<typeof TripStepSchema>;
export type TripQuestion = z.infer<typeof TripQuestionSchema>;
export type TripOverview = z.infer<typeof TripOverviewSchema>;
export type TripFile = z.infer<typeof TripFileSchema>;
