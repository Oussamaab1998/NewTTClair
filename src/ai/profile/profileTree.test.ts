/**
 * The profile's maps cover a probability tree: every step of the four tree
 * templates trains a skill, and every wrong road the engine can name on the
 * exam's numbers (kept slips, slips that give the right value, traps and the
 * catch-all coincidence) points at one.
 */
import { SKILLS } from '../../content/skills';
import '../../method/library';
import { mutationsFor } from '../../method/mutations';
import { buildGraphFor } from '../../method/templates';
import { COINCIDENCE, TREE_TEMPLATE_IDS } from '../../method/templatesTree';
import { recordLine } from '../checks/autoCheck';
import { newSession } from '../session/state';
import { applySession, emptyProfile, NODE_SKILL, SLIP_SKILL } from './profile';

const EXAM = { pA: [2, 3], pFgA: [1, 4], pF: [5, 12] };
/** Another tree: roads that are traps on the exam's numbers are plain slips here. */
const OTHER = { pA: [4, 5], pFgA: [3, 8], pF: [2, 5] };

const graphOf = (template: string, args: object) =>
  buildGraphFor({ template, args: args as never }, { inputs: {} });

const TREE_SKILLS = [
  'probability-tree',
  'conditional-probability',
  'total-probability',
  'reverse-conditional',
  'complement-event',
  'fractions-operations',
];

describe('the profile maps on a probability tree', () => {
  it.each(TREE_TEMPLATE_IDS)('%s: every step trains a tree skill', id => {
    for (const n of graphOf(id, EXAM).nodes) {
      expect(TREE_SKILLS).toContain(NODE_SKILL[n.id]);
    }
  });

  it.each(TREE_TEMPLATE_IDS)(
    '%s: every wrong road the engine names points at a tree skill',
    id => {
      for (const args of [EXAM, OTHER]) {
        const table = mutationsFor(graphOf(id, args));
        const slips = new Set([
          ...table.kept.map(c => c.id),
          ...table.dropped.map(d => d.id),
          ...(table.traps ?? []).map(c => c.id),
        ]);
        expect(slips.size).toBeGreaterThan(0);
        for (const slip of slips) {
          expect(TREE_SKILLS).toContain(SLIP_SKILL[slip]);
        }
      }
    },
  );

  it('names skills of the skill map, and the catch-all coincidence', () => {
    for (const skill of TREE_SKILLS) {
      expect(SKILLS.has(skill)).toBe(true);
    }
    expect(SLIP_SKILL[COINCIDENCE]).toBe('probability-tree');
    for (const skill of [
      ...Object.values(NODE_SKILL),
      ...Object.values(SLIP_SKILL),
    ]) {
      expect(SKILLS.has(skill)).toBe(true);
    }
  });

  it('counts a tree slip and a tree credit in a finished question', () => {
    const graph = graphOf('tree_conditional', EXAM);
    const rt = newSession(
      'bac2022p-sc-ex2',
      't2',
      { id: 'main', graph, table: mutationsFor(graph), extra: [] },
      ['2/3', '1/4', '5/12'],
    );
    const on = (node: string) =>
      ({ kind: 'node', graph: 'main', node } as const);
    recordLine(rt, '1-2/3=1/3', on('not_a'));
    // The complement of the other node: the right number, a wrong road.
    recordLine(rt, '1-1/4=3/4', on('f_given_na'));
    recordLine(rt, '(1/4)/(1/3)=3/4', on('f_given_na'));
    const p = applySession(emptyProfile(1), {
      state: rt.state,
      outcome: 'solved_with_help',
      summary: '',
      nextTime: '',
      now: 2,
    });
    expect(p.skills['complement-event']).toMatchObject({ firstTry: 1 });
    expect(p.skills['conditional-probability']).toMatchObject({
      afterHelp: 1,
      slips: { complement_across_nodes: 1 },
    });
    expect(p.sessions[0]!.slips).toEqual(['complement_across_nodes']);
  });
});
