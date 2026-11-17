/**
 * The official chapter map: for each school year and scientific section, the
 * maths chapters in textbook order, linked to our skills and exercises. Data in
 * curriculumMap.json (sources and caveats in its `note`, docs/CURRICULUM.md),
 * reviewed: false until a teacher checks it.
 *
 * A track is one chapter list; one track can serve several sections (2ème
 * Sciences and Technologies de l'informatique share their programme and book).
 */
import { z } from 'zod';

import raw from './curriculumMap.json';

export const YEARS = ['1s', '2s', '3s', '4s'] as const;
export type Year = (typeof YEARS)[number];

/** Scientific sections only (owner decision 2026-11-17). 1ère has none (tronc commun). */
export const SECTION_IDS = [
  'sciences',
  'technologies-informatique',
  'mathematiques',
  'sciences-experimentales',
  'sciences-techniques',
  'sciences-informatique',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** What a chapter is about (picker grouping, icons, onboarding examples). */
export const DOMAINS = [
  'numbers',
  'algebra',
  'analysis',
  'sequences',
  'geometry',
  'trigonometry',
  'space',
  'complex',
  'arithmetic',
  'counting',
  'probability',
  'statistics',
  'logic',
] as const;
export type Domain = (typeof DOMAINS)[number];

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);
const TrackId = z.string().regex(/^[1-4]s(-[a-z]+)?$/);
const ChapterId = z.string().regex(/^[1-4]s(-[a-z]+)?\.[a-z0-9]+(-[a-z0-9]+)*$/);
const Label = { fr: z.string().min(1), ar: z.string().min(1) };

const ChapterSchema = z.strictObject({
  /** `${track id}.${slug}`; the same concept keeps the same slug across tracks. */
  id: ChapterId,
  /** The textbook title (lightly normalised, see the data note). */
  title: z.strictObject({ fr: z.string().min(1) }),
  domain: z.enum(DOMAINS),
  /** The textbook (a `manual` source) the title and order come from. */
  manual: Id,
  /** Short hints when the title alone does not say what is inside. */
  topics: z.array(z.string().min(1)).optional(),
  /** skillMap.json ids this chapter teaches. */
  skills: z.array(Id).default([]),
  /** Our exercises for this chapter; `parts` limits it to some parts of the exercise. */
  exercises: z
    .array(
      z.strictObject({ id: Id, parts: z.array(Id).min(1).optional() }),
    )
    .default([]),
});

const TrackSchema = z.strictObject({
  id: TrackId,
  year: z.enum(YEARS),
  /** Empty only for 1ère (no sections). */
  sections: z.array(z.enum(SECTION_IDS)),
  /** The official programme (a `programme` source) the content was checked against. */
  programme: Id,
  chapters: z.array(ChapterSchema).min(1),
});

export const CurriculumSchema = z
  .strictObject({
    contentVersion: z.string().min(1),
    reviewed: z.boolean(),
    note: z.string().optional(),
    years: z.array(z.strictObject({ id: z.enum(YEARS), ...Label })),
    sections: z.array(z.strictObject({ id: z.enum(SECTION_IDS), ...Label })),
    sources: z.array(
      z.strictObject({
        id: Id,
        kind: z.enum(['programme', 'manual']),
        title: z.string().min(1),
        date: z.string().optional(),
        url: z.url(),
      }),
    ),
    tracks: z.array(TrackSchema).min(1),
  })
  .superRefine((m, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const kindOf = new Map(m.sources.map(s => [s.id, s.kind]));
    if (kindOf.size !== m.sources.length) {
      issue('duplicate source id');
    }
    const trackIds = new Set<string>();
    const chapterIds = new Set<string>();
    const served = new Set<string>();
    for (const t of m.tracks) {
      if (trackIds.has(t.id)) {
        issue(`duplicate track ${t.id}`);
      }
      trackIds.add(t.id);
      if (!t.id.startsWith(t.year)) {
        issue(`track ${t.id} is not in year ${t.year}`);
      }
      if ((t.year === '1s') !== (t.sections.length === 0)) {
        issue(`track ${t.id}: only 1ère has no sections`);
      }
      for (const key of t.sections.length ? t.sections : ['none']) {
        const k = `${t.year}/${key}`;
        if (served.has(k)) {
          issue(`two tracks serve ${k}`);
        }
        served.add(k);
      }
      if (kindOf.get(t.programme) !== 'programme') {
        issue(`track ${t.id}: unknown programme ${t.programme}`);
      }
      for (const c of t.chapters) {
        if (chapterIds.has(c.id)) {
          issue(`duplicate chapter ${c.id}`);
        }
        chapterIds.add(c.id);
        if (!c.id.startsWith(`${t.id}.`)) {
          issue(`chapter ${c.id} is not in track ${t.id}`);
        }
        if (kindOf.get(c.manual) !== 'manual') {
          issue(`chapter ${c.id}: unknown manual ${c.manual}`);
        }
      }
    }
    for (const y of YEARS) {
      if (!m.years.some(x => x.id === y)) {
        issue(`no label for year ${y}`);
      }
    }
    for (const s of SECTION_IDS) {
      if (!m.sections.some(x => x.id === s)) {
        issue(`no label for section ${s}`);
      }
    }
  });
export type Curriculum = z.infer<typeof CurriculumSchema>;
export type Track = Curriculum['tracks'][number];
export type Chapter = Track['chapters'][number];
export type ChapterExercise = Chapter['exercises'][number];

/** The bundled map. Parsed at import: a broken map is a build bug, caught by tests. */
export const CURRICULUM: Curriculum = CurriculumSchema.parse(raw);

const chapterIndex = new Map(
  CURRICULUM.tracks.flatMap(t => t.chapters.map(c => [c.id, c] as const)),
);

/** The sections a student of this year picks from (none for 1ère). */
export function sectionsOf(year: Year): SectionId[] {
  return CURRICULUM.tracks
    .filter(t => t.year === year)
    .flatMap(t => t.sections);
}

/**
 * The chapter list for a student's year and section. 1ère takes `null`; any
 * other year needs one of its sections. Null when the pair does not exist.
 */
export function trackFor(year: Year, section: SectionId | null): Track | null {
  return (
    CURRICULUM.tracks.find(t =>
      t.year === year &&
      (section === null ? t.sections.length === 0 : t.sections.includes(section)),
    ) ?? null
  );
}

export function chapterById(id: string): Chapter | null {
  return chapterIndex.get(id) ?? null;
}

/** Our exercises in this chapter (empty for an unknown id or a chapter with none yet). */
export function exercisesOf(chapterId: string): readonly ChapterExercise[] {
  return chapterById(chapterId)?.exercises ?? [];
}

/** The chapters that use this exercise (or some of its parts). */
export function chaptersOfExercise(exerciseId: string): Chapter[] {
  return CURRICULUM.tracks.flatMap(t =>
    t.chapters.filter(c => c.exercises.some(e => e.id === exerciseId)),
  );
}
