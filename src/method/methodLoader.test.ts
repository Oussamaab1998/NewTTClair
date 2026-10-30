import { loadExercise, stepKey } from '../content/loader';
import { MisconceptionLibrarySchema } from '../content/schema';
import library from '../content/methodMutations.misconceptions.json';
import type { ComponentName } from '../components/contract';
import { componentKind } from '../components/registry';
import { SKILLS } from '../content/skills';
import { ratToString } from '../engine/rationalFormat';
import { methodExercise } from './fixtures/methodExercise';
import { MUTATION_IDS } from './mutations';
import { studentFacingIssues } from './words';

const trust = {
  reviewed: false,
  contentVersion: 'fxm-0.1.0',
  source: 'authored',
  status: 'ok',
};
const own = (id: string) => ({
  id,
  skillId: 'combinations-count',
  description: id,
  signature: id,
  trust,
});
const misc = [own('draws_with_replacement'), own('counts_balls_not_draws')];

function load() {
  const r = loadExercise(methodExercise(), misc);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}

describe('a method exercise loads', () => {
  it('into ordinary steps with resolved answers', () => {
    const l = load();
    const ids = l.exercise.parts[0]!.groups[0]!.steps.map(s => s.id);
    expect(ids).toEqual([
      's1',
      'm1.opening',
      'm1.plan',
      'm1.read',
      'm1.c_total',
    ]);
    expect(l.answers.get(stepKey.main('1', 'm1.plan'))).toEqual({
      kind: 'method',
      frame: 'plan',
    });
    expect(l.answers.get(stepKey.main('1', 'm1.read'))).toEqual({
      kind: 'method',
      frame: 'read',
    });
  });

  it('a lines frame has the expected graph, the slips and the authored wrong values', () => {
    const a = load().answers.get(stepKey.main('1', 'm1.c_total'));
    if (a?.kind !== 'method' || a.frame !== 'lines') {
      throw new Error('lines');
    }
    expect(ratToString(a.graph.nodes.find(n => n.id === 'total')!.value)).toBe(
      '120',
    );
    expect(a.table.kept.length).toBeGreaterThan(10);
    const values = a.extra.map(
      e => `${ratToString(e.value)}:${e.misconceptionId}`,
    );
    expect(values).toContain('1000:draws_with_replacement');
    expect(values).toContain('10:counts_balls_not_draws');
  });

  it('brings the shared mut.* library, and only for an exercise that uses a method', () => {
    const l = load();
    for (const id of MUTATION_IDS) {
      expect(l.misconceptionIds.has(`mut.${id}`)).toBe(true);
    }
  });

  it("refuses a method block with a problem, with the scan's words", () => {
    const raw = methodExercise();
    (
      raw.parts[0]!.groups[0]!.steps[1] as {
        read: { targets: { token: string }[] };
      }
    ).read.targets[0]!.token = 'zzz';
    const r = loadExercise(raw, misc);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join(' ')).toMatch(/zzz/);
  });

  it('refuses a wrong-value row that names an unknown misconception', () => {
    const r = loadExercise(methodExercise(), []);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join(' ')).toMatch(
      /unknown misconception draws_with_replacement/,
    );
  });
});

describe('the shared mutation library', () => {
  const lib = MisconceptionLibrarySchema.parse(library);

  it('has one entry per mutation id, with both forms of the feedback, all unreviewed', () => {
    expect(lib.map(m => m.id).sort()).toEqual(
      MUTATION_IDS.map(i => `mut.${i}`).sort(),
    );
    for (const m of lib) {
      expect(m.feedback).toBeDefined();
      expect(m.feedbackConfirmed).toBeDefined();
      expect(JSON.stringify(m.feedback)).not.toBe(
        JSON.stringify(m.feedbackConfirmed),
      );
      expect(m.trust.reviewed).toBe(false);
    }
  });

  it('every skill exists, every repair picture is a registered component', () => {
    for (const m of lib) {
      expect(SKILLS.has(m.skillId)).toBe(true);
      if (m.repairComponent) {
        // a picture by name, or a method script (`method:<id>`) whose variant carries it
        expect(
          m.repairComponent.startsWith('method:') ||
            componentKind({
              component: m.repairComponent as ComponentName,
              props: {},
            }) !== undefined,
        ).toBe(true);
      }
    }
  });

  it('no student-facing line says "part" or "combine", and none holds a digit', () => {
    for (const m of lib) {
      for (const f of [m.feedback!, m.feedbackConfirmed!]) {
        expect(studentFacingIssues(f)).toEqual([]);
        expect(JSON.stringify(f)).not.toMatch(/[0-9]/);
      }
    }
  });
});
