/**
 * The two events every probability2 component emits besides its own
 * (docs/COMPONENTS_PROBABILITY_V2.md 3.2, with the product owner's changes 2 and 4):
 *
 * - `explored { why, how }`: the engagement criterion was met ("3_positions",
 *   "box_expanded") or the student left the gate ("not_sure", "reveal"). It
 *   opens the component's gate. `how: 'skipped'` is logged for an exit and
 *   never counts as understanding: nothing derives skill evidence from this event.
 * - `finding { findingId, numbers, route, how, correct, calc? }`: what the
 *   student found, for a future "what we found" sheet. Ids, exact numbers and
 *   short tokens only, no free text. `calc` holds LaTeX lines built by the
 *   engine (`src/engine/calcLines.ts`) from the student's own numbers.
 */
import { z } from 'zod';

import { RatSchema } from '../../engine/rationalFormat';
import { parseLatexSubset } from '../../lesson/math/latexSubset';

export const FINDING_HOW = ['found', 'helped', 'revealed', 'skipped'] as const;
export type FindingHow = (typeof FINDING_HOW)[number];

/** Names of the numbers in a finding: boxes, perBox, stage1. */
const NumberKey = z.string().regex(/^[a-z][A-Za-z0-9_]*$/);

/** One action token: `verb` or `verb:detail`, ASCII, at most 48 characters. */
const RouteToken = z
  .string()
  .max(48)
  .regex(/^[a-z][a-z_]*(?::[\x21-\x7e]+)?$/);

const CalcLine = z
  .string()
  .min(1)
  .max(200)
  .refine(
    s => {
      try {
        parseLatexSubset(s);
        return !/[؀-ۿ]/.test(s);
      } catch {
        return false;
      }
    },
    { message: 'must parse with the native math renderer and hold no Arabic' },
  );

const FindingObject = z.strictObject({
  findingId: z.string().regex(/^[a-z][a-z0-9]*\.[a-z][a-z0-9_]*$/),
  numbers: z
    .record(NumberKey, RatSchema)
    .refine(r => Object.keys(r).length <= 12, { message: 'at most 12 numbers' }),
  route: z.array(RouteToken).max(12),
  how: z.enum(FINDING_HOW),
  /** null when nothing was graded (revealed, skipped, an exploration with no answer). */
  correct: z.boolean().nullable(),
  calc: z.array(CalcLine).max(6).optional(),
});
/** A revealed or skipped finding never claims to be correct: it is not understanding. */
export const FindingPayloadSchema = FindingObject.refine(
  f => !((f.how === 'revealed' || f.how === 'skipped') && f.correct === true),
  { message: 'a revealed or skipped finding cannot be correct', path: ['correct'] },
);
/** What `makeFinding` returns: plain JSON, with `calc` absent (never undefined) when there is none. */
export type FindingPayload = {
  findingId: string;
  numbers: Record<string, string>;
  route: string[];
  how: FindingHow;
  correct: boolean | null;
  calc?: string[];
};
/** What a component hands to `makeFinding` (calc may be left out). */
export type FindingInput = z.input<typeof FindingPayloadSchema>;

/** A validated, JSON-safe finding payload (no undefined, so the event log accepts it). */
export function makeFinding(input: FindingInput): FindingPayload {
  const { calc, ...rest } = FindingPayloadSchema.parse(input);
  return calc === undefined ? rest : { ...rest, calc };
}

export const ExploredPayloadSchema = z.strictObject({
  why: z.string().regex(/^[a-z0-9][a-z0-9_]*$/),
  how: z.enum(['done', 'skipped']),
});
export type ExploredPayload = z.output<typeof ExploredPayloadSchema>;

export function makeExplored(why: string, how: ExploredPayload['how']): ExploredPayload {
  return ExploredPayloadSchema.parse({ why, how });
}
