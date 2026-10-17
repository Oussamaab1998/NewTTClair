import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../content/loader';
import type { Event, EventDraft } from '../telemetry/events';
import { EventLog, fixedClock } from '../telemetry/log';
import { catalogFor, type Catalog } from './catalog';
import { THRESHOLDS } from './config';
import { deriveState } from './derive';

function load(): LoadedExercise {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const loaded = load();
const CV = loaded.exercise.contentVersion;

/** Events of several sessions, stamped in order (one shared clock). */
function history() {
  const clock = fixedClock();
  const logs = new Map<string, EventLog>();
  const all: Event[] = [];
  const add = (sessionId: string, drafts: EventDraft[], cv = CV) => {
    const key = `${sessionId}|${cv}`;
    let log = logs.get(key);
    if (!log) {
      log = new EventLog(
        {
          sessionId,
          studentId: 'anon-1',
          exerciseId: 'bac2022c-ex2',
          contentVersion: cv,
        },
        clock,
      );
      logs.set(key, log);
    }
    all.push(...log.append(drafts));
  };
  return { add, all };
}

const at = (questionId: string, stepId: string) => ({ questionId, stepId });
const answer = (
  q: string,
  step: string,
  correct: boolean,
  extra: Partial<Extract<EventDraft, { t: 'answer' }>> = {},
): EventDraft => ({
  ...at(q, step),
  t: 'answer',
  kind: 'typed',
  value: correct ? 'ok' : 'no',
  correct,
  attempt: 1,
  ...extra,
});

const catalog: Catalog = catalogFor(loaded);
const state = (events: readonly Event[], c: Catalog = catalog) =>
  deriveState(events, c);

describe('deriveState: evidence rules (DATA.md §3)', () => {
  it('a skipped optional task is neither a pass nor a fail', () => {
    const h = history();
    h.add('s1', [{ ...at('2a', 's18'), t: 'skip', reason: 'knows_it' }]);
    const law = state(h.all).skills['random-variable-law']!;
    expect(law.evidence).toMatchObject({ skipped: 1, correct: 0, wrong: 0 });
    expect(law.status).toBe('unseen');
  });

  it('a revealed answer is never a success; a revealed law cell is not one either', () => {
    const h = history();
    h.add('s1', [
      { ...at('2a', 's15'), t: 'reveal', hintsUsed: 2, attempt: 1 },
      {
        ...at('2a', 's15'),
        t: 'component_event',
        component: 'LawBuilder',
        name: 'cell_filled_by_lesson',
        payload: { blockId: 'q2a-law', value: -2, source: 'revealed' },
      },
    ]);
    const s = state(h.all).skills['event-as-set']!;
    expect(s.evidence).toMatchObject({ revealed: 1, correct: 0 });
    expect(s.status).toBe('shaky');
  });

  it('"guessed" turns the last correct answer into weak evidence', () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', true),
      { ...at('1b', 's5'), t: 'self_report', value: 'guessed' },
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.evidence).toMatchObject({ correct: 0, guessed: 1 });
    expect(s.status).toBe('shaky');
    const h2 = history();
    h2.add('s1', [
      answer('1b', 's5', true),
      { ...at('1b', 's5'), t: 'self_report', value: 'understood' },
    ]);
    expect(state(h2.all).skills['counting-pairs']!.status).toBe('known');
  });

  it('a dismissed self-report is no evidence at all', () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', true),
      { ...at('1b', 's5'), t: 'self_report', value: 'dismissed' },
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.evidence).toMatchObject({ correct: 1, guessed: 0 });
    expect(s.status).toBe('known');
  });

  it('keeps "not sure" out of wrong-answer evidence', () => {
    const h = history();
    h.add('s1', [{ ...at('1b', 's5'), t: 'not_sure', attempt: 1 }]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.evidence).toMatchObject({ notSure: 1, wrong: 0 });
  });

  it(`gap: ${THRESHOLDS.gapSignalsPerSession} wrong / not-sure signals on a skill in one session`, () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', false),
      { ...at('1b', 's5'), t: 'not_sure', attempt: 2 },
    ]);
    expect(state(h.all).skills['counting-pairs']!.status).toBe('gap');
    // The same two signals spread over two sessions are not a gap.
    const h2 = history();
    h2.add('s1', [answer('1b', 's5', false)]);
    h2.add('s2', [{ ...at('1b', 's5'), t: 'not_sure', attempt: 1 }]);
    expect(state(h2.all).skills['counting-pairs']!.status).toBe('shaky');
  });

  it('a mini question inside a deep dive is practice, never a transfer', () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', false),
      { ...at('1b', 's5'), t: 'not_sure', attempt: 2 },
      answer('1b', 'dd:pairs_listing', true),
      {
        ...at('1b', 's5'),
        t: 'deepdive',
        deepDiveId: 'pairs_listing',
        outcome: 'completed',
        miniCorrect: true,
      },
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.evidence.transferOk).toBe(0);
    expect(s.evidence.correct).toBe(1);
    expect(s.status).toBe('gap');
  });

  it('recovering after one transfer; closed after a later clean transfer', () => {
    const gap: EventDraft[] = [
      answer('1b', 's5', false),
      answer('1b', 's5', false, { attempt: 2 }),
    ];
    const transfer = (hintsUsed: number): EventDraft => ({
      ...at('1b', 'var:tr-1b-s5-noneg'),
      t: 'transfer',
      skillId: 'counting-pairs',
      correct: true,
      variantId: 'tr-1b-s5-noneg',
      hintsUsed,
    });
    const h = history();
    h.add('s1', [...gap, transfer(1)]);
    expect(state(h.all).skills['counting-pairs']!.status).toBe('recovering');
    h.add('s1', [transfer(0)]);
    // Same session: still recovering (closed needs a later session).
    expect(state(h.all).skills['counting-pairs']!.status).toBe('recovering');
    h.add('s2', [transfer(2)]);
    expect(state(h.all).skills['counting-pairs']!.status).toBe('recovering');
    h.add('s2', [transfer(0)]);
    expect(state(h.all).skills['counting-pairs']!.status).toBe('closed');
  });

  it('a failed transfer does not recover the gap', () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', false),
      answer('1b', 's5', false, { attempt: 2 }),
      {
        ...at('1b', 'var:tr-1b-s5-noneg'),
        t: 'transfer',
        skillId: 'counting-pairs',
        correct: false,
        variantId: 'tr-1b-s5-noneg',
        hintsUsed: 0,
      },
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.evidence).toMatchObject({ transferOk: 0, transferFail: 1 });
    expect(s.status).toBe('gap');
  });

  it('a correct answer after a hint counts as helped (shaky, not known)', () => {
    const h = history();
    h.add('s1', [
      { ...at('1b', 's5'), t: 'hint', level: 1 },
      answer('1b', 's5', true),
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.evidence).toMatchObject({ correct: 1, helped: 1, hints: 1 });
    expect(s.status).toBe('shaky');
  });

  it('counts misconceptions per skill', () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', false, { misconceptionId: 'counts_all_outcomes' }),
      answer('1b', 's5', false, {
        misconceptionId: 'counts_all_outcomes',
        attempt: 2,
      }),
    ]);
    expect(state(h.all).skills['counting-pairs']!.misconceptions).toEqual({
      counts_all_outcomes: 2,
    });
  });
});

describe('deriveState: representations', () => {
  it('collects every representation shown (components, deep dives as text, variants)', () => {
    const h = history();
    h.add('s1', [
      {
        ...at('2a', 's5'),
        t: 'component_event',
        component: 'OutcomeSpace',
        name: 'shown',
        payload: { blockId: 'q2a-s5' },
      },
      {
        ...at('2a', 's6'),
        t: 'component_event',
        component: 'DeepDive',
        name: 'shown',
        payload: { deepDiveId: 'pairs_listing', representation: 'text' },
      },
      {
        ...at('2a', 's6'),
        t: 'component_event',
        component: 'Variant',
        name: 'shown',
        payload: {
          variantId: 'sim-pairs-1',
          kind: 'simpler',
          representation: 'Urn',
          round: 1,
        },
      },
    ]);
    expect(state(h.all).skills['counting-pairs']!.representationsTried).toEqual(
      ['OutcomeSpace', 'text', 'Urn'],
    );
  });

  it('records which planner-chosen representation helped (the step was then answered right)', () => {
    const h = history();
    h.add('s1', [
      answer('2a', 's6', false),
      {
        ...at('2a', 's6'),
        t: 'component_event',
        component: 'Variant',
        name: 'shown',
        payload: {
          variantId: 'alt-2a-s6-list',
          kind: 'alternative',
          representation: 'OutcomeSpace',
        },
        reaction: {
          reactionId: 'rule.second_wrong',
          representation: 'OutcomeSpace',
        },
      },
      answer('2a', 's6', true, { attempt: 2 }),
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.representationsHelped).toEqual(['OutcomeSpace']);
  });
});

describe('deriveState: math gaps vs writing habits', () => {
  it('a writing-habit misconception goes to habits, not to math evidence', () => {
    const c = catalogFor(loaded);
    c.misconceptions.set('missing_parentheses_fraction', {
      skillId: 'writing-parentheses',
      category: 'writing',
    });
    const h = history();
    h.add('s1', [
      answer('1b', 's8', false, {
        misconceptionId: 'missing_parentheses_fraction',
      }),
    ]);
    const s = state(h.all, c);
    expect(s.habits['writing-parentheses']).toMatchObject({
      count: 1,
      misconceptions: { missing_parentheses_fraction: 1 },
    });
    expect(s.skills['complement-event']).toBeUndefined();
  });

  it('a misconception on a writing skill is a habit even if not flagged', () => {
    const c = catalogFor(loaded);
    c.misconceptions.set('no_conclusion', {
      skillId: 'writing-conclusion',
      category: 'math',
    });
    const h = history();
    h.add('s1', [
      answer('1b', 's8', false, { misconceptionId: 'no_conclusion' }),
    ]);
    expect(state(h.all, c).habits['writing-conclusion']?.count).toBe(1);
  });
});

describe('deriveState: bookkeeping', () => {
  it('schedules a review after a gap (lastSeen + delay)', () => {
    const h = history();
    h.add('s1', [
      answer('1b', 's5', false),
      answer('1b', 's5', false, { attempt: 2 }),
    ]);
    const s = state(h.all).skills['counting-pairs']!;
    expect(s.nextReviewAt).toBe(
      s.evidence.lastSeen + THRESHOLDS.reviewDelayMs.gap,
    );
    const known = history();
    known.add('s1', [answer('1b', 's5', true)]);
    expect(
      state(known.all).skills['counting-pairs']!.nextReviewAt,
    ).toBeUndefined();
  });

  it('never attaches steps of an unknown content version to a skill', () => {
    const h = history();
    h.add('s1', [answer('1b', 's5', false)], 'ex2-0.0.1');
    const s = state(h.all);
    expect(s.skills).toEqual({});
    expect(s.unattributed).toBe(1);
  });
});
