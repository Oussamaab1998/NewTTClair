/**
 * The route of a method question, for the strip and the sheet: the roadmap
 * rows that every method frame carries, with where the student is, in his
 * own order once he ordered the plan (state.method.stepOrder). Pure.
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

/** The items whose id is in `order` take that order among their own slots; the others stay. */
function inOrder<T extends { id: string }>(
  items: readonly T[],
  order: readonly string[] | undefined,
): T[] {
  if (!order) {
    return [...items];
  }
  const at = new Map(order.map((id, i) => [id, i]));
  const moving = items
    .filter(x => at.has(x.id))
    .sort((a, b) => at.get(a.id)! - at.get(b.id)!);
  let k = 0;
  return items.map(x => (at.has(x.id) ? moving[k++]! : x));
}

export function roadmapFor(
  groups: readonly { steps: readonly Step[] }[],
  state: Pick<LessonState, 'stack' | 'finished' | 'method'>,
): Roadmap | null {
  const order = state.method?.stepOrder;
  const frames = inOrder(
    groups
      .flatMap(g => g.steps)
      .filter((s): s is MethodFrameStep => s.kind === 'mframe'),
    order,
  );
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
  const entries: RoadmapRow[] = inOrder(first.roadmap, order).map(e => ({
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
