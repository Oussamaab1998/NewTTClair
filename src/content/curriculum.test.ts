import { CATALOG } from '../app/exercises';
import { examSession } from '../app/screens/home/home';
import {
  CURRICULUM,
  CurriculumSchema,
  type SectionId,
  type Year,
  chapterById,
  chaptersOfExercise,
  exercisesOf,
  sectionsOf,
  trackFor,
} from './curriculum';
import raw from './curriculumMap.json';
import { SKILLS } from './skills';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const errorsOf = (data: unknown): string[] => {
  const r = CurriculumSchema.safeParse(data);
  return r.success ? [] : r.error.issues.map(i => i.message);
};
const trackOf = (chapterId: string) =>
  CURRICULUM.tracks.find(t => t.chapters.some(c => c.id === chapterId))!;

interface RawExercise {
  id: string;
  section?: string;
  parts: { id: string }[];
}
const exercises = CATALOG.map(e => e.raw as RawExercise);

describe('curriculum map', () => {
  it('parses, unreviewed until a teacher checks it', () => {
    expect(CURRICULUM.reviewed).toBe(false);
    expect(errorsOf(raw)).toEqual([]);
  });

  it('gives each year and scientific section exactly one chapter list', () => {
    expect(sectionsOf('1s')).toEqual([]);
    expect(trackFor('1s', null)?.id).toBe('1s');
    expect(sectionsOf('2s')).toEqual(['sciences', 'technologies-informatique']);
    // One programme and one textbook for both 2ème sections.
    expect(trackFor('2s', 'sciences')?.id).toBe('2s-sc');
    expect(trackFor('2s', 'technologies-informatique')?.id).toBe('2s-sc');
    const short: Record<string, string> = {
      mathematiques: 'm',
      'sciences-experimentales': 'se',
      'sciences-techniques': 'st',
      'sciences-informatique': 'si',
    };
    for (const year of ['3s', '4s'] as const) {
      expect(sectionsOf(year)).toEqual(Object.keys(short));
      for (const s of sectionsOf(year)) {
        expect(trackFor(year, s)?.id).toBe(`${year}-${short[s]}`);
      }
    }
    expect(trackFor('3s', null)).toBeNull();
    expect(trackFor('1s', 'mathematiques')).toBeNull();
    expect(trackFor('2s', 'mathematiques')).toBeNull();
  });

  it('chapters per list (textbook tables of contents, 2026-11-17)', () => {
    expect(
      Object.fromEntries(CURRICULUM.tracks.map(t => [t.id, t.chapters.length])),
    ).toMatchInlineSnapshot(`
      {
        "1s": 16,
        "2s-sc": 19,
        "3s-m": 23,
        "3s-se": 20,
        "3s-si": 15,
        "3s-st": 19,
        "4s-m": 19,
        "4s-se": 17,
        "4s-si": 14,
        "4s-st": 16,
      }
    `);
  });

  it('has analysis in every list and probability from 3ème on', () => {
    for (const t of CURRICULUM.tracks) {
      const domains = new Set(t.chapters.map(c => c.domain));
      expect([t.id, domains.has('analysis')]).toEqual([t.id, true]);
      const early: Year[] = ['1s', '2s'];
      expect([t.id, domains.has('probability')]).toEqual([
        t.id,
        !early.includes(t.year),
      ]);
    }
    // 3ème Sc. info has no statistics in its programme; every other list does.
    const noStats = CURRICULUM.tracks
      .filter(t => !t.chapters.some(c => c.domain === 'statistics'))
      .map(t => t.id);
    expect(noStats).toEqual(['3s-si']);
  });

  it('keeps one slug for one concept across the Bac sections', () => {
    for (const s of sectionsOf('4s')) {
      const slugs = trackFor('4s', s)!.chapters.map(c => c.id.split('.')[1]);
      expect(slugs).toEqual(
        expect.arrayContaining([
          'suites-reelles',
          'fonction-logarithme',
          'fonction-exponentielle',
          'integrales',
          'nombres-complexes',
          'statistiques',
        ]),
      );
    }
  });

  it('links only skills of the skill map', () => {
    const unknown = CURRICULUM.tracks.flatMap(t =>
      t.chapters.flatMap(c =>
        c.skills.filter(s => !SKILLS.has(s)).map(s => `${c.id}: ${s}`),
      ),
    );
    expect(unknown).toEqual([]);
  });

  it('links every exercise of the app, in its own section, year and parts', () => {
    for (const ex of exercises) {
      const chapters = chaptersOfExercise(ex.id);
      expect([ex.id, chapters.length > 0]).toEqual([ex.id, true]);
      const partIds = ex.parts.map(p => p.id);
      const covered = new Set<string>();
      for (const c of chapters) {
        const track = trackOf(c.id);
        expect([c.id, track.sections]).toEqual([
          c.id,
          expect.arrayContaining([ex.section as SectionId]),
        ]);
        // A bac paper is linked in a 4ème track; another exercise (3ème,
        // our own) in the track of its own year.
        if (examSession(ex.id) !== null) {
          expect([c.id, track.year]).toEqual([c.id, '4s']);
        }
        for (const link of c.exercises.filter(e => e.id === ex.id)) {
          for (const p of link.parts ?? partIds) {
            expect([c.id, partIds]).toEqual([
              c.id,
              expect.arrayContaining([p]),
            ]);
            covered.add(p);
          }
        }
      }
      expect([ex.id, [...covered].sort()]).toEqual([
        ex.id,
        [...partIds].sort(),
      ]);
    }
  });

  it('links point to exercises the app has', () => {
    const ids = new Set(exercises.map(e => e.id));
    const dangling = CURRICULUM.tracks.flatMap(t =>
      t.chapters.flatMap(c =>
        c.exercises.filter(e => !ids.has(e.id)).map(e => `${c.id}: ${e.id}`),
      ),
    );
    expect(dangling).toEqual([]);
  });

  it('finds chapters and their exercises', () => {
    expect(chapterById('4s-m.probabilites')?.title.fr).toBe('Probabilités');
    expect(chapterById('3s-m.limites-et-continuite')?.domain).toBe('analysis');
    expect(chapterById('nope')).toBeNull();
    expect(exercisesOf('4s-se.variables-aleatoires')).toEqual([
      { id: 'bac2022c-sc-ex2', parts: ['3a', '3b'] },
    ]);
    expect(exercisesOf('4s-m.coniques')).toEqual([]);
    expect(exercisesOf('nope')).toEqual([]);
    expect(chaptersOfExercise('bac2022c-sc-ex2').map(c => c.id)).toEqual([
      '4s-se.probabilites-ensemble-fini',
      '4s-se.variables-aleatoires',
    ]);
  });

  describe('rejects a broken map', () => {
    const track = (data: typeof raw, id: string) =>
      data.tracks.find(t => t.id === id)!;

    it('a duplicate or misplaced chapter', () => {
      const dup = clone(raw);
      const t = track(dup, '4s-m');
      t.chapters.push(clone(t.chapters[0]!));
      expect(errorsOf(dup)).toEqual([
        'duplicate chapter 4s-m.continuite-et-limites',
      ]);

      const moved = clone(raw);
      track(moved, '4s-m').chapters[0]!.id = '4s-se.continuite-et-limites';
      expect(errorsOf(moved)).toEqual(
        expect.arrayContaining([
          'chapter 4s-se.continuite-et-limites is not in track 4s-m',
        ]),
      );
    });

    it('an unknown textbook or programme', () => {
      const data = clone(raw);
      track(data, '1s').chapters[0]!.manual = 'prog-1-2';
      track(data, '1s').programme = 'man-1s';
      expect(errorsOf(data)).toEqual([
        'track 1s: unknown programme man-1s',
        'chapter 1s.angles: unknown manual prog-1-2',
      ]);
    });

    it('two lists for one year and section, or a section in 1ère', () => {
      const twice = clone(raw);
      track(twice, '3s-se').sections.push('mathematiques');
      expect(errorsOf(twice)).toEqual(['two tracks serve 3s/mathematiques']);

      const first = clone(raw);
      track(first, '1s').sections.push('sciences');
      expect(errorsOf(first)).toEqual(
        expect.arrayContaining(['track 1s: only 1ère has no sections']),
      );
    });

    it('a section outside the scientific list', () => {
      const data = clone(raw) as { tracks: { sections: string[] }[] };
      data.tracks[2]!.sections = ['lettres'];
      expect(errorsOf(data).length).toBeGreaterThan(0);
    });
  });
});
