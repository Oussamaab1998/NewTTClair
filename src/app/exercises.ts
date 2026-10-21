/**
 * The exercises the app offers, each loaded once from its JSON. The picker
 * and the lesson read titles and parts from here, never from a list in code.
 */
import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise, type LoadResult } from '../content/loader';

export interface CatalogEntry {
  /** From the raw JSON, so a card exists even when loading fails. */
  id: string;
  result: LoadResult;
}

const entry = (raw: { id: string }, misconceptions: unknown): CatalogEntry => ({
  id: raw.id,
  result: loadExercise(raw, misconceptions),
});

/** In exam order. */
export const CATALOG: readonly CatalogEntry[] = [
  entry(ex2, ex2Misconceptions),
  entry(ex4, ex4Misconceptions),
];

export interface Opened {
  exerciseId: string;
  partId: string;
}

/** The loaded exercise holding this part id (part ids are unique across exercises). */
export function findPart(
  partId: string,
  catalog: readonly CatalogEntry[] = CATALOG,
): Opened | null {
  for (const e of catalog) {
    if (e.result.ok && e.result.loaded.exercise.parts.some(p => p.id === partId)) {
      return { exerciseId: e.id, partId };
    }
  }
  return null;
}

/** Every part of every loaded exercise, in order (dev part switch). */
export const allParts = (
  catalog: readonly CatalogEntry[] = CATALOG,
): Opened[] =>
  catalog.flatMap(e =>
    e.result.ok
      ? e.result.loaded.exercise.parts.map(p => ({
          exerciseId: e.id,
          partId: p.id,
        }))
      : [],
  );

/** "1b" -> "1.b", "A1" -> "A.1". */
export const partLabel = (id: string) => `${id.slice(0, -1)}.${id.slice(-1)}`;
