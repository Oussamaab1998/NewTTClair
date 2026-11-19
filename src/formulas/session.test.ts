import { completeItem, recogniseItem, trueFalseItem } from './drills/drills';
import { addDays, dayStart, emptyFormulas, noteAnswer } from './log';
import {
  dueWords,
  kindsOnScreen,
  listGroups,
  placeOf,
  rulePlan,
  RULE_SESSION,
  tapVerdict,
  themePlan,
  THEME_SESSION,
  typable,
} from './session';
import { ruleById, THEMES } from './themes';
import { visibleRules } from './visible';

const day = (n: number, hour = 10) => new Date(2026, 10, n, hour).getTime();
const RULES = THEMES.flatMap(t => t.rules);
const rule = (id: string) => ruleById(id)!;
const bac = visibleRules(THEMES, '4s', 'mathematiques');

describe('«Calcule» only where the keypad can write the answer', () => {
  it('no root or ln in the answer', () => {
    expect(RULES.filter(r => !typable(r)).map(r => r.id)).toEqual([
      'deriv.sqrt_x',
      'deriv.sqrt_u',
    ]);
    expect(kindsOnScreen(rule('deriv.sqrt_u'), RULES)).toEqual([
      'complete',
      'true_false',
      'recognise',
    ]);
  });
});

describe('training plans', () => {
  it('a rule: 6 questions, remember first, then tell apart, use, recognise', () => {
    expect(rulePlan(rule('deriv.quotient'), RULES, 1).map(p => p.kind)).toEqual([
      'complete',
      'true_false',
      'calc',
      'true_false',
      'recognise',
      'calc',
    ]);
  });

  it('a rule with fewer drills still has 6, never «Calcule» without keys', () => {
    for (const r of RULES) {
      const plan = rulePlan(r, RULES, 3);
      expect(plan).toHaveLength(RULE_SESSION);
      expect(plan.every(p => kindsOnScreen(r, RULES).includes(p.kind))).toBe(true);
      expect(new Set(plan.map(p => p.seed)).size).toBe(RULE_SESSION);
    }
  });

  it('a theme: the rules not yet Retenue first, one item each, 8 at most', () => {
    let log = emptyFormulas();
    for (const id of ['deriv.product', 'deriv.sum']) {
      log = noteAnswer(log, id, { at: day(1), mode: 'check', kind: 'complete', verdict: 'right' });
      log = noteAnswer(log, id, { at: day(2), mode: 'check', kind: 'complete', verdict: 'right' });
    }
    log = noteAnswer(log, 'deriv.ln_u', { at: day(2), mode: 'drill', kind: 'complete', verdict: 'wrong' });
    const plan = themePlan(bac, log, day(2), 5);
    expect(plan).toHaveLength(THEME_SESSION);
    expect(plan[0]!.ruleId).toBe('deriv.ln_u');
    expect(plan.map(p => p.ruleId)).not.toContain('deriv.product');
    expect(new Set(plan.map(p => p.ruleId)).size).toBe(THEME_SESSION);
  });
});

describe('the list', () => {
  it('a Bac student: the Bac chapters, then the 3ème rules as reminders', () => {
    const groups = listGroups(bac, emptyFormulas(), day(1), '4s', 'mathematiques', 'all');
    expect(groups.map(g => [g.place.year, g.place.chapter, g.place.reminder, g.rows.length])).toEqual([
      ['4s', 'Dérivabilité', false, 1],
      ['4s', 'Fonction logarithme népérien', false, 1],
      ['4s', 'Fonction exponentielle', false, 1],
      ['3s', 'Fonction dérivée', true, 9],
    ]);
  });

  it('a filter keeps only its status', () => {
    const log = noteAnswer(emptyFormulas(), 'deriv.exp_u', {
      at: day(1),
      mode: 'drill',
      kind: 'complete',
      verdict: 'right',
    });
    const groups = listGroups(bac, log, day(1), '4s', 'mathematiques', 'en_cours');
    expect(groups.flatMap(g => g.rows.map(r => r.rule.id))).toEqual(['deriv.exp_u']);
  });

  it('the place of a rule follows the section’s chapter names', () => {
    expect(placeOf(rule('deriv.quotient'), '3s', 'sciences-techniques')).toMatchObject({
      year: '3s',
      chapter: 'Dérivabilité',
      reminder: false,
    });
    expect(placeOf(rule('deriv.ln_u'), '3s', 'mathematiques')).toBeNull();
  });
});

describe('a tap, as the record keeps it', () => {
  it('«Complète»: the right tile or not', () => {
    const item = completeItem(rule('deriv.quotient'), 4);
    const right = item.tiles.findIndex(t => t.right);
    expect(tapVerdict(item, { kind: 'complete', tile: right })).toEqual({ verdict: 'right' });
    expect(tapVerdict(item, { kind: 'complete', tile: (right + 1) % 4 })).toEqual({ verdict: 'wrong' });
  });

  it('«Vrai ou faux»: taking a trap for the rule names the trap', () => {
    const seeds = Array.from({ length: 40 }, (_, i) => i);
    const trap = seeds.map(s => trueFalseItem(rule('deriv.quotient'), s)).find(i => !i.isTrue)!;
    expect(tapVerdict(trap, { kind: 'true_false', saidTrue: true })).toEqual({
      verdict: 'trap',
      trapId: trap.trapId,
    });
    expect(tapVerdict(trap, { kind: 'true_false', saidTrue: false })).toEqual({ verdict: 'right' });
    const truth = seeds.map(s => trueFalseItem(rule('deriv.quotient'), s)).find(i => i.isTrue)!;
    expect(tapVerdict(truth, { kind: 'true_false', saidTrue: false })).toEqual({ verdict: 'wrong' });
  });

  it('«Quelle règle ?»: the rule or not; a tap of another kind is a bug', () => {
    const item = recogniseItem(rule('deriv.power_u'), RULES, 2);
    expect(tapVerdict(item, { kind: 'recognise', ruleId: 'deriv.power_u' })).toEqual({ verdict: 'right' });
    expect(tapVerdict(item, { kind: 'recognise', ruleId: 'deriv.quotient' })).toEqual({ verdict: 'wrong' });
    expect(() => tapVerdict(item, { kind: 'complete', tile: 0 })).toThrow();
  });
});

describe('when it comes back, in words', () => {
  const today = dayStart(day(10));
  it('today, tomorrow, in n days, or not due', () => {
    expect(dueWords({ status: 'en_cours', due: addDays(today, -2) }, day(10))).toEqual({ kind: 'today' });
    expect(dueWords({ status: 'en_cours', due: addDays(today, 1) }, day(10))).toEqual({ kind: 'tomorrow' });
    expect(dueWords({ status: 'retenue', due: addDays(today, 7) }, day(10))).toEqual({ kind: 'days', count: 7 });
    expect(dueWords({ status: 'nouvelle', due: null }, day(10))).toBeNull();
  });
});
