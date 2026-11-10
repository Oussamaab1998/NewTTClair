import { CATALOG } from '../../app/exercises';
import { autoCheck } from '../checks/autoCheck';
import { exercisePack } from '../tutor';
import { newSession } from './state';
import { stepMap } from './stepMap';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const pack = exercisePack(
  entry.result.ok ? entry.result.loaded : (null as never),
  entry.raw as never,
);

function start(questionId: string) {
  const q = pack.questions.get(questionId)!;
  const rt = newSession(pack.exerciseId, questionId, q.main, q.given);
  return { q, rt };
}

const states = (m: ReturnType<typeof stepMap>) =>
  m?.steps.map(s => `${s.cardId}:${s.state}`);

describe('stepMap', () => {
  it('hides the step texts until he orders the plan, then follows his order', () => {
    const { q, rt } = start('1');
    const before = stepMap(q, rt.state)!;
    expect(before.ordered).toBe(false);
    expect(before.now).toBeNull();
    expect(states(before)).toEqual([
      'c_total:now',
      'c_fav:later',
      'c_ratio:later',
    ]);
    // His own valid order: the favourable draws first.
    autoCheck(
      { kind: 'order', ids: ['c_fav', 'c_total', 'c_ratio'] },
      null,
      rt,
      q,
    );
    const after = stepMap(q, rt.state)!;
    expect(after.ordered).toBe(true);
    expect(states(after)?.[0]).toBe('c_fav:now');
    expect(after.now).toBe(q.plan.find(c => c.id === 'c_fav')!.text);
  });

  it('moves when the engine credits a step, not before', () => {
    const { q, rt } = start('1');
    autoCheck({ kind: 'line', raw: '10*9*8 = 700' }, null, rt, q);
    expect(states(stepMap(q, rt.state))?.[0]).toBe('c_total:now');
    autoCheck(
      { kind: 'line', raw: '10*9*8/(3*2*1)=120' },
      { kind: 'line', expect: { kind: 'node', graph: 'main', node: 'total' } },
      rt,
      q,
    );
    expect(states(stepMap(q, rt.state))).toEqual([
      'c_total:done',
      'c_fav:now',
      'c_ratio:later',
    ]);
  });

  it('marks a step with no line of its own done once a step after it is', () => {
    const { q, rt } = start('3a');
    rt.state.credited.main = ['seq'];
    expect(states(stepMap(q, rt.state))?.slice(0, 2)).toEqual([
      'c_type:done',
      'c_seq:done',
    ]);
    rt.state.credited.main = ['result'];
    expect(stepMap(q, rt.state)!.steps.every(s => s.state === 'done')).toBe(
      true,
    );
  });
});
