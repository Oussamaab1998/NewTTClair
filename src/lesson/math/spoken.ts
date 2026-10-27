/**
 * A formula as words for screen readers (French, like the exam), from the same
 * LaTeX subset the native renderer draws. Never the raw LaTeX: "\frac{3}{10}"
 * is read "3 sur 10". Unparsable input falls back to its visible symbols.
 */
import {
  LatexSubsetError,
  parseLatexSubset,
  type MathNode,
} from './latexSubset';

const WORDS: Record<string, string> = {
  '=': 'égale',
  '+': 'plus',
  '−': 'moins',
  '-': 'moins',
  '×': 'fois',
  '·': 'fois',
  '÷': 'divisé par',
  '±': 'plus ou moins',
  '≤': 'inférieur ou égal à',
  '≥': 'supérieur ou égal à',
  '<': 'inférieur à',
  '>': 'supérieur à',
  '≠': 'différent de',
  '≈': 'environ',
  '∈': 'appartient à',
  '∉': "n'appartient pas à",
  '∪': 'union',
  '∩': 'inter',
  '∅': 'ensemble vide',
  '→': 'tend vers',
  '⇒': 'implique',
  '⟺': 'équivaut à',
  '∞': "l'infini",
  ℝ: 'R',
  ℕ: 'N',
  ℤ: 'Z',
  ℚ: 'Q',
  ℂ: 'C',
  '′': 'prime',
  '∑': 'somme',
  '∫': 'intégrale',
  '…': 'etc.',
  ';': 'point-virgule',
  ',': 'virgule',
  '{': 'ensemble',
  '}': '',
};

/** Each symbol on its own as a word; letters and digits stay as they are. */
function sayText(v: string): string {
  return [...v]
    .map(ch => WORDS[ch] ?? ch)
    .join(' ')
    .replace(/(\d) (?=\d)/g, '$1');
}

function say(n: MathNode): string {
  switch (n.t) {
    case 'text':
      return sayText(n.v);
    case 'row':
      return n.children.map(say).filter(Boolean).join(' ');
    case 'frac':
      return `${say(n.num)} sur ${say(n.den)}`;
    case 'binom':
      return `${say(n.k)} parmi ${say(n.n)}`;
    case 'sqrt':
      return `racine de ${say(n.body)}`;
    case 'overline':
      return `${say(n.body)} barre`;
    case 'fenced':
      return [sayText(n.open), say(n.body), sayText(n.close)]
        .filter(Boolean)
        .join(' ');
    case 'scripts': {
      const base = say(n.base);
      const sub = n.sub ? ` indice ${say(n.sub)}` : '';
      const sup = n.sup
        ? say(n.sup) === 'prime'
          ? ' prime'
          : ` puissance ${say(n.sup)}`
        : '';
      return `${base}${sub}${sup}`;
    }
    case 'limits': {
      const base = say(n.base);
      const under = n.under ? ` quand ${say(n.under)}` : '';
      const over = n.over ? ` jusqu'à ${say(n.over)}` : '';
      if (base === 'intégrale') {
        const from = n.under ? ` de ${say(n.under)}` : '';
        const to = n.over ? ` à ${say(n.over)}` : '';
        return `intégrale${from}${to} de`;
      }
      return base === 'lim' ? `limite${under}` : `${base}${under}${over}`;
    }
  }
}

/** "f ( x )" -> "f de x" (read like French), other parentheses are silent. */
function tidy(said: string): string {
  return said
    .replace(/(\p{L}) \( /gu, '$1 de ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function spokenMath(latex: string): string {
  try {
    return tidy(say(parseLatexSubset(latex)));
  } catch (e) {
    if (e instanceof LatexSubsetError) {
      return tidy(sayText(latex.replace(/\\[a-zA-Z]+|[{}^_\\]/g, ' ')));
    }
    throw e;
  }
}
