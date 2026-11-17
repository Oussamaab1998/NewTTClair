# The warm-up before an exercise

The owner decided this on 2026-11-17. Each exercise has **its own** small questions. They are asked **once, before the whole exercise**, never before each question.

They check what the exercise needs: its own skills, and the older skills under them (from earlier school years).

**What the student sees**
- **First, an explanation (D84).** «قبل ما نبداو»: we want to know his level on what this exercise needs. Four short lines: small questions one by one; not an exam, no mark; «ما نعرفش» helps too; his answers guide him in the exercise. Then «باش نثبّتو في:» with chips of what it checks (the main questions' `topic`, in French). Then «نبداو التسخين»; «نفوتو للتمرين» goes straight to the exercise.
  - This text is the screen's own (i18n `warmup.*`), the same for every exercise. An exercise can add one sentence of its own with the optional `intro`.
- **Each question:** a header with «تسخين قبل التمرين», the exercise title and a progress bar ("1 / 4"), then «هالسؤال يثبّت في» with the question's topic chip.
- It is not a test: «ما نعرفش» is an answer, «نفوتو للتمرين» skips the rest, and nothing is ever marked right or wrong.
- The end shows one general sentence (`done.clean` when he got everything right, `done.gaps` otherwise), then «نبداو التمرين».

**What his answers feed**
- His profile: evidence on each skill, which drives the worksheet's scaffolds. The record is in `warmups[exerciseId]`.
- The tutor: lines at the top of the profile digest in every AI call for this exercise (`src/ai/profile/digest.ts`).

«ابدا من جديد» forgets the warm-up with the rest of the exercise.

**Code**
- `src/warmup/warmup.ts`: the walk, the content checks, the tutor lines.
- `src/app/screens/hybrid/warmup/`: the screen and the gate in front of the lesson board.
- `applyWarmup` in `src/ai/profile/profile.ts`.
- The schema: `WarmupSchema` in `src/content/schema.ts`.

## Adding the warm-up of a new exercise
Put it in the exercise's JSON, as `"warmup"`:
```json
"warmup": {
  "start": ["w1", "w2", "w3"],
  "questions": [
    { "id": "w1", "skill": "combinations-count", "topic": "dénombrement",
      "prompt": { "ar": [{ "ar": "صندوق فيه أربعة كور..." }] },
      "input": { "kind": "line", "answer": "C(4,2)", "keys": "counting",
                 "wrong": [{ "expr": "4*3", "means": "counted ordered draws" }] },
      "down": "w1b" },
    { "id": "w2", "skill": "exp-rules", "topic": "exponentielle",
      "prompt": { "ar": [{ "ar": "شنوّة يساوي الضرب هذا؟" }], "math": "e^{2} \\times e^{3}" },
      "input": { "kind": "pick", "cards": [
        { "id": "k_add", "text": { "math": "e^{5}" }, "truth": "true" },
        { "id": "k_mul", "text": { "math": "e^{6}" }, "truth": "false", "means": "multiplies the exponents" } ] } }
  ],
  "done": { "clean": { "ar": [{ "ar": "الحاجات اللي يحتاجها التمرين واضحة عندك..." }] }, "gaps": { "ar": [{ "ar": "عرفنا وين نبداو..." }] } },
  "reviewed": false
}
```

**Rules (the loader and `src/warmup/warmup.test.ts` check them)**
- **Size:** 3 to 5 main questions in `start`. At most 5 questions are asked in all, easier ones included.
- **Skills:** each question checks one skill of `src/content/skillMap.json`. Start with the skill closest to the exercise; its `down` is the easier, older skill to ask when he misses it.
- **Topic:** each question has a `topic`, the French math term the student knows for what it checks («dénombrement», «événement contraire»). It is at most 32 characters, in lower-case letters, with no digits, no math and no answer. The explanation screen lists the main questions' topics once each, so two main questions on the same thing share one chip.
- **Line answers:**
  - `answer` is a calculation the engine reads (`C(4,2)`, `1-1/4`), never a typed value.
  - `wrong` lists known wrong calculations; each must differ from the answer and carries a short English `means` for the tutor.
  - `keys: "counting"` adds the C and ! keys.
- **Picks:** exactly one card has `truth: "true"`. A wrong card's `means` says what that choice shows about him.
- **No spoilers:** never a number, a question or a calculation of the exercise itself. Use other numbers (the tree's warm-up uses 3/5, not the tree's fractions).
- **Arabic:**
  - Tunisian darija, with no digit inside an Arabic run.
  - Formulas go in `math`, and a French term goes in its own `fr` run.
  - Mark it `reviewed: false` until a teacher reads it.

## The warm-ups today

### bac2022c-ex2: Exercice 2 : probabilités
Main questions, in order: w_pairs, w_comp, w_zero, w_mean.

| Question | Topic | Skill (year) | Kind | Prompt | If missed |
|---|---|---|---|---|---|
| w_pairs | dénombrement | combinations-count (4s) | line | صندوق فيه أربعة كور. نجبدو زوز كور مع بعض: قدّاش من تيراج ممكن؟ | w_list |
| w_list | lister les cas | listing-systematically (9b) | line | ثلاثة كور مكتوب عليهم أ، ب، ج. نجبدو زوز مع بعض: قدّاش من زوز مختلف؟ | - |
| w_comp | événement contraire | complement-event (4s) | line | هذا احتمال حدث. شنوّة احتمال العكس متاعو؟ $p(A) = \frac{1}{4}$ | w_frac |
| w_frac | fractions | fractions-operations (7b) | line | احسب: $1 - \frac{3}{10}$ | - |
| w_zero | produit nul | product-zero (9b) | pick | شنوّة قيمة الجداء هذا؟ $(-1) \times 0$ | - |
| w_mean | espérance | expectation (4s) | line | متغيّر ياخذ القيمتين هاذوما، كل وحدة باحتمال نص. شنوّة المتوسّط متاعو؟ $0 \quad \text{et} \quad 2$ | - |

### bac2022c-ex4: Exercice 4 : étude d'une fonction
Main questions, in order: w_parity, w_exp, w_limit, w_quot.

| Question | Topic | Skill (year) | Kind | Prompt | If missed |
|---|---|---|---|---|---|
| w_parity | parité | function-parity (2s) | pick | الدالة هاذي: $g(x) = x^{2} + 1$ | - |
| w_exp | exponentielle | exp-rules (4s) | pick | شنوّة يساوي الضرب هذا؟ $e^{2} \times e^{3}$ | w_pow |
| w_pow | puissances | powers-rules (8b) | pick | شنوّة يساوي الضرب هذا؟ $2^{2} \times 2^{3}$ | - |
| w_limit | limites | exp-limits (4s) | pick | كي المتغيّر يكبر برشا، وين يمشي العدد هذا؟ $e^{-x}$ | w_sign |
| w_sign | signe de l'exponentielle | exp-rules (4s) | pick | شنوّة علامة العدد هذا؟ $e^{-3}$ | - |
| w_quot | dérivée d'un quotient | quotient-rule (3s) | pick | شنوّة قاعدة الكسر؟ $\left(\frac{u}{v}\right)'$ | w_der |
| w_der | dérivée | derivative-meaning (3s) | pick | شنوّة يساوي الحساب هذا؟ $\left(x^{2}\right)'$ | - |

### bac2022c-sc-ex2: Exercice 2 : probabilités (urne rouge et noire)
Main questions, in order: w_draws, w_product, w_ratio, w_binom.

| Question | Topic | Skill (year) | Kind | Prompt | If missed |
|---|---|---|---|---|---|
| w_draws | dénombrement | combinations-count (4s) | line | صندوق فيه خمسة كور. نجبدو ثلاثة مع بعض: قدّاش من تيراج ممكن؟ | w_list |
| w_list | lister les cas | listing-systematically (9b) | line | ثلاثة كور مكتوب عليهم أ، ب، ج. نجبدو زوز مع بعض: قدّاش من زوز مختلف؟ | - |
| w_product | principe multiplicatif | multiplication-principle (4s) | line | عندنا ثلاثة مريولات وزوز سراول. قدّاش من لبسة مختلفة ننجّمو نعملو؟ | - |
| w_ratio | équiprobabilité | probability-by-counting (4s) | line | صندوق فيه زوز كور حمر وثلاثة كحل. نجبدو كورة وحدة: شنوّة احتمال إنّها حمراء؟ | - |
| w_binom | loi binomiale | binomial-law (4s) | pick | نرميو قطعة نقود ثلاثة مرّات. شنوّة الصحيح على المرّات هاذوما؟ | - |

### bac2022p-sc-ex2: Exercice 2 : arbre de probabilité
Main questions, in order: w_mult, w_branch, w_cond, w_comp.

| Question | Topic | Skill (year) | Kind | Prompt | If missed |
|---|---|---|---|---|---|
| w_mult | produit de fractions | fractions-operations (7b) | line | احسب: $\frac{3}{5} \times \frac{1}{2}$ | w_simplify |
| w_simplify | simplification | fractions-simplify (7b) | pick | شنوّة الكسر اللي يساوي هذا؟ $\frac{6}{12}$ | - |
| w_branch | arbre pondéré | probability-tree (4s) | pick | في شجرة احتمالات، الفروع اللي يخرجو من نفس العقدة: قدّاش مجموعهم؟ | - |
| w_cond | probabilité conditionnelle | conditional-probability (4s) | pick | شنوّة تعني الكتيبة هاذي؟ $p(F/A)$ | - |
| w_comp | événement contraire | complement-event (4s) | line | هذا احتمال حدث. شنوّة احتمال العكس متاعو؟ $p(A) = \frac{3}{5}$ | - |
