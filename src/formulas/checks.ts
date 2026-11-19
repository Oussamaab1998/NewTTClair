/**
 * The rules a «Formules» theme file must follow, as functions that return
 * what is wrong (empty: fine), each issue named by its rule id so it can be
 * fixed where it is (docs/FORMULAS_PLAN.md, stage 1). The tests run them on
 * every theme of the app; a `check:formulas` script can run the same ones.
 *
 * - the law holds on the sample functions (law.ts), and every trap fails;
 * - exactly one «Complète» tile makes the law true, the one marked right;
 * - the example's f′ is the slope of its f, and f is the law's function
 *   with the example's parts;
 * - every formula the student sees is drawable by the native renderer;
 * - the chapters exist in the curriculum map and are of one school year;
 * - the French is simple French: no Arabic, no question, names without a
 *   full stop, explanations ending with one.
 */
import { CURRICULUM, type Year } from '../content/curriculum';
import { evaluateReal, parseExpression } from '../engine/expression';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import { studentFacingIssues } from '../method/words';
import {
  completeLatex,
  exampleLatex,
  lawLatex,
  ruleLatex,
  trapLatex,
} from './display';
import {
  checkLaw,
  differ,
  fillHole,
  parseInX,
  sameInX,
  slope,
  valueIn,
} from './law';
import {
  FORMULA_VARIABLES,
  type FormulaRule,
  type FormulaTheme,
} from './schema';

/** Fewer defined points than this in x: the example check says nothing. */
const MIN_X_POINTS = 5;

/** The letters an expression of the law uses. */
function lettersOf(src: string): Set<string> {
  const r = parseExpression(src, { variables: [...FORMULA_VARIABLES] });
  return new Set(r.ok ? r.variables : []);
}

/** The school year a chapter belongs to, or null if the map has no such chapter. */
export function yearOfChapter(id: string): Year | null {
  return (
    CURRICULUM.tracks.find(t => t.chapters.some(c => c.id === id))?.year ?? null
  );
}

/** The year a rule is taught in (all its chapters share it). */
export function yearOfRule(rule: FormulaRule): Year | null {
  return rule.chapters.length > 0 ? yearOfChapter(rule.chapters[0]!) : null;
}

function guard(id: string, what: string, run: () => string[]): string[] {
  try {
    return run();
  } catch (e) {
    return [`${id} ${what}: ${(e as Error).message}`];
  }
}

export function lawIssues(rule: FormulaRule): string[] {
  const id = rule.id;
  return guard(id, 'law', () => {
    const out: string[] = [];
    const v = checkLaw(rule.law.of, rule.law.d);
    if (v.holds === false) {
      const c = v.counterexample;
      out.push(
        `${id} law: wrong with u = ${c.u}, v = ${c.v}, n = ${c.n}, k = ${c.k}, x = ${c.x} (slope ${c.slope}, law gives ${c.d})`,
      );
    } else if (v.holds === null) {
      out.push(`${id} law: only ${v.points} defined points`);
    }
    const ids = new Set<string>();
    for (const trap of rule.traps) {
      if (ids.has(trap.id)) {
        out.push(`${id} trap ${trap.id}: id used twice`);
      }
      ids.add(trap.id);
      if (checkLaw(rule.law.of, trap.d).holds !== false) {
        out.push(`${id} trap ${trap.id}: not wrong (it gives the same derivative)`);
      }
    }
    rule.traps.forEach((a, i) =>
      rule.traps.slice(i + 1).forEach(b => {
        if (!differ(a.d, b.d)) {
          out.push(`${id} traps ${a.id} and ${b.id}: the same expression`);
        }
      }),
    );
    return out;
  });
}

export function completeIssues(rule: FormulaRule): string[] {
  const id = rule.id;
  return guard(id, 'complete', () => {
    const out: string[] = [];
    const { template, tiles, right } = rule.complete;
    const good = tiles
      .map((tile, i) => ({ i, holds: checkLaw(rule.law.of, fillHole(template, tile)).holds }))
      .filter(t => t.holds === true)
      .map(t => t.i);
    if (good.length !== 1) {
      out.push(`${id} complete: ${good.length} tiles make the law true (want 1)`);
    } else if (good[0] !== right) {
      out.push(`${id} complete: tile ${good[0]} is the true one, not ${right}`);
    }
    if (new Set(tiles).size !== tiles.length) {
      out.push(`${id} complete: two tiles are the same`);
    }
    return out;
  });
}

export function exampleIssues(rule: FormulaRule): string[] {
  const id = rule.id;
  const ex = rule.example;
  return guard(id, 'example', () => {
    const out: string[] = [];
    const f = parseInX(ex.f);
    const d = parseInX(ex.d);
    const derivative = sameInX(x => slope(valueIn(f), x), valueIn(d));
    if (!derivative.same) {
      out.push(`${id} example: f′ is not the slope of f at x = ${derivative.at}`);
    } else if (derivative.points < MIN_X_POINTS) {
      out.push(`${id} example: only ${derivative.points} defined points`);
    }
    const letters = lettersOf(rule.law.of);
    if (!letters.has('u') && !letters.has('v')) {
      // A rule on x itself ((xⁿ)′, (√x)′, (1/x)′): its example may mix in
      // a constant factor or a sum, so only its derivative is checked.
      return out;
    }
    const parts = {
      u: ex.u === undefined ? undefined : parseInX(ex.u),
      v: ex.v === undefined ? undefined : parseInX(ex.v),
    };
    for (const letter of ['u', 'v', 'n', 'k'] as const) {
      if (letters.has(letter) && ex[letter] === undefined) {
        out.push(`${id} example: the law uses ${letter}, the example gives none`);
      }
    }
    const of = parseExpression(rule.law.of, {
      variables: [...FORMULA_VARIABLES],
    });
    if (of.ok) {
      const shaped = sameInX(valueIn(f), x =>
        evaluateReal(of.ast, {
          x,
          u: parts.u ? evaluateReal(parts.u, { x }) : NaN,
          v: parts.v ? evaluateReal(parts.v, { x }) : NaN,
          n: ex.n ?? NaN,
          k: ex.k ?? NaN,
        }),
      );
      if (!shaped.same) {
        out.push(`${id} example: f is not the law's function with its parts (x = ${shaped.at})`);
      } else if (shaped.points < MIN_X_POINTS) {
        out.push(`${id} example: f and its parts agree on only ${shaped.points} points`);
      }
    }
    return out;
  });
}

/** Every formula the student sees, by name, for the drawable check. */
export function shownLatex(rule: FormulaRule): [string, string][] {
  const ex = exampleLatex(rule.example);
  return [
    ['rule', ruleLatex(rule)],
    ['complete', completeLatex(rule)],
    ...rule.complete.tiles.map((t, i): [string, string] => [`tile ${i}`, lawLatex(t)]),
    ...rule.traps.map((t): [string, string] => [`trap ${t.id}`, trapLatex(rule, t.id)]),
    ['example f', ex.f],
    ['example d', ex.d],
  ];
}

export function drawIssues(rule: FormulaRule): string[] {
  return guard(rule.id, 'display', () =>
    shownLatex(rule).flatMap(([what, latex]) => {
      try {
        parseLatexSubset(latex);
        return [];
      } catch (e) {
        return [`${rule.id} ${what}: not drawable (${(e as Error).message}): ${latex}`];
      }
    }),
  );
}

export function chapterIssues(rule: FormulaRule): string[] {
  const out: string[] = [];
  const years = new Set<Year>();
  for (const c of rule.chapters) {
    const y = yearOfChapter(c);
    if (y === null) {
      out.push(`${rule.id} chapter ${c}: not in the curriculum map`);
    } else {
      years.add(y);
    }
  }
  if (years.size > 1) {
    out.push(`${rule.id} chapters: more than one school year (${[...years].join(', ')})`);
  }
  return out;
}

const ARABIC = /[؀-ۿ]/;

function textIssues(where: string, text: string): string[] {
  const out: string[] = studentFacingIssues({ fr: text }).map(
    i => `${where}: ${i}`,
  );
  if (ARABIC.test(text)) {
    out.push(`${where}: Arabic`);
  }
  if (/[?؟]/.test(text)) {
    out.push(`${where}: a question`);
  }
  return out;
}

export function wordIssues(rule: FormulaRule): string[] {
  const id = rule.id;
  const out = [
    ...textIssues(`${id} name`, rule.name),
    ...textIssues(`${id} say`, rule.say),
    ...textIssues(`${id} copy`, rule.copy),
    ...(rule.condition ? textIssues(`${id} condition`, rule.condition) : []),
    ...(rule.example.where ? textIssues(`${id} example where`, rule.example.where) : []),
  ];
  if (rule.name.endsWith('.')) {
    out.push(`${id} name: ends with a full stop`);
  }
  if (!rule.copy.endsWith('.')) {
    out.push(`${id} copy: does not end with a full stop`);
  }
  const titles = new Set<string>();
  for (const t of rule.traps) {
    out.push(...textIssues(`${id} trap ${t.id} title`, t.title));
    out.push(...textIssues(`${id} trap ${t.id} why`, t.why));
    if (t.title.endsWith('.')) {
      out.push(`${id} trap ${t.id} title: ends with a full stop`);
    }
    if (!t.why.endsWith('.')) {
      out.push(`${id} trap ${t.id} why: does not end with a full stop`);
    }
    if (titles.has(t.title)) {
      out.push(`${id} trap ${t.id} title: used twice`);
    }
    titles.add(t.title);
  }
  return out;
}

export function ruleIssues(rule: FormulaRule): string[] {
  return [
    ...lawIssues(rule),
    ...completeIssues(rule),
    ...exampleIssues(rule),
    ...drawIssues(rule),
    ...chapterIssues(rule),
    ...wordIssues(rule),
  ];
}

export function themeIssues(theme: FormulaTheme): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const rule of theme.rules) {
    if (ids.has(rule.id)) {
      out.push(`${rule.id}: id used twice`);
    }
    if (names.has(rule.name)) {
      out.push(`${rule.id}: name used twice`);
    }
    ids.add(rule.id);
    names.add(rule.name);
    out.push(...ruleIssues(rule));
  }
  return out;
}
