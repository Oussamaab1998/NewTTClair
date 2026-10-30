# Method lesson: play guide (Questions 1, 2, 3a, 3b of `bac2022c-sc-ex2`)

Written for: the product owner, to play the four lessons on the simulator. Every launch passes `-devLlm off` (no model call). Metro must be running (`npm start`). Nothing here needs a key. Arabic is draft, `reviewed: false`.

## Launch commands

```sh
U=7B5AAEAC-353D-4D86-AF96-69A709747C51          # iPhone 16e (390 pt)   [17 Pro: 27978103-59E7-4963-99A8-91E1319449B9]
B=org.reactjs.native.example.NewTTClair
xcrun simctl terminate $U $B
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/1       # Question 1
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/2       # Question 2
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/3a      # Question 3.a
xcrun simctl launch $U $B -devLlm off -devPart bac2022c-sc-ex2/3b      # Question 3.b
# a narrow phone: add   -devWidth 360
# stop on a card (debug): add   -devActions answerAll -devUntil m1.c_fav -devScrollEnd on
# and write one line on it:     -devThen line:4+15=19
# open the route sheet:         -devDemo methodSheet
```

Step ids for `-devUntil`: Q1 `m1.read m1.c_total m1.c_fav m1.p_reason m1.c_ratio m1.recipe m1.sim_same m1.sim_twist`; Q2 `m2.c_total m2.c_fav m2.c_ratio m2.p_claim m2.x_area m2.recipe m2.sim_same`; Q3a `m3a.c_type m3a.c_seq m3a.c_count m3a.c_law m3a.p_formula m3a.x_explorer m3a.recipe`; Q3b `m3b.c_mean1 m3b.c_meann m3b.c_var1 m3b.c_varn m3b.p_formula m3b.recipe`.

The pad: digits, comma, `( )`, `× ÷ + −`, `=`, C, ✓. No letters. A line is a chain (`336÷6 = 56`). A line with an operator and no `=` is "unfinished" (nothing graded); a lone fraction that is not a whole number (`7/2`) is read as a value.

## Fast paths (no mistake)

Acts = reducer actions (the unit of the budget); taps = finger touches, keypad keys not counted, taps inside a picture not counted.

| | Budget | Measured acts | Taps | Script |
|---|---|---|---|---|
| Q1 | 9 | **9** | 17 | plan (any valid order; 3 cards + confirm) · tap `simultanément` · `10×9×8÷(3×2×1) = 120` · `4` · `6×5÷(2×1) = 15` · `4×15 = 60` · reason card «لكل كورة حمراء نختارو معاها…» · `60÷120 = 1/2` · recipe (3 to 5 cards + confirm) |
| Q2 | 8 | **8** | 16 | plan · tap `aucune` · `120` (the total may be bare: it is the same box) · `6×5×4÷(3×2×1) = 20` · `20÷120 = 1/6` · claim card «…موجود داخل عكس الحدث اللي قبل…» · «قريت» on the picture · recipe |
| Q3a | 10 (cap) | **9** | 19 | plan · tap `remettant` · recognise card «نلقاو كورة حمراء وحدة بالضبط» · `1÷2×1÷2×…` (seven factors) `= 1/128` · `7×6÷(2×1) = 21` · `21×1/128 = 21/128` · formula card `C(n,k)/2^n` · «قريت» on the explorer · recipe |
| Q3b | 8 | **8** | 17 | plan · tap `remettant` · `0×1/2+1×1/2 = 1/2` · `7×1/2 = 7/2` · `(0−1/2)×(0−1/2)×1/2+(1−1/2)×(1−1/2)×1/2 = 1/4` · `7×1/4 = 7/4` · the pair of formulas `E=n/2, V=n/4` · recipe |

Then the two similar questions without help: Q1 `5R 9B` exactly one red (total `14×13×12÷(3×2×1) = 364`, `5`, `9×8÷(2×1) = 36`, `5×36 = 180`, `180/364 = 45/91`) and `7R 5B` no red (`12×11×10÷(3×2×1) = 220`, `5×4×3÷(3×2×1) = 10`, `10/220 = 1/22`); Q2 `6R 7B` no red (`286`, `35`, `35/286`) and "at least one red" on 4R 6B (`120`, `20`, `120−20 = 100`, `100/120 = 5/6`); Q3a the die `p(X=1)` (`1/6×5/6×5/6 = 25/216`, `3`, `3×25/216 = 25/72`) and the urn without replacement `p(Y=1)`; Q3b five coin throws (`5/2`, `5/4`) and three throws of a die (`1/2`, `5/12`). After you press «كمّلت» each line is reviewed: credited by the node it settles, or labelled by the slip it looks like.

## SLIP SCRIPT (type these on purpose; what must happen)

"Offered" means the planner's repair offer card (yes / no); a repair opens only if you say yes. The first «ما نعرفش» gives a hint; the **second** offers the repair of that card (the ladder first, rule 6).

### Question 1

| Card | Type | Expected |
|---|---|---|
| total | `10×9×8 = 720` | named as "the draws where order matters" (a supporting step), the card stays, no repair |
| total | `10×9×8÷3×2×1` | the reading row (grouped / literal); literal → `bracket_left_to_right` (480) |
| total | `10×9×8÷3 = 240` | `divide_by_k_not_k_factorial` → offers **rep-1-claim** (own claim on 3 balls out of 5, the engine tests the rule) |
| total | `10+9+8 = 27` | no label: «هذا السطر يعدّ حاجة أخرى…» |
| favourable | `1` | `over_generalised_order_rule` → **rep-1-one-ball** |
| favourable | `4×3 = 12` | asked form (a value of the table) |
| favourable | `6×5 = 30` | `drop_division` → **rep-1-box** (you build the 3 pairs of a small box with chips) |
| favourable | `6×5÷2×1 = 15` | right (the `×1` changes nothing, so it is never called wrong) |
| favourable | `15` (bare) | credited as a count, "write how you found it" (unexplained: never fills the sheet) |
| favourable | `4+15 = 19` | `add_instead_of_multiply` → **rep-1-combine** (list the draws of one red with every black pair) |
| reason card | the «نزيدو العددين…» card | its own message, the card stays |
| divide | `120÷60 = 2` | `swap_numerator_denominator` → **rep-1-above-one** (PartWholeBar, then the fraction again) |
| divide | `60÷720 = 1/12` | `ordered_instead_of_groups` → **rep-1-units** |
| divide | `60/120` | right but not in lowest terms: the card stays, «شوف الكسر…» |
| divide | `1` | the target is on screen beside your line (the statement says 1/2) |
| plan, favourable | «ما نعرفش» twice | **rep-1-plan** (the plan worked on 3 red 5 black), then you re-order |

### Question 2

`6×5×4 = 120` (drop_division → small box) · `4×3×2÷(3×2×1) = 4` (colour swapped: counts draws from the reds) · `60` bare (the earlier event's count) · `6×5×4÷3×2×1` (reading row, 80) · `1−60÷120 = 1/2` or `1−1/2` or bare `1/2` (`complement_of_A` → **rep-2-claim**: the 3 red 4 black box, list the draws with no red, the engine falsifies "opposite" on your numbers) · `120÷20 = 6` (above one) · `20÷720 = 1/36` (units). At the claim card pick «…هو عكس الحدث اللي قبل» to see the engine's prediction (60) against your count (20).

### Question 3

3a: `1/2` as the sequence (`p_single_trial`), `1/2×1/2 = 1/4`, `7×1/2 = 7/2` (→ **rep-3a-independence**), `7×6 = 42`, `7/2` as the count (→ **rep-3a-box**), `7×2 = 14` (→ **rep-3a-bridge**), `1/128` as P(X=2) (the owner's slip: «الرقم هذا هو احتمال تسلسل وحد…» → **rep-3a-law**), `21` as the probability. Formula cards: pick `1/2^n` and read the three rows (his case, then two engine cases) against your own 21/128.
3b: `1/2` as the mean of 7 trials, `7` (n for the mean), `1/2` as the spread of one trial (→ **rep-3b-spread**), `1/4` as the spread of 7 (→ **rep-3b-independence**), `7×1/2 = 7/2` as the spread. Pair cards: `V=n/2` fails on n = 7 and n = 10.

## What to look at while you play

No screen says "wrong". No hint 1 or 2 holds a number of the answer (a test scans them). The three cards of a pick are of similar length (a test), so the true one is not the longest. A repair never prints a number of the question (a test). The strip shows now / next (one line while the pad is open on a narrow phone); its sheet shows the route, then what you found (your own lines, the rule with its condition, the bridge to the exam notation) and the paper with dashed blanks until your own lines fill them.
