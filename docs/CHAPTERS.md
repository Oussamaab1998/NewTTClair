# Chapter scope: Analyse, Probabilités, Suites, Nombres complexes

**Confirm the official program and the weight of each topic with a teacher.** Everything below is based only on the two 2022 papers we looked at (session principale and session de contrôle); it is not a complete syllabus.

## Engine modules (one per chapter, all tested)
```
src/engine/
  expression/     safe parser; real now, designed to extend to complex (symbol i) later
  analysis.ts     functions, derivative (numeric for visuals), integrate (Simpson), limitProbe, signChange, equivalence by samples
  probability.ts  see COMPONENTS_PROBABILITY.md
  sequences.ts    iterate recurrence u(n+1)=f(u(n)), partial sums, bounds, monotonicity probe, limit probe
  complex.ts      arithmetic, modulus, argument, exp(iθ), roots of a quadratic (Δ or Δ'), affix operations (midpoint, vector), transformations z -> az+b
```
Phase 1a should create the `expression/` module with a complex-ready design (do not hardcode real-only), and `probability.ts`. The other modules come in their own phases.

## Nombres complexes (principale 2022, Exercice 1)
Equation (E): z² − 2e^{iθ}z + (e^{2iθ} − 4) = 0, θ ∈ ]0, π[.
Verified facts (recompute in engine tests):
- Δ' = (e^{iθ})² − (e^{2iθ} − 4) = 4, so the roots are e^{iθ} ± 2. Re(e^{iθ} − 2) = cos θ − 2 < 0, so z1 = e^{iθ} − 2 and z2 = e^{iθ} + 2.
- With A(1), B(−1), I(e^{iθ}), M1(z1), M2(z2): I is the midpoint of [M1M2]; vector IM1 = z1 − e^{iθ} = −2 = B − A = vector AB.
- J = −e^{iθ}: A is the midpoint of [J M2] and B is the midpoint of [J M1], so lines (AM2) and (BM1) meet at J.
- Area of triangle J M1 M2 = 4 sin θ, maximal when θ = π/2 (area 4).
Method cards: rename the scary part (w = e^{iθ}), perfect square (z − w)² = 4, quadratic with reduced discriminant, affixes -> geometry (midpoint, vector equality), area as base × height / 2.
Seed misconceptions: Re vs Im confusion, e^{iθ} treated as a real number, losing the factor 2 in 2e^{iθ}, sign of Re(z1) argument (cos θ ≤ 1).
Components: `ComplexPlane`, `UnitCircleExp`, `QuadraticRootsExplorer`, `AffixConstruction`, `ComplexTransform` (see COMPONENTS_COMPLEX_SEQUENCES.md).
Other topics visible in the principale paper (geometry with direct similarities, with a complex expression z' = az + b): not yet verified here. Author them with a teacher later.

## Analyse
See COMPONENTS_ANALYSIS.md and exercises/EX4_ANALYSIS.md. Candidates to add after confirming the program: intermediate value theorem visual, growth comparison (e^x vs polynomial), integration-by-parts "choose u and v" trainer, inverse function mirror.

## Suites
From Exercise 4 part C: sequence defined by an integral, bounds by integrating an inequality, squeeze, integration by parts, limit of n·I_n. Verified facts: see COMPONENTS_ANALYSIS.md.
Other sequence types (recurrence, monotone and bounded, geometric/arithmetic, induction) are standard bac topics but are **not verified from the papers we saw**. Confirm with a teacher before authoring.

## Probabilités
See COMPONENTS_PROBABILITY.md and exercises/EX2_PROBABILITY.md. Add later after confirming: conditional probability and trees, independence.

## Priority
Rank chapters by (how often they appear) × (how much students struggle). A teacher must give this ranking; do not guess.
