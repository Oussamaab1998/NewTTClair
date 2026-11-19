## In short

- **Today no exercise can run end to end on existing components.** Every one needs the Worksheet extended (inequality and equivalence lines, vectors, complex numbers, new solution-graph templates), and almost every one needs at least one new visual.
- **A few components carry most of the work.** Not counting the four method frames (Worksheet, CardsPick, PlanCards, StatementTap):
  - GeometryCanvas: 36 exercises, all three years.
  - IntervalBuilder: 25.
  - FunctionPlot: 23.
  - HorizontalLineSweep and NumericTwin: 18 each.
  - PredictReveal: 17.
  - SolidViewer: 14.
- **The engine is the main cost, more than the screens.** Rule 1 says correctness is computed, so each new component needs engine support first:
  1. **Exercise-defined functions.** Let an exercise file define its own functions as safe-parser expressions, checked when it loads (no eval). Today the analysis engine only knows a fixed list in code, and the 3ème analysis chapters alone use about 50 different functions.
  2. **`geometry2d.ts`.** Points, vectors, lines, circles, angles, translations, homothéties, rotations and the quart de tour, with exact √ values. Needed by GeometryCanvas, LocusTracer, TrigCircle, RightTriangleTrig and BarycentreBalance.
  3. **`intervals.ts`.** Needed by IntervalBuilder, SignTableBuilder and BoundsRuler.
  4. **`statistics.ts`.** With the median and quartile rule set per year, because the 1ère, 2ème and 3ème textbooks word it differently.
  5. **`space.ts`.** A hidden exact frame for SolidViewer, as the check scripts already use.
  6. **`sequences.ts` and `complex.ts`.** Both are stubs today.
  7. **Worksheet templates.** One per question type.

  The Python check scripts in each exercise folder already compute every value. They are a ready reference for these modules and their tests.

## Suggested build order

Waves ordered by how many exercises they unlock. "Unlocked" means every component the exercise needs exists.

| Wave | Components | Exercises unlocked (cumulative) |
|---|---|---|
| 1 | Worksheet (extend), GeometryCanvas, IntervalBuilder, FunctionPlot (extend), HorizontalLineSweep, NumericTwin (extend), SolidViewer, ProductGrid, ParameterPlayground, SituationToGraph, SignTableBuilder, CounterexampleHunt | 32 of 110 (1ère 16, 2ème 13, 3ème 3) |
| 2 | VariationTableBuilder, PointOnCurve, TangentSlope, LimitExplorer, PartWholeBar (all extend); LocusTracer, BoundsRuler, SequenceExplorer, TrigCircle, CurveCompare, PiecewiseJoin, StatsDistribution | 71 of 110 (1ère 23, 2ème 29, 3ème 19) |
| 3 | The 16 narrow components below (5 exercises or fewer each) | 110 of 110 |

**Fold the narrow ones into bigger components where possible.** This is my recommendation, not something done yet. Wave 3 is mostly small tools that fit inside a bigger component as a mode:

| Narrow component | Exercises | Fold into |
|---|---|---|
| BisectionStepper | 2 | a mode of HorizontalLineSweep |
| TwoWayTable, ScatterPlot | 2 and 1 | modes of StatsDistribution |
| CobwebDiagram, InductionStepper | 3 each | modes of SequenceExplorer |
| DeterminantExpander | 3 | a Worksheet helper |
| BarycentreBalance | 4 | a weighted-points mode of GeometryCanvas |
| LinearSystemBoard | 2 | FunctionPlot (two lines) plus the Worksheet |
| RightTriangleTrig | 4 | could be a GeometryCanvas preset; the 1ère mapping preferred a separate component with large tap targets |

That would cut the new components from 24 to about 16. The rest of wave 3 are real tools of their own:

- FactorTree and DivisibilityChecker: 1ère and 2ème arithmetic.
- ComplexPlane.
- SecantToTangent (extend).
- ChoiceProduct, ProbabilityTree and Urn: small extensions.

## Decisions for the owner

The three per-year maps raised these. Each has a default, used unless you say otherwise.

1. **Exercise-defined functions:** yes, safe-parser expressions checked at load (no eval, rule 2 kept).
2. **Mockups before building:** yes, for GeometryCanvas, IntervalBuilder, the sign and variation tables, and SolidViewer.
3. **GeometryCanvas:** one board with tool packs, built in chapter order:
   - figure and readouts;
   - angles and constructions, and Thalès;
   - vectors;
   - transformations;
   - analytic grid and loci.
4. **Sign table and variation table:** two names on one shared grid.
5. **3-D on cheap phones:** SVG with about 8 preset views, no free rotation. Round solids are drawn with ellipses.
6. **Year modes.** The same component behaves as the student's textbook does:
   - 1ère and 2ème show no oriented angles: rotations are "directe / indirecte" with an angle in [0, π], and TrigCircle is a half circle.
   - Space in 2ème shows no coordinates.
   - The median and quartile rules are set per year.
7. **Where students write:** inequalities, equivalences, vectors and complex numbers go in the extended Worksheet. Sets and intervals go in IntervalBuilder.
8. **Constructions:** the student orders the construction steps (PlanCards) and the canvas draws each one. Free drawing tools come later.
9. **Geometry proofs:** the engine judges facts (parallel, aligned, equal angles, vector sums) on several random instances of the figure, as the check scripts do. The reason is picked from cards (CardsPick).
10. **Calculator values:** computed by the engine, rounded to what the question asks, and labelled "≈ (calculatrice)".
11. **NumericTwin:** offered before the proof or at help level 1, with the line « vérifier n'est pas démontrer ».
12. **Choice trees:** in 1ère and 2ème, a counting tree is a view of ChoiceProduct (no probabilities). ProbabilityTree stays for probability.
13. **Percentages:** a percent-change mode in PartWholeBar rather than a new component.
