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
import { FN_IDS } from '../engine/analysis';
import { ExperimentSchema } from '../engine/calls';
import { EventSpecSchema } from '../engine/probability';
import { PROCEDURE_IDS } from '../engine/procedures';
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

/**
 * Rich text by shape only (RichSchema without its RTL checks): what LLM
 * answers are parsed with. The pipeline then isolates Latin, digits and short
 * formulas into their own runs, rejects what it cannot fix, and checks the
 * result with RichSchema (planner: consult.ts; tutor drawer: verify.ts).
 */
export const RichShapeSchema = z
  .strictObject({
    ar: ArRunsSchema.optional(),
    fr: z.string().min(1).optional(),
    math: z.string().min(1).optional(),
  })
  .refine(
    r => r.ar !== undefined || r.fr !== undefined || r.math !== undefined,
    { message: 'Rich needs ar, fr or math' },
  );

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
  /** The correct option is the one whose `parity` the engine finds for `fn`. */
  z.strictObject({ type: z.literal('parity'), fn: z.enum(FN_IDS) }),
  /**
   * C1 (2026-10-23): the correct option is the one whose `event` holds
   * exactly the draws outside `of` (computed on the step's urn).
   */
  z.strictObject({ type: z.literal('complement'), of: EventSpecSchema }),
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
    /** Answers of type `parity`: the conclusion this option states. */
    parity: z.enum(['even', 'odd', 'neither']).optional(),
    /** Answers of type `complement`: the event this option describes. */
    event: EventSpecSchema.optional(),
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

/**
 * A known wrong procedure for a typed step (C2): the engine computes its
 * value (src/engine/procedures.ts); the loader rejects it when it does not
 * fit the answer or gives the correct answer. Rows are in priority order.
 */
export const ProcedureRowSchema = z.strictObject({
  id: z.enum(PROCEDURE_IDS),
  misconceptionId: Id,
  reviewed: z.boolean(),
});

/** Verified answers for the long-press menu (اشرحلي / علاش؟ / مثال). */
export const AsksSchema = z.strictObject({
  explain: z.array(RichSchema).min(1).optional(),
  why: z.array(RichSchema).min(1).optional(),
  example: z.array(RichSchema).min(1).optional(),
});
export type Asks = z.infer<typeof AsksSchema>;

/** Answers to ask_clarify ("what is unclear?"). */
export const ClarifyChoiceSchema = z.enum(['counting', 'why', 'link']);
export type ClarifyChoice = z.infer<typeof ClarifyChoiceSchema>;

/** Starter chip of the ask field, with a verified canned answer. */
export const AskChipSchema = z.strictObject({
  id: Id,
  label: RichSchema,
  answer: z.array(RichSchema).min(1),
  /** B3: which ask_clarify answers its verified answer can serve. */
  addresses: z.array(ClarifyChoiceSchema).optional(),
});
export type AskChip = z.infer<typeof AskChipSchema>;

/**
 * B3, ask_clarify "link": the earlier result this step builds on. The text
 * says what it is; the value is the engine's (`resultRef` names an entry of
 * `values`), shown as its own math line, so the text carries no math.
 */
export const StepLinkSchema = z.strictObject({
  resultRef: Id,
  text: RichSchema,
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

/**
 * How the step's answer can be said in words (D16): an AI block must not say
 * it while hints are left (src/planner/llm/solutionConcepts.ts). French in
 * `fr`, Arabic script only in `ar`; reviewed with the step (its `trust`).
 */
const NO_BIDI = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
const FrPhrase = z
  .string()
  .min(1)
  .max(80)
  .refine(t => !ARABIC.test(t) && !NO_BIDI.test(t), 'fr phrase: French only');
const ArPhrase = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[\u0600-\u06FF\s«».,:;!?]+$/, 'ar phrase: Arabic script only');
export const SolutionPhrasesSchema = z.strictObject({
  fr: z.array(FrPhrase).min(1).optional(),
  ar: z.array(ArPhrase).min(1).optional(),
});

const stepBase = { id: Id, ...envelope, skills: z.array(Id) };
const asked = {
  prompt: RichSchema,
  hints: z.array(RichSchema).max(3).optional(),
  deepDiveId: Id.optional(),
  check: NumericCheckSchema.optional(),
  solutionPhrases: SolutionPhrasesSchema.optional(),
  link: StepLinkSchema.optional(),
  /**
   * B4 (2026-10-22): a guided walk-through for a stuck student, instead of
   * the teacher-note card. 2 lines (3 only where needed), each saying what to
   * look at or do; never the answer (checked, lesson/walkthroughCheck.ts).
   */
  walkthrough: z
    .strictObject({ lines: z.array(RichSchema).min(2).max(3) })
    .optional(),
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
  /** Known wrong procedures, tried after `wrongAnswers` (C2). */
  procedures: z.array(ProcedureRowSchema).optional(),
  /** Keys shown; default from the answer's engine call (loader `keypadFor`). */
  keypad: KeypadKindSchema.optional(),
});

/** An expression in the safe parser's syntax, in the step's variables. */
const LineExpr = z.string().min(1).max(200);

/**
 * Engine reference of a written expression: the loader checks by numeric
 * samples that the expression is this registry function (id), its value at
 * −x (neg) or its derivative. Expressions in content are never trusted.
 */
export const EngineFnRefSchema = z.strictObject({
  fn: z.enum(FN_IDS),
  transform: z.enum(['id', 'neg', 'derivative']).default('id'),
});
export type EngineFnRef = z.infer<typeof EngineFnRefSchema>;

/** Keys of the structured editor (contextual: content narrows them). */
export const LineKeySchema = z.enum([
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'x',
  't',
  'e',
  '+',
  '-',
  '*',
  'frac',
  'pow',
  'group',
]);

/** Line-by-line writing (docs: Step 4): each line equals the previous one. */
const LinesStep = z.strictObject({
  ...stepBase,
  ...asked,
  kind: z.literal('lines'),
  variables: z
    .array(z.string().regex(/^[a-z]$/))
    .min(1)
    .default(['x']),
  /** LaTeX written before the first line ("f(-x)"). */
  lhs: z.string().min(1).optional(),
  /** Where the student starts (shown); absent: every line is compared with the goal. */
  start: LineExpr.optional(),
  startIs: EngineFnRefSchema.optional(),
  /** The goal's written form; the step ends on a line in this form. */
  goal: LineExpr,
  goalIs: EngineFnRefSchema,
  /** LaTeX of the target shown on top (default: the goal expression). */
  goalLatex: z.string().min(1).optional(),
  knownWrong: z
    .array(
      z.strictObject({
        expr: LineExpr,
        misconceptionId: Id,
        /** The line the student meant (localizes the error). */
        meant: LineExpr.optional(),
      }),
    )
    .default([]),
  keys: z.array(LineKeySchema).min(1).optional(),
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
  solutionPhrases: SolutionPhrasesSchema.optional(),
});

// ---------------------------------------------------------------------------
// Method lesson (docs/METHOD_LESSON_PLAN.md, its addenda, METHOD_Q2_SPEC.md and
// METHOD_Q3_SPEC.md). The author writes ONE `method` block per question; the
// loader expands it into ordinary steps (`text` for the opening card, `mframe`
// for the plan, the read tap, one lines frame per built plan card, the extra
// card frames, the recipe and the similar questions), so the planner, hints,
// outcome classes and caps work per frame. Repairs are variants of kind
// `alternative` whose step is an `mframe` with a `repair` script.
// Everything domain-specific (graph templates, mutations, card evaluators,
// checks) lives in src/method, behind an id: the schema only holds the shape.

/** What the strip and the frame header show. Never a value, never the how (loader scan). */
export const MethodHeaderSchema = z.strictObject({
  now: RichSchema,
  why: RichSchema,
  next: RichSchema,
});
export type MethodHeader = z.infer<typeof MethodHeaderSchema>;

/** A plan-card key: the template says which keys exist (src/method/templates.ts). */
export const PlanKeySchema = Id;
export type PlanKey = string;

/** The part of a plan card the plan frame needs. */
export const PlanCardRefSchema = z.strictObject({
  id: Id,
  key: PlanKeySchema,
  /** One or two words: used by the reason-for-order line, the recap and the strip. */
  short: RichSchema,
  /** The coarse step as the student sees it on the card. */
  text: RichSchema,
  header: MethodHeaderSchema,
  /** Cards whose result this card uses. */
  needs: z.array(Id).default([]),
});
export type PlanCardRef = z.infer<typeof PlanCardRefSchema>;

/** An authored plan card: the ref plus what the lines frame of this card asks. */
export const PlanCardSchema = PlanCardRefSchema.extend({
  prompt: RichSchema,
  hints: z.array(RichSchema).max(3),
  deepDiveId: Id.optional(),
  walkthrough: z
    .strictObject({ lines: z.array(RichSchema).min(2).max(3) })
    .optional(),
  /** Known wrong procedures for this card's main node, matched by value after the mutations. */
  procedures: z.array(ProcedureRowSchema).optional(),
  wrongAnswers: z.array(WrongAnswerSchema).optional(),
});
export type PlanCard = z.infer<typeof PlanCardSchema>;

const JsonRecord = z.record(z.string(), z.json());

export const ReadTargetSchema = z.strictObject({
  /** A word of the exercise statement (loader: it must occur). */
  token: z.string().min(2),
  /** Facts the tap establishes for the rest of the question (order, replacement, event...). */
  effect: JsonRecord.default({}),
});

/** A graph template of src/method/templates.ts and its arguments. */
export const MethodGraphSchema = z.strictObject({
  template: Id,
  args: JsonRecord.default({}),
});
export type MethodGraph = z.infer<typeof MethodGraphSchema>;

/** One sentence card of a pick (combine reason, claim, recognise, formula). */
export const CardOptionSchema = z.strictObject({
  id: Id,
  text: RichSchema,
  truth: z.enum(['true', 'false']),
  misconceptionId: Id.optional(),
  /** Authored line shown when this card is the wrong pick. */
  feedback: RichSchema.optional(),
  /** What the evaluator tests (a prediction, a formula): src/method/cards.ts. */
  claim: JsonRecord.optional(),
});
export type CardOption = z.infer<typeof CardOptionSchema>;

/** A pick of one card, placed after a plan card's lines (or after the plan, the read tap, another pick). */
export const CardsFrameSchema = z.strictObject({
  id: Id,
  /** A plan card id, `plan`, `read`, or the id of another pick. */
  after: Id,
  short: RichSchema,
  header: MethodHeaderSchema,
  prompt: RichSchema,
  hints: z.array(RichSchema).max(3),
  deepDiveId: Id.optional(),
  /** What happens after the pick (src/method/cards.ts); default: right or wrong. */
  evaluator: Id.default('pick'),
  args: JsonRecord.default({}),
  cards: z.array(CardOptionSchema).min(2).max(5),
});
export type CardsFrame = z.infer<typeof CardsFrameSchema>;

/** The student's recipe: 3 to 5 sentence cards from a pool with distractors, beside the clean card. */
export const RecipeSchema = z.strictObject({
  short: RichSchema,
  header: MethodHeaderSchema,
  prompt: RichSchema,
  hints: z.array(RichSchema).max(3),
  pool: z
    .array(
      z.strictObject({
        id: Id,
        text: RichSchema,
        kind: z.enum(['step', 'check', 'distractor']),
      }),
    )
    .min(5)
    .max(10),
  clean: z.array(Id).min(3).max(5),
});
export type Recipe = z.infer<typeof RecipeSchema>;

/** The method card of the question's TYPE, shown beside the student's recipe (addendum E, 24). */
export const MethodCardSchema = z.strictObject({
  type: RichSchema,
  steps: z.array(RichSchema).min(3).max(5),
  checks: z.array(RichSchema).min(1).max(4),
});

/** One of the two similar questions without help (addendum E, 25). */
export const SimilarSlotSchema = z.strictObject({
  id: Id,
  kind: z.enum(['same_structure', 'twist']),
  /** The statement, exam French; formulas as `math`. */
  statement: RichSchema,
  /** A template and its arguments (an urn of its own, a die...). */
  graph: MethodGraphSchema,
  /** Numbers that are on screen elsewhere and allowed on purpose (printed by the guard). */
  allow: z.array(z.number()).default([]),
});
export type SimilarSlot = z.infer<typeof SimilarSlotSchema>;

/** What he found: nodes whose credited lines make a finding, the reason of each, the rule WITH its condition. */
export const FindingSchema = z.strictObject({
  id: Id,
  title: RichSchema,
  nodes: z.array(Id).min(1),
  reasons: z.record(Id, RichSchema).default({}),
  /** Shown only once a card of `viaCard` was picked right (a claim he made), if given. */
  viaCard: Id.optional(),
  rule: z.strictObject({ text: RichSchema, condition: RichSchema }),
  /** Show "what I did / how the exam writes it" after he computed the nodes himself. */
  bridge: z.boolean().default(false),
});
export type Finding = z.infer<typeof FindingSchema>;

/** The paper skeleton: exam French (LTR), blanks `{node}` filled from his accepted lines only. */
export const SkeletonLineSchema = z.strictObject({
  id: Id,
  fr: z.string().min(1),
});

/** A value another question's graph gives (the student's sheet): `from` is `part/blockId`, e.g. `1/m1`. */
export const MethodInputSchema = z.strictObject({
  from: z.string().min(3),
  node: Id,
});

const RoadmapEntrySchema = z.strictObject({
  id: Id,
  kind: z.enum(['plan', 'read', 'card', 'cards', 'recipe', 'paper']),
  short: RichSchema,
  header: MethodHeaderSchema,
});
export type RoadmapEntry = z.infer<typeof RoadmapEntrySchema>;

/** One stage of a repair script (a repair is ONE detour of at most 10 acts). */
export const RepairStageSchema = z.discriminatedUnion('type', [
  /**
   * Text and math the student reads and acknowledges with one tap. `worked`
   * shows lines of a graph the engine builds (a worked example on another
   * urn): each node as `form = value`, never typed by hand.
   */
  z.strictObject({
    type: z.literal('show'),
    text: RichSchema,
    worked: z
      .strictObject({ graph: MethodGraphSchema, nodes: z.array(Id).min(1) })
      .optional(),
  }),
  /** He builds the list of groups himself with chips (duplicates merged, "something is missing" help). */
  z.strictObject({
    type: z.literal('list'),
    prompt: RichSchema,
    reds: z.number().int().min(0),
    blacks: z.number().int().min(0),
    k: z.number().int().min(1),
    /** Only the groups that contain this ball (the habit "list by the first ball"). */
    contains: z.string().optional(),
  }),
  /** A line on a twin graph: credited when it matches `node` (any accepted form). */
  z.strictObject({
    type: z.literal('line'),
    prompt: RichSchema,
    graph: MethodGraphSchema,
    node: Id,
  }),
  z.strictObject({
    type: z.literal('cards'),
    prompt: RichSchema,
    evaluator: Id.default('pick'),
    args: JsonRecord.default({}),
    /** The twin the evaluator computes on (a claim about counts); absent: none. */
    graph: MethodGraphSchema.optional(),
    cards: z.array(CardOptionSchema).min(2).max(5),
  }),
  /** A picture; the stage ends when its gate opens (`explored`). */
  z.strictObject({
    type: z.literal('component'),
    component: ComponentSpecSchema,
    prompt: RichSchema.optional(),
  }),
]);
export type RepairStage = z.infer<typeof RepairStageSchema>;

/**
 * A script frame on the ROUTE (not a detour): an after-answer picture or a
 * short walk placed after a plan card, a pick or the read tap. Same stages as
 * a repair; no help ladder (nothing to hide), one act per stage.
 */
export const ExtraFrameSchema = z.strictObject({
  id: Id,
  /** A plan card id, `plan`, `read`, or the id of a pick or another extra. */
  after: Id,
  short: RichSchema,
  header: MethodHeaderSchema,
  prompt: RichSchema,
  stages: z.array(RepairStageSchema).min(1).max(4),
});
export type ExtraFrame = z.infer<typeof ExtraFrameSchema>;

export const MethodStepSchema = z.strictObject({
  ...stepBase,
  kind: z.literal('method'),
  /** The route in 4 or 5 short lines and how help works; no math (loader scan). Not blocking. */
  opening: z.strictObject({
    route: z.array(RichSchema).min(4).max(5),
    help: RichSchema,
  }),
  plan: z.strictObject({
    short: RichSchema,
    header: MethodHeaderSchema,
    prompt: RichSchema,
    hints: z.array(RichSchema).max(3),
    cards: z.array(PlanCardSchema).min(3).max(5),
  }),
  read: z.strictObject({
    short: RichSchema,
    header: MethodHeaderSchema,
    prompt: RichSchema,
    hints: z.array(RichSchema).max(3),
    targets: z.array(ReadTargetSchema).min(1),
    notOrderWord: RichSchema,
    /** The sentence to tap in, when it is the question's own wording and not the exercise statement (exam French). */
    sentence: z.string().min(1).optional(),
  }),
  /** The last roadmap row: writing the answer on the real paper. */
  paper: z.strictObject({ short: RichSchema, header: MethodHeaderSchema }),
  graph: MethodGraphSchema,
  /** Values from earlier questions (cross-question inputs), given to the template. */
  inputs: z.record(Id, MethodInputSchema).optional(),
  /** What the statement gives (« Montrer que P(A) = 1/2 »): the last check of the result. */
  target: RichSchema.optional(),
  /** Plan cards whose lines frame exists so far (absent: all). */
  builtFrames: z.array(Id).optional(),
  /** Picks placed after a card (the combine reason, a claim consolidation, formula cards). */
  picks: z.array(CardsFrameSchema).default([]),
  /** Script frames on the route (an after-answer picture, a short walk). */
  extras: z.array(ExtraFrameSchema).default([]),
  recipe: RecipeSchema.optional(),
  methodCard: MethodCardSchema.optional(),
  /** Two similar questions without help: same structure, then a twist. */
  similar: z.array(SimilarSlotSchema).length(2).optional(),
  findings: z.array(FindingSchema).default([]),
  skeleton: z.array(SkeletonLineSchema).default([]),
});
export type MethodStep = z.infer<typeof MethodStepSchema>;

const MethodFrameSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('plan'),
    cards: z.array(PlanCardRefSchema).min(3).max(5),
  }),
  z.strictObject({
    type: z.literal('read'),
    /** The statement's sentence with the word(s) to find: the tappable copy. */
    sentence: z.string().min(1),
    targets: z.array(ReadTargetSchema).min(1),
    notOrderWord: RichSchema,
  }),
  z.strictObject({
    type: z.literal('lines'),
    cardId: Id,
    key: PlanKeySchema,
    procedures: z.array(ProcedureRowSchema).optional(),
    wrongAnswers: z.array(WrongAnswerSchema).optional(),
  }),
  z.strictObject({
    type: z.literal('cards'),
    after: Id,
    evaluator: Id,
    args: JsonRecord,
    cards: z.array(CardOptionSchema).min(2).max(5),
  }),
  z.strictObject({
    type: z.literal('recipe'),
    pool: RecipeSchema.shape.pool,
    clean: z.array(Id),
    methodCard: MethodCardSchema.optional(),
  }),
  /** A question without help: he writes lines, then the review credits them and labels the slips. */
  z.strictObject({
    type: z.literal('similar'),
    slot: SimilarSlotSchema,
  }),
  z.strictObject({
    type: z.literal('repair'),
    stages: z.array(RepairStageSchema).min(1).max(6),
  }),
]);
export type MethodFrame = z.infer<typeof MethodFrameSchema>;

/** Internal (made by the loader, or authored as a repair step): a frame with its own hint ladder. */
export const MethodFrameStepSchema = z.strictObject({
  ...stepBase,
  ...asked,
  kind: z.literal('mframe'),
  frame: MethodFrameSchema,
  /** Absent on a repair step (a detour has no place on the route). */
  header: MethodHeaderSchema.optional(),
  short: RichSchema.optional(),
  roadmap: z.array(RoadmapEntrySchema).min(4).optional(),
  graph: MethodGraphSchema.optional(),
  /** The block's id: frames of one method block share it. */
  methodId: Id.optional(),
  /** Cross-question inputs of the block's graph. */
  inputs: z.record(Id, MethodInputSchema).optional(),
  /** What the statement gives: the last check of the result. */
  target: RichSchema.optional(),
  /** On the plan frame only: what the sheet shows (findings, paper skeleton). */
  sheet: z
    .strictObject({
      findings: z.array(FindingSchema),
      skeleton: z.array(SkeletonLineSchema),
    })
    .optional(),
  /** Which plan card (or `tail`) a frame belongs to: the student's order moves the groups. */
  group: Id.optional(),
});
export type MethodFrameStep = z.infer<typeof MethodFrameStepSchema>;

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
    LinesStep,
    MethodStepSchema,
    MethodFrameStepSchema,
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
    if (step.kind !== 'choice' && a.type === 'parity') {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'a parity answer needs a choice step',
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
  /** B3: which ask_clarify answers it serves beyond its own step ("counting"). */
  addresses: z.array(ClarifyChoiceSchema).optional(),
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
  /** A picture component, or `method:<id>` for a repair that is a script of stages. */
  repairComponent: z
    .union([ComponentNameSchema, z.string().regex(/^method:[a-z0-9_]+$/)])
    .optional(),
  /**
   * Shown once, on the first wrong answer of a step (product owner,
   * 2026-10-18): uses the student's value when possible, ends with an action.
   */
  feedback: RichSchema.optional(),
  /**
   * Round 1 "dead ends" (2026-10-22): the same mistake named plainly, shown
   * after the student confirmed it on the probe card (`feedback` asks, as
   * only a value was typed). Says what to do next, never the answer.
   */
  feedbackConfirmed: RichSchema.optional(),
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
    /** Representation it uses: a component name, "text", "numeric_twin", "worked_example", or `method:<id>` (a repair script of the method lesson). */
    representation: z.union([Id, z.string().regex(/^method:[a-z0-9_]+$/)]),
    /** Which ask_clarify answers it addresses. */
    addresses: z.array(ClarifyChoiceSchema).optional(),
    /** Simpler twins: order in the mini-example loop (1 = first, each simpler). */
    round: z.number().int().min(1).max(3).optional(),
    experiment: ExperimentSchema.optional(),
    /**
     * D2 (2026-10-22): a fresh variant, opened only after a reveal of a step
     * it is for (never the normal transfer). A transfer on its own urn; the
     * loader checks it cannot be guessed from the parent.
     */
    afterReveal: z.literal(true).optional(),
    /** Shown before the step (text, math, visual components). */
    intro: z.array(BlockSchema).default([]),
    step: StepSchema,
  })
  .superRefine((v, ctx) => {
    if (
      !['choice', 'typed', 'lines', 'component', 'mframe'].includes(v.step.kind)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['step'],
        message:
          'variant step must be asked (choice, typed, lines), a task or a repair script',
      });
    }
    if (v.step.kind === 'mframe' && v.step.frame.type !== 'repair') {
      ctx.addIssue({
        code: 'custom',
        path: ['step'],
        message:
          'a variant can only carry a repair script of the method lesson',
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

/**
 * One question of the exam paper (the paper screen, the «الورقة» sheet, the
 * picker chips). `wording` and sub-question wording are the exam's own French,
 * in sentence order, exactly as transcribed (never paraphrased); absent when
 * not transcribed yet. `available`: authored (a part of this exercise);
 * `soon`: not built yet.
 */
export const PaperQuestionSchema = z.strictObject({
  id: Id,
  /** How the exam numbers it: "1", "2", "3.a". */
  label: z.string().min(1),
  wording: z.array(RichSchema).min(1).optional(),
  /** The exam's a) b) c) items, each with its own wording. */
  subs: z
    .array(
      z.strictObject({
        label: z.string().min(1),
        wording: z.array(RichSchema).min(1),
      }),
    )
    .min(1)
    .optional(),
  status: z.enum(['available', 'soon']),
});
/** A part of the exam exercise («Partie A»), its opening sentence, its questions. */
export const PaperPartSchema = z.strictObject({
  heading: RichSchema.optional(),
  intro: z.array(RichSchema).min(1).optional(),
  questions: z.array(PaperQuestionSchema).min(1),
});
export const PaperSchema = z.strictObject({
  /** The exam's source line, in French (never an emblem). */
  source: z.string().min(1).optional(),
  /** The exercise's points on the exam, when confirmed. */
  points: z.number().positive().optional(),
  parts: z.array(PaperPartSchema).min(1),
});
export type PaperQuestion = z.infer<typeof PaperQuestionSchema>;
export type PaperPart = z.infer<typeof PaperPartSchema>;
export type Paper = z.infer<typeof PaperSchema>;

/** Every question of the paper, part after part. */
export const allPaperQuestions = (paper: Paper): PaperQuestion[] =>
  paper.parts.flatMap(p => p.questions);

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
    /** The exam's exercise number (Exercice 4). */
    number: z.number().int().min(1),
    /** Picker subject tag. */
    subject: z.enum(['analysis', 'probability']),
    /**
     * The bac section of the exam paper: two papers of the same session both
     * have an «Exercice 2» (picker tag, lesson and sheet subtitles).
     */
    section: z.enum(['mathematiques', 'sciences-experimentales']).optional(),
    statement: RichSchema,
    /** The exam paper: parts, questions, sub-questions (optional; see PaperSchema). */
    paper: PaperSchema.optional(),
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
          if (s.kind === 'method') {
            // The frames a method block expands to (src/method/expand.ts) can be the
            // target of a variant, even a frame not built yet.
            stepIds.push(
              `${q.id}/${s.id}.plan`,
              `${q.id}/${s.id}.read`,
              ...s.plan.cards.map(c => `${q.id}/${s.id}.${c.id}`),
            );
          }
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
    // The paper list: unique ids; authored parts are available, the rest soon.
    if (ex.paper) {
      const partIds = new Set(ex.parts.map(q => q.id));
      const questions = allPaperQuestions(ex.paper);
      const paperIds = questions.map(q => q.id);
      questions.forEach((q, i) => {
        if (paperIds.indexOf(q.id) !== i) {
          ctx.addIssue({
            code: 'custom',
            path: ['paper', 'parts'],
            message: `duplicate paper question ${q.id}`,
          });
        }
        const authored = partIds.has(q.id);
        if (authored !== (q.status === 'available')) {
          ctx.addIssue({
            code: 'custom',
            path: ['paper', 'parts'],
            message: authored
              ? `paper question ${q.id} is authored: status must be available`
              : `paper question ${q.id} is not authored: status must be soon`,
          });
        }
      });
      for (const id of partIds) {
        if (!paperIds.includes(id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['paper'],
            message: `part ${id} is missing from the paper list`,
          });
        }
      }
    }
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
