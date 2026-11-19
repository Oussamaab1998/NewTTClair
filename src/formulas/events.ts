/**
 * The «Formules» events (rule 5; docs/FORMULAS_PLAN.md, stage 3), as the
 * fields each one adds to the common event fields of src/telemetry/events.ts.
 * They are joined to `EventSchema` (and written in docs/DATA.md) once the
 * «Mes erreurs» work on those files is committed (plan, "Files shared with
 * other work"); until then nothing emits them.
 *
 * Common fields, like «Mes erreurs»: its own session `formulas-…`,
 * exerciseId `formulas`, questionId the theme (`derivees`), stepId the rule
 * id, or `list` / `check` when no rule is meant.
 */
import { z } from 'zod';

import { ANSWER_VERDICTS } from './log';

const Id = z.string().min(1);
const Kind = z.enum(['complete', 'true_false', 'calc', 'recognise']);

/** He opened the list, the hide mode, or a rule card. */
export const FormulaViewFields = z.strictObject({
  t: z.literal('formula_view'),
  what: z.enum(['list', 'hide_mode', 'card']),
  ruleId: Id.optional(),
});

/** One drill answer (S’entraîner). `trapId` when the engine named a trap. */
export const FormulaDrillFields = z.strictObject({
  t: z.literal('formula_drill'),
  ruleId: Id,
  kind: Kind,
  verdict: z.enum(ANSWER_VERDICTS),
  trapId: Id.optional(),
});

/** The Vérif rapide: its start (how many items), each answer, its end. */
export const FormulaCheckFields = z.strictObject({
  t: z.literal('formula_check'),
  action: z.enum(['start', 'answer', 'end']),
  items: z.number().int().min(0).max(5).optional(),
  ruleId: Id.optional(),
  kind: Kind.exclude(['calc']).optional(),
  verdict: z.enum(['right', 'trap', 'wrong']).optional(),
  trapId: Id.optional(),
});

export const FORMULA_EVENTS = [
  FormulaViewFields,
  FormulaDrillFields,
  FormulaCheckFields,
] as const;
