import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import * as registry from '../../components/registry';
import type { RevealRule } from '../../components/reveals';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import { revealsAnswer } from './revealing';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
// 2.a/s6: how many draws? The answer is 10 (C(5,2)).
const c2a = buildContent(r.loaded, '2a');
const KEY = '2a/s6';

const rule = (over: Partial<RevealRule>): RevealRule => ({
  value: 'draw_count',
  note: 'the number of draws',
  by: 'props',
  minHint: 0,
  values: () => [[10, 1]],
  ...over,
});

const real = registry.componentMeta;
function withFake(rules: RevealRule[] | undefined, run: () => void) {
  const spy = jest.spyOn(registry, 'componentMeta').mockImplementation(name =>
    name === 'FakeVisual'
      ? ({
          ...real('Urn')!,
          ...(rules === undefined ? {} : { reveals: rules }),
        } as ReturnType<typeof real>)
      : real(name),
  );
  try {
    run();
  } finally {
    spy.mockRestore();
  }
}
const spec = (props: Record<string, unknown> = {}) => ({
  component: 'FakeVisual',
  props,
});

describe('the guard reads the reveals a component declares (generic branch)', () => {
  it('a rule by props whose values include the answer is a reveal', () => {
    withFake([rule({})], () => {
      expect(revealsAnswer(c2a, KEY, spec())).toMatch(/the number of draws/);
    });
  });

  it('a value that is not the answer is no reveal', () => {
    withFake([rule({ values: () => [[7, 1]] })], () => {
      expect(revealsAnswer(c2a, KEY, spec())).toBeNull();
    });
  });

  it('a rule by state is safe only when these props lock it', () => {
    const locked = rule({ by: 'state', lockedBy: p => p.lockedUntil !== undefined });
    withFake([locked], () => {
      expect(revealsAnswer(c2a, KEY, spec({ lockedUntil: 3 }))).toBeNull();
      expect(revealsAnswer(c2a, KEY, spec({}))).not.toBeNull();
    });
  });

  it('a component that declares nothing is judged as before (existing behaviour unchanged)', () => {
    withFake(undefined, () => {
      expect(revealsAnswer(c2a, KEY, spec())).toBeNull();
    });
  });

  it('the values may depend on the props', () => {
    const r2 = rule({ values: p => [[Number(p.shows), 1]] });
    withFake([r2], () => {
      expect(revealsAnswer(c2a, KEY, spec({ shows: 10 }))).not.toBeNull();
      expect(revealsAnswer(c2a, KEY, spec({ shows: 3 }))).toBeNull();
    });
  });

  it('an empty declaration reveals nothing', () => {
    withFake([], () => {
      expect(revealsAnswer(c2a, KEY, spec())).toBeNull();
    });
  });
});
