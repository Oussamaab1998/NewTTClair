/**
 * The exercises the app offers, each loaded once from its JSON. The picker
 * and the lesson read titles and parts from here, never from a list in code.
 */
import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise, type LoadResult } from '../content/loader';
import type { Rich } from '../content/schema';
import { partKey } from '../state/doneParts';

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
    if (
      e.result.ok &&
      e.result.loaded.exercise.parts.some(p => p.id === partId)
    ) {
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

/** A part chip on a picker card (DESIGN.md §4.1). */
export type ChipState = 'done' | 'current' | 'available' | 'soon';
export interface PickerChip {
  id: string;
  state: ChipState;
}

type Exercise = Extract<LoadResult, { ok: true }>['loaded']['exercise'];

/**
 * The paper's questions (or the authored parts when there is no paper list):
 * done, the current one (first authored part not done), other available
 * parts, and the ones not built yet.
 */
export function pickerChips(
  exercise: Exercise,
  done: ReadonlySet<string>,
): PickerChip[] {
  const ids = exercise.paper
    ? exercise.paper.questions.map(q => ({
        id: q.id,
        soon: q.status === 'soon',
      }))
    : exercise.parts.map(p => ({ id: p.id, soon: false }));
  const isDone = (id: string) => done.has(partKey(exercise.id, id));
  const current = ids.find(q => !q.soon && !isDone(q.id))?.id;
  return ids.map(({ id, soon }) => ({
    id,
    state: soon
      ? 'soon'
      : isDone(id)
      ? 'done'
      : id === current
      ? 'current'
      : 'available',
  }));
}

/**
 * The card's primary action: «كمّل من X» opens the first part not done; with
 * nothing done yet, or everything done, «نبداو» opens the first part.
 */
export function resumeTarget(
  exercise: Exercise,
  done: ReadonlySet<string>,
): { partId: string; resume: boolean } {
  const parts = exercise.parts.map(p => p.id);
  const isDone = (id: string) => done.has(partKey(exercise.id, id));
  const next = parts.find(id => !isDone(id));
  const anyDone = parts.some(isDone);
  return next !== undefined && anyDone
    ? { partId: next, resume: true }
    : { partId: parts[0]!, resume: false };
}

/** The statement's key line on a card: its formula, else its first two sentences. */
export function statementLead(
  statement: Rich,
): { math: string } | { fr: string } {
  if (statement.math !== undefined) {
    return { math: statement.math };
  }
  const sentences = (statement.fr ?? '').split(/(?<=\.)\s+/);
  return { fr: sentences.slice(0, 2).join(' ') };
}
