import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import { RepeatedRunsPropsSchema } from './schemas';
import {
  REPEATED_RUNS_REVEALS,
  runsCalc,
  runsFinding,
  runsModel,
  stageCells,
} from './runsModel';

const model = (p: Record<string, unknown>) => runsModel(RepeatedRunsPropsSchema.parse(p));
const frac6 = { N: 36, mode: 'fraction_of_total', stages: [{ p: '1/6' }] };
const two = { N: 36, mode: 'two_stage', stages: [{ p: '1/6' }, { p: '1/6' }] };
const tally = {
  N: 60,
  mode: 'tally',
  tally: { values: [1, 2, 3, 4, 5, 6], probabilities: ['1/6', '1/6', '1/6', '1/6', '1/6', '1/6'] },
};
const is = (n: number) => (f: readonly [number, number]) => f[0] === n && f[1] === 1;

describe('runsModel', () => {
  it('fraction_of_total: 1/6 of 36 runs is 6', () => {
    const m = model(frac6);
    expect(m.counts).toEqual([36, 6]);
    expect(m.lastStage).toBe(1);
  });

  it('two_stage: 36 -> 6 -> 1', () => {
    const m = model(two);
    expect(m.counts).toEqual([36, 6, 1]);
    expect(m.lastStage).toBe(2);
  });

  it('a second set of numbers: 60 runs, 1/5 then 1/3: 60 -> 12 -> 4', () => {
    expect(model({ N: 60, mode: 'two_stage', stages: [{ p: '1/5' }, { p: '1/3' }] }).counts).toEqual([60, 12, 4]);
  });

  it('tally of a fair die over 60 runs: 10 each, S = 210, average 7/2', () => {
    const m = model(tally);
    expect(m.tally?.rows.map(r => r.runs)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(m.tally?.total).toBe(210);
    expect(m.tally?.average).toEqual([7, 2]);
    expect(m.lastStage).toBe(2);
  });
});

describe('stageCells: contiguous blocks in reading order', () => {
  it('two_stage: the 6 cells of stage 1, then the first 1 of them', () => {
    const m = model(two);
    expect(stageCells(m, 0)).toEqual([]);
    expect(stageCells(m, 1)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(stageCells(m, 2)).toEqual([0]);
  });

  it('the cells of a later stage are inside the cells of the earlier one', () => {
    const m = model({ N: 60, mode: 'two_stage', stages: [{ p: '1/5' }, { p: '1/3' }] });
    const first = new Set(stageCells(m, 1));
    expect(stageCells(m, 2).every(i => first.has(i))).toBe(true);
  });
});

describe('runsCalc: the engine writes the calculation', () => {
  it('1/6 of 36 and 1/6 of 6', () => {
    expect(runsCalc(model(frac6), 1)).toEqual(['\\frac{1}{6} \\times 36 = 6']);
    expect(runsCalc(model(two), 2)).toEqual([
      '\\frac{1}{6} \\times 36 = 6',
      '\\frac{1}{6} \\times 6 = 1',
    ]);
  });

  it('tally: the runs times the values add up to S, and S over N is the average', () => {
    expect(runsCalc(model(tally), 2)).toEqual([
      '10 + 20 + 30 + 40 + 50 + 60 = 210',
      '\\frac{210}{60} = \\frac{7}{2}',
    ]);
  });
});

describe('the finding', () => {
  it('fraction_of_total: N and the count, the calculation of the student\'s own shading', () => {
    const f = runsFinding(model(frac6), ['cell:6', 'confirmed'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'runs.fraction',
      numbers: { runs: '36', count: '6' },
      how: 'found',
      correct: true,
      calc: ['\\frac{1}{6} \\times 36 = 6'],
    });
  });

  it('two_stage and tally', () => {
    expect(runsFinding(model(two), ['stage:1', 'stage:2'], 'found')).toMatchObject({
      findingId: 'runs.two_stage',
      numbers: { runs: '36', stage1: '6', stage2: '1' },
      correct: null,
    });
    expect(runsFinding(model(tally), ['stage:1', 'stage:2'], 'found')).toMatchObject({
      findingId: 'runs.tally',
      numbers: { runs: '60', total: '210', average: '7/2' },
    });
  });

  it('skipped: never correct, no calculation', () => {
    const f = runsFinding(model(frac6), ['reveal'], 'skipped');
    expect(f.correct).toBeNull();
    expect(f.calc).toBeUndefined();
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(REPEATED_RUNS_REVEALS)).toBe(true);
  });

  it('the runs are on screen (N); the stage counts 6 and 1 come after a confirm or a step (by state)', () => {
    expect(revealedByRules(REPEATED_RUNS_REVEALS, two, undefined, is(36))?.value).toBe('runs');
    const six = revealedByRules(REPEATED_RUNS_REVEALS, two, undefined, is(6));
    expect(six?.value).toBe('stage_counts');
    expect(six?.by).toBe('state');
    expect(revealedByRules(REPEATED_RUNS_REVEALS, two, undefined, is(1))?.value).toBe('stage_counts');
  });

  it('tally: the runs of each value are on screen from the start; S and the average come by state', () => {
    expect(revealedByRules(REPEATED_RUNS_REVEALS, tally, undefined, is(10))?.value).toBe('tally_runs');
    expect(revealedByRules(REPEATED_RUNS_REVEALS, tally, undefined, is(210))?.value).toBe('tally_total');
    const avg = revealedByRules(REPEATED_RUNS_REVEALS, tally, undefined, f => f[0] === 7 && f[1] === 2);
    expect(avg?.value).toBe('tally_total');
    expect(avg?.by).toBe('state');
  });

  it('invalid props reveal nothing', () => {
    expect(revealedByRules(REPEATED_RUNS_REVEALS, { N: 7, mode: 'two_stage' }, undefined, is(36))).toBeNull();
  });
});
