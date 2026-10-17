import { readFileSync } from 'fs';
import { join } from 'path';

import ex2 from '../../src/content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../src/content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../src/content/loader';
import { EventSchema } from '../../src/telemetry/events';
import {
  LabelsSchema,
  LegacyMapSchema,
  agreement,
  convertLegacy,
  formatAgreement,
  formatTable,
  readLog,
  replayDecisions,
} from './lib';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const samples = join(__dirname, '../../docs/samples');
const read = (name: string) => readFileSync(join(samples, name), 'utf8');
const map = LegacyMapSchema.parse(JSON.parse(read('legacy_step_map.json')));
const legacy = convertLegacy(read('ex2_session_1.jsonl'), map, loaded);

describe('legacy converter', () => {
  it('produces events in the current format', () => {
    expect(legacy.errors).toEqual([]);
    for (const e of legacy.events) {
      expect(EventSchema.safeParse(e).success).toBe(true);
    }
  });

  it('turns the mislabeled transfer_ok into a mini answer, never a transfer', () => {
    expect(legacy.events.some(e => e.t === 'transfer')).toBe(false);
    const minis = legacy.events.filter(
      e => e.t === 'answer' && e.stepId.startsWith('dd:'),
    );
    // 5 old "transfer_ok" (mini right) + 1 mini wrong.
    expect(minis.length).toBe(6);
    const dives = legacy.events.filter(e => e.t === 'deepdive');
    expect(
      dives.map(e => e.t === 'deepdive' && [e.deepDiveId, e.miniCorrect]),
    ).toEqual([
      ['au_moins_contraire', true],
      ['au_moins_contraire', true],
      ['pairs_listing', false],
      ['product_zero', true],
      ['pairs_listing', true],
    ]);
  });

  it('marks what the old log lacks as unknown (value never invented)', () => {
    const answers = legacy.events.filter(e => e.t === 'answer');
    expect(answers.every(e => e.t === 'answer' && e.value === null)).toBe(true);
    expect(answers.some(e => 'durationMs' in e)).toBe(false);
    const first = legacy.unknowns.events.find(
      x => legacy.events[x.index]?.t === 'answer',
    );
    expect(first?.unknown).toEqual(
      expect.arrayContaining(['value', 'durationMs', 'misconceptionId']),
    );
    expect(legacy.unknowns.global.durationMs).toMatch(/unknown/);
    expect(legacy.unknowns.note).toMatch(/GUESS/);
  });

  it('keeps steps of 1.a (not in our content) under their old ids', () => {
    expect(
      legacy.events.filter(e => e.questionId === '1a').map(e => e.stepId),
    ).toEqual(['none', 'q1', 'q2', 'in1']);
  });
});

describe('replay', () => {
  it('reads current-format logs and reports invalid lines', () => {
    const text = [
      JSON.stringify(legacy.events[0]),
      '{"t":"correct","at":"q1"}',
      'nope',
    ].join('\n');
    const { events, errors } = readLog(text);
    expect(events).toHaveLength(1);
    expect(errors.map(e => e.line)).toEqual([2, 3]);
  });

  it('prints one row per decision point: step, what happened, state, rule, action, representation', () => {
    const rows = replayDecisions(legacy.events, loaded, {
      unknowns: legacy.unknowns,
    });
    expect(rows).toHaveLength(23);
    expect(rows[8]).toMatchObject({
      step: '1b/s8',
      trigger: 'not_sure',
      ruleId: 'rule.deep_dive_repeat',
      action: 'variant alt-1b-s8-complement',
      representation: 'ComplementView',
    });
    const table = formatTable(rows);
    expect(table.split('\n')[0]).toBe(
      '| # | step | what happened | state | rule | action | representation | logged |',
    );
    expect(table).toContain('[unknown: value, durationMs, misconceptionId]');
  });

  it('compares with the logged decision when the log has plan events', () => {
    const decision = {
      diagnosis: {
        skillIds: [],
        misconceptionIds: [],
        confidence: 0,
        summary: '',
      },
      avoid: [],
      next: { kind: 'continue' as const },
      ruleId: 'rule.other',
      source: 'rules' as const,
    };
    const base = legacy.events[1]!;
    const withPlan = [
      base,
      {
        ...base,
        id: 'ev-plan',
        t: 'plan' as const,
        trigger: 'correct' as const,
        decision,
      },
    ];
    const [row] = replayDecisions(withPlan as never, loaded);
    expect(row?.logged).toBe('rule.other');
  });
});

describe('labels and agreement', () => {
  const labels = LabelsSchema.parse(
    JSON.parse(read('ex2_session_1.labels.json')),
  );
  const rows = replayDecisions(legacy.events, loaded);

  it('the sample labels say they are a transcription, not teacher labels', () => {
    expect(labels.teacherReviewed).toBe(false);
    expect(labels.source).toMatch(/NOT teacher labels/);
    expect(formatAgreement(agreement(rows, labels), labels)).toContain(
      'NOT teacher labels',
    );
  });

  it('scores agree / partial / disagree / missing per point', () => {
    const one = (
      kinds: string[],
      representations?: string[],
      step = '1b/s8',
      trigger = 'not_sure',
    ) =>
      agreement(rows, {
        ...labels,
        points: [
          {
            row: 0,
            at: { step, trigger, occurrence: 1 },
            preferred: { kinds, ...(representations && { representations }) },
          },
        ],
      }).rows[0]!.verdict;
    expect(one(['variant'], ['ComplementView'])).toBe('agree');
    expect(one(['variant'], ['LawBuilder'])).toBe('partial');
    expect(one(['hint'])).toBe('disagree');
    expect(one(['hint'], undefined, '9z/none')).toBe('missing');
  });

  it('reproduces the current baseline on the converted session (update when rules change)', () => {
    const { counts } = agreement(rows, labels);
    expect(counts).toEqual({ agree: 10, partial: 1, disagree: 1, missing: 0 });
    // Without the guessed "typed" kind for 1a/in1, row 1 (compress) cannot agree.
    const noGuess = { ...map };
    delete noGuess.kinds;
    const strict = convertLegacy(read('ex2_session_1.jsonl'), noGuess, loaded);
    expect(
      agreement(replayDecisions(strict.events, loaded), labels).counts,
    ).toEqual({
      agree: 9,
      partial: 1,
      disagree: 2,
      missing: 0,
    });
  });
});
