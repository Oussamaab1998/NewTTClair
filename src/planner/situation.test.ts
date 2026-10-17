import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import { catalogFor } from '../state/catalog';
import type { Event, EventDraft } from '../telemetry/events';
import { EventLog, fixedClock } from '../telemetry/log';
import { buildSituation, triggerOf } from './situation';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const catalog = catalogFor(loaded);

function session(drafts: EventDraft[]): Event[] {
  const log = new EventLog(
    {
      sessionId: 'sess-PRIVATE',
      studentId: 'student-PRIVATE',
      exerciseId: 'bac2022c-ex2',
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  return log.append(drafts);
}
const at = (stepId: string, questionId = '1b') => ({ questionId, stepId });

/** Every string in a JSON value, with its path. */
function strings(value: unknown, path: string[] = []): [string[], string][] {
  if (typeof value === 'string') {
    return [[path, value]];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => strings(v, [...path, String(i)]));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => strings(v, [...path, k]));
  }
  return [];
}

describe('situation: privacy (LLM context pack in Phase 4)', () => {
  const SECRET = 'SECRET-free-text';
  const events = session([
    {
      ...at('s3'),
      t: 'ask',
      via: 'longpress',
      mode: 'why',
      quoted: `${SECRET} quoted`,
      source: 'local',
      snapshot: { blockId: 'q1b-s1', note: SECRET },
    },
    {
      ...at('s3'),
      t: 'ask',
      via: 'field',
      text: `${SECRET} asked`,
      source: 'local',
    },
    {
      ...at('s3'),
      t: 'component_event',
      component: 'NumericKeypad',
      name: 'invalid_input',
      payload: { raw: SECRET },
    },
    {
      ...at('s3'),
      t: 'component_event',
      component: 'EventPicker',
      name: 'outcome_selected',
      payload: { note: SECRET, count: 2 },
    },
    // A typed "answer" that is not a number never reaches the situation.
    {
      ...at('s5'),
      t: 'answer',
      kind: 'typed',
      value: SECRET,
      correct: false,
      attempt: 1,
    },
    {
      ...at('s5'),
      t: 'answer',
      kind: 'task',
      value: { note: SECRET },
      correct: false,
      attempt: 2,
    },
  ]);

  it('carries free student text only in request.text', () => {
    const plain = buildSituation(events, catalog)!;
    expect(strings(plain).filter(([, s]) => s.includes(SECRET))).toEqual([]);
    const withAsk = buildSituation(events, catalog, {
      requestText: `${SECRET} asked`,
    })!;
    const leaks = strings(withAsk).filter(([, s]) => s.includes(SECRET));
    expect(leaks.map(([p]) => p.join('.'))).toEqual(['request.text']);
  });

  it('has no student or session id and stays small', () => {
    const s = buildSituation(events, catalog)!;
    const json = JSON.stringify(s);
    expect(json).not.toContain('PRIVATE');
    expect(json.length).toBeLessThan(4000);
  });

  it('keeps exact wrong values: option ids and numbers only', () => {
    const e = session([
      {
        ...at('s7'),
        t: 'answer',
        kind: 'choice',
        value: 'p7_10',
        correct: false,
        misconceptionId: 'confuses_event_and_complement',
        attempt: 1,
      },
      {
        ...at('s8'),
        t: 'answer',
        kind: 'typed',
        value: '0,3',
        correct: false,
        attempt: 1,
      },
    ]);
    expect(buildSituation(e, catalog, { at: 0 })!.step.wrongValues).toEqual([
      { value: 'p7_10', misconceptionId: 'confuses_event_and_complement' },
    ]);
    expect(buildSituation(e, catalog)!.step.wrongValues).toEqual([
      { value: '0,3' },
    ]);
  });
});

describe('situation: content', () => {
  it('finds the trigger: the last decision point', () => {
    const e = session([
      { ...at('s3'), t: 'hint', level: 1 },
      { ...at('s3'), t: 'not_sure', attempt: 1 },
      { ...at('s3'), t: 'hint', level: 2 },
    ]);
    expect(triggerOf(e[0]!)).toBeNull();
    const s = buildSituation(e, catalog)!;
    expect(s.trigger).toBe('not_sure');
    expect(s.step).toMatchObject({
      key: '1b/s3',
      scope: 'main',
      skills: ['complement-event', 'au-moins-un'],
      notSure: 1,
      hintsUsed: 1,
      hintCount: 3,
    });
  });

  it('counts struggle as wrong answers and "not sure" together', () => {
    const e = session([
      {
        ...at('s5'),
        t: 'answer',
        kind: 'typed',
        value: '6',
        correct: false,
        attempt: 1,
      },
      { ...at('s5'), t: 'not_sure', attempt: 2 },
      {
        ...at('s5'),
        t: 'answer',
        kind: 'typed',
        value: '10',
        correct: false,
        attempt: 2,
      },
    ]);
    expect(buildSituation(e, catalog)!.step).toMatchObject({
      wrong: 2,
      notSure: 1,
      struggle: 3,
    });
  });

  it('tracks open detours (depth), deep dives shown and their outcome', () => {
    const e = session([
      {
        ...at('s5'),
        t: 'component_event',
        component: 'DeepDive',
        name: 'shown',
        payload: { deepDiveId: 'pairs_listing', representation: 'text' },
        reaction: { reactionId: 'rule.second_wrong', representation: 'text' },
      },
      { ...at('dd:pairs_listing'), t: 'not_sure', attempt: 1 },
    ]);
    const inside = buildSituation(e, catalog)!;
    expect(inside.depth).toBe(1);
    expect(inside.step.key).toBe('dd:pairs_listing');
    expect(inside.question.deepDivesShown).toEqual(['pairs_listing']);
    const closed = buildSituation(
      [
        ...e,
        ...session([
          {
            ...at('s5'),
            t: 'deepdive',
            deepDiveId: 'pairs_listing',
            outcome: 'completed',
            miniCorrect: false,
          },
        ]),
      ],
      catalog,
    )!;
    expect(closed.trigger).toBe('detour_closed');
    expect(closed.depth).toBe(0);
    expect(closed.detours).toMatchObject([
      {
        kind: 'deep_dive',
        id: 'pairs_listing',
        representation: 'text',
        outcome: 'completed',
        miniCorrect: false,
        ruleId: 'rule.second_wrong',
      },
    ]);
  });

  it('counts the clean streak (first try, no help) across main steps', () => {
    const ok = (step: string): EventDraft => ({
      ...at(step),
      t: 'answer',
      kind: 'typed',
      value: '1',
      correct: true,
      attempt: 1,
    });
    const e = session([ok('s3'), ok('s5'), ok('s7')]);
    expect(buildSituation(e, catalog)!.question.cleanStreak).toBe(3);
    const helped = session([
      ok('s3'),
      { ...at('s5'), t: 'hint', level: 1 },
      ok('s5'),
      ok('s7'),
    ]);
    expect(buildSituation(helped, catalog)!.question.cleanStreak).toBe(1);
  });

  it('marks components used when the student interacts, with numeric snapshot only', () => {
    const e = session([
      {
        ...at('s5', '2a'),
        t: 'component_event',
        component: 'OutcomeSpace',
        name: 'shown',
        payload: { blockId: 'q2a-s5' },
      },
      {
        ...at('s5', '2a'),
        t: 'component_event',
        component: 'OutcomeSpace',
        name: 'expanded',
        payload: { expanded: true, instanceId: 'q2a-s5' },
      },
      { ...at('s6', '2a'), t: 'not_sure', attempt: 1 },
    ]);
    expect(buildSituation(e, catalog)!.componentsShown).toEqual([
      {
        component: 'OutcomeSpace',
        stepKey: '2a/s5',
        used: true,
        snapshot: { expanded: true },
      },
    ]);
  });
});
