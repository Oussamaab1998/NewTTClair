/**
 * The «Formules» themes bundled with the app. Parsed at import: a broken
 * file is a build bug, caught by the tests (checks.test.ts runs every rule
 * of every theme through checks.ts).
 */
import derivees from '../content/formulas/derivees.json';
import { ThemeSchema, type FormulaRule, type FormulaTheme } from './schema';

export const THEMES: readonly FormulaTheme[] = [ThemeSchema.parse(derivees)];

const ruleIndex = new Map(
  THEMES.flatMap(t => t.rules.map(r => [r.id, r] as const)),
);

export function ruleById(id: string): FormulaRule | null {
  return ruleIndex.get(id) ?? null;
}
