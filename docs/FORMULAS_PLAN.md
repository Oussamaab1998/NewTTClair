# «Formules»: build plan

The owner liked the tap-through mockups on 2026-11-19 (10 screens, also on the page https://claude.ai/artifact/APdkAH3TPtahgNMmatEghd). The student learns the rules of a theme, trains them, and checks them fast; each rule comes back on later days. Nothing here calls the AI.

## Progress

- 2026-11-19: the owner answered questions 7 and 8 (decisions 7 and 8 below). Questions 1 to 6 keep their defaults unless the owner says otherwise.
- **Stage 1, done (2026-11-19, not committed).** 12 Dérivées rules in `src/content/formulas/derivees.json` (`reviewed: false`).
  - Code: `src/formulas/` has the schema, `law.ts` (the law checked on sample functions with a numeric slope), `display.ts`, `checks.ts` and `themes.ts`.
  - A rule keeps its law as engine expressions only. The LaTeX the student sees is drawn from them, so what is shown is what was checked.
  - Tests: `law.test.ts`, `display.test.ts` and `checks.test.ts`. They run every check on every rule, and plant one mistake per check to show it is caught.
  - Change from the plan: (f∘u)′ is left out. The native renderer cannot draw ∘, and (√u)′, (eᵘ)′, (ln u)′ and (uⁿ)′ cover the composition cases a student meets.
  - Not done: the `check:formulas` script (the tests run the same checks).
- **Stage 2, done (2026-11-19, not committed).** `src/formulas/drills/`:
  - `parts.ts`: the function families, `instantiate` (a rule's law with concrete functions, for a seed) and `tidy` (4·3 → 12, x^(5−1) → x⁴, x³ + (−3x − 3) → x³ − 3x − 3, same value).
    - A draw is kept only if f′ is not 0, differs from every trap, and the traps differ from each other. Otherwise it draws again.
    - This came from the 500-seed test: with u = x + 1, u′ = 1 and «Oublier u′» gave the right answer.
  - `counterexample.ts`: the simplest functions and x where a trap and the rule give two different nice numbers. For the quotient this is the mockup's u = x, v = x, at x = 1.
  - `drills.ts` has the four items and the judge:
    - «Vrai ou faux» shows the true rule about one time in three, so «Faux» is not always right.
    - `judgeCalc` takes "f′(x) = …", a plain expression or a chain. It judges the first side that is not f′(x) and names the trap it equals.
    - The judge and the draws compare with 160 random points (`DRILL_EQUIVALENCE`), so a function defined on a small range, like √(−x − 3), is still judged.
    - «Quelle règle ?» asks only about the seven rules built on u and v. Its options are rules of another outer shape (power, root, quotient, product, e, ln), so a wrong option never also fits f.
  - «ما نعرفش» in «Calcule»: 1. the rule; 2. u, u′, v, v′ (or (6√x)′ = 6 × (√x)′); 3. the answer.
  - Tests in `drills.test.ts`:
    - 500 seeds per rule: f′ is the slope of f, f is not constant, tidying keeps the value, and traps are apart;
    - every item is drawable;
    - the judge on mockup 6's line;
    - a counter-example for every trap.
- **Stage 3, done (2026-11-19, not committed):**
  - `log.ts`: the record under `formulas.v1` and `ruleState`. Due days are 1, then 3, 7, 21. Only Vérif answers decide Retenue. Its own day helpers, so it does not import the uncommitted «Mes erreurs» code.
  - `visible.ts`: his year and the year before. Bac gets the 3ème rules as reminders; 3ème, 2ème and 1ère get no reminders for Dérivées.
  - `check.ts`: `dueRules`, `pickCheck` (5 at most, mixed, never «Calcule») and `formulaDigest` (ids and statuses only).
  - `events.ts`: the fields of `formula_view`, `formula_drill` and `formula_check`.
  - Not joined yet to `src/telemetry/events.ts` and `docs/DATA.md`, because those files hold uncommitted «Mes erreurs» work. Same for the AI digest. Both are joined in stage 4 or 5, once that work is committed.
  - Tests: `log.test.ts` and `check.test.ts`.
  - Not built: storing the hide mode's «Je savais» (it only reorders the list; the screen can keep it in memory).
- **Stage 4, done in its own folder (2026-11-19, not committed; owner: "build screens in own folder").** `src/app/screens/formulas/`:
  - `FormulaList` (the list and the hide mode), `RuleCard`, `DrillSession` (training and Vérif rapide, the four drills), `CheckResult`, and `FormulasFlow`, which joins them over `formulas.v1`.
  - The pure parts are in `src/formulas/session.ts`: plans, list groups in textbook order, taps turned into verdicts, "revient dans n jours".
  - Words: their own i18n namespace `formulas` (`src/i18n/formulas/{fr,ar-TN}.json`, simple French, «ما نعرفش» only in ar-TN). It is registered in `src/i18n/index.ts` and `i18next.d.ts`. `src/i18n/formulas.test.ts` checks it.
  - Opened from the dev tab «Formules» (`-devTab formulas`, `FormulasDemoScreen`, added in App.tsx). The tab has a class picker and «Effacer mes réponses».
  - Not wired to the home, the chapters or the lesson yet: that is stage 5.
  - «Calcule» uses the lessons' `Worksheet` (keys x, e, powers, fractions). (√x)′ and (√u)′ get no «Calcule» because the keypad has no √ key (`typable`).
  - Its verdict and the help cards sit above the sheet, so the keypad does not hide them.
  - Events: `FormulasFlow` sends the «Formules» events to an `onEvent` prop. They are not in the app's event log yet (stage 5).
  - Tests: `FormulasFlow.test.tsx` covers the list, the card with 6 questions recorded, «ما نعرفش» in «Calcule», the Vérif rapide and its result, and the hide mode. Its worksheet is a stand-in. `FormulasCalc.test.tsx` types a line with the real keypad.
  - Checked on the iPhone 17 Pro simulator (AI off) for Bac Sc. exp.: the list, the rule card, «Complète» (a wrong tile), «Vrai ou faux» (the counter-example), «Calcule» (1/(4x − 3) is named «Oublier u′»), the Vérif rapide with one miss, and the result.
  - Fixed from that pass: (ln u)′ was drawn (ln(u))′; the «Calcule» verdict was below the keypad.
  - Seen once: «Suivant» needed a second tap twice on the simulator, probably a tap during a re-render; not reproduced.
  - The worksheet's own «نثبّت» button stays in Arabic (shared component).
- Next: stage 5, the ways in. These edit `LessonScreen.tsx`, the home and the chapter screen, and join the events to `src/telemetry/events.ts` and `docs/DATA.md`. Other work currently has uncommitted changes in those files: the «Mes erreurs» work, and an accounts session that is editing App.tsx, the home and onboarding right now.

## Decisions (defaults; the owner can change any)

1. The name in the app is «Formules».
2. The first theme is **Dérivées**, about 12 rules from 3ème to Bac (list in stage 1).
3. Statuses, each with a shape and a word: Nouvelle, En cours, Retenue.
   - Nouvelle: never trained.
   - En cours: trained at least once.
   - Retenue: right in a Vérif rapide on two different days.
   - A rule comes back after 1, 3, 7, then 21 days. A miss in a Vérif rapide sends it back to 1 day and to En cours.
   - The hide mode («Je savais») never changes a status. It only changes the order of the list.
4. No total score, no level, no count, and no clock (D8).
5. New UI text in simple French. «ما نعرفش» stays the help button, as in the lessons.
6. All content is `reviewed: false` until a Tunisian maths teacher reads it.
7. **A wrong answer in a drill does not go to «Mes erreurs»** (owner, 2026-11-19: the default). «Mes erreurs» stays for errors made in exercises; the drill's trap stays in the formula's own record.
8. **A student sees the rules of their own year and of the year before** (owner, 2026-11-19: "we need to remind him of what can be lost from his mind").
   - The year before's rules are marked «Rappel de 2ème», «Rappel de 3ème», and so on.
   - 1ère has no year before in the app, so it shows its own rules only.
   - They are reminders, not new lessons. They go straight into the Vérif rapide, with no training first. A miss opens the rule card and the drills, and the rule follows the normal schedule from there.
   - For Dérivées, this means a 3ème student sees 3ème rules only (2ème has no derivatives, checked in the curriculum map). A Bac student sees the Bac rules and the 3ème rules. The rule matters more for later themes: for Suites, a 3ème student also gets the 2ème rules on arithmetic and geometric sequences.
   - The year comes from `student.class.v1`. The section decides the chapters, through the curriculum map.

## Stage 1: the rules (content and checks)

`src/content/formulas/derivees.json`, read through a zod schema (`src/formulas/schema.ts`). One entry per rule:

- `id`, `theme`, `chapters` (ids from the curriculum map) and `years`;
- `name`, `formula` (LaTeX), `condition` and `say` (how it is said aloud), in French;
- `example`: a function and its derivative;
- `traps`: the wrong forms students write, each with a French `title` and `why`, like the misconceptions of «Mes erreurs»;
- `copy`: the sentence for the exam copy;
- `tiles`: the four tiles of «Complète».

The Dérivées rules:

| Taught in | Rules |
|---|---|
| 3ème, Fonction dérivée | (xⁿ)′, (√x)′, (1/x)′, (u + v)′, (ku)′, (uv)′, (1/v)′, (u/v)′, (uⁿ)′ |
| Bac, Dérivabilité | (√u)′ ((f∘u)′ left out: the renderer cannot draw ∘) |
| Bac, Fonction exponentielle | (eᵘ)′ |
| Bac, Fonction logarithme népérien | (ln u)′ |

A teacher confirms which year teaches (uⁿ)′ and (√u)′.

Checks (tests, and later in a `check:formulas` script):

- every formula is drawable by the app's math renderer;
- the example's derivative is right: the engine compares it with a numeric derivative of the function at sample points;
- exactly one «Complète» tile makes the formula true (tested on sample functions u and v);
- every trap really differs from the rule;
- the French has no Arabic and no question mark in titles.

## Stage 2: the drills (engine, no AI)

All in `src/formulas/drills/`, pure and seeded.

- **Complète:** the hole and the four tiles from the content.
- **Vrai ou faux:** the trap as a statement. The counter-example is searched by the engine: the first pair of small functions (u, v) from a fixed list where both sides differ at a nice value of x. It is shown with its numbers, as in mockup 5.
- **Calcule:** a generator per rule makes a function with small whole coefficients.
  - The student types f′(x) with the keypad of the lessons. Every line must equal f′(x), so unsimplified lines count.
  - Verdict by equivalence: right, or the trap it equals (order swapped, u′/v′, v instead of v², …), named with its title, or wrong.
  - «ما نعرفش»: 1. the formula, 2. u, u′, v, v′ for this function, 3. the answer.
- **Quelle règle ?:** a function from one rule's generator, with three other rules of the theme as options. A test checks that no other option also fits the function.
- **Tests:** 500 seeds per generator.
  - Every function is defined at the sample points.
  - The right answer never equals a trap.
  - No two traps give the same value.

Not in v1: «La phrase de la copie» as a drill (the sentence is shown on the rule card), and «Écris-la de mémoire».

## Stage 3: the record and the schedule

- `src/formulas/log.ts`, pure, stored under `formulas.v1`, built like `mistakes.v1`.
  - Per rule it keeps the last answers (drill or Vérif, the verdict, the trap id, the day).
  - Status and due day are computed from these, never stored.
- **Which rules:** the student's year and the year before (decision 8), from `student.class.v1` and the curriculum map.
- **The Vérif rapide:**
  - up to 5 rules that are due today, from all themes, mixed;
  - the year before's rules are due from the first day, as reminders (decision 8);
  - one item each, never «Calcule» (too long for a fast check);
  - no help.
- **Events** (rule 5; `src/telemetry/events.ts` and `docs/DATA.md`):
  - `formula_view` (rule card or list opened);
  - `formula_drill` (kind, verdict, trap id);
  - `formula_check` (start, each answer, end).
- The AI digest gets rule ids and statuses only.
- Tests cover these cases:
  - a new rule;
  - trained once;
  - right on two days, which makes it Retenue;
  - a miss, which sends it back to 1 day;
  - the due day after each.

## Stage 4: the screens

`src/app/screens/formulas/`, one flow `FormulasFlow`, a state of `LessonScreen` like `MistakesFlow`.

- The list of a theme with its filters (mockup 2), and the hide mode.
- The rule card (mockup 3).
- One drill screen for the four drills (mockups 4 to 7): header, progress bar, question card and the bottom bar. «Calcule» uses the lessons' line editor and keypad.
- The Vérif rapide (mockup 8) and its result (mockup 9).
- A `-devFormulas seed|open` launch argument (debug builds) fills the record with the mockups' statuses and opens the flow.
- Checks:
  - RNTL tests per screen (what shows, what each button opens, the events);
  - a simulator pass with the AI off.

## Stage 5: the ways in

- **The home card «Formules du jour»** (mockup 1): only when a rule is due.
- **A «Formules» link** on the chapter screen, for chapters that have rules.
- **The card before a question** (mockup 10):
  - each question lists the rules it uses (`formulas` on the question, starting with bac2022c-ex4 A.3.a: (u/v)′ and (eᵘ)′);
  - the card shows only when one of them is not Retenue;
  - «Commencer la question» stays the main button.

## Order and size

| Stage | Size | Needs |
|---|---|---|
| 1 Rules and checks | small to medium | the owner reads the French |
| 2 Drills | medium | 1 |
| 3 Record and schedule | small | nothing |
| 4 Screens | medium | 2, 3 |
| 5 Ways in | small | 4, and the «Mes erreurs» work committed |

Stages 1 and 3 can be built at the same time. `npm run check` stays green at the end of each stage, and stages 4 and 5 end with a simulator pass with the AI off.

## Files shared with other work

New code goes in new folders: `src/formulas/`, `src/content/formulas/`, `src/app/screens/formulas/`. Some shared files already have uncommitted «Mes erreurs» work:

- `LessonScreen.tsx`;
- the hybrid lesson screen;
- `events.ts`, `DATA.md` and the i18n files;
- `DECISIONS.md`.

These are touched only in stages 3 to 5, and only after that work is committed. The decision gets its number (D95 or next) at that point. The home screen and the chapter screen are touched only in stage 5.

## Questions for the owner (each with its default)

1. The name in the app. Default: «Formules».
2. The first theme. Default: Dérivées. Other choice: Probabilités, which links to the three probability exercises already built.
3. A total score at the end of the Vérif rapide. Default: no. A ✓ or × per rule and its status.
4. A clock in the Vérif rapide. Default: no. Time only in an optional «Défi 60 s» later.
5. The card before a question shows only when a rule it needs is not Retenue. Default: yes, and it never blocks.
6. «La phrase de la copie» as a drill in v1. Default: no. The sentence is on the rule card.
7. ~~A trap answered in a drill also goes to «Mes erreurs».~~ **Answered (2026-11-19): no.** See decision 7.
8. ~~Which rules a student sees.~~ **Answered (2026-11-19): their own year and the year before, as reminders.** See decision 8.
