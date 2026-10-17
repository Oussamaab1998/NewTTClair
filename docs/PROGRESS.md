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

## Next step
Teacher: label the replay table (and review all `reviewed: false` Arabic, incl. variants and skillMap.json). Hand-play the new cards on the simulator. Then measure on the Android phone; then Phase 4 (LLM planner behind the same interface).
