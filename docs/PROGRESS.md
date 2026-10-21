# Progress

## Phases 0, 1a, 1b: done on iOS (2026-10-15; Android deferred)
Strict TS/lint/Jest, i18n, `RichText` runs, `MathBlock`; exact-fraction engine, safe parser, zod schemas; pure lesson reducer + replay, event log, feed UI; Ex 2 Q1b from JSON. D1–D4 still Proposed. Open: device hand-test (long-press vs selection, keyboard), events in memory only (D2), feed not virtualized.

## Phase 2: probability components (2026-10-17)
Urn, OutcomeSpace, EventPicker, ComplementView, LawBuilder, LawChart in `src/components/probability/`: zod props, interactive/readonly/replay modes, `getStateSnapshot()`, diagnostic events. `registry.ts` (no React) + `ComponentHost` (validate, fallback + `component_error`, error boundary, Profiler). Task components (EventPicker, LawBuilder) are question cards with the hint ladder; result = `answer {kind:'task'}`. Taps go to the log only (tested: 1 tap = 1 chip render, 0 feed renders). Loader validates every spec against the engine. Deviations: `answer.kind 'task'`, host props `snapshot/showSolution/lessonState`, tap-to-assign (no drag), no `urn: number[]` shorthand.

## Phase 2 cleanup, step 1 (2026-10-17): done
**Built:**
- Deep dive keeps state: the re-asked card starts from the paused card's `getStateSnapshot()` (`lesson/feed/cardMemory.ts`; outcomes, LawBuilder cells, keypad text).
- Keypad kinds: `integer` (digits), `signed` (+ minus), `probability` (+ `/` `,`). Default from the answer's engine call (`keypadFor`). The loader rejects known wrong answers that can't be typed. Compact layout + ▾ fold.
- 2.a: an empty progressive law table appears after "values of X". Each solved picker appends an updated copy (older copies shrink to one line). Typed sum question (`lawSum`). The full-table LawBuilder is optional practice (`optional`, skip with a reason).
- Events: `contentVersion` on every event; `skip {reason}`; `shown` per component; `cell_filled_by_lesson {source: solved|revealed}` (revealed is never a correct answer). Documented in DATA.md.
- Ask chips fold while a keypad card is active. Dev tabs and the event log sit behind `src/app/devFlags.ts` (2 s press on the lesson title in debug builds; README).
- Proba tab: `component_error Urn invalid_props` was intentional (fallback test, `k: 9`), now labelled "(expected)".
**Measured (iPhone 17 Pro simulator, 2.a count question):** integer keypad 144 pt (was about 300). Card 274 pt, picture 234 pt, feed viewport 667 pt: from picture top to card bottom is 508 pt, so all visible together. The probability keypad (one more row) is 194 pt by layout math, not measured on screen.
**AMENDMENTS A gaps left (not needed by Phase 3):** Report button + queue; component snapshot attached to ask/long-press; per-block trust labels.
**Covered only by unit tests (not hand-tested):** state restore after a deep dive; keypad fold; chips fold/unfold; skip flow; progressive fills incl. revealed cells; dev-flag reveal; every tap flow on the simulator (no tap automation, only the first screen was looked at). Android: nothing measured (no device).
**Open:** after a skip there is no "come back to the practice" button. All new Arabic is `reviewed: false`.
**Run:** `npm run check` (249 tests + 15 todo). App: `npm start`, `npm run ios`.

## Phase 2 cleanup, step 2: theme refactor (2026-10-17): done
**Built:** `src/theme/` (`palette.ts` internal raw values; `tokens.ts` semantic tokens: color, feedback, dataSeries, space, radius, border, font, opacity, shadow (empty slot), size, offset, chart, katex; `index.ts` exports `theme`). Every file reads `theme.*`; `lesson/feed/theme.ts` removed. Guard `__tests__/themeHygiene.test.js` fails on color literals or numeric style values outside `src/theme`; it self-tests its patterns; `NativeMath.tsx` is allowed by name (typesetting ratios, commented). No behavior change; no test edited.
**Verified:** before/after simulator screenshots, 15 shots (lesson 2.a and 1.b, Composants, Proba, Bidi at offsets 0/700/1400): all pixel-identical (status bar rows excluded). Baseline was shown deterministic first (two before runs identical). Temporary capture harness deleted; nothing references it.
**Not covered by screenshots:** tapped states (selected or extra chips in the lesson, open LongPressMenu sheet, probability keypad in a lesson card, revealed or skipped cards, progressive table with ✓/◆ cells, ask chips unfolded, deep-dive indent rail, KaTeX renderer, Bidi sub-tabs). Values kept exact, but not visually checked.
**Guard limit:** numbers inside named constants are not detected (none left in style code).

## Phase 3: student state, rules planner, replay harness (2026-10-17)
**Built:**
- `src/state/`: `deriveState` (pure over events; SkillState + kind, helped/revealed/skipped/transferFail, representationsTried/Helped, misconceptions, nextReviewAt; writing habits apart), `catalog.ts` (stepId -> skills per contentVersion; unknown versions are never attached), `config.ts` (every threshold, marked untuned).
- `src/content/skillMap.json` + `skills.ts`: prerequisite map for Ex 2 and the Ex 4 checkpoints, math vs writing skills, cycle check, reviewed: false.
- Content (ex2-0.4.0): 28 variants (11 alternatives, 5 transfer, 6 simpler twins, 6 prerequisites), numeric check on 1b/s8, repair components added to 5 misconceptions (11 of 13 now have one), misconception `category`. Fixes: 2a/s13 skill `complement` -> `complement-event`; the au_moins_contraire mini also trains `au-moins-un`; `\Omega` is not in the native renderer (used `\text{univers}`).
- `src/planner/`: `situation.ts` (compact, event-derived, ids/numbers only; free text only in `request.text`, enforced by a test), `rules.ts` (27 rule ids, all tested), `planner.ts` (one `Planner` interface, menu, validation: unknown components / variants / deep dives rejected -> fallback). Schema: new actions (deep_dive, variant, numeric_check, self_report, teacher_note, continue), `ruleId`, `Decision`, triggers.
- Lesson: reducer sets `pending`, `apply_plan` applies validated decisions (`plan` event); variants as detours (own urn, header, re-ask after); cards (clarify, self-report, compress, repair, teacher note); compress mode; `request` buttons "غيّر الطريقة" / "حاجة أسهل" on main and variant cards; "back to the question" button when scrolled away (`isAway`); teacher-note queue (`src/telemetry/notes.ts`, ids only, in memory like events). Deep dives now emit `shown` when they open.
- Events: `plan`, `request`, `clarify`, `offer_response`, `teacher_note`; `Variant shown/closed`, `DeepDive shown`.
- `tools/replay` (+ `npm run replay`): current-format reader, legacy converter with an unknowns sidecar, decision table, labels format, agreement. `docs/samples/legacy_step_map.json` (GUESS), `ex2_session_1.converted.jsonl`, `ex2_session_1.labels.json` (TRANSCRIBED from the expected table, not teacher labels).
**Audit facts (Step 0):** all six PROGRESS facts hold in code. Nothing treated a mini question as a transfer in code or tests; the only place was the old log (`transfer_ok`), handled in the converter.
**Replay on the converted session (before the follow-up):** 23 decision points; agreement with the transcribed labels 5/13 (rows 1a, 4, 5b, 8a, 8b). Missed: 1b (self-report vs compress at the same point), 2a/5a/7 (first "not sure" opens the text deep dive), 2b (self-report comes before the transfer; replay cannot answer it), 3 and 6 (first wrong: authored feedback only, the old log has no value or misconception), 9 (q7 -> 2a/s15 is a guess; s15 has no deep dive, so a hint).
**Tests changed (no assertion weakened):** see the Phase 3 report; `lesson.test.ts` harness now runs the rules planner (`stepSync`) and replays through the reducer with logged plans.
**Checked on the simulator (iPhone 17 Pro, iOS 26.5):** the new bundle loads and 2.a renders. Nothing else was tapped (no tap automation installed). Covered only by unit/screen tests: every card, both buttons, variants with their own urn, compress, jump button, numeric check.
**Untested on real data:** every rule except what the one converted session reaches; timing rules (no durations in any log); writing habits (no Ex 2 writing misconception); "closed" (needs two sessions); teacher notes; compress acceptance.
**Run:** `npm run check` (348 tests + 15 todo), `npm run replay -- agree docs/samples/ex2_session_1.converted.jsonl docs/samples/ex2_session_1.labels.json`.

## Phase 3 follow-up (2026-10-17): done
**Built:** self-report "موش توّا" (dismissed: no evidence, no transfer that time) + per-session cap (2); compress needs a stronger signal (a typed / task answer in the streak, or "understood"); interactive deep dives (one component max, own urn, task minis with hint ladder and reveal, "did not help" = revealed or 2 wrong tries, `text+<Component>` representation, loader limits) applied to `au_moins_contraire` (ComplementView) and `pairs_listing` (OutcomeSpace, 3-ball urn; mini now asks 3, not 10); end-to-end "not sure" test; legacy map guessed kind (in1 typed); expected table + labels updated to ex2-0.5.0 and the product owner's decisions; guards: no two modules with one base name (the Metro `.json` before `.ts` crash), no UI reads skill status.
**Bug fixed before this step:** `src/content/skills.json` next to `skills.ts`: Metro resolved the JSON (crash on any planner decision in the app; Jest resolved the TS, so tests passed). Renamed to `skillMap.json`.
**Replay (12 labelled points after relabelling):** 10/12 agree with the guessed in1 kind, 9/12 without (1 partial: row 7, product_zero still text only; 1 disagree: row 9, guessed q7 -> s15 map, s15 has no deep dive). Most of the rise from 5/13 comes from relabelling to the brief (rows 2b, 3, 6) and removing one row-1 point, not from better rules; rows 2a and 5a agree because those deep dives are now interactive (content), row 1 only with the guessed kind.
**Checked on the simulator:** nothing new (no tap automation). Covered only by tests: the dismiss button, the session cap, compress signal, both interactive deep dives, task minis (synthetic content only: no task mini is authored).
**Run:** `npm run check` (367 tests + 15 todo).

## Phase 4, transport and live check (2026-10-17): in progress
**Built:** raw-fetch OpenAI transport (`src/planner/llm/openai.ts`; the official `openai` SDK states React Native is not supported, and it is removed from the project): `POST /responses`, `store: false`, strict `text.format`, no retries, host allowlist (`src/config/llm.ts`), error classes incl. `auth`, `no_credit`, `spend_limit`, `refused`, `incomplete`, `invalid`, `config`; only allowlisted `error.code`/`error.type` and numeric rate-limit headers are read (`providerErrors.ts`, sources cited there). zod -> strict JSON Schema converter + `denull` (`strictSchema.ts`), LLM planner output schema with full and skill-filtered variants (`plannerFormat.ts`), pinned models with sources and shutdown dates (`models.ts`). Key from gitignored `.env.llm.local` via `tools/llm-config/gen.js`; Jest uses a stub.
**Live check (iPhone 17 Pro simulator, Hermes, one run, $0.01 cap, no retries; second key):**

| Call | Result | Latency | Input tokens (cached) | Output |
|---|---|---|---|---|
| model check gpt-4o-2024-08-06 / gpt-6-luna / gpt-6.1-sol | all exist on the account | | | |
| tiny, gpt-6-luna | ok, zod valid | 975 ms | 64 (0) | 16 |
| tiny, gpt-4o-2024-08-06 | `no_credit` 429 (`credit_balance_exhausted` / `insufficient_quota`) | 6252 ms | | |
| tiny, gpt-6.1-sol | `no_credit` 429 (same codes) | 1029 ms | | |
| planner full schema (4 components, 26,420 B), luna, 1st / 2nd | ok, zod valid | 2990 / 2757 ms | 4329 (0) / 4329 (4326) | 60 |
| planner filtered (ComplementView, 14,328 B), luna, 1st / 2nd | ok, zod valid | 1734 / 1881 ms | 2404 (0) / 2404 (2401) | 60 |

Spend counted by the cap: $0.0054 (failed calls at worst case; luna calls alone ~$0.0009 at list price). gpt-4o and gpt-6.1-sol were not retried (product owner: no credit until next month). The first run with the previous key (same day) got 429 on every call. One run only: latency is not a measurement.
gpt-4o-2024-08-06 shuts down 2027-01-14 (deprecations page).
The temporary live-check harness (`src/app/llmSpike.ts`) is deleted; the transport stays complete in `src/planner/llm/`.

## Phase 4 Step 0: reports, snapshots, trust labels, consent note (2026-10-17): done
**Built:** `src/storage/` (MMKV behind `KeyValueStore`); `src/telemetry/reports.ts` (`LocalQueue`: reports and tutor questions, persisted, capped at 300, JSONL export, events attached without free text); `BlockActions` + `ReportSheet` (visible Report on AI blocks and the active question, "⋯" menu elsewhere, 5 reasons + optional text, thanks line; `report` event + queue entry with device, last 20 events, component snapshot and spec); `SnapshotRegistry` (component and card handles; ask and long-press send `components` in the `ask` snapshot, capped at 2,048 chars, valid JSON); `FeedItem.trust` (engine values: numeric check, revealed answer, filled law cells; LLM blocks: ai_generated); dev-only export button; `npm run replay -- reports <file>`; `docs/PILOT_CONSENT.md` (draft, cited); DECISIONS D10–D14 and the D2 proposal.
**Checked on the simulator (iPhone 17 Pro):** app builds and starts with MMKV + Nitro; 2.a first screen shows the "⋯" gutter on every lesson block (screenshot). Nothing tapped (no tap automation).
**Covered only by tests:** the sheet (menu, reasons, send, thanks, cancel), visible Report on the active question, report event + queue entry, snapshot on report and ask (2.a EventPicker), queue persistence and caps, export round trip, Share sheet (not opened on the simulator), key never in report exports.
**Arabic:** all new strings `reviewed: false` (report sheet, trust labels, "تصدير").

## Phase 4 Steps 1–3: client, runtime, planner pipeline, tutor drawer (2026-10-17): done
**Built:**
- Step 1: `PlannerClient` (`src/planner/llm/plannerClient.ts`) taking context packs: `DirectClient` (prompt + OpenAI transport), `ProxyClient` (contract only), `FakeClient` (scripted answers, same zod validation, honours timeout / abort). Context packs (`contextPack.ts`): static part (statement, verified solution, menu; about 4.5 KB, identical across calls) then dynamic (situation, constraints, student text cleaned and capped, in one field only). Prompts with `PROMPT_VERSION`.
- Step 2: `LLM_CONFIG` (D15); LLM on whenever a key is present, rules-only silently without one; `LlmRuntime` (daily cap in MMKV, local kill switch, startup model check, status); `llm_call` events; dev-only status line (mode and why, last outcome, cap; tap = kill switch).
- Step 3: output guard (D16) with 18 hand-written fixtures (`npm run replay -- guard`: 7 valid all accepted, 11 invalid all rejected, reasons listed); provisional rules then LLM in `useLesson` (D6 update): "…" marker, swap only without action or scroll, `shownSource` on `plan`; AI feed blocks labelled `ai_generated` with `llmRequestId` for reports; tutor drawer (D17): verified chip answers, engine-checked AI blocks with Report button and "ممكن فيه غلط", otherwise saved to the queue with "سؤالك تسجّل.".
- Docs: DECISIONS D6 update, D15–D19, op-sqlite status (D2 follow-up); PILOT_CONSENT.md (no gate, backlog items, Anthropic terms for comparison); DATA.md events.
**Checked on the simulator (iPhone 17 Pro):** the app starts with the key present (LLM on), no errors in the React log, no key in it; gutter before / after / alternative screenshots (D18). Nothing tapped.
**Covered only by tests (FakeClient or mocked fetch):** every provisional-flow path (swap, act first, scroll first, rejected, provider error, timeout, kill switch, cap), the dev status line, the tutor drawer (AI blocks, caution mark, report from the drawer with the request id, failure -> saved), math verification, guard rejection rate, proxy client contract, model check at startup. **No live planner or tutor call has run inside the app** (the only live calls are the transport live check above); no tap automation.
**Run:** `npm run check` (42 suites), `npm run replay -- guard`, `npm run replay -- reports <file>`.

## Phase 4 follow-up: live in-app check, guard fixes, event store (2026-10-17)
**Built:** guard fixes (D16: shown values, task-component answers, 24 fixtures); debug scenario runner + raw output dev panel (D20, verified absent from a release bundle); LLM run spacing fix (`spaceRunBoundaries`: models write «كلمةau moins uneتعني» without spaces); MMKV event store behind an interface (D2), dev line with stored-event stats; cost cap persisted per day.
**Live in-app check (iPhone 17 Pro simulator, gpt-6-luna):** planner 2.7 s, passed the guard, swapped in (`shownSource: llm`, a level-1 hint); tutor 2.0 s, 1 text block, passed. Across all real outputs received in the app today: **9 of 9 passed** the guard / tutor checks (2 planner, 7 tutor), 0 rejected; 9 other calls failed before any output (4 planner timeouts at 3.5 s, 5 rate-limited during parallel re-runs). Raw outputs read: the tutor's Arabic **paraphrased the active question's answer** (D16 still open). Cost: see the D20 incident.
**Checked on the simulator:** the two live calls, the drawer with an AI block, label and Report button, the raw panel, event persistence across relaunch, the event-store benchmark. **Tests only:** the cost-cap ledger, the run-once guard, the event store's cap and damaged-data handling, the spacing fix (seen broken in the live run, fix not yet seen live).

## Phase 4 decisions round (2026-10-17): done
**Built:** D21 release builds blank the key (Metro resolver; `INCLUDE_KEY_IN_RELEASE=1` opt-in with a loud warning; `npm run check:release-key`); answer-leak fix A (the model gets only the solution so far, prompt `p2`); stored history feeds the student state across sessions; dev event export (JSONL for `replay -- table`); 90-day retention; D19 feedback card. Kept: persisted scenario spend ledger, run-once guard. Prettier only on files created or changed in this round.
**Checked for real (outside unit tests):** default Release bundle has no key-shaped string, opt-in bundle has the sentinel and prints the warning (two real `react-native bundle` runs); the app starts on the simulator with the changes (no errors in the React log, stored events visible on the dev line, no LLM call).
**Covered only by tests:** fix A (pack contents at 1.b/s3, s5, s8, 2.a/s10, tutor pack), cross-session planner change (pure and screen tests), retention, event export (Share mocked), the feedback card (end-to-end screen test). Not re-measured live: fix A and the run spacing (no live call this round). Not seen on the simulator: the feedback card, history across sessions on screen (needs taps).
**Run:** `npm run check` (51 suites, 500 tests), `npm run check:release-key`.

## Phase 5: analysis engine, components, Exercise 4 A1-A3 (2026-10-18 to 2026-10-20): in progress
**Built so far:**
- Engine: `src/engine/analysis.ts` (function registry incl. `f_ex4` and the non-even `sigmoid_demo`; numeric derivative, Simpson integral, `limitProbe`, `signChange`, `toRational`, `equivalentExpressions`, `matchesFn`); `src/engine/expression/structure.ts` (`toLatex`, `splitFraction`, `locateDifference`, `missingParentheses`, `canonical` / `sameForm`); `src/engine/examples.ts` (generated examples `quotient_linear`, `parity_exp`). No parity function yet.
- Generic primitives (`src/components/shared/`): PredictReveal, StepThrough, CompareTwo, NumericTwin, ExampleGenerator.
- 7 analysis components (`src/components/analysis/`): FunctionPlot, PointOnCurve, FoldSymmetry, LimitExplorer, SecantToTangent, TangentSlope, VariationTableBuilder, on shared PlotCanvas, Slider, MathReadout, VariationGrid, Expandable. Compact mode (collapsed 236-240 pt, tap to expand full screen) for PointOnCurve, LimitExplorer, SecantToTangent, TangentSlope.
- Line-by-line editor (`src/lesson/lines/`): structured `MathEditor` (keys only: x, e, fraction, power, group, digits, operators; no free text, no eval) and `checkLine`: each line compared by the engine with the previous accepted line; the goal form ends the step; a first line already in the goal form is accepted but flagged `jumped_to_goal`; a wrong line names the part (numerator / denominator) with the student's own value at x = 1; missing denominator parentheses detected; known wrong lines map to misconceptions; unparsable lines are logged, not counted as answers. Lesson step `kind: "lines"` (LinesCard: goal + start line, notebook, ▾ key fold, snapshot, readonly); hint ladder of 3, reveal (goal written in full) only at its end.
- A1 content (`bac2022c-ex4.json`, `ex4-0.1.0`, all `reviewed: false`): 10 steps in 4 groups (domain choice; PredictReveal with PointOnCurve vs sigmoid; f(-x) simplified line by line; conclusion choice), French write-up model, ask chips. Detours: 2 deep dives (`exp_product` with one interactive component, `parity_meaning`), 9 variants (3 alternatives: NumericTwin, worked example, FoldSymmetry; 1 transfer; 2 simpler twins as lines steps; 3 prerequisites). The loader checks every lines expression against the engine (start / goal are the registry function, known-wrong lines really are wrong). The conclusion's correct option (`paire`) is hand-picked.
- Misconception library (`bac2022c-ex4.misconceptions.json`, 17 entries): the 8 seen while prototyping + `sign_arrow_mismatch`, `extremum_without_sign_change`, `distribution_partial`, `domain_symmetry_meaning`, `domain_check_skipped`, `parity_odd_even_confusion`, `conclusion_missing`, `complex_fraction_gap`, `exp_negative_sign`. Every skill tag is in `skillMap.json` (test).
- Lesson screen: an A1 tab next to 1.b / 2.a (temporary switch, visible to everyone). Debug-only launch arguments `-devTab`, `-devComponent X[#n]`, `-devScroll y`, `-devPart A1` (absent from release bundles). The A1 question text is our own Arabic, not the exam wording; the statement omits "(O, i, j)".
**Checked on the simulator (iPhone 17 Pro, screenshots via launch arguments, nothing tapped):** A1 lesson first screen; each component's demo cases (the 4 collapsed forms, FoldSymmetry, FunctionPlot variants, TangentSlope expanded table layout, VariationTableBuilder, StepThrough, CompareTwo); lines editor demo states (empty, one accepted line, denominator error, keys folded, long line). Shots in `docs/screens/phase5/` (gitignored).
**Covered only by tests:** every A1 tap / typing flow in the lesson (main path to the write-up, wrong line with its misconception, jump to the goal, reveal at the end of the ladder, unparsable line); all A1 detours (deep dive on "not sure", "easier", representation change after two wrong lines, simpler twin, change method); compact expand; component events. **A1 has not been played by hand.**
**Not started:** A2, A3 content; exercise picker; an Exercise 4 replay fixture.
**Run:** `npm run check` (64 suites, 673 tests + 11 todo, 2026-10-20).
**Round 2026-10-20 (product owner's order):**
- Exam wording: the statement now ends with "(O, i⃗, j⃗)" (transcribed by the product owner, to verify against the PDF); A1's goal was already the exam's « Montrer que f est paire. »; A2 / A3 wording recorded in EX4_ANALYSIS.md for when they are authored.
- Engine `parity(fnId)`: compares f(-x) with f(x) and -f(x) at x = 0.001 ... 60 (and their negatives), inside the safe range, excluded points skipped, at least 3 samples. New answer type `{type: "parity", fn}`; options tagged `parity: even|odd|neither`; the loader picks the one option matching the engine (A1/s9 and its FoldSymmetry alternative). The deep-dive mini (a definition question, not about f) stays hand-picked.
- Exercise picker (`src/app/exercises.ts`, `ExercisePicker.tsx`): the app opens on one card per exercise (Arabic and French title, draft badge, part buttons, all from the JSON; error card if one fails to load). In a lesson: "رجوع للتمارين" (logged `component_event LessonHeader back_to_picker`) and the part label. The part switch (now across both exercises) and the dev reveal long-press (also on the picker title) are behind the dev flag. New Arabic strings `picker.title`, `picker.back`: reviewed: false.
- **Checked on the simulator (iPhone 17 Pro, screenshots, nothing tapped):** normal launch shows the picker (2 cards, parts 1.b 2.a / A.1); `-devPart A1` opens A1 with the new statement (vector arrows render) and the back button. **Tests only:** open a part, back, unknown part, dev switch across exercises, error card, parity-derived options.
- `npm run check`: 65 suites, 685 tests + 11 todo.
**Known issue, left as is:** Jest prints "A worker process has failed to exit gracefully" when a LessonScreen suite shares a run with two or more other suites. Absent on commit 9e5ee96 (31 suites, two runs); not reproduced in band or with `--detectOpenHandles`. Source: the Phase 4 lesson/LLM wiring (uncommitted Phase 4 work), not Phase 5 code. All suites pass.
**Deferred:** AreaUnderCurve (stack), listed for A1 in EX4_ANALYSIS.md, moves to the Part B phase (product owner, 2026-10-18).

## Phase 5, A1 hand-play feedback, Group 1: line editor (2026-10-20)
**Built:**
- Exponent rule (`src/lesson/lines/editor.ts`): + and × and the fraction key leave the exponent first; − stays only at its start (e^{−x}); digits, letters, power, parentheses stay; → always leaves it. Fraction key wraps the term left of the cursor (back to the last + or − of the slot) as the numerator, cursor in the denominator; nothing there = empty fraction. New ")" key (shown with the parentheses key) leaves the nearest group. Consequence: a fraction inside an exponent can no longer be typed (not needed in A1-A3).
- Active slot tinted (`editor.color.activeSlotBackground`); editor symbols in the math font, letters italic.
- Unreadable lines: `diagnose` (empty slot, two signs in a row, sign at the start (− allowed) or end, power on nothing; stricter than the parser: "x++1", "2×−x"), `deserialize` so the reducer checks the same tree; verdict `unreadable` with a specific message and the spot marked; not graded, logged `invalid_input { reason }`; the warning clears on the next key. ✓ stays enabled and warns (no disable). Missing parentheses cannot happen (groups are paired).
- Ask chips fold while a lines step is active. NumericTwin: "=" for exact values, only "≈" otherwise. ✓ label: arrows and ⌫ fixed size, label one line (shrinks to 0.8 at most).
- Press counts (tests, no arrows): e^{−x}·e^{2x} over (1+e^{−2x})·e^{2x} 24; e^{x}/(1+e^{2x}) 10; (1+e^{−2x})·e^{2x} 14; plus the garbled case.
- New Arabic strings (`lines.issue.*`, `lines.key.close`) reviewed: false.
**Checked on the simulator (iPhone 17 Pro, demo cases, nothing tapped):** active exponent tint and italic letters; unreadable line with message and marked ×; ✓ label on one line in a 280 pt card (clipping reproduced before the fix at that width). **Tests only:** every key rule and press count, deserialize round trip, reducer logging, chip fold in A1, the "≈" readout.
**Seen, not fixed (ask):** at 280 pt the key grid (6 keys per row, 44 pt minimum) is wider than the card.
**Run:** `npm run check` (65 suites, 711 tests + 11 todo).

## Phase 5, Editor v2 Phase 1 (2026-10-21)
**Built (rules in docs/EDITOR.md):** layout [← ↑ ↓ → ⌫] / [↶ ↷ وسّع ▾] / [✓] / symbol rows (as many 44 pt keys per row as the measured width holds, 2 pt gaps: A1 = 5 rows at 280 and 323 pt); ↑ ↓ (innermost structure wins; numerator ↔ denominator lands at the end of the other slot); italic math-font x and e on keys and in the line, × / + / − with space; tap on a symbol = cursor right after it (glyph + 3 pt left/right, 8 pt above/below); undo / redo (50 states, edits only, kept out of the snapshot); widen (atom → term → slot → enclosing structure) with fraction and "( )" wrapping, ⌫ deletes a selection, other keys end it and act after it; the wrapped part is outlined 0.8 s, or until the next key with reduce motion. The "تحديد" mode is not built (decision after the replay). New tokens: `editor.keyGap`, `operatorSpace`, `tapSlop`, `flashMs`, `color.selection` (palette `brand100`). New Arabic key labels reviewed: false.
**Press counts (regression):** 24 / 10 / 14, unchanged. No existing test changed.
**Checked on the simulator (demo cases at 323 and 280 pt via a temporary width wrapper, nothing tapped):** layout and row count, italic x vs spaced ×, widen selection tint, undo / redo disabled when empty. **Tests only:** every key rule, wrapping, ↑ ↓ in nested cases, undo / redo and the cap, the flash timing and reduce motion, tap on a symbol.
**Run:** `npm run check` (65 suites, 731 tests + 11 todo).

## Phase 5, Editor v2 Phase 1b: getting back after a wrap (2026-10-21)
**Reproduced first** (1+x+, widen, fraction): widen selected the lone trailing "+" (bug), the wrap made "+" the numerator; ⌫ in the empty denominator stepped into the numerator, the next ⌫ deleted the "+", the third removed the empty fraction (content lost). Undo (unlabelled ↶, second row) did restore the exact pre-wrap state, selection included.
**Built (docs/EDITOR.md):** ⌫ deletes one piece (a power, group or fraction is one piece); at the start of a filled slot it steps out to the left; in an empty slot it dissolves the structure and keeps the rest (numerator back inline, cursor at its end; empty parentheses / exponent removed, base kept). Widen skips a lone sign (takes the operand before it). After any structural change, a chip above the field's end ("تزاد كسر · تراجع", 4 s, goes with the next key; tap = undo). Undo key named "↶ تراجع" (double width in the tools row). Undo / redo restore without the one-time markers (no stale chip or outline).
**Test changed (reason):** "backspace after a filled composite steps into it" -> "deletes it as one piece" (rule 2 replaces that behaviour). Press counts 24 / 10 / 14 unchanged.
**Checked on the simulator (demo case at 280 pt, nothing tapped):** the chip above the field, gone by about 4 s; the named undo key fits. **Tests only:** every ⌫ rule, the hand-test sequence, chip tap = exact pre-wrap state (cursor and selection), chip timing, widen sign skip.
**Run:** `npm run check` (65 suites, 744 tests + 11 todo).

## Phase 5, A1 hand-play feedback, Groups 2-4 (2026-10-21)
**Group 2 (feed flow):** PredictReveal is a gate (registry `gate: ['predicted','revealed']`): the reducer stops after it until one tap (`gate_passed`, ungraded; replay maps the logged tap back). Audit test: every main-path visual that asks something is a gate; only A1/s4 asks (Exercise 2's visuals illustrate; its asking steps were already cards). The "same height" verdict was not visible before the tap in the main path (test pins it). "Back to the question": shown only after 2 s off-screen (`feed.jumpDelayMs`), small, bottom-left over the gutter.
**Group 3 (direction):** measured 8 variants on iOS: isolated runs were already LTR; the leak was plain strings (long-press quote, student text): `isolateInline` at display. LRM marks added inside each isolate. Loader refuses math signs (− ∈ ℝ × ⇒ superscripts…) inside Arabic runs; same guard on Arabic UI strings (one allowed shape cue). DECISIONS D3 update.
**Group 4 (help):** planner `helpTargets`; buttons shown only with an authored answer; "change method" never a hint; "easier" never answers first with the teacher note. Each misconception's message once per card (the generic text came from a second, different mistake). Audit in `docs/exercises/EX4_A1_AUDIT.md`; authored for A1/s3: deep dive `domain_symmetric`, alternative `alt-A1-s3-values` (NumericTwin, negative values), simpler twin `sim-A1-s3-int-1` (all reviewed: false).
**Tests changed (reasons):** A1 helpers pass the gate (4 screen tests tap a prediction; session helper sends `gate_passed`); `toSegments` and Bidi screen assertions include the LRMs; rules test "change method with nothing left: a hint" -> "never a hint".
**Checked on the simulator (nothing tapped):** A1 first screen; bidi probe (8 variants); quote bubble with an A1 sentence (demo); dev LLM line. **Tests only:** the gate and its replay, jump delay, long-press quote isolation, help visibility and request answers, misconception messages, new s3 content flows.
**Run:** `npm run check` (67 suites, 764 tests + 11 todo).

## Phase 5, editor: copy the previous line (2026-10-21)
**Built (docs/EDITOR.md):** «⧉ نسخ السطر السابق» inside the empty field: copies the last accepted line or the start expression (no "f(−x) =" label) as editable math (`fromExpression`: parser tree -> editor nodes), cursor at the end, undoable, logged `line_copied`. A line written exactly like the previous one (term order counts; redundant parentheses do not) is `unchanged`: «هذا نفس السطر، بدّل حاجة.», logged `unchanged_line`, not an answer, not wrong, not a hint. Presses: line 1 16 with copy (24 without), line 2 19 with copy (10 without); line 3 is line 1's denominator (no copy case).
**Reported, not changed:** a selection ending with a sign becomes a numerator with a dangling sign; the fraction key after a denominator's content makes a nested fraction (its empty denominator is the "slot below"). Proposals in docs/EDITOR.md. Redesign backlog recorded there.
**Checked on the simulator:** the copy button in the empty field (demo, 360 pt). **Tests only:** copy content and cursor, undo, logging, the unchanged verdict (lesson and card), press counts. No existing test changed.
**Run:** `npm run check` (67 suites, 772 tests + 11 todo).

## Phase 5, editor decisions (2026-10-21)
Signs stay outside a wrap (trailing sign, leading + or ×; leading − inside); widen stops before a trailing sign; the fraction key keeps wrapping in a denominator (nested fractions typable, 12 presses for (1/x)/(1+1/x²)). Tests only (model and card); `npm run check` green.

## Design pass D0-D1 (2026-10-21), before A2/A3 (product owner)
**DESIGN.md:** written from the brief and docs/design (Proposed), with the product owner's three edits (§6 flat paper first, hint label wording, prediction cards stay one tap).
**D0, tokens and fonts:**
- Cahier colour roles, radius (button / chip / tag / sheetTop), `border.line` / `active`, text roles (`font.screenTitle`, `header`, `body`, `small`, `paper`), `font.family`, `font.style`, `layout.gutter` / `grid`, `size.progressBar`. Existing font literals (Courier, Times New Roman, italic) were moved to tokens with the same values.
- Fonts in `assets/fonts/`, official google/fonts files only: Tajawal 400/500/700/800, STIX Two Text (variable, roman + italic), each with its OFL.txt. Registered through an Xcode folder reference and `UIAppFonts`, no npm package.
- Licence: both are SIL OFL 1.1. Use, bundling and redistribution are allowed. Conditions: the copyright notice and licence must go with every copy (OFL.txt is copied into the app, and the licence is also embedded in each file), the fonts cannot be sold on their own, and a modified version cannot use a Reserved Font Name (STIX: «TM Math»). Tajawal's metadata copyright string says "All rights reserved", but its OFL.txt and google/fonts list it as OFL.
- Measured on iOS: Tajawal resolves by PostScript name. STIX resolves only by family name «STIX Two Text» plus italic / weight (its variable instances have no PostScript names, so «STIXTwoText-Italic» showed upright). Tokens follow that.
- Guard: `themeHygiene` now also forbids `fontFamily` not from `theme.`, and literal `fontStyle` / named `fontWeight` (self-tests extended). New `__tests__/fonts.test.ts`: names in the files, files present, plist list, licences.
- **Measured (iPhone 17 Pro simulator, Release build, temporary probe in index.js, removed):**
  - .app size 63,572 → 64,692 KB (+1,120 KB).
  - Launch command to first frame, 10 warm runs each: median 478 ms without fonts, 484 ms with (+6 ms; run-to-run spread about 20 ms). The first run after install: 906 / 557 ms.
  - Cheap Android not measured.
**D1, shell:**
- Dev mode is off at every launch (memory only, as before). It is turned on by `-devMode on` (replaces `-devTools 1`; applied in `App.tsx`), by `-devTab` / `-devComponent`, or by the 2 s title press. `-devPart` opens in normal mode.
- Lesson header (DESIGN.md §3):
  - back «→» at the right (44 pt, a11y «رجوع للتمارين»);
  - title in Tajawal Bold;
  - «مسودّة» draft tag (a11y = the full sentence) and the LTR subtitle «Exercice n · part»;
  - a progress bar under the header (`mainProgress`: main-path steps passed / total, detours not counted, open step not passed).
  In dev mode, a row below the header holds the counters, exports and the part switch. README "Test mode" note.
- New Arabic strings `lesson.draftTag` «مسودّة», `lesson.progress` «التقدّم في السؤال»: reviewed: false.
- The subtitle's «Exercice n» is the French title up to " :" (no exercise-number field in the content yet).
**Tests:** no existing test edited. New: fonts (9), progress (5), header (2), `-devMode on` (1). Hygiene self-test lists extended and the test renamed to include fonts.
**Checked on the simulator (Debug, screenshots in `docs/screens/design/`, nothing tapped):** picker, A1 and 2.a first screens with the new header, `-devMode on` on the picker and in A1, a plain relaunch (dev mode off again). **Tests only:** back button press, title long-press, progress moving on an answer.
**Run:** `npm run check` (70 suites, 796 tests + 11 todo).

## Design pass D2a, up to check-in 1 (2026-10-21)
**Before D2 (product owner):**
- Progress counts only required acting steps: questions, lines, tasks and gates; not explanations, not optional practice. A1 = 4, 1.b = 4, 2.a = 7. The plan said 8 for 2.a: its values-group LawBuilder is the progressive table, a visual. The bar starts at 0.
- DECISIONS D22 (fonts; Android not done; Tajawal metadata note for the legal review).
- D13 / D18 updates (report in the card's "⋯" menu, in-block icon).
**Built:**
- Paper everywhere, status-bar area included. Generic colour roles re-pointed (`textPrimary` ink, `textSecondary` inkMuted, `borderDefault`, `actionPrimary` pen, `overlayScrim` ink scrim): components change colour only, before D3.
- Tajawal in lesson text (16.5 / ≈1.8) and the sheets; STIX for math everywhere (editor included) and for the statement's exam wording.
- Question card: «السؤال» tab and 2 pt pen border; quiet dashed «ما نعرفش» / hint / reveal / skip; one "⋯".
  - The "⋯" is the ReportSheet menu stage with the card's actions: change method / easier (authored only), back in deep dives, trust label, Report keeping `block-report-<key>`.
  - It closes on a tap outside or the back gesture; focus goes back to the card. `CardMenu opened / dismissed` carry `stepKey`.
- In-block "⋯" icon (no gutter); AI blocks keep the visible report and trust line.
- Red-pencil note for wrong answers: the reducer's `warning` tone, view mapping only (testIDs unchanged). Green correct; highlighter hint / info; blue-pen student bubbles; dashed offer cards; AskAnswer without a rail.
- Deep dives / variants as one inset dashed sheet with the start item as its tab. Positions are reported in feed coordinates; new jump test.
- Ask bar on paper with a round pen send button (a11y «ابعث») and quiet chips; same folding.
- Demo: scripted feeds through the real reducer (`feedDemo.tsx`), `-devDemo cardMenu`, `-devScroll` on the Composants tab.
- New i18n `lesson.questionTab` «السؤال» (reviewed: false).
**Tests changed (one extra tap on `card-menu-…`, assertions unchanged):**
- LessonScreen.ex4 "help buttons appear only with an authored answer";
- LessonScreen "can leave a deep dive with back";
- LessonScreen "writes at least one event for every interaction";
- LessonScreen.report "the active question's Report" (renamed: one tap away in the "⋯" menu).
The header progress test (new in D1) moved to acting-step numbers.
**New tests:**
- card menu (tap outside, back gesture, focus, step key);
- a mini card's menu has back but no help requests;
- a done card's menu has trust + Report only;
- a card inside a deep-dive sheet in feed coordinates;
- progress rules on synthetic and real parts.
**Checked on the simulator (screenshots `docs/screens/design/d2a-*`, nothing tapped):** A1 / 2.a / 1.b first screens; the demo's scripted feeds (deep dive, wrong answer, done card); feedback blocks; bubbles; the open card menu; the editor and keypad before their restyle (STIX math). **Tests only:** every tap flow, the menu actions, focus return.
**Run:** `npm run check` (70 suites, 802 tests + 11 todo).

## Design pass: full width, report paths, ask chips, "−x" check (2026-10-21, before D2b)
**Built:**
- Full width: no per-block "⋯", no side room; 16 pt margin on both sides; the deep-dive sheet has no extra inset. The D2b side room is cancelled.
- Report paths (`reportPath`, DESIGN.md §3):
  - tutor long-press menu: trust label + «بلّغ على غلطة» last, set apart (iOS: the report sheet opens after that menu's dismissal);
  - long-press on display blocks (statement, math, feedback, hint, answer, ask answer, write-up, fallback);
  - choice cards on their title;
  - question cards and their tasks in the card "⋯";
  - interactive visuals as «بلّغ على هذا الجزء» rows in the next card's "⋯" (or the last card before them);
  - AI blocks unchanged.
  - Screen readers: a "report" action. Each long-press block is one element labelled with its words; formulas use `spokenMath` (French words, never LaTeX; every content formula checked by a test).
- Ask chips:
  - one line (text with "…"); formula chips two lines (formula on its own LTR line);
  - the open row has a fixed height (40 / 64 pt);
  - collapsed while a question card is on screen, open on tap for that card.
- `-devActions notSure` (debug only), `-devDemo longPressMenu | longPressMenuPlain`; 390 / 360 pt demo sections.
**"x-" (reported):**
- Reproduced in the real lesson (A1 s1) and measured by pixel columns: the minus is drawn left of the x («هي», then −, then x, then «متاع»), i.e. "−x" in LTR order. Same with Tajawal and the system font, and for 4 isolation variants (temporary probe, removed).
- No code change; a test pins the real sentence's segments. Crops: `docs/screens/design/bidi-minus-real-zoom.png`, `bidi-probe-variants.png`. Waiting for the product owner to confirm the spot.
**Measured (iPhone 17 Pro simulator):**
- Long-press menu: 269 pt without the Report group, 354 pt with it (+85 pt).
- Ask bar: collapsed = the input line only (field 44 pt + 6 + 6 padding = 56 pt); open = 56 + 6 + 64 = 126 pt with a formula chip (102 pt without). The row scrolls sideways, so the height is the same at 390 and 360 pt (demo shots).
- A1 start: the chips band (61 pt) + gap is gone, about 67 pt more feed.
- Question-card footer («ما نعرفش», hint, "⋯") on one row at 402, 390 and 360 pt.
**Release:** `npm run check:release-key` ok. A Release bundle contains none of the `-devActions` / `-devDemo` / demo-feed code; only the dead call-site property name `devActionsAtLaunch`, as in D20.
**Tests changed (assertions unchanged unless the product rule changed):**
- LessonScreen.report "'...' on a lesson block" (renamed "long-press on a lesson block") and "cancelling the sheet": long-press instead of `block-menu-*`.
- Product rule "chips collapsed while a card is on screen":
  - LessonScreen.ex4 "the ask chips fold while the lines editor is active" → also collapsed on the first card, open on request;
  - LessonScreen "answers ask-field chips": a toggle tap first;
  - LessonScreen "folds the ask chips while a keypad is open": the next choice card collapses them again (was: chips back).
**New tests:**
- `reportPath` for every kind; `visualOwners`, including "no card after it → the last card before";
- tutor menu Report; feedback and choice-card long-press; the 2.a urn row with the Urn snapshot;
- a11y "report" on a display block and on tutor text;
- labels without LaTeX; long-press cancelled by a scroll on math and feedback blocks;
- spoken math; the fixed chip-row height; the real "−x" sentence.
**Checked on the simulator (nothing tapped):** `-devPart A1` / `2a` / `1b -devActions notSure` (deep dive in the real lesson); the 390 / 360 demo sections; the long-press menu with and without Report. **Tests only:** every long-press, menu action and a11y action.
**Run:** `npm run check` (72 suites, 824 tests + 11 todo).

## Design pass: review fixes + D2b (2026-10-21)
**Review fixes:**
1. **«ما نعرفش» clipping.** In the real lesson it fit (cut only at its bottom by the feed edge); the fw-06 clipping came from the demo frame (390 inside a 358 pt section).
   - Full-bleed width demos now.
   - New debug-only footer check (`layoutCheck.ts`, onLayout; warns and stores the numbers).
   - Measured:
     - 402 pt: row 342, «ما نعرفش» edge 342.0;
     - 390 pt (iPhone 16e, real lesson): row 330, edge 330.0;
     - 360 pt (demo frame): row 298, edge 298.0;
     - no overflow.
   - Jest tests the check with fed measurements (Jest has no layout).
2. **Card border / tab clipping:** demo-only, same cause. The real lesson at 390 pt does not clip (iOS has no 360 pt device).
3. **Stray mark:** a slice of the previous block shown by the auto-scroll margin. The feed now scrolls exactly to the new item's top; gone in the deep-dive shot.
4. **Progress in fw-03:** correct. Only «ما نعرفش» was tapped, so the question is still open. New test: unchanged during the dive, 0 → 1 once the question is answered.
5. **Ask bar order:** send (far end, left), field, «اسأل» toggle (start, right), as in the mockups. No test change.
6. **Footer:** «ما نعرفش», hint and "⋯" are one group at the start, 8 pt gaps.
**D2b:**
- Line editor as a notebook page: white card, ruled lines (`gridLine`), a margin line (`error.noteBorder`) with ✓ / × circle marks on the left (DESIGN.md text).
- The current line has a 2 pt pen border; the wrong-line note is red pencil, below the line; the goal sits on a highlighter mark.
- Keys: card fill, radius 12, 1.5 border; arrow / tool keys in a light pen tint; fraction and power keys with a pen border; a drawn box / bar / box fraction icon; «نثبّت» filled ink.
- Numeric keypad: same key style, pen-bordered field, ink «نثبّت», ▾ fold kept.
- Fixed while checking: an empty ruled row after an accepted, non-final line.
- `Note` (shared with the components) waits for D3. EDITOR.md keys, rules and the measured-width layout are unchanged. No test changed in D2b.
**Checked on the simulator (nothing tapped):**
- editor demo cases at 402 pt (empty, accepted, error, undo chip, long line, keys) and the error case at 390 pt (iPhone 16e);
- the keypad in a scripted feed;
- real lessons A1 (402, 390), 1.b deep dive, 2.a.
**Tests only:** every key press and the check flows (existing suites).
**Run:** `npm run check` (73 suites, 827 tests + 11 todo).

## Small fixes before D3 (2026-10-21)
1. **Long typed line.** It was scrolled to the end, not clipped, but it ran under the field's border with no margin, and moving the cursor never scrolled back.
   - The border is now outside the scroll, with an inner margin.
   - The line keeps the cursor in view (`scrollForCursor`, unit-tested; measured with `measureLayout` after edits, layout and size changes).
   - Checked on the simulator: the cursor at the end shows "−3" with a margin; the cursor at the start shows the start (new demo case LinesEditor#9).
2. **Margin strip:** 36 → 28 pt, marks 24 → 20 pt (marks, not buttons).
3. **Disabled «نثبّت»:** a solid #6B7590 fill instead of 40 % opacity. White label contrast 2.32:1 → 4.59:1 (WCAG AA). Lines editor and keypad.
4. **Student-bubble quote:** already isolated: `isolateInline` makes «f(−x) = f(x)» one LRI LRM … LRM PDI run. A test pins it.
**Run:** `npm run check` (74 suites, 833 tests + 11 todo).

## Design pass D3: visual components on the Cahier tokens (2026-10-21)
**Built (tokens only; no layout or behaviour change):**
- `feedback` tones re-pointed to the Cahier pencils.
- Surfaces: `surfaceSelected` = highlighter, keys = card, pressed = highlighterSoft, muted = pen tint.
- `deepDiveRail` removed: LawChart's tapped bar is pen with an ink outline.
- Plot: curve pen, axis inkMuted, positive / negative green / red pencil. Slider: borderControl track, pen fill and thumb.
- New `borderControl` #7486AD on every control (components and feed); `inkDisabled` #6B7590.
- Component text in Tajawal. Sets, values and formulas in STIX: chips, readouts, LTR strings, plot labels, LawBuilder headers, whose italic is back (Tajawal has none).
- 1 → 1.5 pt borders; chip / button radii.
- Disabled states use solid colours instead of opacity: keys, the used-up hint, chips, «نثبّت», report send.
- Done-card opacity 0.6 → 0.75.
- The chip badge text is ink (data series only as graphics).
**Contrast:** table in DESIGN.md §2, enforced by `__tests__/contrast.test.ts`. Disabled labels went from 2.07-2.38:1 to 4.59:1; done-card ink text from 3.98:1 to 6.30:1.
**Layout shift (LawBuilder, same demo case, pixel-measured):** the table moves 0.7 pt down (the borders); the content below it moves 4.3 pt up (Tajawal vs system line metrics). Other components: the same small text-metric shifts; nothing clipped.
**Lighter control border considered:** #7B8DB1 is the lightest that holds 3:1 on both card and paper (3.34 / 3.06). Shown next to #7486AD (`d3-alt-*`): nearly indistinguishable, so #7486AD is kept.
**Colour never alone (checked in code and on screenshots):**
- urn: ✓ badge and lift;
- chips: ● / ✓ / ✗ / ◆ marks;
- LawBuilder cells: ✓ / ◆ and dashed revealed;
- options: ✓ / ✗;
- ComplementView: "?" and dashed;
- plots: dashed where f < 0;
- LawChart bar: an ink outline, added in D3;
- PredictReveal: a thicker ink border, then the verdict text;
- hint / info blocks: their «تلميح n» label and "i" icon.
- Highlighted sentences (long-press) are not built yet, so there is nothing to confuse the hint with.
**Not changed (noted):** «f(-1)» readouts and «f(-x) comparé à f(x) ?» use a hyphen-minus (readout formatting / demo content, not style); the slider keeps its disabled opacity (no label).
**Android:** not checked for D3. Colours are platform-independent, but borders and fonts need an Android pass (fonts are not registered for Android, D22).
**Checked on the simulator (nothing tapped):** every component's first demo case at 402 pt; LawBuilder and PointOnCurve at 390 pt (iPhone 16e); real 2.a / A1; before / after for Urn, LawBuilder, LawChart, PointOnCurve, PredictReveal (`docs/screens/design/d3-before-*`, `d3-after-*`). **Tests only:** tapped states.
**Run:** `npm run check` (75 suites, 871 tests + 11 todo). No existing test changed.

## D3 follow-ups + design pass D4 (2026-10-21)
**Before D4:**
- Done-card opacity 0.75 → 0.88: muted text 4.64:1 and ink 9.70:1, composited over paper (contrast test added).
- Readouts and the demo prompt use the real minus (U+2212) through one helper in `plot.ts` (readouts, plain numbers, scientific, readout pairs); a readout format test was added.
**D4, built:**
- **Content:** required `number` and `subject`; optional `paper { section?, questions[{ id, label, wording?, status }] }`, checked by the loader (ids unique, authored = available, the rest soon, none forgotten, formulas parse).
  - ex4: «Partie A», A1–A4 wording copied exactly from EX4_ANALYSIS.md (still "to verify against the PDF").
  - ex2: 1.b and 2.a from their goals; 1.a, 2.b, 3.a, 3.b listed with no wording.
  - The wording guard test compares with the transcription only, not with the exam.
  - The title-parsing stopgap is replaced by «Exercice {number}» (i18n).
- **Content versions not bumped** (deviation from the plan): the new fields change no step, block or event, and a bump would detach skills from older stored sessions.
- **`part_done { counted, answered, revealed }`** is emitted at the done line. A revealed card is now marked `revealed` in every case, not only for components.
- **Done parts:** `doneParts` (answered ≥ 1, matched by exerciseId + questionId across versions) plus a separate record (MMKV `tteclair-progress`) so the event cap never erases a done mark. DATA.md updated.
- **Picker cards (§4.1):**
  - subject tag, draft tag, «Exercice n», the statement's key line, the Arabic title;
  - chips: done ✓, current, available, soon (dashed, not pressable);
  - «كمّل من X» / «نبداو», a dashed «تمارين أخرى قريبا», the error card as an error note.
  - Done parts are read on every mount (after each lesson).
- **«الورقة» (§4.3):**
  - header button; statement, questions (done / current «انت هنا» / available / soon), «النتائج المثبتة»;
  - it closes 4 ways, each logged (`PaperSheet opened / closed { via }`), and focus goes back to the button;
  - it opens scrolled to the current question.
- **Debug only (absent from the release bundle; key check ok):** `-devActions answerAll` (plays a part to its done line with the content's answers, incl. variant cards, choice cards, tasks) and `-devDemo paperSheet`.
**Tests changed:**
- ExercisePicker "one card per exercise…": `title.fr` → «Exercice n» and the Arabic title by its label; soon chips also checked.
- events.test: the sample record gained `part_done` (required for every event type).
- Before D4 (minus sign): `plot.test` `plainNumber(-1)` → «−1»; analysis `components.test` «f(−1) = …».
- No assertion weakened.
**New tests:**
- paper schema / loader, wording guard;
- `part_done` counts (all done; one revealed);
- `doneParts` and the record;
- picker (no history, a done part, revealed-only not done, the record, recompute after a lesson);
- the sheet (states, proven results, 4 closes, focus, scroll to current);
- `answerAll` plays A1, 1.b and 2.a;
- contrast for done cards; readout format.
**Checked on the simulator (iPhone 17 Pro; iPhone 16e 390 pt):**
- picker with no history;
- A1 played to its end by `-devActions answerAll`, then the picker with ✓A.1 (a real stored `part_done`);
- «الورقة» in A1 (proven «f est paire», scrolled to the current question) and in 2.a.
- **Tests only:** taps on chips, the resume button, each way to close the sheet.
**Ex2 wording still missing** (to transcribe from the PDF): 1.a, 2.b, 3.a, 3.b (and the section heading, if the exam has one).
**Run:** `npm run check` (79 suites, 903 tests + 11 todo).

## Design pass D5: RTL roles, long formulas, law-table face (2026-10-21)
**Reading-side roles** (`src/theme/sides.ts`, DESIGN.md §8):
- `theme.reading` (row in reading order, start / end align, start / end edge) and `theme.mathSide` (LTR math and exam lines).
- Guard: `__tests__/readingSides.test.js` (no physical left / right keys or bare `'row-reverse'` in the feed, line editor, app screens).
- Changed to roles, same look (pixel-identical before / after):
  - jump button (reading end);
  - «السؤال» tab (start); done-card «⋯» (end); card footer;
  - student bubble (end); deep-dive tab (start); tone and hint headers; choice and feedback rows;
  - notebook margin (math start); copy chip (reading start); undo chip (math end);
  - lesson header: children in reading order, back · title · «الورقة»; back stays on the right, «الورقة» on the left. The paper button's label is before its mark, and the subtitle row comes before the draft tag;
  - progress bar fill;
  - ask bar: toggle · field · send;
  - picker top row: tags · «Exercice n»; picker chips;
  - «الورقة» head (titles · ×), proven tags; question rows and result tags named as `mathSide` (French exam order).
- **Look changed:** option ✓ / ✗ marks move from the right edge to the reading end (left).
- **Kept physical:** LTR math / data components; corner badges; sheet radii; the AI-block footer (a lone report link would jump sides under `row-reverse`); the ask-chips scroll (first chip at the left, unchanged, noted); dev demo screens.
**Long formulas:** `ScrollingMath` (the LinesCard line pattern): a horizontal LTR scroll, centred when it fits, scrolling only when wider (a short formula never takes the swipe), with an indicator flash once wider.
- Used by RichView's formula (prompts, tutor text, statement, sheet) and feed math items. Off in ask chips and options.
- `flexGrow: 0` is needed: without it, the first try took the active card's spare height and blanked the card (seen on the simulator, fixed before the baseline).
- 2.a sum: inside the card at 402 and 390 pt.
**LawBuilder:** the active line «p(X = −2) = ?» is set in STIX like the header (italic letters, upright digits; same text for tests). Column values and cells use STIX too. «Σ p = 0» (shared Readout) still has an upright bold p (left as is).
**Debug only:** `-devUntil stepId` with `-devActions answerAll` stops at that step's card (2.a sum screenshots). Release bundle: only the dead call-site name, as for `devActionsAtLaunch`.
**Screenshots:** `docs/screens/design/d5-before-*` / `d5-after-*` (iPhone 17 Pro 402 pt; iPhone 16e 390 pt for A1, 2.a, sum). The "before" set was taken before any edit; for the sum card, after adding only `-devUntil` (no rendering change). Pixel diff: only options, LawBuilder and the sum card changed.
**Gesture check (sum scroll vs feed scroll): not done.** This session can't post input events to the Simulator (no Accessibility permission). It is in MANUAL_TESTS.md §4.
**Tests:** new `readingSides.test.js`, `ScrollingMath.test.tsx` (2.a prompt in a horizontal LTR scroll; scroll only when wider; off for chips). No existing test changed.
**Manual checklist:** `docs/MANUAL_TESTS.md`.
**Run:** `npm run check` (81 suites, 908 tests + 11 todo).

### Still open after the design pass
- Paper grid experiment: flat paper now; a grid only if measured free on a low-end Android (DESIGN.md §6).
- Android pass: font registration (Tajawal, STIX; D22), border widths, layout, bidi isolation.
- 360 pt on a real device (only the demo frames were checked at 360).
- Teacher review of all Arabic (`reviewed: false`) and of the exam wording (ex4 "to verify against the PDF"; ex2 1.a, 2.b, 3.a, 3.b and the section heading still missing).
- The sum-card gesture check and the VoiceOver order (header, ask bar) by hand (MANUAL_TESTS.md).
- Small: the law table's active line has no spoken label; «Σ p» upright p; the ask-chips row starts at the left.

## Next step
Phase 5 (product owner, 2026-10-20), in order:
1. Done 2026-10-20: exam wording, engine-derived A1 conclusion, exercise picker.
2. Now: the product owner replays A1 (editor, gate, direction, help). Nothing else until that feedback.
3. Then: debug-only `-devReplay a1` (excluded from release builds) with a hand-written Exercise 4 replay fixture (needed for Step 6); then A2 and A3 at A1's content volume (goals in exam wording, EX4_ANALYSIS.md).
Still open from earlier phases: teacher review of all `reviewed: false` Arabic and the replay labels; Android measurements.
