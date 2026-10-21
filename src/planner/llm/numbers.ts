/** Number extraction shared by the output guard and the tutor checks. */
import { frac, type Fraction } from '../../engine/rational';

/** Numbers in a text: fractions (a/b, \frac{a}{b}) as one value; decimals with , or . */
export function numbersIn(text: string): Fraction[] {
  const out: Fraction[] = [];
  let rest = text.replace(
    /\\[dt]?frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(\d+)\s*\}/g,
    (_m, a: string, b: string) => {
      if (Number(b) !== 0) {
        out.push(frac(Number(a), Number(b)));
      }
      return ' ';
    },
  );
  rest = rest.replace(/(-?\d+)\s*\/\s*(\d+)/g, (_m, a: string, b: string) => {
    if (Number(b) !== 0) {
      out.push(frac(Number(a), Number(b)));
    }
    return ' ';
  });
  // "0{,}7" (LaTeX decimal comma) -> 0,7
  rest = rest.replace(/\{,\}/g, ',');
  for (const m of rest.matchAll(/-?\d+(?:[.,]\d+)?/g)) {
    const [int, dec = ''] = m[0].replace(',', '.').split('.');
    const den = 10 ** dec.length;
    const sign = int!.startsWith('-') ? -1 : 1;
    out.push(
      frac(sign * (Math.abs(Number(int)) * den + Number(dec || 0)), den),
    );
  }
  return out;
}
