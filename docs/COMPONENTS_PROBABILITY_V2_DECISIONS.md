# Probability visual components v2: product owner's decisions

Source: the product owner's reply to `docs/COMPONENTS_PROBABILITY_V2.md` (Phase 0 plan), 2026-10-27, copied
verbatim below. Where this file and the Phase 0 doc differ, **this file wins**. The Phase 0 doc stays
unchanged on purpose. Section numbers refer to that doc ("section 10" = its "Questions for you").

## Verbatim

> Phase 0 plan approved. Copy it unchanged to docs/COMPONENTS_PROBABILITY_V2.md, run git status to show it is the only change, and stop; then wait for my "start Phase 1".
>
> Answers to section 10: 1 Part-1-first, with stop A split: A1 = GroupBoxes + ChoiceProduct, then wire them into question 1 (Phase 4a) so I can play step b; A2 = SlotsPattern bridge + PartWholeBar; then stops B and C as proposed. 2 (a): wire only question 1; authoring Parts 2 and 3 is a separate round after I play Part 1. 3 yes (offeredToPlanner:false until the AI selector round; flip only for components with complete reveals). 4 yes. 5 strings. 6 yes. 7 keep numbers and reject (n <= 15 for p with denominator 10). 8 contiguous. 9 pre-pass now, keypad later. 10 yes (docs only). 11 keep the diff script untracked. 12 one shared SliceBar, built with GroupBoxes first, ComplementView untouched. 13 yes.
>
> Five changes to the plan:
> 1. Phase 4: the new visuals go on the MAIN path before s4 and s6 as predict-first steps (like the existing 2R2N intro), not only as repair alternatives/deep dives; keep the alternatives for repairs. Reorder the hints of s6 so the picture and the pair list come before the printed \binom{6}{2} = 15 (meaning before symbol); list the existing content changes and the tests that change.
> 2. The "explored" gate must have an escape (the not-sure button or a reveal) that logs how:'skipped'; a skipped gate never counts as understanding and never traps the student.
> 3. Typed C(a,b)/A(a,b)/a! through the pre-pass: on a step that asks the student to compute a count, typing the notation is not a pass: give a neutral note ("right notation, now compute it"); accept it only where the step is about notation. Add tests.
> 4. FindingPayload: add an optional calc: string[] (engine-built LaTeX lines of the calculation with the student's own numbers) now, so the future "what we found" sheet needs no schema change.
> 5. Arabic: write only the strings the demos and the question-1 wiring actually use; list them in the D36 entry.
>
> Keep -devLlm off, no model calls, no commit. Stop after copying the file.

## Phase 1 instruction (2026-10-27, verbatim)

> Start Phase 1 (engine and primitives, tests only). First, write docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md: my answers to section 10 and the five changes, verbatim from the plan thread, so the repo is the source of truth (docs only).
> Then:
> 1. Baseline captures first: every existing demo case, the picker, lessons 2.a and 1.b and bac2022c-sc-ex2 question 1, at 402 and 390 pt, twice each to prove determinism, with -devLlm off. Build the small PNG diff script in tools/screens/ (untracked, no new dependency).
> 2. Engine modules E1 to E8 and E11 in this order: E1 (with the choose fix), E2, E3, E4, E5, E6, E7, E8, E11. E9 and E10 wait for Phase 3. Tests first for each; run npm run check and npm run check:release-dev after each module.
> 3. Report for the choose fix: the exact inputs that were wrong or threw before, and the values after, measured against BigInt for all n <= 60.
> 4. Report the Phase 4a content change list and the tests that will change, but do NOT edit the content yet.
> 5. No model calls, no commit. Do NOT start A1. Stop after Phase 1 with: tests added, tests changed (with reasons), tests-only vs simulator-checked, what you could not verify, and the actual effort against your estimates.

## Working rules that follow (not new decisions, a reading aid)

- Order: Phase 1 (engine, tests only) → A1 (GroupBoxes, ChoiceProduct) → Phase 4a (wire them into question 1,
  product owner plays step b) → A2 (SlotsPattern bridge, PartWholeBar) → stop B (SpreadSlider, RepeatedRuns) →
  stop C (VariableTable, BinomialExplorer) → tier 2. Parts 2 and 3 of `bac2022c-sc-ex2` are authored in a
  separate round after the product owner plays Part 1.
- `offeredToPlanner: false` on every new component until the AI-selector round; it may be set to true only for
  a component whose `reveals` are complete.
- Folder `src/components/probability2/`; rationals on the wire are strings (`"1/6"`); numbers stay `number`-based
  and the loader rejects overflow (`binomialPmf` exact up to n = 15 for p with denominator 10).
- No model calls, `-devLlm off` for every screenshot and replay, never `npm run replay -- eval`, no commit.

## Autonomous run, stops 2 to 5: approval of the Stop 2 plan (2026-10-27, verbatim)

> Approved with three changes. (1) SlotsPattern at n = 7 on a 360 pt column: keep a 44 pt hit area (hitSlop, or two rows); do not shrink the touch target below 44 pt in either dimension; decide by the 360 pt screenshot review and record it. (2) Help level 1 must say "at least one is missing" and never imply how many; the free-slots count stays only if it cannot reveal the number of missing patterns (otherwise drop it and keep level 1 to the plain statement). Test that level 1 gives the same text when one pattern is missing as when two are. (3) Add to docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md: "deep-dive priority for clarify answers depends on array order in bac2022c-sc-ex2; dd_choose_bridge is first on purpose; pinned by tests". Everything else as planned, including the s8 procedure-row append and exsc2-0.3.0. Proceed through stops 2 to 5 without waiting, following the stop conditions.

Reading of (2): the free-slots count was dropped. A slot that no listed pattern marks S proves that every pattern with an S there is missing, which is more than one pattern for most (n, k), so showing "N slots never carried an S" would imply how many are missing. Level 1 is the plain statement, identical whatever the number missing.

> deep-dive priority for clarify answers depends on array order in bac2022c-sc-ex2; dd_choose_bridge is first on purpose; pinned by tests

## Autonomous run, final pass: approval of the closing plan (2026-10-27, verbatim)

> Plan approved, with three additions.
> 1. After the SliceBar edit, also re-run the 19-screen sanity set (the A1 one), including the lesson-scex2-q1-until-* shots, and compare with baseline-4a. GroupBoxes is on question 1's main path and uses SliceBar. Any difference there is stop condition 2.
> 2. Run git diff on probability/logic.test.ts and lesson/session/lesson.test.ts and confirm the only change is the unregistered-name string ('BinomialExplorer' to 'InverseMirror'). Record both swaps in the decisions file as approved retroactively.
> 3. In the final report, list the owner questions in plain words, each with a recommended default (bridge twin C_7^4, 35 patterns by hand, UrnTemplate, typing surface for C(n,k), offeredToPlanner:true, Parts 2 and 3).
> No commit, no model call. Proceed.

Record for (2), checked with `git diff -U1` on 2026-10-27: the only change in `src/components/probability/logic.test.ts` (one line, `resolveSpec({ component: 'BinomialExplorer', ... })`) and in `src/lesson/session/lesson.test.ts` (two lines, the `component:` input and the expected `component_error` name) is the unregistered-name string `'BinomialExplorer'` to `'InverseMirror'`. `src/components/probability/components.test.tsx` (on the owner's list) has the same swap in two lines. No assertion was changed or weakened; `BinomialExplorer` became a registered name in Stop 4, so each of these three tests needed another contract name with no registered view. Approved retroactively: all three swaps.
