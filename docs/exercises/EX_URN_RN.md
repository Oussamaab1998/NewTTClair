# Exercise 2 — Probabilités, urne rouge / noire (Bac Sciences expérimentales, session de contrôle 2022, 4 pts)

Status (2026-10-23): milestone 1 built. Question 1 is authored in `src/content/exercises/bac2022c-sc-ex2.json` (DECISIONS D35); question 2 waits for the product owner's OK; question 3 is round 2. Do not copy the official correction wording: only the mathematics below came from it (facts, not text). All Arabic written from this file is `reviewed: false`.

## Source
- Paper source line (product owner, 2026-10-23; **exact section name to confirm before it goes into content**): « Examen du baccalauréat · Session de contrôle 2022 · Section Sciences expérimentales ». The product owner's note: "bac sc contrôle 2022".
- Points: « Exercice 2 (4 points) ».
- Content id: `bac2022c-sc-ex2` (D1, 2026-10-23). Number 2, subject `probability`, section `sciences-experimentales`. The source line is not in the content yet: the exact « Section : … » header line is still to be supplied.
- Not the same exercise as `bac2022c-ex2` (Mathématiques, same session, also « Exercice 2 », also probability). The app must show the section to tell them apart.

## Exam wording (question text = the part's `goal`; explanations stay ours)
Transcribed by the product owner, **to verify against the PDF**.

Exercice 2 (4 points)
Une urne contient quatre boules rouges et six boules noires, indiscernables au toucher.
Une épreuve consiste à tirer simultanément trois boules de l'urne.
1. On considère l'événement A : « Obtenir une seule boule rouge ».
   Montrer que P(A) = 0.5, où P(A) est la probabilité de A.
2. Calculer la probabilité de l'événement B : « Obtenir aucune boule rouge ».
3. On répète l'épreuve précédente n fois de suite, n ≥ 2, en remettant à chaque fois les boules tirées dans l'urne.
   On désigne par X la variable aléatoire égale au nombre de fois où l'on a obtenu une seule boule rouge.
   a) Déterminer la loi de probabilité de X.
   b) Exprimer en fonction de n l'espérance mathématique de X, ainsi que sa variance.

Note: the paper writes « 0.5 » with a point; keep it verbatim in the wording, accept 0,5 / 0.5 / 1/2 as typed answers.

## Engine model (no new UI)
- Balls carry `value` 1 (rouge) or 0 (noire) and `color` red / black (shown as R₁…R₄, N₁…N₆; D35); ids `r1..r4`, `n1..n6`. Experiment: `{ urn, draw: "simultaneous", k: 3 }`.
- "Exactly j red": `{ id: "value_eq", args: { valueFn: { id: "count_value", args: { value: 1 } }, value: j } }`.
- B "no red": `{ id: "not", args: { event: { id: "any_value", args: { value: 1 } } } }` (same draws as `value_eq` with j = 0).
- Display limit: the probability components refuse more than 60 outcomes (`MAX_OUTCOMES`, `src/components/probability/schemas.ts`). This urn has 120: its draws are computed by the engine (typed answers, named values) and **listed only on small twin urns**. Never list the 120 draws. `Urn` in display mode shows the 10 balls (E4), and a `LawChart` of the number of reds is allowed with `law.of` (E3).

## Verified answers (recomputed with `src/engine` on 2026-10-23; tests must recompute, never hard-code)
- Total: C(10,3) = 120 simultaneous draws, all equally likely.
- 1. A: C(4,1)·C(6,2) = 4·15 = 60 → P(A) = 60/120 = 1/2.
- 2. B: C(6,3) = 20 → P(B) = 20/120 = 1/6.
- Reds in one draw (law of the number of reds): j = 0, 1, 2, 3 → 20, 60, 36, 4 draws (sum 120); probabilities 1/6, 1/2, 3/10, 1/30 (sum 1).
- **Trap:** 1 − P(A) = 1/2, and the opposite of A also has 60 draws. The complement of A is "0, 2 or 3 reds" (20 + 36 + 4); B is only the 20-draw slice of it. A student who counts Ā gets the right number for A by accident.
- 3. Success = "exactly one red" in one trial, p = P(A) = 1/2; trials independent (balls put back, same urn each time). X ~ B(n, 1/2), P(X = k) = C(n,k)(1/2)^k(1/2)^(n−k) = C(n,k)/2^n for 0 ≤ k ≤ n. E(X) = n/2, V(X) = n·(1/2)·(1/2) = n/4.
- Numeric twins: n = 3 → 1/8, 3/8, 3/8, 1/8 (E 3/2, V 3/4); n = 4 → 1/16, 1/4, 3/8, 1/4, 1/16 (E 2, V 1).

### Values of known wrong procedures (engine, same date)
| step | engine procedure | value | note |
|---|---|---|---|
| total | `ordered_draw` | 720 | 10·9·8 |
| total | `all_balls` | 10 | |
| count A | `balls_in_event` | 4 | the event read on one ball (= "counted only the reds") |
| count A | `all_outcomes` | 120 | same value as the brief's "4·30 ordered blacks" |
| count A | `opposite_event` | 60 | **equals the answer**: unusable (loader rejects it) |
| P(A) | `balls_in_event` | 2/5 | one ball: 4/10 |
| P(A) | `opposite_event`, `ordered_draw` | 1/2 | equal the answer: unusable |
| count B | `balls_in_event` | 6 | the six black balls |
| count B | `ordered_draw` | 120 | 6·5·4; same value as `all_outcomes` |
| count B | `opposite_event` | 100 | "at least one red" |
| P(B) | `balls_in_event` | 3/5 | one ball: 6/10 |
| P(B) | `opposite_event` | 5/6 | |
| P(B) | `ordered_draw` | 1/6 | equals the answer: unusable |
| with replacement (draw `ordered_with_replacement`, no procedure yet) | total / P(A) / P(B) | 1000 / 54/125 / 27/125 | |

Wrong values with no procedure (authored `wrongAnswers`): 30 (=10·3), 19 (=4+15), 24 (=4·6), 15 (=C(6,2)), 60 at count B (copy of A: Part 1 is not an "earlier result" of Part 2 for the loader), 5/6 at P(A) ("at least one red"), 1/12 (=60/720), 19/120, 1/2 at P(B) (=1 − P(A)).

### Twin and variant urns (engine, same date)
| urn, draw k | total | exactly one red | no red | law of reds |
|---|---|---|---|---|
| 2R 2N, k = 2 | 6 | 4 → 2/3 | 1 → 1/6 | 1, 4, 1 |
| 3R 2N, k = 2 | 10 | 6 → 3/5 | 1 → 1/10 | 1, 6, 3 |
| 5R 5N, k = 2 | 45 | 25 → 5/9 | 10 → 2/9 | 10, 25, 10 |
| 3R 5N, k = 3 | 56 | 30 → 15/28 | 10 → 5/28 | 10, 30, 15, 1 |

All fit the 60-outcome display limit (45 and 56 are long lists: use counts, not full listings). Notes: 2R 2N gives P(no red) = 1/6, the parent's P(B): not a twin for P(B). 3R 2N gives P(exactly one red) = 3/5, a known wrong value of P(B): fine for a twin of P(A), not for P(B) checks.

## Skills (map to `src/content/skillMap.json`; new ones `reviewed: false`)
Existing: `sample-space`, `simultaneous-draw`, `counting-pairs` (generalize to "counting draws"), `equiprobability`, `event-as-set`, `complement-event`, `probability-sure-event`.
New: `combinations-count` (C(n,k) for a simultaneous draw), `multiplication-principle` (choose reds AND blacks), `probability-by-counting`, `event-vs-complement` (B is not Ā; may fold into `complement-event`), `independence-replacement`, `binomial-recognize` (n, p, what counts as success), `binomial-law`, `binomial-moments`.
Chain: counting → probability by counting → binomial.

## Method cards (reusable)
1. Simultaneous draw of k balls: unordered groups, counted with C(n,k).
2. "Exactly j of a colour": choose the j balls of that colour AND the others among the other colour; AND → multiply.
3. Probability = favourable / possible (equally likely draws).
4. Name the event before counting; the opposite of "exactly one" is not "none".
5. Same trial repeated with the balls put back → independent trials, same p → binomial; say what a success is.
6. X ~ B(n, p): P(X = k) = C(n,k)p^k(1−p)^(n−k), E = np, V = np(1−p).

## Misconception seeds (extend from real logs)
| id (draft) | signature | step |
|---|---|---|
| counts_ordered_draws | 720 (total), 120 (count B as 6·5·4) | total, count B |
| counts_balls_not_draws | 10 (total), 6 (count B) | total, count B |
| multiplies_balls_by_k | 30 | total |
| draws_with_replacement | 1000, 54/125, 27/125 | total, P(A), P(B) |
| adds_instead_of_multiplying | 19, 19/120 | count A, P(A) |
| counts_only_reds | 4 | count A |
| wrong_group_size | 24 (=4·6), 15 (=C(6,2)) | count A, count B |
| gives_total_as_favourable | 120 at count A | count A |
| single_ball_probability | 2/5, 3/5 | P(A), P(B) |
| at_least_one_instead_of_exactly | 5/6 | P(A), P(B) |
| mixed_order_count | 1/12 | P(A) |
| b_as_complement_of_a | 1/2 at P(B); option "the opposite of A" | P(B), meaning of B |
| at_least_one_black_misread | option "at least one black" | meaning of B |
| copies_earlier_count | 60 at count B | count B |
| (Part 3) success_is_b / x_counts_red_balls / n_is_three / variance_equals_np | 1/6, B(n;1/6), values 0..3, B(3;1/2), V = n/2 | Part 3 |

## Writeup (French, what goes on the paper; our wording)
- 1: « On tire simultanément 3 boules parmi 10 : il y a C(10,3) = 120 tirages possibles, tous équiprobables. A est réalisé quand on tire 1 boule rouge parmi 4 et 2 boules noires parmi 6 : C(4,1) × C(6,2) = 4 × 15 = 60 tirages. Donc P(A) = 60/120 = 1/2 = 0,5. »
- 2: « B est réalisé quand les 3 boules sont noires : C(6,3) = 20 tirages. Donc P(B) = 20/120 = 1/6. »
- 3.a: « Les tirages sont faits avec remise de l'épreuve : les n épreuves sont identiques et indépendantes. À chaque épreuve, le succès « obtenir une seule boule rouge » a la probabilité p = P(A) = 1/2. X suit la loi binomiale de paramètres n et 1/2 : P(X = k) = C(n,k) (1/2)^n, pour k ∈ {0, …, n}. »
- 3.b: « E(X) = np = n/2 ; V(X) = np(1 − p) = n/4. »
(Values in content come from `\val{id}`; draft wording, needs teacher review.)
