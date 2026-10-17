# Roadmap: new bare React Native project, vertical slice first

Goal of the slice: prove the loop **events -> student state -> planner -> prebuilt components** works on a real phone with a real student, and measure cost and latency. Content scope: **Exercise 2 (1.b and 2.a)** for probability, then **Exercise 4 A1-A3** for analysis. No time estimates here: they depend on your pace and existing code.

## Phase 0 — Bootstrap and decisions
- Bare RN project, TypeScript strict, lint, tests, CI basics. Folder structure per ARCHITECTURE.md.
- Dependencies (confirm): react-native-svg, reanimated, gesture-handler, zod, a safe math expression approach, local storage choice.
- **Decide and record** (docs/DECISIONS.md): math renderer (WebView KaTeX vs native vs limited custom), storage (SQLite vs MMKV), backend proxy hosting, LLM provider/model for routing vs explanation, i18n approach, how RTL/LTR isolation is done on both platforms.
- Done when: app runs on iOS simulator and a **cheap Android device**; a screen renders a mixed Arabic/French sentence plus a math block correctly on both.

## Phase 1 — Engine + content + lesson skeleton
- `src/engine/probability.ts` with all tests from COMPONENTS_PROBABILITY.md (including V(X)=89/100 and n=8).
- zod schemas for content, events, planner output. Content loader.
- Lesson feed renderer: tutor_text, math, student_bubble, feedback, OptionsQuestion, NumericKeypad, deep dive stack, long-press menu, AskField.
- Done when: Exercise 2 question 1.b plays end-to-end from JSON with no AI, and every interaction writes an event.

## Phase 2 — Probability components
- `Urn`, `OutcomeSpace`, `EventPicker`, `ComplementView`, `LawBuilder`, `LawChart` (then `BinomialExplorer`).
- Component demo screen; replay mode; performance check on the cheap Android device.
- Done when: 2.a is playable by tapping outcomes and filling the law; events contain selected/correct ids.

## Phase 3 — Telemetry, student state, rules planner, replay harness
- Event store, derived skill state, misconception tracking, rules from PLANNER.md.
- `tools/replay` CLI reading `docs/samples/*.jsonl` -> decision table.
- Done when: the table for `ex2_session_1` matches a teacher's preferences in most decision points (agree the bar with the teacher).

## Phase 4 — LLM planner via backend proxy
- Proxy with auth, rate limits, no personal data; context pack builder; output validation; fallback.
- Measure: latency, tokens, cost per session, invalid-output rate, fallback rate, darija quality.
- Done when: rules+LLM vs rules-only is compared on the logs and on a few real sessions.

## Phase 5 — Analysis components and Exercise 4 A1-A3
- `FunctionPlot`, `PointOnCurve`, `FoldSymmetry`, `LimitExplorer`, `SecantToTangent`, `TangentSlope`, `VariationTableBuilder`, then B/C components.
- Typed line-by-line input with equivalence checking and a structured math keyboard (fraction/exponent templates).
- Done when: A1-A3 flows include visuals next to questions, deep dives, skip path, writeup step.

## Phase 6 — Student test
- 5-10 students on cheap phones, teachers reviewing content. Collect: where they hesitate, which components help, ask usage, cost per session.

## Content quality gates
- Teacher reviews all Arabic and French; mark `reviewed`.
- Every numeric answer comes from engine tests; check against the official correction but do not trust it blindly (typo in EX2 V(X)).
- Do not copy the official correction text; write our own.

## Open questions
- Exact thresholds for "gap/recovering/closed" (need real data).
- Long-press vs OS text selection behavior on real devices.
- Legal requirements for minors' learning data in Tunisia (ask a lawyer).
- Payment methods and pricing are outside this repo for now.
- Voice (STT) is a later phase; keep input components ready for a "dictate a draft, confirm rendered formula" pattern.
