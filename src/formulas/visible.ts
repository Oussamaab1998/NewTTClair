/**
 * Which rules a student sees (decision 8, owner 2026-11-19): the rules of
 * his own year, and the rules of the year before as reminders («Rappel de
 * 3ème»…), from his class (`student.class.v1`) and the curriculum map.
 * 1ère has no year before in the app.
 */
import {
  CURRICULUM,
  YEARS,
  trackFor,
  type SectionId,
  type Track,
  type Year,
} from '../content/curriculum';
import type { FormulaRule, FormulaTheme } from './schema';

export interface VisibleRule {
  rule: FormulaRule;
  /** A rule of the year before: due at once, as a reminder. */
  reminder: boolean;
}

/** His year's track, and the year before's (the same section where it has sections). */
export function tracksFor(
  year: Year,
  section: SectionId | null,
): { own: Track | null; before: Track | null } {
  const own = trackFor(year, section);
  const prevYear = YEARS[YEARS.indexOf(year) - 1];
  if (prevYear === undefined) {
    return { own, before: null };
  }
  const candidates = CURRICULUM.tracks.filter(t => t.year === prevYear);
  const before =
    candidates.length === 1
      ? candidates[0]!
      : (candidates.find(t => section !== null && t.sections.includes(section)) ?? null);
  return { own, before };
}

const inTrack = (rule: FormulaRule, track: Track | null): boolean =>
  track !== null && track.chapters.some(c => rule.chapters.includes(c.id));

export function visibleRules(
  themes: readonly FormulaTheme[],
  year: Year,
  section: SectionId | null,
): VisibleRule[] {
  const { own, before } = tracksFor(year, section);
  return themes.flatMap(t =>
    t.rules.flatMap((rule): VisibleRule[] =>
      inTrack(rule, own)
        ? [{ rule, reminder: false }]
        : inTrack(rule, before)
          ? [{ rule, reminder: true }]
          : [],
    ),
  );
}
