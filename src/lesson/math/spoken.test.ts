import { spokenMath } from './spoken';

describe('spokenMath: formulas get a readable label, never raw LaTeX', () => {
  it.each([
    ['\\frac{3}{10}', '3 sur 10'],
    ['p(B) = 1 - p(\\bar{B})', 'p de B égale 1 moins p de B barre'],
    ['f(-x) = f(x)', 'f de moins x égale f de x'],
    [
      'x \\in \\mathbb{R} \\Rightarrow -x \\in \\mathbb{R}',
      'x appartient à R implique moins x appartient à R',
    ],
    ['e^{2x}', 'e puissance 2 x'],
    ['\\binom{4}{2}', '2 parmi 4'],
    [
      'F(x)=\\int_{0}^{\\ln x} f(t)\\,dt',
      'F de x égale intégrale de 0 à l n x de f de t d t',
    ],
  ])('%s', (latex, words) => {
    const said = spokenMath(latex);
    expect(said).toBe(words);
    expect(said).not.toMatch(/[\\{}^_]/);
  });

  it('every formula of the lesson content reads without LaTeX syntax', () => {
    const all: string[] = [];
    const walk = (n: unknown) => {
      if (Array.isArray(n)) {
        n.forEach(walk);
      } else if (n !== null && typeof n === 'object') {
        for (const [k, v] of Object.entries(n)) {
          if ((k === 'math' || k === 'latex') && typeof v === 'string') {
            all.push(v);
          } else {
            walk(v);
          }
        }
      }
    };
    walk(require('../../content/exercises/bac2022c-ex2.json'));
    walk(require('../../content/exercises/bac2022c-ex4.json'));
    expect(all.length).toBeGreaterThan(20);
    const leaks = all.filter(l => /[\\{}^_]/.test(spokenMath(l)));
    expect(leaks).toEqual([]);
  });
});
