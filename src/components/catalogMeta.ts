/**
 * Prompt-side descriptions of registered components (AI tutor v2): when a
 * tutor would use each one and what the student does with it. English, for
 * the model only (never shown to students, so not i18n). Sources:
 * docs/COMPONENT_CATALOG.md, COMPONENTS_PROBABILITY.md, COMPONENTS_ANALYSIS.md.
 * A test keeps this in step with the registry (one entry per registered
 * component, none for unregistered names).
 */
import type { ComponentName } from './contract';

export interface CatalogMeta {
  whenToUse: string;
  studentAction: string;
  /** How to fill the props the model gets wrong (simulation 2026-10-22). */
  propsNote?: string;
}

/** Rich text inside props ("insight", "label"): the RTL rule, said once per component. */
const RICH_PROP_NOTE =
  'Arabic runs in Arabic script only; a letter, a number or a formula is its own "fr" run; no LaTeX.';

export const CATALOG_META: Partial<Record<ComponentName, CatalogMeta>> = {
  Urn: {
    whenToUse:
      'The student is unsure what is drawn or what one outcome is: show the balls with their values (duplicates marked).',
    studentAction: 'Taps balls to select a draw.',
    propsNote: `For drawing balls only (probability), never for functions. insight: ${RICH_PROP_NOTE}`,
  },
  OutcomeSpace: {
    whenToUse:
      'Counting outcomes or listing the values of X is wrong (ordered vs unordered pairs, a missed pair, values of the balls instead of products): show every outcome, optionally coloured by value or by an event.',
    studentAction: 'Scans and taps outcomes; reads the count.',
    propsNote: `Set showCount false when the count is what the student must find. colorBy "value" needs valueFn; colorBy "event" needs event. insight: ${RICH_PROP_NOTE}`,
  },
  EventPicker: {
    whenToUse:
      'Graded task: the student picks the outcomes of an event. Lesson path only.',
    studentAction: 'Taps every favourable outcome.',
  },
  ComplementView: {
    whenToUse:
      '"au moins un" or a complement is confused: show P(E) and P(not E) as one split bar with 1 - P on its own line.',
    studentAction: 'Toggles between the event and its complement.',
  },
  LawBuilder: {
    whenToUse: 'Graded task: the student fills the law of X. Lesson path only.',
    studentAction: 'Fills probability cells.',
  },
  LawChart: {
    whenToUse:
      'After the law is known: see it as bars, check the sum is 1, then E(X), E(X²), V(X) step by step.',
    studentAction: 'Reveals each step.',
  },
  FunctionPlot: {
    whenToUse:
      'A picture of the curve helps (shape, symmetry, behaviour at infinity) before any computation.',
    studentAction: 'Looks, then answers the next question.',
    propsNote:
      'fn is a function id from the exercise (never a formula); domain inside where fn is defined. No markers.',
  },
  PointOnCurve: {
    whenToUse:
      'Parity is not seen: compare f(x) and f(-x) live for chosen x values, optionally against a non-even function.',
    studentAction: 'Drags x and compares the two values.',
  },
  FoldSymmetry: {
    whenToUse:
      'Parity as a picture: fold the left half of the curve over the y-axis and see whether it matches.',
    studentAction: 'Drags the fold slider.',
  },
  LimitExplorer: {
    whenToUse:
      'A limit at infinity is wrong (value at 0 used instead, sign of e^-x, forme indéterminée): show numerator, denominator and f(x) as x grows.',
    studentAction: 'Drags x towards infinity and reads the values.',
  },
  SecantToTangent: {
    whenToUse:
      "The meaning of f' is unclear: a secant whose second point slides to the first.",
    studentAction: 'Steps h down and compares slopes.',
  },
  TangentSlope: {
    whenToUse:
      "Link the sign of f' to increasing / decreasing: a tangent with its slope as x moves.",
    studentAction: 'Drags x and watches the slope sign.',
  },
  VariationTableBuilder: {
    whenToUse: 'Graded task: build the tableau de variation. Lesson path only.',
    studentAction: 'Chooses signs and arrows.',
  },
  PredictReveal: {
    whenToUse:
      'Ask before telling: the student predicts first, then the inner component reveals the answer. Wraps one other component.',
    studentAction: 'Makes a prediction (or taps "show me"), then explores.',
  },
  CompareTwo: {
    whenToUse:
      'Two cases side by side (even vs not even, ordered vs unordered): the difference is the lesson. Wraps two components.',
    studentAction: 'Explores both sides and compares.',
  },
  ExampleGenerator: {
    whenToUse:
      'Another example of the same rule, generated and checked by the engine (quotient rule, parity).',
    studentAction: 'Asks for a new example and tries it.',
  },
  NumericTwin: {
    whenToUse:
      'First choice for an unknown algebra error: replace the symbol with numbers and let the student test the rule (numeric twin before abstract explanation).',
    studentAction: 'Picks numbers and compares both sides.',
    propsNote: `symbol: one lowercase letter, not e or i. template and compare: expressions in that letter only, written as on a calculator: digits, + - * / ^ ( ) and the letter, e.g. "a^2*a^3" or "1/a"; never LaTeX (no backslash, no braces), never words or sentences. values: 1 to 6 numbers where both expressions are defined. label: ${RICH_PROP_NOTE}`,
  },
  StepThrough: {
    whenToUse:
      'A computation in small steps with the reason for each; use after other forms did not help.',
    studentAction: 'Reveals one step at a time.',
  },
};
