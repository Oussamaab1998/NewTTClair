/**
 * A small authored exercise with one `method` block, for the tests of the
 * method lesson (not lesson content). Arabic is a placeholder of the same
 * kind as the real content: `reviewed: false` everywhere.
 */
const trust = {
  reviewed: false,
  contentVersion: 'fxm-0.1.0',
  source: 'authored',
  status: 'ok',
} as const;

const ar = (text: string) => ({ ar: [{ ar: text }] });
const header = (now: string, why: string, next: string) => ({
  now: ar(now),
  why: ar(why),
  next: ar(next),
});

const balls = [
  ...[1, 2, 3, 4].map(i => ({ id: `r${i}`, value: 1, color: 'red' })),
  ...[1, 2, 3, 4, 5, 6].map(i => ({ id: `n${i}`, value: 0, color: 'black' })),
];

/** Returns a fresh object each call so tests can mutate it. */
export function methodExercise() {
  return {
    id: 'fx-method',
    contentVersion: 'fxm-0.1.0',
    title: { fr: 'Exercice test : urne', ar: [{ ar: 'تمرين الكور' }] },
    number: 2,
    subject: 'probability',
    statement: {
      fr: 'Une urne contient quatre boules rouges et six boules noires. Une épreuve consiste à tirer simultanément trois boules de l’urne.',
    },
    reviewed: false,
    experiment: { urn: balls, draw: 'simultaneous', k: 3 },
    results: [{ id: 'p_A', statement: { math: 'P(A) = \\frac{1}{2}' } }],
    deepDives: [],
    variants: [],
    parts: [
      {
        id: '1',
        goal: { fr: 'Montrer que P(A) = 1/2' },
        expected: 'p_A',
        uses: [],
        groups: [
          {
            id: 'count',
            steps: [
              {
                id: 's1',
                blockId: 'fx-s1',
                trust,
                skills: [],
                kind: 'text',
                text: ar('نجبدو ثلاثة كور مع بعضهم.'),
              },
              {
                id: 'm1',
                blockId: 'fx-m1',
                trust,
                skills: ['combinations-count', 'probability-by-counting'],
                kind: 'method',
                opening: {
                  route: [
                    ar('نبداو بخطة: نرتّبو الخطوات قبل ما نحسبو.'),
                    ar('بعد نعدّو ونكتبو الحساب سطر بسطر.'),
                    ar('بعد نتأكّدو من النتيجة.'),
                    ar('في الآخر نكتبوها في الورقة.'),
                    ar('وبعدها نحلّو سؤال شبيه وحدنا.'),
                  ],
                  help: ar(
                    'كان ما تعرفش، اضغط على «ما نعرفش» وتشوف مثال أصغر.',
                  ),
                },
                plan: {
                  short: ar('الخطة'),
                  header: header(
                    'نرتّبو الخطوات',
                    'باش نعرفو شنوّة نعملو قبل',
                    'نقراو النص',
                  ),
                  prompt: ar('رتّب الخطوات: شنوّة نعمل الأول، وشنوّة بعد؟'),
                  hints: [
                    ar('فكّر: شنوّة النتيجة اللي تحتاجها خطوة باش تتعمل؟'),
                    ar('الخطوة اللي تقسم تلزمها نتيجتين قبلها.'),
                    ar('ابدا بالعدّ، وخلّي القسمة للآخر.'),
                  ],
                  cards: [
                    {
                      id: 'c_total',
                      key: 'total',
                      short: ar('الكل'),
                      text: ar('نعدّو كل التيراجات الممكنة'),
                      header: header(
                        'نعدّو كل التيراجات الممكنة',
                        'باش نعرفو الكلّ اللي نقيسو عليه',
                        'نعدّو التيراجات المطلوبة',
                      ),
                      needs: [],
                      prompt: ar('اكتب الحساب سطر بسطر: عدد التيراجات الكل.'),
                      hints: [
                        ar('اقرا النص من جديد: كيفاش نجبدو الكور؟'),
                        ar(
                          'عدّ بالترتيب أول، وبعد شوف قدّاش مرّة تعاود نفس المجموعة.',
                        ),
                        ar(
                          'الجداء متاع ثلاثة كور على عدد الترتيبات متاع ثلاثة كور.',
                        ),
                      ],
                      procedures: [
                        {
                          id: 'with_replacement',
                          misconceptionId: 'draws_with_replacement',
                          reviewed: false,
                        },
                        {
                          id: 'all_balls',
                          misconceptionId: 'counts_balls_not_draws',
                          reviewed: false,
                        },
                      ],
                    },
                    {
                      id: 'c_fav',
                      key: 'fav',
                      short: ar('المطلوب'),
                      text: ar('نعدّو التيراجات المطلوبة'),
                      header: header(
                        'نعدّو التيراجات المطلوبة',
                        'هذا اللي نقسموه على الكل',
                        'نقسمو',
                      ),
                      needs: [],
                      prompt: ar(
                        'اكتب الحساب سطر بسطر: عدد التيراجات المطلوبة.',
                      ),
                      hints: [],
                    },
                    {
                      id: 'c_ratio',
                      key: 'ratio',
                      short: ar('القسمة'),
                      text: ar('نقسمو المطلوب على الكل'),
                      header: header(
                        'نقسمو المطلوب على الكل',
                        'القسمة تحتاج الرقمين',
                        'نكتبو في الورقة',
                      ),
                      needs: ['c_total', 'c_fav'],
                      prompt: ar('اكتب القسمة.'),
                      hints: [],
                    },
                  ],
                },
                read: {
                  short: ar('القراءة'),
                  header: header('نقراو النص', 'الترتيب يبدّل الحساب', 'نعدّو'),
                  prompt: ar(
                    'اضغط على الكلمة اللي تقول واش الترتيب يهمّ ولا لا.',
                  ),
                  hints: [
                    ar('شوف كيفاش نجبدو الكور.'),
                    ar(
                      'كلمة وحدة تقول لنا نجبدو الكور مع بعضهم ولا وحدة بوحدة.',
                    ),
                    { ar: [{ ar: 'اضغط على' }, { fr: 'simultanément' }] },
                  ],
                  targets: [
                    {
                      token: 'simultanément',
                      effect: { order: 'unordered', replacement: false },
                    },
                  ],
                  notOrderWord: ar(
                    'هذي الكلمة ما تقولش واش الترتيب يهمّ. اقرا النص من جديد.',
                  ),
                },
                paper: {
                  short: ar('الورقة'),
                  header: header(
                    'نكتبو الجواب في الورقة',
                    'الامتحان يطلب الكتابة بالتفصيل',
                    'نحلّو سؤال شبيه',
                  ),
                },
                graph: { template: 'urn_exactly_j', args: { j: 1 } },
                builtFrames: ['c_total'],
              },
            ],
          },
        ],
        writeup: {
          elements: [
            'count_total',
            'count_favourable',
            'equiprobable',
            'conclusion',
          ],
          modelFr: [
            'On tire simultanément 3 boules parmi 10.',
            'A est réalisé par 1 rouge parmi 4 et 2 noires parmi 6.',
            'Les tirages sont équiprobables.',
            'Donc P(A) = 1/2.',
          ],
        },
      },
    ],
  };
}
