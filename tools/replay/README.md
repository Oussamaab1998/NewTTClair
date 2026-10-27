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

## Reports (Phase 4)

`npm run replay -- reports <queue.jsonl>` prints an exported report / question queue (the app's dev-only "تصدير" button shares it as JSONL through the share sheet): one row per entry (time, content version and step, block, source, reason, text, whether a component snapshot is attached, how many recent events are attached, device), then counts by reason and source. Lines that do not parse are listed, not fatal.

## Output guard (Phase 4)

`npm run replay -- guard` runs the hand-written planner answers in `src/planner/llm/fixtures/guardFixtures.ts` (valid and invalid) through the same pipeline as live answers (schema, content, guard) and prints one row per fixture, the rejection rate, and the rejection reasons (to tune the number allowlist and limits).

## AI tutor v2 evaluation (D26)

```sh
npm run replay -- eval --estimate                       # free: Anthropic token counts, no generation
npm run replay -- eval --live --cap-usd 5               # paid; the first run is capped at $5
npm run replay -- eval --live --cap-usd 5 --models claude-haiku-5-5,gpt-6-luna --no-log
npm run replay -- eval --live --cap-usd 0.25 --models claude-haiku-5-5 --timeout-ms 15000   # eval-only call limit (default 30 s); the app keeps 3.5 s
npm run replay -- phrases                               # free, offline: steps with a final answer and their solution phrases
```

Decision points: the hand-written scenarios in `scenarios/A1.json` (11) and `scenarios/2a.json` (10), played through the real reducer and rules (`teacherReviewed: false`), plus the points of `docs/samples/ex2_session_1.converted.jsonl` where the normal triggers ask. Each point is sent twice per model (cold, then warm cache). No retries; a 429, no credit, auth or a failed model check stops that model; the run cap stops everything (worst case reserved before each call, ledger in `out/spend.json`). Keys from the shell or `.env.llm.local`, never printed. Outputs in `out/` (gitignored): `eval-<time>.md` (valid rate, usable at 3.5 s, rejection reasons, latency, cost cold vs warm, an empty darija column), `.jsonl` (every call, raw outputs for local review), `.review.md` (12 sampled points side by side with a score line).
