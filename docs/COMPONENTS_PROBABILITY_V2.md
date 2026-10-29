# Probability visual components, tiers 1 and 2: Phase 0 audit and design

> **This file is the Phase 0 deliverable.** It is written in plan mode because plan mode allows no other file.
> On your approval I will do exactly two things: copy it, unchanged, to `docs/COMPONENTS_PROBABILITY_V2.md`, and stop.
> **Approval does not start Phase 1.** Phase 1 starts only after you answer section 10 ("Questions for you").
> Nothing has been edited, committed, installed or run against a model. The only commands run were read-only (`ls`, `grep`, `git`, a Jest baseline, and a Node timing of the engine).

Claims are labelled **[read]** (found in code or docs), **[measured]** (a command I ran, with its context), **[derived]** (my reasoning from code), **[unverified]** (needs a device, a simulator, or a decision).

---

## 0. Summary

**Why.** In the hand-played session on `bac2022c-sc-ex2` the student could not do step b (60 = 4 × 15) because the app showed hints with formulas before meaning. What worked was a picture, then a question answered from it, then the rule card. We need reusable, parameterised, interactive probability components that a planner can pick from a catalog.

**What I found that changes the plan** (details in section 2):

1. **The graphics layer is enough. No new dependency is needed.** `react-native-svg` 15.15.5 is installed and used (`Svg, Circle, Line, Path, Text`, and `Rect` in the paper background). Everything probability-related today is plain `View`/`Pressable`. Reanimated 4.7 and worklets are installed but **imported nowhere in `src`**; the slider is `PanResponder` + React state. `docs/COMPONENTS_CONTRACT.md` rule 10 and `CLAUDE.md` say "Reanimated shared values"; the code does not do that. I recommend we do not start now (section 3.9).
2. **`exercise bac2022c-sc-ex2` has only question 1 authored** (11 steps: total 120, count A 60, P(A) 1/2). Questions 2 and 3 are not in the JSON (D35: "waits for the product owner's OK"). So of the seven tier-1 components, only GroupBoxes, ChoiceProduct and SlotsPattern (bridge mode) have a home in "Part 1" today. SpreadSlider, RepeatedRuns, VariableTable and BinomialExplorer serve question 3, which does not exist yet. Phase 4 as written ("wire the tier-1 components into Part 1") needs a decision (Q1, Q2 in section 10).
3. **Every new `visual` component is automatically offered to the LLM planner** and enters its cached system prompt (`plannerComponents`, `plannerFormat.ts:125`). That changes `catalog.test.ts.snap`, `strictSchema.test.ts:85-117` and the live prompt. Since you want no model work now, I propose a registry flag `offeredToPlanner` (default true, so nothing existing changes; new components set it false until an AI round is approved). Result: zero planner test expectations change (section 3.4).
4. **The engine is exact but `number`-based.** `choose(n,k)` is exact for every k up to n = 54, **throws** for many k from n = 55, and is **silently off by one** for C(59,22) and C(59,37) [measured against BigInt]. `binomialPmf` throws once the denominator power passes 2^53 [measured: p = 3/10 or 7/10 fails from n = 16, p = 1/6 from n = 21, p = 1/2 from n = 53]. The sliders in BinomialExplorer must therefore be bounded by the loader (section 4, E8). Factorial, A(n,k), grouping, runs, distribution helpers, hypergeometric counts do not exist.
5. **Typed `C(6,2)` cannot be parsed today**: `C` is an unknown identifier, `!` and `_` are invalid characters, and `6,2` tokenises as the decimal 6.2. All functions are one-argument. Symbolic `C(n,k)` has no answer path (the schema declares an `expression` answer type, but the loader rejects it). My proposal: keep the numeric-first path, add a safe **pre-pass** that turns `C(a;b)`, `C(a,b)`, `C_a^b`, `A(a,b)`, `a!` with integer arguments into integer literals before the existing parser runs (no grammar change, no new AST node), and defer symbolic input (section 4, E7).
6. **There is no committed screenshot or pixel-diff tooling, and no 360 pt simulator** (iPhone 17 Pro = 402, iPhone 16e = 390; `-devWidth 360` clamps only the lesson column, not the Proba demo tab). No PIL, ImageMagick or pngjs on this machine. I propose a small dependency-free Node PNG diff and a debug-only width wrapper for demo cases (section 8).
7. **`BinomialExplorer` is a reserved name** in `COMPONENT_NAMES` (`contract.ts:16`), and `probability/components.test.tsx:63-72` uses it as its "unregistered name falls back to a fallback" case. Registering it forces that test to use another unregistered name (an input change, not a weakened assertion).
8. **Baseline is green** [measured today]: `npx jest` = 126 suites, 1607 passed, 11 todo, 24 s. The known "A worker process has failed to exit gracefully" warning (PROGRESS.md) appears and is not new.

**Recommendation in one paragraph.** Build engine and primitives first (tests only). Then, instead of your listed order, build the **Part 1 slice first**: GroupBoxes and ChoiceProduct (plus SlotsPattern's bridge mode and the small PartWholeBar), because the observed failures on step b (4 × 15, C(6,2) read as a product, 720/3) are exactly Part 1. Then SpreadSlider and RepeatedRuns, then VariableTable and BinomialExplorer. Your three stop points are kept; only their membership changes (section 7). If you prefer your order, I will follow it; nothing in the engine depends on the choice.

---

## 1. Direct answers to the questions you asked

| Question | Answer |
|---|---|
| What is the SVG/graphics layer today, and is it enough? | `react-native-svg` 15.15.5 (`Svg, Circle, Line, Path, Text`; `Rect` in `PaperBackground`), plus `View`/`Pressable`/`Text` for all probability components, plus `PanResponder` for the slider. **Enough** for: a 6x6 tappable grid (Pressable squares), a number line with segments and squares (`Line`, `Rect`, `SvgText`), a stacked bar (flex Views, as in ComplementView), tappable bars (LawChart's 44 pt overlays), and a tree of about 20 nodes (SVG edges + positioned Views for labels). **Gaps that are code, not packages:** no `onPress` has ever been put on an SVG element (all taps are Pressable overlays; I would keep that); no tree layout function; fractions inside SVG text are untested (use `SvgText` for plain `3/10` in STIX, `MathBlock` Views for stacked fractions). **No new dependency requested.** |
| Does CompareTwo's inner component take its own draw setting? | **Yes, already.** `left` and `right` are full specs with their own `balls/draw/k`; the live intro of `bac2022c-sc-ex2` (content line 393-490) compares `simultaneous` with `ordered_with_replacement` on the same four balls. The gap is small: the sides stack vertically (no side-by-side), there are no events of its own, no cross-highlighting, no demo of the third setting (`ordered`). Item 10 is **S: tests and demo cases only, no schema change** (section 5, C10). |
| LawBuilder or a new VariableTable? | **New component**, sharing the helpers in `probability/logic.ts` (`lawRows`, `checkLaw`, `sumFractions`, `moments`). Reasons in C6. |
| Extend ComplementView or build EventAreaModel? | **New component.** ComplementView is a fixed two-segment bar bound to `{balls, draw, k, event}`; the complement trap needs 3 to 8 slices, overlays and a conditional zoom. Reasons in C9. ComplementView stays untouched. |
| Reuse LawChart bars in BinomialExplorer? | **Partly.** LawChart accepts a given `law.rows` (max 12 rows, must sum to 1) and its tapped-bar behaviour is what we want. But it has no n/p controls, the content loader requires `law.of` for a given law, and 12 bars at 44 pt do not fit in 308 pt anyway. I would copy its bar view into BinomialExplorer first and extract a shared `Bars` view later, behind a pixel diff (C7). |
| How can `C(n,k)` with symbolic n, k be typed? | See E7. Decision: **numeric-first stays the default for symbolic questions**; typed numeric forms (`C(6,2)`, `C(6;2)`, `C_6^2`, `A(6,2)`, `6!/(2!4!)`) are accepted through a safe pre-pass; symbolic equivalence by integer sampling is possible with the same pre-pass but needs keypad keys, so it is deferred. |

---

## 2. Audit: what exists

### 2.1 Engine (`src/engine`) [read unless marked]

| Area | State |
|---|---|
| Rational | `Fraction = readonly [num, den]` of JS `number`; `frac` normalises (gcd, sign, `-0`); every op returns through `frac`; `assertSafe` throws `EngineError` past 2^53. Exports: `gcd frac add neg sub mul div pow compare equals toNumber ceil choose`. **No** factorial, A(n,k), floor, min/max, isInteger, formatting. |
| `choose` | Exact for every k up to **n = 54**; from n = 55, 368 of the (n,k) pairs up to n = 70 throw, and **C(59,22) and C(59,37) are silently wrong** [measured against BigInt]. Cause: the assertion is on the quotient, not on the intermediate product (`rational.ts:81-93`). |
| Probability | `Ball{id,value,color?}`, `Draw = simultaneous | ordered | ordered_with_replacement`, `enumerateOutcomes` (no cap in the engine), value fns `product sum max min identity count_value(v)`, events `any_value all_equal value_eq not and or`, `probability`, `law` (only grouping that exists, keyed by a ValueFn number), `expectation secondMoment variance` (take `{value:number; p:Fraction}[]`), `binomialPmf binomialExpectation smallestN`. Events read `value`, never `color`; "exactly j reds" is `value_eq(count_value(1), j)` by enumeration. |
| Cost [measured, Node 24 on this Mac, **not Hermes, not a phone**] | 120 draws 1.4 ms (first call), 720 ordered 0.4 ms, 1000 with replacement 0.3 ms, 5040 ordered 1.6 ms, 10 000 with replacement 2.9 ms, 11 880 ordered 4.9 ms; `law` over 5040 outcomes 17 ms (it copies each group array on every insert, quadratic per group). |
| Caps are in the schemas, not the engine | `MAX_OUTCOMES = 60`, balls 1..12, k 1..4 (`probability/schemas.ts:33-40`). `checkExperiment` **enumerates first and counts after**: 12 balls, k=4 with replacement builds 20 736 outcomes just to reject it. New schemas should check caps by formula. |
| Calls | `ENGINE_CALLS`: `outcomeCount count probability choose oneMinus lawSum product fnAt limitAt`, `SET_CALLS.lawValues`; `runEngineCall` never throws. |
| Wrong procedures | `procedures.ts`: `ordered_draw balls_in_event all_balls opposite_event all_outcomes merged_identical earlier_result with_replacement`. Loader rejects a procedure equal to the answer. |
| ExampleGenerator engine | `examples.ts`: two analysis templates only; seeded mulberry32 (`rng` in `expression/equivalence.ts:41`); **no probability template, no coincidence guard.** "Fresh variant" rules live in the loader (`checkFreshVariants`, `loader.ts:508`) on authored variants, not in ExampleGenerator. |
| Expression parser | Functions `sqrt exp abs sin cos tan ln`, all one-argument. Numbers `[0-9]+([.,][0-9]+)?` (comma = decimal). No `!`, `_`, `C`, `A`. Variables: single letters declared per question. Typed answers go `NumericKeypad` (digits `/ , -`) -> `parseNumeric` -> `evaluateExact` -> `equals` (exact). `checkEquivalence` samples 12 fixed + 24 random real points in floats; `C(n,k)` would be NaN at most of them. |
| Missing for this project | grouping with counts, hypergeometric / "exactly k without enumerating", property-count comparisons, A(n,k)/factorial, distances/contributions/spread helpers, deterministic repeated runs, tally statistics, coincidence guard, urn variant generator, tree engine, bigint support. |

### 2.2 Components, registry, host [read]

- **Registration touches 11 places** (in the order you hit them): `contract.ts` `COMPONENT_NAMES`; a zod schema with engine checks in `superRefine`; `registry.ts` `REGISTRY`; `ComponentHost.tsx` `VIEWS` (test: keys equal REGISTRY keys); `catalogMeta.ts` (test: keys equal registered names); the planner catalog snapshot; both i18n JSON files; theme tokens (the hygiene test forbids numeric style values and hex colours outside `src/theme`); `revealing.ts` rules; a case in `ProbabilityDemoScreen.tsx` `CASES`; tests in the `components.test.tsx` style.
- **Component contract.** `ViewProps<P>`: `props, mode (interactive|readonly|replay), locale, instanceId, onEvent, onResult?, snapshot?, showSolution?, lessonState?, ref?, renderInner?`. `useEmit` emits **only in interactive mode**. State is exposed through `useImperativeHandle(p.ref, () => ({getStateSnapshot}))` and restored from a zod-parsed `p.snapshot`. Pattern copied from `ComplementView.tsx`.
- **`kind`**: `visual` = a feed block (may be a gate); `task` = a question card with hint ladder and `onResult` (EventPicker, LawBuilder). `visualIf(props)` lets a task act as a visual (LawBuilder readonly). Tasks cannot be nested and are never offered to the LLM.
- **Gate**: `gate: ['predicted','revealed']` on PredictReveal holds the lesson until one of those events. Gate events are matched **by name only**.
- **`catalogMeta`** has exactly `{whenToUse, studentAction, propsNote?}`. **`teaches` is in the registry, and the ids are free strings** (nothing checks them against `skillMap.json`; `probability-favorable-possible`, `expectation`, `variance` are not in the map).
- **`revealsAnswer` is not a field.** It is a function, `planner/llm/revealing.ts`, with a hand-written table keyed by the step's answer fn (`lawValues|lawSum|LawBuilder`, `outcomeCount`, `count|probability|EventPicker`) and a `displayedValues()` that only knows LawChart and ComplementView. **A new component that can show an answer is invisible to the guard unless added there.** This is the gap your rule 9 closes (section 3.3).
- **Existing probability components** are `View/Pressable` only, with `MAX_OUTCOMES` enforced in the schema; `Urn` display mode is exempt (checks the urn but lists no draws); `LawChart` is exempt through `law.of`; `OutcomeSpace` collapses past 12 chips; `LawChart` bars are 44 pt `Pressable` overlays on a linear x map, which cannot hold more than about 7 bars in 308 pt without overlap [derived].
- **Slider**: `PanResponder`, stepped by `snap()`, `onChange` only when the snapped value changes (local React state), `onCommit` once on release (the only thing logged), `accessibilityRole="adjustable"` with increment/decrement actions. Fine for stepped sliders with at most about 21 positions.
- **Math/Text**: `MathBlock` (native renderer, always LTR, `\binom` supported), `MathReadout` (`MathBlock` + live LTR `= value`), STIX Two Text by family name with italic/bold via style, Tajawal for UI.
- **CompareTwo** and **PredictReveal** are the only containers (`CONTAINER_SLOTS`), one level deep, inner `task` rejected. `InnerSpecSchema` takes any non-container name from `COMPONENT_NAMES`, so a new visual is embeddable automatically.

### 2.3 Content (`bac2022c-sc-ex2.json`) [read]

Top level: `paper experiment values results parts deepDives variants`. **`parts[0]` is question 1** (the `paper.parts` are only the printed "Partie" headings, a naming trap). Steps: `s1` text, `urn` Urn, `s2` text, `compare` CompareTwo, `s3` choice, `s4` typed `outcomeCount` (3 hints, deep dive `dd_count_draws`), `s5` math, `s6` typed `count` (3 hints, `dd_and_times`; wrong values 360, 19, 24; procedures `balls_in_event`, `all_outcomes`), `s7` math, `s8` typed `probability` (3 hints, `dd_fav_total`), `s9` text. Variants: 4 simpler twins and 2 transfers; **no alternatives yet**. The hint-3 of `s6` already prints `\binom{6}{2} = \val{c62}`: a formula-first hint, the thing the evidence says fails. Named engine values exist for `c41 c62 c103 nOrd nAOrd`.
An alternative attaches by a `variants[]` entry (`kind:'alternative'`, `forSteps:['1/s6']`, `representation`, intro blocks, a step with at least one hint); a deep dive by `deepDives[]` + `deepDiveId`, limited to one interactive component after 1-2 short text/math blocks (`checkDeepDive`, `loader.ts:758`). The rules planner chooses an alternative through `change()`/`repairFor` (matched on a misconception's `repairComponent` against `representation`).

### 2.4 Guard rails: what fails vs what is only convention [read]

| Rule | Enforced by | Notes |
|---|---|---|
| No hex colours, no numeric style values, no `fontFamily/fontStyle` literals outside `src/theme` | **test** `__tests__/themeHygiene.test.js` | Every cell size, gap and square scale must be a token. A number hidden in a named constant is not detected. |
| Contrast text 4.5, controls/graphics 3 | **test** `__tests__/contrast.test.ts` (`TEXT`, `NON_TEXT` lists); `src/theme/contrast.test.ts` has an inline snapshot for help chips | New pairs: palette -> token -> tuple in the list. `redBlack.test.tsx` shows the per-component pattern. DESIGN.md §2 table is updated by hand. |
| No physical `left/right/marginLeft/...`, no `'row-reverse'` | **test** `__tests__/readingSides.test.js` | **Scope is only `src/lesson/feed`, `src/lesson/lines`, `src/app/screens`.** `src/components/**` is not scanned, and LawChart/ui.tsx/Urn do use physical sides (allowed for LTR data components, DESIGN.md §8). Your rule 7 is stricter than the guard: I will add a **new guard test scoped to `src/components/probability2/`** (new code only). |
| Latin/digits/math signs in Arabic | **tests** `i18n.test.ts` (key parity ar-TN/fr; no Latin or digits in an Arabic UI string except `{{placeholders}}`; no math signs, with a hard-coded one-exception list) and `RichSchema.findRunIssues` for content (`latin_in_ar_run`, `digit_in_ar_run`, `math_symbol_in_ar_run`, `bidi_control_in_text`) | Applies automatically to every `Rich` prop. Placeholders can carry digits at runtime unchecked. |
| Bidi controls and special spaces as `\u` escapes | **test** `__tests__/sourceHygiene.test.js` | Covers `src/**` and i18n JSON. |
| `jsx-no-literals`, typed i18n keys | lint, typecheck | `t()` keys are typed against `fr.json`. |
| Real minus U+2212 | **test only for analysis readouts** (`plot.test.ts:160-172`) | Elsewhere convention; I will add a test for the new folder. |
| 60-element cap | **schema rule on outcome counts only** | There is **no element-count test** today. I will add one (section 3.8). |
| `reviewed:false` | `TrustSchema` (content) and tests that no `"reviewed":true` exists; i18n has no per-key flag | New Arabic: add to a DECISIONS entry (section 9) and keep a list; a unit test can pin that every new i18n key under the new prefix is listed. |
| Touch target 44, reduce motion, collapsed height 180-260 pt, teaching pattern | **convention, no test** | I will test touch targets for the new components. |
| Events | `component_event{component,name,payload}` generic; **no registry of names**; payload must be JSON (no `undefined`; do not put `instanceId` in it); `docs/DATA.md` is updated by hand | `EventLog.append` throws on a non-JSON payload. |
| "Finding" | **does not exist** anywhere in `src`/`docs` | `insight` slots and `getStateSnapshot` are the nearest things. |

---

## 3. Cross-cutting design (applies to every component)

### 3.1 Location and naming
- Engine: new modules in `src/engine/` (section 4), each with a `*.test.ts` next to it. Existing engine files change only for the `choose` fix.
- Components: a new folder **`src/components/probability2/`** (`schemas.ts`, `logic.ts`, `ui.tsx`, one `.tsx` per component, tests). Existing `probability/` stays untouched, which keeps "existing screens must not change" cheap to prove and lets the new guard tests scope to new files. (Rename freely.)
- Rational values on the wire are **strings** (`"1/6"`, `"3/10"`, `"0,5"`), parsed by the existing exact `parseNumeric`. Reason: tuples (`[1,6]`, used by LawChart) are rejected by the LLM strict-schema converter (`strictSchema.ts`), strings are not; and strings are easier to author. A `RatSchema` (string, regex + parse refinement, no `transform`) lives in `schemas.ts`. Event payloads use the same strings.

### 3.2 Kinds, gates, finding
- A component is `visual` unless a student answer is graded inside it; then it is `task` with `visualIf(p) => p.ask === undefined` so the same component works as an illustration or as a question (the LawBuilder pattern). Tasks get the hint ladder and `onResult`.
- **Gate event `explored`.** Every new component emits `explored {why}` when an engagement criterion is met (slider moved to 3 positions; a box expanded; first pattern added; a bar tapped; ...). Registry `gate: ['explored', ...]` holds the lesson until then, so "a student must act on every screen" (hard rule 7) holds. Gate events match by name only, so the criterion lives in the component.
- **Finding payload.** On completion, `component_event name:'finding'`:
  ```ts
  { findingId: string,                 // stable, e.g. "groupboxes.boxes_from_orderings"
    numbers: Record<string, string>,   // exact: "120", "1/6", "21/100"
    route: string[],                   // ordered action tokens, max 12: "predict:boxes=120", "expand:R1.N1.N2", "enter:boxes=120"
    how: 'found' | 'helped' | 'revealed',  // revealed = never counts as understanding
    correct: boolean | null }
  ```
  A zod `FindingPayloadSchema` in `probability2/schemas.ts`, validated in every component test. Ids and numbers only, no free text. Documented in `DATA.md`. The future "what we found" sheet reads these; nothing is built on top now.

### 3.3 Reveals: declared by construction, enforced twice
Add to the registry `Entry` (additive; existing entries unchanged):
```ts
reveals?: RevealRule[];   // required for every NEW component (a test lists the new names); existing ones are covered by revealing.ts as today
interface RevealRule {
  value: string;                 // 'total' | 'variance' | 'count' | 'formula:p(1-p)' | ...
  by: 'props' | 'state';         // props: shown as soon as it is mounted with these props; state: shown after a student action
  when?: string;                 // human-readable gate, e.g. "total shown after 3 distinct slider positions"
  minHint: 0 | 1 | 2 | 3 | 'ladder_end';   // from which hint level an AUTHORED or AI request may enable it
  values: (props, experiment) => Fraction[];   // engine-computed values put on screen (for the guard's value comparison)
}
```
- **Static guard (AI and authored content):** `revealing.ts` gains one generic branch: for any registered component with `reveals`, if a `by:'props'` rule's values contain the step's answer, or a `by:'state'` rule is not locked by construction (e.g. `totalLockedUntil` absent), then `component_reveals_answer` while hints remain. The hand-written table is not rewritten; the generic branch is additive. Existing guard fixtures must still produce the same results (section 8).
- **Runtime:** a `by:'state'` value is hidden until its state condition holds; if it also names `minHint`, the component reads `lessonState.hintLevel` (a small additive field the card passes for tasks; default 0) or `showSolution`.
- `catalogMeta` gains an optional `reveals: string[]` (plain English, for the prompt) next to `whenToUse/studentAction`; the machine rule is in the registry.

### 3.4 Planner offering
Add `offeredToPlanner?: boolean` to the registry `Entry` (default true). `plannerComponents` skips entries with `false`. New components ship with `false`. This keeps `catalog.test.ts.snap`, `strictSchema.test.ts:85-117` (`plannerFormat().components`, `plannerFormat(['complement'])`) and the cached prompt unchanged. The `CATALOG_META` entries are still added (the test `catalog.test.ts:8-11` requires one per registered name); they simply are not rendered into the prompt until we flip the flag. **To verify in Phase 2:** that `wireFormat.ts` takes its component enum from `plannerComponents`, not from `COMPONENT_NAMES` (otherwise adding names changes the prompt). New `teaches` ids are new skill ids (so no existing step's menu changes) and are added to `skillMap.json` with `reviewed:false` (the cycle test applies).

### 3.5 Events and test IDs
- Event names are lower_snake (as listed per component). Payload values are JSON, rationals as strings.
- testID scheme (matches the existing `law-chart-${id}`, `chart-bar-${v}`): root `${slug}-${instanceId}`; children `${slug}-${element}` or `${slug}-${element}-${key}` with `key` a stable id (index, ball id, pattern string, value). Example: `group-boxes-${id}`, `group-box-<key>`, `group-box-<key>-order-<i>`, `group-predict-input`, `group-expand-<key>`. Documented per component and asserted by tests so the replay harness and screenshots can address them.

### 3.6 Theme, contrast, RTL
- All sizes, gaps, stroke widths and scales are new tokens under `theme.pv2.*` (one group per component), because the hygiene test forbids numeric style values elsewhere.
- Colours: reuse `dataSeries`, `ink`, `pen`, `highlighter`, `borderControl`, `feedback.*`. Any new pair goes to `NON_TEXT` (3:1) or `TEXT` (4.5:1) in `__tests__/contrast.test.ts`. Never colour alone: every state also has a mark (shape, dash, icon, text) and a test that lists it.
- Math, numbers, number lines, grids, trees, formulas: `theme.mathSide` (LTR); Arabic labels and button rows: `theme.reading`. A new guard test (same patterns as `readingSides.test.js`) scans `src/components/probability2/**` and also fails on a literal `-` minus in a rendered number and on a `row-reverse`. Where a position *is* a numeric value (a tick on a number line), physical offsets are computed in the component from the value; the guard allows that through one documented helper.
- Real minus U+2212 through the existing `MINUS`/`formatFraction` (`probability/logic.ts`), re-exported by a new `engine/rationalFormat.ts` so the new folder has one formatter and a test.
- Math is never inline in an Arabic sentence; Arabic strings go through i18n (`pv2.<component>.*`), reviewed:false, no Latin/digits/math signs (the i18n test).

### 3.7 Accessibility
Every interactive element: `accessibilityRole`, a label that reads numbers as words/French (the `spokenMath` convention), `accessibilityValue` for sliders, 44 pt hit area (`theme.size.touch`), and a non-gesture alternative (the stepped slider already has increment/decrement actions; cells and chips are Pressables). Reduce-motion: no animation is required for meaning; any highlight flash respects it (pattern from `LinesCard`).

### 3.8 The 60-element rule, and widths
- "Interactive element" = any node with `onPress`, an `accessibilityRole` of button/adjustable, or a responder. A shared test helper `countInteractive(tree)` renders each component at its **worst-case valid props** and fails above 60. Above the cap a component **groups** (engine grouping, E3) or goes counts-only; it never silently truncates.
- Width budget [derived from the agent's measurement of theme tokens, **not measured on a device**]: Panel inner width about 308 pt at 360 pt; 6 columns of 44 pt plus gaps of at most 8 fit (304). So interactive grids are at most 6 columns; larger grids are display-only. Each component is checked at **402** (iPhone 17 Pro), **390** (iPhone 16e) and **360** (debug width wrapper, section 8).

### 3.9 Slider and performance
Stepped sliders only (at most 21 positions). Every frame (distances, squares, contributions, bars) is precomputed exactly in the engine when props load and indexed by position, so a drag tick is a lookup and one `setState` on a snapped change, as `Slider` already does. No Reanimated: it is unused today, adds nothing for 21 frames, and the contract text about shared values predates the stepped design. I propose we correct that sentence in `COMPONENTS_CONTRACT.md` rule 10 rather than introduce the library. **[unverified]** smoothness on a low-end Android phone (no device).

### 3.10 Definition of done (every component)
Zod schema + loader/engine validation (`superRefine`) · engine-computed values only (no literals) · registry entry with `reveals`, `offeredToPlanner:false` · `CATALOG_META` entry · events + `finding` documented in `DATA.md` · testID scheme · a11y labels · i18n keys (ar-TN + fr) listed for teacher review · tokens + contrast pairs · demo cases `Name#0..` (at least: default, one hard case, one non-session parameterisation, one readonly/replay) · two **non-session** parameterisations proving reuse · count-of-interactive-elements test at worst case · screenshots at 390 and 360 · `npm run check` and `npm run check:release-dev` green · a tests-only vs simulator-checked statement.

---

## 4. Engine and primitive additions (Phase 1, tests only, no UI)

| # | Module (new unless noted) | Exports | Tests (examples) | Used by |
|---|---|---|---|---|
| **E1** | `engine/combinatorics.ts`; **fix `choose` in `rational.ts`** | `factorial(n)` (n <= 18, throws beyond), `arrangements(n,k)` = A(n,k), `chooseSafe`, `pascalRow(n)`, `outcomeCountOf(draw,n,k)` (by formula: `C(n,k)`, `A(n,k)`, `n^k`), `enumeratePatterns(n,k,symbols)` (lexicographic, throws above 20 000) | identities C(n,k)=C(n,n-k), sum C(n,k)=2^n, A(n,k)=C(n,k)·k!, Pascal rows n=2..5 = 1,2,1 / 1,3,3,1 / 1,4,6,4,1 / 1,5,10,10,5,1; **table check against BigInt for all n <= 60**; the fix makes the intermediate product explicit (`out/g · (n-k+i)/(i/g)`), so the result is exact whenever it fits and **throws instead of being wrong** | all |
| **E2** | `engine/rationalFormat.ts` | `ratToString(f)` with U+2212, `ratToLatex`, `ratToDecimal(f)` (terminating -> string, else `null`), `parseRat(s)`, `RatSchema`, `isInteger`, `mulInt`, `floorRat`, `minRat/maxRat`, `sumRat` | "−1/2", `3/10 -> 0,3`, `1/6 -> null`, parse `0,3` `0.3` `3/10` equal | all |
| **E3** | `engine/grouping.ts` | `groupBySet(balls,k)`, `groupByPropertyCount(balls,draw,k,{value})` (combinatorial: simultaneous `C(a,j)C(b,k-j)`, ordered x k!, with replacement multinomial), `groupByKey(outcomes,keyFn)` (enumerating, throws above 20 000), `expandGroup(spec,key,limit)` (lists ONE group lazily: the k! orderings of a set, or the sets of a slice), each group `{key,label,count,sampleIds}` | for the 4R6N urn: 120 sets, 6 orderings each, 720 ordered; slices by reds **20/60/36/4** (sum 120) and ordered **120/360/216/24** (sum 720); property-based test: for random urns of at most 8 balls and k <= 3 the combinatorial counts equal enumeration; 12 balls k=4 with replacement counted without enumerating | GroupBoxes, EventAreaModel, ProbabilityTree, VariableTable |
| **E4** | `engine/distribution.ts` | `spreadFrame(values,probs)` -> `{mean, rows:[{x,p,d,d2,w}], variance}`, `distances`, `contributions`, `binomialLaw(n,p)` (guarded), `isSymmetric`, `sumIsOne`, `lawFromPatterns(patterns, weights, rule)`; re-exports `expectation/secondMoment/variance/binomialPmf` | **p = 3/10 on values 0,1: distances 3/10 and 7/10, squares 9/100 and 49/100, contributions 63/1000 and 147/1000, total 21/100** (the prototype's 0.21); total = p(1-p) for every p on the grid; three same-mean laws (mean 2) have variances 2/3, 1, 0 | SpreadSlider, BinomialExplorer, VariableTable, RepeatedRuns |
| **E5** | `engine/runs.ts` | `repeatedRuns(N, stages)` -> `{ok, counts:[N, N·p1, N·p1·p2...]}` or `{ok:false, stage, reason}` (never throws: the loader reports it); `cellsForStage(N, counts)` (contiguous block in reading order, deterministic); `tally(law, N)` -> `{rows:[{x,runs}], total S, average S/N}` with the integer-count rule | **N=36, p=1/6: 36 -> 6 -> 1** (6 runs with the event first, 1 with it twice); N=36, p=1/5 rejected (7.2); tally of the 2.a law; average = E(X) exactly; deterministic (same input, same cells) | RepeatedRuns, PartWholeBar |
| **E6** | `engine/coincidence.ts` | `wrongMethodValues(kind, params)`, `coincidences(kind, params)` -> `[{wrong:'sum'|'k_equals_kfact'|'p2_equals_p_over_2'|'n_over_k_vs_n_over_kfact'|'nk_vs_choose'|'arrangements_vs_choose'|'one_minus_p', value, equalsCorrect}]`, `assertNoCoincidence` (for `meantToDistinguish`) | **a+b = a·b only for a=b=2** (and zeros); k = k! for k = 1, 2; p² = p/2 only at p = 1/2; 24/3 = 8 vs 24/6 = 4 detected for n=4,k=3; the AND/OR pair 4 and 15 passes, 2 and 2 is rejected; the SpreadSlider checkpoint's candidate expressions are pairwise distinct at >= 2 grid points | ChoiceProduct, GroupBoxes, SlotsPattern, UrnTemplate, SpreadSlider |
| **E7** | `engine/expression/counting.ts` (new; the parser files are **not** edited) | `normalizeCounting(input, {maxArg: 20})` -> `{ok, text}` replacing `C(a;b)`, `C(a,b)`, `C_a^b`, `C_{a}^{b}`, unicode `C₆²`, `A(a,b)`, `a!` (integer args only) by integer literals, then the string goes to the existing `parseNumeric`; `substituteSymbols(input, {n,k})` for sampling | `C(6,2)`, `C(6;2)`, `C_6^2`, `C₆²` all -> 15; `A(6,2)` -> 30; `6!/(2!4!)` -> 15; `C(6, 2)` with a space; `C62` **refused** (ambiguous above 9); `C(6,2.5)` refused; decimal `6,2` outside `C(` still 6.2; no `eval`/`new Function` (the noEval test scans the folder); `C(n,k)/2^n` with `n=5,k=2` -> `10/32` | typed answers, NumericKeypad later |
| **E8** | `engine/binomialSafe.ts` | `binomialSafe(n, p)` -> `{ok}` or `{ok:false, n, p}` trying the whole pmf; `maxSafeN(p)` | current `binomialPmf` is exact for every k up to **n = 52 (p=1/2), 33 (1/3), 22 (1/5), 20 (1/6), 15 (3/10 and 7/10)** [measured with tsx]; the new test pins those and the loader/schema rejects any (n,p) grid in a BinomialExplorer that fails | BinomialExplorer, VariableTable |
| **E9** | `engine/tree.ts` | `drawTree(urn, draws, replacement, classBy)` -> nodes `{path, label, p (conditional), remaining}`, `pathProbability`, `collapse(tree, maxNodes)` | 4R6N, 3 draws without replacement: the ordered paths RNN, NRN, NNR each have probability (4·6·5)/(10·9·8) = 1/6, so P(exactly one red) = 3/6 = 1/2, matching P(A) | ProbabilityTree |
| **E10** | `engine/urnVariants.ts` | `generateUrnVariant({parent, template:'exactly_j'|'repeated_trials', seed, constraints})`, `freshCandidateOk(parentAnswers, parentWrongValues, candidate)`; the loader's `checkFreshVariants` is refactored to call the same function (no behaviour change) | seeded and deterministic; the candidate's answer differs from the parent's and from **every** wrong-procedure value of the parent **and** of the candidate (`runProcedure`); coincidence guard; bounded attempts, then a clear `EngineError`; the 4 hand-authored twins from `EX_URN_RN.md` all pass `freshCandidateOk` | UrnTemplate |
| **E11** | registry/catalog plumbing (not engine) | `reveals`, `offeredToPlanner`, `hintLevel` in `lessonState`, `FindingPayloadSchema`, `countInteractive` test helper | existing guard fixtures give identical results; every new component declares `reveals` | all |

**Components that need no engine change:** CompareTwo (C10), PartWholeBar (only E2 formatting). **Components whose engine work is small:** BinomialExplorer (E4, E8; `binomialPmf` exists), SlotsPattern (E1 patterns), SpreadSlider (E4), ChoiceProduct (E1, E6). **Largest engine dependency:** ProbabilityTree (E9) and UrnTemplate (E10).

---

## 5. Components

Common to all: `offeredToPlanner:false`, `explored` gate event, `finding` event, `getStateSnapshot`, readonly/replay mode, 44 pt targets, i18n prefix `pv2.<Name>.`, tokens `theme.pv2.<name>`. "Rat" = rational string. Effort: **S** about half a day, **M** about a day, **L** about two days of work including tests and screenshots (estimates, to be compared with actuals at each stop).

### Tier 1

#### C1. SpreadSlider (visual, gate `explored`) · effort **M** · engine E4, E6
**Evidence.** Variance: "distance from the mean" was not understood until a slider showed distances, squares and contributions.
**Props.**
```ts
{ values: int[]                       // 2..5 distinct integers, default [0,1]
  family:                              // how probabilities are produced
    | { kind:'bernoulli'; p: { min:Rat; max:Rat; step:Rat; init:Rat } }       // P(values[1])=p; at most 21 positions
    | { kind:'fixed'; probabilities: Rat[] }                                   // engine checks the sum is 1
    | { kind:'scenarios'; scenarios: { id:string; probabilities: Rat[] }[]; sameMean?: boolean }  // 2..3; loader rejects sameMean when the means differ
  show: { distances:boolean; squares:boolean; contributions:boolean; total:boolean }   // all default true
  totalLockedUntil?: { positions: 1..5 }         // default 3 when show.total; total hidden until that many DISTINCT positions were visited
  checkpoint?:
    | { kind:'larger_spread'; options: Rat[] }                                  // 2..4 p values: "which p gives the larger spread?"
    | { kind:'zero_at_ends'; expressions: string[] }                            // 3..5 safe-parser expressions in p, e.g. "p", "p^2", "p*(1-p)", "1-p"
  labels?: { mean?: Rich; spread?: Rich }; insight?: Rich }
```
**States.** `index` (position), `visited[]`, `checkpoint{answered,choice}`, `totalUnlocked`. Snapshot = those four.
**View.** SVG number line (values as ticks, mean marker with a triangle and a text label, **distance as a labelled segment**, **square drawn at a fixed scale beside the line with its side = the distance**, noted in text so area is not misread), `MathReadout` rows for distance, squared distance, probability, contribution, and a **stacked bar** of contributions whose total is the variance (flex Views; segment labels in text). Squares drawn at a scale token `theme.pv2.spread.squareScale`; at 360 pt the largest square (distance 1) is capped to the plot height.
**Events.** `slider_changed {index, p, visited}` (on commit), `checkpoint_answered {checkpoint, choice, correct}`, `explored {why:'3_positions'}`, `finding`.
**Finding.** `spread.bernoulli`: numbers `{p, mean, variance}` e.g. `{p:"3/10", mean:"3/10", variance:"21/100"}`, route `moved:1/10, moved:5/10, moved:3/10, checkpoint:p*(1-p)`.
**Reveals.** `variance` total: `by:'state'`, locked until `totalLockedUntil.positions`; the formula `p(1-p)`: `by:'state'`, only after the `zero_at_ends` checkpoint is solved or `minHint 'ladder_end'`. Per-position distances, squares, contributions are `by:'props'` partial values; they reveal V(X) only when summed, which the lock prevents.
**Checkpoint design note [derived].** At p = 1/2 several wrong formulas coincide (p(1-p) = p² = p/2 = (1-p)² = 1/4). The engine picks the sample points of the `zero_at_ends` check away from 1/2 and the loader rejects candidate sets that are not pairwise distinct at >= 2 grid positions (E6).
**Reuse (non-session).** (a) any Bernoulli: `values [0,1]`, `p` step 1/20; (b) three laws on values 1,2,3 with the same mean 2: (1/3,1/3,1/3), (1/2,0,1/2), (0,1,0): variances 2/3, 1, 0; (c) the original Ex2 law values −2,−1,0,2 with `kind:'fixed'`.
**Risks.** Squares at a fixed scale versus the line scale (labelled in text); five values clutter at 360 pt (cap at five, stack readouts); Arabic terms (distance بعد, contribution مساهمة, spread تبعثر) need teacher review; the `larger_spread` question has a symmetric answer (p = 1/10 and 9/10 tie): options must not include both.

#### C2. RepeatedRuns (visual, gate `explored`) · **M** · E5
**Evidence.** 36/(1/6) slip, 1/6+1/6, "average per round".
**Props.**
```ts
{ N: 4..60;                                           // 36 is the 6x6 case
  mode: 'fraction_of_total' | 'two_stage' | 'tally';
  stages?: { label: Rich; p: Rat }[];                 // 1..3; N·p1 and N·p1·p2 must be integers (loader)
  tally?: { values:int[]; probabilities: Rat[] } | { of: ValueFn };   // N·p_x must be integers
  interaction: 'shade' | 'watch';                     // shade: the student taps the cells; watch: a button advances the stage
  cols?: 4..10 }                                      // default 6; interactive only when N <= 36
```
**Modes.** `fraction_of_total`: the student shades "1/6 of 36" (tap cells; the count is shown only after a confirm). `two_stage`: stage 1 highlights N·p1 cells (6), stage 2 restricts to that subset and highlights N·p1·p2 (1): 36 → 6 → 1. `tally`: a table of value x, number of runs, runs × x, total S, average S/N (the student fills "total" and "average"; average = E(X)).
**Events.** `cell_tapped {index, selected}`, `stage_advanced {stage, count}`, `count_entered {stage, value, correct}`, `explored`, `finding`.
**Finding.** `runs.two_stage`: numbers `{N:"36", stage1:"6", stage2:"1"}`; `runs.tally`: `{N, S, average}`.
**Reveals.** The stage counts (6, 1): `by:'state'` (after the student shades or presses advance); `average`: `by:'state'` after S is entered.
**Interaction cap.** 36 cells at 44 pt, 6 columns; 37..60 cells are display-only with block shading and "tap a row" (a row of 6 or 10).
**Reuse.** Intersection of independent events (1/36 of runs); conditional probability (stage 2 inside the highlighted subset); expectation as an average. Non-session: N=60, stages 1/5 then 1/3 (60 → 12 → 4); tally of a fair die over N=60 (10 each, S = 210, average 7/2).
**Risks.** Contiguous block versus scattered cells (I choose contiguous: it reads as a part of a whole, not as randomness; open question Q8); "run" versus "round" wording (flagged); N is a *count of repetitions*, not outcomes of the urn, which must be clear in the label.

#### C3. SlotsPattern (task when `ask` is set, else visual) · **M** (bridge mode adds about 30%) · E1, E6
**Evidence.** Lists with missing items (SSFF, FSSF, SFS); C(n,k) = C(n,n−k); k = 2 coincidence; C(6,2) read as a product.
**Props.**
```ts
{ n: 2..7; k: 0..n;
  symbols?: { a:{id:'S',label:'S'}; b:{id:'F',label:'F'} };        // letters are LTR, plus a filled/hollow shape (never colour alone)
  mode: 'free' | 'guided' | 'build_pascal' | 'bridge';
  bridge?: { balls: { id:string; label:string }[] };               // n labels (e.g. 6 black balls); S = chosen
  ask?: { kind:'list_all' | 'count' };                             // present => task
  listCap?: 60 }                                                   // above C(n,k) = 60 the list is counts-only
```
**Behaviour.** The student taps slots to mark exactly k as S and presses "add to list". The engine knows all C(n,k) patterns. A duplicate is refused at once with a mark on the earlier row. A list that is not complete says **"something is missing"** without naming it; on request the help has 3 levels (1: confirm one is missing and how many slots remain free to move, never the count; 2: "the missing one has an S in slot j"; 3: show it). Level 3 needs `lessonState.hintLevel >= 2` or `showSolution`. `guided`: "where can the odd one go?" (k = 1, then k = 2 with the first S fixed). `build_pascal`: counts for n = 2,3,4,5 fill a Pascal row. `bridge`: the same slots drawn over the n balls; S = chosen, F = left in the box; flipping all S/F shows C(n,k) = C(n,n−k).
**Events.** `pattern_added {pattern, k, duplicate}`, `duplicate {pattern}`, `missing_hint_requested {level, missing: bool}` (no count in the payload), `count_confirmed {n, k, value, correct}`, `explored`, `finding`.
**Finding.** `slots.pattern_list`: `{n, k, count}`, route `added:SSFF…`, `missing_hint:1`, `confirmed`.
**Reveals.** `count` (= C(n,k)): `by:'state'`, only after the list is complete by the student's own work or `ladder_end`; the list itself: never auto-completed.
**Coincidence guard.** `k = 2` makes k = k!; a teaching example where the point is "orderings vs choices" must use k >= 3 (`meantToDistinguish`).
**Reuse.** Binomial coefficients; arrangements with repeated letters (AABB: n=4, k=2: 6 words); subsets ("which 2 of 4 questions did I get right"). Non-session: n=4,k=1 (4 patterns), n=5,k=2 (10 patterns); `bridge` with 6 labelled balls and k=2 (15).
**Risks.** Above 60 patterns it must go counts-only (C(8,4) = 70); S/F are French initials (Succès/Échec), LTR and isolated; the "odd one" wording; "missing" help must not leak the count.

#### C4. GroupBoxes (task when `ask`, else visual) · **M–L** · E3, E6
**Evidence.** 720/3 instead of 720/6; 24/3 = 8; "balls in the box" vs "orderings in the box".
**Props.**
```ts
{ balls: Ball[];                       // reuse BallSchema (coloured balls allowed), 1..12
  k: 2..4;                              // ordered draws; k! = 2, 6, 24
  groupBy: 'ball_set' | { property: ValueFn };         // boxes by the set of balls, or slices by a count of a property (exactly j reds)
  mode: 'show_all' | 'one_box_expanded' | 'counts_only';
  highlight?: { event: EventSpec };
  ask?: { kind:'boxes' | 'per_box' | 'slice_count' };   // present => task
  predictFirst?: boolean }              // default true with ask: the answer is hidden until the student predicts
```
**Behaviour.** Each box holds the **set of k balls (top)** and, expanded, its **k! orderings (inside)**. Only ONE box is expanded at a time. The student predicts the number of boxes (`prediction_entered`) before the boxes are counted for them. For the real urn (10 balls, k = 3: 720 ordered draws, 120 boxes) the component shows `counts_only` plus one expanded sample box and the line "120 boxes × 6 orderings"; `groupBy:{property: count_value(1)}` shows **4 slices with 20/60/36/4 boxes (of 120)**; each slice can open ONE box.
**Wrong-value diagnosis.** Typed `720/3`, `24/3` map to a new procedure `divides_by_balls_not_orderings` (in `procedures.ts` table for the step, added in content), and the component's feedback shows a box with 3 balls and 6 orderings side by side.
**Events.** `box_expanded {key}`, `prediction_entered {kind, value, correct}`, `explored`, `finding`.
**Finding.** `groupboxes.orderings_per_box`: `{boxes:"120", perBox:"6", ordered:"720"}`.
**Reveals.** `boxes` count and `orderings per box`: `by:'state'` (hidden until predicted when `predictFirst`); `slice counts` 20/60/36/4: `by:'props'` in `property` mode (reveals the answer of count-A steps; flagged for the guard).
**Reuse.** Any combination count; event slices. Non-session: 5 balls k=3 (60 ordered → 10 boxes of 6); 4 balls k=3 (24 → 4 boxes of 6, the 24/3 = 8 case).
**Risks.** Layout of up to 24 boxes with R₁ N₂ ball faces at 360 pt (3 columns); k = 2 forbidden for distinguishing examples (k! = k); the property mode overlaps C9 (section 9).

#### C5. ChoiceProduct (task when `ask`, else visual) · **M** · E1, E6
**Evidence.** 4×15 = 60, 19 = 4+15, 24 = 4×6, 120 = 4×30.
**Props.**
```ts
{ stages: ({ label:Rich; options: 1..12 | { id:string; label:string }[] }
          | { label:Rich; subset: { of: 2..12 | { id:string; label:string }[]; size: 1..4 } })[];   // 2..3 stages
  mode: 'and' | 'or'; allowSwitch?: boolean;               // switching shows the product area vs the sum bar
  showPairs: 'on_request' | 'never' | 'always';             // lists the C(6,2) = 15 pairs
  ask?: { kind:'total' | 'stage_count'; stage?: number };
  meantToDistinguish?: boolean }                            // default true: the coincidence guard rejects 2+2 and similar
```
**Behaviour.** The student picks one option in each stage (a subset stage = pick k of n balls, the chosen pair lights in the pair list); the grid cell at the intersection lights. AND shows rows × columns (4 × 15 = 60 cells, display-only); OR shows a stacked sum bar (4 + 15 = 19). "Show the 15 pairs" lists them on request.
**Events.** `option_picked {stage, option}`, `mode_switched {mode}`, `count_entered {value, correct, diag}`, `explored`, `finding`.
**Finding.** `choiceproduct.and`: `{stage1:"4", stage2:"15", total:"60"}`, route `picked…`, `switched_to_or`, `entered`.
**Reveals.** The product/sum: `by:'state'` after the student picked an option in every stage; the stage sizes (4 and 15): `by:'props'` partial.
**Reuse.** Any staged count; hypergeometric favourable counts C(a,i)×C(b,j). Non-session: starters × mains (3 × 4 = 12, never 2 × 2); choose 2 of 5 boys and 1 of 4 girls (10 × 4 = 40).
**Risks.** The 60-cell grid is a display, the 27 pickers are the interactive part; the pairs list is 15 chips (under the cap); do not name the two stages "reds/blacks" in a way that answers the question.

#### C6. VariableTable (task) · **L** · E1 patterns, E3, E4, E8 · decision: **new component** (not an extension of LawBuilder)
**Evidence.** X given as 1/4; sum 5/8; missing SFS; sum right but values wrong (1,8,4,2,1); X = 1 counted once.
**Why not LawBuilder.** LawBuilder is hard-bound to an urn experiment (`balls, draw, k, valueFn`; `prefilled` only seeds cells; its helpers are urn-driven). Our outcomes are patterns of S/F over n trials with **non-uniform weights** (P(SSF) = p²q), k up to 5 (the urn route caps k at 4 and 60 outcomes), and the checks must be **student-triggered with specific diagnoses**. Extending it would add four branches to a 682-line component that real lessons use and that must stay pixel-identical. Plan: new component; the pure helpers in `probability/logic.ts` are imported as they are; a presentational `LawTable` can be extracted afterwards behind a pixel diff.
**Props.**
```ts
{ outcomes: { kind:'trials'; symbols:['S','F']; n: 2..5 } | { kind:'urn'; balls; draw; k } | { kind:'authored'; outcomes:{id:string;label:string}[] };   // 60 max, else grouped
  rule: { id:'count_symbol'; symbol:'S' } | { valueFn: ValueFn };                   // engine maps outcome -> X, never authored
  weights: 'uniform' | { p: Rat };                                                  // trials with p: weight p^s q^(n−s)
  checks: ('all_used'|'sum'|'symmetry')[];                                           // buttons; none run automatically
  grouping?: { by:'value' } }                                                        // above 48 interactive outcomes
```
**Behaviour.** The student maps each outcome to a value (tap an outcome, tap a value column; a keypad for the probabilities), builds the law, then presses a check. Diagnoses: `missing_outcomes` (named only after the check is pressed twice or at hint 2), `duplicate`, `sum_mismatch` (shows the student's sum), `values_wrong` (counts per value disagree with the rule), `x_given_as_probability`, `counted_once` (X = 1 for SFS, FSS, SSF counted once).
**Events.** `mapping_changed {outcome, value}`, `check_run {check, passed, detail}`, `law_submitted {law, correct}`, `explored`, `finding`.
**Reveals.** The law (counts per value): `by:'state'` (never prefilled in the task); `sum`: `by:'state'` after the sum check.
**Reuse.** Law of the number of successes in n trials (n = 3, 4); law of a sum on an urn (existing urn mode, to show it covers LawBuilder's case); a custom `weights` with p = 1/3. Non-session: n=3 p=1/2 (1,3,3,1 over 8) and n=3 p=1/3 (8/27, 12/27, 6/27, 1/27).
**Risks.** Largest component; at n = 6 there are 64 outcomes (> 60) so it must group; keypad for rationals reuses `NumericKeypad` (`probability` kind).

#### C7. BinomialExplorer (visual, gate `explored`) · **M** · E4, E8, (E1)
Name reserved; the old spec in `COMPONENTS_PROBABILITY.md` §7 (`p`, `nRange`, `kShown`, `target`) is kept as a subset.
**Props.**
```ts
{ n: { min:int>=1; max:int<=10; init:int };       // loader proves binomialSafe for every (n,p) on the grid; larger n needs Q7
  p: { fixed: Rat } | { min:Rat; max:Rat; step:Rat; init:Rat };
  toggles: { mean:boolean; variance:boolean };
  formulaLockedUntilTaps?: 0..3;                   // default 2: two DISTINCT k values must have been tapped
  linkSlots?: boolean;                             // a button on the tapped bar opens SlotsPattern(n,k) in bridge mode
  target?: { type:'E_at_least'; value:Rat } }      // kept from the old spec: highlights the smallest n
```
**Behaviour.** Bars of P(X = k) from the engine; tapping bar k shows `C(n,k) p^k q^(n−k)` with the actual numbers; mean n·p and variance n·p·q markers on toggle; the general formula appears only after two concrete k were tapped (`reveals`: `formula`, `by:'state'`).
**Widths.** Bars of 44 pt do not fit past 7 values in 308 pt, so for n > 6 the chart gets a k-stepper (− / +) next to the bars and the bars are display-only (Q6).
**Events.** `n_changed`, `p_changed`, `bar_tapped {k}`, `toggle_changed`, `explored`, `finding`.
**Finding.** `binomial.formula`: `{n, p, k1, k2, mean, variance}`.
**Reuse.** LawChart bars: copy the view first, extract a shared `Bars` later (pixel diff). Non-session: n up to 8 with p = 1/6 (`6^8 < 2^53`); p = 7/10 with the Ex2 smallest-n target (n = 8).
**Risks.** 2^53 overflow (E8) bounds n; the link to SlotsPattern embeds an interactive component in a visual (use readonly bridge, not a nested spec: `CONTAINER_SLOTS` allows one level and bans nested tasks); registering the name breaks `components.test.tsx:63-72` (swap its unregistered name).

### Tier 2

#### C8. ProbabilityTree (visual explore / task fill) · **L** · E9
**Props.** `source: {kind:'urn'; balls; draws:2..3; replacement:boolean; classBy:'color'|'value'} | {kind:'authored'; root:Node}` with `Node {label, edges:{label, p:Rat, child?}[]}` (each node's edges must sum to 1; at most 3 levels × 4 branches), `fill:'none'|'edges'|'paths'|'sum'`, `highlight?: EventSpec`, `collapse: auto`.
**Behaviour.** Probabilities update after each draw without replacement (4/10, then 3/9 or 4/9...). The student fills edges, multiplies along a path, adds across paths. Above 24 leaves the tree collapses everything except the highlighted paths into "…" stubs.
**Events.** `edge_filled {edge, value, correct}`, `path_selected {leaf}`, `sum_entered {value, correct}`, `explored`, `finding`.
**Reveals.** Edge values `by:'state'` in `fill:'edges'`; path/sum results `by:'state'`. In `fill:'none'` every conditional probability is shown (so a step asking for it is revealed).
**Reuse.** Conditional probability, total probability, Bayes (authored tree). Link to this exercise: **4R6N without replacement, ordered: the 3 paths with exactly one red are 1/6 each, total 1/2 = P(A)** (D35's valid ordered method).
**Risks.** No tree layout exists; 360 pt needs `Expandable` (full-screen) or horizontal scroll; fractions in SVG text are untested (use plain `3/10` in `SvgText`, STIX); the effort is the largest of tier 2.

#### C9. EventAreaModel (visual) · **M** · E3 · decision: **new component, ComplementView untouched**
**Evidence.** The complement trap: 1 − P(A) = 1/2, but P(B) = 1/6: B is the 20-draw slice of the 60-draw complement of A.
**Why not extend ComplementView.** It is a fixed two-segment bar for `{event, direction}` with a tap-to-reveal of the unknown side; the trap needs 3 to 8 slices, event selection, intersection/union overlays, and a conditional zoom. Changing it would touch a component used in 1.b, 2.a and two deep dives. EventAreaModel can offer a `complement` overlay that reproduces ComplementView's meaning; if it covers the use, ComplementView can later be marked superseded (recommendation, not done).
**Props.** `source: {kind:'urn'; balls; draw; k; partitionBy: ValueFn} | {kind:'authored'; slices:{id,label,count:int}[]}` (<= 8 slices), `events: {id; label (LTR math); slices: string[]}[]` (<= 4), `overlays: ('complement'|'intersection'|'union'|'conditional')[]`, `labels:'hidden'|'counts'|'probabilities'`, `ask?`.
**Behaviour.** Bar/rectangle widths ∝ counts (20/60/36/4 of 120). Selecting A highlights 60; **complement** highlights 20+36+4 = 60 and shows B as only the 20 slice; **conditional** zooms into the selected subset and re-bases the whole. Slices narrower than a minimum width get a callout label (4/120 = 3% of the width).
**Events.** `event_selected {ids}`, `mode_switched {overlay}`, `prediction_entered {value, correct}`, `explored`, `finding`.
**Reveals.** Slice counts/probabilities: `by:'props'` unless `labels:'hidden'` (then `by:'state'` after the student predicts).
**Reuse.** Complement, union/intersection, conditional probability. Non-session: a fair die (6 slices of 1; A = even, B = at least 5); the Ex2 law of X on its urn.
**Risks.** Overlap with GroupBoxes' property mode (section 9); minimum slice width; the 2-D independent-events variant (rows × columns) is out of the first slice.

#### C10. CompareTwo upgrade · **S** (tests and demos only)
Each side already carries its own `balls/draw/k` [read]; the existing intro uses `simultaneous` vs `ordered_with_replacement`. Deliver: demo cases for all three settings (`simultaneous`, `ordered`, `ordered_with_replacement`), a test that the two sides resolve independently and that each respects its own cap, and a note that the sides stack vertically. **Gap if you want more:** cross-highlighting (tap {R1,N1} on the left, see its 2 ordered draws on the right). That is GroupBoxes' job, so I recommend not adding it here.

#### C11. UrnTemplate for ExampleGenerator · **M** · E6, E10
**Today.** `EXAMPLE_TEMPLATES` has two analysis templates; ExampleGenerator renders LaTeX `lines`. The fresh-variant rules (`checkFreshVariants`) apply to authored variants only.
**Design.** Two new template ids, `urn_exactly_j` (composition (r,b), k, "exactly j of a colour": total, count, probability) and `repeated_trials_table` (n, p, law table). `generateUrnVariant` is seeded (same `rng`), engine-verified (`runEngineCall`), and enforces: the answer differs from the parent's answer and from every known wrong-procedure value of the parent **and of the candidate**; the coincidence guard (E6); bounded attempts. The same `freshCandidateOk` is called by the loader, so the rule lives in one place and the existing `freshVariants.test.ts` must pass unchanged. It also serves authoring: a test helper proposes fresh-variant candidates for `afterReveal` transfers. ExampleGenerator shows a *worked* example, so its answer must never equal the step's answer (guaranteed by the parent constraint).
**Props.** `{ templateId: 'urn_exactly_j'|'repeated_trials_table'; seed: 1..10000; parent?: { urn: Ball[]; k:int; event: EventSpec } }` (extends `ExampleGeneratorPropsSchema`).
**Reuse.** Non-session: 3R 5N k=3 (total 56, exactly one red 30 → 15/28); 5R 5N k=2 (45, 25 → 5/9), both from `EX_URN_RN.md`.
**Risk.** Small search space (few urns satisfy all constraints): the generator must fail loudly, not loop.

#### C12. PartWholeBar (visual) · **S** · E2, E5
**Props.** `{ whole: Rat; part?: Rat; mode:'place'|'fraction_of_quantity'|'feedback'; fraction?: Rat; unit?: Rich; ticks?: int }`.
**Behaviour.** `place`: a stepped drag/tap puts the student's number on a bar from 0 to the whole; a part larger than the whole is flagged with an overflow arrow, the text "more than the whole" and a dashed end (never colour alone): 120/60 = 2 exceeds 1; "12 of 6". `fraction_of_quantity`: shades 1/6 of 36 (reveals 6 only after the student places a value). `feedback`: the lesson passes a diagnosed wrong value and its whole (`readonly`, no answer revealed).
**Events.** `value_placed {value, whole, ratio}`, `exceeds_whole {value, whole}`, `explored`, `finding`.
**Reveals.** `fraction_of_quantity` part: `by:'state'`; `feedback` mode reveals nothing about the correct value (only the comparison).
**Reuse.** Probability above 1; percentages; non-session: 3/4 of 20 (15), and a probability bar 0..1 with 5/6.
**Risk.** Overlap with RepeatedRuns' `fraction_of_total` (1-D vs 2-D); keep both, share only E2.

---

## 6. Performance at 120+ outcomes

| Layer | Fact | Status |
|---|---|---|
| Engine enumeration | 120 → 11 880 outcomes in 0.3 to 4.9 ms on Node 24 (desktop) | **[measured, not Hermes, not Android]** |
| Engine design | E3 counts slices and boxes by formula (no enumeration) and caps enumerating fallbacks at 20 000; `law` is quadratic per group and is not used for large sets | **[derived]** |
| Schemas | New caps are checked by formula (`outcomeCountOf`), not by enumerating, avoiding the `checkExperiment` pattern (20 736 outcomes built to be rejected) | **[derived]** |
| Rendering | Every component has a worst-case interactive count: SpreadSlider <= 12, RepeatedRuns 36 (interactive) / 60 (display), SlotsPattern <= 7 slots + 60 list rows, GroupBoxes <= 24 boxes + 24 orderings, ChoiceProduct <= 27 pickers (the 60-cell grid is display), VariableTable <= 48 outcomes + columns + cells, BinomialExplorer <= 16, ProbabilityTree <= 24 after collapse, EventAreaModel <= 16, PartWholeBar <= 3 | **[derived]**; a `countInteractive` test enforces it at worst-case props |
| 60 fps feed | A drag tick is a lookup + one `setState` at a snapped change; precomputed frames; no feed re-render (the existing test "tap does not re-render the feed" pattern is copied) | **[unverified]** on a phone; render counts testable in Jest (`probe`) |
| Hermes / cheap Android | Not measured. Needs: enumerate 5040 outcomes and render GroupBoxes at 24 boxes on a low-end device | **[unverified]**, listed under "could not verify" |

---

## 7. Build order and the smallest first slice

**Phase 1 (tests only):** E1 (with the `choose` fix) → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9 → E10 → E11 (registry/catalog/guard plumbing, `offeredToPlanner`, `reveals`, finding schema). Order is by dependency; E9 and E10 can slip to Phase 3 since only tier 2 uses them.

**Smallest first slice that lets `bac2022c-sc-ex2` question 1 use pictures proactively** (needs only E1, E2, E3, E6, E11):
1. **GroupBoxes** (step `s4`, total: ordered 720 grouped into boxes of 6 → 120; the 720/3 slip is visible).
2. **ChoiceProduct** (step `s6`, count A: 4 reds × the 15 pairs of blacks, AND vs OR 19, the pairs list).
3. Small add-ons that use the same engine: **PartWholeBar** (S; step `s8`: 120/60 = 2 is more than the whole) and **SlotsPattern bridge** (the C(6,2) = 15 patterns link to the pair list; this is the "binomial symbol read as a product" fix).

**Phase 2 order, my recommendation (Part 1 first), keeping your three stops:**

| Stop | Components | Why |
|---|---|---|
| A | GroupBoxes, ChoiceProduct, SlotsPattern (bridge), + PartWholeBar | The first three evidence lines (binomial symbol read as a product, dividing by the wrong count, the k=2 and 2+2 traps) are question 1; these have an authored home today |
| B | SpreadSlider, RepeatedRuns | Question 3 (variance, runs); no authored home until question 3 is written |
| C | VariableTable, BinomialExplorer | Question 3 as well; largest component (VariableTable) last |

Your order (SpreadSlider, RepeatedRuns, SlotsPattern | GroupBoxes, ChoiceProduct | VariableTable, BinomialExplorer) is equally feasible; it simply delays the components that fix the failures you observed on step b. Tier 2 (Phase 3) order: EventAreaModel, UrnTemplate, ProbabilityTree, CompareTwo demos.

**Phase 4 (wiring), as I read the repo:** question 1 gets authored alternatives and deep dives: `alt-1-s4-boxes` (GroupBoxes), `alt-1-s6-choice` (ChoiceProduct, plus a SlotsPattern bridge deep dive for C(6,2)), a PartWholeBar feedback line for `120/60`, each with `solutionPhrases`, procedure rows (for example `divides_by_balls_not_orderings`) and `finding` payloads. The current flow is not removed. Components for question 3 get demos and dev cases only unless you authorise question 3 content (Q2).

---

## 8. Test strategy, changed tests, screenshots

**Baseline [measured 2026-10-27]:** `npx jest` 126 suites, 1607 passed, 11 todo, 24 s. I did **not** run `npm run check` (its `pretypecheck` runs `tools/llm-config/gen.js`, which rewrites a gitignored file; harmless but not read-only). In Phase 1 I will run it.

**Tests whose expectation or input will change (list, with reason; none weakened):**
1. `probability/components.test.tsx:63-72`: uses `BinomialExplorer` as the "unregistered name -> fallback" case. Registering it requires another unregistered name (for example `CounterexampleHunt`). *Input change; the assertion stays.* (Phase 2, stop C.)
2. `catalog.test.ts` (keys of `CATALOG_META` equal registered names): grows with entries. *Additive.*
3. If `offeredToPlanner` were not used: `catalog.test.ts.snap`, `strictSchema.test.ts:85-117`, the cached prompt. *Avoided by the flag.* To be proved in Phase 2 (a test: `plannerFormat()` output byte-identical before and after).
4. `App.test.tsx:26-30` (exactly one `component-fallback` on the Proba tab): new demo cases must all be valid. *No change if they are.*
5. `__tests__/contrast.test.ts`: new tuples. *Additive.*
6. `rational.ts` `choose`: behaviour changes only where it was wrong or threw (n >= 55 / C(59,22), C(59,37)); no existing test depends on that range. *Reported in the Phase 1 report.*

**New guard tests (new code only):** reading sides and no-`row-reverse` on `probability2/**`; U+2212 in rendered numbers; every new i18n key listed for review; every new component declares `reveals` and `offeredToPlanner:false`; `countInteractive` at worst case; `FindingPayloadSchema` per component; coincidence guard on every demo parameter set.

**Screenshots and pixel identity (the protocol; tooling does not exist):**
- Simulators: iPhone 17 Pro (402 pt) and iPhone 16e (390 pt) exist. **360 pt does not**: I will add a debug-only `-devWidth` wrapper to the Proba demo tab (`-devWidth` today clamps only the lesson column). It reads the existing launch option, so `check:release-dev` still passes (to be re-run), and nothing renders differently when the argument is absent.
- All with `-devLlm off` (no AI client is built). I will never run `npm run replay -- eval` (the only paid command).
- **Before any change:** capture every existing demo case (`-devComponent X#n` for each existing component and the unfiltered Proba and Analysis tabs), the picker, the two lessons (2.a, 1.b) and the new exercise's question 1, at 402 and 390; capture twice to prove determinism; mask the status bar rows and the perf-timing line (as in D3/E5).
- **After each stop:** diff against the "before" set; any pixel that changed in an existing screen is reported, and none is expected. New demo cases are **appended after the existing cases** so existing `#n` indexes do not move.
- **Tool:** a ~80-line dependency-free Node script (zlib PNG decode + per-pixel compare + mask) in `tools/screens/`, untracked until you decide. No new npm dependency. `xcrun simctl io booted screenshot` takes the shots.
- **Stated per claim:** every stop's report will separate **tests-only** from **simulator-checked**. Tap flows cannot be automated on this machine (no Accessibility permission, PROGRESS.md D5): taps will be tests-only unless you play them.

---

## 9. Arabic terms for teacher review (new DECISIONS entry, D36; all `reviewed:false`)

Flagged by you: draw **مرّة** vs round **جولة**; box **علبة** vs group **مجموعة**; distance **بعد**; contribution **مساهمة**; spread **تبعثر**; independent **مستقلة**.
Added by me (concept first; Arabic proposed at authoring time, not now): *slot* (a position in a row), *pattern* (a string like SFSF), *success/failure* shown by S/F letters, *average* vs *total*, *tree*, *branch*, *the odd one*, *something is missing*, *more than the whole*. Each i18n key is under `pv2.*`; the D36 entry will list every Arabic string with the component and step it appears in, with a note of what it must not reveal (as D34 does).
Digits and French terms stay in their own runs (`{fr}` runs / `math` field); S, F, R, N are LTR letters with a shape as well as a colour.

---

## 10. Questions for you (each with my default)

1. **Order.** Part-1-first (my recommendation, section 7) or your listed order? *Default: Part-1-first, same three stops.*
2. **Phase 4 scope.** Question 1 is the only authored question. Do you want (a) Phase 4 to wire only the components that fit question 1 and leave the others as demos, or (b) permission to author question 3 (law, E(X), V(X), the 36-run and variance pictures) as part of Phase 4? D35 says question 2 and 3 wait for your OK. *Default: (a).*
3. **`offeredToPlanner:false`** for all new components until an AI round is approved. *Default: yes.*
4. **Folder.** `src/components/probability2/` for components, and new `src/engine/*` modules. *Default: yes.*
5. **Rationals on the wire as strings** (`"1/6"`), not `[1,6]` tuples like LawChart. *Default: strings.*
6. **BinomialExplorer bars:** tappable bars up to n = 6, then a k-stepper with display-only bars (44 pt rule). *Default: yes.*
7. **Exactness range.** Keep `number`-based rationals and make the loader reject any (n, p) that overflows (n <= 15 for p with denominator 10), or introduce a BigInt rational (Hermes supports BigInt, **unverified on this app's engine**)? *Default: keep numbers and reject; BigInt only if you need n > 15.*
8. **RepeatedRuns cells:** contiguous block (reads as a part of a whole) or scattered (reads as chance)? *Default: contiguous.*
9. **C(n,k) typing:** accept the numeric pre-pass in Phase 1 (E7) and keep symbolic questions numeric-first? Or do you want a structured formula keypad (C, n, k, !, ^) for Part 3's `C(n,k)/2^n`? *Default: pre-pass now, keypad later if wanted.*
10. **`COMPONENTS_CONTRACT.md` rule 10 and `CLAUDE.md`** say "Reanimated shared values". The code does not use Reanimated. May I correct the text (docs only) in Phase 1? *Default: yes.*
11. **Screenshot tooling:** keep the small Node diff script in `tools/screens/` untracked (you said do not commit anything), or delete it at the end? *Default: keep untracked.*
12. **GroupBoxes `property` mode vs EventAreaModel.** Both show 20/60/36/4. Implement the slice view once (in EventAreaModel) and let GroupBoxes reuse it, or keep two? *Default: one shared internal `SliceBar`, built with GroupBoxes first.*
13. **The `choose` fix** changes existing engine code (only where it was wrong or threw). OK to include in Phase 1? *Default: yes.*

---

## 11. Risks, and what I would cut or merge

- **Cut/merge candidates.** (1) CompareTwo upgrade: nothing to build; keep the demo cases only (C10). (2) GroupBoxes `property` mode and EventAreaModel overlap; one shared slice view (Q12). (3) PartWholeBar and RepeatedRuns' `fraction_of_total` overlap; keep both, tiny. (4) ProbabilityTree is the biggest tier-2 item and the only one needing a layout engine; schedule it last and consider cutting `fill:'sum'` and Bayes authoring from the first version. (5) VariableTable `symmetry` check: build only if the SlotsPattern evidence (C(n,k) = C(n,n−k)) is not enough.
- **Risks.** Device performance and Android layout are not measurable here. 360 pt is simulated by a wrapper, not a device. The pedagogy (picture, then a question, then the rule card) is enforced by content authoring and by `reveals`, not by components alone: a component cannot know it is being used formula-first. Arabic quality depends on the teacher. Two other local Claude sessions were listed as idle (they may or may not be on this repo); I will re-check `git status` before each stop and never touch files I did not create.
- **Could not verify in Phase 0.** Anything on a device; Hermes enumeration cost; whether `wireFormat.ts` derives its enum from `plannerComponents`; the exact inner-panel width at 360 pt (derived from tokens); BigInt on this engine.

---

## 12. What happens on approval

1. I copy this file to `docs/COMPONENTS_PROBABILITY_V2.md` (the only write), run `git status` to show that it is the only change, and **stop**.
2. I wait for your answers to section 10. No Phase 1 work, no baseline screenshots, no tool scripts until then.
3. Phase 1 starts with the baseline captures (twice), then tests for E1 first.
