import arTN from './ar-TN.json';
import fr from './fr.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') {
      out[prefix + key] = value;
    } else {
      Object.assign(out, flatten(value, `${prefix}${key}.`));
    }
  }
  return out;
}

const ARABIC = /[؀-ۿ]/;
// Latin letters or digits, ignoring {{placeholders}}.
const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
/** Same signs as the content check (lesson/rich/runs.ts), arrows excluded (UI icons). */
const MATH_SIGN =
  /[=+^<>≤≥∞√∫\u2212×÷·±≠≈∈∉⊂ℝℕℤℚℂ⇒⇔′″\u2070-\u209F\u00B2\u00B3\u00B9]/;

describe('i18n files', () => {
  const ar = flatten(arTN);
  const frFlat = flatten(fr);

  it('have the same keys', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(frFlat).sort());
  });

  it('never mix Arabic words with Latin letters or digits in one ar-TN string', () => {
    const mixed = Object.entries(ar).filter(([, text]) => {
      const withoutPlaceholders = text.replace(/\{\{\w+\}\}/g, '');
      return (
        ARABIC.test(withoutPlaceholders) &&
        LATIN_OR_DIGIT.test(withoutPlaceholders)
      );
    });
    expect(mixed).toEqual([]);
  });

  it('never put math signs inside an Arabic ar-TN string (formulas are LTR runs)', () => {
    const withMath = Object.entries(ar)
      .filter(([, text]) => ARABIC.test(text) && MATH_SIGN.test(text))
      .map(([key]) => key);
    // A shape cue beside the words (not colour alone), not a formula.
    expect(withMath).toEqual(['analysis.fold.noOverlapShort']);
  });
});
