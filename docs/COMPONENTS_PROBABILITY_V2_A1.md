# Probability visual components v2: A1 and Phase 4a report (GroupBoxes, ChoiceProduct, question 1)

Date: 2026-10-27. Decisions: `docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md` and the product owner's A1 instruction (reorder s4 like s6; no letter keys on the keypad; `exsc2-0.2.0` for sc-ex2 only).
No model call (every launch `-devLlm off`, `npm run replay -- eval` never run), nothing committed, A2 not started.
Labels: **[tests]** Jest on Node; **[sim]** looked at or diffed on the iOS simulator; **[read]** from reading code.

## 1. A1: what was built

| Piece | Where | Notes |
|---|---|---|
| `GroupBoxes` (visual, gate `explored`) | `src/components/probability2/GroupBoxes.tsx` | ordered draws in boxes (a box = the set of k balls, its k! orderings inside); all boxes up to 24, else one box at a time with "another box"; or slices by a count of balls (shared `SliceBar`); one box open at a time; the first box shown is a mixed one |
| `ChoiceProduct` (visual, gate `explored`) | `.../ChoiceProduct.tsx` | two stages; one pick in each (a stage that picks 2 of n lists its pairs as chips); rows x columns (AND) or the two lists end to end (OR, `SliceBar`); the product or sum is written with the engine's own calculation only after both picks |
| shared `SliceBar`, `BallDot`, `Dots` | `SliceBar.tsx`, `ui.tsx` | slice widths follow counts, at least a touch target wide |
| schemas, model, findings, `reveals` | `schemas.ts`, `logic.ts` | caps by formula (never by enumerating); coincidence guard on the props (k = 2 for boxes; 2 + 2 or C(n,1) = n for the product) |
| gate escape | both components + `lesson.ts`, `replay.ts`, `LessonScreen.tsx` | «ما نعرفش، ورّيني» (existing string) logs `explored { how: "skipped" }`; `gate_passed { how }` + `LessonState.skippedGates`; `part_done` counts that step as revealed, not answered; replay maps it back |
| registry, catalog, tokens, contrast, hygiene | `registry.ts`, `catalogMeta.ts`, `theme.pv2`, `__tests__/contrast.test.ts`, `__tests__/probability2Hygiene.test.js` | `offeredToPlanner: false`, `reveals` complete (a test enforces both) |
| demos | `ProbabilityDemoScreen.tsx` | GroupBoxes `#0..#4`, ChoiceProduct `#0..#4` (default, hard, slices, OR, two non-session parameterisations each, a readonly/replay copy under the live one); debug-only `-devWidth 360` wrapper (a no-op when absent) |
| i18n | `pv2.*` (ar-TN, fr) | only strings the demos and the question-1 wiring use; listed in D36 |

Cut from the Phase 0 design (reported): the `ask` (task) mode. Nothing in question 1 needs a graded component; the question after a picture is the lesson's typed step with its hint ladder, procedures and walk-through.

Found by the tests and the screenshots, all fixed (details in section 4).

## 2. Phase 4a: what changed in question 1 of `bac2022c-sc-ex2` (now `exsc2-0.2.0`)

- **Main path** (group `count`): s3, `boxes-intro` (text), `boxes` (GroupBoxes gate), s4, s5, `choice-intro` (text), `choice` (ChoiceProduct gate), s6, s7, s8, s9. Both pictures use the same small box (3 red, 4 black balls): 35 boxes x 6 = 210 ordered draws (one box at a time, since 35 > 24); 3 x C(4,2) = 3 x 6 = 18. No number on screen is an answer or a known wrong value of s4, s6 or s8 (a test compares them with the engine's answers, wrong answers and procedure values). I changed my earlier 5-ball twin (it showed 60, the answer of s6).
- **s4 hints**: 1 the boxes picture (new), 2 the ordered count (unchanged, moved), 3 `C_{10}^{3} = \frac{720}{6}` last, built from `\val{nOrd}` and the new engine value `perBox` = 3 x 2 x 1.
- **s6 hints**: 1 the picture and the pair list (new), 2 "and means multiply" in words (new), 3 `C_{6}^{2} = 15` last (`\val{c62}`): the first place the number 15 appears.
- **Notation**: every `\binom` of question 1 became the textbook `C_{n}^{k}` (6 places: hints, s5, s7, one deep dive). Older exercises keep `\binom`.
- **Repairs kept**: `alt-1-s4-boxes` (4 balls, 3 at once: 4 boxes; 24 / 3 = 8 is a named slip) and `alt-1-s6-choice` (2 red, 4 black: 2 x 6 = 12); misconceptions `divides_by_balls_not_orderings` (engine procedure `ordered_divided_by_k`: 720 / 3 = 240) and `reads_choose_as_product` (typed 48 = 4 x 12); `repairComponent` of `counts_ordered_draws` -> GroupBoxes, of `adds_instead_of_multiplying` and `wrong_group_size` -> ChoiceProduct.
- Skills `ordering-vs-choosing`, `choices-and-product`. Version 0.2.0 in sc-ex2 and its misconceptions only (Exercise 2 stays `ex2-0.5.0`, Exercise 4 `ex4-0.1.0`: a test pins it).

### Interactions on the no-mistake path of question 1 [tests, with the real components]

| | before | after |
|---|---|---|
| choice and typed answers (s3, s4, s6, s8) | 4 | 4 |
| picture taps (box: 1 "another box"; choice: 1 + 1 picks) | 0 | 3 |
| **total** | **4** | **7 (+3, the limit)** |

The header bar goes from 4 to 6 acting steps because gates count (the two pictures).

## 3. Change 3 (typed notation): what is wired and what is not

- **Built and tested:** the pre-pass (`C(a,b)`, `C(a;b)`, `C_a^b`, `A(a,b)`, `a!`, `(expr)!`) and `checkTypedCount` (correct / notation_only / wrong / unreadable; `aboutNotation`): 59 tests in `src/engine/expression/counting.test.ts`.
- **Not wired:** (1) the typed-answer branch of `lesson.ts` (line 1213) still parses with `parseNumeric`, not `parseCountingAnswer`; (2) the neutral note «right notation, now compute it», its i18n string and its log event; (3) an `aboutNotation` flag on a content step.
- **Why:** the only surface where a student types an answer is the `NumericKeypad`, whose keys are digits, `/`, `,` and `-`; you decided not to add letter keys. The structured line editor (Exercise 4 only) has no C, A or `!` key and builds a tree, not text; the ask field is a question box. So no student can type `C(6,2)` as an answer today, and the wiring would have no input path (it would be reachable only from a test or a dev script). When a typing surface exists, the three pieces above are the whole remaining work; the engine side is done.

## 4. Pixel diffs of existing screens

Baseline: 98 screenshots per device, iPhone 17 Pro (402 pt) and iPhone 16e (390 pt), `-devLlm off`, deterministic (Phase 1 report). Every diff below ignores only the status-bar zone and the perf-timing lines, and noise of 2 per channel (`tools/screens/diff.js`).

| After | Result **[sim]** |
|---|---|
| **A1** (components, registry, tokens, gate plumbing, demo cases) | **91 of the 98 baseline screens identical on both devices.** The 7 others are `tab-proba-01..07`, the unfiltered Proba tab walked down: each is the baseline **shifted down by exactly 116 px (38.7 pt), 100% of its rows matching**, because the dev perf panel at the top gained two lines (GroupBoxes, ChoiceProduct). Every per-case shot of an existing component (`-devComponent X#n`), the picker, lessons 1.b, 2.a, A.1 and the lesson ends are identical. `tab-proba-08..17` are new (the 10 new demo cases). |
| **Phase 4a** (question 1 content) | The same 91 identical. New differences, all intended: `lesson-scex2-q1-until-s4`, `-until-s6`, `-until-s8` (the pictures are now on the path before them) and two new shots (`-until-boxes`, `-until-choice`). The first screen of question 1 and its end screen are unchanged; so is every other exercise. |
| **After the last GroupBoxes fixes** (a mixed first box, an open sample box, the right hint) | A sanity set of 19 existing screens per device (picker, lessons 1.b, 2.a, A.1, question 1 first screen, 4 Proba cases, 4 Analysis cases, the demo, lesson and bidi tabs): **19 of 19 identical on both devices.** No existing screen uses GroupBoxes. |

Screenshots of the new work (gitignored): `docs/screens/probability-v2/a1/` : `components-390/` and `components-360/` (`v2-GroupBoxes-0a.png` ... `ChoiceProduct-4b`: `a` = the live component, `b` = the replay copy under it, i.e. the state after the taps), and `lesson-402/`, `lesson-390/`, `lesson-360/` (question 1 stopped at the boxes picture, s4, the choice picture, s6). Tapped states in the real lesson were not photographed (no tap automation).

What the screenshots showed, and what I changed because of it: the green tick on a highlighted chip failed the 4.5:1 contrast test (now ink); «المرحلة 1» had a digit on a line with Arabic (now words); the slice footer said "boxes x orderings"; the first sample box of the real urn was all red (now the first mixed box); the open sample box looked tappable (now a plain open box) and its hint said "tap a box" (now "another box"). Two layout facts, not changed: boxes wrap two to a row at 360 and 390 pt (the tick and the ball faces need about 110 pt each); on a 390 pt screen the choice picture (two stages, the picture, the escape) is taller than the free part of the feed, so the student scrolls, as for every tall visual in the feed.

## 5. Launch commands (iOS simulator, debug build, AI off)

```sh
npx react-native start                                   # Metro, port 8081
xcrun simctl boot 7B5AAEAC-353D-4D86-AF96-69A709747C51   # iPhone 16e, 390 pt (iPhone 17 Pro, 402 pt: 27978103-59E7-4963-99A8-91E1319449B9)
# Play question 1 from its start (you tap; the AI is not built):
xcrun simctl launch 7B5AAEAC-353D-4D86-AF96-69A709747C51 org.reactjs.native.example.NewTTClair -devLlm off -devPart bac2022c-sc-ex2/1
# The same on a 360 pt column:
xcrun simctl launch 7B5AAEAC-353D-4D86-AF96-69A709747C51 org.reactjs.native.example.NewTTClair -devLlm off -devPart bac2022c-sc-ex2/1 -devWidth 360
# One component demo (GroupBoxes#0 .. #4, ChoiceProduct#0 .. #4; add -devWidth 360 for 360 pt, -devScroll 270 to start below the perf panel):
xcrun simctl launch 7B5AAEAC-353D-4D86-AF96-69A709747C51 org.reactjs.native.example.NewTTClair -devLlm off -devComponent 'GroupBoxes#0'
xcrun simctl launch 7B5AAEAC-353D-4D86-AF96-69A709747C51 org.reactjs.native.example.NewTTClair -devLlm off -devComponent 'ChoiceProduct#0'
# Stopped while a picture waits (for a screenshot, no taps needed): add  -devActions answerAll -devUntil boxes   (or choice, s4, s6)
```
(Terminate the app first with `xcrun simctl terminate <udid> org.reactjs.native.example.NewTTClair` when it is already running: launch arguments are read at start.)

## 6. Could not verify

- Taps. No tap automation exists here (no Accessibility permission): every tap flow (box, picks, the escape, the mode switch) is **tests-only**; the screenshots show the replay copy of each demo for the tapped state.
- A device, Hermes, cheap Android; 360 pt is a clamped column on the 390 pt simulator, not a 360 pt screen.
- Arabic wording and the box / group terms (teacher review, D36).
- That the pictures help step b: that is the product owner's play.

## 7. Tests

- **Added: 133** (suites 141 -> 148, tests 1 878 -> 2 011, 0 failing, 11 todo as before): 112 in new files (schemas 25, model and reveals 22, components 23, the gate escape in the reducer and replay 8, question 1 with the pictures 26, the new procedure 6, the probability2 guard 2), +18 generated by `misconceptionCoverage.test.ts` for the new variants and misconceptions, +3 contrast pairs in `__tests__/contrast.test.ts`.
- **Changed (reason): one existing test file, `src/lesson/session/scEx2.test.ts`.** The helper `upToProbability()` and the three flows that go straight from s3 (the 720 line, the 1000 / 54/125 diagnoses, the other wrong values) now pass the two pictures' gates (`passGate`), because the lesson now waits at them. No assertion was edited or weakened. `__tests__/contrast.test.ts` only gained pairs.
- Existing suites that stayed green unedited with the new content: loader, skills, catalog, planner and guard suites, `misconceptionCoverage`, replay, i18n, the hygiene guards.
- **Tests-only:** every tap flow (box, another box, slice, the two picks, the mode switch, the escape), events and findings, the reducer and replay of a skipped gate, part counts, the interaction count, the twin numbers against the answers and wrong values, the AI guard, hints, procedures, i18n parity.
- **Simulator-checked:** the demos at 390 and 360 pt (replay copy for the tapped state), the lesson stopped at each picture, pixel identity of existing screens.

## 8. Effort, estimated against actual

Phase 0 estimates: GroupBoxes M to L (about 1 to 2 days), ChoiceProduct M (about 1 day), SliceBar and the gate escape inside those, Phase 4a not estimated separately. I did not time the work. By shape: the two components with their tests came out as estimated; **not in the estimate:** the gate escape through the reducer, replay and part counts (a small reducer change), the content patch with two alternatives and two misconceptions, and four screenshot rounds (each full round of 108 shots on two simulators takes about 28 minutes of wall clock, and nothing in the project may change while it runs). The screenshots caught six real defects the unit tests could not (section 4), which is why I would keep a look at the real lesson in every later stop.

## 9. For the next stops

- A2 (SlotsPattern bridge, PartWholeBar) and later components: the binomial explorer must show each term, np and npq, never a sum (E(X^2) of B(15, 7/10) overflows); `offeredToPlanner` stays false until the AI round, and flips only with complete `reveals`.
- `lessonState.hintLevel` (Phase 1) is still not passed by the question card; no A1 component is a task, so nothing needs it yet.
