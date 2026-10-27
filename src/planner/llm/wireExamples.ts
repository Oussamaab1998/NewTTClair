/**
 * One correct planner answer per action kind (AI interface fixes,
 * 2026-10-22), in the wire format, shown in the cached system prompt after
 * the simulation found invented props, the question written as a clarify
 * option, LaTeX in text runs and English words. Each example passes the wire
 * format and content validation (wireExamples.test.ts). Ids are Exercise 2
 * illustrations; the model uses the ids of its own static.menu.
 * Arabic: test-quality Tunisian, NOT reviewed by a teacher (reviewed: false).
 */
import type { PlannerWire } from './wireFormat';

export const WIRE_EXAMPLES_REVIEWED = false;

const dx = (description: string, misconceptionId = '') => ({
  misconceptionId,
  description,
  confidence: 0.6,
});
const ar = (text: string) => ({ lang: 'ar' as const, text });
const fr = (text: string) => ({ lang: 'fr' as const, text });
const text = (...runs: { lang: 'ar' | 'fr'; text: string }[]) => ({
  type: 'text' as const,
  runs,
  latex: '',
});
const math = (latex: string) => ({
  type: 'math' as const,
  runs: [],
  latex,
});

export const WIRE_EXAMPLES: PlannerWire[] = [
  {
    diagnosis: dx('Adds exponents wrongly when multiplying powers.'),
    why: 'Unknown algebra error: let the student test the rule with numbers first.',
    action: 'show_component',
    target: 'NumericTwin',
    propsJson: JSON.stringify({
      symbol: 'a',
      template: 'a^2*a^3',
      compare: 'a^6',
      values: [1, 2, 3],
    }),
    blocks: [text(ar('جرّب بأعداد صغار وقارن الجهتين.'))],
  },
  {
    diagnosis: dx('Counts the draws with a zero instead of those without.'),
    why: 'Let the student see the draws of the event without showing the count.',
    action: 'show_component',
    target: 'OutcomeSpace',
    propsJson: JSON.stringify({
      colorBy: 'event',
      event: { id: 'any_value', args: { value: 0 } },
      showCount: false,
      insight: {
        ar: [{ ar: 'التيراجات الملوّنة فيهم ' }, { fr: '0' }],
      },
    }),
    blocks: [text(ar('اضغط على كل تيراج ما فيهوش صفر.'))],
  },
  {
    diagnosis: dx('Unsure what one draw is.', 'counts_balls_not_pairs'),
    why: 'Make one draw concrete: the student picks two balls together.',
    action: 'show_component',
    target: 'Urn',
    propsJson: JSON.stringify({
      mode: 'select',
      insight: { ar: [{ ar: 'زوز كور مع بعض هوما تيراج واحد.' }] },
    }),
    blocks: [text(ar('اختار زوز كور مع بعض.'))],
  },
  {
    diagnosis: dx('Treats {a; b} and {b; a} as two draws.', 'counts_ordered_pairs'),
    why: 'One idea, then the student acts on the card again.',
    action: 'explain',
    target: '',
    propsJson: '',
    blocks: [
      text(ar('في تيراج '), fr('simultané'), ar(' الترتيب ما يهمّش.')),
      math('\\{a ; b\\} = \\{b ; a\\}'),
    ],
  },
  {
    diagnosis: dx('Lost on the full count; a smaller case first.'),
    why: 'An authored smaller example before the real question.',
    action: 'example',
    target: 'sim-pairs-1',
    propsJson: '',
    blocks: [text(ar('نجرّبو على مثال أصغر.'))],
  },
  {
    diagnosis: dx('Needs the next hint.'),
    why: 'The next level of the ladder only.',
    action: 'hint',
    target: '1',
    propsJson: '',
    blocks: [],
  },
  {
    diagnosis: dx('Cause unclear.'),
    why: 'The card asks what is unclear; 2 or 3 short answers the student can tap.',
    action: 'ask_clarify',
    target: '',
    propsJson: '',
    blocks: [
      text(ar('ما فهمتش شنوّة نعدّو.')),
      text(ar('ما فهمتش علاش الترتيب ما يهمّش.')),
      text(ar('نحب مثال أصغر.')),
    ],
  },
  {
    diagnosis: dx('Does not see that a draw is a pair.'),
    why: 'The authored deep dive on listing pairs.',
    action: 'deep_dive',
    target: 'pairs_listing',
    propsJson: '',
    blocks: [],
  },
  {
    diagnosis: dx('Text did not help; a different form.'),
    why: 'The authored alternative: tap the draws.',
    action: 'variant',
    target: 'alt-1b-s5-pick',
    propsJson: '',
    blocks: [],
  },
  {
    diagnosis: dx('Missing the idea of a simultaneous draw.'),
    why: 'One level down: the prerequisite skill.',
    action: 'revisit_prerequisite',
    target: 'simultaneous-draw',
    propsJson: '',
    blocks: [],
  },
  {
    diagnosis: dx('The authored feedback on screen is enough.'),
    why: 'Nothing to add; let the student try again.',
    action: 'continue',
    target: '',
    propsJson: '',
    blocks: [],
  },
];
