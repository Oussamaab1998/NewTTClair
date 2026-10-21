# A1 help-path audit (2026-10-21, content ex4-0.1.0)

What each help button would find for every A1 card that asks something. "Change method" = alternatives + the step's deep dive; "easier" = simpler twins + prerequisite variants reached through `skillMap.json` (`requires`).

| Card | Kind | Change method | Easier | Deep dive |
|---|---|---|---|---|
| **A1/s3** domain symmetric? | choice | **none** | **none** (its skills require nothing) | **none** |
| A1/s8 f(−x) line by line | lines | 2 alternatives + deep dive | 2 simpler twins + 2 prerequisites | exp_product |
| A1/s9 conclusion | choice | 1 alternative + deep dive | 2 prerequisites (no simpler twin) | parity_meaning |
| detour cards (alternatives, transfer, simpler twins, prerequisites, deep-dive minis) | | none (detours of detours are not authored) | some reach prerequisites | none |

**Wrong options without a misconception id:** none (main steps, variants and deep-dive minis). Every A1 misconception has its own message.

**Where the generic «موش هكا. عاود ثبّت.» came from:** the misconception message was shown only on a card's first wrong attempt, so a second, different mistake (s3: «لا: خاطر فيه أعداد سالبة.» then «موش لازم نثبّتو فيه.») fell back to the generic text. Now each misconception's message is shown once per card; a repeated known mistake adds no message (the planner's reaction follows); the generic text is left only for unknown mistakes (none in A1).

**Buttons:** shown only when the planner would answer with authored content (`helpTargets`); "change method" never falls back to a hint; "easier" never answers first with the teacher note.

## Authored to close the gap (A1/s3 only, reviewed: false)
- Alternative `alt-A1-s3-twin` (NumericTwin): try negative values of x in f: f(−3), f(−1) exist, so −x is in the domain whenever x is; then the same question.
- Simpler twin `sim-A1-s3-int-1` (round 1): a concrete interval first: is [−3, 3] symmetric about 0? (then [−3, 5] is not, in the feedback).
- Deep dive `domain_symmetric`: what "symmetric about 0" means for a domain, with the number line idea in words and one mini question with a hint ladder.
