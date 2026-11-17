# tools/tutor-harness — AI tutor harness

Runs the app's own AI code (`src/ai`, `src/hybrid`) from the command line. Entry point `cli.ts`; outputs go to `tools/tutor-harness/out/` (gitignored). Exercises are looked up in the app's catalog (`src/app/exercises.ts`); the default is `bac2022c-sc-ex2`.

Key: `CLAUDE_API_KEY` from the shell, else `.env.llm.local`. It is never printed.

| Command                                             | Cost     | What it does                                                                                                            |
| --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run tutor -- pack [exercise]`                  | free     | Prints the prompt sizes and the exercise pack of the AI-led chat.                                                       |
| `npm run tutor -- conduct --script owner-q1`        | free     | Hybrid conductor dry run: a scripted student, no AI; each act is tagged with the tier that would answer (`conduct.ts`). |
| `npm run tutor -- moves --script tree-t2 --dry`     | free     | The same script against the real mover, everything except the network call (`moves.ts`).                                |
| `npm run tutor -- moves --script tree-t2 --cap 1`   | **PAID** | The same, with the model calls.                                                                                         |
| `npm run tutor -- run --question 1 --persona owner` | **PAID** | The AI-led chat against a simulated student (`cli.ts`).                                                                 |

## `moves`: a script against the one-move AI of the hybrid lesson

```sh
# Free: what would be sent, and an estimate of the cost.
npm run tutor -- moves --exercise bac2022p-sc-ex2 --question t2 --script tree-t2 --dry

# PAID: real calls, stopped by the cap.
npm run tutor -- moves --exercise bac2022p-sc-ex2 --question t2 --script tree-t2 --cap 1
```

The script's acts are played through the conductor (as `conduct` does). Every act that is not instant goes to the real mover, built as the app builds it (`src/hybrid/live.ts`: an allowance, `createMover`, `routeCall`). For each act the transcript shows the tier and its reason, the prepared reply (and the reply template with his numbers, when one fills), each model call with its tokens and cost, the reasons of a refused move, and the AI move or why there is none. Output: `out/moves-<script>-<time>.md`.

Options:

- `--script <name | file.json>`: a file of `scripts/` by name, or a path. Required.
- `--exercise <id>`, `--question <id>`: default to the script's own `exercise` and `question`.
- `--cap <usd>`: the most the run may spend. Default **1**.
- `--dry`: no network call at all. Each call that would be made is listed with its size, its worst case and an estimate (the first call of a model writes the cache, the next ones read it; one call per hard moment, so a retry or a compute hop of a real run is not counted).
- `--allowance open | app`: `open` (default) lets every hard moment have its call, the cap being the only limit. `app` keeps the app's own limits (`src/hybrid/allowance.ts`: per day, and per question 10 light calls, 2 deep calls, $0.04), to see what one student really gets.

### Cost warning

`moves` without `--dry` spends real money: each hard moment is one to four model calls (a refused move is retried once, a deep move may compute first, the light tier may hand over to the deep one). Run it with `--dry` first.

The cap is a hard gate around the transport (`cappedTransport`): before each call its **worst case** (every prompt token at the dearest input rate, the whole output budget) must fit under what is left; the first call that does not fit is **not made** and the run stops there. The real cost is added after each call; a call that timed out counts its worst case, since it may have been billed. So a run can stop a little before the cap, never after it. A deep call's worst case is about $0.10: with less than that left, no deep call is made.

### Scripts

A script is `{ exercise, question, about, acts, expect? }`; `acts` are the student's acts as the app records them (`StudentAct` in `src/ai/checks/autoCheck.ts`): `continue`, `line`, `free`, `dont_know`, `choice`, `order`, `tap_word`. `expect` says what each act is meant to trigger.

- `owner-q1`: the owner's Question 1 session of the urn exercise.
- `tree-t1` … `tree-t4`: the four questions of `bac2022p-sc-ex2` (probability tree). Each one starts with the trip (`continue`), then reaches the moments the AI is called for: a known slip repeated, a trap (a wrong road that lands on the right value), a line nobody expects, «ما نعرفش» twice, a typed question in Arabizi. Their lines are checked with the engine on the exam's numbers in `moves.test.ts` (a slip is that slip, a credit is a credit); a line that changes must change its `expect` entry.

The four tree scripts together are about 15 hard moments.
