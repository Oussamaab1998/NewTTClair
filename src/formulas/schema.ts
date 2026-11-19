/**
 * «Formules» content (docs/FORMULAS_PLAN.md, stage 1): one theme file holds
 * the rules of a theme (Dérivées first). A rule keeps its law as machine
 * expressions, never as LaTeX: the engine checks the law on sample functions
 * and the LaTeX the student sees is drawn from the same expressions
 * (display.ts), so what is shown is what was checked (hard rule 1).
 *
 * Machine expressions use the safe parser (src/engine/expression) with the
 * letters of FORMULA_VARIABLES: x, the functions u and v, their derivatives
 * U (u′) and V (v′), a whole number n and a real k. Implicit products are
 * written as on paper ("Uv-uV" is u′v − uv′).
 *
 * The French is simple, for the student, and `reviewed: false` until a
 * Tunisian maths teacher reads it (CLAUDE.md).
 */
import { z } from 'zod';

/** The letters a law may use. U is u′ and V is v′. */
export const FORMULA_VARIABLES = ['x', 'u', 'v', 'U', 'V', 'n', 'k'] as const;
export type FormulaVariable = (typeof FORMULA_VARIABLES)[number];

/** An expression for the safe parser, in FORMULA_VARIABLES. */
const Machine = z.string().min(1).max(120);
/** Student-facing French text. */
const Fr = z.string().min(1).max(220);

/** A wrong form students write instead of the rule's derivative. */
export const TrapSchema = z
  .object({
    /** Unique in its rule, e.g. "forgot_square". */
    id: z.string().regex(/^[a-z][a-z0-9_]*$/),
    /** The wrong derivative, in the law's letters. */
    d: Machine,
    /** A name for the error, like «Oublier le carré» (no full stop). */
    title: Fr,
    /** One or two sentences with the rule (ends with a full stop). */
    why: Fr,
  })
  .strict();
export type Trap = z.infer<typeof TrapSchema>;

/** A worked function: f, its derivative, and the parts the rule reads in it. */
export const ExampleSchema = z
  .object({
    /** f(x), in x only. */
    f: Machine,
    /** f′(x), in x only, as the student would end. */
    d: Machine,
    /** The domain in words, like «pour x ≠ 3». */
    where: Fr.optional(),
    /** The parts: f is the law's function with these (each in x). */
    u: Machine.optional(),
    v: Machine.optional(),
    n: z.number().int().optional(),
    k: z.number().optional(),
  })
  .strict();
export type FormulaExample = z.infer<typeof ExampleSchema>;

/** «Complète»: the derivative with one hole and four tiles for it. */
export const CompleteSchema = z
  .object({
    /** The rule's derivative with exactly one "?" for the hole. */
    template: Machine.regex(/^[^?]*\?[^?]*$/, 'exactly one "?"'),
    tiles: z.array(Machine).length(4),
    /** Index of the one tile that makes the law true. */
    right: z.number().int().min(0).max(3),
  })
  .strict();
export type Complete = z.infer<typeof CompleteSchema>;

export const RuleSchema = z
  .object({
    /** "<theme>.<name>", e.g. "deriv.quotient". */
    id: z.string().regex(/^[a-z]+\.[a-z0-9_]+$/),
    /** Its usual name, like «Dérivée d’un quotient». */
    name: Fr,
    /** Curriculum chapters that teach it, all of one school year. */
    chapters: z.array(z.string().min(1)).min(1),
    /** The law: the derivative of `of` is `d`. */
    law: z.object({ of: Machine, d: Machine }).strict(),
    /** When it holds, like «u et v dérivables sur I, v(x) ≠ 0 sur I». */
    condition: Fr.optional(),
    /** How it is said aloud in French. */
    say: Fr,
    example: ExampleSchema,
    traps: z.array(TrapSchema).min(1).max(4),
    /** The justification sentence for the exam copy. */
    copy: Fr,
    complete: CompleteSchema,
  })
  .strict();
export type FormulaRule = z.infer<typeof RuleSchema>;

export const ThemeSchema = z
  .object({
    v: z.literal(1),
    /** e.g. "derivees". */
    theme: z.string().regex(/^[a-z][a-z0-9-]*$/),
    /** French title, e.g. «Dérivées». */
    title: Fr,
    reviewed: z.boolean(),
    rules: z.array(RuleSchema).min(1),
  })
  .strict();
export type FormulaTheme = z.infer<typeof ThemeSchema>;
