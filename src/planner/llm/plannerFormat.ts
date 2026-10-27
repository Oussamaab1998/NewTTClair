/**
 * What the LLM planner may answer: a narrower PlannerOutput (docs/PLANNER.md).
 * Only actions the LLM may choose; blocks are text and math only (components go
 * through show_component); component props come from each registry schema, so
 * the provider constrains them per component. Two variants: every visual
 * component, or only those that teach the current step's skills.
 *
 * At the zod level props stay a JSON object: the registry schema validates them
 * later with the exercise experiment filled in (validateDecision -> resolveSpec).
 */
import { z } from 'zod';

import {
  COMPONENT_NAMES,
  ComponentNameSchema,
  JsonObjectSchema,
  type ComponentName,
} from '../../components/contract';
import { componentMeta, REGISTRY } from '../../components/registry';
import { CONTAINER_SLOTS } from '../../components/shared/schemas';
import {
  blockBodies,
  ClarifyChoiceSchema,
  RichShapeSchema,
} from '../../content/schema';
import type { StructuredFormat } from './client';
import {
  embedSchema,
  pruneUnusedDefs,
  toStrictSchema,
  zodToJsonSchema,
  type JsonSchema,
} from './strictSchema';

const Id = z.string().min(1);

/** Filled from the exercise experiment when the model leaves them out. */
const EXPERIMENT_FIELDS = ['balls', 'draw', 'k'];

/**
 * Props the model may not set, per component (not representable in strict
 * mode, or values that must come from authored content). Explicit so the
 * converter never drops anything silently.
 */
export const LLM_PROPS_EXCLUDED: Partial<Record<ComponentName, string[]>> = {
  // A given law (tuples); the engine law from the experiment is used instead.
  LawChart: ['law'],
  // Simulation 2026-10-22: invented marker fields; the curve alone is enough.
  FunctionPlot: ['markers'],
};

/** Placeholder whose JSON Schema is replaced by the per-component anyOf. */
const LlmComponentSpecSchema = z.strictObject({
  component: ComponentNameSchema,
  props: JsonObjectSchema,
});

const LlmBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('tutor_text'), text: RichShapeSchema }),
  blockBodies.math,
]);

export const LlmActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('show_component'),
    component: LlmComponentSpecSchema,
    instruction: RichShapeSchema,
  }),
  z.strictObject({
    kind: z.literal('explain'),
    blocks: z.array(LlmBlockSchema).min(1).max(4),
  }),
  z.strictObject({
    kind: z.literal('example'),
    variantId: Id.optional(),
    blocks: z.array(LlmBlockSchema).min(1).max(4),
  }),
  z.strictObject({
    kind: z.literal('quiz'),
    stepId: Id,
    variantId: Id.optional(),
  }),
  z.strictObject({
    kind: z.literal('hint'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.strictObject({
    kind: z.literal('ask_clarify'),
    options: z.array(RichShapeSchema).min(2).max(3),
    choices: z.array(ClarifyChoiceSchema).min(2).max(3).optional(),
  }),
  z.strictObject({ kind: z.literal('revisit_prerequisite'), skillId: Id }),
  z.strictObject({ kind: z.literal('deep_dive'), deepDiveId: Id }),
  z.strictObject({
    kind: z.literal('variant'),
    variantId: Id,
    offer: z.boolean().optional(),
  }),
  z.strictObject({ kind: z.literal('continue') }),
]);

export const LlmPlannerOutputSchema = z.strictObject({
  diagnosis: z.strictObject({
    skillIds: z.array(Id).max(10),
    misconceptionIds: z.array(Id).max(10),
    confidence: z.number().min(0).max(1),
    summary: z.string().max(300),
  }),
  avoid: z.array(Id).max(10),
  next: LlmActionSchema,
  followUp: LlmActionSchema.optional(),
  /** Wire format only: why this action (dev trace; never shown, removed before the Decision). */
  why: z.string().max(200).optional(),
});
export type LlmPlannerOutput = z.infer<typeof LlmPlannerOutputSchema>;

const isContainer = (name: ComponentName) =>
  Object.hasOwn(CONTAINER_SLOTS, name);

/**
 * Visual components the planner may show, optionally only those teaching
 * these skills. Containers (PredictReveal, CompareTwo) are offered whenever a
 * leaf is; their inner specs may only name the offered leaves.
 */
export function plannerComponents(skills?: readonly string[]): ComponentName[] {
  const leaves = COMPONENT_NAMES.filter(name => {
    const meta = componentMeta(name);
    if (!meta || meta.kind !== 'visual' || isContainer(name)) {
      return false;
    }
    return skills === undefined || meta.teaches.some(s => skills.includes(s));
  });
  return COMPONENT_NAMES.filter(
    name =>
      leaves.includes(name) ||
      (leaves.length > 0 && isContainer(name) && componentMeta(name)),
  );
}

/** Each branch once in $defs; the action union and container slots reference it. */
const branchRef = (name: ComponentName) => ({ $ref: `#/$defs/branch_${name}` });

function componentBranch(
  name: ComponentName,
  defs: Record<string, JsonSchema>,
  leaves: readonly ComponentName[],
): JsonSchema {
  const meta = REGISTRY[name];
  if (!meta) {
    throw new Error(`${name} not in registry`);
  }
  const props = embedSchema(
    zodToJsonSchema(meta.schema),
    `props_${name}`,
    defs,
  );
  const excluded = new Set([...(LLM_PROPS_EXCLUDED[name] ?? [])]);
  const slots = CONTAINER_SLOTS[name as keyof typeof CONTAINER_SLOTS] ?? [];
  const properties = Object.fromEntries(
    Object.entries((props.properties as JsonSchema | undefined) ?? {})
      .filter(([k]) => !excluded.has(k))
      .map(([k, v]) =>
        (slots as readonly string[]).includes(k)
          ? [k, { anyOf: leaves.map(branchRef) }]
          : [k, v],
      ),
  );
  const required = ((props.required as string[] | undefined) ?? []).filter(
    k =>
      !excluded.has(k) &&
      !(meta.usesExperiment && EXPERIMENT_FIELDS.includes(k)),
  );
  return {
    type: 'object',
    properties: {
      component: { type: 'string', const: name },
      props: { ...props, properties, required },
    },
    required: ['component', 'props'],
    additionalProperties: false,
  };
}

/**
 * Builds the response format. `skills` given = the filtered variant; with no
 * relevant component, show_component disappears from the schema.
 * Throws (StrictSchemaError) at build time if anything is not representable.
 */
export function plannerFormat(
  skills?: readonly string[],
): StructuredFormat<LlmPlannerOutput> & {
  components: ComponentName[];
} {
  const components = plannerComponents(skills);
  const leaves = components.filter(c => !isContainer(c));
  const defs: Record<string, JsonSchema> = {};
  for (const c of components) {
    defs[`branch_${c}`] = componentBranch(c, defs, leaves);
  }
  const branches = components.map(branchRef);
  let original = zodToJsonSchema(LlmPlannerOutputSchema, (zodSchema, json) => {
    if (zodSchema === LlmComponentSpecSchema) {
      for (const k of Object.keys(json)) {
        delete json[k];
      }
      json.anyOf = branches;
    }
  });
  if (Object.keys(defs).length > 0) {
    original.$defs = {
      ...((original.$defs as JsonSchema | undefined) ?? {}),
      ...defs,
    };
  }
  if (components.length === 0) {
    dropShowComponent(original);
  }
  original = pruneUnusedDefs(original);
  return {
    name: skills === undefined ? 'planner_full' : 'planner_filtered',
    original,
    strict: toStrictSchema(original),
    zod: LlmPlannerOutputSchema,
    components,
  };
}

/** Removes the show_component branch from every action union. */
function dropShowComponent(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(dropShowComponent);
    return;
  }
  if (node === null || typeof node !== 'object') {
    return;
  }
  const o = node as JsonSchema;
  for (const key of ['anyOf', 'oneOf']) {
    const list = o[key];
    if (Array.isArray(list)) {
      o[key] = list.filter(
        b =>
          !(
            b &&
            typeof b === 'object' &&
            ((b as JsonSchema).properties as JsonSchema | undefined)?.kind &&
            (((b as JsonSchema).properties as JsonSchema).kind as JsonSchema)
              .const === 'show_component'
          ),
      );
    }
  }
  Object.values(o).forEach(dropShowComponent);
}
