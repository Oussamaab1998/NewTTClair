/**
 * «Vrai ou faux»: when the statement is a trap, the engine shows why with
 * the simplest numbers it can find (mockup 5: «avec u = x et v = x,
 * (u/v)′ = 0 mais u′/v′ = 1»). Simple functions are tried in order, at
 * simple values of x, until the rule and the trap give two different nice
 * numbers (whole numbers or small fractions).
 */
import { evaluateReal, parseExpression } from '../../engine/expression';
import { lawLatex, ofLatex } from '../display';
import { parseInX, parseLaw } from '../law';
import { FORMULA_VARIABLES, type FormulaRule } from '../schema';
import type { Part } from './parts';

/** Simple functions with their exact derivatives, simplest first. */
export const SIMPLE: readonly Part[] = [
  { f: 'x', d: '1' },
  { f: 'x+1', d: '1' },
  { f: '2x', d: '2' },
  { f: 'x^2', d: '2x' },
  { f: 'x^2+1', d: '2x' },
  { f: '2x-2', d: '2' },
  { f: 'x^3', d: '3x^2' },
];
const XS = [1, 2, 3, 4, -1] as const;
const NS = [2, 3] as const;
const KS = [2, 3] as const;

export interface Counterexample {
  /** The parts, drawn: ["u=x", "v=x"] (only those the law uses). */
  parts: string[];
  x: number;
  /** The rule's value at x: "\left(\frac{u}{v}\right)'=0". */
  truth: string;
  /** The trap's value at x: "\frac{u'}{v'}=1". */
  trap: string;
}

/** p/q with a small q, or null: the numbers a student can read at a glance. */
export function nice(value: number): [number, number] | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(value * q);
    if (Math.abs(p / q - value) < 1e-9 && Math.abs(p) <= 200) {
      return [p, q];
    }
  }
  return null;
}

export function niceLatex([p, q]: [number, number]): string {
  if (q === 1) {
    return String(p);
  }
  return p < 0 ? `-\\frac{${-p}}{${q}}` : `\\frac{${p}}{${q}}`;
}

const lettersOf = (src: string): Set<string> => {
  const r = parseExpression(src, { variables: [...FORMULA_VARIABLES] });
  return new Set(r.ok ? r.variables : []);
};

/** The first simple case where the trap and the rule part, or null. */
export function counterexample(
  rule: FormulaRule,
  trapId: string,
): Counterexample | null {
  const trap = rule.traps.find(t => t.id === trapId);
  if (!trap) {
    throw new Error(`${rule.id}: no trap ${trapId}`);
  }
  const letters = lettersOf(rule.law.of);
  const law = parseLaw(rule.law.d);
  const wrong = parseLaw(trap.d);
  const us = letters.has('u') ? SIMPLE : [null];
  const vs = letters.has('v') ? SIMPLE : [null];
  const ns = letters.has('n') ? NS : [null];
  const ks = letters.has('k') ? KS : [null];
  for (const x of XS) {
    for (const u of us) {
      for (const v of vs) {
        for (const n of ns) {
          for (const k of ks) {
            const scope: Record<string, number> = { x };
            if (u) {
              scope.u = evaluateReal(parseInX(u.f), { x });
              scope.U = evaluateReal(parseInX(u.d), { x });
            }
            if (v) {
              scope.v = evaluateReal(parseInX(v.f), { x });
              scope.V = evaluateReal(parseInX(v.d), { x });
            }
            if (n !== null) {
              scope.n = n;
            }
            if (k !== null) {
              scope.k = k;
            }
            const a = nice(evaluateReal(law, scope));
            const b = nice(evaluateReal(wrong, scope));
            if (!a || !b || (a[0] === b[0] && a[1] === b[1])) {
              continue;
            }
            const parts = [
              ...(u ? [`u=${lawLatex(u.f)}`] : []),
              ...(v ? [`v=${lawLatex(v.f)}`] : []),
              ...(n !== null ? [`n=${n}`] : []),
              ...(k !== null ? [`k=${k}`] : []),
            ];
            return {
              parts,
              x,
              truth: `${ofLatex(rule)}=${niceLatex(a)}`,
              trap: `${lawLatex(trap.d)}=${niceLatex(b)}`,
            };
          }
        }
      }
    }
  }
  return null;
}
