/**
 * Component registry, metadata only (docs/COMPONENTS_CONTRACT.md). No React here,
 * so the content loader and the pure lesson reducer can use it; views are
 * mapped in ./views.ts. Content and the planner can only request names listed here.
 */
import type { z } from 'zod';

import type { Experiment } from '../engine/calls';
import type { ComponentName, ComponentSpec, RegistryEntry } from './contract';
import type { RevealRule } from './reveals';
import {
  ComplementViewPropsSchema,
  EventPickerPropsSchema,
  LawBuilderPropsSchema,
  LawChartPropsSchema,
  OutcomeSpacePropsSchema,
  UrnPropsSchema,
} from './probability/schemas';
import {
  CHOICE_PRODUCT_REVEALS,
  GROUP_BOXES_REVEALS,
} from './probability2/logic';
import { EVENT_AREA_REVEALS } from './probability2/area';
import { BINOMIAL_EXPLORER_REVEALS } from './probability2/binomial';
import { PART_WHOLE_REVEALS } from './probability2/partWhole';
import { REPEATED_RUNS_REVEALS } from './probability2/runsModel';
import {
  BinomialExplorerPropsSchema,
  ChoiceProductPropsSchema,
  EventAreaModelPropsSchema,
  GroupBoxesPropsSchema,
  PartWholeBarPropsSchema,
  RepeatedRunsPropsSchema,
  SlotsPatternPropsSchema,
  SpreadSliderPropsSchema,
  UrnTemplatePropsSchema,
  VariableTablePropsSchema,
} from './probability2/schemas';
import { SLOTS_PATTERN_REVEALS } from './probability2/slots';
import { SPREAD_SLIDER_REVEALS } from './probability2/spread';
import { VARIABLE_TABLE_REVEALS } from './probability2/table';
import { URN_TEMPLATE_REVEALS } from './probability2/urnExample';
import {
  FoldSymmetryPropsSchema,
  FunctionPlotPropsSchema,
  LimitExplorerPropsSchema,
  PointOnCurvePropsSchema,
  SecantToTangentPropsSchema,
  TangentSlopePropsSchema,
  VariationTableBuilderPropsSchema,
} from './analysis/schemas';
import {
  CompareTwoPropsSchema,
  ExampleGeneratorPropsSchema,
  NumericTwinPropsSchema,
  PredictRevealPropsSchema,
  StepThroughPropsSchema,
  type CompareTwoProps,
  type PredictRevealProps,
} from './shared/schemas';

interface Entry extends RegistryEntry<unknown> {
  /** Missing `balls` / `draw` / `k` are taken from the exercise experiment. */
  usesExperiment: boolean;
  /** A task component that is only a visual with these props (e.g. a readonly table). */
  visualIf?: (props: Record<string, unknown>) => boolean;
  /**
   * A visual component the student must act on before the lesson goes on:
   * the first of these events opens the gate (it is not graded).
   */
  gate?: readonly string[];
  /**
   * With `gate`: the gate holds the lesson only for props where this is true
   * (a readonly picture that asks nothing must never hold it). Missing means
   * always.
   */
  gateIf?: (props: Record<string, unknown>) => boolean;
  /**
   * What the component puts on screen by construction (hard rule 9). Required
   * for every probability2 component (an empty list says "nothing"); the AI
   * guard reads it (planner/llm/revealing.ts). Older components are covered by
   * the hand-written rules there.
   */
  reveals?: readonly RevealRule[];
  /**
   * false keeps the component out of the AI planner's menu and prompt
   * (docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md, Q3). Missing means offered, so
   * nothing registered before this field changes.
   */
  offeredToPlanner?: boolean;
  /** Containers: inner specs (by slot), each resolved with its own schema. */
  nested?: (props: Record<string, unknown>) => {
    slot: string;
    spec: ComponentSpec;
  }[];
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
  // probability2 (docs/COMPONENTS_PROBABILITY_V2.md): visuals with an `explored`
  // gate (one tap or one pick, or the escape), not offered to the AI planner yet.
  GroupBoxes: entry({
    schema: GroupBoxesPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['ordering-vs-choosing', 'combinations-count'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: GROUP_BOXES_REVEALS,
    offeredToPlanner: false,
  }),
  ChoiceProduct: entry({
    schema: ChoiceProductPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['choices-and-product', 'multiplication-principle'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: CHOICE_PRODUCT_REVEALS,
    offeredToPlanner: false,
  }),
  SlotsPattern: entry({
    schema: SlotsPatternPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['combinations-count', 'ordering-vs-choosing'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: SLOTS_PATTERN_REVEALS,
    offeredToPlanner: false,
  }),
  PartWholeBar: entry({
    schema: PartWholeBarPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['probability-by-counting'],
    usesExperiment: false,
    gate: ['explored'],
    // feedback mode only draws the value the student wrote: nothing to act on, so no gate
    gateIf: p => p.mode !== 'feedback',
    reveals: PART_WHOLE_REVEALS,
    offeredToPlanner: false,
  }),
  SpreadSlider: entry({
    schema: SpreadSliderPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['variance', 'expectation'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: SPREAD_SLIDER_REVEALS,
    offeredToPlanner: false,
  }),
  RepeatedRuns: entry({
    schema: RepeatedRunsPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['expectation', 'probability-by-counting'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: REPEATED_RUNS_REVEALS,
    offeredToPlanner: false,
  }),
  VariableTable: entry({
    schema: VariableTablePropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['random-variable-law', 'law-sum-one'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: VARIABLE_TABLE_REVEALS,
    offeredToPlanner: false,
  }),
  BinomialExplorer: entry({
    schema: BinomialExplorerPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['binomial-law', 'expectation', 'variance'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: BINOMIAL_EXPLORER_REVEALS,
    offeredToPlanner: false,
  }),
  EventAreaModel: entry({
    schema: EventAreaModelPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['complement', 'probability-by-counting'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: EVENT_AREA_REVEALS,
    offeredToPlanner: false,
  }),
  UrnTemplate: entry({
    schema: UrnTemplatePropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['probability-by-counting', 'combinations-count'],
    usesExperiment: false,
    gate: ['explored'],
    reveals: URN_TEMPLATE_REVEALS,
    offeredToPlanner: false,
  }),
  // Analysis (COMPONENTS_ANALYSIS.md).
  FunctionPlot: entry({
    schema: FunctionPlotPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['function-parity', 'limit-at-infinity', 'variation-table'],
    usesExperiment: false,
  }),
  PointOnCurve: entry({
    schema: PointOnCurvePropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['function-parity'],
    usesExperiment: false,
  }),
  FoldSymmetry: entry({
    schema: FoldSymmetryPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['function-parity'],
    usesExperiment: false,
  }),
  LimitExplorer: entry({
    schema: LimitExplorerPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: [
      'limit-at-infinity',
      'forme-indeterminee',
      'exp-limits',
      'asymptote-interpretation',
    ],
    usesExperiment: false,
  }),
  SecantToTangent: entry({
    schema: SecantToTangentPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['derivative-meaning'],
    usesExperiment: false,
  }),
  TangentSlope: entry({
    schema: TangentSlopePropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['derivative-meaning', 'variation-table'],
    usesExperiment: false,
  }),
  VariationTableBuilder: entry({
    schema: VariationTableBuilderPropsSchema,
    kind: 'task',
    weight: 'light',
    teaches: ['variation-table'],
    usesExperiment: false,
  }),
  // Generic primitives (COMPONENT_CATALOG.md). Containers teach what their
  // inner component teaches; their own list stays empty.
  PredictReveal: entry({
    schema: PredictRevealPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: [],
    usesExperiment: false,
    // One tap (a prediction or "show me") before the computation appears.
    gate: ['predicted', 'revealed'],
    nested: p => [{ slot: 'reveal', spec: (p as PredictRevealProps).reveal }],
  }),
  CompareTwo: entry({
    schema: CompareTwoPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: [],
    usesExperiment: false,
    nested: p => [
      { slot: 'left', spec: (p as CompareTwoProps).left },
      { slot: 'right', spec: (p as CompareTwoProps).right },
    ],
  }),
  ExampleGenerator: entry({
    schema: ExampleGeneratorPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['quotient-rule', 'function-parity'],
    usesExperiment: false,
  }),
  NumericTwin: entry({
    schema: NumericTwinPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: ['exp-rules'],
    usesExperiment: false,
  }),
  StepThrough: entry({
    schema: StepThroughPropsSchema,
    kind: 'visual',
    weight: 'light',
    teaches: [],
    usesExperiment: false,
  }),
};

export function componentMeta(name: string): Entry | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name)
    ? REGISTRY[name as ComponentName]
    : undefined;
}

/** May the AI planner be offered this component? Missing means yes. */
export const isOfferedToPlanner = (
  meta: Pick<Entry, 'offeredToPlanner'> | undefined,
): boolean => meta !== undefined && meta.offeredToPlanner !== false;

/** "task" blocks the lesson path like a question; "visual" is a feed block. */
/** The component holds the lesson until one of its gate events. */
export const isGate = (
  component: string,
  props?: Record<string, unknown>,
): boolean => {
  const meta = componentMeta(component);
  if ((meta?.gate?.length ?? 0) === 0) {
    return false;
  }
  return meta?.gateIf === undefined || props === undefined
    ? true
    : meta.gateIf(props);
};

/** This event of this component opens its gate. */
export const opensGate = (component: string, name: string): boolean =>
  componentMeta(component)?.gate?.includes(name) ?? false;

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
  for (const inner of e.nested?.(r.data as Record<string, unknown>) ?? []) {
    const ir = resolveSpec(inner.spec, experiment);
    const problem = !ir.ok
      ? ir.detail
      : componentKind(inner.spec) === 'task'
      ? 'task components cannot be nested'
      : null;
    if (problem !== null) {
      return {
        ok: false,
        reason: 'invalid_props',
        detail: `${inner.slot}: ${problem}`.slice(0, 480),
      };
    }
  }
  return { ok: true, name: spec.component, entry: e, props: r.data };
}
