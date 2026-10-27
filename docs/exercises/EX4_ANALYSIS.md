# Exercise 4 — Study of f(x)=e^x/(1+e^{2x}) (Bac Maths, session de contrôle 2022, 7 pts)

Facts and engine checks: see `docs/COMPONENTS_ANALYSIS.md`. Do not copy the official correction wording.

## Exam wording (question text = the part's `goal`; explanations stay ours)
Transcribed from the PDF by the product owner (2026-10-20), **to verify against the PDF**.
- Statement: « Soit f la fonction définie sur ℝ par f(x) = eˣ / (1 + e²ˣ). On note (ζ) sa courbe représentative dans un repère orthonormé (O, i⃗, j⃗). »
- A1 (1): « Montrer que f est paire. » (in the content)
- A2 (2): « Montrer que \lim_{x\to+\infty} f(x) = 0. Interpréter. » Goal to author: `{"fr": "Montrer que", "math": "\\lim_{x\\to+\\infty} f(x) = 0"}` then « Interpréter. » as its own sentence.
- A3 (3): « a) Montrer que f'(x) = (1 − e^{2x}) e^x / (1 + e^{2x})², pour tout réel x. b) Dresser le tableau de variation de f. » Goal to author: `{"fr": "a) Montrer que, pour tout réel x,", "math": "f'(x)=\\frac{(1-e^{2x})e^{x}}{(1+e^{2x})^{2}}"}`, then « b) Dresser le tableau de variation de f. »
- A4 (4): « Tracer (ζ). » (not in this phase's scope)
- Heading of the first part: « Partie A ».
- Paper source line (given by the product owner, D6, 2026-10-21): « Examen du baccalauréat · Session de contrôle 2022 · Mathématiques ». Points: « Exercice 4 (7 points) ».

### Parties B and C (verified by the product owner against the PDF on 2026-10-21)
Shown on the paper screen only; not authored (« قريبا » in the app).

Partie B
Soit F la fonction définie sur ]0, +∞[ par F(x) = ∫ de 0 à ln x de f(t) dt.
1) Montrer que F est dérivable sur ]0, +∞[ et calculer F'(x) pour tout x > 0.
2) a) Montrer que la fonction g définie par g(x) = tan x est une bijection de ]0, π/2[ sur ]0, +∞[. On note g⁻¹ la fonction réciproque de g.
   b) Déterminer g⁻¹(1) et lim g⁻¹(x) quand x → +∞.
   c) Montrer que g⁻¹ est dérivable sur ]0, +∞[ et que (g⁻¹)'(x) = 1 / (1 + x²), pour tout x > 0.
3) Montrer que F(x) = g⁻¹(x) − π/4, pour tout x > 0.
4) Soit λ > 0. On désigne par A(λ) l'aire de la partie du plan limitée par la courbe (ζ), l'axe des abscisses et les droites d'équations x = −λ et x = λ.
   a) Montrer que A(λ) = 2F(e^λ).
   b) Déterminer lim A(λ) quand λ → +∞.

Partie C
Pour tout n ∈ ℕ*, on pose I_n = ∫ de 0 à 1 de t^n F(e^t) dt.
1) a) Montrer que pour tout réel t ≥ 0, 0 ≤ F(e^t) ≤ π/4.
   b) En déduire lim I_n.
2) a) À l'aide d'une intégration par parties, montrer que I_n = F(e)/(n + 1) − 1/(n + 1) × ∫ de 0 à 1 de t^(n+1) f(t) dt.
   b) En déduire que lim n I_n = g⁻¹(e) − π/4.

Content form (the words stay verbatim in `fr`; a formula that needs 2-D layout is its own `math` line, typeset in STIX, sentence-final period dropped as in A2):
- B intro: `{"fr": "Soit F la fonction définie sur ]0, +∞[ par", "math": "F(x)=\\int_{0}^{\\ln x} f(t)\\,dt"}`
- B4 a: `"math": "A(\\lambda) = 2F(e^{\\lambda})"`
- C intro: `"math": "I_{n} = \\int_{0}^{1} t^{n} F(e^{t})\\,dt"`
- C1 a: `"math": "0 \\le F(e^{t}) \\le \\frac{\\pi}{4}"`; C1 b: `"math": "\\lim I_{n}"`
- C2 a: `"math": "I_{n} = \\frac{F(e)}{n+1} - \\frac{1}{n+1} \\times \\int_{0}^{1} t^{n+1} f(t)\\,dt"`
- C2 b: `"math": "\\lim n I_{n} = g^{-1}(e) - \\frac{\\pi}{4}"`

## Checkpoint map (each ~5 minutes, one goal, one result)
| Part | Checkpoint | Result | Components |
|---|---|---|---|
| A | A1 f even | f(-x)=f(x) | `PointOnCurve` (mirror), `FoldSymmetry`, `AreaUnderCurve` (stack) |
| A | A2 limit at +∞ and interpretation | lim f=0; asymptote y=0 | `LimitExplorer` |
| A | A3 f′ and variation table | f′(x)=(1−e^{2x})e^x/(1+e^{2x})²; max 1/2 at 0 | `SecantToTangent`, `TangentSlope`, `VariationTableBuilder` |
| A | A4 graph | features: even, max 1/2, asymptote | `FunctionPlot` (student places features, then overlay) |
| B | B1 F′ | F′(x)=1/(1+x²) | `AreaUnderCurve` (F as area to ln x) |
| B | B2 tan bijection, g⁻¹(1)=π/4, derivative of inverse | (g⁻¹)′=1/(1+x²) | `InverseMirror` (independent block) |
| B | B3 F(x)=g⁻¹(x)−π/4 | same derivative -> constant, fixed by F(1)=0 | `CurveCompare` |
| B | B4 A(λ)=2F(e^λ) -> π/2 | area with evenness | `AreaUnderCurve` (stack) |
| C | C1 0≤F(eᵗ)≤π/4 -> I_n→0 | squeeze | `SequenceExplorer` |
| C | C2 by parts, n·I_n→F(e)=g⁻¹(e)−π/4 | | `SequenceExplorer` |

Dependencies to show in "résultats acquis": A1 -> B4a; A3 (f>0, f≤1/2) -> C; B3 -> B4, C. Allow "admit and continue" for B3.

## Teaching decisions from the prototype sessions
- **A1 (parity).** Method: domaine symmetric -> compute f(-x) -> simplify to f(x) -> conclude. Line-by-line: multiply top and bottom by e^{2x}; numerator e^{-x}·e^{2x}=e^x; denominator (1+e^{-2x})e^{2x}=e^{2x}+1; assemble. Teach the goal-comparison habit (write the target next to the current line and ask "what is different?").
- **A2 (limit).** Spot ∞/∞ (forme indéterminée) before simplifying; factor e^x from the denominator: 1+e^{2x}=e^x(e^{-x}+e^x); simplify to 1/(e^{-x}+e^x); e^{-x}→0 and e^x→+∞, so the denominator →+∞ and the limit is 0. **Interpréter** is its own mark: "la droite d'équation y = 0 est une asymptote horizontale à (ζ) au voisinage de +∞".
- **A3.** Meaning of f′ first (slope visuals), then quotient rule with a simple numeric example (x/(x+1)), then apply. "Montrer que" = target is given; compare the result with it. Hidden step: derivative of e^{2x} is 2e^{2x}.
- **Writing.** Every checkpoint ends with the French lines for the paper (see ARCHITECTURE: "how to write it").

## Real student mistakes seen while prototyping (seed the misconception library)
| id | what happened | note |
|---|---|---|
| value_at_0_vs_limit | used e^0=1 where the question was x→+∞ (3 times) | separate "x=0" from "x→+∞" |
| exp_neg_limit_wrong | e^{-x} → -∞ or →1 as x→+∞ | e^{-x}=1/e^x → 0; e^u>0 always |
| cancel_leaves_zero | after cancelling e^x top and bottom wrote 0 in the numerator | the numerator becomes 1, not 0 |
| missing_parentheses_fraction | wrote e^-x/1+e^-2x | denominator must be in parentheses |
| domain_vs_target_confusion | did not know the goal of simplification | compare with target f(x) |
| prime_notation_unknown | did not know what f′ means | use `SecantToTangent` first |
| exponent_rules_gap | e^a·e^b, e^{-a} | repeated across A1 and A2; one skill, several appearances |
| interpretation_misplaced | "au voisinage de y=0" instead of "+∞" | the line is y=0; the neighborhood is +∞ |
