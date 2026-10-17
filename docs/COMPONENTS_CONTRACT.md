# Component contract (shared by JSON content and AI output)

A **component** is a prebuilt, validated React Native view that content or the planner can request by name. The planner chooses from this menu; it never writes UI.

## Interface
```ts
type ComponentName =
  | "Urn" | "OutcomeSpace" | "EventPicker" | "ComplementView" | "LawBuilder" | "LawChart" | "BinomialExplorer"
  | "FunctionPlot" | "PointOnCurve" | "FoldSymmetry" | "TangentSlope" | "SecantToTangent"
  | "VariationTableBuilder" | "AreaUnderCurve" | "LimitExplorer" | "CurveCompare" | "SequenceExplorer" | "InverseMirror"
  | "NumericTwin" | "WorkedExample";

interface ComponentSpec { component: ComponentName; instanceId?: string; props: unknown; }

interface ComponentHostProps<P> {
  props: P;                                         // validated by the component's zod schema
  mode: "interactive" | "readonly" | "replay";
  locale: "ar-TN" | "fr";
  onEvent: (e: ComponentEvent) => void;             // every meaningful interaction
  onResult?: (r: ComponentResult) => void;          // task components only
}
interface ComponentEvent { component: ComponentName; instanceId: string; name: string; payload: Record<string, unknown>; ts: number }
interface ComponentResult { correct: boolean | null; details: Record<string, unknown>; misconceptionHints?: string[] }

// registry.ts
registry[name] = { component, schema: ZodSchema, kind: "visual" | "task", weight: "light" | "heavy", teaches: string[] /* skill ids */ }
```

## Rules
1. **JSON-safe props only.** No functions, no code strings. Functions are referenced by *engine ids* (e.g. `valueFn: "product"`, `event: { id: "any_value", args: { value: 0 } }`, `fn: "exp_ratio"`). Engine registries live in `src/engine`.
2. **Validate before render** (zod). On invalid props, unknown component, or runtime error: render nothing (or a neutral fallback text block) and log `component_error`. Never crash the feed.
3. **Deterministic**: same props + seed => same output. No network. Randomness only via a provided `seed`.
4. **Math values come from the engine**, never from props typed by an LLM. If a prop carries an expected value, the engine recomputes and compares in dev.
5. **Layout**: full width of the feed, collapsed height 180-260 pt, tap-to-expand to full screen. Readouts (numbers) always visible next to the graphic.
6. **Teaching pattern** for visuals: predict (optional) -> interact -> one insight sentence -> question. The component exposes `insight` text slots for this.
7. **Accessibility/i18n**: labels in ar-TN and fr; not color-only; respect reduce-motion; touch targets >= 44 pt.
8. **Events** must include enough payload for diagnosis (selected ids, correct ids, values, parameters), not just "tapped".
9. **Replay mode** renders a recorded interaction without side effects (for the replay harness and for showing a student's past work).
10. **Performance**: precompute point arrays; avoid React state updates per drag tick (use Reanimated shared values); target smooth dragging on a cheap Android device (measure; do not assume).
11. Each component ships with: zod schema, demo screen, unit tests for any engine logic, and a short `teaches` list.
12. Any component that can be asked for by the AI must also work when called with *only its required props* (sensible defaults).

## Calling convention in JSON and AI output
```json
{ "component": "EventPicker", "props": { "urn": [-1,0,0,1,2], "draw": "simultaneous", "valueFn": "product",
  "event": { "id": "value_eq", "args": { "value": 0 } }, "task": "select_satisfying", "showFraction": true } }
```
