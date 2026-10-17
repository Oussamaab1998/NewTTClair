import {
  ArRunsSchema,
  BIDI,
  findRunIssues,
  toPlainText,
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

  it('unicode: RLM first, French wrapped in LRI…PDI, single segment', () => {
    const segments = toSegments(sentence, 'unicode');
    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe(
      `${BIDI.RLM}باش نلقاو الـ${BIDI.LRI}domaine${BIDI.PDI} متاع الدالة.`,
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
      { text: `${BIDI.LRI}domaine${BIDI.PDI}`, ltr: true },
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
      `${BIDI.RLM}${BIDI.LRI}au${BIDI.PDI}${BIDI.LRI}moins un${BIDI.PDI}`,
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
