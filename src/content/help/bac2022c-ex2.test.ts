/**
 * The help of bac2022c-ex2 (Bac 2022 contrôle, Exercice 2: the urn −1, 0, 0,
 * 1, 2, X the product, Y binomial), checked where the generic test
 * (help.test.ts) cannot go:
 * - every formula of the file is drawn by the math renderer;
 * - every solved line of a small example is true, counting notation
 *   (C_{n}^{k}), powers, ÷ and a leading label or "n ≥" included;
 * - the coincidence scan: no value a small example states or computes is a
 *   value the exercise still asks from that step on (the rest of the
 *   question, its similar questions, every later question), computed with
 *   the engine and the method graphs; the paper's own numbers excepted;
 * - levels 1 and 2 never hold the step's own result, level 3 gives the
 *   operands and never the result (on a chip or in its text);
 * - a card step's levels never copy the right card;
 * - the line to fill finishes its step, except the step written in several
 *   lines (the three other values of the law, one line each);
 * - the glossary: at least six entries, every match is something the screen
 *   shows, no number of the exercise in it, no reading that asks.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { credit } from '../../ai/session/state';
import { CATALOG } from '../../app/exercises';
import { mul, type Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import {
  act,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import { isTouring } from '../../hybrid/tour/tour';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { evalChain } from '../../method/lineChain';
import { lawValues } from '../../method/templatesLaw';
import exRaw from '../exercises/bac2022c-ex2.json';
import tripsRaw from '../trips.bac2022c-ex2.json';
import { stepKey, type ResolvedAnswer } from '../loader';
import type { Rich } from '../schema';
import { helpFor } from './help';
import type { Ladder } from './schema';

const EX = 'bac2022c-ex2';
const QUESTIONS = ['1a', '1b', '2a', '2b', 'c3a', 'c3b'] as const;
/** Steps the board credits one line per value: one filled line is a right step on the way. */
const SEVERAL_LINES = new Set(['2a/m2a.c_others']);
/** The paper's own numbers (the balls −1, 0, 0, 1, 2, five balls, two drawn, n ≥ 2, E(Y) ≥ 5). */
const PAPER: Fraction[] = [-1, 0, 1, 2, 5].map(x => [x, 1]);

const entry = CATALOG.find(e => e.id === EX)!;
const help = helpFor(EX)!;

function loaded() {
  if (!entry.result.ok) {
    throw new Error(entry.result.errors.join('\n'));
  }
  return entry.result.loaded;
}

const ctxOf = (q: string): QuestionCtx =>
  questionCtx(loaded(), entry.raw as never, q);

function answerOf(ctx: QuestionCtx, id: string) {
  const a = ctx.loaded.answers.get(stepKey.main(ctx.questionId, id)) as
    | ResolvedAnswer
    | undefined;
  return a?.kind === 'method' && 'graph' in a ? a : null;
}

// ---------------------------------------------------------------------------
// Reading the help's LaTeX.

/** One side of a LaTeX formula as the parser's plain text, or null (a letter). */
function plainSide(side: string): string | null {
  let s = side
    .replace(/C_\{(\d+)\}\^\{(\d+)\}/g, 'C($1,$2)')
    .replace(/\\left|\\right/g, '')
    .replace(/\{,\}/g, '.')
    .replace(/\\[,;!: ]/g, ' ')
    .replace(/\\times|\\cdot/g, '*')
    .replace(/\\div/g, '/');
  for (let i = 0; i < 8 && /\\frac/.test(s); i += 1) {
    s = s.replace(
      /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      (_m, a: string, b: string) => `((${a})/(${b}))`,
    );
  }
  s = s.replace(/[{}]/g, m => (m === '{' ? '(' : ')')).trim();
  if (s === '' || /\\/.test(s) || /[A-BD-Za-z]/.test(s)) {
    return null;
  }
  return s;
}

function valueOf(side: string): Fraction | null {
  const p = plainSide(side);
  if (p === null) {
    return null;
  }
  const r = evalChain(p, { allowPow: true });
  return r.kind === 'bare' || r.kind === 'unfinished' ? r.value : null;
}

const RELATION = /(=|\\approx|\\geq?(?![A-Za-z])|\\leq?(?![A-Za-z])|<|>)/;

/** The items of a formula (a list «a, b», «a \quad b», «a ; b»), each split at its relations. */
function items(latex: string): { sides: string[]; rels: string[] }[] {
  return latex
    .replace(/\{,\}/g, '{.}')
    .replace(/\\[,;!: ]/g, ' ')
    .split(/\\quad|,|;/)
    .map(item => {
      const parts = item.replace(/\{\.\}/g, '{,}').split(RELATION);
      const sides: string[] = [];
      const rels: string[] = [];
      parts.forEach((p, i) => (i % 2 === 0 ? sides.push(p) : rels.push(p)));
      return { sides, rels };
    })
    .filter(it => it.sides.some(x => x.trim() !== ''));
}

/**
 * The values a formula states or computes. In a solved line every number
 * counts; elsewhere (a story, a legend) a lone whole number in a list is a
 * label (the numbers on the balls), a lone fraction is a value.
 */
function valuesIn(latex: string, solvedLine: boolean): Fraction[] {
  const out: Fraction[] = [];
  for (const it of items(latex)) {
    const lone = it.sides.length === 1;
    for (const side of it.sides) {
      const v = valueOf(side);
      if (v === null) {
        continue;
      }
      if (lone && !solvedLine && v[1] === 1 && !/\\frac/.test(side)) {
        continue;
      }
      out.push(v);
    }
  }
  return out;
}

const mathOf = (r: Rich | undefined): string[] =>
  r?.math !== undefined ? [r.math] : [];

/** Every formula of a level, with whether it is a solved line. */
function levelMath(l: Ladder, level: 1 | 2 | 3): { latex: string; line: boolean }[] {
  const plain = (xs: string[]) => xs.map(latex => ({ latex, line: false }));
  if (level === 1) {
    return plain([
      ...l.idea.text.flatMap(mathOf),
      ...(l.idea.legend ?? []).map(x => x.math),
    ]);
  }
  if (level === 2) {
    return [
      ...plain([
        ...l.example.story.flatMap(mathOf),
        ...(l.example.legend ?? []).map(x => x.math),
        ...mathOf(l.example.rule),
        ...mathOf(l.example.bridge),
        ...l.example.lines.flatMap(x => mathOf(x.say)),
      ]),
      ...l.example.lines.map(x => ({ latex: x.math, line: true })),
    ];
  }
  return plain([
    ...l.method.text.flatMap(mathOf),
    ...(l.method.formula !== undefined ? [l.method.formula] : []),
    ...(l.method.fill?.lead !== undefined ? [l.method.fill.lead] : []),
  ]);
}

const levelValues = (l: Ladder, level: 1 | 2 | 3): Fraction[] =>
  levelMath(l, level).flatMap(m => valuesIn(m.latex, m.line));

const show = (v: Fraction): string => (v[1] === 1 ? `${v[0]}` : `${v[0]}/${v[1]}`);
const has = (xs: readonly Fraction[], v: Fraction): boolean =>
  xs.some(x => sameRat(x, v));
const notPaper = (xs: readonly Fraction[]): Fraction[] =>
  xs.filter(v => !has(PAPER, v));

const richText = (r: Rich): string =>
  [...(r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)), r.fr ?? ''].join('');

function ladderRich(l: Ladder): Rich[] {
  return [
    ...l.idea.text,
    ...(l.idea.legend ?? []).map(x => x.text),
    ...l.example.story,
    ...(l.example.legend ?? []).map(x => x.text),
    ...l.example.lines.flatMap(x => (x.say ? [x.say] : [])),
    l.example.rule,
    l.example.bridge,
    ...l.method.text,
  ];
}

// ---------------------------------------------------------------------------
// The exercise's values, step by step, from the engine.

/** The numbers of a formula in n (the binomial steps): its fractions. */
const refFractions = (ref: string): Fraction[] =>
  [...ref.matchAll(/(\d+)\/(\d+)/g)].map(m => [Number(m[1]), Number(m[2])]);

/** The values of X (the card of the values) and E(X)², the term of V(X) that is no node. */
function extraValues(): Map<string, Fraction[]> {
  const part = exRaw.parts.find(p => p.id === '2a')!;
  const method = part.groups[0]!.steps.find(s => s.kind === 'method') as unknown as {
    graph: { args: Record<string, unknown> };
  };
  const eX = loaded().values.get('eX')!;
  return new Map([
    ['2a/m2a.c_values', lawValues(method.graph.args as never).map(x => [x, 1] as Fraction)],
    ['2b/m2b.c_var', [mul(eX, eX)]],
  ]);
}

interface StepValues {
  /** Every value the step asks (main and support nodes, the values of X). */
  all: Fraction[];
  /** The step's result (main nodes; the fractions of a formula in n). */
  result: Fraction[];
}

/** Each frame of every question's route, in order, with its values. */
function routeValues(): { key: string; q: string; id: string; v: StepValues }[] {
  const extra = extraValues();
  const out: { key: string; q: string; id: string; v: StepValues }[] = [];
  for (const q of QUESTIONS) {
    const ctx = ctxOf(q);
    for (const id of startQuestion(ctx).route) {
      const f = ctx.frames.get(id)?.frame;
      const a = answerOf(ctx, id);
      const key = `${q}/${id}`;
      const v: StepValues = { all: [], result: [] };
      // A similar question: all its values; a line step: the nodes of its card.
      const nodes = !a
        ? []
        : f?.type === 'similar'
        ? a.graph.nodes
        : f?.type === 'lines'
        ? a.graph.nodes.filter(n => n.planCard === f.key)
        : [];
      for (const n of nodes) {
        const vals = n.expr ? refFractions(n.expr.ref) : [n.value];
        v.all.push(...vals);
        if (n.main || n.expr) {
          v.result.push(...vals);
        }
      }
      v.all.push(...(extra.get(key) ?? []));
      v.result.push(...(extra.get(key) ?? []));
      out.push({ key, q, id, v });
    }
  }
  return out;
}

const ROUTE = routeValues();

/** The values the exercise still asks from this step on, the paper's numbers excepted. */
function stillAsked(key: string): Fraction[] {
  const at = ROUTE.findIndex(r => r.key === key);
  return notPaper(ROUTE.slice(at).flatMap(r => r.v.all));
}

const resultOf = (key: string): Fraction[] =>
  notPaper(ROUTE.find(r => r.key === key)?.v.result ?? []);

const LADDERS = Object.entries(help.ladders).flatMap(([q, byFrame]) =>
  Object.entries(byFrame).map(([id, l]) => ({ q, id, key: `${q}/${id}`, l })),
);

// ---------------------------------------------------------------------------

describe('bac2022c-ex2 help: the content', () => {
  it('loads, every step has its ladder, nothing is reviewed yet', () => {
    expect(help.reviewed).toBe(false);
    expect(LADDERS.map(x => x.q).filter((q, i, a) => a.indexOf(q) === i)).toEqual([
      ...QUESTIONS,
    ]);
    expect(LADDERS).toHaveLength(24);
  });

  it('every formula of the file is drawn by the math renderer', () => {
    const all: string[] = [
      ...LADDERS.flatMap(({ l }) => [
        ...levelMath(l, 1),
        ...levelMath(l, 2),
        ...levelMath(l, 3),
      ]).map(m => m.latex),
      ...help.glossary.flatMap(g => [...g.meaning, ...(g.use ?? [])].flatMap(mathOf)),
      ...help.glossary.flatMap(g => g.match.filter(m => /[\\_^(]/.test(m) || m.length <= 2)),
    ];
    const bad = all.filter(m => {
      try {
        parseLatexSubset(m);
        return false;
      } catch {
        return true;
      }
    });
    expect(bad).toEqual([]);
  });

  it('every solved line of a small example is true (counting notation and powers too)', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const { key, l } of LADDERS) {
      for (const line of l.example.lines) {
        for (const it of items(line.math)) {
          for (let i = 0; i < it.rels.length; i += 1) {
            if (it.rels[i] !== '=') {
              continue;
            }
            const a = valueOf(it.sides[i]!);
            const b = valueOf(it.sides[i + 1]!);
            if (a && b) {
              checked += 1;
              if (!sameRat(a, b)) {
                wrong.push(`${key}: ${line.math}`);
              }
            }
          }
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(checked).toBeGreaterThan(30);
  });

  it('no value of a small example is a value the exercise still asks (engine values)', () => {
    const hits: string[] = [];
    for (const { key, l } of LADDERS) {
      const asked = stillAsked(key);
      expect(asked.length).toBeGreaterThan(0);
      for (const v of levelValues(l, 2)) {
        if (has(asked, v)) {
          hits.push(`${key}: ${show(v)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('the scan reads the formulas as the screen shows them', () => {
    const read = (latex: string, line: boolean) => valuesIn(latex, line).map(show);
    expect(read('C_{7}^{2} = \\frac{7 \\times 6}{2 \\times 1}', true)).toEqual(['21', '21']);
    expect(read('p(A) = \\frac{4}{15}', true)).toEqual(['4/15']);
    expect(read('n \\ge 4 \\div \\frac{3}{4} = \\frac{16}{3}', true)).toEqual(['16/3', '16/3']);
    expect(read('\\left(\\frac{3}{4}\\right)^2 = \\frac{9}{16}', true)).toEqual(['9/16', '9/16']);
    expect(read('\\frac{16}{3} \\approx 5{,}33', true)).toEqual(['16/3', '533/100']);
    // The numbers on the balls are labels; the probabilities of a law are values.
    expect(read('4, \\; 4, \\; 9, \\; 9, \\; 11', false)).toEqual([]);
    expect(read('\\frac{1}{4}, \\; \\frac{1}{2}', false)).toEqual(['1/4', '1/2']);
    expect(read('-3, \\; 9', true)).toEqual(['-3', '9']);
    // A value the exercise still asks is caught.
    expect(has(stillAsked('1a/m1a.c_ratio'), [4, 15])).toBe(true);
    expect(has(stillAsked('c3b/m3b.c_small'), [7, 10])).toBe(false);
  });

  it('the scan knows the values it guards (the engine, not a copy)', () => {
    const asked = stillAsked('1a/m1a.c_total').map(show);
    // p(A), p(B), the law, E(X), V(X), E(X)², the bound, n, and the similar questions' 4/15.
    for (const v of ['10', '1/10', '7/10', '3/10', '-2', '-1/10', '9/10', '89/100', '1/100', '50/7', '8', '4/15']) {
      expect(asked).toContain(v);
    }
    expect(resultOf('2a/m2a.c_values').map(show)).toEqual(['-2']);
    expect(resultOf('c3a/m3a.c_law').map(show).sort()).toEqual(['3/10', '7/10']);
  });

  it('levels 1 and 2 never hold the step result', () => {
    const hits: string[] = [];
    for (const { key, l } of LADDERS) {
      const result = resultOf(key);
      for (const level of [1, 2] as const) {
        for (const v of levelValues(l, level)) {
          if (has(result, v)) {
            hits.push(`${key} level ${level}: ${show(v)}`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('level 3 gives the operands, never the result (not on a chip, not in its text)', () => {
    const hits: string[] = [];
    for (const { key, l } of LADDERS) {
      // A formula in n: its fractions are the operands he drops in.
      if (ROUTE.find(r => r.key === key)?.v.all.length === 0 || /c_law|c3b\/m3b\.c_mean/.test(key)) {
        continue;
      }
      const result = resultOf(key);
      const chips = (l.method.fill?.chips ?? []).flatMap(c => {
        const r = evalChain(c);
        return r.kind === 'bare' || r.kind === 'unfinished' ? [r.value] : [];
      });
      for (const v of [...levelValues(l, 3), ...chips]) {
        if (has(result, v)) {
          hits.push(`${key}: ${show(v)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('a card step never copies the right card', () => {
    const copied: string[] = [];
    const squash = (s: string) => s.replace(/[\s.,:،]/g, '');
    for (const { q, id, key, l } of LADDERS) {
      const f = ctxOf(q).frames.get(id)?.frame;
      if (f?.type !== 'cards') {
        continue;
      }
      const right = f.cards.find(c => c.truth === 'true')!;
      const card = squash(richText(right.text));
      for (const r of ladderRich(l)) {
        if (card.length > 0 && squash(richText(r)).includes(card)) {
          copied.push(`${key}: ${richText(r)}`);
        }
      }
      if (right.text.math !== undefined) {
        const m = squash(right.text.math);
        for (const x of [1, 2, 3] as const) {
          if (levelMath(l, x).some(y => squash(y.latex).includes(m))) {
            copied.push(`${key} level ${x}: ${right.text.math}`);
          }
        }
      }
    }
    expect(copied).toEqual([]);
  });

  it('chips are distinct values', () => {
    for (const { key, l } of LADDERS) {
      const chips = l.method.fill?.chips ?? [];
      expect({ key, n: new Set(chips).size }).toEqual({ key, n: chips.length });
    }
  });
});

// ---------------------------------------------------------------------------

/** The question with the trip passed and every line step before `frameId` his. */
function stateAt(ctx: QuestionCtx, frameId: string) {
  let s = startQuestion(ctx);
  if (isTouring(ctx, s)) {
    s = act(ctx, s, { kind: 'continue' }).state;
  }
  const at = s.route.indexOf(frameId);
  for (const id of s.route.slice(0, at)) {
    const f = ctx.frames.get(id)?.frame;
    const a = answerOf(ctx, id);
    if (f?.type !== 'lines' || !a) {
      continue;
    }
    for (const n of a.graph.nodes) {
      if (n.planCard === f.key) {
        credit(s.session, 'main', n.id);
      }
    }
  }
  s.at = at;
  return s;
}

const fillLine = (template: string, answer: readonly string[]): string => {
  let i = 0;
  return template.replace(/\{\}/g, () => answer[i++] ?? '');
};

describe('bac2022c-ex2 help: the line to fill', () => {
  it.each(
    LADDERS.filter(x => x.l.method.fill).map(
      x => [x.key, x] as [string, (typeof LADDERS)[number]],
    ),
  )(
    '%s: the filled line finishes the step',
    (key, { q, id, l }) => {
      const fill = l.method.fill!;
      const ctx = ctxOf(q);
      const s = stateAt(ctx, id);
      const before = new Set(s.session.credited.main ?? []);
      const a: StudentAct = { kind: 'line', raw: fillLine(fill.template, fill.answer) };
      const r = act(ctx, s, a);
      if (SEVERAL_LINES.has(key)) {
        // One value of the step: credited, the step goes on for the others.
        expect(r.out.advanced).toBeFalsy();
        expect((r.state.session.credited.main ?? []).filter(n => !before.has(n))).toHaveLength(1);
      } else {
        expect({ line: a.raw, advanced: r.out.advanced, reason: r.out.reason }).toEqual({
          line: a.raw,
          advanced: true,
          reason: r.out.reason,
        });
      }
    },
  );
});

// ---------------------------------------------------------------------------

/** Every string of the exercise and its trip, without spaces: what the screen can show. */
function screenTexts(): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      out.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(exRaw);
  walk(tripsRaw);
  walk(help.ladders);
  return out.join('\n').replace(/\s+/g, '');
}

describe('bac2022c-ex2 help: the glossary', () => {
  it('has at least six entries, and a pressed text names one entry exactly', () => {
    expect(help.glossary.length).toBeGreaterThanOrEqual(6);
    const keys = help.glossary.flatMap(g => g.match.map(m => m.replace(/\s+/g, '')));
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it('covers the symbols and the French words of the paper', () => {
    const keys = new Set(help.glossary.flatMap(g => g.match));
    for (const m of [
      'p(A)',
      'p(B)',
      '\\overline{B}',
      'C_{5}^{2}',
      'X',
      'p(X = 0)',
      'E(X)',
      'V(X)',
      'P(Y = 1)',
      'E(Y) \\ge 5',
      'loi de probabilité',
      'simultanément',
      'au moins',
      'la plus petite valeur de n',
      'Montrer que',
    ]) {
      expect(keys).toContain(m);
    }
  });

  it('every match is something the screen shows', () => {
    const screen = screenTexts();
    const unseen = help.glossary.flatMap(g =>
      g.match.filter(m => !screen.includes(m.replace(/\s+/g, ''))),
    );
    expect(unseen).toEqual([]);
  });

  it('holds no number of the exercise, and its readings do not ask', () => {
    const numbers = help.glossary.flatMap(g =>
      [...g.meaning, ...(g.use ?? [])].flatMap(mathOf).flatMap(m => valuesIn(m, true)),
    );
    expect(notPaper(numbers).map(show)).toEqual([]);
    expect(help.glossary.filter(g => /[?؟]/.test(g.reading ?? '')).map(g => g.id)).toEqual([]);
  });
});
