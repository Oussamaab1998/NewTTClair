/**
 * Component contract shared by JSON content and planner output (docs/COMPONENTS_CONTRACT.md,
 * docs/AMENDMENTS.md A3). Props are JSON-only; each component validates its own props
 * with its registry schema before rendering.
 */
import { z } from 'zod';

export const COMPONENT_NAMES = [
  // Probabilités
  'Urn',
  'OutcomeSpace',
  'EventPicker',
  'ComplementView',
  'LawBuilder',
  'LawChart',
  'BinomialExplorer',
  // Analyse
  'FunctionPlot',
  'PointOnCurve',
  'FoldSymmetry',
  'TangentSlope',
  'SecantToTangent',
  'VariationTableBuilder',
  'AreaUnderCurve',
  'LimitExplorer',
  'CurveCompare',
  'SequenceExplorer',
  'InverseMirror',
  // Generic primitives (COMPONENT_CATALOG.md)
  'ParameterPlayground',
  'PredictReveal',
  'CompareTwo',
  'ExampleGenerator',
  'CounterexampleHunt',
  'StepThrough',
  'NumericTwin',
  'WorkedExample',
] as const;
export const ComponentNameSchema = z.enum(COMPONENT_NAMES);
export type ComponentName = z.infer<typeof ComponentNameSchema>;

/** Any JSON object: no functions, no undefined, no class instances. */
export const JsonObjectSchema = z.record(z.string(), z.json());
export type JsonObject = z.infer<typeof JsonObjectSchema>;

export const ComponentSpecSchema = z.strictObject({
  component: ComponentNameSchema,
  instanceId: z.string().min(1).optional(),
  props: JsonObjectSchema,
});
export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;

export type ComponentMode = 'interactive' | 'readonly' | 'replay';

export interface ComponentEvent {
  component: ComponentName;
  instanceId: string;
  name: string;
  payload: JsonObject;
  ts: number;
}

export interface ComponentResult {
  correct: boolean | null;
  details: JsonObject;
  misconceptionHints?: string[];
}

export interface ComponentHostProps<P> {
  props: P;
  mode: ComponentMode;
  locale: 'ar-TN' | 'fr';
  onEvent: (e: ComponentEvent) => void;
  onResult?: (r: ComponentResult) => void;
}

/** Imperative handle every component exposes (ask / long-press / report send it along). */
export interface ComponentHandle {
  getStateSnapshot(): JsonObject;
}

export interface RegistryEntry<P> {
  schema: z.ZodType<P>;
  kind: 'visual' | 'task';
  weight: 'light' | 'heavy';
  /** Skill ids. */
  teaches: string[];
}

export type ComponentSpecCheck =
  | { ok: true; spec: ComponentSpec }
  | {
      ok: false;
      reason: 'unknown_component' | 'invalid_spec';
      issues: string[];
    };

/** Never throws: the caller renders a fallback and logs `component_error` on failure. */
export function checkComponentSpec(raw: unknown): ComponentSpecCheck {
  const r = ComponentSpecSchema.safeParse(raw);
  if (r.success) {
    return { ok: true, spec: r.data };
  }
  const name = (raw as { component?: unknown } | null)?.component;
  const unknown =
    typeof name === 'string' &&
    !(COMPONENT_NAMES as readonly string[]).includes(name);
  return {
    ok: false,
    reason: unknown ? 'unknown_component' : 'invalid_spec',
    issues: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
