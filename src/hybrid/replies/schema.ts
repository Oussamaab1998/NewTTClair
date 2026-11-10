/**
 * Prepared replies with his own numbers (plan v2 A4): the shape of a
 * template file (src/content/replyTemplates.<exercise>.json).
 *
 * A template says when it applies (the act the conductor just answered) and
 * what it says, in at most 6 segments, one message block each:
 * - `ar` / `fr`: authored text with NO digit (every number comes from a
 *   filler, never from the text), no bidi control (isolation is added at
 *   render time), no non-Tunisian word, at most one question per template;
 * - `line`: one of his lines, verbatim (a student_line block);
 * - `compare`: two of his lines, one under the other;
 * - `value`: the engine value of one of his lines;
 * - `check`: the multiply-back product of his division (src/method/checks.ts);
 * - `target`: the result the exam gives (the frame's target);
 * - `given`: a value of the exercise that the question's statement shows.
 *
 * His lines are referenced, never copied: `act` (the line of this act),
 * `node:<id>` (his line that earned a node of the question's graph) or
 * `case:<node>` (his right line on a small case the AI tutor made).
 */
import { z } from 'zod';

import { bannedIn } from '../../ai/prompt/lexicon';
import {
  DEEP_REASONS,
  INSTANT_REASONS,
  LIGHT_REASONS,
} from '../conductor/types';

/** ASCII, Arabic-Indic and extended Arabic-Indic digits. */
const DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;
/** Bidi marks, embeddings and isolates (the renderer adds its own). */
const BIDI = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
const QUESTION = /[?\u061F]/g;

const Text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(t => !DIGIT.test(t), {
      message: 'no digit in a template text: numbers come from fillers',
    })
    .refine(t => !BIDI.test(t), { message: 'no bidi control in the text' })
    .refine(t => bannedIn(t).length === 0, {
      message: 'a non-Tunisian word (src/ai/prompt/lexicon.ts)',
    });

export const LineRefSchema = z
  .string()
  .regex(/^(act|node:[a-z][a-z0-9_]{0,30}|case:[a-z][a-z0-9_]{0,30})$/);
export type LineRef = z.infer<typeof LineRefSchema>;

export const SegmentSchema = z.union([
  z.strictObject({ ar: Text(500) }),
  z.strictObject({ fr: Text(400) }),
  z.strictObject({ line: LineRefSchema }),
  z.strictObject({ compare: z.tuple([LineRefSchema, LineRefSchema]) }),
  z.strictObject({ value: LineRefSchema }),
  z.strictObject({ check: LineRefSchema }),
  z.strictObject({ target: z.literal(true) }),
  z.strictObject({ given: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,30}$/) }),
]);
export type Segment = z.infer<typeof SegmentSchema>;

export const ReasonSchema = z.enum([
  ...INSTANT_REASONS,
  ...LIGHT_REASONS,
  ...DEEP_REASONS,
]);

/**
 * What his line of this act is, as the engine read it: credit (a right line
 * showing how), bare (a right value without how), unsimplified, support (a
 * right intermediate), slip, mismatch (an "=" that does not hold), unfinished.
 */
export const LineKindSchema = z.enum([
  'credit',
  'bare',
  'unsimplified',
  'support',
  'slip',
  'mismatch',
  'unfinished',
]);
export type LineKind = z.infer<typeof LineKindSchema>;

/** Every field given must hold. */
export const WhenSchema = z.strictObject({
  /** The method frame (m1.c_fav). */
  frame: z.string().min(1).max(40).optional(),
  /** The card key of a lines frame (total, fav, ratio...), any question. */
  card: z.string().min(1).max(30).optional(),
  reasons: z.array(ReasonSchema).min(1),
  /** The slip of his line (mut.drop_division, or a library id). */
  misconception: z.string().min(1).max(60).optional(),
  line: LineKindSchema.optional(),
  /** The node his line settles, earns or slips on. */
  node: z.string().min(1).max(30).optional(),
  /** Hints used on the frame after this act (1: the first hint was just given). */
  hints: z.number().int().min(0).max(3).optional(),
});
export type When = z.infer<typeof WhenSchema>;

export const ReplyTemplateSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/),
    /** For authors: what it answers and why (English). */
    about: z.string().min(1).max(400),
    when: WhenSchema,
    say: z.array(SegmentSchema).min(1).max(6),
  })
  .refine(
    t =>
      t.say.reduce(
        (n, s) =>
          n +
          ('ar' in s
            ? s.ar.match(QUESTION)?.length ?? 0
            : 'fr' in s
            ? s.fr.match(QUESTION)?.length ?? 0
            : 0),
        0,
      ) <= 1,
    { message: 'one question per reply' },
  );
export type ReplyTemplate = z.infer<typeof ReplyTemplateSchema>;

export const ReplyTemplateFileSchema = z
  .strictObject({
    exerciseId: z.string().min(1),
    contentVersion: z.string().min(1),
    /** A Tunisian maths teacher has read every text (CLAUDE.md). */
    reviewed: z.boolean(),
    templates: z.array(ReplyTemplateSchema).min(1),
  })
  .refine(
    f => new Set(f.templates.map(t => t.id)).size === f.templates.length,
    {
      message: 'template ids are unique',
    },
  );
export type ReplyTemplateFile = z.infer<typeof ReplyTemplateFileSchema>;
