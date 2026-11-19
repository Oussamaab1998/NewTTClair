# A new exercise, stage by stage

How to add an exercise (a bac paper, a 3ème exercise, our own) so it follows everything the four exercises of the app follow. The work goes in stages, and each stage ends with a check that takes a few seconds. A mistake is found minutes after it is made, at the step and file where it is, never after an hour of work.

## The commands

| When | Command | What it does |
|---|---|---|
| Start | `npm run new-exercise -- <id> --chapter <chapter-id> --subject probability` | Creates the files with placeholders. Nothing is in the app yet: the app and `npm run check` stay as they were while the exercise is written. |
| After each piece of work | `npm run check:exercise -- <id> --stage <n>` | One ✓ or ✗ per rule for stages 1 to n, each ✗ with where to fix it, then the next thing to do. About one second. |
| Stages 1 to 3 pass | `npm run new-exercise -- <id> --register` | Puts it in the app: `src/app/exercises.ts`, the trips and help registries, its chapter in `src/content/curriculumMap.json`. It refuses while stages 1 to 3 fail. |
| Stage 4 | `npm run check:exercise -- <id>` | Every stage, then the exercise's own tests. Ends with «Ready». |
| Last | `npm run check` | Lint, types, every test of the app. |

`--fast` skips the jest run at the end of `check:exercise`. `--subject` is `probability` or `analysis`; `--section` is only needed when the chapter's track has several sections.

## The id

- Lowercase words and digits joined by «-».
- A bac paper: `bac<year><p|c>-…`, like the ones already in the app (`bac2022c-ex2`, `bac2022p-sc-ex2`). The `bac2022p` part puts it in the home screen's exam sessions.
- Any other exercise: no `bac` at the start, for example `3s-se-proba-ex1`.
- Question ids are unique across the whole app (a question is found by its id alone). Prefix them, for example `s3t1` instead of `t1`. Stage 1 checks it.

## Stage 0: the plan, and the owner's yes (no code)

Write it in `docs/exercises/<ID>.md` (the skeleton command creates it):

- the statement in French, as printed;
- the questions, one line each, and what each one uses from the ones before;
- every number, as the engine computes it (the engine call and its result). Never a value typed by hand. If the official correction gives another value, write it down: the engine is right until proven otherwise (see `docs/exercises/EX2_PROBABILITY.md`);
- each question's steps (the plan cards), what he writes or picks at each step, and the components on the board;
- anything new for the app (a component, an engine function, a subject). Each new thing is its own approval, and a new screen needs a mockup first.

Show the plan to the owner and wait for a yes. Then go on.

## Stage 1: the exercise

Files: `src/content/exercises/<id>.json` and `<id>.misconceptions.json`. Copy the shape of an exercise of the same kind: `bac2022p-sc-ex2` (a probability tree), `bac2022c-ex2` (counting, a law, the binomial law), `bac2022c-ex4` (a function).

- Every value shown as a fact is `\val{id}`, computed by the engine from `values`.
- Each question is one method step: a plan (3 to 5 cards), steps where he writes a line or picks a card, the recipe, the similar questions.
- Arabic is in `ar` runs, Tunisian darija, with French math words kept in French in their own `fr` runs. Math is never inside an Arabic run: it goes in `math`.
- The warm-up (`docs/WARMUP.md`): 3 or more main questions, each `topic` a short French term.
- `reviewed: false` everywhere.

Check: `npm run check:exercise -- <id> --stage 1`

## Stage 2: the maps (trips)

File: `src/content/trips.<id>.json`. An overview of the exercise (its questions in order), then one map per question: what we have, what is asked, its steps (the plan cards, in order), the check at the end, what comes after. A result carried from an earlier question names that question and its node.

Check: `npm run check:exercise -- <id> --stage 2`

## Stage 3: the help, one question at a time

File: `src/content/help/<id>.json` (D88). For every step where he writes a line or picks a card, three levels that give and never ask:

1. the idea;
2. a small example with its own numbers, solved in front of him. Its lines are true, and no value is one of the exercise or of its similar questions;
3. the method on our numbers. A line step has a line to fill: slots, value chips, and the line accepted by the engine. A card step has no line, and no level copies its right card.

Then a glossary of 3 or more entries (the symbols and the paper's French words he can long-press).

The words: no question mark («؟» "?"), none of the refused words (the check names the word and what to say instead). Write one question's ladders, run the check, fix what it names, then the next question.

What the general rules cannot see (for example a value of the exercise inside an example's story) goes in the exercise's own help test, `src/content/help/<id>.test.ts`. Copy `bac2022c-ex2.test.ts` or `bac2022p-sc-ex2.test.ts`.

Check: `npm run check:exercise -- <id> --stage 3`

## Stage 4: in the app

1. `npm run new-exercise -- <id> --register`.
2. The play test, `src/hybrid/conductor/<id>.play.test.ts` (the skeleton has a todo). One test per question, from the trip to the recipe and the similar questions, with no AI. The right lines are written from the engine's values. The helpers are in `src/hybrid/conductor/playKit.ts` (`playOn`, `line`, `pick`). Examples: `src/hybrid/conductor/bac2022pScEx2.test.ts`, `src/method/ex2Content.test.ts`.
3. The tutor notes for the AI teacher: `TUTOR_NOTES['<id>']` in `src/ai/packs/notes.ts`, one entry per question (English, for the model, `hybridOnly: true`). The check shows ⚠ while they are missing.
4. If an app test fails because it counts the exercises, make it count from `CATALOG`; never just change the number.

Check: `npm run check:exercise -- <id>`, until «Ready».

## Stage 5: the full check, then the simulator

- `npm run check`.
- On the iOS simulator, with the AI off: `-devLlm off -devReset <id> -devPart <id>/<question>`. Play each question once: the paper first, writing alone, step by step, «ما نعرفش» to the third level, a long press to select text. Run `-devReset <id>` again after a scripted pass.
- Tell the owner: what was built, how the numbers were checked, what was not checked, and his questions in plain words, each with a default.
- Commit only when the owner asks.

## Not possible yet without the owner

- **Another subject** than probability or analysis: `ExerciseSchema.subject`, and an engine and components for it.
- **Another section** than mathematiques or sciences-experimentales: `ExerciseSchema.section` (`src/content/schema.ts`), plus its labels in `picker.section`, `lesson.sectionShort` and `home.section` (`fr`, `ar-TN`).
- **The home screen counts every exercise of the app** in its domains, whatever the student's class (D85, "not done yet"). A 3ème exercise shows in a bac student's «Probabilités» count.
- Optional files only the tree exercise has (not needed for a new one): prepared cases (`src/content/cases.<id>.json`), reply templates (`src/content/replyTemplates.<id>.json`).

## Where each rule is checked

| Rule | Code | Test over every exercise |
|---|---|---|
| It loads: schema, engine values, method graphs, walk-throughs | `loadChecked` in `src/app/exercises.ts` | `src/app/exerciseCoverage.test.ts` |
| Its own question ids and Arabic title | `tools/exercise/check.ts` | `ExercisePicker.test.tsx`, `exerciseCoverage.test.ts` |
| The warm-up | `src/warmup/warmup.ts` | `src/warmup/warmup.test.ts` |
| The maps fit the exercise | `src/hybrid/tour/checks.ts` | `exerciseCoverage.test.ts` |
| The help | `src/content/help/checks.ts` | `src/content/help/help.test.ts` |
| In its chapter, its section | `tools/exercise/check.ts` | `src/content/curriculum.test.ts` |
| A play test with no todo | `tools/exercise/files.ts` | `exerciseCoverage.test.ts` |

A new rule goes in the shared code (`checks.ts`), so the tests and `check:exercise` never disagree.
