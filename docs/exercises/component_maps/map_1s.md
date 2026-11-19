# 1ère année (tronc commun): components the 32 exercises need

Source: the 16 chapter files `docs/exercises/1s/CH*.md` (2 exercises each), all read in full. Data: `map_1s.json` (28 components, 142 use rows, one or more rows per exercise by question group). Checked with `scripts/check_map_1s.py` (a copy of `check_map.py` for `CH*.md`): no errors, 32 of 32 exercises mapped.

**Vocabulary.** I reused the 3se names exactly. The 2ème map was written at the same time and appeared before I finished, so where it had already named something 1ère needs, I took its name instead of inventing one: BoundsRuler, ProductGrid, CurveCompare, the `percent_change` mode of PartWholeBar, the number-line render of ParameterPlayground, and the tree view of ChoiceProduct. I had planned a separate PercentChange component; it is dropped, because PartWholeBar's percent_change mode covers it. FactorTree and DivisibilityChecker were first specified by 2ème; my extend notes list the extra modes 1ère adds (PGCD/PPCM table, divisor grid, Euclid chain, long division), so the merge does not lose them. Only two names here are new to both earlier maps: **LinearSystemBoard** (1ère only) and **RightTriangleTrig** (on the shared name list; 2ème does not use it).

**Status convention** (same as the 2ème map): status is measured against today's code.
- **existing**: registered and usable as is.
- **extend**: either registered and needing new props, or planned by the 3se or 2ème map and needing more for 1ère. The `extends_note` says only what 1ère adds. Four of the 16 extend notes say "nothing beyond 2ème": ChoiceProduct, PartWholeBar, ParameterPlayground, SituationToGraph.
- **reserved**: a name only, with no code; the 3se spec is enough.
- **new**: not built, and the earlier spec is enough (or there is no earlier spec).

**Components by status:** 7 existing, 16 extend, 1 reserved, 4 new (28 in total).

"Exercises" below = how many of the 32 exercises use the component in at least one question.

## Components by domain

### Numbers and algebra
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| IntervalBuilder | extend (3se/2ème new) | 7 | builds solution sets on the line; **adds**: whole numbers only ({0..19}, n ≤ 4.6 → 0..4), the two points of \|x + 2\| = 3 |
| PartWholeBar | extend (2ème) | 4 | 2/5 of 500 then 3/4 of the rest; ×1.08 then ×0.75 = ×0.81 (−19 %, not −17 %); area ×2.56; indices base 100 |
| ProductGrid | new (2ème) | 4 | develops (2x − 3)², (x + 1)³, x(20 − 2x)², (√3 − 1)², 1002² in the generic rectangle |
| BoundsRuler | extend (2ème new) | 3 | pushes 1.732 < √3 < 1.733 through −1, ×(−2), +4; **adds**: the 1ère "valeur approchée à 10ᵖ près" (0.64 and 0.65 both work), "the bracket cannot decide" (15√2 vs 21.22) |
| FactorTree | extend (2ème new) | 3 | division ladder; **adds**: exponent table for PGCD/PPCM, divisor grid 2ᵃ×3ᵇ, smallest k for a square/cube, reduce a fraction, power rules |
| DivisibilityChecker | extend (2ème new) | 2 | **adds**: a = bq + r (multiples of 12 up to 500), remainder row 18k mod 12, Euclid chain, long division of 9 by 14 with the repeating remainder |
| LinearSystemBoard | new (1ère) | 2 | substitution, elimination with multipliers he chooses (each combination is another line through the same point), the three cases (0 = 7, 0 = 0) |

### Functions and analysis
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| FunctionPlot | extend | 6 | draws a line from two placed points, reads an intersection, slope step-triangle, lines ax + by = c, segments on [0, 1000], unequal axis units |
| HorizontalLineSweep | extend (3se new) | 4 | y = 648 meets h at 800; budget line y = 100 across three tariffs (whole x); V(x) = 500 yes, 600 never; gap ≤ 30 km |
| ParameterPlayground | extend (2ème) | 4 | slides a in y = ax, b with a = 2.5 fixed, the mix x in [0, 9], a in ]0, 1[ on a number line |
| SituationToGraph | extend (2ème) | 3 | the box cut from a 20 cm sheet, the truck and the car on the road, the bridge sliding along the river |
| CurveCompare | extend (2ème reserved) | 2 | f(x) ≤ g(x) read on the plot; **adds**: three tariff lines with "which is lowest" bands |
| SignTableBuilder | new (3se) | 2 | sign of (2x + 3)(x + 2); sign of 4(3x − 10)²(40 − 3x) on ]0, 10[ |

### Plane geometry and transformations
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| GeometryCanvas | extend (3se new) | 13 | angle pairs in degrees (alternes-internes, correspondants, inscrit/au centre), gliders, construction steps, Thalès ratios in three positions, quarter turn by grid steps, vectors (parallelogram rule, centre of gravity), sectors, clock and river presets |
| LocusTracer | extend (3se new) | 1 | drag P keeping angle H₁₂PH₆ = 90°: the circle minus two points (**adds** a geometric-angle condition) |

### Trigonometry
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| RightTriangleTrig | new (shared name) | 4 | taps opposite/adjacent/hypotenuse, ratios that survive scaling, angle from a ratio (0.01°), complementary swap, altitude foot H and the metric relations, tan = 0.75 by construction, the ladder against the wall |

### Space geometry
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| SolidViewer | extend (3se new) | 2 | pavé 12 × 9 × 8 cut parallel to a face, through an edge, parallel to an edge; pyramid at mid-height; cone filled to half height; ball on the cone; **adds** round solids, true-shape section, piece volumes with k, k², k³, cone development |

### Counting
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| ChoiceProduct | extend | 1 | arbre de choix of the exponents of 2 and 3 (3 × 3 = 9 divisors), via the 2ème tree view |
| EventAreaModel | existing | 1 | 500 tickets in slices 13 / 28 / 14 / 445: exactement un, au moins un, aucun |

### Statistics
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| StatsDistribution | extend (3se new) | 2 | **adds**: fills the frequency table, pie angles (9° per pupil), unequal-width histogram (the [40 ; 60[ rectangle is 1.5 cm, not 3), the 1ère median rule |

### Generic
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| Worksheet (and LineInput) | extend | 32 | writes engine-checked lines; **adds**: degrees, figure lengths/angles as named symbols, synthetic vector lines judged on random instances of the figure |
| CardsPick | existing | 30 | picks the reason (pair of angles, reciprocal, product-zero rule, order reversed by a negative, same coefficient → parallel) |
| PlanCards | existing | 9 | orders construction steps and proof chains (parallelogramme → losange, diagonales → carré) |
| PredictReveal | existing | 8 | predicts first: area ×k or ×k²? half full at half height? the angle at 4 h 20? −17 %? |
| StatementTap | existing | 5 | taps exactement / au moins / aucun, "sur les prix de janvier", "parallèle à la face", "entier naturel" |
| NumericTwin | existing | 3 | checks (x + 1)³ − (x − 1)³ = 6x² + 2, 16000 − 27V(x) = 4(3x − 10)²(40 − 3x), AE² + EF² = AF² for side a (one symbol is enough: today's code) |
| CounterexampleHunt | reserved | 2 | tries to beat V(x) ≤ 16000/27 and L ≥ 120 m |
| CompareTwo | existing | 1 | the boat's two crossings side by side |

## Most used

All components: Worksheet 32, CardsPick 30, GeometryCanvas 13, PlanCards 9, PredictReveal 8, IntervalBuilder 7, FunctionPlot 6, StatementTap 5, then five at 4 (HorizontalLineSweep, ParameterPlayground, PartWholeBar, ProductGrid, RightTriangleTrig).

Without the four method frames: GeometryCanvas 13, PredictReveal 8, IntervalBuilder 7, FunctionPlot 6, HorizontalLineSweep 4, ParameterPlayground 4, PartWholeBar 4, ProductGrid 4, RightTriangleTrig 4, then BoundsRuler, FactorTree, NumericTwin, SituationToGraph at 3.

GeometryCanvas carries the whole geometry half of the book except trigonometry and solids (ch. 1, 2, 4, 5, 6, 7, plus the photo enlargement in ch. 10).

## Engine work behind them (rule 1: values come from the engine)

| Engine piece | Today | Needed by |
|---|---|---|
| `geometry2d.ts`: degrees, angle-pair classification against a secant, gliders, constructions, ratio readouts, translation / quarter turn / half turn / scaling, vector sums and multiples, sector areas, random instances of a figure to judge a claim | none | GeometryCanvas, LocusTracer, SituationToGraph, Worksheet (figure symbols) |
| `trig.ts` (or in geometry2d): exact ratios (fractions, p + q√c), the 30/45/60 table, inverse cos/sin/tan in degrees rounded like a calculator, metric relations | none | RightTriangleTrig |
| `arithmetic.ts`: factorisation, PGCD/PPCM by exponents, divisors, perfect powers, a = bq + r, Euclid chain, long-division period and n-th digit | none | FactorTree, DivisibilityChecker, ChoiceProduct leaf value |
| `intervals.ts`, `bounds.ts`: sets with whole-number filter; bracket arithmetic, "valeur approchée à 10ᵖ près", undecidable comparisons | none | IntervalBuilder, BoundsRuler, CurveCompare, HorizontalLineSweep |
| `polynomial.ts`: expansion by degree with surds | none | ProductGrid |
| `systems.ts`: exact 2 × 2 solving, classification, combinations, system equivalence | none | LinearSystemBoard |
| `space.ts`: pavé, pyramid, cone, sphere; planes parallel to a face / the base / an edge; true-shape sections; volumes in π; cone development | none | SolidViewer |
| `statistics.ts`: frequencies, pie angles, the 1ère median, unequal-width histogram, cumulative polygon interpolation | none | StatsDistribution |
| `partWhole.ts` chains: product of coefficients, indices base 100 | exists (one ratio) | PartWholeBar |
| `analysis.ts` with content expressions: lines y = ax + b and ax + by = c, intersections, lowest of three lines, whole-number domains | exists (fixed function list) | FunctionPlot, CurveCompare, HorizontalLineSweep, ParameterPlayground, SituationToGraph, SignTableBuilder, CounterexampleHunt |
| method templates and line engine: one solution graph per 1ère question type; degrees and named figure quantities as symbols | 19 templates (probability, trees, ex4 analysis) | Worksheet in every exercise |

## Exercises that need nothing beyond Worksheet / LineInput

None at the exercise level: every exercise has at least one question with a visual or a manipulation. Eleven question groups are lines plus a reason card only: CH02 Ex1 Q1, CH04 Ex2 Q5, CH10 Ex1 Q4, CH10 Ex2 Q6 (lines only: pixels and scientific notation), CH11 Ex1 Q3, CH12 Ex2 Q4, CH13 Ex1 Q1 and Q2, CH13 Ex2 Q1 and Q5, CH16 Ex2 B Q5. CH11 Ex1 and CH13 Ex1 are mostly lines; their only visuals are ProductGrid, NumericTwin, SignTableBuilder and IntervalBuilder.

## Vocabulary components 1ère does not use

TrigCircle (no trigonometric circle in 1ère), PointOnCurve, LimitExplorer, SecantToTangent, TangentSlope, VariationTableBuilder, PiecewiseJoin, BisectionStepper, SequenceExplorer, CobwebDiagram, InductionStepper, DeterminantExpander, ComplexPlane, TwoWayTable, ScatterPlot, BarycentreBalance (as expected), and the probability components other than EventAreaModel and ChoiceProduct.

## Open questions for the owner (each with a default)

1. **GeometryCanvas carries 13 of 32 exercises.** Should it be one board or several components? Default: one board with tool packs (angles and constructions, Thalès, vectors, transformations), built in chapter order, with a mockup first (the 3se map already asks for one).
2. **"Décrire la construction"** (CH01 Q1, CH02 Q5): should the student build the figure with compass and protractor, or order the steps? Default: he orders the steps (PlanCards) and the canvas draws each step he places; real drawing tools later.
3. **Judging geometry lines without coordinates.** Lines such as "angle EDB = angle DBC" or "vec(GA) + vec(GB) + vec(GC) = 0" would be judged by the engine on several random instances of the figure, as the check scripts do; the reason comes from a CardsPick, not from the line. Default: yes.
4. **The median rule differs between years.** The 1ère manual takes the mean of the two middle values when N is even. The 3se map uses rank E(N/2) + 1. Default: a `medianRule` prop set per year, `reviewed: false` until a teacher confirms.
5. **Calculator values** (2ndF cos 0.6 → 53.13°). Default: the engine computes inverse trig in floating point, rounds to the precision the question asks, and labels it "≈ (calculatrice)"; this is still computed, not generated.
6. **LinearSystemBoard is a 1ère-only name.** The 2ème map writes its 3 × 3 systems in the Worksheet. Default: build it for 2 × 2 with the graph, and offer it to 2ème for elimination steps later.
7. **Euclid chain and long division live inside DivisibilityChecker** (2ème defined it for divisibility criteria). Default: keep them as modes there rather than adding an EuclidStepper.
8. **RightTriangleTrig or a GeometryCanvas preset?** Default: a separate component (one triangle, large tap targets on the sides, a ratio table), because it is the only trigonometry in 1ère and the shared name list already reserves it.
9. **Round solids on cheap phones** (cone, sphere). Default: as in 3se, SVG with preset views (ellipses for circles) and no free rotation.
