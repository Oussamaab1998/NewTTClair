/**
 * The help files of the exercises (schema.ts): the three-level ladder of
 * each step and the glossary the long press opens. Bundled (static
 * imports, Metro needs them); a file that does not parse gives no help
 * (the step falls back to the old hints) and is reported by help.test.ts.
 */
import ex2 from './bac2022c-ex2.json';
import ex4 from './bac2022c-ex4.json';
import scEx2 from './bac2022c-sc-ex2.json';
import tree from './bac2022p-sc-ex2.json';
import {
  HelpFileSchema,
  type GlossaryEntry,
  type HelpFile,
  type Ladder,
} from './schema';

/** The exercises the board leads, with their help file. */
export const HELP_SOURCES: Readonly<Record<string, unknown>> = {
  'bac2022p-sc-ex2': tree,
  'bac2022c-sc-ex2': scEx2,
  'bac2022c-ex2': ex2,
  'bac2022c-ex4': ex4,
};

const parsed = new Map<string, HelpFile | null>();

export function helpFor(exerciseId: string): HelpFile | null {
  if (!parsed.has(exerciseId)) {
    const raw = HELP_SOURCES[exerciseId];
    const r = raw === undefined ? null : HelpFileSchema.safeParse(raw);
    parsed.set(
      exerciseId,
      r?.success && r.data.exerciseId === exerciseId ? r.data : null,
    );
  }
  return parsed.get(exerciseId) ?? null;
}

/** The ladder of a step (null: none authored, the old hints apply). */
export function ladderFor(
  exerciseId: string,
  questionId: string,
  frameId: string,
): Ladder | null {
  return helpFor(exerciseId)?.ladders[questionId]?.[frameId] ?? null;
}

/** LaTeX compared without spaces, braces kept. */
export const glossaryKey = (s: string): string => s.replace(/\s+/g, '');

/** French words (no LaTeX): matched as whole words, spaces made single. */
const isWords = (m: string): boolean => !/[\\{}^_]/.test(m);
const words = (s: string): string => s.replace(/\s+/g, ' ').trim();
/** Latin letters, accents included (a word boundary for French). */
const LATIN = 'A-Za-z\\u00C0-\\u024F';
const escapeRe = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Does the pressed text hold this match (a word inside a word does not count: "paire" in "impaire")? */
function holds(pressed: string, m: string): boolean {
  if (!isWords(m)) {
    const k = glossaryKey(m);
    return k.length > 0 && glossaryKey(pressed).includes(k);
  }
  const w = words(m);
  return (
    w.length > 0 &&
    new RegExp(`(^|[^${LATIN}])${escapeRe(w)}($|[^${LATIN}])`).test(
      words(pressed),
    )
  );
}

/** The glossary entries a long-pressed text names (an exact match first). */
export function glossaryMatches(
  exerciseId: string,
  pressed: string,
): GlossaryEntry[] {
  const all = helpFor(exerciseId)?.glossary ?? [];
  if (glossaryKey(pressed) === '') {
    return [];
  }
  const exact = all.filter(e =>
    e.match.some(m =>
      isWords(m)
        ? words(m) === words(pressed)
        : glossaryKey(m) === glossaryKey(pressed),
    ),
  );
  if (exact.length > 0) {
    return exact;
  }
  return all.filter(e => e.match.some(m => holds(pressed, m)));
}
