# Exercise 2 — Probabilités (Bac Maths, session de contrôle 2022, 3.5 pts)

## Statement (French, paraphrased for our content; keep the original wording in the app)
An urn contains five balls numbered -1, 0, 0, 1, 2, indistinguishable by touch. A trial = draw **two balls simultaneously**.
1. A: "the two balls have the same number"; B: "at least one ball numbered 0". (a) Compute p(A). (b) Show p(B)=7/10.
2. X = product of the two numbers. (a) Law of X. (b) E(X) and V(X).
3. Repeat the trial n times (n≥2), putting the balls back each time. Y = number of times at least one ball 0 is obtained. (a) p(Y=1). (b) Smallest n such that the mean number of times is ≥ 5.

## Verified answers (recompute in engine tests)
- Outcomes: C(5,2)=10 unordered pairs (balls have ids; two balls with value 0).
- 1.a p(A)=1/10 (only {0,0'}).
- 1.b complement: no ball 0 -> pairs from {-1,1,2}: C(3,2)=3 -> 3/10; p(B)=1-3/10=7/10.
- 2.a X in {-2,-1,0,2}; p(X=-2)=1/10 (-1,2); p(X=-1)=1/10 (-1,1); p(X=2)=1/10 (1,2); p(X=0)=7/10 (= p(B)). Sum=1. (Product 1 is impossible: only one ball -1 and one ball 1.)
- 2.b E(X)=-2/10-1/10+2/10 = -1/10 = -0.1. E(X²)=4/10+1/10+4/10=9/10. **V(X)=9/10-1/100=89/100=0.89.**
  **Typo alert:** the official correction PDF prints "8,9" for V(X); the correct value is 0.89. Do not copy it.
- 3. Y ~ B(n, 7/10). p(Y=1)=n·(7/10)·(3/10)^(n-1)=7n·3^(n-1)/10^n. E(Y)=7n/10 ≥ 5 <=> n ≥ 50/7 ≈ 7.14 -> **n=8**.

## Method cards (reusable)
1. Probability = favorable / possible (equiprobable draws).
2. Simultaneous draw: pairs are unordered; count with combinations or by listing.
3. "Au moins un" -> complement ("aucun"), p = 1 - p(aucun).
4. Law of a random variable: list values, count outcomes per value, check the sum is 1.
5. E(X)=Σ x·p; V(X)=E(X²)-E(X)².
6. Repeated independent trials with the same success probability -> binomial; E(Y)=np.

## Misconception library (initial; extend from real logs)
| id | signature | repair |
|---|---|---|
| counts_balls_not_pairs | answers 5 for number of pairs | `Urn` + `OutcomeSpace` list |
| counts_ordered_pairs | answers 20 | explain simultaneous; `OutcomeSpace` shows (a,b)=(b,a) |
| forgets_pair_with_duplicate_value | p(A)=0 or counts 6 pairs with a 0 (forgets {0,0'}) | `EventPicker` with `markDuplicates` |
| au_moins_direct_miscount | counts only "exactly one 0" (6) | `ComplementView` |
| complement_ordered | answers 6 for pairs without 0 | `OutcomeSpace` of {-1,1,2} |
| p_x0_counts_one_pair | p(X=0)=1/10 | `EventPicker` value_eq(product,0) live count |
| p_x0_uses_wrong_complement | p(X=0)=3/10 | same + link to event B |
| values_include_product_1 | lists 1 as a value of X | `OutcomeSpace` colorBy value |
| fraction_not_reduced_or_decimal_mismatch | writes 7/10 vs 0.7 as different | numeric keypad accepts equivalents |

## Writeup (French, what goes on the paper)
- 1.a: "Il y a C(5,2)=10 tirages possibles. L'événement A n'est réalisé que par le tirage {0;0}. Donc p(A)=1/10."
- 1.b: "Soit B̄ : « aucune boule numérotée 0 ». Les boules −1, 1, 2 donnent C(3,2)=3 tirages. p(B̄)=3/10, donc p(B)=1−3/10=7/10."
- 2.a: table of the law with the sum check. Mention p(X=0)=p(B).
- 3.b: "Y suit la loi binomiale B(n,7/10). E(Y)=7n/10 ≥ 5 ⟺ n ≥ 50/7 ; comme 50/7 ≈ 7,14, la plus petite valeur est n=8."

## Sample content JSON (shape illustration; fill with real ids)
```json
{
  "id": "2a_values_and_law",
  "goal": { "fr": "Déterminer la loi de probabilité de X", "ar": "نلقاو قانون X" },
  "uses": ["p_B_7_10"],
  "groups": [{
    "steps": [
      { "kind": "component", "component": { "component": "OutcomeSpace",
        "props": { "balls": [{"id":"a","value":-1},{"id":"b","value":0},{"id":"c","value":0},{"id":"d","value":1},{"id":"e","value":2}],
                   "draw": "simultaneous", "k": 2, "valueFn": "product", "colorBy": "value", "layout": "grid", "showCount": true } } },
      { "kind": "choice", "prompt": { "ar": "شنوّة القيم الممكنة لـ X؟" }, "skills": ["random-variable-values"],
        "options": [ { "id": "ok", "label": { "math": "-2, -1, 0, 2" } },
                     { "id": "bad1", "label": { "math": "-1, 0, 1, 2" }, "misconceptionId": "values_include_product_1" } ],
        "answer": { "type": "set", "compute": { "fn": "lawValues", "args": { "valueFn": "product" } } },
        "deepDiveId": "pairs_listing" },
      { "kind": "component", "component": { "component": "EventPicker",
        "props": { "valueFn": "product", "event": { "id": "value_eq", "args": { "value": 0 } }, "reveal": "live", "showFraction": true } } },
      { "kind": "component", "component": { "component": "LawBuilder", "props": { "valueFn": "product", "mode": "assign_outcomes", "showSumCheck": true } } }
    ]
  }]
}
```
(All wording is a draft; Arabic needs teacher review.)
