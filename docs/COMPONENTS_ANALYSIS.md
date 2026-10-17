# Analysis components (Exercise 4, 2022 session de contrôle: f(x)=e^x/(1+e^{2x}); reusable for other function exercises)

Principle from the prototypes: first the student **sees** (slider, live numbers), predicts, then proves by calculation. A picture never replaces the written proof; every component's insight ends with a pointer to the calculation.

## Engine (`src/engine/analysis.ts`)
```ts
functionRegistry: { id: string; fn: (x:number)=>number; latex: string; domain: Interval }[]   // "f_ex4", "arctan_minus_pi4", "sigmoid_demo", ...
derivative(fnId, x)          // central difference for visuals; exact formulas live in content for proofs
integrate(fnId, a, b)        // Simpson, handles a > b (negative)
limitProbe(fnId, direction, xs[])
signChange(fnId, interval)
equivalentExpressions(a, b, samples)   // numeric-sample equivalence for typed lines
```
Never evaluate arbitrary strings: expressions come from a safe parser or the registry.

## Base: `FunctionPlot`
```ts
interface FunctionPlotProps { fn: FnId; domain: [number, number]; range: [number, number];
  markers?: { type:"point"|"hline"|"vline"|"asymptote"; at: number|[number,number]; label?: string }[];
  shade?: { from: number; to: number; sign?: "auto"|"pos"|"neg" }; colorBySign?: boolean }
```
All other components compose this. Events: `viewport_changed`.

## Components
1. **`PointOnCurve`** — x slider (or drag) with live f(x) and optional f(−x); `compare` toggle to a non-even function. Teaches: parity. Props: `fn, x0, showMirror, compareFn?`. Events: `x_changed {x, fx, fmx}`, `compare_toggled`.
2. **`FoldSymmetry`** — fold slider flips the left half over the y-axis; reports overlap. Props: `fn, compareFn?`. Events: `fold_changed {k}`, `fold_complete {overlap:boolean}`.
3. **`LimitExplorer`** — x -> +∞ slider showing numerator, denominator and f(x) separately (shows ∞/∞), with a vertical zoom toggle to see the curve never touches the asymptote. Props: `fn, numerator?, denominator?, direction, xMax, zoom`. Events: `x_changed`, `zoom_toggled`. Teaches: forme indéterminée, asymptote. Interpreting: "la droite d'équation y = 0 est une asymptote horizontale au voisinage de +∞".
4. **`TangentSlope`** — x slider; tangent line; numeric slope; colored up/down/flat; optional auto-fill of a variation table by visited regions. Events: `x_changed {x, slope}`, `region_visited {region}`.
5. **`SecantToTangent`** — second point at x+h, h steps [3, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.01]; secant slope vs tangent slope. Teaches: what f′ means. Events: `h_changed {h, secantSlope, tangentSlope}`.
6. **`VariationTableBuilder`** (task) — rows x / f′(x) / f; modes `reveal_by_exploration` (cells fill when the student visits a region in `TangentSlope`) and `student_fill` (signs and arrows chosen). Result: correctness per cell. Also checks the **sign change** requirement for an extremum.
7. **`AreaUnderCurve`** — shaded area between bounds with sliders; signed areas (red when the upper bound < lower); numeric integral; `stack` option showing area(−λ..0) mirrored onto area(0..λ) to explain 2·∫₀^λ for even functions. Events: `bounds_changed`, `stack_toggled`.
8. **`CurveCompare`** — overlay two functions (e.g. F(x)=∫₀^{ln x} f and arctan(x)−π/4) with a live numeric difference. Teaches: "same derivative => differ by a constant => fixed by one point" and the discovery F(x)=arctan(x)−π/4. Events: `x_changed {x, diff}`.
9. **`SequenceExplorer`** — for I_n=∫₀¹ tⁿ F(eᵗ)dt: n slider; curve F(eᵗ), weight tⁿ (scaled), product shaded; readouts I_n, n·I_n, and the limit marker F(e)≈0.4328. Teaches: why I_n -> 0 but n·I_n -> F(e). Events: `n_changed {n, In, nIn}`.
10. **`InverseMirror`** — function and its inverse reflected over y=x (tan on ]0,π/2[ and arctan). Events: `x_changed`.
11. **`NumericTwin`** — replaces a scary symbol with a number and lets the student test values (e.g. e^{iθ}=3 in a quadratic; or a=... in a limit). Generic; props: `template, symbol, value, checkFn`.
12. **`WorkedExample`** — a short fully worked example with steps revealed one at a time and a final "your turn" variant. Props: `steps: Rich[]`, `variantId`.

## Verified facts for content authors (Exercise 4)
- f even; lim_{x->+∞} f = 0 (asymptote y=0); f'(x) = (1−e^{2x})e^x/(1+e^{2x})²; max 1/2 at x=0; f>0 and f≤1/2.
- F(x)=∫₀^{ln x} f(t)dt = arctan(x) − π/4 for x>0 (check: F(1)=0, lim F = π/4). A(λ)=2F(e^λ) -> π/2.
- I_n: 0 ≤ F(eᵗ) ≤ π/4 on [0,1] => 0 ≤ I_n ≤ π/(4(n+1)) -> 0. By parts: I_n = F(e)/(n+1) − 1/(n+1)·∫₀¹ t^{n+1}f(t)dt; n·I_n -> F(e) = arctan(e) − π/4 ≈ 0.4328.
All values must be recomputed by the engine tests, not trusted from this file.
