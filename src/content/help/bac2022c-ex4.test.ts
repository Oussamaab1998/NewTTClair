/**
 * The help of bac2022c-ex4, Partie A (src/content/help/bac2022c-ex4.json):
 * the checks the generic help test cannot do for an exercise written in x.
 * - every solved line of a small example is true: both sides are evaluated
 *   by the safe parser at sample points; a label (g(-x), -g(x), g'(x),
 *   g(0), a limit) is read on the example's own function, taken from its
 *   story; what the story says of that function (even, odd, a top at 0) is
 *   true too;
 * - no example result equals a result of the exercise he has not found at
 *   that step (a value, or the same function of x), and no example uses the
 *   exercise's function;
 * - levels 1 and 2 never show the step's own result; level 3 of a line step
 *   never shows its line's result; level 3 of a card step never quotes the
 *   right card;
 * - every line to fill finishes its step in one line (credit);
 * - every formula is drawn by the math renderer, every chip reads, and every
 *   glossary match is text the screen shows.
 */
import { credit } from '../../ai/session/state';
import { CATALOG } from '../../app/exercises';
import {
  checkEquivalence,
  evaluateReal,
  parseExpression,
  sameForm,
  type Node,
} from '../../engine/expression';
import {
  act,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import { isTouring } from '../../hybrid/tour/tour';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import exRaw from '../exercises/bac2022c-ex4.json';
import tripsRaw from '../trips.bac2022c-ex4.json';
import { stepKey, type ResolvedAnswer } from '../loader';
import type { Rich } from '../schema';
import { glossaryMatches, helpFor } from './help';
import raw from './bac2022c-ex4.json';
import type { Ladder } from './schema';

const ID = 'bac2022c-ex4';
const help = helpFor(ID)!;

/** Every step of Partie A with a ladder, in his order (question, then route). */
const STEPS = [
  'A1/mA1.c_domain',
  'A1/mA1.c_rewrite',
  'A1/mA1.c_conclude',
  'A2/mA2.c_rewrite',
  'A2/mA2.c_limit',
  'A2/mA2.c_interpret',
  'A3a/mA3a.c_rule',
  'A3a/mA3a.c_inner',
  'A3a/mA3a.c_derive',
  'A3b/mA3b.c_sign',
  'A3b/mA3b.c_top',
  'A3b/mA3b.c_ends',
  'A3b/mA3b.c_table',
  'A4/mA4.c_sym',
  'A4/mA4.c_asym',
  'A4/mA4.c_top',
] as const;

const ladderOf = (step: string): Ladder => {
  const [q, f] = step.split('/') as [string, string];
  return help.ladders[q]![f]!;
};

const entry = CATALOG.find(e => e.id === ID)!;
const ctxs = new Map<string, QuestionCtx>();
function ctxOf(q: string): QuestionCtx {
  if (!entry.result.ok) {
    throw new Error(`${ID} does not load`);
  }
  if (!ctxs.has(q)) {
    ctxs.set(q, questionCtx(entry.result.loaded, entry.raw as never, q));
  }
  return ctxs.get(q)!;
}

// ---------------------------------------------------------------------------
// LaTeX of a line, read with the safe parser (no eval).

const squash = (s: string): string => s.replace(/\s+/g, '');

/** LaTeX to the board's plain syntax (\frac{a}{b} -> ((a)/(b)), e^{2x} -> e^(2x)). */
function plainOf(tex: string): string | null {
  let s = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;!: ]/g, '')
    .replace(/\\times|\\cdot/g, '*')
    .replace(/\\div/g, '/');
  for (let i = 0; i < 30; i++) {
    const t = s
      .replace(/\^\{([^{}]*)\}/g, '^($1)')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
    if (t === s) {
      break;
    }
    s = t;
  }
  s = s.replace(/[{}]/g, m => (m === '{' ? '(' : ')')).trim();
  return /\\/.test(s) || s === '' ? null : s;
}

function astOf(plain: string): Node | null {
  const p = parseExpression(plain, { variables: ['x'] });
  return p.ok ? p.ast : null;
}

type Fn = (x: number) => number;

const fnOf =
  (ast: Node): Fn =>
  x =>
    evaluateReal(ast, { x });
const derivative =
  (f: Fn): Fn =>
  x =>
    (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;

/** The value far out (the first finite one: an exponential overflows early). */
function limitOf(f: Fn, sign: 1 | -1): number {
  for (const far of [1e4, 1e3, 200, 60]) {
    const v = f(sign * far);
    if (Number.isFinite(v)) {
      return v;
    }
  }
  return NaN;
}

const SAMPLES = [-2.3, -1.7, -0.9, -0.4, 0.3, 0.8, 1.6, 2.2];
const close = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

/** The example's function, from its story (`g(x) = …`, or only `g'(x) = …`). */
interface ExampleFn {
  name: string;
  f?: Fn;
  /** The plain expression of f, when the story gives f itself. */
  expr?: string;
  df: Fn;
}

function exampleFn(l: Ladder): ExampleFn | null {
  for (const r of l.example.story) {
    const m = r.math && /^([a-z])('?)\(x\)\s*=\s*(.+)$/.exec(r.math);
    if (!m) {
      continue;
    }
    const plain = plainOf(m[3]!);
    const ast = plain === null ? null : astOf(plain);
    if (!ast || plain === null) {
      throw new Error(`the story's function does not read: ${r.math}`);
    }
    const f = fnOf(ast);
    return m[2] === "'"
      ? { name: m[1]!, df: f }
      : { name: m[1]!, f, expr: plain, df: derivative(f) };
  }
  return null;
}

/** One side of an equality, as a function of x (a constant is one too). */
interface Side {
  text: string;
  fn: Fn;
  /** Its plain expression, when it is written out (not a label). */
  plain?: string;
  /** It names a function (g(-x), \lim g(x), f(0)…). */
  label: boolean;
  /** It names the exercise's function f. */
  namesF: boolean;
}

const LIM = /^\\lim_\{x\s*\\to\s*([+-])\\infty\}\s*(.+)$/;
const CALL = /^(-?)([a-z])('?)\((.+)\)$/;

function readSide(text: string, g: ExampleFn | null): Side | null {
  const t = text.trim();
  const lim = LIM.exec(t);
  if (lim) {
    const inner = readSide(lim[2]!, g);
    if (!inner) {
      return null;
    }
    const v = limitOf(inner.fn, lim[1] === '+' ? 1 : -1);
    // A limit of a written expression (e^{-x} → 0) is a rule, not a labelled result.
    return { ...inner, text: t, fn: () => v };
  }
  const call = CALL.exec(t);
  if (call && (call[2] === 'f' || call[2] === g?.name)) {
    const argPlain = plainOf(call[4]!);
    const arg = argPlain === null ? null : astOf(argPlain);
    if (!arg) {
      return null;
    }
    const a = fnOf(arg);
    const sign = call[1] === '-' ? -1 : 1;
    if (call[2] === 'f') {
      // Only checked for being named: the example never uses f.
      return { text: t, fn: () => NaN, label: true, namesF: true };
    }
    const base = call[3] === "'" ? g!.df : g!.f;
    if (!base) {
      return null;
    }
    return { text: t, fn: x => sign * base(a(x)), label: true, namesF: false };
  }
  const plain = plainOf(t);
  const ast = plain === null ? null : astOf(plain);
  return ast && plain !== null
    ? { text: t, fn: fnOf(ast), plain, label: false, namesF: false }
    : null;
}

/** The sides of an equality chain (null: one side does not read). */
function sidesOf(tex: string, g: ExampleFn | null): Side[] | null {
  const out: Side[] = [];
  for (const part of tex.split('=')) {
    const s = readSide(part, g);
    if (!s) {
      return null;
    }
    out.push(s);
  }
  return out;
}

/** The value of a side that is the same at every sample (a constant), or null. */
function constantOf(s: Side): number | null {
  const vs = SAMPLES.map(s.fn).filter(Number.isFinite);
  if (vs.length < 4) {
    return null;
  }
  return vs.every(v => close(v, vs[0]!)) ? vs[0]! : null;
}

function sameFunction(a: Fn, b: Fn): boolean {
  let compared = 0;
  for (const x of SAMPLES) {
    const [u, v] = [a(x), b(x)];
    if (!Number.isFinite(u) || !Number.isFinite(v)) {
      continue;
    }
    if (!close(u, v)) {
      return false;
    }
    compared++;
  }
  return compared >= 4;
}

// ---------------------------------------------------------------------------
// The statements of an example line: equalities, intervals, points, lines.

const INTERVAL =
  /^(-?\d+)\s*\\(in|notin)\s*\[\s*(-?\d+)\s*\\,;\\,\s*(-?\d+)\s*\]$/;
const POINT = /^[A-Z]\((-?\d+)\s*\\,;\\,\s*(-?\d+)\)$/;
const HORIZONTAL = /^y\s*=\s*(-?\d+)$/;

/** What is wrong with one solved line (null: it is true). */
function lineIssue(tex: string, g: ExampleFn | null): string | null {
  for (const st of tex.split(/\\qquad|\\quad/).map(x => x.trim())) {
    for (const part of st.split('\\Rightarrow').map(x => x.trim())) {
      const iv = INTERVAL.exec(part);
      if (iv) {
        const [a, l, r] = [Number(iv[1]), Number(iv[3]), Number(iv[4])];
        if ((l <= a && a <= r) !== (iv[2] === 'in')) {
          return `false membership: ${part}`;
        }
        continue;
      }
      if (/^-?x \\in \\mathbb\{R\}$/.test(part)) {
        continue;
      }
      const pt = POINT.exec(part);
      if (pt) {
        if (!g?.f || !close(g.f(Number(pt[1])), Number(pt[2]))) {
          return `the point is not on the curve: ${part}`;
        }
        continue;
      }
      const hz = HORIZONTAL.exec(part);
      if (hz) {
        if (!g?.f || !close(limitOf(g.f, 1), Number(hz[1]))) {
          return `not the limit of the example: ${part}`;
        }
        continue;
      }
      if (/[<>]|\\[lg]e(?![a-z])|\\(?:not)?in(?![a-z])/.test(part)) {
        return `a statement the test cannot read: ${part}`;
      }
      const sides = sidesOf(part, g);
      if (!sides) {
        return `does not read: ${part}`;
      }
      if (sides.some(s => s.namesF)) {
        return `the example uses the exercise's function: ${part}`;
      }
      for (const s of sides.slice(1)) {
        if (!sameFunction(s.fn, sides[0]!.fn)) {
          return `${s.text} is not ${sides[0]!.text}`;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The exercise's results, from the engine (the method graphs), and the step
// where he finds each.

interface ResultRef {
  step: string;
  card: string;
  value?: number;
  /** A result written in x: the function, and its written forms. */
  fn?: Fn;
  forms?: Node[];
}

const stepOfCard = (q: string, card: string): string => `${q}/m${q}.c_${card}`;

function exerciseResults(): ResultRef[] {
  const out: ResultRef[] = [];
  for (const step of STEPS) {
    const [q, frameId] = step.split('/') as [string, string];
    const ctx = ctxOf(q);
    const frame = ctx.frames.get(frameId)?.frame;
    if (frame?.type !== 'lines') {
      continue;
    }
    const answer = ctx.loaded.answers.get(stepKey.main(q, frameId)) as
      | ResolvedAnswer
      | undefined;
    if (answer?.kind !== 'method' || answer.frame !== 'lines') {
      throw new Error(`${step} has no graph`);
    }
    for (const n of answer.graph.nodes.filter(
      x => x.main && x.planCard === frame.key,
    )) {
      if (n.expr) {
        const forms = n.expr.goals.flatMap(gl => {
          const a = astOf(gl);
          return a ? [a] : [];
        });
        out.push({
          step: stepOfCard(q, frame.key),
          card: frame.key,
          fn: fnOf(astOf(n.expr.ref)!),
          forms,
        });
      } else {
        out.push({
          step: stepOfCard(q, frame.key),
          card: frame.key,
          value: n.value[0] / n.value[1],
        });
      }
    }
  }
  return out;
}

const RESULTS = exerciseResults();
const F_AST = astOf('e^x/(1+e^(2x))')!;
const F: Fn = fnOf(F_AST);

/** Not found yet when he is on `step` (found at this step or later). */
const unfound = (r: ResultRef, step: string): boolean =>
  STEPS.indexOf(r.step as never) >= STEPS.indexOf(step as never);

// ---------------------------------------------------------------------------
// The texts and formulas of each level.

const runTexts = (r: Rich): string[] => [
  ...(r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)),
  ...(r.fr !== undefined ? [r.fr] : []),
];
const richMath = (r: Rich): string[] => (r.math !== undefined ? [r.math] : []);

function levelRich(l: Ladder, level: 1 | 2 | 3): Rich[] {
  if (level === 1) {
    return [...l.idea.text, ...(l.idea.legend ?? []).map(x => x.text)];
  }
  if (level === 2) {
    return [
      ...l.example.story,
      ...(l.example.legend ?? []).map(x => x.text),
      ...l.example.lines.flatMap(x => (x.say ? [x.say] : [])),
      l.example.rule,
      l.example.bridge,
    ];
  }
  return l.method.text;
}

function levelMath(l: Ladder, level: 1 | 2 | 3): string[] {
  const rich = levelRich(l, level).flatMap(richMath);
  if (level === 1) {
    return [...rich, ...(l.idea.legend ?? []).map(x => x.math)];
  }
  if (level === 2) {
    return [
      ...rich,
      ...(l.example.legend ?? []).map(x => x.math),
      ...l.example.lines.map(x => x.math),
    ];
  }
  return [
    ...rich,
    ...(l.method.formula !== undefined ? [l.method.formula] : []),
    ...(l.method.fill?.lead !== undefined ? [l.method.fill.lead] : []),
  ];
}

/**
 * The step's result as it is written, never in levels 1 and 2 (and never in
 * level 3 of a line step): the conclusion he picks, the line he writes.
 */
const OWN_RESULT: Record<(typeof STEPS)[number], string[]> = {
  'A1/mA1.c_domain': ['-x\\in\\mathbb{R}'],
  'A1/mA1.c_rewrite': ['\\frac{e^{x}}{e^{2x}+1}'],
  'A1/mA1.c_conclude': ['festpaire'],
  'A2/mA2.c_rewrite': [
    '\\frac{e^{-x}}{e^{-2x}+1}',
    '\\frac{e^{-x}}{1+e^{-2x}}',
  ],
  'A2/mA2.c_limit': [
    'f(x)=0',
    '\\frac{0}{0+1}',
    '\\frac{0}{1+0}',
    '\\frac{0}{1}',
  ],
  'A2/mA2.c_interpret': ['y=0', 'axedesabscisses', 'محورالفواصل'],
  'A3a/mA3a.c_rule': ["u'v-uv'", "u'v+uv'", "\\frac{u'}{v'}"],
  'A3a/mA3a.c_inner': ['2e^{2x}'],
  'A3a/mA3a.c_derive': ['e^{x}(1-e^{2x})'],
  'A3b/mA3b.c_sign': ['1-e^{2x}'],
  'A3b/mA3b.c_top': ['\\frac{1}{2}', '\\frac{1}{1+1}'],
  'A3b/mA3b.c_ends': ['-\\infty}f(x)=0'],
  'A3b/mA3b.c_table': ['\\frac{1}{2}'],
  'A4/mA4.c_sym': ['axedesordonnées', 'محورالتراتيب'],
  'A4/mA4.c_asym': ['axedesabscisses', 'محورالفواصل', 'y=0'],
  'A4/mA4.c_top': ['\\frac{1}{2}', '\\frac{1}{1+1}'],
};

/** The step's result found in a level's texts and formulas (written, a value, a function). */
function shownResults(
  step: (typeof STEPS)[number],
  level: 1 | 2 | 3,
): string[] {
  const l = ladderOf(step);
  const g = level === 2 ? exampleFn(l) : null;
  const texts = [
    ...levelRich(l, level).flatMap(runTexts),
    ...levelMath(l, level),
  ].map(squash);
  const found = OWN_RESULT[step].filter(r => texts.some(t => t.includes(r)));
  const own = RESULTS.filter(r => r.step === step);
  for (const tex of levelMath(l, level)) {
    const sides = sidesOf(tex, g) ?? [];
    for (const s of sides) {
      for (const r of own) {
        const ast = s.plain !== undefined ? astOf(s.plain) : null;
        if (r.fn && ast) {
          // Levels 1 and 2: never the same function; level 3: never its written form.
          const hit =
            level === 3
              ? (r.forms ?? []).some(f => sameForm(ast, f))
              : sameFunction(s.fn, r.fn);
          if (hit) {
            found.push(`${s.text} (the step's line)`);
          }
        }
        // A value: on a side that names a function (a rule such as e^0 = 1 is not it).
        const v = constantOf(s);
        if (
          r.value !== undefined &&
          s.label &&
          v !== null &&
          close(v, r.value)
        ) {
          found.push(`${tex} (the step's value)`);
        }
      }
    }
    // A value written alone on the right of a line that names a function.
    if (sides.some(s => s.label)) {
      for (const s of sides.filter(x => !x.label)) {
        const v = constantOf(s);
        for (const r of own) {
          if (r.value !== undefined && v !== null && close(v, r.value)) {
            found.push(`${tex} (the step's value)`);
          }
        }
      }
    }
  }
  return found;
}

const cardFrame = (step: string) => {
  const [q, frameId] = step.split('/') as [string, string];
  const f = ctxOf(q).frames.get(frameId)?.frame;
  return f?.type === 'cards' ? f : null;
};

// ---------------------------------------------------------------------------

describe('bac2022c-ex4 help: the file', () => {
  it('parses, unreviewed, with a ladder for each of the 16 steps in his order', () => {
    expect(help).not.toBeNull();
    expect(raw.reviewed).toBe(false);
    const authored = Object.entries(help.ladders).flatMap(([q, byFrame]) =>
      Object.keys(byFrame).map(f => `${q}/${f}`),
    );
    expect(authored).toEqual([...STEPS]);
  });

  it('every formula is drawn by the math renderer', () => {
    const bad: string[] = [];
    const walk = (v: unknown, key = ''): void => {
      if (typeof v === 'string') {
        if (key === 'math' || key === 'formula' || key === 'lead') {
          try {
            parseLatexSubset(v);
          } catch (e) {
            bad.push(`${v}: ${(e as Error).message}`);
          }
        }
      } else if (Array.isArray(v)) {
        v.forEach(x => walk(x, key));
      } else if (v && typeof v === 'object') {
        Object.entries(v).forEach(([k, x]) => walk(x, k));
      }
    };
    walk(raw);
    expect(bad).toEqual([]);
  });

  it('no reading or French line asks a question', () => {
    const texts = [
      ...help.glossary.flatMap(e => [e.reading ?? '']),
      ...JSON.stringify(raw).match(/"fr": ?"[^"]*"/g)!,
    ];
    expect(texts.filter(t => /[?؟]/.test(t))).toEqual([]);
  });
});

describe('bac2022c-ex4 help: the small examples', () => {
  it('every example with a function of its own gets it from its story', () => {
    const none = STEPS.filter(
      s =>
        exampleFn(ladderOf(s)) === null &&
        ladderOf(s).example.lines.some(x => /[a-z]'?\(/.test(x.math)),
    );
    expect(none).toEqual([]);
  });

  it('every solved line is true (sides compared at sample points, labels on the example function)', () => {
    const wrong: string[] = [];
    for (const step of STEPS) {
      const l = ladderOf(step);
      const g = exampleFn(l);
      for (const x of l.example.lines) {
        const issue = lineIssue(x.math, g);
        if (issue) {
          wrong.push(`${step}: ${issue}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('what a story says of its function is true', () => {
    const fnAt = (step: string): Fn => exampleFn(ladderOf(step))!.f!;
    const even = (f: Fn) => sameFunction(f, x => f(-x));
    const odd = (f: Fn) => sameFunction(f, x => -f(-x));
    // A top at 0: f' > 0 just before, f' < 0 just after.
    const topAt0 = (f: Fn) =>
      derivative(f)(-0.5) > 0 &&
      derivative(f)(0.5) < 0 &&
      derivative(f)(-2) > 0;
    expect(odd(fnAt('A1/mA1.c_rewrite'))).toBe(true);
    expect(odd(fnAt('A1/mA1.c_conclude'))).toBe(true);
    for (const s of ['A3b/mA3b.c_ends', 'A4/mA4.c_sym', 'A4/mA4.c_asym']) {
      expect({ s, even: even(fnAt(s)) }).toEqual({ s, even: true });
    }
    for (const s of ['A3b/mA3b.c_top', 'A4/mA4.c_top']) {
      expect({ s, top: topAt0(fnAt(s)) }).toEqual({ s, top: true });
    }
    // A3b sign: g' < 0 at the small number, > 0 at the big one, as its lines say.
    const dg = exampleFn(ladderOf('A3b/mA3b.c_sign'))!.df;
    expect([dg(0) < 0, dg(5) > 0]).toEqual([true, true]);
    // A3b table: g' changes sign at 2, from − to +.
    const g = fnAt('A3b/mA3b.c_table');
    expect([derivative(g)(1) < 0, derivative(g)(3) > 0]).toEqual([true, true]);
    // A2: the limit story is the rewritten form of the rewrite story.
    expect(sameFunction(fnAt('A2/mA2.c_rewrite'), fnAt('A2/mA2.c_limit'))).toBe(
      true,
    );
  });

  it('no example result equals a result of the exercise he has not found, and none is the exercise function', () => {
    const leaks: string[] = [];
    for (const step of STEPS) {
      const l = ladderOf(step);
      const g = exampleFn(l);
      const lines = l.example.lines;
      lines.forEach((x, i) => {
        const sides = sidesOf(x.math, g);
        if (!sides) {
          return;
        }
        // Its results: the sides of a line naming its function, and the last side of the last line.
        const results = sides.some(s => s.label)
          ? sides
          : i === lines.length - 1
          ? sides.slice(-1)
          : [];
        for (const s of sides) {
          if (sameFunction(s.fn, F)) {
            leaks.push(`${step}: ${x.math} is the exercise's function`);
          }
        }
        for (const s of results) {
          const v = constantOf(s);
          for (const r of RESULTS.filter(rr => unfound(rr, step))) {
            if (r.value !== undefined && v !== null && close(v, r.value)) {
              leaks.push(`${step}: ${x.math} gives ${r.step}'s value`);
            }
            if (r.fn && v === null && sameFunction(s.fn, r.fn)) {
              leaks.push(`${step}: ${x.math} is ${r.step}'s line`);
            }
          }
        }
      });
    }
    expect(leaks).toEqual([]);
  });

  it('the example function differs from every function of the exercise and of its similar questions', () => {
    const others = [
      'e^x/(1+e^(2x))',
      'e^(2x)/(1+e^(4x))',
      '(e^x-e^(-x))/(e^x+e^(-x))',
      'e^(2x)/(1+e^(2x))',
      'e^x/(1+e^x)',
      '2e^x/(1+e^(2x))',
    ].map(e => fnOf(astOf(e)!));
    const same = STEPS.filter(s => {
      const g = exampleFn(ladderOf(s));
      return g?.f !== undefined && others.some(o => sameFunction(g.f!, o));
    });
    expect(same).toEqual([]);
  });
});

describe('bac2022c-ex4 help: what each level gives', () => {
  it("levels 1 and 2 never show the step's own result", () => {
    const shown = STEPS.flatMap(s =>
      ([1, 2] as const).flatMap(level =>
        shownResults(s, level).map(r => `${s} level ${level}: ${r}`),
      ),
    );
    expect(shown).toEqual([]);
  });

  it("level 3 of a line step never shows its line's result", () => {
    const shown = STEPS.filter(s => ladderOf(s).method.fill).flatMap(s =>
      shownResults(s, 3).map(r => `${s}: ${r}`),
    );
    expect(shown).toEqual([]);
  });

  it('level 3 of a card step never quotes the right card', () => {
    const quoted: string[] = [];
    for (const step of STEPS) {
      const f = cardFrame(step);
      if (!f) {
        continue;
      }
      const l = ladderOf(step);
      const texts = levelRich(l, 3).flatMap(runTexts).map(squash).join('|');
      for (const c of f.cards.filter(x => x.truth === 'true')) {
        const said = squash(runTexts(c.text).join(''));
        if (said.length > 0 && texts.includes(said)) {
          quoted.push(`${step}: ${c.id}`);
        }
        if (texts.includes(c.id)) {
          quoted.push(`${step}: names ${c.id}`);
        }
      }
    }
    expect(quoted).toEqual([]);
  });
});

describe('bac2022c-ex4 help: the lines to fill', () => {
  /** The question with the trip passed and every step before `frameId` his. */
  function stateAt(ctx: QuestionCtx, frameId: string) {
    let s = startQuestion(ctx);
    if (isTouring(ctx, s)) {
      s = act(ctx, s, { kind: 'continue' }).state;
    }
    const at = s.route.indexOf(frameId);
    for (const id of s.route.slice(0, at)) {
      const f = ctx.frames.get(id)?.frame;
      const answer = ctx.loaded.answers.get(
        stepKey.main(ctx.questionId, id),
      ) as ResolvedAnswer | undefined;
      if (
        f?.type !== 'lines' ||
        answer?.kind !== 'method' ||
        answer.frame !== 'lines'
      ) {
        continue;
      }
      for (const n of answer.graph.nodes.filter(x => x.planCard === f.key)) {
        credit(s.session, 'main', n.id);
      }
    }
    s.at = at;
    return s;
  }

  it('every chip and every answer reads as an expression in x', () => {
    const bad = STEPS.flatMap(s => {
      const fill = ladderOf(s).method.fill;
      return fill
        ? [...fill.chips, ...fill.answer]
            .filter(v => astOf(v) === null)
            .map(v => `${s}: ${v}`)
        : [];
    });
    expect(bad).toEqual([]);
  });

  it('each line, filled with its answer, finishes its step in one line (credit)', () => {
    const unfinished: string[] = [];
    for (const step of STEPS) {
      const fill = ladderOf(step).method.fill;
      if (!fill) {
        continue;
      }
      const [q, frameId] = step.split('/') as [string, string];
      const ctx = ctxOf(q);
      const frame = ctx.frames.get(frameId)!.frame;
      const answer = ctx.loaded.answers.get(
        stepKey.main(q, frameId),
      ) as ResolvedAnswer;
      if (
        frame.type !== 'lines' ||
        answer.kind !== 'method' ||
        answer.frame !== 'lines'
      ) {
        unfinished.push(`${step}: not a line step`);
        continue;
      }
      let i = 0;
      const line = fill.template.replace(/\{\}/g, () => fill.answer[i++] ?? '');
      const r = act(ctx, stateAt(ctx, frameId), { kind: 'line', raw: line });
      const credited = new Set(r.state.session.credited.main ?? []);
      const nodes = answer.graph.nodes.filter(
        n => n.main && n.planCard === frame.key,
      );
      if (r.out.reason !== 'credit' || !nodes.every(n => credited.has(n.id))) {
        unfinished.push(`${step}: ${line} → ${r.out.reason}`);
      }
    }
    expect(unfinished).toEqual([]);
  });

  it('a wrong chip in the first slot is not credited', () => {
    const credited: string[] = [];
    for (const step of STEPS) {
      const fill = ladderOf(step).method.fill;
      if (!fill) {
        continue;
      }
      const [q, frameId] = step.split('/') as [string, string];
      const ctx = ctxOf(q);
      const wrong = fill.chips.find(c => c !== fill.answer[0])!;
      let i = 0;
      const line = fill.template.replace(/\{\}/g, () =>
        i++ === 0 ? wrong : fill.answer[i - 1] ?? '',
      );
      const r = act(ctx, stateAt(ctx, frameId), { kind: 'line', raw: line });
      if (r.out.reason === 'credit') {
        credited.push(`${step}: ${line}`);
      }
    }
    expect(credited).toEqual([]);
  });
});

describe('bac2022c-ex4 help: the glossary', () => {
  /** Every text of the exercise and its trip: what the screen can show. */
  const screen = (() => {
    const out: string[] = [];
    const walk = (v: unknown): void => {
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
    return out.map(squash).join('\n');
  })();

  it('has at least 6 entries, for the symbols and the French words of Partie A', () => {
    expect(help.glossary.length).toBeGreaterThanOrEqual(6);
    const ids = help.glossary.map(e => e.id);
    for (const id of [
      'paire',
      'impaire',
      'montrer_que',
      'limite',
      'f_prime',
      'asymptote',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('every match is text the screen shows', () => {
    const missing = help.glossary.flatMap(e =>
      e.match
        .filter(m => !screen.includes(squash(m)))
        .map(m => `${e.id}: ${m}`),
    );
    expect(missing).toEqual([]);
  });

  it('no entry gives a result of Partie A', () => {
    const results = [
      '\\frac{1}{2}',
      'y=0',
      '2e^{2x}',
      '1-e^{2x}',
      'f(0)=',
      '\\frac{0}{0+1}',
    ];
    const given = help.glossary.flatMap(e =>
      [...e.meaning, ...(e.use ?? [])]
        .flatMap(r => [...runTexts(r), ...richMath(r)])
        .map(squash)
        .flatMap(t =>
          results.filter(r => t.includes(r)).map(r => `${e.id}: ${r}`),
        ),
    );
    expect(given).toEqual([]);
  });

  it('a long press on the paper finds its entries', () => {
    const ids = (pressed: string) =>
      glossaryMatches(ID, pressed).map(e => e.id);
    expect(ids('Montrer que f est paire.')).toEqual(
      expect.arrayContaining(['montrer_que', 'paire']),
    );
    expect(ids('impaire')).toEqual(['impaire']);
    expect(ids("f'(x)=\\frac{(1-e^{2x})e^{x}}{(1+e^{2x})^{2}}")).toContain(
      'f_prime',
    );
    expect(ids('\\lim_{x\\to+\\infty} f(x) = 0')).toContain('limite');
    expect(ids('Tracer (ζ).')).toContain('courbe');
    expect(ids('f(-x) = f(x)')).toContain('f_of_minus_x');
  });
});

// The equivalence check the board uses agrees with this file's sampling on the
// exercise's function (a guard on the helpers above).
test('the helpers read the exercise function like the engine', () => {
  const p = plainOf('\\frac{e^{x}}{1+e^{2x}}')!;
  expect(checkEquivalence(astOf(p)!, F_AST).verdict).toBe('equivalent');
  expect(sameFunction(fnOf(astOf(p)!), F)).toBe(true);
});
