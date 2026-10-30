/**
 * Scans for the strings a student reads in a method block (D41, addendum A1
 * and E (21)). Pure; used by the loader on authored content, by the i18n test
 * on the method keys and by the tests on planted bad strings.
 *
 *  - `banned_word`: "part" / "combine" (and their French and Arabic
 *    equivalents) hand out the decomposition of "count favourable".
 *  - header strings (now / why / next, the opening card) also forbid
 *    `digit` and `math` (so never a value) and `how_word` (the how inside
 *    "count": orderings, factorial, choose).
 */
import type { Rich } from '../content/schema';

export type WordIssue = 'banned_word' | 'how_word' | 'digit' | 'math';

/** Alef forms and hamza unified, diacritics and tatweel dropped. */
export function normaliseArabic(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627');
}

const norm = (s: string): string => normaliseArabic(s).toLowerCase();

/** Whole words, compared after normalisation (a prefix «ال» is also tried). */
const BANNED_FR = [
  'partie',
  'parties',
  'combiner',
  'combine',
  'combinent',
  'combinez',
];
const BANNED_AR = ['جزء', 'اجزاء', 'جزءين', 'نجمعو', 'نجمع', 'تجميع'];
const HOW_FR = [
  'factorielle',
  'combinaison',
  'combinaisons',
  'parmi',
  'arrangements',
];
const HOW_AR = ['الترتيبات', 'ترتيبات', 'تاليف', 'التاليف', 'مضروب', 'عاملي'];

const words = (s: string): string[] =>
  norm(s)
    .split(/[^a-zà-ÿ؀-ۿ]+/)
    .filter(Boolean);
const stripAl = (w: string): string => (w.startsWith('ال') ? w.slice(2) : w);
const hits = (text: string, list: readonly string[]): boolean => {
  const set = new Set(list.map(norm));
  return words(text).some(w => set.has(w) || set.has(stripAl(w)));
};

/** All the text of a Rich, runs joined, math apart. */
export function richPlain(r: Rich): { text: string; math: string | undefined } {
  const ar = (r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)).join(' ');
  return { text: [ar, r.fr ?? ''].join(' ').trim(), math: r.math };
}

export function studentFacingIssues(
  r: Rich,
  opts: { header?: boolean } = {},
): WordIssue[] {
  const { text, math } = richPlain(r);
  const out = new Set<WordIssue>();
  if (hits(text, BANNED_FR) || hits(text, BANNED_AR)) {
    out.add('banned_word');
  }
  if (opts.header) {
    if (/[0-9٠-٩]/.test(text)) {
      out.add('digit');
    }
    if (math !== undefined || /[=+×÷!]|C_|\\/.test(text)) {
      out.add('math');
    }
    if (hits(text, HOW_FR) || hits(text, HOW_AR)) {
      out.add('how_word');
    }
  }
  return [...out];
}
