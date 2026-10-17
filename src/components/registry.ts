/**
 * Component registry, metadata only (docs/COMPONENTS_CONTRACT.md). No React here,
 * so the content loader and the pure lesson reducer can use it; views are
 * mapped in ./views.ts. Content and the planner can only request names listed here.
 */
import type { z } from 'zod';

import type { Experiment } from '../engine/calls';
import type { ComponentName, ComponentSpec, RegistryEntry } from './contract';
import {
  ComplementViewPropsSchema,
  EventPickerPropsSchema,
  LawBuilderPropsSchema,
  LawChartPropsSchema,
  OutcomeSpacePropsSchema,
  UrnPropsSchema,
} from './probability/schemas';

interface Entry extends RegistryEntry<unknown> {
  /** Missing `balls` / `draw` / `k` are taken from the exercise experiment. */
  usesExperiment: boolean;
  /** A task component that is only a visual with these props (e.g. a readonly table). */
  visualIf?: (props: Record<string, unknown>) => boolean;
}

const entry = <S extends z.ZodType>(
  e: Omit<Entry, 'schema'> & { schema: S },
): Entry => e as unknown as Entry;

export const REGISTRY: Partial<Record<ComponentName, Entry>> = {
  Urn: entry({
    schema: UrnPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['sample-space', 'simultaneous-draw'],
    usesExperiment: true,
  }),
  OutcomeSpace: entry({
    schema: OutcomeSpacePropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['counting-pairs', 'simultaneous-draw', 'random-variable-values'],
    usesExperiment: true,
  }),
  EventPicker: entry({
    schema: EventPickerPropsSchema,
    kind: 'task',
    weight: 'light',
    teaches: ['event-as-set', 'au-moins-un', 'probability-favorable-possible'],
    usesExperiment: true,
  }),
  ComplementView: entry({
    schema: ComplementViewPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['complement', 'au-moins-un'],
    usesExperiment: true,
  }),
  LawBuilder: entry({
    schema: LawBuilderPropsSchema,
    kind: 'task',
    weight: 'heavy',
    teaches: ['random-variable-law', 'law-sum-one'],
    usesExperiment: true,
    // progressive: cells filled by the lesson as EventPickers are solved.
    visualIf: p => p.mode === 'readonly' || p.mode === 'progressive',
  }),
  LawChart: entry({
    schema: LawChartPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['random-variable-law', 'expectation', 'variance'],
    usesExperiment: true,
  }),
};

export function componentMeta(name: string): Entry | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name)
    ? REGISTRY[name as ComponentName]
    : undefined;
}

/** "task" blocks the lesson path like a question; "visual" is a feed block. */
export function componentKind(
  spec: Pick<ComponentSpec, 'component' | 'props'>,
): 'visual' | 'task' | undefined {
  const e = componentMeta(spec.component);
  if (!e) {
    return undefined;
  }
  return e.kind === 'task' && e.visualIf?.(spec.props) ? 'visual' : e.kind;
}

export type ResolvedSpec =
  | { ok: true; name: ComponentName; entry: Entry; props: unknown }
  | {
      ok: false;
      reason: 'unknown_component' | 'invalid_props';
      detail: string;
    };

/**
 * Validates a spec against the registry (contract rule 2). Never throws.
 * The experiment only fills props the spec leaves out.
 */
export function resolveSpec(
  spec: ComponentSpec,
  experiment?: Experiment,
): ResolvedSpec {
  const e = componentMeta(spec.component);
  if (!e) {
    return {
      ok: false,
      reason: 'unknown_component',
      detail: `${spec.component} is not in the registry`,
    };
  }
  const raw =
    e.usesExperiment && experiment
      ? {
          balls: experiment.urn,
          draw: experiment.draw,
          k: experiment.k,
          ...spec.props,
        }
      : spec.props;
  const r = e.schema.safeParse(raw);
  if (!r.success) {
    return {
      ok: false,
      reason: 'invalid_props',
      detail: r.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
        .slice(0, 480),
    };
  }
  return { ok: true, name: spec.component, entry: e, props: r.data };
}
