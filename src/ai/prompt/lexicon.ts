/**
 * Words and phrases that are not Tunisian (Moroccan, Algerian or standard
 * Arabic forms the models drift to), each with the Tunisian form to use.
 * One list for the tutor's instructions, the message check (verify) and the
 * content lint test. «ماشي» alone is Tunisian (going); only «ماشي مشكل» is not.
 * A `word` entry matches only as a whole word, with or without an attached
 * و ف ب ل ال (so «مسودّة» and «يتساوواش» are not caught, «السود» is).
 * «واش» and «سود» banned by the owner, 2026-10-30. reviewed: false (owner and
 * a Tunisian teacher to extend it).
 */
export interface BannedPhrase {
  phrase: string;
  use: string;
  word?: true;
  /** Only as the number two before a noun («زوج كور»), not a pair («كل زوج»). */
  count?: true;
}

export const BANNED_DARIJA: readonly BannedPhrase[] = [
  { phrase: 'ماشي مشكل', use: 'موش مشكل' },
  { phrase: 'لماذا', use: 'علاش' },
  { phrase: 'اثنين', use: 'زوز' },
  { phrase: 'شحال', use: 'قدّاش' },
  { phrase: 'سحبة', use: 'تيراج' },
  { phrase: 'نسحب', use: 'نجبدو' },
  {
    phrase: 'واش',
    use: 'شنوّة for what, كان ... ولا لا for whether',
    word: true,
  },
  { phrase: 'سود', use: 'كحل', word: true },
  { phrase: 'سودة', use: 'كحلة', word: true },
  { phrase: 'سوداء', use: 'كحلة', word: true },
  // Moroccan "two" (found in our own pick feedback by the conductor dry run).
  { phrase: 'جوج', use: 'زوز', word: true },
  // "Two" before a noun, as the AI wrote it («نجبدو زوج كور»); «كل زوج» (each pair) is fine.
  { phrase: 'زوج', use: 'زوز', count: true },
];

const ARABIC_LETTER = '\u0600-\u06FF';
const wordPattern = (phrase: string): RegExp =>
  new RegExp(
    `(^|[^${ARABIC_LETTER}])(?:و|ف|ب|ل|ال|وال|بال|فال|لل)?${phrase}(?![${ARABIC_LETTER}])`,
  );
const PATTERNS = BANNED_DARIJA.map(b =>
  b.word ? wordPattern(b.phrase) : null,
);

/** «زوج» as a number before a noun, not after «كل» (each pair). */
function countBefore(phrase: string, text: string): boolean {
  const re = new RegExp(
    `(^|[^${ARABIC_LETTER}])${phrase}(?=\\s+[${ARABIC_LETTER}])`,
    'g',
  );
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, m.index + m[1]!.length).trimEnd();
    if (!/(^|\s)كل$/.test(before)) {
      return true;
    }
  }
  return false;
}

/** The banned phrases found in a text, with their Tunisian replacements. */
export function bannedIn(text: string): BannedPhrase[] {
  return BANNED_DARIJA.filter((b, i) => {
    if (b.count) {
      return countBefore(b.phrase, text);
    }
    const re = PATTERNS[i];
    return re ? re.test(text) : text.includes(b.phrase);
  });
}

/** The list as one prompt sentence. */
export function bannedSentence(): string {
  return `Never these non-Tunisian forms: ${BANNED_DARIJA.map(
    b => `«${b.phrase}» (say «${b.use}»)`,
  ).join(', ')}.`;
}
