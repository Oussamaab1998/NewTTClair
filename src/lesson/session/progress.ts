import { isGate } from '../../components/registry';
import { isTaskStep } from '../../content/loader';
import type { Step } from '../../content/schema';
import type { LessonState } from './types';

/** Main-path progress of a part (header bar, docs/DESIGN.md §3). */
export interface Progress {
  passed: number;
  total: number;
}

/**
 * A step the bar counts: one where the student acts (a question, a lines
 * step, a task component, a prediction gate) and that is required. Explanation
 * steps and optional practice do not count (product owner, 2026-10-21).
 */
export const countsForProgress = (s: Step): boolean => {
  switch (s.kind) {
    case 'choice':
    case 'typed':
    case 'lines':
      return true;
    case 'component':
      return !s.optional && (isTaskStep(s) || isGate(s.component.component, s.component.props));
    default:
      return false;
  }
};

/**
 * Counted steps of the part's main path the student is past. Detours (deep
 * dives, variants) do not count. The step still open, the active main card or
 * a gate waiting for its tap, is not passed yet; a finished part is full.
 */
export function mainProgress(
  groups: readonly { steps: readonly Step[] }[],
  state: Pick<LessonState, 'cursor' | 'stack' | 'finished' | 'gate'>,
): Progress {
  const counted = (steps: readonly Step[]) =>
    steps.filter(countsForProgress).length;
  const total = groups.reduce((n, g) => n + counted(g.steps), 0);
  if (state.finished) {
    return { passed: total, total };
  }
  const { group, step } = state.cursor;
  const appended = [
    ...groups.slice(0, group).flatMap(g => g.steps),
    ...(groups[group]?.steps.slice(0, step) ?? []),
  ];
  const open = state.stack[0]?.stepId ?? state.gate?.stepId;
  const passed = appended.filter(
    s => s.id !== open && countsForProgress(s),
  ).length;
  return { passed, total };
}
