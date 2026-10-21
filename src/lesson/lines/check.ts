/**
 * Line-by-line checking (no React): each typed line must equal the previous
 * accepted line (or the start; with no start, the goal) by numeric samples;
 * the step ends when a line reaches the goal's written form. Wrong lines are
 * localized (numerator / denominator) with values at the student's first
 * disagreeing sample point. Unreadable editor lines are named and located
 * first, never graded. The engine decides; nothing is generated.
 */
import {
  checkEquivalence,
  locateDifference,
  missingParentheses,
  parseExpression,
  sameForm,
  toString,
  type Difference,
  type Node,
  type ParseErrorCode,
} from '../../engine/expression';
import { deserialize, diagnose, type LineIssue } from './editor';

export interface LinesSpec {
  variables: readonly string[];
  /** The expression the student starts from (shown above the first line). */
  start?: string;
  /** The goal's written form (a "montrer que" target, or the result). */
  goal: string;
  /**
   * Known wrong lines -> misconception ids (data, not messages). `meant`:
   * the line the student meant (localizes the error: 0 for 1 -> numerator).
   */
  knownWrong: readonly {
    expr: string;
    misconceptionId: string;
    meant?: string;
  }[];
  /** Points near which samples are skipped (singularities). */
  exclude?: readonly number[];
}

export type LineVerdict =
  /** An editor line that cannot be read (what and where); not an answer. */
  | { kind: 'unreadable'; issue: LineIssue }
  /** Written exactly like the previous line (e.g. an unedited copy); not an answer. */
  | { kind: 'unchanged' }
  | { kind: 'parse_error'; code: ParseErrorCode; index: number }
  | { kind: 'undetermined' }
  | {
      kind: 'accepted';
      /** The line is in the goal's written form: the step is done. */
      final: boolean;
      /** Done on the first line, skipping every intermediate line. */
      jumped: boolean;
    }
  | {
      kind: 'wrong';
      where: Difference['where'];
      at?: Difference['at'];
      misconceptionId?: string;
      parentheses?: 'numerator' | 'denominator';
    };

export const MISSING_PARENTHESES = 'missing_parentheses_fraction';

function parse(src: string, spec: LinesSpec): Node {
  const r = parseExpression(src, { variables: spec.variables });
  if (!r.ok) {
    throw new Error(`content expression does not parse: ${src}`);
  }
  return r.ast;
}

export function checkLine(
  spec: LinesSpec,
  accepted: readonly string[],
  raw: string,
): LineVerdict {
  const tree = deserialize(raw);
  const issue = tree && diagnose(tree);
  if (issue) {
    return { kind: 'unreadable', issue };
  }
  const p = parseExpression(raw, { variables: spec.variables });
  if (!p.ok) {
    return { kind: 'parse_error', ...p.error };
  }
  const line = p.ast;
  const prevSrc = accepted[accepted.length - 1] ?? spec.start ?? spec.goal;
  const prev = parse(prevSrc, spec);
  const exclude = spec.exclude ?? [];
  const options = {
    variables: spec.variables,
    skip: (scope: Record<string, number>) =>
      Object.values(scope).some(v => exclude.some(e => Math.abs(v - e) < 1e-3)),
  };
  // A copy of the previous line (or of the start) is not a new step: same
  // writing, term order included (only redundant parentheses are ignored).
  const hasPrevious = accepted.length > 0 || spec.start !== undefined;
  if (hasPrevious && toString(line) === toString(prev)) {
    return { kind: 'unchanged' };
  }
  const same = checkEquivalence(line, prev, options);
  if (same.verdict === 'undetermined') {
    return { kind: 'undetermined' };
  }
  if (same.verdict === 'equivalent') {
    const final = sameForm(line, parse(spec.goal, spec));
    return { kind: 'accepted', final, jumped: final && accepted.length === 0 };
  }
  const known = spec.knownWrong.find(
    w =>
      checkEquivalence(line, parse(w.expr, spec), options).verdict ===
      'equivalent',
  );
  const parens = missingParentheses(line, prev, options);
  // Localize against the closest written form: what the student meant, the
  // previous lines, the start, the goal (all equal); first one-part match wins.
  const refs = [
    ...(known?.meant !== undefined ? [known.meant] : []),
    ...[...accepted].reverse(),
    ...(spec.start !== undefined ? [spec.start] : []),
    spec.goal,
  ].map(r => parse(r, spec));
  const diffs = refs.map(r => locateDifference(line, r, options));
  const diff =
    diffs.find(d => d.where === 'numerator' || d.where === 'denominator') ??
    locateDifference(line, prev, options);
  const misconceptionId =
    known?.misconceptionId ?? (parens ? MISSING_PARENTHESES : undefined);
  return {
    kind: 'wrong',
    where: diff.where,
    ...(diff.at && { at: diff.at }),
    ...(misconceptionId !== undefined && { misconceptionId }),
    ...(parens && { parentheses: parens }),
  };
}
