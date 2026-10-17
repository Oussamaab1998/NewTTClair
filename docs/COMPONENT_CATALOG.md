# Component catalog: generic playground primitives + per-chapter components

Goal: the student can **play, ask, and try mini-examples until they understand**, without us building a bespoke animation per question. Generic primitives are configured by engine ids and parameters; each chapter adds a few specific components on top. All follow COMPONENTS_CONTRACT.md.

## Generic primitives
| Component | What it gives the student | Key props |
|---|---|---|
| `ParameterPlayground` | sliders for parameters of a situation + live numbers | `params[]` (name, range, step), `outputs[]` (engine fn ids), `render` (which visual primitive) |
| `PredictReveal` | "what will happen?" (choice or number), then reveal | `prediction`, `reveal` (component spec), `insight` |
| `CompareTwo` | two cases side by side (even vs not even, with vs without replacement) | `left`, `right` (component specs), `sharedParams` |
| `ExampleGenerator` | "another example": engine-generated variant, verified by code | `templateId`, `difficulty`, `seed` |
| `CounterexampleHunt` | "try to break this claim" | `claimId`, `searchSpace`, `checkFn` |
| `StepThrough` | one step at a time with the reason visible | `steps: { text, math, why }[]` |
| `NumericTwin` | replace the scary symbol with a number and test | `template`, `symbol`, `value`, `checkFn` |
| `WorkedExample` | full example then "your turn" variant | `steps`, `variantId` |

## Mini-example loop (limits so it does not spin forever)
example -> student tries a similar one -> if they fail, offer a *simpler* case (never the same one) -> transfer check on a changed variant -> after 3 failed rounds, go to the prerequisite or offer "save a note for my teacher". Log every round (`example_round` event).

## "Ask about what is on screen"
Every component implements `getStateSnapshot()` returning its current parameters and readouts (for example `{ x: 1.2, fx: 0.31, fmx: 0.31 }`). The ask field and long-press send this snapshot to the answer pipeline so the answer is about *this* picture.

## Per chapter (see CHAPTERS.md for scope caveats)
- Analyse: FunctionPlot, PointOnCurve, FoldSymmetry, LimitExplorer, SecantToTangent, TangentSlope, VariationTableBuilder, AreaUnderCurve, CurveCompare, InverseMirror, SequenceExplorer. Candidates: IVT visual, growth comparison, integration-by-parts trainer.
- Probabilités: Urn, OutcomeSpace, EventPicker, ComplementView, LawBuilder, LawChart, BinomialExplorer. Later: TreeDiagram.
- Suites: SequencePlot, CobwebDiagram, SqueezeVisual, MonotoneBoundedViz, InductionStepper (+ SequenceExplorer).
- Complexes: ComplexPlane, UnitCircleExp, QuadraticRootsExplorer, AffixConstruction, ComplexTransform.

## Build order
Primitives first (they multiply the value of every chapter component), then chapter components by the teacher's priority ranking.
