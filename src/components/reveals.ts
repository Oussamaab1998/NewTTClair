/**
 * What a component puts on screen by construction (docs/COMPONENTS_PROBABILITY_V2.md 3.3,
 * hard rule 9). Every probability2 component declares `reveals` in its
 * registry entry. The AI guard (revealing.ts) uses the rules statically; the
 * component uses `hintAllows` at runtime for a value whose gate names a hint
 * level. An empty list is a declaration too: the component reveals nothing.
 * Pure: no React, so the guard and the loader can import it.
 */
import type { Experiment } from '../engine/calls';
import type { Fraction } from '../engine/rational';
import type { JsonObject } from './contract';

export type MinHint = 0 | 1 | 2 | 3 | 'ladder_end';

export interface RevealRule {
  /** Stable id of the revealed value: "variance_total", "stage_sizes". */
  value: string;
  /** English, for the planner pack and the guard reason. Never shown to students. */
  note: string;
  /**
   * props: shown as soon as the component is mounted with these props.
   * state: shown only after a student action (a slider moved, a prediction made).
   */
  by: 'props' | 'state';
  /**
   * by 'state': true when these props keep the value hidden by construction
   * (for example `totalLockedUntil` is set). Missing means "never trusted".
   */
  lockedBy?: (props: Record<string, unknown>) => boolean;
  /** The hint level from which the value may be enabled; 'ladder_end' = only at the end of the ladder. */
  minHint: MinHint;
  /** The engine values this puts on screen once shown. */
  values: (
    props: Record<string, unknown>,
    experiment?: Experiment,
  ) => readonly Fraction[];
}

/** The first rule that puts an answer value on screen by construction, or null. */
export function revealedByRules(
  rules: readonly RevealRule[] | undefined,
  props: Record<string, unknown>,
  experiment: Experiment | undefined,
  isAnswer: (value: Fraction) => boolean,
): RevealRule | null {
  for (const rule of rules ?? []) {
    if (rule.by === 'state' && rule.lockedBy?.(props) === true) {
      continue;
    }
    if (rule.values(props, experiment).some(isAnswer)) {
      return rule;
    }
  }
  return null;
}

/** May this rule's value be enabled at this hint level? */
export function hintAllows(
  rule: Pick<RevealRule, 'minHint'>,
  hintLevel: number,
  ladderEnded: boolean,
): boolean {
  if (rule.minHint === 'ladder_end') {
    return ladderEnded;
  }
  return hintLevel >= rule.minHint;
}

/** The hint level the lesson hands to a task through `lessonState.hintLevel` (0 to 3). */
export function hintLevelOf(lessonState: JsonObject | undefined): number {
  const v = lessonState?.hintLevel;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
    ? Math.min(v, 3)
    : 0;
}

/**
 * The reveals of a component are complete: declared (an empty list counts),
 * each rule has an id, a note, a values function and, if by state, a lock;
 * no two rules share an id. `offeredToPlanner` may be true only then.
 */
export function completeReveals(
  rules: readonly RevealRule[] | undefined,
): boolean {
  if (rules === undefined) {
    return false;
  }
  const ids = new Set<string>();
  for (const r of rules) {
    if (
      !/^[a-z][a-z0-9_]*$/.test(r.value) ||
      r.note.trim() === '' ||
      typeof r.values !== 'function' ||
      (r.by === 'state' && typeof r.lockedBy !== 'function') ||
      ids.has(r.value)
    ) {
      return false;
    }
    ids.add(r.value);
  }
  return true;
}
