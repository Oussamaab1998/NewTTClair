/**
 * The home's data (src/app/screens/home/home.ts): the «كمّل» card on the
 * last unfinished exercise, the first suggestion from his section, effort
 * counts only, the domains and the exam sessions.
 */
import { CATALOG } from '../../exercises';
import { partKey } from '../../../state/doneParts';
import { memoryStore } from '../../../storage/kv';
import { loadActiveDays, noteActiveDay } from './activeDays';
import {
  catalogOf,
  examSession,
  homeData,
  weekStart,
  type Activity,
  type HomeInput,
} from './home';

// Wednesday 19 November 2026, 10:00 local time.
const NOW = new Date(2026, 10, 19, 10).getTime();
const DAY = 86_400_000;

const input = (over: Partial<HomeInput> = {}): HomeInput => ({
  catalog: CATALOG,
  done: new Set(),
  activity: [],
  activeDays: [],
  warmupSeen: () => false,
  forClass: null,
  now: NOW,
  ...over,
});

describe('the exam session of an exercise', () => {
  it('reads it from the id', () => {
    expect(examSession('bac2022c-ex2')).toEqual({
      id: 'bac2022c',
      kind: 'controle',
      year: 2022,
    });
    expect(examSession('bac2022p-sc-ex2')?.kind).toBe('principale');
    expect(examSession('demo-ex1')).toBeNull();
  });
});

describe('the «كمّل» card', () => {
  it('with nothing started: the first exercise of his class, its warm-up first', () => {
    const d = homeData(input());
    expect(d.hero).toEqual({
      kind: 'start',
      exerciseId: 'bac2022c-ex2',
      partId: '1a',
      warmup: true,
    });
    expect(d.stats).toBeNull();
    const sc = homeData(
      input({
        forClass: new Set(['bac2022c-sc-ex2', 'bac2022p-sc-ex2']),
        warmupSeen: () => true,
      }),
    );
    expect(sc.hero).toMatchObject({
      exerciseId: 'bac2022c-sc-ex2',
      warmup: false,
    });
  });

  it('a class with no exercise yet: «قريبا», never a bac exercise; his own started one still resumes', () => {
    expect(homeData(input({ forClass: new Set() })).hero).toEqual({
      kind: 'soon',
    });
    expect(
      homeData(
        input({
          forClass: new Set(),
          activity: [{ exerciseId: 'bac2022c-ex4', questionId: 'A2', at: NOW }],
        }),
      ).hero,
    ).toMatchObject({
      kind: 'resume',
      exerciseId: 'bac2022c-ex4',
      partId: 'A2',
    });
  });

  it('every exercise of his class done: everything done, even with others left', () => {
    const ex2 = CATALOG.find(e => e.id === 'bac2022c-ex2')!;
    const parts = ex2.result.ok
      ? ex2.result.loaded.exercise.parts.map(p => partKey('bac2022c-ex2', p.id))
      : [];
    expect(
      homeData(
        input({ forClass: new Set(['bac2022c-ex2']), done: new Set(parts) }),
      ).hero,
    ).toEqual({ kind: 'allDone' });
  });

  it('resumes the most recent unfinished exercise, at the question he was on', () => {
    const activity: Activity[] = [
      { exerciseId: 'bac2022c-ex4', questionId: 'A1', at: NOW - 3 * DAY },
      { exerciseId: 'bac2022p-sc-ex2', questionId: 't2', at: NOW - DAY },
      { exerciseId: 'bac2022p-sc-ex2', questionId: 't1', at: NOW - 2 * DAY },
    ];
    const tree = CATALOG.find(e => e.id === 'bac2022p-sc-ex2')!;
    const parts = tree.result.ok
      ? tree.result.loaded.exercise.parts.map(p => p.id)
      : [];
    const d = homeData(
      input({
        activity,
        done: new Set([partKey('bac2022p-sc-ex2', parts[0]!)]),
      }),
    );
    expect(d.hero).toEqual({
      kind: 'resume',
      exerciseId: 'bac2022p-sc-ex2',
      partId: 't2',
      done: 1,
      total: parts.length,
    });
  });

  it('when the question he was on is done, the first one not done', () => {
    const d = homeData(
      input({
        activity: [{ exerciseId: 'bac2022c-ex2', questionId: '1a', at: NOW }],
        done: new Set([partKey('bac2022c-ex2', '1a')]),
      }),
    );
    expect(d.hero).toMatchObject({ kind: 'resume', partId: '1b', done: 1 });
  });

  it('a finished exercise is not resumed; everything finished says so', () => {
    const all = new Set(
      CATALOG.flatMap(e =>
        e.result.ok
          ? e.result.loaded.exercise.parts.map(p => partKey(e.id, p.id))
          : [],
      ),
    );
    expect(homeData(input({ done: all })).hero).toEqual({ kind: 'allDone' });
  });

  it('activity on a question that does not exist is ignored', () => {
    const d = homeData(
      input({
        activity: [{ exerciseId: 'bac2022c-ex2', questionId: 'zz', at: NOW }],
      }),
    );
    expect(d.hero.kind).toBe('start');
  });
});

describe('the counts: effort only', () => {
  it('questions finished, exercises started, days this week (from Monday)', () => {
    expect(new Date(weekStart(NOW)).getDay()).toBe(1);
    const d = homeData(
      input({
        done: new Set([
          partKey('bac2022c-ex2', '1a'),
          partKey('bac2022c-ex2', '1b'),
          partKey('nope', '1a'),
        ]),
        activity: [
          { exerciseId: 'bac2022c-ex4', questionId: 'A1', at: NOW - DAY },
        ],
        // Monday and Tuesday (twice) this week, and the Saturday before: two days.
        activeDays: [NOW - 2 * DAY, NOW - DAY, NOW - DAY + 1000, NOW - 4 * DAY],
      }),
    );
    expect(d.stats).toEqual({
      questionsDone: 2,
      exercisesStarted: 2,
      daysThisWeek: 2,
    });
  });
});

describe('the domains and the sessions', () => {
  it('lists the four domains; the ones with no exercise are «قريبا»', () => {
    const d = homeData(
      input({ done: new Set([partKey('bac2022c-ex2', '1a')]) }),
    );
    expect(d.domains.map(x => [x.domain, x.exercises])).toEqual([
      ['probability', 3],
      ['analysis', 1],
      ['sequences', 0],
      ['complex', 0],
    ]);
    expect(d.domains[0]!.done).toBe(1);
    expect(d.domains[0]!.total).toBeGreaterThan(10);
  });

  it('groups the exercises by exam session, the principale first', () => {
    const d = homeData(input());
    expect(d.sessions.map(s => [s.id, s.exercises])).toEqual([
      ['bac2022p', 1],
      ['bac2022c', 3],
    ]);
    expect(catalogOf(CATALOG, { session: 'bac2022c' }).map(e => e.id)).toEqual([
      'bac2022c-ex2',
      'bac2022c-sc-ex2',
      'bac2022c-ex4',
    ]);
    expect(catalogOf(CATALOG, { domain: 'analysis' }).map(e => e.id)).toEqual([
      'bac2022c-ex4',
    ]);
  });
});

describe('the active days', () => {
  it('notes each day once and keeps the last fourteen', () => {
    const store = memoryStore();
    noteActiveDay(store, NOW);
    noteActiveDay(store, NOW + 1000);
    expect(loadActiveDays(store)).toHaveLength(1);
    for (let i = 1; i <= 20; i++) {
      noteActiveDay(store, NOW + i * DAY);
    }
    expect(loadActiveDays(store)).toHaveLength(14);
    store.set('home.activeDays.v1', '{broken');
    expect(loadActiveDays(store)).toEqual([]);
  });
});
