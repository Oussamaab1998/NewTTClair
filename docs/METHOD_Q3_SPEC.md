# Question 3 content spec: the binomial law, E(X) and V(X)

Status: SPEC for docs/ (same data model as docs/METHOD_LESSON_PLAN.md, its addenda and docs/METHOD_Q2_SPEC.md; read those first). Authored as DATA; Arabic is draft darija, `reviewed:false`; `{A}`, `{X}` and every number are separate math runs. Numbers were computed by hand and by script; the engine recomputes every one.

Exam text: *On répète l'épreuve (tirer simultanément 3 boules) n fois (n >= 2), en remettant les boules tirées. X = nombre de fois où l'on obtient exactement une boule rouge. a) Déterminer la loi de X. b) Calculer E(X) et V(X) en fonction de n.* Answers: X ~ B(n, 1/2); p(X=k) = C(n,k)/2^n; E(X) = n/2; V(X) = n/4.

Two method blocks: `m3a` (the law) and `m3b` (mean and variance), each with its own budgets (fast path at most 10 acts; repairs at most 10; worst case 30).

---

## 0. The one design problem: the answer is a formula in n and k, and the pad has no letters

Do not add letter keys. The method is **numeric first, formula by cards**:
1. The student solves ONE concrete case with lines (n = 7, k = 2; later n = 7 for the mean and variance).
2. He then picks the general formula from **formula cards** (a new claim-prediction kind, domain code in `claims.ts`, data in JSON). The engine substitutes his concrete case and one or two other cases into each card with the safe parser (`C(a,b)` through the counting pre-pass after substitution of n and k) and shows which cards reproduce his own numbers. A card that fails on his own line is falsified by his own number, as in "always x2".
3. His pick is stored as his rule WITH its condition and fills the paper skeleton.

---

## 1. m3a: the law of X

**Opening card:** «في السؤال هذا: نتعرّفو على النوع، نحسبو احتمال تسلسل، نعدّو التسلسلات، ونركّبو القانون. وبعد نحلّو سؤالين شبيهين وحدك.» + «كان ما تعرفش، اضغط «ما نعرفش».»

**Plan cards (4, shuffled):**

| id | card (ar) | needs | now / why / next |
|---|---|---|---|
| c_type | «نعرفو شنوّة النجاح وشنوّة احتمالو» | | now «النوع» / why «نشوفو واش التكرار مستقل» / next «احتمال تسلسل» |
| c_seq | «نحسبو احتمال تسلسل وحد» | c_type | now «تسلسل وحد» / why «نتيجة كاملة من n مرات» / next «نعدّو التسلسلات» |
| c_count | «نعدّو التسلسلات اللي فيها نفس عدد النجاحات» | c_type | now «العدد» / why «برشا تسلسل يعطي نفس القيمة» / next «نركّبو» |
| c_law | «نركّبو القانون» | c_seq, c_count | now «القانون» / why «العدد في احتمال التسلسل» / next «نكتبو في الورقة» |

**Statement tap:** prompt «شوف النص: شنوّة الكلمة اللي تقول إنّ كل مرة نبداو من الصفر؟» Target `remettant` (effect: independent, same p each time). Distractor line: «الكلمة هاذي ما تقولش كان المرات مرتبطين ولا لا.»

**Recognise card (one act):** «شنوّة النجاح في كل مرة؟» cards: «نلقاو حمراء وحدة بالضبط» (true; success = {A}, p = P({A}) from the Question 1 sheet, cross-question input `q1.P_A` = 1/2), «نلقاو حمراء على الأقل» (false), «ما نلقاوش حمراء» (false, that is {B}). The consequence is shown after the pick, from the engine, with no number of the answer.

**Concrete case (engine picks, authored n = 7, k = 2; coincidence-free: C(7,2) = 21, n*k = 14, n+k = 9):**

| node | right value | accepted forms | bareOk |
|---|---|---|---|
| seq | 1/128 | `(1/2)^7`, `(1/2)*(1/2)*...` (seven factors), `1/2^7 = 1/128` | no |
| count | 21 | `(7*6)/(2*1) = 21` | no |
| result | 21/128 | `21*1/128 = 21/128` | no |

**Mutations (domain additions; values for n = 7, k = 2):**
- seq: `p_single_trial` 1/2 (one trial's p used for a sequence, the owner's slip three times); `forgets_failures` (1/2)^2 = 1/4; `adds_instead_of_multiplies` 7*1/2 = 7/2 (above one); `n_times_p` (the mean).
- count: `drop_division` 42; `divide_by_k_not_k_factorial` 21 (coincides at k = 2: dropped, listed); `reads_choose_as_fraction` 7/2; `n_times_k` 14; `n` 7; `k` 2.
- result: **`one_sequence_as_P_X_k`** 1/128 (a sequence's probability given as P(X=k): this slip happened three times in the owner's session, give it its own message: «الرقم هذا هو احتمال تسلسل وحد. السؤال على كل التسلسلات اللي فيها نفس عدد النجاحات.»); `count_given_as_probability` 21; `unsimplified` none here (21/128 irreducible); `x_given_as_probability` (the value of X as a probability).

**Checks:** units (a sequence against the set of sequences); above one; multiply back is not used; **sum check on the law table** (repair); **symmetry check** with p = 1/2 (repair).

**Formula cards (after the concrete case):** prompt «شنوّة القاعدة العامة لـ p(X = k)؟» each card is a formula in n and k, tested on his case and on two engine cases:
- F1 (true) `C(n,k)/2^n`
- F2 `1/2^n` (one sequence; fails on his own 21/128)
- F3 `C(n,k)/2^k` (forgets the failures)
- F4 `n/2^n` (n instead of C(n,k))
- F5 `k/2^n`
His pick fills the paper line; a falsified card shows his own number against the card's prediction. Test cases for the substitution: his (7,2), plus (6,4) = 15/64 and (5,1) = 5/32 (none equals a number shown earlier except allowed, printed).

**Repairs (opened by a classified slip or "ما نعرفش"):**
- R-a1 plan help: n = 2 by hand, SS SF FS FF each 1/2 x 1/2 = 1/4; the law 1/4, 1/2, 1/4 (`VariableTable`, student-triggered sum check = 1). Acts about 7.
- R-a2 n = 3 by hand with `SlotsPattern` (where does the odd letter go? SFF FSF FFS; SSF SFS FSS), law 1/8, 3/8, 3/8, 1/8, sum and symmetry checks. Acts about 9. Opens on `reads_choose_as_fraction`, `drop_division` at the count.
- R-a3 bridge: "choose which k of the n places are successes" is the same rule as choosing k balls (`SlotsPattern` bridge, the owner's own link between the S places and the chosen balls). Opens on `n_times_k`.
- R-a4 independence claim: «كل مرة نبداو من الصفر» tested with `RepeatedRuns` two_stage on 16 runs (16, 8, 4): a product of independent events. Opens on `adds_instead_of_multiplies`, `p_single_trial`.
- R-above, R-units: as Questions 1 and 2.

**Findings (his own lines):** F1 type: p = 1/2 and independence (rule: «الاستقلال: كل مرة نبداو من الصفر، فنضربو»). F2 sequence: his seq line (rule: «احتمال تسلسل = حاصل ضرب احتمالات المرات»). F3 count: his count line (rule: «عدد التسلسلات = عدد طرق اختيار البلايص متاع النجاحات»). F4 law: his result and the formula card he picked, shown after the check by `BinomialExplorer` (tap a bar: each term shown, never a sum).

**Paper skeleton (French):**
```
Les n épreuves sont indépendantes (tirages avec remise) ;
succès : A « une seule boule rouge », p = p(A) = 1/2.
X suit la loi binomiale B(n ; 1/2).
Pour tout k de {0, 1, ..., n} : p(X = k) = C(n,k) (1/2)^k (1/2)^(n-k) = C(n,k)/2^n.
```
Bridge card: his `(7*6)/(2*1) = 21` next to `C_7^2 = 21`.

---

## 2. m3b: E(X) and V(X)

**Plan cards (4):** c_mean1 «المتوسّط في مرّة وحدة» (now / why «X في مرّة وحدة هو صفر ولا واحد» / next «n مرات») · c_meann «المتوسّط في n مرات» (needs c_mean1; why «المتوسّطات تتجمع») · c_var1 «التبعثر في مرّة وحدة» (now / why «نقيسو بعد القيم عن المتوسّط» / next «n مرات») · c_varn «التبعثر في n مرات» (needs c_var1; why «المرات مستقلة، فالتبعثرات تتجمع»).

**Statement tap:** «شنوّة الكلمة اللي تخلّي التبعثرات تتجمع؟» target `remettant` again (principle: the same word, the second use).

**Concrete lines (n = 7; p = 1/2 from the sheet):**

| node | right value | accepted forms |
|---|---|---|
| mean1 | 1/2 | `0*(1/2)+1*(1/2) = 1/2` |
| meann | 7/2 | `7*(1/2) = 7/2` |
| var1 | 1/4 | `(0-1/2)^2*(1/2)+(1-1/2)^2*(1/2) = 1/4` (also `1/8+1/8`) |
| varn | 7/4 | `7*(1/4) = 7/4` |

**Mutations:** `mean_of_one_trial_for_n` 1/2 (forgets n); `n_instead_of_np` 7; `variance_as_mean` 7/2 (forgets q); `variance_forgets_n` 1/4; `variance_p_squared` 1/4 *(coincides with the right var1 at p = 1/2: dropped, listed, and the p = 1/2 coincidence is the exam's own trap; discriminated only by the die in the similar question)*.

**Formula cards (after the concrete case):** E: `n/2` (true), `n` , `1/2`, `n/4`; V: `n/4` (true), `n/2`, `1/4`, `n^2/4`. Each tested on his n = 7 and on n = 10 (5 and 5/2).

**Repairs:** R-b1 `SpreadSlider` (p moves, distances, squares, contributions, total locked until 3 positions): why the one-trial spread is p(1-p) and is largest at p = 1/2; opens on `variance_as_mean` and "ما نعرفش" at c_var1 (about 8 acts). R-b2 mean as an average: `RepeatedRuns` tally 16 runs (the owner's own route: runs x X, total S, divide by 16). R-b3 independence for spreads: the n = 2 case, one trial's spread 1/4 added twice = 1/2, against the dependent case "without replacement, 2 balls from {R, N}" where X is always 1 and the spread is 0 (the owner's own example: spreads add only if the trials are independent). Findings: mean1 = p; sum of means; the spread of one trial; "spreads add when independent".

**Paper skeleton:**
```
X suit la loi binomiale B(n ; 1/2) donc
E(X) = n p = n/2   et   V(X) = n p (1 - p) = n/4.
```
The final line fills from his chosen formula cards only.

---

## 3. Two similar questions (no help, after each block's recipe)

**(a) New numbers, p different from 1/2 (the die; this is where p, q, p^2 stop coinciding).** *On lance trois fois un dé équilibré. X = nombre de 6 obtenus. Déterminer la loi de X ; calculer E(X) et V(X).* p = 1/6; law 125/216, 75/216 = 25/72, 15/216 = 5/72, 1/216 [sum 216/216]; E(X) = 1/2; V(X) = 3 x (1/6)(5/6) = 5/12. His formula cards from m3a/m3b are tested again here; `n p (1 - p)` is the only one that works (p^2 and p fail). Reviewed by line with the new mutations (`forgets_failures` 5/216...).

**(b) Twist: not binomial (the exam's urn, 3 balls drawn one after another WITHOUT replacement).** *Avec la même urne (4 rouges, 6 noires), on tire successivement et sans remise trois boules. Y = nombre de boules rouges obtenues. Déterminer p(Y = 1).* The student must see independence fails (the `remettant` word is gone) and use the Question 1 method: p(Y=1) = 60/120 = 1/2. The slip `binomial_for_dependent`: 3 x (2/5)(3/5)^2 = 54/125 (a known wrong value), message «الكور ما رجعوش، فكل مرة نبداو من نفس الحالة ما صحّتش». Also credit the route that continues to the whole law 20/120, 60/120, 36/120, 4/120 = 1/6, 1/2, 3/10, 1/30 (the numbers of the Question 2 picture; printed allowance).

---

## 4. Budgets and engine needs

Fast path, m3a: opening 1, plan 1, statement tap 1, recognise card 1, three lines 3, formula card 1, recipe 1 = **9**. m3b: plan 1, tap 1, four lines 4, formula card 1, recipe 1 = **8**. Record the m3a budget (10) in DECISIONS.

**Domain additions (reported, allowed):** template `binomial_term` (sequence, count, result) and `binomial_moments`; formula-card prediction kind (`formula_value`) in `claims.ts`; the mutations above; the checks `sequence_vs_event` (units variant). **Schema needs (decide in Phase 1, not in the reducer):** cross-question inputs (`q1.P_A`, `q2.*`), a claim set after the result (consolidation), formula cards with variables n and k substituted by the engine, and two method blocks in one question (3a and 3b as two questions if the loader supports sub-question labels). If any needs lesson-engine code, report it and do not patch.

**What the owner checks when playing:** you can name the plan alone; you do not need a formula before you have a number; the app calls "1/128 as P(X=k)" what it is; the formula cards are falsified by YOUR numbers; the die question works with the cards you picked.

Open questions (defaults in brackets): n = 7, k = 2 as the concrete case [yes]; both formula-card sets after the concrete case [yes]; the "without replacement" twist [yes]; sub-questions as two questions 3a and 3b if the loader supports it [yes].
