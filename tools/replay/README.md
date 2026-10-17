# tools/replay — replay harness (Phase 3)

Runs the rules planner at every decision point of a logged session and compares
it with labels. Logic in `lib.ts` (tested in `lib.test.ts`), CLI in `cli.ts`.

```sh
# Prototype log -> current format (+ a .unknowns.json sidecar listing what the old log lacks)
npm run replay -- convert docs/samples/ex2_session_1.jsonl \
  --map docs/samples/legacy_step_map.json --out docs/samples/ex2_session_1.converted.jsonl

# One row per decision point: step, what happened, state, rule, action, representation
npm run replay -- table docs/samples/ex2_session_1.converted.jsonl

# Planner vs labels (agree / partial / disagree / missing)
npm run replay -- agree docs/samples/ex2_session_1.converted.jsonl docs/samples/ex2_session_1.labels.json
```

- Input logs: the CURRENT JSONL format (`EventLog.toJsonl()`, one `EventSchema` event per line). Invalid lines are reported and skipped.
- Legacy conversion: the step map (`legacy_step_map.json`) is a GUESS. Missing fields are never invented: answer values are `null`, durations absent, and every gap is listed in the sidecar. Old `transfer_ok` (a mini question answered right) becomes a mini answer, never a `transfer`.
- Replay is offline: later points still contain what the prototype did, not what the planner would have done (no counterfactual simulation). When a log contains `plan` events, the "logged" column shows the app's own decision.
- Labels (`docs/samples/*.labels.json`): `{ source, teacherReviewed, log, excluded?, points: [{ row, at: { step, trigger, occurrence }, preferred: { kinds, representations? }, note? }] }`. `ex2_session_1.labels.json` is a TRANSCRIPTION of `ex2_session_1_expected_planner.md`, not teacher labels; the output says so.
