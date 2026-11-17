/**
 * The pack of a probability TREE question: its given numbers (the figure's
 * fractions, each one number) and the notes of bac2022p-sc-ex2, written for
 * the hybrid lesson only, then the exercise's own pack.
 */
import { CATALOG } from '../../app/exercises';
import { SKILLS } from '../../content/skills';
import { buildTiles } from '../../lesson/worksheet/tiles';
import '../../method/library';
import { mutationsFor } from '../../method/mutations';
import { buildGraphFor, templateOf } from '../../method/templates';
import type { GraphRuntime } from '../checks/lines';
import { buildExercisePack, givenNumbers } from './build';
import { hasTutorNotes, TUTOR_NOTES } from './notes';

const TREE = 'bac2022p-sc-ex2';
/** The template of each question (src/method/templatesTree.ts). */
const TEMPLATES: Record<string, string> = {
  t1: 'tree_other_path',
  t2: 'tree_conditional',
  t3: 'tree_complete',
  t4: 'tree_reverse',
};

function mainOf(template: string, args: object): GraphRuntime {
  const graph = buildGraphFor(
    { template, args: args as never },
    { inputs: {} },
  );
  return { id: 'main', graph, table: mutationsFor(graph), extra: [] };
}

const tree = mainOf('tree_other_path', {
  pA: [2, 3],
  pFgA: [1, 4],
  pF: [5, 12],
});
const urn: GraphRuntime = (() => {
  const graph = buildGraphFor(
    { template: 'urn_exactly_j', args: { j: 1 } },
    { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
  );
  return { id: 'main', graph, table: mutationsFor(graph), extra: [] };
})();

const STATEMENT =
  "On considère l'arbre de probabilité ci-contre où A et F sont deux évènements tels que la probabilité de F est $p(F) = \\frac{5}{12}$";
const WORDING = 'Montrer que $p(\\overline{A} \\cap F) = \\frac{1}{4}$';

describe('the given numbers of a tree question', () => {
  it('are the three fractions of the figure and the statement, each one number', () => {
    expect(tree.graph.domain).toBe('tree');
    const given = [...new Set(givenNumbers(tree, [STATEMENT, WORDING]))];
    // No 5, no 12, and no 2 for « deux évènements ».
    expect(given).toEqual(['2/3', '1/4', '5/12']);
  });

  it('read a fraction written with a slash or \\dfrac the same way', () => {
    expect(
      givenNumbers(tree, ['p(F) = 5/12 ; p(B) = \\dfrac{3}{12} ; 0,5 et 40']),
      // The graph's three, then the text's: \frac forms, a/b forms, the rest.
    ).toEqual(['2/3', '1/4', '5/12', '1/4', '5/12', '0.5', '40']);
  });

  it('give the worksheet one tile per given, never a part of a fraction', () => {
    const given = [...new Set(givenNumbers(tree, [STATEMENT, WORDING]))];
    expect(buildTiles(given, []).map(t => t.text)).toEqual([
      '2/3',
      '1/4',
      '5/12',
    ]);
  });

  it('are read as before on an urn question, and with no graph', () => {
    const texts = ['On tire 3 boules parmi 10 ; p = 0,5 ; deux fois 1/2'];
    const before = ['3', '10', '0.5', '1/2', '2', '1/2'];
    expect(givenNumbers(urn, texts)).toEqual(before);
    expect(givenNumbers(null, texts)).toEqual(before);
    // A fraction's parts are numbers of their own there (\frac is not read).
    expect(givenNumbers(urn, ['\\frac{5}{12}'])).toEqual(['5', '12']);
  });
});

describe(`the notes of ${TREE}`, () => {
  const notes = TUTOR_NOTES[TREE]!;

  it('exist for its four questions and never open the AI-led chat', () => {
    expect(Object.keys(notes)).toEqual(['t1', 't2', 't3', 't4']);
    for (const id of Object.keys(notes)) {
      expect(notes[id]!.hybridOnly).toBe(true);
      expect(hasTutorNotes(TREE, id)).toBe(false);
    }
    // The urn exercise keeps its AI-led chat.
    for (const id of ['1', '2', '3a', '3b']) {
      expect(hasTutorNotes('bac2022c-sc-ex2', id)).toBe(true);
    }
    expect(hasTutorNotes(TREE, 't9')).toBe(false);
    expect(hasTutorNotes('nowhere', '1')).toBe(false);
  });

  it.each(Object.keys(TEMPLATES))(
    '%s: a route line for every card of its template, known skills, no component',
    id => {
      const n = notes[id]!;
      const route = n.route.join('\n');
      for (const card of templateOf(TEMPLATES[id]!)!.cardKeys) {
        expect(route).toMatch(new RegExp(`card(s)? [a-z_, ]*\\b${card}\\b`));
      }
      expect(route).toMatch(/Never (say it )?first/);
      expect(n.components).toEqual([]);
      expect(n.notationAfter).toBeNull();
      expect(n.skills.length).toBeGreaterThan(0);
      for (const s of [...n.skills, ...n.prerequisites]) {
        expect(SKILLS.has(s)).toBe(true);
      }
      // English, model-facing, and without a value: the pack prints the engine's.
      expect(route).not.toMatch(/[؀-ۿ]/);
      expect(route).not.toMatch(/\d\/\d/);
    },
  );
});

describe(`the exercise pack of ${TREE}`, () => {
  const entry = CATALOG.find(e => e.id === TREE)!;
  const loaded = entry.result.ok ? entry.result.loaded : null;
  const pack = () => buildExercisePack(loaded!, entry.raw as never);

  it.each(Object.keys(TEMPLATES))(
    '%s: a tree question with its template, its notes and the figure fractions',
    id => {
      const q = pack().questions.get(id)!;
      expect(q.domain).toBe('tree');
      expect(q.main!.graph.template).toBe(TEMPLATES[id]);
      expect(q.notes).toBe(TUTOR_NOTES[TREE]![id]);
      // The three fractions the statement gives (two only on its figure), whole.
      expect(q.given.slice(0, 3)).toEqual(['2/3', '1/4', '5/12']);
      for (const part of ['2', '3', '5', '12']) {
        expect(q.given).not.toContain(part);
      }
      expect(buildTiles(q.given, []).map(t => t.text)).toEqual(
        expect.arrayContaining(['2/3', '1/4', '5/12']),
      );
      // Every plan card with a line is a step the notes speak of.
      const route = q.notes!.route.join('\n');
      for (const card of q.plan) {
        expect(route).toContain(card.key);
      }
    },
  );

  it('has no urn and leaves the urn exercise as it was', () => {
    expect(pack().experiment).toBeNull();
    const urnEntry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
    const urnPack = buildExercisePack(
      urnEntry.result.ok ? urnEntry.result.loaded : (null as never),
      urnEntry.raw as never,
    );
    for (const q of urnPack.questions.values()) {
      expect(q.domain).toBeNull();
    }
    // Its numbers are read as before (golden.scEx2.test.ts pins its bytes).
    expect(urnPack.questions.get('1')!.given).toEqual(
      expect.arrayContaining(['3', '4', '6', '10', '1/2']),
    );
  });
});
