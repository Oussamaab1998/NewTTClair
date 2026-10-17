# Lesson UI components (the feed and its blocks)

These are not "visuals"; they are the building blocks of the vertical lesson. The planner and JSON content can emit them as `blocks`.

## Block types
```ts
type Block =
 | { type: "tutor_text"; text: Rich; id?: string; longPress?: boolean }   // long-press menu: explain / why / example
 | { type: "math"; latex: string }                                       // always LTR, own line
 | { type: "student_bubble"; text: Rich }
 | { type: "feedback"; kind: "success"|"warning"|"danger"|"info"; text: Rich; source?: "lesson"|"ai" }
 | { type: "component"; spec: ComponentSpec }
 | { type: "question"; question: Question }                              // active card at the end of the feed
 | { type: "deep_dive"; id: string; depth: 1|2|3; blocks: Block[] }
 | { type: "recap"; items: Rich[] }
 | { type: "self_report" }                                               // "فهمت علاش؟ / خمّنت"
 | { type: "skip_choice"; groupId: string };                             // guided vs try alone
```

## Interactive pieces
1. **`OptionsQuestion`** — prompt (formulas on their own line), 2-4 options, hint ladder button (0/3), dashed "ما نعرفش". Wrong option -> feedback from the misconception library, then the same question stays active. After 2 wrong attempts the planner must change representation or ask "what is unclear?" (do not just show the same options again).
2. **`TypedMathInput` + `MathKeyboard`** — keyboard lives **inside the feed** (scrolls with content). Keys: digits 0-9, x, e, π, parentheses, + − · ÷, structured fraction template and exponent template (the prototype's `^(` text keys are a stopgap), backspace, clear, check. Renders a live pretty preview. Multi-line notebook: each accepted line stays visible; each new line is checked against the **previous line** (numeric-sample equivalence), the final line against the goal. Feedback localizes the error ("the error is in the denominator") and shows a numeric check ("with x = 1 you have 1.359, expected 0.324"). Auto-balance parentheses; warn about missing parentheses around denominators.
3. **`NumericKeypad`** — for fractions/decimals in probability (digits, `/`, `.`, backspace, clear, check). Accept equivalent forms (1/10 = 0.1).
4. **`OrderingQuestion`** — tap exam-paper lines in the correct order (domaine -> calculation -> conclusion). Later versions: the student writes the conclusion themselves and the app checks required elements.
5. **`DeepDive`** — inline nested block; ends with a mini question; then "نرجعو للسؤال ↓" and the original question reappears. Cap nesting at 3. **If a deep dive was already shown for this skill in this session, the planner must pick a different representation.**
6. **`LongPressMenu`** — 450 ms hold on any `tutor_text`; 8 pt move cancels; options اشرحلي / علاش؟ / مثال; works with a mouse hold for testing. Needs device testing against the OS text-selection menu (unknown behavior; decide whether selection is disabled on lesson text and how copy works). Also support long-press on formulas later.
7. **`AskField`** — always-available free-text field with starter chips ("علاش e²ˣ؟"). Same pipeline as long-press.
8. **`HintLadder`** — 3 levels, each level a different kind of help (nudge, method, partial line). Logs level.
9. **`SkipChoice`** — "📘 خطوة خطوة" / "⚡ نعرفها، نجرّب وحدي" with a probe answer; correct = skip (log), wrong = guided with a calm message; "نرجع للخطوات" always available.
10. **`SelfReport`** — one-tap "فهمت علاش؟ / خمّنت" after some correct answers (not every time). Logs `self_report`.
11. **`ResultsDrawer`** ("résultats acquis") — lists proven results; "نسلّم بيها" marks a result as admitted so later questions can use it (log `admit`).
12. **`ProgressBar`**, **`JumpToCurrent`** (appears when the active question is off-screen).

## Rendering rules
- Arabic paragraphs: `writingDirection: 'rtl'`, right aligned. Math: separate LTR block. Latin/French terms isolated (see CLAUDE.md).
- Never put a question whose meaning depends on a formula inside a sentence: put the formula on its own line (`P(X = −2) = ?`).
- New items append; scroll to the first new item; preserve scroll position on re-render; do not re-render the whole feed on every slider tick.
- Animations minimal; respect reduce-motion.

## Open decisions (record answers in ROADMAP)
Math renderer (WebView KaTeX vs native vs custom limited renderer), long-press vs selection behavior, how the keyboard resizes the feed, how to virtualize a long feed.
