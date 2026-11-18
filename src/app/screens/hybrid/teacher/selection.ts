/**
 * Select any text to ask about it (owner, approved mockups 4a-4c,
 * 2026-11-18): the pure part. A long-pressed text block is cut into whole
 * words; the selection is a range of them that grows or shrinks one word at
 * a time (a dragged handle, «+», «−»), or jumps to the whole sentence. A
 * formula is selected whole and narrowed to one of its parts (formulaParts).
 * The screen (Selector.tsx) draws it; nothing here knows about layout.
 */
import type { ArRuns } from '../../../../lesson/rich/runs';
import { parseLatexSubset } from '../../../../lesson/math/latexSubset';

/** What he long-pressed: Arabic runs (French words isolated inside), the paper's French, or a formula. */
export type SelectSource =
  | { kind: 'ar'; runs: ArRuns }
  | { kind: 'fr'; text: string }
  | { kind: 'math'; latex: string };

/** One whole word, in reading order. */
export interface Word {
  i: number;
  text: string;
  /** French words keep left to right inside an Arabic sentence. */
  dir: 'rtl' | 'ltr';
  /** The run it comes from: a French run inside Arabic is drawn as one left-to-right group. */
  group: number;
}

/** A range of words, both ends included (start ≤ end). */
export interface Selection {
  start: number;
  end: number;
}

/** Ends a sentence: the selection «الجملة الكاملة» stops there. */
const SENTENCE_END = /[.!?؟:;؛]$/u;

/** The words of a text block, in reading order (empty for a formula). */
export function wordsOf(src: SelectSource): Word[] {
  const out: Word[] = [];
  const push = (text: string, dir: Word['dir'], group: number) => {
    for (const w of text.split(/\s+/u)) {
      if (w !== '') {
        out.push({ i: out.length, text: w, dir, group });
      }
    }
  };
  if (src.kind === 'fr') {
    push(src.text, 'ltr', 0);
  } else if (src.kind === 'ar') {
    src.runs.forEach((run, g) =>
      'ar' in run ? push(run.ar, 'rtl', g) : push(run.fr, 'ltr', g),
    );
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** One word selected (the one he long-pressed). */
export const wordSelection = (i: number, count: number): Selection => {
  const at = clamp(i, 0, Math.max(0, count - 1));
  return { start: at, end: at };
};

/** «+»: one more word at the end he reads last; at the block's end, one more at its start. */
export function grow(sel: Selection, count: number): Selection {
  if (sel.end < count - 1) {
    return { start: sel.start, end: sel.end + 1 };
  }
  return sel.start > 0 ? { start: sel.start - 1, end: sel.end } : sel;
}

/** «−»: one word less at the end he reads last (never fewer than one word). */
export const shrink = (sel: Selection): Selection =>
  sel.end > sel.start ? { start: sel.start, end: sel.end - 1 } : sel;

/** A handle dragged onto word `i`: that end moves there; ends that cross swap. */
export function moveEdge(
  sel: Selection,
  edge: 'start' | 'end',
  i: number,
): Selection {
  const other = edge === 'start' ? sel.end : sel.start;
  return { start: Math.min(i, other), end: Math.max(i, other) };
}

/** The sentence around the selection; when it is that already, the whole block. */
export function sentence(sel: Selection, words: readonly Word[]): Selection {
  if (words.length === 0) {
    return sel;
  }
  let start = sel.start;
  while (start > 0 && !SENTENCE_END.test(words[start - 1]!.text)) {
    start -= 1;
  }
  let end = sel.end;
  while (end < words.length - 1 && !SENTENCE_END.test(words[end]!.text)) {
    end += 1;
  }
  const whole = { start: 0, end: words.length - 1 };
  return start === sel.start && end === sel.end ? whole : { start, end };
}

/** The selected words as he reads them (French words in an Arabic sentence stay in place). */
export const selectedText = (words: readonly Word[], sel: Selection): string =>
  words
    .slice(sel.start, sel.end + 1)
    .map(w => w.text)
    .join(' ')
    // A word's punctuation stays out of the question («الشجرة.» → «الشجرة»).
    .replace(/^[«"'(]+|[.,;:!?؟،؛)»"']+$/gu, '');

/** French words alone (the glossary and the menu read them as the paper's French). */
export const selectedKind = (
  words: readonly Word[],
  sel: Selection,
): 'ar' | 'fr' =>
  words.slice(sel.start, sel.end + 1).every(w => w.dir === 'ltr') ? 'fr' : 'ar';

// ---------------------------------------------------------------------------
// A formula: its parts, from the whole down to one symbol.

/** At most this many part chips (the whole formula first). */
export const PARTS_MAX = 8;

/** Top-level splits: brackets and braces count, `\left`/`\right` too. */
function splitTop(latex: string, seps: readonly string[]): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  let i = 0;
  while (i < latex.length) {
    const c = latex[i]!;
    if (c === '{' || c === '(' || c === '[') {
      depth += 1;
    } else if (c === '}' || c === ')' || c === ']') {
      depth -= 1;
    } else if (depth === 0) {
      const sep = seps.find(s => latex.startsWith(s, i));
      // `\cap` must not cut `\capital`; a one-letter command is whole.
      if (
        sep &&
        !(sep.startsWith('\\') && /[A-Za-z]/.test(latex[i + sep.length] ?? ''))
      ) {
        parts.push(latex.slice(from, i));
        parts.push(sep);
        i += sep.length;
        from = i;
        continue;
      }
    }
    i += 1;
  }
  parts.push(latex.slice(from));
  return parts.map(p => p.trim()).filter(p => p !== '');
}

/** `p(...)`, `P(...)`, `f(...)`: what is inside the brackets. */
const CALL = /^([A-Za-z])\s*\((.*)\)$/su;

const OPERATORS = ['\\cap', '\\cup', '\\times', '/', '+', '-'] as const;

const parses = (latex: string): boolean => {
  try {
    parseLatexSubset(latex);
    return true;
  } catch {
    return false;
  }
};

/**
 * The parts of a formula he can narrow the selection to: the whole, each
 * side of "=", the inside of p(…), the pieces between ∩ ∪ / × + −, and those
 * operators (∩ alone is worth asking about). Only parts the renderer draws.
 */
export function formulaParts(latex: string): string[] {
  const whole = latex.trim();
  const found: string[] = [whole];
  const add = (p: string) => {
    const t = p.trim();
    if (t !== '' && !found.includes(t)) {
      found.push(t);
    }
  };
  const sides = splitTop(whole, ['=']).filter(p => p !== '=');
  const operators: string[] = [];
  if (sides.length > 1) {
    sides.forEach(add);
  }
  for (const side of sides) {
    const call = CALL.exec(side);
    const inner = call ? call[2]!.trim() : side;
    if (call) {
      add(inner);
    }
    const pieces = splitTop(inner, OPERATORS);
    if (pieces.length > 1) {
      for (const p of pieces) {
        if ((OPERATORS as readonly string[]).includes(p)) {
          if (p.startsWith('\\') && !operators.includes(p)) {
            operators.push(p);
          }
        } else {
          add(p);
        }
      }
    }
  }
  operators.forEach(add);
  return found.filter(parses).slice(0, PARTS_MAX);
}
