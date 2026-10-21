import { RichSchema } from '../../content/schema';
import {
  isolateInline,
  ArRunsSchema,
  BIDI,
  findRunIssues,
  toPlainText,
  spaceRunBoundaries,
  toSegments,
  type ArRuns,
} from './runs';

const sentence: ArRuns = [
  { ar: 'باش نلقاو الـ' },
  { fr: 'domaine' },
  { ar: ' متاع الدالة.' },
];
const startsWithFrench: ArRuns = [{ fr: 'limite' }, { ar: ' معناها…' }];

describe('toSegments', () => {
  it('none: one plain segment, no control characters', () => {
    expect(toSegments(sentence, 'none')).toEqual([
      { text: 'باش نلقاو الـdomaine متاع الدالة.', ltr: false },
    ]);
  });

  it('unicode: RLM first, French wrapped in LRI LRM…LRM PDI, single segment', () => {
    const segments = toSegments(sentence, 'unicode');
    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe(
      `${BIDI.RLM}باش نلقاو الـ${BIDI.LRI}${BIDI.LRM}domaine${BIDI.LRM}${BIDI.PDI} متاع الدالة.`,
    );
  });

  it('nested: French is its own LTR segment, no control characters', () => {
    expect(toSegments(sentence, 'nested')).toEqual([
      { text: 'باش نلقاو الـ', ltr: false },
      { text: 'domaine', ltr: true },
      { text: ' متاع الدالة.', ltr: false },
    ]);
  });

  it('both: RLM + isolated French in its own LTR segment', () => {
    expect(toSegments(sentence, 'both')).toEqual([
      { text: `${BIDI.RLM}باش نلقاو الـ`, ltr: false },
      {
        text: `${BIDI.LRI}${BIDI.LRM}domaine${BIDI.LRM}${BIDI.PDI}`,
        ltr: true,
      },
      { text: ' متاع الدالة.', ltr: false },
    ]);
  });

  it('forces RTL paragraph direction even when the first run is French', () => {
    const [first] = toSegments(startsWithFrench, 'both');
    expect(first).toEqual({ text: BIDI.RLM, ltr: false });
  });

  it('keeps adjacent French runs as separate isolates', () => {
    const segments = toSegments([{ fr: 'au' }, { fr: 'moins un' }], 'unicode');
    expect(segments[0]?.text).toBe(
      `${BIDI.RLM}${BIDI.LRI}${BIDI.LRM}au${BIDI.LRM}${BIDI.PDI}${BIDI.LRI}${BIDI.LRM}moins un${BIDI.LRM}${BIDI.PDI}`,
    );
  });
});

describe('toPlainText', () => {
  it('joins runs without control characters', () => {
    expect(toPlainText(sentence)).toBe('باش نلقاو الـdomaine متاع الدالة.');
  });
});

describe('findRunIssues', () => {
  it('accepts a clean sentence', () => {
    expect(findRunIssues(sentence)).toEqual([]);
  });

  it('flags Latin, digits and math symbols inside Arabic runs', () => {
    expect(findRunIssues([{ ar: 'الـ domaine' }])).toEqual([
      { index: 0, problem: 'latin_in_ar_run' },
    ]);
    expect(findRunIssues([{ ar: 'عندنا ١٠ أزواج' }])).toEqual([
      { index: 0, problem: 'digit_in_ar_run' },
    ]);
    expect(findRunIssues([{ ar: 'عندنا 10 أزواج' }])).toEqual([
      { index: 0, problem: 'digit_in_ar_run' },
    ]);
    expect(findRunIssues([{ ar: 'كي ∞' }])).toEqual([
      { index: 0, problem: 'math_symbol_in_ar_run' },
    ]);
  });

  it('flags hand-typed bidi controls', () => {
    expect(findRunIssues([{ fr: `${BIDI.LRI}domaine${BIDI.PDI}` }])).toEqual([
      { index: 0, problem: 'bidi_control_in_text' },
    ]);
  });
});

describe('ArRunsSchema', () => {
  it('rejects empty arrays, unknown keys and runs with two languages', () => {
    expect(ArRunsSchema.safeParse([]).success).toBe(false);
    expect(ArRunsSchema.safeParse([{ en: 'x' }]).success).toBe(false);
    expect(ArRunsSchema.safeParse([{ ar: 'x', fr: 'y' }]).success).toBe(false);
    expect(ArRunsSchema.safeParse(sentence).success).toBe(true);
  });
});

describe('spaceRunBoundaries (LLM text)', () => {
  it('adds the missing space on the Arabic side of each boundary', () => {
    expect(
      spaceRunBoundaries([
        { ar: 'صحيح، كلمة' },
        { fr: 'au moins une' },
        { ar: 'تعني على الأقل وحدة.' },
      ]),
    ).toEqual([
      { ar: 'صحيح، كلمة ' },
      { fr: 'au moins une' },
      { ar: ' تعني على الأقل وحدة.' },
    ]);
  });

  it('leaves existing spaces, punctuation and an attached article alone', () => {
    const runs = [{ ar: 'الحدث ' }, { fr: 'B' }, { ar: '؟' }];
    expect(spaceRunBoundaries(runs)).toEqual(runs);
    expect(spaceRunBoundaries(sentence)).toEqual(sentence);
  });
});

describe('math inside Arabic (A1 sentences)', () => {
  it('the authored A1 sentences pass: every formula is its own LTR run', () => {
    expect(
      findRunIssues([
        { ar: 'والصورة متاع ' },
        { fr: '−x' },
        { ar: ' هي نفس الصورة متاع ' },
        { fr: 'x' },
        { ar: '.' },
      ]),
    ).toEqual([]);
    expect(
      findRunIssues([
        { ar: 'وصلنا لـ ' },
        { fr: 'f(−x) = f(x)' },
        { ar: ' لكل ' },
        { fr: 'x' },
        { ar: ' في ' },
        { fr: 'ℝ' },
        { ar: '. شنوّة نستنتجو؟' },
      ]),
    ).toEqual([]);
  });
  it('the same sentences with the math left inside the Arabic run are refused', () => {
    const problems = (ar: string) =>
      findRunIssues([{ ar }]).map(i => i.problem);
    // Minus sign alone (no Latin letter): "−x" with the x as an Arabic-script letter is still math.
    expect(problems('والصورة متاع −س هي نفس')).toContain(
      'math_symbol_in_ar_run',
    );
    expect(problems('وصلنا لـ f(−x) = f(x)')).toEqual(
      expect.arrayContaining(['latin_in_ar_run', 'math_symbol_in_ar_run']),
    );
    expect(problems('لكل x ∈ ℝ')).toEqual(
      expect.arrayContaining(['latin_in_ar_run', 'math_symbol_in_ar_run']),
    );
    expect(problems('في ℝ')).toEqual(['math_symbol_in_ar_run']);
  });
  it('a French run is bounded by strong LTR marks, so its edge signs stay LTR', () => {
    const [, run] = toSegments([{ ar: 'متاع ' }, { fr: '−x' }], 'both');
    expect(run).toEqual({
      text: `${BIDI.LRI}${BIDI.LRM}−x${BIDI.LRM}${BIDI.PDI}`,
      ltr: true,
    });
  });
  it('the loader refuses an exercise with raw math in an Arabic string', () => {
    const r = RichSchema.safeParse({ ar: [{ ar: 'بما أنّ f(−x) = f(x)' }] });
    expect(r.success).toBe(false);
  });
});

describe('isolateInline (quotes and student text shown as plain strings)', () => {
  const iso = (core: string) =>
    `${BIDI.LRI}${BIDI.LRM}${core}${BIDI.LRM}${BIDI.PDI}`;
  it('isolates the math of an A1 sentence, spaces and the final period outside', () => {
    expect(isolateInline('والصورة متاع −x هي نفس الصورة متاع x.')).toBe(
      `والصورة متاع ${iso('−x')} هي نفس الصورة متاع ${iso('x')}.`,
    );
  });
  it('keeps an equality whole, closing parenthesis included', () => {
    expect(isolateInline('وصلنا لـ f(−x) = f(x) لكل x')).toBe(
      `وصلنا لـ ${iso('f(−x) = f(x)')} لكل ${iso('x')}`,
    );
  });
  it('leaves Arabic-only text unchanged', () => {
    expect(isolateInline('شنوّة نستنتجو؟')).toBe('شنوّة نستنتجو؟');
  });
});
