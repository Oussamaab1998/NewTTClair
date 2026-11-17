/**
 * What a branch of ProbabilityTree writes: the label at its end (a letter,
 * maybe under a bar) and its value (a stacked fraction, a plain number, a
 * "?", or nothing). Pure and free of the theme and of React Native: the
 * layout and the model both read it, and the model is also read outside the
 * app (tools/tutor-harness runs under plain Node).
 */
import type { TreeLeafProps } from './schemas';

export interface TreeLabel {
  text: string;
  overline: boolean;
  /** A letter or a short word is set as math (italic); anything else as written. */
  italic: boolean;
}

const WORD = /^[A-Za-z][A-Za-z0-9]{0,7}$/;
const OVER = /^\\(?:overline|bar)\s*(?:\{\s*([^{}\\\s]+)\s*\}|([A-Za-z]))$/;

/**
 * The label at the end of a branch: a letter or a short word, alone or inside
 * `\overline{...}` / `\bar{...}`. Anything else is drawn as written.
 */
export function parseTreeLabel(latex: string): TreeLabel {
  const s = latex.trim();
  const over = OVER.exec(s);
  const inner = over ? over[1] ?? over[2] ?? '' : s;
  return WORD.test(inner)
    ? { text: inner, overline: over !== null, italic: true }
    : { text: s, overline: false, italic: false };
}

export type ValueForm =
  | { kind: 'frac'; num: string; den: string }
  | { kind: 'plain'; text: string }
  | { kind: 'unknown' };

/** A rational as it is written in the props: `a/b` is stacked, an integer or a decimal is plain (French comma). */
export function valueParts(p: string): Exclude<ValueForm, { kind: 'unknown' }> {
  const m = /^(\d+)\/(\d+)$/.exec(p);
  if (m && m[2] !== '1') {
    return { kind: 'frac', num: m[1]!, den: m[2]! };
  }
  return {
    kind: 'plain',
    text: m ? m[1]! : p.replace('.', ',').replace(/^-/, '−'),
  };
}

/** What is written on a branch: its probability, a "?" (hidden), or nothing (blank, counts mode). */
export function valueForm(e: TreeLeafProps, counts: boolean): ValueForm | null {
  if (counts || e.show === 'blank') {
    return null;
  }
  return e.show === 'hidden' || e.p === undefined
    ? { kind: 'unknown' }
    : valueParts(e.p);
}

/** Counts mode, beside the label: the count, a "?" (hidden or not known), or nothing (a blank branch with no count). */
export function countForm(e: TreeLeafProps, counts: boolean): ValueForm | null {
  if (!counts) {
    return null;
  }
  if (e.count !== undefined && e.countShow === 'shown') {
    return { kind: 'plain', text: String(e.count) };
  }
  return e.count === undefined && e.show === 'blank'
    ? null
    : { kind: 'unknown' };
}
