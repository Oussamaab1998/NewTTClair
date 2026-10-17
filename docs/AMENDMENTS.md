# Amendments to the existing docs (apply before Phase 1a)

Only the first group is blocking for Phase 1a (schemas and engine). The rest can follow in parallel.

## A. Blocking for Phase 1a (schemas, engine layout)
1. **DATA.md, content schema:** every block and step gets `blockId` (stable) and trust metadata:
```ts
interface Trust { reviewed: boolean; reviewedBy?: string; reviewedAt?: string; contentVersion: string; source: "authored"|"ai_generated"|"engine"; status: "ok"|"under_review" }
```
   Add `contentVersion` to Exercise. Add `Trust` to Block, Step, Misconception, DeepDive.
2. **DATA.md, events:** add `report` event (see FEEDBACK_AND_TRUST.md); add optional `snapshot` to `ask` events; add `example_round` event `{ templateId, round, outcome }`; add `reaction` metadata on planner-driven actions (`reactionId`, `representation`).
3. **COMPONENTS_CONTRACT.md:** every component implements `getStateSnapshot(): Record<string, unknown>`; add generic primitives to `ComponentName` (see COMPONENT_CATALOG.md); every rendered block is `reportable`.
4. **Engine layout:** create `src/engine/expression/` complex-ready (symbol `i`), plus empty module stubs `analysis.ts`, `sequences.ts`, `complex.ts` with TODO tests listed from CHAPTERS.md. Only `probability.ts` is implemented in 1a.
5. **State:** `SkillState.representationsTried` and reaction history must be stored from day one (the planner depends on them).

## B. Roadmap changes
- Phase 1b: add a Report button on every block and a local report queue (export to file).
- Phase 2: add the generic primitives (`PredictReveal`, `CompareTwo`, `ExampleGenerator`, `NumericTwin`, `StepThrough`) early; they multiply the value of every chapter.
- Phase 4: add a **tutor drawer** (free chat grounded on the exercise, verified solution, student state and component snapshots) as a fallback for anything the structured lesson does not cover.
- Chapters order after Exercise 2 and 4: decided with a teacher ranking (see CHAPTERS.md).

## C. CLAUDE.md additions (hard rules)
- Every block has `blockId`, `contentVersion`, and trust metadata, and a Report button.
- Reactions are state-dependent (attempts, representations tried, time, component state), never one fixed message per wrong option; a failed explanation is never repeated in the same form (see TUTOR_BEHAVIOR.md).
- Components expose `getStateSnapshot()`; ask and long-press send it with the question.
- Do not label content "verified" without teacher review; use the trust labels from FEEDBACK_AND_TRUST.md.

## D. Updated Prompt 2 (replace the earlier one)
```
Implement the engine and schemas for Phase 1a (docs/ROADMAP.md, with docs/AMENDMENTS.md section A applied).
Scope:
- src/engine/probability.ts as in docs/COMPONENTS_PROBABILITY.md.
- src/engine/expression/: a safe expression parser (no eval, no new Function), equivalence by numeric samples, designed so the imaginary symbol i can be added later without a rewrite. Document its limits.
- Empty stubs for analysis.ts, sequences.ts, complex.ts with a TODO test list from docs/CHAPTERS.md.
- zod schemas: content (with blockId + Trust metadata), events (incl. report, example_round, ask snapshot), ComponentSpec (incl. getStateSnapshot in the contract types), PlannerOutput.
Tests must cover the Exercise 2 facts: 10 outcomes, P(A)=1/10, P(B)=7/10, law of X, E(X)=-1/10, V(X)=89/100, n=8.
Show me the plan and test list first. Do not touch UI.
Done when: tests pass, the parser rejects non-math input, and a content file without blockId or trust metadata fails validation.
```
