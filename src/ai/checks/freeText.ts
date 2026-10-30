/**
 * Maths inside a free-text answer (darija, Arabizi, French): the student wrote
 * "7asb ma fi mo5i 8+3 =11 o ... 11*10*9". Segments are runs of digits,
 * operators, brackets and "=" (plus C(..), A(..), n!). A digit glued to a
 * Latin letter is Arabizi ("7asb", "mo5i", "3la", "R1") and is not maths.
 * Each segment is read by the engine like a line; nothing is guessed.
 */
import { lineVerdict, readLine, type LineVerdict } from './lines';

export interface TextSegment {
  text: string;
  verdict: LineVerdict;
}

/** Inside a segment: maths characters and spaces, never a line break. */
const MATH_CHARS = /[0-9+\-−*×÷/=().,!^; \t]/;
const LETTER = /[A-Za-zÀ-ɏ]/;
/** At most this many segments are sent to the model. */
export const MAX_SEGMENTS = 12;

/** Is position i the start of counting notation, C( or A( ? */
const notationAt = (s: string, i: number): boolean =>
  (s[i] === 'C' || s[i] === 'A') && /^\s*\(/.test(s.slice(i + 1, i + 4));

export function mathSegments(text: string): string[] {
  // Each written line is read on its own: a segment never crosses a line break.
  return text.split(/\r?\n/).flatMap(lineSegments).slice(0, MAX_SEGMENTS);
}

function lineSegments(text: string): string[] {
  const s = text.replace(/(\d)[ \t]*[xX][ \t]*(?=\d)/g, '$1*');
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    const startsNumber =
      /[0-9(]/.test(ch) && (i === 0 || !LETTER.test(s[i - 1]!));
    const startsNotation =
      notationAt(s, i) && (i === 0 || !LETTER.test(s[i - 1]!));
    if (!startsNumber && !startsNotation) {
      i++;
      continue;
    }
    let j = i;
    while (j < s.length && (MATH_CHARS.test(s[j]!) || notationAt(s, j))) {
      j++;
    }
    // A run that ends glued to a letter ("3la", "R1"-like tails) is Arabizi:
    // drop its last token.
    let seg = s.slice(i, j);
    if (j < s.length && LETTER.test(s[j]!)) {
      seg = seg.replace(/[0-9.,]*$/, '');
    }
    seg = seg.replace(/[\s,.;=(]+$/, '').replace(/^[\s=]+/, '');
    if (/[0-9]/.test(seg) && balanced(seg)) {
      out.push(...splitTopLevel(seg.trim()));
    }
    i = j + 1;
  }
  return out;
}

/**
 * "9*8=72, 72/2=36" is two calculations: split at ";" or ", " outside
 * brackets. A comma between digits is a decimal comma (0,5) and C(10, 3)
 * stays whole.
 */
function splitTopLevel(seg: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < seg.length; i++) {
    const ch = seg[i]!;
    depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
    const sep =
      depth === 0 &&
      (ch === ';' || (ch === ',' && /\s/.test(seg[i + 1] ?? '')));
    if (sep) {
      parts.push(seg.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(seg.slice(start));
  return parts.map(p => p.trim()).filter(p => /[0-9]/.test(p));
}

function balanced(seg: string): boolean {
  let depth = 0;
  for (const ch of seg) {
    depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
    if (depth < 0) {
      return false;
    }
  }
  return depth === 0;
}

/** Every maths segment of a free answer, read by the engine. */
export function readFreeText(text: string): TextSegment[] {
  return mathSegments(text).map(t => ({
    text: t,
    verdict: lineVerdict(readLine(t)),
  }));
}
