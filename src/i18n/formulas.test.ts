/** The «Formules» namespace follows the rules of the main i18n files (i18n.test.ts). */
import arTN from './formulas/ar-TN.json';
import fr from './formulas/fr.json';

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

describe('formulas i18n', () => {
  const ar = flatten(arTN);
  const frFlat = flatten(fr);

  it('the two files have the same keys', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(frFlat).sort());
  });

  it('simple French everywhere but the «ما نعرفش» button, which the lessons already use', () => {
    const arabic = Object.entries(ar).filter(([, text]) => ARABIC.test(text));
    expect(arabic).toEqual([['drill.help', 'ما نعرفش']]);
    expect(Object.values(frFlat).some(text => ARABIC.test(text))).toBe(false);
  });

  it('the French is the same in both files (French-first UI)', () => {
    const differs = Object.keys(frFlat).filter(
      k => k !== 'drill.help' && ar[k] !== frFlat[k],
    );
    expect(differs).toEqual([]);
  });
});
