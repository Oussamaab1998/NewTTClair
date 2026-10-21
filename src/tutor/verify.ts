/**
 * Checks tutor-drawer blocks with the engine (CLAUDE.md rule 1; Phase 4 Step 6):
 * - a math block must parse with the app's renderer, else it is dropped;
 * - an equality whose sides are plain numbers is evaluated: true -> verified,
 *   false -> dropped;
 * - a block claiming a named value (`resultId`) is compared with the engine
 *   value: equal -> verified, different -> dropped;
 * - anything else that shows numbers is kept and marked "may contain a
 *   mistake", unless every number is one the lesson already shows;
 * - the current step's final answer is dropped while hints are left (rule 6).
 */
import { equals, type Fraction } from '../engine/rational';
import { parseNumeric } from '../engine/format';
import type { LessonContent } from '../lesson/session/lesson';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import { spaceRunBoundaries } from '../lesson/rich/runs';
import type { Rich } from '../content/schema';
import { numbersIn } from '../planner/llm/numbers';
import { answerTokensFor, shownValues, valueKey } from '../planner/llm/shown';
import type { TutorBlock } from '../planner/llm/tutorFormat';

export type Check = 'verified' | 'unverified' | 'none';

export type CheckedBlock =
  | { type: 'text'; text: Rich; check: Check }
  | { type: 'math'; latex: string; check: Check };

export interface VerifyContext {
  content: LessonContent;
  /** Current step key and ladder state (final-answer rule). */
  stepKey: string | null;
  hintsUsed: number;
  hintCount: number;
}

export interface VerifyResult {
  blocks: CheckedBlock[];
  dropped: { index: number; reason: string }[];
  counts: { verified: number; unverified: number; dropped: number };
}

/** Simple LaTeX -> safe-parser syntax; null when it is more than arithmetic. */
export function latexToPlain(latex: string): string | null {
  let s = latex
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;!: ]/g, '')
    .replace(/\{,\}/g, '.')
    .replace(/\\times|\\cdot/g, '*');
  // Innermost fractions first.
  for (let i = 0; i < 8 && /\\[dt]?frac/.test(s); i += 1) {
    s = s.replace(
      /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      (_m, a: string, b: string) => `((${a})/(${b}))`,
    );
  }
  s = s.replace(/[{}]/g, m => (m === '{' ? '(' : ')')).replace(/,/g, '.');
  return /\\|[A-Za-z]/.test(s) ? null : s.trim();
}

function valueOf(latex: string): Fraction | null {
  const plain = latexToPlain(latex);
  if (plain === null || plain === '') {
    return null;
  }
  const r = parseNumeric(plain);
  return r.ok ? r.value : null;
}

const key = valueKey;

/** LLM runs get their missing boundary spaces. */
function spaced(r: Rich): Rich {
  return r.ar ? { ...r, ar: spaceRunBoundaries(r.ar) } : r;
}

function richPlain(r: Rich): string {
  return [
    r.ar ? r.ar.map(run => ('ar' in run ? run.ar : run.fr)).join('') : '',
    r.fr ?? '',
    r.math ?? '',
  ].join(' ');
}

function richNumbers(r: Rich): Fraction[] {
  const parts: string[] = [];
  if (r.ar) {
    parts.push(r.ar.map(run => ('ar' in run ? run.ar : run.fr)).join(''));
  }
  if (r.fr) {
    parts.push(r.fr);
  }
  if (r.math) {
    parts.push(r.math);
  }
  return parts.flatMap(numbersIn);
}

export function verifyTutorBlocks(
  blocks: readonly TutorBlock[],
  ctx: VerifyContext,
): VerifyResult {
  const shown = shownValues(ctx.content, {
    stepKey: ctx.stepKey,
    hintsUsed: ctx.hintsUsed,
  });
  const early =
    ctx.hintsUsed < ctx.hintCount
      ? answerTokensFor(ctx.content, ctx.stepKey)
      : null;
  const out: CheckedBlock[] = [];
  const dropped: VerifyResult['dropped'] = [];
  const counts = { verified: 0, unverified: 0, dropped: 0 };
  const drop = (index: number, reason: string) => {
    dropped.push({ index, reason });
    counts.dropped += 1;
  };

  blocks.forEach((b, index) => {
    const nums = b.type === 'math' ? numbersIn(b.latex) : richNumbers(b.text);
    const raw = b.type === 'math' ? b.latex : richPlain(b.text);
    if (
      early !== null &&
      (nums.some(f => early.values.has(key(f))) ||
        early.ids.some(id => raw.includes(id)) ||
        early.texts.some(t => raw.toLowerCase().includes(t)))
    ) {
      drop(index, 'final_answer_early');
      return;
    }
    if (b.type === 'text') {
      const unknown = nums.some(f => !shown.has(key(f)));
      if (b.text.math !== undefined) {
        try {
          parseLatexSubset(b.text.math);
        } catch {
          drop(index, 'latex_unparseable');
          return;
        }
      }
      const check: Check =
        nums.length === 0 ? 'none' : unknown ? 'unverified' : 'verified';
      if (check !== 'none') {
        counts[check] += 1;
      }
      out.push({ type: 'text', text: spaced(b.text), check });
      return;
    }
    try {
      parseLatexSubset(b.latex);
    } catch {
      drop(index, 'latex_unparseable');
      return;
    }
    // A named value: compare with the engine.
    if (b.resultId !== undefined) {
      const engine = ctx.content.loaded.values.get(b.resultId);
      const rhs = valueOf(b.latex.split('=').pop() ?? '');
      if (engine && rhs) {
        if (equals(engine, rhs)) {
          counts.verified += 1;
          out.push({ type: 'math', latex: b.latex, check: 'verified' });
        } else {
          drop(index, 'wrong_value');
        }
        return;
      }
    }
    // Pure arithmetic equality: evaluate every side.
    const sides = b.latex.split('=');
    if (sides.length >= 2) {
      const values = sides.map(valueOf);
      if (values.every((v): v is Fraction => v !== null)) {
        if (values.every(v => equals(v, values[0]!))) {
          counts.verified += 1;
          out.push({ type: 'math', latex: b.latex, check: 'verified' });
        } else {
          drop(index, 'false_equality');
        }
        return;
      }
    }
    const unknown = nums.some(f => !shown.has(key(f)));
    const check: Check =
      nums.length === 0 ? 'none' : unknown ? 'unverified' : 'verified';
    if (check === 'verified') {
      counts.verified += 1;
    } else if (check === 'unverified') {
      counts.unverified += 1;
    }
    out.push({ type: 'math', latex: b.latex, check });
  });
  return { blocks: out, dropped, counts };
}
