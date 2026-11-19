# 2ème Sciences: components the 38 exercises need

Source: the 19 chapter files in `docs/exercises/2sc/` (2 exercises each), read in full. Data: `map_2sc.json` (33 components, 157 use rows, one or more rows per exercise by question group). Names reuse the 3se vocabulary (`map_3se.json`) and, where 3se had nothing, the names agreed for 1ère (FactorTree, DivisibilityChecker, BarycentreBalance).

**Components by status:** 8 existing, 15 extend, 2 reserved, 8 new (33 in total).

How to read the status: **extend** means "extends the 3se definition with a prop 2ème needs". That component may itself not exist in the repo yet, so each row also says where the repo is today (`repo_status` in the JSON). Of the 8 **new**: IntervalBuilder, SignTableBuilder and HorizontalLineSweep are 3se names used unchanged; FactorTree, DivisibilityChecker and BarycentreBalance are names from the 1ère list; **BoundsRuler and ProductGrid are the only names invented here**. "Exercises" counts the exercises (of 38) that use the component in at least one question.

## Components by domain

### Numbers and algebra
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| ProductGrid | new | new | new in 2sc | 9 | expands in a grid, identifies m, n, p by degree, completes the square |
| IntervalBuilder | new | new | 3se | 8 | builds domains and solution sets on a number line |
| BoundsRuler | new | new | new in 2sc | 5 | pushes an encadrement through operations; decides a rounding or 'cannot conclude' |
| DivisibilityChecker | new | new | 1ere list | 3 | lights a divisibility criterion, gives the remainder, tries unknown digits |
| PartWholeBar | extend | extend | repo, not in 3se | 3 | percent changes, each measured on its own whole; index points vs percentages |
| FactorTree | new | new | 1ere list | 2 | factorises to pull squares out of radicals (sqrt2400 = 20 sqrt6), 19683 = 3^9 |

### Functions and analysis
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| HorizontalLineSweep | new | new | 3se | 6 | drags y = m, counts crossings, shades f(x) <= k |
| ParameterPlayground | extend | reserved | 3se | 6 | slides t, u, a <= b, k or a payment until a property holds or never does |
| FunctionPlot | extend | extend | 3se | 5 | reads curves; fills a table of values; places vertex and intercepts |
| SituationToGraph | extend | new | 3se | 5 | one slider moves the figure (enclosure, box, square in square, lens) and its graph point |
| CurveCompare | reserved | reserved | reserved, defined here | 4 | two curves and their live difference: where is one above the other |
| VariationTableBuilder | extend | extend | 3se | 4 | builds the arrows table without a derivative row |
| SignTableBuilder | new | new | 3se | 3 | places roots, sets factor signs, deduces the product / quotient row |
| PointOnCurve | extend | extend | 3se | 2 | drags M and sees its image by a symmetry, translation or homothety land on a curve |

### Sequences
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| SequenceExplorer | extend | reserved | 3se | 4 | points and table (differences, ratios), term query, threshold, sum view with pairing |

### Plane geometry, transformations, vectors and analytic geometry
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| GeometryCanvas | extend | new | 3se | 16 | figures, vectors, oblique grid, translations / homotheties / rotations, line and circle equations |
| BarycentreBalance | new | new | 1ere list | 4 | moves weights, places and regroups barycentres |
| LocusTracer | extend | new | 3se | 3 | drags M or lets M run on a curve; names the traced set and its missing points |

### Trigonometry
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| TrigCircle | extend | new | 3se | 3 | half circle on [0, pi]: radians, mirrors pi - x and pi/2 - x, solutions of cos / sin / tan = c |

### Space geometry
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| SolidViewer | extend | new | 3se | 6 | turns a cube / tetrahedron / pyramid, answers relative-position taps, moves a section, unfolds a face |

### Counting
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| ChoiceProduct | extend | extend | 3se | 2 | arbre de choix with constraints and leaf values; the product 5 x 4 x 3 |
| EventAreaModel | existing | existing | 3se | 1 | disjoint parts of the 60 codes: principe additif and complement |
| GroupBoxes | existing | existing | 3se | 1 | opens the box of a digit set: 3! = 6 codes |
| SlotsPattern | existing | existing | 3se | 1 | lists the 10 subsets of 3 digits |

### Statistics
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| StatsDistribution | extend | new | 3se | 2 | bars / histogram, cumulative polygon and interpolation, box plot, timeline with index |

### Generic
| Component | Status | Repo today | Name from | Exercises | What the student does |
|---|---|---|---|---|---|
| Worksheet | extend | extend | 3se | 38 | writes engine-checked calculation lines |
| CardsPick | existing | existing | 3se | 34 | picks the reason / property card |
| PlanCards | existing | existing | 3se | 10 | orders the steps of a proof (contradiction, line perpendicular to a plane, both directions) |
| NumericTwin | extend | extend | 3se | 6 | checks an identity at chosen values; watches PGCD(n + 3, 2n + 1) |
| PredictReveal | existing | existing | 3se | 5 | predicts before the visual (+20 % then -20 %, totals crossing, mean or median) |
| StatementTap | existing | existing | 3se | 4 | taps the decisive words (deux a deux distincts, capital de depart, indirecte, au moins) |
| CounterexampleHunt | reserved | reserved | 3se | 3 | tries to beat S(x) >= 48, d(x) >= 40, 'f has a maximum' |
| CompareTwo | existing | existing | 3se | 1 | two visuals stacked (series before / after adding 5 zeros) |

## Most used

All exercises: Worksheet 38, CardsPick 34, GeometryCanvas 16, PlanCards 10, ProductGrid 9, IntervalBuilder 8, then four at 6 (HorizontalLineSweep, NumericTwin, ParameterPlayground, SolidViewer).

Lesson components, without the four method frames: GeometryCanvas 16, ProductGrid 9, IntervalBuilder 8, HorizontalLineSweep 6, NumericTwin 6, ParameterPlayground 6, SolidViewer 6, then four at 5 (BoundsRuler, FunctionPlot, PredictReveal, SituationToGraph).

GeometryCanvas carries the whole of Tome 1 geometry (vectors, barycentre, translations, homothéties, rotations) and analytic geometry: it is 2ème's biggest single build.

## Engine work behind them (rule 1: values come from the engine)

| Engine piece | Today | Needed by |
|---|---|---|
| `geometry2d.ts`: exact coordinates (rationals, a + b√3, a + b√7), the four transformations and their chains, rotation sense without oriented angles, oblique frames, det, line and circle equations, distance point–line, line–circle and circle–circle intersections, barycentres, loci | none (3se needs it too) | GeometryCanvas, LocusTracer, BarycentreBalance, SituationToGraph, ParameterPlayground |
| `space.ts`: the solid in a hidden exact frame, relative positions of two lines, intersections, sections by a plane parallel to a face, orthogonality, plan médiateur, areas, volumes | none (3se needs it too) | SolidViewer |
| `polynomial.ts`: expand, collect by degree, identify coefficients, canonical form | none | ProductGrid, Worksheet |
| `bounds.ts`: exact interval arithmetic for monotone operations, rounding decisions | none | BoundsRuler, Worksheet |
| `arithmetic.ts`: remainders by criterion and by division, digit slots, factorisation, largest square factor, gcd | none | DivisibilityChecker, FactorTree, NumericTwin |
| `intervals.ts` | none (3se) | IntervalBuilder, HorizontalLineSweep, CurveCompare |
| `analysis.ts`: content-defined functions, monotony checked without f′, roots and signs of factors, crossings with y = m, differences of two curves | exists for a fixed function list | FunctionPlot, PointOnCurve, HorizontalLineSweep, VariationTableBuilder, SignTableBuilder, CurveCompare, CounterexampleHunt |
| `sequences.ts`: exact terms, sums, partial sums, thresholds, term membership | stub | SequenceExplorer |
| trig helpers on [0, π]: exact values, associated angles, one ratio → the others | none | TrigCircle, Worksheet |
| `statistics.ts`: grouped data, cumulative polygon, interpolation, manual quartile rule, index base 100 | none | StatsDistribution |
| `partWhole.ts` chains, `combinatorics.ts` constrained trees | exist (single ratio, products) | PartWholeBar, ChoiceProduct |
| line engine and templates: radicals, absolute values, encadrements, percentages, digit letters, plane vectors, line / circle equations, sums, trig values | 19 templates today | Worksheet in every exercise |

## Exercises that need nothing beyond Worksheet / LineInput

None at the exercise level: every exercise has at least one question that needs a visual or a manipulation. Five question groups are lines (plus a reason card) only: T1_CH01 Ex1 Q3 (absolute values by sign), T1_CH01 Ex2 Q6 (scientific notation), T2_CH01 Ex1 Q2 (three consecutive terms), T2_CH03 Ex2 Q3 and Q6 (canonical form checks, perimeter √S).

The space chapters (T2_CH07–09) and the Tome 1 geometry proofs lean mostly on CardsPick and PlanCards with authored property cards; SolidViewer and GeometryCanvas are there so the student sees and moves the figure he reasons about.

## Existing or reserved components 2sc does not use

Probability (2ème has none): Urn, OutcomeSpace, EventPicker, ComplementView, LawBuilder, LawChart, SpreadSlider, RepeatedRuns, VariableTable, BinomialExplorer, UrnTemplate, ProbabilityTree. No limits or derivatives in 2ème: LimitExplorer, SecantToTangent, TangentSlope, FoldSymmetry (PointOnCurve covers parity). Also ExampleGenerator, StepThrough, and the reserved AreaUnderCurve, InverseMirror, WorkedExample. From the 3se list: PiecewiseJoin, BisectionStepper, CobwebDiagram, InductionStepper, DeterminantExpander (the 3×3 system of T2_CH06 is solved by elimination lines), ComplexPlane, TwoWayTable, ScatterPlot.

## Open questions for the owner (each with a default)

1. **Choice trees: ChoiceProduct or ProbabilityTree?** T1_CH04 asks for an "arbre de choix" (60 codes, remainders of squares). Default: a tree view in ChoiceProduct (no probabilities, branches collapsed "× 4"), not ProbabilityTree, which stays for probability.
2. **Percentages in PartWholeBar?** It is a probability2 component today. Default: yes, add a percent-change mode (the idea is the same: a part only makes sense against its whole); the alternative is a separate PercentChain.
3. **GeometryCanvas is very large.** Default: one name, built in layers: figure and readouts first (T1_CH05, T2_CH06), then transformations (T1_CH07–09), then the oblique grid and loci. Mockup first.
4. **2ème has no oriented angles.** Rotations are "directe / indirecte" with an angle in [0, π], and the trig circle is a half circle. Default: GeometryCanvas and TrigCircle get a 2ème mode that never shows an oriented measure.
5. **Space without coordinates.** Default: SolidViewer places the solid in a hidden exact frame (as the check scripts do), shows no coordinates, turns between preset views.
6. **Geometry proofs and rule 1.** Property cards are judged by id; the geometric facts behind them (parallel, aligned, midpoint) are recomputed by `geometry2d.ts` / `space.ts` when the exercise loads, as the Python check scripts do now. Default: port those checks to content-load checks.
7. **Calculator values** (angles in T2_CH05 Ex2 by arccos, 1.05ⁿ, √Δ ≈ 676.47). Default: the engine computes the approximations; the Worksheet accepts the rounding the statement asks for.
8. **BoundsRuler and ProductGrid are new names.** 1ère may need the same tools (approximations, identités remarquables) under other names. Default: keep these two names and rename on 1ère's side at the merge if they overlap.
9. **Quartiles.** The 2ème manual's rule ("smallest value with at least 25 % at or below it") differs in wording from the 3se rank rule; the 2sc data make all rules agree. Default: implement the manual's rule for 2ème, `reviewed: false` until a teacher confirms.
