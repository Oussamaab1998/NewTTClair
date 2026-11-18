/**
 * The help of an exercise (student test 2026-11-18, docs/STUDENT_TEST_PLAN.md):
 * - `ladders`: for every step of a question where he writes a line or picks
 *   a card, the three levels «ما نعرفش» opens, one per press. Each level
 *   GIVES something and never asks: (1) the idea, (2) a small example solved
 *   in front of him, (3) the method on the exercise's own numbers, with a
 *   line to fill. After the third level, «ورّيني الحل الكامل» shows the
 *   step's solution (the conductor's methodRevealRich).
 * - `glossary`: the symbols and the paper's French words he can long-press
 *   to ask the teacher «شنوّة معناها؟»; an entry answers at once, free.
 *
 * Every text is darija with French maths terms in `fr` runs, digits and
 * formulas in `math` (RichSchema refuses them inside Arabic runs). No text
 * ends with a question: the levels give, the step's own input is where he
 * acts. All `reviewed: false` until a Tunisian teacher reads them.
 */
import { z } from 'zod';

import { ComponentSpecSchema } from '../../components/contract';
import { RichSchema } from '../schema';

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);
const Latex = z.string().min(1);

/** One symbol and what it says in the story («A»: «يقرا في النادي»). */
export const LegendRowSchema = z.strictObject({
  math: Latex,
  text: RichSchema,
});

/** Level 1: the idea of the step, in words, with the symbols it uses. */
export const IdeaSchema = z.strictObject({
  /** One to three short paragraphs. */
  text: z.array(RichSchema).min(1).max(3),
  /** The symbols of the step, one row each (p(A∩F): A, ∩, F). */
  legend: z.array(LegendRowSchema).max(4).optional(),
});

/** One solved line of the small example: a short sentence, then the line. */
export const ExampleLineSchema = z.strictObject({
  say: RichSchema.optional(),
  /** Left to right; a numeric equality must be true (help.test.ts checks it). */
  math: Latex,
});

/**
 * Level 2: a small example solved in front of him, with numbers of its own
 * (never a value of the exercise he has not found), then the rule it shows
 * and the bridge back to the exercise.
 */
export const ExampleSchema = z.strictObject({
  /** The situation, one or two sentences. */
  story: z.array(RichSchema).min(1).max(2),
  legend: z.array(LegendRowSchema).max(4).optional(),
  /** A picture drawn read-only (a ProbabilityTree with counts); optional. */
  figure: ComponentSpecSchema.optional(),
  lines: z.array(ExampleLineSchema).min(1).max(4),
  /** What the example shows, highlighted («نضربو الفرع الأوّل في الثاني»). */
  rule: RichSchema,
  /** Back to the exercise («توّا نفس الشي في الشجرة متاعنا»). */
  bridge: RichSchema,
});

/**
 * Level 3's line to fill (a step where he writes a line): the slots go into
 * `template` in order and the line is judged like any line he types.
 */
export const FillSchema = z.strictObject({
  /** LaTeX shown before the slots, not part of his line (p(A \cap F) =). */
  lead: Latex.optional(),
  /** His line with `{}` for each slot, as the board reads lines: `{}*{}={}`. */
  template: z.string().min(3).regex(/\{\}/),
  /** Values he can drop into a slot (any slot can also be typed). */
  chips: z.array(z.string().min(1)).min(1).max(6),
  /** The right value of each slot (tests only, never shown). */
  answer: z.array(z.string().min(1)).min(1),
});

/** Level 3: the method on the exercise's numbers. */
export const MethodSchema = z.strictObject({
  text: z.array(RichSchema).min(1).max(3),
  /** The general formula, left to right (p(A \cap F) = p(A) \times p(F/A)). */
  formula: Latex.optional(),
  /** Steps where he writes a line: the line to fill. Card steps: none (the cards are his answer). */
  fill: FillSchema.optional(),
});

export const LadderSchema = z.strictObject({
  idea: IdeaSchema,
  example: ExampleSchema,
  method: MethodSchema,
});
export type Ladder = z.infer<typeof LadderSchema>;
export type LadderLevel = 1 | 2 | 3;

/** A symbol or a French word of the paper, explained at once on a long press. */
export const GlossaryEntrySchema = z.strictObject({
  id: Id,
  /**
   * What he long-presses: LaTeX as the screen shows it (p(A \cap F)) or the
   * paper's French words (Montrer que). Compared without spaces.
   */
  match: z.array(z.string().min(1)).min(1),
  /** What it means («الزوز مع بعض»), one to three short paragraphs. */
  meaning: z.array(RichSchema).min(1).max(3),
  /** How it is read aloud in French («p de A inter F»). */
  reading: z.string().min(1).optional(),
  /** Why it is used in this exercise (never a result he has not found). */
  use: z.array(RichSchema).min(1).max(2).optional(),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const HelpFileSchema = z.strictObject({
  exerciseId: Id,
  contentVersion: z.string().min(1),
  reviewed: z.literal(false),
  /** By question id, then by the step's frame id (mt1.c_path). */
  ladders: z.record(Id, z.record(Id, LadderSchema)),
  glossary: z.array(GlossaryEntrySchema),
});
export type HelpFile = z.infer<typeof HelpFileSchema>;
