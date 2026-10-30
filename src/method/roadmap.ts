/**
 * The route of a method question, for the strip and the sheet: the roadmap
 * rows that every method frame carries, with where the student is. Pure.
 */
import type { MethodFrameStep, RoadmapEntry, Step } from '../content/schema';
import type { LessonState } from '../lesson/session/types';

export type RowStatus = 'done' | 'current' | 'upcoming';
export interface RoadmapRow extends RoadmapEntry {
  status: RowStatus;
}
export interface Roadmap {
  entries: RoadmapRow[];
  /** The row the strip shows: the open frame, else the next thing on the route. */
  current: RoadmapRow;
}

export function roadmapFor(
  groups: readonly { steps: readonly Step[] }[],
  state: Pick<LessonState, 'stack' | 'finished'>,
): Roadmap | null {
  const frames = groups
    .flatMap(g => g.steps)
    .filter((s): s is MethodFrameStep => s.kind === 'mframe');
  const first = frames.find(f => f.roadmap !== undefined);
  if (!first?.roadmap) {
    return null;
  }
  const builtIds = frames.map(f => f.id);
  const openId = state.finished ? undefined : state.stack[0]?.stepId;
  const openAt = openId === undefined ? -1 : builtIds.indexOf(openId);
  const doneIds = new Set(
    state.finished ? builtIds : openAt >= 0 ? builtIds.slice(0, openAt) : [],
  );
  const entries: RoadmapRow[] = first.roadmap.map(e => ({
    ...e,
    status:
      e.id === openId && openAt >= 0
        ? 'current'
        : doneIds.has(e.id)
        ? 'done'
        : 'upcoming',
  }));
  const current =
    entries.find(e => e.status === 'current') ??
    entries.find(e => e.status === 'upcoming') ??
    entries[entries.length - 1]!;
  return { entries, current };
}
