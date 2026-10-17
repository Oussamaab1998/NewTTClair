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
