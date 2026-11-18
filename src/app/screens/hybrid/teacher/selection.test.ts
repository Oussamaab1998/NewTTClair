import {
  formulaParts,
  grow,
  moveEdge,
  selectedKind,
  selectedText,
  sentence,
  shrink,
  wordSelection,
  wordsOf,
} from './selection';

const fr = wordsOf({
  kind: 'fr',
  text: 'On considère l’arbre où A et F sont deux évènements tels que la probabilité de F est',
});
const ar = wordsOf({
  kind: 'ar',
  runs: [{ ar: 'اكتب الحساب: احتمال الطريق المعلَّم في الشجرة.' }],
});

describe('words of a block', () => {
  it('cuts French and Arabic into whole words, in reading order', () => {
    expect(fr.map(w => w.text).slice(0, 3)).toEqual([
      'On',
      'considère',
      'l’arbre',
    ]);
    expect(ar.map(w => w.text)).toEqual([
      'اكتب',
      'الحساب:',
      'احتمال',
      'الطريق',
      'المعلَّم',
      'في',
      'الشجرة.',
    ]);
    expect(ar.every(w => w.dir === 'rtl')).toBe(true);
  });

  it('keeps a French run inside Arabic as its own left-to-right group', () => {
    const mixed = wordsOf({
      kind: 'ar',
      runs: [{ ar: 'نستعملو ' }, { fr: 'loi binomiale' }, { ar: ' هنا' }],
    });
    expect(mixed.map(w => [w.text, w.dir, w.group])).toEqual([
      ['نستعملو', 'rtl', 0],
      ['loi', 'ltr', 1],
      ['binomiale', 'ltr', 1],
      ['هنا', 'rtl', 2],
    ]);
    expect(selectedKind(mixed, { start: 1, end: 2 })).toBe('fr');
    expect(selectedKind(mixed, { start: 0, end: 1 })).toBe('ar');
  });

  it('a formula has no words (it has parts)', () => {
    expect(wordsOf({ kind: 'math', latex: 'p(A)' })).toEqual([]);
  });
});

describe('more and less, word by word', () => {
  it('starts on the pressed word, grows and shrinks at the end read last', () => {
    let s = wordSelection(4, ar.length);
    expect(selectedText(ar, s)).toBe('المعلَّم');
    s = grow(s, ar.length);
    expect(selectedText(ar, s)).toBe('المعلَّم في');
    s = shrink(shrink(s));
    expect(selectedText(ar, s)).toBe('المعلَّم');
  });

  it('at the end of the block «+» grows at its start; never less than one word', () => {
    const last = wordSelection(ar.length - 1, ar.length);
    expect(grow(last, ar.length)).toEqual({ start: 5, end: 6 });
    expect(shrink(last)).toEqual(last);
  });

  it('a dragged handle moves its end word by word, and crossing ends swap', () => {
    const s = { start: 2, end: 4 };
    expect(moveEdge(s, 'end', 6)).toEqual({ start: 2, end: 6 });
    expect(moveEdge(s, 'start', 3)).toEqual({ start: 3, end: 4 });
    expect(moveEdge(s, 'start', 5)).toEqual({ start: 4, end: 5 });
  });

  it('«الجملة الكاملة»: the sentence first, then the whole block', () => {
    const two = wordsOf({
      kind: 'fr',
      text: 'On tire une boule. On note sa couleur.',
    });
    const first = sentence(wordSelection(2, two.length), two);
    expect(selectedText(two, first)).toBe('On tire une boule');
    expect(sentence(first, two)).toEqual({ start: 0, end: two.length - 1 });
  });

  it('the question leaves out the punctuation around the words', () => {
    expect(selectedText(ar, { start: 5, end: 6 })).toBe('في الشجرة');
  });
});

describe('the parts of a formula', () => {
  it('p(Ā∩F) = 1/4: the whole, its sides, the inside, each event and ∩', () => {
    const parts = formulaParts('p(\\overline{A} \\cap F) = \\frac{1}{4}');
    expect(parts).toEqual([
      'p(\\overline{A} \\cap F) = \\frac{1}{4}',
      'p(\\overline{A} \\cap F)',
      '\\frac{1}{4}',
      '\\overline{A} \\cap F',
      '\\overline{A}',
      'F',
      '\\cap',
    ]);
  });

  it('a conditional: both events of p(F/Ā)', () => {
    expect(formulaParts('p(F/\\overline{A})')).toEqual([
      'p(F/\\overline{A})',
      'F/\\overline{A}',
      'F',
      '\\overline{A}',
    ]);
  });

  it('a function line keeps only parts the renderer draws, at most eight', () => {
    const parts = formulaParts('f(x) = \\frac{e^{x}}{1 + e^{2x}}');
    expect(parts[0]).toBe('f(x) = \\frac{e^{x}}{1 + e^{2x}}');
    expect(parts).toContain('\\frac{e^{x}}{1 + e^{2x}}');
    expect(parts.length).toBeLessThanOrEqual(8);
  });

  it('a lone symbol has one part: itself', () => {
    expect(formulaParts('A')).toEqual(['A']);
  });
});
