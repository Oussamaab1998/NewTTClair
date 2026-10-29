import { MAX_ENUMERATION, choose, outcomeCountOf } from './combinatorics';
import {
  boxesInSlice,
  groupByKey,
  listBoxes,
  orderingsOfBox,
  sliceCountsFor,
} from './grouping';
import {
  enumerateOutcomes,
  law,
  type Ball,
  type Draw,
} from './probability';
import { EngineError } from './rational';

/** Exercise urn: 4 red (value 1) and 6 black (value 0). */
const RN = (r: number, n: number): Ball[] => [
  ...Array.from({ length: r }, (_, i) => ({
    id: `r${i + 1}`,
    value: 1,
    color: 'red' as const,
  })),
  ...Array.from({ length: n }, (_, i) => ({
    id: `n${i + 1}`,
    value: 0,
    color: 'black' as const,
  })),
];
const URN = RN(4, 6);
const RED = 1;

/** Same generator as the other engine tests: small, deterministic. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('boxes: the sets of k balls inside an ordered draw', () => {
  it('10 balls, k = 3: 120 boxes of 6 orderings, 720 ordered draws', () => {
    const boxes = listBoxes(URN, 3);
    expect(boxes).toHaveLength(120);
    expect(boxes).toHaveLength(choose(10, 3));
    expect(new Set(boxes.map(b => b.key)).size).toBe(120);
    const ordered = enumerateOutcomes(URN, 'ordered', 3).map(o => o.id);
    expect(ordered).toHaveLength(720);
    const all = boxes.flatMap(b => orderingsOfBox(b.ballIds));
    expect(all).toHaveLength(720);
    expect(new Set(all).size).toBe(720);
    expect(new Set(all)).toEqual(new Set(ordered));
    for (const b of boxes) {
      expect(orderingsOfBox(b.ballIds)).toHaveLength(6);
    }
  });

  it('a box key is the simultaneous outcome id (urn order)', () => {
    const simultaneous = enumerateOutcomes(URN, 'simultaneous', 3).map(o => o.id);
    expect(listBoxes(URN, 3).map(b => b.key)).toEqual(simultaneous);
    expect(listBoxes(URN, 3)[0]!.ballIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('one box: its orderings in the order the engine lists ordered draws', () => {
    const expected = [
      'r1-n1-n2',
      'r1-n2-n1',
      'n1-r1-n2',
      'n1-n2-r1',
      'n2-r1-n1',
      'n2-n1-r1',
    ];
    expect(orderingsOfBox(['r1', 'n1', 'n2'])).toEqual(expected);
    const listed = enumerateOutcomes(URN, 'ordered', 3)
      .map(o => o.id)
      .filter(id => expected.includes(id));
    expect(listed).toEqual(expected);
  });

  it('twins from the evidence: 720/3 and 24/3 are not the number of boxes', () => {
    // 5 balls, k = 3: 60 ordered draws, 10 boxes of 6 (60/3 = 20 is the slip)
    const five = RN(2, 3);
    expect(enumerateOutcomes(five, 'ordered', 3)).toHaveLength(60);
    expect(listBoxes(five, 3)).toHaveLength(10);
    // 4 balls, k = 3: 24 ordered draws, 4 boxes (24/3 = 8 is the slip)
    const four = RN(2, 2);
    expect(enumerateOutcomes(four, 'ordered', 3)).toHaveLength(24);
    expect(listBoxes(four, 3)).toHaveLength(4);
    expect(24 / 3).toBe(8);
    expect(24 / 6).toBe(4);
  });

  it('refuses a request it would not build, and bad input', () => {
    expect(() => listBoxes(RN(20, 20), 5)).toThrow(EngineError); // C(40,5) = 658008
    expect(choose(40, 5)).toBeGreaterThan(MAX_ENUMERATION);
    expect(() => listBoxes(URN, 11)).toThrow(EngineError);
    expect(() => listBoxes(URN, 0)).toThrow(EngineError);
    expect(() => orderingsOfBox(Array.from({ length: 9 }, (_, i) => `b${i}`))).toThrow(
      EngineError,
    ); // 9! orderings
    const dup: Ball[] = [
      { id: 'a', value: 0 },
      { id: 'a', value: 1 },
    ];
    expect(() => listBoxes(dup, 1)).toThrow(EngineError);
  });
});

describe('slices: boxes grouped by the number of balls with a property', () => {
  it('4 red 6 black, 3 drawn: 20, 60, 36, 4 boxes of 120; 120, 360, 216, 24 ordered draws of 720', () => {
    const sim = sliceCountsFor(URN, 'simultaneous', 3, RED);
    expect(sim.map(s => s.count)).toEqual([20, 60, 36, 4]);
    expect(sim.reduce((s, x) => s + x.count, 0)).toBe(120);
    const ord = sliceCountsFor(URN, 'ordered', 3, RED);
    expect(ord.map(s => s.count)).toEqual([120, 360, 216, 24]);
    expect(ord.reduce((s, x) => s + x.count, 0)).toBe(720);
    expect(sim.map(s => s.j)).toEqual([0, 1, 2, 3]);
  });

  it('the trap: the complement of A has 60 draws, B is only its 20-draw slice', () => {
    const [none, one, two, three] = sliceCountsFor(URN, 'simultaneous', 3, RED).map(
      s => s.count,
    );
    expect(one).toBe(60); // A
    expect(none).toBe(20); // B
    expect(none! + two! + three!).toBe(60); // the complement of A
    expect(120 - one!).toBe(60);
  });

  it('with replacement: 216, 432, 288, 64 of 1000', () => {
    const rep = sliceCountsFor(URN, 'ordered_with_replacement', 3, RED);
    expect(rep.map(s => s.count)).toEqual([216, 432, 288, 64]);
    expect(rep.reduce((s, x) => s + x.count, 0)).toBe(1000);
  });

  it('equals the enumerated law of count_value for random urns, every draw kind', () => {
    const next = lcg(7);
    const kinds: Draw[] = ['simultaneous', 'ordered', 'ordered_with_replacement'];
    for (let trial = 0; trial < 60; trial++) {
      const n = 2 + Math.floor(next() * 7); // 2..8 balls
      const balls: Ball[] = Array.from({ length: n }, (_, i) => ({
        id: `x${i}`,
        value: Math.floor(next() * 3), // values 0, 1, 2
      }));
      const draw = kinds[trial % 3]!;
      const k = 1 + Math.floor(next() * 3);
      if (draw !== 'ordered_with_replacement' && k > n) {
        continue;
      }
      const value = Math.floor(next() * 3);
      const rows = law(
        { id: 'count_value', args: { value } },
        enumerateOutcomes(balls, draw, k),
      );
      const byJ = new Map(rows.map(r => [r.value, r.outcomes.length]));
      const slices = sliceCountsFor(balls, draw, k, value);
      expect(slices).toHaveLength(k + 1);
      for (const s of slices) {
        expect(s.count).toBe(byJ.get(s.j) ?? 0);
      }
      expect(slices.reduce((t, s) => t + s.count, 0)).toBe(
        outcomeCountOf(draw, n, k),
      );
    }
  });

  it('has no size limit of its own: 40 balls, 5 drawn, without listing anything', () => {
    const big = RN(15, 25);
    const slices = sliceCountsFor(big, 'simultaneous', 5, RED);
    expect(slices.reduce((s, x) => s + x.count, 0)).toBe(choose(40, 5));
    expect(slices.map(s => s.count)[2]).toBe(choose(15, 2) * choose(25, 3));
    const rep = sliceCountsFor(RN(6, 6), 'ordered_with_replacement', 4, RED);
    expect(rep.reduce((s, x) => s + x.count, 0)).toBe(20736);
  });

  it('a property no ball has: everything is in the "0" slice', () => {
    const slices = sliceCountsFor(URN, 'simultaneous', 3, 7);
    expect(slices.map(s => s.count)).toEqual([120, 0, 0, 0]);
  });

  it('refuses k > n without replacement and a bad k', () => {
    expect(() => sliceCountsFor(URN, 'simultaneous', 11, RED)).toThrow(EngineError);
    expect(() => sliceCountsFor(URN, 'ordered', 0, RED)).toThrow(EngineError);
    expect(() => sliceCountsFor(RN(1, 1), 'ordered_with_replacement', 20, RED)).not.toThrow();
  });
});

describe('expanding ONE slice: its boxes, a few at a time', () => {
  it('exactly one red: 60 boxes in all, the first ones in urn order', () => {
    const all = boxesInSlice(URN, 3, RED, 1, 100);
    expect(all).toHaveLength(60);
    expect(all[0]!.ballIds).toEqual(['r1', 'n1', 'n2']);
    for (const b of all) {
      expect(b.ballIds.filter(id => id.startsWith('r'))).toHaveLength(1);
      expect(b.ballIds).toHaveLength(3);
    }
    expect(new Set(all.map(b => b.key)).size).toBe(60);
    const some = boxesInSlice(URN, 3, RED, 1, 5);
    expect(some.map(b => b.key)).toEqual(all.slice(0, 5).map(b => b.key));
  });

  it('every slice lists as many boxes as its count says', () => {
    const counts = sliceCountsFor(URN, 'simultaneous', 3, RED);
    for (const s of counts) {
      expect(boxesInSlice(URN, 3, RED, s.j, 200)).toHaveLength(s.count);
    }
  });

  it('a slice that is empty lists nothing; the limit must be positive', () => {
    expect(boxesInSlice(URN, 3, 7, 1, 10)).toEqual([]); // no ball has value 7
    expect(() => boxesInSlice(URN, 3, RED, 4, 10)).toThrow(EngineError); // j > k
    expect(() => boxesInSlice(URN, 3, RED, 1, 0)).toThrow(EngineError);
    expect(() => boxesInSlice(URN, 3, RED, -1, 5)).toThrow(EngineError);
  });
});

describe('groupByKey: the enumerating reference', () => {
  it('groups outcomes by any key, keeps first-seen order, and counts', () => {
    const outcomes = enumerateOutcomes(URN, 'simultaneous', 3);
    const groups = groupByKey(outcomes, o =>
      String(o.balls.filter(b => b.value === 1).length),
    );
    expect(groups.map(g => g.key)).toEqual(['3', '2', '1', '0']);
    expect(groups.map(g => g.count)).toEqual([4, 36, 60, 20]);
    expect(groups.reduce((s, g) => s + g.outcomeIds.length, 0)).toBe(120);
  });
  it('agrees with the combinatorial counts', () => {
    const outcomes = enumerateOutcomes(URN, 'ordered', 3);
    const groups = groupByKey(outcomes, o =>
      String(o.balls.filter(b => b.value === 1).length),
    );
    const byKey = new Map(groups.map(g => [Number(g.key), g.count]));
    for (const s of sliceCountsFor(URN, 'ordered', 3, RED)) {
      expect(byKey.get(s.j)).toBe(s.count);
    }
  });
  it('does not group a list longer than the cap', () => {
    const fake = Array.from({ length: MAX_ENUMERATION + 1 }, (_, i) => ({
      id: String(i),
      ballIds: [String(i)],
      balls: [],
    }));
    expect(() => groupByKey(fake, () => 'all')).toThrow(EngineError);
  });
});
