# bac2022p-sc-ex2 (probability tree): build log

No answers and no solving steps in this file. The exercise document with the solutions is `docs/exercises/BAC2022P_SC_EX2.md` (not to be opened before testing). Approved plan: `/Users/oussama/.claude/plans/pasted-content-id-120c-task-snazzy-harbor.md`.

## Phase times (2026-11-11, wall clock)

| Phase | Start | End | Notes |
|---|---|---|---|
| Reading and plan (3 sweeps, 1 design review, 4 owner questions) | before 16:00 | 16:00 | plan approved |
| Step 0: engine `src/engine/tree.ts` + tests | 16:01 | 16:05 | official correction has no error (engine test) |
| Step 2: shared seams (matcher hooks, tree templates, case kind, figure schema, prepared cases module, golden AI-bytes test) | 16:05 | 16:22 | all opt-in; sc-ex2 suites green |
| P2 component `ProbabilityTree` (subagent) | 16:05 | 17:01 | 75 new tests; not seen on a device yet |
| Step 1: exercise document (numbers for similar questions and small examples searched with the engine) | 16:25 | 16:50 | the slowest authoring part: every Arabic text of 4 questions |
| P3 conductor and screens (subagent) | 16:24 | 17:23 | 50 new tests on a small fixture |
| P5 AI layer (subagent) | 16:24 | 17:37 | the longest package: prompt, tools, verifier, packs, harness |
| P4 content JSON from the document (subagent) | 16:52 | 17:20 | 6 content files, 95 content tests |
| Step 4: wiring (catalog, trips, replies, cases, slip names, part labels, paper screen) and tests on the real content | 17:24 | 17:40 | 27 conductor tests, 10 screen tests, 2 paper tests |
| Full check | 17:38 | 17:39 | green: 257 suites, 3690 tests |
| Step 5: simulator pass (iPhone 17 Pro), 17 screenshots in `docs/screens/bac2022p-sc-ex2/` (gitignored) | 17:40 | 17:46 | found and fixed: a write-up line showed the method before he found it; « deux » underlined as a datum |
| Step 6: paid AI check | 17:47 | 17:51 | $0.13 of the $1 cap: 29 model calls, 22 AI moves read |

## State (end of the build)

- Built and green: engine, templates, matcher hooks, component, conductor and screens, content, AI layer, wiring, tests.
- Simulator: trip, first step of each question, a wrong line, a small example, the three sheets and the paper screen were seen. Not swipe-tested (this shell cannot touch the simulator); Android not looked at.
- The exercise's progress on the simulator was reset at the end of the pass.
- 19:25, on the owner's request: `-devReset <exerciseId>` cleared the done marks only, so a question the lesson board had saved could reopen where it was left. It now also removes the board's saved questions and resume points, as «ابدا من جديد» on the picker does (`src/app/screens/LessonScreen.tsx`). Reset run again and seen on the simulator: question 1 opens on its trip with nothing found.
- Open, for the owner: see the final report (decisions) and `docs/HYBRID_FIX_LIST.md` (status of 2026-11-11, items N1 to N4).

## What was slow, for the next exercise

- The exercise document (all Arabic of four questions: trips, prompts, two hints per step, slip texts, picks, small examples, similar questions) and the search for numbers that collide with nothing. A second tree exercise reuses the slip library, the small-example story and the templates, so it should need the trip, the prompts and the similar questions only.
- The AI layer, because every urn assumption had to be found and switched by domain without moving the urn's bytes. Done once.
- Coincidences in the exam's own numbers: found by an engine scan, not by reading. Run the scan first on a new exercise.
