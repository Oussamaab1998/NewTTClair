# Decisions (Phase 0)

Status legend: **Proposed** = recommendation, waiting for the product owner's OK. **Accepted** = confirmed.
**Device test** = must be checked on a real phone (cheap Android included) before Accepted.
Evidence so far comes from the iOS 26.5 simulator (iPhone 17 Pro) on 2026-10-15. Android has not been run yet (deferred by choice).

---

## D1. Math renderer — Proposed

| Option | Pros | Cons |
|---|---|---|
| **A. Native subset renderer** (`src/lesson/math/latexSubset.ts` + `NativeMath.tsx`): our parser → RN `View`/`Text` | Fast (42–133 ms/block on simulator), no WebView, works offline, no extra native dependency, easy to make tappable (long-press on formulas later), deterministic, safe (no eval) | Only the LaTeX we implement (≈ bac notation: frac, binom, scripts, lim, ∫, bar, sqrt, `\left(`…`\right)`); typography less refined than KaTeX (spacing, italic correction); we maintain it |
| **B. KaTeX in a WebView** (`KatexMath.tsx`; LaTeX → HTML in JS, fonts inlined) | Best typesetting, full LaTeX coverage, mature | ≈ 0.9–1.2 s/block until fonts are ready **on a fast Mac simulator**; one WebView per block (memory, scroll jank risk in a long feed); ~160 KB of CSS per page; sizing via async message; a layout bug (blank WebView) already hit and fixed |
| C. Native typesetting library (e.g. MathJax → SVG via react-native-svg) | Good quality, no WebView | Large bundle, slow first render in JS, still no proof it is smooth on cheap phones; not prototyped |

**Recommendation: A as default, B as fallback** for formulas A cannot parse (MathBlock already falls back on parse error; switching that fallback to KaTeX is a one-line change). All lesson content is authored, so CI can parse every formula and fail on anything A cannot render.
**Device test:** Stress tab "20 × native" vs "20 × katex" on a cheap Android phone (time + scroll smoothness); memory with 20 WebViews; long formulas wider than a 360 dp screen (both renderers currently overflow; needs a wrap/scroll/shrink rule).

## D2. Local storage — Proposed

| Option | Pros | Cons |
|---|---|---|
| **SQLite** (`@op-engineering/op-sqlite`, JSI) | Append-only event log fits a table; queries for derived state, review screen and replay; transactions; easy export for sync | Schema/migrations to manage; slightly more setup |
| MMKV (`react-native-mmkv`, JSI) | Very fast key-value; trivial API | No queries: an event log becomes one growing blob or many keys; derived state must be rebuilt in JS |

**Recommendation: SQLite for events, student state and the content cache.** Add MMKV later only if we need fast small settings (locale, last screen). Nothing is installed yet (not needed before Phase 1).
**Device test:** write 1 000 events and rebuild skill state on a cheap Android phone; DB size after a session.

## D3. RTL/LTR isolation — Proposed

Content model: an Arabic paragraph is a list of runs `[{ar}, {fr}, {ar}]` (`src/lesson/rich/runs.ts`). Authors never type control characters; formulas are never runs (separate `MathBlock`).

| Strategy (test-screen letter) | iOS result (simulator) | Android expectation (code reading, not yet run) |
|---|---|---|
| A. No isolation | OK for S1, S3, S4, S5; S2 (paragraph starts with a French word) OK only because iOS honors `writingDirection: 'rtl'` | S2 breaks: RN Android ignores `writingDirection` (`TA_KEY_BEST_WRITING_DIRECTION -> {}`) and picks direction from the first strong character (`FIRSTSTRONG_LTR`) |
| B. Unicode only: RLM (U+200F) at paragraph start + LRI…PDI (U+2066/U+2069) around each French run | All 5 correct | Should be correct: RLM makes the first strong char RTL; isolates need Android 7+ ICU (verify) |
| C. Nested `<Text writingDirection="ltr">` only | **S2 broken on iOS** (an LTR first run flips the paragraph to LTR) | Same as A (style ignored) |
| **D. B + C** | All 5 correct | Same as B |

**Recommendation: D** (default in `RichText`). Also: app layout stays LTR (`I18nManager` not forced to RTL); each Arabic block sets `writingDirection: 'rtl'` + `textAlign: 'right'`; math blocks set Yoga `direction: 'ltr'`. Side effect: rows (tabs, buttons) do not mirror in Arabic; decide in Phase 1 whether to mirror rows manually or force RTL (forcing needs an app restart on locale change).
Guards: `findRunIssues` (Latin/digits/math symbols inside `ar` runs), an i18n test forbidding Arabic+Latin in one `ar-TN` string, a test forbidding literal invisible characters in source.
**Device test:** sentences S1–S5 on a cheap Android phone (checklist in docs/PROGRESS.md); screen reader reading order (VoiceOver/TalkBack); copy/paste of isolated text.

## D4. Backend proxy hosting — Proposed (needed in Phase 4)

| Option | Pros | Cons |
|---|---|---|
| **Cloudflare Workers** (+ KV/Durable Objects for rate limits) | Global edge network (latency from Tunisia to be measured), streaming responses, cheap at low volume, secrets management | Workers runtime (not full Node); vendor-specific storage APIs |
| Container on Fly.io / Render (EU region) | Plain Node, portable, any SDK | Cold starts or always-on cost; one region |
| AWS Lambda (eu-west-3 Paris) + API Gateway | Mature, IAM, logging | Most setup; streaming more complex |
| VPS in Tunisia | Possible data-residency fit | Ops burden; reliability; unclear if required |

**Recommendation: a small TypeScript service (Hono) kept runtime-portable, first deployed to Cloudflare Workers**, with auth, per-student/day rate limits, no personal data in prompts or logs. Final choice depends on the **legal review of minors' data in Tunisia** (CLAUDE.md rule 8), which may impose a hosting region.
**To test:** round-trip latency from Tunisian mobile networks (Ooredoo, Orange, Tunisie Telecom) on 3G/4G; cost per session in the Phase 4 pilot.

## D5. i18n library — Accepted with the Phase 0 plan
i18next + react-i18next, typed keys from `fr.json`, bundled resources (`initAsync: false`). Arabic plurals are available when needed.

## D6. Planner integration (Phase 3) — Accepted (2026-10-17)
The reducer never chooses a reaction. At a decision point (wrong, not sure, detour closed, correct main answer, request button, clarify / self-report answer) it sets `pending`; `src/lesson/session/orchestrate.ts` builds the situation **from the event log only** and asks a `Planner`; the reducer validates the decision again (content + current state) and applies it, logged as a `plan` event. Replay re-applies logged plans (works for an LLM later). Rules planner is synchronous (applied before the next render); an async planner gets a timeout (4 s, untuned) and falls back to the rules. Student actions are ignored while a decision is pending.
Alternatives considered: rules inside the reducer (Phase 2; not replaceable by an LLM), planner called from React only (replay would need the planner).

## D7. Authored variants as the planner's menu — Accepted (2026-10-17)
Rules choose from `Exercise.variants[]` (alternative / transfer / simpler / prerequisite), the step's deep dive, hints and used results. Each variant has an asked or task step (the student acts) and its answers come from the engine with the variant's own urn when it has one (`\val` forbidden there). 28 variants for 1.b and 2.a, Arabic unreviewed. Not generated from `repairComponent` names: props must be authored and engine-validated.

## D8. Phase 3 rule details not fixed by the docs — Accepted (2026-10-17)
All items decided by the product owner. **"closed" (and every skill status, incl. "gap") must not be shown or claimed in the UI yet**; statuses are planner hypotheses (guard: `__tests__/noSkillStatusInUi.test.js`).
- ask_clarify at the 3rd struggle signal (wrong + not sure together) or 2 "not sure" on a step (product owner, 2026-10-17). PLANNER.md updated.
- A deep dive the student leaves with "back" is not "did not help": the question is re-asked, no new detour. A choice / typed mini answered wrong first is "did not help"; a task mini "did not help" when revealed or after 2 wrong tries (D9).
- Second wrong / not sure prefer an alternative for the misconception's skill when the step's deep dive teaches another skill (`rule.deep_dive_mismatch`, expected-table row 7). Depends on accurate skill tags.
- Cards: self-report blocks (one tap; then the transfer variant if one exists). Compress, repair, clarify and teacher-note cards do not block; they close when the student moves on.
- Compress = skip the question's remaining text and math blocks (questions and visuals stay) until the next wrong / not sure.
- Transfer counts as correct only when right on the first attempt (hints logged separately); "closed" needs a clean transfer in a later session.
- A teacher note does not unlock anything: the question stays (the hint ladder still applies).
- Deep dive representation is called "text", or "text+<Component>" when it has its interactive component (D9) (was "deep_dive" in Phase 2 reaction metadata).
- `tsx` 4.23.15 (dev only) runs the replay CLI.

## D9. Phase 3 follow-up (2026-10-17) — Accepted (product owner)
- **Conflicts table vs brief:** the Phase 3 brief wins (first wrong: feedback + numeric check + optional repair; self-report only after help or odd timing; the "au moins un 2" transfer is 1b/s8's). `ex2_session_1_expected_planner.md` and its labels are updated accordingly.
- **Self-report:** at most 1 per question and 2 per session (`selfReportsPerSession`, untuned). A "موش توّا" (not now) choice logs `self_report {value: "dismissed"}`: never evidence; no transfer that time (`rule.self_report_dismissed`); a later correct-after-help may offer one. Note: in the app a session is still one question (a new session id per part), so the session cap only bites once sessions span questions.
- **Compress:** 3 clean answers in a row **and** a stronger signal: one of them typed or done in a task component, or a self-report "understood" in the question. Still opt-in and non-blocking.
- **"Not sure":** counts toward the ask_clarify struggle threshold and the gap hypothesis, never as wrong-answer evidence. "gap" is a planner hypothesis, never shown to the student.
- **Interactive deep dives:** at most one interactive component (a visual block, or a task as the mini question), after 1-2 short text / math blocks (max 240 characters, untuned); optional own `experiment` (no `\val` then); task minis need a hint ladder (reveal ends them), "back" stays available; "did not help" for task minis = revealed or 2 wrong tries (`deepdive.helped`); `shown` payload `representation: "text+<Component>"`. Loader enforces all of it. Applied to `au_moins_contraire` (ComplementView; the rain example moved to a long-press example) and `pairs_listing` (OutcomeSpace on a 3-ball urn; the mini asks the 3-ball count; the 4-letter listing moved to a long-press example; its `\binom{4}{2}` line dropped because `\val` is not allowed with an own urn). `product_zero` is still text only. Arabic reviewed: false.
- **Legacy map:** `kinds.in1 = "typed"` is a GUESS (prototype "in" steps were typed inputs).

## D10. LLM key in test builds — Accepted (product owner, 2026-10-17)
- **How:** the key lives in the gitignored `.env.llm.local` (`OPENAI_API_KEY`, `OPENAI_BASE_URL`). `tools/llm-config/gen.js` (run on `postinstall`, `prestart`, `preios`, `pretypecheck`) writes the gitignored `src/config/llmLocal.generated.ts`; it prints only "key found" and the host. Jest maps that module to a stub with an empty key, so tests never load it. No native dependency.
- **Standard alternatives in bare RN:** `react-native-config` (reads `.env` at native build time, exposes it through Info.plist / BuildConfig and a native module) or a Babel plugin (`react-native-dotenv`, `transform-inline-environment-variables`) that inlines values into the JS bundle.
- **Extraction risk (all options):** the key ships in plain text inside the app binary (JS bundle, or Info.plist / BuildConfig). Unzipping an IPA/APK and running `strings` (Hermes bytecode keeps string literals) recovers it in minutes; obfuscation does not change this. So: a dedicated key with a provider-side spend limit, rotate after the test, client daily cap and kill switch, never in a release or store build. (An "internal test builds only" flag in code is **backlog**, removed from the Phase 4 scope by the product owner, 2026-10-17.) The real fix is the backend proxy (D4): then the app holds no key.
- **Never logged:** the transport keeps the key in a closure and the Authorization header only; error bodies are reduced to allowlisted `error.code`/`error.type` (OpenAI echoes masked keys in error messages). Sentinel tests check results, events, report exports and console output.
- **Endpoint allowlist:** calls only to `api.openai.com` plus hosts listed in `src/config/llm.ts` (`EXTRA_ALLOWED_HOSTS`, for the proxy); anything else, or non-https, makes no call.

## D11. OpenAI adapter — Accepted (product owner, 2026-10-17)
- Raw `fetch` client, no SDK in the app: the official `openai` README states "React Native is not supported at this time" (a spike showed it works under Hermes, but without `ReadableStream` and with no support promise). The SDK is removed from the project; tools/replay will use the same fetch client on Node.
- Endpoint `POST /v1/responses` (OpenAI: "Responses is recommended for all new projects"), Structured Outputs in strict mode, `store: false` on every request (the default is `true`, "stored for at least 30 days"). No retries. Model check `GET /v1/models/{id}`.
- zod stays the source of truth: `src/planner/llm/strictSchema.ts` converts to the strict subset (optional -> nullable, oneOf -> anyOf, unsupported keywords stripped and re-checked by zod, records/tuples/allOf rejected at build time); `denull` removes only the nulls the converter introduced.
- Models pinned with source URL and check date in `src/planner/llm/models.ts`: `gpt-4o-2024-08-06` (baseline; **shuts down 2027-01-14**), `gpt-6-luna`, `gpt-6.1-sol`. The two newer models have **no dated snapshot** (the alias is the only id): **rerun the replay comparison before every release.**

## D12. Small persistent storage — Accepted (product owner, 2026-10-17)
`react-native-mmkv` 4.3.2 + `react-native-nitro-modules` 0.37.1 (pinned) behind `src/storage/kv.ts`, for the daily LLM cap and the report / question queue only. The event log stays in memory (D2 open; proposal below). Jest uses an in-memory mock (MMKV loads Nitro on import).

## D13. Report button and trust labels — Accepted placement (product owner), display details Proposed (2026-10-17)
- Visible "⚑ بلّغ على غلطة" button on AI blocks and on the active question; every other content block has a small "⋯" in a left gutter (28 pt wide, touch area extended by hitSlop) that opens a menu with the block's trust label and Report. Student bubbles and dividers have none.
- **Display detail (not in the docs):** `ai_generated` and `engine_computed` show a small text line under the block (✦ / ∑ + text); the lesson labels (`lesson_reviewed` / `lesson_unreviewed`) are shown only inside the "⋯" menu, because nearly every block is lesson content and the exercise header already says "draft". An AI-chosen component is labelled `ai_generated` (its values come from the engine, but the choice and instruction are the model's).
- Runtime block ids (blocks without an authored `blockId`): `rt:<questionId>:<feed item key>`; stable within one session, not across content versions.
- Report export: dev-only "تصدير" button in the lesson header (share sheet, JSONL); `npm run replay -- reports <file>`.
- **Update (product owner, 2026-10-21, design pass D2):** the active question's Report is no longer a visible button. It is one tap away in the question card's "⋯" menu (`card-menu-<key>`), next to the trust label and the authored help requests. AI blocks keep their visible «⚑ بلّغ على غلطة» button and trust line; `engine_computed` blocks keep their visible line. Lesson labels stay inside the menu (docs/DESIGN.md §3).
- **Second update (product owner, 2026-10-21, before D2b): report path changed again.** No per-block icon; full width. Display blocks open their menu (trust label + Report) on a long-press; tutor text has «بلّغ على غلطة» as the last row of its long-press menu; choice cards on a long-press of their title; question cards (and their task components) in the card's "⋯"; interactive visuals have no long-press (clash with taps, sliders, scroll) and are a row «بلّغ على هذا الجزء» in the next card's "⋯" (or the last card before them). AI blocks keep their visible button and trust line. Screen readers: a "report" custom action. Table in DESIGN.md §3; mapping `reportPath`.

## D2 update: append-only local event store — Proposed (2026-10-17), not implemented
| Option | Pros | Cons |
|---|---|---|
| **A. SQLite (`op-sqlite`), one `events` table** (id PK, ts, session, exercise, contentVersion, t, json), append-only, WAL | Queries by session / exercise / type for derived state, review screen, replay and export; transactions; easy to page; fits a future sync (upload rows after an id) | Native dependency + pods; schema migrations; one more storage engine next to MMKV |
| B. MMKV, one key per session holding JSONL, plus an index key | Already installed; fast small writes | Each append rewrites the whole session value (cost grows with session length); no queries; derived state rebuilt in JS from everything |
| C. Append-only JSONL files (`react-native-fs` or similar), one per session | True append (cheap writes); export is the file itself | Another native dependency; no queries; partial-line recovery after a crash needs code |

**Recommendation: A**, with writes batched per user action (the log already appends per action), events validated before insert as today, and `deriveState` reading the current session from memory and older sessions from SQLite. Retention limit and an "export + clear" path decided with the legal review (PILOT_CONSENT.md OPEN 5). **Device test:** 1,000 events written and state rebuilt on a cheap Android phone.

## D14. Second provider (Anthropic) for replay — Proposed (2026-10-17), not implemented
`LlmTransport` is provider-agnostic; a second adapter `src/planner/llm/anthropic.ts` would implement the same `respond` / `checkModel` over `fetch` (`POST /v1/messages` with the provider's structured-output option, `GET /v1/models/{id}`), map its error codes into the same `LlmErrorKind` classes through its own allowlist, and add its models (ids, prices, source URLs, dates) to `models.ts` with `provider: 'anthropic'`. The replay `compare` command takes `--models` across providers and reads each provider's key from the shell environment (never a file in the repo). Before writing it: confirm the provider's strict-schema subset (our converter may need a per-provider variant) and its data-retention terms (PILOT_CONSENT.md would need a matching section).

## D6 update: provisional rules, then the LLM — Accepted (product owner, 2026-10-17)
Replaces "student actions are ignored while a decision is pending" for LLM consultations:
- At a decision point where the rules cannot diagnose (`shouldConsult` in `src/planner/llm/consult.ts`: free-text request, a wrong answer without a known misconception, struggle >= 3 after 2+ rule decisions, rules falling back on a struggle trigger) and the LLM is on, the rules decision is **shown provisionally** (reduced but not logged) with a "…" marker above the active card, and the LLM is asked (timeout 3.5 s, untuned).
- The LLM decision replaces it only if the student has **not acted or scrolled** (any dispatch, any UI event such as a component tap or a menu, or a user drag of the feed) and the reducer can apply it; otherwise the rules decision is committed. Failure, rejection, timeout or cap: the rules decision is committed as `source: fallback`, silently.
- Every committed plan has `shownSource: rules | llm`. Every call, including skipped (`disabled` when a key exists but the kill switch or the model check stops it, `capped`) and late ones (`stale`), is an `llm_call` event with outcome and status class only.
- **Not in the docs, decided here:** with **no key at all** nothing is logged for the LLM (the lesson is byte-for-byte the rules-only lesson); a network failure during the startup model check keeps the LLM on (only a definite answer such as 401/404 turns it off for the run).

## D15. LLM runtime defaults — Proposed (2026-10-17), all untuned
`LLM_CONFIG` in `src/config/llm.ts`: planner and tutor model `gpt-6-luna` (the only pinned model with credit on the test account; your baseline `gpt-4o-2024-08-06` and `gpt-6.1-sol` returned `no_credit`), daily cap 200 calls per device (MMKV, local day), planner timeout 3.5 s, tutor timeout 15 s, max output tokens 600 / 900. The planner schema is filtered to the components teaching the step's skills (half the input tokens in the live check).

## D16. Output guard — Accepted rules (CLAUDE.md, PLANNER.md), thresholds Proposed (2026-10-17)
`src/planner/llm/guard.ts`, after schema and content validation; any reason rejects the whole decision. Numbers: every number in shown text / math must appear in this question's content or the statement, be an engine value, or be the student's own value (fractions compared as values). Final answer: the current step's verified answer (value, or the correct option's label) must not appear while hints are left. Hint: next level only. One idea: at most 3 blocks, 240 characters per text block. LaTeX must parse. Components: only those offered for the step. Explanations need an active card. Fixtures and rejection rate: `npm run replay -- guard`.
**Fixed (product owner, 2026-10-17):** (a) numbers come from what the student has been shown at this point (`src/planner/llm/shown.ts`): the statement and goal, the urn, steps up to the current one, the current step's used hints, opened detours, answers of steps already done, a shown numeric check; later steps' answers are not allowed. (b) The final-answer check covers task components, computed by the engine: EventPicker favorable outcome ids, their count and probability; LawBuilder cells. Numbers always on screen (urn, statement, goal) are not giveaways on their own. (c) One invalid fixture per case (24 fixtures). The tutor's math checks use the same two functions.
**Answer leak (seen in the live check):** the final-answer check matches values and the French option label only; a paraphrase in Arabic of a choice answer passed (the tutor wrote «الزوز كور ما عليهمش صفر», the 1.b/s3 answer, while hints were left).
- **Fix A, built (product owner, 2026-10-17):** the model no longer receives the current or later steps' answers. `static.verifiedSolution` keeps only the results the exam gives; `dynamic.verifiedSoFar` has the answers of steps already done, the current step's answer only once revealed or the hint ladder is used up, and only engine values the student was shown (`solutionSoFar` in `contextPack.ts`). Prompt `p2` names both fields and says the current answer is withheld (no change to Arabic wording or darija style). Not yet re-measured live.
- **B, backlog:** teacher-written Arabic phrasings of choice answers for the guard to match.

## D17. Tutor drawer — Proposed (2026-10-17)
A free-text question from the ask field opens a drawer (chips still answer in the feed). Order: an ask chip of this question whose label words match (>= 75%) -> verified answer; else the LLM (when on) -> blocks checked by the engine (`src/tutor/verify.ts`: arithmetic equalities and named values verified or dropped, other math kept with "ممكن فيه غلط", final answer dropped while hints are left, broken LaTeX dropped), each AI block labelled and with a visible Report button; else the question is saved to the local queue and "سؤالك تسجّل." is shown. "مازلت ما فهمتش" and `needsTeacher` also save it. Loading state, no provisional answer. Nothing about the AI or credit is shown to students except the `ai_generated` trust label on AI blocks.

## D18. Report gutter — Accepted for now: keep the 28 pt gutter (product owner, 2026-10-17). **Redo in the visual redesign.**
**Update (product owner, 2026-10-21, design pass D2):** the gutter is removed. Every content block gets a small quiet "⋯" icon inside its top-left corner (44 pt touch area, same menu: trust label + Report); a question card has exactly one "⋯", its card menu (D13 update).
**Second update (2026-10-21, before D2b):** the in-block icon is removed too; blocks use the full width and report through long-press / the card "⋯" (D13 second update).
Current: a 28 pt left gutter with "⋯" on every content block. Alternative shown: "⋯" in the feed's existing 12 pt padding (full block width), but the mark sits at the screen edge and half its touch area is off-screen. Screenshots in the Phase 4 Step 3 report.

## D19. Student "send my feedback" — Proposal only (2026-10-17), not built
A "رأيك" entry at the end of each question (after "done") and in the header menu: one tap on 3 faces (shape + text, not color only) plus optional short text, logged as a `feedback` event (question id, choice, text capped at 300) and queued with the reports (same export, `replay -- reports`). No free text is sent to any provider. Open: whether teachers want it per question or per session, and retention (PILOT_CONSENT.md OPEN 5).

## D2 follow-up: op-sqlite status (checked 2026-10-17), before implementing
- npm `@op-engineering/op-sqlite` latest **18.2.5** (2026-09-20), 195 versions since 2023-11, MIT; GitHub OP-Engineering/op-sqlite: 1,048 stars, last push 2026-09-29, 12 open issues, not archived (https://www.npmjs.com/package/@op-engineering/op-sqlite, https://github.com/OP-Engineering/op-sqlite).
- **Maintenance risk:** one maintainer wrote almost all of it (ospfranco 1,144 commits; next contributor 13).
- **RN 0.88:** not confirmed. The repo's own example app is on react-native 0.87.0; it ships a codegen config (New Architecture); no issue mentions 0.88. Hermes: it is a JSI library (no bridge), which is what Hermes needs, but nothing states a tested Hermes/0.88 combination.
- Open bugs relevant to us: iOS reload during in-flight queries delivers results into the new runtime (opened 2026-10-06); `close()` leaves a worker thread running until GC (2026-10-16).
- **Before implementing:** a spike on this project (pods, iOS build, 1,000 inserts + read back, app reload during a query); pin a version at least two weeks old.

## D2 decision: MMKV event store now, SQLite later — Accepted (product owner, 2026-10-17)
**MMKV facts (sources, checked 2026-10-17):** react-native-mmkv README (https://github.com/mrousavy/react-native-mmkv): "Fully synchronous" calls, no stated size limits, `byteSize` and `trim()` available, plain text unless encrypted. Tencent MMKV design (https://github.com/Tencent/MMKV/wiki/design): the file is memory-mapped; writes are appended and the file is deduplicated and rewritten in full when the appended space runs out, doubling the file if needed; rewriting one key repeatedly grows the file until that rewrite. Tencent MMKV FAQ (https://github.com/Tencent/MMKV/wiki/FAQ): MMKV "caches everything in memory", values "are constrained by available memory", "writes may slow down when a full write-back is needed", memory warnings at roughly 100 MB+; keys up to 65,531 bytes. No source states a key-count limit or suitability as a log store.
**Built:** `src/telemetry/eventStore.ts` (`EventStore` interface: append, load, stats, clear) with an MMKV implementation in its own instance (`tteclair-events`): JSONL chunks of 50 events; only the open chunk is written (sealed chunks never change); at most 40 chunks (about 2,000 events, oldest dropped and counted); every event re-validated on load, damaged data skipped. `EventLog` persists through it after validation; a storage failure never breaks the lesson.
**Measured (iPhone 17 Pro simulator, debug build; not a cheap Android phone):** 1,000 single-event appends 37 ms total (p50 0 ms, p99 1 ms, max 1 ms); load of 1,000 events 26 ms; 296 K characters in 20 chunks. Survives relaunch (62 -> 64 stored events across two launches).
**op-sqlite risks (from the D2 follow-up):** one maintainer, RN 0.88 not confirmed (example app on 0.87), open iOS reload and close() bugs. **Spike later** (pods, build, 1,000 inserts + read back, reload during a query) before replacing the MMKV store; the interface stays.

## D20. Debug scenario runner — Accepted (product owner, 2026-10-17)
`src/app/dev/` (scenario `live1`, raw LLM output panel, `-devTools 1` (replaced by `-devMode on`, 2026-10-21), `-devBench events`), loaded only as `__DEV__ ? require('./dev') : null`. **Checked:** a release bundle (`react-native bundle --dev false`, built with an empty key) contains none of the dev module's code (only dead property names at the two call sites, and the panel's i18n labels). Raw outputs are kept in memory only (`captureRaw` in debug builds), never logged or exported.
**Incident (2026-10-17):** the first version of the runner re-ran on every Fast Refresh while the app was open with the scenario argument, and each re-run recreated its in-memory $0.01 cap. Result: up to 28 extra live calls (the daily counter shows 30 reserved calls vs 2 intended); known cost of the calls with usage $0.0016, unknown for 9 timeouts / 429s and ~12 unlogged calls; worst case at list price about $0.02. **Fixed:** the scenario runs once per app process (global flag); its spend is persisted per day in MMKV and the worst case is reserved before each call, so remounts, relaunches and parallel calls cannot pass the cap (tests). Check the OpenAI usage page for the exact amount.

## D21. Key in release bundles — Accepted (product owner, 2026-10-17)
- **Default: Release bundles never contain the key.** Metro's resolver (`tools/metro/keyResolver.js`, used by `metro.config.js`) resolves the generated key module to the blank stub for every non-dev bundle, which covers the Xcode "Bundle React Native code" step without relying on npm scripts.
- **Opt-in:** `INCLUDE_KEY_IN_RELEASE=1` in the build environment includes the key, with a loud warning on the build output. For internal test builds only. **Rotate the key after distributing any opt-in build** (anyone with the binary can extract it, D10).
- **Check:** `npm run check:release-key` builds a default Release bundle with a sentinel key in the generated module and fails on any key-shaped string (`sk-` + 16 or more key characters); the real module is restored after. Verified both ways: default bundle clean; opt-in bundle contains the sentinel and prints the warning. Unit tests cover the resolver. The full check is slow (a release bundle, about a minute), so it is not part of `npm run check`.
- Metro must be restarted to load the new config (`npx react-native start --reset-cache`).

## D2 follow-up: history, export, retention — built (product owner, 2026-10-17)
- **History in student state:** at lesson start, the stored events of earlier sessions of the same exercise are read once and put in front of the current log for the planner (`withHistory` in `orchestrate.ts`). The derived skill state (statuses, representations tried, transfers) spans sessions; per-step counters stay per session. Effect, tested: in a second session, the second wrong answer on 1.b/s3 no longer repeats the deep dive tried in the first session (text+ComplementView); the planner offers the EventPicker alternative. A first wrong in a new session stays a first wrong.
- **Export:** dev-only "تصدير الأحداث" shares the stored events as JSONL, read by `npm run replay -- table`.
- **Retention (untuned, pending the legal review, PILOT_CONSENT.md OPEN 5):** sealed chunks whose newest event is older than 90 days are deleted when the store opens; the 40-chunk cap applies on top. Counts in `stats().expired`.
- In Jest, each lesson mount gets a fresh store (no history leaks between tests); tests that need history inject one.
- **op-sqlite:** not adopted; spike planned later (see the D2 follow-up above).

## D19 update: end-of-question feedback card — built (product owner, 2026-10-17)
After a question's done line, outside any question card: «كيفاش كان السؤال هذا؟» with three faces and text (☹ «ما عجبنيش», 😐 «عادي», ☺ «عجبني»); a tap opens an optional note (300 characters) with "ابعث" / "بلاش"; logged as `feedback { choice, text? }` and queued with the reports (`replay -- reports` lists and counts them). Non-blocking. Not shown when the last thing the question showed was a self-report card. Arabic reviewed: false.

## D3 update: Arabic with inline math, measured on iOS (2026-10-21)
- **Measured (iPhone 17 Pro simulator, 8 variants of «والصورة متاع −x هي نفس», screenshot `docs/screens/bidi/probe-8-variants.png`):** with an LTR isolate (LRI…PDI), LRM marks, or both, the run is drawn in LTR order (−x); with no control, or with only a nested `writingDirection: 'ltr'` Text, the minus lands on the wrong side (x−). So `RichText` (strategy `both`) was already right on iOS.
- **The real leak:** strings shown as plain text: the long-press quote (menu and student bubble) and the student's own text joined the runs without isolation. Fixed with `isolateInline` at display time (data stays plain). An equality quoted that way also lost its last ")" to the wrong side; now whole.
- **Kept:** LRM marks inside each isolate (`LRI LRM … LRM PDI`), for renderers that ignore isolates (Android not yet measured).
- **Content check:** math signs (− ∈ ℝ × ⇒ superscripts …) inside an Arabic run fail the loader, like Latin letters and digits already did; the Arabic UI strings have the same guard (one allowed shape cue, «≠ ما يتطابقوش»). **Device verification on Android still needed.**

## D22. Fonts — Accepted on iOS (product owner, 2026-10-21)
- **Bundled:** Tajawal 400/500/700/800 and STIX Two Text (variable, roman + italic), the official google/fonts files with their OFL.txt, in `assets/fonts/` (Xcode folder reference + `UIAppFonts`). No npm package. Names: Tajawal by PostScript name, STIX by family name «STIX Two Text» with italic / weight (its variable instances have no PostScript names); `__tests__/fonts.test.ts` checks names, files, plist and licences.
- **Licence:** SIL Open Font License 1.1 for both. Use, bundling and redistribution with the app (also a paid one) are allowed; every copy must carry the copyright notice and the licence (OFL.txt is copied into the app, and the licence is also in each file's metadata); the fonts may not be sold on their own; a modified version may not use a Reserved Font Name (STIX: «TM Math»).
- **For the legal review:** Tajawal's metadata copyright string reads "(c) 2017 by Boutros International. All rights reserved.", while its OFL.txt and the google/fonts catalogue list it as OFL 1.1. Confirm before release.
- **Measured (iPhone 17 Pro simulator, Release):** +1,120 KB to the .app; launch to first frame median 478 ms without vs 484 ms with (within the run-to-run spread). docs/PROGRESS.md "Design pass D0-D1".
- **Android: not done, not measured.** The font files are not registered for Android (no `android/app/src/main/assets/fonts`), and Android resolves `fontFamily` by file name, so the STIX family-name token and the `[wght]` file names need an Android plan. Cost on a cheap Android phone is unknown.

## D23. Content versions not bumped for the D4 content fields — Accepted (product owner, 2026-10-21)
The D4 fields (`number`, `subject`, the optional `paper` list) change no step, block or event. A `contentVersion` bump would detach the planner's skill history: the skill catalog only maps steps of known versions, and every block's trust data carries the version, so older stored sessions would lose their skills. So ex2 stays `ex2-0.5.0` and ex4 `ex4-0.1.0`. Bump when steps, blocks, answers or wording shown in the lesson change.
