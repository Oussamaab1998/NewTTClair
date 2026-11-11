# Hybrid lesson: fix list

Written for: the product owner and the next coding session. Source: review of four Q1 screenshots of `bac2022c-sc-ex2` (2026-11-02, the student wrote `10` for "all draws", then tapped «ما نعرفش» twice; badge `deep:stuck_again $0.0409`), plus items the owner added the same day (B9, B10, B11). Causes marked "confirmed" were checked in the code; "to confirm" needs the simulator.

**Status 2026-11-10 (not committed; `npm run check` green, 236 suites):**
- **Fixed:** B1, B2, B3, B4, B6, B7, B8, B9, B10, B11, U1, U2, U4.
- **B10:** the owner still could not scroll on the device, so all three sheets (board, «الورقة», method «الطريق») now have the scrim as a sibling behind the sheet instead of a pressable parent, and an explicit `flexShrink: 1` on the body.
- **Not yet swipe-tested on a device.**
- **Free way to see the waiting state:** the new `-devMover slow` launch argument.
- **Still open:** B5, U3, U5–U9, S1–S9.
- **2026-11-11, owner:** the progress strip over the card was removed; «الطريق» has the map, and its segment flashes at «نبداو». This cuts the header height (part of U6). «افتحها من جديد» was removed from «الطريق», so components are not reopened there for now; `board.ts` still computes them.

Each item: what the student sees, the cause, the fix direction. UX items that change a screen get a mockup approved by the owner before they are built.

## A. Bugs

**B1. Typing the small example's right answer throws him off the example.** On the small box (4 balls, draw 2), `6`, `4*3/2=6` or `12/2=6` first matches the main question's "orderings" step (3! = 6). The box closes, the paper heading flips back to «الكل», and he is told his line counts orderings. Cause (confirmed): `src/hybrid/conductor/conductor.ts:586-589` clears `onCase` when the line credits or supports the main question, before the case is checked. Fix: while `onCase` is set, judge the line against the case first.

**B2. The urn shows balls 1 2 3 4 while the text and the case card say a b c d.** Cause (confirmed): `caseExperiment` (`src/ai/session/state.ts:167-187`) gives box balls numeric values and no letter label; `ballLabels` prints the value. Fix: one label source for the case, used by the Urn, CasePanel and the AI text (see U5 for R1 R2 N1 N2).

**B3. The red reply says «شوف المثال الصغير» but no small example is shown.** Cause (confirmed): the `counts_balls_not_draws` feedback (`src/content/exercises/bac2022c-sc-ex2.misconceptions.json:35-41`) was written for the old planner's repair, which the hybrid path never opens. Fix: rewrite the text for the hybrid path, or open a prepared small case with it.

**B4. «كمّلت» is the only button under a question that asks for a number.** The AI asked "how many draws did you find?". «كمّلت» cannot carry a number; it becomes a `component_result` on the light tier with hint 2 (`10×9×8`) as the fallback (`conductor.ts:350-355`). If the AI is not allowed at that moment, the tap reveals hint 2 and uses it up. Fix: when a move asks for a value, he answers in an input (the case card or the step's input); «كمّلت» never spends a hint.

**B5. He cannot write `C(10,3)` on the "all draws" step.** The n, k, ! and C keys show only on cards `count` and `law` (`src/app/screens/hybrid/LineEntry.tsx:33`). The conductor's line reader (`src/method/frame.ts:100`, `evalChain(input.raw)`) does not read C(n,k) (found by a scratch test; to confirm), while `src/ai/checks/lines.ts:65` does. `Card(Ω) = C₁₀³ = 120` is what he must write on the exam copy. Fix: counting keys on `total` too; the reader accepts C(n,k) and n!.

**B6. The verifier lets letter groups through inside an Arabic sentence when they sit in brackets.** `(ab هو نفسه ba)` passed. Cause (confirmed): `LABEL_RUN` (`src/ai/verify/message.ts:81`) is tested on runs that keep their brackets (`runs.ts:195`), so `(ab` and `ba)` do not match. Fix: strip brackets before the test; add this sentence to `message.test.ts`.

**B7. One AI move went over the per-question cap ($0.0409 > $0.04).** Cause (confirmed): the allowance checks `spent >= cap` only before a call (`src/hybrid/allowance.ts:87`), with no worst-case estimate. The counters live per screen visit (`LiveHybridLessonScreen.tsx:19`), so leaving and reopening the question resets them. Fix: refuse a deep call when its worst case would pass the cap; keep the per-question counters in the store.

**B8. The light tier can never hand over to the deep tier.** Cause (confirmed): the mover asks `permits('deep', <light reason>)` (`src/ai/move/mover.ts:575-577`) and the allowance always refuses a light reason at deep (`allowance.ts:84`). Only the test stub allows it. Result: a paid Haiku call, then the prepared reply. Fix: a permit for the hand-over itself.

**B9. No real loader while the app waits, and not every button is disabled.** (Owner, 2026-11-02.) When he taps «ما نعرفش» or anything that calls the AI:
- The only sign is small grey text «الأستاذ يكتب» (`src/app/screens/hybrid/StepCard.tsx:90-94`). It sits in the exchange above the case card and the paper. The screen stays scrolled to the bottom (B11), so he usually does not see it, and a «ما نعرفش» tap leaves no bubble of its own: nothing seems to happen.
- Disabled controls look the same as enabled ones: the keypad only gets `pointerEvents: 'none'` (`StepCard.tsx:248`), «ما نعرفش» gets `disabled` with no disabled style (`StepCard.tsx:258`).
- «كمّلت» (`StepCard.tsx:112-121`) is not disabled; its tap is dropped silently by the busy guard (`src/app/screens/hybrid/useHybridSession.ts:396`).

Fix: one designed waiting state for every wait (AI move, trip «نبداو», resume):
- His act shows at once (a chip for «ما نعرفش»).
- An animated "teacher is writing" bubble appears where the reply will land and is scrolled into view.
- The pressed button shows a small spinner.
- Every action is disabled and visibly dimmed: keypad, tiles, «نثبّت», «ما نعرفش», «كمّلت», case chips, «نرجعو للسؤال», chat send.
- After about 8 s, a "still working" line. On timeout, the prepared reply (see S3).

Keep the animation light for cheap Android phones and respect reduce-motion. Mockup first.

**B10. The sheets do not scroll. Rechecked 2026-11-02: not a bug in the code, no change made.** (Owner, 2026-11-02; the owner then suspected it was not a bug.) The launch flags are not the reason: `hybrid` is the default mode (`src/config/tutorMode.ts:13`), and `-devPart 1` only opens Q1 without the exercise list. Evidence that the code scrolls:
- **The board sheets:** the body `ScrollView` (`BoardSheet.tsx:69-75`) keeps React Native's `flexShrink: 1` when we set `flexGrow: 0` (`node_modules/react-native/Libraries/Components/ScrollView/ScrollView.js:1970-1975`), so it shrinks to the sheet's `maxHeight: '90%'` and scrolls.
- **The sheet's `Pressable`:** it renders its own wrapper view, so it does not take over the scroll view's touch handlers the way `TouchableWithoutFeedback` does.
- **Nothing inside blocks the scroll:** no nested scroll view or gesture handler sits inside the sheet content.
- **The other panels are bounded too:** the trip map (`flex: 1`) and the chat thread (`maxHeight: 220`).

Not swipe-tested (this machine cannot send touches to the simulator). Two things that can look like "not scrolling":
- content shorter than the sheet;
- dragging the grey handle at the top, which looks draggable but does nothing (no drag-to-close).

If it happens again, note which sheet and which question.

**B11. While he works on the small example, the screen jumps to the bottom.** (Owner, 2026-11-02.) Each group he adds grows the content, and the screen scrolls to the keypad. Cause (confirmed): `onContentSizeChange` calls `scrollToEnd` on every size change (`src/app/screens/hybrid/HybridLessonScreen.tsx:212-214`). Fix:
- No auto-scroll while a case is open; scroll once to the top of the case card when it opens.
- In general, scroll to the top of the newest reply, not to the end.
- Never move the screen while his finger is on it.

## B. UX improvements (from the screenshots)

- **U1. One place to act per moment.** Today one question can be answered three ways (tap urn balls, the case card's group builder, the keypad), plus «كمّلت», «نرجعو للسؤال», «ما نعرفش» and the chat. While a case is open, the case card is the only place to act: fold the paper, no second urn.
- **U2. Show the taps and fold old replies.** A «ما نعرفش» chip in the feed. When a new reply arrives, older feedback folds to one line.
- **U3. After an explained slip, the next hint builds on that explanation.** Today the red box explains precisely, then the yellow hint ("re-read the text") is vaguer.
- **U4. A bridge from the small example back to the question:** "6 groups = C₄²", then "10 balls, 3 at once → C₁₀³", then the paper with the C key.
- **U5. Case balls R1 R2 N1 N2 in red and black, with the letters.** This ties them to the real urn, prepares "favourable draws", and avoids colour alone.
- **U6. The header area takes about 29% of the height** (header, strip, tabs). Use slimmer tabs and hide them on scroll.
- **U7. The case's scratch lines stay in the case card,** not on the paper (the paper is what goes on the exam copy).
- **U8. Softer first slip.** Say what is right first ("10 is n, we will need it"); not red for a natural first mistake.
- **U9. Small fixes:**
  - The strip caption repeats the card's first row.
  - «بعد المطلوب» is vague.
  - The AI caption under every bubble could become an icon.
  - Tiles should follow the current target (on the case: 4, 2), not the statement's numbers (0,5 and the 6 black balls).

## C. AI brain and system

- **S1. The deep tier is triggered cheaply:**
  - a second «ما نعرفش» (`conductor.ts:290`);
  - the first wrong line the app cannot diagnose (`conductor.ts:660`);
  - any number in a typed sentence (`conductor.ts:307-319`).

  Try a prepared small case (free) before calling Sonnet.
- **S2. The daily $0.10 is regressive.** A weak student reaches `prepared_only` after about 2–3 questions, so the students who need the AI most lose it first.
- **S3. Show the prepared reply while the AI works,** then let the AI improve it, instead of locking input with nothing shown (`useHybridSession.ts:445-482`).
- **S4. The AI does not see the wording of earlier instant replies,** so it repeats them. Here the bubble repeated the red box. It only gets the pending prepared reply (`src/ai/move/situation.ts:563-571`).
- **S5. The student profile:**
  - is updated only when a question ends, with the outcome always `solved` (`useHybridSession.ts:355-365`);
  - gets no observations from the hybrid path;
  - is ignored by the conductor.
- **S6. Similar questions always advance whatever the result** (`conductor.ts:522-524`) and have no «ما نعرفش» (`StepCard.tsx:48`).
- **S7. No telemetry events for hybrid acts** (CLAUDE.md rule 5).
- **S8. No doc describes the hybrid layer;** `docs/DECISIONS.md` stops at D54.
- **S9. An API key is passed into the app** (`LiveHybridLessonScreen.tsx:22`) and there is no backend proxy (rule 3). Release builds carry no key, so they cannot reach the board.

## Suggested order

1. B1, B2, B3, B6, B7, B8, B11: small, contained fixes with tests.
2. B9 with U1 and U2: they share the step card. Mockup first.
3. B5 (B10 rechecked: not a bug).
4. S1 and S3, then the rest.
