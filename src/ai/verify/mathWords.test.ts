/**
 * Words in a math block (the AI wrote "3 people in A∩F" in one, 2026-11-18):
 * refused; symbols, labels and function names stay allowed.
 */
import { buildGraphFor } from '../../method/templates';
import { mutationsFor } from '../../method/mutations';
import type { QuestionPack } from '../packs/build';
import { newSession } from '../session/state';
import type { AskStudent } from '../tools/schemas';
import { verifyAsk, wordsInMath } from './message';

describe('wordsInMath', () => {
  it.each([
    ['3 people in A \\cap F', ['people', 'in']],
    ['3 \\text{ people in } A \\cap F', ['people', 'in']],
    ['x = 1 \\text{ ou } x = 2', ['ou']],
    ['P(A) \\text{ et } P(B)', ['et']],
    ['total = 25', ['total']],
    ['\\text{students} = 25', ['students']],
  ])('refuses the words of %s', (latex, words) => {
    expect(wordsInMath(latex)).toEqual(words);
  });

  it.each([
    'p(A \\cap F) = \\frac{1}{6}',
    'p(F/\\overline{A})',
    'f(x) = \\ln x + e^{x}',
    '\\lim_{x \\to +\\infty} f(x) = 0',
    'ln x',
    'lim f',
    'sinx',
    'C_{10}^{3} = 120',
    '\\binom{10}{3}',
    '\\operatorname{card}(\\Omega) = 120',
    'ab = ba',
    'R1 N2',
    'AB = AC',
    'ABCD',
    'RRN',
    'abcd',
    'p_A(B) = \\frac{1}{2}',
    'xA + yB',
    'E(X) = 2',
    '\\mathbb{R}',
  ])('allows %s', latex => {
    expect(wordsInMath(latex)).toEqual([]);
  });
});

describe('verifyAsk and words in a math block', () => {
  const graph = buildGraphFor(
    { template: 'urn_exactly_j', args: { j: 1 } },
    { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
  );
  const main = { id: 'main', graph, table: mutationsFor(graph), extra: [] };
  const pack: QuestionPack = {
    questionId: '1',
    label: '1',
    wording: '',
    main,
    plan: [],
    read: [],
    recipe: null,
    notes: null,
    given: ['3', '4', '6', '10'],
  };
  const say = (latex: string): AskStudent => ({
    message: [{ type: 'math', latex }],
    input: { kind: 'free' },
    intent: 'other',
  });
  const c = () => ({
    rt: newSession('bac2022c-sc-ex2', '1', main, pack.given),
    pack,
    experiment: null,
  });

  it('refuses "3 people in A∩F", and keeps a formula', () => {
    const r = verifyAsk(say('3 \\text{ people in } A \\cap F'), c());
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.reasons.join()).toContain('words in a math block');
    expect(verifyAsk(say('p(A \\cap B)'), c()).ok).toBe(true);
  });
});
