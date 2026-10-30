# Question 2 content spec: P(B), "aucune boule rouge"

Status: SPEC for docs/ (written by the owner's assistant from the Question 1 play-through). Authored as DATA in the method model of docs/METHOD_LESSON_PLAN.md and its addendum. All Arabic is draft darija, `reviewed:false`. Numbers below are checked by a throwaway script; the engine recomputes every one (tests recompute, never hard-code).

Notation for strings: `{A}`, `{B}` and every number are separate math runs, never inside an Arabic run (digits and Latin never share a line with Arabic words; use two lines).

---

## 0. Principles applied (from the Question 1 play + the owner's addition)

1 plan before numbers; 2 the student finds the decomposition; 3 lines, never a bare number; 4 one task per screen; 5 never just "wrong": say what the line counts and credit what is right; 6 his own check finds the error; 7 rules carry their condition; 8 his claims are tested on a new case; 9 pictures after his answer or after "I don't know"; 10 detours are repair paths; 11 ambiguous lines are read back; 12 small cases listable by hand, no coincidences, no number reused from an earlier screen; 13 exam notation after he computed it; 14 standing checks; 15 sheet and paper fill from his own correct lines; 16 his recipe at the end; 17 similar questions without help; 20 tell him the route first; 21 each stage says now / why / next; 22 tell the map, he finds the inside; 23 a recap after each stage; 24 a method card for the TYPE of question; 25 TWO similar questions (new numbers; a twist).

---

## 1. The question and its facts (urn 4 red, 6 black, 3 drawn together)

Exam text: *On considère l'événement B : « aucune boule rouge ». Calculer p(B).* Answer 1/6.

| reds drawn | draws | note |
|---|---|---|
| 0 | 20 | this is B = C(6,3) |
| 1 | 60 | this is A (Question 1) |
| 2 | 36 | C(4,2) x 6 |
| 3 | 4 | C(4,3) |
| sum | 120 | = C(10,3), the total |

Complement of A has 60 draws (20 + 36 + 4). **B is only the 20-draw slice of it.** The trap: 1 - P(A) = 1/2 because P(A) happens to be 1/2, while P(B) = 1/6.

Reuse from Question 1 (the sheet): the total 120. Do not recompute from scratch: the step checks that he knows the total depends only on the urn and the draw.

---

## 2. Route, plan, statement tap (principles 20 to 23)

**Opening card** (one act, button "ابدا"):
- «في السؤال هذا: نعملو خطة، نعدّو، نتأكدو، نكتبو في الورقة، وبعد نحلّو سؤالين شبيهين وحدك.»
- «كان ما تعرفش، اضغط «ما نعرفش» ونوريك مثال أصغر.»
- «نفس الصندوق ونفس السحب. اللي تبدّل هو الحدث.» then a math run `{B}`.

**Plan cards** (shuffled, 3, same coarse plan as Question 1: the student sees that the plan transfers):

| id | card text (ar) | now | why | next |
|---|---|---|---|---|
| c_total | «نشوفو التيراجات الكل» | «التيراجات الكل» | «الصندوق ونوع السحب نفسهم، فالكل ما تبدّلش» | «التيراجات اللي تعجب» |
| c_fav | «نعدّو التيراجات اللي فيها الحدث» | «التيراجات اللي تعجب» | «نعدّو غير التيراجات اللي فيها الحدث» | «نقسمو» |
| c_ratio | «نقسمو» | «نقسمو» | «اللي تعجب على الكل» | «نكتبو في الورقة» |

Reason-for-order line after he orders (generic): «نقسمو في الآخر، خاطر القسمة تحتاج العددين.»
Recap after each credited card (generic): «لقيت {label}. الجاي: {next}.»

**Statement tap:** prompt «شوف النص: شنوّة الكلمة اللي تقول شنوّة الحدث؟» Target token `aucune` (effect: event = zero of colour red). Distractor line: «الكلمة هاذي تقول كيفاش نجبدو. الحدث موش فيها.» The draw type (simultanément) is shown in the statement card from the exercise lead and needs no act.

---

## 3. Expected solution graph (template `urn_none_of_colour`)

| node | role (inferred, never shown to the student) | right value | accepted forms | bareOk | unit |
|---|---|---|---|---|---|
| total | total | 120 | `120`, `10*9*8/(3*2*1) = 120`, link to the Question 1 sheet | yes (reuse) | groups |
| fav | part | 20 | `(6*5*4)/(3*2*1) = 20` | no | groups |
| result | result | 1/6 | `20/120 = 1/6` | no | ratio |

No combine node. Fast path lines: total, fav, result.

---

## 4. Mutations (engine generates; values for 4 red 6 black)

Generic (from Question 1): drop_division, divide_by_k_not_k_factorial, one_factor_divided, bracket_left_to_right, start_number_off, n_times_k, swap_numerator_denominator, unsimplified.

At the **fav** node:

| id | line | value | note |
|---|---|---|---|
| drop_division | 6*5*4 | 120 | equals the total: units check fires (ordered against groups); P would be 1 |
| divide_by_k_not_k_factorial | 120/3 | 40 | |
| one_factor_divided | 120/2 | 60 | **coincides with A's count**, see ambiguity below |
| bracket_left_to_right | 6*5*4/3*2*1 | 80 | readback row |
| start_number_off | 9*8*7/6, 7*6*5/6, 5*4*3/6 | 84, 35, 10 | |
| n_times_k | 6*3 | 18 | |
| colour_swapped (NEW, domain) | (4*3*2)/(3*2*1) | 4 | counts draws from the reds |
| a_count_for_b (NEW, domain) | the A count 60 copied from the sheet | 60 | value-only; ambiguity below |

At the **result** node: right 1/6; swap 6 (above one); unsimplified 20/120; 120/120 = 1 (from drop_division); 40/120 = 1/3; 80/120 = 2/3; value-only procedures already in the engine: single_ball_probability 3/5, with_replacement (3/5)^3 = 27/125; **complement_of_A (NEW) 1 - P(A) = 1/2**.

**Ambiguities to resolve by structure, then by the claim test (never by guessing):**
- fav 60 = `120/2` (structure) or the copied A count (bare 60). Structure decides; a bare 60 gets «العدد هذا هو عدد تيراجات حدث آخر، موش {B}.»
- result 1/2 = `1 - P(A)` or `60/120`. Two stories, one value: no label, open the claim test (section 6).

Messages are neutral and name what the line counts, never the repair:
- colour_swapped: «السطر هذا يعدّ تيراجات من الحمر. شوف الحدث {B}: شنوّة لون الكور اللي نحتاجوها؟»
- units mismatch: «العدد هذا يعدّ تيراجات بالترتيب، والكل يعدّ مجموعات.» (numbers shown as the student's own math runs)
- complement_of_A: «حسابك يفترض إنّ {B} هو عكس {A}. نختبرو الفكرة هاذي.»
- above one, unsimplified, readback: as Question 1.

---

## 5. Standing checks that apply

above_one (swap 6); units (drop_division, mixed lines); multiply_back after a division by orderings; simplify; range 0..1; **no target is given** by the statement, so the closing check is the cross-check with the slices (section 6, after his answer). Optional generic check `certain` (a probability of 1 or 0 triggers "can this event be certain?"): units already catches the only way to reach 1 here, so skip it unless the planner finds another path.

---

## 6. Claim test: B against "not A" (the exam's own trap)

**Main path, after he commits his result** (one act, a consolidation, not a repair). Prompt: «واحد كتب {B} هو عكس {A}. شنوّة رأيك؟» Cards (engine computes the prediction of each on the real numbers, shown after the pick):
- K1 (false): «{B} هو عكس {A}، يعني الاحتمالين مجموعهم واحد.» prediction: count(B) = 120 - 60 = 60.
- K2 (true): «{B} جزء من «ما فيهاش حمراء وحدة بالضبط»: فيه الحالات اللي ما فيهاش حمراء برك.» prediction: count(B) = 20, a slice of the 60.
- K3 (false): «{A} و{B} عندهم نفس الاحتمال.» prediction: count(B) = 60.

After the pick, `EventAreaModel` (after-answer picture, built in stop 5) shows the four slices 20 / 60 / 36 / 4 of 120, B highlighted, "not A" = 20 + 36 + 4. His own number 20 is already on screen: no leak.

**Repair R-C (opens on complement_of_A or a bare 1/2):** the same claim cards on a NEW small case where the claim can be checked by listing.
- Test case: **3 red 4 black, 3 together**: total 35, A = 18, B = 4, "not A" = 17 [computed: 4 + 18 + 12 + 1 = 35]. P(A) = 18/35, 1 - P(A) = 17/35, P(B) = 4/35.
- The student lists the draws with no red from the four blacks (abc, abd, acd, bcd = 4) with the list builder, compares with each card's prediction (K1 predicts 17, K3 predicts 18), finds the claim that survives, then returns to his line.
- Acts: accept 1, list 4 + "that is all" 1, pick 1, acknowledge 1 = 8 (cap 10).
- **Guard note (printed exception):** this is the 3 red 4 black urn already used by the PartWholeBar repair of Question 1 (18/35). 35 and 18 repeat there on purpose; the claim list stays 4 draws long. A twin short enough to list by hand with no repeated number does not exist in the searched range (I tested 2..9 red, 4..6 black): small black counts always give 4 or 10, which collide with other lesson numbers. The no-collision alternative (7 red 5 black: 220 / 70 / 10 / 150) needs a 10-draw list, which breaks the 10-act cap (13 acts). The guard must therefore print an allowance, not pretend to pass.
- A claim set is invalid if the over-general card does not fail on the test case, or the true card does not hold: loader check.

---

## 7. Repairs (all opened by a classified slip or "ما نعرفش", never by default)

| id | opens on | content | acts |
|---|---|---|---|
| R-plan | "ما نعرفش" at the plan | open the student's own Question 1 sheet: "الخطة نفسها اللي استعملتها قبل" | 2 |
| R-fav | colour_swapped, drop_division, "ما نعرفش" at the favourable count | the 4-ball box of Question 1 (a, b, c, d, 3 together): "ما فيهاش حمراء" means all three come from one colour; he lists draws of the blacks (4), rule of the divisor, then back to the six blacks. A discover box: k = n - 1 here on purpose | 7 |
| R-C | complement_of_A, a bare 1/2 | section 6 | 8 |
| R-units | drop_division, mixed units | the units check card: «العددين يعدّو نفس الشي؟» with the correction as his own rewrite | 4 |
| R-above | result above 1 | PartWholeBar | 3 |

Hints per card (3 levels, level 3 may hold the line):
- c_fav L1 ««حتى حمراء» معناها: الكور الكل من لون وحد. أي لون؟» L2 «نجبدو ثلاثة كور مع بعض من الكحل برك. شوف كيفاش عدّيت زوز كحل قبل.» L3 the line `(6*5*4)/(3*2*1)`.
- c_ratio L1 «اللي تعجب على...؟» L2 «شوف الخطة: القسمة تحتاج العددين اللي لقيتهم.» L3 the line `20/120`.

---

## 8. Findings, paper skeleton, bridge (built only from his own correct lines)

- F1 "الكل": his total line (or the link to Question 1). Reason «نفس الصندوق، نفس السحب». Rule: «الكل يتعلّق بالصندوق ونوع السحب برك، موش بالحدث.»
- F2 "اللي تعجب {B}": his line `(6*5*4)/(3*2*1) = 20`. Reason «الكور الثلاثة كحل، والترتيب ما يهمّش فنقسمو». Rule: ««ما فيهاش حمراء» معناها: الكور الكل كحل.»
- F3 "{B} و{A}": his three numbers `P(A) = 1/2`, `1 - P(A) = 1/2`, `P(B) = 1/6`. Rule with condition: «عكس حدث هو كل الحالات اللي ما فيهاش الحدث. عكس «حمراء وحدة بالضبط» يضم صفر ولا زوز ولا ثلاثة حمر.»

Paper skeleton (French, LTR; blanks fill from his accepted lines only):
```
Tirage simultané de 3 boules parmi 10 : card(Ω) = C(10,3) = 120.
B : « aucune boule rouge » : les 3 boules sont noires,
nombre de cas favorables = C(6,3) = 20.
p(B) = 20/120 = 1/6.
```
Bridge card, shown after he computed it: his `(6*5*4)/(3*2*1) = 20` next to the exam's `C_6^3 = 20`.

---

## 9. Recipe (cards, he orders 3 to 5; distractors included) and the method card

Pool: «نقرا الحدث ونحدّد شنوّة معناه بالضبط» (step) · «نشوف شنوّة تبدّل من السؤال اللي قبل: الصندوق والسحب نفسهم، فالكل ما يتبدّلش» (step) · «نعدّو التيراجات اللي تعجب بالطريقة المناسبة للحدث» (step) · «نقسمو اللي تعجب على الكل ونبسّطو» (step) · «نتأكدو إنّ الكسر بين صفر وواحد» (check) · «ما نخذوش عكس حدث إلا كان نتأكد إنو يضم الباقي كامل» (check) · «نطرح احتمال {A} من واحد دايما» (distractor) · «نخذو نفس الحساب متاع السؤال اللي قبل» (distractor) · «نعدّو بالترتيب» (distractor).

Method card (clean, for this TYPE: probability of an event on a draw): read the event word; reuse what depends only on the urn and the draw; count the favourable draws with the rule for that event; divide favourable by total; check 0..1 and the units; an event's opposite is every case without it.

---

## 10. Two similar questions, no help (principle 25)

Each is reviewed after he finishes: his lines are credited, slips are labelled by mutation id. No plan strip, no cards, no pictures, no hints.

**(a) Same structure, new numbers.** *Une urne contient 6 boules rouges et 7 boules noires. On tire simultanément 3 boules. Calculer la probabilité de l'événement : « aucune boule rouge ».* Total C(13,3) = 286, favourable C(7,3) = 35, p = 35/286 (irreducible). Passed the guards [computed]: not a reserved urn, no earlier answer, not a single-ball value, no C(b,3) = 3b coincidence, no number already shown. (Large for an exam, but the guard leaves no natural small urn: report this to the owner.)

**(b) Same structure, with a twist.** *Même urne (4 rouges, 6 noires), 3 boules tirées simultanément. Calculer la probabilité de l'événement : « au moins une boule rouge ».* p = 100/120 = 5/6. Two routes both credited: `1 - 1/6` (uses his Question 2 result: the complement is legitimate here, because "au moins une" is the exact opposite of "aucune") and `(60+36+4)/120` or `(120-20)/120`. New mutations: `complement_of_wrong_event` (1 - P(A) = 1/2: «الحدث «حمراء وحدة بالضبط» موش عكس «حمراء على الأقل».»), `adds_wrong_cases` (P(A)+P(B) = 2/3). Printed allowance: 5/6 appeared as a wrong value in Question 1.

---

## 11. Budgets (acts; the unit is the reducer action)

Fast path: opening card 1, plan 1, statement tap 1, three lines 3, claim consolidation 1, recipe 1 = **8** (cap). Repairs at most 10 each (section 7). The two similar questions are outside the budget (3 lines each plus the review).

---

## 12. Data-only dry run: what Question 2 needs from the engine

Data only: plan cards and their now/why/next, the statement tap, node forms, mutation texts, the claim set, findings, paper, recipe, the two similar questions.

**Domain engine additions (reported, allowed):** template `urn_none_of_colour` and `urn_at_least_j` (the twist); mutations `colour_swapped`, `a_count_for_b`, `complement_of_A`, `complement_of_wrong_event`, `adds_wrong_cases`.

**Two schema additions the method model must allow, or Question 2 will need lesson-engine code** (decide in Phase 1, in `src/method/schema.ts` and the loader, not in the reducer):
1. **Cross-question inputs:** a graph node may take an earlier question's node as input (`from: q1.total`, `q1.A_count`, `q1.P_A`), read from the student's sheet and credited lines. Needed for the reused total, `a_count_for_b`, and `complement_of_A`.
2. **A claim set on the main path after the result** (`consolidation`), not only inside a repair. Needed for section 6.

If either cannot be done in the schema alone, that is the "lesson-engine code" finding the generalisation test exists to surface: report it, do not patch.

---

## 13. What the owner checks when playing

- You can order the plan alone and say why divide is last.
- The app tells you what changed from Question 1 (the event) and what stays (the total).
- A line like `1 - P(A)` is not called wrong: the app tests the idea with the small case, and you reach the surviving claim yourself.
- You end with the recipe and then solve the two similar questions without help.

Open questions (defaults in brackets): the claim consolidation on the main path for every student, or only when a slip shows [every student, one act]; accept the printed exception for the 3 red 4 black twin [yes]; use 6 red 7 black for similar question (a) [yes, until the generator exists].
