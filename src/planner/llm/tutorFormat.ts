/**
 * What the tutor drawer accepts from the LLM: 1-4 blocks, text or math only.
 * This schema checks the shape only; the RTL rules (Latin, digits and
 * formulas out of Arabic runs) are applied per block in src/tutor/verify.ts,
 * which isolates what it can and drops a block it cannot fix, so one bad
 * block no longer loses the whole answer. Math is checked by the engine there.
 * `prepare`: the model may fill optional fields with "" (live run,
 * 2026-10-22); "" and empty runs mean absent, as in the planner's wire format.
 */
import { z } from 'zod';

import { RichShapeSchema } from '../../content/schema';
import type { StructuredFormat } from './client';
import { toStrictSchema, zodToJsonSchema } from './strictSchema';

const Id = z.string().min(1);

export const TutorBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: RichShapeSchema }),
  z.strictObject({
    type: z.literal('math'),
    latex: z.string().min(1).max(160),
    /** Claims a value of dynamic.verifiedSoFar.values (checked by the engine). */
    resultId: Id.optional(),
  }),
]);
export type TutorBlock = z.infer<typeof TutorBlockSchema>;

export const TutorOutputSchema = z.strictObject({
  blocks: z.array(TutorBlockSchema).min(1).max(4),
  needsTeacher: z.boolean(),
});
export type TutorOutput = z.infer<typeof TutorOutputSchema>;

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const blank = (v: unknown) => typeof v === 'string' && v.trim() === '';

function cleanRich(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (Array.isArray(r.ar)) {
    const runs = r.ar.filter(
      run => !(isObj(run) && Object.values(run).every(blank)),
    );
    if (runs.length > 0) {
      out.ar = runs;
    }
  } else if (r.ar !== undefined) {
    out.ar = r.ar;
  }
  for (const k of ['fr', 'math'] as const) {
    if (r[k] !== undefined && !blank(r[k])) {
      out[k] = r[k];
    }
  }
  for (const [k, v] of Object.entries(r)) {
    if (!['ar', 'fr', 'math'].includes(k)) {
      out[k] = v;
    }
  }
  return out;
}

/** "" in fr / math / resultId, empty runs and an empty run list mean absent. */
export function cleanTutorAnswer(value: unknown): unknown {
  if (!isObj(value) || !Array.isArray(value.blocks)) {
    return value;
  }
  return {
    ...value,
    blocks: value.blocks.map(b => {
      if (!isObj(b)) {
        return b;
      }
      if (b.type === 'text' && isObj(b.text)) {
        return { ...b, text: cleanRich(b.text) };
      }
      if (b.type === 'math' && blank(b.resultId)) {
        const rest = { ...b };
        delete rest.resultId;
        return rest;
      }
      return b;
    }),
  };
}

let cached: StructuredFormat<TutorOutput> | null = null;

export function tutorFormat(): StructuredFormat<TutorOutput> {
  if (!cached) {
    const original = zodToJsonSchema(TutorOutputSchema);
    cached = {
      name: 'tutor_answer',
      original,
      strict: toStrictSchema(original),
      zod: TutorOutputSchema,
      prepare: cleanTutorAnswer,
    };
  }
  return cached;
}
