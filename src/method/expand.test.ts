import { ExerciseSchema, type Exercise } from '../content/schema';
import { expandMethodSteps } from './expand';
import { methodExercise } from './fixtures/methodExercise';

const load = (
  mutate?: (ex: ReturnType<typeof methodExercise>) => void,
): Exercise => {
  const raw = methodExercise();
  mutate?.(raw);
  return ExerciseSchema.parse(raw);
};
const method = (ex: ReturnType<typeof methodExercise>): any =>
  ex.parts[0]!.groups[0]!.steps[1];

describe('a method block is expanded into ordinary steps', () => {
  const { exercise, errors } = expandMethodSteps(load());
  const steps = exercise.parts[0]!.groups[0]!.steps;

  it('has no error', () => {
    expect(errors).toEqual([]);
  });

  it('opening card, plan, read, then one lines frame per BUILT plan card', () => {
    expect(steps.map(s => `${s.id}:${s.kind}`)).toEqual([
      's1:text',
      'm1.opening:text',
      'm1.plan:mframe',
      'm1.read:mframe',
      'm1.c_total:mframe',
    ]);
  });

  it('the opening card is one tutor text with the route lines and the help line, no math', () => {
    const opening = steps.find(s => s.id === 'm1.opening');
    expect(opening?.kind).toBe('text');
    const text = opening?.kind === 'text' ? JSON.stringify(opening.text) : '';
    expect(text).toContain('نبداو بخطة');
    expect(text).toContain('ما نعرفش');
    expect(text).not.toMatch(/[0-9]/);
  });

  it('every frame carries its own hints, its header, its short name and the whole roadmap', () => {
    const plan = steps.find(s => s.id === 'm1.plan');
    const lines = steps.find(s => s.id === 'm1.c_total');
    if (plan?.kind !== 'mframe' || lines?.kind !== 'mframe') {
      throw new Error('frames');
    }
    expect(plan.hints).toHaveLength(3);
    expect(lines.hints).toHaveLength(3);
    expect(lines.frame).toMatchObject({
      type: 'lines',
      cardId: 'c_total',
      key: 'total',
    });
    expect(plan.roadmap?.map(r => `${r.id}:${r.kind}`)).toEqual([
      'm1.plan:plan',
      'm1.read:read',
      'm1.c_total:card',
      'm1.c_fav:card',
      'm1.c_ratio:card',
      'm1.paper:paper',
    ]);
    expect(lines.roadmap).toEqual(plan.roadmap);
    expect(plan.graph).toEqual({
      template: 'urn_exactly_j',
      args: { j: 1 },
    });
  });

  it('the plan frame holds the cards without their lines-frame fields', () => {
    const plan = steps.find(s => s.id === 'm1.plan');
    if (plan?.kind !== 'mframe' || plan.frame.type !== 'plan') {
      throw new Error('plan');
    }
    expect(plan.frame.cards.map(c => c.id)).toEqual([
      'c_total',
      'c_fav',
      'c_ratio',
    ]);
    expect(plan.frame.cards[2]!.needs).toEqual(['c_total', 'c_fav']);
    expect('hints' in plan.frame.cards[0]!).toBe(false);
  });

  it('the read frame holds only the sentence with the word to find, as a tappable copy', () => {
    const read = steps.find(s => s.id === 'm1.read');
    if (read?.kind !== 'mframe' || read.frame.type !== 'read') {
      throw new Error('read');
    }
    expect(read.frame.sentence).toBe(
      'Une épreuve consiste à tirer simultanément trois boules de l\u2019urne.',
    );
  });

  it('with no builtFrames every plan card gets a lines frame', () => {
    const r = expandMethodSteps(load(ex => delete method(ex).builtFrames));
    expect(r.errors).toEqual([]);
    expect(r.exercise.parts[0]!.groups[0]!.steps.map(s => s.id)).toEqual(
      expect.arrayContaining(['m1.c_total', 'm1.c_fav', 'm1.c_ratio']),
    );
  });

  it('an exercise without a method block is returned as it is', () => {
    const ex = load(raw => {
      raw.parts[0]!.groups[0]!.steps.pop();
    });
    expect(expandMethodSteps(ex)).toEqual({ exercise: ex, errors: [] });
  });
});

describe('the loader rejects a method block that cannot teach', () => {
  const errorsFor = (mutate: (ex: ReturnType<typeof methodExercise>) => void) =>
    expandMethodSteps(load(mutate)).errors.join(' | ');

  it('a read word that is not in the statement', () => {
    expect(
      errorsFor(ex => (method(ex).read.targets[0].token = 'successivement')),
    ).toMatch(/token.*successivement/);
  });

  it('"part" or "combine" in anything the student reads', () => {
    expect(
      errorsFor(
        ex =>
          (method(ex).plan.cards[1].prompt = { fr: 'Calculer chaque partie' }),
      ),
    ).toMatch(/banned_word/);
    expect(
      errorsFor(
        ex =>
          (method(ex).plan.cards[1].text = { ar: [{ ar: 'نجمّعو الأجزاء' }] }),
      ),
    ).toMatch(/banned_word/);
  });

  it('a header with a digit, a formula or the how', () => {
    expect(
      errorsFor(
        ex =>
          (method(ex).plan.cards[0].header.now = { fr: 'Il y a 120 tirages' }),
      ),
    ).toMatch(/digit/);
    expect(
      errorsFor(
        ex =>
          (method(ex).plan.cards[0].header.why = {
            ar: [{ ar: 'نقسمو على الترتيبات' }],
          }),
      ),
    ).toMatch(/how_word/);
    expect(
      errorsFor(ex => (method(ex).paper.header.next = { math: 'C_{10}^{3}' })),
    ).toMatch(/math/);
  });

  it('an opening card with a digit', () => {
    expect(
      errorsFor(ex => (method(ex).opening.route[0] = { fr: 'Étape 1' })),
    ).toMatch(/opening.*digit/);
  });

  it('plan cards that share a key, point at an unknown card, or wait for each other', () => {
    expect(errorsFor(ex => (method(ex).plan.cards[1].key = 'total'))).toMatch(
      /own key/,
    );
    expect(
      errorsFor(ex => (method(ex).plan.cards[2].needs = ['c_zzz'])),
    ).toMatch(/unknown card c_zzz/);
    expect(
      errorsFor(ex => {
        method(ex).plan.cards[0].needs = ['c_ratio'];
      }),
    ).toMatch(/cycle/);
  });

  it('builtFrames that name no card', () => {
    expect(errorsFor(ex => (method(ex).builtFrames = ['c_zzz']))).toMatch(
      /builtFrames.*c_zzz/,
    );
  });

  it('a graph the urn cannot give, or an urn that is not red and black', () => {
    expect(errorsFor(ex => (method(ex).graph.args.j = 5))).toMatch(/graph/);
    expect(errorsFor(ex => (ex.experiment.urn[0]!.value = 7))).toMatch(
      /red.*black/,
    );
  });
});
