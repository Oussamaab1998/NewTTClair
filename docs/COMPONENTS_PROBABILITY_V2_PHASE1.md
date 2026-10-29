# Probability visual components v2: Phase 1 report (engine and primitives, tests only)

Date: 2026-10-27. Plan: `docs/COMPONENTS_PROBABILITY_V2.md`; decisions: `docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md` (wins where they differ).
No model call (`-devLlm off` on every launch, `npm run replay -- eval` never run), nothing committed, no component started (A1 has not begun).
Labels: **[tests]** = checked by Jest on Node, **[sim]** = looked at or diffed on the iOS simulator, **[read]** = from reading code, **[not checked]**.

## 1. What was built

| Module | Exports | Tests | Status |
|---|---|---|---|
| `src/engine/rational.ts` (`choose` fixed) | `choose` | in `combinatorics.test.ts` | [tests] exact for every pair whose result fits 2^53, an `EngineError` otherwise; equal to BigInt for all n <= 60 |
| E1 `engine/combinatorics.ts` | `factorial` (n <= 18), `arrangements`, `pascalRow`, `orderingsPerSet`, `outcomeCountOf(draw,n,k)` by formula, `enumeratePatterns` (SSFF, SFSF, ..., cap 20 000), re-export `choose` | 27 | [tests] |
| E2 `engine/rationalFormat.ts` | `ratToString` (U+2212), `ratToLatex`, `ratToDecimal` (exact, French comma, null if endless), `parseRat`, `RatSchema` (string form), `sameRat`, `isInteger`, `mulInt`, `floorRat`, `minRat`, `maxRat`, `sumRat` (least common denominator) | 22 | [tests] |
| E3 `engine/grouping.ts` | `listBoxes`, `orderingsOfBox`, `sliceCountsFor` (formulas, no limit), `boxesInSlice` (lazy), `groupByKey` (enumerating reference) | 18 | [tests]: 4R 6N: 120 boxes of 6 = 720; slices 20/60/36/4 (simultaneous), 120/360/216/24 (ordered), 216/432/288/64 (with replacement); equal to enumeration on 60 random urns |
| E4 `engine/distribution.ts` | `spreadFrame` (distance, square, contribution, total), `distMean/SecondMoment/Variance`, `bernoulliDist`, `binomialLaw`, `isSymmetric`, `sumIsOne`, `lawFromPatterns`, `patternWeight`, `allPatterns` | 17 | [tests]: p = 3/10: 3/10, 7/10, 9/100, 49/100, 63/1000, 147/1000, total 21/100 = 0,21; total = p(1-p) on a 1/20 grid; same-mean laws 2/3, 1, 0; Ex2 law E = -1/10, V = 89/100 |
| E5 `engine/runs.ts` | `repeatedRuns` (exact counts, reports the stage that is not whole), `cellsForStage` (contiguous), `tally` (S = sum runs x X, average = S/N) | 17 | [tests]: N = 36, p = 1/6: 36, 6, 1; 36 at 1/5 rejected (stage 1, 36/5); nothing reads `Math.random` |
| E6 `engine/coincidence.ts` | `wrongMethodValues`, `coincidences`, `assertNoCoincidence`, `evaluateAtRational`, `distinctAtGrid` | 21 | [tests]: a + b = a x b only for 2 and 2; 1 + 2 + 3 = 1 x 2 x 3; k = k! for k = 1, 2; p(1-p), p^2, p/2, (1-p)^2 all 1/4 at p = 1/2; 4 x 15 = 60 with 19, 24, 120, 48 named |
| E7 `engine/expression/counting.ts` | `normalizeCounting`, `parseCountingAnswer`, `substituteSymbols`, `checkTypedCount` | 59 | [tests]: C(a,b), C(a;b), C_a^b, C^b_a, sub/superscript digits, A(a,b), a!, (expr)!; C62 refused; the parser files are not edited |
| E8 `engine/binomialSafe.ts` | `binomialSafe`, `maxSafeN`, `checkBinomialGrid` | 21 | [tests] |
| `engine/calcLines.ts` (change 4) | `productLine`, `sumLine`, `divisionLine`, `chooseLine` (C_{6}^{2} = 15), `arrangementLine`, `factorialLine` | 5 | [tests] every line parses with the native math subset |
| E11 `components/probability2/finding.ts` | `FindingPayloadSchema` (with `calc`, `how` incl. `skipped`), `ExploredPayloadSchema`, `makeFinding`, `makeExplored` | 23 | [tests]; accepted by the real `EventSchema` / `EventLog` |
| E11 `components/reveals.ts` | `RevealRule`, `revealedByRules`, `hintAllows`, `hintLevelOf`, `completeReveals` | 20 | [tests] |
| E11 `components/probability2/countInteractive.ts` + `names.ts` | the 60-element counter (test helper), the list of v2 components (empty) | 6 | [tests] |
| E11 registry / planner / guard | `Entry.reveals`, `Entry.offeredToPlanner`, `isOfferedToPlanner`; `plannerComponents` skips `false`; `revealing.ts` reads declared `reveals`; `CatalogMeta.reveals` | 7 + 6 + 2 | [tests] planner suites unchanged and green |

Docs: `COMPONENTS_PROBABILITY_V2_DECISIONS.md` (new, verbatim), COMPONENTS_CONTRACT rule 10 (Reanimated sentence corrected), CLAUDE.md stack line, DATA.md (`explored`, `finding`, string rationals), DECISIONS D36.
Tools (untracked): `tools/screens/{capture,diff,png}.js` + README, no dependency, lint-clean.

## 2. The `choose` fix (measured against BigInt, all n <= 60, 1 891 pairs)

| | before | after |
|---|---|---|
| exact | 1 812 | 1 841 |
| silently wrong | **2**: C(59,22) = 8 964 377 427 999 631 and C(59,37) = 8 964 377 427 999 631; BigInt 8 964 377 427 999 630 | 0 |
| throws although the result fits 2^53 | **27** | 0 |
| throws because the result exceeds 2^53 (correct) | 50 | 50 |
| value changed among the pairs that were already right | | 0 |

The 27 that threw, now exact: C(55,26) = 3 560 597 348 629 860, C(55,27) = 3 824 345 300 380 220, C(55,28) = 3 824 345 300 380 220, C(55,29) = 3 560 597 348 629 860; C(56,23) = 3 167 295 784 216 200, C(56,24) = 4 355 031 703 297 275, C(56,25) = 5 574 440 580 220 512, C(56,26) = 6 646 448 384 109 072, C(56,27) = 7 384 942 649 010 080, C(56,28) = 7 648 690 600 760 440, and their mirrors C(56,29..33); C(57,22) = 3 489 348 548 829 780, C(57,23) = 5 309 878 226 480 100, C(57,24) = 7 522 327 487 513 475 and C(57,33..35); C(60,19) = 2 044 802 197 953 900, C(60,20) = 4 191 844 505 805 495, C(60,21) = 7 984 465 725 343 800 and C(60,39..41).
Cause: the old loop asserted the quotient `(out x (n-i+1)) / i`, not the product, so a product above 2^53 was rounded and the division then looked safe. The new loop removes the common factor of `out` and `i` first and asserts the next coefficient only. Every other engine call that uses `choose` is unaffected below n = 55 (no value changed).

## 3. Findings that change numbers in the Phase 0 doc

- **A sum overflows before its terms.** `add`, `compare` and `equals` multiply the two denominators, so B(12, 7/10) (terms over 10^12) cannot be summed or compared with them. New code uses `sumRat` and `sameRat`.
- **`binomialPmf` is exact for every k up to n = 52 (p = 1/2), 33 (1/3), 22 (1/5), 20 (1/6), 15 (3/10, 7/10, any tenth)**; with the `choose` fix p = 0 and p = 1 reach 56. E(X^2) (so V(X) as E(X^2) - E(X)^2) of B(15, 7/10) overflows although every term and the mean (21/2) do not. `binomialSafe` therefore means: every term, np and npq. The explorer shows those and never adds the terms for a moment. Your rule (n <= 15 for tenths) holds.
- Phase 0 said `chooseSafe`; the fix is in `choose` itself, so there is none.
- `lawFromPatterns(patterns, rule, weights?)`: the rule comes before the optional weights.
- `spreadFrame` has no 2-to-5-values limit: that belongs to the component's schema.

## 4. Pixel identity of existing screens

**[sim]** The baseline holds 98 screenshots per device (the picker, 11 Proba and 28 Analysis demo cases by `-devComponent X#n`, the four unfiltered dev tabs walked down in 600 pt steps, lessons 1.b, 2.a, A.1 and `bac2022c-sc-ex2/1` first screens, 2.a to its sum card, `bac2022c-sc-ex2/1` to s4, s6, s8 and its end, 1.b and 2.a ended, the picker after play), on iPhone 17 Pro (402 pt) and iPhone 16e (390 pt), `-devLlm off`, status bar fixed with `simctl status_bar override`.

- **Determinism:** two full captures per device, then clean re-captures of the shots that differed. Of 98 shots, 87 (402 pt) and 83 (390 pt) were identical across the two full runs; the others differed only by the "Refreshing..." banner that Metro draws on a connected app whenever any file in the project folder changes (my own edits and the screenshot files themselves; captures now go outside the project folder), by the perf-timing text of the demo panels (React commit times), or by a 1-level anti-aliasing step in two pixels. Those shots were re-captured twice with no edit during the run: 27 of 27 identical (402 pt, run 3 against run 4) and 27 of 27 identical (390 pt, run 5 against run 6).
- **Masks in the diff** (`tools/screens/diff.js`): the status-bar zone (rows 0-175), the perf-timing lines of the demo tabs (402 pt: rows 320-420, 390 pt: rows 275-375), and, for the first screen of the unfiltered Proba and Analysis tabs only, the whole panel and below (their cases have their own per-case screenshots); a channel difference of 2 or less. Nothing else is masked. `--strict` turns the tolerance off.
- **After Phase 1** (the app-imported files changed: `rational.ts` `choose`, `registry.ts`, `plannerFormat.ts`, `revealing.ts`, `catalogMeta.ts`): a full after-capture on both devices against the baseline: **98 of 98 identical at 402 pt and 98 of 98 identical at 390 pt.**
- Not covered: tapped states (no tap automation: Accessibility permission), 360 pt (no simulator, no wrapper yet), Android.

## 5. Phase 4a content change list (NOT edited)

File set: `src/content/exercises/bac2022c-sc-ex2.json`, `bac2022c-sc-ex2.misconceptions.json`, `src/content/skillMap.json`; engine `procedures.ts`; lesson `lesson.ts` (typed-notation note); i18n (one string). Components themselves are A1.

Content, question 1 (`parts[0]`, steps today: s1 text, urn, s2 text, compare, s3 choice, s4 typed 120, s5 math, s6 typed 60, s7 math, s8 typed P(A), s9 text):
1. **Two new main-path steps, predict-first, before s4 and before s6** (kind `component`, gate `explored`, not graded):
   - `boxes` (GroupBoxes) after s3 and before s4, on a small twin urn (5 balls, 3 drawn, ordered: 60 draws, 10 boxes of 6; the student predicts the number of boxes first). It must not use the real urn: 120 boxes is s4's answer.
   - `choice` (ChoiceProduct) after s5 and before s6, on a twin whose numbers are not 60 (for example 3 red and 2 of 4 black = 3 x 6 = 18, OR 9; the coincidence guard picks and checks it). The real 4 x 15 is s6's answer.
   - The existing 2R 2N intro (`compare`) is the model: a visual, then a question.
2. **s6 hints reordered, meaning before symbol** (today: h1 "one red of four, two blacks of six"; h2 prints `\binom{4}{1} \times \binom{6}{2}`; h3 prints `\binom{6}{2} = \val{c62}`):
   - h1: the picture and the pair list (the C(6,2) = 15 pairs on request; the red AND the two blacks);
   - h2: AND means multiply, with the numbers read from the picture (4 and the count of pairs), no formula;
   - h3: the notation last, as the textbook form `C_{6}^{2} = 15` and `C_{4}^{1} x C_{6}^{2}` built from engine values (`chooseLine`), not `\binom` (rule 5; D35 left the notation open).
   - **Question for you:** s4 h1 prints `\binom{10}{3}` first and s8 is already meaning-first. Reorder s4 too? Default: yes, same rule.
3. **Alternatives for repairs** (kept, not replacing the main path): `alt-1-s4-boxes` (GroupBoxes, for `counts_ordered_draws`, new `divides_by_balls_not_orderings`), `alt-1-s6-choice` (ChoiceProduct, for `adds_instead_of_multiplying`, `wrong_group_size`). `repairComponent` set on those entries (it is `OutcomeSpace` today).
4. **New wrong-value rows**: engine procedure `divides_by_group_size` (ordered count / k: 720/3 = 240, 24/3 = 8) in `procedures.ts`, rows on s4; typed 12, 30, 48 at s6/choice mapped (`n_times_k`, `arrangements`, 4 x 12) with authored `feedback` / `feedbackConfirmed` for each new misconception.
5. `values`: engine entries for the twin numbers (`choose`, `product`), so no digit is typed into a hint.
6. `skillMap.json`: new skills (for example `ordering-vs-choosing`, `choices-and-product`), `reviewed: false`, cycle test applies.
7. `contentVersion`: `exsc2-0.1.0` -> `exsc2-0.2.0` (D23: steps and hints change). No real session exists on 0.1.0.
8. `paper`, `results`, walk-throughs of s4/s6/s8: unchanged. `solutionPhrases`: unchanged (hint order does not change them; `methodHint` for s6 moves to hint 3, which only the AI guard reads).
9. Lesson code: the neutral note "right notation, now compute it" (change 3) in the typed-answer path (`lesson.ts` near line 1213: `checkTypedCount`), one i18n key in ar-TN and fr (`reviewed: false`). The numeric keypad has no letter keys, so a student cannot reach it yet; it is tested through the reducer.
10. `answerAll` (dev) must pass the new gates; the replay already maps a gate event by name (`opensGate`).
11. Arabic: only the strings these two steps, the s6 hints, the repair steps and the note use; each listed in D36 with the step and what it must not reveal.

Tests that will change (from reading; none changes until the content does):
- `src/lesson/session/scEx2.test.ts`: the `upToProbability()` helper and every test built on it (happy path, change-1 ordered counts, the 720 line, E1 diagnoses, the other wrong values): after `s.choose('at_once')` the active card is no longer s4: a gate must be passed first (`gate_passed`). The assertions (values, diagnoses, feedback text) do not change. New tests: the two steps resolve, are gates, are visuals, answer values differ from the twin's.
- `src/lesson/session/misconceptionCoverage.test.ts`: not edited, but its generated cases grow (every new misconception and variant is walked; each needs `feedback` / `feedbackConfirmed` or the test fails).
- `src/engine/procedures.test.ts` and `src/content/loader.test.ts`: new cases only (the procedure; the coincidence guard on a `meantToDistinguish` step).
- `src/app/dev/answerAll.test.ts`: new case for the new exercise.
- Not affected (checked by reading): `ExercisePicker.test.tsx` (question 1 still opens on its first screen), progress tests (they use 1.b, 2.a, A.1 and synthetic parts; for this exercise the bar goes from 4 to 6 acting steps because gates count), planner catalog and prompt snapshots (new components are `offeredToPlanner: false`).
- Screenshots: `lesson-scex2-q1-until-s4`, `-until-s6`, `-until-s8` and `-end` change on purpose; the first screen does not (the new steps come after s3).

## 6. Could not verify

- Anything on a device; Hermes and cheap-Android timings (enumeration was measured on Node only).
- 360 pt: no simulator and no wrapper yet (A1).
- Whether `wireFormat.ts` derives its component enum from `plannerComponents` (adds no name yet, so unobserved).
- Tap flows (no tap automation): every gate and card flow stays tests-only.
