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
  LRI: '\u2066', // left-to-right isolate
  PDI: '\u2069', // pop directional isolate
} as const;

/**
 * - none:    plain concatenation (control; reproduces prototype bugs)
 * - unicode: RLM at paragraph start + LRI…PDI around French runs
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
      const text = unicode ? `${BIDI.LRI}${run.fr}${BIDI.PDI}` : run.fr;
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
const MATH_SYMBOL = /[=+^<>≤≥∞√∫]/;
const BIDI_CONTROL = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

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
