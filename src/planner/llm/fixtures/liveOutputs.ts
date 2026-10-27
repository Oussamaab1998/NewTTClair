/**
 * Real model outputs kept as test data (Arabic: test data only, reviewed: false).
 */

/**
 * The tutor answer of the first live Anthropic run (2026-10-22, 1.b s3),
 * exactly as returned: the optional "fr" and "math" fields filled with "".
 */
export const LIVE_TUTOR_OUTPUT = {
  blocks: [
    {
      type: 'text',
      text: {
        ar: [
          { ar: 'توّا نحكيو على الحدث العكسي. ' },
          { fr: 'au moins un' },
          { ar: ' معناها أنّ ' },
          { ar: 'الحدث العكسي يعني ' },
          { fr: 'aucune' },
          { ar: ' من الكرات اللي تنسحب ما تحملش ' },
          { fr: '0' },
          { ar: '.' },
        ],
        fr: '',
        math: '',
      },
    },
    {
      type: 'text',
      text: {
        ar: [
          { ar: 'فكّر: ' },
          { ar: 'إذا كان الحدث B هو «على الأقل واحدة فيها 0»، ' },
          { ar: 'فالعكس هو «ما فماش ولا وحدة فيها 0»، يعني ' },
          { ar: 'الاثنين اللي تنسحبوا كل وحدة فيهم ما تحملش 0.' },
        ],
        fr: '',
        math: '',
      },
    },
    {
      type: 'text',
      text: {
        ar: [
          { ar: 'جرّب تعدّ شحال من سحبة فيها ' },
          { fr: 'deux boules' },
          { ar: ' ما فماش ' },
          { fr: '0' },
          { ar: '، و' },
          { ar: 'انظر للكرات اللي باقيين في الكيس.' },
        ],
        fr: '',
        math: '',
      },
    },
    {
      type: 'math',
      latex: '\\overline{B} : \\text{aucune boule portant le numéro } 0',
    },
  ],
  needsTeacher: false,
};
