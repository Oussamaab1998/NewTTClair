/**
 * The chapter picker's data (pure): the student's official chapter list, the
 * chapters that have exercises now, the whole programme grouped by domain, and
 * one chapter's exercises with the parts it covers and their progress. Reads
 * the curriculum map (src/content/curriculum.ts) and the exercise catalog.
 */
import {
  type Chapter,
  type Domain,
  type SectionId,
  type Track,
  type Year,
  chapterById,
  trackFor,
} from '../../../content/curriculum';
import { partKey } from '../../../state/doneParts';
import { CATALOG, type CatalogEntry } from '../../exercises';

/** The student's class: 1ère has no section. */
export interface StudentClass {
  year: Year;
  section: SectionId | null;
}

/** One exercise in a chapter: the parts this chapter covers, and where to go next. */
export interface ChapterExercise {
  entry: CatalogEntry;
  /** Authored part ids this chapter covers (all of them, or the link's `parts`). */
  parts: string[];
  /** Whether the link covers only some of the exercise's parts. */
  partial: boolean;
  done: string[];
  /** The part to open: the first not done, else the first (all done: read again). */
  next: string;
  state: 'new' | 'started' | 'done';
}

export interface ChapterRow {
  chapter: Chapter;
  /** Its exercises that load (a broken one is never offered). */
  exercises: ChapterExercise[];
  doneParts: number;
  totalParts: number;
}

export interface ChapterList {
  track: Track;
  /** Chapters with at least one exercise, in textbook order. */
  available: ChapterRow[];
  /** Every chapter, grouped by domain in order of first appearance in the book. */
  groups: { domain: Domain; rows: ChapterRow[] }[];
}

type Done = ReadonlySet<string>;

function exercisesOfChapter(
  chapter: Chapter,
  done: Done,
  catalog: readonly CatalogEntry[],
): ChapterExercise[] {
  return chapter.exercises.flatMap(link => {
    const entry = catalog.find(e => e.id === link.id);
    if (!entry?.result.ok) {
      return [];
    }
    const all = entry.result.loaded.exercise.parts.map(p => p.id);
    const parts = (link.parts ?? all).filter(p => all.includes(p));
    if (parts.length === 0) {
      return [];
    }
    const isDone = (p: string) => done.has(partKey(entry.id, p));
    const doneHere = parts.filter(isDone);
    const firstOpen = parts.find(p => !isDone(p));
    return [
      {
        entry,
        parts,
        partial: parts.length < all.length,
        done: doneHere,
        next: firstOpen ?? parts[0]!,
        state:
          doneHere.length === 0
            ? 'new'
            : firstOpen === undefined
            ? 'done'
            : 'started',
      },
    ];
  });
}

function row(
  chapter: Chapter,
  done: Done,
  catalog: readonly CatalogEntry[],
): ChapterRow {
  const exercises = exercisesOfChapter(chapter, done, catalog);
  return {
    chapter,
    exercises,
    doneParts: exercises.reduce((n, x) => n + x.done.length, 0),
    totalParts: exercises.reduce((n, x) => n + x.parts.length, 0),
  };
}

/** The list for this class; null when the class has no chapter list. */
export function chapterList(
  cls: StudentClass,
  done: Done,
  catalog: readonly CatalogEntry[] = CATALOG,
): ChapterList | null {
  const track = trackFor(cls.year, cls.section);
  if (!track) {
    return null;
  }
  const rows = track.chapters.map(c => row(c, done, catalog));
  const groups: ChapterList['groups'] = [];
  for (const r of rows) {
    const group = groups.find(g => g.domain === r.chapter.domain);
    if (group) {
      group.rows.push(r);
    } else {
      groups.push({ domain: r.chapter.domain, rows: [r] });
    }
  }
  return {
    track,
    available: rows.filter(r => r.exercises.length > 0),
    groups,
  };
}

/** One chapter's row (its exercises and progress); null for an unknown id. */
export function chapterRow(
  chapterId: string,
  done: Done,
  catalog: readonly CatalogEntry[] = CATALOG,
): ChapterRow | null {
  const chapter = chapterById(chapterId);
  return chapter ? row(chapter, done, catalog) : null;
}

/** The domain filter to start with: the home's domain when this list has it, else all. */
export function startFilter(
  list: ChapterList,
  domain: Domain | undefined,
): Domain | 'all' {
  return domain !== undefined && list.groups.some(g => g.domain === domain)
    ? domain
    : 'all';
}
