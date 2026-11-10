/**
 * The authored repair for a known slip: the misconception names a repair
 * component, and an alternative of the step drawn with it (not shown or
 * declined yet in this question) is the repair. Pure; moved out of the
 * planner (src/planner/rules.ts) with no change of behaviour (plan v2 A1), so
 * the hybrid conductor can tell how many authored repairs are left.
 */
import type { Misconception, Variant } from '../content/schema';

export function repairVariantsFor(
  misconceptionId: string | undefined,
  misconceptions: ReadonlyMap<string, Misconception>,
  alternatives: readonly Variant[],
  seen: { shown: readonly string[]; declined: readonly string[] },
): Variant[] {
  const component =
    misconceptionId === undefined
      ? undefined
      : misconceptions.get(misconceptionId)?.repairComponent;
  if (component === undefined) {
    return [];
  }
  return alternatives.filter(
    v =>
      v.representation === component &&
      !seen.shown.includes(v.id) &&
      !seen.declined.includes(v.id),
  );
}

/** The first repair left, or null. */
export const repairVariantFor = (
  ...a: Parameters<typeof repairVariantsFor>
): Variant | null => repairVariantsFor(...a)[0] ?? null;
