# Method lesson: plan addendum (owner's changes, conformance, dry run)

Date: 2026-10-29. Status: ACCEPTED by the product owner together with `docs/METHOD_LESSON_PLAN.md` (the plan, copied unchanged). Where this addendum and the plan differ, **the addendum wins**. Resume rule: a fresh session reads `docs/METHOD_LESSON_PLAN.md`, this file and `docs/METHOD_LESSON_PROGRESS.md`, in that order, at the start of every phase.

Standing rules for the whole run (owner, verbatim in substance): EDIT mode; tests first; every launch `-devLlm off`; `npm run replay -- eval` never run; no commit, push, reset or clean; no new dependency; **never read or print `src/config/llmLocal.generated.ts`**; log progress in `docs/METHOD_LESSON_PROGRESS.md`.

Stop conditions (owner): a test failing twice after a fix; `npm run check` or `npm run check:release-dev` not green; an unexpected pixel change on an existing screen; a change to an existing test that is not on the plan's list, or any weakened assertion; a need to change lesson-engine code beyond the new step kinds (report it, do not patch); a student able to see an answer early; anything needing a model call, a key, a new dependency or a commit.

---

## A. The six changes

### A1. No role chips on the main path (replaces plan 3.2 and every "role" gesture)

- The student writes a line and presses ONE submit (✓). The engine infers the line's node from **value and structure** (plan 4.2 scoring without the role term; the `+1 current plan card` term stays).
- "What does this line count?" is asked **only when two nodes could fit** and the candidates belong to different plan cards: a choice card whose options are the plan cards' own coarse texts plus "something else". If the candidates belong to the same plan card the app does not ask; it gives the generic line (credit needs one correct node, and correct values within a question are distinct, so only a wrong value can be ambiguous).
- The words "part" and "combine" (and their French and Arabic equivalents) must not appear to the student, because they hand out the decomposition. A loader scan over every student-facing string of a method block rejects a fixed list (`part`, `combine`, `partie`, `combiner`, «جزء», «نجمّعو», «نجمع الأجزاء»). Internally the enum stays `total | part | combine | result | check` and is logged; it is never displayed.
- Credit lines name what a line counts ("this counts the draws, order not mattering"), never its role in the decomposition. Findings and the sheet may use a node's label after the student has found it.
- Consequence for the budgets: the tap column of the fast path is the plan's design B (role inferred): 13 to 15 taps, 8 acts. Design C (role chips) is dropped.

### A2. Scope

DEFERRED (not built, not started): the cold-test **generator** (`generateColdQuestion`), the "My methods" page and its storage, the free-text note. KEPT: the guard spec and its tests (pure `coldGuards` / `twinOk` functions with tests on the real coincidences of plan 8.7), the recipe builder, the strip and sheet, the paper skeleton, and ~~ONE authored cold question for question 1~~ **superseded by section E (25): TWO authored similar questions per question, without help**.

The authored cold urn must pass every guard (run as a test on that urn) and must not be 5 red 6 black (it fails two guards: P = 75/165 = 5/11 = reds / balls, and 5/11 is built from the statement's numbers), nor 4 red 5 black or 5 red 4 black (the owner's paper tests), nor 4 red 6 black, 3 red 4 black or 3 red 5 black (used in this exercise). The urn is chosen in the cold-question stage (not in the playable slice) from the urns that pass; the measured passing set is in plan 8.7 and is recomputed by the guard test.

### A3. Repair test cases

- **R3 (own claim on a new case): 3 balls out of 5** (10 groups, 60 ordered; "always x2" predicts 30 groups, the list gives 10; each group is written 6 ways; 60 / 10 = 6).
- **R2 (small box): a 3-ball box taken 2 at a time, on purpose** (ordered 6, groups 3, where "always x2" is true because 2 = 2!). A `discover` twin may carry k = k! on purpose; a `distinguish` twin (plan help, R3's test case, the cold question) must not (schema field `purpose`, plan 2.2).
- **Act counting corrected (plan 5.3):** an act is a reducer action. A list builder (chip adds, marks, duplicates) is component-internal like keypad keys: only its commit ("that is all", the `explored` gate) is an act. So R2 = accept 1 + list gate 1 + the ordered line 1 + the relation typed 1 = **4 acts**; R3 = accept 1 + claim pick 1 + list gate 1 + the ordered line 1 + the surviving claim 1 = **5 acts**. The **tap column is reported beside it, and R3's is large**: 10 groups x (3 marks + add) = about 40 taps plus the other acts. This is the risk of the 3-out-of-5 decision; options if it is too long for a student: the guided mode (choose the first ball, the rest follows), a counts-only mode with the ladder, or a 3-out-of-4 box (rejected by the "3 of 4" guard). To be measured and reported at the R3 stage, not in the slice.

### A4. Conformance table and dry run

Sections B and C below.

### A5. Phasing (replaces plan section 9)

1. **Phase 1, engine** (plan 9.1, minus the cold generator and findings): decisions D37 to D45, schema and loader validation, E1 line chain, E2 factor form and readback, E3 mutations (no role term), E4 graph builder (generic over j, including 0 and one colour), E5 checks, E6 claims, `coldGuards` and `twinOk` (guards only), the `mut.*` library, thresholds, the `consult.ts` exclusion with its test, the replay mapping with a replay-equals-live test. **E8 findings, the paper fill and the generator wait.**
2. **Phase 2, components and shell** (plan 9.2), limited to what the slice needs: `LineInput` (pad, one submit, readback row, disambiguation card), `PlanCards`, `StatementTap`, the `plan`, `read` and `mlines` step kinds in the reducer and `QuestionCard`, `MethodStrip`, `MethodSheet` (roadmap only), demos appended at the end of the demo lists, debug-only `-devMethod` support. `CheckCard`, `ClaimCards`, the `repair` step kind, `RecipeBuilder`, `PaperSkeleton` and findings wait.
3. **PLAYABLE SLICE of question 1, then STOP for the owner to play:** the plan cards, the read tap, the **total frame** with line input, mutation messages and readback, and the strip and sheet with the roadmap. **Not started until the owner says so:** the favourable frame, the divide frame, the checks as cards, the repairs, the recipe, the paper skeleton, the cold question.

The slice is a real, loadable `exsc2-0.4.0` question 1 in which the later frames are present as **not-yet-built steps** (the roadmap lists them as upcoming; after the total frame is credited the slice ends with the existing closing line). The exact shape (which old steps remain reachable) is decided in the slice stage and logged; the old main path is NOT left reachable beside the new one.

### A6. Answers to plan section 11.2

| # | Answer |
|---|---|
| 1 | **Acts**, tap column reported. Fast path 8 acts (plan 1, read 1, five lines, recipe 1); the recipe counts. |
| 2 | Remove `urn`, `s2`, `compare`, `s3` from the main path. A static urn may stay inside the statement card with no act (no gate, no interaction). |
| 3 | 3 red 5 black for plan help **with the printed allowance** (30 and 15). Prefer a no-collision urn if an equally good one exists (see section D). |
| 4 | Keep `alt-1-s4-boxes` as a repair. |
| 5 | Bare numbers are credited as **unexplained**. |
| 6 | The paper step has no act of its own. |
| 7 | (role chips) dropped, see A1. |
| 8 | Readback **R-B** (confirm only on ambiguity). |
| 9 | Both keys are exposed and to be **rotated by the owner**. |
| 10 | Cold test after the recipe, one attempt, no help. |
| 11 | The free-text note is dropped. |
| 12 | Replace the `alt-1-s6-choice` twin (its answer 12 equals the black part's `n_times_k` mutation value). |

---

## B. CONFORMANCE TABLE: the owner's 27-screen simulated lesson against the new question 1

The simulation used urn 3 red 5 black as the learning urn, then a cold urn. The new question 1 is 4 red 6 black. "Frame" = an expanded step (`m1.plan`, `m1.read`, `m1.c_total`, `m1.c_fav`, `m1.c_ratio`). **Slice** = in the playable slice; **later** = after the owner's go.

| Screens | What the owner did | Reproduced by | Status |
|---|---|---|---|
| S1 | Plan cards in a shuffled order; "I don't know" accepted | `m1.plan` (seeded shuffle, dependency order accepted); "ما نعرفش" opens R1 plan help (worked plan on the 3 red 5 black twin, other numbers) | Slice (R1 itself later: until then "ما نعرفش" gives the frame's hint ladder) |
| S2 | Total as a line; wrote `8+3` as the start | `m1.c_total`, mutation `start_number_off` (`(8+3)` kept as one factor by the factor bag) with the neutral "this line starts the product at a number that is not the number of balls" style message | Slice |
| S2 to S3 | Ordered product `8x7x6` | A line whose value is the ordered count is a **supporting node** of the total (accepted, named "the draws where order matters", the card stays open). Typed as the final total it is `drop_division`; the units check catches it later when it is divided into a group count | Slice (support node + `drop_division`); units check later |
| S3 | Generalised the product to 4 draws | A claim, not a graded line: R3 (own claim, 3 out of 5) | Later; not on the main path |
| S3 to S4 | Tested his rule by listing the pairs of a 4-ball box; forgot the whole d group (9 instead of 12) and fixed it himself | R2 list builder with the "something is missing" ladder (level 1 identical whatever the number missing, the `SlotsPattern` rule); `12 vs 9` is this list check. Box differs: 3 balls taken 2 at a time (A3) | Later |
| S5 to S7 | Stated his own rule (order matters: ab and ba differ; if not, same); listed unordered pairs (6); related 12 and 6 | R2 relation step and the claim cards (claim sentences chosen from cards, with their condition). The sentence is a card, not his own words (no free text in v1) | Later; **partly**: own words are not reproduced |
| S8 to S10 | "Always x2"; tested on 3 balls from 4 (predicted 12, list gave 4); found each group is written 6 ways, 24 / 6 = 4 | R3 with the over-general card "always x2"; the engine computes the prediction on the new case (3 out of 5: 30 predicted, 10 listed), the falsification is logged `own_rule_falsified` as a good event; "abc has 6 orderings" is the 6 | Later; **case differs** (3 out of 5, owner's change A3) |
| S11 | Real box: `336/(3x2x1) = 56` with the reason in words | `m1.c_total` accepts `10*9*8/(3*2*1) = 120`; the reason is the finding's authored text in the sheet, not the student's words | Slice for the line; **the reason in words is not reproduced** (no free text, no model) |
| S12 to S14 | "I don't know" at the favourable count; sub-plan on a small box; found the decomposition (one red + two blacks); wrote the red part as `1` (`R1 R2 = 1`) and the black part `(4x3)/(2x1) = 6` | `m1.c_fav` "ما نعرفش" -> hints, then the existing deep dive `dd_and_times` / the simpler twin `sim-1-onered-1` (rebuilt as a mini `method` on the twin urn: the same frame kind, data only). `1` for a one-ball choice is `over_generalised_order_rule` (R7). `(4*3)/(2*1)` is the black part node | Later; **the "sub-plan" is the twin mini-method, not a bespoke construct** |
| S15 to S17 | Listed the red choices (2); combined `12 = 6x2` with no reason; verified by listing (R1 with 6 pairs, R2 with 6) | The combine check (H, R4: list the draws of one red with every black pair). **Gap:** in the plan the check fires only when the line cannot be explained by the student's own credited lines or the operator is not ×; his `6*2` followed his own lines, so it would NOT fire. Reproducing the simulation exactly needs a reason card at every combine (+1 act, fast path 9). Owner decision B1 below; default: do not require | Later; **differs by default** |
| S18 to S19 | Lines `3x1` and `5x4` (missing `/(2x1)`); saw the difference by comparing his two lines; fixed to 10 | `3*1` credited (factor bag `{3}`); `5*4` is `drop_division` at the black-part node, confirmed form. **New feature added here:** for `drop_division`, `ordered_instead_of_groups` and `one_factor_divided`, when the student has an earlier credited line that divides by an orderings group, the message shows **his own two lines side by side** ("compare your two lines") and asks what each counts. Only his own lines, no new number | Later; the compare row is new and is in the Phase 3 list |
| S20 to S21 | `56/30 = 28/15` above 1; asked "can this be a probability?"; swapped to `15/28` | `m1.c_ratio`: `swap_numerator_denominator` + the above-one check (F) with `PartWholeBar` (`alt-1-s8-partwhole`) | Later |
| S22 | Recipe in his own words (no numbers), shown beside a clean card | `RecipeBuilder`: sentence cards (3 to 5, with distractors), shown beside the clean card. **His own words are not reproduced** (note dropped, A2); "saved in My methods" is deferred | Later; **partly** |
| S23 to S24 | Cold 5 red 6 black: total counted ordered (990) with favourable as groups (75) | The units check (R6) on the cold question; the authored cold urn is **not** 5 red 6 black (A2) | Later; **urn differs** |
| S24 | "Fixed with his recipe" | The recipe is not reopenable during a cold test (no cards, no pictures, no hints) and "My methods" is deferred. The review after the attempt may show the recipe card | Later; **differs** |
| S25 to S26 | `990/3*2*1 = 660` (left to right); `990/(3*2*1) = 165` | Readback R-B on the first line (grouped or literal); literal = `bracket_left_to_right`, confirmed grouped = `bracket_fixed_by_readback` logged | **Slice** (total frame) |
| S26 to S27 | `75/165`; `25/55` not simplified; `5/11`; paper filled from his own lines | The result line, `unsimplified` + the simplify check, the target check; the paper skeleton fills only from his credited lines | Later |

**Not reproducible in v1 by design:** his own sentences (cards only), the recipe in his own words, listing on paper (the app uses chips), a recipe reopened in a later question (My methods deferred).

**Owner decision B1 (default stated):** should every combine line carry a reason card (the simulation's S15 to S17 behaviour, fast path 9 acts) or only unexplained ones (default, fast path 8)?

---

## C. SECOND-QUESTION DRY RUN: question 2 and question 3 written as data

Criterion: authored with data only, plus at most a picture. Below, each question is written in the model of the plan (abbreviated JSON), then **every place that would need new lesson-engine code** is listed.

### C1. Question 2: P(B), "no red" (urn 4 red 6 black, 3 together)

```jsonc
{ "id": "2", "goal": { "fr": "Calculer la probabilité de l'événement B : « Obtenir aucune boule rouge »." },
  "expected": "p_B_1_6", "uses": ["p_A_1_2"],
  "groups": [ { "id": "count", "steps": [
    { "id": "m2", "kind": "method", "skills": [ "event-vs-complement", "probability-by-counting" ],
      "plan": { "cards": [ { "id": "c_total", "yields": ["total"] },
                           { "id": "c_fav",   "yields": ["fav"] },
                           { "id": "c_ratio", "needs": ["c_total", "c_fav"], "yields": ["result"] } ] },
      "read": { "inherits": "1/m1.read" },
      "graph": { "template": "urn_exactly_j", "args": { "j": 0 },
                 "nodes": { "total": { "carried": { "from": "1/m1.total" }, "bareOk": true },
                            "result": { "wrongValues": [ { "value": "1/2", "misconceptionId": "b_as_complement_of_a" },
                                                         { "value": "5/6", "misconceptionId": "at_least_one_instead_of_exactly" } ] } } },
      "checks": [ { "id": "units" }, { "id": "simplify" }, { "id": "target", "none": true } ],
      "repairs": [ { "id": "r_event_area", "opensOn": [ "b_as_complement_of_a" ], "twin": { "reds": 2, "blacks": 3, "k": 2, "j": 0, "purpose": "distinguish" },
                     "stages": [ { "kind": "component", "component": "EventAreaModel", "props": { "source": "urn", "overlays": ["complement"] } },
                                 { "kind": "choice", "answer": { "type": "complement", "of": "A" } },
                                 { "kind": "line" } ] } ],
      "recipe": { "pool": [ "..." ] } } ] } ] }
```

Places that need new lesson-engine code, and how the Phase 1 design avoids them:

| # | Place | Needs new lesson-engine code? | Phase 1 design requirement (so that the answer is "no") |
|---|---|---|---|
| Q2-1 | The graph for `j = 0`: no red part, no combine; favourable = `C(6,3)` as one product | **No, if** `buildUrnGraph` is generic over the colours with a non-zero count (parts = nonzero colours; a combine node only when there are two parts) | Test: `j = 0` gives `total`, `fav`, `result` only; one colour urns work |
| Q2-2 | `read` is not asked again (order is inherited from question 1's statement fact) | **No, if** the schema has `read: { inherits }` (optional) and the facts live per exercise statement, not per frame | Schema member designed now |
| Q2-3 | Reusing question 1's total ("from the sheet") | **YES (1 place)**: a node `carried` from an earlier part needs the value (engine recomputes it: free) AND the sheet to show the earlier finding, which lives in a **different session** (a new session id per part). The value part is data; the sheet part is `findings.ts` reading stored history (`withHistory` pattern, about 10 lines) or `Question.expected` becoming a list so the acquired result is a "proven result" tag | Reported at the Q2 stage; if it cannot be avoided it is the finding the criterion exists to surface |
| Q2-4 | The slip `1 - P(A) = 1/2` | No: `wrongValues` on the result node (authored value rows exist today: `wrongAnswers`) | none |
| Q2-5 | The picture: `EventAreaModel` (exists, `complementIsOther`) | No: a picture | none |
| Q2-6 | A repair that is a script of stages (component, choice, line) | **No, if** `stages` is a closed vocabulary of existing stage kinds and `kind` of a repair is a label, not an enum member that needs code | Repair `kind` is a free id; stage kinds `component | choice | line | claim | typed` exist from Phase 3 |
| Q2-7 | Checks `units`, `simplify`, `above_one`, `target` | No: generic, already built | none |
| Q2-8 | Similar question "twist" for question 1 (no red, `j = 0`) | No: same template, args changed | none |
| Q2-9 | Similar question "twist" for question 2: **"at least one red"** (owner, section E) | **Domain-engine addition, not the reducer:** a graph branch `event: at_least` (total, no-red count, complement, result) and two mutation ids (`forgot_one_minus`, `exactly_instead_of_at_least`) with tests and `mut.*` texts. Data otherwise | Graph builder dispatches on `event.kind` through a registry |

Result: **0 lines of lesson-engine code if Q2-1, Q2-2, Q2-6 are designed in now; 1 place (Q2-3) otherwise unavoidable** (cross-session carry-over); plus the domain-engine addition Q2-9 (the "at least one red" twist).

### C2. Question 3: binomial (n repeats with replacement, X = number of "exactly one red")

3.a data sketch:

```jsonc
{ "id": "3a", "kind": "method", "skills": [ "independence-replacement", "binomial-recognize", "binomial-law" ],
  "plan": { "cards": [ { "id": "c_recognise", "yields": ["conditions"] },   // card choice: repeated, same p, independent, two outcomes
                        { "id": "c_sequence",  "needs": ["c_recognise"], "yields": ["one_sequence"] },
                        { "id": "c_count",     "needs": ["c_recognise"], "yields": ["sequences"] },
                        { "id": "c_law",       "needs": ["c_sequence", "c_count"], "yields": ["law"] } ] },
  "read": { "targets": [ { "token": "remettant", "effect": { "replacement": true } } ] },
  "graph": { "template": "binomial_term", "args": { "n": 3, "p": "1/2" } },        // the instance n = 3, then the law for any n by formula cards
  "claims": [ { "id": "independent", "cards": [ "..." ] } ],
  "repairs": [ { "id": "r_tables", "stages": [ { "kind": "component", "component": "SlotsPattern" },
                                               { "kind": "component", "component": "VariableTable" } ] } ] }
```

3.b: `binomial_moments` template: mean of one trial = p (line `1÷2`), n trials by adding (line `1÷2+1÷2+1÷2 = 3÷2`), spread through distances and contributions (`SpreadSlider` as repair), then E(X) = n/2 and V(X) = n/4 as formula cards.

Places that need new lesson-engine or schema code:

| # | Place | New lesson-engine code? | Notes and mitigation |
|---|---|---|---|
| Q3-1 | **`LineInput` has no letters**, so a line cannot contain `n` or `k`: the law `C(n,k)/2^n`, `E(X) = n/2`, `V(X) = n/4` cannot be typed | **YES (schema, loader, `onAnswer` choice branch)**: a choice whose options are **formulas checked by the engine** (numeric equivalence at sample n, k with the safe parser, variables `n`, `k`), i.e. a new answer type `formula_option`. Letter keys are excluded by the brief | The main report item for Q3 |
| Q3-2 | The question is symbolic (n >= 2), the lines are numeric | **YES (1 place)** unless done as data: bind `n = 3` for the guided path through `graph.args` (data) and generalise by the formula cards of Q3-1; the paper skeleton shows the exam's general text | If `args.n` binding is in the Phase 1 schema, this is data |
| Q3-3 | Graph templates `binomial_term`, `binomial_moments` (nodes, forms, units) | Domain engine addition (a template function + tests), not the reducer. Reported separately | `buildGraph` dispatches on `template` through a registry |
| Q3-4 | New mutation ids: forgetting `C(n,k)`, forgetting `q^(n-k)`, using `p` for the sequence, `n` for the mean, `np` for the variance, `X` counting red balls | Domain engine additions (mutation registry entries + tests + `mut.*` texts) | About six ids |
| Q3-5 | New check ids `symmetry` and `sum_is_one` | Domain engine additions (the predicates exist in `engine/distribution.ts`: `isSymmetric`, `sumIsOne`); the `CheckSpec.id` must come from a registry, not a closed zod enum in the loader | Registry |
| Q3-6 | Claim predictions about sequences ("p stays the same each trial") | Data **if** a prediction is an engine call; needs a `binomialPmf` entry in `engine/calls.ts` `ENGINE_CALLS` (one registry line) | Define `ClaimCard.prediction` as an `EngineCall`, not a closed union |
| Q3-7 | Pictures: `SlotsPattern`, `VariableTable`, `SpreadSlider`, `BinomialExplorer` | None (all exist, `offeredToPlanner: false`) | none |
| Q3-8 | Cold question for question 3 | Domain engine addition (a binomial cold template) | deferred like all cold generation |
| Q3-9 | `Fraction` overflow for n up to 15 with tenths | Already guarded by `binomialSafe` in the loader | none |

Result: Q3 needs **1 certain lesson-engine/schema addition (Q3-1, `formula_option`)**, **1 avoidable one (Q3-2)**, and about **9 domain-engine additions** (templates, mutation ids, check ids, one engine-call entry), with **no new picture**. Under the owner's criterion Q3 does **not** pass strictly (Q3-1). That is reported now so the formula-option question is decided before Phase 5; the Phase 1 schema is designed so that Q2 can pass.

---

## D. Plan-help urn: a no-collision alternative

The owner prefers a no-collision urn if an equally good one exists. Measured (role-aware guard, k = 3, exactly one red, exercise-wide forbidden set including question 2's 20 draws and 1/6): the small urns either reuse a number already used in question 1 or in the repairs (3 red 4 black = the picture twin with 35 and 18/35; 2 red 5 black has 20 favourable = question 2's count; 3 red 3 black has total 20 = question 2's count). No small urn with a smaller total than 3 red 5 black is free of collisions. **Default stays 3 red 5 black with the printed allowance (30, 15)**, confirmed by the owner (A6 item 3); the guard test prints the allowance and the search is rerun in Phase 1 with the final forbidden set in case one equally good urn exists.

---

## E. NEW PRINCIPLES (owner, 2026-10-29, after the first Phase 1 module): apply to the playable slice and to every later phase

**(20) Opening card per question.** The route in 4 short lines (plan, count, check, write on paper), then a closing line "then a similar question alone", and one line on how help works ("ما نعرفش" shows a smaller example). **No math steps in it:** no digit, no formula, no node value, no method word (loader scan). It is a **non-blocking feed block** placed directly above the plan question card, so it costs **0 acts** (a blocking "start" tap would make the fast path 9 and a wall-of-text screen would break rule 7). Owner can overrule: default stated, question E-Q1.

**(21) Plan-card header data: `now` (what), `why`, `next`.** Authored per plan card, plus a one- or two-word `short` name used by the narration. Shown by **the strip** (line 1 "now", line 2 "next"; "why" one tap away in the sheet) and by a **one-line header on each frame** ("now, why"). The sheet's roadmap lists all three per card. A header **never contains a node value (no digit) or the how**: the loader scans every header string for digits, for the banned words of D41 (`part`, `combine`, ...) and for a data list of how-words (orderings, `k!`, choose, `C(`, divide-by-the-orderings and their Arabic and French equivalents). The coarse plan-card text (which the student orders) may say "divide the wanted draws by all the draws"; the header repeats that level, nothing inside "count".

**(22) Tell the map, let him find the inside.** The coarse plan cards stay as designed. After he orders them, **one line states the reason for the order**, generic and **derived from the card dependencies** (`needs`): "‹card› comes after ‹cards›, because it uses their results" in Arabic with the cards' `short` names ("divide last, because it needs both numbers"). The decomposition inside "count favourable" and every calculation stay his.

**(23) Recap line after each credited plan card.** "What he found, what is next", generic, built from the card `short` names (found ‹short›; next ‹next short›). **No number unless it is his own correct line**, which may follow as a math block of his own credited line (`toLatex` of what he typed), never a recomputed value.

**(24) Method card at the end of a question.** Lists the steps to solve this TYPE of question plus the standing checks, **shown beside his own recipe** (the clean recipe card of plan K, authored as `methodCard { type, steps[3..5], checks[] }`, no numbers).

**(25) SCOPE CHANGE: two similar questions without help replace the single cold question.** For each question: (a) **same structure, new numbers**; (b) **same structure with a twist**: for question 1 the twist is question 2's event ("no red", `j = 0`); for question 2 a different event, **"at least one red"**. Each is reviewed after the attempt: his lines credited, slips labelled by mutation id (neutral names). The cold-test **generator** stays deferred; **both similar questions are authored for now** and **must pass the coincidence guards** (`coldGuards`, run as a test on each authored urn; not 5 red 6 black, 4 red 5 black, 5 red 4 black, and not any urn used in this exercise). They come after the recipe and the method card (route: plan, count, check, write on paper, then a similar question alone). They have their own budget (no help, no hints, no cap on lines, none counted in the 8).

### E1. Data-model additions (all optional where an existing exercise would not have them)

```ts
// src/method/schema.ts additions
PlanCard.short  : RichSchema                        // "الكل", "المطلوب", "القسمة"  (1-2 words)
PlanCard.header : { now: RichSchema, why: RichSchema, next: RichSchema }   // loader scan: no digit, no banned word, no how-word
MethodStep.opening : { route: RichSchema[4..5], help: RichSchema }          // 4 route lines (+ the "similar question alone" line) + the help line
MethodStep.narration : { reasonOrder: Template, recap: Template, nextLine: Template }   // i18n fragments + card shorts; generator in src/method/narration.ts
MethodStep.methodCard: { type: RichSchema, steps: RichSchema[3..5], checks: RichSchema[1..4] }
MethodStep.similar : [ SimilarSlot, SimilarSlot ]                           // exactly two: 'same_structure' and 'twist'
SimilarSlot = { id, kind: 'same_structure' | 'twist', statementFr: string, urn: { reds, blacks, k },
                event: { kind: 'exactly', j } | { kind: 'none_of_colour' } | { kind: 'at_least', j },
                graph: GraphSpec, expected: 'recomputed by the engine' }
```

`narration.ts` (pure): `reasonForOrder(cards)` from `needs` edges (only cards with a non-empty `needs` produce a clause; the order of clauses follows the plan), `recapLine(card, nextCard, studentLineLatex?)`, `stripLines(card, nextCard)`. All text comes from i18n fragments and the cards' own `short`/`header` strings; no card text is invented by code, and no number is ever inserted except the student's own credited line.

### E2. Engine and dry-run consequences

- **Q2's twist "at least one red" is a new event shape.** The graph builder needs `event: at_least` (nodes: total, the no-red count `C(6,3)`, the complement, result = (total − no-red) / total or 1 − no-red / total) and two new mutation ids (`forgot_one_minus`: the no-red probability given; `exactly_instead_of_at_least`: P(exactly one) given). Domain-engine additions (a template branch and mutation entries with tests), **not lesson-engine code**; reported in the Q2 dry run (row Q2-9 below).
- The guards for a twist urn also check the twist's own coincidences (`1 − P` equal to a value already shown, for example 5/6 which is a known wrong value of question 1's P(A)).

### E3. Tests that change or are added (none weakened)

| Test | Change |
|---|---|
| `narration.test.ts` (new) | the reason line is derived from `needs` only; same cards in another order give the same sentence; a card without `needs` adds no clause; the recap holds no digit unless a student line is passed, then only that line's LaTeX |
| `headers.test.ts` (new) | every `now / why / next / short` string of the authored cards has no digit, no banned word, no how-word; the same scan rejects a planted bad header |
| loader tests (new) | `opening` has 4 or 5 route lines plus the help line, no digit and no formula; `methodCard` has 3 to 5 steps and at least one check; `similar` has exactly two slots, the twist differs from the main event |
| `coldGuards` tests | now run on the **two authored urns of each question** as well as on the real coincidences |
| strip tests (new, Phase 2) | the strip shows "now" and "next" for the current card, the sheet shows now, why and next, the frame header shows "now, why"; all follow the current card |
| budget test | the opening card is not an act (0), the reason line and the recap are not acts, the similar questions are not counted in the 8 |
| `scEx2.*` tests (Phase 3, already listed in plan 7.2) | the "cold question" assertions read "two similar questions" |
| `i18n.test.ts`, `contrast.test.ts` | new keys in both locales, new pairs for the strip lines |

### E4. Strings added to the D41 teacher table (all `reviewed: false`; each entry will say where it appears and what it must not reveal)

1. Opening card: 4 route lines, the "similar question alone" line, the help line («ما نعرفش» shows a smaller example). Must not reveal: any number, the method inside "count".
2. Per plan card (3 cards for question 1): `short`, `now`, `why`, `next`. Must not reveal: any value, the orderings, the choose notation.
3. Narration fragments: the reason-for-order template, the recap template, the "next" template, the strip labels "now / next / why".
4. Method card: the type label, 3 to 5 steps, 1 to 4 checks.
5. Similar questions: two French statements (exam style) per question, and the review labels (neutral mutation names).

### E5. Playable slice (replaces the slice list of A5 point 3)

The slice now includes: **the opening card, the strip with now / why / next, the reason-for-order line (after the plan is ordered), and the recap line (after the total frame is credited)**, on top of the plan cards, the read tap, the total frame with line input, mutation messages and readback, and the sheet with the roadmap. Still not started until the owner says so: the favourable and divide frames, the checks as cards, the repairs, the recipe and method card, the paper skeleton, the two similar questions. No other scope change.

### E6. Questions for the owner (defaults)

- **E-Q1.** Opening card non-blocking (0 acts). *Default: yes.*
- **E-Q2.** Which surface shows which of now / why / next. *Default: strip = now + next; frame header = now + why; sheet = all three.*
- **E-Q3.** The strip becomes two lines (about 52 pt instead of 36). *Default: accept, to be measured at 402, 390 and 360 pt.*
- **E-Q4.** The twist for question 2 ("at least one red") is a new graph branch (domain engine, not the reducer). *Default: accept and report it in the Q2 stop.*
