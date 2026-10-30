import { REGISTRY } from '../../components/registry';
import type { ComponentName } from '../../components/contract';
import raw from '../../content/exercises/bac2022c-sc-ex2.json';
import misconceptions from '../../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { SKILLS } from '../../content/skills';
import { plain } from '../checks/lines';
import { buildExercisePack } from './build';
import { hasTutorNotes } from './notes';

function pack() {
  const r = loadExercise(raw, misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return buildExercisePack(r.loaded, raw as never);
}

const valuesOf = (id: string) => {
  const q = pack().questions.get(id);
  return Object.fromEntries(
    (q?.main?.graph.nodes ?? []).map(n => [n.id, plain(n.value)]),
  );
};

describe('exercise pack of bac2022c-sc-ex2', () => {
  it('has the engine values of every question', () => {
    expect(valuesOf('1')).toMatchObject({
      total: '120',
      fav: '60',
      result: '1/2',
    });
    expect(valuesOf('2')).toMatchObject({
      total: '120',
      fav: '20',
      result: '1/6',
    });
    expect(valuesOf('3a')).toMatchObject({
      seq: '1/128',
      count: '21',
      result: '21/128',
    });
    expect(valuesOf('3b')).toMatchObject({
      mean1: '1/2',
      meann: '7/2',
      var1: '1/4',
      varn: '7/4',
    });
  });

  it.each(['1', '2', '3a', '3b'])(
    'question %s has plan cards, a read target and notes',
    id => {
      const q = pack().questions.get(id)!;
      expect(q.plan.length).toBeGreaterThanOrEqual(3);
      expect(q.read.length).toBeGreaterThan(0);
      expect(q.notes).not.toBeNull();
      expect(hasTutorNotes('bac2022c-sc-ex2', id)).toBe(true);
      // Every card's dependencies are cards of the same plan.
      const ids = new Set(q.plan.map(c => c.id));
      expect(q.plan.every(c => c.needs.every(n => ids.has(n)))).toBe(true);
    },
  );

  it.each(['1', '2', '3a', '3b'])(
    'question %s names only registered components and known skills',
    id => {
      const notes = pack().questions.get(id)!.notes!;
      for (const c of notes.components) {
        expect(REGISTRY[c.name as ComponentName]).toBeDefined();
        expect(c.when.length).toBeGreaterThan(20);
      }
      for (const s of [...notes.skills, ...notes.prerequisites]) {
        expect(SKILLS.has(s)).toBe(true);
      }
    },
  );

  it('the notation gate names a node of its own question', () => {
    const p = pack();
    for (const id of ['1', '2', '3a', '3b']) {
      const q = p.questions.get(id)!;
      const gate = q.notes!.notationAfter;
      if (gate !== null) {
        expect(q.main!.graph.nodes.map(n => n.id)).toContain(gate);
      }
    }
  });

  it('is deterministic (the cached prompt block must not change)', () => {
    expect(pack().text).toBe(pack().text);
  });

  it('writes the reused question results and the components into the text', () => {
    const text = pack().text;
    expect(text).toContain('## Question 2 (id "2")');
    expect(text).toContain('- EventAreaModel:');
    expect(text).toContain('- SlotsPattern:');
    expect(text).toContain('- SpreadSlider:');
    expect(text).not.toMatch(/\\val\{/);
  });
});
