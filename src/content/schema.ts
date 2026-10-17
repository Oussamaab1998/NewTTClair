/**
 * Content schema (docs/DATA.md §1 + docs/AMENDMENTS.md A1).
 * Every step, block, deep dive and misconception has a stable `blockId` and `trust` metadata.
 * Answers are engine calls or references, never hand-copied values.
 */
import { z } from 'zod';

import {
  ComponentNameSchema,
  ComponentSpecSchema,
} from '../components/contract';
import { ExperimentSchema } from '../engine/calls';
import { parseExpression } from '../engine/expression';
import { ArRunsSchema, findRunIssues } from '../lesson/rich/runs';

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);
const ARABIC = /[؀-ۿ]/;

export const RichSchema = z
  .strictObject({
    ar: ArRunsSchema.optional(),
    fr: z.string().min(1).optional(),
    math: z.string().min(1).optional(),
  })
  .superRefine((rich, ctx) => {
    if (
      rich.ar === undefined &&
      rich.fr === undefined &&
      rich.math === undefined
    ) {
      ctx.addIssue({ code: 'custom', message: 'Rich needs ar, fr or math' });
    }
    // Formulas, digits and Latin words never sit inside Arabic runs (CLAUDE.md RTL rules).
    for (const issue of rich.ar ? findRunIssues(rich.ar) : []) {
      ctx.addIssue({
        code: 'custom',
        path: ['ar', issue.index],
        message: issue.problem,
      });
    }
    if (rich.math !== undefined && ARABIC.test(rich.math)) {
      ctx.addIssue({
        code: 'custom',
        path: ['math'],
        message: 'arabic_in_math',
      });
    }
  });
export type Rich = z.infer<typeof RichSchema>;

export const TrustSchema = z
  .strictObject({
    reviewed: z.boolean(),
    reviewedBy: z.string().min(1).optional(),
    reviewedAt: z.iso.date().optional(),
    contentVersion: z.string().min(1),
    source: z.enum(['authored', 'ai_generated', 'engine']),
    status: z.enum(['ok', 'under_review']),
  })
  .refine(
    t =>
      !t.reviewed || (t.reviewedBy !== undefined && t.reviewedAt !== undefined),
    {
      message: 'reviewed content needs reviewedBy and reviewedAt',
    },
  );
export type Trust = z.infer<typeof TrustSchema>;

const envelope = { blockId: Id, trust: TrustSchema };

export const EngineCallSchema = z.strictObject({
  fn: z.string().min(1),
  args: z.record(z.string(), z.json()),
});

export const AnswerSpecSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('fraction'), compute: EngineCallSchema }),
  z.strictObject({
    type: z.literal('expression'),
    equivalentTo: z
      .string()
      .refine(s => parseExpression(s, { variables: ['x', 'n'] }).ok, {
        message: 'equivalentTo must parse with the safe expression parser',
      }),
  }),
  z.strictObject({ type: z.literal('option'), id: Id }),
  z.strictObject({ type: z.literal('set'), compute: EngineCallSchema }),
  z.strictObject({ type: z.literal('order'), ids: z.array(Id).min(2) }),
]);
export type AnswerSpec = z.infer<typeof AnswerSpecSchema>;

/** A constant numeric expression in the safe parser's syntax ("3/10", "0,7"). */
const NumericValue = z
  .string()
  .refine(s => parseExpression(s, { variables: [], constants: [] }).ok, {
    message: 'value must be a constant numeric expression',
  });

/**
 * `value` makes an option numeric: the loader derives the label from it when
 * `label` is absent, and finds the correct option by engine value.
 */
export const OptionSchema = z
  .strictObject({
    id: Id,
    label: RichSchema.optional(),
    value: NumericValue.optional(),
    /** A set of integers (answers of type `set`); the label is derived when absent. */
    set: z.array(z.number().int()).min(1).optional(),
    misconceptionId: Id.optional(),
    feedback: RichSchema.optional(),
  })
  .refine(
    o => o.label !== undefined || o.value !== undefined || o.set !== undefined,
    { message: 'option needs a label, a value or a set' },
  );

/** A known wrong typed value, so it becomes data (misconception) and not only a message. */
export const WrongAnswerSchema = z.strictObject({
  value: NumericValue,
  misconceptionId: Id.optional(),
  feedback: RichSchema.optional(),
});

/** Verified answers for the long-press menu (اشرحلي / علاش؟ / مثال). */
export const AsksSchema = z.strictObject({
  explain: z.array(RichSchema).min(1).optional(),
  why: z.array(RichSchema).min(1).optional(),
  example: z.array(RichSchema).min(1).optional(),
});
export type Asks = z.infer<typeof AsksSchema>;

/** Starter chip of the ask field, with a verified canned answer. */
export const AskChipSchema = z.strictObject({
  id: Id,
  label: RichSchema,
  answer: z.array(RichSchema).min(1),
});

/** Feedback shown when a task component reports this misconception. */
export const DiagnosisSchema = z.strictObject({
  misconceptionId: Id,
  feedback: RichSchema,
});

/** integer: digits; signed: digits and minus; probability: digits, fraction bar, comma. */
export const KeypadKindSchema = z.enum(['integer', 'signed', 'probability']);
export type KeypadKind = z.infer<typeof KeypadKindSchema>;

/**
 * Numeric check with the student's own value (TUTOR_BEHAVIOR.md principle 4).
 * `complement_sum`: shows "your value + known = sum" (sum computed by the engine);
 * the text says what the sum should be. Never states the answer itself.
 */
export const NumericCheckSchema = z.strictObject({
  kind: z.literal('complement_sum'),
  /** Id in `values` (engine-computed). */
  known: Id,
  text: RichSchema,
});
export type NumericCheck = z.infer<typeof NumericCheckSchema>;

const stepBase = { id: Id, ...envelope, skills: z.array(Id) };
const asked = {
  prompt: RichSchema,
  hints: z.array(RichSchema).max(3).optional(),
  deepDiveId: Id.optional(),
  check: NumericCheckSchema.optional(),
};

const ChoiceStep = z.strictObject({
  ...stepBase,
  ...asked,
  kind: z.literal('choice'),
  options: z.array(OptionSchema).min(2).max(4),
  answer: AnswerSpecSchema,
});
const TypedStep = z.strictObject({
  ...stepBase,
  ...asked,
  kind: z.literal('typed'),
  answer: AnswerSpecSchema,
  wrongAnswers: z.array(WrongAnswerSchema).optional(),
  /** Keys shown; default from the answer's engine call (loader `keypadFor`). */
  keypad: KeypadKindSchema.optional(),
});

// Task components (registry kind "task") block the path like a question and
// use prompt / hints / deepDiveId / diagnoses; visual components ignore them.
const ComponentStep = z.strictObject({
  ...stepBase,
  kind: z.literal('component'),
  component: ComponentSpecSchema,
  prompt: RichSchema.optional(),
  hints: z.array(RichSchema).max(3).optional(),
  deepDiveId: Id.optional(),
  /** Feedback for a misconception hint returned by the component. */
  diagnoses: z.array(DiagnosisSchema).optional(),
  /** Optional practice: the card offers "skip" (logged with a reason). */
  optional: z.boolean().optional(),
  /** EventPicker: once solved (or revealed), fill this value's cell in the progressive LawBuilder with this blockId. */
  fillsLaw: Id.optional(),
});

export const StepSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...stepBase,
      kind: z.literal('text'),
      text: RichSchema,
      asks: AsksSchema.optional(),
    }),
    z.strictObject({
      ...stepBase,
      kind: z.literal('math'),
      latex: z.string().min(1),
    }),
    ComponentStep,
    ChoiceStep,
    TypedStep,
    z.strictObject({
      ...stepBase,
      ...asked,
      kind: z.literal('ordering'),
      options: z.array(OptionSchema).min(2),
      answer: AnswerSpecSchema,
    }),
    z.strictObject({
      ...stepBase,
      kind: z.literal('deepdive'),
      deepDiveId: Id,
    }),
  ])
  .superRefine((step, ctx) => {
    if (!('options' in step)) {
      if (
        step.kind === 'typed' &&
        !['fraction', 'expression', 'set'].includes(step.answer.type)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['answer'],
          message: 'typed answer must be computed',
        });
      }
      return;
    }
    const ids = step.options.map(o => o.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'duplicate option id',
      });
    }
    const a = step.answer;
    if (step.kind === 'choice' && a.type === 'order') {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'choice cannot have an order answer',
      });
    }
    if (a.type === 'option' && !ids.includes(a.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer', 'id'],
        message: 'answer is not one of the options',
      });
    }
    if (
      step.kind === 'ordering' &&
      (a.type !== 'order' ||
        [...a.ids].sort().join() !== [...ids].sort().join())
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'order must list every option once',
      });
    }
  });
export type Step = z.infer<typeof StepSchema>;

export const StepGroupSchema = z.strictObject({
  id: Id,
  steps: z.array(StepSchema).min(1),
});

export const QuestionSchema = z.strictObject({
  id: Id,
  goal: RichSchema,
  expected: Id,
  uses: z.array(Id),
  methodId: Id.optional(),
  groups: z.array(StepGroupSchema).min(1),
  probe: z
    .strictObject({ prompt: RichSchema, answer: AnswerSpecSchema })
    .optional(),
  writeup: z.strictObject({
    elements: z.array(z.string().min(1)),
    modelFr: z.array(z.string().min(1)),
  }),
  askChips: z.array(AskChipSchema).max(4).optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

/** Block bodies without the envelope; the planner emits a subset of these (code adds blockId + trust). */
export const blockBodies = {
  tutor_text: z.strictObject({
    type: z.literal('tutor_text'),
    text: RichSchema,
    longPress: z.boolean().optional(),
    asks: AsksSchema.optional(),
  }),
  math: z.strictObject({ type: z.literal('math'), latex: z.string().min(1) }),
  component: z.strictObject({
    type: z.literal('component'),
    spec: ComponentSpecSchema,
  }),
  recap: z.strictObject({
    type: z.literal('recap'),
    items: z.array(RichSchema).min(1),
  }),
};

const FlatBlockSchema = z.discriminatedUnion('type', [
  blockBodies.tutor_text.extend(envelope),
  blockBodies.math.extend(envelope),
  blockBodies.component.extend(envelope),
  blockBodies.recap.extend(envelope),
  z.strictObject({
    ...envelope,
    type: z.literal('student_bubble'),
    text: RichSchema,
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('feedback'),
    kind: z.enum(['success', 'warning', 'danger', 'info']),
    text: RichSchema,
    source: z.enum(['lesson', 'ai']).optional(),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('question'),
    question: QuestionSchema,
  }),
  z.strictObject({ ...envelope, type: z.literal('self_report') }),
  z.strictObject({ ...envelope, type: z.literal('skip_choice'), groupId: Id }),
]);

/** Inline deep dive: nests blocks, max depth 3. */
export interface DeepDiveBlock {
  blockId: string;
  trust: Trust;
  type: 'deep_dive';
  id: string;
  depth: 1 | 2 | 3;
  blocks: Block[];
}
export type Block = z.infer<typeof FlatBlockSchema> | DeepDiveBlock;

export const BlockSchema: z.ZodType<Block> = z.lazy(() =>
  z.union([
    FlatBlockSchema,
    z.strictObject({
      ...envelope,
      type: z.literal('deep_dive'),
      id: Id,
      depth: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      blocks: z.array(BlockSchema).min(1),
    }),
  ]),
);

/**
 * Deep dive ("ما نعرفش"): short text, at most one interactive component (a
 * visual block, or a task as the mini question), then the mini question.
 * The loader checks the limits; `experiment` gives it its own small urn.
 */
export const DeepDiveSchema = z.strictObject({
  id: Id,
  ...envelope,
  experiment: ExperimentSchema.optional(),
  blocks: z.array(BlockSchema).min(1),
  mini: z
    .discriminatedUnion('kind', [ChoiceStep, TypedStep, ComponentStep])
    .optional(),
});

export const MisconceptionSchema = z.strictObject({
  id: Id,
  skillId: Id,
  /** `writing`: an exam-paper habit (parentheses, conclusion, domain check, interpretation), not a math gap. */
  category: z.enum(['math', 'writing']).default('math'),
  description: z.string().min(1),
  signature: z.string().min(1),
  repairComponent: ComponentNameSchema.optional(),
  trust: TrustSchema,
});
export const MisconceptionLibrarySchema = z.array(MisconceptionSchema);
export type Misconception = z.infer<typeof MisconceptionSchema>;

/** What a variant is for (docs/PLANNER.md, rules planner). */
export const VariantKindSchema = z.enum([
  /** Another representation of the same step (repair); returns to the step. */
  'alternative',
  /** A changed version of the step, after it was solved: the only source of `transfer` events. */
  'transfer',
  /** A simpler twin (mini-example loop round); returns to the step. */
  'simpler',
  /** Teaches a prerequisite skill (found by skill through the prerequisite map). */
  'prerequisite',
]);
export type VariantKind = z.infer<typeof VariantKindSchema>;

/** Answer to "what exactly is unclear?" (ask_clarify). */
export const ClarifyChoiceSchema = z.enum(['counting', 'why', 'link']);
export type ClarifyChoice = z.infer<typeof ClarifyChoiceSchema>;

/**
 * Authored content the rules planner may choose from. The student always acts
 * (its `step` is asked or a task); values come from the engine, with the
 * variant's own experiment when it has one.
 */
export const VariantSchema = z
  .strictObject({
    id: Id,
    ...envelope,
    kind: VariantKindSchema,
    /** Step keys ("1b/s8") this variant is for; empty for prerequisites. */
    forSteps: z.array(z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)),
    /** Representation it uses: a component name, "text", "numeric_twin", "worked_example". */
    representation: Id,
    /** Which ask_clarify answers it addresses. */
    addresses: z.array(ClarifyChoiceSchema).optional(),
    /** Simpler twins: order in the mini-example loop (1 = first, each simpler). */
    round: z.number().int().min(1).max(3).optional(),
    experiment: ExperimentSchema.optional(),
    /** Shown before the step (text, math, visual components). */
    intro: z.array(BlockSchema).default([]),
    step: StepSchema,
  })
  .superRefine((v, ctx) => {
    if (!['choice', 'typed', 'component'].includes(v.step.kind)) {
      ctx.addIssue({
        code: 'custom',
        path: ['step'],
        message: 'variant step must be asked (choice, typed) or a task',
      });
    }
    if ((v.kind === 'prerequisite') !== (v.forSteps.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['forSteps'],
        message: 'prerequisites have no forSteps; other variants need one',
      });
    }
    if ((v.kind === 'simpler') !== (v.round !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['round'],
        message: 'simpler twins (and only they) have a round',
      });
    }
  });
export type Variant = z.infer<typeof VariantSchema>;

export const ResultSchema = z.strictObject({ id: Id, statement: RichSchema });

function collectBlockIds(blocks: readonly Block[], out: string[]): string[] {
  for (const b of blocks) {
    out.push(b.blockId);
    if (b.type === 'deep_dive') {
      collectBlockIds(b.blocks, out);
    }
  }
  return out;
}

export const ExerciseSchema = z
  .strictObject({
    id: Id,
    contentVersion: z.string().min(1),
    title: z.strictObject({ fr: z.string().min(1), ar: ArRunsSchema }),
    statement: RichSchema,
    parts: z.array(QuestionSchema).min(1),
    results: z.array(ResultSchema),
    deepDives: z.array(DeepDiveSchema),
    /** Alternatives, transfer variants, simpler twins, prerequisites (rules planner menu). */
    variants: z.array(VariantSchema).default([]),
    /** The random experiment shared by the exercise's engine calls. */
    experiment: ExperimentSchema.optional(),
    /** Named engine computations; math and writeup strings cite them as `\val{id}`. */
    values: z.record(Id, EngineCallSchema).optional(),
    reviewed: z.boolean(),
  })
  .superRefine((ex, ctx) => {
    const resultIds = new Set(ex.results.map(r => r.id));
    const deepDiveIds = new Set(ex.deepDives.map(d => d.id));
    const blockIds: string[] = [];
    const stepIds: string[] = [];

    const variantIds = ex.variants.map(v => v.id);
    for (const v of ex.variants) {
      blockIds.push(v.blockId, v.step.blockId);
      collectBlockIds(v.intro, blockIds);
    }
    for (const id of variantIds.filter((x, i) => variantIds.indexOf(x) !== i)) {
      ctx.addIssue({
        code: 'custom',
        path: ['variants'],
        message: `duplicate variant id ${id}`,
      });
    }
    for (const d of ex.deepDives) {
      blockIds.push(d.blockId);
      collectBlockIds(d.blocks, blockIds);
      if (d.mini) {
        blockIds.push(d.mini.blockId);
      }
    }
    ex.parts.forEach((q, qi) => {
      for (const ref of [q.expected, ...q.uses]) {
        if (!resultIds.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            path: ['parts', qi],
            message: `unknown result ${ref}`,
          });
        }
      }
      for (const g of q.groups) {
        for (const s of g.steps) {
          blockIds.push(s.blockId);
          stepIds.push(`${q.id}/${s.id}`);
          const dd = 'deepDiveId' in s ? s.deepDiveId : undefined;
          if (dd !== undefined && !deepDiveIds.has(dd)) {
            ctx.addIssue({
              code: 'custom',
              path: ['parts', qi],
              message: `unknown deep dive ${dd}`,
            });
          }
        }
      }
    });
    const dup = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
    for (const id of dup(blockIds)) {
      ctx.addIssue({
        code: 'custom',
        path: ['blockId'],
        message: `duplicate blockId ${id}`,
      });
    }
    ex.variants.forEach((v, vi) => {
      for (const ref of v.forSteps) {
        if (!stepIds.includes(ref)) {
          ctx.addIssue({
            code: 'custom',
            path: ['variants', vi, 'forSteps'],
            message: `unknown step ${ref}`,
          });
        }
      }
    });
    for (const id of dup(stepIds)) {
      ctx.addIssue({
        code: 'custom',
        path: ['parts'],
        message: `duplicate step id ${id}`,
      });
    }
  });
export type Exercise = z.infer<typeof ExerciseSchema>;
