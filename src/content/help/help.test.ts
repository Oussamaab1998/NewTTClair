/**
 * The help files (schema.ts), for every exercise of the app (CATALOG): each
 * has one, it parses, and it keeps every rule of checks.ts, the same rules
 * `npm run check:exercise -- <id>` runs while an exercise is being written:
 * - every step where he writes a line or picks a card has its three levels;
 *   a line step's third level has a line to fill, a card step's has none;
 * - no text asks (no «؟» or "?"), no banned darija word;
 * - every formula is drawn by the math renderer;
 * - no level copies a card step's right card;
 * - the small example's numeric lines are true (the engine computes them),
 *   and none gives a value of the similar questions;
 * - the line to fill, filled with its answer, earns credit on its step once
 *   the earlier steps are his (the conductor judges it like a typed line);
 * - every figure is drawable; a glossary with unique ids.
 * Each exercise's own test (bac2022c-ex2.test.ts, ...) checks what these
 * general rules cannot (its values, its function).
 * Run one exercise: npx jest src/content/help -t bac2022c-ex4
 */
import { CATALOG } from '../../app/exercises';
import { HELP_CHECKS, type HelpInput } from './checks';
import { glossaryMatches, HELP_SOURCES, helpFor } from './help';
import { HelpFileSchema } from './schema';

const EXERCISES = CATALOG.map(e => e.id);

function inputOf(exerciseId: string): HelpInput {
  const entry = CATALOG.find(e => e.id === exerciseId);
  if (!entry?.result.ok) {
    throw new Error(`${exerciseId} does not load`);
  }
  const help = helpFor(exerciseId);
  if (!help) {
    throw new Error(`${exerciseId} has no help file`);
  }
  return { loaded: entry.result.loaded, raw: entry.raw, help };
}

test('every exercise of the app has a help file that parses', () => {
  for (const id of EXERCISES) {
    const r = HelpFileSchema.safeParse(HELP_SOURCES[id]);
    expect(
      HELP_SOURCES[id] === undefined
        ? 'no help file in HELP_SOURCES'
        : r.success
        ? r.data.exerciseId
        : r.error.message.slice(0, 400),
    ).toBe(id);
  }
});

test('no help file for an exercise the app does not have', () => {
  expect(
    Object.keys(HELP_SOURCES).filter(id => !EXERCISES.includes(id)),
  ).toEqual([]);
});

describe.each(EXERCISES)('%s', exerciseId => {
  test.each(HELP_CHECKS.map(c => [c.title, c] as const))(
    `${exerciseId}: %s`,
    (_title, check) => {
      expect(check.run(inputOf(exerciseId))).toEqual([]);
    },
  );
});

describe('glossaryMatches', () => {
  const id = 'bac2022c-ex4';
  const idsOf = (pressed: string) =>
    glossaryMatches(id, pressed).map(e => e.id);

  test('a French word inside another word is not a match ("paire" in "impaire")', () => {
    const inImpaire = idsOf('Montrer que h est impaire.');
    const paire = helpFor(id)!.glossary.find(e =>
      e.match.some(m => m.trim() === 'paire'),
    );
    expect(paire).toBeDefined();
    expect(inImpaire).not.toContain(paire!.id);
  });

  test('a whole sentence names the entries it holds; an empty press names none', () => {
    expect(idsOf('Montrer que f est paire.').length).toBeGreaterThan(0);
    expect(idsOf('   ')).toEqual([]);
  });
});
