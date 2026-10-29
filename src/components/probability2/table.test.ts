import { ratToString } from '../../engine/rationalFormat';
import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import { VariableTablePropsSchema } from './schemas';
import {
  VARIABLE_TABLE_REVEALS,
  runCheck,
  studentLaw,
  tableFinding,
  tableModel,
} from './table';

const model = (p: Record<string, unknown>) => tableModel(VariableTablePropsSchema.parse(p));
const trials = (n: number, extra: Record<string, unknown> = {}) => ({
  outcomes: { kind: 'trials', n },
  ...extra,
});
const urn = { outcomes: { kind: 'urn', reds: 2, blacks: 2, k: 2 } };
const is = (n: number, d = 1) => (f: readonly [number, number]) => f[0] === n && f[1] === d;
/** The right assignment, as the engine knows it. */
const right = (m: ReturnType<typeof tableModel>) =>
  Object.fromEntries(m.items.map((it, i) => [i, it.value]));

describe('tableModel: trials', () => {
  it('n = 4: 16 outcomes in reading order (SSSS first), X = the number of S, counts 1, 4, 6, 4, 1', () => {
    const m = model(trials(4));
    expect(m.items).toHaveLength(16);
    expect(m.items[0]!.label).toBe('SSSS');
    expect(m.items[1]!.label).toBe('SSSF');
    expect(m.items[15]!.label).toBe('FFFF');
    expect(m.values).toEqual([0, 1, 2, 3, 4]);
    expect(m.trueCounts).toEqual([1, 4, 6, 4, 1]);
    expect(m.symmetric).toBe(true);
  });

  it('the first rows are not grouped by value (a student must work, not read a sorted list)', () => {
    const m = model(trials(3));
    expect(m.items.slice(0, 4).map(i => i.value)).toEqual([3, 2, 2, 1]);
  });

  it('weights: uniform, or p^s q^(n-s) (n = 3, p = 1/3: 8/27, 12/27, 6/27, 1/27)', () => {
    const m = model(trials(3, { weights: { p: '1/3' } }));
    const law = studentLaw(m, right(m));
    expect(law.probs.map(ratToString)).toEqual(['8/27', '4/9', '2/9', '1/27']);
    expect(ratToString(law.sum)).toBe('1');
    expect(m.symmetric).toBe(false);
  });
});

describe('tableModel: an urn', () => {
  it('2 red and 2 black, 2 drawn: 6 outcomes; X = the number of reds, counts 1, 4, 1', () => {
    const m = model(urn);
    expect(m.items).toHaveLength(6);
    expect(m.values).toEqual([0, 1, 2]);
    expect(m.trueCounts).toEqual([1, 4, 1]);
    expect(m.symmetric).toBe(true);
  });
});

describe('studentLaw: the counts and the probabilities of the student\'s own mapping', () => {
  it('nothing assigned yet: zero counts, a sum of 0, every outcome unassigned', () => {
    const m = model(trials(3));
    const law = studentLaw(m, {});
    expect(law.counts).toEqual([0, 0, 0, 0]);
    expect(ratToString(law.sum)).toBe('0');
    expect(law.unassigned).toHaveLength(8);
  });

  it('counts 1, 8, 4, 2, 1 (n = 4) sum to 16 outcomes but the law is not symmetric', () => {
    const m = model(trials(4));
    const assign: Record<number, number> = {};
    // 1 with value 0, 8 with value 1, 4 with value 2, 2 with value 3, 1 with value 4
    const plan = [0, ...Array(8).fill(1), ...Array(4).fill(2), ...Array(2).fill(3), 4];
    plan.forEach((v, i) => (assign[i] = v));
    const law = studentLaw(m, assign);
    expect(law.counts).toEqual([1, 8, 4, 2, 1]);
    expect(ratToString(law.sum)).toBe('1');
    expect(runCheck(m, assign, 'symmetry', 1, 0).detail).toBe('not_symmetric');
    expect(runCheck(m, assign, 'law', 1, 0)).toMatchObject({ passed: false, detail: 'values_wrong' });
  });
});

describe('runCheck: student-triggered, specific, and never the answer', () => {
  const m = model(trials(3));
  const partial = (): Record<number, number> => {
    const a = right(m);
    delete a[5];
    return a;
  };

  it('all_used: an unassigned outcome is "missing", not named on the first press', () => {
    const r = runCheck(m, partial(), 'all_used', 1, 0);
    expect(r).toMatchObject({ check: 'all_used', passed: false, detail: 'missing' });
    expect(r.named).toBeUndefined();
  });

  it('all_used: named on the second press, or at hint level 2', () => {
    expect(runCheck(m, partial(), 'all_used', 2, 0).named).toBe(5);
    expect(runCheck(m, partial(), 'all_used', 1, 2).named).toBe(5);
    expect(runCheck(m, partial(), 'all_used', 1, 1).named).toBeUndefined();
  });

  it('all_used: passes when every outcome has a value', () => {
    expect(runCheck(m, right(m), 'all_used', 1, 0)).toMatchObject({ passed: true, detail: 'ok' });
  });

  it('sum: the student\'s own sum, short of 1 when an outcome is missing (7/8 here)', () => {
    const r = runCheck(m, partial(), 'sum', 1, 0);
    expect(r).toMatchObject({ passed: false, detail: 'sum_not_one' });
    expect(ratToString(r.sum!)).toBe('7/8');
    expect(runCheck(m, right(m), 'sum', 1, 0)).toMatchObject({ passed: true });
  });

  it('symmetry: a right law passes; a missing outcome breaks it', () => {
    expect(runCheck(m, right(m), 'symmetry', 1, 0).passed).toBe(true);
    expect(runCheck(m, partial(), 'symmetry', 1, 0).passed).toBe(false);
  });

  it('law: right counts pass; a missing outcome is "missing"; a wrong value names the values, not the right counts', () => {
    expect(runCheck(m, right(m), 'law', 1, 0)).toMatchObject({ passed: true, detail: 'ok' });
    expect(runCheck(m, partial(), 'law', 1, 0)).toMatchObject({ passed: false, detail: 'missing' });
    const a = right(m);
    a[0] = 2; // SSS counted as 2
    const r = runCheck(m, a, 'law', 1, 0);
    expect(r).toMatchObject({ passed: false, detail: 'values_wrong' });
    expect(r.wrongValues).toEqual([2, 3]);
    expect(JSON.stringify(r)).not.toContain('trueCounts');
  });
});

describe('the finding', () => {
  const m = model(trials(3));

  it('found: the counts of the student\'s own correct law and the calculation', () => {
    const f = tableFinding(m, right(m), ['law:ok'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'table.law',
      numbers: { outcomes: '8', c0: '1', c1: '3', c2: '3', c3: '1' },
      how: 'found',
      correct: true,
      calc: ['1 + 3 + 3 + 1 = 8'],
    });
  });

  it('skipped: no calculation, never correct', () => {
    const f = tableFinding(m, right(m), ['reveal'], 'skipped');
    expect(f.correct).toBeNull();
    expect(f.calc).toBeUndefined();
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(VARIABLE_TABLE_REVEALS)).toBe(true);
  });

  it('the number of outcomes is on screen (the rows); the law counts come by state (after the checks)', () => {
    const props = trials(4);
    expect(revealedByRules(VARIABLE_TABLE_REVEALS, props, undefined, is(16))?.value).toBe('outcome_rows');
    const six = revealedByRules(VARIABLE_TABLE_REVEALS, props, undefined, is(6));
    expect(six?.value).toBe('law_counts');
    expect(six?.by).toBe('state');
    expect(revealedByRules(VARIABLE_TABLE_REVEALS, props, undefined, is(3, 8))?.value).toBe('law_counts');
  });

  it('invalid props reveal nothing', () => {
    expect(revealedByRules(VARIABLE_TABLE_REVEALS, { outcomes: { kind: 'trials', n: 9 } }, undefined, is(16))).toBeNull();
  });
});

