/**
 * What the home screen shows (owner, 2026-11-17: design A, "continue first"),
 * computed from what the app already keeps: the catalog, the done parts, the
 * lesson board's question records, the event log and the warm-ups. Pure.
 *
 * - The hero: «كمّل وين وقفت» on the most recent unfinished exercise (at the
 *   question he was on, else the first one not done); with nothing started,
 *   «نقترحو تبدا بـ» the first exercise of his class; his class has none
 *   yet (1ère, a section with no paper yet): «التمارين متاع قسمك في الطريق»
 *   (owner, 2026-11-17: never push a bac exercise on him); everything done:
 *   «كمّلت التمارين الكل».
 * - Effort counts only (questions finished, exercises started, days this
 *   week): never a level or a weakness (D8).
 * - The domains (probability, analysis, sequences, complex: the `domain` ids
 *   of the curriculum map) with their exercises and progress; a domain with
 *   no exercise yet is «قريبا».
 * - The exam sessions, from the exercise ids (`bac2022p-…`, `bac2022c-…`).
 */
import type { CatalogEntry } from '../../exercises';
import { partKey } from '../../../state/doneParts';

export const HOME_DOMAINS = [
  'probability',
  'analysis',
  'sequences',
  'complex',
] as const;
export type HomeDomain = (typeof HOME_DOMAINS)[number];

export type SessionKind = 'principale' | 'controle';
export interface ExamSession {
  /** `bac2022p`: the id prefix of its exercises. */
  id: string;
  kind: SessionKind;
  year: number;
}

/** The exam session of an exercise, from its id (`bac2022c-ex2`), or null. */
export function examSession(exerciseId: string): ExamSession | null {
  const m = /^bac(\d{4})([pc])(?:-|$)/.exec(exerciseId);
  if (!m) {
    return null;
  }
  return {
    id: `bac${m[1]}${m[2]}`,
    kind: m[2] === 'p' ? 'principale' : 'controle',
    year: Number(m[1]),
  };
}

/** Something he did on a question, and when. */
export interface Activity {
  exerciseId: string;
  questionId: string;
  at: number;
}

export type HomeHero =
  | {
      kind: 'resume';
      exerciseId: string;
      partId: string;
      done: number;
      total: number;
    }
  | {
      kind: 'start';
      exerciseId: string;
      partId: string;
      /** Its warm-up comes first (he has not done it). */
      warmup: boolean;
    }
  | { kind: 'allDone' }
  /** His class has no exercise yet. */
  | { kind: 'soon' };

export interface HomeStats {
  questionsDone: number;
  exercisesStarted: number;
  daysThisWeek: number;
}

export interface HomeDomainCard {
  domain: HomeDomain;
  exercises: number;
  done: number;
  total: number;
}

export interface HomeSessionCard extends ExamSession {
  exercises: number;
}

export interface HomeData {
  hero: HomeHero;
  /** Null when he has not started anything (the counts would all be 0). */
  stats: HomeStats | null;
  domains: HomeDomainCard[];
  sessions: HomeSessionCard[];
}

export interface HomeInput {
  catalog: readonly CatalogEntry[];
  done: ReadonlySet<string>;
  activity: readonly Activity[];
  /** Days he practised (any time), as local-midnight timestamps or any time in the day. */
  activeDays: readonly number[];
  warmupSeen: (exerciseId: string) => boolean;
  /**
   * The exercises of his class (from the curriculum map): the suggestion is
   * one of them. Null: any exercise.
   */
  forClass: ReadonlySet<string> | null;
  now: number;
}

/** Local midnight of the Monday of this week (the Tunisian school week). */
export function weekStart(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

const dayOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function homeData(input: HomeInput): HomeData {
  const exercises = input.catalog.flatMap(e =>
    e.result.ok ? [e.result.loaded.exercise] : [],
  );
  const partsOf = (id: string) =>
    exercises.find(x => x.id === id)?.parts.map(p => p.id) ?? [];
  const isDone = (exerciseId: string, partId: string) =>
    input.done.has(partKey(exerciseId, partId));
  const doneCount = (id: string) =>
    partsOf(id).filter(p => isDone(id, p)).length;
  const finished = (id: string) =>
    partsOf(id).length > 0 && doneCount(id) === partsOf(id).length;

  // The last thing he did in each exercise (only questions that exist).
  const last = new Map<string, Activity>();
  for (const a of input.activity) {
    if (!partsOf(a.exerciseId).includes(a.questionId)) {
      continue;
    }
    const before = last.get(a.exerciseId);
    if (!before || a.at > before.at) {
      last.set(a.exerciseId, a);
    }
  }
  const started = exercises.filter(x => last.has(x.id) || doneCount(x.id) > 0);

  const hero = ((): HomeHero => {
    const open = started
      .filter(x => !finished(x.id))
      .sort((a, b) => (last.get(b.id)?.at ?? 0) - (last.get(a.id)?.at ?? 0));
    const resume = open[0];
    if (resume) {
      const was = last.get(resume.id)?.questionId;
      const partId =
        was !== undefined && !isDone(resume.id, was)
          ? was
          : partsOf(resume.id).find(p => !isDone(resume.id, p))!;
      return {
        kind: 'resume',
        exerciseId: resume.id,
        partId,
        done: doneCount(resume.id),
        total: partsOf(resume.id).length,
      };
    }
    const mine = exercises.filter(
      x => input.forClass === null || input.forClass.has(x.id),
    );
    if (mine.length === 0) {
      return { kind: 'soon' };
    }
    const pick = mine.find(x => !started.includes(x));
    if (pick) {
      return {
        kind: 'start',
        exerciseId: pick.id,
        partId: pick.parts[0]!.id,
        warmup: pick.warmup !== undefined && !input.warmupSeen(pick.id),
      };
    }
    return { kind: 'allDone' };
  })();

  const from = weekStart(input.now);
  const days = new Set(
    [...input.activeDays, ...input.activity.map(a => a.at)]
      .filter(t => t >= from && t <= input.now)
      .map(dayOf),
  );
  const questionsDone = exercises.reduce((n, x) => n + doneCount(x.id), 0);
  const stats: HomeStats | null =
    started.length > 0
      ? {
          questionsDone,
          exercisesStarted: started.length,
          daysThisWeek: days.size,
        }
      : null;

  const domains = HOME_DOMAINS.map((domain): HomeDomainCard => {
    const of = exercises.filter(x => x.subject === domain);
    return {
      domain,
      exercises: of.length,
      done: of.reduce((n, x) => n + doneCount(x.id), 0),
      total: of.reduce((n, x) => n + x.parts.length, 0),
    };
  });

  const sessions = new Map<string, HomeSessionCard>();
  for (const x of exercises) {
    const s = examSession(x.id);
    if (s) {
      const card = sessions.get(s.id) ?? { ...s, exercises: 0 };
      card.exercises += 1;
      sessions.set(s.id, card);
    }
  }
  const sessionList = [...sessions.values()].sort(
    (a, b) =>
      b.year - a.year ||
      (a.kind === b.kind ? 0 : a.kind === 'principale' ? -1 : 1),
  );

  return { hero, stats, domains, sessions: sessionList };
}

/** The exercises of a domain or a session (the picker behind a home card). */
export function catalogOf(
  catalog: readonly CatalogEntry[],
  only: { domain: HomeDomain } | { session: string },
): CatalogEntry[] {
  return catalog.filter(e =>
    'domain' in only
      ? e.result.ok && e.result.loaded.exercise.subject === only.domain
      : examSession(e.id)?.id === only.session,
  );
}
