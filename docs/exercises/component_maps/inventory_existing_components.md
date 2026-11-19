# Tteclair: inventory of interactive lesson components

Snapshot of the repo `/Users/oussama/Documents/reactnative/NewTTClair`, branch `probability-v2`, read on 2026-11-19 (read-only, nothing edited). Another session was editing `src/` at the same time; the mistakes screens (`src/mistakes/`, `src/app/screens/mistakes/`) were untracked at session start.

Sources: code first (`src/components/*`, `src/content/*`, `src/hybrid/*`, `src/lesson/*`, `src/app/screens/*`, `src/engine/*`, `src/method/*`, `src/ai/*`), then docs (`COMPONENTS_*.md`, `COMPONENT_CATALOG.md`, `ARCHITECTURE.md`, `DECISIONS.md`). Where the docs and the code disagree, the code is described and the gap is listed in section 10.

---

## 0. The short version

- **Name list** (`src/components/contract.ts` `COMPONENT_NAMES`): 36 names. **29 are registered** (zod schema + view); **7 are reserved names with no schema or view**.
- **Registry**: `src/components/registry.ts` (`REGISTRY`: schema, `kind`, `weight`, `teaches`, `usesExperiment`, `gate`, `gateIf`, `reveals`, `offeredToPlanner`, `nested`). **Views**: `src/components/ComponentHost.tsx` (`VIEWS`, must list exactly the registered names, tested). **Prompt descriptions** for the AI: `src/components/catalogMeta.ts`. **What each one puts on screen** (rule 9, AI guard): `src/components/reveals.ts` + the `*_REVEALS` arrays.
- **Used in today's exercise JSON**: 12 of the 29 (Urn, OutcomeSpace, GroupBoxes, SlotsPattern, PartWholeBar, SpreadSlider, RepeatedRuns, VariableTable, EventAreaModel, BinomialExplorer, ProbabilityTree, FunctionPlot). Only 4 of them reach the default lesson board from content (EventAreaModel, BinomialExplorer, FunctionPlot as route extras; ProbabilityTree as the figure). The other 8 sit in repair variants, old variants or a deep dive that only the old scripted lesson routes. On the board, the AI move can still pin some of them (and ChoiceProduct, ComplementView) for the urn exercise, from the per-question lists in `src/ai/packs/notes.ts`.
- **Built but not in any current exercise** (demo screens, tests, old fixtures, AI menu only): EventPicker, ComplementView, LawBuilder, LawChart, ChoiceProduct, UrnTemplate, PointOnCurve, FoldSymmetry, LimitExplorer, SecantToTangent, TangentSlope, VariationTableBuilder, PredictReveal, CompareTwo, ExampleGenerator, NumericTwin, StepThrough.
- **Only documented / planned**: AreaUnderCurve, CurveCompare, SequenceExplorer, InverseMirror, ParameterPlayground, CounterexampleHunt, WorkedExample (names reserved in code); TreeDiagram (superseded by ProbabilityTree); all Suites and Complexes components (not even reserved names; engines `complex.ts` and `sequences.ts` are stubs).
- **Most of the student's acting today is not done through registry components** but through the method-lesson frame inputs (plan cards to order, a word to tap, sentence cards to pick, a list builder, a line worksheet, a recipe) on the lesson board (section 6).

### Three lesson surfaces (which one a student sees)
`src/app/screens/LessonScreen.tsx` chooses per question (`src/config/tutorMode.ts`, default `'hybrid'`):
1. **Lesson board** (`'hybrid'`, default): `src/app/screens/hybrid/HybridLessonScreen.tsx` (via `LiveHybridLessonScreen`), run by the conductor `src/hybrid/conductor/conductor.ts`. Used when an AI key is configured (`localLlmConfig`) and the question has method frames (all 4 current exercises do). It walks only the question's main method frames: authored repair variants, the old variants (`sim-1-total-1/2`, `alt-1-s4-boxes`) and the deep dive `dd_count_draws` are excluded by design (conductor header). Components appear here as (a) route "extras" stages, (b) the exercise figure (ProbabilityTree), (c) a component the AI move pins (urn questions only).
2. **AI-led chat** (`'ai'`): `src/app/screens/tutor/TutorLessonScreen.tsx` + `InputDock.tsx` + `TutorMessage.tsx`; only for questions with tutor notes not marked `hybridOnly` (`src/ai/packs/notes.ts`: today only `bac2022c-sc-ex2` 1, 2, 3a, 3b). Kept "for comparison".
3. **Old scripted feed** (`'old'`, or no AI key): `Lesson` in `LessonScreen.tsx` + `src/lesson/feed/*` + reducer `src/lesson/session/lesson.ts` + rules planner `src/planner/rules.ts`. This is the only surface that routes authored repair variants (`repairVariantFor` in `src/method/repairRoute.ts`, called only from `src/planner/rules.ts`).

### Common contract of every registered component
- Props: JSON only, validated by its zod schema before render; unknown name / invalid props / render error -> neutral fallback (`ToneBlock 'componentFallback'`) + `component_error` event, never a crash (`ComponentHost.tsx`, `resolveSpec`).
- `usesExperiment: true` components get `balls`, `draw`, `k` filled from the exercise `experiment` when the spec omits them.
- Modes: `interactive | readonly | replay` (`ComponentMode`). `useEmit` (`src/components/host.ts`) emits only in `interactive`; readonly/replay have no side effects. Each view accepts a recorded `snapshot` (validated) and exposes `getStateSnapshot()` through a ref (`ComponentHandle`), used by ask / long-press / report and replay (FunctionPlot exposes the handle but takes no snapshot: it has no state).
- Task components also get `showSolution` (end of the hint ladder) and call `onResult({correct, details, misconceptionHints})`.
- Events: logged as `component_event {component, name, payload}` (`src/telemetry/events.ts`, `docs/DATA.md`). The lesson itself adds `shown` and `cell_filled_by_lesson`.
- Gates: a visual with `gate` holds the lesson until one gate event (`isGate`, `opensGate`). All probability2 components except ProbabilityTree have gate `explored` (with an escape «ما نعرفش، ورّيني» that logs `how: 'skipped'`); PredictReveal has gate `predicted | revealed`.
- `offeredToPlanner: false` on all probability2 components (old planner menu). The AI tutor's catalogue (`src/ai/prompt/catalogAi.ts`) lists every registered component except ProbabilityTree ("lesson only").

---

## 1. Registered components: probability v1 (`src/components/probability/`)

Engine for all six: `src/engine/probability.ts` (exact fractions): `enumerateOutcomes(urn, draw, k)` with `draw: simultaneous | ordered | ordered_with_replacement`; value functions `product | sum | max | min | identity | count_value(v)`; events `any_value(v) | all_equal | value_eq(valueFn?, v) | not | and | or`; `probability`, `law`, `expectation`, `variance`. Cap: more than 60 draws is refused (`MAX_OUTCOMES`), except `Urn` in `display` mode (D35). Schemas: `src/components/probability/schemas.ts`. Common experiment props: `balls` (1-12 balls `{id, value, color?: red|black}`), `draw`, `k` (1-4).

| Registry name / file | Kind, weight, gate | Student does / sees | Main props (zod) | Events (`name`) | Maths | Engine verifies | Status |
|---|---|---|---|---|---|---|---|
| **Urn** `probability/Urn.tsx` | visual, light, no gate, usesExperiment | sees the balls (letters R/N for coloured balls, prime mark for duplicate values); in `select` mode taps k balls, sees the value of the draw | `mode: display\|select` (default display), `selected?`, `markDuplicates` (true), `valueFn?`, `insight?` (Rich) | `ball_toggled`, `selection_complete` | urn, simultaneous draw, sample space | urn validity; draw count (select mode capped at 60); value of the selected draw | **In content**: `bac2022c-sc-ex2` variant `sim-1-total-1` intro (select mode). That variant is excluded from the board, so old lesson only. AI move option (tutor notes sc-ex2 Q1, Q2). Demos. Old fixtures `ex2.v050`, `scEx2.v030`. |
| **OutcomeSpace** `probability/OutcomeSpace.tsx` | visual, light | sees every outcome as chips (grid or list), optionally coloured by value or by an event, with the count; taps outcomes | `valueFn?`, `colorBy: value\|event\|none`, `event?`, `layout: grid\|list`, `showCount` (true), `highlight?` (outcome ids), `markDuplicates`, `insight?` | `outcome_tapped`, `legend_toggled`, `expanded` | counting outcomes, ordered vs unordered pairs, values of X | outcomes enumerated by the engine; colouring computed | **In content**: sc-ex2 deep dive `dd_count_draws` (block `dd-cd-os`, `showCount: false`) and variant `sim-1-total-2` intro: both excluded from the board, old lesson only. Named `repairComponent` 11 times in misconception files. Demos, fixtures. |
| **EventPicker** `probability/EventPicker.tsx` | **task**, light | taps every favourable outcome, submits; fraction shown live or on submit | `event` (EventSpec, required), `valueFn?`, `prompt?`, `reveal: live\|on_submit` (on_submit), `showFraction` (true), `maxAttempts?` (1-10), `showValues` (false), `markDuplicates` | `outcome_selected`, `outcome_deselected`, `submitted`, `attempts_exhausted`; `onResult` | event as a set, "au moins un", favourable / possible | **graded by the engine**: selected vs the engine's event set -> `{selected, correct, missed, extra, fraction}`; misconception hints `selects_all`, `selects_complement`, `misses_duplicate_value_pair` (`probability/logic.ts`) | Built; **not in any current exercise** (only old fixture `ex2.v050`, 10 uses). Named `repairComponent` 7 times. Lesson path only (task: not nestable, not in deep dives). |
| **ComplementView** `probability/ComplementView.tsx` | visual, light | one split bar P(E) / P(not E), toggles between the event and its complement; `1 − P` on its own line | `event`, `valueFn?`, `direction: to_complement\|from_complement` (from), `interactive` (true), `labels?` `{event, complement}` (math strings) | `complement_toggled`, `fraction_revealed` | complement, "au moins un" | both fractions computed from the urn | Built; **not in current exercises** (fixture `ex2.v050`). AI move option (tutor notes sc-ex2 Q2). |
| **LawBuilder** `probability/LawBuilder.tsx` | **task**, **heavy** (visual when `readonly` or `progressive`) | fills the law table of X: assigns outcomes to value columns, or types each P(X = x) on the numeric keypad; "sum = 1" check | `valueFn` (required), `mode: assign_outcomes\|fill_probabilities\|readonly\|progressive` (fill_probabilities), `prefilled?` (value -> [num, den]), `showSumCheck` (true), `markDuplicates` | `cell_filled`, `outcome_assigned`, `sum_checked`, `invalid_input`; `onResult` | law of a random variable, sum to 1 | **graded**: each cell vs the engine law; `prefilled` rejected at load if it disagrees with the engine; hint `law_sum_not_one`; `progressive` cells filled by the lesson after solved EventPickers (`fillsLaw`, `lessonState`) | Built; **not in current exercises** (fixture `ex2.v050`). |
| **LawChart** `probability/LawChart.tsx` | visual, light | bars of the law, E(X) marker; reveals E(X), E(X²), V(X) step by step; taps bars | `law?` `{rows:[{value, p}], of?: valueFn}` or `valueFn` + experiment; `reveal: ('E'\|'E2'\|'V')[]`; `showFormula` (true) | `step_revealed`, `bar_tapped` | law, expectation, variance | rows must sum to 1; with `law.of` every row is recomputed on the urn and must agree; moments computed exactly | Built; **not in current exercises** (fixture `ex2.v050`). |

---

## 2. Registered components: probability v2 (`src/components/probability2/`)

All: kind visual, weight light, `usesExperiment: false`, `offeredToPlanner: false`, `reveals` declared (enforced by `registry.v2.test.ts`), and they emit two common events (`probability2/finding.ts`): `explored {why, how}` (opens the gate; `how: 'skipped'` never counts as understanding) and `finding {findingId, numbers, route, how, correct, calc?}` (`calc` = LaTeX lines built by `src/engine/calcLines.ts` from the student's own numbers). No `ask` (task) mode was built for any of them (A1 decision). Schemas: `src/components/probability2/schemas.ts`. Design: `docs/COMPONENTS_PROBABILITY_V2.md` (C1-C12); status log: `..._FINAL.md`, `..._PROGRESS.md`.

| Registry name / file | Gate | Student does / sees | Main props (zod) | Own events | Maths | Engine verifies | Status |
|---|---|---|---|---|---|---|---|
| **GroupBoxes** `GroupBoxes.tsx` | explored | ordered draws grouped in boxes (one per set of balls, each holding its orderings); opens a box or a slice and reads how many orderings it holds | `balls` (3-12), `k` (2-4), `groupBy: 'ball_set' \| {property:{value}}`, `mode?: show_all\|one_box_expanded`, `meantToDistinguish` (true: refuses k = 2), `insight?` | `box_expanded`, `box_collapsed`, `next_box`, `slice_selected` | ordered vs unordered, C(n,k) = A(n,k)/k! | `src/engine/grouping.ts` (boxes, k! orderings, slices; lists capped); coincidence guard `src/engine/coincidence.ts` | **In content**: sc-ex2 variant `alt-1-s4-boxes` intro (excluded from the board: old lesson only). AI move option (sc-ex2 Q1, Q2). Named `repairComponent` 2 times. Demos (5 cases). |
| **ChoiceProduct** `ChoiceProduct.tsx` | explored | two stages of choice drawn as rows x columns (AND) or end to end (OR); picks one option per stage, sees the cell / product and sum | `stages` (exactly 2: `{title?, balls? \| labels?, size 1-3}`), `mode: and\|or` (and), `allowSwitch` (true), `meantToDistinguish`, `insight?` | `option_picked`, `mode_switched` | multiplication principle, C(6,2) is not 6 x 2 | products / sums computed; refuses 2 + 2 = 2 x 2 | Built; **not in current exercises** (D39 took it off question 1's main path; fixture `scEx2.v030`). AI move option (sc-ex2 Q1). Named `repairComponent` 3 times, but no variant draws it now. |
| **SlotsPattern** `SlotsPattern.tsx` | explored | marks k of n slots, adds the pattern to a list, is told when one repeats, presses "that is all"; 3-level help when the list is short; `bridge` draws the same slots over labelled balls and flips chosen / left; `build_pascal` builds a Pascal row | `n` (2-7), `k` (0-7), `mode: free\|guided\|build_pascal\|bridge`, `bridge?` `{balls}`, `listCap` (<= 60), `meantToDistinguish`, `insight?` | `slot_toggled`, `first_slot_selected`, `pattern_added`, `duplicate`, `count_confirmed`, `missing_hint_requested`, `k_selected`, `flipped` | combinations C(n,k), listing systematically, C(n,k) = C(n,n−k) | `src/engine/combinatorics.ts`; the student's list is checked for duplicates and completeness; count revealed only after his own complete list or the end of the ladder | **In content**: sc-ex2 repairs `rep-3a-box` (guided) and `rep-3a-bridge` (bridge): old lesson only. AI move option (sc-ex2 Q3a). |
| **PartWholeBar** `PartWholeBar.tsx` | explored (no gate in `feedback` mode, `gateIf`) | drags a stepped handle to place a value on a bar from 0 to the whole; a value past the whole is flagged (arrow + text + dashed end); `feedback` mode only draws the value he wrote | `whole` (rational string), `part?`, `mode: place\|fraction_of_quantity\|feedback`, `fraction?`, `unit?`, `ticks` (6), `insight?` | `value_placed`, `exceeds_whole` | probability above 1, fraction of a quantity | `src/engine/partWhole.ts` (exact ratio, above-whole flag) | **In content**: sc-ex2 repairs `rep-1-above-one`, `rep-2-above-one` (feedback mode): old lesson only. AI move option (sc-ex2 Q1, Q2). |
| **SpreadSlider** `SpreadSlider.tsx` | explored | moves a stepped p slider (or picks a scenario, or steps through values); sees each value's distance, square (one fixed scale), contribution p x d², a stacked bar; total variance only after enough distinct positions; optional checkpoint question | `values` (2-5 ints), `family: bernoulli{p:{min,max,step,init}} \| fixed{probabilities} \| scenarios{…, sameMean?}`, `show`, `totalLockedUntil?` `{positions}`, `checkpoint?: larger_spread{options} \| zero_at_ends{expressions}`, `insight?` | `slider_changed`, `scenario_selected`, `value_focused`, `checkpoint_answered` | variance, expectation | `src/engine/distribution.ts` (mean, distances, contributions, variance); checkpoints answered by `src/engine/spreadChecks.ts` | **In content**: sc-ex2 repair `rep-3b-spread`: old lesson only. AI move option (sc-ex2 Q3b). |
| **RepeatedRuns** `RepeatedRuns.tsx` | explored | N runs drawn as N cells: shades a fraction and confirms, or presses "next" to light the next stage (36, 6, 1) or read the next line of a law's tally (S, then S / N = E(X)) | `N` (4-60), `mode: fraction_of_total\|two_stage\|tally`, `stages?` `[{label?, p}]`, `tally?` `{values, probabilities}`, `interaction: shade\|watch`, `cols` (6), `insight?` | `cell_tapped`, `confirm_pressed`, `stage_advanced` | frequency reading of a probability, expectation as an average | `src/engine/runs.ts` (exact integer counts; a set that does not give whole runs is refused) | **In content**: sc-ex2 repairs `rep-3a-independence` (two_stage), `rep-3b-runs` (tally): old lesson only. AI move option (sc-ex2 Q3a, Q3b). |
| **VariableTable** `VariableTable.tsx` | explored | chooses a value, taps the outcomes (S/F patterns or small-urn draws) that give it, presses the checks (all used, sum, symmetric, the law) | `outcomes: trials{n 2-5} \| urn{reds, blacks, k}` (<= 48 outcomes), `weights: uniform \| {p}`, `checks?: (all_used\|sum\|symmetry\|law)[]`, `insight?` | `value_selected`, `mapping_changed`, `check_run`, `law_submitted` | law of a variable on patterns, sum = 1, symmetry, binomial | `src/engine/distribution.ts` (law of a rule over patterns, sum and symmetry checks); his table equals the true law only when he is right | **In content**: sc-ex2 repairs `rep-3a-plan`, `rep-3a-law`: old lesson only. AI move option (sc-ex2 Q3a). Reduced scope (no typed probability cells). |
| **BinomialExplorer** `BinomialExplorer.tsx` | explored | moves n and p; taps bars (stepper above 5 trials) to see C(n,k) p^k q^(n−k) with the real numbers; switches mean (np) and variance (npq) on; general formula after 2 distinct bars | `n` `{min,max,init}` (<= 15), `p: {fixed} \| {min,max,step,init}`, `toggles` `{mean, variance}`, `formulaLockedUntilTaps` (2), `linkSlots` (false), `insight?` | `n_changed`, `p_changed`, `bar_tapped`, `toggle_changed` | binomial law, E = np, V = npq | `src/engine/binomialSafe.ts` (every term, np, npq exact; loader rejects a grid that overflows); never sums terms for a moment | **In content, on the route**: sc-ex2 Q3a extra `x_explorer` (after pick `p_formula`), reached on the board and in the old lesson. AI move option (sc-ex2 Q3a, Q3b). |
| **EventAreaModel** `EventAreaModel.tsx` (uses `SliceBar.tsx`) | explored | a sample space as one bar whose slices follow their counts (4R6N: 20, 60, 36, 4 of 120); picks one or two events, then a view (complement, intersection, union, conditional) and reads the engine lines | `source: urn{reds, blacks, k} \| authored{slices[{id,label,count}]}` (<= 8 slices), `events` (1-4: `{id, label, slices}`), `overlays` (complement default), `labels: counts\|probabilities`, `insight?` | `event_selected`, `overlay_selected` | complement, intersection, union, conditional | slice counts from `src/engine/grouping.ts`; every view's count / probability computed | **In content, on the route**: sc-ex2 Q2 extra `x_area` (after pick `p_claim`): board and old lesson. AI move option (sc-ex2 Q2). |
| **UrnTemplate** `UrnTemplate.tsx` | explored | reads a worked example of the same method on a fresh urn and asks for another one | `templateId: urn_exactly_j\|repeated_trials_table`, `seed` (1-10000), `parent?` `{answer?, wrong?[]}`, `insight?` | `example_requested` | "exactly j reds among k", P(X = j) of n trials | `src/engine/urnVariants.ts` (`generateUrnVariant`, `freshCandidateOk`): seeded, verified a second way, never the parent's answer nor a known wrong value; the schema proves the next 4 seeds exist | Built; **not in any content** (demos and tests; its engine rule is used by the content loader). Not in tutor notes. |
| **ProbabilityTree** `ProbabilityTree.tsx` (`treeLayout.ts`, `treeModel.ts`, `treeText.ts`) | **no gate**, lesson only, not in the AI catalogue | a tree of 1-2 levels, 2-4 branches per node, drawn as the exam prints it: values given, found (bold + tick), hidden ("?"), or blank; the current step's branches marked (thicker line + arrowhead); counts mode for small examples; in interactive mode a tap on a path end marks it and writes its values as a product (never the result) | `branches` (2-4, each `{id, latex, p?, show: given\|found\|hidden\|blank, count?, countShow, node?, children?}`), `mark` (ids), `ask?`, `rootCount?` (counts mode), `compact` (false) | `path_selected` | conditional probability, probability tree, total probability | `src/engine/tree.ts` (`checkTree`: branches of a node sum to 1, ranges, path products); live values come from the student's credited lines (`src/hybrid/figure.ts`) | **In content**: `bac2022p-sc-ex2` `figure.spec` (printed figure), 7 similar-question figures, 15 help-ladder level-2 examples (`src/content/help/bac2022p-sc-ex2.json`, counts mode). Drawn read-only by the board (`FigureView.tsx`: trip, «التمرين», step card, «اللي لقيناه»). `fill` modes, urn source and collapse > 24 leaves of the design are not built. |

---

## 3. Registered components: analysis (`src/components/analysis/`)

All: kind visual (except VariationTableBuilder: task), weight light, no gate, offered to the old planner. Functions are **ids** from `FUNCTION_REGISTRY` in `src/engine/analysis.ts` (`f_ex4`, `f_ex4_num`, `f_ex4_den`, `f_ex4_simplified`, `f_ex4_prime`, `sigmoid_demo`, `quot_demo`, `exp_neg`, `g_ex4_transfer`), each a safe-parser expression, never code. Engine: `evalFn`, numeric `derivative`, `integrate` (Simpson), `limitProbe`, `parity`, `signChange(Of)`, `equivalentExpressions`, `matchesFn`. Shared internals (not registered): `Slider.tsx` (stepped PanResponder slider, D36), `PlotCanvas.tsx` / `plot.ts` (precomputed points), `Expandable.tsx` (tap to full screen, `expanded_toggled`), `MathReadout.tsx`, `VariationGrid.tsx`. Schemas: `src/components/analysis/schemas.ts`. Design: `docs/COMPONENTS_ANALYSIS.md`.

| Registry name / file | Student does / sees | Main props | Events | Maths | Engine verifies | Status |
|---|---|---|---|---|---|---|
| **FunctionPlot** `FunctionPlot.tsx` | looks at the curve (markers, shaded area, dashed where f < 0) | `fn`, `domain` ([-4,4]), `range?`, `markers?` (<= 6: point / hline / vline / asymptote), `shade?` `{from, to, sign}`, `colorBySign` | none | curve shape, symmetry, behaviour at infinity | points computed; a point marker gives only x (y = f(x)); an asymptote marker is checked against the engine limit | **In content, on the route**: `bac2022c-ex4` A4 extra `x_plot` (after card `c_top`; D79). Board and old lesson. |
| **PointOnCurve** `PointOnCurve.tsx` | drags x (stepped), compares f(x) and f(−x) live; toggle to a non-even function | `fn`, `x0` (1), `showMirror` (true), `compareFn?`, `domain` ([-3,3], symmetric for the mirror), `range?`, `step` (0.1) | `x_changed`, `compare_toggled`, `expanded_toggled` | parity | values computed | Built; not in current content (fixture `ex4.v010`); demo. |
| **FoldSymmetry** `FoldSymmetry.tsx` | drags a fold slider that flips the left half over the y-axis; sees whether it matches | `fn`, `compareFn?`, `domain` (symmetric), `range?` | `fold_changed`, `fold_complete` `{overlap}`, `compare_toggled`, `expanded_toggled` | parity as a picture | overlap computed | Built; not in current content (fixture `ex4.v010`); demo. Named `repairComponent` once. |
| **LimitExplorer** `LimitExplorer.tsx` | drags x towards ±∞; reads numerator, denominator and f(x) separately (∞/∞); zoom near the asymptote | `fn`, `numerator?`, `denominator?` (must satisfy num/den = fn), `direction: +inf\|-inf`, `xMax` (<= 50), `zoom`, `step` | `x_changed`, `zoom_toggled`, `expanded_toggled` | limits at infinity, forme indéterminée, asymptote | values and limit computed; num/den checked against fn | Built; not in current content; demo. Named `repairComponent` 2 times. |
| **SecantToTangent** `SecantToTangent.tsx` | steps h down (3 … 0.01), compares secant slope and tangent slope | `fn`, `x0` (−1), `hSteps`, `domain`, `range?` | `h_changed`, `expanded_toggled` | meaning of f′ | slopes computed (numeric derivative) | Built; not in current content; demo. |
| **TangentSlope** `TangentSlope.tsx` | drags x, sees the tangent and its slope (up / down / flat); optional mini variation table filled by visited regions | `fn`, `x0`, `domain`, `range?`, `step`, `showTable` | `x_changed`, `region_visited`, `expanded_toggled` | sign of f′ vs variation | slope computed; f must be defined on the whole domain | Built; not in current content; demo. Named `repairComponent` 2 times. |
| **VariationTableBuilder** `VariationTableBuilder.tsx` (`variation.ts`) | **task**: taps cells to cycle signs of f′ (+/−), arrows (up/down) and extremum (max/min/none), submits | `fn`, `scan` ([-5,5]), `ends` `{left: '-inf'\|number, right}`, `mode: 'student_fill'` (only), `prompt?`, `maxAttempts?` | `cell_changed`, `submitted`, `attempts_exhausted`; `onResult` | tableau de variation | **graded**: solution from the engine's sign changes of f′; hints `sign_arrow_mismatch`, `extremum_without_sign_change`; schema refuses a scan that hides a sign change | Built; **not used** (D79: ex4 uses picks + a number line instead; a graded table needs a mockup first). Demo. |

---

## 4. Registered components: generic primitives (`src/components/shared/`)

Schemas: `src/components/shared/schemas.ts`. Design: `docs/COMPONENT_CATALOG.md`. Containers hold one level of inner specs (`InnerSpecSchema`); inner specs are resolved with their own schema and may not be tasks (`registry.ts` `nested`); inner instance id is `<id>:<slot>`.

| Registry name / file | Student does / sees | Main props | Events | Maths | Engine verifies | Status |
|---|---|---|---|---|---|---|
| **PredictReveal** `PredictReveal.tsx` | picks a prediction (or "show me"), then the inner component appears, then one insight sentence | `prompt`, `options` (2-4 `{id, label}`), `reveal` (inner spec), `insight?` | `predicted`, `revealed` (both open its gate) | general (wraps any visual) | the prediction is **not graded** (no answer prop) | Built; not in current content (fixture `ex4.v010`); demo. |
| **CompareTwo** `CompareTwo.tsx` | explores two inner components side by side (stacked) | `left`, `right` (inner specs), `leftLabel?`, `rightLabel?`, `insight?` | none of its own (inner components emit theirs) | general | nothing of its own | Built; not in current content (fixture `scEx2.v030`); demo (OutcomeSpace vs OutcomeSpace). |
| **ExampleGenerator** `ExampleGenerator.tsx` | asks for another example of the same rule | `templateId: quotient_linear\|parity_exp`, `seed` | `example_generated` | quotient rule, parity | `src/engine/examples.ts`: seeded, every line built from safe-parser expressions, checked by tests | Built; not in any content; demo. |
| **NumericTwin** `NumericTwin.tsx` | picks numbers for the scary symbol and compares both sides | `symbol` (one letter, not e or i), `template` (safe-parser expression), `compare?`, `values` (1-6 numbers), `label?` | `value_changed` | general algebra (exp rules) | both expressions parsed by the safe parser (`src/engine/expression`) and evaluated; must be defined at every value | Built; not in current content (fixture `ex4.v010`); demo. Named `repairComponent` 2 times. |
| **StepThrough** `StepThrough.tsx` | reveals one step at a time, opens "why?" | `steps` (1-8 `{text?, math?, why?}`) | `step_revealed`, `why_opened` | general | math only checked to be drawable (`parseLatexSubset`); **content is not verified** | Built; not in current content (fixture `ex4.v010`); demo. |

---

## 5. Reserved, documented and planned components (no code)

### 5.1 Reserved names in `COMPONENT_NAMES` (no schema, no view; a spec naming them falls back, tested with `InverseMirror`)
| Name | Planned in | What it would be |
|---|---|---|
| AreaUnderCurve | COMPONENTS_ANALYSIS.md #7 | signed shaded area with bound sliders, numeric integral, `stack` option for even functions (`integrate` exists in the engine) |
| CurveCompare | COMPONENTS_ANALYSIS.md #8 | two functions overlaid with a live difference |
| SequenceExplorer | COMPONENTS_ANALYSIS.md #9, COMPONENTS_COMPLEX_SEQUENCES.md | I_n = ∫ tⁿ F(eᵗ) dt with an n slider |
| InverseMirror | COMPONENTS_ANALYSIS.md #10 | function and inverse reflected over y = x |
| ParameterPlayground | COMPONENT_CATALOG.md | parameter sliders + live engine outputs |
| CounterexampleHunt | COMPONENT_CATALOG.md | "try to break this claim" |
| WorkedExample | COMPONENT_CATALOG.md, COMPONENTS_ANALYSIS.md #12 | full worked example then a "your turn" variant |

### 5.2 Documented only (not even reserved names)
- **TreeDiagram** (COMPONENTS_PROBABILITY.md §8, "later"): superseded by the registered **ProbabilityTree**.
- **Suites** (COMPONENTS_COMPLEX_SEQUENCES.md, COMPONENT_CATALOG.md): SequencePlot, CobwebDiagram, SqueezeVisual, MonotoneBoundedViz (candidate), InductionStepper (task, candidate). `src/engine/sequences.ts` is a stub.
- **Complexes** (same docs): ComplexPlane, UnitCircleExp, QuadraticRootsExplorer, AffixConstruction (task), ComplexTransform. `src/engine/complex.ts` is a stub.
- **Analysis candidates** (COMPONENT_CATALOG.md): IVT visual, growth comparison, integration-by-parts trainer.

---

## 6. Interactive widgets outside the registry

These are where the student acts most today. They are not requested by name from JSON; the lesson builds them from the step / frame kind.

### 6.1 Method-lesson frame inputs (`src/lesson/feed/method/`, used by the board's `StepCard.tsx` and the old feed's `MethodFrameCard.tsx`)
A `method` step in content is expanded by the loader into `mframe` steps (`src/content/schema.ts` `MethodStepSchema`, `MethodFrameSchema`); each frame type has its input:

| Frame type | Widget (file) | Student does | Engine / logic that judges it |
|---|---|---|---|
| `plan` | **PlanCards** `PlanCards.tsx` | orders 3-5 shuffled plan cards, confirms (one act) | `src/method/frame.ts` `checkPlan`: any order respecting what each card uses |
| `read` | **StatementTap** `StatementTap.tsx` | taps the word in the exam sentence that matters (e.g. «même», «simultanément») | reducer / conductor (`targets` in content) |
| `lines` | **LineInput** `LineInput.tsx` (old feed: calculator pad, digits , + − × ÷ ( ) =, no letters, readback of `990÷3×2×1`) / **Worksheet** via `LineEntry.tsx` (board) | writes calculation lines | `src/method/lineChain.ts` (exact rationals, C(n,k)/A(n,k)/n! read as products), `exprLine.ts` (lines with x or n, numeric samples), `mutations.ts` + `factorForm.ts` (known slips by value then structure), graph templates `src/method/templates*.ts` |
| `cards` (picks) | **CardsPick** `CardsPick.tsx` | picks one of 2-5 sentence cards (reason, claim, formula) | evaluators `src/method/cards.ts`, `claims.ts` (claims run on a battery of boxes) |
| repair / extras `list` stage | **ListBuilder** `ListBuilder.tsx` | builds the list of groups with ball chips, "that is all" | `src/method/repair.ts` (help never says how many are missing) |
| repair / extras `show` / `line` / `cards` / `component` stages | rendered by MethodFrameCard / StepCard; `component` stage = **a registered component** through `ComponentHost`, the stage ends on its gate (`explored`) | | |
| `recipe` | recipe pool (cards chosen and ordered) in MethodFrameCard / StepCard | picks 3-5 sentences and orders them as his recipe | |
| `similar` | the worksheet / line pad on a new statement, no help | writes the similar question alone | same line engine on the similar question's own graph |

Graph templates used by current content (`"graph": {"template": …}`): `urn_exactly_j`, `urn_at_least_one`, `num_same`, `num_at_least`, `num_law`, `num_moments`, `num_repeat_law`, `num_repeat_mean`, `binomial_term`, `binomial_moments`, `tree_complete`, `tree_other_path`, `tree_conditional`, `tree_reverse`, `fn_parity`, `fn_derivative`, `fn_variation`, `fn_limit`, `fn_sketch`.

Also: **MethodStrip** / **MethodSheet** (route strip and sheet, old feed), **MethodNoteView** (generated lines), `sheetParts.tsx`.

### 6.2 The lesson board (`src/app/screens/hybrid/`, default surface)
| Piece | File | What the student does / sees |
|---|---|---|
| Board screen | `HybridLessonScreen.tsx`, `LiveHybridLessonScreen.tsx`, `useHybridSession.ts` | header, three sheets, folded finished steps, the current step card, chat drawer |
| Paper first | `solo/PaperFirst.tsx` | the question opens on the exam paper; chooses «نكتب الحل وحدي» or «نمشيو خطوة بخطوة» (D86) |
| Solo sheet | `solo/SoloSheet.tsx` | writes the whole question alone, line by line; each line judged against any step not done (D87); «تعطّلت؟» |
| Hand-off | `solo/Handoff.tsx` | after «تعطّلت؟»: keeps his lines, «نكمّلو خطوة بخطوة» or back |
| Step card | `StepCard.tsx` | what now / why / next, prompt, the frame's input (6.1), tutor replies, AI-move pinned component, «ما نعرفش» |
| Collapsed step | `CollapsedStep.tsx` | finished step in one line; tap opens «الطريق» |
| Line entry | `LineEntry.tsx` -> `src/lesson/worksheet/Worksheet.tsx` | the worksheet: lines under their plan step, stacked fractions, number tiles (statement numbers + earned values), scaffold from his own earlier line, tap an earlier line to fix it |
| Help ladder «ما نعرفش» | `ladder/LadderView.tsx`, `ladder/FillLine.tsx` | 3 levels that give, never ask (D88): «الفكرة», «مثال محلول» (may include a counts-mode ProbabilityTree), «الطريقة على أعدادنا» with a line to fill (slots + value chips, judged as a typed line); then «ورّيني الحل الكامل». Content `src/content/help/<exerciseId>.json` |
| Small case | `CasePanel.tsx` («الصندوق الصغير») | lists the groups of a small case an AI move put him on, writes its lines, back to the question |
| Small tree example | `TreeCasePanel.tsx` («مثال صغير») | a counted-whole tree with its story; answers on his page |
| Figure | `FigureView.tsx` (+ `src/hybrid/figure.ts`) | read-only ProbabilityTree: printed, live (his values, "?"), compact on the step card |
| Sheets | `board/BoardSheet.tsx`, `board/TabBar.tsx`, `board/ExerciseTab.tsx` («التمرين»: exam paper, figure, results), `board/RoadTab.tsx` («الطريق»: map with where he is), `board/FoundTab.tsx` («اللي لقيناه»: write-up from his accepted lines, findings, method card) | reading; segments switch sheets |
| Trip / map | `trip/TripScreen.tsx`, `trip/TripMap.tsx`, `trip/FadeIn.tsx` | the question's map; only act «نبداو» (no longer shown first since D86; its map is «الطريق») |
| Teacher (long-press ask) | `teacher/AskProvider.tsx`, `teacher/Selector.tsx`, `teacher/selection.ts` | long press on any text or formula; own word-by-word selection with handles, «+» «−», whole sentence, formula parts as chips; «اسأل الأستاذ» -> options that depend on what is selected (D91, D92) |
| Teacher screen | `teacher/TeacherScreen.tsx`, `teacher/MathKeys.tsx`, `useKeyboardInset.ts` | full-screen AI teacher thread; math keys row (∩ ∪ Ā p( ) fraction √ x²); «فهمت ✓» / «مازال ما فهمتش» / «نرجعو للتمرين»; glossary answers free (`src/ai/teacher/glossary.ts`), AI answers labelled "numbers checked by the engine" (D89) |
| Typing bubble | `TypingBubble.tsx` | three dots while a reply comes |
| Warm-up | `warmup/WarmupGate.tsx`, `warmup/WarmupScreen.tsx` (+ `src/warmup/warmup.ts`) | once per exercise: a line on the worksheet or a pick of a card per question, «ما نعرفش», skip; nothing marked right/wrong; line judged by the engine (D83, D84) |
| End-of-question errors | `src/app/screens/mistakes/ErrorsMet.tsx` (untracked) | the errors the engine named, «Revoir» |

### 6.3 «Mes erreurs» (`src/app/screens/mistakes/`, `src/mistakes/`, untracked at session start; D94)
**MistakesList** (errors by chapter and status), **MistakeReview** («Revoir»: taps the wrong part of his own line, found by the engine via `src/mistakes/parts.ts`; or taps the right line of two; or reads the rule), **MistakesFlow**, `parts.tsx`. Events `error_noted`, `error_review`. Training on new numbers not built yet.

### 6.4 Old scripted feed (`src/lesson/feed/`, `src/lesson/lines/`)
| Piece | File | Notes |
|---|---|---|
| Feed | `LessonFeed.tsx`, reducer `src/lesson/session/lesson.ts` | items: statement, tutor, math, student, feedback, hint, answer, ask_answer, question, component, choice_card, variant/deep-dive start, return, writeup, walkthrough, thinking, done; jump-to-current button (`jump.ts`) |
| Tutor block | `TutorText.tsx` (450 ms hold, 8 pt move cancels) + `RichView.tsx`, `src/lesson/blocks/RichText.tsx` | |
| Question card | `QuestionCard.tsx` | renders by step kind: `component` (task component via ComponentHost), `choice` (**OptionsQuestion** `OptionsQuestion.tsx`, 2-4 options, wrong ones not disabled), `mframe` (MethodFrameCard), `lines` (**LinesCard**), else typed (**NumericKeypad**); footer: dashed «ما نعرفش», hint ladder n/3, answer only at the end of the ladder, skip on optional steps, "⋯" menu (trust label, Report) |
| Numeric keypad | `NumericKeypad.tsx` | fractions / decimals for typed steps (`integer`, `signed`, `probability`); equivalence decided by the engine |
| Line-by-line writing | `src/lesson/lines/LinesCard.tsx`, `MathEditor.tsx`, `editor.ts`, `check.ts` | structured editor (fraction / exponent / group templates, keys `0-9 x t e + - * frac pow group`); each line checked against the previous one by numeric samples, error localized (numerator / denominator). No current exercise has a `lines` step (fixture `ex4.v010`, demo `linesDemo.tsx`); the editor model is reused by the board's Worksheet |
| Long-press menu | `LongPressMenu.tsx` | اشرحلي / علاش؟ / مثال, then trust label and «بلّغ على غلطة» |
| Ask field | `AskField.tsx` | free text + starter chips; answers canned (verified chip answers, else neutral) |
| Tutor drawer | `src/tutor/TutorDrawer.tsx` | free-text question, verified content or checked AI blocks, choices understood / still unclear / back |
| Choice card | `ChoiceCard.tsx` | 2-3 one-tap answers: what is unclear, understood / guessed (self-report), compress, repair picture, teacher note |
| Walk-through | `WalkthroughCard.tsx` | lines one tap at a time, then the step again |
| Paper sheet | `PaperSheet.tsx`, `paperParts.tsx`, `MarkedStatement.tsx` | «الورقة»: statement, questions (done / here / soon), results so far |
| Report / trust | `ReportSheet.tsx`, `BlockActions.tsx`, `FeedbackCard.tsx`, `Bubbles.tsx` | |
| Exam paper screen | `src/app/screens/ExamPaperScreen.tsx` | debug builds only |

### 6.5 AI-led chat (`src/app/screens/tutor/`)
`InputDock.tsx` renders the input the tutor asks for (`src/ai/tools/schemas.ts` `InputSchema`): `free`, `continue`, `line` (calculation pad), `choice` (2-4 options), `order` (2-6 cards), `tap_word` (French sentence), `list` (groups of a small case), `component` (a registered component by name + `props_json`, live in `TutorMessage.tsx`, then replayed), `formula`; always a free-text bar and «ما نعرفش».

### 6.6 Other screens with acts
Onboarding (`src/app/screens/onboarding/OnboardingSteps.tsx`: class picker, two example screens), home, chapters, exercise picker: navigation, not lesson widgets.

---

## 7. Generic lesson UI pieces asked for (where each one lives now)

| Piece | Board (default) | Old feed | AI chat |
|---|---|---|---|
| Tutor block | step card text + replies (`StepCard.tsx`, `RichView`, `MathBlock` for LTR formulas) | `TutorText.tsx` | `TutorMessage.tsx` |
| «ما نعرفش» help ladder | `LadderView.tsx` + `FillLine.tsx`: idea / solved example / method on our numbers with a fill line, then the full solution (D88; content `src/content/help/*.json`, checked by `src/content/help/checks.ts`) | `QuestionCard.tsx`: dashed «ما نعرفش» + authored hints (max 3) + answer at the end + deep dives | «ما نعرفش» chip in `InputDock.tsx` |
| Long-press ask | `AskProvider.tsx` + `Selector.tsx` -> `TeacherScreen.tsx` | `TutorText.tsx` + `LongPressMenu.tsx` (+ `AskField.tsx`, `TutorDrawer.tsx`) | free-text bar |
| Line-by-line writing | `Worksheet.tsx` via `LineEntry.tsx` (and `SoloSheet.tsx`); judged by the conductor (`src/method/lineChain.ts`, `exprLine.ts`, `mutations.ts`) | `LineInput.tsx` (method frames), `LinesCard.tsx` + `MathEditor.tsx` (`lines` steps) | `line` input |
| Paper / teacher screen | `PaperFirst.tsx`, `ExerciseTab.tsx`, `FoundTab.tsx` (write-up from his lines); `TeacherScreen.tsx` | `PaperSheet.tsx`; `ExamPaperScreen.tsx` (debug) | «الورقة» in the header |

Planned in COMPONENTS_LESSON_UI.md and their state: OptionsQuestion (built), TypedMathInput + MathKeyboard (built as LinesCard + MathEditor, later Worksheet), NumericKeypad (built), **OrderingQuestion (not built**: the `ordering` step kind exists in the schema but has no view and no content; plan ordering is done by PlanCards), DeepDive (built in the old feed; excluded from the board), LongPressMenu (built), AskField (built, canned answers), HintLadder (inside QuestionCard; the board's LadderView replaces it), **SkipChoice block (not built**: schema block `skip_choice` renders a fallback; optional-step skip exists), SelfReport (as a ChoiceCard), **ResultsDrawer / «نسلّم بيها» admit (not built**; `admit` event exists in the schema only; results are listed in PaperSheet / ExerciseTab), ProgressBar (old feed), JumpToCurrent (`jump.ts`). Content blocks `recap`, `self_report`, `skip_choice` and nested blocks fall back in the reducer ("not in Phase 1b").

---

## 8. How exercises reference components

Current exercises (`src/app/exercises.ts`): `src/content/exercises/bac2022c-ex2.json` (ex2-1.0.0), `bac2022c-sc-ex2.json` (exsc2-0.4.0), `bac2022c-ex4.json` (ex4-1.0.0), `bac2022p-sc-ex2.json` (p22sc2-0.1.0); help files `src/content/help/<id>.json`. Schema: `src/content/schema.ts`; loader `src/content/loader.ts`.

A component is always a **ComponentSpec** `{ "component": "<registered name>", "instanceId"?: "...", "props": { …JSON… } }` (`ComponentSpecSchema`, strict). Math values in props are engine ids or rationals that the schema recomputes; anything that disagrees is refused at load.

Where a spec can sit:
1. **Route extra stage** (inside a `method` step): `parts[i].groups[0].steps[1].extras[j].stages[k] = { "type": "component", "component": <spec>, "prompt"?: Rich }`. Example: `bac2022c-sc-ex2.json` `$.parts[1].groups[0].steps[1].extras[0]` (`x_area`, after `p_claim`):
   ```json
   { "type": "component",
     "component": { "component": "EventAreaModel",
       "props": { "source": { "kind": "urn", "reds": 4, "blacks": 6, "k": 3 },
                  "events": [ { "id": "B", "label": "B", "slices": ["s0"] },
                              { "id": "A", "label": "A", "slices": ["s1"] } ],
                  "overlays": ["complement"], "labels": "counts" } } }
   ```
   Others: sc-ex2 `$.parts[2]…extras[0]` BinomialExplorer (`x_explorer`); ex4 `$.parts[4]…extras[0]` FunctionPlot (`x_plot`).
2. **Repair variant stage**: `variants[n] = { id, kind: "alternative", forSteps: ["1/m1.c_ratio"], representation: "method:above_one", step: { kind: "mframe", frame: { type: "repair", stages: [ …, { "type": "component", "prompt": …, "component": { "component": "PartWholeBar", "props": { "whole": "7", "part": "14", "mode": "feedback" } } } ] } } }` (sc-ex2 `rep-1-above-one`). A misconception's `repairComponent` names the component; `src/method/repairRoute.ts` picks the variant drawn with it (old planner only).
3. **Block in a deep dive or variant intro**: `{ "type": "component", "blockId": "dd-cd-os", "trust": {…}, "spec": { "component": "OutcomeSpace", "props": { "showCount": false } } }` (sc-ex2 `deepDives[0].blocks[2]`; only visual components allowed).
4. **Exercise / similar-question figure**: `"figure": { "spec": { "component": "ProbabilityTree", "props": {…} }, "marks": { "<node>": ["a", "a.f"] } }` (`bac2022p-sc-ex2.json` `$.figure`, and `parts[i].groups[0].steps[1].similar[j].figure`; D63).
5. **Help ladder example**: `ladders[questionId]["<block>.<card>"].example.figure = <spec>` (`src/content/help/bac2022p-sc-ex2.json`, counts-mode ProbabilityTree).
6. **Component step** (old feed; none in current content): `{ "kind": "component", "component": <spec>, "prompt"?, "hints"?, "deepDiveId"?, "diagnoses"?, "optional"?, "fillsLaw"?, "solutionPhrases"? }` (used in fixture `src/content/fixtures/ex2.v050.json`).
7. **AI moves**: on the board, `tutor_move.component = { name, props_json, case_id }` (`src/ai/move/tool.ts`), only for urn questions (not tree, not analysis), from the per-question list in `src/ai/packs/notes.ts`; in the AI chat, `InputSchema` `component`. Both validated by `resolveSpec` and the reveal guard.

Current component use per exercise: `bac2022c-ex2` none; `bac2022c-ex4` FunctionPlot (1); `bac2022c-sc-ex2` 15 specs (EventAreaModel, BinomialExplorer on the route; Urn, OutcomeSpace x2, GroupBoxes in excluded variants / deep dive; PartWholeBar x2, VariableTable x2, SlotsPattern x2, RepeatedRuns x2, SpreadSlider in repairs); `bac2022p-sc-ex2` ProbabilityTree (8 + 15 in help).

---

## 9. What the engine computes (correctness is never generated)

| Module | Computes / checks |
|---|---|
| `src/engine/probability.ts` | urn outcomes, events, probabilities, laws, E, V (exact) |
| `src/engine/calls.ts` | engine calls content names: `outcomeCount`, `count`, `probability`, `choose`, `oneMinus`, `tree`, `lawSum`, `expectation`, `secondMoment`, `variance`, `smallestN`, `product`, `fnAt`, `limitAt`; set call `lawValues` |
| `combinatorics.ts`, `grouping.ts`, `coincidence.ts` | C, A, n!; boxes / slices; "wrong method gives the same number" guard |
| `distribution.ts`, `binomialSafe.ts`, `spreadChecks.ts`, `runs.ts`, `partWhole.ts`, `urnVariants.ts`, `calcLines.ts` | probability2 component maths (see section 2) |
| `tree.ts` | two-event trees: branches, paths, totals, reversed conditionals; authored-tree check |
| `procedures.ts` | known wrong procedures recomputed to trace a typed wrong value |
| `analysis.ts` | function registry, values, numeric derivative, Simpson integral, limit probe, parity, sign changes, sample equivalence |
| `expression/` | safe parser (whitelist tokenizer + recursive descent, no eval), evaluation, sample equivalence, typed counting notation C(a,b), A(a,b), n! |
| `src/method/*` | expected solution graphs per template, line chains, mutations (slips), factor bags, claims, card evaluators, standing checks |
| `complex.ts`, `sequences.ts` | **stubs** (nothing implemented) |

---

## 10. Docs vs code: gaps found

1. **`docs/COMPONENTS_CONTRACT.md` name list is out of date**: it lists 20 names and lacks the 10 probability2 names and the generic primitives; `contract.ts` has 36. Its Rule 10 was corrected (no Reanimated).
2. **`docs/COMPONENTS_PROBABILITY_V2_FINAL.md` status table is out of date**: it says SpreadSlider, RepeatedRuns, VariableTable, BinomialExplorer, EventAreaModel are "demos and tests only" and GroupBoxes / ChoiceProduct are on question 1's main path. Today: SpreadSlider, RepeatedRuns, VariableTable are in sc-ex2 repairs; BinomialExplorer and EventAreaModel are on the route (extras); ChoiceProduct is in no content and GroupBoxes only in the excluded `alt-1-s4-boxes` (D39).
3. **Props differ from the docs** (code wins): NumericTwin (`values[]`, `compare?`, no `value` / `checkFn`); ExampleGenerator (no `difficulty`); PredictReveal (`prompt` + `options`, not `prediction`; prediction not graded); CompareTwo (no `sharedParams`); BinomialExplorer (v2 props; no `target` / `threshold_found` of COMPONENTS_PROBABILITY.md §7); VariationTableBuilder (only `student_fill`; `reveal_by_exploration` became TangentSlope `showTable`); FunctionPlot (doc event `viewport_changed` not emitted: no events); EventAreaModel (no `labels: hidden`, no `ask`; events `event_selected` / `overlay_selected` instead of `mode_switched` / `prediction_entered`); ProbabilityTree (authored only; no `fill`, urn source, collapse; events `edge_filled` / `sum_entered` not built); UrnTemplate (own component with `parent {answer, wrong}`, not an ExampleGenerator extension); all probability2: no task `ask` mode.
4. **Extra events in code** not in the docs: EventPicker `attempts_exhausted`, LawBuilder `outcome_assigned` / `invalid_input`, LawChart `bar_tapped`, `expanded_toggled` on the analysis views, LawBuilder mode `progressive`.
5. **In code, not in the component docs**: ProbabilityTree's lesson-board figure system (`src/hybrid/figure.ts`, D56, D63) and help-ladder examples; the method frame inputs and the whole lesson board (documented in METHOD_* docs, DECISIONS D37-D94, not in COMPONENTS_LESSON_UI.md, which still describes only the old feed).
6. **Documented, not in code**: the 7 reserved names; TreeDiagram; all Suites and Complexes components; OrderingQuestion; SkipChoice; ResultsDrawer / admit; ExampleGenerator's urn templates as planned in C11 (done as UrnTemplate instead).
7. **`repairComponent` names with no variant to show**: misconceptions name ChoiceProduct (3), EventPicker (7), ComplementView (2), LawBuilder (1), FoldSymmetry (1), LimitExplorer (2), NumericTwin (2), SecantToTangent (1), TangentSlope (2), but no current variant is drawn with them, so the old planner finds no repair for those.
8. `docs/ARCHITECTURE.md` "Proposed structure" says the registry is in `components/index.ts`; it is `src/components/registry.ts` (metadata) + `ComponentHost.tsx` (views).
