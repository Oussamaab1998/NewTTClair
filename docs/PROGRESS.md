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

## D6: the exam paper screen (2026-10-21)
**Built:**
- **Paper screen** (`ExamPaperScreen.tsx`, DESIGN.md §4.4, mockups 05 / 06 / 07 without any gating):
  - opened from the picker's quiet «شوف الورقة» link; back returns to the picker;
  - source line, «Exercice 4 (7 points)», the statement, Parties A / B / C with intros, «1)» and hanging «a) b) c)»;
  - ✓ on done questions, the current one highlighted with a dot, «قريبا» where there is no transcribed wording;
  - the picker's own bottom button.
- **Content:** `paper` is now `{ source?, points?, parts[{ heading?, intro?, questions[{ …, subs? }] }] }`.
  - ex4: Partie A migrated (A3's two lines are now sub-questions a / b), `points: 7`, Parties B and C added (all `soon`).
  - ex2: one part, same questions; `points` waits for confirmation.
  - The same `source` line on both. Nothing else in the JSON changed; content versions unbumped (D23).
- **Picker chips and «الورقة»:** show only the parts the app teaches (`appPaperParts`, `src/content/paper.ts`). The sheet is pixel-identical in A1 and 2.a (before / after diff).
- **EX4_ANALYSIS.md:** Parties B and C verbatim ("verified by the product owner against the PDF on 2026-10-21"), with their content forms; the source line and «Partie A».
- **Wording guard:** now covers every paper string (source, headings, intros, questions, sub-questions); a new test shows it rejects an invented sub-question and a changed word.
- **Math renderer:**
  - `\int` keeps its bounds below / above and is drawn taller (1.6×);
  - spoken «intégrale de 0 à … de»;
  - a thin space between a function name and a letter argument («ln x», «tan x»; none before «(»). This also improves `\ln x` anywhere in lessons.
- **New i18n** (reviewed: false): `picker.viewPaper` «شوف الورقة», `examPaper.points` «{{n}} نقاط». `examPaper.heading` is French exam text.
- **Events:** `ExamPaper opened / closed { via: back } / start { partId }`, in its own `paper-…` session (DATA.md).
- **Debug only:** `-devPaperScreen <exerciseId>`; `-devScroll` also scrolls this screen. Release bundle: only dead call-site names.

**Tests changed:**
- `paper.test.ts`: the same assertions on the new paths (`paper.parts[0].questions`); the guard extended to every paper string.
- `ExercisePicker.test` "one card per exercise": soon chips come from the app scope (same assertion), plus B1 / C2 never on the picker.
- `latexSubset` / `spoken` tests: new cases only. No assertion weakened.

**New tests:** `ExamPaperScreen.test.tsx` (structure, marks, ex2 «قريبا», start → the right part, back, events, spoken integral); paper app scope; formula parse in sub-questions and intros.

**Checked on the simulator** (iPhone 17 Pro 402 pt; iPhone 16e 390 pt): the ex4 paper screen (top, Partie B, Partie C, with A1 done), the ex2 paper screen (1.b done, 2.a current), the picker with «شوف الورقة», «الورقة» in A1 and 2.a unchanged (pixel diff). Screenshots `docs/screens/design/d6-*`. **Tests only:** taps, back, events.

**Open:**
- ex2's points;
- ex2's exam numbering on the paper (its labels stay «1.a», «1.b» until its wording is transcribed);
- «]0, π/2[» can break after «π/» at the line end (the wording is kept verbatim);
- teacher review of the two new Arabic strings.
**Run:** `npm run check` (83 suites, 920 tests + 11 todo).

## «ابدا من جديد»: start an exercise from scratch (2026-10-21)
**Built:**
- **`exercise_reset`** (events schema, DATA.md); replay ignores it (test).
- **`doneParts`:** a `part_done` counts only if its session started at or after the exercise's latest reset.
  - The record gets `clearExercise` (that exercise only); stale record entries before a reset are ignored too.
  - `resetExercise` logs the event and clears the marks; nothing is deleted.
- **Planner keeps the history (D25):** test: after a reset, the second wrong answer still avoids the deep dive shown before it.
- **UI:**
  - a quiet «ابدا من جديد» under the primary button of a picker card and of the paper screen, only with a done part;
  - `ResetDialog` (Modal): «لا» filled and focused, «ابدا من جديد» outlined in red;
  - 3 ways to cancel (`no` / `scrim` / `back_gesture`);
  - the screen refreshes at once;
  - events `ResetDialog opened / cancelled { via } / confirmed { exerciseId }`.
- **New i18n** (reviewed: false): `reset.link`, `reset.question`, `reset.confirm`, `reset.cancel`.
- **Debug only:** `-devReset <exerciseId>` (the real reset, that exercise only) and `-devDemo resetDialog`. Release bundle: dead call-site names only.

**Tests changed:**
- `events.test`: the sample record gained `exercise_reset` (required for every type).
- `LessonScreen.history.test`: the deep-dive history test became an `it.each` over "earlier session" and "earlier session then reset". Same assertions.
- No assertion weakened.

**New tests:**
- `doneParts` (before / after a reset, a session spanning it, latest reset wins, other exercise untouched, record cleared and stale entry ignored, `resetExercise`);
- `ResetDialog.test` (link only with a done part; confirm refreshes chips and the resume label; 3 cancels logged; focus on «لا»; the paper screen after a reset; the next lesson's progress bar at 0);
- replay ignores the event.

**Simulator** (iPhone 17 Pro): the picker before, the dialog (`-devDemo resetDialog`), the picker after `-devReset bac2022c-ex4`; then ex4's A1 restored with `-devActions answerAll`. Screenshots `docs/screens/design/reset-*`.
- **Note:** someone confirmed a reset by tapping on the simulator at 21:27 (ex2, and a second dialog session), so the "after" shot also shows ex2 reset. ex2's 1.b was not restored.
- **Tests only:** every tap flow.
**Run:** `npm run check` (86 suites, 954 tests + 11 todo; includes `src/planner/llm/*.test.ts`, added in parallel, not part of this change).

## Tutor intelligence 1, A1 + A1b: model check visible (2026-10-22)
- The startup model check saves its result (MMKV `llm.modelCheck.v1`: time, client, model, result class, status class, latency, allowlisted provider `error.type`, the returned id when a 200 names another model). The dev status line and the AI trace header show it (`check: ok · 2xx · claude-haiku-5-5 · 572 ms · api.anthropic.com 2026-10-21`); while a check is pending, the previous run's result. New event `llm_model_check`, once per app run (DATA.md).
- The Anthropic adapter now keeps the returned model id when a 200 answers for another id (it already counted that as `invalid`, which turned the app to rules only without saying why).
- `anthropic-version`: we send `2026-10-21`, listed as the latest version on platform.claude.com/docs/en/api/versioning (checked 2026-10-22); its breaking changes (sampling parameters, document / citation placement) concern nothing we send.
- **Simulator** (iPhone 17 Pro, `-devMode on -devPart 1b`, Metro on port 8082 via `-RCT_jsLocation`): check ok, 2xx, 572 ms, mode `llm`; the event is in the store. The earlier rules-only session (09:14, 6 `disabled` calls) ran on the key generated 2026-10-21 21:27, before `.env.llm.local` changed at 10:39; its check result was not saved then, so the exact cause is not recorded. No planner or tutor call was made.
- **Tests:** runtime (saved, read back, damaged value ignored, logged once), adapter (returned id kept, non-ids dropped), event schema (no message field, codes only), lesson screen (status line, trace header, one event per run).

## Tutor intelligence 1, A: first live Anthropic run (2026-10-22, `-devScenario live1`, 1.b)
- Model check ok (2xx, 870 ms). **Planner:** timed out at 3535 ms (limit 3.5 s), no output; the rules answer stayed (`rule.first_wrong.repair`, source fallback, trigger forced). **Tutor:** 5362 ms, input 4718 tokens (3356 uncached + 1362 cache write, 0 cache read), output 494, $0.000753; rejected as `invalid` because the model filled the optional `fr` / `math` fields with "" (our schema needs them absent or non-empty), so the drawer showed the saved line. Ledger $0.00291 of the $0.01 scenario cap (the planner counted at its worst case, $0.00215, since a timeout returns no usage).
- Raw tutor text read: it names the active question's answer ("aucune", and a math block with the complement) while no hint was used (D16 still open); non-Tunisian words (شحال, الكرات, الكيس); Latin letters and digits inside Arabic runs.
- Read through the Hermes inspector (in-memory trace and raw log); console lines from the scenario no longer reach the Metro terminal (RN 0.77+).

## Fixes after the live run (2026-10-22): tests first, no model call
1. **Tutor "" fields:** the tutor format cleans the answer before validation (`prepare`: "" in `fr` / `math` / `resultId`, empty runs and an empty run list mean absent), as the planner's wire format does. All transports parse through one helper (`parseAnswer`). The exact live output is a fixture (`fixtures/liveOutputs.ts`) and now parses.
2. **D16 answer leak:** `solutionConcepts.ts` (DECISIONS D16 B). 6 new guard fixtures (live «aucune» + complement, Arabic paraphrase, number in words, 2 near-misses kept, Latin isolated) plus drawer tests on the live answer. `one-idea-with-math` reworded: its Arabic («… ما يصيرش فيه حتى صفر») stated s3's answer.
3. **RTL:** `isolateLlmRuns` (runs.ts) in the drawer (per block) and the planner (consult.ts, before content validation). Changed expectations: the wire-format test now expects «عندك 3» to pass the parse (the rule moved to consult.ts); fixture `digit-inside-arabic` is still rejected, now for `number_not_allowed` after isolation.
4. **Darija word list** in both prompts (`DARIJA_LEXICON`, `reviewed: false`); prompt version p4. No other prompt change.
5. **Latency:** per-run timeout rate, first call apart, warm p50 / p95 in the dev runtime and the AI trace header (`plan: … · tutor: …`), and a "Latency (planner)" table in the eval report. The 3.5 s timeout is unchanged.
**Tests only (no live call this round):** all of the above. Not verified live: the cleaned tutor answer reaching the drawer, isolation on real model text other than the live sample, the Darija list's effect, the new latency lines on the simulator.
**Run:** `npm run check` (93 suites, 1034 tests + 11 todo).

## Before the simulation (2026-10-22)
- **Solution phrases:** every main step with a final answer in 1.b, 2.a and A1 (15 steps; `2a/law` is filled by the EventPickers, not asked) has French and Arabic `solutionPhrases` (`reviewed: false`), enforced by a test. Dev report: `npm run replay -- phrases` (variants and deep-dive minis still have none: 13 + 2 in 1.b, 12 + 2 in 2.a, 8 + 3 in A1). Phrases shown in a hint the student already used no longer count as a leak.
- **Option-list rule:** a leak that also names a wrong option is `option_list` (guard and drawer; fixture `lists-all-options`).
- **Simulation report:** a "Rejection reasons" table per model (leak, option list, RTL, others, and failure outcomes) and a "Near misses" list (passed blocks with a misspelled answer word, half of an answer phrase, a part of the answer value, or its complement; report only).
- **Live re-check** (`-devScenario live1`, 1.b, same tutor question): planner timed out again (3524 ms, first call); tutor ok in 4397 ms, input 4946 tokens (3356 uncached + 1590 cache write, 0 read), output 459, $0.00076. The model sent no empty fields this time. The drawer dropped block 0 («aucun», «ما فمّاش حتى وحدة») and the complement math (both `final_answer_early`) and kept the pointer block, its «0» isolated into its own run. Run total $0.00294 (the timed-out planner call counted at its worst case, $0.00218).

## Planner on a device: not seen yet (2026-10-22)
- **The planner timed out on both live calls** (3535 ms and 3524 ms, limit 3.5 s, `-devScenario live1`, 1.b s3, Haiku 5.5, first call of each run). **No planner answer has been seen on a device yet**; its real token usage is unknown (a timeout returns none). The app's 3.5 s timeout stays until the simulation measures latency (eval-only limit `--timeout-ms 15000`).
- Transfer variants (1.b, 2.a, A1: 6) now have `solutionPhrases` (`reviewed: false`); simpler twins and deep-dive minis wait for the simulation.
- Report additions: "within 3.5 s" per model, and the planner's real token usage (uncached / cache read / cache write / output) of the first successful calls.

## Simulation run 1 (2026-10-22): Haiku 5.5, 27 points x 2, eval timeout 15 s, cap $0.25
- **Cost:** $0.0225 (list price x usage; estimate was $0.0236 typical / $0.0755 worst). Output 426 tokens on average; one call hit the 600 cap (`incomplete`).
- **Latency:** p50 3140 ms, p95 3778 ms; first (cold) call 3080 ms, no slower than warm; 43 of 54 (80%) within 3.5 s, 11 over (two near 7.3 s). No call reached 15 s.
- **Cache works:** the system prompt (6346 tokens) is shared by every exercise; each question's static pack (about 3000 tokens) is written once, then read (warm calls read 8717-9417 tokens, uncached 556-1300).
- **Valid 14 / 54 (26%).** Rejections: NumericTwin / Urn / FunctionPlot / OutcomeSpace props invalid 17, component not offered 10, ask_clarify with more than 3 options 5, LaTeX inside a text run 6, one leak caught («المجموع يساوي 1» at 2.a sum), one number not allowed, one output cut off.
- Files (gitignored): `tools/replay/out/eval-2026-10-22T11-29-24-554Z.{md,jsonl,review.md,sidebyside.md}`.
- **Still unexplained:** both in-app planner calls timed out at 3.5 s while 80% of eval calls arrive in time.

## AI interface fixes + simulation run 2 (2026-10-22)
- **Built (tests first):** per-step `offeredComponents` and `notWhileHintsLeft` in the uncached pack; one example per action kind in the cached prompt (`wireExamples.ts`, validated by test; Arabic `reviewed: false`); catalog "Props rules" (NumericTwin calculator syntax, insight RTL rule, OutcomeSpace showCount, FunctionPlot without markers); prompt p5 rules (no LaTeX in runs, no English words, no praise of a wrong value, ask_clarify options only). Guard: `component_reveals_answer` (derived from the answer spec, `revealing.ts`), `props_not_allowed`, `praise_wrong_value`. Near misses only for phrases of 3+ meaningful words. Request timing (prep / headers / body) in the transport, `llm_call`, the trace and the eval report; dev scenario `-devScenario timing` (own $0.01 ledger).
- **In-app timing** (3 lesson calls + 1 direct 15 s measurement): prep 0-2 ms, body 0-1 ms, headers 2140-3157 ms; one lesson call timed out (33%). **The first planner answer on a device:** CompareTwo, 3168 ms, swapped in. No app-side overhead found; latency follows output length (about 2.2 s + 2 ms per output token in run 1).
- **Run 2 vs run 1** (same 27 points, Haiku 5.5): valid 78% (26%), within 3.5 s 98% (80%), p50 2548 ms (3140), output 349 tokens (426), $0.0216 ($0.0225). Rejections: PredictReveal props 4, leak caught 3, output cut 2, RTL 1, not offered 1, no student action 1.
- **Gaps seen in passed answers (not fixed):** text inside component props is not leak-checked (PredictReveal options «ثلاثة / ستّة / سبعة» at 2.a/s10); a NumericTwin `compare` equal to the A1 goal; «الإسم الصحيح كان 1 + e^(2x)» (part of the target); LawChart at 2.a/s10 (event steps do not forbid it); «إنت قريب» without a value; English inside fr runs ("order"); «الكورة» for a curve.

## Answer checks round + simulation runs 3-4 (2026-10-22)
- **Built (tests first):** props leak check on every props string and NumericTwin expressions (`props_leak`), goal parts (`target_part`), LawChart / ComplementView displayed values (engine) in the reveal check, counting formulas (`formula_answer` evaluated by the engine; `method_early` from a list), "close" about a wrong answer, English words in fr runs and «الكورة» in an exercise with no urn (lists), line_invalid: explain or hint only; the tutor drawer drops blocks on the same text rules. Prompt p6. Planner timeout 5000 ms (swap rule unchanged); trace shows the share within the limit. Eval `--max-output`. DECISIONS D27.
- **Run 3** (600 output tokens, guard as built): valid 30/54 (56%; run 2: 78%), within 5 s 98%, within 3.5 s 85%, p50 2590 ms, $0.0228. The new rules rejected 4 answers (LawChart at 2.a/s10 x2, NumericTwin with the target denominator, «الكورة»); the other rejections are PredictReveal props 5, no_student_action 4 (example / explain at the converted log's points, scope unknown), leaks 3, cut off 3, others 5. No passed answer states the answer; borderline: a NumericTwin at A1/s8 that shows the multiply-by-e^(2x) step, «برافو … صحيحة فكرة» about a wrong line.
- **Run 4** (same, `--max-output 400`): 14 of 54 cut off (26%; 3 at 600), valid 52%, $0.0203. Keep 600.

## Tutor intelligence 1: B1 + B2 (2026-10-22)
- **Regression fixture:** the real 1.b session (sess-mvj9lr9w) as a scripted student (`src/lesson/session/fixtures/realSession1b.ts`, test `realSession1b.test.ts`): the student's own inputs per card, the choices on planner cards, detours answered right; the rules decide the rest. Baseline = the real session's rules, decision for decision.
- **B1:** a variant step that uses the exercise's urn looks up alternatives, simpler twins and the deep dive of the steps it is for (`Rules.keysFor`); a variant with its own urn inherits nothing. In the real session: "not sure" on the transfer opens the `pairs_listing` deep dive (was hint 1); "counting" leads to `alt-1b-s5-pick` (was hint 2); the escalation goes through `sim-pairs-1`, `sim-pairs-2`, then `pre-simultaneous` (no teacher note). No hint is given on the transfer any more, so "reveal" stays locked there (rule 6).
- **B2:** `rule.second_failure`: the second failure with a "not sure" in it, nothing tried on the step yet, changes the representation before asking what is unclear (two wrong answers keep `rule.second_wrong`). It does not change the real session (B1's deep dive already is that change).
- **Changed test expectations (none weakened):** (1) rules.test `"not sure" twice … also asks`: now with an earlier detour (with nothing tried, B2 changes the form first; covered by the new B2 tests); (2) rules.test `skips a deep dive that targets another skill`: with nothing tried, `rule.second_failure` picks the same alternative; the mismatch rule is asserted after an earlier detour; (3) tools/replay lib.test row 8 (1b/s8, not sure): rule `rule.second_failure` instead of `rule.deep_dive_repeat`, same action; (4) the real-session regression (B1 rows, listed in the test).
- **Run:** `npm run check` (96 suites, 1105 tests + 11 todo). No model call.

## Help chips «غيّر الطريقة» / «حاجة أسهل» (2026-10-22)
- **Built (tests first):** `helpChipsState` (`src/lesson/feed/helpChips.ts`): chips under the active question after a wrong answer or a "not sure"; idle alone only with `THRESHOLDS.helpChipsIdleAlone` (off); hidden while the repair offer is open, on minis and readonly cards, without an authored target, at the cap. Layout A (two quiet chips) and layout B («ما نعرفش» opens: change / easier / hint / «ما نعرفش برك»), dev `-devHelpLayout`; both entries stay in "⋯". `request` events now carry `attempt` and `via` (menu / chip / choice); a tap is a struggle signal (situation `struggle`, derived `changeMethod` / `easier` per skill, `Situation.skills[id].helpRequests`). Reason line after a request (`lesson.helpReason.*`, Arabic `reviewed: false`). At most 3 detours per step (`THRESHOLDS.maxDetoursPerStep`, transfers not counted), from the log, so it survives leaving and returning; at the cap a request is `rule.request.none`: the lesson goes on and the line points to the hint, or to "show the answer" once the ladder is used up. A declined repair offer is not proposed again. Usage: `helpUsage` (dev line, `npm run replay -- help-usage <log.jsonl>`). Fix: the lesson's first card had no help targets (no event yet); the probe now uses the lesson's ids.
- **Changed tests:** rules.test "change method with nothing left" and "something simpler with nothing authored" (teacher-note card → `rule.request.none`, no dead end); rules.test mini-example loop (3 rounds = the cap: no prerequisite after them; with 2 rounds it still steps down); lesson.test busy session (the earlier "easier" tap counts as struggle: the "not sure" at 1b/s8 asks what is unclear, «counting» reaches the same bar); real 1.b regression (the transfer's escalation stops at 3 detours: teacher note, then hint 1).
- **Simulator** (iPhone 16e 390 pt, `-devWidth 360` clamp; dev `-devActions wrong,declineOffer`, `-devHelpChoiceOpen on`, `-devScrollEnd on`): `docs/screens/help-chips/`. Seen: the feed scrolls to the newest item's top, so on a 360 pt column the chips row can be below the fold after a wrong answer (screenshots use the dev scroll to end).
- **Run:** `npm run check` (100 suites, 1128 tests + 11 todo). No model call.

## Help chips follow-up (2026-10-22)
- **Built (tests first), DECISIONS D28:** footer scroll when the chips appear, unless the student dragged the feed since the last new item (`footerScrollY` in `jump.ts`, `FooterRevealContext`). A cap exemption: one prerequisite step back beyond the 3 detours, once per skill. Reveal on variant and transfer steps after 2 closed detours (`Frame.detoursClosed`, card `revealUnlocked`; main steps keep rule 6). It was decided before but **had not been built**. A declined repair offer holds the chips until the next wrong answer or "not sure" on that step (`chipsHold`; "not sure" now counted on the frame, so a card shown again keeps it). Chip border `borderControl` (3.65:1 on white) and label `inkMuted` (6.11:1), in `src/theme/contrast.test.ts`. One spelling «حاجة أسهل» (two comments and a heading fixed; the i18n already used it). New teacher review list in D28. Dev action `back` (leaves the detour).
- **Changed tests:**
  1. `LessonScreen.help.test.tsx`: chips hidden after «لا» on the offer; shown after the next wrong answer (s3 «les deux», then back to s3); the chip-tap, menu and usage tests use that path.
  2. `helpChips.test.ts`: the hold case.
  3. `rules.test.ts`: the mini-example loop (a step back after 3 rounds again: the exemption); "after 3 detours" (easier keeps its one step back, then nothing); a new exemption block.
  4. The real 1.b regression: the escalation's 4th detour is `pre-simultaneous` (was the teacher note), then the teacher note (was hint 1); the student's reveal is allowed with 1 of 2 hints used, after 4 closed detours (was refused).
- **New tests:** `revealUnlock.test.ts`, `jump.test.ts`, `LessonScreen.footer.test.tsx` (360 and 390 pt viewports, and no scroll after a drag), `contrast.test.ts`.
- **Simulator** (iPhone 16e, `-devActions wrong,declineOffer,wrong,back`, without `-devScrollEnd`): `docs/screens/help-chips-2/A-390-chips.png`, `A-360-chips.png`.

## Tutor intelligence 1: reveal rule, tall cards, C1–C3, B3 (2026-10-22)
- **Reveal unlock:** a detour counts only if the student acted in it or finished it (D29). New action `detour_acted` for component taps in a detour. The real 1.b regression does not change (every detour there was answered).
- **360 pt:** on a tall card the footer scroll stops at the card top (the question stays visible). Screenshot `docs/screens/help-chips-2/A-360-chips-question-first.png`.
- **C1:** `src/engine/procedures.ts`. **C2:** per-step `procedures` tables (1b/s5, 1b/s8, 2a/s6, the transfers of 1b/s5 and 1b/s8), checked by the loader; new misconceptions `merges_identical_balls`, `reuses_earlier_result`. **C3:** the answer event has `inferredBy` and `candidates`; the new `probe` event and card. **B3:** `CLARIFY_LADDER`; content `addresses` (deep dives, ask chips) and `link` (1b/s7, the transfer).
- **Changed tests:**
  1. `revealUnlock.test.ts`: the second detour was left at once and counted. Now it does not count; a tap or a hint in it does.
  2. `jump.test.ts`: a tall card was "the footer wins". Now the question wins.
  3. `loader.test.ts`: the 1b/s5 and 1b/s8 answers use `toMatchObject` (they now carry their procedure table, checked in `procedures.test.ts`; same values).
  4. `events.test.ts`: samples for `probe`, `inferredBy` and `candidates`.
  5. `rules.test.ts` "why": the second case now records that the why chip was shown (B3 puts the chip before the alternative).
  6. The real 1.b regression: the first "answer 4" on the transfer now shows a probe card and the planner waits (was `rule.first_wrong -> continue`). The scripted student leaves it open (`REAL_CARDS.probe = null`), as the real student acted next. A new test: 4 and 5 are diagnosed `counts_balls_not_pairs`, the probe is logged once as skipped, and "counting" reaches `alt-1b-s5-pick`.
- **Run:** `npm run check` (108 suites, 1193 tests + 11 todo). No model call.

## Round 1 "dead ends", items 1–3 (2026-10-22)
- **Built (tests first), D30:**
  - The rules' safety net `rule.first_wrong.diagnosed`.
  - Misconception lines: `feedback` / `feedbackConfirmed` on 10 Ex 2 entries (the four asked for, and six more the coverage test found with no line where they are reached through procedures or variant options). All `reviewed: false`.
  - The probe answer shows its line.
  - `misconceptionCoverage.test.ts`: 68 places, each with the probe confirmed and dismissed.
- **Changed tests:**
  1. `rules.test.ts` "specific feedback is the authored one…" renamed to "undiagnosed (no misconception)…": its situation has no misconception, and the expectation (continue) is unchanged.
  2. New rules tests for `rule.first_wrong.diagnosed` (hint; detour at the end of the ladder; continue only with nothing authored left).
  3. New probe-outcome tests in `inference.test.ts`.
  No existing expectation changed. The 1.b regression decisions are unchanged; row 8 ("answer 5" on the transfer) now also shows the counting-balls line before the clarify card.
- **Run:** `npm run check` (109 suites, 1337 tests + 11 todo). No model call.

## Round 1 "dead ends", item 4 + probe rule (2026-10-22)
- **Built (tests first), D31:** probe card only when its answers lead to different actions (`settleProbe` in orchestrate, used by `stepSync` and `useLesson`); long-press dead end (offer card `ask_next`, once per block, `ask.unanswered` as a struggle signal); quotes render their formula as math; jump button in its own row; detour tab clearance; a done typed answer shown once. Debug only: `-devLongPress blockId:mode`, `-devScroll N` with `-devScrollEnd on`, `-devActions acceptOffer`, `-devLlm off`.
- **Changed tests:**
  1. `lesson.test.ts` "falls back to a canned message": the line is still shown, now followed by the `ask_next` offer card (it was the last item before the card).
  2. `inference.test.ts` "at most one probe per step": the second value is 4 again (3 no longer gets a probe).
  3. `inference.test.ts` "3 (merged / earlier result)": now no probe, the merged-balls question line, then hint 1 (was a probe, each answer with its line and hint 1).
- **New tests:** `askDeadEnd.test.ts`, `visibleBugs.test.tsx`, and "a probe card only when its answers lead to different next actions" in `misconceptionCoverage.test.ts`.
- **Simulator** (iPhone 16e, 390 pt, rules only with `-devLlm off`): `docs/screens/round1/`.
- **Model calls:** one live planner call happened during this round's simulator checks, before `-devLlm off` existed (the debug build has the AI planner on; about $0.001, shown in the dev panel). Earlier rounds' simulator screenshots also made calls the same way. From now on, simulator checks of rules-only rounds use `-devLlm off`.
- **Run:** `npm run check` (111 suites, 1355 tests + 11 todo).

## Round 2: D3 + D2 + B4 (2026-10-22)
- **Built (tests first), DECISIONS D32:**
  - D3: `part_done.revealed` counts detour steps revealed.
  - D2: the `revealed` trigger, `rule.after_reveal.fresh/none`, fresh variants `tr-1b-s5-fresh` and `tr-1b-s8-fresh` on a new urn with loader checks, the reason line and the quiet exit, the per-skill cap, and the skill state held after a reveal.
  - B4: `walkthrough` content on 1b/s5, 1b/s8 and the transfer of 1b/s5; the rules action, `WalkthroughCard`, `walkthrough_next`; a silent `teacher_note`; the answer check after loading.
- **Release:** `npm run check:release-dev` (new): no debug launch option is readable in a Release bundle (19 options); a debug bundle fails it. Wording: «اللوطة» → «توّا» in `lesson.noCannedAnswerField`.
- **Changed tests (none weakened):**
  1. `lesson.test.ts` "gives up to 3 levels": a reveal is now followed by the planner's decision (`rule.after_reveal.none` on s3).
  2. `lesson.test.ts` 2.a "rebuilds the same feed": the reveal at s15 opens the fresh variant `tr-2a-s10-urn`; the script leaves it («موش توّا») and goes on.
  3. `LessonScreen.test.tsx` "walks the hint ladder": the event list ends with `plan` (the after-reveal decision).
  4. `rules.test.ts` escalate "… then a teacher note": now the next hint plus a silent note (`dd:pairs_listing` has no walk-through).
  5. `rules.test.ts` example-loop end: now the walk-through of 1b/s8 plus a silent note.
  6. The real 1.b regression (rows below).
- **D3 side check:** the suspected "skip in a variant logged as revealed" cannot happen: the loader already rejects optional variant steps (test added).
- **Replay harness:** `tools/replay` tests pass. `npm run replay -- table docs/samples/ex2_session_1.converted.jsonl` is identical after D2 and after B4 (that log has no reveal or teacher-note point). The real 1.b session is the scripted fixture.
- **Open question (product owner):** should a part done with many reveals show a different mark? Today "done" is `answered >= 1`; `revealed` is logged but not shown.
- **Simulator** (iPhone 16e, 390 pt, `-devLlm off`, `-devScript real1b -devStopAt …`, debug only): `docs/screens/round2/`.
- **Run:** `npm run check` (117 suites). No model call.

## Round 3: D1 + E1 + E2 (2026-10-22)
- **Built (tests first), DECISIONS D33:**
  - D1: `derive.ts` counts misconceptions under their own skill and adds `misconceptionSignals`; the situation's skills map includes that skill.
  - E1: `src/state/outcomes.ts` and `SkillState.outcomes`.
  - E2: `src/planner/nextMove.ts`, wired in `rules.ts` (`afterAttempt`, `afterReveal`, the step's own transfer closing); `rule.next_move.step_back`; the `next_move` event; the dev line `next-moves` (`src/telemetry/moves.ts`).
  - Also: 1b/s5's walk-through line 1 no longer lists the balls (product owner).
- **The 1.b session:**
  - Outcome classes: s3 `first_try`, s5 `guessed`, the transfer `revealed`, the fresh variant `transfer_ok`, s7 `after_detour`, s8 `first_try`.
  - Decision rows unchanged.
  - Moves: repeat, repeat, then the repeat cap is used up (2/2 on counting-pairs). s7 wanted a repeat, stopped by `no_content`.
- **Changed tests (none weakened):**
  1. `rules.test.ts` "self-report already asked: a transfer variant instead" and "at most 2 self-reports per session": the situations now give the skill the "shaky" status a wrong answer gives in a real session (`after_retry` repeats only on a shaky skill).
  2. `rules.test.ts` "after the self-report: the transfer": «خمّنت» still gets the transfer; «فهمت علاش» after a first try now moves on (behaviour change, D33).
  3. `lesson.test.ts` "logs the typed keystrokes" and "hint ladder": the logged events now include `next_move`.
  4. `LessonScreen.test.tsx` "walks the hint ladder": the event list ends with `next_move`; `studentEvents()` leaves out `next_move` like `plan` (both are planner records).
- **New tests:** `misconceptionSkill.test.ts`, `outcomes.test.ts`, `nextMove.test.ts` (the table, caps, the property test), the E2 rules block, `moves.test.ts`.
- **Run:** `npm run check` (121 suites, 1449 tests + 11 todo); `npm run check:release-dev` ok; the replay table identical after D1, E1 and E2. No model call; no screenshot (nothing visible changed for students).

## Content round C1: finish 1.b (2026-10-23)
- **Built (tests first), DECISIONS D34:**
  - Walk-throughs for 1b/s3 and 1b/s7 (2 lines each).
  - The simpler twin `sim-1b-s7-1`.
  - Fresh choice variants `tr-1b-s3-fresh` (new answer type `complement`, engine-computed) and `tr-1b-s7-fresh` (engine probability 15/28).
  - Loader checks for fresh choice variants (correct option, values).
  - `npm run replay -- coverage`.
  - Earlier (2026-10-23): the dev line `answer-timing` and D33's open question.
- **1.b regression:** no row changed (the real session reveals neither s3 nor s7).
- **Changed tests (none weakened):**
  1. `rules.test.ts` "nothing authored": 2a/sum instead of 1b/s7 (which now has a fresh variant).
  2. `freshVariants.test.ts` coverage list: + 1b/s3, 1b/s7.
  3. `lesson.test.ts` "hint ladder" (s3 reveal) and the busy session (s7 reveal): the reveal now opens the fresh variant, which the script answers.
  4. `LessonScreen.test.tsx` "walks the hint ladder": the event list adds the fresh variant's two shown events.
- **Run:** `npm run check` (124 suites). No model call.

## New exercise `bac2022c-sc-ex2`, milestone 1 (2026-10-23)
- **Built (tests first), DECISIONS D35:**
  - E1: the `with_replacement` procedure.
  - E2: coloured balls R / N.
  - E3: `LawChart.law.of`, plus the loader rule.
  - E4: `Urn` display mode past the 60-draw cap.
  - E5: the `section` tag and subtitles, `partLabel`, `findPart` with `exerciseId/partId`, `-devThen`, replay registration.
  - Question 1 of the new exercise:
    - 12 main steps: Urn, the CompareTwo intro, the «how we draw» choice, the typed steps 120 / 60 / 1/2 with 3 hints and 2 walk-through lines each, and the ordered alternative.
    - 3 deep dives, 4 simpler twins, 2 transfers.
    - 14 misconceptions.
    - 3 new skills: `combinations-count`, `multiplication-principle`, `probability-by-counting`.
- **Changed tests (none weakened):**
  1. `ExercisePicker.test.tsx` "one card per exercise": «Exercice n» is now looked up inside each card, because two cards read «Exercice 2».
  2. `contrast.test.ts`: `contrast()` moved to `src/theme/contrast.ts` (same code), so other tests can use it.
- **New tests:**
  - `redBlack.test.tsx`: labels, colour checks, contrast and hue, VoiceOver labels, the cap on both sides, the `law.of` checks.
  - `procedures.test.ts`: the red / black block.
  - `probability.test.ts`: colours.
  - `loader.test.ts`: E3 in content, also nested.
  - `ExercisePicker.test.tsx`: E5.
  - `scEx2.test.ts`: engine values, the happy path, the ordered method accepted, the 720 line, E1 diagnoses, every wrong value of the brief, twins, transfers, minis.
  - `misconceptionCoverage.test.ts` now includes the new exercise.
- **Simulator** (iPhone 16e, 390 pt, `-devLlm off`, no model call; screenshots in `docs/screens/urn-rn/`):
  - **E2, pixel proof:** 14 screens before (two identical baseline runs) and after are identical; the perf-timing text line of the demo panel is masked. Positive control: the new R / N demo cases render, so the bundle was current.
  - **E5, intended diffs:** the lesson subtitles (rows 256–331 only), the picker (tag + new card), the «الورقة» subtitle. Every component and the Ex 2 paper screen are unchanged (`after-e5-*`).
  - **Question 1** (`m1-*`): picker, top with the real urn, the CompareTwo + choice, each typed card, 720 typed, the deep dive from step a, the paper screen, the sheet, the end with the write-up.
  - **CompareTwo intro at 390 pt** (`demo-compare-2r2n*.png`): the two lists stack; the right one shows 12 of 16 with «ورّيني الكل»; nothing clips.
  - **Seen:** the subscript digits on ball faces come from a fallback font (Tajawal has none) and sit slightly low.
- **Tests only:** taps inside CompareTwo / OutcomeSpace, Urn select with coloured balls, VoiceOver reading.
- **Run:** `npm run check` (126 suites, 1607 tests + 11 todo); `npm run check:release-dev` ok (22 options).

## Probability visual components v2: Phase 1, A1, Phase 4a (2026-10-27)
- **Phase 1** (engine, tests only): `docs/COMPONENTS_PROBABILITY_V2_PHASE1.md`. `choose` fixed (2 wrong results and 27 spurious errors for n up to 60, against BigInt); counting, grouping, distributions, repeated runs, coincidence guard, typed notation pre-pass, binomial limits, findings; 141 suites, 1 878 tests.
- **A1 and Phase 4a:** `docs/COMPONENTS_PROBABILITY_V2_A1.md`. GroupBoxes and ChoiceProduct (shared SliceBar, `explored` gate with the `how: skipped` escape), wired into question 1 of `bac2022c-sc-ex2` (`exsc2-0.2.0`) before s4 and s6 on a twin urn; s4 and s6 hints meaning-first, `C_n^k` last; +3 interactions on the no-mistake path (4 -> 7); 148 suites, 2 011 tests; existing screens pixel-identical on 402 and 390 pt (the unfiltered Proba tab is shifted by two perf-panel lines). **Not played yet:** the product owner plays step b next. Change 3 (typed notation) stays unwired: no typing surface has letter keys (report section 3).
- **Autonomous run, stops 2 to 5 (2026-10-27)**: log `docs/COMPONENTS_PROBABILITY_V2_PROGRESS.md`, report and play guide `docs/COMPONENTS_PROBABILITY_V2_FINAL.md`. Eight more components (SlotsPattern, PartWholeBar, SpreadSlider, RepeatedRuns, VariableTable, BinomialExplorer, EventAreaModel, UrnTemplate), all `offeredToPlanner: false` with `reveals` declared; Phase 4b in `bac2022c-sc-ex2` (`exsc2-0.3.0`): a SlotsPattern bridge deep dive and a PartWholeBar repair, both off the main path (no-mistake path still 4 -> 7); the loader's fresh-variant rule is now `freshCandidateOk` (engine); 174 suites, 2 423 tests; existing screens pixel-identical (the unfiltered Proba tab is shifted by whole perf-panel lines; 88 of the 98 baseline screens identical on both devices, the five lesson until-* shots identical to baseline-4a). The owner approved the three input swaps of `BinomialExplorer` to `InverseMirror` in existing tests; their answers to the report questions are pending. **Not played, not verified on a device:** every tapped flow (tests only).
- Decisions: `docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md`, DECISIONS D36 (with the Arabic review list).

## Next step
Phase 5 (product owner, 2026-10-20), in order:
1. Done 2026-10-20: exam wording, engine-derived A1 conclusion, exercise picker.
2. Now: the product owner replays A1 (editor, gate, direction, help). Nothing else until that feedback.
3. Then: debug-only `-devReplay a1` (excluded from release builds) with a hand-written Exercise 4 replay fixture (needed for Step 6); then A2 and A3 at A1's content volume (goals in exam wording, EX4_ANALYSIS.md).
Still open from earlier phases: teacher review of all `reviewed: false` Arabic and the replay labels; Android measurements.
