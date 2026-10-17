# Probability components (Exercise 2 of the 2022 session de contrôle, and similar bac exercises)

Goal: students **act on the picture** (tap outcomes, build the law) so the answer comes from what they did, not from guessing among options. Needs `src/engine/probability.ts`.

## Engine (build first, with tests)
```ts
type Ball = { id: string; value: number };                        // two balls may share a value (0 and 0) but have different ids
type Draw = "simultaneous" | "ordered" | "ordered_with_replacement";
enumerateOutcomes(urn: Ball[], draw: Draw, k: number): Outcome[]   // for [-1,0,0,1,2], k=2, simultaneous -> 10 outcomes
valueFns: product | sum | max | min | identity | count_value(v)
events:   any_value(v) | all_equal | value_eq(fnId, v) | not(event) | and/or
probability(event, outcomes): { num: number; den: number; reduced: [number, number] }
law(valueFn, outcomes): { value: number; outcomes: Outcome[]; p: [num, den] }[]
expectation(law), variance(law)            // exact rationals; also decimals
binomialPmf(n, p, k), smallestN(pTarget...) // for the repeated-experiment part
```
Tests must include the exercise facts: 10 outcomes; P(A)=1/10; P(B)=7/10; X in {-2,-1,0,2}; E(X)=-1/10; V(X)=89/100; Y~B(n,7/10); smallest n with E(Y)>=5 is 8.

## 1. `Urn`
Shows balls (circles with values) and optionally lets the student select balls.
```ts
interface UrnProps { balls: Ball[]; draw: Draw; k: number; mode: "display"|"select"; selected?: string[];
  markDuplicates?: boolean /* subtle mark so two "0" balls are distinguishable */ }
```
Events: `ball_toggled {ballId, selected}`, `selection_complete {ballIds, value?}`.
Teaches: sample space, simultaneous draw. Insight slot: "the pair (a,b) is the same as (b,a)".

## 2. `OutcomeSpace`
All outcomes as chips/grid, colored by a value function.
```ts
interface OutcomeSpaceProps { balls: Ball[]; draw: Draw; k: number; valueFn?: ValueFnId;
  colorBy: "value"|"event"|"none"; event?: EventSpec; layout: "grid"|"list"; showCount: boolean;
  highlight?: string[] /* outcome ids */ }
```
Events: `outcome_tapped {outcomeId}`, `legend_toggled`, `expanded`.
Teaches: counting C(n,k), listing systematically. Replaces the "اعرض كل الأزواج" button from the prototype and should sit next to the counting question.

## 3. `EventPicker` (task)
Student taps all outcomes that satisfy an event; fraction updates live or on submit.
```ts
interface EventPickerProps { balls: Ball[]; draw: Draw; k: number; valueFn?: ValueFnId; event: EventSpec;
  prompt?: Rich; reveal: "live"|"on_submit"; showFraction: boolean; maxAttempts?: number }
```
Result details: `{ selected, correct, missed, extra, fraction: [num, den] }`.
`misconceptionHints` (examples, extend with real data): `misses_duplicate_value_pair` (forgets the pair (0,0')), `selects_complement`, `counts_only_nonzero_pairs`, `selects_all`.
Events: `outcome_selected`, `outcome_deselected`, `submitted {selected, correct}`.
Use for: P(A) (all equal), P(B) ("au moins un 0"), P(X=0), P(X=-2), P(X=2).
Insight example: "X = 0 exactly when at least one ball is 0, so {X = 0} is the event B."

## 4. `ComplementView`
Bar split P(E) vs P(not E), with the identity written on its own line.
```ts
interface ComplementViewProps { event: EventSpec; balls: Ball[]; draw: Draw; k: number; direction: "to_complement"|"from_complement"; interactive?: boolean }
```
Events: `complement_toggled`, `fraction_revealed`. Teaches: "au moins un" via the complement, P(B)=1-3/10.

## 5. `LawBuilder` (task)
Table of x vs P(X=x) that fills as the student works.
```ts
interface LawBuilderProps { balls: Ball[]; draw: Draw; k: number; valueFn: ValueFnId;
  mode: "assign_outcomes"|"fill_probabilities"|"readonly"; prefilled?: Record<string,[number,number]>; showSumCheck: boolean }
```
- `assign_outcomes`: drag/tap outcomes into value columns; probabilities derive from counts.
- `fill_probabilities`: student enters fractions (numeric keypad).
Result details: `{ table, sum, correctCells, wrongCells }`. Events: `cell_filled {value, entered, correct}`, `sum_checked {sum}`.
Always show "sum = 1" as a habit check. Teaches: law of a random variable, completeness check.

## 6. `LawChart`
Bar chart of a law with E(X) marker and step-by-step reveal of E(X), E(X²), V(X).
```ts
interface LawChartProps { law: LawSpec | { balls, draw, k, valueFn }; reveal: ("E"|"E2"|"V")[]; showFormula: boolean }
```
Events: `step_revealed {step}`. Use after the law is known; mind that E(X)=-1/10 and V(X)=89/100 (decimal 0.89).

## 7. `BinomialExplorer`
For "repeat the experiment n times with replacement".
```ts
interface BinomialExplorerProps { p: [number, number]; nRange: [number, number]; kShown?: number; target?: { type: "E_at_least"; value: number }; showFormula: boolean }
```
Shows bars of P(Y=k), E(Y)=np marker, and with `target` highlights the smallest n reaching it (n=8 for p=7/10, target 5). Events: `n_changed`, `k_selected`, `threshold_found`.
Teaches: why P(Y=1)=n·p·(1-p)^(n-1), why E(Y)=np.

## 8. `TreeDiagram` (later, optional)
Reveal branches by tapping; for ordered/replacement draws. Same contract.

## Pedagogical sequence for 1.b / 2.a (what the planner should be able to produce)
1. `Urn` + `OutcomeSpace` (list the 10 pairs) -> count question.
2. `EventPicker` for "at least one 0" -> then `ComplementView` to show the shortcut.
3. `EventPicker` for each value of X -> `LawBuilder` fills as they go -> sum check -> `LawChart`.
Escalation when stuck: change representation (text -> picture -> action -> numeric twin), do not repeat the same explanation.
