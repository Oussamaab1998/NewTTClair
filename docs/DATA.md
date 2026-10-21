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
- `component_event` names logged by the lesson itself: `shown` (a component entered the feed: the source for `representationsTried`) and `cell_filled_by_lesson { value, source: "solved" | "revealed" }` (a law cell filled after an EventPicker; `revealed` = shown at the end of the hint ladder, never a correct answer).

Additions in Phase 3 (planner):
- `plan { trigger, decision }`: the validated planner decision at a decision point (rule id, source `rules|llm|fallback`, action, representation). Replay re-applies it, so an LLM session replays the same.
- `request { kind: "change_method" | "simpler" }` (card buttons), `clarify { choice: "counting" | "why" | "link" }` (answer to ask_clarify), `offer_response { offer: "compress" | "repair" | "teacher_note", accepted }`.
- `teacher_note { noteId, skillIds, misconceptionIds, ruleId }`: ids only, no free text; collected by `src/telemetry/notes.ts` (local queue, exportable).
- Phase 4: `plan.shownSource: "rules" | "llm"` (what the student ended up seeing in the provisional flow; `plan.decision.llmRequestId` on LLM decisions).
- `llm_call { requestId, purpose: "plan" | "tutor", model, outcome, statusClass: "none" | "2xx" | "4xx" | "5xx", latencyMs, inputTokens?, cachedInputTokens?, outputTokens?, costUsd?, reasons? }`: one per LLM call or skipped call (`disabled`, `capped`) or late answer (`stale`). Outcome is our own class (`ok`, `rejected`, `timeout`, `network`, `rate_limited`, `no_credit`, `spend_limit`, `auth`, `provider`, `refused`, `incomplete`, `invalid`, `config`); `reasons` are our own guard / schema codes. Never prompt, answer or provider text. Not written when there is no key.
- `tutor_answer { source: "verified" | "ai" | "saved", requestId?, blocks, mathVerified, mathUnverified, mathDropped }`: what the tutor drawer answered (counts only). The drawer's question is the preceding `ask { via: "field", text, source, snapshot.drawer: true }`; drawer choices are `component_event { component: "TutorDrawer", name: "understood" | "still_unclear" | "back" }`.
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

Content additions (Phase 5): step kind `lines` (`variables`, `lhs`, `start` + `startIs`, `goal` + `goalIs`, `goalLatex`, `knownWrong[] { expr, misconceptionId, meant? }`, `keys`); `startIs` / `goalIs` are engine references (`{ fn, transform: id | neg | derivative }`) the loader checks by numeric samples, so no written expression is trusted. Misconception `feedback` (optional): shown once, on the first wrong answer of a step, when the option has no feedback of its own.

Content additions (Phase 3): `Exercise.variants[]` (`alternative | transfer | simpler | prerequisite`, `forSteps`, `representation`, `addresses`, `round`, optional own `experiment`, `intro` blocks, an asked or task `step`; answers computed by the engine with the variant's urn); `check` on asked steps (numeric check with the student's value); misconception `category: "math" | "writing"`; deep dives may have their own `experiment` and a task as their mini question (one interactive component max, loader-checked); `src/content/skillMap.json` (skill -> prerequisites, math vs writing; reviewed: false).

Notes from the prototype log: it lacked the exact chosen option/typed value, time per step, whether a visual was used, self-report, and it mislabeled mini-question success as transfer. **A transfer event requires a changed variant of the original task**, not a mini-question.

### Done parts (picker ✓, «كمّل من», the «الورقة» sheet)
A part is done **only** when one of its sessions has a `part_done` with `answered >= 1`. Revealed-only (`answered = 0`), abandoned (no `part_done`: left with back, app closed) and skipped do not count (only optional practice can be skipped, and it is not counted). Matched by **exerciseId + questionId, across content versions**. Done parts are also kept in their own small record (MMKV `tteclair-progress`: `exerciseId/questionId -> { firstDoneAt, contentVersion }`), written when a counting `part_done` is logged, so the event store's cap never erases a done mark; done = record ∪ stored events (`src/state/doneParts.ts`). Retention: same open question as the events (PILOT_CONSENT.md OPEN 5).

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
