import {
  chapterIssues,
  completeIssues,
  drawIssues,
  exampleIssues,
  lawIssues,
  ruleIssues,
  themeIssues,
  wordIssues,
  yearOfRule,
} from './checks';
import type { FormulaRule } from './schema';
import { ruleById, THEMES } from './themes';

const ALL = THEMES.flatMap(t => t.rules.map(r => [r.id, r] as const));

describe('every rule of every theme passes every check', () => {
  it.each(ALL)('%s', (_id, rule) => {
    expect(ruleIssues(rule)).toEqual([]);
  });

  it.each(THEMES.map(t => [t.theme, t] as const))('theme %s', (_t, theme) => {
    expect(themeIssues(theme)).toEqual([]);
    expect(theme.reviewed).toBe(false);
  });

  it('Dérivées: 12 rules, the 3ème ones and the Bac ones', () => {
    const derivees = THEMES.find(t => t.theme === 'derivees')!;
    const years = derivees.rules.map(r => [r.id, yearOfRule(r)]);
    expect(Object.fromEntries(years)).toEqual({
      'deriv.power_x': '3s',
      'deriv.sqrt_x': '3s',
      'deriv.inv_x': '3s',
      'deriv.sum': '3s',
      'deriv.scalar': '3s',
      'deriv.product': '3s',
      'deriv.inv_v': '3s',
      'deriv.quotient': '3s',
      'deriv.power_u': '3s',
      'deriv.sqrt_u': '4s',
      'deriv.exp_u': '4s',
      'deriv.ln_u': '4s',
    });
  });
});

/** The quotient rule with one thing changed, to see each check catch it. */
function broken(change: (r: FormulaRule) => void): FormulaRule {
  const r = JSON.parse(JSON.stringify(ruleById('deriv.quotient'))) as FormulaRule;
  change(r);
  return r;
}

describe('the checks catch planted mistakes', () => {
  it('a wrong law', () => {
    const issues = lawIssues(broken(r => (r.law.d = '(uV-Uv)/v^2')));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^deriv\.quotient law: wrong with u = /);
  });

  it('a trap that is not wrong, and two traps that are the same', () => {
    expect(
      lawIssues(broken(r => (r.traps[0]!.d = '(vU-uV)/v^2'))),
    ).toContain(
      'deriv.quotient trap quotient_of_derivatives: not wrong (it gives the same derivative)',
    );
    expect(
      lawIssues(broken(r => (r.traps[1]!.d = '(U)/(V)'))),
    ).toContain(
      'deriv.quotient traps quotient_of_derivatives and order_swapped: the same expression',
    );
  });

  it('two right tiles, or the right one at another index', () => {
    expect(
      completeIssues(broken(r => (r.complete.tiles[2] = 'Vu'))),
    ).toEqual(['deriv.quotient complete: 2 tiles make the law true (want 1)']);
    expect(completeIssues(broken(r => (r.complete.right = 1)))).toEqual([
      'deriv.quotient complete: tile 0 is the true one, not 1',
    ]);
  });

  it('an example whose f′ is wrong, or whose f does not fit the law', () => {
    expect(exampleIssues(broken(r => (r.example.d = '7/(x-3)^2')))[0]).toMatch(
      /^deriv\.quotient example: f′ is not the slope of f at x = /,
    );
    expect(exampleIssues(broken(r => (r.example.v = 'x+3')))[0]).toMatch(
      /^deriv\.quotient example: f is not the law's function with its parts/,
    );
    expect(
      exampleIssues(broken(r => delete (r.example as { u?: string }).u)),
    ).toContain('deriv.quotient example: the law uses u, the example gives none');
  });

  it('an expression the parser refuses is reported, not thrown', () => {
    expect(lawIssues(broken(r => (r.law.d = 'Uv-')))[0]).toMatch(
      /^deriv\.quotient law: cannot parse "Uv-"/,
    );
  });

  it('an unknown chapter, and chapters of two years', () => {
    expect(chapterIssues(broken(r => r.chapters.push('3s-m.nope')))).toEqual([
      'deriv.quotient chapter 3s-m.nope: not in the curriculum map',
    ]);
    expect(
      chapterIssues(broken(r => r.chapters.push('4s-m.derivabilite'))),
    ).toEqual(['deriv.quotient chapters: more than one school year (3s, 4s)']);
  });

  it('Arabic, a question, and full stops in the wrong place', () => {
    const issues = wordIssues(
      broken(r => {
        r.say = 'u prime v ثم';
        r.traps[0]!.title = 'Diviser les dérivées ?';
        r.traps[1]!.title = 'Inverser l’ordre.';
        r.traps[2]!.why = 'Le dénominateur est v au carré';
      }),
    );
    expect(issues).toEqual([
      'deriv.quotient say: Arabic',
      'deriv.quotient trap quotient_of_derivatives title: a question',
      'deriv.quotient trap order_swapped title: ends with a full stop',
      'deriv.quotient trap lost_square why: does not end with a full stop',
    ]);
  });

  it('the drawn formulas of a rule are all drawable', () => {
    expect(drawIssues(ruleById('deriv.ln_u')!)).toEqual([]);
  });
});
