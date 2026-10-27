/**
 * Planner "wire" format (AI tutor v2, D22): a flat answer the provider fills
 * in, mapped to LlmPlannerOutput before the usual zod -> validateDecision ->
 * guard path.
 *
 * Why flat: Anthropic structured outputs allow at most 24 optional parameters
 * and 16 union-typed parameters per request, and no recursive schemas; the
 * per-component schema (plannerFormat) has 27+ optional fields and recursive
 * component props. Here every field is required, there are no unions (enums
 * only), and component props travel as a JSON string, checked afterwards by
 * the registry schema (validateDecision -> resolveSpec). The catalog in the
 * system prompt describes each component's props.
 *
 * One action per answer (no followUp); `why` is for the dev trace only.
 */
import { z } from 'zod';

import type { Rich } from '../../content/schema';
import type { ArRun } from '../../lesson/rich/runs';
import { LlmPlannerOutputSchema, type LlmPlannerOutput } from './plannerFormat';
import { zodToJsonSchema, type JsonSchema } from './strictSchema';

export const WIRE_ACTIONS = [
  'show_component',
  'explain',
  'example',
  'hint',
  'ask_clarify',
  'deep_dive',
  'variant',
  'revisit_prerequisite',
  'continue',
] as const;

const WireRunSchema = z.strictObject({
  lang: z.enum(['ar', 'fr']),
  text: z.string(),
});

const WireBlockSchema = z.strictObject({
  type: z
    .enum(['text', 'math'])
    .describe('"text": runs only (latex ""); "math": latex only (runs [])'),
  runs: z
    .array(WireRunSchema)
    .describe(
      'Darija text as runs: "ar" runs are Arabic script only; each French term is its own "fr" run. No digits or formulas in runs.',
    ),
  latex: z.string().describe('One formula (LaTeX) for a math block, else ""'),
});

export const PlannerWireSchema = z.strictObject({
  diagnosis: z.strictObject({
    misconceptionId: z
      .string()
      .describe('A misconception id from the input, or "" if none fits'),
    description: z
      .string()
      .describe('Short English description of the error (developers only)'),
    confidence: z.number().describe('0 to 1'),
  }),
  why: z
    .string()
    .describe('One short English sentence: why this action (developers only)'),
  action: z.enum(WIRE_ACTIONS),
  target: z
    .string()
    .describe(
      'show_component: component id; deep_dive: deepDiveId; variant: variantId; example: variantId or ""; revisit_prerequisite: skillId; hint: "1", "2" or "3"; otherwise ""',
    ),
  propsJson: z
    .string()
    .describe(
      'show_component only: the component props as a JSON object string (see the catalog); otherwise ""',
    ),
  blocks: z
    .array(WireBlockSchema)
    .describe(
      'At most 3. show_component: exactly 1 text block (the instruction). explain / example: 1 to 3 blocks. ask_clarify: 2 or 3 text blocks (the options). Others: [].',
    ),
});
export type PlannerWire = z.infer<typeof PlannerWireSchema>;

type WireBlock = PlannerWire['blocks'][number];

function richOf(b: WireBlock): Rich | null {
  const runs = b.runs
    .map(r => ({ lang: r.lang, text: r.text.trim() }))
    .filter(r => r.text.length > 0);
  if (runs.length === 0) {
    return null;
  }
  if (runs.every(r => r.lang === 'fr')) {
    return { fr: runs.map(r => r.text).join(' ') };
  }
  return {
    ar: runs.map(
      (r): ArRun => (r.lang === 'ar' ? { ar: r.text } : { fr: r.text }),
    ) as [ArRun, ...ArRun[]],
  };
}

type Ctx = z.RefinementCtx;

function fail(ctx: Ctx, message: string): never {
  ctx.addIssue({ code: 'custom', message });
  return z.NEVER;
}

function textBlocks(w: PlannerWire, ctx: Ctx): Rich[] {
  return w.blocks.map((b, i) => {
    if (b.type !== 'text') {
      return fail(ctx, `wire_block_${i}_not_text`);
    }
    return richOf(b) ?? fail(ctx, `wire_block_${i}_empty`);
  });
}

function contentBlocks(w: PlannerWire, ctx: Ctx) {
  return w.blocks.map((b, i) => {
    if (b.type === 'math') {
      return b.latex.trim()
        ? { type: 'math' as const, latex: b.latex.trim() }
        : fail(ctx, `wire_block_${i}_empty`);
    }
    const text = richOf(b) ?? fail(ctx, `wire_block_${i}_empty`);
    return { type: 'tutor_text' as const, text };
  });
}

function nextOf(w: PlannerWire, ctx: Ctx): unknown {
  const target = w.target.trim();
  switch (w.action) {
    case 'show_component': {
      let props: unknown;
      try {
        props = JSON.parse(w.propsJson || '{}');
      } catch {
        return fail(ctx, 'wire_props_json');
      }
      const [instruction, ...rest] = textBlocks(w, ctx);
      if (!instruction || rest.length > 0) {
        return fail(ctx, 'wire_instruction');
      }
      return {
        kind: 'show_component',
        component: { component: target, props },
        instruction,
      };
    }
    case 'explain':
      return { kind: 'explain', blocks: contentBlocks(w, ctx) };
    case 'example':
      return {
        kind: 'example',
        ...(target && { variantId: target }),
        blocks: contentBlocks(w, ctx),
      };
    case 'hint':
      return { kind: 'hint', level: Number(target) };
    case 'ask_clarify':
      return { kind: 'ask_clarify', options: textBlocks(w, ctx) };
    case 'deep_dive':
      return { kind: 'deep_dive', deepDiveId: target };
    case 'variant':
      return { kind: 'variant', variantId: target };
    case 'revisit_prerequisite':
      return { kind: 'revisit_prerequisite', skillId: target };
    case 'continue':
      return { kind: 'continue' };
  }
}

/** Wire -> LlmPlannerOutput (still validated by LlmPlannerOutputSchema). */
export function wireToOutput(w: PlannerWire, ctx: Ctx): unknown {
  const id = w.diagnosis.misconceptionId.trim();
  return {
    diagnosis: {
      skillIds: [],
      misconceptionIds: id ? [id] : [],
      confidence: w.diagnosis.confidence,
      summary: w.diagnosis.description.slice(0, 300),
    },
    avoid: [],
    next: nextOf(w, ctx),
    why: w.why.slice(0, 200),
  };
}

let cached: { schema: JsonSchema; zod: z.ZodType<LlmPlannerOutput> } | null =
  null;

/** The wire format: same JSON Schema for every step (one cache entry per model). */
export function plannerWire(): {
  schema: JsonSchema;
  zod: z.ZodType<LlmPlannerOutput>;
} {
  if (!cached) {
    cached = {
      schema: zodToJsonSchema(PlannerWireSchema),
      zod: PlannerWireSchema.transform(wireToOutput).pipe(
        LlmPlannerOutputSchema,
      ),
    };
  }
  return cached;
}
