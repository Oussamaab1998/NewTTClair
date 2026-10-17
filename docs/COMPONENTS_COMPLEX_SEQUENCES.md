# Complex numbers and sequences components

Same contract as COMPONENTS_CONTRACT.md (zod props, events, replay mode, `getStateSnapshot()`). Specs are drafts; refine with a teacher.

## Complex numbers (needs `src/engine/complex.ts`)
1. **`ComplexPlane`** — plane with draggable points given as affixes; optional unit circle, grid, vectors, segments. Live readouts: Re, Im, |z|, arg. Props: `points: { id, z: [re, im], label, draggable }[]`, `vectors?`, `segments?`, `unitCircle`. Events: `point_dragged {id, z}`, `readout_viewed`. Teaches: a complex number is a point; midpoint and vector equality on affixes.
2. **`UnitCircleExp`** — θ slider; point e^{iθ} on the circle with cos θ (horizontal) and sin θ (vertical) shown. Props: `theta`, `showProjections`. Events: `theta_changed {theta, cos, sin}`. Teaches: e^{iθ} = cos θ + i sin θ; Re(e^{iθ}) = cos θ ≤ 1.
3. **`QuadraticRootsExplorer`** — roots of a quadratic whose coefficients depend on a parameter (for example θ), with discriminant shown, and the half-plane Re < 0 shaded. Props: `coeffs` (engine expression ids), `param`, `shade`. Events: `param_changed {value, roots}`. Teaches: roots move with θ, Δ' = 4 is constant, which root has Re < 0.
4. **`AffixConstruction`** (task) — student builds midpoint or vector from affixes and sees the geometric result (I midpoint of [M1M2]; IM1 = AB). Result details: checks by engine.
5. **`ComplexTransform`** — z -> az + b on a small figure: scaling by |a|, rotation by arg a, translation; center (fixed point) highlighted. Props: `a`, `b`, `figure`. Events: `a_changed`, `b_changed`. Teaches: similarities as complex maps.

## Sequences (needs `src/engine/sequences.ts`)
1. **`SequencePlot`** — points (n, u_n), from an explicit formula or recurrence; n slider; optional bounds and limit line. Events: `n_changed {n, un}`.
2. **`CobwebDiagram`** — u_{n+1} = f(u_n): graph of f, line y = x, staircase from u0, step button. Events: `step_taken {n, un}`. Teaches: monotonicity, convergence, fixed points.
3. **`SqueezeVisual`** — lower, middle and upper sequences, with the limit of both bounds highlighted. Props: `lower`, `upper`, `middle` as engine ids. Teaches the squeeze theorem; ties to Exercise 4 part C.
4. **`MonotoneBoundedViz`** — shows increasing + bounded above => converges. Candidate; confirm syllabus.
5. **`InductionStepper`** (task) — scaffolds a proof by induction: statement P(n), base case, heredity; the student fills each part; engine checks simple cases. Candidate; confirm syllabus.
6. **`SequenceExplorer`** — for integral sequences such as I_n: see COMPONENTS_ANALYSIS.md.
