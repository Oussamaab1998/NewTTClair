/**
 * The map is told, the inside is his (addendum E, 21 to 23): the reason for
 * the order of the plan, the recap after a credited card and the strip are
 * built from the cards' own `short` and `header` strings and from nothing
 * else, so no value and no method detail can slip in.
 */
import type { PlanCardRef, RoadmapEntry, Rich } from '../content/schema';
import type { MethodNote } from './note';

/** One clause per card that uses another card's result, in the authored order (not the student's). */
export function reasonOrder(cards: readonly PlanCardRef[]): MethodNote {
  const byId = new Map(cards.map(c => [c.id, c]));
  const clauses = cards
    .filter(c => c.needs.length > 0)
    .map(c => ({
      card: c.short,
      needs: c.needs
        .map(id => byId.get(id)?.short)
        .filter((s): s is Rich => s !== undefined),
    }));
  return { kind: 'reason_order', clauses };
}

export function recap(
  found: Rich,
  next: Rich | null,
  line?: string,
): MethodNote {
  return {
    kind: 'recap',
    found,
    next,
    ...(line !== undefined && { line }),
  };
}

/** The roadmap entry the strip shows, with its place in the route. */
export function stripFor(
  roadmap: readonly RoadmapEntry[],
  currentId: string,
): { entry: RoadmapEntry; index: number; total: number } | null {
  const index = roadmap.findIndex(e => e.id === currentId);
  return index < 0
    ? null
    : { entry: roadmap[index]!, index, total: roadmap.length };
}
