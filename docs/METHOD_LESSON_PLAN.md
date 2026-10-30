# Method lesson: plan (Phase 0, plan only)

Status: PLAN ONLY (2026-10-29). Written for: the product owner (Oussama). Nothing in `src/`, `docs/` (other than this file), content or tests was edited; no model call (`-devLlm off`, `npm run replay -- eval` never run), no commit, push, reset or clean, no dependency, no file deleted. After approval this file is copied unchanged to `docs/METHOD_LESSON_PLAN.md` (plan mode lets me write only the plan file; the copy is the only follow-up action) and I stop.

`git status` at the start: only `?? tools/screens/` (the untracked screenshot tools, expected). Branch `probability-v2`. Nothing unexpected.

Labels used below: **[read]** from reading code or docs; **[measured]** a throwaway Node run in the scratchpad (nothing written to the repo); **[proposal]** my design; **[not verified]** could not be checked here; **[owner]** your words in the brief.

---

## 0. Summary

1. **One authored block, `method`, expanded by the loader into ordinary steps.** The author writes one `method` block per question (plan cards, one tap on the statement, lines with a role, standing checks, repairs, findings, recipe). The loader expands it into five per-plan-card steps of three new internal kinds (`plan`, `read`, `mlines`) plus repair steps of a fourth (`repair`, used only inside `variants[]`). Each expanded step has its own step key (`1/m1.plan`, `1/m1.read`, `1/m1.c_total`, `1/m1.c_fav`, `1/m1.c_ratio`), so the planner, hints, outcome classes, skills, `maxDetoursPerStep` and `part_done` work per plan card with no change to their logic. Everything the student writes is a LINE; the engine evaluates every side exactly (rationals, safe parser, no `eval`) and matches the line to an expected solution graph by value AND structure.
2. **Diagnosis is mutation-based and generic.** From the expected expression of each role the engine generates mutations with ids (`drop_division`, `bracket_left_to_right`, ...). A mutation maps to a misconception id `mut.<id>`, so the existing planner, derived state, misconception feedback (question form for value-only matches, confirmed form for exact matches), coverage test and caps keep working. Authored text is per mutation id (generic across exercises) plus per-node overrides.
3. **Pictures move behind the answer.** `boxes-intro`, `boxes`, `choice-intro`, `choice` (and `urn`, `s2`, `compare`, `s3`) leave the main path of question 1. The components and their alternatives stay as repairs.
4. **Fast path 7 acts, repairs at most 10 each, worst case at most 30.** The unit is the one A1 used: one action the reducer receives (a typed answer is 1 however many keys; an ordered set of cards is 1; a line is 1). The tap-level count is reported next to it (section 5). Plan cards counted as taps would make the fast path 9; with role chips as separate taps, 14. Section 5 shows why I recommend the "act" unit and what has to give if you meant taps.
5. **Two findings from the real numbers (section 4 and 8):** (a) your simulated cold urn 5 red 6 black fails its own guard: P = 75/165 = 5/11 = reds / balls, the `single_ball_probability` slip. (b) The plan-help example urn 3 red 5 black shows 30 and 15, which are Q1's known wrong total (3 x 10) and Q1's black part. I give a guard that tells role-aware from role-blind collisions and a default.
6. **Effort:** Phase 1 engine L, Phase 2 UI M-L, Phase 3 Q1 + cold test L (you play), Phase 4 Q2 S-M (you play), Phase 5 Q3 M (you play). No stop is skipped.

---

## 1. WHAT EXISTS, WHAT EACH GRAMMAR ELEMENT CAN REUSE, WHAT IS NEW

Sources: three read-only code readings of `src/lesson`, `src/planner`, `src/state`, `src/telemetry`, `src/content`, `src/engine`, `src/components`, `src/app`, `tools/screens`, plus the docs named in the brief. Unless marked, a fact is [read].

### 1.1 What exists, per grammar element

| Element | Exists (file) | Reuse | Missing / new |
|---|---|---|---|
| **A. Plan cards** | Step kind `ordering { options>=2, answer: {type:'order', ids} }` in `src/content/schema.ts:384-390`; telemetry knows `answer.kind 'ordering'` (`events.ts:42`) and `situation.ts:207` handles it | The schema member and the event kind | Nothing renders or resolves it: `advance` sends it to `componentFallback` (`lesson.ts:610`), `loader.isAsked` excludes it, `resolveAnswer` errors "order not supported". New: `PlanCards` component, `plan` step kind (dependency-aware answer, not a fixed order), shuffle, the loader branch. Up/down 44 pt buttons first; no drag (`gesture-handler` is installed, unused) |
| **B. Read the statement** | `RichView` renders statement as paper text; `Question.askChips` and long-press quote tokens | `RichText` runs and `isolateInline` for bidi | New `StatementTap` (tappable French tokens, 44 pt min target via padding), `read` step kind, `targets` map |
| **C. LineInput** | `NumericKeypad` (270 lines): raw string, kinds `integer / signed / probability`, 5 keys per row, `KeyButton`, ▾ fold, `onSubmit(raw, keys)`, `input_trace`; `parseNumeric` (`engine/format.ts`). Exercise 4 `MathEditor` + `LinesCard` (`src/lesson/lines`, 780 + 748 lines): a node-tree editor for functions of `x` (no `=`, no `÷`, fractions as structure), `checkLine` compares each line with the PREVIOUS one by sampling | `KeyButton`, `KEY_GAP`, the display row (fold, ⌫, ✓), the notebook rows (ruled page, margin marks, red-pencil note), `scrollForCursor`, `Note`, `input_trace` | New `LineInput` (text model, calculator keys, no letters), chain evaluator, role chips, readback. NOT reusable: `checkLine` (previous-line equivalence on samples) and the tree editor (a count line is not a function of x; no `=`) |
| **C/D. Exact evaluation and structure** | `parseExpression` (AST with `implicit` flag, `÷ × −` aliases, comma decimals), `evaluateExact` (exact `Fraction`, null if too large), `canonical` / `sameForm`, `toLatex`, `splitFraction`, `missingParentheses`; `counting.ts` pre-pass `C() A() !` (built, unwired) | All of it | The parser **rejects `=`** (`invalid_char`) and drops parentheses from the AST (`group()` returns the inner node): a `splitChain` pre-step and a **factor-bag normal form** (numerator / denominator multisets, flattening `*` and `/`) are new. `Fraction` is a pair of safe integers (no BigInt): values past 2^53 throw, which is fine for these questions (loader proves it per graph) |
| **D. Diagnosis** | `procedures.ts` (10 whole-answer procedures run through the engine), `coincidence.ts` (`wrongMethodValues`: staged / subset / boxes / bernoulli), `urnVariants.ts` `PROBABILITY_SLIPS`; misconception library with `feedback` (question form) and `feedbackConfirmed`; planner rules `first_wrong.repair / diagnosed`, probe card; `docs/EXPRESSION_SEARCH_PLAN.md` (plan only, parked) | The whole misconception chain (id -> feedback -> `repairComponent` -> `repairFor` -> variant offer), `runProcedure` values as value-only candidates, `wrongMethodValues` as an authoring cross-check | New `src/method/mutations.ts` (AST mutations with ids, structure matching, scoring), a shared `mut.*` misconception library, `inferredBy: 'mutation'` |
| **E. Readback** | `toLatex`, `splitFraction`, `LinesCard` unreadable-line note | `toLatex`, the note styles | New `readback.ts` (finds a `/` followed by a product with no parentheses), `ReadbackRow` |
| **F. Standing checks** | `PartWholeBar` (engine `partWhole.ts`: `placeOnBar`, `feedback` mode is readonly and not a gate), `rationalFormat` (reduce, `sameRat`), `calcLines.ts` | `PartWholeBar` as the above-one picture, `calcLines` for the check lines | New `checks.ts` predicates (above one, units, multiply back, simplify, range, target) and their cards |
| **G. Claim testing** | `finding` events (`FindingPayload`), `ChoiceCard`, `SlotsPattern` (list building, duplicates, help ladder), `GroupBoxes` (one box and its orderings) | The finding payload, the list builders | New `ClaimCards`, `claims.ts` (`predictClaim`), event `claim_*`, rule storage |
| **H. Combine check** | `ChoiceProduct` (two stages, AND matrix), `SlotsPattern` | `SlotsPattern` in `guided` mode (n slots = n balls, marked = chosen) for "one red with every black pair" | A ball-labelled slot row (R / N faces, `BallDot`) and the "one first ball" guided mode: a small extension of `SlotsPattern`, **to be confirmed in Phase 3** (reading says its marked pattern is S / F letters over positions) |
| **I. Repairs** | Variants (`alternative / simpler / transfer / prerequisite`) with own urn, intro blocks and ONE asked step; deep dives with one component; `dd_choose_bridge`, `alt-1-s4-boxes`, `alt-1-s6-choice`, `alt-1-s8-partwhole` already exist and are reached by the planner | The detour machinery, caps, offer card, `revealUnlocked`, fresh-after-reveal, the four existing alternatives (kept) | A `repair` step kind (a script of at most 5 stages in one frame, one hint ladder) so a multi-stage repair is ONE detour, not several |
| **J. Sheet, strip, skeleton** | `PaperSheet` (RN `Modal` slide, 88 %, handle, scroll body, `PaperBackground`), `TutorDrawer`, `ExamPaperScreen` (STIX French paper), `Writeup` card (flat `string[]`), `finding` events with `calc` lines, `Exercise.results` tags | `PaperSheet` scaffolding, `font.paper`, `RichView variant="paper"`, `ResultTag`, dashed `rowSoon` style for blanks | `MethodStrip` (a quiet row under the progress bar), `MethodSheet`, `PaperSkeleton`, `buildFindings(events, spec)` (pure). Findings have **no consumer today** and live in the capped event store (about 2000 events / 90 days) |
| **K. Recipe, My methods** | `Question.methodId` (set on four questions, read by nothing), `appDoneRecord` / `createDoneRecord` pattern (own MMKV instance), picker cards | The done-record pattern for a `MethodsRecord` | New `RecipeBuilder`, `MyMethodsScreen`, MMKV instance `tteclair-methods`, a screen state beside `paperFor` in `LessonScreen` (no router exists) |
| **L. Cold test** | `generateUrnVariant` (seeded `rng`, `urn_exactly_j`, bounded 200 attempts, verified by enumeration, `freshCandidateOk`, own-slip rejection), `proposeUrnVariants`, `assertNoCoincidence`, `shownValues` (`planner/llm/shown.ts`), `__tests__/freshTwins.test.js` | The rng, the attempt loop, the second verification, `freshCandidateOk`, the slip list | No reserved-urn list exists (searched `src`, `docs`, `__tests__`, `tools`); no exclusion of the question's own urn; its range caps at 60 draws (display rule) which the cold test does not need; no guard for single-ball, in-statement or shown-number coincidences |
| **M. Hints, reveal, caps** | `giveHint`, `onReveal` (refused while `hintLevel < hints.length && !revealUnlocked`), `THRESHOLDS` (`maxDetoursPerStep 3`, `repeatPerSkillPerSession 2`, `stepBackPerSkillPerSession 1`, `movesPerQuestion 4`, `freshAfterReveal... 1`), `MAX_DEPTH 3` (defined twice: `rules.ts:18`, `lesson.ts:70`), `REVEAL_AFTER_DETOURS 2` | All of it, per expanded step key | Three new thresholds (`methodFastActs 8`, `methodRepairActs 10`, `methodActsPerQuestion 30`) |

### 1.2 Coupling points this work touches (so nothing is a surprise)

1. **Step kinds are wired in six places:** `StepSchema` (`schema.ts:367`), `buildContent` (`lesson.ts:107`), `advance` (`:557`), `countsForProgress` (`progress.ts:17`), loader `isAsked` / `resolveAnswer` / `ResolvedAnswer`, `QuestionCard` (`:279`). Each of the four new kinds adds one case to each.
2. **Replay is a contract** (hard rule 5): `actionsFromEvents` (`replay.ts:39`) maps every non-choice, non-task `answer` to `{raw}`, and the lines branch of `onAnswer` accepts only `{line}`: **replaying a lines answer does not re-apply it today**. New answer values (`plan`, `read`, `mline`, `repair`) need an explicit mapping and a replay-equals-live test.
3. **`EventSchema` is strict** and `eventStore.load` silently drops lines that fail validation: only additive changes (new optional fields, new enum members, `component_event` names).
4. **`reduce` ignores every action while `state.pending` is set** except `apply_plan` (`lesson.ts:2334`): method acts must set `pending` exactly like `onAnswer` does.
5. **`consultReason`** asks the LLM on `line_wrong` / `line_invalid`: method steps must be excluded (rule: no model call anywhere in v1).
6. **`reportPath` has a `never` check** for `FeedItem` kinds; `FeedItemView` has none. This design adds **no FeedItem kind** (cards are `question` items; credit lines are `feedback` items).
7. **UI may not read skill status** (`noSkillStatusInUi.test.js`): findings and My methods show no status.
8. **iOS allows one modal at a time:** the new sheet follows the `TutorDrawer` `hidden` rule.
9. **Launch flags** live in `src/app/dev/launch.ts` and `check:release-dev` fails if one is readable in a Release bundle.
10. **`src/config/llmLocal.generated.ts` (gitignored) contains real API keys in plaintext and the debug build calls the live model unless `-devLlm off` is passed.** Every screenshot and run in this plan passes `-devLlm off`. One of the readers printed that file into the transcript (see section 11, item 9).

---

## 2. THE DATA MODEL (zod) AND HOW IT IS LOADED

### 2.1 Where it lives

New folder `src/method/` (pure TypeScript, no React, no `Date`, no `Math.random`) and content blocks inside the exercise JSON. `src/method/schema.ts` exports `MethodStepSchema`; `src/content/schema.ts` adds one member to the step union (`kind: 'method'`), additive like every earlier step kind. All text fields use the existing `RichSchema` (`{ar?, fr?, math?}`), so the existing guards apply (no Latin or digits inside an Arabic run, math in its own field, `reviewed` flags).

### 2.2 The spec

```ts
// src/method/schema.ts  [proposal]
const Id = z.string().regex(/^[a-z][a-z0-9_.-]{0,40}$/);
const Role = z.enum(['total', 'part', 'combine', 'result', 'check']);          // generic, the same five everywhere
const Unit = z.enum(['ordered', 'groups', 'count', 'ratio']);                     // what a number counts (units check)

// A. PLAN CARDS (coarse; the decomposition inside "count favourable" is NOT a card)
const PlanCard = z.strictObject({
  id: Id,
  text: RichSchema,                         // "count all draws"; no numbers, no method words beyond the card
  needs: z.array(Id).default([]),           // cards whose output this one uses (acyclic)
  yields: z.array(Id).min(1),               // graph node ids this plan step produces
});
const PlanSpec = z.strictObject({
  cards: z.array(PlanCard).min(3).max(5),   // the order shown is seeded-shuffled (sessionId + stepId), never the authored order
  decoys: z.array(z.strictObject({ id: Id, text: RichSchema, why: RichSchema })).max(1).default([]),
  help: z.strictObject({ repairId: Id }),   // R1: the worked example (twin, other numbers)
});

// B. READ THE STATEMENT (one tap on a word; selects ordered/unordered for the rest of the question)
const ReadSpec = z.strictObject({
  statement: z.literal('statement'),        // the exercise's statement Rich, tokenised on spaces
  targets: z.array(z.strictObject({
    token: z.string().min(2),               // must occur in the statement (loader)
    effect: z.strictObject({ order: z.enum(['ordered', 'unordered']), replacement: z.boolean().default(false) }),
  })).min(1),
  // every other token is a distractor; one neutral line per distractor class
  notOrderWord: RichSchema,
});

// The expected solution graph: built by the engine from a template, optionally overridden node by node
const GraphSpec = z.discriminatedUnion('template', [
  z.strictObject({ template: z.literal('urn_exactly_j'), args: z.strictObject({ j: z.number().int().min(0) }), nodes: z.record(Id, NodeOverride).default({}) }),
  // later stops: 'urn_none_of_colour', 'binomial_term', 'binomial_moments' (data + template function, section 10)
]);
// A node the template produces (computed by src/method/graph.ts, never typed in JSON):
interface GraphNode {
  id: string; role: Role; planCard: string; unit: Unit;
  label: Rich;                               // what it counts, for the credit line ("عدد التيراجات الكل")
  value: Fraction;                           // engine: combinatorics.ts / calls.ts, cross-checked by enumeration on the real urn
  forms: string[];                           // accepted derivations in safe-parser syntax; each evaluates exactly to `value`
  bareOk: boolean;                           // may the bare value be typed (red part "4": yes; total "120": no)
  inputs: string[];                          // edges (combine <- parts, result <- combine and total)
  reason?: string;                           // claim set that justifies a combine
  hints: Rich[];                             // authored ladder, max 3, on demand under the lines
}
const NodeOverride = z.strictObject({
  label: RichSchema.optional(), hints: z.array(RichSchema).max(3).optional(),
  feedback: z.record(MutationId, RichSchema).optional(),      // per-node text for one mutation (wins over the generic text)
  mutationsOff: z.array(MutationId).optional(),               // coincidence at THIS node (loader proves it)
  bareOk: z.boolean().optional(),
});

// D. mutation ids: a closed enum in the engine; authored text is data
const MutationId = z.enum([
  'drop_division', 'divide_by_k_not_k_factorial', 'one_factor_divided', 'ordered_instead_of_groups',
  'add_instead_of_multiply', 'swap_numerator_denominator', 'bracket_left_to_right',
  'over_generalised_order_rule', 'unsimplified', 'missing_part', 'start_number_off', 'n_times_k',
]);

// F. standing checks (triggers are engine predicates; content supplies picture and wording)
const CheckSpec = z.strictObject({
  id: z.enum(['above_one', 'units', 'multiply_back', 'simplify', 'range', 'target']),
  picture: ComponentSpecSchema.optional(),  // above_one: PartWholeBar (feedback mode first, ask mode on repair)
  prompt: RichSchema, hints: z.array(RichSchema).max(3).default([]),
});

// G. claim testing
const ClaimCard = z.strictObject({
  id: Id, text: RichSchema, condition: RichSchema.optional(),
  prediction: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('ordered_is_constant_times_groups'), constant: z.number().int().min(2) }),   // "always x2"
    z.strictObject({ kind: z.literal('ordered_is_k_factorial_times_groups') }),                                    // true
    z.strictObject({ kind: z.literal('groups_is_ordered_over_k') }),                                               // "divide by k"
  ]),
  truth: z.enum(['true', 'false', 'true_only_for_k2']),                // engine-derived at load; the field is checked, not trusted
});
const ClaimSet = z.strictObject({ id: Id, prompt: RichSchema, cards: z.array(ClaimCard).min(3).max(5),
  testCase: z.strictObject({ reds: Int, blacks: Int, k: Int }),        // NEW small case; guard: over-general card falsified, valid card holds
  noteAllowed: z.boolean().default(true) });                           // optional free text: stored, never evaluated

// I. repair paths
const RepairSpec = z.strictObject({
  id: Id, kind: z.enum(['plan_help', 'small_box', 'own_claim', 'combine_list', 'above_one', 'units', 'one_ball']),
  opensOn: z.array(z.union([MutationId, z.literal('escape'), z.literal('plan_fail'), z.literal('check')])).min(1),
  twin: z.strictObject({ reds: Int, blacks: Int, k: Int, j: Int,
    purpose: z.enum(['discover', 'distinguish']) }),                  // other urn; guard (section 8.4). A 'discover' twin may carry k = k! ON PURPOSE
                                                                       // (R2: a 3-ball box taken 2 at a time, where "always x2" is true); a 'distinguish' twin
                                                                       // (plan help, R3's test case, cold test) must not
  picture: ComponentSpecSchema.optional(),                              // GroupBoxes, ChoiceProduct, SlotsPattern, PartWholeBar, EventAreaModel
  claimSet: Id.optional(), maxActs: z.number().int().max(10).default(10),
  hints: z.array(RichSchema).max(3),
});

// J. findings, sheet, paper skeleton
const FindingSpec = z.strictObject({
  id: Id, title: RichSchema, nodes: z.array(Id).min(1),                // derivation = the student's own correct lines for these nodes
  reasons: z.record(Id, RichSchema),                                    // one short reason per node (shown beside the student's line)
  rule: z.strictObject({ id: Id, text: RichSchema, condition: RichSchema }),   // the rule WITH its condition
  bridge: z.strictObject({ did: z.string(), exam: z.string() }).optional(),     // templates; shown only after the node is credited
});
const PaperLine = z.strictObject({ id: Id, french: z.string(), blank: z.array(z.strictObject({ at: z.string(), node: Id, as: z.enum(['value', 'expression']) })) });

// K. recipe
const RecipeCard = z.strictObject({ id: Id, text: RichSchema, kind: z.enum(['step', 'check', 'distractor']) });
const RecipeSpec = z.strictObject({ pool: z.array(RecipeCard).min(6).max(10), clean: z.array(Id).min(3).max(5), minPick: z.literal(3), maxPick: z.literal(5) });

// The step
export const MethodStepSchema = z.strictObject({
  ...stepBase, kind: z.literal('method'),
  plan: PlanSpec, read: ReadSpec, graph: GraphSpec,
  checks: z.array(CheckSpec), claims: z.array(ClaimSet).default([]), repairs: z.array(RepairSpec),
  findings: z.array(FindingSpec), paper: z.array(PaperLine), recipe: RecipeSpec,
  budgets: z.strictObject({ fast: z.literal(8), repair: z.literal(10), worst: z.literal(30) }),   // constants, pinned by a test
});
```

L. **Cold test spec** (exercise level, not per question):

```ts
const ColdSpec = z.strictObject({
  template: z.literal('urn_exactly_j'),                  // same graph builder as question 1
  statementFr: z.string(),                               // French template, numbers as words or digits per exam style: {reds} {blacks} {k}
  ranges: z.strictObject({ reds: IntRange, blacks: IntRange, k: z.literal(3), j: z.literal(1) }),
  reserved: z.array(z.strictObject({ reds: Int, blacks: Int })),   // [{4,5},{5,4}] (owner's paper tests), plus every urn used in this exercise (computed)
  seedPolicy: z.literal('exercise+attempt'),             // deterministic: the same exercise and attempt number give the same question
});
```

### 2.3 How the loader validates it (extends `src/content/loader.ts`)

Everything below is a hard error (the exercise does not load), except the items marked warn.

1. Shape: the zod schema above; step ids unique; `reviewed: false` on every new Arabic string (existing flag).
2. **Graph computed, never typed.** `buildGraph(template, urn, draw)` calls `combinatorics.ts` (`choose`, `arrangements`, `factorial`) and is cross-checked by enumeration on the real urn (`runEngineCall` with `outcomeCount`/`probability`, the "verified a second way" rule of `urnVariants.ts`). `GraphNode.forms` are parsed by the safe parser (plus the counting pre-pass) and must evaluate exactly (`evaluateExact`) to `value`.
3. Plan cards: acyclic `needs`; every `yields` is a graph node; every node has exactly one `planCard`; at least one linear extension.
4. Read: every `targets[].token` occurs in the statement; at least 4 distractor tokens exist.
5. **Mutation tables.** For every node the engine generates all applicable mutations; a mutation whose value equals the node's value is dropped and listed as a coincidence (warn if the author lists it in `mutationsOff`, error if a repair twin or the cold generator would use it). Two mutations with the same value at one node are an *ambiguity* (reported; the matcher then falls back to the generic line).
6. **Leak scan.** No authored feedback string holds a digit; no `\val{}` of a node value appears in feedback or in plan-help text; no hint of level 1 or 2 holds a node value or a sub-result equal to it (the guard of `src/planner/llm/guard.ts`, `solutionConcepts.ts` reused as a pure function over content). Levels follow rule 6: the full line only at level 3.
7. Repairs: `twin` passes the guard (section 8.4); `opensOn` ids exist; every mutation that has a repair has a misconception `mut.<id>` with `feedback` and `feedbackConfirmed`; budgets: the declared step count of each repair is at most `maxActs`; claim sets: the over-general card is falsified on the test case, the true card holds, and the test case is listable by hand (at most 10 groups).
8. Findings and paper: every node and finding id exists; every blank references a node; the French text parses; formulas parse.
9. Cold: ranges non-empty; at least 20 distinct urns pass the guards (otherwise the generator would loop).
10. `reviewed: false` strings are listed by `npm run replay -- coverage`-style output for D36's teacher list (a new table `D41`).

### 2.4 How it is authored in JSON (question 1, abbreviated)

```jsonc
{ "id": "m1", "kind": "method", "skills": ["combinations-count", "multiplication-principle", "probability-by-counting", "ordering-vs-choosing"],
  "plan": { "cards": [
      { "id": "c_total", "text": { "ar": "…" }, "yields": ["total"] },
      { "id": "c_fav",   "text": { "ar": "…" }, "yields": ["fav_red", "fav_black", "fav"] },
      { "id": "c_ratio", "text": { "ar": "…" }, "needs": ["c_total", "c_fav"], "yields": ["result"] } ],
    "help": { "repairId": "r1_plan_help" } },
  "read": { "statement": "statement", "targets": [ { "token": "simultanément", "effect": { "order": "unordered" } } ], "notOrderWord": { "ar": "…" } },
  "graph": { "template": "urn_exactly_j", "args": { "j": 1 }, "nodes": { "fav_red": { "bareOk": true } } },
  "checks": [ { "id": "above_one", "picture": { "component": "PartWholeBar", "props": { "mode": "feedback" } }, "prompt": { "ar": "…" } }, … ],
  "repairs": [ { "id": "r2_small_box", "kind": "small_box", "opensOn": ["drop_division", "ordered_instead_of_groups", "divide_by_k_not_k_factorial"], "twin": { "reds": 1, "blacks": 2, "k": 2, "j": 1, "purpose": "discover" } }, … ],
  "findings": [ … ], "paper": [ … ], "recipe": { … } }
```

The numbers of question 1 (4, 6, 10, 3, 120, 60, 1/2) never appear in this JSON; they come from the urn in `experiment`. Version: `exsc2-0.4.0` for `bac2022c-sc-ex2` and its misconceptions file only.

---

## 3. LINEINPUT DESIGN

### 3.1 What it must do

A text-model calculator pad (like `NumericKeypad`, not the tree editor of Exercise 4). Keys: digits `0-9`, decimal comma, `+`, `−` (U+2212), `×`, `÷`, `(`, `)`, `=`, `⌫`, fold `▾`, plus the submit. **No letter keys, no `C(n,k)` key** (as in your brief; the decision it reverses is "no letter keys / numeric keypad only", recorded as D37 in section 9.0). `×` produces `*` and `÷` produces `/` for the safe parser (its `OP_ALIASES` already accept both). Pad: 5 columns x 4 rows of 44 pt keys with 6 pt gaps, like the keypad; at 360 pt the inner card is about 300 pt so a key is about 55 pt wide [computed from the keypad's tokens, not measured on a device]. A line is a chain: `336 ÷ 6 = 56` (any number of `=`; each side evaluated exactly; all sides must be equal). The line is **never graded while it is being typed**; `input_trace` logs the keys as the keypad does.

### 3.2 Alternatives

**Roles (who says what a line is).**

| | A. Chip first | B. Role inferred | **C. Role chips ARE the submit buttons (recommended)** |
|---|---|---|---|
| Gesture | tap a role chip, type, press ✓ | type, press ✓; the app names the role from the value and the plan card | type, then tap one of five chips "ثبّت كـ ..." that submit the line with that role |
| Taps per line | 2 | 1 | **1** |
| Fast path taps (section 5) | 14 | 9 | **9** |
| What the app learns | the intent, but the student may chip before thinking | only the value; the student's own idea of the line is lost (the brief's evidence 1) | **the intent, chosen while looking at the finished line** |
| Risk | extra tap per line; the chip row takes height before any key is pressed | wrong when the student writes the right number at the wrong step | a mis-tap submits the wrong role: mitigated by a 6 s "change role" chip on the accepted line (logged `role_changed`) |
| Vocabulary | five generic words, always the same five (never narrowed by the step, because narrowing would hand out the decomposition) | none | same five words, shown only once the line parses |
| Width at 360 pt | chips 3 + 2 in two rows (84 pt minimum, like `OutcomeChip`) | none | the same two rows, enabled only when the line is readable |

Roles are always the same five generic chips (total, part, combine, result, check), text plus a small shape mark, never colour alone, in a fixed order. A role that does not fit the value is not an error by itself: the match is by value and structure first; the role only picks the target node when two nodes could fit (section 4.2).

**Chain lines.** Recommended: `=` is a key; a line with one side and an operator (`10×9×8÷(3×2×1)`) is accepted as "unfinished": the `=` key is highlighted and nothing is graded, so the student writes the arithmetic like on paper. A bare number is accepted only where the node says `bareOk` (the red part "4"); elsewhere it is credited as **unexplained** (value right, derivation absent), which is kept out of "what we found" and out of the paper skeleton, and for a combine line it triggers the combine check (H). Alternative (not chosen): let the engine finish the arithmetic. It hides arithmetic slips and the exam is by hand.

**Readback (ambiguity is always stated).**

| | R-A passive preview | **R-B confirm on ambiguity only (recommended)** | R-C auto-rewrite |
|---|---|---|---|
| What happens | a live LaTeX reading under the field | only when a `/` is followed by a product with no parentheses (or `−` before a sum): after the submit tap, one row asks "÷ (3 × 2 × 1) ؟" with two chips: the grouped reading and the literal reading "÷ 3 ثم × 2 × 1" | the app adds the parentheses and tells the student |
| Taps | 0 | +1 only on the ambiguous line | 0 |
| Hides a slip | no, but easy to ignore | no | **yes** |
| Evidence | none | `readback { choice }` logged: a habit signal (`bracket_fixed_by_readback`) | none |

The literal reading is what the parser does (`990 ÷ 3 × 2 × 1` is `((990 ÷ 3) × 2) × 1 = 660`). If the student confirms the grouped reading, the stored line is rewritten with the parentheses (his choice, logged). If he keeps the literal reading, the line is graded as written (and `bracket_left_to_right` may fire). R-C is rejected: it hides the slip the evidence is about.

**Recommendation:** C + chains with `=` + R-B. Width: the display field is one LTR line with the cursor-follow scroll of `lineScroll.ts`; `10×9×8÷(3×2×1) = 120` is 21 characters, about 230 pt at 18 pt STIX, so it fits 300 pt; longer lines scroll.

---

## 4. MUTATION-BASED DIAGNOSIS

### 4.1 Pipeline (pure functions in `src/method/`, all numbers from `src/engine`)

1. `splitChain(raw)` splits on `=`; every side goes through `parseExpression` (+ the counting pre-pass for `!` later). Unparsable: `invalid_input { reason }`, trigger `line_invalid` (no grading, as today).
2. `evaluateExact` on each side. Sides not all equal: **chain mismatch**. The message shows the student's own line with `≠` and **no new number** (a side's value may be the expected one; section 4.4). The only help is the `multiply_back` check (F) when the line is a division.
3. Pick the target frame (plan card) and candidate nodes: the nodes of the current plan card, plus nodes of earlier cards (a student may revisit).
4. Candidates for those nodes: (a) the correct forms; (b) the **mutations** generated from the node's expected expression (4.2); (c) the value-only procedure values (`runProcedure` through the node's engine call, as today) and authored `wrongAnswers`; (d) cross-node units mismatches (4.3).
5. Score and decide (4.2). Output: `credit(node)` | `mutation(id, node, confirmed|asked)` | `generic` | `ambiguous(candidates)`.

### 4.2 Mutations: the catalog and the real values

Ids are a closed enum in code; construction is on the factor-bag form of the node's expected expression. Values below are for question 1 (4 red, 6 black, 3 together) [measured, Node, scratchpad; the engine recomputes them]. "Your slip" marks values you produced in the simulated lesson.

| id | applies to | construction | question 1 value | Your slip |
|---|---|---|---|---|
| `drop_division` | total, black part | remove the `÷ k!` group | total 720, black part 30 | `5x4` without `/(2x1)`; total 990 ordered |
| `divide_by_k_not_k_factorial` | total (k >= 3) | divide by k only | 240 (`720/3`, the existing procedure `ordered_divided_by_k`) | |
| `one_factor_divided` | total | divide by a proper factor of k! other than k | 360 (÷2) | |
| `bracket_left_to_right` | total, black part | the divisor group written without parentheses | total 480 (`10×9×8÷3×2×1`) | `990/3*2*1 = 660` |
| `ordered_instead_of_groups` | combine, result | a part or a total in ordered form next to a group count (cross-node, 4.3) | combine `4 × 30` = 120 | total 990 (ordered) with favourable 75 (groups) |
| `add_instead_of_multiply` | combine | `+` for `×` | 19 (existing `adds_instead_of_multiplying`) | |
| `swap_numerator_denominator` | result | `den / num` | 2 | `56/30 = 28/15` |
| `over_generalised_order_rule` | part of a one-ball choice | "different orders of the same balls count once" applied to a choice of ONE ball | red part 1 (instead of 4) | `R1 R2 = 1` |
| `unsimplified` | result | right value, not in lowest terms | 60/120 | `25/55` |
| `missing_part` | combine | a proper sub-product of the parts | 4, 15 | |
| `start_number_off` | total, black part | the falling product starts at n+k, n+1 or n−1 | total 286, 165, 84; black part 28 | `8+3` as the start |
| `n_times_k` | total, black part | C(n,k) read as n × k | total 30, black part 12 | |
| (value-only, from procedures) | any | `all_balls` 10, `with_replacement` 1000, `all_outcomes` 120 as favourable, `single_ball_probability` 2/5 | | |

**Coincidence at node level [measured]:** for the black part (k = 2) `divide_by_k_not_k_factorial` and `bracket_left_to_right` both equal the right value 15 (k = k!, and `×1`). The engine **drops a mutation whose value equals the node's value** and lists it, so no right line is ever labelled wrong. **Ambiguity [measured]:** combine 120 is both `ordered_instead_of_groups` (`4 × 30`) and "the total given as the favourable count". Resolved by structure (`4×6×5` against a bare `120`), else the probe card (existing, at most 7 candidates).

**Scoring (deterministic, no randomness):** a label needs `valueMatch` (exact, `sameRat`). Among candidates with a value match: `s = structure` in {1: factor-bag equal; 0.5: same multiset of leaves, different tree; 0: value only}; `+0.5` if the chosen role equals the candidate node's role; `+1` if the node is in the current plan card; ties broken by catalog order (specific before general). `s = 1` -> confirmed form of the feedback; `s < 1` -> the question form ("هل عدّيت ...؟"), as `feedback` / `feedbackConfirmed` already work (D30). Two candidates with the same top score -> no label, the probe card (existing) or the generic line. No value match -> `generic`: "this line counts something else than this step asks" plus the line's own units if the engine can name them.

### 4.3 Units (cross-node)

Each credited or diagnosed line carries a `unit` (`ordered`, `groups`, `count`, `ratio`). `drop_division` on a total tags the line `ordered`. A result line `a ÷ b` whose operands come from lines with different units triggers the **units check** (F), not a mutation: "the 990 counts [ordered draws] and the 75 counts [groups]". This is exactly the case in the evidence (990 against 75).

### 4.4 Leak rules (enforced in one function, `exportable()`, like `EXPRESSION_SEARCH_PLAN.md` 4.2)

1. Never print the expected value of any node of the current plan card or later, nor a sub-result equal to it.
2. A chain mismatch prints the student's own line with `≠` and no computed number.
3. Feedback texts hold no digit (the loader scan); the student's own numbers are inserted at display time, as separate math runs, and only if they are not an expected value.
4. A mutation message names what the line **counts or does** ("this line counts draws where the order matters"), never the repair ("divide by 3 × 2 × 1").
5. A hint of level 1 or 2 never holds a node value (loader scan with the guard of `solutionConcepts.ts`); level 3 may hold the line.
6. A line that **contains** the right value as a sub-result (`4×15+3`) is not credited for it; its message does not point at the sub-result.
7. The target given by the statement ("montrer que P(A) = 1/2") may be quoted: it is in the statement. It is not a leak.

### 4.5 False-positive risk (to be measured in Phase 1)

A typed value can coincide with a mutation by accident. Controls: (a) a label needs the target node's own mutation table, not a global one; (b) the question form hedges every value-only match; (c) a Phase 1 property test generates 200 seeded urns and asserts: no mutation value equals its node's right value, and at most 2 mutations share one value at one node; (d) the false-label rate is reported per node in the Phase 3 stop (a scripted student that writes random plausible lines). Not verified here: real students.

### 4.6 What stays byte-identical

Exercise 2 (`ex2-0.5.0`) and Exercise 4 (`ex4-0.1.0`) JSON and their versions (D23 tests), the typed-answer branch of `onAnswer`, `procedures.ts`, `coincidence.ts` (imported, not edited), the planner `Action` union and the LLM wire format, the picker with no saved recipe, the lesson header without a `method` part (no strip), and every screenshot outside question 1 (section 7).

---

## 5. INTERACTION BUDGETS

### 5.1 The unit (decided here; please confirm, section 11 item 1)

An **act** is one action the reducer receives: a typed answer is 1 however many keys, an ordered set of cards is 1, a line is 1, a hint is 1, a gate tap is 1, a card pick is 1. This is the unit the A1 report used (4 -> 7). A **tap** is a finger touch; keystrokes on the pad are not counted in either (they are `input_trace`). Both are reported.

### 5.2 Fast path of question 1 (no mistake, order does not matter)

| # | Act | Taps |
|---|---|---|
| 1 | Order the three plan cards (count all draws, count favourable draws, divide) | 3 |
| 2 | Tap "simultanément" in the statement | 1 |
| 3 | Line, role total: `10×9×8÷(3×2×1) = 120` | 1 |
| 4 | Line, role part: `4` (bare allowed) | 1 |
| 5 | Line, role part: `6×5÷(2×1) = 15` | 1 |
| 6 | Line, role combine: `4×15 = 60` | 1 |
| 7 | Line, role result: `60÷120 = 1÷2` (target 1/2 checked silently) | 1 |
| 8 | Build the recipe (3 to 5 sentence cards) and confirm; the finished paper skeleton is shown on the same screen | 4 to 6 |
| | **Total** | **8 acts, 13 to 15 taps** |

The budget (8) is met with no slack, so any standing check that fires is a slip path, never the fast path. The cold test is separate (its own screen, no budget, section 8.5). Taps under the other role designs: A (chip first): 8 acts, 18 to 20 taps; B (role inferred): 8 acts, 13 to 15 taps, the same as C. If you meant **taps**, the fast path needs the plan to count as one tap (a single "next" on a pre-ordered plan, which defeats its purpose) or the recipe dropped from the question; I recommend the act unit and 8.

Several lines may be merged by the student (`4×6×5÷(2×1) = 60`): fewer acts, credited by factor-bag equality, the combine check runs because the parts were not derived separately (4.2 / H).

### 5.3 Repair paths (each at most 10 acts, counting the accepting tap)

Repairs are variants of kind `alternative` (reached through the existing `rule.first_wrong.repair` offer card, or "ما نعرفش") whose step is a `repair` script. Counts are design targets, pinned by scripted-student tests in Phase 3.

| Repair | Opens on | Acts |
|---|---|---|
| R1 plan help | "ما نعرفش" at the plan, or two refused placements | accept 1, three "next" taps through the worked plan of the twin (other numbers) 3, re-order own plan 1 = **5** |
| R2 small box | `drop_division`, `ordered_instead_of_groups`, `one_factor_divided`, "ما نعرفش" at the total | accept 1, build the 3 pairs of a 3-ball box with chips (3 adds, "that is all" 1) 4, line `3×2 = 6` 1, type "each pair counted how many times" 1 = **7** |
| R3 own claim on a new case | the claim chosen at the end of R2, or `divide_by_k_not_k_factorial` | accept 1, pick a claim card 1, list the orderings of one group abc until the claim breaks (3 adds) 3, acknowledge 1, pick the claim that survives 1 = **7** (9 with the groups of a 4-ball box) |
| R4 combine check | a combine line with no reason | accept 1, list the draws of one red with every black pair (3 adds + done) 4, line with the count 1 = **6** |
| R5 above one | result above 1 | accept 1, place the value on the bar 1, write the fraction again 1 = **3** |
| R6 units | operands with different units | accept 1, choice "same kind of thing?" 1, rewrite the ordered number as groups 1, rewrite the result 1 = **4** |
| R7 one ball | `over_generalised_order_rule` | accept 1, list the 2 choices of one red among two 2, claim pick 1, line 1 = **5** |

Sum of all seven = 37, so the global cap below binds before every repair can open.

### 5.4 Caps

1. **Repair cap (10 acts):** at the tenth act the repair closes with outcome `capped`, the student returns to the same line card with the hint ladder available, and the same repair is not offered again for that mutation id.
2. **Question cap (30 acts):** `THRESHOLDS.methodActsPerQuestion`. The reducer counts every student act of the question from the first plan placement to the last line, hints and repairs included, recipe excluded. At the cap a `method_capped` event is logged, no repair opens, and each not-yet-credited node is shown as the engine's worked line (`revealed`, one tap each, "ما نعرفش، ورّيني" logged `how: skipped`); `part_done { revealed }` counts them. An offered repair whose `maxActs` would pass 30 is not offered.
3. **Repeat of a mutation:** the second time the same mutation id fires in a frame the lesson gives the next hint instead of the same repair (new rule `rule.method.repeat_mutation`); the third time it unlocks nothing new (rule 6 stays: reveal only at the end of the ladder).
4. **Existing caps, per expanded step key:** `maxDetoursPerStep 3` counts repairs of that plan card (transfers not counted); `MAX_DEPTH 3` is never reached (a repair is depth 1, its claim is a stage, not a nested detour); `repeatPerSkillPerSession 2`, `stepBackPerSkillPerSession 1`, `movesPerQuestion 4` govern `nextMove` after a plan card closes and are unchanged; `REVEAL_AFTER_DETOURS 2` keeps its meaning on `repair` steps (a repair is a variant step).
5. **Hints:** the authored ladder (3 levels) is an on-demand aid under the lines of each plan card; `onReveal` is refused until the end of the ladder (rule 6). Hints are acts.

### 5.5 How the rules planner decides (no new action, no LLM)

- **Triggers are the existing ones.** A line with a mutation sets `pending` with `wrong` (the answer event carries `misconceptionId: 'mut.<id>'`, `inferredBy: 'mutation'`); an unreadable line is `line_invalid` (its rule changes nothing); "ما نعرفش" is `not_sure`; a credited node is `correct`; a closed repair is `detour_closed`; the end of the ladder is `revealed`.
- **Repairs are `alternative` variants** (`representation: 'method:<kind>'`) whose step is the new `repair` kind. `Rules.repairFor` already maps a misconception's repair to a variant and shows the offer card (`rule.first_wrong.repair`); the second slip uses `change()` (deep dive, then alternatives), the third struggle signal asks what is unclear (the clarify ladder, with `dd_choose_bridge` first in the array on purpose). The `Action` union, `validateDecision` and the LLM wire format do not change.
- **One new rule only:** `rule.method.repeat_mutation` (5.4, item 3).
- **Standing checks are not planner decisions.** The reducer opens them from the engine predicates as cards inside the frame (logged `check_shown`, `check_done`); if the student fails a check twice or says "ما نعرفش", the planner offers the picture repair (R5, R6) like any repair.
- **`nextMove` per expanded step key:** outcome classes (`first_try`, `after_retry`, `after_hint`, `after_detour`, `revealed`) are computed per plan card; the cold test is not a `nextMove`; its result is logged and shown, nothing repeats.
- **No model call:** `consult.ts` ignores the four new kinds (a fake client is never called, tested); `offeredToPlanner` stays false on every component used.

---

## 6. THE STRIP, THE SHEET, THE PAPER SKELETON, "MY METHODS" (Cahier style)

### 6.1 Strip

A quiet row directly under the 6 pt progress bar, shown only when the open part contains a `method` block (so lessons 1.b, 2.a and A.1 do not change by one pixel). Content: the current step name in `font.small` / `inkMuted` at the reading start (right), six small step dots (done = pen filled with a check shape, current = highlighter with an ink ring, upcoming = hollow), and a chevron "▴" at the end. Height 36 pt drawn, 44 pt hit area through `hitSlop` (`editor.tapSlop` pattern). The whole row is one button (`method-strip`, a11y "افتح خريطة السؤال"). Cost: about 36 pt of the 667 pt feed viewport on a 402 pt screen [proposal, to measure in Phase 2; the keypad plus role chips may force the card to scroll as tall cards already do].

### 6.2 Sheet ("خريطة السؤال" and "what we found")

A Modal in the style of `PaperSheet` (slide, `maxHeight` 88 %, top radius `radius.sheetTop` 20, handle, × 44 pt, scrim, `PaperBackground`), scrollable, body text `font.body` (16.5 / about 1.8). iOS one-modal rule: hidden while the report sheet or the long-press menu is up (`TutorDrawer` pattern). Order of content:

1. **Roadmap:** six rows (plan, read, count all draws, count favourable draws, divide, **write on the paper last**); done rows carry a check shape, the current row is a highlighter row with an ink border; no other status.
2. **Paper skeleton:** a white `RichView variant="paper"` sheet in STIX French, LTR, `direction: 'ltr'`. Source: the question's `writeup.modelFr` with `{{node}}` placeholders (one source of truth: no second copy of the exam text).
3. **What we found:** one card per finding: a few derivation lines (the student's own correct lines, each with its short reason), then the result last, then the rule **with its condition** on a highlighter band. No "wrong", no counts of mistakes, no skill status (D8). A claim that was falsified is not shown; the claim that survived is the rule.
4. **Bridge cards** (after the node is credited by his own computation): "what I did" (his line, as he typed it, LaTeX from `toLatex`) next to "how the exam writes it" (`chooseLine` of the engine, textbook `C_{10}^{3} = 120`).
5. A link "وصفاتي" (My methods).

Close: scrim, ×, back gesture, primary «نرجعو للسؤال»; logged `MethodSheet opened / closed { via }`; focus returns to the strip.

### 6.3 Paper skeleton fill rules

1. Lines are in exam order, not solving order; each is a French sentence with blanks.
2. A blank is filled **only** from an accepted line of its node (value credited, not `unexplained`), in pen colour with the student's own value; template text stays ink.
3. Unfilled blanks are dashed boxes (existing `rowSoon` style) with no text; nothing is ever shown filled with a wrong value or a right value the student did not compute.
4. When the node was credited, the blank may show the exam notation next to his line only through the bridge card (rule: after he computed it himself).
5. The last line (« Donc P(A) = ... ») fills when the result node is credited and equals the statement's target.
6. A revealed node (end of the ladder, or `capped`) fills with a dashed pen outline and the engine's line, marked by shape (dashed), never by colour alone.

### 6.4 "My methods"

A Modal list reusable at two places: the picker (a quiet entry **shown only when at least one recipe is saved**, so the picker stays pixel-identical on an empty store) and the sheet inside any lesson ("reopenable in any later exercise"). Each item: the question's short French wording, the student's recipe (ordered sentences), beside (stacked at 360 pt) the clean recipe card with its standing checks, the optional note, the date. Storage: a new MMKV instance `tteclair-methods`, key `methods.v1`, zod-validated, damaged data ignored, at most 50 items, built like `appDoneRecord`. **The note is never in an event, an export, a report or any prompt** (a test scans them); it is minors' free text, flagged for the legal review (`PILOT_CONSENT.md`). Events carry card ids only.

### 6.5 Tokens, contrast, a11y, tests

Theme tokens only (`themeHygiene`), `theme.reading` / `theme.mathSide` (`readingSides`), no emoji glyphs (`probability2Emoji`), real minus U+2212 (`probability2Hygiene`), contrast pairs appended to `__tests__/contrast.test.ts` (each new fill + text pair), 44 pt targets, colour never alone (shape or text with every colour), math always its own LTR block, no digit or Latin on a line with Arabic words (two lines instead), all new Arabic `reviewed: false` and listed in a new D41 teacher table. testIDs: `method-strip`, `method-sheet`, `method-sheet-scrim`, `plan-card-<id>`, `plan-slot-<n>`, `read-token-<n>`, `line-input`, `line-key-<k>`, `line-role-<role>`, `line-readback-grouped`, `line-readback-literal`, `check-card-<id>`, `claim-card-<id>`, `skeleton-<id>`, `finding-<id>`, `recipe-card-<id>`, `recipe-confirm`, `my-methods`, `my-methods-entry`. Screen readers: each card "x of n", the skeleton blanks announced "blank" or "filled with ...", formulas through `spokenMath`.

---

## 7. CHANGES TO QUESTION 1 AND TO THE TESTS

### 7.1 Content (`bac2022c-sc-ex2.json`, version `exsc2-0.4.0`; Exercise 2 `ex2-0.5.0` and Exercise 4 `ex4-0.1.0` untouched, D23)

New main path of question 1: `s1` (statement lead, unchanged), then the `method` block `m1` (expanded to `m1.plan`, `m1.read`, `m1.c_total`, `m1.c_fav`, `m1.c_ratio`), then the recipe screen. Removed from `groups[].steps`: `urn`, `s2`, `compare`, `s3`, `boxes-intro`, `boxes`, `s4`, `s5`, `choice-intro`, `choice`, `s6`, `s7`, `s8`, `s9`. (`s3` "how do we draw" is replaced by the read tap; `compare` stays available inside `dd_count_draws` as the "what does simultanément mean" picture.)

Kept as **repairs / after-answer aids**, re-pointed with `forSteps`:

| Existing | Becomes |
|---|---|
| `alt-1-s4-boxes` (GroupBoxes, 4-ball twin) | alternative for `1/m1.c_total`, opened by `drop_division` / `ordered_instead_of_groups`. **Flag:** it draws 3 of 4 (k = n-1), which the new cold guard would reject; kept as accepted earlier (open question 4) |
| `alt-1-s6-choice` (ChoiceProduct, 2 red 4 black, answer 12) | alternative for `1/m1.c_fav`. **Flag:** 12 equals the black part's `n_times_k` mutation value of question 1 (6 x 2), so the new loader guard (twin answers against the target frame's mutation tables) will reject it: replace the twin in Phase 3 |
| `alt-1-s8-partwhole` (PartWholeBar, 18/35) | R5 above one, opened by the check |
| `dd_choose_bridge` (SlotsPattern, 7 balls, 35) | stays first in the array (pinned test), reached by "counting" at `c_fav` |
| `dd_count_draws`, `dd_and_times`, `dd_fav_total` | `deepDiveId` of the three plan-card frames |
| `sim-1-total-1/2`, `sim-1-onered-1`, `sim-1-p-1`; `tr-1-onered-5r5n`, `tr-1-p-5r5n` | `forSteps` re-pointed to `m1.c_total / c_fav / c_ratio`; transfers keep `nextMove` behaviour |
| hints of `s4`, `s6`, `s8` and their 2-line walk-throughs | hints and `walkthrough` of the three plan-card frames (3 levels each; the symbol or line only at level 3; `checkWalkthroughs` runs on them) |
| 17 misconceptions | kept (value rows on the nodes); plus the shared `mut.*` library (12 entries x `feedback` + `feedbackConfirmed`) |
| `writeup.modelFr` (4 French lines) | the paper skeleton source |

New skills (`reviewed: false`, in `skillMap.json`): `plan-the-count`, `read-order-from-statement`, `check-own-answer`. Authored Arabic is new and `reviewed: false`; none is a correction of the exam text.

### 7.2 Tests that change (reason each; none weakened: an obsolete assertion is replaced by an equal or stronger one on the new path, listed in the Phase 3 report)

| Test | Today | Change |
|---|---|---|
| `scEx2.pictures.test.tsx` "order of the steps of question 1" | 15 ids | the new ids (s1 + five expanded) |
| same, "both are visuals that hold the lesson (explored gate)" | pictures on the main path | they exist only inside `variants`; the fast path has no picture and no gate |
| same, "version is 0.3.0 ..." | `exsc2-0.3.0`, 0.2.0 / 0.1.0 absent | `exsc2-0.4.0`, 0.3.0 / 0.2.0 / 0.1.0 absent in every block |
| same, "[4, 7, 3]: before 4, after 7, +3" | A1 budget | the new budget: 8 acts on the fast path, tap column reported |
| same, "played as a student would: waits at each picture" and "uses the escape on both pictures" | main-path gates | the lesson never waits on the fast path; the escape is tested inside the repairs (`explored { how: skipped }`, `part_done.revealed`) |
| same, twin numbers, hints, new wrong values, repair alternatives | A1 | kept; the "no number on screen is an answer, a wrong or a procedure value" test is extended to every mutation value of the target frame |
| `scEx2.stop2.test.tsx` "same fifteen steps", "same four questions and two gates", "s8 gained one procedure row" | Stop 2 invariants | replaced by the new step list; the s8 procedure row `total_over_favourable` (`120÷60 = 2`) now lives on the result node and is also produced by `swap_numerator_denominator` |
| same, version test (0.3.0) | | 0.4.0 |
| same, `dd_choose_bridge` array order and reach | | unchanged assertion, new reach path (clarify "counting" at `c_fav`) |
| `scEx2.test.ts` helper `upToProbability()` and the typed flows (720, 360, 1000, 54/125 ...) | typed answers | helper plays the fast path; each old wrong value is typed as a bare line or its mutation and must give the same misconception |
| `misconceptionCoverage.test.ts` | places = typed / choice / lines steps | places also include `mlines` frames and `mut.*`; "a probe card only when its answers lead to different actions" kept |
| `events.test.ts`, replay tests, `i18n.test.ts`, `contrast.test.ts`, `skills` / `catalog` suites | | additive samples, new keys in both locales, new pairs, new skills |
| `gates.test.ts` | [not read] | check in Phase 1 whether it loads sc-ex2 |

### 7.3 Pixel-diff plan

Tooling: `tools/screens/capture.js` and `diff.js` (untracked, Node built-ins only), `-devLlm off` on every launch, status bar fixed, perf-panel text masked, tolerance 2 per channel. Devices: iPhone 17 Pro (402 pt, `27978103-59E7-4963-99A8-91E1319449B9`), iPhone 16e (390 pt, `7B5AAEAC-353D-4D86-AF96-69A709747C51`); 360 pt is the debug `-devWidth 360` wrapper (there is no 360 pt simulator).

1. Phase 1 start: a fresh baseline run, twice, to prove determinism (about 28 minutes per device, nothing else running).
2. After each phase: the **19-screen sanity set** (picker, lessons 1.b / 2.a / A.1, question 1 first screen, 4 Proba and 4 Analysis cases, demo, lesson and bidi tabs). Must be identical except question 1.
3. End of Phase 3: the full 98 per device. **Expected differences, all intended:** the five `lesson-scex2-q1-until-*` shots are retired and replaced by `until-plan / read / total / fav / ratio` (new baseline), question 1's first and end screens change (unlike Phase 4a), the unfiltered Proba tab shifts by whole perf-panel lines as before. **Everything else identical**, including the picker (My methods entry appears only after a saved recipe), lessons 1.b / 2.a / A.1 (no strip), every existing component demo. New demo cases are appended at the end of each demo list so existing `#n` indexes do not move. Positive control: the new demos render.

---

## 8. ENGINE ADDITIONS AND TESTS-FIRST LISTS

All in `src/method/` (pure, deterministic, exact, no `eval`), each module with its test file written first. Values are the ones you produced (urn 3 red 5 black, then 5 red 6 black) and question 1 [measured, Node]. A line in italics is my reading of a value whose context I cannot see; please confirm (section 11, item 10).

### 8.1 E1 `lineChain.ts` (split, evaluate, equality)

`splitChain(raw)`, `evalChain(raw) -> { sides: Fraction[]; equal: boolean; asts }`, uses `parseExpression` + `evaluateExact` only.

- `336/6 = 56` equal; `336/6 = 55` not equal and the result carries **no number**; `8+3` = 11; `4*3` = 12; `3*2*1` = 6 (abc has 6 orderings); `24/6` = 4; `3*1` = 3; `5*4` = 20; `(5*4)/(2*1)` = 10; `990/3*2*1` = 660 (left to right); `990/(3*2*1)` = 165; `75/660` = 5/44; `56/30` = 28/15; `25/55` = 5/11.
- Rejects: `1+`, `()`, `2 3`, `=` first or last, `a=b` with a letter, > 200 characters; never throws on `1/0` (null, "not a number").
- A value past 2^53 returns null (no float).

### 8.2 E2 `factorForm.ts` (structure) and `readback.ts`

`factorBag(ast)` flattens `*` and `/` into numerator and denominator multisets (drops `*1`, `/1`), keeps sums as opaque factors; `sameBag`; `readback(ast)` returns `{ ambiguous, grouped, literal }`.

- `4*6*5/(2*1)` and `4*(6*5/(2*1))` are the same bag; `10*9*8/(3*2*1)` equals `10*9*8/(3*2)` (the `*1` is dropped: right value, shorter form).
- `990/3*2*1` is NOT the bag of `990/(3*2*1)`; readback offers `÷ (3 × 2 × 1)` and the literal `÷ 3, then × 2 × 1`; `990/(3*2*1)`, `990/3`, `5*4/2` give no readback.
- `(8+3)*7*6` keeps `(8+3)` as one factor (start_number_off).

### 8.3 E3 `mutations.ts`

`mutationsFor(node)`, `matchLine(candidates, line, role, frame) -> credit | mutation | generic | ambiguous`.

- Question 1 table of section 4.2 (total 720 / 240 / 480 / 360 / 286 / 165 / 84 / 30; black part 30 / 12 / 28; combine 19 / 4 / 15 / 120; result 2 / 60/120 / 1/12 / 60 / 2/5; red part 1).
- Your urn 3R5B: ordered 336, total 56 (`336/6 = 56`), red 3, black part 10, favourable 30, P = 15/28; swapped `56/30 = 28/15` -> `swap_numerator_denominator` (above one).
- Your cold urn 5R6B: ordered 990, total 165, black part 15, favourable 75, P = 5/11; `990/3*2*1 = 660` -> `bracket_left_to_right`; `75/660` flagged by the units check (660 is not a group count); `25/55` -> `unsimplified` (value equal, not lowest terms) then `5/11`.
- `5*4` as the black part of an urn with 5 blacks, k = 2: `drop_division` (20 against 10), exact structure -> confirmed form.
- A mutation equal to the right value is dropped (black part 15: `divide_by_k_not_k_factorial`, `bracket_left_to_right`); property test over 200 seeded urns.
- A match without structure is the question form; two equal top scores give no label.

### 8.4 E4 `graph.ts` and the twin guard

`buildUrnGraph(urn, draw, j)` -> nodes, edges, forms, units; cross-checked by enumeration (`runEngineCall`). `twinOk(twin, forbiddenSet, {mode: 'role_blind' | 'role_aware', allow})`.

- Measured: with the role-blind guard, of 45 urns (2..6 red, 3..7 black, 3 drawn) only the large ones and the picture twin 3R4B survive (13); `3R5B` (your example) fails on **30** (Q1's known wrong total `3 × 10`) and **15** (Q1's black part). Role-aware (a collision counts only against the same role) accepts `3R5B`. The forbidden set is **exercise-wide** (Q2 and Q3 answers too: 20 is Q2's count of no-red draws, which also rules out `2R5B` for question 1).
- Test: the loader refuses a twin whose displayed numbers hit the forbidden set; the allowance list (`allowedCollisions: [30, 15]` for `r1_plan_help` only) is printed in every report.

### 8.5 E5 `checks.ts` (standing checks)

`aboveOne(v)`, `unitsMismatch(a, b)`, `multiplyBack(division)`, `needsSimplify(v)`, `inRange(v)`, `targetMatch(v, target)`.

- Above one: `28/15`, `56/30`, `2` fire; `5/44` and `15/28` do not.
- Units: `990` (ordered) over `75` (groups) fires; `165 / 75` does not; `60 / 720` fires.
- Multiply back: for `336/6 = 55` the check line is `55×6 = 330`, never printing 336's quotient; `24 = 6 × 4` closes.
- Simplify: `25/55` fires until `5/11`; `1/2` never.
- Target: `60/120 = 1/2` equals the statement's 1/2.

### 8.6 E6 `claims.ts`

`predictClaim(card, case) -> { predicted, actual, holds }`.

- "Always x2" (ordered = 2 x groups): holds on a 3-ball box taken 2 at a time (6 = 2 x 3; k = k! = 2) and **fails** on 4 balls taken 3 (predicted 8, actual 24; abc has 6 orderings). "k! times" holds on both. "Divide by k" fails on 3 of 4 (24 / 3 = 8). The loader requires the over-general card to be falsified by the claim set's test case and the true card to hold.
- A `12 vs 9` list check: the student's list holds 9, the engine says 12; level 1 of the help says only "at least one is missing", the same text whatever the gap (the SlotsPattern rule).

### 8.7 E7 `cold.ts` (generator and guards)

`generateColdQuestion({ exerciseId, attempt, used, shown }) -> { urn, statementFr, graph }`, seeded by `rng(hash(exerciseId, attempt))`, bounded 200 attempts, verified a second way by enumeration, no 60-draw display cap (nothing is listed).

Guards, each with a test on the real coincidence:

| Guard | Real case that must be rejected |
|---|---|
| a + b = a x b between the parts | 2 red 2 black, 2 drawn (2 + 2 = 2 x 2) |
| k = k! | any k = 2 draw |
| C(n,k) = n x k | 5 balls, 2 drawn (10 = 5 x 2) |
| "3 of 4" (k = n - 1, C(n,k) = n) | 4 balls, 3 drawn |
| answer equals a number shown earlier in the lesson | any total, favourable count or probability already on a screen of this exercise (from `shownValues`) |
| answer built from the statement's numbers | 5 red 6 black: 5/11 = reds / balls and 11 = 5 + 6 |
| single-ball slip equals the answer | the same urn: P = 75/165 = 5/11 = r / n (`single_ball_probability`) |
| urn used in this exercise or reserved | 4 red 6 black, 3 red 4 black, 3 red 5 black, 4 red 5 black, 5 red 4 black (and the swapped pairs) |
| a wrong-mutation value equal to the right value | any urn where a node coincidence leaves a mutation equal to its node |

[measured] **Your simulated cold urn 5 red 6 black fails two guards.** Over reds 3..8 and blacks 3..9 (42 urns) 17 pass: 7 are used or reserved, 21 collide with shown numbers, 13 have the answer in the statement, 1 is the single-ball case. The loader requires at least 12 passing urns; if the final guard set leaves fewer, Phase 1 widens the range (reds up to 9, blacks up to 10) before touching a guard.

Determinism test: the same `(exerciseId, attempt)` gives the same question; attempt + 1 gives another urn; 50 attempts give 50 distinct urns until the pool is exhausted, then the generator reports exhaustion instead of looping.

### 8.8 E8 `findings.ts`

`buildFindings(events, spec) -> Finding[]`, `paperFill(events, spec)`. Only accepted lines of the log; a revealed or `unexplained` node yields no derivation line; `calc` lines come from the engine (`toLatex` of the student's parsed line), never from text. Tests: a student who wrote one total line gets one derivation line; one who went through R2 gets the same finding plus the surviving claim as the rule; a path with a revealed node produces a dashed fill and no "found" mark; replaying the same log twice gives the same findings.

### 8.9 Also in Phase 1

Schema and loader (section 2), the `mut.*` misconception library, `inferredBy: 'mutation'`, three thresholds, the `consult.ts` exclusion with its test (a fake LLM client is never called on a method step), the replay mapping with a replay-equals-live test, and the DECISIONS entries listed in section 9.0.

---

## 9. PHASES, STOPS, EFFORT, RISKS

Rules for every phase: tests first; `npm run check` and `npm run check:release-dev` after each module; every launch `-devLlm off`; `npm run replay -- eval` never run; no commit unless you ask; no new dependency; a stop condition is a hard stop (I report and wait).

### 9.0 Decisions to record in `docs/DECISIONS.md` before any code (Phase 1, first task)

| New | Content |
|---|---|
| D37 | **Reverses** "no letter keys / numeric keypad only" (A1 decision, D36 change 3): the typing surface gains `+ − × ÷`, parentheses and `=` through `LineInput`. As in your brief it has **no letter keys and no C(n,k) key**; the typed-notation pre-pass stays unwired |
| D38 | **Supersedes** the +3 interaction budget of question 1: fast path 8 acts, repair 10, question 30; the unit (act) and the tap column |
| D39 | Pictures become repair or after-answer aids; A1 main-path steps leave question 1; components and alternatives kept |
| D40 | No model call anywhere in v1: method steps never consult the AI, `offeredToPlanner` stays false, student sentences are cards plus an unevaluated note |
| D41 | Arabic review table for the method lesson (all `reviewed: false`); strings follow the RTL rules |
| D42 | `exsc2-0.4.0` for `bac2022c-sc-ex2` only; D23 unchanged |
| D43 | Mutation ids map to a shared `mut.*` misconception library; `inferredBy: 'mutation'` |
| D44 | Findings, "My methods" storage and the note's privacy |
| D45 | The guard modes (role-blind, role-aware) and the plan-help allowance |

### 9.1 Phase 1: engine (effort L)

Build: sections 2 and 8 (schema, loader validation, E1 to E8, `mut.*` library, thresholds, `consult.ts` exclusion, replay mapping). **No UI, no content change** except a synthetic fixture exercise used only by tests.
Stop condition: `npm run check` green; the sanity set of 19 screens identical on both devices (no UI changed).
Report: tests added / changed (reason); the measured false-positive and ambiguity table for question 1 and for 200 seeded urns; the guard feasibility numbers; your values table (section 8) with results; what Hermes would do (a timing run of `mutationsFor` on the iOS simulator, Hermes, once).
Risks: (1) the factor-bag form misses a student's valid layout (mitigation: value-first credit, structure only for the label); (2) `repairComponent` may be checked against the component registry (not read): then repairs use `representation` only and the misconception omits `repairComponent`; (3) the replay gap above; (4) the guard set leaves too few cold urns (section 8.7).

### 9.2 Phase 2: components and shell, on a fixture (effort M-L)

Build: `LineInput` (pad, role submit chips, readback R-B), `PlanCards`, `StatementTap`, `CheckCard`, `ClaimCards`, the small-box builder (`SlotsPattern` with ball faces, confirmed or replaced by a `DrawList`), `RecipeBuilder`, `MethodStrip`, `MethodSheet`, `PaperSkeleton`, `MyMethods` (picker entry only when non-empty, store, screen state), the four expanded kinds in the reducer and `QuestionCard`, demos appended at the end of the demo lists (`LineInput#0..`, `PlanCards#0..`, `StatementTap#0`, `RecipeBuilder#0`, `MethodSheet` demo), debug-only args (`-devMethod <script>`, `-devActions answerAll` support for method frames).
Stop condition: all new components have schema, events, readonly / replay mode, unit tests, a demo screen; the sanity set identical; the three widths looked at.
Screenshots (each demo, 402 / 390 / 360): `LineInput` empty, one line accepted, chain mismatch, readback row, unreadable; `PlanCards` shuffled, one placed, bounced; `StatementTap`; strip closed, sheet open (roadmap, skeleton partly filled, a finding, a bridge card); `RecipeBuilder`; `MyMethods`.
Commands (Metro on 8081; `U` = 7B5AAEAC-353D-4D86-AF96-69A709747C51 or 27978103-59E7-4963-99A8-91E1319449B9; `B` = org.reactjs.native.example.NewTTClair; terminate the app before each launch):

```sh
xcrun simctl launch $U $B -devLlm off -devComponent 'LineInput#0'
xcrun simctl launch $U $B -devLlm off -devComponent 'LineInput#0' -devWidth 360
node tools/screens/capture.js p17 docs/screens/method/p2-p17   # then p16e
node tools/screens/diff.js docs/screens/probability-v2/baseline-p17 docs/screens/method/p2-p17
```

Interaction counts: reported on the fixture (fast path 8 acts, taps listed). Risks: the pad plus five role chips plus the card exceed the viewport at 360 pt (measure; fold ▾ and the sticky display line already exist); `SlotsPattern` ball faces need more than a prop (then a small new `DrawList` of the same model); iOS modal collisions (strip sheet vs report sheet vs long-press menu).

### 9.3 Phase 3: question 1 rewrite and the cold test (effort L) **YOU PLAY. STOP.**

Build: section 7 (content `exsc2-0.4.0`, repairs R1 to R7 as variants with `repair` steps, hints, walk-throughs, findings, paper, recipe), the cold test screen and review, the test changes of 7.2, the full 98-screen pixel pass, the generalisation baseline (section 10).
Report: interaction counts by scripted students: fast path (8 acts, tap column), each repair (<= 10), the worst case (<= 30); the old-assertion to new-assertion table; the Arabic review table (D41); pixel results; what could not be verified.
Screenshots (402 / 390 / 360): first screen, plan placed, read tap, each of the three plan-card frames with a line accepted, a chain mismatch, a readback, a mutation message (confirmed and question forms), each repair's first and last screen, the sheet with a finished finding, the recipe, My methods, the cold question blank, its review.
Play guide (what to tap, what to look for):

```sh
U=7B5AAEAC-353D-4D86-AF96-69A709747C51; B=org.reactjs.native.example.NewTTClair
xcrun simctl terminate $U $B
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/1            # play it
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/1 -devWidth 360
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/1 -devActions answerAll -devUntil m1.c_fav   # stop before the favourable card
```

1. Fast path: order the plan, tap "simultanément", write five lines, build the recipe. Count: 8 acts.
2. Slips to make on purpose (each should open the stated thing and nothing else): `10×9×8` as the total (units, then R2 if you ask); `10×9×8÷3×2×1` (readback row, then `bracket_left_to_right`); `4+15` (R4); `120÷60` (above-one check, R5); `60÷120` as `60/720` (units check, R6); `1` for the red part (R7); `60÷120` unsimplified as `60/120` (simplify); "ما نعرفش" at the plan (R1).
3. Look for: no word "wrong"; no number of the answer on any hint 1 or 2; the sheet fills from your own lines only; the skeleton blanks.
4. Cold test: write the lines, then read the review.

Risks: the Arabic cards and sentences are mine (`reviewed: false`); the biggest unknown is whether five generic role chips are understood by a struggling student; 26-screen repair paths shrink only if the mutation labels are right.

### 9.4 Phase 4: question 2 (effort S-M) **YOU PLAY. STOP.**

Data only (section 10): `P(B)` "no red" with the same template at `j = 0` (red part 1, black part `C(6,3) = 20`, no combine node), the repair picture `EventAreaModel` for "B is part of not A, not 1 − P(A)" (the trap: both have 60 and 20 draws differently; the engine's `complementIsOther` exists), the Q1 total reused as an earlier result (`link`, node `bareOk` with a pointer to the sheet). Same stop report and screenshots; the cold test with `j = 0`.
Risks: the 1 − P(A) slip equals 1/2 only by the coincidence that `P(A) = 1/2`; the repair must not be solvable by the same wrong idea (twin urn with `P(A) != 1/2`).

### 9.5 Phase 5: question 3 (effort M) **YOU PLAY. STOP.**

3.a: recognise a binomial situation (cards), the probability of one sequence (a line), counting sequences with exactly k successes (R-style repair with tables for n = 2 and 3 by hand, `SlotsPattern`, `VariableTable`, symmetry and sum checks), the law. 3.b: the mean of one trial = p, then n trials by adding; the spread through distances and contributions (`SpreadSlider` as repair), E(X) = n/2, V(X) = n/4. The Q3 graph needs a `binomial_term` template and about five new mutation ids (forgetting `C(n,k)`, forgetting `q^(n-k)`, `np` for `npq`, `p` for the sequence, `n` for `n/2`): reported as engine additions (section 10).
Risks: `Fraction` overflow (the loader's `binomialSafe`, n <= 15 for tenths); the cold test needs its own template.

---

## 10. GENERALISATION TEST (after Q2 and after Q3)

**Criterion (yours):** a question is "authored with data only, plus at most a picture".

**What I measure at each stop** (no commit is needed: I record `wc -l` per file at the Phase 3 stop and compare, listed in the report):

| Bucket | Counted as | Pass criterion |
|---|---|---|
| Lesson-engine code | non-test lines changed in `src/lesson`, `src/planner`, `src/content/loader.ts`, `src/content/schema.ts`, `src/method/reducer.ts`, `QuestionCard`, the four kinds | **0** |
| Domain engine additions | new graph templates, mutation ids, checks, cold templates in `src/method` and `src/engine` | listed by name, each with its test; allowed but reported |
| UI | new component files | at most one picture (an existing component with new props does not count) |
| Content | JSON and i18n only | free |

Expected: Q2 passes with 0 / 0 / 0 or 1 picture (it is the same template at `j = 0`, EventAreaModel exists). Q3 will likely not pass strictly: it adds a template and about five mutation ids (domain engine additions, reported) and must still add 0 lines of lesson-engine code. If Q3 needs a reducer change, that is the finding the criterion exists to surface, and I stop and report it instead of patching.

---

## 11. COULD NOT BE VERIFIED HERE, AND OPEN QUESTIONS

### 11.1 Not verified

- **Device, Hermes, cheap Android.** Everything is iOS simulator at best; the mutation timing on Hermes is measured once in Phase 1; Android: nothing.
- **Tapped flows.** There is no tap automation; every tap flow is tests-only, and the screenshots use `-devActions` and replay copies.
- **The Arabic wording and your real darija sentences.** Every card text, the claim sentences and the recipe sentences are mine, `reviewed: false`; the student's own words cannot be read by the engine in v1.
- **A real 360 pt screen** (the wrapper is a clamp on the 390 pt simulator); VoiceOver reading order of cards, chips and the skeleton.
- **The values in section 8 whose context I cannot see** (`12 vs 9`, `3x1`, `4x3`, `3 of 4`).
- **`repairComponent` validation** in the loader (read, not run), the `SlotsPattern` ball-face extension, and whether `gates.test.ts` loads question 1.
- **False-label rate on real students**, and whether five generic role chips are understood by a struggling student.
- **Test status:** I ran no test; `npm run check` was not run.
- **Legal:** minors' free text (the recipe note) needs the legal review (rule 8).

### 11.2 Questions, each with my default

1. **Unit of "interaction".** Acts (reducer actions; a line is 1) or taps? *Default: acts. Fast path = 8 acts (plan 1, read 1, five lines, recipe 1); 13 to 15 taps.*
2. **Pictures before the first line.** Remove `urn`, `s2`, `compare` and `s3` from the main path? *Default: yes; the statement card and the read tap replace them; `compare` stays in `dd_count_draws`.*
3. **Plan-help example urn 3 red 5 black.** It shows 30 and 15, which are Q1's known wrong total (3 x 10) and Q1's black part. *Default: use 3R5B for plan help only (your example), with an explicit allowance of those two numbers, and apply the role-aware guard everywhere else.*
4. **"3 of 4".** I read it as k = n - 1 (4 balls, 3 drawn, 4 groups = 4 balls). It rejects the existing twin `alt-1-s4-boxes`. *Default: keep that twin (accepted earlier); the guard applies to the cold generator and to new twins.*
5. **Bare numbers.** *Default: credited as `unexplained`, kept out of the sheet and the skeleton; a combine line without reason triggers the list check.*
6. **Paper step.** *Default: no act of its own; the recipe screen shows the finished skeleton with a line "write it on your real paper".*
7. **Role design.** *Default: C (the five role chips are the submit buttons).*
8. **Readback.** *Default: R-B (confirm only on ambiguity).*
9. **Secrets.** `src/config/llmLocal.generated.ts` (gitignored) holds real OpenAI and Anthropic keys in plaintext, and one of my readers printed that file into this session's transcript. *Default: treat both keys as exposed if this transcript is stored or shared and rotate them; the debug build also calls the live model unless `-devLlm off` is passed, which every command here does.*
10. **Your real values.** Is `12 vs 9` a list check (your list had 9, the engine 12)? Is `3x1` the red part of 3R5B? *Default: as read in section 8; wrong readings only change test data.*
11. **Cold test position.** *Default: after the recipe of each question (Q3 needs its own template); one attempt, no help, a review afterwards.*
12. **The free-text note.** *Default: stored locally in "My methods" only, never in events, exports, reports or prompts.*
13. **Findings durability.** The event store keeps about 2000 events or 90 days. *Default: the in-lesson sheet reads the session log; "My methods" has its own record; a finished question's sheet is not reopenable in v1.*
14. **Teacher review.** *Default: all new Arabic is `reviewed: false`; the D41 table lists each string, where it appears and what it must not reveal.*

---

## Verification (when built)

1. `npm run check` (lint, typecheck, Jest) and `npm run check:release-dev` after each module; `npm run check:release-key` once per phase.
2. Scripted students (fast path, each slip, each repair, the cap) assert the budgets of section 5 and the replay-equals-live property.
3. `node tools/screens/capture.js` / `diff.js` as in section 7.3; the 19-screen sanity set after every phase, the 98-screen pass at the end of Phase 3.
4. The leak tests (section 4.4) run over every authored string and every mutation message of every node.
5. Hand play by you at the three stops; I write down what I could not tap.
