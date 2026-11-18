/**
 * The teacher's one tool: `teacher_answer`, his whole answer as blocks shown
 * top to bottom. Sent without strict mode, like the tutor's tools (strict
 * decoding looped on quote characters in the 2026-10-29 spike); the input is
 * checked here with zod and a bad one goes back as an is_error result.
 * Sonnet 5.5 refuses a forced tool_choice, so the call runs with
 * tool_choice auto and the prompt names the tool.
 */
import { z } from 'zod';

import { zodToJsonSchema } from '../../planner/llm/strictSchema';
import type { ToolDefinition } from '../transport/wire';

export const TEACHER_TOOL = 'teacher_answer';

export const TeacherBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ar'),
    text: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Tunisian darija, one to three short sentences. French maths words may sit inside (whole words only). No letters, digits, symbols or formulas: those go in a math block.',
      ),
  }),
  z.strictObject({
    type: z.literal('fr'),
    text: z
      .string()
      .min(1)
      .max(300)
      .describe(
        'French: the exam wording, or how a formula is read aloud in French ("p de A inter F").',
      ),
  }),
  z.strictObject({
    type: z.literal('math'),
    latex: z
      .string()
      .min(1)
      .max(160)
      .describe(
        'One formula in LaTeX, shown left to right on its own line. No words.',
      ),
  }),
]);
export type TeacherBlockIn = z.infer<typeof TeacherBlockSchema>;

export const TeacherAnswerSchema = z.strictObject({
  blocks: z.array(TeacherBlockSchema).min(1).max(16),
});
export type TeacherAnswerIn = z.infer<typeof TeacherAnswerSchema>;

const DESCRIPTION =
  'Your whole answer to the student, as blocks shown top to bottom on his phone. Call it once, alone; nothing outside it is shown. Every block is checked before he sees it.';

let definition: ToolDefinition | null = null;

/** Byte-stable (the first part of the cached prefix). */
export function teacherToolDefinition(): ToolDefinition {
  if (!definition) {
    const schema = zodToJsonSchema(TeacherAnswerSchema);
    delete schema.$schema;
    definition = {
      name: TEACHER_TOOL,
      description: DESCRIPTION,
      input_schema: schema,
    };
  }
  return definition;
}
