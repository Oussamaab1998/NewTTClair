import { buildGraphFor } from '../../method/templates';
import { mutationsFor } from '../../method/mutations';
import { memoryStore } from '../../storage/kv';
import { autoCheck } from '../checks/autoCheck';
import type { QuestionPack } from '../packs/build';
import { TUTOR_NOTES } from '../packs/notes';
import { newSession } from '../session/state';
import { BOOKKEEPING } from '../tools/bookkeeping';
import { prerequisiteClosure, profileDigest } from './digest';
import {
  applySession,
  emptyProfile,
  levelOf,
  loadProfile,
  saveProfile,
} from './profile';

const graph = buildGraphFor(
  { template: 'urn_exactly_j', args: { j: 1 } },
  { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
);
const main = { id: 'main', graph, table: mutationsFor(graph), extra: [] };
const notes = TUTOR_NOTES['bac2022c-sc-ex2']!['1']!;
const pack: QuestionPack = {
  questionId: '1',
  label: '1',
  wording: '',
  main,
  plan: [],
  read: [],
  recipe: null,
  notes,
  given: ['3', '4', '6', '10', '0.5', '1/2'],
};
const node = (n: string) => ({
  kind: 'line' as const,
  expect: { kind: 'node' as const, graph: 'main', node: n },
});

/** The owner's harness run, condensed: slips first, then his own fixes. */
function ownerSession() {
  const rt = newSession('bac2022c-sc-ex2', '1', main, pack.given);
  const line = (raw: string, n: string) =>
    autoCheck({ kind: 'line', raw }, node(n), rt, pack);
  line('10*9*8', 'total');
  line('720/3*2*1=120', 'total');
  line('720/(3*2*1)=120', 'total');
  autoCheck({ kind: 'dont_know' }, null, rt, pack);
  line('6*5=30', 'fav_black');
  line('(6*5)/(2*1)=15', 'fav_black');
  line('1', 'fav_red');
  line('4*15=60', 'fav');
  line('60/120=1/2', 'result');
  BOOKKEEPING.record_observation!({ rt, experiment: null }, {
    kind: 'misconception',
    skill: 'ordering-vs-choosing',
    slip: 'drop_division',
    note: 'Counts ordered pairs first for a part drawn together.',
    evidence: ['L4'],
    confidence: 'medium',
  } as never);
  return rt.state;
}

describe('student profile', () => {
  it('turns a session into engine-evidence counters and keeps his lines as evidence', () => {
    const p = applySession(emptyProfile(0), {
      state: ownerSession(),
      outcome: 'solved_with_help',
      summary: 'Fixed his own slips with checks.',
      nextTime: 'Start from a small box.',
      now: 1000,
    });
    expect(p.skills['combinations-count']).toMatchObject({
      afterHelp: 2,
      slips: {},
    });
    expect(p.skills['ordering-vs-choosing']?.slips).toEqual({
      drop_division: 1,
      over_generalised_order_rule: 1,
    });
    expect(p.skills['brackets-division']?.slips).toEqual({
      bracket_left_to_right: 1,
    });
    expect(p.skills['multiplication-principle']).toMatchObject({
      firstTry: 1,
      level: 'shaky',
    });
    expect(p.observations[0]).toMatchObject({
      status: 'open',
      evidence: ['6*5=30'],
    });
    expect(p.sessions[0]).toMatchObject({ dontKnows: 1, studentTurns: 0 });
  });

  it('confirms an observation when the same slip comes back later', () => {
    const once = applySession(emptyProfile(0), {
      state: ownerSession(),
      outcome: 'solved_with_help',
      summary: '',
      nextTime: '',
      now: 1,
    });
    const twice = applySession(once, {
      state: ownerSession(),
      outcome: 'solved_with_help',
      summary: '',
      nextTime: '',
      now: 2,
    });
    expect(twice.observations[0]?.status).toBe('confirmed');
    expect(twice.sessions).toHaveLength(2);
  });

  it('round-trips through the store and survives bad data', () => {
    const store = memoryStore();
    expect(loadProfile(store)).toBeNull();
    saveProfile(store, emptyProfile(5));
    expect(loadProfile(store)?.createdAt).toBe(5);
    store.set('ai.profile.v1', '{"v":2}');
    expect(loadProfile(store)).toBeNull();
  });

  it('levels are a guess from counts', () => {
    const r = {
      attempts: 3,
      firstTry: 3,
      afterHelp: 0,
      slips: {},
      dontKnow: 0,
      lastSeenAt: 0,
      level: 'unknown' as const,
    };
    expect(levelOf(r)).toBe('solid');
    expect(levelOf({ ...r, firstTry: 0, slips: { x: 2 } })).toBe('weak');
  });
});

describe('profile digest', () => {
  it('names the old-year prerequisites of the question', () => {
    expect(prerequisiteClosure(['combinations-count'])).toEqual(
      expect.arrayContaining([
        'listing-systematically',
        'brackets-division',
        'order-of-operations',
      ]),
    );
  });

  it('is short and says what the tutor needs', () => {
    const p = applySession(emptyProfile(0), {
      state: ownerSession(),
      outcome: 'solved_with_help',
      summary: 'Fixed his own slips with checks.',
      nextTime: 'Start from a small box.',
      now: 1000,
    });
    const d = profileDigest({ ...p, year: '4s' }, notes);
    expect(d.length).toBeLessThanOrEqual(2500);
    expect(d).toContain('Year: 4s');
    expect(d).toContain('brackets-division (7b)');
    expect(d).toContain('his lines: 6*5=30');
    expect(d).toContain('Next time: Start from a small box.');
    expect(profileDigest(null, notes)).toBe('new student, no history yet.');
  });
});
