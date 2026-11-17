/**
 * Every slip a step written with a letter can name (its `knownWrong` lines)
 * is an entry of the shared slip library, for every method question of every
 * exercise and for their similar questions: the board names it, the library
 * says it.
 */
import { CATALOG } from '../app/exercises';
import type { MethodStep } from '../content/schema';
import { mutationLibrary } from './library';
import { buildGraphFor } from './templates';

const library = new Set((mutationLibrary() as { id: string }[]).map(m => m.id));

describe('slips of the lines written with a letter', () => {
  it('are all in the library', () => {
    let seen = 0;
    for (const e of CATALOG) {
      const raw = e.raw as {
        parts: { groups: { steps: { kind: string }[] }[] }[];
      };
      const methods = raw.parts
        .flatMap(p => p.groups.flatMap(g => g.steps))
        .filter(s => s.kind === 'method') as unknown as MethodStep[];
      for (const m of methods) {
        for (const g of [m.graph, ...(m.similar ?? []).map(s => s.graph)]) {
          let graph;
          try {
            graph = buildGraphFor(g, { inputs: {} });
          } catch {
            // An urn template needs its exercise's urn: it has no letter steps.
            continue;
          }
          for (const n of graph.nodes) {
            for (const w of n.expr?.knownWrong ?? []) {
              seen++;
              expect({ id: w.id, known: library.has(`mut.${w.id}`) }).toEqual({
                id: w.id,
                known: true,
              });
            }
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(10);
  });
});
