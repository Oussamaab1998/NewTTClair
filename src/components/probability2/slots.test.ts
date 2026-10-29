import { choose } from '../../engine/combinatorics';
import { EngineError } from '../../engine/rational';
import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import {
  SLOTS_PATTERN_REVEALS,
  addPattern,
  allPatterns,
  compressRoute,
  countsOnly,
  guidedLocks,
  helpPlan,
  isComplete,
  markedCount,
  marksOf,
  missingPatterns,
  patternOf,
  pascalCells,
  slotsFinding,
} from './slots';

describe('patterns and marks', () => {
  it('a pattern is the marks written S and F, and back', () => {
    expect(patternOf([true, false, true, false])).toBe('SFSF');
    expect(marksOf('SFSF')).toEqual([true, false, true, false]);
    expect(markedCount(marksOf('SSFSF'))).toBe(3);
  });

  it('all the patterns, in reading order, from the engine: 6, 10 and 35', () => {
    expect(allPatterns(4, 2)).toEqual(['SSFF', 'SFSF', 'SFFS', 'FSSF', 'FSFS', 'FFSS']);
    expect(allPatterns(5, 3)).toHaveLength(10);
    expect(allPatterns(7, 3)).toHaveLength(choose(7, 3));
  });
});

describe('the list: missing, complete, duplicate', () => {
  const all = allPatterns(4, 2);

  it('the missing patterns are the ones not listed, in reading order', () => {
    expect(missingPatterns(4, 2, [])).toEqual(all);
    expect(missingPatterns(4, 2, all.filter(p => p !== 'FSSF'))).toEqual(['FSSF']);
    expect(missingPatterns(4, 2, ['FFSS', 'SSFF'])).toEqual(['SFSF', 'SFFS', 'FSSF', 'FSFS']);
  });

  it('complete only when every pattern is listed', () => {
    expect(isComplete(4, 2, all)).toBe(true);
    expect(isComplete(4, 2, all.slice(1))).toBe(false);
    expect(isComplete(4, 2, [])).toBe(false);
  });

  it('adds a pattern with exactly k marks, at the end of the list', () => {
    const r = addPattern(4, 2, ['SSFF'], marksOf('FFSS'));
    expect(r).toEqual({ status: 'added', list: ['SSFF', 'FFSS'] });
  });

  it('refuses a duplicate and points at the earlier row (its index)', () => {
    expect(addPattern(4, 2, ['SSFF', 'FFSS', 'SFSF'], marksOf('FFSS'))).toEqual({
      status: 'duplicate',
      of: 1,
    });
  });

  it('refuses a pattern with the wrong number of marks, the list unchanged', () => {
    expect(addPattern(4, 2, [], marksOf('SSSF'))).toEqual({ status: 'wrong_count' });
    expect(addPattern(4, 2, [], marksOf('SFFF'))).toEqual({ status: 'wrong_count' });
  });

  it('counts-only above the list cap', () => {
    expect(countsOnly(7, 3, 60)).toBe(false);
    expect(countsOnly(7, 3, 20)).toBe(true);
    expect(countsOnly(5, 3, 10)).toBe(false);
    expect(countsOnly(5, 3, 9)).toBe(true);
  });
});

describe('the help ladder says "at least one is missing" and never how many (product owner, change 2)', () => {
  const all = allPatterns(4, 2);
  const oneMissing = all.filter(p => p !== 'FSSF');
  const twoMissing = all.filter(p => p !== 'FSSF' && p !== 'FFSS');
  const noneListed: string[] = [];

  it('level 1 is the same plan whether one, two or every pattern is missing', () => {
    const plans = [oneMissing, twoMissing, noneListed].map(l => helpPlan(4, 2, l, 1));
    expect(plans[0]).toEqual({ level: 1 });
    expect(plans[1]).toEqual(plans[0]);
    expect(plans[2]).toEqual(plans[0]);
  });

  it('level 1 carries no data at all, whatever n and k', () => {
    expect(helpPlan(7, 3, ['SSSFFFF'], 1)).toEqual({ level: 1 });
    expect(Object.keys(helpPlan(5, 3, [], 1)!)).toEqual(['level']);
  });

  it('level 2 names the slot (counted from 1, from the left) of the first S of the first missing pattern', () => {
    expect(helpPlan(4, 2, oneMissing, 2)).toEqual({ level: 2, slot: 2 });
    // SSFF and FFSS missing: the first one in reading order is SSFF, whose first S is slot 1
    expect(
      helpPlan(4, 2, all.filter(p => p !== 'SSFF' && p !== 'FFSS'), 2),
    ).toEqual({ level: 2, slot: 1 });
  });

  it('level 3 is the first missing pattern itself', () => {
    expect(helpPlan(4, 2, oneMissing, 3)).toEqual({ level: 3, pattern: 'FSSF' });
  });

  it('no help once the list is complete', () => {
    expect(helpPlan(4, 2, all, 1)).toBeNull();
    expect(helpPlan(4, 2, all, 2)).toBeNull();
    expect(helpPlan(4, 2, all, 3)).toBeNull();
  });
});

describe('guided: the first marked slot is fixed, the rest is free', () => {
  it('locks the slots up to the first marked one and marks it', () => {
    expect(guidedLocks(5, 2, 1)).toEqual({
      locked: [true, true, false, false, false],
      marks: [false, true, false, false, false],
    });
    expect(guidedLocks(5, 2, 0).locked).toEqual([true, false, false, false, false]);
  });

  it('the first marked slot leaves room for the other k - 1 marks', () => {
    expect(() => guidedLocks(5, 2, 4)).toThrow(EngineError);
    expect(() => guidedLocks(5, 3, 3)).toThrow(EngineError);
    expect(guidedLocks(5, 3, 2).marks).toEqual([false, false, true, false, false]);
    expect(() => guidedLocks(5, 2, -1)).toThrow(EngineError);
  });
});

describe('the Pascal row built from the student\'s own lists', () => {
  it('a cell shows its count only when that list is complete', () => {
    const lists: Record<number, string[]> = {
      0: ['FFFF'],
      1: allPatterns(4, 1),
      2: ['SSFF'],
    };
    expect(pascalCells(4, lists)).toEqual([
      { k: 0, count: 1 },
      { k: 1, count: 4 },
      { k: 2, count: null },
      { k: 3, count: null },
      { k: 4, count: null },
    ]);
  });
});

describe('the route is a short token list: runs of adds are one token', () => {
  it('merges consecutive adds', () => {
    expect(
      compressRoute(['added', 'added', 'added', 'missing_hint:1', 'added', 'confirmed']),
    ).toEqual(['added:3', 'missing_hint:1', 'added:1', 'confirmed']);
  });

  it('keeps at most 12 tokens, each valid for a finding', () => {
    const long = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 'added' : 'missing_hint:1'));
    const r = compressRoute(long);
    expect(r).toHaveLength(12);
    expect(r.every(t => /^[a-z][a-z_]*(?::[\x21-\x7e]+)?$/.test(t))).toBe(true);
  });
});

describe('the finding', () => {
  const base = { n: 5, k: 3, mode: 'free' as const };

  it('found: the count and the calculation come from the student\'s own complete list', () => {
    const f = slotsFinding(base, { count: 10, flipped: false, row: null }, ['added:10', 'confirmed'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'slots.pattern_list',
      numbers: { n: '5', k: '3', count: '10' },
      how: 'found',
      correct: true,
      calc: ['C_{5}^{3} = 10'],
    });
  });

  it('helped: still the student\'s own list, but marked as helped', () => {
    const f = slotsFinding(base, { count: 10, flipped: false, row: null }, ['added:9', 'missing_hint:2', 'added:1'], 'helped');
    expect(f.how).toBe('helped');
    expect(f.correct).toBe(true);
    expect(f.calc).toEqual(['C_{5}^{3} = 10']);
  });

  it('skipped: never correct, and no calculation (it is not the student\'s own number)', () => {
    const f = slotsFinding(base, { count: 10, flipped: false, row: null }, ['reveal'], 'skipped');
    expect(f.how).toBe('skipped');
    expect(f.correct).toBeNull();
    expect(f.calc).toBeUndefined();
  });

  it('bridge, flipped: adds the line C(n,k) = C(n,n-k)', () => {
    const f = slotsFinding({ n: 6, k: 2, mode: 'bridge' }, { count: 15, flipped: true, row: null }, ['added:15', 'flipped'], 'found');
    expect(f.calc).toEqual(['C_{6}^{2} = 15', 'C_{6}^{2} = C_{6}^{4} = 15']);
  });

  it('build_pascal: the row of counts and its sum 2^n', () => {
    const f = slotsFinding(
      { n: 4, k: 0, mode: 'build_pascal' },
      { count: 0, flipped: false, row: [1, 4, 6, 4, 1] },
      ['k:0', 'added:1'],
      'found',
    );
    expect(f.findingId).toBe('slots.pascal_row');
    expect(f.numbers).toMatchObject({ n: '4', c0: '1', c1: '4', c2: '6', c3: '4', c4: '1' });
    expect(f.calc).toEqual(['1 + 4 + 6 + 4 + 1 = 16']);
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(SLOTS_PATTERN_REVEALS)).toBe(true);
  });

  const props = { n: 5, k: 3, mode: 'free' };
  const is = (v: number) => (f: readonly [number, number]) => f[0] === v && f[1] === 1;

  it('the count C(5,3) = 10 is a value of the screen by state (after the list or the ladder end)', () => {
    const hit = revealedByRules(SLOTS_PATTERN_REVEALS, props, undefined, is(10));
    expect(hit?.value).toBe('pattern_count');
    expect(hit?.by).toBe('state');
    expect(hit?.minHint).toBe('ladder_end');
  });

  it('n, k and n - k are on screen from the start (slots and marks)', () => {
    for (const v of [5, 3, 2]) {
      expect(revealedByRules(SLOTS_PATTERN_REVEALS, props, undefined, is(v))?.value).toBe('slot_shape');
    }
  });

  it('a value that is neither is not revealed', () => {
    expect(revealedByRules(SLOTS_PATTERN_REVEALS, props, undefined, is(60))).toBeNull();
    expect(revealedByRules(SLOTS_PATTERN_REVEALS, props, undefined, is(4))).toBeNull();
  });

  it('build_pascal also holds the whole row of counts', () => {
    const row = revealedByRules(
      SLOTS_PATTERN_REVEALS,
      { n: 4, k: 1, mode: 'build_pascal' },
      undefined,
      is(6),
    );
    expect(row).not.toBeNull();
  });

  it('invalid props reveal nothing (the host shows the fallback)', () => {
    expect(revealedByRules(SLOTS_PATTERN_REVEALS, { n: 99 }, undefined, is(10))).toBeNull();
  });
});
