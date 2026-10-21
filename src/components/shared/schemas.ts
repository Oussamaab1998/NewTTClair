/**
 * Props schemas of the generic primitives (docs/COMPONENT_CATALOG.md).
 * JSON-only. Containers (PredictReveal, CompareTwo) hold inner specs of one
 * level only; the registry resolves each inner spec with its own schema.
 */
import { z } from 'zod';

import {
  COMPONENT_NAMES,
  JsonObjectSchema,
  type ComponentName,
} from '../contract';
import { RichSchema } from '../../content/schema';
import { EXAMPLE_TEMPLATES } from '../../engine/examples';
import { evaluateReal, parseExpression } from '../../engine/expression';
import { parseLatexSubset } from '../../lesson/math/latexSubset';

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);

/** Components that hold other components (props holding an inner spec); never nested themselves. */
export const CONTAINER_SLOTS = {
  PredictReveal: ['reveal'],
  CompareTwo: ['left', 'right'],
} as const;
export const CONTAINER_NAMES = Object.keys(
  CONTAINER_SLOTS,
) as (keyof typeof CONTAINER_SLOTS)[];
const INNER_NAMES = COMPONENT_NAMES.filter(
  n => !(CONTAINER_NAMES as readonly string[]).includes(n),
) as [ComponentName, ...ComponentName[]];

export const InnerSpecSchema = z.strictObject({
  component: z.enum(INNER_NAMES),
  props: JsonObjectSchema.default({}),
});

export const MathLine = z
  .string()
  .min(1)
  .max(200)
  .refine(
    s => {
      try {
        parseLatexSubset(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'must parse with the native math renderer' },
  );

export const PredictRevealPropsSchema = z
  .strictObject({
    prompt: RichSchema,
    options: z
      .array(z.strictObject({ id: Id, label: RichSchema }))
      .min(2)
      .max(4),
    reveal: InnerSpecSchema,
    /** One insight sentence, shown after the reveal. */
    insight: RichSchema.optional(),
  })
  .refine(p => new Set(p.options.map(o => o.id)).size === p.options.length, {
    message: 'duplicate option id',
    path: ['options'],
  });
export type PredictRevealProps = z.output<typeof PredictRevealPropsSchema>;

export const CompareTwoPropsSchema = z.strictObject({
  left: InnerSpecSchema,
  right: InnerSpecSchema,
  leftLabel: RichSchema.optional(),
  rightLabel: RichSchema.optional(),
  insight: RichSchema.optional(),
});
export type CompareTwoProps = z.output<typeof CompareTwoPropsSchema>;

export const ExampleGeneratorPropsSchema = z.strictObject({
  templateId: z.enum(EXAMPLE_TEMPLATES),
  seed: z.number().int().min(1).max(10000).default(1),
});
export type ExampleGeneratorProps = z.output<
  typeof ExampleGeneratorPropsSchema
>;

const RESERVED = ['e', 'i'];

export const NumericTwinPropsSchema = z
  .strictObject({
    /** One letter standing for the scary part (u for e^x). */
    symbol: z
      .string()
      .regex(/^[a-z]$/)
      .refine(s => !RESERVED.includes(s), { message: 'reserved letter' }),
    /** Safe-parser expression in `symbol`. */
    template: z.string().min(1).max(120),
    /** Optional second expression to compare with (e.g. the simplified form). */
    compare: z.string().min(1).max(120).optional(),
    /** Values the student can try. */
    values: z.array(z.number()).min(1).max(6),
    label: RichSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (RESERVED.includes(p.symbol)) {
      return; // already reported; the parser refuses reserved names
    }
    for (const key of ['template', 'compare'] as const) {
      const src = p[key];
      if (src === undefined) {
        continue;
      }
      const r = parseExpression(src, { variables: [p.symbol] });
      if (!r.ok) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `does not parse: ${r.error.code}`,
        });
        continue;
      }
      for (const v of p.values) {
        if (!Number.isFinite(evaluateReal(r.ast, { [p.symbol]: v }))) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `undefined at ${p.symbol} = ${v}`,
          });
        }
      }
    }
  });
export type NumericTwinProps = z.output<typeof NumericTwinPropsSchema>;

export const StepThroughPropsSchema = z.strictObject({
  steps: z
    .array(
      z
        .strictObject({
          text: RichSchema.optional(),
          math: MathLine.optional(),
          /** The reason, behind a "why?" button. */
          why: RichSchema.optional(),
        })
        .refine(s => s.text !== undefined || s.math !== undefined, {
          message: 'a step needs text or math',
        }),
    )
    .min(1)
    .max(8),
});
export type StepThroughProps = z.output<typeof StepThroughPropsSchema>;
