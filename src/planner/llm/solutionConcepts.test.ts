import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import {
  formulaLeak,
  formatPhraseCoverage,
  leaksSolution,
  listsOptions,
  matchTokens,
  nearMisses,
  phraseCoverage,
  solutionConcepts,
} from './solutionConcepts';

const load = (raw: unknown, mis: unknown) => {
  const r = loadExercise(raw, mis);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
};
const c1b = buildContent(load(ex2, ex2Misconceptions), '1b');
const cA1 = buildContent(load(ex4, ex4Misconceptions), 'A1');

describe('matchTokens: text as comparable tokens', () => {
  it('drops accents, Arabic diacritics and tatweel, unifies alef / ya / ta marbuta, unwraps \\text{}', () => {
    expect(matchTokens('Numéro ZÉRO')).toEqual(['numero', 'zero']);
    expect(matchTokens('ثلاثـة إثنين قدّاش')).toEqual([
      'ثلاثه',
      'اثنين',
      'قداش',
    ]);
    expect(
      matchTokens('\\overline{B} : \\text{aucune boule portant le numéro } 0'),
    ).toEqual(['b', 'aucune', 'boule', 'portant', 'le', 'numero', '0']);
  });
});

describe('solution concepts of the current step (D16)', () => {
  it('1.b s3: the correct option\'s own word ("aucune") and the authored phrases; not words the statement already shows', () => {
    const c = solutionConcepts(c1b, '1b/s3');
    expect(c.words).toContain('aucune');
    for (const shown of ['deux', 'boules', 'numero', 'porte']) {
      expect(c.words).not.toContain(shown);
    }
    expect(c.phrases.length).toBeGreaterThan(0);
  });

  it('A1 s9: "paire" is the question\'s own goal, so it is no giveaway', () => {
    expect(solutionConcepts(cA1, 'A1/s9').words).not.toContain('paire');
  });

  it('1.b s5 (answer 3): the value, also as a word', () => {
    const c = solutionConcepts(c1b, '1b/s5');
    expect(c.values.has('3/1')).toBe(true);
  });
});

describe('leaksSolution', () => {
  const s3 = solutionConcepts(c1b, '1b/s3');
  const s5 = solutionConcepts(c1b, '1b/s5');
  const s7 = solutionConcepts(c1b, '1b/s7');

  it.each([
    ['the live French word', 'الحدث العكسي يعني aucune من الكرات'],
    ['the live math block', '\\overline{B} : \\text{aucune boule portant le numéro } 0'],
    ['the live Arabic paraphrase', 'فالعكس هو «ما فماش ولا وحدة فيها 0»'],
    ['the option, reworded', 'Aucun tirage ne contient de boule numéro 0.'],
  ])('s3 leak: %s', (_label, text) => {
    expect(leaksSolution(s3, text)).toBe(true);
  });

  it.each([
    ['a question pointing at the cases', 'شنوّة الحالات اللي B ما يصيرش فيها؟'],
    ['the statement\'s own words', 'au moins une des deux boules porte le numéro 0'],
    ['a wrong option named', 'Est-ce que « exactement une boule » couvre tous les cas ?'],
    ['a plain pointer', 'شوف الحالات الكل'],
  ])('s3 near-miss, allowed: %s', (_label, text) => {
    expect(leaksSolution(s3, text)).toBe(false);
  });

  it('numbers in words count as the value: s5 "ثلاثة", "trois"; s7 "ثلاثة على عشرة", "3 sur 10"', () => {
    expect(leaksSolution(s5, 'لقيت ثلاثة تيراجات')).toBe(true);
    expect(leaksSolution(s5, 'il y a trois tirages')).toBe(true);
    expect(leaksSolution(s5, 'عدّ التيراجات واحد بواحد')).toBe(false);
    expect(leaksSolution(s7, 'الاحتمال ثلاثة على عشرة')).toBe(true);
    expect(leaksSolution(s7, 'la probabilité vaut 3 sur 10')).toBe(true);
    expect(leaksSolution(s7, 'قسّم على عشرة')).toBe(false);
  });
});

describe('phrases in hints the student already used are no longer giveaways', () => {
  it('a phrase that a used hint shows is dropped from the concepts', () => {
    const raw = JSON.parse(JSON.stringify(ex2)) as typeof ex2;
    const s3 = raw.parts[0]!.groups[0]!.steps.find(s => s.id === 's3') as {
      solutionPhrases: { ar: string[] };
    };
    // Hint 1 of s3 reads «… ما يصيرش فيها».
    s3.solutionPhrases.ar = [...s3.solutionPhrases.ar, 'ما يصيرش فيها'];
    const c = buildContent(load(raw, ex2Misconceptions), '1b');
    const text = 'العكس هو الحالات اللي ما يصيرش فيها';
    expect(leaksSolution(solutionConcepts(c, '1b/s3'), text)).toBe(true);
    expect(
      leaksSolution(solutionConcepts(c, '1b/s3', { hintsUsed: 1 }), text),
    ).toBe(false);
  });
});

describe('option list and near misses (simulation report)', () => {
  const s3 = solutionConcepts(c1b, '1b/s3');
  const s7 = solutionConcepts(c1b, '1b/s7');

  it('a leak that also names a wrong option is the option-list rule', () => {
    expect(listsOptions(s3, 'aucune, exactement une, ou les deux ?')).toBe(
      true,
    );
    expect(listsOptions(s3, 'العكس هو aucune')).toBe(false);
  });

  it('near misses: a misspelled answer word, half of a phrase, a part of the answer value, its complement', () => {
    expect(nearMisses(s3, 'العكس هو aucunne')).toContain(
      'word:aucunne~aucune',
    );
    expect(nearMisses(s3, 'شوف ولا كورة')).toEqual([]); // a full phrase is a leak, not a near miss
    expect(
      nearMisses(s3, 'ولا وحدة').length,
    ).toBe(0);
    // Two-word phrases never fire on one shared word (2026-10-22: "tirages").
    expect(nearMisses(s3, 'فكّر في كورة وحدة')).toEqual([]);
    expect(nearMisses(s7, 'شوف العدد 10')).toContain('value-part:10');
    expect(nearMisses(s7, 'p = \\frac{7}{10}')).toContain('complement:7/10');
    expect(nearMisses(s3, 'شوف الحالات الكل')).toEqual([]);
  });
});

describe('solution phrase coverage (1.b, 2.a, A1)', () => {
  const c2a = buildContent(load(ex2, ex2Misconceptions), '2a');
  it.each([
    ['1b', c1b],
    ['2a', c2a],
    ['A1', cA1],
  ])('%s: every main step with a final answer has French and Arabic phrases that still count', (_q, content) => {
    const rows = phraseCoverage(content).filter(r => r.scope === 'main');
    expect(rows.length).toBeGreaterThan(0);
    const missing = rows.filter(r => r.fr === 0 || r.ar === 0 || r.effective === 0);
    expect(missing.map(r => r.key)).toEqual([]);
  });

  it('the dev report lists variants and minis too, with their gap', () => {
    const text = formatPhraseCoverage(phraseCoverage(c1b));
    expect(text).toContain('| 1b/s3 | main |');
    // A simpler twin: no phrases yet (transfers have them, 2026-10-22).
    expect(text).toMatch(/\| var:sim-pairs-2 \| variant \| typed \| 0 \| 0 \| 0 \|/);
    expect(text).toMatch(/without phrases: \d+ of \d+/);
  });
});

describe('solution phrases on transfer variants (2026-10-22)', () => {
  const c2a = buildContent(load(ex2, ex2Misconceptions), '2a');
  it.each([
    ['1b', c1b],
    ['2a', c2a],
    ['A1', cA1],
  ])('%s: every transfer variant with a final answer has French and Arabic phrases that still count', (_q, content) => {
    const rows = phraseCoverage(content).filter(r =>
      r.key.startsWith('var:tr-'),
    );
    expect(rows.length).toBeGreaterThan(0);
    const missing = rows.filter(
      r => r.fr === 0 || r.ar === 0 || r.effective === 0,
    );
    expect(missing.map(r => r.key)).toEqual([]);
  });
});

describe('near misses: only phrases of three words or more, two of them present', () => {
  const c2a = buildContent(load(ex2, ex2Misconceptions), '2a');
  it('"tirages" alone does not fire at 2.a/s6 ("dix tirages")', () => {
    const s6 = solutionConcepts(c2a, '2a/s6');
    expect(nearMisses(s6, 'compte les tirages un par un')).toEqual([]);
  });

  it('half of a long phrase still fires (A1/s8)', () => {
    const s8 = solutionConcepts(cA1, 'A1/s8');
    expect(
      nearMisses(s8, 'écris e puissance deux x').some(n =>
        n.startsWith('phrase:'),
      ),
    ).toBe(true);
  });
});

describe('counting formulas (4c)', () => {
  const c2a = buildContent(load(ex2, ex2Misconceptions), '2a');
  it('a formula with the exercise numbers is evaluated by the engine', () => {
    expect(formulaLeak(c2a, '2a/s6', '\\binom{5}{2}', 0)).toBe('formula_answer');
    expect(formulaLeak(c2a, '2a/s6', '\\frac{5 \\times 4}{2}', 0)).toBe('formula_answer');
    expect(formulaLeak(c2a, '2a/s6', 'نختارو زوز من خمسة', 0)).toBe('formula_answer');
    expect(formulaLeak(c2a, '2a/s6', '\\binom{4}{2}', 0)).toBeNull();
  });

  it('a general formula is method_early until the hint that states the method (2.a/s6: hint 2)', () => {
    expect(formulaLeak(c2a, '2a/s6', '\\binom{n}{2}', 0)).toBe('method_early');
    expect(formulaLeak(c2a, '2a/s6', 'n(n-1)/2', 1)).toBe('method_early');
    expect(formulaLeak(c2a, '2a/s6', '\\binom{n}{2}', 2)).toBeNull();
    expect(formulaLeak(c2a, '2a/s6', 'شوف الكور', 0)).toBeNull();
  });

  it('only on counting steps', () => {
    expect(formulaLeak(c1b, '1b/s8', '\\binom{5}{2}', 0)).toBeNull();
  });
});

