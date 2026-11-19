/**
 * The LaTeX the student sees, drawn from a rule's machine expressions (the
 * same ones law.ts checks), never typed by hand: U is drawn u′, V is v′.
 * Every result must parse in the native math renderer (checks.ts).
 */
import { parseExpression, toLatex, type Node } from '../engine/expression';
import { parseInX, parseLaw } from './law';
import { FORMULA_VARIABLES, type FormulaExample, type FormulaRule } from './schema';

const SHOWN: Readonly<Record<string, string>> = { U: "u'", V: "v'" };
/** The hole's letter while a «Complète» template is parsed (not a law letter). */
const HOLE = 'Q';

function rename(node: Node, names: Readonly<Record<string, string>>): Node {
  switch (node.type) {
    case 'var':
      return { type: 'var', name: names[node.name] ?? node.name };
    case 'unary':
      return { ...node, arg: rename(node.arg, names) };
    case 'call':
      return { ...node, arg: rename(node.arg, names) };
    case 'binary':
      return {
        ...node,
        left: rename(node.left, names),
        right: rename(node.right, names),
      };
    default:
      return node;
  }
}

/** ln of a single letter is written as in the textbook: ln u, not ln(u). */
const lnOfLetter = (latex: string): string =>
  latex.replace(/\\ln\\left\(([a-z]'?)\\right\)/g, '\\ln $1');

/** A law expression as the student reads it (u′ for U). */
export function lawLatex(src: string): string {
  return lnOfLetter(toLatex(rename(parseLaw(src), SHOWN)));
}

/** The left side, (of)′: the function the rule differentiates. */
export function ofLatex(rule: FormulaRule): string {
  return `\\left(${lawLatex(rule.law.of)}\\right)'`;
}

/** The whole rule, e.g. (u/v)′ = (u′v − uv′)/v². */
export function ruleLatex(rule: FormulaRule): string {
  return `${ofLatex(rule)}=${lawLatex(rule.law.d)}`;
}

/** A trap as a false statement, for «Vrai ou faux». */
export function trapLatex(rule: FormulaRule, trapId: string): string {
  const trap = rule.traps.find(t => t.id === trapId);
  if (!trap) {
    throw new Error(`${rule.id}: no trap ${trapId}`);
  }
  return `${ofLatex(rule)}=${lawLatex(trap.d)}`;
}

/** «Complète»: the rule with "?" where the hole is. */
export function completeLatex(rule: FormulaRule): string {
  const src = rule.complete.template.replace('?', HOLE);
  const r = parseExpression(src, { variables: [...FORMULA_VARIABLES, HOLE] });
  if (!r.ok) {
    throw new Error(`${rule.id}: cannot parse template "${src}": ${r.error.code}`);
  }
  return `${ofLatex(rule)}=${toLatex(rename(r.ast, { ...SHOWN, [HOLE]: '?' }))}`;
}

/** The example: f(x) and f′(x). */
export function exampleLatex(ex: FormulaExample): { f: string; d: string } {
  return {
    f: `f(x)=${toLatex(parseInX(ex.f))}`,
    d: `f'(x)=${toLatex(parseInX(ex.d))}`,
  };
}
