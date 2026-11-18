/**
 * The help of the tree exercise (bac2022p-sc-ex2), checks help.test.ts cannot
 * do. Every value of the exercise comes from the engine (solveTwoEventTree on
 * the exercise's own givens), never typed here:
 * - coincidence scan: no value of a small example (its lines, its counted
 *   tree) equals a value of the exercise's tree, so an example never hands
 *   over a number he has not found (stricter than "not found yet": none);
 * - levels 1 and 2 hold no value of the exercise, so never the step's result
 *   or its calculation on our numbers;
 * - level 3 gives the method and the operands, never the result: its texts
 *   and formula hold no value of the tree, no chip is the result, the line
 *   filled with its answer computes the engine's value;
 * - a card step never shows its right card's formula or words;
 * - every example figure is a counted ProbabilityTree that parses;
 * - the glossary answers a long press on the paper (its formulas and French
 *   words, each step's formula) at once, and never gives a value;
 * - the owner's words that the shared lexicon does not hold yet.
 */
import { CATALOG } from '../../app/exercises';
import { ProbabilityTreePropsSchema } from '../../components/probability2/schemas';
import {
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import { frac, type Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import {
  TREE_QUANTITIES,
  solveTwoEventTree,
  type TreeQuantity,
} from '../../engine/tree';
import { evalChain } from '../../method/lineChain';
import { latexToPlain } from '../../tutor/verify';
import type { Rich } from '../schema';
import { glossaryKey, glossaryMatches, helpFor } from './help';
import type { Ladder } from './schema';

const ID = 'bac2022p-sc-ex2';
const help = helpFor(ID)!;
const entry = CATALOG.find(e => e.id === ID)!;

interface RawRich {
  ar?: ({ ar: string } | { fr: string })[];
  fr?: string;
  math?: string;
}
interface RawStep {
  kind?: string;
  graph?: { args?: Record<string, [number, number]> };
  plan?: { cards: { id: string; prompt?: RawRich }[] };
}
interface RawExercise {
  statement: RawRich;
  paper: { parts: { questions: { wording?: RawRich[] }[] }[] };
  parts: { id: string; groups: { steps: RawStep[] }[] }[];
}
const raw = entry.raw as unknown as RawExercise;

const methodSteps = raw.parts.flatMap(p =>
  p.groups.flatMap(g => g.steps.filter(s => s.kind === 'method')),
);

/** The givens of the tree, as every question's graph states them. */
function givens(): { pA: Fraction; pFgA: Fraction; pF: Fraction } {
  const args = methodSteps.map(s => JSON.stringify(s.graph?.args));
  expect(new Set(args).size).toBe(1);
  const a = methodSteps[0]!.graph!.args!;
  const f = (k: string): Fraction => frac(a[k]![0], a[k]![1]);
  return { pA: f('pA'), pFgA: f('pFgA'), pF: f('pF') };
}
const TREE = solveTwoEventTree(givens());
/** Every value of the exercise's tree (its 16 quantities). */
const TREE_VALUES: Fraction[] = TREE_QUANTITIES.map(q => TREE[q]);
const isTreeValue = (v: Fraction): boolean =>
  TREE_VALUES.some(t => sameRat(t, v));
const show = (v: Fraction): string => `${v[0]}/${v[1]}`;

function ctxOf(questionId: string): QuestionCtx {
  if (!entry.result.ok) {
    throw new Error(`${ID} does not load`);
  }
  return questionCtx(entry.result.loaded, entry.raw as never, questionId);
}

type Frame = NonNullable<ReturnType<QuestionCtx['frames']['get']>>['frame'];
const frameOf = (questionId: string, frameId: string): Frame =>
  ctxOf(questionId).frames.get(frameId)!.frame;

const ladders: [string, string, Ladder][] = Object.entries(
  help.ladders,
).flatMap(([q, byFrame]) =>
  Object.entries(byFrame).map(([id, l]): [string, string, Ladder] => [q, id, l]),
);

/** The step's result, when he writes a line (the engine's value of its key). */
function resultOf(questionId: string, frameId: string): Fraction | null {
  const f = frameOf(questionId, frameId);
  if (f.type !== 'lines') {
    return null;
  }
  expect(TREE_QUANTITIES).toContain(f.key);
  return TREE[f.key as TreeQuantity];
}

/** Every number a LaTeX string shows: each \frac, each integer, each side's value. */
function valuesIn(latex: string): Fraction[] {
  const out: Fraction[] = [];
  for (const m of latex.matchAll(/\\[dt]?frac\{(\d+)\}\{(\d+)\}/g)) {
    out.push(frac(Number(m[1]), Number(m[2])));
  }
  for (const m of latex.replace(/\\[a-z]+/gi, ' ').matchAll(/\d+/g)) {
    out.push(frac(Number(m[0])));
  }
  for (const side of latex.split(/[=]|\\neq/)) {
    const plain = latexToPlain(side);
    if (plain === null || plain === '') {
      continue;
    }
    const r = evalChain(plain.replace(/×/g, '*'));
    if (r.kind === 'bare' || r.kind === 'unfinished') {
      out.push(r.value);
    }
  }
  return out;
}

const richMath = (r: Rich | undefined): string[] =>
  r?.math !== undefined ? [r.math] : [];

const richWords = (r: Rich): string[] => [
  ...(r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)),
  ...(r.fr !== undefined ? [r.fr] : []),
];

type Figure = NonNullable<Ladder['example']['figure']>;
interface CountedLeaf {
  latex: string;
  count?: number;
  children?: CountedLeaf[];
}

/** The values a counted tree shows: each branch over its node, each leaf over everyone, each event's total. */
function figureValues(figure: Figure | undefined): Fraction[] {
  const props = figure?.props as
    | { rootCount?: number; branches?: CountedLeaf[] }
    | undefined;
  const root = props?.rootCount;
  if (root === undefined || !props?.branches) {
    return [];
  }
  const out: Fraction[] = [];
  const totals = new Map<string, number>();
  for (const b of props.branches) {
    out.push(frac(b.count ?? 0, root));
    for (const c of b.children ?? []) {
      out.push(frac(c.count ?? 0, b.count ?? 1), frac(c.count ?? 0, root));
      totals.set(c.latex, (totals.get(c.latex) ?? 0) + (c.count ?? 0));
    }
  }
  totals.forEach(n => out.push(frac(n, root)));
  return out;
}

const ideaMath = (l: Ladder): string[] => [
  ...l.idea.text.flatMap(richMath),
  ...(l.idea.legend ?? []).map(x => x.math),
];
const exampleMath = (l: Ladder): string[] => [
  ...l.example.story.flatMap(richMath),
  ...(l.example.legend ?? []).map(x => x.math),
  ...l.example.lines.flatMap(x => [x.math, ...richMath(x.say)]),
  ...richMath(l.example.rule),
  ...richMath(l.example.bridge),
];
/** Level 3 without the chips (the operands are on the chips). */
const methodMath = (l: Ladder): string[] => [
  ...l.method.text.flatMap(richMath),
  ...(l.method.formula !== undefined ? [l.method.formula] : []),
  ...(l.method.fill?.lead !== undefined ? [l.method.fill.lead] : []),
];
const ladderWords = (l: Ladder): string[] =>
  [
    ...l.idea.text,
    ...(l.idea.legend ?? []).map(x => x.text),
    ...l.example.story,
    ...(l.example.legend ?? []).map(x => x.text),
    ...l.example.lines.flatMap(x => (x.say ? [x.say] : [])),
    l.example.rule,
    l.example.bridge,
    ...l.method.text,
  ].flatMap(richWords);

const fillLine = (template: string, answer: readonly string[]): string => {
  let i = 0;
  return template.replace(/\{\}/g, () => answer[i++] ?? '');
};

const parseValue = (s: string): Fraction | null => {
  const r = evalChain(s);
  return r.kind === 'bare' || r.kind === 'unfinished' ? r.value : null;
};

test('the engine solves the tree from the exercise givens', () => {
  expect(TREE_VALUES).toHaveLength(TREE_QUANTITIES.length);
  expect(ladders.length).toBeGreaterThanOrEqual(15);
});

test('no small example uses a value of the exercise tree', () => {
  const hits: string[] = [];
  for (const [q, id, l] of ladders) {
    const values = [
      ...exampleMath(l).flatMap(valuesIn),
      ...figureValues(l.example.figure),
    ];
    for (const v of values.filter(isTreeValue)) {
      hits.push(`${q}/${id}: ${show(v)}`);
    }
  }
  expect(hits).toEqual([]);
});

test('levels 1 and 2 never hold the step result, nor any value of the exercise', () => {
  const hits: string[] = [];
  for (const [q, id, l] of ladders) {
    const result = resultOf(q, id);
    const values = [...ideaMath(l), ...exampleMath(l)].flatMap(valuesIn);
    for (const v of values) {
      if (result && sameRat(v, result)) {
        hits.push(`${q}/${id}: the result ${show(v)}`);
      } else if (isTreeValue(v)) {
        hits.push(`${q}/${id}: ${show(v)}`);
      }
    }
  }
  expect(hits).toEqual([]);
});

test('the small examples are true, the \\neq lines included', () => {
  const wrong: string[] = [];
  for (const [q, id, l] of ladders) {
    for (const { math } of l.example.lines) {
      const sides = math
        .split(/[=]|\\neq/)
        .map(s => latexToPlain(s))
        .map(p => (p === null || p === '' ? null : parseValue(p)));
      const numeric = sides.filter((v): v is Fraction => v !== null);
      if (math.includes('\\neq')) {
        if (numeric.length !== 2 || sameRat(numeric[0]!, numeric[1]!)) {
          wrong.push(`${q}/${id}: ${math}`);
        }
      } else if (numeric.some(v => !sameRat(v, numeric[0]!))) {
        wrong.push(`${q}/${id}: ${math}`);
      }
    }
  }
  expect(wrong).toEqual([]);
});

test('level 3 gives the method and the operands, never the result', () => {
  const bad: string[] = [];
  for (const [q, id, l] of ladders) {
    for (const v of methodMath(l).flatMap(valuesIn).filter(isTreeValue)) {
      bad.push(`${q}/${id}: a value in the method text: ${show(v)}`);
    }
    const result = resultOf(q, id);
    const fill = l.method.fill;
    if (!result || !fill) {
      continue;
    }
    for (const chip of fill.chips) {
      const v = parseValue(chip);
      if (v === null) {
        bad.push(`${q}/${id}: chip ${chip} does not read`);
      } else if (sameRat(v, result)) {
        bad.push(`${q}/${id}: chip ${chip} is the result`);
      } else if (!isTreeValue(v) && !sameRat(v, frac(1))) {
        bad.push(`${q}/${id}: chip ${chip} is not on the tree`);
      }
    }
    const last = parseValue(fill.answer.at(-1) ?? '');
    if (!last || !sameRat(last, result)) {
      bad.push(`${q}/${id}: the answer's result is not the engine's`);
    }
    const filled = evalChain(fillLine(fill.template, fill.answer));
    if (
      filled.kind !== 'chain' ||
      !filled.equal ||
      !sameRat(filled.value, result)
    ) {
      bad.push(`${q}/${id}: ${fillLine(fill.template, fill.answer)} is not the step`);
    }
  }
  expect(bad).toEqual([]);
});

test('a card step shows the reasoning, never its right card', () => {
  const bad: string[] = [];
  let cardSteps = 0;
  for (const [q, id, l] of ladders) {
    const f = frameOf(q, id);
    if (f.type !== 'cards') {
      continue;
    }
    cardSteps += 1;
    const right = f.cards.find(c => c.truth === 'true')!;
    const shown = [...ideaMath(l), ...exampleMath(l), ...methodMath(l)].map(
      glossaryKey,
    );
    if (right.text.math && shown.includes(glossaryKey(right.text.math))) {
      bad.push(`${q}/${id}: shows the right card's formula`);
    }
    const cardWords = richWords(right.text).join('');
    const words = ladderWords(l);
    if (words.some(w => w.includes(cardWords) || /\bk_[a-z]+/.test(w))) {
      bad.push(`${q}/${id}: names the right card`);
    }
  }
  expect(cardSteps).toBe(4);
  expect(bad).toEqual([]);
});

test('every example figure is a counted probability tree', () => {
  const bad: string[] = [];
  for (const [q, id, l] of ladders) {
    const figure = l.example.figure;
    if (!figure) {
      continue;
    }
    const r = ProbabilityTreePropsSchema.safeParse(figure.props);
    if (figure.component !== 'ProbabilityTree' || !r.success) {
      bad.push(`${q}/${id}: ${r.error?.message.slice(0, 200) ?? figure.component}`);
    } else if (r.data.rootCount === undefined) {
      bad.push(`${q}/${id}: no counts`);
    }
  }
  expect(bad).toEqual([]);
});

describe('glossary', () => {
  const exact = (pressed: string): boolean => {
    const first = glossaryMatches(ID, pressed)[0];
    return (
      first?.match.some(m => glossaryKey(m) === glossaryKey(pressed)) ?? false
    );
  };
  const paperWording = raw.paper.parts.flatMap(p =>
    p.questions.flatMap(qq => qq.wording ?? []),
  );

  test('the paper and every step formula have an exact entry', () => {
    const pressed = [
      ...(raw.statement.math ? [raw.statement.math] : []),
      ...paperWording.flatMap(w => [
        ...(w.math ? [w.math] : []),
        ...(w.fr ? [w.fr] : []),
      ]),
      ...methodSteps.flatMap(s =>
        (s.plan?.cards ?? []).flatMap(c =>
          c.prompt?.math ? [c.prompt.math] : [],
        ),
      ),
      'sachant',
      'arbre de probabilité',
      '\\overline{A}',
      '\\overline{F}',
      '\\cap',
    ];
    expect(pressed.filter(p => !exact(p))).toEqual([]);
    expect(help.glossary.length).toBeGreaterThanOrEqual(6);
  });

  test("the statement's French opens its words", () => {
    const ids = glossaryMatches(ID, raw.statement.fr ?? '').map(e => e.id);
    expect(ids).toEqual(
      expect.arrayContaining(['arbre', 'ci_contre', 'evenements', 'tels_que']),
    );
  });

  test('no entry gives a value, every reading is French', () => {
    const bad: string[] = [];
    for (const e of help.glossary) {
      const math = [...e.meaning, ...(e.use ?? [])].flatMap(richMath);
      for (const v of math.flatMap(valuesIn).filter(isTreeValue)) {
        bad.push(`${e.id}: ${show(v)}`);
      }
      if (e.reading !== undefined && /[؀-ۿ]/.test(e.reading)) {
        bad.push(`${e.id}: reading in Arabic`);
      }
    }
    expect(bad).toEqual([]);
  });
});

/** The owner's word list (STUDENT_TEST_PLAN.md) beyond the shared lexicon. */
const OWNER_BANNED = [
  'بس',
  'لكن',
  'هل',
  'مزيان',
  'دوك',
  'هاذا',
  'الاتنين',
  'علمًا',
  'علما',
  'نجمعو',
  'جزء',
];
const AR = '\\u0600-\\u06FF';
const bannedWord = (w: string): RegExp =>
  new RegExp(`(^|[^${AR}])(?:و|ف|ب|ل)?${w}(?![${AR}])`, 'u');

test("the help keeps to the owner's word list", () => {
  const texts = [
    ...ladders.flatMap(([, , l]) => ladderWords(l)),
    ...help.glossary.flatMap(e =>
      [...e.meaning, ...(e.use ?? [])].flatMap(richWords),
    ),
  ];
  const bad = texts.flatMap(t =>
    OWNER_BANNED.filter(w => bannedWord(w).test(t)).map(w => `«${w}»: ${t}`),
  );
  expect(bad).toEqual([]);
});

test('every step of the route has its ladder (as the board asks for it)', () => {
  const missing = raw.parts.flatMap(p => {
    const ctx = ctxOf(p.id);
    return startQuestion(ctx)
      .route.filter(id =>
        ['lines', 'cards'].includes(ctx.frames.get(id)?.frame.type ?? ''),
      )
      .filter(id => !help.ladders[p.id]?.[id])
      .map(id => `${p.id}/${id}`);
  });
  expect(missing).toEqual([]);
});
