/**
 * The components built under docs/COMPONENTS_PROBABILITY_V2.md, in the order
 * they are registered. Each one added here must declare `reveals`, ship with
 * `offeredToPlanner: false` until the AI-selector round, and have a
 * CATALOG_META entry (registry.v2.test.ts enforces all three).
 */
import type { ComponentName } from '../contract';

export const PROBABILITY2_COMPONENTS: readonly ComponentName[] = [
  'GroupBoxes',
  'ChoiceProduct',
  'SlotsPattern',
  'PartWholeBar',
  'SpreadSlider',
  'RepeatedRuns',
  'VariableTable',
  'BinomialExplorer',
  'EventAreaModel',
  'UrnTemplate',
];
