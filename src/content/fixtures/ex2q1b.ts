/**
 * Minimal Exercise 2, question 1.b, for schema tests (not lesson content).
 * French only on purpose; Arabic lesson text needs teacher review.
 */
const trust = {
  reviewed: false,
  contentVersion: 'ex2-0.1.0',
  source: 'authored',
  status: 'ok',
} as const;

const balls = [
  { id: 'a', value: -1 },
  { id: 'b', value: 0 },
  { id: 'c', value: 0 },
  { id: 'd', value: 1 },
  { id: 'e', value: 2 },
];

/** Returns a fresh object each call so tests can mutate it. */
export function ex2q1b() {
  return {
    id: 'bac2022c-ex2',
    contentVersion: 'ex2-0.1.0',
    title: {
      fr: 'Exercice 2 : probabilités',
      ar: [{ ar: 'تمرين الاحتمالات' }],
    },
    statement: {
      fr: 'Une urne contient cinq boules numérotées -1, 0, 0, 1, 2.',
    },
    reviewed: false,
    results: [
      { id: 'p_A_1_10', statement: { math: 'p(A) = \\frac{1}{10}' } },
      { id: 'p_B_7_10', statement: { math: 'p(B) = \\frac{7}{10}' } },
    ],
    deepDives: [
      {
        id: 'compl',
        blockId: 'dd-compl',
        trust,
        blocks: [
          {
            type: 'tutor_text',
            blockId: 'dd-compl-1',
            trust,
            text: { fr: '« Au moins un 0 » : on compte le contraire.' },
          },
          {
            type: 'math',
            blockId: 'dd-compl-2',
            trust,
            latex: 'p(B) = 1 - p(\\bar{B})',
          },
        ],
      },
    ],
    parts: [
      {
        id: '1b',
        goal: { fr: 'Montrer que p(B) = 7/10' },
        expected: 'p_B_7_10',
        uses: ['p_A_1_10'],
        groups: [
          {
            id: 'g1',
            steps: [
              {
                id: 's1',
                blockId: 'q1b-s1',
                trust,
                skills: ['sample-space'],
                kind: 'component',
                component: {
                  component: 'OutcomeSpace',
                  props: {
                    balls,
                    draw: 'simultaneous',
                    k: 2,
                    colorBy: 'none',
                    layout: 'grid',
                    showCount: true,
                  },
                },
              },
              {
                id: 's2',
                blockId: 'q1b-s2',
                trust,
                skills: ['complement'],
                kind: 'choice',
                prompt: { fr: 'Combien de tirages ne contiennent aucun 0 ?' },
                options: [
                  { id: 'three', label: { math: '3' } },
                  {
                    id: 'six',
                    label: { math: '6' },
                    misconceptionId: 'complement_ordered',
                  },
                ],
                answer: { type: 'option', id: 'three' },
                hints: [{ fr: 'Il reste les boules -1, 1, 2.' }],
                deepDiveId: 'compl',
              },
              {
                id: 's3',
                blockId: 'q1b-s3',
                trust,
                skills: ['complement'],
                kind: 'typed',
                prompt: { math: 'p(B) = ?' },
                answer: {
                  type: 'fraction',
                  compute: {
                    fn: 'probability',
                    args: { event: { id: 'any_value', args: { value: 0 } } },
                  },
                },
              },
            ],
          },
        ],
        writeup: {
          elements: ['complement', 'count_3', 'conclusion'],
          modelFr: ['p(B) = 1 - 3/10 = 7/10.'],
        },
      },
    ],
  };
}
