/**
 * The input's text helpers: a pressed formula written the way he would type
 * it («نكتب سؤالي وحدي» puts it in his question), and the math keys'
 * insertions at the cursor.
 */

/** Combining overline: "A" + it reads as A barre (the contrary). */
export const BAR = '\u0304';

const SYMBOL: Readonly<Record<string, string>> = {
  cap: '∩',
  cup: '∪',
  times: '×',
  cdot: '·',
  div: '÷',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  infty: '∞',
  to: '→',
  in: '∈',
  pm: '±',
  approx: '≈',
};

/** A LaTeX formula as plain typed text: p(A \cap F) -> p(A ∩ F), \frac{1}{4} -> 1/4. */
export function latexToTyped(latex: string): string {
  let s = latex.replace(/\\left|\\right/g, '').replace(/\\[,;!: ]/g, ' ');
  // Innermost first, until nothing changes.
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s
      .replace(/\\overline\{([^{}]*)\}/g, (_m, x: string) =>
        x.length === 1 ? `${x}${BAR}` : `(${x})${BAR}`,
      )
      .replace(
        /\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g,
        (_m, a: string, b: string) =>
          `${a.length > 1 ? `(${a})` : a}/${b.length > 1 ? `(${b})` : b}`,
      )
      .replace(/\\sqrt\{([^{}]*)\}/g, (_m, x: string) => `√(${x})`)
      .replace(/\^\{2\}|\^2/g, '²')
      .replace(/\\(?:text|mathrm|operatorname)\{([^{}]*)\}/g, '$1');
    if (s === before) {
      break;
    }
  }
  return s
    .replace(/\\([A-Za-z]+)/g, (_m, name: string) => SYMBOL[name] ?? name)
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One math key: what it inserts, and how far back the cursor goes after it. */
export interface MathKey {
  id: 'cap' | 'cup' | 'bar' | 'p' | 'slash' | 'frac' | 'sqrt' | 'square';
  /** What the key shows. */
  glyph: string;
  insert: string;
  /** Characters the cursor steps back after the insertion (inside the brackets). */
  back: number;
}

export const MATH_KEYS: readonly MathKey[] = [
  { id: 'cap', glyph: '∩', insert: ' ∩ ', back: 0 },
  { id: 'cup', glyph: '∪', insert: ' ∪ ', back: 0 },
  { id: 'bar', glyph: '\u0100', insert: 'A', back: 0 },
  { id: 'p', glyph: 'p( )', insert: 'p()', back: 1 },
  { id: 'slash', glyph: '/', insert: '/', back: 0 },
  { id: 'frac', glyph: '▫/▫', insert: '()/()', back: 4 },
  { id: 'sqrt', glyph: '√', insert: '√()', back: 1 },
  { id: 'square', glyph: 'x²', insert: '²', back: 0 },
];

/**
 * His text with a key inserted over the selection, and the new cursor. The
 * bar key puts a bar over the letter before the cursor (B -> B barre), or
 * writes A barre when there is none.
 */
export function insertKey(
  text: string,
  sel: { start: number; end: number },
  key: MathKey,
): { text: string; cursor: number } {
  const start = Math.max(0, Math.min(sel.start, text.length));
  const end = Math.max(start, Math.min(sel.end, text.length));
  let ins = key.insert;
  if (key.id === 'bar') {
    ins =
      /[A-Za-z]$/.test(text.slice(0, start)) && start === end ? BAR : `A${BAR}`;
  }
  // No double spaces around ∩ and ∪.
  if (ins.startsWith(' ') && /\s$/.test(text.slice(0, start))) {
    ins = ins.trimStart();
  }
  const out = text.slice(0, start) + ins + text.slice(end);
  return { text: out, cursor: start + ins.length - key.back };
}
