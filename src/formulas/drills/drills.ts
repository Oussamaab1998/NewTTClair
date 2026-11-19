/**
 * The four drills of «Formules» (docs/FORMULAS_PLAN.md, stage 2; mockups 4
 * to 7), built from a rule and a seed, with no AI. An item carries what its
 * screen draws (LaTeX) and what judges the answer; nothing is guessed:
 * - «Complète»: the rule with a hole and its four tiles, shuffled;
 * - «Vrai ou faux»: the rule or one of its traps, with a counter-example
 *   for a trap;
 * - «Calcule»: a concrete f; a typed answer is judged by equivalence with
 *   f′, then with each trap's f′ (a slip is named, never guessed);
 * - «Quelle règle ?»: a concrete f and rules of other shapes as options.
 */
import {
  checkEquivalence,
  parseExpression,
  toLatex,
  type Node,
} from '../../engine/expression';
import { rng } from '../../engine/expression/equivalence';
import { completeLatex, lawLatex, ruleLatex, trapLatex } from '../display';
import { parseLaw } from '../law';
import type { FormulaRule } from '../schema';
import { counterexample, type Counterexample } from './counterexample';
import {
  DRILL_EQUIVALENCE,
  hasSpec,
  instantiate,
  tidy,
  type Instance,
} from './parts';

export type DrillKind = 'complete' | 'true_false' | 'calc' | 'recognise';

export interface CompleteItem {
  kind: 'complete';
  ruleId: string;
  /** The rule with "?" at the hole. */
  latex: string;
  /** Four tiles, shuffled. */
  tiles: { latex: string; right: boolean }[];
  /** The whole rule, shown after the answer. */
  answer: string;
}

export interface TrueFalseItem {
  kind: 'true_false';
  ruleId: string;
  latex: string;
  isTrue: boolean;
  /** The trap shown, when the statement is false. */
  trapId: string | null;
  counterexample: Counterexample | null;
  /** The true rule, shown after the answer. */
  answer: string;
}

export interface CalcItem {
  kind: 'calc';
  ruleId: string;
  seed: number;
  /** "f(x)=…". */
  f: string;
  /** «ما نعرفش»: 1. the rule, 2. the parts, 3. the answer. */
  help: [string[], string[], string[]];
  /** For the judge. */
  expected: Node;
  traps: { id: string; d: Node }[];
}

export interface RecogniseItem {
  kind: 'recognise';
  ruleId: string;
  seed: number;
  f: string;
  /** 2 to 4 options (the right one and rules of other shapes), shuffled. */
  options: { ruleId: string; latex: string; right: boolean }[];
  /** "u=3x-1", "n=4": said after a right pick. */
  parts: string[];
}

export type DrillItem = CompleteItem | TrueFalseItem | CalcItem | RecogniseItem;

function shuffled<T>(xs: readonly T[], r: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function completeItem(rule: FormulaRule, seed: number): CompleteItem {
  const tiles = rule.complete.tiles.map((src, i) => ({
    latex: lawLatex(src),
    right: i === rule.complete.right,
  }));
  return {
    kind: 'complete',
    ruleId: rule.id,
    latex: completeLatex(rule),
    tiles: shuffled(tiles, rng(seed)),
    answer: ruleLatex(rule),
  };
}

/** The rule itself or one of its traps, evenly (so «Faux» is not always right). */
export function trueFalseItem(rule: FormulaRule, seed: number): TrueFalseItem {
  const r = rng(seed);
  const choice = Math.floor(r() * (rule.traps.length + 1));
  const trap = choice === 0 ? null : rule.traps[choice - 1]!;
  return {
    kind: 'true_false',
    ruleId: rule.id,
    latex: trap ? trapLatex(rule, trap.id) : ruleLatex(rule),
    isTrue: trap === null,
    trapId: trap?.id ?? null,
    counterexample: trap ? counterexample(rule, trap.id) : null,
    answer: ruleLatex(rule),
  };
}

const show = (node: Node): string => toLatex(tidy(node));

function partsLatex(rule: FormulaRule, inst: Instance): string[] {
  if (inst.scale !== undefined && inst.scale !== 1) {
    // (6√x)′ = 6 × (√x)′: the factor waits outside.
    return [
      `\\left(${show(inst.f)}\\right)'=${inst.scale}\\times \\left(${show(inst.base)}\\right)'`,
    ];
  }
  return [
    ...(inst.u ? [`u=${lawLatex(inst.u.f)}`, `u'=${lawLatex(inst.u.d)}`] : []),
    ...(inst.v ? [`v=${lawLatex(inst.v.f)}`, `v'=${lawLatex(inst.v.d)}`] : []),
    ...(inst.n !== undefined ? [`n=${inst.n}`] : []),
    ...(inst.k !== undefined ? [`k=${inst.k}`] : []),
  ];
}

export function canCalc(rule: FormulaRule): boolean {
  return hasSpec(rule.id);
}

export function calcItem(rule: FormulaRule, seed: number): CalcItem {
  const inst = instantiate(rule, seed);
  const parts = partsLatex(rule, inst);
  return {
    kind: 'calc',
    ruleId: rule.id,
    seed,
    f: `f(x)=${show(inst.f)}`,
    help: [
      [ruleLatex(rule)],
      parts.length > 0 ? parts : [ruleLatex(rule)],
      [`f'(x)=${show(inst.d)}`],
    ],
    expected: inst.d,
    traps: inst.traps,
  };
}

export type CalcVerdict =
  | { verdict: 'right' }
  | { verdict: 'trap'; trapId: string }
  | { verdict: 'wrong' }
  | { verdict: 'unreadable'; code: string };

const LEFT_SIDE = /^\s*f\s*['′]\s*\(\s*x\s*\)\s*$/;

/**
 * A typed line: "f′(x) = …", or "…", or a chain "… = … = …". Every side
 * must equal f′(x); the first side that does not is judged (a trap it
 * equals is named).
 */
export function judgeCalc(item: CalcItem, raw: string): CalcVerdict {
  const sides = raw.split('=').filter((s, i) => !(i === 0 && LEFT_SIDE.test(s)));
  if (sides.length === 0 || sides.some(s => s.trim() === '')) {
    return { verdict: 'unreadable', code: 'empty' };
  }
  for (const side of sides) {
    const p = parseExpression(side, { variables: ['x'] });
    if (!p.ok) {
      return { verdict: 'unreadable', code: p.error.code };
    }
    const same = (b: Node) =>
      checkEquivalence(p.ast, b, DRILL_EQUIVALENCE).verdict === 'equivalent';
    if (same(item.expected)) {
      continue;
    }
    const trap = item.traps.find(t => same(t.d));
    return trap ? { verdict: 'trap', trapId: trap.id } : { verdict: 'wrong' };
  }
  return { verdict: 'right' };
}

// «Quelle règle ?»

export type Shape = 'pow' | 'sqrt' | 'quot' | 'prod' | 'sum' | 'exp' | 'ln';

/** The outer shape of a function: what a student sees first. */
export function shapeOf(node: Node): Shape | null {
  if (node.type === 'call') {
    return node.fn === 'sqrt' ? 'sqrt' : node.fn === 'ln' ? 'ln' : null;
  }
  if (node.type !== 'binary') {
    return null;
  }
  switch (node.op) {
    case '^':
      return node.left.type === 'const' && node.left.name === 'e' ? 'exp' : 'pow';
    case '/':
      return 'quot';
    case '*':
      return 'prod';
    case '+':
    case '-':
      return 'sum';
  }
}

/** Rules a «Quelle règle ?» can ask about: the ones built on u and v, by their shape. */
export const RECOGNISABLE: readonly string[] = [
  'deriv.product',
  'deriv.inv_v',
  'deriv.quotient',
  'deriv.power_u',
  'deriv.sqrt_u',
  'deriv.exp_u',
  'deriv.ln_u',
];

/** The other rules of the pool whose shape differs from this rule's. */
export function distractorsFor(
  rule: FormulaRule,
  pool: readonly FormulaRule[],
): FormulaRule[] {
  const shape = shapeOf(parseLaw(rule.law.of));
  return pool.filter(
    o =>
      o.id !== rule.id &&
      RECOGNISABLE.includes(o.id) &&
      shapeOf(parseLaw(o.law.of)) !== shape,
  );
}

/** A «Quelle règle ?» needs the rule to be recognisable and two rules to tell it from. */
export function canRecognise(
  rule: FormulaRule,
  pool: readonly FormulaRule[],
): boolean {
  return RECOGNISABLE.includes(rule.id) && distractorsFor(rule, pool).length >= 2;
}

export function recogniseItem(
  rule: FormulaRule,
  pool: readonly FormulaRule[],
  seed: number,
): RecogniseItem {
  const inst = instantiate(rule, seed);
  const r = rng(seed + 1);
  const others = shuffled(distractorsFor(rule, pool), r).slice(0, 3);
  const options = shuffled(
    [rule, ...others].map(o => ({
      ruleId: o.id,
      latex: ruleLatex(o),
      right: o.id === rule.id,
    })),
    r,
  );
  return {
    kind: 'recognise',
    ruleId: rule.id,
    seed,
    f: `f(x)=${show(inst.f)}`,
    options,
    parts: [
      ...(inst.u ? [`u=${lawLatex(inst.u.f)}`] : []),
      ...(inst.v ? [`v=${lawLatex(inst.v.f)}`] : []),
      ...(inst.n !== undefined ? [`n=${inst.n}`] : []),
    ],
  };
}

/** The kinds a rule offers, given the rules the student can see. */
export function kindsFor(
  rule: FormulaRule,
  pool: readonly FormulaRule[],
): DrillKind[] {
  return [
    'complete',
    'true_false',
    ...(canCalc(rule) ? (['calc'] as const) : []),
    ...(canRecognise(rule, pool) ? (['recognise'] as const) : []),
  ];
}

export function drillItem(
  rule: FormulaRule,
  kind: DrillKind,
  pool: readonly FormulaRule[],
  seed: number,
): DrillItem {
  switch (kind) {
    case 'complete':
      return completeItem(rule, seed);
    case 'true_false':
      return trueFalseItem(rule, seed);
    case 'calc':
      return calcItem(rule, seed);
    case 'recognise':
      return recogniseItem(rule, pool, seed);
  }
}
