# Feedback, reports, and trust

100% correctness is not achievable, even after teacher review (content, AI answers, visuals, and our own engine can all have bugs). The app must make errors **easy to report, easy to reproduce, and visibly honest about confidence.**

## Report button
- Present on **every block**: tutor text, math, component, feedback, AI answer, quiz item. One tap opens a small sheet.
- Reasons (one tap): wrong math / unclear explanation / bad Arabic or French wording / visual or interaction bug / other (+ optional text).
- Automatically attached (no student effort): `blockId`, `contentVersion`, `exerciseId`, `questionId`, `stepId`, component props and `getStateSnapshot()`, the student's last events, app version, device, locale, and for AI answers the planner input/output ids.
- After sending: a kind confirmation and the student continues. No lecture, no friction.
```ts
type ReportEvent = BaseEvent & { t: "report"; blockId: string; contentVersion: string; reason: "wrong_math"|"unclear"|"wording"|"bug"|"other"; text?: string;
  snapshot?: Record<string, unknown>; source: "lesson"|"ai"|"component" };
```

## Quarantine and review
- N independent reports on a block (N configurable, start small) -> mark the block `under_review`: show a softer label, or hide it for new students until checked.
- AI-generated blocks that get reports are also flagged in the planner log so prompts can be fixed.
- A teacher review queue (can be a simple web page or exported file at first): shows the block, the reports, the snapshot, and lets the teacher mark: correct / fix / remove. Fixes bump `contentVersion`.
- Reports about a **wrong engine answer** are high priority: they may affect many students.

## Trust labels (honest, not "100% verified")
- `lesson_reviewed`: "من الدرس (راجعو أستاذ)" — teacher reviewed, still reportable.
- `lesson_unreviewed`: draft content, shown only in internal/test builds.
- `ai_generated`: "مولّد بالذكاء الاصطناعي، ممكن يكون فيه غلط".
- `engine_computed`: numbers computed by code; still covered by tests.
Never use wording that promises everything is correct.

## Prevent errors before students see them
- Engine tests recompute every numeric claim in content (CI fails on mismatch).
- Content validation: schema + "answers must come from engine calls".
- AI outputs: schema validation, no numbers not recomputed by the engine, pedagogical constraints enforced in code.
- Replay harness catches planner regressions.
- Known upstream errors (for example the V(X)=8,9 typo in the official correction) are recorded in the exercise docs.

## Metrics
Reports per 1,000 block views by block, content version, and source (lesson/AI/component); time to resolution; reports that turn out to be false (also useful: tells us what confuses students).

## Privacy
Reports contain learning context from minors: keep identifiers pseudonymous, minimize free text, set retention limits, and check Tunisian legal requirements (needs legal advice; not verified here).
