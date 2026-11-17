# ex2 and ex4 upgrade: build log

Approved plan (2026-11-17): `/Users/oussama/.claude/plans/zesty-sniffing-bentley.md`. The goal is to bring `bac2022c-ex2` (all 6 questions) and `bac2022c-ex4` Part A onto the hybrid board, with the structure and explanation quality of the tree exercise `bac2022p-sc-ex2`.

The phases, each ending with a stop where the owner plays it:
1. ex2 1.a to 2.b.
2. A reader for lines with x and n.
3. ex2 question 3.
4. ex4 Part A.

Decisions are D65 onward in `docs/DECISIONS.md`. All Arabic is `reviewed: false`.

## Step 0 (2026-11-17)
Committed the earlier work as `e2ca3aa` (the tree exercise and fix-list steps 1–2), on the owner's word.

## Phase 1: ex2 1.a, 1.b, 2.a, 2.b (2026-11-17, not committed)

### Shared code
**Fix list B5 (D66).** The board reads `C(n,k)`, `A(n,k)` and `n!`.
- `expandCounting` (in `src/engine/expression/counting.ts`) writes the notation out as the product a student writes for it, so the slip matcher still compares factors.
- `lineLatex` shows the notation as C_{n}^{p}, never as its value.
- The `total` and `fav` cards get the keys ! and C(n,k), without the letters n and k (`counting="numbers"` on the worksheet).

**A card with several main nodes closes on its last one (D68).**
- This is the rule everywhere, not a flag. A scan showed that every existing card has exactly one main node, so nothing changes for them.
- One slip found on several equal nodes of one card counts as one slip.

**A negative fraction alone (`-1/10`) is a value**, not an unfinished calculation (D69).

**Ω added to the native math renderer** (`src/lesson/math/latexSubset.ts`) for card(Ω).

**Engine calls** `expectation`, `secondMoment` and `variance` were added (`src/engine/calls.ts`). Skills `expectation` and `variance` were added (`skills-0.3.0`).

**AI pack.**
- Numbered balls are printed by their numbers (`urnLine`). Coloured urns keep the exact old line.
- Node meanings for `num_*` graphs (`nodeMeaning`).
- `nodeSkill` and `SLIP_SKILL` cover the new nodes and slips.

### Domain code
`src/method/templatesLaw.ts` has four shapes: `num_same`, `num_at_least`, `num_law` and `num_moments`.
- Balls and k come from the arguments (D67).
- Values come from the engine's enumeration.
- Wrong roads come from the real sessions. A road that lands on the right number with the exam's figures becomes a trap: 5×2 = 10 draws, and 3 balls = C(3,2) draws.

Tests are in `src/method/templatesLaw.test.ts`.

### Content (`ex2-1.0.0`)
**Exercise file.** `src/content/exercises/bac2022c-ex2.json` has:
- the statement in the exam's wording, with both events A and B;
- the paper with all 6 questions (3.a and 3.b marked "soon");
- four method blocks `m1a`, `m1b`, `m2a`, `m2b`, each with plan cards, a read tap, picks, recipe, method card, two similar questions, findings and a skeleton;
- no deep dives or variants.

**Other files.**
- Slip library `src/content/methodMutations.law.misconceptions.json`: 15 new slips, each with a question form and a confirmed form.
- Trip map `src/content/trips.bac2022c-ex2.json`.
- AI notes `TUTOR_NOTES['bac2022c-ex2']` (hybrid only, no components).

**The old content is kept.**
- Questions 1.b and 2.a of 0.5.0, with their deep dives and variants, are parked in `docs/EX2_PARKED.json`.
- A complete frozen copy of 0.5.0 is in `src/content/fixtures/ex2.v050.json` (+ `ex2Misconceptions.v050.json`). The 41 old-lesson tests and the replay tools import it now; only their import path changed.

### Checks
- **Free conductor dry run (no AI), all four questions play end to end:**
  - 1.a: a bare 10 → asked for the calculation; `C(5,2)=10` → credit; 2 → named slip; 1 → credit; pick; 2/5 → named slip; 1/10 → done.
  - 1.b: pick of the opposite event; 3/5 → slip; 3/10; 7/10 alone → asked for the calculation; `1-3/10=7/10` → done.
  - 2.a: values pick; 3/10 → slip; 7/10; pick; three lines of 1/10, the card closes on the third; the sum.
  - 2.b: E, E(X²), V and the sign pick.
- **`npm run check` green: 259 suites, 3,749 tests.**
  - lint and tsc are clean;
  - `check:release-dev` ok;
  - the urn exercise's pinned AI bytes are unchanged.
- **The 13 old-lesson UI suites** (LessonScreen, picker, paper, reset, feed) swap ex2's JSON for the frozen 0.5.0 copy with `jest.mock`; no assertion changed. New live test: `src/method/ex2Content.test.ts` (18 tests, including a full play of each question).
- **Simulator (iPhone 17 Pro, `-devMover` slow, no AI)**, screenshots in `docs/screens/ex2-upgrade/` (gitignored):
  - the trip of 1.a;
  - `C(5,2)=10` credited and shown as C₅²;
  - 2.a's values pick, after a fix: the sets are now written as text inside the braces, because the native math spacing squashed them.
  - Progress was reset with `-devReset bac2022c-ex2` afterwards.
- **Not done:**
  - no paid AI call (D73);
  - no prepared small examples (D72);
  - no reply templates for ex2 yet;
  - no full screenshot pass, and the regression set (urn Q1 `until-*`, tree) was not re-shot. The shared code it touches is covered by tests: B5 keys on the urn's cards, the reader.

## Phases 2 to 4 (2026-11-17, same day, not committed)
The owner said: "I will not play now, just finish the two exercises". So the stops were skipped and the defaults taken. Decisions are D76 to D82.

**Phase 2: lines with a letter on the board.**
- `src/method/exprLine.ts` with tests; the `expr` node field.
- The conductor passes his accepted lines and records the board's verdict on his line.
- New neutral notes say where a line differs.
- LaTeX of lines with x and n.
- The found sheet and the paper accept such steps; "show me" gives the goal form.
- The AI's value guard and the AI packs skip them; the similar-question review judges them.
- The keypad has an x row and an n row.

**Phase 3: ex2 3.a and 3.b** (`c3a`, `c3b`).
- `num_repeat_law` and `num_repeat_mean` in `templatesLaw.ts`.
- Content, trip, slips and notes as for 1.a to 2.b.
- Played end to end in `src/method/ex2Content.test.ts`.

**Phase 4: ex4 Partie A** (A1, A2, A3a, A3b, A4).
- `src/method/templatesFunction.ts` (the engine checks every argument).
- The `analysis` domain with `src/ai/move/promptAnalysis.ts`.
- Slip library `methodMutations.analysis.misconceptions.json` (11 entries), trip `trips.bac2022c-ex4.json`, notes.
- Old A1 parked (`docs/EX4_PARKED.json`); frozen 0.1.0 in `src/content/fixtures/ex4.v010.json`, with old tests repointed.
- Played end to end in `src/method/ex4Content.test.ts`.

**Checks after phases 2 to 4.**
- `npm run check` green: **263 suites, 3,789 tests**, lint and tsc clean; `check:release-dev` ok.
- New tests:
  - `exprLine.test.ts`;
  - `templatesFunction.test.ts` (the engine refuses wrong content);
  - `exprSlips.test.ts` (every slip of a letter line is in the library);
  - `ex4Content.test.ts`, with each question played end to end;
  - `ex2Content.test.ts` extended to question 3.
- Five more old-lesson suites (LessonScreen.ex4, picker, App, PaperSheet, answerAll) `jest.mock` ex4's JSON to the frozen copy; no assertion changed.
- Simulator (iPhone 17 Pro, `-devMover slow`): ex4 A1 with the x/e/power keypad row, a first line accepted, a wrong line with its named slip; ex2 3.a's formula step.
  - His lines with x are now drawn as math in the exchange (board only; the old lesson's bubble is unchanged).
  - Screenshots in `docs/screens/ex2-upgrade/`. Progress was reset for both exercises afterwards.
- **Not done:** a paid AI check (none was run, so the analysis prompt was never tried with a live model); prepared small examples; a graded variation-table input; the full screenshot regression pass of the urn and tree questions.

## Stop A: questions for the owner (each has a default)
1. **Small examples for ex2.** On the second «ما نعرفش», should a small free example with numbered balls open, as on the tree? It needs a new panel, so I would show you a mockup first. *Default: yes, mockup next.*
2. **2.a, the "product is 0" step.** It reuses the 1.b result. Should the student still do this step (today), or should it be ticked automatically like the total? *Default: keep it; the link is the lesson.*
3. **One paid AI check on ex2, at most $1**, after you have played it. *Default: yes, once you say so.*
4. **The darija voice.** Should the texts get a pass by Fable (the voice you liked in the tree exercise) after you play? *Default: you play first, then decide.*
5. **Commit Phase 1** once you are happy with it. *Default: yes, on your word.*

## The warm-up before each exercise (2026-11-17, not committed)
The owner asked for each exercise to have its own pre-questions, asked once before the whole exercise and stored with the exercise's data. The decision is D83; the guide is `docs/WARMUP.md`.
- All four exercises have one: ex2, ex4, the urn and the tree.
- Answers are judged by the engine and saved to the profile, and they appear first in the tutor's digest for that exercise.
- The end shows one general sentence.
- Not done: the lesson's own steps do not change from it yet.
