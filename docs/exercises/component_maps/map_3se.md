# 3ème Sc. exp.: components the 40 exercises need

Source: the 20 chapter files in `docs/exercises/3se/` (2 exercises each), read in full. Data: `map_3se.json` (42 components, 157 use rows, one or more rows per exercise by question group). This is the first year mapped, so these names are the shared vocabulary for 2ème and 1ère.

**Components by status:** 11 existing, 11 extend, 3 reserved, 17 new (42 in total).

"Exercises" below = how many of the 40 exercises use the component in at least one question.

## Components by domain

### Numbers and algebra
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| IntervalBuilder | new | 10 | builds a domain or solution set on a number line (open/closed ends, unions, isolated points); the written form builds itself |

### Functions and analysis
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| FunctionPlot | extend | 12 | reads curves, asymptotes, tangent and y = m lines; taps to answer |
| PointOnCurve | extend | 8 | drags x and sees M' (by an axis x = a, a centre (a, b) or a period) land on the curve or not |
| HorizontalLineSweep | new | 8 | drags y = m, taps crossings, fills the "m → number of solutions" rows; shades f(x) ≤ k |
| TangentSlope | extend | 7 | drags x, sees the slope sign; finds where the tangent is parallel to a given line |
| VariationTableBuilder | extend | 7 | builds the tableau de variation with ‖ columns, limits and values |
| SignTableBuilder | new | 7 | places roots, sets factor signs per interval, deduces the product/quotient row |
| LimitExplorer | extend | 6 | walks x to a (left/right) or to ±∞; 0/0 forms, oblique-asymptote gap, ε threshold |
| PiecewiseJoin | new | 6 | slides m / k until two pieces join (continuity) or join without a corner (derivability); fills a hole |
| SecantToTangent | extend | 5 | shrinks h: rate → f'(a), approximation affine and its error, one-sided rates, vertical half-tangents |
| SituationToGraph | new | 5 | one slider moves a figure (car and antenna, door under an arch, tangent to a circle, ferris wheel) and its point on the graph |
| ParameterPlayground | reserved | 3 | slides a, b until a property holds (limit exists, flat tangent at 2, sign of f(a) − f(b)) |
| BisectionStepper | new | 2 | keeps the half where the sign changes (dichotomie) or brackets roots on a grid |

### Sequences
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| SequenceExplorer | reserved | 4 | points (n, uₙ) and table (differences, ratios), threshold, ε-band, two or three sequences |
| CobwebDiagram | new | 3 | steps the staircase / spiral of uₙ₊₁ = f(uₙ) towards the fixed point |
| InductionStepper | new | 3 | base case on the engine table, heredity lines in the Worksheet, conclusion card |

### Plane geometry and transformations
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| GeometryCanvas | new | 7 | drags and taps points, segments, angles; constructed points; live lengths, dot products, oriented angles; 1-D axis mode |
| LocusTracer | new | 6 | drags M, sees where the condition holds (dot product, distances, oriented angle, \|z − a\|, arg z), names the set |

### Vectors and analytic geometry
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| DeterminantExpander | new | 3 | lights each minor of a 3×3 determinant and writes it |

### Trigonometry
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| TrigCircle | new | 5 | principal measures, cos/sin/tan, solution points and arcs of cos u = c / cos u ≥ c, u = ax + b back to x, polar coordinates |

### Space geometry
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| SolidViewer | new | 6 | turns a cube / tetrahedron / pyramid / frame by preset views, taps points, edges and faces, moves t or α, toggles planes, sections, normals, projections |

### Complex numbers
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| ComplexPlane | new | 2 | places affixes, reads modulus and argument, applies ×i, ×a, conjugate, power |

### Counting and probability
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| GroupBoxes | existing | 3 | opens boxes of orders: A(n, k) = k!·C(n, k), bureau vs comité, simultaneous vs successive |
| EventAreaModel | existing | 3 | slices with counts (multiples of 4 and 6, loaded die, football/swimming): union, intersection, complement |
| ChoiceProduct | extend | 2 | one slot per stage, options shrink or repeat, product (10·9·8, 3¹⁰, 10!, block of girls) |
| SlotsPattern | existing | 2 | lists k of n patterns, builds Pascal rows |
| Urn | extend | 1 | 3 red and 2 **white** balls (white is missing today) |
| OutcomeSpace | existing | 1 | 25 / 20 / 10 outcomes of the three ways of drawing |
| EventPicker | existing | 1 | taps the same-colour outcomes, graded |
| ComplementView | existing | 1 | "at least one white" through its complement |
| ProbabilityTree | extend | 1 | trees with / without replacement; needs a 3rd level for three games |

### Statistics
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| StatsDistribution | new | 2 | bars and sorted dots: mean, σ-bands, median and quartiles by rank, box plot, affine change y = ax + b |
| TwoWayTable | new | 2 | taps row/column totals for marginals, selects cells of a combined condition |
| ScatterPlot | new | 1 | weighted cloud, mean point G, split in halves, G₁G₂ line, estimates |

### Generic
| Component | Status | Exercises | What the student does |
|---|---|---|---|
| Worksheet (and LineInput) | extend | 40 | writes engine-checked calculation lines |
| CardsPick | existing | 13 | picks the reason / rule card |
| NumericTwin | extend | 9 | checks both sides of an identity at chosen values before proving it |
| PlanCards | existing | 8 | orders the steps of an argument (pieces then junction; existence then uniqueness; plan d'étude) |
| StatementTap | existing | 7 | taps the decisive word (avec / sans remise, simultanément, au moins, un seul, par défaut) |
| CounterexampleHunt | reserved | 7 | tries values against a "for all" claim (f(x) ≤ 1, d(x) ≥ 2, tan x ≥ x, has a maximum, is bounded) |
| PredictReveal | existing | 4 | predicts before the visual (same door? most favourable draw?) |
| CompareTwo | existing | 2 | two visuals stacked (ordered vs simultaneous draws; notes before vs after) |

## Most used

All exercises: Worksheet 40, CardsPick 13, FunctionPlot 12, IntervalBuilder 10, NumericTwin 9, HorizontalLineSweep 8, PlanCards 8, PointOnCurve 8, then six at 7 (CounterexampleHunt, GeometryCanvas, SignTableBuilder, StatementTap, TangentSlope, VariationTableBuilder).

The 10 lesson components without the four method frames: FunctionPlot 12, IntervalBuilder 10, NumericTwin 9, HorizontalLineSweep 8, PointOnCurve 8, CounterexampleHunt 7, GeometryCanvas 7, SignTableBuilder 7, TangentSlope 7, VariationTableBuilder 7.

## Engine work behind them (rule 1: values come from the engine)

| Engine piece | Today | Needed by |
|---|---|---|
| `analysis.ts`: functions written in the exercise file (safe-parser expressions checked at load), pieces with open/closed ends, E(x), parameters, one-sided limits and derivatives, crossings with y = m, roots and signs of factors, exact values | exists (fixed function list in code, ±∞ limits, numeric derivative) | 13 components (all of functions and analysis, CounterexampleHunt) |
| `intervals.ts`: exact interval sets and equality | none | IntervalBuilder, HorizontalLineSweep |
| `sequences.ts`: explicit / recurrent terms, sums, thresholds, ε-band N, fixed points | stub | SequenceExplorer, CobwebDiagram, InductionStepper, CounterexampleHunt |
| `geometry2d.ts`: exact coordinates, constructions, dot products, oriented angles mod 2π, loci, exact trig values at π/12 multiples | none | GeometryCanvas, LocusTracer, TrigCircle, SituationToGraph |
| `complex.ts`: exact a + bi, modulus, argument | stub | ComplexPlane, LocusTracer, Worksheet |
| `space.ts`: 3-D coordinates, 3×3 determinant, planes, intersections, sections, projections, volumes | none | SolidViewer, DeterminantExpander |
| `statistics.ts`: mean, variance, ranks for quartiles, σ-bands, marginals, mean points, G₁G₂ line | none | StatsDistribution, TwoWayTable, ScatterPlot |
| parser and line engine: E(x), constant i, vectors / triples, =, <, ≤, ⟺ lines and inequality chains, k ∈ ℤ families | not supported | Worksheet, InductionStepper |
| method templates: one solution graph per new question type | 19 templates used today (probability, trees, ex4 analysis) | Worksheet in every exercise |
| `combinatorics.ts`, `tree.ts`, ball colours | exist | ChoiceProduct (up to 10 stages), ProbabilityTree (3 levels), Urn (white) |

## Exercises that need nothing beyond Worksheet / LineInput

None at the exercise level: every exercise has at least one question that needs a visual or a manipulation. Two question groups are lines plus a reason card only: T1_CH05 Ex1 Q3 (limits recognised as derivative numbers) and T2_CH09 Ex1 Q5 (comparing two notes in units of σ). The space-geometry exercises T2_CH06 Ex1, T2_CH06 Ex2 and T2_CH07 Ex2 are mostly lines; SolidViewer is there so the student sees the figure he is computing on.

## Existing or reserved components 3se does not use

FoldSymmetry (PointOnCurve's axis mode covers symmetry), LawBuilder, LawChart, BinomialExplorer, VariableTable, SpreadSlider, RepeatedRuns, PartWholeBar, UrnTemplate (3ème has no random variable and no binomial law), ExampleGenerator, StepThrough, and the reserved AreaUnderCurve, CurveCompare, InverseMirror, WorkedExample (4ème material).

## Notes for the 2ème and 1ère mapping

- Reuse these names exactly. The likely fits: GeometryCanvas for all plane figures (its `transforms` prop is the place for translations, symmetries, rotations and homothéties), SignTableBuilder for signs of ax + b and of trinômes, IntervalBuilder for inequations, FunctionPlot and HorizontalLineSweep for reading graphs, TrigCircle for the first trigonometry, StatsDistribution for one-variable statistics, SolidViewer for solids and sections, ChoiceProduct / EventAreaModel for counting.
- SequenceExplorer is a reserved name widened here into the general sequence explorer (it absorbs SequencePlot and SqueezeVisual from `COMPONENTS_COMPLEX_SEQUENCES.md`); CobwebDiagram and ComplexPlane keep the names of that doc.

## Open questions for the owner (each with a default)

1. **Sign tables and variation tables: two components or one?** Default: two names (SignTableBuilder, VariationTableBuilder) on one shared grid, because the student does different things in each.
2. **Can an exercise file define its own functions?** the analysis chapters alone use about 50 different functions; today every function must be added to a list in the code. Default: yes, written as safe-parser expressions and checked when the exercise loads (no eval, rule 2 kept).
3. **Mockups first?** Default: yes for SignTableBuilder / VariationTableBuilder (D79 already asks it), IntervalBuilder, GeometryCanvas and SolidViewer, before any build.
4. **3-D on cheap phones.** Default: SolidViewer turns between 8 preset views (SVG), no free rotation.
5. **Where does the student write inequalities, equivalences, vectors and complex numbers?** Default: extend the Worksheet (one place to write); sets and intervals go to IntervalBuilder.
6. **NumericTwin can look like a proof.** Default: offer it only before the proof lines or at help level 1, with the sentence "vérifier n'est pas démontrer".
7. **Quartile rule.** The chapter uses the rank rule E(N/4) + 1 taken in its usual form (the manual's formula was an image). Default: grade with that rule, `reviewed: false` until a teacher confirms it.
8. **SituationToGraph scenes.** Default: a generic scene (a GeometryCanvas with one moving point) plus 4 presets (car and antenna, door under an arch, tangent to a circle, ferris wheel).
