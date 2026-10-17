/**
 * Test content for BidiTestScreen. Each sentence targets a known bidi failure.
 * Arabic is a draft (reviewed: false). Math values here are display fixtures,
 * not lesson facts; lesson values must come from src/engine.
 */
import type { ArRuns } from '../../lesson/rich/runs';

export interface SentenceFixture {
  id: string;
  /** What to look for on the device. */
  checks: string;
  runs: ArRuns;
  reviewed: false;
}

export const SENTENCES: SentenceFixture[] = [
  {
    id: 'S1',
    checks: 'French term in the middle, attached to the Arabic article الـ',
    runs: [
      { ar: 'باش نلقاو الـ' },
      { fr: 'domaine' },
      { ar: ' متاع الدالة، نشوفو وين المقام ما يساويش صفر.' },
    ],
    reviewed: false,
  },
  {
    id: 'S2',
    checks:
      'Paragraph STARTS with a French term: must still be right-aligned RTL',
    runs: [{ fr: 'limite' }, { ar: ' معناها القيمة اللي تقرب ليها الدالة.' }],
    reviewed: false,
  },
  {
    id: 'S3',
    checks: 'French term inside parentheses: parentheses must not flip',
    runs: [
      { ar: 'نجبدو زوز كورات في نفس الوقت (' },
      { fr: 'simultané' },
      { ar: ')، يعني الترتيب ما يهمّش.' },
    ],
    reviewed: false,
  },
  {
    id: 'S4',
    checks:
      'Multi-word French term at the END, then ؟: words keep their order, ؟ stays at the left end',
    runs: [{ ar: 'شنوّة معناها ' }, { fr: 'au moins un' }, { ar: '؟' }],
    reviewed: false,
  },
  {
    id: 'S5',
    checks:
      'Long paragraph with two French terms: line wrapping keeps each term whole and in order',
    runs: [
      { ar: 'في الامتحان، كي ما تنجمش تثبت نتيجة، تنجم تعتبرها ' },
      { fr: 'résultat acquis' },
      { ar: ' وتكمّل، أما لازم تكتب الـ' },
      { fr: 'tableau de variation' },
      { ar: ' كامل باش تاخو العدد الكل.' },
    ],
    reviewed: false,
  },
];

export const MATH_SAMPLES: string[] = [
  'P(B) = 1 - P(\\bar{B}) = 1 - \\frac{3}{10} = \\frac{7}{10}',
  '\\binom{5}{2} = 10',
  'V(X) = E(X^2) - E(X)^2 = \\frac{89}{100}',
  'f(x) = \\frac{e^{x}}{1 + e^{2x}}',
  '\\lim_{x \\to +\\infty} f(x) = 0',
  "f'(x) = \\frac{(1 - e^{2x})e^{x}}{(1 + e^{2x})^2}",
  'P(Y = 1) = n \\cdot \\frac{7}{10} \\cdot \\left(\\frac{3}{10}\\right)^{n-1}',
  'F(x) = \\int_0^{\\ln x} f(t)\\,dt',
];

/** A realistic slice of the lesson feed: tutor text, formula on its own line, question. */
export const FEED_SAMPLE = {
  intro: [
    { ar: 'الحدث هذا معناه ' },
    { fr: 'au moins un' },
    { ar: ' كورة فيها صفر. أسهل طريق: نحسبو العكس.' },
  ] satisfies ArRuns,
  formula: 'P(B) = 1 - P(\\bar{B})',
  question: [{ ar: 'قدّاش عدد الأزواج اللي ما فيهمش صفر؟' }] satisfies ArRuns,
  questionMath: 'P(\\bar{B}) = \\text{?}',
};
