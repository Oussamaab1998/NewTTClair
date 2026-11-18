# After the first student test (2026-11-18): build plan

The owner approved the mockups (claude.ai artifact J4iRDWr9sXfLTaLLKFU72C, local copies in the session scratchpad) and asked for the changes on **all four exercises**: `bac2022p-sc-ex2` (tree), `bac2022c-sc-ex2` (urn), `bac2022c-ex2` (probability), `bac2022c-ex4` (analysis, Partie A).

## What changes for the student

1. **The paper comes first.** A question opens on the exam paper (the French statement, the figure, the questions with this one highlighted) and two choices: «نكتب الحل وحدي» (write it like in the exam) or «نمشيو خطوة بخطوة» (the steps, with the teacher). The trip's map stays in «الطريق».
2. **Write it alone.** One sheet, line by line. The engine credits any step he writes, in any order (✓ and "this line counts"). «تعطّلت؟» hands over to the steps from the first step he has not done, and what he wrote alone stays his. When every line step is credited, the question is done.
3. **«ما نعرفش» gives, it does not ask.** Three levels, one per press: the idea, a small example solved in front of him, the method on our numbers with a line to fill (slots and value chips). The button names what comes next. After the third level, «ورّيني الحل الكامل». No AI call on this path. No help text ends with a question.
4. **The teacher has its own screen.** «الأستاذ» in the header opens a full screen. It answers in full (no forced question), takes Arabizi, French or Arabic, answers any bac maths question (a chip says whether the question is about this exercise), declines non-maths, never gives the result of a step he has not done yet. Each answer ends with «فهمت ✓» / «مازال ما فهمتش», not a question. A row of math keys (∩ ∪ Ā p( ) / fraction √ x²) sits above the input, and the input stays above the phone keyboard.
5. **Long-press to ask.** A long press on a formula or on the paper's French opens «شنوّة معناها؟» / «كيفاش نقراها بالفرنسي؟» / «علاش نستعملوها هنا؟» / «نكتب سؤالي وحدي». A glossary entry answers at once (free); otherwise the teacher answers.
6. **Fixes.** The Android keyboard no longer hides the input. The verifier refuses English words in a math block. The chat no longer uses up a hint.

Defaults taken for the owner's open questions (he can change them): two buttons on the paper; three levels; the teacher answers any bac maths and declines the rest; the full solution only after the three levels; a solo question ends when all its line steps are credited (no recipe or similar questions after it).

## The content contract (one help file per exercise)

`src/content/help/<exerciseId>.json`, schema `src/content/help/schema.ts`, loader `src/content/help/help.ts`, generic checks `src/content/help/help.test.ts` (run one exercise with `npx jest src/content/help -t <exerciseId>`).

- `ladders[questionId][frameId]` for **every** `lines` and `cards` step of the question's route (the frame ids are like `mt1.c_path`; list them with the test's "missing" output).
  - `idea`: one to three short paragraphs, plus a legend of the step's symbols.
  - `example`: a story, an optional legend and figure (a `ProbabilityTree` with counts), one to four solved lines (LaTeX), the `rule` it shows (highlighted), the `bridge` back to the exercise.
  - `method`: one to three paragraphs, the general `formula`, and for a **line** step a `fill`: `template` is his line as the board reads it with `{}` slots (`{}*{}={}`), `chips` are values he can drop in, `answer` the right slot values (tests only). A **card** step has no `fill` (the cards are his answer).
- `glossary`: the exercise's symbols and the paper's French words (`match`: LaTeX as shown or the French words), with `meaning`, French `reading`, and `use` (why it is used here, no results).
- The reference entry is `bac2022p-sc-ex2` → `t1` → `mt1.c_path` (from the approved mockups).

Writing rules (CLAUDE.md, plus the owner's word list):
- Tunisian darija; French maths terms in `fr` runs; digits, letters and formulas never inside an `ar` run (RichSchema refuses them): put them in `math`, or in the legend.
- Never: «واش» «سود» «جوج» «اثنين» (زوز) «زوج» before a noun «بس» «لكن» (أما) «هل» «مزيان» (مليح) «دوك» «هاذا» (هذا) «لماذا» (علاش) «شحال» (قدّاش) «الاتنين» «علمًا بـ».
- No question mark anywhere in the help (the test refuses «؟» and "?").
- The example uses numbers of its own: none of its values may equal a value of the exercise he has not found yet (check with the engine). Every numeric line of it is true (the test checks).
- Levels 1 and 2 never give this step's result or its calculation on the exercise's numbers; level 3 gives the method and the operands, not the result.
- Do not copy the official correction's text. `reviewed: false` everywhere.

## Who builds what (same working tree, disjoint files)

| Track | Files it owns |
|---|---|
| Lead (lesson flow) | `src/hybrid/conductor/*`, `src/ai/checks/autoCheck.ts` (acts), `src/app/screens/hybrid/*.tsx` (paper first, solo sheet, hand-over, ladder, fill line, screen wiring, keyboard), `src/content/help/{schema,help,help.test}.ts`, i18n `hybrid.paper`, `hybrid.solo`, `hybrid.ladder` |
| Teacher | `src/ai/teacher/**`, `src/app/screens/hybrid/teacher/**`, the long-press hook in `src/lesson/feed/RichView.tsx`, the math-block word check in `src/ai/verify/message.ts`, i18n `hybrid.teacher`, the `-devTeacher` launch flag |
| Tree content | `src/content/help/bac2022p-sc-ex2.json`, `src/content/help/bac2022p-sc-ex2.test.ts` |
| Urn content | `src/content/help/bac2022c-sc-ex2.json`, `src/content/help/bac2022c-sc-ex2.test.ts` |
| Ex2 content | `src/content/help/bac2022c-ex2.json`, `src/content/help/bac2022c-ex2.test.ts` |
| Ex4 content | `src/content/help/bac2022c-ex4.json`, `src/content/help/bac2022c-ex4.test.ts` |

Nobody else edits a track's files. A problem in another track's file is reported, not fixed. Each track runs its own tests (`npx jest <its files>`); the lead runs `npm run check` at the end.

## Done means

- `npm run check` green; `golden.scEx2.test.ts` and the tree AI tests unchanged.
- Each of the four exercises: every question opens on the paper; solo credits the official lines of each question; every step's three levels render and the fill line credits; long-press and the teacher work.
- Seen on the iOS simulator (`-devLlm off`, `-devMover slow`, `-devTeacher canned` for free runs). Android keyboard: fixed in code, to be seen on the owner's phone.
