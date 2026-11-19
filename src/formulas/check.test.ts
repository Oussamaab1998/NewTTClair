import { CHECK_MAX, dueRules, formulaDigest, pickCheck } from './check';
import { FormulaCheckFields, FormulaDrillFields, FormulaViewFields } from './events';
import { emptyFormulas, noteAnswer, type FormulaAnswer } from './log';
import { THEMES } from './themes';
import { tracksFor, visibleRules } from './visible';

const day = (n: number, hour = 10) => new Date(2026, 10, n, hour).getTime();
const ids = (xs: readonly { rule: { id: string } }[]) => xs.map(x => x.rule.id);

const THIRD = [
  'deriv.power_x',
  'deriv.sqrt_x',
  'deriv.inv_x',
  'deriv.sum',
  'deriv.scalar',
  'deriv.product',
  'deriv.inv_v',
  'deriv.quotient',
  'deriv.power_u',
];
const BAC = ['deriv.sqrt_u', 'deriv.exp_u', 'deriv.ln_u'];

describe('which rules a student sees (decision 8)', () => {
  it('the year before: the same section where it has sections, else its one track', () => {
    expect(tracksFor('4s', 'mathematiques').before?.id).toBe('3s-m');
    expect(tracksFor('4s', 'sciences-informatique').before?.id).toBe('3s-si');
    expect(tracksFor('3s', 'sciences-experimentales').before?.id).toBe('2s-sc');
    expect(tracksFor('2s', 'sciences').before?.id).toBe('1s');
    expect(tracksFor('1s', null).before).toBeNull();
  });

  it.each([
    ['mathematiques'],
    ['sciences-experimentales'],
    ['sciences-techniques'],
    ['sciences-informatique'],
  ] as const)('Bac %s: the Bac rules, and the 3ème rules as reminders', section => {
    const v = visibleRules(THEMES, '4s', section);
    expect(ids(v.filter(x => !x.reminder)).sort()).toEqual([...BAC].sort());
    expect(ids(v.filter(x => x.reminder)).sort()).toEqual([...THIRD].sort());
  });

  it('3ème: its own rules only (2ème has no derivatives)', () => {
    const v = visibleRules(THEMES, '3s', 'sciences-experimentales');
    expect(ids(v).sort()).toEqual([...THIRD].sort());
    expect(v.every(x => !x.reminder)).toBe(true);
  });

  it('1ère and 2ème: no derivative rules', () => {
    expect(visibleRules(THEMES, '1s', null)).toEqual([]);
    expect(visibleRules(THEMES, '2s', 'sciences')).toEqual([]);
  });
});

describe('the Vérif rapide', () => {
  const bac = visibleRules(THEMES, '4s', 'mathematiques');
  const pool = bac.map(v => v.rule);
  const answer = (at: number, mode: FormulaAnswer['mode'], verdict: FormulaAnswer['verdict'] = 'right'): FormulaAnswer => ({
    at,
    mode,
    kind: 'complete',
    verdict,
  });

  it('a new Bac student: the reminders are due at once, the Bac rules wait', () => {
    const due = dueRules(emptyFormulas(), bac, day(1));
    expect(ids(due).sort()).toEqual([...THIRD].sort());
  });

  it('up to 5, only due rules, never «Calcule», the same for the same seed', () => {
    const plan = pickCheck(emptyFormulas(), bac, day(1), 42);
    expect(plan).toHaveLength(CHECK_MAX);
    expect(plan.every(p => THIRD.includes(p.ruleId))).toBe(true);
    expect(plan.every(p => p.kind !== ('calc' as string))).toBe(true);
    expect(new Set(plan.map(p => p.ruleId)).size).toBe(CHECK_MAX);
    expect(pickCheck(emptyFormulas(), bac, day(1), 42)).toEqual(plan);
    const kinds = new Set(
      Array.from({ length: 40 }, (_, s) => pickCheck(emptyFormulas(), bac, day(1), s))
        .flat()
        .map(p => p.kind),
    );
    expect([...kinds].sort()).toEqual(['complete', 'recognise', 'true_false']);
  });

  it('a rule he trained today is due tomorrow', () => {
    const log = noteAnswer(emptyFormulas(), 'deriv.exp_u', answer(day(1), 'drill'));
    const ownOnly = bac.filter(v => !v.reminder);
    expect(dueRules(log, ownOnly, day(1))).toEqual([]);
    expect(ids(dueRules(log, ownOnly, day(2)))).toEqual(['deriv.exp_u']);
  });

  it('on the same due day, his own year comes before the reminders', () => {
    let log = noteAnswer(emptyFormulas(), 'deriv.exp_u', answer(day(3), 'drill'));
    for (const id of THIRD) {
      log = noteAnswer(log, id, answer(day(1), 'check'));
    }
    // exp_u: trained on day 3, due day 4. The reminders: right on day 1, due day 4.
    expect(dueRules(log, bac, day(2))).toEqual([]);
    const due = ids(dueRules(log, bac, day(4)));
    expect(due[0]).toBe('deriv.exp_u');
    expect(due).toHaveLength(1 + THIRD.length);
  });

  it('nothing due: an empty Vérif (the home card hides)', () => {
    const third = visibleRules(THEMES, '3s', 'mathematiques');
    expect(pickCheck(emptyFormulas(), third, day(1), 1)).toEqual([]);
  });

  it('the digest has ids and statuses only, for answered rules', () => {
    const log = noteAnswer(emptyFormulas(), 'deriv.ln_u', answer(day(1), 'drill', 'trap'));
    expect(formulaDigest(log, bac, day(1))).toEqual([{ id: 'deriv.ln_u', status: 'en_cours' }]);
    expect(pool).toHaveLength(12);
  });
});

describe('the event fields', () => {
  it('accept what the screens will send, and refuse a calc item in a Vérif', () => {
    expect(FormulaViewFields.safeParse({ t: 'formula_view', what: 'card', ruleId: 'deriv.quotient' }).success).toBe(true);
    expect(
      FormulaDrillFields.safeParse({
        t: 'formula_drill',
        ruleId: 'deriv.quotient',
        kind: 'calc',
        verdict: 'trap',
        trapId: 'order_swapped',
      }).success,
    ).toBe(true);
    expect(FormulaCheckFields.safeParse({ t: 'formula_check', action: 'start', items: 5 }).success).toBe(true);
    expect(
      FormulaCheckFields.safeParse({ t: 'formula_check', action: 'answer', kind: 'calc' }).success,
    ).toBe(false);
    expect(
      FormulaCheckFields.safeParse({ t: 'formula_check', action: 'answer', verdict: 'dont_know' }).success,
    ).toBe(false);
  });
});
