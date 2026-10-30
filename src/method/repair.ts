/**
 * The pure logic of a repair script's stages (the reducer only routes acts
 * to it): the list he builds himself, and the help ladder that never says
 * how many groups are missing (the rule of SlotsPattern, D36).
 */
import type { ResolvedStage } from '../content/loader';

const key = (g: readonly string[]): string => [...g].sort().join('-');

/** The balls of a list stage: ids r1.., n1.. and the labels the student sees (R1.., N1..). */
export function ballsOf(
  reds: number,
  blacks: number,
): { id: string; label: string }[] {
  return [
    ...Array.from({ length: reds }, (_, i) => ({
      id: `r${i + 1}`,
      label: `R${i + 1}`,
    })),
    ...Array.from({ length: blacks }, (_, i) => ({
      id: `n${i + 1}`,
      label: `N${i + 1}`,
    })),
  ];
}

export interface ListVerdict {
  complete: boolean;
  /** The help to show when it is not complete (never a count). */
  level?: 1 | 2 | 3;
  /** Level 2: a ball that is in a group still to find. */
  ball?: string;
  /** Level 3: one missing group, added for him. */
  group?: string[];
  /** The list with duplicates merged (a group is a set, in any order of its balls). */
  merged: string[][];
}

/**
 * `fails` = how many times "that is all" was pressed on an incomplete list so
 * far (0 for the first). Level 1 is the same sentence whatever is missing.
 */
export function checkList(
  stage: Pick<ResolvedStage, 'groups' | 'balls'>,
  list: readonly (readonly string[])[],
  fails: number,
): ListVerdict {
  const all = stage.groups ?? [];
  const seen = new Set<string>();
  const merged: string[][] = [];
  for (const g of list) {
    const k = key(g);
    if (!seen.has(k) && all.some(a => key(a) === k)) {
      seen.add(k);
      merged.push([...g].sort());
    }
  }
  const missing = all.filter(a => !seen.has(key(a)));
  if (missing.length === 0) {
    return { complete: true, merged };
  }
  const level = Math.min(3, fails + 1) as 1 | 2 | 3;
  const order = (stage.balls ?? []).map(b => b.id);
  const first = [...missing].sort(
    (a, b) => order.indexOf(a[0]!) - order.indexOf(b[0]!),
  )[0]!;
  return {
    complete: false,
    level,
    ...(level === 2 && { ball: first[0] }),
    ...(level === 3 && { group: first }),
    merged,
  };
}

/** Did he list by the first ball (r1 with every other, then r2...)? A habit logged, never graded. */
export function listedByFirstBall(
  stage: Pick<ResolvedStage, 'balls'>,
  list: readonly (readonly string[])[],
): boolean {
  const order = (stage.balls ?? []).map(b => b.id);
  const firsts = list.map(g => Math.min(...g.map(id => order.indexOf(id))));
  return firsts.every((v, i) => i === 0 || v >= firsts[i - 1]!);
}
