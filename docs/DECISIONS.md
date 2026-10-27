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
- **B, built (product owner, 2026-10-22):** `solutionConcepts.ts`: while hints are left, the planner guard and the tutor drawer reject (planner) or drop (drawer, per block) text that states the current step's answer: values, also in words («ثلاثة», «trois», «3 sur 10»); the correct option's own French words (none of the wrong options use them; words the statement, goal or prompt already show do not count, e.g. «paire» in A1); the option label; the step's authored `solutionPhrases` (French and Arabic; 1.b/s3 and A1/s3 for now, `reviewed: false`). Words and phrases are compared as tokens without accents, Arabic diacritics or tatweel. Asking and pointing stay allowed (fixtures `near-miss-*`). The live answer of 2026-10-22 is a fixture: its «aucune» block, Arabic paraphrase and complement math are rejected; its pointer block is kept.
- **RTL in AI text (2026-10-22):** LLM answers are parsed by shape (`RichShapeSchema`); Latin, digits and short formulas inside an Arabic run then become their own run as authored content writes them (`isolateLlmRuns`); LaTeX or a stretch over 40 characters in a run is rejected (`rtl_formula_in_text`: the planner decision, or the one drawer block). The result still passes `RichSchema` before it is shown.
- **Still open:** Arabic phrasings for the other choice steps (2.a/s9 has a set answer, A1/s9's answer is its own goal); a paraphrase using words not on the list still passes.

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

## D24. Cahier squared paper is the default background — Accepted (product owner, 2026-10-21)
The mockups' grid (22 pt, 1 pt lines, #DDE5F3) is drawn behind the lesson feed, the picker and the «الورقة»
sheet (DESIGN.md §6). Flat paper is the fallback (one theme flag, `theme.layout.paperStyle`) if a
measurement shows a real problem. Simulator: no mount-time difference; scroll smoothness and cheap Android
not measured yet.

## D25. «ابدا من جديد» resets progress, not history — Accepted (product owner, 2026-10-21)
"Start the exercise from scratch" logs `exercise_reset` and wipes that exercise's done marks (picker ✓, «كمّل من», the paper screen, «الورقة»). Stored events stay (reports, planner). The planner treats the next attempt with its **earlier history** (skill states, representations tried, transfers, deep dives already shown), so the second attempt gets smarter help; per-step counters are per session, so the student is not held to past mistakes on a step. Deleting stored data is a separate feature ("delete my data", to plan later). Resetting a single part is out of scope.


## D26. AI tutor v2 (Anthropic adapter, triggers, caps, trace, evaluation) — Accepted plan (product owner, 2026-10-21); default model open until the comparison runs
- **Adapter** `src/planner/llm/anthropic.ts` (implements D14): raw `fetch`, `POST https://api.anthropic.com/v1/messages`, `anthropic-version: 2026-10-21` (latest; its breaking changes are documents, citations and sampling parameters, none used), fixed host allowlist `api.anthropic.com`, no retries, only allowlisted `error.type` / `details.error_code` kept (`providerErrors.ts`), `request-id` kept. Model check `GET /v1/models/{id}`. Key: `CLAUDE_API_KEY` in `.env.llm.local` (gen.js); release bundles still get the blank stub (D21; the release-key check now has an Anthropic sentinel too).
- **Structured output: JSON (`output_config.format`, json_schema), not tool use**: GA without a beta header, listed for every model we use; forced `tool_choice` is a 400 on Sonnet 5.5. **Found:** the per-component planner schema is outside Anthropic's documented limits (27+ optional parameters, max 24; recursive event schemas), so the planner answers a flat **wire format** (`wireFormat.ts`: all fields required, enums only, props as a JSON string checked afterwards by the registry schema), mapped to `LlmPlannerOutput` before the usual zod → `validateDecision` → guard path. One schema for every step. The OpenAI adapter uses the same wire format when asked (`useWire`), so the comparison is like for like. The OpenAI adapter stays in the code, not selected (`LLM_CONFIG.provider = 'anthropic'`).
- **Caching:** `cache_control: ephemeral` (5 min) on the system prompt (instructions + tutor rules + catalog) and on the static pack (its own user block). Minimum cacheable prefix: 4096 tokens on Haiku 4.5, 512 on Haiku 5.5 / Sonnet 5.5 (caching page). Measured hit rates come from the live run.
- **Thinking:** off for latency (Haiku 4.5: omitted; Haiku 5.5: `disabled`; Sonnet 5.5: `between_tools`), effort `low` where accepted. No server-side refusal fallback: a refusal falls back to the rules.
- **Models (official pages, checked 2026-10-21, sources in `models.ts`):** `claude-haiku-4-5-20251001` ($1 / $1.25 write / $0.10 read / $5; legacy, tentative retirement "not sooner than October 15, 2026", already passed), `claude-haiku-5-5` ($0.10 / $0.125 / $0.01 / $0.50), `claude-sonnet-5-5` ($2 / $2.50 / $0.10 / $10). App default until the comparison: `claude-haiku-5-5`.
- **Catalog** (`catalog.ts`, `components/catalogMeta.ts`): generated from the registry; when to use, skills, student action, compact props type. Visual components only (graded tasks stay on the lesson path).
- **Triggers** (`consultReason`): rules answer first, as before; the AI is asked on (a) a wrong answer without a known misconception, (b) the 2nd or later struggle signal on a step, (c) a wrong typed line (even with a known misconception) or an unreadable / unchecked line (new trigger `line_invalid`; its rule `rule.line_invalid.continue` changes nothing, so the rules-only lesson now logs one `plan` event per invalid line), plus the existing free-text request and rules fallback. Pilot flag `aiOnEveryMistake` (off; dev `-aiEveryMistake on`) with its own cap of 60 calls per device per day.
- **Caps:** $0.50 per device per day for every live call (MMKV `llm.spend.v1`, worst case reserved before each call), next to the 200 calls/day cap.
- **Guard additions:** lines steps: the engine's values at the checked point (and the student's line) are allowed numbers; while hints are left, any written math the engine finds equivalent to the goal but not in the start's form is `final_answer_early` (4 new fixtures). Not applied to the tutor drawer (out of scope).
- **Dev:** AI trace panel (`-devMode on`), fake planner `-devLlm fake|fakeSlow` (free) for simulator checks.
- **Evaluation:** `npm run replay -- eval --estimate` (free token counts) then `--live --cap-usd 5` (first run capped at $5); outputs in `tools/replay/out/` (gitignored). **Blocked (2026-10-21):** the `CLAUDE_API_KEY` in `.env.llm.local` is not scoped to a workspace; Anthropic then requires an `anthropic-workspace-id` header on every request, and such a key can also manage the organization through the Admin API, so it should not ship in a test build. Needed: a key scoped to one workspace (ideally a dedicated workspace with its own spend limit).

## D27. AI answer checks after simulation 2 — Accepted (product owner, 2026-10-22)
- **Props leak:** every string inside a component's props (PredictReveal options and labels, insight, captions, labels) gets the same answer checks as the text (values, number words, the option's words, authored phrases); NumericTwin `template` / `compare` (its letter read as x) must not be equivalent to the lines step's goal or to a part of it. Reasons `props_leak`, `target_part` (a numerator or denominator of the goal, not the start's).
- **Displayed values:** a LawChart or ComplementView whose engine values (probabilities, and counts out of the total) include the answer's value is `component_reveals_answer` (LawChart shows p(X = 0) at 2.a/s10 and 1.b/s8), next to the rules derived from the answer spec.
- **Counting formulas (4c):** on a count / outcomeCount step, a formula written with the exercise's numbers (`\binom{5}{2}`, `5 × 4 / 2`, `C(5, 2)`) is **evaluated by the engine** and, if it gives the answer while hints are left, rejected as `formula_answer`: **this part is solid.** The rest is **a list and will miss other wordings:** the phrasing «زوز من خمسة» / "2 parmi 5" (read as C(5, 2)), and the shapes and words of a general formula (`\binom{n}{k}`, `n(n-1)`, "combinaison", "parmi", «تأليف») that are `method_early` until the hint that states the method (the first hint with `\binom`, "combinaison", "parmi" or `C_`; else the end of the ladder) has been used.
- **Quality (lists, not proofs):** "close" / "almost" (قريب، تقريبا، presque, proche, pas loin) about the student's answer while it is wrong is rejected (`praise_wrong_value`), praise next to a wrong value too; praise of an earlier verified step stays allowed. English words inside "fr" runs from a fixed list (order, slider, pairs, event, simultaneous, draw, ball, outcome...; "pairs" is also French for "even" and may be over-blocked) are `english_word`; «الكورة» in an exercise with no urn is `wrong_word`. For an unreadable line (`line_invalid`) only explain or hint (`action_not_allowed`). The tutor drawer drops a block for the same text rules.
- **Planner timeout 5000 ms** (was 3.5 s); the swap rule is unchanged (only if the student has not acted). The trace shows the share of calls inside the limit.
- **aiOnEveryMistake stays off by default.** In simulations 1 and 2, where the rules already diagnosed the mistake (a known wrong value or option), the AI repeated the authored repair (FoldSymmetry, NumericTwin) or failed; it added nothing there. The pilot flag remains for measurement only.


## D28. Help chips follow-up — Accepted (product owner, 2026-10-22)
- **Layout A (two quiet chips) is the default;** layout B (the «ما نعرفش» choice) stays behind `-devHelpLayout choice`.
- **Detour cap with one exemption:** at most 3 detours per step (transfers not counted). Beyond the cap, one step back to a prerequisite is still allowed (max 4 in all), and at most one per skill in the session (a prerequisite already shown for that skill is not offered again).
- **Rule 6 exception: reveal on variant and transfer steps.** On a variant or transfer step, "show the answer" unlocks after 2 closed detours from that step (deep dives or variants, finished or left), or at the end of its hint ladder. Main steps keep rule 6: reveal only after the ladder. The count lives on the frame (`detoursClosed`) and the card carries `revealUnlocked`. The answer shown is still the engine's.
- **A declined repair offer holds the chips:** after «لا», the chips wait for the next wrong answer or "not sure" on that step (the count is kept on the frame, so a card shown again keeps it). Until then they stay in "⋯".
- **Footer scroll:** when the chips appear, the feed scrolls the card's bottom (with the chips) into view, but only if the student has not dragged the feed since the last new feed item (`footerScrollY`, `jump.ts`).
- **Chip border = control edge** `borderControl` #7486AD, 3.65:1 on the white card (non-text ≥ 3:1). The chip label is `inkMuted` #55627F, 6.11:1 (text ≥ 4.5:1). The decorative card edge #C5D2EA (1.52:1) is not used for controls. Checked by `src/theme/contrast.test.ts`.
- **One spelling: «حاجة أسهل»** for the chip and the "⋯" entry (the same i18n key, `lesson.simpler`) and in the reason line.

**Teacher review list (help chips; all `reviewed: false`):**
- Chip and "⋯" labels: «غيّر الطريقة» (`lesson.changeMethod`), «حاجة أسهل» (`lesson.simpler`); layout B's plain entry «ما نعرفش برك» (`lesson.helpChoice.notSureOnly`).
- Reason lines (`lesson.helpReason.*`):
  - alternative «نجرّبو نفس الفكرة بطريقة أخرى.»
  - deepDive «نفهمو الفكرة قبل، وبعد نرجعو للسؤال.»
  - simpler «نبداو بمثال أصغر.»
  - prerequisite «نرجعو خطوة لتالي، لحاجة أسهل.»
  - hint «ما فمّاش طريقة أخرى هنا: جرّب التلميح.»
  - reveal «ما فمّاش طريقة أخرى هنا: تنجم تشوف الجواب.»
- To check: is «لتالي» the right word for "back" in derja? Is «حاجة أسهل» (rather than «مثال أسهل», which the detour header uses) clear on a chip?

## D29. Reveal-unlock detours, tall cards, wrong procedures, clarify ladder — Accepted (product owner, 2026-10-22)
- **Reveal unlock counts only detours the student acted in:** answered, tapped, a hint, "not sure", a help request, an ask, or finished. A detour left at once does not count. Component taps inside a detour reach the reducer as `detour_acted` (one per detour; while a detour is open, any component tap counts, because deep-dive visuals carry the parent's step id).
- **Footer scroll on a tall card: the question wins.** The scroll stops at the card top; if the footer still does not fit, the chips stay below the fold (also in "⋯").
- **C1–C3, misconception inference:** `src/engine/procedures.ts` runs the step's engine call again with a known wrong procedure: ordered draw, balls in the event, all balls, opposite event, all outcomes, balls of the same number merged, an earlier result. Per-step tables in content (`reviewed: false`); the loader rejects a row that does not fit or equals the answer. Authored wrong answers are matched first. One match gives its misconception; several give the first as a hypothesis, with one skippable probe card per step. The planner waits for that card; if the student acts instead, the card closes as skipped. New misconceptions: `merges_identical_balls`, `reuses_earlier_result`.
- **B3, clarify ladder** (`CLARIFY_LADDER` in `rules.ts`). counting: a counting alternative, a deep dive tagged counting, a twin, a hint. why: the step's deep dive, the ask chip tagged why, an alternative, a hint. link: the step's `link` (earlier result, engine value), the results the question uses, an alternative, the deep dive, a hint. Each chip or link is shown once per step.

**Teacher review list (all `reviewed: false`):**
- Probe card (`lesson.card.probe.*`): title «كيفاش لقيت النتيجة هذي؟»; «عدّيت الكور», «عدّيت العكس», «عدّيت التيراجات الكل», «حسبت الترتيب», «الزوز كور اللي عليهم نفس الرقم حسبتهم وحدة», «عاودت النتيجة اللي قبل», «موش توّا».
- Link texts: 1b/s7 «لقينا قبل عدد التيراجات اللي ما فيهم حتى صفر:»; the transfer of 1b/s5 «في السؤال الأصلي لقينا عدد التيراجات اللي ما فيهم حتى صفر:».
- The procedure tables and the two new misconceptions (`docs/exercises` wording in English only).

## D30. Round 1 "dead ends", items 1–3 — Accepted (product owner, 2026-10-22)
- **Safety net:** after a diagnosed wrong answer (authored or inferred), the rules never return a bare "continue". The misconception's line is on screen; with no repair, `rule.first_wrong.diagnosed` gives the next hint, else the next detour within the cap. Only when nothing authored is left (ladder used, cap reached) does the lesson continue: the line stays and reveal is open. An undiagnosed first wrong answer still shows the generic line only.
- **Lines:** each misconception may have `feedback` (a question: only a value was typed or an option picked) and `feedbackConfirmed` (named plainly after a probe confirmation). A place's own authored text still wins. After a probe answer, the confirmed line is shown; on «موش توّا», the hypothesis's question line.
- **Coverage test** (`misconceptionCoverage.test.ts`): every misconception, at every place it can be reached in Ex 2 and A.1, with the probe confirmed and dismissed, must show a line and a next step. 8 library entries have no place yet (Ex 4 parts not built, the line checker's own codes); the test lists them, so a new place is tested automatically.
- **«عدّيت العكس» on the transfer of 1b/s5:** no ComplementView exists for 1b/s5 or its transfer. ComplementView exists only for 1b/s8–s7 (`alt-1b-s8-complement`), 2a/s10, the prerequisite `pre-complement`, the deep dive `au_moins_contraire` and 2a/s13. So: the plain line, then the next hint. Nothing invented.

**Teacher review list (all `reviewed: false`), Ex 2 misconception lines (Q = question form, C = after confirmation):**
- counts_balls_not_pairs: Q «عدّيت الكور ولا التيراجات؟ كل تيراج هو زوز كور مع بعض: عدّ الأزواج.» C «عدّيت الكور، والمطلوب التيراجات. كل تيراج هو زوز كور مع بعض: عدّ الأزواج.»
- counts_ordered_pairs: Q «حسبت الترتيب؟ في التيراج simultané ما فمّاش كورة أولى وكورة ثانية: عاود عدّ بلا ترتيب.» C «حسبت الترتيب، أما في التيراج simultané الترتيب ما يهمّش: عاود عدّ بلا ترتيب.»
- au_moins_direct_miscount: Q «au moins une معناها وحدة ولا أكثر: حسبت الحالة اللي فيها الزوز؟»
- complement_partial_event: Q «هذي حالة وحدة من الحدث. العكس فيه الحالات الكل اللي الحدث ما يصيرش فيها: شنوّة هي؟»
- confuses_event_and_complement: Q «حسبت الحدث المطلوب ولا العكس متاعو؟ ارجع اقرا شنوّة المطلوب بالضبط.» C «حسبت العكس متاع الحدث المطلوب. ارجع اقرا المطلوب، وعدّ الحالات متاعو هو.»
- counts_all_outcomes: Q «عدّيت التيراجات الكل؟ المطلوب كان التيراجات اللي فيهم الشرط برك.» C «عدّيت التيراجات الكل. خوذ كان اللي فيهم الشرط، ونحّي البقية.»
- merges_identical_balls: Q «الكور اللي عليهم نفس الرقم حسبتهم كورة وحدة؟ هوما كور مختلفين، حتى كان الرقم كيف كيف.» C «حسبت الكور اللي عليهم نفس الرقم كورة وحدة. هوما كور مختلفين: كل وحدة تعطي تيراجات متاعها.»
- reuses_earlier_result: Q «هذي النتيجة متاع سؤال قبل؟ السؤال تبدّل: عاود احسب بالشرط الجديد.» C «عاودت النتيجة اللي قبل، أما السؤال تبدّل. اقرا الشرط الجديد واحسب من جديد.»
- lists_ball_values_not_products: Q «هاذوما الأرقام اللي على الكور؟ X هو الجداء متاع الزوز أرقام: احسب الجداء في كل تيراج.»
- values_include_product_1: Q «باش يجي الجداء هذا، تلزمك زوز كور عليهم نفس الرقم. ثبّت في الكور اللي في الصندوق: موجودين؟»

## D31. Round 1 "dead ends", item 4 and probe rule — Accepted (product owner, 2026-10-22)
- **Probe only when the answers differ:** right after a probe card opens, the rules decide once per candidate (a hypothetical answer, never logged). If all give the same next action, the card is dropped before it is shown: the hypothesis's line as a question, then the rules' reaction. Value 3 on the transfer of 1b/s5 no longer asks. `pre-complement` is not a repair for counting steps (hint 1 after the plain line stays).
- **Long-press with no verified answer:** the first time on a block, the line «ما عنديش جواب جاهز…», then an offer card «تحب تلميح ولا نفهمو الفكرة مع بعض؟» (only the available choices, and «موش توّا»). Later asks on that block: the next hint (or the deep dive) at once, no line. With no hint and no deep dive left: a line pointing to the ask field. Logged `ask.unanswered`, a struggle signal.
- **Quotes:** a long-pressed block's formula is rendered as math in the menu and the student bubble (never raw LaTeX); the event's `quoted` keeps text + formula as before.
- **Jump button:** its own row under the feed (it covered options when it floated over the feed).
- **Detour tabs:** a sheet's top margin (`space.sheetTop`, 20) clears its tab (−11) by 8 pt+; a tab outside a sheet has no negative margin.
- **Release:** `npm run check:release-dev` builds a Release bundle and fails if any debug launch option read in `src/app/dev/launch.ts` (or `Settings.get`) is in it; ok with 19 options (2026-10-22). A debug bundle fails it, as it should.
- **Typed answers:** a done card shows the value once, rendered (it showed the typed text and its preview side by side).
- **Teacher review (`reviewed: false`):** «تحب تلميح ولا نفهمو الفكرة مع بعض؟», «تلميح», «نفهمو الفكرة», «موش توّا», «اكتب سؤالك في خانة «اسأل» توّا.» (was «… اللوطة»; product owner, 2026-10-22)

## D32. Round 2: fresh variant after a reveal, detour reveals in part_done, guided walk-through — Accepted (product owner, 2026-10-22)
- **D2:** a main step or transfer revealed is followed by a fresh variant on a new urn (`afterReveal` transfers; 2.a's own-urn transfers too), opened directly:
  - one reason line, then the variant, with a quiet «موش توّا» exit (closes it without a failure);
  - at most one per reveal, and `THRESHOLDS.freshAfterRevealPerSkillPerSession = 1`;
  - a skill whose last reveal is not followed by a correct variant is at most "shaky";
  - loader checks: own urn, a transfer, and an answer that is neither the parent's answer nor one of its known wrong values.
- **D3:** `part_done.revealed` includes detour steps revealed; "done" unchanged.
- **B4:** the teacher-note card is gone. A stuck student gets the step's own guided walk-through (once per step), else the next hint, else the lesson goes on; the note for the teacher is queued silently.
  - Each walk-through line is checked like an AI answer: values in digits or words, the answer's words and phrases, and formulas worth the answer.
  - The check runs after loading (`src/lesson/walkthroughCheck.ts`, from `src/app/exercises.ts`), because the loader cannot import the lesson. A failing exercise does not load.

**Teacher review list (all `reviewed: false`):**
- Reason line «نجرّبو مثال آخر باش نتأكدو.»; exit «موش توّا»; walk-through title «خطوة بخطوة», button «التالي».
- Fresh variants:
  - `tr-1b-s5-fresh`: «صندوق جديد فيه ثمنية كور، زوز منهم عليهم صفر. نجبدو زوز كور مع بعض. قدّاش من تيراج ما فيه حتى صفر؟» (urn 0, 0, 1, 2, 3, 4, 5, 6; answer 15).
  - `tr-1b-s8-fresh`: «نفس الصندوق الجديد. شنوّة احتمال التيراج اللي فيه au moins une كورة عليها صفر؟» (13/28).
  - Both with hints, procedure tables and answer phrases.
- Walk-throughs:
  - 1b/s5 (2 lines, revised by the product owner 2026-10-22: line 1 no longer lists the balls): «ثبّت في المطلوب: نعدّو التيراجات اللي ما فيهم حتى صفر، موش الكور.»; «كوّن الأزواج من الكور اللي ما عليهمش صفر، كل زوج مرّة وحدة، وبعد عدّهم.» (was: «ثبّت في الصندوق: أما كور ما عليهمش صفر؟ اكتبهم.» + math −1, 1, 2)
  - 1b/s8 (2 lines): «ارجع للاحتمال اللي لقيته للحدث العكسي:» + math p(B̄); «الحدث وعكسو مع بعض يعطيو الاحتمالات الكل: نقص من واحد.»
  - The transfer of 1b/s5 (3 lines; the third is needed for the two 0 balls): «نحّي الكورة اللي عليها رقم سالب، وشوف الكور اللي بقاو.»; «الزوز كور اللي عليهم صفر زوز كور مختلفين: سمّيهم بحرفين مختلفين.»; «اكتب الأزواج الكل من الكور اللي بقاو، كل زوج مرّة وحدة، وعدّهم.»
- For the teacher: is 1b/s5's line 1 (listing −1, 1, 2) too close to the answer? It shows what to count, not the count. Product owner (2026-10-22): yes, the list is removed; the line now says to count the draws with no zero, not the balls. Still for teacher review.

## D33. Round 3: misconceptions under their own skill, outcome classes, nextMove — Accepted (product owner, 2026-10-22)
- **D1:** a misconception is counted under its own skill. The wrong answer and its signal stay on the step's skills; the misconception's own skill gets one struggle signal when it is not one of them. `Situation.skills` also shows that skill; `step.skills` and the forms tried are unchanged.
- **E1:** one outcome class per finished attempt: `first_try`, `after_retry` (added), `after_hint`, `after_detour`, `revealed`, `guessed`, `transfer_ok`, `transfer_fail`. Counted per skill; never shown (a test guards the screens and i18n).
- **E2:** `nextMove` after a correct answer, a self-report, a reveal or a closed transfer.
  - `first_try` and `transfer_ok` → move on.
  - `after_retry` → repeat only on a shaky skill.
  - `after_hint`, `after_detour`, `guessed`, `revealed` → repeat.
  - `transfer_fail` (answered right only after a wrong answer), or a transfer revealed after a failed one on the skill in the session → step back.
  - A revealed fresh variant → move on (D2).
  - A first try with no reasoning shown (lines: the goal at once) → repeat (keeps the 2026-10-18 rule).
  - Hard caps (config, untuned): `repeatPerSkillPerSession 2`, `stepBackPerSkillPerSession 1`, `movesPerQuestion 4`; D2's fresh cap is kept. A property test (200 seeded sequences) shows no loop.
  - Every decision is logged as `next_move`, with the cap that stopped it. The dev panel shows the last decisions and the caps used.
- **Behaviour change (accepted 2026-10-22):** after a first-try answer, «فهمت علاش» now moves on; «خمّنت» still gets the transfer. Before, any self-report except «موش توّا» led to the transfer. A self-report after a first try is asked only when the answer time was unusual (`rule.odd_timing`: faster than `fastAnswerMs` 1.2 s or slower than `slowAnswerMs` 3 min).
- **Open product question:** should an unusual answer time still lead to a transfer when the student says «فهمت علاش»? And is the 1.2 s threshold meaningful for a choice tap? Measured 2026-10-23 with the new dev line (`answer-timing`, `src/telemetry/answerTiming.ts`):
  - The simulator's stored events (1803, all sessions): 205 timed first tries, all 205 faster than 1.2 s, none slower than 3 min; `rule.odd_timing` fired 51 times. Almost all of these are dev-script runs, which answer within milliseconds, so they say nothing about students.
  - The repo's sample log (`ex2_session_1.converted.jsonl`): no durations (converted prototype log).
  - No human session with durations is stored in the repo. Needed: the threshold measured on real sessions (a pilot export) before deciding.

## D34. Content round C1: finish 1.b — Accepted (product owner, 2026-10-23); all strings `reviewed: false`
- **Engine support:** a new answer type `complement { of: <event> }`. Each option carries its `event`, and the loader finds the one option whose draws are exactly the draws outside `of`.
- **Fresh choice variants:** checked against the parent. The correct option must not repeat the parent's correct option, and its value must be neither the parent's answer nor one of its wrong options' values.
- **Option order:** the correct option of each fresh variant sits in a different position from its parent's (test).
- **Coverage:** `npm run replay -- coverage [log.jsonl ...]` regenerates the content-coverage table, with optional counts from logs.

**Teacher review list (C1), with what each line must not reveal:**
- **Walk-through 1b/s3** (must not name the correct option: no «ولا وحدة / حتى صفر / aucune»):
  1. «اقرا الحدث B مليح: شنوّة الحالات الكل اللي يصير فيها؟»
  2. «العكس هو الحالات اللي B ما يصيرش فيها: جرّب كل اختيار وشوف واش يغطّيهم الكل.»
- **Walk-through 1b/s7** (must not state 3/10 or its numbers):
  1. «ارجع لعدد التيراجات اللي ما فيهم صفر، اللي لقيته في الخطوة اللي قبل.»
  2. «الاحتمال هو عدد الحالات المواتية على عدد الحالات الكل: اقسم.»
- **Simpler twin for 1b/s7 (`sim-1b-s7-1`; urn 0, 1, 2, 3; answer 1/2)** (the hints must not give the counts 3 and 6):
  - Prompt: «مثال أصغر: صندوق فيه أربعة كور، وحدة منهم عليها صفر. نجبدو زوز مع بعض. شنوّة احتمال التيراج اللي ما فيه حتى صفر؟»
  - Hints: «عدّ التيراجات الكل، وبعد عدّ اللي ما فيهم صفر.»; «اقسم العدد الثاني على الأوّل.»
- **Fresh variant for 1b/s3 (`tr-1b-s3-fresh`; urn 0, 0, 1, 2, 3, 4, 5, 6; event C = a number greater than 4)** (the hints must not name the correct option):
  - Prompt: «صندوق جديد فيه ثمنية كور. الحدث C معناه au moins une des deux boules porte un numéro supérieur à 4. شنوّة الحدث العكسي متاعو؟»
  - Options (French): «exactement une boule porte un numéro supérieur à 4» (au moins un read as "exactly one"); «aucune des deux boules ne porte un numéro supérieur à 4» (correct, 2nd position); «les deux boules portent un numéro supérieur à 4» (a sub-case).
  - Hints: «العكس فيه الحالات الكل اللي C ما يصيرش فيها.»; «كي C ما يصيرش، قدّاش من كورة فوق الأربعة تنجم تكون في يدّك؟»
  - Answer phrases (for the AI answer check): fr «aucune des deux»; ar «ولا وحدة فوق الأربعة», «الزوز تحت الخمسة».
- **Fresh variant for 1b/s7 (`tr-1b-s7-fresh`; same urn; answer 15/28)** (the hints must not state 15, 28 or the fraction):
  - Prompt: «صندوق جديد فيه ثمنية كور، زوز منهم عليهم صفر. نجبدو زوز مع بعض. شنوّة احتمال التيراج اللي ما فيه حتى صفر؟»
  - Options: 13/28 (the opposite event), 3/4 (counting balls), 15/28 (correct, 3rd position).
  - Hints: «عدّ التيراجات اللي ما فيهم صفر، وبعد التيراجات الكل.»; «الاحتمال: الأوّل على الثاني.»
  - Answer phrases: fr «quinze sur vingt-huit»; ar «خمستاش على ثمنية وعشرين».
- **To check:** the fresh variants of 1b/s5 and 1b/s7 use the same urn and the same event (draws with no 0). A student who meets both sees 15, then 15/28. Is that acceptable, or should s7's fresh variant use another event?

## D35. New exercise `bac2022c-sc-ex2` (red / black urn), milestone 1 — Accepted (product owner, 2026-10-23); all strings `reviewed: false`
Source file: `docs/exercises/EX_URN_RN.md`. Scope of milestone 1: E1–E5 and question 1 (steps a–c). Question 2 (d–g) waits for the product owner's OK. Deferred: the 4 fresh variants and the 3 prerequisites. Alternatives were not in the slice, so none are authored.
- **D1 (id, source line):** the id is `bac2022c-sc-ex2`, and `bac2022c-ex2` stays as it is (stored progress is keyed by it). **Open:** the exact « Section : … » line of the paper header was not supplied (the message still had the placeholder). Until it is, `paper.source` is absent and the paper screen shows the section short label («Sc. exp.») in its place. A test asserts the source is absent, so adding it is a deliberate change.
- **D2 (ball letters):** a ball may carry `color: red | black`. It is shown by its letter, R or N (rouge / noire, as on the French paper), numbered within its colour (R₁…R₄, N₁…N₆). VoiceOver reads «كورة حمراء 1» / «كورة كحلة 2». Events still read `value` (red = 1, black = 0; `count_value(1)` = number of reds). The engine checks that a colour is on every ball or on none, and that each colour has its own value. The fill is secondary:
  - Red `#9c4221`: white letter 6.53:1, 5.98:1 on paper. Its hue is ≥ 20° from every error / wrong-answer red (26° from red pencil), and it is not equal to the unused `critical600` or the data colour `series5`.
  - Black `#22252b`: 15.36:1.
  - A drawn coloured ball keeps its fill, lifts, and gets the pen ring and the check mark.
  - Balls without a colour take the old code path. Proof: 14 screens (Ex 2 lessons 1.b and 2.a, A.1, picker, «الورقة», paper screen, every probability demo) are pixel-identical before and after E2 on the 390 pt simulator.
- **D3 (cap):** only `Urn` in display mode is exempt from the 60-draw cap. It lists no draws; the urn and the draw are still checked. `Urn` select mode, `OutcomeSpace` and `LawChart` from an urn stay capped (tests on the 120-draw urn).
- **E1:** a new wrong procedure, `with_replacement` (each ball put back before the next). It gives 1000, 54/125 and 27/125 on this urn.
- **E3:** `LawChart.law.of` (a value function). The schema recomputes every row from the urn and rejects any disagreement. In content, the loader requires `of` on every `LawChart` that gives a `law`, also inside containers. The AI path still only sums to 1 when `of` is absent (unchanged; noted here).
- **E5:**
  - `section` on exercises (`mathematiques` / `sciences-experimentales`). It shows as an outline tag on the picker card (رياضيات / علوم تجريبية) and as «Maths» / «Sc. exp.» in the lesson and «الورقة» subtitles. Ex 2 and Ex 4 are marked `mathematiques`.
  - `partLabel("1")` is "1" (it was ".1").
  - `findPart` accepts `exerciseId/partId`, e.g. `-devPart bac2022c-sc-ex2/1`.
  - Debug-only `-devThen type:720,notSure` plays once after `answerAll` stops at `-devUntil`.
  - The replay tool registers the new exercise.
- **Change 1 (a valid ordered method is never marked wrong):**
  - 720 at step a shows an authored line: the method is correct, but each group of three is counted 6 times (3 × 2 × 1).
  - 360 at step b says the same.
  - At step c, 360/720 is accepted (an equivalent fraction; test), and the step after it shows the ordered computation 360/720 = 1/2.
  - The write-up has a «Variante (tirages ordonnés)» line, and the chip «ونجّم نعدّ بالترتيب؟» ("can I count in order?") explains the condition (order on both sides).
  - **Open:** the 720 line sits in the standard wrong-answer note (red pencil, «!»), because the step asks for the simultaneous count. Should a value that comes from a valid method get a neutral tone instead (a new `tone` on authored wrong answers)?
- **Content choices to confirm:**
  - The goal reads «Montrer que P(A) = 1/2» (engine value). The paper wording keeps «0.5» verbatim, and a test checks 1/2 = 0.5.
  - Binomial notation is `\binom{10}{3}` in hints and C(10,3) in the write-up, as in Ex 2. Tunisian textbooks write C₁₀³: which one should the app use?

**Teacher review: must-review** (on the main path, or shown after a wrong answer):
1. Words and tags:
   - «كورة حمراء N», «كورة كحلة N» (VoiceOver).
   - The letters R / N.
   - The title «تمرين الكور الحمر والكحل».
   - The section tags «رياضيات», «علوم تجريبية»; the subtitles «Maths», «Sc. exp.».
2. Question 1 main path (`1/s1`–`1/s9`, 37 Arabic strings):
   - The intro and the comparison labels: «نجبدو الزوز مع بعض» ("we draw both together"), «وحدة بوحدة، ونرجّعو الكورة» ("one by one, putting the ball back"), and the insight.
   - The «كيفاش نجبدو» choice ("how do we draw?") with its 3 options and 2 feedbacks.
   - The 3 typed prompts, their 9 hints and 6 walk-through lines.
   - The 720 and 360 lines (change 1).
   - The ordered-alternative sentence.
3. The 14 misconception lines (`feedback` + `feedbackConfirmed`, 28 strings), shown on a first wrong answer anywhere.
4. The French write-up (4 lines, including the «Variante» line): exam-paper writing.

**Teacher review: nice-to-have** (detours, optional, or never shown as text):
1. The 3 deep dives (10 strings, minis included).
2. The 4 simpler twins and 2 transfers (16 strings).
3. The 3 ask chips (6 strings).
4. `solutionPhrases` (AI answer guard only; wrong phrasing only weakens the guard).
5. Misconception `description` / `signature` (English, internal).
