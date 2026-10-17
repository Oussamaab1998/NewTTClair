# Architecture and UX decisions

## Pedagogy principles
- Confusion is a normal starting point. "I don't know" is a valid, calm answer, never a failure.
- Diagnose the **lowest missing idea**, repair it briefly, return to the question.
- Worked example -> partially completed -> alone (fading). Always one transfer question before marking a gap "closed".
- Teach reusable habits: rename what scares you; try a simple number; look for a known shape; check the result makes sense.
- Exams grade the written solution: every exercise ends with "how to write it on paper" (French).
- Reading is not understanding: students produce something on every screen.

## Lesson UX (decided after prototypes)
**Vertical, conversation-style feed**, not pinned strips, not a docked keyboard:
- Tutor blocks (text, math, visuals) append downward. The student's answers appear as bubbles. Feedback appears as colored blocks.
- Every question: options + a dashed **"ما نعرفش"** button (+ hint ladder). "ما نعرفش" appends a **deep dive** inline (explanation + example + mini question), then the original question is shown again below it ("نرجعو للسؤال ↓"). Max nesting depth: 3.
- **Long-press any text** (~450 ms) opens a menu: اشرحلي / علاش؟ / مثال. The quoted text becomes a student bubble; the answer is appended inline. Answers come from verified content first ("من الدرس"), else AI.
- A visible **free-text ask field** should also exist (prototype 3 removed it and the experience felt lifeless).
- **Interactive visuals sit next to the question they help with**, not far above it. Predict -> interact -> insight sentence -> question.
- **Line-by-line writing** with a keyboard inside the feed (not docked): each line is checked against the previous line (equivalence), not only against the final answer. Errors are localized ("the error is in the denominator").
- **Skip path** per question: "خطوة خطوة" or "نعرفها، نجرّب وحدي". Correct = skip guided steps (still log it); wrong = continue guided with a calm message. Never lock anyone out. Adaptive offers ("تحب نختصرو؟") are opt-in.
- After a correct answer, occasionally ask "فهمت علاش؟ / خمّنت" (understood / guessed). This separates understanding from lucky guesses.
- Previous steps stay on screen (scroll up). A "back to current question" button appears when scrolled away.
- Some exam rules are taught explicitly: you may *admit* a result you could not prove and continue ("résultats acquis" drawer with "نسلّم بيها").

## What failed in prototype 3 (probability) and what we learned
(see `docs/samples/ex2_session_1_expected_planner.md`)
- Feedback was a fixed message per wrong option: no diagnosis. Students reached right answers by elimination.
- The same deep dive was shown twice in the same form when it had not worked the first time.
- Visual was far from the question; no visual at all for several questions.
- Questions were badly worded (what is P of?) and mixed digits with Arabic.
- No free ask field. Log lacked chosen option, time, and visual usage.
- A mini-question success was mislabeled `transfer_ok`.

## Data flow
```
student actions
  -> events (DATA.md)
  -> student state: skills, misconceptions, representations tried
  -> planner: rules first, LLM when rules cannot decide (PLANNER.md)
  -> action = { component | content blocks, params }   (schema-validated)
  -> lesson renderer shows prebuilt components (COMPONENTS_*.md)
  -> student acts -> new events
```
Verified content (JSON) is ground truth. The LLM chooses *what to show next* and phrases explanations; the engine computes every value.

## Proposed structure
```
src/
  engine/        math + probability + analysis, safe expression parser, answer checking
  content/       exercise JSON + zod schemas + loader
  lesson/        feed renderer, block components, deep-dive stack, long-press menu
  components/    probability/  analysis/  shared/   (registry in components/index.ts)
  planner/       rules.ts  llmClient.ts  validate.ts  fallback.ts
  telemetry/     events.ts  storage.ts
  i18n/          ar-TN.json  fr.json
  app/           navigation, screens
server/          LLM proxy (separate package)
tools/           replay harness (CLI)
```
