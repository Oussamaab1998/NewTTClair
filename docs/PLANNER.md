# Adaptive planner (AI + rules over verified content)

The planner answers one question: **"given this student's behavior so far, what should we show next?"** It chooses from the component menu and from verified content, never from scratch.

## Layers
1. **Rules planner (no LLM, instant, free).** `src/planner/rules.ts` (Phase 3). Every decision carries a rule id (`RULES` in rules.ts); thresholds live in `src/state/config.ts` (untuned guesses). It chooses only from authored content: the step's deep dive, `variants` (alternatives, transfer variants, simpler twins, prerequisites), hints, and the results a question uses.
   - 1st wrong: the authored option feedback, plus a numeric check with the student's own value (`check` on the step), plus an optional repair offer when the misconception has a `repairComponent` with an authored alternative (`rule.first_wrong.*`).
   - 2nd wrong: change representation and require an action (deep dive if not tried, else an untried alternative); never the same options unchanged. Prefers an alternative for the misconception's skill when the deep dive teaches another skill (`rule.second_wrong`).
   - **3rd struggle signal on a step (wrong answers + "not sure" counted together), or "not sure" twice: `ask_clarify`** (counting / why / link to the previous result). After it: simpler twin, then prerequisite, then a teacher note (`rule.struggle_*`). "Not sure" stays out of the skill's wrong-answer evidence.
   - "Not sure": the step's deep dive (text, or text + one interactive component); same deep dive requested again, or one that did not help (mini wrong first; task mini revealed or 2 wrong tries): a different representation (`rule.deep_dive_repeat`, `rule.deep_dive_failed`). A deep dive the student left with "back" just re-asks the question.
   - Correct after help, or suspiciously fast/slow: a self-report (max 1 per question, 2 per session), then a transfer variant (`rule.correct_after_help`, `rule.odd_timing`, `rule.transfer_*`). "Not now" (dismissed): no transfer that time (`rule.self_report_dismissed`), no evidence.
   - 3 clean answers in a row with a stronger signal (one typed / task answer, or "understood"): opt-in offer to compress (skip explanation blocks until the next struggle).
   - Buttons: "غيّر الطريقة" -> a representation not yet tried for the skill; "حاجة أسهل" -> one prerequisite level down via `src/content/skillMap.json` (max 2), then back to the question.
   - Mini-example loop: simpler twins in round order, max 3 rounds (`example_round` events), then the prerequisite or "save a note for my teacher".
   - No rule applies: the next authored step (`rule.next_step`).
2. **LLM planner (backend proxy).** Used when rules cannot diagnose: free-text answers, unusual mistakes, typed questions, long-press asks not covered by verified content, repeated failure after rule actions.
3. **Deterministic fallback.** If the LLM times out, errors, or returns invalid output -> rules result or the next authored step.

## Input: context pack (keep small; cache the static part)
```json
{
  "locale": "ar-TN",
  "exercise": { "id": "bac2022c-ex2", "statement": "...", "question": "2a", "goal": "law of X" },
  "step": { "id": "q6", "prompt": "P(X = 0) = ?", "expectedAnswerHash": "...", "skills": ["event-counting","product-zero"], "hintsShown": 1 },
  "verifiedSolution": ["...teacher-checked steps..."],
  "history": [ { "t": "answer", "stepId": "q6", "value": "1/10", "correct": false, "misconceptionId": "counts_one_pair", "durationMs": 21000 }, ... ],
  "studentState": { "skills": { "event-counting": { "status": "gap", "representationsTried": ["text"] } } },
  "request": { "type": "step_failed" | "ask" | "free_text", "text": "..." },
  "menu": [ { "component": "EventPicker", "teaches": ["event-counting"], "requiredProps": ["balls","draw","k","event"] } ],
  "constraints": ["no final answer before hint level 3", "student must act", "avoid representations already tried: text"]
}
```
Do NOT include names or personal data.

## Output (validated with zod before use)
```ts
interface PlannerOutput {
  diagnosis: { skillIds: string[]; misconceptionIds: string[]; confidence: number; summary: string /* dev-only */ };
  avoid: string[];                         // representations/components not to repeat
  next: Action; followUp?: Action;
}
type Action =
 | { kind: "show_component"; component: ComponentSpec; instruction: Rich }
 | { kind: "explain"; blocks: Block[] }                    // short, one idea, formulas in math blocks
 | { kind: "example"; variantId?: string; blocks: Block[] }
 | { kind: "quiz"; question: Question }
 | { kind: "hint"; level: 1|2|3 }
 | { kind: "ask_clarify"; options: Rich[] }
 | { kind: "revisit_prerequisite"; skillId: string }
 | { kind: "compress_steps" };
```
Example for the second wrong answer on P(X=0):
```json
{ "diagnosis": { "skillIds": ["event-counting"], "misconceptionIds": ["counts_one_pair"], "confidence": 0.7,
    "summary": "links 'product is 0' to counting pairs: not made" },
  "avoid": ["text:prod0"],
  "next": { "kind": "show_component",
    "component": { "component": "EventPicker", "props": { "balls": [-1,0,0,1,2], "draw": "simultaneous", "k": 2,
      "valueFn": "product", "event": { "id": "value_eq", "args": { "value": 0 } }, "reveal": "live", "showFraction": true } },
    "instruction": { "ar": "اضغط على كل الأزواج اللي جداؤها 0", "fr": "Touche toutes les paires dont le produit est 0" } },
  "followUp": { "kind": "quiz", "question": "restate the fraction P(X=0)" } }
```

## Safeguards
- Schema-validate every output; reject unknown components, bad props, or blocks containing numbers not from the engine.
- The engine recomputes any value shown; the LLM only phrases or chooses.
- Pedagogical constraints are enforced by code after the model answers (e.g. strip final answers before hint level 3).
- One idea per message; require a student action; short.
- Timeouts (target value to be measured), retries off by default, fallback always available.
- API key only on the backend proxy. Rate-limit per student/day. Log requests without personal data.
- Show diagnoses to the student humbly ("looks like...") and let them correct them.

## Prompt skeleton (system)
- Role: patient math tutor for Tunisian bac students; you choose the next step for this student.
- Output only JSON matching the schema. Reply language per `locale`: Tunisian Arabic with French math terms; formulas only in math blocks.
- Use only `verifiedSolution` as ground truth; if unsure, choose `ask_clarify`.
- Never reveal the final answer before hint level 3; never repeat representations listed in `avoid`.
- Prefer showing a component the student can act on over more text.

## Measurement plan (do this before trusting it)
- **Replay harness** (`tools/replay`, built in Phase 3): feed logged sessions (see `docs/samples/`) through the planner at each decision point; print a table; compare with a labels file (`docs/samples/*.labels.json`, a teacher's preferred action per point) and report agreement. The only labels so far are a transcription of `ex2_session_1_expected_planner.md`, not teacher labels.
- Track per call: latency, input/output tokens, cost, fallback rate, invalid-output rate. Compute cost per student session from real pilot data. (No numbers assumed here.)
- Compare rules-only vs rules+LLM on the same logs.
- Check darija quality of generated explanations with a teacher.
- Watch for wrong diagnoses; keep a "this is wrong" button and review those logs.
