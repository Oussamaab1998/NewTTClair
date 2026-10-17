// TODO lists from docs/CHAPTERS.md. Implement with the module's phase; facts must be confirmed by a teacher.
describe('analysis (Phase 5)', () => {
  test.todo('numeric derivative matches the exact derivative on sample points');
  test.todo('integrate (Simpson) on a polynomial is exact');
  test.todo('limitProbe on a forme indéterminée from EX4_ANALYSIS.md');
  test.todo('signChange finds the zeros used in the tableau de variation');
});

describe('sequences', () => {
  test.todo('iterate u(n+1) = f(u(n)) for n steps');
  test.todo('partial sums');
  test.todo('monotonicity and bounds probes');
  test.todo('limit probe of n·I_n (EX4 part C, see COMPONENTS_ANALYSIS.md)');
});

describe('complex', () => {
  test.todo('arithmetic, modulus, argument, exp(iθ)');
  test.todo(
    "(E): z² − 2e^{iθ}z + (e^{2iθ} − 4) = 0 has Δ' = 4 and roots e^{iθ} ± 2",
  );
  test.todo('Re(e^{iθ} − 2) < 0 for θ in ]0, π[, so z1 = e^{iθ} − 2');
  test.todo('I is the midpoint of [M1M2]; vector IM1 = vector AB = −2');
  test.todo('J = −e^{iθ}: A is the midpoint of [J M2], B of [J M1]');
  test.todo('area of J M1 M2 = 4 sin θ, maximal (4) at θ = π/2');
  test.todo('expression parser accepts i with a complex NumberSystem');
});
