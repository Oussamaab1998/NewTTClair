/**
 * What the tutor drawer accepts from the LLM: 1-4 blocks, text or math only.
 * Rich text keeps the RTL rules (RichSchema rejects Latin, digits and math
 * symbols inside Arabic runs). Math is checked by the engine afterwards
 * (src/tutor/verify.ts).
 */
import { z } from 'zod';

import { RichSchema } from '../../content/schema';
import type { StructuredFormat } from './client';
import { toStrictSchema, zodToJsonSchema } from './strictSchema';

const Id = z.string().min(1);

export const TutorBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: RichSchema }),
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

let cached: StructuredFormat<TutorOutput> | null = null;

export function tutorFormat(): StructuredFormat<TutorOutput> {
  if (!cached) {
    const original = zodToJsonSchema(TutorOutputSchema);
    cached = {
      name: 'tutor_answer',
      original,
      strict: toStrictSchema(original),
      zod: TutorOutputSchema,
    };
  }
  return cached;
}
