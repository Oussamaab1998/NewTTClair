# AI session harness: plan (selector mode, scripted students, summary vs notebook)

Status: PLAN ONLY (2026-10-28). Written for: the product owner. Nothing was built, edited in `src/`, committed or installed. No model call and no API call of any kind was made (`-devLlm off`; `npm run replay -- eval` never run, including `--estimate`, which calls `count_tokens`). After approval this file is copied unchanged to `docs/AI_SESSION_HARNESS_PLAN.md`.

Other sessions: when I started, `ListAgents` showed three other sessions (one busy). I checked file times repeatedly: the last write to the repo was `docs/PROGRESS.md` at 23:01 on 2026-10-27 (the finished probability-v2 run); nothing changed afterwards. Line numbers below are from that state. If another session starts editing `src/planner`, `src/lesson` or `bac2022c-sc-ex2.json`, re-check them before building.

## 0. Summary and what I recommend

- **The question has never been measured in this repo.** The 27-point runs (4 runs, Haiku 5.5, $0.0203 to $0.0228 each) measured valid-output rate, latency and cost only. No agreement with any label was ever computed; the `preferred` lists in `tools/replay/scenarios/*.json` are guesses and are only printed, never scored. D27 (`DECISIONS.md:231`) recorded that where the rules already diagnose a mistake "the AI repeated the authored repair or failed; it added nothing there". So the AI can only matter where the rules are weak. The harness must therefore contain students the rules cannot diagnose (guesser, "needs a picture", undiagnosed values), or A wins by construction.
- **Build the harness in `tools/session-harness/` and prove it at zero cost first (Tier 0).** Zero change to `src/` is the target: every symbol needed is already exported (section 9).
- **Cost, built from measured runs and list prices (section 7):** a selector call is much cheaper than today's planner call (output about 45 tokens instead of 320 to 430). Tier 1 (Haiku 5.5) typical $0.58, low $0.18, high $2.08, **hard cap $2.50**, run in two stages. Tier 2 (Sonnet 5.5, hard cases only) typical $1.12, high $3.40, **hard cap $3.50**. Neither runs without your written OK on the refreshed estimate.
- **Decision rule fixed in advance (section 8).** The notebook is worth building only if it beats the summary-only selector on picture timing and repeated choices by stated margins, with no extra leaks or invalid outputs, at or under the cost target. Otherwise keep B (if B beats A) or stay rules-only.
- **Honest limit:** scripted students measure mechanics and cost, not learning. Their answers to help are assumptions (section 3). Learning gains need real students.

## 1. What exists today (verified by reading)

| Need | Already there | Gap |
|---|---|---|
| Drive a session without UI | `buildContent` (`lesson.ts:95`), `startLesson` (`:2281`), `reduce` (`:2322`), `stepSync` (`orchestrate.ts:146`), `EventLog` + injectable `LogClock` (`telemetry/log.ts`), `nextRightAction` (`app/dev/answerAll.ts:23`), a full scripted-student pattern (`fixtures/realSession1b.ts`) | none |
| Time | Actions carry `at` (ms); `durationMs = at - shownAt` (`lesson.ts:231`) | `at` under 1200 ms or over 180000 ms fires `rule.odd_timing` (`rules.ts:897`); gaps must be modelled (section 3) |
| Decision seam | Reducer only sets `state.pending`; `orchestrate.decideSync` asks the planner; `apply_plan` revalidates (`validateDecision`, `rejectAction`, `stateRejects`) | A selector needs its own settle loop (a copy of `stepSync`'s ~25 lines); drift is caught by the identity test (section 2.5) |
| Menu of authored options | `PlannerMenu` / `buildMenu` (`planner.ts:36,60`): `variantsFor`, `deepDiveOf`, `deepDivesAddressing`, `askChipsFor`, `hasWalkthrough`, `linkOf` | **No public enumerator.** The rules' pools are private methods of `class Rules` (`change`, `deepDive`, `simplerTwin`, `prerequisite`, `transferCandidate`, `hint`, `repairFor`, `clarifyRung`). The harness must rebuild the legal menu itself and prove it matches (section 2.2) |
| Guard | `guardDecision(d, {content, situation, offered})` (`guard.ts:303`), exported; `offered` is an explicit parameter | The guard reads text and props in the Decision. An authored `variant` / `deep_dive` action carries only an id, so **the existing guard does not check authored content the selector points to.** A new per-option leak tag is needed (section 2.3) |
| Catalog gate | `plannerComponents()` keeps `offeredToPlanner !== false` (`plannerFormat.ts:129`); `rejectAction` does not look at it | Authored alternatives already reach probability2 pictures without any override (`alt-1-s4-boxes` GroupBoxes, `alt-1-s6-choice` ChoiceProduct, `alt-1-s8-partwhole` PartWholeBar, `dd_choose_bridge` SlotsPattern). The override only matters for free `show_component` options (section 2.4) |
| Cost and prices | `modelInfo`, `estimateCostUsd`, `worstCaseCostUsd` (`models.ts`), `withCostCap` + ledgers (`costCap.ts`), `readAnthropicUsage` (`anthropic.ts:95`). Prices match your list (Haiku 5.5 0.10 / 0.125 / 0.01 / 0.50; Sonnet 5.5 2 / 2.5 / 0.10 / 10 per M tokens) | none |
| Replay tool | `scenarioPoints`, `logPoints`, `DecisionPoint` (`evalLib.ts`), `LabelsSchema` + `agreement` (`lib.ts`), 27 points (A1 11, 2a 10, 6 logged), `fileLedger` | `eval --estimate` calls `count_tokens`: **not used**. Import only pure functions, never `evalCli.ts` |
| Real Q1 session (30, 48, 12, 720/3, 120/60) | **not in the repo** | Personas are scripted from the authored values and procedures |
| Event line "matches 10x3" | `answer` carries `value`, `correct`, `misconceptionId`, `inferredBy`, `candidates`, `attempt` | The code produces no product form. Line text comes from the matched procedure id + its engine value, or from the authored misconception `signature` / `description` (the `signature` field is validated but never read at runtime). Authored values (30, 48, 360, 19, 24) are matched by exact value, not by form |

Question 1 of `bac2022c-sc-ex2` (`exsc2-0.3.0`), the harness target:

| Step | Kind | Right answer | Wrong values it recognises (misconception, source) |
|---|---|---|---|
| s3 | choice | `at_once` | `put_back` (draws_with_replacement), `ordered` (counts_ordered_draws) |
| boxes | GroupBoxes **gate** (main path) | tap / explore | escape «ما نعرفش، ورّيني» = `gate_passed how:'skipped'` |
| s4 | typed | 120 | 720 (counts_ordered_draws, authored), 30 (multiplies_balls_by_k, authored), 240 (divides_by_balls_not_orderings = 720/3, procedure), 1000, 10 |
| choice | ChoiceProduct **gate** | tap / explore | same escape |
| s6 | typed | 60 | 360, 19, 24, 48 (reads_choose_as_product = 4x12), 4, 120 (procedures: counts_only_reds, gives_total_as_favourable) |
| s8 | typed (fraction) | 1/2 | 5/6, 1/12, 19/120, 2/5, 54/125, 60 or 120 (count_given_as_probability), 2 or 120/60 (probability_above_one) |

Notes that change the personas: **12 is not recognised on the main path** (undiagnosed there; it is the right answer on `alt-1-s6-choice`). **24/3 = 8 exists only on `alt-1-s4-boxes`** (4-ball twin; its procedures give 24, 8, 64; answer 4). **"X given as 1/4" has no Q1 surface** (the `x_given_as_probability` diagnosis was not built, Parts 2 and 3 are not authored): at s8 it would be an undiagnosed value. Detours: deep dives `dd_choose_bridge` (first in array order on purpose), `dd_count_draws`, `dd_and_times`, `dd_fav_total`; simpler twins `sim-1-total-1/2`, `sim-1-onered-1`, `sim-1-p-1`; transfers `tr-1-onered-5r5n`, `tr-1-p-5r5n`; alternatives above. No prerequisites in this exercise.

What the rules do (the baseline A): first wrong with a repair-able misconception gives a **repair card** (picture) that the student must accept (`rule.first_wrong.repair`); second wrong gives `change()` = deep dive first, then alternatives in authored order (so a text deep dive can come before the picture: this is the headroom for B and C); third struggle signal or two "not sure" gives the clarify card (counting / why / link); then simpler twin, walk-through with a silent teacher note, hint. Caps: `maxDetoursPerStep` 3, `MAX_DEPTH` 3, `repeatPerSkillPerSession` 2, `stepBackPerSkillPerSession` 1, `movesPerQuestion` 4, `freshAfterRevealPerSkillPerSession` 1. A reveal is ignored on main steps until the hint ladder is used up (`lesson.ts:1369`).

## 2. Selector mode (harness only)

### 2.1 What the model returns
Fixed output schema (the same for every call, so the cache and the request shape never change):
`{ "option": string (max 40 chars), "reason": string (max 160 chars) }`, no other keys. `option` must be one of the ids in the menu sent in that request. `reason` is internal: never shown, never fed back to the model, kept only in the local run output. No student-facing text, no props, no Arabic anywhere in the selector prompts (ids, English, French math terms only; this also removes every RTL question). Output cap 120 tokens, effort `low`, thinking per `models.ts` (Haiku `disabled`, Sonnet `between_tools`). The ids are checked in code, not by a per-call enum in the schema, because a changing `output_config` schema might affect caching (not verified: see section 10).

### 2.2 The menu (what the model may choose)
`tools/session-harness/menu.ts` builds, for each decision point, a list of options `{id, kind, gist, tags}` from `PlannerMenu`, the `Situation`, `THRESHOLDS` and the exercise, and maps each id to a ready `Decision` (`source: 'llm'`, `ruleId: 'selector.B' | 'selector.C'`):

| kind | maps to | legal now only if |
|---|---|---|
| `hint:N` | `hint` N | N = hintsUsed + 1 and N <= hintCount |
| `dd:<id>` | `deep_dive` | the step's own or a tagged deep dive, not shown, depth/detour caps |
| `alt:<id>`, `sim:<id>`, `pre:<id>`, `tr:<id>` | `variant` / `quiz` | not shown or declined, kind-specific rules (transfer only after a correct answer, twin round order, nextMove caps) |
| `clarify` | `ask_clarify` | struggle >= clarify threshold rules |
| `check`, `note`, `walk` | `numeric_check`, `teacher_note`, `walkthrough` | step has a check; caps; **walk only at the end of the ladder** |
| `selfreport`, `compress`, `transfer` | the correct-path cards | the hard caps allow them (`selfReportsPerQuestion` / `PerSession`, transfer and move caps, compress streak), **not** "the rules would pick them", so a correct student really has something to be interrupted with |
| `continue` | `continue` (re-ask with the authored feedback only, or go on after a correct answer) | always |

Legality is deliberately minimal: caps, ladder order, gates, shown / declined, safety. It must not encode the rules' pedagogy preferences (for example "deep dive before picture"), or the rules would be making the choice and the comparison would be empty. Without this, the "do not interrupt" test on persona 5 would be vacuous (a menu of one option never calls the model).
| `pic:<Component>` | `show_component` | **only with the test-only override** (2.4) |

Each option carries tags used by the metrics and the persona: `representation` (`picture | text | formula | twin`), `component`, `statesNumber`, `leakTag` (2.3), `tried` (already shown on this step or skill). Gists come from `describeAction` (`tools/replay/lib.ts:442`) plus variant metadata, in English/French. The menu order is shuffled per call with a seeded permutation (position bias control). **The rules' own pick is always one member of the menu and is not marked** (blind menu, default); an ablation marks it `default`.

The enumerator mirrors private rules logic, so it can drift. Guard against that with tests: (a) for every decision point reached by any persona, setup, seed and by the 27 static points, `optionIdOf(rules.decideSync(situation))` is in the menu; (b) a "veto table" test forces every authored option of every Q1 step through the reducer at hint levels 0 to 3 and checks that the reducer accepts exactly the options the menu calls legal.

### 2.3 Vetoes, in order
1. **Schema**: output parses with the fixed schema, else `invalid`.
2. **Menu membership**: `unknown_option` / `not_in_menu`.
3. **Legality** (rules veto), computed before the call so the model sees only legal options, and re-checked after: ladder order, caps above, no walk-through or reveal before the ladder end, no repeat of a shown variant, gates.
4. **Guard**: `validateDecision` (menu + `rejectAction`), then `guardDecision` with an explicit `offered` list for any decision that carries text or props (`hint_level`, `component_not_offered`, `component_reveals_answer`, `props_leak`, `final_answer_early`, `no_student_action`...).
5. **Option leak check (new, because the guard cannot see authored content)**: for each option, resolve the authored content it would show (variant intro and step, deep dive blocks and mini, component props) and run `revealsAnswer` (`revealing.ts:185`, `reveals` declared by every probability2 component), `solutionConcepts` and `numbersIn` against the current step's answer while hints are left. A hit gives `leakTag = reveals_answer` and the option is **excluded from the menu** the model sees. Near-misses (`nearMissesOf`, report-only today) are tagged `near_miss` and **kept**, so the report can count how often the model picks one.
6. **Reducer**: `onApplyPlan` revalidates; a refusal becomes `fallback.not_applicable` and is counted as `reducer_refused`.

Any rejection falls back to the rules' own Decision (as in the app) and is counted by reason. A model that is vetoed never sees a student-visible failure. To test the vetoes themselves, Tier 0 uses a **wide menu** (every authored option, legal or not) with noisy stubs (4.1). Live tiers use the legal menu only, because a product would pre-filter.

### 2.4 Test-only catalog override for probability2
- The four components with complete `reveals` and tests (GroupBoxes, ChoiceProduct, SlotsPattern, PartWholeBar; the FINAL report's recommended first four) are listed in one harness constant `OVERRIDE_OFFERED`. It is passed as the explicit `offered` argument of `guardDecision` and read by the harness menu builder, **nothing else**: the registry (`registry.ts`), `plannerComponents`, `catalogText`, the prompt and the four planner caches are untouched. `registry.v2.test.ts` (ten components `offeredToPlanner:false`) stays green and unchanged.
- Two modes. **S1 (default for live tiers): authored options only.** Pictures are reachable through authored variants, which `rejectAction` already allows. **S2 (`--catalog-override probability2`, Tier 0 and an optional small pilot):** adds synthetic `pic:*` options so a picture is available at every wrong step. Props come from a harness table `pictureProps.json`, validated by `resolveSpec` and the component's zod schema, with the same leak check as 2.3. S2 widens the menu beyond authored content, so it is a separate, labelled arm.
- Risk noted in the stack map: `plannerFormat()` runs `toStrictSchema` on offered components and has never seen the probability2 schemas. S1/S2 avoid it (the harness never builds the shipped wire schema); a future real flip of `offeredToPlanner` must test it first.

### 2.5 Why nothing changes in the shipped app
- All new code under `tools/session-harness/` (never reachable from `index.js`, so Metro never bundles it). `src/` is not edited; the target is zero `export` additions (every symbol is already exported). If one turns out to be needed, it is listed in the report as "export-only, zero behaviour" and needs your OK.
- Selector mode is not a `Decision.source` value, not an `LLM_CONFIG` field, not a `-devLlm` value. Harness flags are CLI arguments of the harness only. The rules planner is wrapped, never modified.
- The harness never reads `src/config/llmLocal.generated.ts` (the app's key path). It reads `CLAUDE_API_KEY` from the shell or `.env.llm.local` as `evalCli` does, only inside `tools/session-harness/live/`, never printed, never written to `out/`.
- A hygiene test (like `__tests__/probability2Hygiene.test.js`) enforces: no file under `src/` mentions `session-harness`; no harness file outside `live/` contains `api.anthropic.com`, `fetch(` or `CLAUDE_API_KEY`; nothing imports `tools/replay/evalCli.ts`; no file contains `count_tokens`.
- Tier 0 runs with `fetch` replaced by a function that throws; a test proves a Tier 0 run never calls it.
- Identity test (the main drift guard): a selector stub that returns the rules' own Decision reproduces setup A **event for event** against `stepSync` for all personas and seeds.

## 3. The three setups

| | A: rules only | B: summary-only selector | C: notebook selector |
|---|---|---|---|
| Who decides | rules (`-devLlm off`) | model picks an option id | model picks an option id |
| Cached prefix | none | instructions + option-kind guide + exercise map (steps, skills, misconception list, option catalog), identical text to C | same text as B |
| Per-call part | none | fresh compact pack from `buildPlanPack` dynamic part (step, wrong values and forms tried, derived state, hint level) + this decision's menu | student profile block, then one engine line per student action, rolling summary, then the request (state line + menu) at the very end |
| Memory | none | none beyond the summary | the lines; the model never sees its own earlier `reason` text, only which option was chosen and what the student did next |
| Cache breakpoints | n/a | system, static pack (as the app does today) | prefix, profile, then one block per line group; each call re-uses the previous end as read and writes only the new lines |

Same prefix text and same menu in B and C, so the only difference is memory structure. Instructions are the shipped tutor rules distilled (`TUTOR_BEHAVIOR.md`: change representation on the second wrong, never repeat a form that failed, act on every screen, do not interrupt a correct student). The prompt does **not** say "show a picture before the third wrong": that would measure obedience, not judgment. No current or later step answer is sent (same as D16 Fix A).

**Notebook line grammar** (pure function `eventToLine(event, ctx)`, golden-tested per event type; ids, numbers and tokens only, no free text, no Arabic):
`s4 | typed 30 | wrong | multiplies_balls_by_k ("30 = 10 x 3", authored value) | try 1 | hints 0 | 14s`
`s4 | typed 240 | wrong | divides_by_balls_not_orderings (procedure: 720/3 = 240, engine) | try 2 | hints 0 | 9s`
`s4 | shown alt-1-s4-boxes (GroupBoxes) | chosen by selector.C`
`s4 | explored 3_positions | finding orderings_per_box = 6 | how found`
`s4 | typed 120 | correct | try 3 | hints 1`
Lines come from `answer`, `hint`, `not_sure`, `reveal`, `deepdive`, `component_event` (`shown`, `explored`, `finding` with its engine `calc`), `plan` (option id only), `request`, `clarify`, `card` answers, `self_report`. The words "engine-verified" mean: correct/wrong verdicts and procedure values are computed by the engine; an authored-value match is by exact value and is tagged `authored`. The profile block is derived state from earlier sessions (`deriveState`: status, misconception counts, `representationsHelped`, outcome classes). **Compaction:** after about 30 lines the oldest lines are replaced by an engine-built summary (counts per step, misconceptions seen, representations that helped / failed); this rewrites the cached prefix once (a priced "compaction write"). Hard cap 60 lines; worst case under 10,000 tokens, far below the 100,000-token long-context price step.

Personas get a **cross-session history** option: a synthetic earlier-exercise log fed through `withHistory` (exists in `orchestrate.ts`), for personas 1, 2 and 7, so the profile block has something real to carry. B sees the same history only as the `situation.skills` summary it already gets.

## 4. Personas (deterministic, seeded, rule-based; not model-simulated)

A persona is a pure function `(view, rng) -> action`. `view` is built only from `LessonState` and the log (what is on screen, attempts, hint level, the traits of the help just shown). It never sees a `Decision`, a rule id, an option id or the setup name. Help is classified by a harness table `helpTraits.json` (one row per authored Q1 option: `picture`, `statesNumber`, `interactive`, `text`), which you review together with the assumptions. Randomness: one seeded PRNG (mulberry32, written in the harness; no dependency) with a separate stream per (persona, seed, purpose). Everything below is an **assumption** with a range; the run repeats under three sets (`low` / `base` / `high` = lower end / base / upper end of every probability) to see whether the ranking flips.

P(next try on this step is right) after a kind of help, base [low to high]:

| Persona | Signature (what they type) | text hint 1-2 | hint 3 (states the arithmetic) | deep dive (text + mini) | picture the student acts in | picture that states the number | simpler twin | Card choices |
|---|---|---|---|---|---|---|---|---|
| 1 symbol-as-product | s4: **30**; s6: **12** (undiagnosed on the main path), then **48** | .10 [.05-.25] | .70 [.50-.90] | .20 [.10-.40] | .60 [.40-.85] | .70 [.50-.90] | .25 [.10-.40] | repair yes .8; clarify "counting" |
| 2 divides by k, not k! | s4: **720**, then **240**; on `alt-1-s4-boxes` **24 then 8** (repeats the slip with P .8 if no picture was shown first) | .15 [.05-.30] | .70 [.50-.90] | .35 [.20-.50] | .85 [.65-.95] | .90 [.70-.98] | .30 [.15-.45] | repair yes .8; clarify "counting" |
| 3 counts vs probability | right at s3-s6; s8: **60**, then **120/60 -> 2**, then **1/4** (undiagnosed) | .30 [.15-.45] | .75 [.55-.90] | .45 [.30-.60] | .80 [.60-.95] | .85 [.65-.95] | .35 [.20-.50] | repair yes .8; clarify "link" |
| 4 guesser | random plausible values (answer +-1, +-10 percent, products of visible numbers, recognised wrong values), 3 percent chance of a lucky hit, then reveal after 4 wrongs or all 3 hints | .05 [.02-.15] | .40 [.20-.60] | .05 | .10 (taps once) | .15 | .05 | repair yes .5; clarify random |
| 5 fast good student | right first time, 6 to 20 s per step; gates with one tap; dismisses offers, answers "understood" | n/a | n/a | n/a | n/a | n/a | n/a | must not be interrupted |
| 6 gives up | "not sure" at first sight of s4, then hint x3 quickly, then reveal (a reveal needs the ladder used up); escape at gates | .15 [.05-.30] | .30 [.15-.50] | .10 | .30 [.15-.50] (taps once, then "not sure") | .35 | .10 | repair yes .3; clarify "counting" |
| 7 needs a picture | wrong values from the recognised pools (s4: 720/30/10; s6: 19/24/360; s8: 5/6, 1/12, 2/5) | .05 [.02-.12] | .35 [.20-.55] | .30 (text + OutcomeSpace counts as a picture without a stated number) | .45 [.30-.65] | **.85 [.65-.95]** | .20 [.10-.35] | repair yes .9; clarify "why" |

Between steps a persona also has a **think-time model** (lognormal, seeded, per persona) and a **distraction gap** probability per decision (P1 .05, P4 .10, P6 .20, P7 .10, others .03). A gap is at least 300,000 ms (over the 5-minute cache life) and is placed on an idle action where possible, because a gap before a first correct answer also fires `rule.odd_timing` (slow answer limit 3 minutes): the harness reports that effect separately. Gap sessions are what measures cold-cache cost in C.

Explicit limits: P1 to P3 and P7 draw their wrong values from the same misconception library the rules use, which favours A (circularity, section 10); P4 and the undiagnosed values (12, 1/4) are there to give the AI headroom. A persona is a fixed effect, not a sample of students.

## 5. Decision points and the labelling file

**Two evaluation modes** (kept apart in every report):
- **Dynamic**: full Q1 sessions per persona, setup, seed, assumption set. The AI is asked at **every decision point that has two or more legal options** (primary), and separately under the shipped triggers (`consultReason`: unknown wrong, second struggle, rules fallback) to cost what production would call. Even the perfect student has 4 `correct` decisions (s3, s4, s6, s8), which is where "must not interrupt" is tested.
- **Static**: one decision point at a time, for agreement with labels. Points come from `scenarioPoints` / `logPoints` (the old **27**: A1 11, 2a 10, 6 logged; they are on `bac2022c-ex4` and `ex2`, so they fit the static mode only, not the Q1 personas) plus new **Q1 points** collected from Tier 0 runs of A: first / second / third wrong and "not sure" at s4, s6, s8; the clarify card; each repair offer; the three main-path pictures; `revealed`; correct-after-help; correct-clean (s3, s4, s6, s8, must not interrupt). Rough pool: 27 old + about 25 new; you label about 30, stratified (about 18 Q1, 12 old). For C the notebook of a static point is the event prefix that led to it.

**Point id** = `exerciseId / stepKey / trigger / occurrence / hash(prefix actions) / contentVersion`. A content change (e.g. authoring Parts 2 and 3 bumps `exsc2-*`) invalidates the labels of that exercise on purpose.

**Labelling sheet** (generated, plain words, one block per point): what the student did (the notebook lines in words), what is on screen, the menu with a one-line gist per option, and boxes to tick. **Labelling file** `tools/session-harness/labels/<exercise>.selector-labels.json`:
```
{ "schema": 1, "labeller": "owner|teacher", "teacherReviewed": true, "date": "...",
  "points": [ { "pointId": "...", "preferred": "alt-1-s6-choice" | null,
                "acceptable": ["alt-1-s6-choice","dd_and_times"],
                "unacceptable": ["walk","hint:3"],
                "mustNotInterrupt": false, "note": "..." } ] }
```
An option not listed is neutral. Scoring per setup: **strict agree** (pick in `acceptable`), **harm** (pick in `unacceptable`), **neutral**. With about 30 labelled points a 95 percent Wilson interval is roughly +-17 points wide, so agreement cannot settle a gap smaller than about 20 points: it is a **harm guard**, not the main score.

## 6. Metrics (per setup x persona, pooled over seeds; CSV per decision and per session)

| Metric | Definition (events) |
|---|---|
| Attempts before correct | `answer` with `correct:false` per step before the first correct, summed over Q1 |
| Reveals / hints / interactions | `reveal` events; `hint` events; count of persona actions |
| **Picture before the third wrong try** | per help-needing persona-step (2 or more wrong tries or 2 struggle signals): true if a picture event with that step key occurs **after the first wrong answer and before the third wrong answer**. Picture event = `component_event shown` of a registry `kind:'visual'` component (not `DeepDive`, `Variant`, `NumericKeypad`, `Walkthrough`), or `Variant` / `DeepDive` `shown` whose `payload.representation` is not `'text'`. The main-path `boxes` and `choice` always precede any wrong try, so only events after the first wrong answer count |
| Proactive offers on formula-only routes | planner-initiated cards (repair, self-report, compress, transfer, picture) on steps where the persona had zero wrong and zero "not sure"; reported for P5 as the "do not interrupt" count and compared with A |
| **Repeated choices** | a selection of the same option id or the same representation as an earlier selection on the same step key while the student's state advanced without success |
| Loops and dead ends | state fingerprint (step, attempts, hint level, detour stack, open card) recurring twice with no progress in 6 actions; or no legal action; or session unfinished at 120 actions |
| Guard rejections | count by reason code (`unknown_option`, `not_in_menu`, `hint_level`, `component_*`, `props_leak`, `final_answer_early`, `reducer_refused`, ...), **leaks** (answer shown before ladder end) and **near-misses** (`nearMissesOf` and option `near_miss` tag) |
| Valid-output rate | schema-valid and option in menu, over calls |
| Override rate | share of decisions where the pick differs from the rules' pick |
| Agreement | static mode, section 5 |
| Gaps over 5 minutes | number, and calls that were cold because of them (simulated in Tier 0 by a cache state machine with a 300 s life refreshed on each hit; measured in live tiers) |
| Live only | latency p50 / p95 / within 5 s (the shipped planner timeout), tokens (uncached, cache read, cache write, output), cost per decision and per session, `incomplete` rate |

Every metric table also prints the sample size, the assumption set and the run id, and per-persona rows next to the pooled row.

## 7. Tiers, gates and the cost estimate

**Tier 0 (offline, $0).** Real driver, real menu, real personas, real metrics, real prompt rendering for B and C, with stub selectors:
- *Oracle-A*: returns the rules' own Decision (must reproduce A exactly: the identity test).
- *Oracle-L*: returns the labelled `preferred` option (needs your labels).
- *Policy-P*: "after the second wrong, pick the first untried picture". It must beat A on picture timing for the picture-needing personas, otherwise the personas or menus have no headroom and **I stop before spending anything**. *Policy-Z* ("always continue") must lose.
- *Stubborn* (same option every time): must show repeated choices and loops. *Leaky* (picks `walk` early) must show a leak. *Noisy-valid(e)* (random legal option with probability e) and *Noisy-invalid(d)* (unknown id, bad JSON, illegal option) must show the right rejection counts and valid-output rate. *First-in-menu* measures position bias.
- B and C prompts are rendered and **token-estimated offline** with a chars-per-token ratio calibrated on today's packs (rebuild the 27 points' packs with `buildPlanPack`, divide by the token usage in `tools/replay/out/eval-*.jsonl`), with the spread kept. No tokenizer call is made. The cost simulator uses those counts and the cache state machine.
- `estimate` writes the cost table below with the harness's own numbers and a hash of the whole configuration.

**Tier 1 (live, Haiku 5.5 `low`, after your written OK).** Two stages. Stage 1 pilot, cap $0.15: one persona, one seed, six static points; it replaces the assumed token counts by measured ones and checks the open facts of section 10. I re-issue the estimate; the main stage runs only if the refreshed typical cost is at most 25 percent above what you approved. Stage 2: the full grid. Rules for every live run: `--live` is refused unless `docs/AI_SESSION_HARNESS_APPROVAL.md` holds the run-id hash, the model list and the dollar cap you wrote; `withCostCap` reserves the worst case before each call; no retries; a 429, no credit, auth failure, or valid-output rate under 70 percent after the first 20 calls stops the run; every raw answer goes into a **response cache** keyed by hash(model, effort, request body), so re-running the same configuration costs $0 and the report is reproducible even though the adapter sends no temperature or seed.

**Tier 2 (optional, Sonnet 5.5 `low`, separate OK).** Hard cases only: static points where B and C disagree with each other or with the labels, and 3 personas x 2 seeds of dynamic sessions. Also the answer to "is Haiku good enough".

**Cost estimate** (Haiku 5.5 unless stated; list prices from your message, which match `models.ts`). Anchors from the four earlier runs, 54 calls each: system prompt 6,346 tokens, static pack about 3,000, whole cached prefix 11,177 to 11,877 tokens in run 4, uncached part about 1,000, output 321 to 427, so **$0.00038 to $0.00040 per warm call**, p50 2.5 to 3.1 s, p95 3.2 to 4.4 s (latency was about 2.2 s + 2 ms per output token). A selector call drops the component catalog, wire examples and tutor prose from the prefix and returns about 45 tokens. Assumed sizes, replaced by Tier 0 counts before approval:

| Assumption | low | typical | high |
|---|---|---|---|
| shared prefix (instructions, option guide, exercise map) | 2,000 | 3,000 | 5,000 |
| B fresh pack + menu (uncached) | 700 | 1,100 | 1,600 |
| C profile / tokens per line / lines at a call | 100 / 15 / 15 | 250 / 22 / 25 | 500 / 35 / 45 |
| C request tail (uncached) | 300 | 450 | 700 |
| output tokens | 25 | 45 | 90 |
| decisions per session | 6 | 10 | 18 |
| share of calls that are cold (5-minute life) | 10% | 20% | 35% |

| Per call (Haiku 5.5) | low | typical | high |
|---|---|---|---|
| B warm / cold | $0.000102 / $0.000333 | $0.000162 / $0.000508 | $0.000255 / $0.000830 |
| C warm / cold | $0.000069 / $0.000333 | $0.000111 / $0.000543 | $0.000195 / $0.000999 |
| C compaction rewrite (once per session) | none | $0.000438 | $0.000719 |
| Today's planner call, for comparison | | $0.00038 | |

Grid: 7 personas x 5 seeds x 3 assumption sets = 105 sessions per selector setup (210 sessions), plus 57 static points x 2 setups x 2 passes = 228 calls, plus 10 percent for reruns. **Tier 1 total: low $0.175 (about 1,500 calls), typical $0.58 (about 2,300 calls), high $2.08 (about 4,000 calls). Hard cap $2.50** (pilot $0.15 included). **Tier 2** (Sonnet: about $0.0030 per warm B call, $0.0018 per warm C call; cold calls about 3 to 4 times that): 12 sessions (3 personas x 2 seeds x 2 setups) + 120 static calls (20 points x 2 setups x 3 passes): typical $1.12, high $3.40, **hard cap $3.50**. Worst-case exposure if everything is approved and everything goes high: about $6.00 (caps $2.50 + $3.50). A typical full programme costs about $1.70. Costs scale with the number of decision points, so the shipped-trigger view (fewer calls) is cheaper than the primary "every decision point" view.

## 8. Decision rule (frozen before any live run)

I write the rule, the persona tables, `helpTraits.json`, the thresholds below and the prompt text into `tools/session-harness/PREREG.md`; its hash is part of the run id; you OK it before Tier 1.

**C (notebook) is worth building only if all of these hold, on base assumptions, and the first two also on the low and high sets (ranking must hold in at least 2 of 3 sets, else "inconclusive: keep the current setup"):**
1. **Picture timing**: C beats B by at least **+15 percentage points** pooled over help-needing persona-steps, and no single persona is worse than B by more than 10 points.
2. **Repeated choices**: C at most **half** of B's, **provided B's rate is at least 0.2 per session**. If B is already below that there is no headroom: this test is dropped and the picture margin rises to +20 points.
3. **No more leaks or invalid outputs**: leaks 0 in both and C not above B; valid-output rate C >= 97 percent and not more than 2 points below B; guard-rejection rate not more than 2 points above B.
4. **Do not interrupt**: P5's proactive offers in C and B no higher than in A (hard gate). Zero loops or dead ends in every session (hard gate).
5. **Cost and speed**: median cost per decision <= **$0.0005** on Haiku (about 1.3 x today's $0.00038 planner call) and <= 1.5 x B's; mean cost per session <= **$0.006**; p95 latency <= **5.0 s**, p50 not more than 0.5 s above B; cold calls caused by gaps add at most 30 percent to C's total.
6. **Harm guard**: labelled harm rate of C not above B's.

**Otherwise keep B**, but only if B beats A: B must show +15 points on picture timing over A, meet gates 3 to 6 against A, and not interrupt P5 more than A. If B does not beat A, the answer is rules only, and the notebook question is closed unless C alone clears the same bar against A (then the notebook's extra cost is counted against it). Personas are not a population: pooled numbers carry bootstrap intervals over seeds for information, but the rule uses the margins and the per-persona floor, not a p-value.

## 9. Architecture and files

New (all under `tools/session-harness/` unless stated; test files next to the code, picked up by Jest like `tools/replay/*.test.ts`):
- `cli.ts` (`tsx`; subcommands `points`, `label-sheet`, `run --tier 0|1|2`, `estimate`, `report`, `check-labels`), `README.md`, `PREREG.md`.
- `personas/` (`persona.ts`, one file per persona, `assumptions.json`, `helpTraits.json`, `rng.ts` with mulberry32, `clock.ts` for think time and gaps).
- `driver.ts`: session loop in the style of `playRealSession1b` using `buildContent`, `startLesson`, `EventLog` with a simulated `LogClock`, `stepSync` for A, and an async copy of its settle loop for B/C (`reduce`, `apply_plan`); `withHistory` for the profile history.
- `menu.ts` (legal menu + option to Decision map + `leakTag`), `selector/` (`schema.ts`, `vetoes.ts`, `packB.ts` built on `buildPlanPack`, `notebook.ts`, `prompts.ts`, `stubs.ts`).
- `metrics.ts`, `report.ts` (markdown + CSV), `labels.ts` (format, sheet, scoring; reuses `LabelsSchema` ideas from `tools/replay/lib.ts`), `points.ts` (collection from A runs; wraps `scenarioPoints` / `logPoints`).
- `cost/` (`cacheModel.ts`, `estimate.ts` on `estimateCostUsd` / `modelInfo`), `live/` (`client.ts` thin Anthropic transport using the same host allowlist, headers and `readAnthropicUsage`; `ledger.ts` on `withCostCap` / `fileLedger`; `responseCache.ts`; `approval.ts`).
- Outputs in `tools/session-harness/out/` (gitignored: one `.gitignore` line added at build time): `report.md`, `sessions.csv`, `decisions.csv`, `agreement.csv`, `cost.csv`, `config.json` (run id = hash of git head, content versions, PREREG hash, persona tables, seed list, setup configs, prompt version), and readable session transcripts for you.
- `package.json`: one script, `"harness": "tsx tools/session-harness/cli.ts"` (no new dependency).

Reuse, not rewrite: `realSession1b.ts` player pattern, `nextRightAction`, `orchestrate.stepSync` / `withHistory`, `PlannerMenu`, `buildSituation`, `validateDecision`, `guardDecision`, `revealsAnswer`, `solutionConcepts`, `nearMissesOf`, `describeAction`, `scenarioPoints` / `logPoints`, `agreement`, `estimateCostUsd`, `withCostCap`, `fileLedger`, `deriveState`.

**Reproducibility:** no `Date.now()` or `Math.random()` in the harness (a lint-style test greps for them); one PRNG stream per (persona, seed, purpose); simulated clock; run id in every output; a small golden-file test pins a 2-persona Tier 0 CSV; the response cache makes live reports replayable.

**Existing tests that change: none expected.** `npm run check` must stay green at the current baseline (174 suites, 2423 tests) with only additions; `check:release-dev` unchanged. `tsconfig` includes `**/*.ts` and ESLint runs on `.`, so the harness must pass strict + `exactOptionalPropertyTypes` + lint; `noEval` and `sourceHygiene` tests scan only `src/` (bidi characters are still written as `\u` escapes). Not touched: `catalog.test.ts` snapshot, `registry.v2.test.ts`, `contextPack.test.ts`, `latency.test.ts`, `evalLib.test.ts`.

## 10. Effort, risks, what could not be verified

| Piece | Effort |
|---|---|
| Driver + simulated clock + identity test against `stepSync` | M |
| Legal menu enumerator + veto table + rules-in-menu test | **L** (mirrors private rules logic) |
| Personas, assumption tables, helpTraits, think-time model | M |
| Option leak tags and veto chain | M |
| Notebook builder, profile, compaction, golden tests | M |
| B pack from `buildPlanPack`, prompts B/C | S |
| Stubs and detector tests | S |
| Metrics, CSV and markdown report | M |
| Point collection, labelling sheet, labels format and scoring | S to M |
| Cost simulator, cache model, offline token calibration, `estimate` | M |
| Live client, response cache, approval gate, ledger | M |
| Tier 1 and Tier 2 runs and the write-up | S each |
| Whole programme | **L** |

**Risks**
1. **Circular evidence**: P1 to P3 and P7 use the same misconception library as the rules, so A looks good by construction. Mitigations: P4 and undiagnosed values; the Policy-P headroom test before any spend; personas see traits, not ids.
2. **Simulated students flatter the AI**: if any picture works for P7, any picture-first policy wins and B/C "win" by following the shipped tutor rules, not by judgment. Mitigations: low / base / high sets, the "picture that states the number" distinction, Policy-P as the yardstick (an AI must beat a trivial policy, not only A).
3. **Selector mode drifts from the real planner**: the shipped LLM writes free blocks and component specs under a guard; the selector picks authored options. A win here supports building a selector product, not changing today's planner. The enumerator can drift from the private rules pools (tests in 2.2). The AI is asked at every decision point, far more than production would.
4. **Personas too neat**: real students mix mistakes, retype, wander, hesitate; the 30, 48, 12 session is not in the repo. Treat results as mechanics only; collect real sessions with the existing export before trusting any margin.
5. **Headroom is partly a content artefact**: the rules put a text deep dive before the picture in `change()`; if you reorder content, A improves and the gap shrinks.
6. **Model non-determinism and position bias**: one sample per state, no seed available; response cache and shuffled menus reduce, not remove.
7. **Labels**: about 30 points give wide intervals; labels made from A's paths can anchor on A.
8. **Content moves**: authoring Parts 2 and 3 bumps `exsc2-*`, invalidating Q1 labels and fingerprints by design.

**Could not be verified here (no model or API call allowed):** real latency, tokens and cost of a selector call (all estimated; anchors only); whether a changing `output_config` schema changes cache behaviour (hence the fixed schema); the cache look-back window when a notebook grows by many blocks between calls (one block per line group, new breakpoint at the end, Stage 1 checks cache read tokens); that cache writes and reads on Haiku 5.5 / Sonnet 5.5 behave as in `models.ts` for blocks under 512 tokens; Sonnet `between_tools` output size at low effort; whether the 1-hour cache life (not priced in your list) would help C; the quality of Haiku at picking among 5 to 9 options; every Arabic string (all `reviewed: false`, none sent to the model); any device behaviour (iOS or cheap Android): the harness runs on Node only; `probability2` schemas through `toStrictSchema`.

## 11. Order of work and stop points

1. Driver, menu, identity test, A-only runs of the 7 personas. **Stop 1:** you read two or three session transcripts in plain words and the assumption tables.
2. Metrics and reports on A; point collection and the labelling sheet. **Stop 2:** you label about 30 points (can run in parallel with step 3).
3. Selector contract, vetoes, notebook, B/C prompt rendering, stubs, offline token calibration, `estimate`. Tier 0 detector tests (including the Policy-P headroom check). **Stop 3:** you receive the refreshed cost table, `PREREG.md` and the approval file template. Nothing live runs before you write the approval.
4. Tier 1 stage 1 (pilot), refreshed estimate, then stage 2; optional Tier 2 after another OK. Final report with the decision rule applied.

## 12. Open questions (plain words, each with my default)

1. **Approve the money?** Not now. Default: decide after Stop 3 on the refreshed numbers; Tier 1 cap $2.50, Tier 2 cap $3.50, each separately.
2. **When is the AI asked in the main runs?** Default: at every decision point with two or more legal options; the shipped triggers as a second, cheaper view.
3. **Authored options only, or also synthetic pictures through the test-only override?** Default: authored only for live runs (S1); the override (S2) only in Tier 0 and an optional small pilot.
4. **Show which option the rules would pick?** Default: no (blind menu); an ablation marks it.
5. **"X given as 1/4"**: it has no home in Q1. Default: use 1/4 as an undiagnosed wrong value at s8 for persona 3, and drop the rest of that idea until Parts 2 and 3 exist.
6. **Who labels, and how?** Default: you, with the generated sheet, three levels (preferred / acceptable / unacceptable), about 30 points, 18 from Q1 and 12 from the old 27.
7. **Cache life.** Default: the 5 minutes the app uses today. A 1-hour option exists but is not priced in your list.
8. **Allowed repo additions at build time**: the `tools/session-harness/` folder, one `npm run harness` script, one `.gitignore` line. Default: yes.
9. **Student data in the notebook.** Typed numbers and ids only, synthetic students, harness only. Default: fine here; a production notebook needs the legal check in CLAUDE.md rule 8 first.
10. **Sonnet.** Default: hard cases only, separate approval.
11. **History for the profile block.** Default: synthetic earlier-exercise logs for P1, P2 and P7 only.
12. **Where this plan lives.** Default: copy it unchanged to `docs/AI_SESSION_HARNESS_PLAN.md` after you approve.

## Verification (when built)

- `npm run check` green with only additions; `npm run check:release-dev` unchanged.
- Identity test: Oracle-A equals A event for event (all personas, 5 seeds).
- Rules-in-menu test and veto table pass on all reachable decision points and the 27 static points.
- Detector tests: Policy-P > A and Policy-Z < A on picture timing; Stubborn shows repeats and loops; Leaky shows a leak; Noisy-invalid shows the right reasons; a Tier 0 run never calls `fetch`; two runs with the same seed produce byte-identical CSV.
- Hygiene tests: no `src/` reference to the harness; no network or key text outside `live/`; no `count_tokens`.
- Live: refused without the approval file; ledger never exceeds the cap; the second run of the same configuration costs $0 (response cache).
