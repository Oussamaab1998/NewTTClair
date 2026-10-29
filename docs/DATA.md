# Data: content schema, events, student state

## 1. Content (JSON, validated by zod)
Content is ground truth. The planner may reorder, skip, or add from the component menu, but must stay consistent with it.

```ts
interface Exercise {
  id: string;                    // "bac2022c-ex2"
  title: { fr: string; ar: string };
  statement: Rich;               // French original (+ optional ar gloss)
  parts: Question[];
  results: Result[];             // "résultats acquis" that later questions may use
  reviewed: boolean;
}
interface Question {
  id: string;                    // "1b"
  goal: Rich; expected: Result["id"];
  uses: Result["id"][];          // earlier results needed
  methodId?: string;
  groups: StepGroup[];           // guided path
  probe?: { prompt: Rich; answer: AnswerSpec }; // "try alone" check
  writeup: { elements: string[]; modelFr: string[] }; // exam-paper lines, French
}
interface Step {
  id: string; kind: "text"|"math"|"component"|"choice"|"typed"|"ordering"|"deepdive";
  skills: string[];
  // choice/typed:
  prompt?: Rich;
  options?: { id: string; label: Rich; misconceptionId?: string; feedback?: Rich }[];
  answer?: AnswerSpec;           // computed by engine, never hand-copied
  hints?: Rich[];                // max 3
  deepDiveId?: string;           // used by "ما نعرفش"
  component?: ComponentSpec;     // see COMPONENTS_CONTRACT.md
}
type AnswerSpec =
  | { type: "fraction"; compute: EngineCall }     // e.g. P(B) = 7/10
  | { type: "expression"; equivalentTo: string }  // numeric-sample equivalence
  | { type: "option"; id: string }
  | { type: "set"; compute: EngineCall }          // e.g. outcomes satisfying an event
  | { type: "parity"; fn: FnId };                 // correct option = the one whose `parity` (even|odd|neither) the engine finds for fn (sampled)
type EngineCall = { fn: string; args: Record<string, unknown> };
type Rich = { ar?: string; fr?: string; math?: string };   // math in a separate field
```
Rules: formulas live in `math` fields (rendered as LTR blocks), never inside `ar` strings. A `Misconception` library (`misconceptions.json`) holds `{ id, skillId, description, signature, repairComponent? }`; options reference it by id so wrong answers become data, not just messages.

## 2. Events (append-only log)
Everything else (review screen, planner) is derived from events.
```ts
interface BaseEvent {
  id: string; ts: number; sessionId: string; studentId: string;   // pseudonymous
  exerciseId: string; questionId: string; stepId: string;
  durationMs?: number;                                           // time on step
}
type Event =
 | (BaseEvent & { t: "answer"; kind: "choice"|"typed"|"ordering"; value: unknown; correct: boolean; misconceptionId?: string; attempt: number })
 | (BaseEvent & { t: "not_sure"; deepDiveId: string; attempt: number })
 | (BaseEvent & { t: "hint"; level: 1|2|3 })
 | (BaseEvent & { t: "deepdive"; deepDiveId: string; outcome: "completed"|"abandoned"; miniCorrect?: boolean })
 | (BaseEvent & { t: "component_event"; component: string; name: string; payload: Record<string, unknown> })
 | (BaseEvent & { t: "ask"; via: "longpress"|"field"; mode?: "explain"|"why"|"example"; quoted?: string; text?: string; source: "local"|"ai" })
 | (BaseEvent & { t: "mode"; value: "guided"|"try_alone"; result?: "skip_ok"|"skip_fail" })
 | (BaseEvent & { t: "self_report"; value: "understood"|"guessed" })
 | (BaseEvent & { t: "transfer"; skillId: string; correct: boolean; variantId: string; hintsUsed: number })
 | (BaseEvent & { t: "admit"; resultId: string });
```
Additions in the app (Phase 2):
- Every event carries `contentVersion` (with `exerciseId`), so `stepId -> skills` stays correct when content changes.
- `answer.kind: "task"`: the result of a task component (EventPicker, LawBuilder); `value` holds its details (selected/correct/missed/extra ids, table, sum).
- `skip { reason: "knows_it" | "not_now" }`: an optional task the student chose not to do.
- `part_done { counted, answered, revealed }` (stepId `part`): the part reached its done line. `counted` = its required acting steps (questions, lines, tasks, prediction gates; not optional practice), `answered` = those the student did, `revealed` = those shown at the end of the hint ladder. Emitted by the reducer (`finish`), derived (replay ignores it).
- `exercise_reset {}` (its own short session `reset-…`, `questionId` `"exercise"`, `stepId` `"reset"`): «ابدا من جديد», the student started the exercise (`exerciseId`) from scratch. Only progress is reset (Done parts below); every stored event stays. Replay and the planner ignore it as an event (not a decision point); the planner keeps reading the history before it (DECISIONS.md D25). With it, in the same session: `component_event { component: "ResetDialog", name: "opened" | "cancelled" | "confirmed" }`, payload `{ exerciseId }` (+ `via: "no" | "scrim" | "back_gesture"` when cancelled).
- `component_event` names logged by the lesson itself: `shown` (a component entered the feed: the source for `representationsTried`) and `cell_filled_by_lesson { value, source: "solved" | "revealed" }` (a law cell filled after an EventPicker; `revealed` = shown at the end of the hint ladder, never a correct answer).

Additions in Phase 3 (planner):
- `plan { trigger, decision }`: the validated planner decision at a decision point (rule id, source `rules|llm|fallback`, action, representation). Replay re-applies it, so an LLM session replays the same.
- `request { kind: "change_method" | "simpler" }` (card buttons), `clarify { choice: "counting" | "why" | "link" }` (answer to ask_clarify), `offer_response { offer: "compress" | "repair" | "teacher_note", accepted }`.
- Round 3 (2026-10-22):
  - **D1:** a wrong answer's misconception is counted under the library's `skillId`. The wrong answer and its signal stay on the step's skills; the misconception's own skill gets one signal (`evidence.misconceptionSignals`) when it is not one of them.
  - **E1:** `SkillState.outcomes { counts, recent }` from `attemptOutcomes` (`src/state/outcomes.ts`). Classes: `first_try`, `after_retry`, `after_hint`, `after_detour`, `revealed`, `guessed`, `transfer_ok`, `transfer_fail`.
  - **E2:** `next_move { outcome, wanted, move, stoppedBy?, ruleId }`, logged with every rules decision that carries `decision.nextMove`. `stoppedBy` is one of `repeatPerSkillPerSession`, `stepBackPerSkillPerSession`, `movesPerQuestion`, `freshAfterRevealPerSkillPerSession` or `no_content`. Planner-internal; never shown to students.
- Round 2 (2026-10-22):
  - A main step's `reveal` is a decision point (planner trigger `revealed`). A transfer revealed closes with `detour_closed` (outcome `revealed`). Both may open a fresh variant (`rule.after_reveal.fresh`, a transfer flagged `afterReveal` on its own urn); otherwise `rule.after_reveal.none`.
  - `part_done.revealed` counts the main steps revealed, plus each detour step (variant or mini) revealed at least once. It may exceed `counted − answered`; "done" is still `answered >= 1`.
  - Walk-through: `component_event { component: "Walkthrough", name: "line", payload: { index } }`; index 0 comes with the planner's decision, later lines are taps (replay: `walkthrough_next`).
  - `teacher_note.silent: true`: queued by the rules with no card.
- Long-press with no verified answer (round 1, 2026-10-22): `ask.unanswered: true`, a struggle signal (situation `struggle`, derived evidence `unanswered`); the first time on a block an `ask_next` card offers the next hint or the deep dive (`offer_response { offer: "ask_next", accepted }`, then the usual `hint` / `deepdive` events); later asks on that block get the help at once. A probe card whose answers would all lead to the same action is dropped before it is shown (no `probe` event).
- Typed wrong values (Tutor intelligence 1, C3): `answer.inferredBy: "authored" | "procedure"` (an authored `wrongAnswers` value, or the engine's wrong procedures) and `answer.candidates` (the misconceptions of the matching procedures, in table order; `misconceptionId` is the first). With two or more candidates a probe card asks once per step: `probe { value, candidates, choice: id | null, movedOn? }` (`choice: null` = "not now", or the card closed because the student acted on the step, then `movedOn: true`). An answered probe is a `wrong` decision point; the planner uses its choice as that answer's misconception.
- `teacher_note { noteId, skillIds, misconceptionIds, ruleId }`: ids only, no free text; collected by `src/telemetry/notes.ts` (local queue, exportable).
- Phase 4: `plan.shownSource: "rules" | "llm"` (what the student ended up seeing in the provisional flow; `plan.decision.llmRequestId` on LLM decisions).
- `llm_call { requestId, purpose: "plan" | "tutor", model, outcome, statusClass: "none" | "2xx" | "4xx" | "5xx", latencyMs, inputTokens?, cachedInputTokens?, cacheWriteInputTokens?, outputTokens?, costUsd?, reasons?, trigger? }`: one per LLM call or skipped call (`disabled`, `capped`) or late answer (`stale`). Outcome is our own class (`ok`, `rejected`, `timeout`, `network`, `rate_limited`, `no_credit`, `spend_limit`, `auth`, `provider`, `refused`, `incomplete`, `invalid`, `config`); `reasons` are our own guard / schema codes. Never prompt, answer or provider text. Not written when there is no key. `trigger` (D26): why the AI was asked (`unknown_wrong`, `second_struggle`, `line_wrong`, `line_invalid`, `every_mistake`, `request`, `rules_fallback`, `forced`); `cacheWriteInputTokens`: Anthropic prompt-cache writes (billed above input). `prepMs`, `headersMs`, `bodyMs` (2026-10-22, Anthropic transport): building the request before fetch, fetch until the response headers, reading the body; a call that timed out has `prepMs` only.
- `llm_model_check { client, model, result, statusClass, latencyMs, providerType?, returnedId?, apiVersion? }` (Tutor intelligence 1, A1b): the startup model check (`GET /v1/models/{id}`), once per app run, logged by the first lesson that sees it settled (`stepId: "none"`). `result` is `ok` or our error class (as `llm_call.outcome`); `providerType` an allowlisted provider `error.type`; `returnedId` the model id a 200 answered with when it is not the one asked (then `result: invalid`); `apiVersion` the `anthropic-version` header sent. Never message text or a key. Not written when there is no key. The last result is also kept in MMKV (`llm.modelCheck.v1`) and shown in the dev status line and the AI trace header.
- `tutor_answer { source: "verified" | "ai" | "saved", requestId?, blocks, mathVerified, mathUnverified, mathDropped }`: what the tutor drawer answered (counts only). The drawer's question is the preceding `ask { via: "field", text, source, snapshot.drawer: true }`; drawer choices are `component_event { component: "TutorDrawer", name: "understood" | "still_unclear" | "back" }`.
- The exam paper screen (outside a lesson, its own session id `paper-…`, `questionId` / `stepId` `"paper"`): `component_event { component: "ExamPaper", name: "opened" | "closed" | "start" }`, payloads `{}`, `{ via: "back" }`, `{ partId }`.
- `ask.snapshot.components`: on ask and long-press, the active card's component state and the last visual component's state (`{ active?, lastVisual? }`), capped at 2,048 characters.
- `feedback { choice: "disliked" | "ok" | "liked", text? }`: the end-of-question card (DECISIONS D19), stepId "none"; queued with the reports.
- `report` (FEEDBACK_AND_TRUST.md) is now written by the Report sheet; the queue entry (`src/telemetry/reports.ts`, MMKV) adds device, last 20 events without free text, component spec and the LLM request id.
- `component_event` names: `shown` with component `DeepDive` (payload `deepDiveId`, `representation: "text"`) when a deep dive opens; `Variant` `shown` / `closed` (payload `variantId`, `kind`, `representation`, `round`, `outcome`).
- `self_report.value` may be `"dismissed"` ("not now"): never evidence. `deepdive.helped`: did the deep dive help (choice / typed minis: right first try; task minis: right with at most one wrong try).
- `transfer` is emitted only when a `transfer` variant (a changed version of a solved step) is answered. `example_round` when a simpler twin ends.

Additions in Phase 5 (Exercise 4):
- `answer.kind: "lines"` (line-by-line writing): a wrong line is an `answer` with `correct: false`, `value` = the line (safe-parser syntax) and the `misconceptionId` the checker found (known wrong line, or `missing_parentheses_fraction`); the line in the goal's written form is the correct `answer`, `value` = all accepted lines. `jumped: true` when that was the first line (the goal written at once, no reasoning shown): the planner treats it like "right answer, no reasoning shown" (`rule.jumped_to_goal`: self-report, then the transfer).
- `component_event` from `PredictReveal`: `predicted { optionId }` / `revealed {}`: the first one opens the step's gate (the lesson goes on; not graded; replay turns it into `gate_passed`).
- `component_event` from `LinesEditor`: `input_trace { keys }`, `line_accepted { index, raw }` (intermediate lines, not answers), `line_wrong { raw, where: numerator|denominator|both|whole, parentheses?, at? { x, student, expected } }`, `line_copied { from: last_line | start }` (the copy key: an input), `unchanged_line { raw }` (a line written exactly like the previous one: not an answer, not a hint), `invalid_input { raw, reason }` (not an answer; reason: `empty_slot`, `double_operator`, `operator_at_start`, `operator_at_end`, `power_without_base` for editor lines the card names and marks, else the parser's code or `undetermined`).
- `component_event` names of the analysis components and primitives: `x_changed`, `compare_toggled`, `fold_changed`, `fold_complete { overlap }`, `zoom_toggled`, `h_changed { h, secantSlope, tangentSlope }`, `region_visited { region, sign }`, `cell_changed`, `submitted`, `attempts_exhausted`, `expanded_toggled { expanded }`, `predicted { optionId }`, `revealed`, `example_generated`, `value_changed`, `step_revealed`, `why_opened`.

Content additions (Tutor intelligence 1): typed steps' `procedures[] { id, misconceptionId, reviewed }` (known wrong procedures, `src/engine/procedures.ts`; the loader computes their values and rejects one that does not fit the answer or equals it; "earlier results" are the numeric answers before the step in its part, or for a variant those of its `forSteps`); deep dives' and ask chips' `addresses` (which ask_clarify answers they serve); asked steps' `link { resultRef, text }` (an earlier result: `resultRef` names a `values` entry, the text has no math, the engine's value is shown as its own line).

Content additions (Phase 5): step kind `lines` (`variables`, `lhs`, `start` + `startIs`, `goal` + `goalIs`, `goalLatex`, `knownWrong[] { expr, misconceptionId, meant? }`, `keys`); `startIs` / `goalIs` are engine references (`{ fn, transform: id | neg | derivative }`) the loader checks by numeric samples, so no written expression is trusted. Misconception `feedback` (optional): shown once, on the first wrong answer of a step, when the option has no feedback of its own.

Content additions (Phase 3): `Exercise.variants[]` (`alternative | transfer | simpler | prerequisite`, `forSteps`, `representation`, `addresses`, `round`, optional own `experiment`, `intro` blocks, an asked or task `step`; answers computed by the engine with the variant's urn); `check` on asked steps (numeric check with the student's value); misconception `category: "math" | "writing"`; deep dives may have their own `experiment` and a task as their mini question (one interactive component max, loader-checked); `src/content/skillMap.json` (skill -> prerequisites, math vs writing; reviewed: false).

Notes from the prototype log: it lacked the exact chosen option/typed value, time per step, whether a visual was used, self-report, and it mislabeled mini-question success as transfer. **A transfer event requires a changed variant of the original task**, not a mini-question.

Additions for the probability visual components v2 (docs/COMPONENTS_PROBABILITY_V2.md; schemas in `src/components/probability2/finding.ts`):
- `component_event { name: "explored", payload: { why, how: "done" | "skipped" } }`: the component's engagement criterion was met (`why` = "3_positions", "box_expanded", ...) or the student left its gate (`why` = "not_sure" or "reveal", `how: "skipped"`). It opens the component's gate (registry `gate`). **A skipped gate never counts as understanding** and never traps the student: nothing derives skill evidence from `explored` or `finding` (`src/state/gateSkipped.test.ts`).
- `component_event { name: "finding", payload: { findingId, numbers, route, how, correct, calc? } }`: what the student found, for a future "what we found" sheet. `findingId` is `component.slug` (`groupboxes.orderings_per_box`); `numbers` are exact rationals as strings (`"120"`, `"1/6"`); `route` is at most 12 ASCII action tokens (`predict:boxes=120`); `how` is `found | helped | revealed | skipped` (a revealed or skipped finding is never `correct: true`); `calc` is optional LaTeX lines built by the engine (`src/engine/calcLines.ts`) from the student's own numbers, so `720/3 = 240` shows the slip. Ids, numbers and tokens only: no free text.
- Rationals in props and event payloads are strings (`"1/6"`, `"0,3"`), parsed exactly (`RatSchema`, `src/engine/rationalFormat.ts`).
- **GroupBoxes** (`src/components/probability2/GroupBoxes.tsx`), gate `explored`: `box_expanded { key, orderings }` (key = the ball ids of the box joined by "-"), `box_collapsed { key }`, `next_box { index }` (one-box mode), `slice_selected { j, count }` (slice mode), then `explored { why, how }` and `finding` once. Finding ids `groupboxes.orderings_per_box` (`boxes`, `perBox`, `ordered`; `calc`: `10 \times 6 = 60`, `C_{5}^{3} = 10`) and `groupboxes.slices` (`total`, `slice0..`).
- **ChoiceProduct** (`.../ChoiceProduct.tsx`), gate `explored`: `option_picked { stage, option, items }`, `mode_switched { mode }`, then `explored` (`why: both_stages`) and `finding` `choiceproduct.and` / `choiceproduct.or` (`stage1`, `stage2`, `total`; `calc`: `C_{4}^{2} = 6`, `3 \times 6 = 18`).
- **SlotsPattern** (`.../SlotsPattern.tsx`, model `slots.ts`), gate `explored`: `slot_toggled { index, marked }`, `pattern_added { pattern, k, duplicate }` (the pattern is `S`/`F` letters, `duplicate: true` when it was refused), `duplicate { pattern }`, `missing_hint_requested { level, missing }` (`level` 0 = "that is all" pressed on an incomplete list, 1 to 3 = the help ladder; **never a count**), `first_slot_selected { index }` (guided), `k_selected { k }` (build_pascal), `flipped { flipped }` (bridge), `count_confirmed { n, k, value, correct }` (only for a complete list), then `explored` (`why: list_complete` or `reveal`) and `finding` once. Finding ids `slots.pattern_list` (`n`, `k`, `count`; `calc`: `C_{5}^{3} = 10`, and `C_{6}^{2} = C_{6}^{4} = 15` after a flip; only from the student's own complete list) and `slots.pascal_row` (`n`, `c0..cn`; sent when the whole row is confirmed; `calc`: `1 + 4 + 6 + 4 + 1 = 16`). Route tokens: `added:N` (a run of adds), `duplicate`, `check`, `missing_hint:L`, `first:J`, `k:K`, `flipped`, `confirmed`, `reveal`. Help level 1 carries nothing, so it says the same thing whatever the number missing (product owner, 2026-10-27).
- **PartWholeBar** (`.../PartWholeBar.tsx`, model `partWhole.ts`), gate `explored` except in `feedback` mode (registry `gateIf`: a readonly picture never holds the lesson): `value_placed { value, whole, ratio, matches? }` (`matches` only for fraction_of_quantity, from the engine), `exceeds_whole { value, whole }`, then `explored` (`why: value_placed` or `reveal`) and `finding` (`partwhole.place`: `whole`, `value`, `ratio`; `partwhole.fraction`: `whole`, `fraction`, `value`, `quantity`, `correct` from the engine; `calc` only when it says something: `\\frac{12}{6} = 2`, `\\frac{1}{6} \\times 36 = 6`). In fraction_of_quantity a first wrong value followed by the right one sends a second `finding`. `feedback` mode emits nothing.
- **SpreadSlider** (`.../SpreadSlider.tsx`, model `spread.ts`), gate `explored`: `slider_changed { index, p, visited }` (Bernoulli: on release, `p` the position as a string, `visited` the number of DISTINCT positions), `scenario_selected { id, visited }`, `value_focused { x, visited }`, `checkpoint_answered { checkpoint, choice, correct }` (`correct` from the engine: `largerSpread` / `findEndsExpression`), then `explored` (`why: 3_positions` or `first_move` or `reveal`) and `finding` (`spread.bernoulli`: `p`, `mean`, `variance`; `spread.fixed`; `spread.scenarios`: `m0, v0, ...`; `calc`: `\\frac{7}{10} \\times \\frac{9}{100} = \\frac{63}{1000}` for each value and then their sum). A second `finding` with `correct: true` follows the first right checkpoint answer. The total is written only after `totalLockedUntil.positions` distinct positions (default 3); the escape writes it and logs `how: skipped`.
- **RepeatedRuns** (`.../RepeatedRuns.tsx`, model `runsModel.ts`), gate `explored`: `cell_tapped { index, selected }`, `confirm_pressed { count, correct }` (shade mode: the count is the student's own), `stage_advanced { stage, count }` (or `{ stage, total }` / `{ stage, average }` for a tally), then `explored` (`why: count_confirmed`, `last_stage`, `reveal`) and `finding` (`runs.fraction`: `runs`, `count`; `runs.two_stage`: `runs`, `stage1`, `stage2`; `runs.tally`: `runs`, `total`, `average`; `calc` from the engine: `\\frac{1}{6} \\times 36 = 6`, `10 + 20 + ... = 210`, `\\frac{210}{60} = \\frac{7}{2}`).
- **VariableTable** (`.../VariableTable.tsx`, model `table.ts`), gate `explored`: `value_selected { x }`, `mapping_changed { outcome, value }` (`value: null` when the student takes an outcome back), `check_run { check, passed, detail }` (`check`: `all_used | sum | symmetry | law`; `detail`: `ok | missing | sum_not_one | not_symmetric | values_wrong`; **never the right counts**), `law_submitted { law, correct }` (`law` = the student's own count of outcomes per value), then `explored` (`why: law_correct` or `reveal`) and `finding` (`table.law`: `outcomes`, `c0..cV`; `calc`: `1 + 3 + 3 + 1 = 8`, only from the student's own correct law). The missing outcome is named only on the second press of "all used" or at hint level 2 (`lessonState.hintLevel`).
- **BinomialExplorer** (`.../BinomialExplorer.tsx`, model `binomial.ts`), gate `explored`: `n_changed { n }`, `p_changed { p }` (on release), `bar_tapped { k, via: "bar" | "step" }` (a tap, or the stepper from 6 trials), `toggle_changed { name: "mean" | "variance", on }`, then `explored` (`why: 2_bars`, `first_bar` or `reveal`) and `finding` (`binomial.formula`: `n`, `p`, `k1`, `k2`, `mean` = np, `variance` = npq; `calc`: the two terms `C_{5}^{2} \\times (\\frac{3}{10})^{2} \\times (\\frac{7}{10})^{3} = \\frac{3087}{10000}`, then np and npq). **A moment is never a sum of the terms** (overflow for B(15, 7/10)); the loader proves every (n, p) of the grid exact (`binomialSafe`).
- **EventAreaModel** (`.../EventAreaModel.tsx`, model `area.ts`), gate `explored`: `event_selected { ids }` (at most two, the oldest drops), `overlay_selected { overlay, valid }` (`overlay`: `complement | intersection | union | conditional`; `valid` false when the view needs a second event), then `explored` (`why: overlays_tried` after two different valid views, or one if only one is offered; `reveal`) and `finding` (`area.events`: `total`, `a`, `b`, `complement`; `calc`: `20 + 36 + 4 = 60`, `\\frac{60}{120} = \\frac{1}{2}`). The complement of A is compared with the second event by the engine (`complementIsOther`): the 60 draws that are not A are not the 20 draws of B.
- **UrnTemplate** (`.../UrnTemplate.tsx`, models `urnExample.ts` and `engine/urnVariants.ts`), gate `explored`: `example_requested { seed, templateId }` (the student asked for another example), then `explored` (`why: another_example` or `reveal`) and `finding` (`urn.example`: `reds`, `blacks`, `k`, `j`, `answer`; `urn.table_example`: `trials`, `p`, `j`, `answer`; `calc` = the engine's solution lines). The example is seeded, so the same props show the same one; it is never the `parent` step's answer, nor one of its known wrong values, nor equal to one of its own wrong-procedure values (`freshCandidateOk`, also called by the loader's `checkFreshVariants`).
- **The escape** (both): the button «ما نعرفش، ورّيني» (the same string as PredictReveal's) opens what the gate waits for and logs `explored { why: "reveal", how: "skipped" }` and a `finding` with `how: "skipped"`, `correct: null`. The lesson turns it into `gate_passed { how: "skipped" }` (also from the log, `replay.ts`); `LessonState.skippedGates` keeps it and `part_done` counts that step as `revealed`, not `answered`.

### Done parts (picker ✓, «كمّل من», the «الورقة» sheet)
A part is done **only** when one of its sessions has a `part_done` with `answered >= 1`. Revealed-only (`answered = 0`), abandoned (no `part_done`: left with back, app closed) and skipped do not count (only optional practice can be skipped, and it is not counted). Matched by **exerciseId + questionId, across content versions**. Done parts are also kept in their own small record (MMKV `tteclair-progress`: `exerciseId/questionId -> { firstDoneAt, contentVersion }`), written when a counting `part_done` is logged, so the event store's cap never erases a done mark; done = record ∪ stored events (`src/state/doneParts.ts`). Retention: same open question as the events (PILOT_CONSENT.md OPEN 5).

**Reset («ابدا من جديد»):** a `part_done` counts only if its session started (its first event) at or after the exercise's latest `exercise_reset`. The record forgets that exercise's entries when the reset is logged; a record entry first done before the latest reset is ignored too (in case clearing failed). Other exercises are untouched. The event store's cap drops oldest first, so a pre-reset `part_done` always leaves before the reset that hides it. The lesson's progress bar is per session (it starts at zero anyway).

## 3. Student state (derived)
```ts
interface SkillState {
  skillId: string;
  status: "unseen"|"known"|"shaky"|"gap"|"recovering"|"closed";
  evidence: { wrong: number; notSure: number; hints: number; guessed: number; transferOk: number; lastSeen: number };
  representationsTried: string[];      // e.g. ["text","OutcomeSpace","numeric_twin"]
  misconceptions: Record<string, number>;
  nextReviewAt?: number;               // spaced return
}
```
Implemented in `src/state/derive.ts` (pure, over the event log). Statuses are planner hypotheses: never shown to or claimed for the student. Extra fields: `kind` (math | writing), `evidence.{correct, helped, revealed, skipped, transferFail}`, `representationsHelped` (planner-chosen representations after which the step was answered right). Writing habits are a separate map (`habits`). Thresholds: `src/state/config.ts`.

Initial rules (configurable, tune with real data; thresholds are guesses):
- gap: 2 occurrences of wrong/not_sure on the same skill in one session.
- recovering: one transfer success. closed: transfer success later without hints (implemented as: a clean transfer in a later session than the first transfer).
- A correct answer self-reported "guessed" counts as weak evidence only.
- A skipped optional task (`skip`) counts as neither pass nor fail. A revealed answer (`reveal`, or a cell filled with `source: "revealed"`) is not a correct answer.
- Separate **math gaps** from **writing habits** (parentheses on fractions, missing conclusion, missing domain check, no "Interpréter").

## 4. Storage
Offline-first local store. Events: append-only `EventStore` (`src/telemetry/eventStore.ts`), MMKV now (own instance, 50-event JSONL chunks, at most 40 chunks, chunks older than 90 days deleted on open), SQLite later behind the same interface (DECISIONS.md D2). Earlier sessions feed the derived student state. Settings, the LLM cap and the report / question queue: MMKV (`tteclair` instance). Sync to a server later. Content ships as versioned JSON bundles per exercise, downloaded on demand.
