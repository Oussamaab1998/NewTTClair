/**
 * The tutor's tools: one fixed list for every exercise (the list sits at the
 * start of the cached prompt; changing it mid-session breaks the cache and
 * the model's preserved thinking). Inputs are validated here with zod; the
 * tools are sent WITHOUT strict mode (the spike of 2026-10-29 saw strict
 * decoding loop on quote characters for 6,000 tokens), so a bad input comes
 * back to the model as an is_error result naming the problem.
 *
 * Three classes: terminal (ask_student, end_question: end the model's turn),
 * compute (engine results the model reads before writing to the student),
 * bookkeeping (may come in the same turn as ask_student).
 */
import { z } from 'zod';

import { zodToJsonSchema } from '../../planner/llm/strictSchema';
import type { ToolDefinition } from '../transport/wire';

const Id = z.string().regex(/^[A-Za-z0-9_.:-]{1,40}$/);
const LineId = z.string().regex(/^L\d{1,4}$/);

export const BlockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ar'),
    text: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Tunisian darija. French maths words may sit inside (they are isolated left-to-right automatically). No formulas and no LaTeX here: a formula is its own math block.',
      ),
  }),
  z.strictObject({
    type: z.literal('fr'),
    text: z
      .string()
      .min(1)
      .max(400)
      .describe('French text (exam wording, paper lines).'),
  }),
  z.strictObject({
    type: z.literal('math'),
    latex: z
      .string()
      .min(1)
      .max(200)
      .describe('One formula, shown left to right on its own line.'),
  }),
  z.strictObject({
    type: z.literal('student_line'),
    line_id: LineId.describe(
      "Shows the student's own line exactly as he wrote it.",
    ),
  }),
  z.strictObject({
    type: z.literal('compare'),
    line_ids: z
      .tuple([LineId, LineId])
      .describe('Two of his own lines, one under the other.'),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;

export const ExpectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('node'),
    graph: Id.describe('"main" or a case id (C1, C2...).'),
    node: Id.describe(
      'The solution node his line should settle (e.g. total, fav_black, result; for a box case: ordered, orderings, groups).',
    ),
  }),
  z.strictObject({
    kind: z.literal('value'),
    expr: z
      .string()
      .min(1)
      .max(120)
      .describe(
        'An expression the engine evaluates; his line is right when its value matches (e.g. "15/25" with reduced true for a simplification probe).',
      ),
    reduced: z.boolean(),
  }),
]);
export type Expect = z.infer<typeof ExpectSchema>;

const OptionSchema = z.strictObject({
  id: Id,
  text: z.string().min(1).max(160),
});

export const InputSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('free') }),
  z.strictObject({ kind: z.literal('continue') }),
  z.strictObject({
    kind: z.literal('line'),
    expect: ExpectSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal('choice'),
    options: z.array(OptionSchema).min(2).max(4),
  }),
  z.strictObject({
    kind: z.literal('order'),
    cards: z.array(OptionSchema).min(2).max(6),
  }),
  z.strictObject({
    kind: z.literal('tap_word'),
    sentence_fr: z.string().min(1).max(400),
  }),
  z.strictObject({
    kind: z.literal('list'),
    case_id: Id,
    size: z.number().int().min(1).max(4),
  }),
  z.strictObject({
    kind: z.literal('component'),
    name: z.string().min(1).max(40),
    props_json: z.string().min(2).max(4000),
    case_id: Id.nullable().describe(
      'For components that draw the urn (Urn, OutcomeSpace...): a small case id from make_case to draw that case instead of the exercise urn; null = the exercise urn.',
    ),
  }),
  z.strictObject({
    kind: z.literal('formula'),
    expect: z
      .strictObject({
        expr: z
          .string()
          .min(1)
          .max(120)
          .describe(
            'The right formula, written like the student would: letters n and k, C(n,k), ^, * and / (e.g. "C(n,k)*(1/2)^n", "n/2"). The engine compares his formula with it exactly on many values.',
          ),
        vars: z
          .array(z.enum(['n', 'k']))
          .min(1)
          .max(2),
      })
      .nullable(),
  }),
]);
export type AskInput = z.infer<typeof InputSchema>;

export const AskStudentSchema = z.strictObject({
  message: z.array(BlockSchema).min(1).max(6),
  input: InputSchema,
  intent: z
    .enum([
      'route',
      'plan',
      'compute',
      'smaller_case',
      'list',
      'link',
      'predict',
      'test_claim',
      'compare',
      'readback',
      'probe_gap',
      'recap',
      'recipe',
      'paper',
      'similar',
      'other',
    ])
    .default('other'),
});
export type AskStudent = z.infer<typeof AskStudentSchema>;

export const EndQuestionSchema = z.strictObject({
  outcome: z.enum(['solved_alone', 'solved_with_help', 'stopped', 'revealed']),
  summary: z.string().min(1).max(1500),
  next_time: z.string().max(300),
});

export const EvaluateSchema = z.strictObject({
  lines: z.array(z.string().min(1).max(200)).min(1).max(8),
});

export const CheckLineSchema = z.strictObject({
  line: z.string().min(1).max(200),
  expect: ExpectSchema.nullable(),
});

export const ListOutcomesSchema = z.strictObject({
  case_id: Id,
  what: z.enum(['groups', 'ordered']),
  reds_exactly: z.number().int().min(0).max(10).nullable(),
});

export const TestRuleSchema = z.strictObject({
  rule: z.string().min(1).max(80),
  predicts: z.enum(['groups', 'ordered', 'orderings']),
  cases: z
    .array(
      z.strictObject({
        n: z.number().int().min(1).max(12),
        k: z.number().int().min(1).max(6),
      }),
    )
    .min(1)
    .max(4),
});

export const MakeCaseSchema = z.strictObject({
  case: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('box'),
      n: z.number().int().min(2).max(8),
      k: z.number().int().min(1).max(4),
    }),
    z.strictObject({
      kind: z.literal('urn'),
      reds: z.number().int().min(0).max(12),
      blacks: z.number().int().min(0).max(12),
      k: z.number().int().min(1).max(5),
      j: z.number().int().min(0).max(5),
    }),
  ]),
  purpose: z.enum(['smaller', 'same_structure', 'twist']),
});

export const EngineCallSchema = z.strictObject({
  fn: z.string().min(1).max(40),
  args_json: z.string().min(2).max(800),
  on: z.string().min(1).max(40),
});

export const SetRoadmapSchema = z.strictObject({
  stages: z
    .array(z.strictObject({ id: Id, title: z.string().min(1).max(60) }))
    .min(2)
    .max(7),
  current: Id,
  done: z.array(Id).max(7),
  now: z.string().min(1).max(120),
  why: z.string().min(1).max(160),
  next: z.string().min(1).max(120),
});

export const WritePaperSchema = z.strictObject({
  lines: z
    .array(
      z.strictObject({
        fr: z.string().min(1).max(200),
        from_line: LineId.nullable(),
      }),
    )
    .min(1)
    .max(4),
});

export const RecordObservationSchema = z.strictObject({
  kind: z.enum([
    'misconception',
    'gap',
    'strength',
    'habit',
    'language',
    'affect',
  ]),
  skill: z.string().max(60).nullable(),
  slip: z.string().max(60).nullable(),
  note: z.string().min(1).max(240),
  evidence: z.array(LineId).max(6),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const RequestComponentSchema = z.strictObject({
  name: z.string().min(1).max(60),
  student_does: z.string().min(1).max(240),
  why: z.string().min(1).max(240),
  closest: z.string().max(40).nullable(),
});

export type ToolClass = 'terminal' | 'compute' | 'bookkeeping';

interface ToolSpec {
  name: string;
  cls: ToolClass;
  schema: z.ZodType;
  description: string;
}

export const TOOL_SPECS: readonly ToolSpec[] = [
  {
    name: 'ask_student',
    cls: 'terminal',
    schema: AskStudentSchema,
    description:
      'Show the student ONE short message and ONE thing to do, then wait for him. Every word the student reads goes through this tool. Call it alone, after you have read any engine results. He can always also type free text or tap «ما نعرفش» (I don\'t know). For a calculation, use input kind "line" and say in `expect` what it should settle: the engine checks it and you get the verdict with his answer.',
  },
  {
    name: 'end_question',
    cls: 'terminal',
    schema: EndQuestionSchema,
    description:
      'Close the question once he finished it (or stopped). The summary (English, for his teacher and his next session) says what he did alone, what needed help, which slips he made and fixed, and what to revisit.',
  },
  {
    name: 'evaluate',
    cls: 'compute',
    schema: EvaluateSchema,
    description:
      'Exact value of each side of calculation lines ("10*9*8/(3*2*1)=120", "C(10,3)", "2^3", "990/3*2*1"). Use it before you show any number the student has not written himself, and to see both readings of an ambiguous line.',
  },
  {
    name: 'check_line',
    cls: 'compute',
    schema: CheckLineSchema,
    description:
      'Check a line against a solution graph without asking the student (e.g. to compare two of his lines, or to see what a slip gives). Same verdict format as his own lines.',
  },
  {
    name: 'list_outcomes',
    cls: 'compute',
    schema: ListOutcomesSchema,
    description:
      'Every draw of a small case, as ball labels (at most 60): the groups (drawn together) or the ordered draws, optionally only those with exactly `reds_exactly` red balls. For you to know; let the student list them himself.',
  },
  {
    name: 'test_rule',
    cls: 'compute',
    schema: TestRuleSchema,
    description:
      'Test a rule the student stated on new cases before you ask him to: the rule is an expression in n (balls), k (drawn), o (ordered draws n*(n-1)*...), f (k!). Returns what the rule predicts, the true count, whether it holds, and whether the case is small enough to list by hand.',
  },
  {
    name: 'make_case',
    cls: 'compute',
    schema: MakeCaseSchema,
    description:
      'Create a small case (a box of letters a, b, c... or a red/black urn) for a repair path or a similar question. Returns its id (C1, C2...), its private values, the slips that would give the right number by coincidence (avoid such a case), and its numbers already seen this session (avoid reusing them).',
  },
  {
    name: 'engine_call',
    cls: 'compute',
    schema: EngineCallSchema,
    description:
      'A named engine computation (outcomeCount, count, probability, choose, oneMinus, lawSum, product) on the exercise ("exercise") or on an urn case id. args_json is the call\'s arguments as JSON.',
  },
  {
    name: 'set_roadmap',
    cls: 'bookkeeping',
    schema: SetRoadmapSchema,
    description:
      'The route shown at the top of the screen: the stages of this question, the current one, and one line each for now / why / next (darija, no digits, never the how).',
  },
  {
    name: 'write_paper',
    cls: 'bookkeeping',
    schema: WritePaperSchema,
    description:
      'Add lines to his exam write-up (French, as on the exam paper). Each line carries numbers from one of his own engine-credited lines (from_line), or none.',
  },
  {
    name: 'record_observation',
    cls: 'bookkeeping',
    schema: RecordObservationSchema,
    description:
      'Note what you learned about this student (a misconception, an old-year gap, a strength, a habit, how he writes), citing his line ids as evidence. It goes into his profile for the next sessions.',
  },
  {
    name: 'request_component',
    cls: 'bookkeeping',
    schema: RequestComponentSchema,
    description:
      'When no existing component fits what you need him to do, describe the one you wish existed. Continue with text meanwhile.',
  },
];

export const TOOL_BY_NAME: ReadonlyMap<string, ToolSpec> = new Map(
  TOOL_SPECS.map(t => [t.name, t]),
);

/** Exact, then case-insensitive (Sonnet 5.5 occasionally changes letter case). */
export function toolNamed(name: string): ToolSpec | undefined {
  return (
    TOOL_BY_NAME.get(name) ??
    TOOL_SPECS.find(t => t.name.toLowerCase() === name.toLowerCase())
  );
}

/** The API tool list: sorted by name, byte-stable. */
export function toolDefinitions(): ToolDefinition[] {
  return [...TOOL_SPECS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(t => {
      const schema = zodToJsonSchema(t.schema);
      delete schema.$schema;
      return {
        name: t.name,
        description: t.description,
        input_schema: schema,
      };
    });
}
