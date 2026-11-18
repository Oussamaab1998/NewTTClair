/**
 * The urn's help (bac2022c-sc-ex2): the checks help.test.ts cannot do.
 * - Every numeric line of the help is true, C_{n}^{k}, n!, powers and a
 *   labelled side (`p = \frac{6}{10} = \frac{3}{5}`) included: the generic
 *   check skips any line with a letter in it.
 * - Coincidences: no number on screen in the three levels (example, method,
 *   chips) equals a value of the exercise the student has not found at that
 *   step. The values come from the engine: the graph of every step of every
 *   route (lines and the similar questions) and the formula cards' test cases.
 * - Levels 1 and 2 never show the step's own result (a line step: its main
 *   node, whatever its size; a card step: the true card); level 3 shows it
 *   only in the hidden answer of the line to fill.
 * - The line to fill really moves him on (advanced, never `unreadable`) and
 *   its last slot is the engine's value.
 * - The owner's word list (beyond the shared lexicon) and no question mark
 *   anywhere in the file, reading and LaTeX included.
 * - The glossary: at least 6 entries, every `match` is on a screen of this
 *   exercise (its JSON or its trip), a long press on it finds its entry, and
 *   no entry shows a value of the exercise.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { credit } from '../../ai/session/state';
import { CATALOG } from '../../app/exercises';
import { factorial } from '../../engine/combinatorics';
import {
  add,
  choose,
  compare,
  div,
  frac,
  mul,
  neg,
  pow,
  sub,
  type Fraction,
} from '../../engine/rational';
import { parseRat, ratToString, sameRat } from '../../engine/rationalFormat';
import {
  act,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import { isTouring } from '../../hybrid/tour/tour';
import {
  binomialMean,
  binomialTerm,
  binomialVariance,
} from '../../method/binomialMath';
import { MIN_KEY_NUMBER } from '../../method/guards';
import exerciseJson from '../exercises/bac2022c-sc-ex2.json';
import { stepKey, type ResolvedAnswer } from '../loader';
import type { Rich } from '../schema';
import tripJson from '../trips.sc-ex2.json';
import helpJson from './bac2022c-sc-ex2.json';
import { glossaryKey, glossaryMatches, helpFor } from './help';
import type { HelpFile, Ladder } from './schema';

const EXERCISE = 'bac2022c-sc-ex2';
const entry = CATALOG.find(e => e.id === EXERCISE);
if (!entry?.result.ok) {
  throw new Error(`${EXERCISE} does not load`);
}
const loaded = entry.result.loaded;
const help = helpFor(EXERCISE) as HelpFile;
const QUESTIONS = exerciseJson.parts.map(p => p.id);
const ctxOf = (q: string): QuestionCtx =>
  questionCtx(loaded, entry.raw as never, q);

// ---------------------------------------------------------------- arithmetic

/** Splits at depth 0 (outside (), {} and []) where `at` matches a character. */
function splitTop(s: string, at: RegExp): { parts: string[]; seps: string[] } {
  const parts: string[] = [];
  const seps: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if ('({['.includes(ch)) {
      depth += 1;
    } else if (')}]'.includes(ch)) {
      depth -= 1;
    }
    if (depth === 0 && at.test(ch)) {
      parts.push(cur);
      seps.push(ch);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return { parts, seps };
}

/** A LaTeX side as plain arithmetic (C_{n}^{k} and n! computed); null when it has a letter. */
function plainOf(latex: string): string | null {
  let s = latex
    .replace(/\\left|\\right/g, '')
    .replace(/\\(?:qquad|quad)|\\[,;!: ]/g, ' ')
    .replace(/\{,\}/g, '.')
    .replace(/\\times|\\cdot/g, '*')
    .replace(/\\[dt]frac/g, '\\frac')
    .replace(
      /C_\{(\d+)\}\^\{(\d+)\}/g,
      (_m, n: string, k: string) => `(${choose(Number(n), Number(k))})`,
    )
    .replace(/(\d+)!/g, (_m, n: string) => `(${factorial(Number(n))})`);
  for (let i = 0; i < 8 && /\\frac/.test(s); i += 1) {
    s = s.replace(
      /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      (_m, a: string, b: string) => `((${a})/(${b}))`,
    );
  }
  s = s.replace(/[{}]/g, m => (m === '{' ? '(' : ')')).replace(/\s+/g, '');
  return s === '' || /[A-Za-z\\]/.test(s) ? null : s;
}

/** + - * / ^ and parentheses on exact fractions; null when it does not read. */
function evaluate(plain: string): Fraction | null {
  let i = 0;
  const fail = (): never => {
    throw new Error('unreadable');
  };
  const expr = (): Fraction => {
    let v = term();
    while (plain[i] === '+' || plain[i] === '-') {
      const op = plain[i++];
      const r = term();
      v = op === '+' ? add(v, r) : sub(v, r);
    }
    return v;
  };
  const term = (): Fraction => {
    let v = power();
    while (plain[i] === '*' || plain[i] === '/') {
      const op = plain[i++];
      const r = power();
      v = op === '*' ? mul(v, r) : div(v, r);
    }
    return v;
  };
  const power = (): Fraction => {
    const b = unary();
    if (plain[i] !== '^') {
      return b;
    }
    i += 1;
    const e = unary();
    return e[1] === 1 ? pow(b, e[0]) : fail();
  };
  const unary = (): Fraction => {
    if (plain[i] === '-') {
      i += 1;
      return neg(unary());
    }
    return primary();
  };
  const primary = (): Fraction => {
    if (plain[i] === '(') {
      i += 1;
      const v = expr();
      return plain[i++] === ')' ? v : fail();
    }
    const m = /^\d+(?:\.\d+)?/.exec(plain.slice(i)) ?? fail();
    i += m[0].length;
    const [whole = '', dec = ''] = m[0].split('.');
    return frac(Number(whole + dec), 10 ** dec.length);
  };
  try {
    const v = expr();
    return i === plain.length ? v : null;
  } catch {
    return null;
  }
}

/** The statements of a line (top-level commas), each as sides joined by = < > ≠. */
function statements(latex: string) {
  const s = latex.replace(/\\neq/g, '≠').replace(/\{,\}/g, '.');
  return splitTop(s, /,/).parts.map(st => {
    const { parts, seps } = splitTop(st, /[=<>≠]/);
    return {
      sides: parts.map(p => {
        const plain = plainOf(p);
        return plain === null ? null : evaluate(plain);
      }),
      ops: seps,
    };
  });
}

/** What is false in a line: two numeric neighbours that break their relation. */
function lineErrors(latex: string): string[] {
  const bad: string[] = [];
  for (const { sides, ops } of statements(latex)) {
    ops.forEach((op, i) => {
      const a = sides[i];
      const b = sides[i + 1];
      if (!a || !b) {
        return;
      }
      const c = compare(a, b);
      const ok =
        op === '='
          ? c === 0
          : op === '<'
          ? c < 0
          : op === '>'
          ? c > 0
          : c !== 0;
      if (!ok) {
        bad.push(`${latex}: ${ratToString(a)} ${op} ${ratToString(b)}`);
      }
    });
  }
  return bad;
}

/**
 * Every number a LaTeX string puts on screen: its fractions and literals,
 * and (`computed`) what its sides and its C values come to. Level 3 may
 * write the calculation on our numbers (C_{4}^{1} \times C_{6}^{2}), never
 * its value: there only the written numbers count.
 */
function valuesIn(latex: string, computed = true): Fraction[] {
  const out: Fraction[] = [];
  if (computed) {
    for (const { sides } of statements(latex)) {
      out.push(...sides.filter((v): v is Fraction => v !== null));
    }
    for (const m of latex.matchAll(/C_\{(\d+)\}\^\{(\d+)\}/g)) {
      out.push(frac(choose(Number(m[1]), Number(m[2]))));
    }
  }
  for (const m of latex.matchAll(/\\[dt]?frac\{(\d+)\}\{(\d+)\}/g)) {
    out.push(frac(Number(m[1]), Number(m[2])));
  }
  for (const m of latex.matchAll(/\d+/g)) {
    out.push(frac(Number(m[0])));
  }
  return out;
}

const isKey = (v: Fraction): boolean =>
  v[1] !== 1 || Math.abs(v[0]) >= MIN_KEY_NUMBER;
const has = (list: readonly Fraction[], v: Fraction): boolean =>
  list.some(x => sameRat(x, v));

// ---------------------------------------------------------------- the levels

const mathOf = (r: Rich | undefined): string[] => (r?.math ? [r.math] : []);
const textOf = (r: Rich): string[] => [
  ...(r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)),
  ...(r.fr !== undefined ? [r.fr] : []),
];

function levelMath(l: Ladder, level: 1 | 2 | 3): string[] {
  if (level === 1) {
    return [
      ...l.idea.text.flatMap(mathOf),
      ...(l.idea.legend ?? []).flatMap(x => [x.math, ...mathOf(x.text)]),
    ];
  }
  if (level === 2) {
    const e = l.example;
    return [
      ...e.story.flatMap(mathOf),
      ...(e.legend ?? []).flatMap(x => [x.math, ...mathOf(x.text)]),
      ...e.lines.flatMap(x => [x.math, ...mathOf(x.say)]),
      ...mathOf(e.rule),
      ...mathOf(e.bridge),
    ];
  }
  return [
    ...l.method.text.flatMap(mathOf),
    ...(l.method.formula ? [l.method.formula] : []),
    ...(l.method.fill?.lead ? [l.method.fill.lead] : []),
  ];
}

function levelText(l: Ladder, level: 1 | 2 | 3): string[] {
  const rich: Rich[] =
    level === 1
      ? [...l.idea.text, ...(l.idea.legend ?? []).map(x => x.text)]
      : level === 2
      ? [
          ...l.example.story,
          ...(l.example.legend ?? []).map(x => x.text),
          ...l.example.lines.flatMap(x => (x.say ? [x.say] : [])),
          l.example.rule,
          l.example.bridge,
        ]
      : l.method.text;
  return rich.flatMap(textOf);
}

// ---------------------------------------------------------------- the timeline (engine)

/** One step of a route, in the order he meets it, with the values it reveals. */
interface Point {
  q: string;
  id: string;
  type: string;
  /** The engine values this step puts in his hands once done. */
  reveals: Fraction[];
  /** A line step: the value of its main nodes. */
  result: Fraction[];
  /** A card step: the true cards. */
  trueCards: Rich[];
}

function timeline(): Point[] {
  const points: Point[] = [];
  for (const q of QUESTIONS) {
    const ctx = ctxOf(q);
    for (const id of startQuestion(ctx).route) {
      const f = ctx.frames.get(id)?.frame;
      const a = ctx.loaded.answers.get(stepKey.main(q, id)) as
        | ResolvedAnswer
        | undefined;
      const graph = a?.kind === 'method' && 'graph' in a ? a.graph : null;
      const p: Point = {
        q,
        id,
        type: f?.type ?? '',
        reveals: [],
        result: [],
        trueCards: [],
      };
      if (f?.type === 'lines' && graph) {
        const mine = graph.nodes.filter(n => n.planCard === f.key && !n.expr);
        p.reveals = mine.map(n => n.value);
        p.result = mine.filter(n => n.main).map(n => n.value);
      } else if (f?.type === 'similar' && graph) {
        p.reveals = graph.nodes.filter(n => !n.expr).map(n => n.value);
      } else if (f?.type === 'cards') {
        p.trueCards = f.cards.filter(c => c.truth === 'true').map(c => c.text);
        // A formula card is tested on other cases: their values are shown.
        const prob = graph?.vars?.p;
        const cases = (f.args.cases ?? []) as { n: number; k?: number }[];
        if (f.evaluator === 'formula' && prob) {
          for (const c of cases) {
            p.reveals.push(
              ...(c.k !== undefined
                ? [binomialTerm(c.n, c.k, prob)]
                : [binomialMean(c.n, prob), binomialVariance(c.n, prob)]),
            );
          }
        }
      }
      points.push(p);
    }
  }
  return points;
}

const POINTS = timeline();
const HELPED = POINTS.filter(p => p.type === 'lines' || p.type === 'cards');

/** The key values of the exercise he has not found when he reaches point `i`. */
function unfoundAt(i: number): Fraction[] {
  const found = POINTS.slice(0, i).flatMap(p => p.reveals);
  const out: Fraction[] = [];
  for (const v of POINTS.slice(i).flatMap(p => p.reveals)) {
    if (isKey(v) && !has(found, v) && !has(out, v)) {
      out.push(v);
    }
  }
  return out;
}

const ladderOf = (p: Point): Ladder => {
  const l = help.ladders[p.q]?.[p.id];
  if (!l) {
    throw new Error(`no ladder for ${p.q}/${p.id}`);
  }
  return l;
};

// ---------------------------------------------------------------- tests

// Named after the exercise: `npx jest src/content/help -t bac2022c-sc-ex2` runs them too.
describe(`${EXERCISE} help`, () => {
  test('the help file parses and covers 18 steps (13 lines, 5 cards)', () => {
    expect(help).not.toBeNull();
    expect(HELPED.filter(p => p.type === 'lines')).toHaveLength(13);
    expect(HELPED.filter(p => p.type === 'cards')).toHaveLength(5);
    for (const p of HELPED) {
      expect(ladderOf(p)).toBeDefined();
    }
  });

  describe('the arithmetic of this test', () => {
    it('reads C, powers, labelled sides and catches a false line', () => {
      expect(lineErrors('C_{4}^{3} = \\frac{24}{6} = 4')).toEqual([]);
      expect(lineErrors('C_{4}^{3} = 5')).toHaveLength(1);
      expect(lineErrors('p = \\frac{6}{10} = \\frac{2}{5}')).toHaveLength(1);
      expect(
        lineErrors(
          '\\left(\\frac{2}{3}\\right)^{2} \\times \\frac{1}{3} = \\frac{4}{9}',
        ),
      ).toHaveLength(1);
      expect(lineErrors('3 < 4')).toEqual([]);
      expect(lineErrors('4 < 3')).toHaveLength(1);
    });

    it('the engine gives the values the scan guards (sanity)', () => {
      const at = (id: string) => unfoundAt(POINTS.findIndex(p => p.id === id));
      const s = (vs: Fraction[]) => vs.map(ratToString);
      expect(s(at('m1.c_total'))).toEqual(
        expect.arrayContaining(['720', '120', '15', '60', '1/2', '20', '1/6']),
      );
      expect(s(at('m1.c_ratio'))).toContain('1/2');
      expect(s(at('m1.c_ratio'))).not.toContain('120');
      expect(s(at('m3a.c_law'))).toEqual(
        expect.arrayContaining(['21/128', '15/64', '5/32', '7/2', '7/4']),
      );
      expect(s(at('m3b.c_varn'))).toEqual(
        expect.arrayContaining(['7/4', '5/2']),
      );
    });
  });

  test('every numeric line of the help is true (C, powers and labelled sides included)', () => {
    const wrong: string[] = [];
    let checked = 0;
    const all = [
      ...HELPED.flatMap(p => {
        const l = ladderOf(p);
        return [1, 2, 3].flatMap(n => levelMath(l, n as 1 | 2 | 3));
      }),
      ...help.glossary.flatMap(e =>
        [...e.meaning, ...(e.use ?? [])].flatMap(mathOf),
      ),
    ];
    for (const latex of all) {
      if (statements(latex).some(st => st.sides.filter(Boolean).length >= 2)) {
        checked += 1;
      }
      wrong.push(...lineErrors(latex));
    }
    expect(wrong).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(30);
  });

  test('no number on screen equals a value of the exercise he has not found yet', () => {
    const hits: string[] = [];
    HELPED.forEach(p => {
      const l = ladderOf(p);
      const unfound = unfoundAt(POINTS.indexOf(p));
      for (const level of [1, 2, 3] as const) {
        for (const latex of levelMath(l, level)) {
          for (const v of valuesIn(latex, level < 3)) {
            if (has(unfound, v)) {
              hits.push(
                `${p.q}/${p.id} level ${level}: ${ratToString(v)} in ${latex}`,
              );
            }
          }
        }
      }
      for (const chip of l.method.fill?.chips ?? []) {
        const v = parseRat(chip);
        if (v && has(unfound, v)) {
          hits.push(`${p.q}/${p.id} chip ${chip}`);
        }
      }
    });
    expect(hits).toEqual([]);
  });

  test('levels 1 and 2 never show the step result; level 3 only in the hidden answer', () => {
    const bad: string[] = [];
    const norm = (s: string) =>
      s.replace(/\\[dt]frac/g, '\\frac').replace(/\\[,;!: ]|\s+/g, '');
    for (const p of HELPED) {
      const l = ladderOf(p);
      if (p.type === 'lines') {
        expect(p.result.length).toBeGreaterThan(0);
        for (const level of [1, 2, 3] as const) {
          for (const latex of levelMath(l, level)) {
            for (const v of valuesIn(latex, level < 3)) {
              if (has(p.result, v)) {
                bad.push(
                  `${p.q}/${p.id} level ${level} shows ${ratToString(v)}`,
                );
              }
            }
          }
        }
        const fill = l.method.fill;
        const operands = (fill?.answer ?? []).slice(0, -1);
        for (const chip of fill?.chips ?? []) {
          const v = parseRat(chip);
          if (v && has(p.result, v) && !operands.includes(chip)) {
            bad.push(`${p.q}/${p.id}: the result is a chip (${chip})`);
          }
        }
      } else {
        expect(p.trueCards.length).toBeGreaterThan(0);
        for (const card of p.trueCards) {
          const math = card.math ? norm(card.math) : null;
          for (const level of [1, 2, 3] as const) {
            if (math && levelMath(l, level).some(m => norm(m).includes(math))) {
              bad.push(`${p.q}/${p.id} level ${level} writes the true card`);
            }
          }
          const words = textOf(card).join('');
          for (const level of [1, 2] as const) {
            if (words && levelText(l, level).some(t => t.includes(words))) {
              bad.push(`${p.q}/${p.id} level ${level} quotes the true card`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  /** The question with the trip passed and every line step before `id` his (as help.test.ts). */
  function stateAt(ctx: QuestionCtx, id: string) {
    let s = startQuestion(ctx);
    if (isTouring(ctx, s)) {
      s = act(ctx, s, { kind: 'continue' }).state;
    }
    const at = s.route.indexOf(id);
    for (const before of s.route.slice(0, at)) {
      const f = ctx.frames.get(before)?.frame;
      const a = ctx.loaded.answers.get(stepKey.main(ctx.questionId, before)) as
        | ResolvedAnswer
        | undefined;
      if (f?.type === 'lines' && a?.kind === 'method' && a.frame === 'lines') {
        for (const n of a.graph.nodes) {
          if (n.planCard === f.key) {
            credit(s.session, 'main', n.id);
          }
        }
      }
    }
    s.at = at;
    return s;
  }

  test('the line to fill moves him on, and its last slot is the engine value', () => {
    const failed: string[] = [];
    for (const p of HELPED.filter(x => x.type === 'lines')) {
      const fill = ladderOf(p).method.fill;
      if (!fill) {
        failed.push(`${p.q}/${p.id}: no line to fill`);
        continue;
      }
      let i = 0;
      const raw = fill.template.replace(/\{\}/g, () => fill.answer[i++] ?? '');
      const r = act(ctxOf(p.q), stateAt(ctxOf(p.q), p.id), {
        kind: 'line',
        raw,
      } as StudentAct);
      if (!r.out.advanced || r.out.reason !== 'credit') {
        failed.push(`${p.q}/${p.id}: ${raw} → ${r.out.reason}`);
      }
      const last = parseRat(fill.answer.at(-1) ?? '');
      if (!last || !has(p.result, last)) {
        failed.push(
          `${p.q}/${p.id}: last slot ${fill.answer.at(-1)} is not the result`,
        );
      }
    }
    expect(failed).toEqual([]);
  });

  /** The owner's list (docs/STUDENT_TEST_PLAN.md), as whole words with و ف ب ل ال attached. */
  const OWNER_BANNED = [
    'واش',
    'سود',
    'جوج',
    'اثنين',
    'بس',
    'لكن',
    'هل',
    'مزيان',
    'دوك',
    'هاذا',
    'لماذا',
    'شحال',
    'الاتنين',
    'علمًا',
    'علما',
  ];
  const LETTER = '\\u0600-\\u06FF';
  const bannedWord = (w: string) =>
    new RegExp(
      `(^|[^${LETTER}])(?:و|ف|ب|ل|ال|وال|بال|فال|لل)?${w}(?![${LETTER}])`,
    );

  test("the owner's words: none of the banned ones, no question mark anywhere", () => {
    const texts = [
      ...HELPED.flatMap(p =>
        [1, 2, 3].flatMap(n => levelText(ladderOf(p), n as 1 | 2 | 3)),
      ),
      ...help.glossary.flatMap(e =>
        [...e.meaning, ...(e.use ?? [])].flatMap(textOf),
      ),
    ];
    const bad = texts.flatMap(t =>
      OWNER_BANNED.filter(w => bannedWord(w).test(t)).map(w => `«${w}»: ${t}`),
    );
    expect(bad).toEqual([]);
    expect(bannedWord('بس').test('بسّط الكسر')).toBe(false);
    expect(bannedWord('بس').test('نضربو وبس')).toBe(true);
    expect(JSON.stringify(helpJson)).not.toMatch(/[?؟]/);
  });

  describe('the glossary', () => {
    const corpus: string[] = [];
    const collect = (v: unknown) => {
      if (typeof v === 'string') {
        corpus.push(glossaryKey(v));
      } else if (Array.isArray(v)) {
        v.forEach(collect);
      } else if (v && typeof v === 'object') {
        Object.values(v).forEach(collect);
      }
    };
    collect(exerciseJson);
    collect(tripJson);

    it('has at least 6 entries', () => {
      expect(help.glossary.length).toBeGreaterThanOrEqual(6);
    });

    it('every match is on a screen of this exercise, and a long press on it finds its entry', () => {
      const lost: string[] = [];
      for (const e of help.glossary) {
        for (const m of e.match) {
          const k = glossaryKey(m);
          if (!corpus.some(s => s.includes(k))) {
            lost.push(`${e.id}: «${m}» is on no screen`);
          }
          if (!glossaryMatches(EXERCISE, m).some(x => x.id === e.id)) {
            lost.push(`${e.id}: «${m}» does not find it`);
          }
        }
      }
      expect(lost).toEqual([]);
    });

    it('shows no value of the exercise', () => {
      const values = POINTS.flatMap(p => p.reveals).filter(isKey);
      const hits = help.glossary.flatMap(e =>
        [...e.meaning, ...(e.use ?? [])]
          .flatMap(mathOf)
          .flatMap(m => valuesIn(m))
          .filter(v => has(values, v))
          .map(v => `${e.id}: ${ratToString(v)}`),
      );
      expect(hits).toEqual([]);
    });
  });
});
