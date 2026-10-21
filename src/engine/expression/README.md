# Safe expression parser (`src/engine/expression`)

Student input is parsed by a whitelist tokenizer and a recursive-descent parser into an AST.
Nothing is ever executed as code: no `eval`, no `new Function`, no property lookup by user text.

## Grammar

- Numbers: `12`, `0.7`, `0,7` (French comma = decimal separator; there are no multi-argument functions, so `,` is never a list separator).
- Operators: `+ - * / ^`, unary `-`/`+`, parentheses `( )`. Typographic `− × · ⋅ ÷` and `π` are accepted.
- Functions (parentheses required): `ln exp sqrt abs sin cos tan`. Constants: `e`, `pi`.
- Variables: single letters declared per question (`variables`, default `['x']`). `e` and `i` can never be variables.
- Implicit multiplication: `2x`, `2(x+1)`, `(x+1)(x-1)`, `3ln(x)`, `2e^x`, `xy`.
- Precedence: `^` (right-assoc) > unary minus > `* /` and implicit `*` > `+ -`. So `-x^2 = -(x^2)`.
- Signed exponents: `e^-x = e^(-x)`.

## Rejected (error code + character index, for localized feedback)

`empty`, `too_long` (> 200 chars), `too_deep` (> 50 nested levels), `invalid_char` (`= ; _ $ " .` etc.),
`unknown_identifier` (any letter run that is not a known name: `hello`, `alert`, `Math`),
`function_needs_parens` (`ln x`), `missing_operand` (`1+`, `()`), `unbalanced_paren`, `unexpected_token` (`2 3`, `x2`).

## Evaluation

- `evaluateReal`: floats; outside the domain gives `NaN`/`±Infinity` (never throws). `ln(x)` is `NaN` for `x <= 0`.
- `evaluateExact`: exact fraction for constant rational expressions (`1 - 3/10 -> 7/10`), else `null`.
- `NumberSystem<T>` makes the evaluator generic; a complex system (and constant `i`) can be added later without touching the parser.

## Equivalence (`checkEquivalence`)

- Both constant and rational: exact comparison (`0.3333333333 != 1/3`, `0,7 == 7/10`).
- Otherwise: 12 fixed "nice" points (1, 2, −1, 0.5, …) then 24 seeded random points in [−10, 10].
  Equivalent if all points where both sides are defined agree (relative tolerance 1e-9) and there are at least 6 such points.
  The first disagreeing point is returned as a counterexample (nice points first, so feedback can say "with x = 1 …").

## Known limits

- **Not a proof.** Expressions that differ only on a tiny set (e.g. at one point) or beyond [−10, 10] can be reported equivalent.
- **Domain is only reported, not judged.** `ln(x^2)` vs `2ln(x)` is `equivalent` with `domainDiffers: true`; the caller decides if that matters.
- Float overflow (e.g. `e^(e^x)`) makes points undefined; too few defined points gives `undetermined`.
- `e^-2x` parses as `e^(-2)·x`, and `2^3x` as `(2^3)·x` (same as most CAS). The math keyboard's exponent template avoids this; typed input should show the parsed preview.
- No equations or inequalities (`=`, `<`), no `log` (ambiguous base), no absolute value bars `|x|` (use `abs(x)`), no `!`, no implicit function powers (`sin^2 x`).
- Real numbers only for now; no complex `i` yet.

## Typed lines (Phase 5, `structure.ts`)

- `toLatex(ast)`: LaTeX for the native renderer (accepted lines in the notebook). `/` becomes `\frac`, implicit products stay juxtaposed, explicit `*` is `\times`, only meaning-changing parentheses are kept, `0.5` is shown `0{,}5`.
- `splitFraction(ast)`: top-level numerator / denominator.
- `locateDifference(student, expected)`: `numerator | denominator | both | whole`, plus the first disagreeing sample point with both values (nice points first, so feedback uses the student's value at x = 1).
- `missingParentheses(student, target)`: regroups the top-level sum: `a/b + c` read as `a/(b + c)` (denominator) or `a + b/c` as `(a + b)/c` (numerator); returns which, if that reading equals the target.
- `checkEquivalence` takes `skip(scope)` to ignore sample points (the analysis engine skips points within 1e-3 of a function's excluded points).

Limits of typed-line checking:
- Equivalence is numeric (above): a line equal to the previous one only on [−10, 10] samples passes.
- `locateDifference` compares numerator and denominator **as written**: a correct line with both multiplied by the same factor is equivalent as a whole (never reported), but a wrong line written in a scaled form reports `both` even if only one part is wrong.
- `missingParentheses` looks at the top-level sum only, not nested sums (`2·(a/b + c)`), and not `e^-2x` (parsed `e^(-2)·x`; the structured keyboard's exponent slot avoids it).
- Large exponents overflow to `Infinity` (e.g. `e^(2x)` past x ≈ 355): those sample points are skipped as undefined.
