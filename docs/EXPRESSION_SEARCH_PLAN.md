# Expression search for typed wrong values: plan

Status: PLAN ONLY (2026-10-28). Nothing in the repo was edited, no model call, no commit, no dependency.
Target path after approval: `docs/EXPRESSION_SEARCH_PLAN.md` (plan mode only lets me write the plan file; one copy command).
Repo state when written: 79 entries in `git status` (the uncommitted Probability v2 run), two peer sessions idle, no file changed in the 60 minutes before writing.

How the numbers below were obtained: a **throwaway prototype piped to `node` on stdin** (nothing written to the repo), same safe-integer fraction rules as `src/engine/rational.ts` (`frac`, overflow = drop the expression). Node 24.14.1 (V8). Its operand pools were **set by hand** to mimic what the engine will derive, so the final numbers will move a little when the real pool derivation exists (section 1.1). Labels: **[measured]** prototype run, **[read]** from reading code, **[assumed]** my guess, **[not verified]**.

---

## 0. What I found that changes the brief

1. **48 and 120 are already authored at s6.** In the working tree, `1/s6` has `wrongAnswers` 360, 19, 24, **48** (`reads_choose_as_product`) and procedures `balls_in_event` (4), `all_outcomes` (**120**) [read: `bac2022c-sc-ex2.json`, step s6]. 30 is authored only at **s4** (`multiplies_balls_by_k`). So of the five values of the hand-played session, the ones with no label at s6 are **30, 12, 300**. The 48 row is not in `HEAD` (uncommitted A1 work). Either the session ran on a build before that row, or the brief overlooked it. Both are useful: 48 and 120 become **regression checks that "authored wins"**, not discoveries (question 8).
2. **Unconstrained search is useless; a cost ceiling makes it usable.** With 3 free operands, 78% of the integers 1..200 get some expression [measured, first prototype, no ceiling, no leak rules]. With the proposed ceiling and leak rules, **19% of unknown integers at s6** get one, against **83% (10 of 12) of the values that are known wrong** (section 2.3).
3. **The search's value is the log, the planner and the teacher loop, not student feedback.** A procedure row already matches by value, so a search result can reach the student only through a row someone authored. In v1 the student sees exactly what they see today.
4. **Hiding can make a wrong story.** Typed 19 at s6 is really `4 + C(6,2)`; `C(6,2) = 15` is a solution part and must stay hidden, so the only visible fit is `6 + 10 + 3`, which is nonsense. Rule ("withheld outranks", sections 2.2 and 4.2): **a visible candidate is kept only if it is strictly cheaper than the cheapest hidden one** (a tie goes to the hidden one). For 19 that leaves nothing.
5. **The engine already has half of the labelling layer.** `src/engine/coincidence.ts` `wrongMethodValues({kind:'staged', mode:'and', stages:[C(4,1), C(6,2)]})` already yields 19 (`sum_instead_of_product`), 24 (`subset_as_n_2`), 120 (`subset_as_arrangements_2`), 48 (`subset_as_nk_2`). That is where the authored s6 rows came from. 12 and 30 are the same slips applied to **one stage alone**, which the catalogue does not yet list. Section 3.

---

## 1. Search space

### 1.1 Operand pool (derived from the content, never hand-listed)

| class | source | cost | at s6 (answer 60) | rule |
|---|---|---|---|---|
| experiment counts | `exercise.experiment`: balls per colour, total, k | 1 | 4, 6, 10, 3 | visible (the Urn is on screen) |
| draw split | for `value_eq(count_value)`: j and k-j | 1.25 | 2 (blacks drawn) | visible in the pictures and hints |
| earlier answers | numeric answers earlier in the part (the loader's `earlier` map) | 1.5 | 120 (s4) | visible |
| named engine values, shown | `exercise.values` whose number is in `shownValues(content, {stepKey, hintsUsed})` | 2 | 720, 6 (via s4 hints) | visible |
| named engine values, hidden | referenced by `\val{}` only later, or only in a hint not yet used | hidden | 15 (`c62`: in s6's own hint and s7) | **withheld** (4.2) |
| answers of later steps | `answerTokensFor`, later steps | forbidden | 60, 1/2 | **never** |

- Values are **deduplicated by value**; names are kept as aliases (`c41` = 4 = reds; `perBox` = 6 = blacks). Operand 1 is excluded (it only makes x±1 near-misses). Operands come from `shownValues` (`src/planner/llm/shown.ts`), the same function the guard uses, so "visible to the student" and "visible to the search" cannot drift apart.
- `c62` is first referenced in s6's own hint, so it is hidden at hint 0 and visible after that hint: **the hidden/visible split depends on `hintsUsed`**. The enumeration is done once per step with every candidate operand, and the split is applied **at query time**.
- Not pool members: the student's earlier typed attempts (question 5), constants other than 1 in `1 - x`, free numbers.
- **Prototype simplification:** I set the classes by hand. E.g. I treated 720 and 6 as visible at s4; by `shownValues` they are hidden at s4 until the hint that contains `\val{nOrd}` is used. Consequence: at s4 hint 0, typed 240 (`720 / 3`) will be **withheld**, not explained. Exception to keep: a leaf equal to the **typed value itself** reveals nothing (the student typed it), so typed 720 still reports "equals the named value nOrd".

### 1.2 Operators and limits

- Binary: `+`, `-` (non-negative results only), `x`, `/` (non-zero divisor). Powers `a^b` with `b` a **pool operand** in 2..8. `C(a,b)` and `A(a,b)` with `a`, `b` **leaf operands**, `1 <= b <= a <= 60` (the same bound as `counting.ts` `MAX_ARG`). `n!` on the draw size only (k = 3 gives 6). Probability steps add `1 - x`.
- **At most 3 operands, each at most once. Measured justification:**

| variant (s6 pool of 9) | expressions | time | extra values explained at the ceiling |
|---|---|---|---|
| 3 operands, once each (**chosen**) | 11,787 | 10 to 20 ms | (baseline) |
| 3 operands, an operand may be doubled (`x+x`, `x*x` as one operand) | 195,535 (**x16.6**) | not measured | **+0** (38 of 193 either way) [measured] |
| 4 operands, once each, pool 9 | 329,014 | 373 ms | not measured (unusable: x35 size) |
| 4 operands, pool 12 | 1,436,339 | 2.2 s | not measured |

  Reuse and a 4th operand buy nothing at the ceiling and cost 16x to 35x. 300 stays unexplained under reuse. In the first reuse attempt (an unbounded "double again" loop) the prototype crashed with an `Invalid string length`: the search must be **bounded by construction**, not by hoping.
- Exact rationals only: `[num, den]` safe integers like `rational.ts`; any non-safe intermediate **drops that expression** (never throws, never floats). Results are compared with `sameRat`, not `equals` (which cross-multiplies and overflows).
- Deterministic: the pool is sorted by (cost, value, name); expressions are generated in a fixed order; ties break by (cost, operator count, text). No `Math.random`, no `Date`, no wall-clock in a result.

### 1.3 Budget (the part that must be deterministic)

- **Hard cap: 60,000 expressions per step** (a pool of about 15 at 3 operands). If the cap is hit before the index is complete, the result is `status: 'budget'` and **no candidates at all** (never a partial list that depends on iteration order).
- The wall-clock is **not** part of the result: the reducer runs on `d.at`, and a time cut-off would make results differ per device. Time is measured only in the dev panel and the offline tool.
- The index depends on the step, not on the typed value: **built once per step, memoised** (key `exerciseId@contentVersion/stepKey`), then each query is a map lookup. A `prewarm(content)` runs from the lesson screen after the first render, so the first wrong answer finds it warm.
- Timing [measured, Node 24 V8, median of 5, one step's whole index]:

| pool | expressions | ms |
|---|---|---|
| 9 | 9,287 | 10 |
| 12 | 26,138 | 29 |
| 16 | 64,268 | 70 |
| 20 | 126,503 | 152 |
| s6 real pool (9), first cold run | 11,692 | 20 |
| s8 real pool (10, with `1 - x`) | 13,481 | 27 |

  **Hermes is [not verified].** It has no JIT; I would plan for a slowdown of several times (my guess, 5 to 10x), so the cap's worst case (about 70 ms on V8) could cost 350 to 700 ms there. That is why the plan has prewarm and a cap, and why Stage 1 includes one timing run on the iOS simulator (Hermes) before anything is enabled. Memory is also [not measured]: the prototype stores arrays per expression; the real index should store compact tuples (value, cost, left, right, op) and build strings only for the at most 3 reported.

### 1.4 Eligibility

Runs only for a **typed** step with a numeric `fraction` answer on an exercise with an urn `experiment`, when the value is wrong, parses, and is **not** already labelled by the authored table or a procedure. Steps of `bac2022c-ex2` / `ex4` without such a pool (lines, limits) return `skipped`. Both integer counts (keypad `integer`) and rationals (`probability`) are in scope.

---

## 2. Ranking and the null result

### 2.1 Cost model (lower = simpler)

`cost = sum(operand costs) + sum(operator costs) + surcharges`

| item | cost |
|---|---|
| operand | 1 / 1.25 / 1.5 / 2 (table 1.1) |
| `+`, `x` | 1 |
| `-`, `/`, `n!` | 1.5 (`n!`: +1 on the operand) |
| `C(,)`, `A(,)` | 2 |
| power | 2 on counts; **1.5 on probability steps** (needed so `3 x (1/2)^7` fits) |
| `1 - x` | 1.5 |
| **mixed surcharge** | +1.5 when an expression mixes additive and multiplicative operators (kills `(6+10) x 3 = 48`) |

Ranking key: `cost`, then operator count, then text. Reference boost (section 3): an expression that is the structural twin of a catalogue slip or an authored `expr` gets `-1.5`. **Salience** is already in the operand costs (a number the step shows beats an engine value).

### 2.2 When to return nothing (`status` values)

| status | when |
|---|---|
| `none` | no expression at cost <= ceiling |
| `withheld` | after dropping every candidate that is **not strictly cheaper than the cheapest hidden/forbidden one**, nothing visible is left (a count only is kept) |
| `ambiguous` | more than 6 distinct structures within +1 cost of the best (provisional; 12 has 5) |
| `budget` | the cap was hit |
| `skipped` | not eligible (1.4), or the value is correct, unparsable, or already labelled |
| `candidates` | otherwise: at most 3, ranked |

**Ceiling: 5.5** (counts and probabilities), 4.0 for the "weak" tier of probability steps (2.3). The ceiling is a constant in one place with a test that pins it.

### 2.3 False-positive measurements [measured]

**s6 (count of draws with exactly one red, answer 60), pool 9, 3 operands, withheld-outranks applied. Integers 1..200:**

| ceiling | explained | withheld only |
|---|---|---|
| 3 | 16 | 2 |
| 4 | 32 | 8 |
| 4.5 | 36 | 11 |
| 5 | 36 | 12 |
| **5.5** | **43** | 12 |
| 6 | 61 | 16 |
| 7 | 103 | 34 |
| 8 | 109 | 46 |

(out of 200; the cliff starts after 6, hence 5.5.)

| s6 at ceiling 5.5 | result |
|---|---|
| known wrong values (360, 19, 24, 48, 4, 120, 30, 720, 240, 10, 1000, 15) | **10 of 12 explained**, 2 withheld (19 and 15, both need `C(6,2)`) |
| unknown integers (1..200 minus the answer and those 12) | **37 of 191 = 19%** explained (27 of 191 = 14% at ceiling 4, with 9 of 12 known recalled) |
| calculation-error zone 50..70, table values excluded | **1 of 20** explained |
| explained values with 2 or more structures within +1 cost | 21 of 38; 3 or more: 12 of 38 (a 193-value variant that excluded 7 known values, not 12) |

**s4 (number of draws, answer 120), pool of 7 [prototype pool, see the simplification in 1.1]:** known wrong values 720, 240, 10, 1000, 30 all explained (5 of 5); unknown integers 22 of 197 = **11%**.

**s8 (probability, answer 1/2), pool of 10 with `1 - x`:** fractions in [0,1] with denominator <= 12 (47 values): 11 explained at ceiling 4 (**23%**), 12 at 5, **19 at 5.5 (40%)**, 21 at 6, 28 at 7. Of the 8 values {2, 2/5, 5/6, 54/125, 1/12, 19/120, 3/5, 27/125}, 4 are explained at ceiling 4 (50%, a lift of only 2x). **So on probability steps the free search is weak.** Proposal: on a probability step, report a free-search candidate only at cost <= 4, or when it has a **reference match** (section 3); otherwise `none`.

**Part 3 (assumed contexts, see 7.4), power cost 1.5:** fractions in (0,1] with denominator <= 40 (489 values): **4% explained at 5.5** (both n = 5 and n = 7), 5% to 6% at 6 to 6.5. Here the search is strongly informative (a random fraction rarely fits) and it finds the signature slips.

**Plausibility** (a display number in [0,1], not a probability): `clamp((1 - cost/ceiling) + 0.30*[reference match] + 0.10*[all operands visible] - 0.10*min(3, ambiguity-1))`. It orders candidates and feeds the offline report; the **gates** are the ceiling, the withheld rule and the ambiguity cap, not the number. Calibration is on 8 real values plus constructed ones, so it can overfit: the offline tool (section 6) exists to retune it on real logs.

---

## 3. Mapping to authored content

Three routes, tried in this order. **Routes 0 and 1 are the existing code and run first, unchanged.**

| route | what | already exists |
|---|---|---|
| 0 | authored `wrongAnswers` value, then procedure rows by value (`lesson.ts:1233-1255`) | yes |
| 1 | `inferredBy`, `candidates`, the probe card for 2+ matches | yes |
| 2 | **cross-step table lookup**: the value is authored or a procedure value at **another step of the same question** (30 is `multiplies_balls_by_k` at s4) | no, new, cheap, precise |
| 3 | **slip catalogue**: values of known slips applied to the step's own solution structure | half: `coincidence.ts` |
| 4 | **free search** (sections 1 and 2) | no |

**Slip catalogue (route 3).** Derived from the step's answer event when possible: `value_eq(count_value)` on a two-colour urn gives stages `[C(4,1), C(6,2)]` joined by AND (same derivation as the staged `CoincidenceSpec`). Entries: the staged slips already in `coincidence.ts` (`sum_instead_of_product`, `subset_as_n_i`, `subset_as_arrangements_i`, `subset_as_nk_i`), **plus new "one stage alone" variants** (`stage_alone_nk` = 6 x 2 = 12, `stage_alone_arrangements` = A(6,2) = 30, and the correct stage alone = 15). Slips whose value equals the correct answer are the coincidences (`subset_as_n_1` gives 4 x 15 = 60) and are dropped. When the step has no derivable structure, only route 4 runs.

**slip -> misconception table** (authored once per exercise, ids only, `reviewed:false`, loader-validated that the misconception exists):

| slip | s6 value | misconception (existing) |
|---|---|---|
| `sum_instead_of_product` | 19 | `adds_instead_of_multiplying` |
| `subset_as_n_2` | 24 | `wrong_group_size` |
| `subset_as_nk_2` | 48 | `reads_choose_as_product` |
| `stage_alone_nk` | 12 | `reads_choose_as_product` |
| `subset_as_arrangements_2` | 120 | `counts_ordered_draws` **and** (same value) `gives_total_as_favourable`: two stories, one value |
| `stage_alone_arrangements` | 30 | `counts_ordered_draws`, **and** route 2 offers `multiplies_balls_by_k` (10 x 3): two stories |

**Matching** is by a canonical form: product and sum chains are flattened and sorted (`(4x6)x2` = `4x(6x2)` = `6x(4x2)` collapse to one candidate; the prototype listed the three bracketings separately), function leaves (`C`, `A`, `!`, `^`) stay nodes. A candidate with the same canonical form as a catalogue entry has `structure: 'exact'`; the same operands with other operators has `'operands_only'`.

**Result shape:**

```ts
interface ExprCandidate {
  expr: string;               // restricted grammar, e.g. "4*6*2"; parseable by parseCountingAnswer
  operands: { name: string; value: string; role: 'count'|'draw'|'earlier'|'named' }[];
  ops: number; cost: number; plausibility: number;
  route: 'cross_step' | 'catalogue' | 'search';
  structure: 'exact' | 'operands_only' | 'none';
  slipId?: string; procedureId?: ProcedureId; misconceptionId?: string;
}
interface TypedSearchResult {
  v: 1; stepKey: string; value: string;           // rational as string ("48", "3/128")
  status: 'candidates'|'none'|'withheld'|'ambiguous'|'budget'|'skipped';
  candidates: ExprCandidate[];                    // at most 3, exported ones only
  ambiguity: number;                              // structures within +1 of the best
  withheld: number;                               // a count only, never the content
  work: { pool: number; enumerated: number; capped: boolean };
}
```

**Never one explanation as truth.** The top 3 are returned with scores; `ambiguity` says how many more fit; the pack and notebook lines say "fits", not "did". Two stories for one value (30, 120) are returned as two candidates with their different misconception ids.

---

## 4. Student-facing rule and what must not leak

### 4.1 Where a result may go

| sink | gets | not |
|---|---|---|
| **the student** | **nothing new in v1.** Feedback still comes only from `answer.misconceptionId` set by an authored row (route 0/1). A search result can reach the student only if (a) the step has a procedure row for it, (b) its misconception has authored `feedback` (`reviewed:false` like the rest), (c) the match is `exact`, (d) a student-facing flag is on. Because value matching already covers every row, (a) to (c) almost never hold without a new authored row. Default flag: **off** (question 2). | `inferredBy` never gets a new value; `misconceptionId` is never set by the search |
| event log | `component_event { component: "Engine", name: "typed_value_candidates", payload }` right after the `answer` event: exported candidates, `status`, `ambiguity`, `withheld`, `work` | no wall-clock, no hidden or forbidden candidate |
| planner pack | in `engineCheck` (typed kind): the exported candidates (expr, route, structure, procedure/misconception ids), `unreviewed: true`; one sentence appended to the dynamic `constraints` ("engine-found expressions equal the typed value; they are not what the student did; several may fit; never state one as fact") | the system prompt is untouched (cache-friendly) |
| session notebook (future) | one engine-verified line, e.g. `typed 48, matches 4 x 6 x 2, unreviewed` (`describeCandidate()`, text pinned by a test) | |
| dev panel / AI trace | all of it, including `withheld` and `work` | |
| offline report | everything, **including withheld candidates** (a teacher, not a student, reads it) | |

### 4.2 What must never leak (enforced in `exportable()`, one function)

1. The **correct value** of the step, as a result, an operand, an intermediate or a text token.
2. **Any candidate with a sub-result equal to the correct value** (`4 x 15 + 3` shows 60 inside it) or to the answer of any **later** step (60 and 1/2 at s4).
3. **Any candidate using a hidden operand** (the `c62` = 15 class): a solution part the student has not been shown at this hint level. While hints are left this mirrors the guard's `hintsLeft` logic.
4. **Withheld outranks:** let `h` be the cost of the cheapest candidate dropped by 1 to 3. Only candidates with cost **strictly below `h`** are exported; a tie goes to the hidden one. Stops 19 becoming `6 + 10 + 3`, and keeps `10 x 3` for 30 while dropping `A(6,2)` (4.25, tied with the hidden `2 x C(6,2)`).
5. A leaf equal to the typed value is allowed (the student typed it).
6. Tokens only: `expr` must match a strict grammar (digits, `+ - * / ^ ! ( ) , C A`), so the existing planner test "free text appears in one field only" holds.
7. Granularity of the log: `withheld` is a **number**. The log does not say what was withheld.

The dropping happens **inside the search function** (`exportable()` runs before any caller sees a candidate), so no sink can forget it. The offline tool calls the unfiltered variant explicitly (`searchTyped(..., { audience: 'teacher' })`).

---

## 5. Integration points and blast radius

### 5.1 Where it plugs in

| file | change | size |
|---|---|---|
| `src/engine/exprSearch/` (new: `pool.ts`, `enumerate.ts`, `rank.ts`, `export.ts`, `catalogue.ts`, `describe.ts`, `index.ts`) | the engine; reuses `rational.ts` (`frac`, `mul`, `add`, `sub`, `div`), `rationalFormat.ts` (`sameRat`), `combinatorics.ts` (`choose`, `arrangements`, `factorial`), `coincidence.ts` (`wrongMethodValues`), `expression/counting.ts` (`parseCountingAnswer` as an independent re-check) | new |
| `src/lesson/session/typedSearch.ts` (new) | glue: builds the pool from `LessonContent` + frame + `shownValues`; memoises per step | new |
| `src/lesson/session/lesson.ts` `onAnswer` | after the procedure match (line ~1255), **only if** `inferredBy === undefined && !correct && d.c.typedSearch`: call the glue, push the `component_event` after the `answer` event (after line ~1281). `buildContent` (line 95) gets an optional `typedSearch` setting | about 20 lines |
| `src/lesson/session/types.ts` | optional `typedSearch?` on `LessonContent` | 2 lines |
| `src/planner/situation.ts` | read the latest `typed_value_candidates` for the step into `step.last.exprs` (optional) | about 15 lines |
| `src/planner/llm/contextPack.ts` `engineCheckFor` | add the exported candidates when present; append the constraint sentence | about 15 lines |
| `src/planner/llm/guard.ts` (allowed numbers, lines 306-335) | add the operand and intermediate numbers of **exported** candidates to `allowed` (4, 6, 2 are not digits in the statement, so `4 x 6 x 2` echoed by the model would otherwise be `number_not_allowed`) | about 8 lines |
| `tools/replay/` | `unlabelled` command (section 6) | new |
| docs | `DATA.md` (event name), `DECISIONS.md` (D37), `PROGRESS.md`, `COMPONENTS_CONTRACT.md` untouched | docs |

No new event type in `EventSchema` (a `component_event` payload is free-form, precedent: `shown`, `cell_filled_by_lesson`), so `events.test.ts` and the event union do not move. `replay.ts` only acts on component names it knows (`opensGate`, `Variant`, ...), so an unknown name is ignored [read: first 60 lines only; confirm the rest of the `component_event` branch]. `derive.ts` handling of unknown `component_event`s is [not verified].

### 5.2 Must stay byte-identical (with the setting absent, which is the default)

- Every value already in a `wrongAnswers` table or a procedure row: same `misconceptionId`, `inferredBy`, `candidates`, same feedback, same probe card rule (the card still needs 2+ matches **from routes 0/1 only**; search candidates never open a probe card).
- The safety net `rule.first_wrong.diagnosed` and the generic "not like this" line for unknown values: unchanged (the search adds a log event, not a feed item).
- The `answer` event: no new field. The feed items (`d.s.items`) are unchanged. The five `lesson-scex2-q1-until-*` shots and the sanity set are unchanged.
- The planner prompt and `PACK_VERSION` (the new `engineCheck` fields are optional and absent without candidates, so JSON and snapshots are identical).
- `consult.ts` triggers: `unknown_wrong` still fires on a missing `misconceptionId`; v1 does **not** use search results to suppress or add AI calls (question 6).

### 5.3 Existing tests that would change

Aim: none. Setting absent = no behaviour change, and the new behaviour has only new test files. Two places to check before claiming "none": (a) `src/planner/situation.test.ts` "free text appears in one field": if it walks all string fields, the new token-restricted field needs an additive allowlist entry (not a weakened assertion); (b) the no-`eval` scan of `src/engine/expression` (if it is a folder list, add `src/engine/exprSearch` additively). Both **[not verified]**; I did not open those tests.

### 5.4 Flag

`buildContent(loaded, questionId, { typedSearch?: 'off' | 'log' | 'pack' })`, default `off`.
`log` = event + dev panel; `pack` = also the planner pack and the guard allowance; student-facing is a separate later flag. The debug build enables `log` first.

### 5.5 Hard rules

1 engine computes every number (the search emits only engine arithmetic; the LLM sees tokens and never decides). 2 no `eval`: expressions are built as ASTs, and the rendered string is only ever **re-checked by the safe parser / `normalizeCounting`**, never executed. 3 no keys. 5 the new event is a derived effect (replay ignores it); the interaction itself is already logged. 6 section 4.2. 8 expression strings hold numbers only. No dependency.

---

## 6. Offline tool

`npm run replay -- unlabelled <log.jsonl...> [--exercise bac2022c-sc-ex2] [--question 1] [--min-sessions 2] [--top 5] [--out tools/replay/out/unlabelled-<time>.md]`

- Input: the app's exported JSONL (`EventLog.toJsonl()`, via the dev share button), validated with `EventSchema`; bad lines reported and skipped (same as `table`/`reports`).
- For every `answer` event with `kind: typed`, `correct: false` and **no `misconceptionId`**, **re-run the search from the log** (the step, the value, the hint level at that time). It does not depend on the live setting, so it also works on old logs and the hand-played session.
- Group by (step, canonical expression); count **distinct sessions** (a student retyping a value counts once); rank by sessions, then plausibility. Also list **values with no explanation** (`none`, `withheld`, `ambiguous`) with their counts: they are the typos or the slips nobody named.
- Output (markdown, for the teacher): per step a table `value | sessions | best expressions (top 3) | route | suggested row (slip id / procedure) | teacher verdict: ____`. Never lists a value that is already authored. Includes withheld candidates (teacher audience), marked.
- Output is aggregated counts, no session or student ids, and goes to the gitignored `tools/replay/out/`.
- A teacher marks verdicts; `--precision <verdicts.json>` then reports the precision of each route and the plausibility threshold that would give 80% (this is what retunes section 2 and decides question 1).

---

## 7. Test plan (real inputs)

All new test files; no existing assertion changes. Expected results are **[measured]** with the prototype pools unless marked **[assumed]**; the real tests must recompute from the engine (CLAUDE.md: tests recompute, never hard-code) and pin the shape, not the prototype cost numbers.

### 7.1 Step s6 (answer 60), setting `log`, hint 0

| typed | route 0/1 | search | expected candidates (cost) | find? |
|---|---|---|---|---|
| **12** | none | yes | `4 x 3` (3), `10 + 2` (3.25), `6 x 2` (3.25), +2 more within 1; catalogue `stage_alone_nk` = `6 x 2` -> `reads_choose_as_product`, exact, boosted to the top. The hand reading `4 x (6/2)` costs 5.75 (over the ceiling) and equals `4 x 3` | **yes** |
| **30** | none at s6 | yes | route 2: `multiplies_balls_by_k` (authored at s4); search: `10 x 3` (3), `120 / 4` (4). `A(6,2)` (4.25) is **dropped**: it ties with the hidden `2 x C(6,2)` (4.25) and a tie goes to the hidden one. The catalogue's `stage_alone_arrangements` (= `A(6,2)`) is the second story for the dev panel and offline report only if it uses no hidden operand (it does not, so it is exported by the catalogue route; **decide at implementation which wins, test pins it**) | **yes**, two stories |
| **48** | **authored** (`reads_choose_as_product`) | **not called** | regression: authored wins; if called, `4 x 6 x 2` (5.25; the 3 bracketings collapse to 1) | n/a |
| **300** | none | yes | nothing at <= 5.5 (first fits cost 6: `(10/4) x 120`, `10 x A(6,2)`, `3 x 10^2`) | **no, `none` expected** |
| **120** | procedure `all_outcomes` | **not called** | regression | n/a |
| 360, 19, 24 | authored | not called | regression. Calibration if called: 360 -> `360` (2); 24 -> `4 x 6` (3); **19 -> `withheld`** (not `6+10+3`) | |
| 4 | procedure `balls_in_event` | not called | calibration: `4` (1) | |
| 15 | none at s6 (authored only for count B, per `EX_URN_RN.md`) | yes | calibration: **`withheld`** (it is `C(6,2)`, a solution part) | |
| 720, 240, 10, 1000 | s4 values | | at s6: `720` (2), `2 x 120` (3.75), `10` (1), `10^3` (4) | |
| 61, 59, 50 | none | yes | **`none`** (calculation-error zone: 1 of 20) | no |

### 7.2 Step s4 (answer 120), hint 0 and after the hint with `nOrd`

720: `equals named nOrd` (the typed value); after the hint, `A(10,3)` (4). 240: **`withheld` at hint 0**, `720 / 3` (4.5) after the hint. 10: `10`, `4 + 6`. 1000: `10^3` (4). 30: `10 x 3` (3), authored at s4 so not called. 60 and 90: `withheld` (later answer 60).

### 7.3 Step s8 (probability, answer 1/2), pool with `1 - x`

| typed | expected | note |
|---|---|---|
| 2/5 | authored? procedure `balls_in_event` first; if called `4 / 10` (3.5) | find |
| 3/5 | `6 / 10` (3.5), `1 - 4/10` (5, over the weak cap) | find |
| 1/12 | authored; if called `10 / 120` (4) outranks the real story `60 / 720` (5): **ranking needs the reference boost** | find, wrong order without the catalogue |
| 5/6 | authored; if called only `1 - 10/60` (5.5): a **spurious story** (the real one needs `20` from Part 2); must come out `none` at the weak cap 4 | **no** (test pins the null) |
| 2 | `2` (the operand) first by cost; the real story is `120 / 60` (4.5, `total_over_favourable`) | coincidence |
| 54/125, 27/125, 19/120 | authored procedures `with_replacement` / table | **no** (needs repeated operands or `C(6,2)`; `none`) |
| 1/2 | answer | not called |

### 7.4 Part 3 (**contexts assumed**: Part 3 is not authored; n = 5, k = 2, p = 1/2, answer 5/16, and n = 7, k = 3, answer 35/128. The owner must confirm n and k for each typed value.)

| typed | context | expected | find? |
|---|---|---|---|
| 1/4 ("given as X") | n = 5 | `(1/2)^2` (3.5), `1/2 / 2` (3.5) | yes |
| 1/32 ("per outcome") | n = 5 | `(1/2)^5` (3.5) | yes |
| 3/16 ("from 6/32") | n = 5 | none (needs 6 = `C(4,2)`, outside the pool) | **no, `none`** |
| 10/32 | n = 5 | equals 5/16: **correct, search not called** (if Part 3 accepts unreduced forms; step-level choice) | n/a |
| 40 | n = 5 | `5 x 2^3` costs 5.75, over 5.5: `none` (a spurious story at ceiling 6) | **no** |
| 3 x 1/128 = 3/128 | n = 7, k = 3 | `3 x (1/2)^7` (5.5), i.e. `k x p^n` ("reads C(n,k) as k") | **yes** |
| 35/28 = 5/4 | n = 7 | none; but it is above 1: the free **range fact** `above_one` (no search) | fact only |
| 3/16 | n = 7 | `3 x (1/2)^4` (5.75): `none` at 5.5 but fits at 6: a **coincidence** with the n = 5 value | pins the ceiling |

### 7.5 Property tests

1. **Soundness:** every exported candidate's `expr` re-evaluates (via `parseCountingAnswer` / `evaluateExact`, an independent code path) to exactly the typed value.
2. **Determinism:** same input twice = deep-equal; the pool given in another order = identical output; no `Date` or `Math.random` reachable (grep test).
3. **Bounded:** `enumerated <= cap`; fuzz pools of 1..20 operands with values up to 1e9: no throw, overflowing expressions dropped; cap hit gives `budget` with an empty list.
4. **Canonical:** every bracketing/commutation of a product or sum collapses to one candidate.
5. **Idempotent labelling:** a value that routes 0/1 label is never searched; `answer` event and feed identical with and without the setting (golden test over a scripted s6 session).
6. **Coincidences:** `2 + 2 = 2 x 2 = 2^2`, `k = k!` at k = 2, and `4 x 3 = 6 x 2` produce **several candidates and `ambiguity > 1`**, never one asserted story. The catalogue drops slips equal to the correct value (`subset_as_n_1` = 60).
7. **False-positive guard:** for integers 1..200 at s6 (and the s4, s8 and Part 3 pools) the explained fraction stays within the pinned band (s6 about 19% of unknown values at 5.5; fails loudly if a cost change doubles it).

### 7.6 Leak test (the one that matters)

For **every integer 1..300** and every fraction a/b with b <= 40, at **every step** of `bac2022c-sc-ex2` Part 1, at every hint level 0..3: no exported candidate (a) equals the correct value, (b) has any sub-result or leaf equal to the correct value or a later step's answer, (c) uses a hidden operand, (d) has `expr` text containing the correct value as a number token (`numbersIn`), (e) changes `withheld` into content. Plus the **guard round trip**: build a planner pack from a scripted wrong answer, check `guardDecision` accepts a text quoting an exported operand and still returns `final_answer_early` for the answer.

### 7.7 Timing test

A Jest smoke asserting `enumerated` bounds for pools of 9, 12, 16, 20 and a generous wall-clock ceiling (2 s) only as a smoke; real timings are printed by the offline tool and recorded in PROGRESS.md. One manual iOS-simulator (Hermes) timing run of `prewarm` on s6 and s8 before enabling `log`. **Android not tested** (deferred by the owner).

### 7.8 After the shared-code edits

`npm run check` and `check:release-dev`; re-run the 16/19-screen sanity set and the five `lesson-scex2-q1-until-*` shots with `-devLlm off` on both simulators (setting absent AND setting `log`): expect identical pixels, since the feed is unchanged. No `replay -- eval`, no model call.

---

## 8. Effort, risks, what was not verified

**Effort.** Stage 1 (engine, glue, log event, dev panel, flag off, tests): **M**. Stage 2 (pack, guard, situation, slip table, docs): **S to M**. Stage 3 (offline tool and precision report): **S to M**. Whole thing: **M to L** depending on how many teacher review rounds the offline report needs. Each stage ships alone.

**Risks.**
| risk | mitigation |
|---|---|
| spurious labels teach the AI a wrong story (5/6 -> `1 - 10/60`, 19 -> `6+10+3`, 3/16 -> `3 x p^4`) | ceiling, withheld-outranks, weak tier on probability steps, ambiguity cap, `unreviewed` flag, "fits, not did" wording, `pack` flag off until the offline precision report passes |
| a student told "you did X" wrongly | nothing student-facing in v1; later only as a **question** the student answers (the probe-card form) |
| the search explodes | construction-bound (3 operands, once each), hard cap with `budget` and no partial list, memoised per step, prewarm; reuse and 4 operands measured and refused |
| hidden/visible drift from the guard | one source of truth: `shownValues` / `answerTokensFor` |
| overfitting the cost model to 8 values | constants in one place with a pinning test; offline precision report retunes |
| Hermes slower than V8 | cap, prewarm, simulator timing before enabling |
| a hint-level-dependent result makes the log differ between replays | the hint level is read from the same event stream, and the result is a pure function of it |

**Not verified here.** Hermes timing; memory use; the real operand classes (pool set by hand, not derived); the Part 3 contexts (inferred, step not authored); `situation.test.ts` and the no-eval scan (not opened); whether the planner actually uses the facts well (no model call allowed); real logs (only the one hand-played session, and I do not have its file); the exact name and signature of the `buildContent` option; low-end Android behaviour; pilot-consent wording for derived data (expression strings of public numbers add no personal data, but `PILOT_CONSENT.md` has open items).

---

## 9. Questions for the product owner (each with my default)

1. **Should the AI planner see the unlabelled expressions in v1, or only the log, the dev panel and the offline report?** Default: log + dev + offline first; the planner sees them only after the offline report shows at least 80% of a teacher's verdicts agree on about 50 real values.
2. **May a search result ever show a message to the student?** Default: no. Revisit only as a question ("did you do 6 x 2?") the student answers, after the report.
3. **Allow an operand to be used twice (`10 x 10 x 3`)?** Default: no (16 times more work, no extra values explained).
4. **Allow 4 operands?** Default: no (35 times the size, and almost every number would get an explanation).
5. **Use the student's own earlier wrong attempts as operands (300 = 30 x 10)?** Default: no (it explains the sequence of attempts, not the misunderstanding).
6. **Should a found label reduce AI calls (skip the `unknown_wrong` consult) or add them?** Default: neither in v1; the consult trigger stays as is.
7. **Who writes the slip -> misconception table, and may it live in the misconceptions file (ids only)?** Default: I propose the first version (6 rows for s6, in section 3), you or the teacher edit it; `reviewed:false`.
8. **Which build did the hand-played session use?** The working tree already has 48 and 120 authored at s6. Default: treat 30, 12 and 300 as the unlabelled ones and 48 and 120 as "authored wins" checks.
9. **Part 3 values: what were n and k for each (1/4, 1/32, 3/16, 40, 3 x 1/128, 35/28)?** Default: the assumptions in 7.4 (n = 5, k = 2, and n = 7, k = 3).
10. **Add the free "range facts" (`above_one`, integer typed where a probability is asked) to the log and pack, since they need no search (35/28 = 5/4)?** Default: yes, as a tiny Stage 1 addition.
11. **Are unreduced fractions correct in Part 3 (10/32)?** The engine compares values, so 10/32 equals 5/16 and is correct unless a step says otherwise. Default: keep as is.
