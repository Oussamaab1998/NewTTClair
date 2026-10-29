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
  /**
   * probability2 components: what they put on screen by construction, in
   * plain words (the machine rule is `reveals` in the registry). An empty
   * list says the component reveals nothing.
   */
  reveals?: readonly string[];
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
  GroupBoxes: {
    whenToUse:
      'Dividing an ordered count by the wrong number (720 / 3 instead of 720 / 6): ordered draws grouped in boxes, one box per set of balls, each holding its orderings; opened one at a time.',
    studentAction: 'Opens a box (or a slice) and reads how many orderings it holds.',
    propsNote:
      'Use a small twin urn (4 to 6 balls, k = 3 or 4), never the exercise urn when its count is the step answer. k = 2 is refused (k = k!).',
    reveals: [
      'the number of boxes when they are all listed',
      'boxes, orderings per box and ordered draws, written after the first box is opened',
      'the size of each slice in slice mode',
    ],
  },
  ChoiceProduct: {
    whenToUse:
      'Adding instead of multiplying (4 + 15 for 4 x 15), or reading C(6,2) as 6 x 2: two stages of choice shown as rows x columns (AND) or end to end (OR); a stage that picks 2 of n lists its pairs.',
    studentAction: 'Picks one option in each stage and sees the cell they make.',
    propsNote:
      'Two stages. Use a twin whose count is not the step answer. Two stages of 2 options are refused (2 + 2 = 2 x 2).',
    reveals: [
      'the number of options of each stage (they are listed)',
      'the product and the sum, written after both picks',
    ],
  },
  SlotsPattern: {
    whenToUse:
      'C(n,k) read as a product, or a list of choices with items missing: the student marks k of n slots, adds the pattern to a list and is told when one repeats; bridge mode draws the same slots over n labelled balls and flips chosen / left.',
    studentAction:
      'Marks slots, adds patterns, presses "that is all"; asks for help (three levels) when the list is short.',
    propsNote:
      'Use a twin: n 4 to 7, 1 <= k <= n - 1. k = 2 is refused unless meantToDistinguish is false (C(5,2) = 5 x 2, C(4,2) = 4 + 2). Never use the exercise urn when its C(n,k) is the step answer.',
    reveals: [
      'n, k and n - k (the slots and the marks to place)',
      'the number of patterns C(n,k), written after the student confirms a complete list of their own (or reaches the end of the ladder)',
      'build_pascal: each count of the Pascal row, once its list is confirmed',
    ],
  },
  PartWholeBar: {
    whenToUse:
      'A probability or a part written above 1 ("12 of 6", 120 / 60 = 2), or 1/6 of a quantity not understood: a bar from 0 to the whole where the value is placed; past the whole it is flagged.',
    studentAction:
      'Drags a stepped handle to place a value (place, fraction_of_quantity); feedback mode only shows the value the student wrote.',
    propsNote:
      'feedback needs the part and the whole and nothing else (no right value). fraction_of_quantity: the quantity is a whole number from 2 to 120 and the fraction must land on a tick.',
    reveals: [
      'the whole (written at the end of the bar)',
      'feedback mode: the value the student wrote and its ratio to the whole, nothing about the right value',
      'fraction_of_quantity: the fraction of the quantity (1/6 of 36 = 6), written after a value is placed',
    ],
  },
  SpreadSlider: {
    whenToUse:
      'Variance not understood ("distance from the mean"): a Bernoulli slider (or laws with the same mean) shows the distance of each value, its square at one fixed scale, its contribution p x distance squared, and a stacked bar; the total is written only after enough distinct positions.',
    studentAction:
      'Moves a stepped handle (or picks a scenario, or steps through the values); answers an optional checkpoint (which p gives the larger spread, which formula is 0 at p = 0 and p = 1 and largest at 1/2).',
    propsNote:
      'Write totalLockedUntil explicitly. Checkpoints are for the Bernoulli family: p and 1 - p tie, so a larger_spread question lists one of them; exactly one expression must have the property.',
    reveals: [
      'p, the mean, and the distance, square and contribution of each value at the starting position',
      'the total spread (variance) at each position, written after the student visited enough distinct positions',
    ],
  },
  RepeatedRuns: {
    whenToUse:
      '36 / (1/6) read as 36 x 6, or "average per round" not understood: N runs as N cells; a fraction of the runs shaded, a second stage inside the first (36, 6, 1), or the tally of a law (runs x value, the total S, S / N = E(X)).',
    studentAction:
      'Shades the cells and confirms (fraction_of_total, N <= 36), or presses "next" to light the next stage or read the next line of the tally.',
    propsNote:
      'N and every stage must give whole numbers of runs (N = 36, p = 1/5 is refused). Use a twin whose counts are not the step answer.',
    reveals: [
      'N (one cell per run)',
      'the count of runs at each stage (6, then 1), written after a confirmed shading or a step',
      'tally: the runs of each value from the start; the total S and the average S / N after the steps',
    ],
  },
  VariableTable: {
    whenToUse:
      'The law of a variable on patterns of S and F (or the draws of a small urn): missing outcomes, a sum that is not 1, a law that is not symmetric, or the right number of outcomes with the wrong values (1, 8, 4, 2, 1).',
    studentAction:
      'Chooses a value, taps the outcomes that give it, and presses the checks (all used, sum, symmetric, the law); nothing runs by itself.',
    propsNote:
      'Trials: 2 to 5; an urn of at most 48 draws. The symmetry check only for a symmetric law (uniform trials, p = 1/2, or an urn with as many reds as blacks).',
    reveals: [
      'the outcomes (one row each)',
      'the number of outcomes of each value and its probability: the table is the student\'s own and equals the true law only once they are right',
    ],
  },
  BinomialExplorer: {
    whenToUse:
      'The binomial law not seen: bars of P(X = k) for the n and p on two controls, a tap (or a stepper from 6 trials) writes C(n,k) p^k q^(n-k) with the real numbers, and the mean and variance as the terms np and npq.',
    studentAction:
      'Moves n and p, looks at two or more bars, switches the mean and the variance on.',
    propsNote:
      'n at most 15 and every (n, p) of the grid must be exact (the loader proves it: tenths up to 15, 1/6 up to 20). Never ask for a variance as a sum of the terms.',
    reveals: [
      'the term and its value of a bar, once it is tapped',
      'np and npq, once switched on',
      'the general formula, after two distinct bars',
    ],
  },
  EventAreaModel: {
    whenToUse:
      'The complement trap (1 - P(A) is 1/2 but P(B) is 1/6), or an intersection, a union, a conditional not seen: a sample space as one bar whose slices follow their counts (the 4R6N urn by the number of reds: 20, 60, 36, 4 of 120), events as sets of slices, and four views of them.',
    studentAction:
      'Picks one or two events, then a view (complement, intersection, union, conditional) and reads the engine lines.',
    propsNote:
      'An urn of at most 12 balls (the slices are the draws by number of reds), or authored slices (at most 8). Intersection and union need two events; every event needs at least one draw.',
    reveals: [
      'the count and the probability of each slice and the total, on the bar from the start',
      'the count and probability of a complement, an intersection, a union or a conditional, written after the view is switched on',
    ],
  },
  UrnTemplate: {
    whenToUse:
      'After a student was shown an answer: a worked example of the same method on a fresh urn (exactly j reds among k drawn, or P(X = j) of n trials), seeded and checked by the engine, never giving the answer of the parent step nor one of its known wrong values.',
    studentAction: 'Reads the example and asks for another one.',
    propsNote:
      'Give `parent` the answer and the known wrong values of the step it is for, so the examples avoid them.',
    reveals: [
      'the urn, the draw, the engine solution lines and the answer of the example (a different urn from the step)',
    ],
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
