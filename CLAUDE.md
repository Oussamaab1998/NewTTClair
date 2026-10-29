# Tteclair — project instructions for Claude Code

## What we are building
A mobile app (bare React Native, new project) that helps Tunisian baccalauréat students (Section Mathématiques) **understand** math exercises, step by step, including students who are struggling. The experience is a vertical, conversation-style lesson: tutor blocks, interactive visuals, questions with options, an "I don't know" button that opens a deeper explanation, long-press on any text to ask, and line-by-line writing. An AI planner chooses the next best step for each student **from a menu of prebuilt components**.

Read before coding: `docs/ARCHITECTURE.md`, `docs/DATA.md`, `docs/COMPONENTS_CONTRACT.md`, `docs/PLANNER.md`, `docs/ROADMAP.md`.

## Languages (important)
- Exams are in **French**. Explanations are in **Tunisian Arabic (derja)**, with **French math terms kept in French** (domaine, limite, paire, au moins un, simultané, tableau de variation).
- Exam-paper writing examples are always in French.
- UI text lives in i18n files (`ar-TN`, `fr`). Never hardcode strings in components.
- All Arabic text must be reviewed by a Tunisian math teacher before release. Mark unreviewed content `reviewed: false`.

## RTL / LTR rules (we already hit these bugs in prototypes)
- Math is ALWAYS rendered as its own block, left-to-right, never inline inside an Arabic sentence.
- Arabic sentences must not contain Latin/French words in the middle unless isolated (use separate `<Text>` runs with `writingDirection: 'ltr'` or Unicode isolates U+2066 ... U+2069). Test on iOS AND Android; isolation behavior differs. (Needs device verification.)
- Digits and formulas never share a line with Arabic words.
- Do not rely on color alone; add shape/text.

## Hard rules
1. **Correctness is computed, never generated.** All numeric answers, probabilities, derivatives, limits come from `src/engine`. The LLM never decides if an answer is right and never produces math values shown as facts.
2. **No `eval` / `new Function` on student input.** Use a safe expression parser (e.g. mathjs restricted scope or our own grammar). Prototypes used `new Function`; production must not.
3. **No API keys in the app.** LLM calls go through our backend proxy only.
4. **Components are chosen from the registry** (`docs/COMPONENTS_CONTRACT.md`). JSON content and AI output reference components by name + validated props. Unknown components or invalid props -> fallback, never crash.
5. **Every interaction emits an event** (`docs/DATA.md`). If it is not logged, the planner cannot use it.
6. **Never show the full answer before the hint ladder is used** (max 3 levels), unless the student explicitly reaches the end of the ladder.
7. **A student must act on every screen** (tap, choose, type, drag). No wall-of-text screens.
8. Minors' data: store skill IDs and minimal text; no personal details in prompts. Check Tunisian rules before launch (unknown, needs legal advice).

## Stack (installed in Phase 0; open choices in `docs/DECISIONS.md`)
Bare React Native 0.88 + TypeScript (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`), `react-native-svg`, `react-native-reanimated` 4 (+ `react-native-worklets`), `react-native-gesture-handler` 3, `zod` 4, `i18next`/`react-i18next`, `react-native-webview` + `katex` (math renderer spike), Jest + React Native Testing Library 14. Versions are pinned exactly. Reanimated and worklets are installed but no component uses them yet (sliders are stepped `PanResponder` + state, DECISIONS D36). Storage (SQLite vs MMKV) and math renderer: Proposed in DECISIONS.md, not final.

## Performance targets (to be measured, not assumed)
Many users have cheap Android phones. Interactive visuals should stay smooth while dragging a slider; precompute curve points; avoid re-rendering the whole lesson feed on each drag tick. Measure on a low-end Android device early.

## How to work with me
- Work in small tasks. Before large changes, show a short plan.
- Each component: props schema (zod), events, a readonly/replay mode, unit tests for engine logic, a storybook-like demo screen.
- Do not copy the official correction text verbatim; write our own explanations.
- Official-correction typos exist (see `docs/exercises/EX2_PROBABILITY.md`). Verify with the engine.
- If a requirement is unclear, ask one precise question.

## Commands
- Install: `npm ci` then `npm run pods` (CocoaPods via Bundler)
- Dev server: `npm start` (after changing `babel.config.js` or native deps: `npx react-native start --reset-cache`)
- iOS: `npm run ios` (or `npx react-native run-ios --simulator "iPhone 17 Pro"`)
- Android: `npm run android` (deferred: we test on iOS only for now)
- All checks: `npm run check` (= `lint` + `typecheck` + `test`)
- Single steps: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:watch`
- Regenerate KaTeX CSS after upgrading `katex`: `npm run build:katex-css`
- Replay harness: `npm run replay -- table|convert|agree ...` (see `tools/replay/README.md`)

Gotchas: RN Testing Library 14 `render`/`fireEvent` are async (`await` them). Write bidi controls and special spaces as `\u` escapes, never literal characters (a test enforces it).
