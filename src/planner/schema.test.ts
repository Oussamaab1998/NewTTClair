import { parsePlannerOutput } from './schema';

// The PLANNER.md example, adapted: balls carry ids, the quiz references a verified step.
const example = {
  diagnosis: {
    skillIds: ['event-counting'],
    misconceptionIds: ['p_x0_counts_one_pair'],
    confidence: 0.7,
    summary: "links 'product is 0' to counting pairs: not made",
  },
  avoid: ['text:prod0'],
  next: {
    kind: 'show_component',
    component: {
      component: 'EventPicker',
      props: {
        balls: [
          { id: 'a', value: -1 },
          { id: 'b', value: 0 },
          { id: 'c', value: 0 },
          { id: 'd', value: 1 },
          { id: 'e', value: 2 },
        ],
        draw: 'simultaneous',
        k: 2,
        valueFn: 'product',
        event: { id: 'value_eq', args: { value: 0 } },
        reveal: 'live',
        showFraction: true,
      },
    },
    instruction: { fr: 'Touche toutes les paires dont le produit est 0' },
  },
  followUp: { kind: 'quiz', stepId: 'q6' },
};

describe('parsePlannerOutput', () => {
  it('accepts the PLANNER.md example (object or JSON text)', () => {
    expect(parsePlannerOutput(example)).toMatchObject({ ok: true });
    expect(parsePlannerOutput(JSON.stringify(example))).toMatchObject({
      ok: true,
    });
  });
  it('accepts every action kind', () => {
    const actions = [
      {
        kind: 'explain',
        blocks: [
          { type: 'tutor_text', text: { fr: 'On compte le contraire.' } },
          { type: 'math', latex: '1 - p' },
        ],
      },
      {
        kind: 'example',
        variantId: 'v1',
        blocks: [{ type: 'recap', items: [{ fr: 'a' }] }],
      },
      { kind: 'hint', level: 1 },
      {
        kind: 'ask_clarify',
        options: [{ fr: 'le comptage' }, { fr: 'pourquoi' }, { fr: 'le lien' }],
      },
      { kind: 'revisit_prerequisite', skillId: 'combinations' },
      { kind: 'compress_steps' },
    ];
    for (const next of actions) {
      expect(parsePlannerOutput({ ...example, next })).toMatchObject({
        ok: true,
      });
    }
  });
  it('never throws on garbage', () => {
    expect(parsePlannerOutput('not json')).toEqual({
      ok: false,
      issues: ['not valid JSON'],
    });
    expect(parsePlannerOutput(null)).toMatchObject({ ok: false });
    expect(parsePlannerOutput(42)).toMatchObject({ ok: false });
  });
  it.each([
    ['unknown action', { ...example, next: { kind: 'reveal_answer' } }],
    [
      'unknown component',
      {
        ...example,
        next: {
          ...example.next,
          component: { component: 'Hologram', props: {} },
        },
      },
    ],
    [
      'confidence > 1',
      { ...example, diagnosis: { ...example.diagnosis, confidence: 1.5 } },
    ],
    ['hint level 4', { ...example, next: { kind: 'hint', level: 4 } }],
    [
      'too many clarify options',
      {
        ...example,
        next: {
          kind: 'ask_clarify',
          options: [{ fr: 'a' }, { fr: 'b' }, { fr: 'c' }, { fr: 'd' }],
        },
      },
    ],
    [
      'a quiz carrying its own answer',
      { ...example, next: { kind: 'quiz', stepId: 'q6', answer: '7/10' } },
    ],
    [
      'a question block inside explain',
      {
        ...example,
        next: { kind: 'explain', blocks: [{ type: 'question', question: {} }] },
      },
    ],
    [
      'digits inside an Arabic run',
      {
        ...example,
        next: {
          kind: 'explain',
          blocks: [{ type: 'tutor_text', text: { ar: [{ ar: 'الجواب 7' }] } }],
        },
      },
    ],
    ['extra top-level fields', { ...example, answer: '7/10' }],
  ])('rejects %s', (_name, output) => {
    expect(parsePlannerOutput(output)).toMatchObject({ ok: false });
  });
});
