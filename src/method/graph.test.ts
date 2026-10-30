import { evaluateExact, parseExpression } from '../engine/expression';
import { EngineError } from '../engine/rational';
import { ratToString, sameRat } from '../engine/rationalFormat';
import {
  buildUrnGraph,
  nodeOf,
  verifyByEnumeration,
  type Graph,
} from './graph';

const v = (g: Graph, id: string) => ratToString(nodeOf(g, id).value);
const ids = (g: Graph) => g.nodes.map(n => n.id);

describe('question 1: 4 red, 6 black, 3 together, exactly one red', () => {
  const g = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 });

  it("has the nodes of the owner's method, and the engine's numbers", () => {
    expect(ids(g)).toEqual([
      'ord',
      'orderings',
      'total',
      'fav_red',
      'fav_black',
      'fav',
      'result',
    ]);
    expect(v(g, 'ord')).toBe('720');
    expect(v(g, 'orderings')).toBe('6'); // abc has 6 orderings
    expect(v(g, 'total')).toBe('120');
    expect(v(g, 'fav_red')).toBe('4');
    expect(v(g, 'fav_black')).toBe('15');
    expect(v(g, 'fav')).toBe('60');
    expect(v(g, 'result')).toBe('1/2');
  });

  it('knows what each number counts (units) and which plan card it belongs to', () => {
    expect(nodeOf(g, 'ord').unit).toBe('ordered');
    expect(nodeOf(g, 'total').unit).toBe('groups');
    expect(nodeOf(g, 'fav').unit).toBe('groups');
    expect(nodeOf(g, 'result').unit).toBe('ratio');
    expect(nodeOf(g, 'ord').planCard).toBe('total');
    expect(nodeOf(g, 'fav_black').planCard).toBe('fav');
    expect(nodeOf(g, 'result').planCard).toBe('ratio');
    expect(nodeOf(g, 'ord').main).toBe(false); // a supporting step, not the answer of the card
    expect(nodeOf(g, 'total').main).toBe(true);
  });

  it('edges: the favourable count uses its two choices, the result uses fav and total', () => {
    expect(nodeOf(g, 'fav').inputs).toEqual(['fav_red', 'fav_black']);
    expect(nodeOf(g, 'result').inputs).toEqual(['fav', 'total']);
    expect(nodeOf(g, 'total').inputs).toEqual(['ord', 'orderings']);
  });

  it('only the one-ball choice may be typed bare', () => {
    expect(nodeOf(g, 'fav_red').bareOk).toBe(true);
    expect(nodeOf(g, 'total').bareOk).toBe(false);
    expect(nodeOf(g, 'fav_black').bareOk).toBe(false);
    expect(nodeOf(g, 'fav').bareOk).toBe(false);
  });

  it("every accepted derivation really evaluates to its node's value", () => {
    for (const n of g.nodes) {
      expect(n.forms.length).toBeGreaterThan(0);
      for (const f of n.forms) {
        const p = parseExpression(f, { variables: [], constants: [] });
        expect(p.ok).toBe(true);
        if (p.ok) {
          const val = evaluateExact(p.ast);
          expect(val && sameRat(val, n.value)).toBe(true);
        }
      }
    }
    expect(nodeOf(g, 'total').forms).toContain('10*9*8/(3*2*1)');
    expect(nodeOf(g, 'total').forms).toContain('720/6');
    expect(nodeOf(g, 'fav_black').forms).toContain('6*5/(2*1)');
    expect(nodeOf(g, 'fav').forms).toContain('4*15');
    expect(nodeOf(g, 'fav').forms).toContain('4*(6*5/(2*1))');
  });

  it('is verified a second way: the engine enumerates the draws', () => {
    expect(verifyByEnumeration(g)).toEqual({ ok: true });
  });
});

describe("the owner's two urns", () => {
  it('3 red 5 black (the learning urn): 336 / 6 = 56, 3 x 10 = 30, 15/28', () => {
    const g = buildUrnGraph({ reds: 3, blacks: 5, k: 3, j: 1 });
    expect(v(g, 'ord')).toBe('336');
    expect(v(g, 'total')).toBe('56');
    expect(nodeOf(g, 'total').forms).toContain('336/6');
    expect(v(g, 'fav_red')).toBe('3');
    expect(v(g, 'fav_black')).toBe('10');
    expect(v(g, 'fav')).toBe('30');
    expect(v(g, 'result')).toBe('15/28');
  });

  it('5 red 6 black (the simulated cold urn): 990, 165, 75, 5/11', () => {
    const g = buildUrnGraph({ reds: 5, blacks: 6, k: 3, j: 1 });
    expect(v(g, 'ord')).toBe('990');
    expect(v(g, 'total')).toBe('165');
    expect(v(g, 'fav_black')).toBe('15');
    expect(v(g, 'fav')).toBe('75');
    expect(v(g, 'result')).toBe('5/11');
  });
});

describe('generic over j, so question 2 ("no red") is data, not code', () => {
  it('j = 0: no red choice and no product; the favourable count is C(6,3)', () => {
    const g = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 0 });
    expect(ids(g)).toEqual(['ord', 'orderings', 'total', 'fav', 'result']);
    expect(v(g, 'fav')).toBe('20');
    expect(v(g, 'result')).toBe('1/6');
    expect(nodeOf(g, 'fav').inputs).toEqual([]);
    expect(nodeOf(g, 'fav').forms).toContain('6*5*4/(3*2*1)');
    expect(verifyByEnumeration(g)).toEqual({ ok: true });
  });

  it('j = k: only reds, one favourable choice', () => {
    const g = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 3 });
    expect(ids(g)).toEqual(['ord', 'orderings', 'total', 'fav', 'result']);
    expect(v(g, 'fav')).toBe('4');
    expect(verifyByEnumeration(g)).toEqual({ ok: true });
  });

  it('one colour only', () => {
    const g = buildUrnGraph({ reds: 5, blacks: 0, k: 3, j: 3 });
    expect(v(g, 'fav')).toBe('10');
    expect(v(g, 'result')).toBe('1');
  });
});

describe('the ordered reading is a valid method too (D35 change 1)', () => {
  const g = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 }, 'ordered');
  it('720 ordered draws, 360 favourable, the same 1/2', () => {
    expect(v(g, 'total')).toBe('720');
    expect(v(g, 'positions')).toBe('3');
    expect(v(g, 'fav')).toBe('360');
    expect(v(g, 'result')).toBe('1/2');
    expect(nodeOf(g, 'total').unit).toBe('ordered');
    expect(nodeOf(g, 'fav').forms).toContain('3*4*6*5');
    expect(verifyByEnumeration(g)).toEqual({ ok: true });
  });
});

describe('guards', () => {
  it('refuses impossible urns, with an EngineError', () => {
    expect(() => buildUrnGraph({ reds: 2, blacks: 6, k: 3, j: 3 })).toThrow(
      EngineError,
    );
    expect(() => buildUrnGraph({ reds: 4, blacks: 1, k: 3, j: 0 })).toThrow(
      EngineError,
    );
    expect(() => buildUrnGraph({ reds: 4, blacks: 6, k: 0, j: 0 })).toThrow(
      EngineError,
    );
    expect(() => buildUrnGraph({ reds: 1, blacks: 1, k: 3, j: 1 })).toThrow(
      EngineError,
    );
  });

  it('skips the enumeration when the urn is too big, and says so', () => {
    const big = buildUrnGraph({ reds: 12, blacks: 12, k: 6, j: 3 });
    expect(verifyByEnumeration(big)).toEqual({ ok: 'skipped' });
    expect(v(big, 'total')).toBe('134596');
  });

  it('is deterministic', () => {
    const a = buildUrnGraph({ reds: 5, blacks: 7, k: 3, j: 1 });
    const b = buildUrnGraph({ reds: 5, blacks: 7, k: 3, j: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('a grid of urns: formula = enumeration, every form is exact', () => {
  it('holds for every small urn, both readings', () => {
    let checked = 0;
    for (let reds = 0; reds <= 6; reds++) {
      for (let blacks = 0; blacks <= 6; blacks++) {
        for (const k of [2, 3]) {
          for (let j = 0; j <= k; j++) {
            if (reds + blacks < k || j > reds || k - j > blacks) {
              continue;
            }
            for (const order of ['unordered', 'ordered'] as const) {
              const g = buildUrnGraph({ reds, blacks, k, j }, order);
              expect(verifyByEnumeration(g)).toEqual({ ok: true });
              for (const n of g.nodes) {
                for (const f of n.forms) {
                  const p = parseExpression(f, {
                    variables: [],
                    constants: [],
                  });
                  expect(p.ok).toBe(true);
                  const val = p.ok ? evaluateExact(p.ast) : null;
                  expect(val && sameRat(val, n.value)).toBe(true);
                }
              }
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
