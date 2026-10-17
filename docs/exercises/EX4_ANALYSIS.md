# Exercise 4 — Study of f(x)=e^x/(1+e^{2x}) (Bac Maths, session de contrôle 2022, 7 pts)

Facts and engine checks: see `docs/COMPONENTS_ANALYSIS.md`. Do not copy the official correction wording.

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
