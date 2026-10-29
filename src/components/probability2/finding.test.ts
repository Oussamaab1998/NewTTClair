import { EventSchema } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import {
  ExploredPayloadSchema,
  FINDING_HOW,
  FindingPayloadSchema,
  makeExplored,
  makeFinding,
  type FindingInput,
} from './finding';

const good: FindingInput = {
  findingId: 'groupboxes.orderings_per_box',
  numbers: { boxes: '120', perBox: '6', ordered: '720' },
  route: ['predict:boxes=120', 'expand:r1.n1.n2', 'enter:boxes=120'],
  how: 'found',
  correct: true,
};

describe('FindingPayload: what the student found, for the future "what we found" sheet', () => {
  it('a complete payload parses', () => {
    expect(FindingPayloadSchema.parse(good)).toEqual(good);
  });

  it('calc: engine-built LaTeX lines with the student\'s own numbers (change 4)', () => {
    const withCalc = {
      ...good,
      calc: ['\\frac{720}{6} = 120', 'C_{10}^{3} = 120'],
    };
    expect(FindingPayloadSchema.parse(withCalc)).toEqual(withCalc);
    expect(FindingPayloadSchema.safeParse(good).success).toBe(true); // calc is optional
  });

  it('how: found, helped, revealed or skipped; a revealed or skipped finding is never "correct: true" by itself', () => {
    expect([...FINDING_HOW]).toEqual(['found', 'helped', 'revealed', 'skipped']);
    for (const how of FINDING_HOW) {
      expect(FindingPayloadSchema.safeParse({ ...good, how }).success).toBe(
        how === 'found' || how === 'helped',
      );
    }
    expect(
      FindingPayloadSchema.safeParse({ ...good, how: 'revealed', correct: null }).success,
    ).toBe(true);
    expect(
      FindingPayloadSchema.safeParse({ ...good, how: 'skipped', correct: null }).success,
    ).toBe(true);
    expect(
      FindingPayloadSchema.safeParse({ ...good, how: 'skipped', correct: false }).success,
    ).toBe(true);
  });

  it.each([
    ['an id without a dot', { findingId: 'groupboxes' }],
    ['an id with capitals', { findingId: 'GroupBoxes.x' }],
    ['a number that is not an exact rational', { numbers: { boxes: '12x' } }],
    ['a float as a number', { numbers: { boxes: 120 } }],
    ['a number key that is not an identifier', { numbers: { 'a b': '1' } }],
    ['13 numbers', { numbers: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`n${i}`, '1'])) }],
    ['13 route tokens', { route: Array.from({ length: 13 }, () => 'tap:a') }],
    ['a route token with a newline', { route: ['tap:a\nb'] }],
    ['a route token with Arabic (free text)', { route: ['note:مرحبا'] }],
    ['a route token longer than 48 characters', { route: [`tap:${'a'.repeat(60)}`] }],
    ['a missing "correct"', { correct: undefined }],
    ['a calc line that does not parse', { calc: ['\\frac{1}{'] }],
    ['a calc line with Arabic', { calc: ['م = 1'] }],
    ['7 calc lines', { calc: Array.from({ length: 7 }, () => '1 + 1 = 2') }],
    ['an extra key', { note: 'hi' }],
  ])('rejects %s', (_label, patch) => {
    expect(FindingPayloadSchema.safeParse({ ...good, ...patch }).success).toBe(false);
  });

  it('makeFinding returns plain JSON: no undefined, so the event log accepts it', () => {
    const p = makeFinding(good);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
    expect('calc' in p).toBe(false);
    expect(makeFinding({ ...good, calc: ['1 + 1 = 2'] }).calc).toEqual(['1 + 1 = 2']);
  });

  it('makeFinding refuses an invalid finding (a component must not emit a malformed one)', () => {
    expect(() => makeFinding({ ...good, findingId: 'bad' })).toThrow();
  });

  it('is a valid component_event payload for the real event schema and the event log', () => {
    const log = new EventLog(
      {
        sessionId: 's1',
        studentId: 'anon-1',
        exerciseId: 'bac2022c-sc-ex2',
        contentVersion: 'exsc2-0.1.0',
      },
      fixedClock(),
    );
    const [ev] = log.append([
      {
        t: 'component_event',
        questionId: '1',
        stepId: 's4',
        component: 'GroupBoxes',
        name: 'finding',
        payload: makeFinding({ ...good, calc: ['\\frac{720}{6} = 120'] }),
      },
    ]);
    expect(EventSchema.safeParse(ev).success).toBe(true);
  });
});

describe('explored: the engagement event that opens a gate, with an escape (change 2)', () => {
  it('done and skipped are both valid; nothing else is', () => {
    expect(ExploredPayloadSchema.safeParse({ why: '3_positions', how: 'done' }).success).toBe(true);
    expect(ExploredPayloadSchema.safeParse({ why: 'not_sure', how: 'skipped' }).success).toBe(true);
    expect(ExploredPayloadSchema.safeParse({ why: 'x', how: 'found' }).success).toBe(false);
    expect(ExploredPayloadSchema.safeParse({ why: 'Free text here', how: 'done' }).success).toBe(false);
    expect(ExploredPayloadSchema.safeParse({ how: 'done' }).success).toBe(false);
  });

  it('makeExplored builds plain JSON', () => {
    expect(makeExplored('3_positions', 'done')).toEqual({ why: '3_positions', how: 'done' });
    expect(makeExplored('not_sure', 'skipped')).toEqual({ why: 'not_sure', how: 'skipped' });
    expect(() => makeExplored('Bad Why', 'done')).toThrow();
  });
});
