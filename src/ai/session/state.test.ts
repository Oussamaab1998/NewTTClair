import { ballLabels, outcomesOf } from '../../components/probability/logic';
import { resolveSpec } from '../../components/registry';
import { validateUrn } from '../../engine/probability';
import { caseBallNames, caseExperiment, type CaseSpec } from './state';

const BOX: CaseSpec = { kind: 'box', n: 4, k: 2 };
const URN: CaseSpec = { kind: 'urn', reds: 2, blacks: 3, k: 3, j: 1 };

describe('a small case as an urn', () => {
  it('names the balls of a box a b c d in the picture, as on the case card', () => {
    const e = caseExperiment(BOX);
    const names = caseBallNames(BOX).map(b => b.label);
    expect(names).toEqual(['a', 'b', 'c', 'd']);
    for (const dup of [true, false]) {
      expect([...ballLabels(e.urn, dup).values()]).toEqual(names);
    }
    // The values stay distinct: the engine counts its six groups.
    expect(() => validateUrn(e.urn)).not.toThrow();
    expect(outcomesOf({ balls: e.urn, draw: e.draw, k: e.k })).toHaveLength(6);
  });

  it('names the balls of a red and black urn R1 R2 N1 N2 N3, coloured', () => {
    const e = caseExperiment(URN);
    expect(caseBallNames(URN).map(b => b.id)).toEqual([
      'r1',
      'r2',
      'n1',
      'n2',
      'n3',
    ]);
    expect([...ballLabels(e.urn, true).values()]).toEqual([
      'R1',
      'R2',
      'N1',
      'N2',
      'N3',
    ]);
    expect(e.urn.map(b => b.color)).toEqual([
      'red',
      'red',
      'black',
      'black',
      'black',
    ]);
    expect(() => validateUrn(e.urn)).not.toThrow();
  });

  it('passes the Urn props check with its names', () => {
    const r = resolveSpec({ component: 'Urn', props: {} }, caseExperiment(BOX));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const balls = (r.props as { balls: { label?: string }[] }).balls;
      expect(balls.map(b => b.label)).toEqual(['a', 'b', 'c', 'd']);
    }
  });
});
