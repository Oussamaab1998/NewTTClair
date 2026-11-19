# Components the exercise banks need

Which interactive components the 110 practice exercises in `docs/exercises/` (1ère, 2ème Sciences, 3ème Sc. exp.) need, and which exercises use each one. One component serves many exercises.

- Exercises mapped: 1ère 32, 2ème Sc. 38, 3ème Sc. exp. 40 (total 110).
- Components: 51 in total — 11 existing, 12 extend, 4 reserved, 24 new.
  - **existing**: in the registry today, usable as is. **extend**: in the registry, needs new props (notes below). **reserved**: name reserved in `src/components/contract.ts`, not built. **new**: to design and build.
- An exercise counts once per component even if several of its questions use it. Data: `components_needed.json` next to this file. Generated from the per-year maps in `component_maps/` (with the question-by-question reasons) by `component_maps/merge_maps.py`; the summary below comes from `component_maps/PREAMBLE.md`. `reviewed: false`.

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

## Summary table

| Component | Domain | Status | 1ère | 2ème Sc. | 3ème Sc. exp. | Total |
|---|---|---|---|---|---|---|
| [Worksheet](#worksheet) | generic | extend | 32 | 38 | 40 | 110 |
| [CardsPick](#cardspick) | generic | existing | 30 | 34 | 13 | 77 |
| [PlanCards](#plancards) | generic | existing | 9 | 10 | 8 | 27 |
| [NumericTwin](#numerictwin) | generic | extend | 3 | 6 | 9 | 18 |
| [PredictReveal](#predictreveal) | generic | existing | 8 | 5 | 4 | 17 |
| [StatementTap](#statementtap) | generic | existing | 5 | 4 | 7 | 16 |
| [CounterexampleHunt](#counterexamplehunt) | generic | reserved | 2 | 3 | 7 | 12 |
| [CompareTwo](#comparetwo) | generic | existing | 1 | 1 | 2 | 4 |
| [IntervalBuilder](#intervalbuilder) | numbers & algebra | new | 7 | 8 | 10 | 25 |
| [ProductGrid](#productgrid) | numbers & algebra | new | 4 | 9 |  | 13 |
| [BoundsRuler](#boundsruler) | numbers & algebra | new | 3 | 5 |  | 8 |
| [PartWholeBar](#partwholebar) | numbers & algebra | extend | 4 | 3 |  | 7 |
| [DivisibilityChecker](#divisibilitychecker) | numbers & algebra | new | 2 | 3 |  | 5 |
| [FactorTree](#factortree) | numbers & algebra | new | 3 | 2 |  | 5 |
| [LinearSystemBoard](#linearsystemboard) | numbers & algebra | new | 2 |  |  | 2 |
| [FunctionPlot](#functionplot) | functions & analysis | extend | 6 | 5 | 12 | 23 |
| [HorizontalLineSweep](#horizontallinesweep) | functions & analysis | new | 4 | 6 | 8 | 18 |
| [ParameterPlayground](#parameterplayground) | functions & analysis | reserved | 4 | 6 | 3 | 13 |
| [SituationToGraph](#situationtograph) | functions & analysis | new | 3 | 5 | 5 | 13 |
| [SignTableBuilder](#signtablebuilder) | functions & analysis | new | 2 | 3 | 7 | 12 |
| [VariationTableBuilder](#variationtablebuilder) | functions & analysis | extend |  | 4 | 7 | 11 |
| [PointOnCurve](#pointoncurve) | functions & analysis | extend |  | 2 | 8 | 10 |
| [TangentSlope](#tangentslope) | functions & analysis | extend |  |  | 7 | 7 |
| [CurveCompare](#curvecompare) | functions & analysis | reserved | 2 | 4 |  | 6 |
| [LimitExplorer](#limitexplorer) | functions & analysis | extend |  |  | 6 | 6 |
| [PiecewiseJoin](#piecewisejoin) | functions & analysis | new |  |  | 6 | 6 |
| [SecantToTangent](#secanttotangent) | functions & analysis | extend |  |  | 5 | 5 |
| [BisectionStepper](#bisectionstepper) | functions & analysis | new |  |  | 2 | 2 |
| [SequenceExplorer](#sequenceexplorer) | sequences | reserved |  | 4 | 4 | 8 |
| [CobwebDiagram](#cobwebdiagram) | sequences | new |  |  | 3 | 3 |
| [InductionStepper](#inductionstepper) | sequences | new |  |  | 3 | 3 |
| [GeometryCanvas](#geometrycanvas) | plane geometry & transformations | new | 13 | 16 | 7 | 36 |
| [LocusTracer](#locustracer) | plane geometry & transformations | new | 1 | 3 | 6 | 10 |
| [BarycentreBalance](#barycentrebalance) | plane geometry & transformations | new |  | 4 |  | 4 |
| [DeterminantExpander](#determinantexpander) | vectors & analytic geometry | new |  |  | 3 | 3 |
| [TrigCircle](#trigcircle) | trigonometry | new |  | 3 | 5 | 8 |
| [RightTriangleTrig](#righttriangletrig) | trigonometry | new | 4 |  |  | 4 |
| [SolidViewer](#solidviewer) | space geometry | new | 2 | 6 | 6 | 14 |
| [ComplexPlane](#complexplane) | complex numbers | new |  |  | 2 | 2 |
| [ChoiceProduct](#choiceproduct) | counting & probability | extend | 1 | 2 | 2 | 5 |
| [EventAreaModel](#eventareamodel) | counting & probability | existing | 1 | 1 | 3 | 5 |
| [GroupBoxes](#groupboxes) | counting & probability | existing |  | 1 | 3 | 4 |
| [SlotsPattern](#slotspattern) | counting & probability | existing |  | 1 | 2 | 3 |
| [ComplementView](#complementview) | counting & probability | existing |  |  | 1 | 1 |
| [EventPicker](#eventpicker) | counting & probability | existing |  |  | 1 | 1 |
| [OutcomeSpace](#outcomespace) | counting & probability | existing |  |  | 1 | 1 |
| [ProbabilityTree](#probabilitytree) | counting & probability | extend |  |  | 1 | 1 |
| [Urn](#urn) | counting & probability | extend |  |  | 1 | 1 |
| [StatsDistribution](#statsdistribution) | statistics | new | 2 | 2 | 2 | 6 |
| [TwoWayTable](#twowaytable) | statistics | new |  |  | 2 | 2 |
| [ScatterPlot](#scatterplot) | statistics | new |  |  | 1 | 1 |

## Components and the exercises that use them

### Generic

#### Worksheet

- **Status:** extend. **Used by** 110 exercises (1ère 32, 2ème Sc. 38, 3ème Sc. exp. 40).
- **Purpose:** Method frame (board Worksheet / old-feed LineInput): the student writes each calculation line and the engine checks it against the step's expected solution graph; the default for every 'calculer / montrer que' question.
- **Student action:** type lines with the math keys and number tiles; tap an earlier line to fix it
- **Engine:** src/method line chains (lineChain, exprLine, mutations) plus one new solution-graph template per 3se question type (continuity, limits, asymptotes, symmetry, derivative, sequences, dot product, determinants, complex forms, counting, statistics)
- **Props (sketch):** frame type 'lines': graph {template, params}, variables (x, n, m, t, a, b), tiles
- **To add for 3ème Sc. exp.:** 3se lines need what the parser and line engine lack today: (1) complex numbers (constant i, NumberSystem for a + bi) for T2_CH04; (2) vectors / coordinate triples and dot products as line items (vec(AB)(2, -1, 2), u.v) for T2_CH01/05/06/07; (3) equation, inequality and equivalence lines (=, <, <=, <=>) and inequality chains (0 <= |wn - 3| <= 5/(n + 1)), with solution sets and 'k in Z' families; (4) partie entiere E(x); (5) parameters (m, a, b, k, t) judged on samples of the parameter too; (6) exact display of surds (2 sqrt 7, 6 sqrt 21 / 7) and multiples of pi
- **To add for 2ème Sc.:** Beyond the 3se list (inequality / equivalence lines, parameters, exact surds and pi multiples, vectors, complex numbers): (1) radicals: sqrt(p - q sqrt r) simplified, conjugate to clear a denominator, sqrt(u^2) = |u|; (2) absolute values |x - a| removed by sign; (3) encadrement lines (2.236 < sqrt5 < 2.237 => 0.236 < t < 0.237) checked bound by bound, 'valeur approchee par defaut / par exces', rounding; (4) percentages, coefficients multiplicateurs, indices base 100, scientific notation; (5) integers written with digit letters (6a3b) and division statements N = dq + r; (6) plane vectors as symbols vec(AB): Chasles rewriting, linear combinations in a base (vec(AB), vec(AC)), components and det(u, v); (7) cartesian equations of lines and circles and a 3x3 linear system by elimination; (8) arithmetic and geometric sums n(a + b)/2 and a(1 - q^n)/(1 - q); (9) money rounded to the millime
- **To add for 1ère:** beyond the 3se and 2eme notes (inequality / equivalence lines, surds, pi, vectors as symbols with Chasles, components, encadrements, percentages, scientific notation, N = dq + r, systems by elimination): (1) angles in degrees as quantities (angle ADB = 180 - 80 - 30 = 70); (2) named lengths and angles of the current figure as symbols bound to engine values (AN = (3/4) x 8 = 6; cos ABC = BH / AB), so a line about the figure is judged without coordinates on screen; (3) synthetic vector lines (vec(ED) = vec(EC) + vec(CD) = 2 vec(AB), vec(GA) + vec(GB) + vec(GC) = 0) judged on several random instances of the figure, as check_ch01 / check_ch05 do; (4) prime-power products (2^2 x 3^3 x 7) kept factored for PGCD / PPCM lines; (5) the long-division step 90 = 14 x 6 + 6 written as a line
- **1ère:** [CH01 Ex1](1s/CH01_ANGLES.md) (Q1, Q2a-b, Q3a-b, Q5a-b); [CH01 Ex2](1s/CH01_ANGLES.md) (Q1a-c, Q2a-c, Q3a-c, Q4a-b, Q5a-b); [CH02 Ex1](1s/CH02_THALES.md) (Q1, Q2a-b, Q3a-c, Q4a-b, Q5); [CH02 Ex2](1s/CH02_THALES.md) (Q1a-b, Q2a-b, Q3a-c, Q4a-c, Q5-Q6); [CH03 Ex1](1s/CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) (Q1a-b, Q2a-b, Q3a-c, Q4, Q5a-c); [CH03 Ex2](1s/CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) (A Q1-Q2, A Q3-Q4, B Q5a-d); [CH04 Ex1](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q2a-b, Q3a-b, Q5a-c); [CH04 Ex2](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q1-Q2, Q4a-c, Q5); [CH05 Ex1](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q1a-b, Q2a-b, Q3a-b, Q4a-c, Q5a-b); [CH05 Ex2](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q1a-b, Q2a-c, Q3a-d); [CH06 Ex1](1s/CH06_ACTIVITES_REPERE.md) (A Q1-Q2a, A Q2b, B Q3-Q4, B Q5a-c, B Q6a-b); [CH06 Ex2](1s/CH06_ACTIVITES_REPERE.md) (Q1-Q2, Q3-Q5, Q6a-b); [CH07 Ex1](1s/CH07_QUART_DE_TOUR.md) (Q1a-c, Q2a-c, Q3a-c); [CH07 Ex2](1s/CH07_QUART_DE_TOUR.md) (Q3a-b, Q4a-c, Q5a-c); [CH08 Ex1](1s/CH08_SECTIONS_PLANES.md) (Q1a-b, Q2a-b, Q3a-b, Q4a-b, Q5a-d); [CH08 Ex2](1s/CH08_SECTIONS_PLANES.md) (Q1a-c, Q2a-b, Q3a-c, Q4a-b); [CH09 Ex1](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (Q1-Q2b, Q2c, Q3a-b, Q4a-c, Q5a-b); [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (A Q1-Q2, A Q3a-b, B Q2c-Q3, B Q4); [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q1a-b, Q2a-c, Q3a-d, Q4, Q5a-b, Q6a-c); [CH10 Ex2](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q1-Q2, Q3a-b, Q4a-b, Q5a-b, Q6a-b); [CH11 Ex1](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q1a-b, Q2a-c, Q3, Q4-Q5); [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q1a-d, Q2-Q3, Q4a-c); [CH12 Ex1](1s/CH12_FONCTIONS_LINEAIRES.md) (Q1-Q2, Q3a-b, Q4a-b, Q5a-b); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q1a-d, Q3a-b, Q4a-b); [CH13 Ex1](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q1a-c, Q2a-c, Q3a-b, Q4a-b); [CH13 Ex2](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q1a-b, Q2a-b, Q5); [CH14 Ex1](1s/CH14_FONCTIONS_AFFINES.md) (Q1a-d, Q2-Q3, Q4a-b, Q5a-b); [CH14 Ex2](1s/CH14_FONCTIONS_AFFINES.md) (Q1-Q2, Q3-Q4, Q5a-b); [CH15 Ex1](1s/CH15_SYSTEMES.md) (Q1-Q2, Q3a-b, Q5a-b); [CH15 Ex2](1s/CH15_SYSTEMES.md) (A Q1-Q2, A Q3a-b, B Q4-Q5, B Q6a-b); [CH16 Ex1](1s/CH16_EXPLOITATION_INFORMATION.md) (Q1-Q2, Q3, Q4-Q5); [CH16 Ex2](1s/CH16_EXPLOITATION_INFORMATION.md) (A Q1-Q3, A Q4-Q5, B Q1-Q4, B Q5)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q1-Q2, Q3, Q4, Q5, Q6); [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q1, Q1b-Q2, Q3-Q4, Q5, Q6); [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q1, Q2, Q3, Q4, Q5); [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (A Q1, B Q1-Q2, B Q3, B Q4); [T1-CH03 Ex1](2sc/T1_CH03_POLYNOMES.md) (Q1-Q2, Q4, Q5); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q1, Q2, Q3, Q4); [T1-CH04 Ex1](2sc/T1_CH04_ARITHMETIQUE.md) (Q1, Q2, Q3, Q4); [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q1, Q5, Q6); [T1-CH05 Ex1](2sc/T1_CH05_CALCUL_VECTORIEL.md) (Q1, Q2, Q3, Q4, Q5); [T1-CH05 Ex2](2sc/T1_CH05_CALCUL_VECTORIEL.md) (Q1-Q2, Q3, Q4); [T1-CH06 Ex1](2sc/T1_CH06_BARYCENTRE.md) (Q1-Q2a, Q2b, Q3, Q4); [T1-CH06 Ex2](2sc/T1_CH06_BARYCENTRE.md) (Q1-Q2, Q3-Q4, Q5); [T1-CH07 Ex1](2sc/T1_CH07_TRANSLATIONS.md) (Q1-Q2, Q3, Q4); [T1-CH07 Ex2](2sc/T1_CH07_TRANSLATIONS.md) (Q1, Q4); [T1-CH08 Ex1](2sc/T1_CH08_HOMOTHETIES.md) (Q1, Q2, Q3, Q4); [T1-CH08 Ex2](2sc/T1_CH08_HOMOTHETIES.md) (Q1-Q2, Q3, Q4-Q5); [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q1, Q3, Q4); [T1-CH09 Ex2](2sc/T1_CH09_ROTATIONS.md) (Q1-Q2, Q3); [T2-CH01 Ex1](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q1, Q2, Q3a-c, Q3d, Q4-Q5); [T2-CH01 Ex2](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH02 Ex1](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q1, Q2, Q3-Q4, Q5); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q1, Q3-Q4, Q5); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q1, Q2, Q3, Q4, Q5, Q6); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q1, Q2, Q3, Q4, Q5, Q6); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (A Q1, A Q2a-b, A Q2c, B Q1, B Q2); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q1, Q2, Q3, Q4); [T2-CH05 Ex1](2sc/T2_CH05_TRIGONOMETRIE.md) (Q1, Q2, Q3, Q4, Q5); [T2-CH05 Ex2](2sc/T2_CH05_TRIGONOMETRIE.md) (Q1-Q2, Q3, Q4, Q5); [T2-CH06 Ex1](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q1, Q2, Q3, Q4, Q5); [T2-CH06 Ex2](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q1, Q2-Q3, Q4, Q5); [T2-CH07 Ex1](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q5); [T2-CH07 Ex2](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q1, Q3-Q4, Q5); [T2-CH08 Ex1](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q3); [T2-CH08 Ex2](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q1, Q2-Q3, Q4); [T2-CH09 Ex1](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2, Q5); [T2-CH09 Ex2](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH10 Ex1](2sc/T2_CH10_STATISTIQUES.md) (Q2, Q3, Q4); [T2-CH10 Ex2](2sc/T2_CH10_STATISTIQUES.md) (A Q1-Q2, A Q3-Q4, B Q5-Q6, B Q7)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q2a-c, Q3a-c, Q4a-c); [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q1-Q2, A Q3, A Q4, A Q5, B Q1-Q3); [T1-CH02 Ex1](3se/T1_CH02_CONTINUITE.md) (A Q1-Q3, B Q1-Q4); [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q1-Q3, Q4, Q6); [T1-CH03 Ex1](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (A Q1, A Q2, B Q1-Q5); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q1-Q2, Q3-Q4a, Q4b-c, Q5); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (A Q1-Q2, A Q3, B Q1-Q3, B Q4); [T1-CH04 Ex2](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (Q1-Q2, Q3-Q4, Q5); [T1-CH05 Ex1](3se/T1_CH05_NOMBRE_DERIVE.md) (Q1a-c, Q1d, Q2, Q3, Q4); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q1-Q2, Q3, Q4, Q5); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (A Q1-Q2, B Q1, B Q2-Q3, B Q4, B Q5); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q1, Q2, Q4, Q5); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q1, Q2, Q3, Q4, Q5-Q6, Q7); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q1, Q2, Q3, Q4, Q5-Q6, Q7); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q1, A Q2, A Q3, A Q4, A Q5-Q6, B Q1-Q3); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q1, Q2, Q3, Q4, Q5); [T1-CH09 Ex1](3se/T1_CH09_SUITES_REELLES.md) (A Q1-Q2, A Q3, B Q1, B Q2-Q3, B Q4); [T1-CH09 Ex2](3se/T1_CH09_SUITES_REELLES.md) (Q1-Q2, Q3, Q4, Q5); [T1-CH10 Ex1](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q1, Q2, Q3, Q4, Q5); [T1-CH10 Ex2](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q1, Q2, Q3-Q4, Q5); [T2-CH01 Ex1](3se/T2_CH01_PRODUIT_SCALAIRE_PLAN.md) (Q1-Q2, Q3, Q4, Q5); [T2-CH01 Ex2](3se/T2_CH01_PRODUIT_SCALAIRE_PLAN.md) (Q1-Q2, Q3, Q4); [T2-CH02 Ex1](3se/T2_CH02_ANGLES_ORIENTES.md) (Q1, Q2-Q3, Q4, Q5); [T2-CH02 Ex2](3se/T2_CH02_ANGLES_ORIENTES.md) (Q1-Q2, Q3, Q4); [T2-CH03 Ex1](3se/T2_CH03_TRIGONOMETRIE.md) (Q1, Q2, Q3, Q4); [T2-CH03 Ex2](3se/T2_CH03_TRIGONOMETRIE.md) (Q1-Q2, Q3, Q4, Q5); [T2-CH04 Ex1](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q1-Q2, Q3, Q4); [T2-CH04 Ex2](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q1-Q3, Q4-Q5); [T2-CH05 Ex1](3se/T2_CH05_VECTEURS_ESPACE.md) (Q1, Q2, Q3, Q4); [T2-CH05 Ex2](3se/T2_CH05_VECTEURS_ESPACE.md) (A Q1-Q3, B Q4-Q6); [T2-CH06 Ex1](3se/T2_CH06_PRODUIT_SCALAIRE_ESPACE.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH06 Ex2](3se/T2_CH06_PRODUIT_SCALAIRE_ESPACE.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH07 Ex1](3se/T2_CH07_DROITES_ET_PLANS.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH07 Ex2](3se/T2_CH07_DROITES_ET_PLANS.md) (Q1-Q2, Q3, Q4-Q5); [T2-CH08 Ex1](3se/T2_CH08_DENOMBREMENT.md) (Q1, Q2, Q3-Q4, Q5); [T2-CH08 Ex2](3se/T2_CH08_DENOMBREMENT.md) (Q1, Q2, Q3, Q4); [T2-CH09 Ex1](3se/T2_CH09_STATISTIQUES.md) (Q1, Q2, Q4, Q5); [T2-CH09 Ex2](3se/T2_CH09_STATISTIQUES.md) (A Q1, A Q2, A Q3, B Q1-Q3); [T2-CH10 Ex1](3se/T2_CH10_PROBABILITES.md) (A Q1-Q4, B Q1-Q3, B Q4); [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2, Q3-Q4, Q5)

#### CardsPick

- **Status:** existing. **Used by** 77 exercises (1ère 30, 2ème Sc. 34, 3ème Sc. exp. 13).
- **Purpose:** Method frame: pick one of 2-5 sentence cards giving the reason, rule or claim behind a step ('polynome donc continue', 'terme de plus haut degre', 'orthogonal a deux vecteurs non colineaires').
- **Student action:** tap a card
- **Engine:** card evaluators (src/method/cards.ts, claims.ts); new claim kinds per chapter
- **Props (sketch):** frame type 'cards': cards [{id, text}], evaluator
- **1ère:** [CH01 Ex1](1s/CH01_ANGLES.md) (Q2a-b, Q3a-b, Q5a-b); [CH01 Ex2](1s/CH01_ANGLES.md) (Q2a-c, Q4a-b); [CH02 Ex1](1s/CH02_THALES.md) (Q1, Q3a-c); [CH02 Ex2](1s/CH02_THALES.md) (Q1a-b, Q3a-c); [CH03 Ex1](1s/CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) (Q3a-c); [CH03 Ex2](1s/CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) (B Q5a-d); [CH04 Ex1](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q1a-b, Q2a-b); [CH04 Ex2](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q1-Q2, Q5); [CH05 Ex1](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q1a-b, Q3a-b); [CH05 Ex2](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q4); [CH06 Ex1](1s/CH06_ACTIVITES_REPERE.md) (B Q3-Q4); [CH06 Ex2](1s/CH06_ACTIVITES_REPERE.md) (Q3-Q5); [CH07 Ex1](1s/CH07_QUART_DE_TOUR.md) (Q1a-c, Q4a-b); [CH07 Ex2](1s/CH07_QUART_DE_TOUR.md) (Q1a-c, Q4a-c); [CH08 Ex1](1s/CH08_SECTIONS_PLANES.md) (Q3a-b); [CH08 Ex2](1s/CH08_SECTIONS_PLANES.md) (Q4a-b); [CH09 Ex1](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (Q4a-c); [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q2a-c, Q3a-d, Q4); [CH10 Ex2](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q4a-b); [CH11 Ex1](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q1a-b, Q2a-c, Q3); [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q1a-d, Q5); [CH12 Ex1](1s/CH12_FONCTIONS_LINEAIRES.md) (Q1-Q2, Q5a-b); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q4a-b); [CH13 Ex1](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q1a-c, Q2a-c, Q3a-b, Q4a-b); [CH13 Ex2](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q1a-b, Q4, Q5); [CH14 Ex1](1s/CH14_FONCTIONS_AFFINES.md) (Q5a-b); [CH15 Ex1](1s/CH15_SYSTEMES.md) (Q4a-b); [CH15 Ex2](1s/CH15_SYSTEMES.md) (A Q3a-b, B Q6a-b); [CH16 Ex1](1s/CH16_EXPLOITATION_INFORMATION.md) (Q3, Q6a-b); [CH16 Ex2](1s/CH16_EXPLOITATION_INFORMATION.md) (B Q5)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q1-Q2, Q3, Q5); [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q3-Q4); [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q4, Q5); [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (A Q1, B Q4); [T1-CH03 Ex1](2sc/T1_CH03_POLYNOMES.md) (Q4, Q5); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q3); [T1-CH04 Ex1](2sc/T1_CH04_ARITHMETIQUE.md) (Q3, Q4); [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q2, Q6); [T1-CH05 Ex1](2sc/T1_CH05_CALCUL_VECTORIEL.md) (Q2); [T1-CH05 Ex2](2sc/T1_CH05_CALCUL_VECTORIEL.md) (Q1-Q2, Q4); [T1-CH07 Ex1](2sc/T1_CH07_TRANSLATIONS.md) (Q1-Q2); [T1-CH07 Ex2](2sc/T1_CH07_TRANSLATIONS.md) (Q2, Q3); [T1-CH08 Ex1](2sc/T1_CH08_HOMOTHETIES.md) (Q4); [T1-CH08 Ex2](2sc/T1_CH08_HOMOTHETIES.md) (Q1-Q2); [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q2); [T1-CH09 Ex2](2sc/T1_CH09_ROTATIONS.md) (Q4); [T2-CH01 Ex1](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q1); [T2-CH01 Ex2](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q3-Q4); [T2-CH02 Ex1](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q1, Q2, Q3-Q4); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q1); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q3, Q6); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (B Q2); [T2-CH05 Ex1](2sc/T2_CH05_TRIGONOMETRIE.md) (Q2, Q4); [T2-CH05 Ex2](2sc/T2_CH05_TRIGONOMETRIE.md) (Q5); [T2-CH06 Ex1](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q3); [T2-CH06 Ex2](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q5); [T2-CH07 Ex1](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q1, Q2-Q3, Q4); [T2-CH07 Ex2](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q3-Q4); [T2-CH08 Ex1](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q1-Q2, Q3, Q4); [T2-CH08 Ex2](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q1, Q2-Q3); [T2-CH09 Ex1](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2, Q3, Q4); [T2-CH09 Ex2](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2, Q5); [T2-CH10 Ex1](2sc/T2_CH10_STATISTIQUES.md) (Q1); [T2-CH10 Ex2](2sc/T2_CH10_STATISTIQUES.md) (B Q7)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q1, Q4a-c); [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q1-Q3); [T1-CH03 Ex1](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (A Q1); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (A Q1-Q2); [T1-CH05 Ex1](3se/T1_CH05_NOMBRE_DERIVE.md) (Q3); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (A Q1-Q2); [T1-CH10 Ex1](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q1); [T2-CH02 Ex1](3se/T2_CH02_ANGLES_ORIENTES.md) (Q2-Q3); [T2-CH04 Ex1](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q1-Q2); [T2-CH05 Ex1](3se/T2_CH05_VECTEURS_ESPACE.md) (Q4); [T2-CH06 Ex1](3se/T2_CH06_PRODUIT_SCALAIRE_ESPACE.md) (Q3-Q4); [T2-CH07 Ex1](3se/T2_CH07_DROITES_ET_PLANS.md) (Q5); [T2-CH09 Ex1](3se/T2_CH09_STATISTIQUES.md) (Q3, Q5)

#### PlanCards

- **Status:** existing. **Used by** 27 exercises (1ère 9, 2ème Sc. 10, 3ème Sc. exp. 8).
- **Purpose:** Method frame: order 3-5 plan cards of a multi-step argument (continuity on R: pieces then junction; existence then uniqueness; plan d'etude of a function).
- **Student action:** order the cards, confirm
- **Engine:** checkPlan (any order respecting what each card uses)
- **Props (sketch):** frame type 'plan': cards [{id, text, uses[]}]
- **1ère:** [CH01 Ex1](1s/CH01_ANGLES.md) (Q1, Q4a-b); [CH02 Ex1](1s/CH02_THALES.md) (Q5); [CH04 Ex1](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q4a-b, Q5a-c); [CH05 Ex1](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q4a-c); [CH06 Ex2](1s/CH06_ACTIVITES_REPERE.md) (Q1-Q2); [CH07 Ex1](1s/CH07_QUART_DE_TOUR.md) (Q3a-c); [CH07 Ex2](1s/CH07_QUART_DE_TOUR.md) (Q2a-b, Q5a-c); [CH08 Ex1](1s/CH08_SECTIONS_PLANES.md) (Q4a-b); [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (B Q1-Q2b)
- **2ème Sc.:** [T1-CH04 Ex1](2sc/T1_CH04_ARITHMETIQUE.md) (Q3); [T1-CH06 Ex2](2sc/T1_CH06_BARYCENTRE.md) (Q1-Q2); [T1-CH07 Ex1](2sc/T1_CH07_TRANSLATIONS.md) (Q3); [T1-CH08 Ex1](2sc/T1_CH08_HOMOTHETIES.md) (Q3); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q5); [T2-CH07 Ex1](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q1); [T2-CH07 Ex2](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q2); [T2-CH08 Ex1](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q1-Q2); [T2-CH09 Ex1](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2); [T2-CH09 Ex2](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2)
- **3ème Sc. exp.:** [T1-CH02 Ex1](3se/T1_CH02_CONTINUITE.md) (A Q1-Q3); [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q1-Q3); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q3-Q4a); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q3); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q4); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q5-Q6); [T2-CH02 Ex2](3se/T2_CH02_ANGLES_ORIENTES.md) (Q1-Q2); [T2-CH05 Ex2](3se/T2_CH05_VECTEURS_ESPACE.md) (A Q1-Q3)

#### NumericTwin

- **Status:** extend. **Used by** 18 exercises (1ère 3, 2ème Sc. 6, 3ème Sc. exp. 9).
- **Purpose:** Pick values for the letter(s) and see both sides of an identity agree before proving it (1 - f(x) = (x - 1)^2/(x^2 + 1), cos 3x = 4cos^3 x - 3cos x, f(x) = ax + b + c/(x - 2)).
- **Student action:** tap values, compare both sides
- **Engine:** safe parser evaluates both sides at each value (exists); exact values for pi-multiples and surds
- **Props (sketch):** symbols (1-2 letters), template, compare, values (numbers or 'pi/12', 'sqrt(2)')
- **To add for 3ème Sc. exp.:** allow two symbols (a, b) for f(a) - f(b) = ..., an integer symbol n, and values given as safe-parser strings (pi/12, sqrt(2)) shown exactly
- **To add for 2ème Sc.:** 3se adds two symbols, an integer symbol n and exact values; 2eme adds integer functions gcd(a, b), mod(a, d) and units(n) in the safe parser for an integer symbol, so the PGCD pattern of T1_CH04 can be watched before it is proved
- **1ère:** [CH06 Ex2](1s/CH06_ACTIVITES_REPERE.md) (Q6a-b); [CH11 Ex1](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q2a-c, Q4-Q5); [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q4a-c)
- **2ème Sc.:** [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q2); [T1-CH03 Ex1](2sc/T1_CH03_POLYNOMES.md) (Q1-Q2, Q5); [T1-CH04 Ex1](2sc/T1_CH04_ARITHMETIQUE.md) (Q3); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q4); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q2); [T2-CH05 Ex1](2sc/T2_CH05_TRIGONOMETRIE.md) (Q5)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q2a-c, Q3a-c); [T1-CH03 Ex1](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (B Q1-Q5); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (B Q1-Q3); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q5); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q5); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q2); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q1); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q1); [T2-CH03 Ex1](3se/T2_CH03_TRIGONOMETRIE.md) (Q2)

#### PredictReveal

- **Status:** existing. **Used by** 17 exercises (1ère 8, 2ème Sc. 5, 3ème Sc. exp. 4).
- **Purpose:** Commit to a prediction (which draw is most favourable? the same door?) before the inner visual appears.
- **Student action:** pick a prediction, then explore the revealed visual
- **Engine:** none of its own (the inner component computes; the prediction is not graded)
- **Props (sketch):** prompt, options (2-4), reveal (inner spec), insight
- **1ère:** [CH01 Ex2](1s/CH01_ANGLES.md) (Q5a-b); [CH02 Ex1](1s/CH02_THALES.md) (Q2a-b); [CH02 Ex2](1s/CH02_THALES.md) (Q4a-c); [CH08 Ex1](1s/CH08_SECTIONS_PLANES.md) (Q5a-d); [CH08 Ex2](1s/CH08_SECTIONS_PLANES.md) (Q2a-b); [CH10 Ex2](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q3a-b); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q2a-b); [CH16 Ex1](1s/CH16_EXPLOITATION_INFORMATION.md) (Q6a-b)
- **2ème Sc.:** [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q5); [T2-CH01 Ex2](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q3-Q4); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q2); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q1); [T2-CH10 Ex1](2sc/T2_CH10_STATISTIQUES.md) (Q4)
- **3ème Sc. exp.:** [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q3); [T1-CH09 Ex2](3se/T1_CH09_SUITES_REELLES.md) (Q4); [T2-CH10 Ex1](3se/T2_CH10_PROBABILITES.md) (A Q1-Q4); [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q3-Q4)

#### StatementTap

- **Status:** existing. **Used by** 16 exercises (1ère 5, 2ème Sc. 4, 3ème Sc. exp. 7).
- **Purpose:** Method frame: tap the word of the French statement that decides the method (avec / sans remise, simultanement, au moins, exactement, un seul, ni ... ni, par defaut).
- **Student action:** tap a word in the statement
- **Engine:** none (targets in content)
- **Props (sketch):** frame type 'read': sentence, targets
- **1ère:** [CH08 Ex1](1s/CH08_SECTIONS_PLANES.md) (Q2a-b); [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (B Q2c-Q3); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q2a-b); [CH13 Ex2](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q2a-b); [CH16 Ex1](1s/CH16_EXPLOITATION_INFORMATION.md) (Q4-Q5)
- **2ème Sc.:** [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (B Q3); [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q1); [T1-CH09 Ex2](2sc/T1_CH09_ROTATIONS.md) (Q1-Q2); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q1)
- **3ème Sc. exp.:** [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q4); [T1-CH09 Ex2](3se/T1_CH09_SUITES_REELLES.md) (Q1-Q2); [T2-CH08 Ex1](3se/T2_CH08_DENOMBREMENT.md) (Q1); [T2-CH08 Ex2](3se/T2_CH08_DENOMBREMENT.md) (Q1); [T2-CH09 Ex2](3se/T2_CH09_STATISTIQUES.md) (A Q1); [T2-CH10 Ex1](3se/T2_CH10_PROBABILITES.md) (B Q1-Q3, B Q4); [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2)

#### CounterexampleHunt

- **Status:** reserved. **Used by** 12 exercises (1ère 2, 2ème Sc. 3, 3ème Sc. exp. 7).
- **Purpose:** 'Try to break this claim': the student proposes x, n or a bound M against a 'for all' statement (f(x) <= 1, d(x) >= 2, tan x >= x, g has a maximum, (An) is bounded) and the engine says whether the claim survives or is broken (local max 1 beaten by f(4) = 17).
- **Student action:** type or drag a trial value, submit tries, then pick 'holds' or 'fails'
- **Engine:** claim = inequality between two content expressions on a domain, or 'has a maximum' / 'is bounded above'; exact evaluation at the tried value; the true answer known from the analysis / sequences engine (sup, max, limit) so the final pick is graded; for 'bounded above' the engine returns an n with An > M
- **Props (sketch):** claim {kind: le | ge | has_max | bounded_above, lhs, rhs, domain}, variable, maxTries, hintValues
- **1ère:** [CH04 Ex2](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q3a-b); [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q4a-c)
- **2ème Sc.:** [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q3); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q5); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q4)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q2a-c); [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (B Q1-Q3); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q4b-c); [T1-CH04 Ex2](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (Q1-Q2); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q2-Q3); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (B Q1-Q3); [T1-CH09 Ex2](3se/T1_CH09_SUITES_REELLES.md) (Q5)

#### CompareTwo

- **Status:** existing. **Used by** 4 exercises (1ère 1, 2ème Sc. 1, 3ème Sc. exp. 2).
- **Purpose:** Two inner visuals stacked to compare (draws with vs without order; notes before vs after the affine change).
- **Student action:** explore both inner visuals
- **Engine:** none of its own
- **Props (sketch):** left, right (inner specs), leftLabel, rightLabel, insight
- **1ère:** [CH05 Ex2](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q4)
- **2ème Sc.:** [T2-CH10 Ex1](2sc/T2_CH10_STATISTIQUES.md) (Q4)
- **3ème Sc. exp.:** [T2-CH09 Ex1](3se/T2_CH09_STATISTIQUES.md) (Q4); [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q3-Q4)

### Numbers & algebra

#### IntervalBuilder

- **Status:** new. **Used by** 25 exercises (1ère 7, 2ème Sc. 8, 3ème Sc. exp. 10).
- **Purpose:** Write a domain or a solution set by building it on a number line (open / closed ends, unions, isolated points, excluded values); the written form ]-inf, -4] U [2, +inf[ builds itself.
- **Student action:** tap endpoints on the line (chips of allowed values), toggle bracket ends, add a piece or a point, choose +-infinity
- **Engine:** new src/engine/intervals.ts: exact endpoints (fractions, surds, multiples of pi), union normalisation, set equality with the engine's set (domain of a content expression, solution of an inequality, or a given set), localized feedback (wrong end, wrong bracket, missing piece)
- **Props (sketch):** axis {min, max, ticks: num | pi}, chips, expected: {domainOf: expr} | {solve: inequality} | {set}, allowPoints, allowInfinity
- **To add for 1ère:** beyond the 3se / 2eme spec: a whole-numbers filter (N or Z) for 'x entier naturel' (tariffs {0, ..., 19}, n <= 4.6 -> 0..4, integers of [-2, -1.5]) and the equality case of the distance condition (|x + 2| = 3 gives the two points -5 and 1)
- **1ère:** [CH06 Ex1](1s/CH06_ACTIVITES_REPERE.md) (A Q2b); [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q6a-c); [CH13 Ex1](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q3a-b, Q4c-e); [CH13 Ex2](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q2a-b, Q3); [CH14 Ex1](1s/CH14_FONCTIONS_AFFINES.md) (Q4a-b); [CH14 Ex2](1s/CH14_FONCTIONS_AFFINES.md) (Q5a-b); [CH15 Ex2](1s/CH15_SYSTEMES.md) (A Q3a-b)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q4); [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q3, Q4); [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (B Q3); [T1-CH03 Ex1](2sc/T1_CH03_POLYNOMES.md) (Q3, Q5); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q4); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q6); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q5); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (A Q2a-b, B Q1, B Q2)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q4a-c); [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q5); [T1-CH03 Ex1](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (B Q1-Q5); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (B Q1-Q3); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q1); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q2); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q4); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q3); [T2-CH03 Ex1](3se/T2_CH03_TRIGONOMETRIE.md) (Q3, Q4); [T2-CH03 Ex2](3se/T2_CH03_TRIGONOMETRIE.md) (Q3)

#### ProductGrid

- **Status:** new. **Used by** 13 exercises (1ère 4, 2ème Sc. 9).
- **Purpose:** The 'generic rectangle' for products of polynomials: each term of one factor times each term of the other fills a cell, cells of the same degree share a colour and are collected into the expanded form; used to expand (sqrt5 - 1)^2, to identify unknown coefficients (P(x) = (x - 3)(mx^2 + nx + p)), to read the degree and leading term of a product, and in complete-square mode to build a canonical form (x^2 + bx as a square missing its corner (b/2)^2).
- **Student action:** type a monomial in a cell, tap same-degree cells to collect them, type the unknown coefficients degree by degree; in complete-square mode read the missing corner and write a(x - alpha)^2 + beta
- **Engine:** new src/engine/polynomial.ts: exact polynomials over rationals and simple surds (sqrt5, sqrt3), expansion and collection by degree, coefficient comparison, solving the triangular identification system (m, n, p, then the check on the last coefficient), canonical form with exact alpha and beta; cells checked by sample equivalence through the safe parser
- **Props (sketch):** left, right (lists of terms, unknown coefficients allowed), target (polynomial to match), mode: expand | identify | degree | complete_square, unknowns, givenCells
- **1ère:** [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q2a-c, Q3a-d); [CH11 Ex1](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q1a-b, Q4-Q5); [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q2-Q3); [CH13 Ex1](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q4a-b)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q1-Q2); [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q1); [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (B Q1-Q2); [T1-CH03 Ex1](2sc/T1_CH03_POLYNOMES.md) (Q1-Q2, Q4); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q2, Q4); [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q3); [T2-CH02 Ex1](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q2); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (A Q1); [T2-CH06 Ex2](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q1)

#### BoundsRuler

- **Status:** new. **Used by** 8 exercises (1ère 3, 2ème Sc. 5).
- **Purpose:** A zoomable graduated ruler for encadrements and approximations: a bracket a < x < b is pushed through the operations of the question (subtract 2, square a positive, multiply by 600, take 1/x of a positive) and the student sees the new bracket, then whether it decides a rounding (does it straddle the half-way mark?) or gives an approximation par defaut / par exces at 10^-n.
- **Student action:** tap the operation to apply, drag or type the new bounds, tap 'arrondi = ...' or 'on ne peut pas conclure'; zoom one decimal further
- **Engine:** new src/engine/bounds.ts: exact rational interval arithmetic for monotone operations (+c, x k with the sign rule, x^2 and sqrt on positives, 1/x on positives), the rounding decision at 10^-n (nearest, par defaut, par exces, unit above), the true value (surd or rational) placed to check every bracket; a bracket that does not contain the true value is refused
- **Props (sketch):** start {lower, upper, of}, ops [{kind: add | mul | square | sqrt | inv, by}], target {expr, decimals, mode: nearest | default | excess | ceil}, ticks, zoomLevels
- **To add for 1ère:** beyond the 2eme spec (par defaut / par exces, rounding): the 1ere 'valeur approchee a 10^p pres' test (both 0.64 and 0.65 approximate 9/14 to 10^-2), a compare target that may answer 'the bracket cannot decide' (21.21 < 15 sqrt 2 < 21.225 against 21.22), and a start given as an inequality on an expression (-1 <= 2x - 3 <= 1/2) pushed back to x
- **1ère:** [CH09 Ex1](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (Q4a-c); [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q5a-b, Q6a-c); [CH10 Ex2](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q3a-b, Q4a-b)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q6); [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q3-Q4); [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (B Q3); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q4); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q5)

#### PartWholeBar

- **Status:** extend. **Used by** 7 exercises (1ère 4, 2ème Sc. 3).
- **Purpose:** Bars for a quantity and its changes: in the new percent-change mode each step (x 1.2, x 0.8; + 6 % of the start vs + 5 % of what is there; index base 100) is drawn on its own whole, so +20 % then -20 % visibly does not come back to 45 D and 18 index points are not 18 % of 2024.
- **Student action:** drag the stepped handle to the new value, tap the whole a percentage is taken of, read the global coefficient
- **Engine:** src/engine/partWhole.ts (exists: exact ratio, above-whole flag) extended to chains: product of coefficients, global change, the coefficient that comes back (5/6), percentage between two indices, simple vs compound growth of one year
- **Props (sketch):** whole, part, mode: place | fraction_of_quantity | feedback | percent_change, steps [{coef | percent, of: start | current}], indexBase, ticks
- **To add for 2ème Sc.:** today modes place / fraction_of_quantity / feedback for a probability above 1; add mode percent_change with a chain of steps, each measured on its own whole, the global coefficient, the back-to-start coefficient and an index-base-100 axis
- **To add for 1ère:** nothing beyond the 2eme percent_change mode: 1ere uses it for x 1.08 then x 0.75 (the seller's -17 % claim), the antecedent 432 / 1.08 = 400, the photo area x 2.56 and x 16/225, and indices base 100 in 2018; fraction_of_quantity (exists) for the tombola tickets
- **1ère:** [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (B Q4); [CH10 Ex2](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q1-Q2, Q5a-b); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q1a-d, Q2a-b); [CH16 Ex2](1s/CH16_EXPLOITATION_INFORMATION.md) (B Q1-Q4)
- **2ème Sc.:** [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q5); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q1); [T2-CH10 Ex2](2sc/T2_CH10_STATISTIQUES.md) (B Q7)

#### DivisibilityChecker

- **Status:** new. **Used by** 5 exercises (1ère 2, 2ème Sc. 3).
- **Purpose:** An integer written digit by digit with a divisor's criterion lit (units digit for 2 and 5, last two digits for 4 and 25, last three for 8, digit sum for 3 and 9, S1 - S2 by rank from the right for 11 with the manual's d + 11p rule) and the remainder it gives; unknown digits as slots (4c17, 6a3b, xyz) the student tries; a list filter (two-digit endings divisible by 4 using allowed digits).
- **Student action:** tap a divisor to light its criterion and type the remainder; try a digit in a slot and see if the condition holds; strike the numbers of a list that fail
- **Engine:** arithmetic.ts: remainders by 2, 3, 4, 5, 8, 9, 11, 25 through the criterion and by direct division (both must agree), rank parity from the right, the d + 11p rule for a negative d, every digit value satisfying a set of conditions (enumeration over 0-9 per slot), the symbolic criterion for letter digits (d = x + z - y)
- **Props (sketch):** number (digits or letter slots), divisors, ask: divisible | remainder | find_digits {conditions} | filter {list, conditions}, showCriterion
- **To add for 1ère:** beyond the 2eme spec (criteria, digit slots, filters): a division mode a = bq + r with 0 <= r < b (500 = 12 x 41 + 8 -> 41 multiples of 12 up to 500), a remainder-pattern row (18k mod 12 for k = 1..6), the Euclid chain (1176, 756 -> 84), and a long-division mode that lists the remainders, lights the first one that repeats and gives the n-th digit (9/14 = 0.6428571..., 100th digit 8)
- **1ère:** [CH09 Ex1](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (Q2c, Q3a-b, Q4a-c); [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (A Q1-Q2, B Q1-Q2b)
- **2ème Sc.:** [T1-CH04 Ex1](2sc/T1_CH04_ARITHMETIQUE.md) (Q1, Q2, Q4); [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q3, Q4, Q5, Q6); [T2-CH01 Ex1](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q3a-c)

#### FactorTree

- **Status:** new. **Used by** 5 exercises (1ère 3, 2ème Sc. 2).
- **Purpose:** Prime factorisation as a tree or a ladder of divisions (19683 -> 3^9, 2400 = 2^5 x 3 x 5^2); in radical mode equal primes pair into squares so the largest square comes out of the root (sqrt2400 = 20 sqrt6, sqrt720 = 12 sqrt5).
- **Student action:** tap a prime divisor to split the current number until every leaf is prime; pair equal primes; type the simplified radical
- **Engine:** new src/engine/arithmetic.ts: factorisation of integers up to a few million, divisor check, exponents, largest square factor (n = k^2 m, m square-free), 'is a power of b'; PGCD / PPCM from factorisations (1ere)
- **Props (sketch):** n, mode: tree | ladder | sqrt_simplify, ask: factorise | is_power_of {base} | simplify_sqrt
- **To add for 1ère:** beyond the 2eme spec (tree, ladder, sqrt_simplify): an exponent table for two numbers with PGCD = smaller exponents and PPCM = larger exponents (756 and 1176 -> 84 and 10584), a common-divisor grid 2^a x 3^b (252 and 180: 9 divisors, 7 cannot appear), a perfect-power mode (smallest k making 756 k a square: 21; 1176 k' a cube: 63), a reduce-fraction mode (756/1176 = 9/14), and a powers mode for exponent rules (2^5 x 3^-2 x 6^3 / (4^3 x 3))
- **1ère:** [CH09 Ex1](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (Q1-Q2b, Q3a-b, Q5a-b); [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (A Q1-Q2, A Q3a-b, B Q1-Q2b); [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q1a-b, Q2a-c)
- **2ème Sc.:** [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q1b-Q2); [T2-CH02 Ex1](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q2)

#### LinearSystemBoard

- **Status:** new. **Used by** 2 exercises (1ère 2).
- **Purpose:** A system of two first-degree equations as two equation cards and two lines: substitution, elimination with multipliers the student chooses (each combination is one more line through the same point), and the three cases (one point; parallel lines, 0 = 7; the same line, 0 = 0).
- **Student action:** pick the method; choose a multiplier for each equation until one unknown cancels; tap the solution point or the case; read the line of each equation
- **Engine:** new src/engine/systems.ts: exact 2 x 2 solving over rationals, classification (one / none / infinitely many), the combination k1 E1 + k2 E2 and the unknown it cancels, equivalence of two systems (same solution set), each equation as a line (y = mx + p, or vertical) for the plot
- **Props (sketch):** equations [{a, b, c}] x 2 (ax + by = c, rationals), unknowns {x, y}, method: substitution | elimination | graph, multipliers (chosen by the student), window, ask: multipliers | solution | classify
- **1ère:** [CH15 Ex1](1s/CH15_SYSTEMES.md) (Q1-Q2, Q3a-b, Q4a-b, Q5a-b); [CH15 Ex2](1s/CH15_SYSTEMES.md) (A Q1-Q2, B Q4-Q5)

### Functions & analysis

#### FunctionPlot

- **Status:** extend. **Used by** 23 exercises (1ère 6, 2ème Sc. 5, 3ème Sc. exp. 12).
- **Purpose:** Draw one or more curves with engine-placed points, asymptotes and lines (tangent, y = m, oblique asymptote) so the student reads what the exam asks about the graph.
- **Student action:** look, then tap a marker, a line or a region to answer (new tap ask); tap to expand
- **Engine:** src/engine/analysis.ts: content-defined functions (safe-parser expression strings validated at load, not only registry ids), piecewise pieces with open / closed ends, E(x) (floor) in the parser, trig on a pi-graduated axis; vertical and oblique asymptotes checked against engine limits; image band f([a, b]) of an x-band; exact y-values at rational points
- **Props (sketch):** curves [{fn: id | expr | pieces [{expr, from, to, closedFrom, closedTo}], label, style}], domain, range, xTicks: num | pi, markers: point | hole | hline | vline | asymptote | line {a, b} | xband {from, to} (<= 8), shade {between, from, to}, ask {kind: tap_marker | tap_region}
- **To add for 3ème Sc. exp.:** today one registry function, 6 markers (point, hline, vline, horizontal asymptote) and no events; add content expressions and pieces (with E(x)), several curves and lines (tangent, oblique asymptote, y = m), vertical asymptotes, hole / open-end dots, an x-band with its engine image band, a pi axis, and a tap ask that emits an event
- **To add for 2ème Sc.:** 3se adds content expressions, several curves, lines, vertical asymptotes, holes, x-band and a tap ask; 2eme adds a values table the student fills (cells checked exactly, filled points appear on the plot), a place_points ask for sketching (vertex, axis intercepts, symmetric point), a centre marker for a hyperbola, and an 'on the curve?' check for given points
- **To add for 1ère:** beyond today's code and the 3se / 2eme extensions (content expressions, several curves and lines, tap ask, values table, place_points): place_points used to draw a line from two points of y = ax + b, a read_point ask (coordinates of an intersection read on the grid), a slope step-triangle marker (x + dx -> y + a dx), lines given as ax + by = c, curves restricted to an interval (segments for x in [0, 1000] or t in [0.5, 11/6]), orthogonal axes with different units (6 cm per hour, 1 cm per 10 km)
- **1ère:** [CH12 Ex1](1s/CH12_FONCTIONS_LINEAIRES.md) (Q1-Q2, Q3a-b, Q4a-b, Q5a-b); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q3a-b); [CH14 Ex1](1s/CH14_FONCTIONS_AFFINES.md) (Q1a-d, Q2-Q3); [CH14 Ex2](1s/CH14_FONCTIONS_AFFINES.md) (Q3-Q4); [CH15 Ex1](1s/CH15_SYSTEMES.md) (Q4a-b, Q5a-b); [CH15 Ex2](1s/CH15_SYSTEMES.md) (B Q4-Q5)
- **2ème Sc.:** [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q1); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q1, Q5); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q4); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (A Q2a-b); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q1, Q2, Q3)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q2a-c); [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q1-Q2, B Q1-Q3); [T1-CH02 Ex1](3se/T1_CH02_CONTINUITE.md) (B Q1-Q4); [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q1-Q3, Q6); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q4b-c); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (A Q1-Q2, B Q1-Q3); [T1-CH04 Ex2](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (Q3-Q4); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q3); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q2, Q5-Q6); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q5-Q6); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q2, A Q5-Q6, B Q1-Q3); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q5)

#### HorizontalLineSweep

- **Status:** new. **Used by** 18 exercises (1ère 4, 2ème Sc. 6, 3ème Sc. exp. 8).
- **Purpose:** Drag a horizontal line y = m over the curve and count the crossings: solve f(x) = m and f(x) <= k graphically and discuss the number of solutions according to m.
- **Student action:** drag m (stepped), tap the intersection points, fill the 'm -> number of solutions' rows; in inequality mode shade the x where the curve is under the line
- **Engine:** analysis.ts: intersections with y = m on each monotone piece (exact for piecewise-affine and degree <= 2 cases, bracketed otherwise), critical m values (extrema, limits, end values), solution set of f(x) <= k as intervals (handed to IntervalBuilder)
- **Props (sketch):** fn, domain, m {min, max, step, init}, criticalM, mode: count | inequality, ask: discussion rows
- **To add for 1ère:** beyond the 3se spec (one fn, count / inequality modes): several curves under one sweep line, a whole-number domain (keep the largest number of entries), and a read mode that only reads the antecedent of m on one line
- **1ère:** [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q5); [CH12 Ex2](1s/CH12_FONCTIONS_LINEAIRES.md) (Q3a-b); [CH13 Ex2](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q4); [CH14 Ex2](1s/CH14_FONCTIONS_AFFINES.md) (Q5a-b)
- **2ème Sc.:** [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (B Q3); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q4); [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q3); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q2, Q6); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q5); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q3, Q4)
- **3ème Sc. exp.:** [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q5); [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q6); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q5); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q5); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q4); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q7); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q3); [T2-CH03 Ex2](3se/T2_CH03_TRIGONOMETRIE.md) (Q3)

#### ParameterPlayground

- **Status:** reserved. **Used by** 13 exercises (1ère 4, 2ème Sc. 6, 3ème Sc. exp. 3).
- **Purpose:** Sliders for the parameters of a function (a, b, m) with live engine outputs and the linked curve, to find the values that make a property hold (limit at 1 exists, extremum at 2, sign of f(a) - f(b)).
- **Student action:** drag sliders, read outputs, tap 'found' when the property holds
- **Engine:** analysis.ts: parameters substituted into content expressions; outputs as engine calls (value, one-sided limit, derivative, difference); the condition's solution set known to the engine to grade 'found'
- **Props (sketch):** params [{name, min, max, step, init}], expr, outputs [{label, call: value | limit | derivative | diff, at}], goal, render: FunctionPlot props
- **To add for 2ème Sc.:** 3se renders on a FunctionPlot; 2eme adds a number-line render (several outputs as points, their order visible) and a GeometryCanvas render (circle Gamma_k), and a 'never' answer for unreachable goals
- **To add for 1ère:** nothing beyond the 2eme extension (number-line render with the order of several outputs, a 'never' answer): 1ere uses the FunctionPlot render for the lines and the number line for a, a^2, sqrt a, 1/a
- **1ère:** [CH10 Ex1](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q3a-d); [CH12 Ex1](1s/CH12_FONCTIONS_LINEAIRES.md) (Q4a-b); [CH14 Ex1](1s/CH14_FONCTIONS_AFFINES.md) (Q5a-b); [CH15 Ex2](1s/CH15_SYSTEMES.md) (B Q6a-b)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q5); [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q5); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q5); [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q4); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q2); [T2-CH06 Ex2](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q5)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q3a-c); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q1-Q2); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q1)

#### SituationToGraph

- **Status:** new. **Used by** 13 exercises (1ère 3, 2ème Sc. 5, 3ème Sc. exp. 5).
- **Purpose:** Link a concrete figure (car and antenna, door under an arch, tangent from a point to a circle, ferris-wheel cabin) to the graph of the quantity studied: one slider moves the figure and the point on the graph.
- **Student action:** drag the parameter (x or t); tap the graph point matching the figure (or the reverse); predict where the extremum is
- **Engine:** analysis.ts + geometry2d.ts: the quantity measured on the figure and given by the formula, checked equal (AM = sqrt(x^2 + 2x + 5), S(x) = 2x(12 - x^2), MT = sqrt(x^2 + 2x - 8), h(t)); special positions (extrema, crossings) from the analysis engine
- **Props (sketch):** scene: GeometryCanvas spec with a parameter point (presets car_antenna, door_arch, circle_tangent, wheel), param {name, min, max, step}, quantity {expr, label}, graph: FunctionPlot props
- **To add for 2ème Sc.:** 3se: a generic scene with one moving point plus 4 presets; 2eme needs scene points given by expressions of the parameter (rectangle x by 60 - 2x, box net with h = 32/x^2, square MNPQ, object and image on a lens bench) and two quantities on one graph (S and T with S + T = 36)
- **To add for 1ère:** nothing beyond the 2eme extension (scene points given as expressions of the parameter, two quantities on one graph) and FunctionPlot's 2eme values table: 1ere scenes are the box cut from a 20 cm sheet, the truck and the car on the road A-B (d1 and d2 on one graph) and the bridge sliding along the river
- **1ère:** [CH04 Ex2](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q3a-b); [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q1a-d, Q2-Q3); [CH14 Ex2](1s/CH14_FONCTIONS_AFFINES.md) (Q1-Q2, Q3-Q4)
- **2ème Sc.:** [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (B Q1-Q2, B Q4); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q1); [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q3); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q1); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q1)
- **3ème Sc. exp.:** [T1-CH04 Ex2](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (Q1-Q2, Q5); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q1, Q3); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q1, Q7); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q1, Q5); [T2-CH03 Ex2](3se/T2_CH03_TRIGONOMETRIE.md) (Q1-Q2, Q5)

#### SignTableBuilder

- **Status:** new. **Used by** 12 exercises (1ère 2, 2ème Sc. 3, 3ème Sc. exp. 7).
- **Purpose:** Build the sign table of a product or quotient of factors (affine, trinome, sin u on an interval) to get the sign of f'(x), of f(x) - (ax + b), or to drop absolute values.
- **Student action:** tap the roots onto the x-line in order, set each factor's sign per interval, deduce the result row (|| at forbidden values)
- **Engine:** analysis.ts (new helpers): roots of each factor (affine, trinome with discriminant, sin / cos on an interval), exact ordering, sign per interval, product / quotient sign; graded per cell
- **Props (sketch):** factors [{expr, label, inDenominator}], interval, givenCells, forbidden, resultLabel (same grid as VariationTableBuilder)
- **1ère:** [CH11 Ex2](1s/CH11_ACTIVITES_ALGEBRIQUES.md) (Q4a-c); [CH13 Ex1](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q4c-e)
- **2ème Sc.:** [T1-CH02 Ex1](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (Q3); [T1-CH03 Ex1](2sc/T1_CH03_POLYNOMES.md) (Q3, Q5); [T1-CH03 Ex2](2sc/T1_CH03_POLYNOMES.md) (Q4)
- **3ème Sc. exp.:** [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q1-Q2); [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q5); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (B Q1-Q3); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (A Q1-Q2, B Q2-Q3); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q2); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q2, Q3, Q7); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q2)

#### VariationTableBuilder

- **Status:** extend. **Used by** 11 exercises (2ème Sc. 4, 3ème Sc. exp. 7).
- **Purpose:** Build the tableau de variation: sign of f', arrows, values at the extrema and limits at the ends and at forbidden values.
- **Student action:** tap cells to set signs and arrows, place the x-values, pick values and limits from chips
- **Engine:** analysis.ts: sign changes of f' (exists), forbidden values (double bar) and domain gaps, one-sided limits at the ends and forbidden values, exact extremum values (fractions, surds like 8 sqrt 3, multiples of pi); graded with hints
- **Props (sketch):** fn, fPrime, scan, xPoints (engine-checked), forbidden, gaps, ends, givenCells, mode: student_fill | readonly | progressive
- **To add for 3ème Sc. exp.:** today one f' sign row and arrows, no forbidden values, no limit cells, student_fill only (D79 asks for a mockup first); add || columns, excluded intervals (]-4, 2[), limit and value cells, readonly and progressive modes; shares VariationGrid with SignTableBuilder
- **To add for 2ème Sc.:** 3se adds forbidden values, limit cells, readonly and progressive modes; 2eme adds signRow: false (no f' row, no limits) with arrows judged by the engine's monotony check, since the 2eme programme has no derivatives
- **2ème Sc.:** [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q4); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q2); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (A Q2a-b); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q1)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q3a-c); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (A Q1-Q2, B Q2-Q3); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q2, Q3); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q3); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q4); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q3, B Q1-Q3); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q2, Q4)

#### PointOnCurve

- **Status:** extend. **Used by** 10 exercises (2ème Sc. 2, 3ème Sc. exp. 8).
- **Purpose:** Drag x and see M(x, f(x)) and its image M' by a symmetry or a translation; the engine shows whether M' lands on the curve (parity, axis x = a, centre (a, b), period T).
- **Student action:** drag x (stepped), switch the transformation, tap 'on the curve' / 'not on the curve'
- **Engine:** analysis.ts: f(2a - x) vs f(x) (axis), f(2a - x) vs 2b - f(x) (centre), f(x + T) vs f(x) (period), domain check 2a - x in D_f; exact when rational
- **Props (sketch):** fn (id | expr), map: even | odd | {axis: a} | {center: [a, b]} | {translate: T}, x0, domain, step, compareFn
- **To add for 3ème Sc. exp.:** today only the mirror about the y-axis (f(-x)); add odd (centre O), axis x = a, centre (a, b), translation by a period, and content-defined functions
- **To add for 2ème Sc.:** 3se adds odd, axis x = a, centre (a, b) and a period; 2eme adds a translation by any vector (a, b), a homothety (centre, k) and the reflection in the x-axis, mapping onto a different target curve
- **2ème Sc.:** [T2-CH03 Ex1](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q3); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (A Q1, A Q2c, B Q1)
- **3ème Sc. exp.:** [T1-CH01 Ex1](3se/T1_CH01_GENERALITES_FONCTIONS.md) (Q1); [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q3); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (B Q4); [T1-CH04 Ex2](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (Q1-Q2); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q4); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q2); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q2); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q1)

#### TangentSlope

- **Status:** extend. **Used by** 7 exercises (3ème Sc. exp. 7).
- **Purpose:** Drag x along the curve, see the tangent and the sign of its slope, find where the tangent is horizontal or parallel to a given line, and link the sign of f' to the arrows.
- **Student action:** drag x; tap 'parallel' when the tangent matches the target; fill the mini table from visited regions
- **Engine:** analysis.ts: f'(x) from a content derivative expression checked against the numeric derivative; solutions of f'(x) = m on the domain (bracketed roots, exact in rational cases); domains with gaps
- **Props (sketch):** fn, fPrime, x0, domain, step, targetSlope, showTable
- **To add for 3ème Sc. exp.:** add targetSlope (tangent parallel to y = mx + p), a content derivative expression checked by the engine, and domains with gaps or forbidden values
- **3ème Sc. exp.:** [T1-CH05 Ex1](3se/T1_CH05_NOMBRE_DERIVE.md) (Q1d); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q4); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q2-Q3); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q2); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q3, Q5-Q6); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q3); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q2, Q4)

#### CurveCompare

- **Status:** reserved. **Used by** 6 exercises (1ère 2, 2ème Sc. 4).
- **Purpose:** Two curves on one plot (two price lines, S and T, sqrt(x + 4) and x + 2, the hyperbola and y = x) with their difference shown live under a dragged x, so the student reads where one is above the other and links it to the sign of f(x) - g(x).
- **Student action:** drag x, read both values and the difference, tap the crossing points, shade where f is above g
- **Engine:** analysis.ts: difference expression and its sign changes (exact roots for affine / degree <= 2 differences and rational differences with one pole), crossings, domain where both exist; the shaded set handed to IntervalBuilder
- **Props (sketch):** f, g (content expressions), domain, labels, showDiff, ask: crossings | above_set
- **To add for 1ère:** beyond the 2eme spec (two curves): up to three curves with 'which is lowest' bands (tariffs A, B, C: 0-19, 20, 21-35, 36, 37+) and a whole-number x axis
- **1ère:** [CH13 Ex2](1s/CH13_EQUATIONS_INEQUATIONS.md) (Q3); [CH14 Ex1](1s/CH14_FONCTIONS_AFFINES.md) (Q4a-b)
- **2ème Sc.:** [T1-CH02 Ex2](2sc/T1_CH02_PREMIER_SECOND_DEGRE.md) (A Q1); [T2-CH03 Ex2](2sc/T2_CH03_GENERALITES_FONCTIONS.md) (Q4); [T2-CH04 Ex1](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (B Q2); [T2-CH04 Ex2](2sc/T2_CH04_FONCTIONS_DE_REFERENCE.md) (Q2)

#### LimitExplorer

- **Status:** extend. **Used by** 6 exercises (3ème Sc. exp. 6).
- **Purpose:** Walk x towards a point a (left or right) or towards +-infinity and read f(x), its parts, a simplified twin and the gap to an asymptote: 0/0 forms, infinite one-sided limits, oblique asymptotes.
- **Student action:** drag x towards the target (stepped), switch side, drag an epsilon line and read from which x the gap stays below it
- **Engine:** analysis.ts: one-sided limit probe at a finite a (finite or +-infinity with sign); simplified twin checked equal to f off a; gap f(x) - (ax + b) and its limit; threshold solve (smallest x with |gap| < eps: x > 102, x > 18.95) exact for rational gaps
- **Props (sketch):** fn, target: {at, side: left | right | both} | {inf: plus | minus}, numerator, denominator, simplified, asymptote {a, b}, epsilon, xMax, step
- **To add for 3ème Sc. exp.:** today only x -> +-infinity with a horizontal limit; add finite points with sides, the engine-checked simplified twin (factorised or conjugate form), the oblique-asymptote gap and an epsilon threshold
- **3ème Sc. exp.:** [T1-CH03 Ex1](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (A Q1, A Q2); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q3-Q4a); [T1-CH04 Ex1](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (A Q1-Q2, A Q3, B Q1-Q3); [T1-CH04 Ex2](3se/T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) (Q3-Q4, Q5); [T1-CH07 Ex1](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q2); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q5-Q6)

#### PiecewiseJoin

- **Status:** new. **Used by** 6 exercises (3ème Sc. exp. 6).
- **Purpose:** Zoom on the point where two pieces of a function meet: do they join (continuity), without a corner (derivability), which parameter makes them join, can a hole be filled (prolongement par continuite)?
- **Student action:** drag the parameter slider(s) (m, k), switch continuity / derivability view, tap 'joins', 'jump', 'corner' or 'hole'
- **Engine:** analysis.ts: left and right limits at the junction, value at the point, jump size, one-sided derivatives (half-tangent slopes), parameter values closing the jump or the corner (exact when the condition is affine in the parameter), jumps of E(x)
- **Props (sketch):** pieces [{expr, from, to, closedFrom, closedTo}], at, params [{name, min, max, step, init}], view: continuity | derivability, hole {fill}
- **3ème Sc. exp.:** [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q1-Q2, B Q1-Q3); [T1-CH02 Ex1](3se/T1_CH02_CONTINUITE.md) (A Q1-Q3, B Q1-Q4); [T1-CH03 Ex1](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (A Q2, B Q1-Q5); [T1-CH03 Ex2](3se/T1_CH03_LIMITES_ET_CONTINUITE.md) (Q3-Q4a); [T1-CH05 Ex1](3se/T1_CH05_NOMBRE_DERIVE.md) (Q4); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q1-Q2)

#### SecantToTangent

- **Status:** extend. **Used by** 5 exercises (3ème Sc. exp. 5).
- **Purpose:** Shrink h step by step: the rate (f(a + h) - f(a))/h settles on f'(a) and f(a) + f'(a)h hugs f(a + h): derivative by definition, approximation affine and its error, one-sided derivatives, vertical half-tangents.
- **Student action:** step h down (and to negative h), read the rate / error table, pick what the rate tends to
- **Engine:** analysis.ts: exact rate at rational h, engine f'(a); left and right derivatives separately; unbounded-rate detection (vertical half-tangent); approximation error f(a + h) - (f(a) + f'(a)h)
- **Props (sketch):** fn, a, side: right | left | both, hSteps, show: [secant, tangent, approx], domain, range
- **To add for 3ème Sc. exp.:** add side (left / right) for corners and demi-tangentes, the approximation-affine readout with its error, the unbounded-rate case, and content functions
- **3ème Sc. exp.:** [T1-CH05 Ex1](3se/T1_CH05_NOMBRE_DERIVE.md) (Q1a-c, Q2, Q4); [T1-CH05 Ex2](3se/T1_CH05_NOMBRE_DERIVE.md) (Q3, Q5); [T1-CH06 Ex2](3se/T1_CH06_FONCTION_DERIVEE.md) (Q5); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q3); [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q5-Q6)

#### BisectionStepper

- **Status:** new. **Used by** 2 exercises (3ème Sc. exp. 2).
- **Purpose:** Locate a root by halving an interval (dichotomie) or by bracketing it between grid points, the sign of f(c) deciding which half to keep (the IVT made visible).
- **Student action:** tap 'keep left' / 'keep right' after f(c) is shown, fill the table row by row; in bracket mode tap the intervals where the sign changes
- **Engine:** analysis.ts: exact f(c) at dyadic c, sign, halving, amplitude, approximation by default; sign changes on a grid; uniqueness read from the variation table
- **Props (sketch):** fn, start [a, b], steps (<= 6), mode: bisect | bracket, grid, showTable
- **3ème Sc. exp.:** [T1-CH02 Ex2](3se/T1_CH02_CONTINUITE.md) (Q4); [T1-CH06 Ex1](3se/T1_CH06_FONCTION_DERIVEE.md) (B Q4)

### Sequences

#### SequenceExplorer

- **Status:** reserved. **Used by** 8 exercises (2ème Sc. 4, 3ème Sc. exp. 4).
- **Purpose:** A sequence as points (n, un) and as a table (terms, differences, ratios), with bounds, a threshold, an epsilon-band around a candidate limit, and two or three sequences side by side.
- **Student action:** drag n, tap a term for its exact value, drag a threshold or an epsilon-band and read the first N after which all terms stay inside, compare sequences
- **Engine:** src/engine/sequences.ts (stub today): explicit un = f(n), recurrence un+1 = g(un) in exact rationals, geometric partial sums, exact differences and ratios, smallest n for a threshold, N for an epsilon-band (proved from a monotone bound when available, else labelled 'observed up to n')
- **Props (sketch):** series [{id, def: explicit {expr} | recurrence {u0, expr} | sum {first, ratio}, label}] (<= 3), nRange, view: plot | table | both, columns: diff | ratio, threshold, epsilonBand {L, eps}, overlayFn
- **To add for 3ème Sc. exp.:** reserved name planned for the integral sequence I_n (COMPONENTS_ANALYSIS #9); proposed here as the general sequence explorer, merging SequencePlot and SqueezeVisual of COMPONENTS_COMPLEX_SEQUENCES.md; I_n becomes one more 'def' kind later
- **To add for 2ème Sc.:** 3se defines the general explorer (plot, table, threshold, epsilon band, up to 3 series); 2eme adds the sum view (bars, pairing first and last, partial sums as a series), the 'is X a term?' query, a first index of 1 (a1 = 800) and money rounding
- **2ème Sc.:** [T2-CH01 Ex1](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q1, Q3a-c, Q3d, Q4-Q5); [T2-CH01 Ex2](2sc/T2_CH01_SUITES_ARITHMETIQUES.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH02 Ex1](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q1, Q3-Q4, Q5); [T2-CH02 Ex2](2sc/T2_CH02_SUITES_GEOMETRIQUES.md) (Q2, Q3-Q4)
- **3ème Sc. exp.:** [T1-CH09 Ex1](3se/T1_CH09_SUITES_REELLES.md) (A Q1-Q2, A Q3, B Q4); [T1-CH09 Ex2](3se/T1_CH09_SUITES_REELLES.md) (Q1-Q2, Q4); [T1-CH10 Ex1](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q1, Q2, Q3, Q4, Q5); [T1-CH10 Ex2](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q1, Q3-Q4, Q5)

#### CobwebDiagram

- **Status:** new. **Used by** 3 exercises (3ème Sc. exp. 3).
- **Purpose:** Build un+1 = f(un) on the graph of f with the line y = x (staircase or spiral) to conjecture monotony, bounds and the limit (fixed point).
- **Student action:** tap 'next step' (up to the curve, across to y = x, down to the axis); predict the next term before it is drawn
- **Engine:** sequences.ts: exact iterates, fixed points (f(x) = x solved), monotony of f on the range, staircase vs spiral
- **Props (sketch):** f (expr), u0, steps (<= 8), domain, showFixedPoint, predict
- **3ème Sc. exp.:** [T1-CH09 Ex1](3se/T1_CH09_SUITES_REELLES.md) (B Q1); [T1-CH10 Ex1](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q5); [T1-CH10 Ex2](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q2)

#### InductionStepper

- **Status:** new. **Used by** 3 exercises (3ème Sc. exp. 3).
- **Purpose:** Task frame for a proof by induction in four parts (statement, base case, heredity, conclusion), with the property tested on the first terms so the student sees why the chain works.
- **Student action:** check P(n0) in the engine table, write the heredity lines under 'suppose P(n)' in the Worksheet, pick the conclusion card
- **Engine:** sequences.ts: P(n) evaluated exactly for n = n0 .. n0 + 5; base-case line check; heredity lines with symbolic n through exprLine samples (needs inequality lines, see Worksheet)
- **Props (sketch):** property {kind: inequality | bounds | formula | membership, expr}, n0, testUpTo, heredityHint
- **3ème Sc. exp.:** [T1-CH09 Ex1](3se/T1_CH09_SUITES_REELLES.md) (B Q2-Q3); [T1-CH09 Ex2](3se/T1_CH09_SUITES_REELLES.md) (Q3, Q5); [T1-CH10 Ex2](3se/T1_CH10_LIMITES_DE_SUITES.md) (Q1)

### Plane geometry & transformations

#### GeometryCanvas

- **Status:** new. **Used by** 36 exercises (1ère 13, 2ème Sc. 16, 3ème Sc. exp. 7).
- **Purpose:** One plane board for figures: points by coordinates or constructed (midpoint, projection, intersection, centre of gravity, circumcentre, orthocentre, rotation), segments, lines, circles, vectors, geometric and oriented angle marks, live engine readouts (lengths, dot products, angles, coordinates); also a 1-D axis mode.
- **Student action:** drag free points, tap a point / segment / angle to answer, place a constructed point, enter a measure (checked mod 2 pi)
- **Engine:** new src/engine/geometry2d.ts: exact coordinates (rationals and square roots of small integers), constructions, dot product, lengths, oriented angles as rational multiples of pi mod 2 pi, collinearity / orthogonality / concyclicity checks; transformations (translation, reflection, rotation, homothety) as the extension point for 2eme / 1ere
- **Props (sketch):** frame: none | axis1d | axes | grid, points [{id, at | construct {kind, of}}], objects [segment | line | ray | circle | vector | polygon | angleMark {oriented}], draggable, readouts [{kind: length | dot | angle | coords, of}], transforms, ask {kind: place | tap | measure}
- **To add for 2ème Sc.:** 3se reserves `transforms` for 2eme / 1ere; 2eme makes it real (four transformations, images of points, lines, circles and polygons, chains such as two central symmetries giving a translation), adds the oblique-frame grid and vector tools, and line / circle objects given by equations with normal vectors and distances
- **To add for 1ère:** beyond the 3se spec and the 2eme extension (four transformations with images of points, lines, circles and polygons, length and area ratios, Chasles head-to-tail sums and k u, params): (1) geometric angles in degrees with angle-pair marks and a tap_pair ask (alternes-internes, correspondants, interieurs d'un meme cote; inscrit and au centre on the same arc); (2) points tied to a segment, line or circle (glider: F on [BC], R on [AC], the vertex of an inscribed angle, T on y = 8); (3) construction steps (protractor angle, parallel through a point, equal compass steps on a half-line, bisector, mediatrix) that the student performs or orders; (4) Thales ratio readouts in the three positions of the course; (5) the quarter turn named direct / indirect with the grid-step method (3 right 1 up -> 3 up 1 left), on top of the 2eme rotation; (6) the parallelogram rule and the centre of gravity among the vector tools; (7) circular sectors with their area; (8) presets clock (time slider moves both hands) and river (bridge, boat)
- **1ère:** [CH01 Ex1](1s/CH01_ANGLES.md) (Q1, Q2a-b, Q3a-b, Q4a-b, Q5a-b); [CH01 Ex2](1s/CH01_ANGLES.md) (Q1a-c, Q2a-c, Q3a-c, Q4a-b, Q5a-b); [CH02 Ex1](1s/CH02_THALES.md) (Q2a-b, Q3a-c, Q4a-b, Q5); [CH02 Ex2](1s/CH02_THALES.md) (Q1a-b, Q2a-b, Q3a-c, Q4a-c, Q5-Q6); [CH04 Ex1](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q1a-b, Q2a-b, Q3a-b, Q4a-b, Q5a-c); [CH04 Ex2](1s/CH04_VECTEURS_TRANSLATIONS.md) (Q1-Q2, Q3a-b, Q4a-c); [CH05 Ex1](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q1a-b, Q2a-b, Q3a-b, Q4a-c, Q5a-b); [CH05 Ex2](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q1a-b, Q2a-c, Q3a-d); [CH06 Ex1](1s/CH06_ACTIVITES_REPERE.md) (A Q1-Q2a, B Q3-Q4, B Q5a-c, B Q6a-b); [CH06 Ex2](1s/CH06_ACTIVITES_REPERE.md) (Q1-Q2, Q3-Q5, Q6a-b); [CH07 Ex1](1s/CH07_QUART_DE_TOUR.md) (Q1a-c, Q2a-c, Q3a-c, Q4a-b); [CH07 Ex2](1s/CH07_QUART_DE_TOUR.md) (Q1a-c, Q2a-b, Q3a-b, Q4a-c, Q5a-c); [CH10 Ex2](1s/CH10_ACTIVITES_NUMERIQUES_II.md) (Q1-Q2, Q3a-b)
- **2ème Sc.:** [T1-CH01 Ex1](2sc/T1_CH01_CALCUL_DANS_R.md) (Q4); [T1-CH01 Ex2](2sc/T1_CH01_CALCUL_DANS_R.md) (Q1); [T1-CH05 Ex1](2sc/T1_CH05_CALCUL_VECTORIEL.md) (Q1, Q2, Q3, Q4, Q5); [T1-CH05 Ex2](2sc/T1_CH05_CALCUL_VECTORIEL.md) (Q1-Q2, Q3, Q4); [T1-CH06 Ex1](2sc/T1_CH06_BARYCENTRE.md) (Q4); [T1-CH06 Ex2](2sc/T1_CH06_BARYCENTRE.md) (Q5); [T1-CH07 Ex1](2sc/T1_CH07_TRANSLATIONS.md) (Q1-Q2, Q3, Q4); [T1-CH07 Ex2](2sc/T1_CH07_TRANSLATIONS.md) (Q1, Q3, Q4); [T1-CH08 Ex1](2sc/T1_CH08_HOMOTHETIES.md) (Q1, Q2, Q3, Q4); [T1-CH08 Ex2](2sc/T1_CH08_HOMOTHETIES.md) (Q1-Q2, Q3, Q4-Q5); [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q2, Q3, Q4); [T1-CH09 Ex2](2sc/T1_CH09_ROTATIONS.md) (Q1-Q2, Q3, Q4); [T2-CH05 Ex2](2sc/T2_CH05_TRIGONOMETRIE.md) (Q1-Q2, Q3, Q4); [T2-CH06 Ex1](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q1, Q2, Q3, Q4, Q5); [T2-CH06 Ex2](2sc/T2_CH06_GEOMETRIE_ANALYTIQUE.md) (Q1, Q2-Q3, Q4); [T2-CH07 Ex1](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q5)
- **3ème Sc. exp.:** [T1-CH01 Ex2](3se/T1_CH01_GENERALITES_FONCTIONS.md) (A Q4); [T1-CH07 Ex2](3se/T1_CH07_ETUDE_DE_FONCTIONS.md) (Q1); [T2-CH01 Ex1](3se/T2_CH01_PRODUIT_SCALAIRE_PLAN.md) (Q1-Q2, Q3, Q4); [T2-CH01 Ex2](3se/T2_CH01_PRODUIT_SCALAIRE_PLAN.md) (Q1-Q2, Q3); [T2-CH02 Ex1](3se/T2_CH02_ANGLES_ORIENTES.md) (Q2-Q3, Q5); [T2-CH02 Ex2](3se/T2_CH02_ANGLES_ORIENTES.md) (Q1-Q2, Q3); [T2-CH03 Ex2](3se/T2_CH03_TRIGONOMETRIE.md) (Q4)

#### LocusTracer

- **Status:** new. **Used by** 10 exercises (1ère 1, 2ème Sc. 3, 3ème Sc. exp. 6).
- **Purpose:** Drag M and see whether it satisfies a condition (MB.MC = 12, AM.AB = k, MA = MB, (MA, MD) = pi/2 [2 pi], |z - a| = |z - b|, arg z = pi/3); satisfying positions leave a trace, then the student names the set (line, circle, arc, half-line) and its elements.
- **Student action:** drag M, read the condition value, drop trace points, pick the set and its centre / radius from cards
- **Engine:** geometry2d.ts (+ complex.ts for affix conditions): the condition evaluated at M; the true locus from the condition kind (level line of a dot product, mediatrix, circle, arc of an inscribed angle, half-line) to grade the pick and draw it
- **Props (sketch):** base: GeometryCanvas props, condition {kind: dot_const | dot_fixed_vector | dist_equal | dist_const | oriented_angle | arg_const | modulus_const, params}, tolerance, answerCards
- **To add for 2ème Sc.:** 3se conditions are dot products, distances, oriented angles and complex affixes; 2eme adds weighted-vector norm conditions (reduced by the engine), colinearity with a fixed vector, and an image mode (a driving point on a curve, its image traced, excluded points named)
- **To add for 1ère:** beyond the 3se conditions (dot products, distances, oriented angles, affixes): a geometric angle condition in degrees (APB = 90 deg gives the whole circle minus A and B, not an arc) and answer cards with excluded points
- **1ère:** [CH01 Ex2](1s/CH01_ANGLES.md) (Q3a-c)
- **2ème Sc.:** [T1-CH06 Ex1](2sc/T1_CH06_BARYCENTRE.md) (Q3, Q4); [T1-CH07 Ex2](2sc/T1_CH07_TRANSLATIONS.md) (Q2); [T1-CH09 Ex2](2sc/T1_CH09_ROTATIONS.md) (Q4)
- **3ème Sc. exp.:** [T2-CH01 Ex1](3se/T2_CH01_PRODUIT_SCALAIRE_PLAN.md) (Q5); [T2-CH01 Ex2](3se/T2_CH01_PRODUIT_SCALAIRE_PLAN.md) (Q3, Q4); [T2-CH02 Ex1](3se/T2_CH02_ANGLES_ORIENTES.md) (Q4); [T2-CH02 Ex2](3se/T2_CH02_ANGLES_ORIENTES.md) (Q4); [T2-CH04 Ex1](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q4); [T2-CH04 Ex2](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q4-Q5)

#### BarycentreBalance

- **Status:** new. **Used by** 4 exercises (2ème Sc. 4).
- **Purpose:** Weighted points on a line or in a triangle: move the weights (negative ones too) and see the barycentre move, leave the segment when the signs differ, stay put when all weights are multiplied by k, and regroup into partial barycentres (G = bar{(A, 3), (I, 3)}, P midpoint of [GC]); also shows alpha vec(MA) + beta vec(MB) = (alpha + beta) vec(MG) for a dragged M.
- **Student action:** drag or step the weights, place G on the line (checked), tap two points to regroup them into their partial barycentre, drag M to see the reduction
- **Engine:** geometry2d.ts: exact barycentre of 2 or 3 weighted points (rational weights, sum != 0), vec(AG) = beta/(alpha + beta) vec(AB), partial barycentres, the reduction vector (constant when the weights sum to 0), check that a placed point or a chosen pair of weights gives the target point
- **Props (sketch):** points [{id, at}], weights [{id, w, min, max, step}], regroup (allowed groups), showReduction, ask: place | weights_for_point | regroup
- **2ème Sc.:** [T1-CH06 Ex1](2sc/T1_CH06_BARYCENTRE.md) (Q1-Q2a, Q2b, Q4); [T1-CH06 Ex2](2sc/T1_CH06_BARYCENTRE.md) (Q1-Q2, Q3-Q4); [T1-CH08 Ex1](2sc/T1_CH08_HOMOTHETIES.md) (Q2); [T1-CH08 Ex2](2sc/T1_CH08_HOMOTHETIES.md) (Q3)

### Vectors & analytic geometry

#### DeterminantExpander

- **Status:** new. **Used by** 3 exercises (3ème Sc. exp. 3).
- **Purpose:** Expand a 3x3 determinant along the first column: each entry lights its minor (row and column crossed out) and its sign, and the student writes each 2x2 minor himself.
- **Student action:** tap a first-column entry to light its minor, write the minor and the sum in the Worksheet
- **Engine:** new src/engine/space.ts: exact determinant and minors with rational entries or entries affine in one parameter (m, t), compared on samples; lines checked by the Worksheet
- **Props (sketch):** columns (three vectors with labels), params, show: minors | signs
- **3ème Sc. exp.:** [T2-CH05 Ex1](3se/T2_CH05_VECTEURS_ESPACE.md) (Q2, Q3, Q4); [T2-CH05 Ex2](3se/T2_CH05_VECTEURS_ESPACE.md) (B Q4-Q6); [T2-CH07 Ex1](3se/T2_CH07_DROITES_ET_PLANS.md) (Q1-Q2, Q5)

### Trigonometry

#### TrigCircle

- **Status:** new. **Used by** 8 exercises (2ème Sc. 3, 3ème Sc. exp. 5).
- **Purpose:** The trigonometric circle: place an angle measure and its principal measure (Chasles, 29pi/3 -> -pi/3), read cos / sin / tan, solve cos u = c and cos u >= c on arcs, map u = ax + b back to x on an interval, polar coordinates.
- **Student action:** drag the point or step whole turns, tap the solution points, shade the arc of an inequality, keep the solutions that fall in a given interval
- **Engine:** new trig helpers (geometry2d.ts or trig.ts): exact values at multiples of pi/12 (pi/8 with nested surds), reduction to the principal measure, solution sets of cos / sin / tan equations and inequalities mod 2 pi intersected with an interval, the substitution u = ax + b
- **Props (sketch):** mode: measure | equation | inequality | polar | associated, func: cos | sin | tan, c, interval, substitution {a, b}, radius, points
- **To add for 2ème Sc.:** 3se uses the full circle with principal measures and oriented angles; 2eme needs range: half ([0, pi], no oriented angles), the degree-radian conversion and arc length, cot, and the complementary mirror
- **2ème Sc.:** [T1-CH09 Ex1](2sc/T1_CH09_ROTATIONS.md) (Q1); [T2-CH05 Ex1](2sc/T2_CH05_TRIGONOMETRIE.md) (Q1, Q2, Q3, Q4); [T2-CH05 Ex2](2sc/T2_CH05_TRIGONOMETRIE.md) (Q5)
- **3ème Sc. exp.:** [T1-CH08 Ex1](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (A Q1, A Q3, A Q4); [T1-CH08 Ex2](3se/T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) (Q3); [T2-CH02 Ex1](3se/T2_CH02_ANGLES_ORIENTES.md) (Q1); [T2-CH03 Ex1](3se/T2_CH03_TRIGONOMETRIE.md) (Q1, Q3, Q4); [T2-CH03 Ex2](3se/T2_CH03_TRIGONOMETRIE.md) (Q1-Q2, Q3, Q5)

#### RightTriangleTrig

- **Status:** new. **Used by** 4 exercises (1ère 4).
- **Purpose:** A right triangle with a chosen acute angle: name the opposite and adjacent sides and the hypotenuse, read cos, sin, tan as ratios that stay the same when the triangle is scaled, get an angle from a ratio (calculator, 0.01 deg), swap sin and cos of complementary angles, use the foot H of the altitude (AB x AC = AH x BC, AH^2 = HB x HC, AB^2 = BH x BC), construct an angle from its tangent, and lean the ladder against the wall.
- **Student action:** tap the sides for the chosen angle, drag the size or the angle, type a ratio or an angle, tap every angle with a given ratio, slide the ladder's foot and read alpha against the safe band
- **Engine:** new src/engine/trig.ts (or in geometry2d.ts): exact ratios as fractions or p + q sqrt c, the 30 / 45 / 60 deg table, inverse cos / sin / tan in degrees rounded as a calculator does (labelled approximate), complementary-angle relations, metric relations of the altitude checked exactly, the angles of a figure that have a given ratio
- **Props (sketch):** vertices {right, focus}, lengths (given ones), angleDeg, altitude {foot}, mode: ratios | scale | inverse | complement | altitude | construct | ladder, slider {kind: size | angle | foot, min, max, step}, band {min, max}, ask {kind: tap_side | tap_angle | ratio | angle}
- **1ère:** [CH03 Ex1](1s/CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) (Q1a-b, Q2a-b, Q3a-c, Q4, Q5a-c); [CH03 Ex2](1s/CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) (A Q1-Q2, A Q3-Q4, B Q5a-d); [CH05 Ex2](1s/CH05_SOMME_VECTEURS_COLINEAIRES.md) (Q2a-c, Q3a-d); [CH07 Ex2](1s/CH07_QUART_DE_TOUR.md) (Q4a-c)

### Space geometry

#### SolidViewer

- **Status:** new. **Used by** 14 exercises (1ère 2, 2ème Sc. 6, 3ème Sc. exp. 6).
- **Purpose:** One 3-D viewer for solids (cube, tetrahedron, pyramid) or free points in a frame: points, segments, vectors, planes drawn as their section of the solid, parametric lines, normal vectors and orthogonal projections, with a slider for a parameter (t, alpha, m).
- **Student action:** turn the view by stepped drag (preset views), tap a point / edge / face, move the parameter, toggle a plane; answer 'in the plane? parallel? perpendicular?' by taps
- **Engine:** new src/engine/space.ts: exact rational coordinates, 3x3 determinant, coplanarity, plane equations, line-plane and plane-plane intersections, section polygon of a convex solid by a plane, orthogonal projection, dot product, normal-vector check, distances (surds), volumes
- **Props (sketch):** solid: cube | tetrahedron | pyramid | custom {vertices, faces}, frame, points [{id, at | construct | param}], segments, vectors, planes [{through}], lines [{point, dir}], params, views (preset), ask
- **To add for 2ème Sc.:** 3se is coordinate-based (frames, normals, parametric lines); 2eme adds the synthetic mode (coordinates hidden), relation asks, the auxiliary-plane highlight, a section parallel to a face driven by a slider, equidistant-point highlighting (plan mediateur, axis of a circle) and an unfolded flat view of a face handed to GeometryCanvas
- **To add for 1ère:** beyond the 3se spec and the 2eme extension (synthetic mode without coordinates, a section parallel to a face driven by a slider, an unfolded face): round solids (cone of revolution, sphere / ball, cylinder) and the pave droit with its dimensions, a plane containing an edge or parallel to an edge through two points, the section in true shape beside the 3-D view, the volumes of the two pieces with the reduction ratios k, k^2, k^3 (small pyramid 1/8, cone filled to half height 1/8), and the cone's development as a sector of angle 360 R / l
- **1ère:** [CH08 Ex1](1s/CH08_SECTIONS_PLANES.md) (Q1a-b, Q2a-b, Q3a-b, Q4a-b, Q5a-d); [CH08 Ex2](1s/CH08_SECTIONS_PLANES.md) (Q1a-c, Q2a-b, Q3a-c, Q4a-b)
- **2ème Sc.:** [T2-CH07 Ex1](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q1, Q2-Q3, Q4, Q5); [T2-CH07 Ex2](2sc/T2_CH07_DROITES_PLANS_ESPACE.md) (Q1, Q2, Q3-Q4, Q5); [T2-CH08 Ex1](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q1-Q2, Q3, Q4); [T2-CH08 Ex2](2sc/T2_CH08_PARALLELISME_ESPACE.md) (Q1, Q2-Q3, Q4); [T2-CH09 Ex1](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2, Q3, Q4, Q5); [T2-CH09 Ex2](2sc/T2_CH09_ORTHOGONALITE_ESPACE.md) (Q1-Q2, Q3-Q4, Q5)
- **3ème Sc. exp.:** [T2-CH05 Ex1](3se/T2_CH05_VECTEURS_ESPACE.md) (Q1, Q3, Q4); [T2-CH05 Ex2](3se/T2_CH05_VECTEURS_ESPACE.md) (A Q1-Q3, B Q4-Q6); [T2-CH06 Ex1](3se/T2_CH06_PRODUIT_SCALAIRE_ESPACE.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH06 Ex2](3se/T2_CH06_PRODUIT_SCALAIRE_ESPACE.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH07 Ex1](3se/T2_CH07_DROITES_ET_PLANS.md) (Q1-Q2, Q3-Q4, Q5); [T2-CH07 Ex2](3se/T2_CH07_DROITES_ET_PLANS.md) (Q1-Q2, Q3, Q4-Q5)

### Complex numbers

#### ComplexPlane

- **Status:** new. **Used by** 2 exercises (3ème Sc. exp. 2).
- **Purpose:** Complex numbers as points and vectors: algebraic and trigonometric forms, conjugate, modulus, argument; a product multiplies moduli and adds arguments; multiplying by i is a quarter turn.
- **Student action:** place points by affix, tap the readouts, apply an operation (x i, x a, conjugate, power) and see the image
- **Engine:** src/engine/complex.ts (stub today): exact a + bi over rationals and sqrt 3-type surds, modulus, argument as a rational multiple of pi when exact, products, quotients, powers, affixes of vectors and midpoints
- **Props (sketch):** points [{id, z}], vectors, unitCircle, grid, operation {kind: mul | conj | power, by}, readouts
- **3ème Sc. exp.:** [T2-CH04 Ex1](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q1-Q2, Q3, Q4); [T2-CH04 Ex2](3se/T2_CH04_NOMBRES_COMPLEXES.md) (Q1-Q3)

### Counting & probability

#### ChoiceProduct

- **Status:** extend. **Used by** 5 exercises (1ère 1, 2ème Sc. 2, 3ème Sc. exp. 2).
- **Purpose:** Multiplication principle board: one slot per stage of a choice, the options left at each stage, and the product (bureau 10 x 9 x 8, votes 3^10, photo 10!, block of girls 5 x 6! x 4!).
- **Student action:** pick one option per stage, watch the options shrink or repeat, confirm the product
- **Engine:** combinatorics.ts (exists) for products, A(n, p), n!, n^p; coincidence guard
- **Props (sketch):** stages [{title, size, labels}] (2-10), withoutRepetition, sameOptions, block, mode: and | or
- **To add for 3ème Sc. exp.:** today exactly 2 stages of 1-3 options; extend to 2-10 stages with sizes up to 10 drawn as a count plus a few chips, a 'without repetition' flag (arrangements, permutations), a 'same options' flag (p-uplets), a block stage for 'cote a cote', and a compact slot strip
- **To add for 2ème Sc.:** 3se extends to 2-10 stages, without repetition and a block stage; 2eme adds the tree view (first branches expanded, the rest collapsed as 'x 4'), stage constraints and a chosen stage order, and a leaf value used to filter leaves
- **To add for 1ère:** nothing beyond the 2eme extension (tree view, leaf value): 1ere draws the arbre de choix of the exponents of 2 and 3 (3 x 3 = 9 leaves) with the leaf value 2^a x 3^b; today's code has only the 2-stage grid
- **1ère:** [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (A Q3a-b)
- **2ème Sc.:** [T1-CH04 Ex1](2sc/T1_CH04_ARITHMETIQUE.md) (Q4); [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q1, Q2, Q4)
- **3ème Sc. exp.:** [T2-CH08 Ex1](3se/T2_CH08_DENOMBREMENT.md) (Q2); [T2-CH08 Ex2](3se/T2_CH08_DENOMBREMENT.md) (Q1, Q3, Q4)

#### EventAreaModel

- **Status:** existing. **Used by** 5 exercises (1ère 1, 2ème Sc. 1, 3ème Sc. exp. 3).
- **Purpose:** A whole as one bar whose slices follow their counts; pick events and see complement, intersection and union (multiples of 4 and 6, loaded die, football and swimming).
- **Student action:** pick one or two events, then a view, read the engine lines
- **Engine:** grouping.ts slice counts (exists); authored slices (<= 8)
- **Props (sketch):** source: authored {slices [{id, label, count}]}, events (1-4), overlays: complement | intersection | union, labels: counts | probabilities
- **1ère:** [CH09 Ex2](1s/CH09_ACTIVITES_NUMERIQUES_I.md) (B Q2c-Q3)
- **2ème Sc.:** [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q1, Q2, Q5)
- **3ème Sc. exp.:** [T2-CH08 Ex1](3se/T2_CH08_DENOMBREMENT.md) (Q1); [T2-CH08 Ex2](3se/T2_CH08_DENOMBREMENT.md) (Q1, Q2); [T2-CH10 Ex1](3se/T2_CH10_PROBABILITES.md) (A Q1-Q4, B Q1-Q3, B Q4)

#### GroupBoxes

- **Status:** existing. **Used by** 4 exercises (2ème Sc. 1, 3ème Sc. exp. 3).
- **Purpose:** Ordered draws grouped in boxes, one per set, each holding its k! orders: A(n, k) = k! C(n, k), bureau vs comite, simultaneous vs successive.
- **Student action:** open a box, read how many orders it holds
- **Engine:** grouping.ts, coincidence.ts (exist)
- **Props (sketch):** balls (3-12), k (2-4), groupBy: ball_set, meantToDistinguish
- **2ème Sc.:** [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q3)
- **3ème Sc. exp.:** [T2-CH08 Ex1](3se/T2_CH08_DENOMBREMENT.md) (Q2); [T2-CH08 Ex2](3se/T2_CH08_DENOMBREMENT.md) (Q2); [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q3-Q4)

#### SlotsPattern

- **Status:** existing. **Used by** 3 exercises (2ème Sc. 1, 3ème Sc. exp. 2).
- **Purpose:** Mark k of n slots and list the patterns (C(n, k)), build a Pascal row, see C(n, k) = C(n, n - k).
- **Student action:** toggle slots, add patterns, 'that is all'; build a Pascal row
- **Engine:** combinatorics.ts (exists)
- **Props (sketch):** n (2-7), k, mode: free | guided | build_pascal | bridge
- **2ème Sc.:** [T1-CH04 Ex2](2sc/T1_CH04_ARITHMETIQUE.md) (Q3)
- **3ème Sc. exp.:** [T2-CH08 Ex1](3se/T2_CH08_DENOMBREMENT.md) (Q3-Q4, Q5); [T2-CH08 Ex2](3se/T2_CH08_DENOMBREMENT.md) (Q3)

#### ComplementView

- **Status:** existing. **Used by** 1 exercises (3ème Sc. exp. 1).
- **Purpose:** One bar split into P(E) and P(not E) to see 'au moins une' through its complement.
- **Student action:** toggle event / complement
- **Engine:** probability.ts (exists)
- **Props (sketch):** event, direction: from_complement, labels
- **3ème Sc. exp.:** [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2)

#### EventPicker

- **Status:** existing. **Used by** 1 exercises (3ème Sc. exp. 1).
- **Purpose:** Task: tap every favourable outcome of an event (same colour, at least one white) and get the fraction graded by the engine.
- **Student action:** tap outcomes, submit
- **Engine:** probability.ts events (all_equal, any_value, not) and logic.ts grading (exist)
- **Props (sketch):** event, reveal: on_submit, showFraction, maxAttempts
- **3ème Sc. exp.:** [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2)

#### OutcomeSpace

- **Status:** existing. **Used by** 1 exercises (3ème Sc. exp. 1).
- **Purpose:** See every outcome of a draw as chips, coloured by an event, with the count (25 ordered with replacement, 20 without, 10 simultaneous).
- **Student action:** tap outcomes, read the count
- **Engine:** probability.ts enumerateOutcomes (exists)
- **Props (sketch):** draw, k, colorBy: event, event, layout, showCount
- **3ème Sc. exp.:** [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2, Q3-Q4)

#### ProbabilityTree

- **Status:** extend. **Used by** 1 exercises (3ème Sc. exp. 1).
- **Purpose:** Probability tree drawn as the exam prints it; a tap on a path end writes its product (with and without replacement; three games in a row).
- **Student action:** tap path ends, read the product
- **Engine:** tree.ts checkTree (exists) extended to 3 levels
- **Props (sketch):** branches [{id, latex, p, show, children}] (2-4 per node), mark, compact
- **To add for 3ème Sc. exp.:** today 1-2 levels; add a third level for 2-branch trees (8 leaves: GGG ... PPP) with path marking across 3 levels; check the layout on a phone
- **3ème Sc. exp.:** [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2, Q5)

#### Urn

- **Status:** extend. **Used by** 1 exercises (3ème Sc. exp. 1).
- **Purpose:** Show the urn's balls (and in select mode draw k of them) so the experiment is concrete.
- **Student action:** look; in select mode tap k balls
- **Engine:** probability.ts (exists); a third ball colour
- **Props (sketch):** balls [{id, value, color: red | black | white}], draw, k, mode: display | select
- **To add for 3ème Sc. exp.:** ball colour 'white' (letter B) next to red / black: the 3se urn is 3 rouges, 2 blanches; BallColorSchema is shared by OutcomeSpace, EventPicker, ComplementView and GroupBoxes
- **3ème Sc. exp.:** [T2-CH10 Ex2](3se/T2_CH10_PROBABILITES.md) (Q1-Q2)

### Statistics

#### StatsDistribution

- **Status:** new. **Used by** 6 exercises (1ère 2, 2ème Sc. 2, 3ème Sc. exp. 2).
- **Purpose:** A one-variable series as bars and as sorted dots: mean, sigma-bands with the share of values inside, median and quartiles found by rank, box plot, and an affine change y = ax + b.
- **Student action:** tap the value of rank r in the sorted dots, drag the box-plot handles, drag the sigma-band multiplier, move a and b of the affine change
- **Engine:** new src/engine/statistics.ts: mean, variance V = sum(n x^2)/N - mean^2 exact, sigma, cumulative counts, ranks E(N/4) + 1, E(N/2) + 1, E(3N/4) + 1 (the manual's rule), counts in [mean - k sigma, mean + k sigma], effect of y = ax + b, marginal distributions
- **Props (sketch):** values, counts, view: bars | dots | box | bands, ask: rank | box | band, transform {a, b}, roundTo
- **To add for 2ème Sc.:** 3se: bars, sorted dots, sigma bands, ranks E(N/4) + 1, box plot, affine change; 2eme adds grouped classes and the histogram, the cumulative polygon with interpolation, the manual's 'at least 25 %' quartile rule, adding values, and the timeline view with index base 100
- **To add for 1ère:** beyond the 3se spec and the 2eme extension (grouped classes, histogram, cumulative polygon with interpolation, adding values, timeline with index base 100): a frequency table the student fills (frequency, %, cumulative rows), a pie chart with angles 360 n / N, rectangle heights for unequal class widths (the [40 ; 60[ class gets 1.5 cm, not 3 cm), and the 1ere median rule (the mean of the two middle values when N is even), which differs from the 3se rank rule
- **1ère:** [CH16 Ex1](1s/CH16_EXPLOITATION_INFORMATION.md) (Q1-Q2, Q3, Q4-Q5, Q6a-b); [CH16 Ex2](1s/CH16_EXPLOITATION_INFORMATION.md) (A Q1-Q3, A Q4-Q5, B Q1-Q4)
- **2ème Sc.:** [T2-CH10 Ex1](2sc/T2_CH10_STATISTIQUES.md) (Q1, Q2, Q3, Q4); [T2-CH10 Ex2](2sc/T2_CH10_STATISTIQUES.md) (A Q1-Q2, A Q3-Q4, B Q5-Q6)
- **3ème Sc. exp.:** [T2-CH09 Ex1](3se/T2_CH09_STATISTIQUES.md) (Q1, Q2, Q3, Q4); [T2-CH09 Ex2](3se/T2_CH09_STATISTIQUES.md) (A Q2)

#### TwoWayTable

- **Status:** new. **Used by** 2 exercises (3ème Sc. exp. 2).
- **Purpose:** A two-way table (statistics or probability): tap rows and columns for marginal totals and frequencies, select the cells of a combined condition ('au moins 4 h et au moins le palier 7').
- **Student action:** tap row / column totals, select cells, read the count and percentage
- **Engine:** statistics.ts: marginals, cell sums, exact percentages; counts -> probabilities for probability tables
- **Props (sketch):** rows, cols, counts, ask: marginal | select {condition}, showPercent
- **3ème Sc. exp.:** [T2-CH09 Ex2](3se/T2_CH09_STATISTIQUES.md) (A Q1, A Q3); [T2-CH10 Ex1](3se/T2_CH10_PROBABILITES.md) (B Q1-Q3)

#### ScatterPlot

- **Status:** new. **Used by** 1 exercises (3ème Sc. exp. 1).
- **Purpose:** A cloud of points (weighted or not) with the mean point G and the Mayer fit: split the cloud in two halves, place G1 and G2, draw (G1G2) and use it to estimate.
- **Student action:** tap points to split the cloud, place G, G1, G2, drag an x-value to read the estimate
- **Engine:** statistics.ts: mean point, partial mean points, line through G1 G2 exact, G on the line, estimates; weights from a two-way table
- **Props (sketch):** points [{x, y, w}], axes, ask: mean_point | split | fit | estimate
- **3ème Sc. exp.:** [T2-CH09 Ex2](3se/T2_CH09_STATISTIQUES.md) (A Q3, B Q1-Q3)

