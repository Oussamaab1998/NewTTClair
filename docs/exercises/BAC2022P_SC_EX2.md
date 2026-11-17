# Exercice 2: arbre de probabilité (Bac Sciences expérimentales, session principale 2022, 3,5 points)

**OWNER: do not open this file before you test the exercise. It contains every answer and every explanation.**

Status (2026-11-11): source of the content of `bac2022p-sc-ex2` on the hybrid lesson. All Arabic written from this file is `reviewed: false` (draft wording, needs a Tunisian maths teacher).

## Source

Photos of the exam paper and of the official correction, given by the product owner on 2026-11-11. Fully readable. The official correction was used only to check the values; none of its wording is copied.

Ids: exercise `bac2022p-sc-ex2`; parts `t1`, `t2`, `t3`, `t4`; method blocks `mt1`..`mt4`; contentVersion `p22sc2-0.1.0`.

## Exam wording (transcribed exactly; question text = the part's goal)

> On considère l'arbre de probabilité ci-contre où A et F sont deux évènements tels que la probabilité de F est p(F) = 5/12.
> 1. Montrer que p(Ā ∩ F) = 1/4.
> 2. Calculer alors p(F / Ā).
> 3. Recopier et compléter l'arbre de probabilité.
> 4. Calculer p(Ā / F̄).

The printed tree: root → A with 2/3 on the branch, root → Ā (no number); A → F with 1/4, A → F̄ (no number); Ā → F (no number), Ā → F̄ (no number). The exam writes a conditional with a slash: p(F / Ā) is "F sachant Ā".

## Engine model

`src/engine/tree.ts` (`solveTwoEventTree`), graph templates `src/method/templatesTree.ts`. No `experiment` (urn only). Template arguments everywhere: `pA: [2,3]`, `pFgA: [1,4]`, `pF: [5,12]`.

Node vocabulary (node id = plan-card key = engine quantity; the same in every question):

| node | exam notation | exam value | right road |
|---|---|---|---|
| `a_and_f` | p(A ∩ F) | 1/6 | 2/3 × 1/4 |
| `na_and_f` | p(Ā ∩ F) | 1/4 | 5/12 − 1/6 |
| `not_a` | p(Ā) | 1/3 | 1 − 2/3 |
| `f_given_na` | p(F / Ā) | 3/4 | (1/4) ÷ (1/3) |
| `nf_given_a` | p(F̄ / A) | 3/4 | 1 − 1/4 |
| `nf_given_na` | p(F̄ / Ā) | 1/4 | 1 − 3/4 |
| `not_f` | p(F̄) | 7/12 | 1 − 5/12 |
| `na_and_nf` | p(Ā ∩ F̄) | 1/12 | 1/3 × 1/4 (or 1/3 − 1/4) |
| `na_given_nf` | p(Ā / F̄) | 1/7 | (1/12) ÷ (7/12) |

## Verified answers (recomputed with `src/engine` on 2026-11-11; tests recompute, never hard-code)

1. p(A ∩ F) = 2/3 × 1/4 = 1/6, then p(Ā ∩ F) = 5/12 − 1/6 = 3/12 = 1/4.
2. p(Ā) = 1/3, p(F / Ā) = (1/4)/(1/3) = 3/4.
3. Missing branches: p(Ā) = 1/3, p(F̄ / A) = 3/4, p(F / Ā) = 3/4, p(F̄ / Ā) = 1/4.
4. p(F̄) = 7/12, p(Ā ∩ F̄) = 1/12, p(Ā / F̄) = 1/7.

**Official correction:** no typo and no error; every printed value equals the engine's (`src/engine/tree.test.ts`).

**Traps (wrong roads that reach the right value on these numbers; the engine test `src/method/templatesTree.test.ts` lists them and the lesson refuses them):**

| question | node | wrong road | why it is tempting |
|---|---|---|---|
| 1 | `a_and_f` | 5/12 − 1/4 | uses the result that must be shown |
| 1 | `na_and_f` | 2/3 − 5/12 | subtracts the two printed numbers |
| 1 | `na_and_f` | (1/6) ÷ (2/3) | the target equals the printed branch |
| 2, 3 | `f_given_na` | 1 − 1/4 | complement taken across two different nodes |
| 2, 3 | `f_given_na` | 5/12 + 1/3 | chance |
| 3 | `nf_given_a` | (1/4) ÷ (1/3) | question 2's line again |
| 3 | `nf_given_na` | 5/12 − 1/6, 2/3 − 5/12, 1/3 × 3/4, (1/6) ÷ (2/3) | question 1's value is the same number |
| 4 | `not_f` | 1/4 + 1/3, 5/12 + 1/6, 3/4 − 1/6 | chance |
| 4 | `na_and_nf` | 1/4 − 1/6, 5/12 − 1/3, 3/4 − 2/3, 2/3 − 7/12, 1/2 − 5/12, 1/6 × 1/2 | chance |

Equal values to keep in mind: the printed branch 1/4 = the result of question 1 = p(F̄ / Ā); p(F / Ā) = p(F̄ / A) = 3/4. A value written alone is therefore never credited on this exercise (`proof`): he writes the calculation.

## Skills (`src/content/skillMap.json`; new ones `reviewed: false`)

`probability-tree`, `conditional-probability`, `total-probability`, `reverse-conditional` (new), `complement-event`, `fractions-operations`, `fractions-simplify` (existing).

## Vocabulary and writing rules for all Arabic of this exercise

- Derja, short sentences. French maths words stay French, each as its own `fr` run, at most ONE `fr` run per sentence: `arbre`, `branche`, `A barre`, `F barre`, `sachant`, `inter`.
- Never a letter with a bar, a formula, a digit or `∩` inside an `ar` run: the formula goes in `math` (LaTeX: `\overline{A}`, `\cap`, `\frac{}{}`; conditional written `p(F/\overline{A})`, never `\mid`).
- The step card shows the tree with the branch of the step marked, so texts can say «الطريق المعلَّم في الشجرة» (the marked path) and «الفرع المعلَّم».
- Words: «شجرة», «فرع / فروع», «طريق», «عقدة» (node), «نضربو», «نطرحو», «نقسمو», «نزيدو» (never «نجمعو»: banned), «قدّاش», «علاش», «كيفاش», «موش», «برك», «توّا». Never «واش», «شحال», «سحبة», «جوج», «جزء».
- A reply to a mistake says first what his line IS (what it computes or what is right in it), then asks one question that lets him see the gap.

## The figure (exercise `figure`)

`spec`: component `ProbabilityTree`, props `branches`:
- `a`: latex `A`, p `2/3`, show `given`; children `a.f` (latex `F`, p `1/4`, show `given`), `a.nf` (latex `\overline{F}`, show `blank`, node `nf_given_a`)
- `na`: latex `\overline{A}`, show `blank`, node `not_a`; children `na.f` (latex `F`, show `blank`, node `f_given_na`), `na.nf` (latex `\overline{F}`, show `blank`, node `nf_given_na`)

`marks` (plan-card key → branches): `a_and_f`: a, a.f · `split`: a, a.f, na, na.f · `na_and_f`: na, na.f · `not_a`: na · `rule`: na, na.f · `f_given_na`: na.f · `nf_given_a`: a.nf · `nf_given_na`: na.nf · `not_f`: a.nf, na.nf · `na_and_nf`: na, na.nf · `na_given_nf`: na, na.nf

## Statement, paper, results

- `statement`: fr «On considère l'arbre de probabilité ci-contre où A et F sont deux évènements tels que la probabilité de F est», math `p(F) = \frac{5}{12}`.
- `title`: fr «Exercice 2 : arbre de probabilité», ar «تمرين الشجرة».
- `paper`: points 3.5, source «Examen du baccalauréat · Session principale 2022 · Sciences expérimentales»; questions `t1` label 1 (fr «Montrer que», math `p(\overline{A} \cap F) = \frac{1}{4}`), `t2` label 2 (fr «Calculer alors», math `p(F/\overline{A})`), `t3` label 3 (fr «Recopier et compléter l'arbre de probabilité.»), `t4` label 4 (fr «Calculer», math `p(\overline{A}/\overline{F})`).
- `values` (engine call `tree`, args `quantity` + the three givens): `vAF` a_and_f, `vNAF` na_and_f, `vNA` not_a, `vFgNA` f_given_na, `vNFgA` nf_given_a, `vNFgNA` nf_given_na, `vNF` not_f, `vNANF` na_and_nf, `vNAgNF` na_given_nf.
- `results`: `r_t1` math `p(\overline{A} \cap F) = \val{vNAF}`; `r_t2` `p(F/\overline{A}) = \val{vFgNA}`; `r_t3` `p(\overline{A}) = \val{vNA},\ p(\overline{F}/A) = \val{vNFgA},\ p(F/\overline{A}) = \val{vFgNA},\ p(\overline{F}/\overline{A}) = \val{vNFgNA}`; `r_t4` `p(\overline{A}/\overline{F}) = \val{vNAgNF}`.
- Each part: `goal` = its paper wording, `expected` its result, `uses` earlier results it needs (t2: r_t1; t3: r_t2; t4: r_t3), `writeup.modelFr` = the French write-up below with `\val{}`.

## Trip overview (exercise from above)

says: «عندنا ⟨arbre⟩ ناقص: فيه زوز أعداد برك، والنص يعطينا احتمال آخر. في أربعة أسئلة نكمّلوه فرع بفرع، ومن بعد نقراوه بالمقلوب.»

- t1: «نلقاو احتمال طريق ما هوش مكتوب في الشجرة.» link: «نتيجتو تخدمنا في السؤال الثاني.»
- t2: «من الطريق هذاكا نلقاو فرع ناقص.» link: «الفرع هذا يتحطّ في الشجرة.»
- t3: «نكمّلو الفروع الناقصين الكل.» link: «الشجرة الكاملة تخدمنا في السؤال الأخير.»
- t4: «نقراو الشجرة بالمقلوب: نعرفو الآخر، ونلوّجو على الأوّل.»

---

## Question 1 (`t1` / `mt1`): template `tree_other_path`

Target: `p(\overline{A} \cap F) = \frac{1}{4}` («Montrer que»). Read token: «Montrer» (effect `{ "target": "given" }`), `read.sentence`: «Montrer que p(A̅ ∩ F) = 1/4.» is NOT usable (bar in plain text); use the statement token «arbre» instead: token `arbre`, effect `{ "figure": "tree" }`, prompt «اضغط على الكلمة اللي تقول منين نجيبو الأعداد.».

Skills: `probability-tree`, `total-probability`, `fractions-operations`.

### Trip

- have 1: «في الشجرة عندنا زوز فروع مكتوبين: الفرع الأوّل، ومن بعدو فرع ثاني.» math: `p(A) = \frac{2}{3} \quad ; \quad p(F/A) = \frac{1}{4}`
- have 2: «والنص يعطينا الاحتمال الكل متاع الحدث الثاني.» math: `p(F) = \frac{5}{12}`
- goal: «نورّيو اللي احتمال الطريق الآخر هو العدد اللي عطاه النص. النتيجة معروفة: المطلوب هو الحساب اللي يوصّل ليها.» math: `p(\overline{A} \cap F) = \frac{1}{4}`
- step `c_path` (title «الطريق المعروف»): «نحسبو احتمال الطريق اللي فروعو الزوز مكتوبين.»
- step `c_split` (title «الحدث من طريقين»): «نشوفو كيفاش الحدث الثاني يتقسم على طريقين في الشجرة.»
- step `c_rest` (title «الطريق الآخر»): «من الاحتمال الكل نطلّعو احتمال الطريق الآخر.»
- finish: «النتيجة لازم تطلع هي بيدها اللي في النص، مبسّطة للآخر.»
- after recipe: «تكتب الوصفة متاعك.» · after similar: «تحلّ سؤال شبيه وحدك.»

### Cards

| card | key | needs | built | short | text |
|---|---|---|---|---|---|
| `c_path` | `a_and_f` | – | lines | «الطريق المعروف» | «نحسبو احتمال الطريق اللي فروعو مكتوبين» |
| `c_split` | `split` | `c_path` | pick only | «طريقين» | «نشوفو منين يجي الحدث الثاني» |
| `c_rest` | `na_and_f` | `c_path`, `c_split` | lines | «الطريق الآخر» | «نطلّعو احتمال الطريق الآخر من الاحتمال الكل» |

`builtFrames`: `c_path`, `c_rest`. The pick `c_split` has `id: "c_split"`, `after: "c_split"` (as `c_type` in sc-ex2 3a).

**`c_path`** prompt: «اكتب الحساب: احتمال الطريق المعلَّم في الشجرة.» math `p(A \cap F)`
- header now «نحسبو احتمال الطريق المعروف» · why «هو الطريق الوحيد اللي أعدادو عندنا» · next «نشوفو منين يجي الحدث الثاني»
- hint 1: «شوف الطريق المعلَّم: قدّاش من فرع نتعدّاو عليه من الأوّل للآخر؟»
- hint 2: «باش نمشيو الطريق كامل، ناخذو الفرع الأوّل ومن بعدو الفرع الثاني: احتمال الطريق هو ضرب الفرعين.»
- hint 3 (old lesson only): math `p(A \cap F) = p(A) \times p(F/A)`

**`c_split`** (pick, evaluator `pick`) prompt: «الحدث الثاني يتحقّق من أنا طريق في الشجرة؟ اختار الكتيبة الصحيحة.»
- header now «نشوفو منين يجي الحدث الثاني» · why «الاحتمال الكل متاعو جاي من الطرق اللي توصّل ليه» · next «نطلّعو الطريق الآخر»
- hint 1: «تبّع بإصبعك في الشجرة: قدّاش من طريق يوفى عند نفس الحدث؟»
- hint 2: «فما طريق يتعدّى من فوق وطريق يتعدّى من تحت، وما يتقابلوش: الاحتمال الكل هو متاع الأوّل ومتاع الثاني مع بعضهم.»
- options:
  - `k_sum` true: «من طريقين: واحد يتعدّى من الفرع الفوقاني وواحد من التحتاني.» math `p(F) = p(A \cap F) + p(\overline{A} \cap F)`
  - `k_branches` false (misconception `mut.adds_branches_for_total`): «نزيدو الفرعين الأخرانيين لبعضهم.» math `p(F) = p(F/A) + p(F/\overline{A})` feedback: «الفرع الأخراني وحدو موش طريق كامل: يلزمو الفرع اللي قبلو. شوف: كل طريق فيه قدّاش من فرع؟»
  - `k_product` false (misconception `mut.multiplies_paths`): «نضربو الطريقين في بعضهم.» math `p(F) = p(A \cap F) \times p(\overline{A} \cap F)` feedback: «نضربو كي نمشيو فرع ومن بعدو فرع في نفس الطريق. هنا طريقين مختلفين، والحدث يجي من هذا ولا من هذا.»

**`c_rest`** prompt: «اكتب الحساب اللي يوصّل للنتيجة متاع النص.» math `p(\overline{A} \cap F)`
- header now «نطلّعو احتمال الطريق الآخر» · why «نعرفو الاحتمال الكل ونعرفو طريق منهم» · next «نكتبو في الورقة»
- hint 1: «عندك الاحتمال الكل، وعندك طريق من الزوز. كيفاش تلقى الطريق الآخر؟»
- hint 2: «الاحتمال الكل هو الطريق الأوّل مع الطريق الثاني: نطرحو منّو الطريق اللي حسبناه.»
- hint 3: math `p(\overline{A} \cap F) = p(F) - p(A \cap F)`

Expected lines: `2/3 × 1/4 = 2/12 = 1/6`; `5/12 − 1/6 = 3/12 = 1/4`.

### Recipe and method card

Pool: `rq_path` step «نحسبو الطريق اللي فروعو مكتوبين: نضربو فرع في فرع.» · `rq_split` step «نكتبو الحدث على طريقين في الشجرة.» · `rq_rest` step «نطرحو الطريق المعروف من الاحتمال الكل.» · `rq_check` check «نثبّت: النتيجة هي اللي في النص، والكسر مبسّط.» · `rq_d1` distractor «نطرحو العددين المكتوبين في النص من بعضهم.» · `rq_d2` distractor «نكتبو النتيجة متاع النص ونقولو هي الجواب.» · `rq_d3` distractor «نزيدو الفرعين متاع نفس الطريق لبعضهم.» Clean: `rq_path`, `rq_split`, `rq_rest`, `rq_check`.

Method card type: «احتمال طريق من ⟨arbre⟩ كي نعرفو الاحتمال الكل». Steps: «نحسبو الطريق المعروف: فرع في فرع.» «الحدث يجي من طريقين: الاحتمال الكل هو متاعهم مع بعض.» «نطرحو الطريق المعروف من الكل.» Checks: «الاحتمال بين الصفر والواحد.» «الكسر مبسّط.»

### Similar questions (engine-verified, no number of the statement or of its answers)

- `same` (same_structure): `tree_other_path`, args `pA [4,5]`, `pFgA [3,8]`, `pF [2,5]` → path 3/10, result 1/10. Statement fr: «Dans l'arbre de probabilité ci-contre, A et F sont deux évènements tels que p(F) = 2/5. Montrer que la probabilité de l'évènement « non A et F » est 1/10.» Figure: `a` 4/5 given, `a.f` 3/8 given, the rest blank.
- `twist` (twist: the printed branches are on the other side): `tree_other_path`, args `pA [1,8]`, `pFgA [4,5]`, `pF [2,5]`, `swap true` → path 1/10, result 3/10. Statement fr: «Dans l'arbre de probabilité ci-contre, A et F sont deux évènements tels que p(F) = 2/5. Montrer que p(A ∩ F) = 3/10.» Figure: `na` 1/8 given, `na.f` 4/5 given, the rest blank.

### Findings and write-up

- `f_path` nodes `a_and_f`, bridge true, title «احتمال الطريق المعروف», reason «نمشيو فرع ومن بعدو فرع: نضربو.», rule «احتمال طريق هو ضرب الفروع اللي فيه.», condition «كي الفرع الثاني مكتوب بعد الفرع الأوّل في نفس الطريق.»
- `f_rest` nodes `na_and_f`, viaCard `c_split`, bridge true, title «احتمال الطريق الآخر», reason «الحدث يجي من طريقين برك، نحّينا واحد.», rule «الاحتمال الكل متاع حدث هو الطرق اللي توصّل ليه مع بعضهم.», condition «كي الطرق ما يتقابلوش.»

Skeleton (French, our wording). A line with `math` is shown only once he has every value in it, so each line names at least one node (a line with no blank would give the method away before he found it):
- `k1` fr «Le long de la première branche :» math `p(A \cap F) = p(A) \times p(F/A) = \frac{2}{3} \times \frac{1}{4} = \his{a_and_f}`
- `k2` fr «F est la réunion de deux évènements incompatibles, A ∩ F et « non A » ∩ F, donc p(F) est la somme de leurs probabilités. D'où :» math `p(\overline{A} \cap F) = p(F) - p(A \cap F) = \frac{5}{12} - \his{a_and_f} = \his{na_and_f}`

### Small examples (class of 25 pupils; engine-verified: no value equals a value of the exercise, no slip gives the right number)

Counts for every case of this exercise: `n 25`, `a 16`, `af 3`, `naf 4` (A: 16 pupils, 3 of them F; not A: 9 pupils, 4 of them F; F in all: 7).

Story (all cases): «قسم فيه تلامذة. فيهم اللي يقراو في نادي الروبوتيك، وفيهم اللي يلبسو مرايات.» Legend: `A` «يقرا في نادي الروبوتيك» · `\overline{A}` «ما يقراش في النادي» · `F` «يلبس مرايات».

- t1 S1, card `a_and_f`: ask «نختارو تلميذ هكّاكة. قدّاش احتمال يكون في النادي ويلبس مرايات؟» hint «عدّ التلامذة اللي في آخر الطريق المعلَّم، واقسم على القسم الكل.» use: "a path as a count over everyone: 3 of 25; it is also 16/25 × 3/16".
- t1 S2, card `na_and_f` (the leaf count of not-A-and-F is hidden; «اللي يلبسو مرايات في القسم الكل» = 7 shown): ask «نعرفو قدّاش يلبسو مرايات في القسم الكل. قدّاش احتمال تلميذ ما هوش في النادي ويلبس مرايات؟» hint «اللي يلبسو مرايات جايين من الجهتين. نحّي منهم اللي في النادي.» use: "the other path as total minus the known path: (7 − 3)/25".

### Typical wrong lines (prepared replies in the slip library below)

`1/4` (branch for path), `2/3 + 1/4` (adds along the path), `5/12 − 1/4` on the last card (subtracts the branch, not the path), `2/3 − 5/12` (trap), `1/4` alone on the last card (the statement's number: note `given_value`), `5/12 − 1/6 = 3/12` (asked to simplify).

---

## Question 2 (`t2` / `mt2`): template `tree_conditional`

«Calculer alors p(F / Ā).» Read token: `alors` in `read.sentence` «Calculer alors la probabilité de F sachant non A.» (effect `{ "uses": "previous" }`), prompt «اضغط على الكلمة اللي تقول اللي نتيجة السؤال اللي قبل تخدمنا.». No target.

Skills: `conditional-probability`, `complement-event`, `fractions-operations`.

### Trip

- changed: «توّا نلوّجو على فرع، موش على طريق: الفرع التحتاني اللي يوصّل للحدث الثاني.»
- have 1 (carried `t1`/`na_and_f`): «احتمال الطريق التحتاني، من السؤال الأوّل.» math `p(\overline{A} \cap F) = \frac{1}{4}`
- have 2: «والفرع الأوّل الفوقاني مكتوب في الشجرة.» math `p(A) = \frac{2}{3}`
- goal: «نحسبو الفرع الناقص: احتمال الحدث الثاني كي نكونو ديجا في الجهة التحتانية.» math `p(F/\overline{A})`
- step `c_other` (title «الفرع الأوّل التحتاني»): «نلقاو الفرع الأوّل متاع الجهة التحتانية.»
- step `c_rule` (title «القاعدة»): «نختارو الكتيبة اللي تربط الطريق بالفرعين متاعو.»
- step `c_branch` (title «الفرع الناقص»): «من الطريق والفرع الأوّل نطلّعو الفرع الثاني.»
- finish: «النتيجة احتمال: بين الصفر والواحد، ومبسّطة.»

### Cards

| card | key | needs | built | short | text |
|---|---|---|---|---|---|
| `c_other` | `not_a` | – | lines | «الفرع الأوّل» | «نلقاو الفرع الأوّل متاع الجهة التحتانية» |
| `c_rule` | `rule` | `c_other` | pick only | «القاعدة» | «نختارو الكتيبة متاع الفرع الثاني» |
| `c_branch` | `f_given_na` | `c_other`, `c_rule` | lines | «الفرع الناقص» | «نطلّعو الفرع الثاني من الطريق» |

**`c_other`** prompt: «اكتب الحساب: الفرع المعلَّم في الشجرة.» math `p(\overline{A})`
- header now «نلقاو الفرع الأوّل التحتاني» · why «الطريق التحتاني يبدا بيه» · next «نختارو القاعدة»
- hint 1: «شوف العقدة الأولى: يخرجو منها زوز فروع، وواحد منهم مكتوب.»
- hint 2: «الفروع اللي خارجين من نفس العقدة يكمّلو بعضهم للواحد: نطرحو الفرع المكتوب من الواحد.»
- hint 3: math `p(\overline{A}) = 1 - p(A)`

**`c_rule`** (pick) prompt: «أنا كتيبة تعطينا الفرع الثاني التحتاني؟»
- header now «نختارو القاعدة» · why «الطريق هو فرع في فرع: نعرفو الطريق ونعرفو فرع» · next «نحسبو الفرع الناقص»
- hint 1: «الطريق التحتاني هو الفرع الأوّل في الفرع الثاني. نعرفو الطريق ونعرفو الفرع الأوّل.»
- hint 2: «كي نعرفو ضرب عددين ونعرفو واحد منهم، الآخر نلقاوه بالقسمة.»
- options:
  - `k_quot` true: «نقسمو احتمال الطريق على الفرع الأوّل متاعو.» math `p(F/\overline{A}) = \frac{p(\overline{A} \cap F)}{p(\overline{A})}`
  - `k_comp` false (misconception `mut.complement_across_nodes`): «نطرحو الفرع الفوقاني من الواحد.» math `p(F/\overline{A}) = 1 - p(F/A)` feedback: «الطرح من الواحد يصلح للفروع اللي خارجين من نفس العقدة. الفرعين هاذم خارجين من عقدتين مختلفين: شوفهم في الشجرة.»
  - `k_total` false (misconception `mut.divides_by_total`): «نقسمو احتمال الطريق على الاحتمال الكل متاع الحدث الثاني.» math `p(F/\overline{A}) = \frac{p(\overline{A} \cap F)}{p(F)}` feedback: «القسمة تكون على اللي نعرفوه ديجا: الجهة اللي احنا فيها. شنوّة مكتوب بعد العلامة المايلة؟»
  - `k_same` false (misconception `mut.intersection_for_conditional`): «هو بيدو احتمال الطريق، ما فيها حساب.» math `p(F/\overline{A}) = p(\overline{A} \cap F)` feedback: «الطريق كامل يبدا من الأوّل. الفرع الثاني يبدا من العقدة التحتانية برك: ما هوش نفس الحاجة.»

**`c_branch`** prompt: «اكتب الحساب: الفرع المعلَّم في الشجرة.» math `p(F/\overline{A})`
- header now «نحسبو الفرع الناقص» · why «عندنا الطريق وعندنا الفرع الأوّل» · next «نكتبو في الورقة»
- hint 1: «شنوّة تقسم على شنوّة؟ شوف القاعدة اللي اخترتها.»
- hint 2: «فوق: احتمال الطريق التحتاني. تحت: الفرع الأوّل التحتاني. والقسمة على كسر هي ضرب في مقلوبو.»
- hint 3: math `p(F/\overline{A}) = \frac{p(\overline{A} \cap F)}{p(\overline{A})}`

Expected lines: `1 − 2/3 = 1/3`; `(1/4) ÷ (1/3) = 1/4 × 3 = 3/4`.

### Recipe and method card

Pool: `rq_other` step «نلقاو الفرع الأوّل: نطرحو أخوه من الواحد.» · `rq_rule` step «نكتبو القاعدة: الطريق على الفرع الأوّل.» · `rq_divide` step «نقسمو، ونبسّطو.» · `rq_check` check «نثبّت: النتيجة بين الصفر والواحد.» · `rq_d1` distractor «نطرحو الفرع الفوقاني من الواحد.» · `rq_d2` distractor «نقسمو على الاحتمال الكل متاع الحدث الثاني.» · `rq_d3` distractor «نضربو الطريق في الفرع الأوّل.» Clean: `rq_other`, `rq_rule`, `rq_divide`, `rq_check`.

Method card type: «فرع ثاني من ⟨arbre⟩ كي نعرفو الطريق (⟨probabilité conditionnelle⟩)». Steps: «نلقاو الفرع الأوّل متاع نفس الجهة.» «نكتبو: الفرع الثاني هو الطريق على الفرع الأوّل.» «نقسمو ونبسّطو.» Checks: «النتيجة بين الصفر والواحد.» «قسمنا على الجهة اللي احنا فيها، موش على حاجة أخرى.»

### Similar questions

- `same`: `tree_conditional`, args `pA [1,5]`, `pFgA [2,5]`, `pFgNotA [3,8]` → p(not A) 4/5, answer 3/8; path given 3/10. Statement fr: «Dans l'arbre de probabilité ci-contre, on sait de plus que la probabilité de « non A et F » est 3/10. Calculer la probabilité de F sachant non A.» Figure: `a` 1/5 given, `a.f` 2/5 given, rest blank.
- `twist`: `tree_conditional`, args `pA [2,5]`, `pFgA [1,8]`, `pFgNotA [1,2]`, `swap true` → p(A) 3/5, answer 1/2; path given 3/10. Statement fr: «Dans l'arbre de probabilité ci-contre, on sait de plus que p(A ∩ F) = 3/10. Calculer la probabilité de F sachant A.» Figure: `na` 2/5 given, `na.f` 1/8 given, rest blank.

### Findings and write-up

- `f_other` nodes `not_a`, bridge true, title «الفرع الأوّل التحتاني», reason «الفرعين خارجين من نفس العقدة.», rule «الفروع اللي خارجين من نفس العقدة مجموعهم واحد.», condition «في نفس العقدة برك.»
- `f_branch` nodes `f_given_na`, viaCard `c_rule`, bridge true, title «الفرع الثاني التحتاني», reason «الطريق هو فرع في فرع، نقسمو باش نطلّعو فرع.», rule «الفرع الثاني هو احتمال الطريق مقسوم على الفرع الأوّل.», condition «كي الفرع الأوّل موش صفر.»

Skeleton:
- `k1` fr «Les deux premières branches partent du même nœud :» math `p(\overline{A}) = 1 - p(A) = 1 - \frac{2}{3} = \his{not_a}`
- `k2` fr «Par définition de la probabilité conditionnelle :» math `p(F/\overline{A}) = \frac{p(\overline{A} \cap F)}{p(\overline{A})} = \frac{\frac{1}{4}}{\his{not_a}} = \his{f_given_na}`

### Small examples

- t2 S1, card `not_a`: ask «قدّاش احتمال تلميذ ما يكونش في النادي؟» hint «عدّ اللي ما همش في النادي، واقسم على القسم الكل.» use: "the complement of the first branch as a count: 9 of 25 = 1 − 16/25".
- t2 S2, card `f_given_na`: ask «نعرفو اللي التلميذ ما هوش في النادي. قدّاش احتمال يلبس مرايات؟» hint «توّا ما عادش تعدّ القسم الكل: عدّ برك اللي ما همش في النادي، وشوف قدّاش منهم يلبسو مرايات.» use: "a conditional as a count among the not-A group only: 4 of 9 (not 4 of 25, not 4 of 7)".

### Typical wrong lines

`1 − 1/4 = 3/4` (trap: the right value by the complement of the other node), `1/4` alone (the path for the branch), `(1/4)/(5/12)` (divides by the total), `(1/3)/(1/4)` (upside down, above 1), `1/4 × 1/3` (multiplies), `3/4` alone (note `show_work`).

---

## Question 3 (`t3` / `mt3`): template `tree_complete`

«Recopier et compléter l'arbre de probabilité.» Read token: `compléter` (effect `{ "figure": "complete" }`), prompt «اضغط على الكلمة اللي تقول شنوّة نعملو بالشجرة.».

Skills: `probability-tree`, `complement-event`.

### Trip

- changed: «ما فماش حساب جديد كبير: نلمّو اللي لقيناه ونكمّلو الفروع اللي مازالو فارغين.»
- have 1 (carried `t2`/`not_a`): «الفرع الأوّل التحتاني، من السؤال الثاني.»
- have 2 (carried `t2`/`f_given_na`): «والفرع الثاني التحتاني، من السؤال الثاني زادة.»
- goal: «نكتبو عدد على كل فرع في الشجرة.» fr «Recopier et compléter l'arbre»
- step `c_first` (reuse `t2`/`not_a`, title «الفرع الأوّل التحتاني»): «لقيناه في السؤال الثاني.»
- step `c_low` (reuse `t2`/`f_given_na`, title «الفرع التحتاني للحدث الثاني»): «لقيناه في السؤال الثاني.»
- step `c_up` (title «الفرع الفوقاني الناقص»): «نكمّلو العقدة الفوقانية: أخو الفرع المكتوب.»
- step `c_last` (title «الفرع الأخير»): «نكمّلو العقدة التحتانية: أخو الفرع اللي لقيناه.»
- finish: «في كل عقدة، الفروع اللي خارجين منها مجموعهم واحد.»

### Cards (all built as lines; when the question is opened alone the first two are played too)

| card | key | needs | short | text |
|---|---|---|---|---|
| `c_first` | `not_a` | – | «الأوّل التحتاني» | «نلقاو الفرع الأوّل التحتاني» |
| `c_low` | `f_given_na` | `c_first` | «التحتاني للحدث» | «نلقاو الفرع التحتاني اللي يوصّل للحدث الثاني» |
| `c_up` | `nf_given_a` | – | «الفوقاني الناقص» | «نكمّلو العقدة الفوقانية» |
| `c_last` | `nf_given_na` | `c_low` | «الأخير» | «نكمّلو العقدة التحتانية» |

`c_first` and `c_low`: same prompts and hints as `c_other` and `c_branch` of question 2 (prompt of `c_low` without the pick: its hint 1 «الطريق التحتاني هو الفرع الأوّل في الفرع الثاني: نعرفو الطريق ونعرفو الفرع الأوّل.», hint 2 «نقسمو احتمال الطريق على الفرع الأوّل.»).

**`c_up`** prompt: «اكتب الحساب: الفرع المعلَّم في الشجرة.» math `p(\overline{F}/A)`
- header now «نكمّلو العقدة الفوقانية» · why «يخرجو منها زوز فروع وواحد مكتوب» · next «نكمّلو العقدة التحتانية»
- hint 1: «شوف العقدة الفوقانية: أنا فرع خارج منها مكتوب؟»
- hint 2: «الفرعين خارجين من نفس العقدة: نطرحو المكتوب من الواحد.»
- hint 3: math `p(\overline{F}/A) = 1 - p(F/A)`

**`c_last`** prompt: «اكتب الحساب: الفرع المعلَّم في الشجرة.» math `p(\overline{F}/\overline{A})`
- header now «نكمّلو العقدة التحتانية» · why «أخوه لقيناه» · next «نثبّتو الشجرة»
- hint 1: «شوف العقدة التحتانية: أنا فرع خارج منها نعرفوه توّا؟»
- hint 2: «نطرحو الفرع اللي لقيناه في نفس العقدة من الواحد. ما ناخذوش عدد من العقدة الفوقانية.»
- hint 3: math `p(\overline{F}/\overline{A}) = 1 - p(F/\overline{A})`

Pick after `c_last`, id `p_check`, prompt «كيفاش نثبّتو اللي الشجرة صحيحة؟»:
- header now «نثبّتو الشجرة» · why «غلطة في فرع تغلّط كل اللي بعدو» · next «نكتبو في الورقة»
- hints: «شوف عقدة وحدة والفروع اللي خارجين منها.» · «كل عقدة وحدها: فروعها يكمّلو بعضهم للواحد.»
- `k_node` true: «في كل عقدة، الفروع اللي خارجين منها مجموعهم واحد.»
- `k_column` false (misconception `mut.sums_a_column`): «الفروع الأخرانيين الأربعة مجموعهم واحد.» feedback: «الأربعة خارجين من عقدتين مختلفين: كل عقدة تتحسب وحدها.»
- `k_equal` false (misconception `mut.copies_another_branch`): «الفروع اللي يوصّلو لنفس الحدث عندهم نفس العدد.» feedback: «كل عقدة عندها أعدادها. نفس الحدث ينجّم يكون عندو احتمال آخر في الجهة الأخرى.»

Expected lines: `1 − 1/4 = 3/4`; `1 − 3/4 = 1/4` (plus, opened alone: `1 − 2/3 = 1/3`, `(1/4) ÷ (1/3) = 3/4`).

### Recipe and method card

Pool: `rq_given` step «نكتبو في الشجرة الأعداد اللي عندنا واللي لقيناهم.» · `rq_node` step «ناخذو عقدة عقدة.» · `rq_comp` step «في كل عقدة: نطرحو الفرع المعروف من الواحد.» · `rq_check` check «نثبّت: فروع كل عقدة مجموعهم واحد.» · `rq_d1` distractor «نعاودو نفس الأعداد في الجهة الأخرى.» · `rq_d2` distractor «نطرحو من الواحد فرع من عقدة أخرى.» · `rq_d3` distractor «نخلّيو الفروع الفارغين كيما هوما.» Clean: `rq_given`, `rq_node`, `rq_comp`, `rq_check`.

Method card type: «نكمّلو ⟨arbre⟩ ناقص». Steps: «نكتبو اللي نعرفوه.» «ناخذو عقدة عقدة.» «الفرع الناقص هو واحد ناقص أخوه.» Checks: «فروع كل عقدة مجموعهم واحد.» «ما خذيناش عدد من عقدة أخرى.»

### Similar questions

- `same`: `tree_complete`, args `pA [1,8]`, `pFgA [1,5]`, `pF [2,5]` → 7/8, 3/7, 4/5, 4/7; path given 3/8. Statement fr: «Dans l'arbre de probabilité ci-contre, on sait de plus que la probabilité de « non A et F » est 3/8. Recopier et compléter l'arbre.» Figure: `a` 1/8 given, `a.f` 1/5 given, rest blank.
- `twist` (two branches of the second level are printed): `tree_complete`, args `pA [3,8]`, `pFgA [1,8]`, `pFgNotA [3,5]` → 5/8, 7/8, 2/5. Statement fr: «Recopier et compléter l'arbre de probabilité ci-contre.» Figure: `a` 3/8 given, `a.f` 1/8 given, `na.f` 3/5 given, rest blank.

### Findings and write-up

- `f_nodes` nodes `nf_given_a`, `nf_given_na`, viaCard `p_check`, bridge true, title «الفروع الناقصين», reasons: `nf_given_a` «أخوه في العقدة الفوقانية مكتوب.», `nf_given_na` «أخوه في العقدة التحتانية لقيناه.», rule «في كل عقدة، الفروع مجموعهم واحد.», condition «الفروع اللي خارجين من نفس العقدة برك.»

Skeleton:
- `k1` fr «À chaque nœud, la somme des probabilités des branches vaut 1. Donc :» math `p(\overline{F}/A) = 1 - \frac{1}{4} = \his{nf_given_a}`
- `k2` fr «De même :» math `p(\overline{F}/\overline{A}) = 1 - \his{f_given_na} = \his{nf_given_na}`
- `k3` fr «On recopie l'arbre avec p(« non A ») = {not_a} sur la première branche du bas.»

### Small examples

- t3 S1, card `nf_given_a`: ask «نعرفو اللي التلميذ في النادي. قدّاش احتمال ما يلبسش مرايات؟» hint «عدّ برك اللي في النادي: اللي ما يلبسوش مرايات هوما الباقي.» use: "the sibling branch at the A node: 13 of 16 = 1 − 3/16".
- t3 S2, card `nf_given_na`: ask «نعرفو اللي التلميذ ما هوش في النادي. قدّاش احتمال ما يلبسش مرايات؟» hint «شوف جماعة اللي ما همش في النادي وحدهم: أعدادهم موش كيما أعداد الجماعة الأخرى.» use: "the sibling branch at the not-A node: 5 of 9, different from 13 of 16".

### Typical wrong lines

`1/4` on `c_up` (copies the sibling), `3/4` on `c_last` (copies another branch), `1 − 1/4 = 3/4` on `c_last` (complement of the other node), `(1/4)/(1/3) = 3/4` on `c_up` (trap), a value alone (note `show_work`).

---

## Question 4 (`t4` / `mt4`): template `tree_reverse`

«Calculer p(Ā / F̄).» Read token: `sachant` in `read.sentence` «Calculer la probabilité de non A sachant non F.» (effect `{ "condition": "not_f" }`), prompt «اضغط على الكلمة اللي تجي قبل الحاجة اللي نعرفوها.».

Skills: `reverse-conditional`, `conditional-probability`, `total-probability`, `complement-event`.

### Trip

- changed: «الشجرة تقرا من الأوّل للثاني. توّا السؤال بالمقلوب: نعرفو اللي الحدث الثاني ما صارش، ونلوّجو على الجهة.»
- have 1 (carried `t2`/`not_a`): «الفرع الأوّل التحتاني.»
- have 2 (carried `t3`/`nf_given_na`): «والفرع الأخير اللي كمّلنا بيه الشجرة.»
- have 3: «والاحتمال الكل متاع الحدث الثاني، من النص.» math `p(F) = \frac{5}{12}`
- goal: «نحسبو احتمال الجهة التحتانية، كي نعرفو اللي الحدث الثاني ما صارش.» math `p(\overline{A}/\overline{F})`
- step `c_cond` (title «اللي نعرفوه»): «نحسبو احتمال الحاجة اللي نعرفوها: الحدث الثاني ما صارش.»
- step `c_path` (title «الطريق»): «نحسبو الطريق اللي يتعدّى من الجهة التحتانية ويوفى عند نفس الحاجة.»
- step `c_back` (title «القسمة»): «نقسمو الطريق على اللي نعرفوه.»
- finish: «النتيجة احتمال، مبسّطة. وما هيش نفس العدد متاع الفرع المكتوب في الشجرة.»

### Cards

| card | key | needs | short | text |
|---|---|---|---|---|
| `c_cond` | `not_f` | – | «اللي نعرفوه» | «نحسبو احتمال اللي نعرفوه» |
| `c_path` | `na_and_nf` | – | «الطريق» | «نحسبو الطريق التحتاني اللي يوفى غادي» |
| `c_back` | `na_given_nf` | `c_cond`, `c_path` | «القسمة» | «نقسمو الطريق على اللي نعرفوه» |

**`c_cond`** prompt: «اكتب الحساب: احتمال الحاجة اللي نعرفوها.» math `p(\overline{F})`
- header now «نحسبو احتمال اللي نعرفوه» · why «هو اللي نقسمو عليه» · next «نحسبو الطريق»
- hint 1: «النص يعطي الاحتمال الكل متاع الحدث الثاني. توّا نحبّو عكسو.»
- hint 2: «الحدث وعكسو يكمّلو بعضهم للواحد: نطرحو الاحتمال متاع النص من الواحد.»
- hint 3: math `p(\overline{F}) = 1 - p(F)`

**`c_path`** prompt: «اكتب الحساب: احتمال الطريق المعلَّم في الشجرة.» math `p(\overline{A} \cap \overline{F})`
- header now «نحسبو الطريق التحتاني» · why «هو اللي يجمع الجهة المطلوبة واللي نعرفوه» · next «نقسمو»
- hint 1: «الطريق المعلَّم فيه زوز فروع، والزوز توّا مكتوبين في الشجرة.»
- hint 2: «كيما في السؤال الأوّل: احتمال الطريق هو ضرب الفرع الأوّل في الفرع الثاني.»
- hint 3: math `p(\overline{A} \cap \overline{F}) = p(\overline{A}) \times p(\overline{F}/\overline{A})`

**`c_back`** prompt: «اكتب القسمة.» math `p(\overline{A}/\overline{F})`
- header now «نقسمو الطريق على اللي نعرفوه» · why «نلوّجو على الجهة من وسط اللي نعرفوه برك» · next «نكتبو في الورقة»
- hint 1: «شنوّة مكتوب بعد العلامة المايلة؟ هذاكا اللي نقسمو عليه.»
- hint 2: «فوق: احتمال الطريق اللي يجمع الزوز. تحت: احتمال اللي نعرفوه. موش الفرع الأوّل.»
- hint 3: math `p(\overline{A}/\overline{F}) = \frac{p(\overline{A} \cap \overline{F})}{p(\overline{F})}`

Pick after `c_back`, id `p_order`, prompt «العدد اللي لقيتو، هو نفس الفرع الأخير في الشجرة؟»:
- header now «نفرّقو بين الاحتمالين» · why «الترتيب بعد العلامة المايلة يبدّل المعنى» · next «نكتبو في الورقة»
- hints: «شوف في كل واحد: شنوّة اللي نعرفوه؟» · «في الشجرة نعرفو الجهة ونلوّجو على الحدث. هنا نعرفو الحدث ونلوّجو على الجهة.»
- `k_diff` true: «لا: في واحد نعرفو الجهة، وفي الآخر نعرفو اللي الحدث ما صارش.» math `p(\overline{A}/\overline{F}) \neq p(\overline{F}/\overline{A})`
- `k_same` false (misconception `mut.condition_for_reverse`): «إيه: نفس الحدثين، يعني نفس الاحتمال.» feedback: «نفس الحدثين، أما اللي نعرفوه تبدّل. شوف أعدادك: الزوز نتايج موش كيف كيف.»
- `k_inverse` false (misconception `mut.quotient_upside_down`): «واحد مقلوب الآخر.» feedback: «المقلوب متاع احتمال يفوت الواحد. اللي تبدّل هو اللي نقسمو عليه برك.»

Expected lines: `1 − 5/12 = 7/12`; `1/3 × 1/4 = 1/12`; `(1/12) ÷ (7/12) = 1/12 × 12/7 = 1/7`.

### Recipe and method card

Pool: `rq_cond` step «نحسبو احتمال اللي نعرفوه.» · `rq_path` step «نحسبو الطريق اللي يجمع الزوز: فرع في فرع.» · `rq_divide` step «نقسمو الطريق على اللي نعرفوه، ونبسّطو.» · `rq_check` check «نثبّت: قسمنا على اللي مكتوب بعد العلامة المايلة.» · `rq_d1` distractor «ناخذو الفرع المكتوب في الشجرة كيما هو.» · `rq_d2` distractor «نقسمو على الفرع الأوّل.» · `rq_d3` distractor «نضربو الطريق في اللي نعرفوه.» Clean: `rq_cond`, `rq_path`, `rq_divide`, `rq_check`.

Method card type: «نقراو ⟨arbre⟩ بالمقلوب». Steps: «نحسبو احتمال اللي نعرفوه.» «نحسبو الطريق اللي يجمع الزوز.» «نقسمو الطريق على اللي نعرفوه.» Checks: «النتيجة بين الصفر والواحد.» «قسمنا على اللي بعد العلامة المايلة.» «النتيجة موش لازم تكون كيما الفرع متاع الشجرة.»

### Similar questions

- `same` (the tree is printed complete): `tree_reverse`, args `pA [3,10]`, `pFgA [3,5]`, `pFgNotA [1,5]` → 17/25, 14/25, answer 14/17. Statement fr: «L'arbre de probabilité ci-contre est complet. Calculer la probabilité de non A sachant non F.» Figure: every branch given (`a` 3/10, `a.f` 3/5, `a.nf` 2/5, `na` 7/10, `na.f` 1/5, `na.nf` 4/5).
- `twist` (no tree: a story, he draws it on his paper): `tree_reverse`, args `pA [2,5]`, `pFgA [1,2]`, `pFgNotA [2,5]` → 14/25, 9/25, answer 9/14. Statement fr: «Dans un lycée, 40 % des élèves sont internes. Parmi les internes, 50 % viennent au lycée à pied ; parmi les autres élèves, 40 % viennent à pied. On choisit un élève au hasard : il ne vient pas à pied. Quelle est la probabilité qu'il ne soit pas interne ?» No figure.

### Findings and write-up

- `f_cond` nodes `not_f`, bridge true, title «احتمال اللي نعرفوه», reason «الحدث وعكسو يكمّلو بعضهم للواحد.», rule «احتمال عكس حدث هو واحد ناقص احتمالو.», condition «ديما.»
- `f_path` nodes `na_and_nf`, bridge true, title «الطريق اللي يجمع الزوز», reason «فرع ومن بعدو فرع: نضربو.», rule «احتمال طريق هو ضرب فروعو.», condition «في نفس الطريق.»
- `f_back` nodes `na_given_nf`, viaCard `p_order`, bridge true, title «الاحتمال بالمقلوب», reason «نقسمو على اللي نعرفوه.», rule «احتمال حدث كي نعرفو حدث آخر: الطريق اللي يجمعهم على احتمال اللي نعرفوه.», condition «كي احتمال اللي نعرفوه موش صفر.»

Skeleton:
- `k1` fr «On a :» math `p(\overline{F}) = 1 - p(F) = 1 - \frac{5}{12} = \his{not_f}`
- `k2` fr «Le long de la branche du bas :» math `p(\overline{A} \cap \overline{F}) = p(\overline{A}) \times p(\overline{F}/\overline{A}) = \his{na_and_nf}`
- `k3` fr «Donc :» math `p(\overline{A}/\overline{F}) = \frac{p(\overline{A} \cap \overline{F})}{p(\overline{F})} = \frac{\his{na_and_nf}}{\his{not_f}} = \his{na_given_nf}`

### Small examples

- t4 S1, card `not_f`: ask «قدّاش احتمال تلميذ ما يلبسش مرايات؟» hint «عدّ اللي ما يلبسوش مرايات في الجهتين، واقسم على القسم الكل.» use: "the complement of F as a count: 18 of 25 = 1 − 7/25".
- t4 S2, card `na_and_nf`: ask «قدّاش احتمال تلميذ ما هوش في النادي وما يلبسش مرايات؟» hint «عدّ اللي في آخر الطريق المعلَّم، واقسم على القسم الكل.» use: "a path as a count: 5 of 25 = 9/25 × 5/9".
- t4 S3, card `na_given_nf`: ask «نعرفو اللي التلميذ ما يلبسش مرايات. قدّاش احتمال ما يكونش في النادي؟» hint «توّا تعدّ برك اللي ما يلبسوش مرايات، من الجهتين. قدّاش منهم ما همش في النادي؟» use: "the reversed conditional as a count among the not-F pupils: 5 of 18, different from 5 of 9".

### Typical wrong lines

`1/4` on the last card (takes the tree's branch: condition the wrong way round), `(1/12)/(1/3) = 1/4` (divides by the first branch), `(7/12)/(1/12) = 7` (upside down), `1/3 + 1/4` on the first card (trap: chance), `5/12` on the first card (forgets the complement), `1/3 × 3/4` on the second (wrong second branch).

---

## Slip library (`src/content/methodMutations.tree.misconceptions.json`, ids `mut.<slip>`)

One entry per slip id of `roadsOf` in `src/method/templatesTree.ts`, plus `mut.coincidence`, `mut.sums_a_column`, `mut.multiplies_paths`. `feedback` is the question form (value matched only), `feedbackConfirmed` the form used when the engine read the road. Each says what the line is first.

| id | skill | feedback (asked) | feedbackConfirmed |
|---|---|---|---|
| `adds_along_path` | probability-tree | «زدت الفرعين لبعضهم؟ في نفس الطريق نمشيو فرع ومن بعدو فرع.» | «زدت الفرعين متاع نفس الطريق لبعضهم. الأعداد صحاح، أما في نفس الطريق نمشيو فرع ومن بعدو فرع: شنوّة العملية؟» |
| `branch_for_path` | probability-tree | «هذا عدد فرع وحدو؟ الطريق يبدا من الأوّل.» | «هذا عدد الفرع الثاني وحدو: احتمالو كي نكونو ديجا في نصّ الطريق. الطريق كامل يبدا من الأوّل: شنوّة ناقص؟» |
| `first_branch_for_path` | probability-tree | «هذا الفرع الأوّل وحدو؟ الطريق فيه فرع آخر بعدو.» | «هذا الفرع الأوّل وحدو. الطريق يكمّل بفرع آخر: شنوّة تعمل بيه؟» |
| `total_for_path` | total-probability | «هذا الاحتمال الكل متاع الحدث؟ هو جاي من طريقين.» | «هذا الاحتمال الكل متاع الحدث، وهو جاي من طريقين. احنا نحبّو طريق واحد.» |
| `uses_the_target` | total-probability | «استعملت النتيجة اللي لازم نورّيوها؟» | «حسابك صحيح، أما استعملت فيه النتيجة اللي السؤال يطلب نورّيوها. احسب الطريق هذا من الفروع المكتوبين في الشجرة.» |
| `subtracts_branch_not_path` | total-probability | «طرحت فرع وحدو؟ اللي يتطرح هو طريق كامل.» | «بديت مليح من الاحتمال الكل، أما طرحت منّو فرع وحدو. اللي يتطرح هو الطريق الكامل اللي حسبتو قبل.» |
| `adds_instead_of_subtracts` | total-probability | «زدت الطريق على الكل؟ الكل فيه الطريق هذا ديجا.» | «خذيت الاحتمال الكل والطريق، هذا صحيح. أما الكل فيه الطريق هذا ديجا: كيفاش تطلّع الباقي؟» |
| `first_minus_total` | total-probability | «طرحت العددين المكتوبين من بعضهم؟ واحد فرع والآخر احتمال كل.» | «العدد يطابق النتيجة، أما بالصدفة: طرحت فرع من احتمال كل، وهاذم موش من نفس النوع. منين يجي الحدث الثاني في الشجرة؟» |
| `complement_of_total` | complement-event | «هذا احتمال عكس الحدث؟ احنا نحبّو حاجة أخرى.» | «هذا احتمال اللي الحدث الثاني ما يصيرش. الحساب صحيح، أما موش هو المطلوب في الخطوة هاذي.» |
| `complement_of_path` | total-probability | «طرحت الطريق من الواحد؟ الباقي فيه أكثر من طريق.» | «طرحت الطريق من الواحد: الباقي فيه الطرق الأخرين الكل، موش الطريق اللي نلوّجو عليه برك.» |
| `lower_branch_like_upper` | probability-tree | «خذيت نفس الفرع متاع الجهة الفوقانية؟» | «ضربت فرع في فرع، هذي الفكرة الصحيحة. أما الفرع الثاني اللي خذيتو متاع الجهة الفوقانية: الجهة التحتانية عندها عددها.» |
| `complement_forgotten` | complement-event | «هذا العدد المكتوب بيدو؟ احنا نحبّو عكسو.» | «هذا العدد المكتوب بيدو. احنا نلوّجو على أخوه: الفرع الآخر اللي خارج من نفس العقدة.» |
| `inverts_instead_of_complement` | complement-event | «قلبت الكسر؟ الاحتمال ما يفوتش الواحد.» | «قلبت الكسر، والنتيجة تفوت الواحد: تنجّم تكون احتمال؟ عكس حدث يتحسب بالطرح من الواحد.» |
| `complement_of_other_branch` | complement-event | «طرحت من الواحد فرع من عقدة أخرى؟» | «الطرح من الواحد صحيح كفكرة، أما الفرع اللي طرحتو خارج من عقدة أخرى. أنا فرع خارج من نفس العقدة؟» |
| `complement_across_nodes` | conditional-probability | «طرحت من الواحد فرع من العقدة الأخرى؟» | «الطرح من الواحد يصلح للفروع اللي خارجين من نفس العقدة. الفرع اللي طرحتو خارج من العقدة الأخرى، حتى كان العدد يطلع يشبّه. شوف العقدتين في الشجرة.» |
| `divides_by_total` | conditional-probability | «قسمت على الاحتمال الكل متاع الحدث الثاني؟» | «القسمة هي الفكرة الصحيحة، وفوق حطّيت الطريق الصحيح. أما تحت: نقسمو على الجهة اللي نعرفوها، موش على الحدث الثاني.» |
| `divides_by_first_branch` | conditional-probability | «قسمت على الفرع الفوقاني؟ الطريق متاعنا تحتاني.» | «قسمت الطريق على فرع أوّل، هذي الفكرة. أما الفرع اللي خذيتو متاع الجهة الفوقانية، والطريق تحتاني.» |
| `quotient_upside_down` | fractions-operations | «القسمة مقلوبة؟ النتيجة تفوت الواحد.» | «خذيت العددين الصحاح، أما القسمة مقلوبة: النتيجة تفوت الواحد. تنجّم تكون احتمال؟» |
| `multiplies_instead_of_divides` | conditional-probability | «ضربت؟ الطريق هو ديجا ضرب الفرعين.» | «العددين صحاح. أما الطريق هو ديجا ضرب الفرعين: باش نرجّعو فرع واحد، شنوّة العملية المعاكسة؟» |
| `intersection_for_conditional` | conditional-probability | «هذا احتمال الطريق كامل؟ احنا نحبّو الفرع الثاني برك.» | «هذا احتمال الطريق كامل، من الأوّل. الفرع الثاني يبدا من العقدة برك: ما هوش نفس الحاجة.» |
| `copies_another_branch` | probability-tree | «هذا عدد فرع آخر في الشجرة؟ كل فرع عندو عددو.» | «هذا عدد فرع آخر في الشجرة. الفرع اللي نلوّجو عليه يتحسب من أخوه، في نفس العقدة.» |
| `complement_of_first_branch` | complement-event | «طرحت من الواحد فرع من العقدة الأولى؟» | «الطرح من الواحد صحيح، أما الفرع اللي طرحتو خارج من العقدة الأولى. احنا في عقدة أخرى.» |
| `quotient_for_complement` | probability-tree | «عاودت حساب فرع آخر؟» | «العدد يطابق، أما الحساب هذا متاع فرع آخر، في العقدة التحتانية. الفرع هذا في العقدة الفوقانية: أنا فرع خارج معاه؟» |
| `adds_branches_for_total` | total-probability | «زدت فرعين من عقدتين مختلفين؟» | «زدت فرعين خارجين من عقدتين مختلفين. الفرع الأخراني وحدو موش طريق كامل.» |
| `wrong_second_branch` | probability-tree | «الفرع الثاني اللي خذيتو يوصّل لحدث آخر؟» | «ضربت فرع في فرع، هذي الفكرة. أما الفرع الثاني اللي خذيتو يوصّل للحدث الآخر: شوف الطريق المعلَّم.» |
| `reverses_condition` | reverse-conditional | «قسمت على الفرع الأوّل؟ اللي نعرفوه هنا حاجة أخرى.» | «فوق حطّيت الطريق الصحيح. أما قسمت على الفرع الأوّل: هكّا ترجع للفرع اللي في الشجرة. هنا اللي نعرفوه هو اللي بعد العلامة المايلة.» |
| `condition_for_reverse` | reverse-conditional | «هذا الفرع المكتوب في الشجرة؟ السؤال بالمقلوب.» | «هذا الفرع المكتوب في الشجرة: فيه نعرفو الجهة ونلوّجو على الحدث. السؤال بالمقلوب: شنوّة اللي نعرفوه هنا؟» |
| `divides_by_other_total` | reverse-conditional | «قسمت على احتمال الحدث، موش على عكسو؟» | «القسمة والطريق صحاح. أما تحت حطّيت احتمال الحدث الثاني، واللي نعرفوه هو عكسو.» |
| `coincidence` | probability-tree | «العدد يطابق، أما منين جاو الأعداد اللي في حسابك؟» | «العدد يطابق النتيجة، أما بالصدفة: الحساب هذا ما يتبعش حتى طريق في الشجرة. قول: كل عدد في سطرك، أنا فرع ولا أنا طريق هو؟» |
| `sums_a_column` | probability-tree | – (pick only) | – |
| `multiplies_paths` | total-probability | – (pick only) | – |

Short names for the similar-question review (`method.mut.<id>` in i18n, ar / fr): written by the content author in the same spirit (three to five words each).

## Prepared reply templates (`src/content/replyTemplates.bac2022p-sc-ex2.json`)

Few, where the library text alone is not enough (segments may not contain digits):
- `bare_given` (card `na_and_f`, line kind `bare`, reasons `line_note`): his line, «هذا العدد يعطيه النص: المطلوب هو الطريق اللي يوصّل ليه.», «من أنا عدد تبدا: الاحتمال الكل ولا الطريق اللي حسبتو؟»
- `unsimplified_target` (card `na_and_f`, line kind `unsimplified`, reasons `line_note`): his line, «حسابك صحيح. النص يكتب النتيجة مبسّطة:», the target, «فما عدد يقسم الفوق والتحت مع بعض؟»
- `above_one_quotient` (misconception `mut.quotient_upside_down`, reasons `slip_first`, `slip_again`, `slip_third`): his line, «سطرك يعطي:», his value, «احتمال ينجّم يفوت الواحد؟»
- `trap_complement` (card `f_given_na`, misconception `mut.complement_across_nodes`, reasons `slip_first`): his line, «العدد يطلع يشبّه للصحيح، أما الطريقة ما تصلحش هنا.», «الفرعين اللي في حسابك خارجين من نفس العقدة؟ شوف الشجرة.»

## Writeup (French, what goes on the paper; our wording, draft)

1. F est réalisé par deux chemins de l'arbre qui ne se rencontrent pas : p(F) = p(A ∩ F) + p(Ā ∩ F). Or p(A ∩ F) = p(A) × p(F / A) = 2/3 × 1/4 = 1/6. Donc p(Ā ∩ F) = 5/12 − 1/6 = 3/12 = 1/4.
2. p(Ā) = 1 − 2/3 = 1/3, donc p(F / Ā) = p(Ā ∩ F) / p(Ā) = (1/4) / (1/3) = 3/4.
3. À chaque nœud la somme des branches vaut 1 : p(F̄ / A) = 1 − 1/4 = 3/4 et p(F̄ / Ā) = 1 − 3/4 = 1/4 ; on recopie l'arbre avec 1/3 sur la branche de Ā et 3/4 sur la branche de F après Ā.
4. p(F̄) = 1 − 5/12 = 7/12 et p(Ā ∩ F̄) = 1/3 × 1/4 = 1/12, donc p(Ā / F̄) = (1/12) / (7/12) = 1/7.

(All wording is a draft; Arabic needs teacher review.)
