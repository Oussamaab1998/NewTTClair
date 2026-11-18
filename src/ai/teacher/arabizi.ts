/**
 * What the screen says it read in his Arabizi or French maths words, under
 * his bubble («قريت: inter = ∩»), so he sees his "P(AinterF)" was
 * understood. Display only: the model reads his words itself.
 */
const READS: readonly { re: RegExp; word: string; symbol: string }[] = [
  { re: /inter(?!val)/i, word: 'inter', symbol: '∩' },
  { re: /union/i, word: 'union', symbol: '∪' },
  { re: /sachant/i, word: 'sachant', symbol: '/' },
  { re: /racine/i, word: 'racine', symbol: '√' },
];

/** The maths words of his text and the symbol each one stands for (each once, in this order). */
export function arabiziNotes(text: string): { word: string; symbol: string }[] {
  return READS.filter(r => r.re.test(text)).map(({ word, symbol }) => ({
    word,
    symbol,
  }));
}
