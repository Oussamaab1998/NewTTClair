/**
 * Arabic text with embedded French terms, stored as runs.
 *
 * Authors never type bidi control characters. Each French term is its own run,
 * and the renderer decides how to isolate it (see docs/DECISIONS.md, D3).
 * Formulas are never runs: they live in separate math blocks (CLAUDE.md).
 */
import { z } from 'zod';

export const ArRunSchema = z.union([
  z.strictObject({ ar: z.string().min(1) }),
  z.strictObject({ fr: z.string().min(1) }),
]);
export const ArRunsSchema = z.array(ArRunSchema).min(1);

export type ArRun = z.infer<typeof ArRunSchema>;
export type ArRuns = z.infer<typeof ArRunsSchema>;

/** Unicode bidi controls (UAX #9). */
export const BIDI = {
  RLM: '\u200F', // right-to-left mark: forces RTL paragraph direction
  LRM: '\u200E', // left-to-right mark: a strong L character, invisible
  LRI: '\u2066', // left-to-right isolate
  PDI: '\u2069', // pop directional isolate
} as const;

/**
 * - none:    plain concatenation (control; reproduces prototype bugs)
 * - unicode: RLM at paragraph start + LRI LRM … LRM PDI around French runs
 *   (the LRMs keep a run's edge signs LTR where the isolate is not honored:
 *   iOS drew "−x" as "x−" with LRI…PDI alone)
 * - nested:  French runs as nested <Text> with writingDirection 'ltr' (iOS only honors it)
 * - both:    unicode + nested
 */
export type IsolationStrategy = 'none' | 'unicode' | 'nested' | 'both';
export const ISOLATION_STRATEGIES: readonly IsolationStrategy[] = [
  'none',
  'unicode',
  'nested',
  'both',
];
export const DEFAULT_ISOLATION: IsolationStrategy = 'both';

export interface Segment {
  text: string;
  /** true when this segment must render as its own LTR <Text> run. */
  ltr: boolean;
}

export function usesUnicodeIsolation(strategy: IsolationStrategy): boolean {
  return strategy === 'unicode' || strategy === 'both';
}

export function usesNestedRuns(strategy: IsolationStrategy): boolean {
  return strategy === 'nested' || strategy === 'both';
}

/** Turns runs into renderable segments for a given strategy. */
export function toSegments(
  runs: ArRuns,
  strategy: IsolationStrategy,
): Segment[] {
  const unicode = usesUnicodeIsolation(strategy);
  const nested = usesNestedRuns(strategy);
  const segments: Segment[] = [];

  const push = (text: string, ltr: boolean) => {
    const last = segments[segments.length - 1];
    if (last && last.ltr === ltr && !ltr) {
      last.text += text;
    } else {
      segments.push({ text, ltr });
    }
  };

  if (unicode) {
    push(BIDI.RLM, false);
  }
  for (const run of runs) {
    if ('ar' in run) {
      push(run.ar, false);
    } else {
      const text = unicode
        ? `${BIDI.LRI}${BIDI.LRM}${run.fr}${BIDI.LRM}${BIDI.PDI}`
        : run.fr;
      if (nested) {
        segments.push({ text, ltr: true });
      } else {
        push(text, false);
      }
    }
  }
  return segments;
}

/** Plain text without control characters (accessibility, quoting in a student bubble). */
export function toPlainText(runs: ArRuns): string {
  return runs.map(run => ('ar' in run ? run.ar : run.fr)).join('');
}

export interface RunIssue {
  index: number;
  problem:
    | 'latin_in_ar_run'
    | 'digit_in_ar_run'
    | 'math_symbol_in_ar_run'
    | 'bidi_control_in_text';
}

const LATIN = /[A-Za-z]/;
const DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;
/** Math that must be its own LTR run (a `fr` run) or a math block, never inside Arabic. */
const MATH_SYMBOL =
  /[=+^<>≤≥∞√∫\u2212×÷·±≠≈∈∉⊂ℝℕℤℚℂ⇒⇔→←↦′″\u2070-\u209F\u00B2\u00B3\u00B9]/;
const BIDI_CONTROL = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

/**
 * A plain string shown in an RTL text (a quote, a student's own text): each
 * stretch with Latin letters, digits or math becomes its own LTR isolate
 * (spaces and sentence punctuation stay outside). Without this, iOS draws
 * "−x" as "x−" and "f(−x) = f(x)" with its last ")" on the wrong side.
 */
export function isolateInline(text: string): string {
  return text.replace(/[^\u0600-\u06FF]+/g, chunk => {
    if (!LATIN.test(chunk) && !DIGIT.test(chunk) && !MATH_SYMBOL.test(chunk)) {
      return chunk;
    }
    const [, lead = '', core = '', trail = ''] =
      /^([\s.,:;!?]*)([\s\S]*?)([\s.,:;!?]*)$/.exec(chunk) ?? [];
    return `${lead}${BIDI.LRI}${BIDI.LRM}${core}${BIDI.LRM}${BIDI.PDI}${trail}`;
  });
}

/**
 * Content lint for authored runs: Latin words must be their own `fr` run,
 * digits and formulas belong in math blocks (CLAUDE.md RTL rules).
 */
export function findRunIssues(runs: ArRuns): RunIssue[] {
  const issues: RunIssue[] = [];
  runs.forEach((run, index) => {
    const text = 'ar' in run ? run.ar : run.fr;
    if (BIDI_CONTROL.test(text)) {
      issues.push({ index, problem: 'bidi_control_in_text' });
    }
    if ('ar' in run) {
      if (LATIN.test(run.ar)) {
        issues.push({ index, problem: 'latin_in_ar_run' });
      }
      if (DIGIT.test(run.ar)) {
        issues.push({ index, problem: 'digit_in_ar_run' });
      }
      if (MATH_SYMBOL.test(run.ar)) {
        issues.push({ index, problem: 'math_symbol_in_ar_run' });
      }
    }
  });
  return issues;
}

/**
 * LLM text: runs often touch without a space ("كلمةau moins uneتعني"). Adds one
 * space on the Arabic side of each boundary that has none (never inside a
 * French run, never before punctuation). Authored content already has them.
 */
export function spaceRunBoundaries(runs: ArRuns): ArRuns {
  const out = runs.map(r => ({ ...r }));
  const text = (r: ArRun) => ('ar' in r ? r.ar : r.fr);
  for (let i = 1; i < out.length; i += 1) {
    const prev = out[i - 1]!;
    const cur = out[i]!;
    const a = text(prev);
    const b = text(cur);
    // "الـ" + "domaine": the article attached by a tatweel stays attached.
    if (
      /[\s\u0640]$/.test(a) ||
      /^[\s.,;:!?\u060C\u061B\u061F)]/.test(b) ||
      a === '' ||
      b === ''
    ) {
      continue;
    }
    if ('ar' in prev) {
      out[i - 1] = { ar: `${a} ` };
    } else if ('ar' in cur) {
      out[i] = { ar: ` ${b}` };
    }
  }
  return out;
}
