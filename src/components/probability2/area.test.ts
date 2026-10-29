import { completeReveals, revealedByRules } from '../reveals';
import {
  EVENT_AREA_REVEALS,
  areaFinding,
  areaModel,
  countOf,
  overlayResult,
  overlaySlices,
  probabilityOf,
} from './area';
import { FindingPayloadSchema } from './finding';
import { EventAreaModelPropsSchema } from './schemas';

const urn = {
  source: { kind: 'urn', reds: 4, blacks: 6, k: 3 },
  events: [
    { id: 'A', label: 'A', slices: ['s1'] },
    { id: 'B', label: 'B', slices: ['s0'] },
  ],
  overlays: ['complement', 'intersection', 'union', 'conditional'],
};
const die = {
  source: {
    kind: 'authored',
    slices: [1, 2, 3, 4, 5, 6].map(i => ({ id: `d${i}`, label: String(i), count: 1 })),
  },
  events: [
    { id: 'A', label: 'A', slices: ['d2', 'd4', 'd6'] },
    { id: 'B', label: 'B', slices: ['d5', 'd6'] },
  ],
  overlays: ['complement', 'intersection', 'union', 'conditional'],
};
const model = (p: Record<string, unknown>) => areaModel(EventAreaModelPropsSchema.parse(p));
const is = (n: number, d = 1) => (f: readonly [number, number]) => f[0] === n && f[1] === d;

describe('areaModel: the 4R6N urn by the number of reds', () => {
  const m = model(urn);

  it('slices of 20, 60, 36 and 4 draws of 120', () => {
    expect(m.slices.map(s => s.count)).toEqual([20, 60, 36, 4]);
    expect(m.total).toBe(120);
    expect(m.slices.map(s => s.label)).toEqual(['0', '1', '2', '3']);
  });

  it('A (exactly one red) has 60 draws, B (no red) has 20: P(A) = 1/2, P(B) = 1/6', () => {
    const [a, b] = m.events;
    expect(countOf(m, a!.slices)).toBe(60);
    expect(countOf(m, b!.slices)).toBe(20);
    expect(probabilityOf(m, 60)).toEqual([1, 2]);
    expect(probabilityOf(m, 20)).toEqual([1, 6]);
  });
});

describe('the overlays', () => {
  const m = model(urn);
  const [a, b] = m.events;

  it('the complement of A is 20 + 36 + 4 = 60 draws, and it is NOT B (20 draws)', () => {
    expect(overlaySlices(m, 'complement', [a!])).toEqual(['s0', 's2', 's3']);
    const r = overlayResult(m, 'complement', [a!, b!])!;
    expect(r.lines).toEqual(['20 + 36 + 4 = 60', '\\frac{60}{120} = \\frac{1}{2}']);
    expect(r.complementIsOther).toBe(false);
  });

  it('...but a complement that is the other event is told so', () => {
    const rest = { id: 'C', label: 'C', slices: ['s0', 's2', 's3'] };
    const r = overlayResult(m, 'complement', [a!, rest])!;
    expect(r.complementIsOther).toBe(true);
  });

  it('A and B share no draw: the intersection is empty, the union is 20 + 60 = 80', () => {
    const inter = overlayResult(m, 'intersection', [a!, b!])!;
    expect(inter.slices).toEqual([]);
    expect(inter.lines).toEqual(['0', '\\frac{0}{120} = 0']);
    const union = overlayResult(m, 'union', [a!, b!])!;
    expect(union.slices).toEqual(['s0', 's1']);
    expect(union.lines).toEqual(['20 + 60 = 80', '\\frac{80}{120} = \\frac{2}{3}']);
  });

  it('the conditional zooms into the first event: the whole becomes its 60 draws', () => {
    const only = overlayResult(m, 'conditional', [a!])!;
    expect(only.zoomTotal).toBe(60);
    expect(only.lines).toEqual(['\\frac{60}{60} = 1']);
    const given = overlayResult(m, 'conditional', [a!, b!])!;
    expect(given.lines).toEqual(['\\frac{0}{60} = 0']);
  });

  it('intersection and union need a second event', () => {
    expect(overlayResult(m, 'intersection', [a!])).toBeNull();
    expect(overlayResult(m, 'union', [a!])).toBeNull();
    expect(overlayResult(m, 'complement', [])).toBeNull();
  });
});

describe('another sample space: a fair die (A even, B at least 5)', () => {
  const m = model(die);
  const [a, b] = m.events;

  it('3 even, 2 at least 5, one in common, four in the union; P(B | A) = 1/3', () => {
    expect(m.total).toBe(6);
    expect(countOf(m, a!.slices)).toBe(3);
    expect(countOf(m, overlaySlices(m, 'intersection', [a!, b!]))).toBe(1);
    expect(countOf(m, overlaySlices(m, 'union', [a!, b!]))).toBe(4);
    const given = overlayResult(m, 'conditional', [a!, b!])!;
    expect(given.zoomTotal).toBe(3);
    expect(given.lines).toEqual(['\\frac{1}{3} = \\frac{1}{3}']);
  });
});

describe('the finding', () => {
  const m = model(urn);

  it('found: the counts, the complement, and the engine\'s line', () => {
    const f = areaFinding(m, m.events, ['complement'], ['event:A', 'overlay:complement'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'area.events',
      numbers: { total: '120', a: '60', complement: '60', b: '20' },
      how: 'found',
      correct: null,
      calc: ['20 + 36 + 4 = 60', '\\frac{60}{120} = \\frac{1}{2}'],
    });
  });

  it('skipped: never a calculation', () => {
    const f = areaFinding(m, [m.events[0]!], [], ['reveal'], 'skipped');
    expect(f.calc).toBeUndefined();
    expect(f.how).toBe('skipped');
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(EVENT_AREA_REVEALS)).toBe(true);
  });

  it('the slices (20, 60, 36, 4), their total and their probabilities are on the bar from the start', () => {
    for (const [n, d] of [[20, 1], [60, 1], [36, 1], [4, 1], [120, 1], [1, 6], [1, 2], [3, 10], [1, 30]] as const) {
      const hit = revealedByRules(EVENT_AREA_REVEALS, urn, undefined, is(n, d));
      expect(hit?.value).toBe('slices');
    }
  });

  it('a result that is not a slice comes by state: the union 80 / 120 = 2/3', () => {
    const hit = revealedByRules(EVENT_AREA_REVEALS, urn, undefined, is(2, 3));
    expect(hit?.value).toBe('overlay_results');
    expect(hit?.by).toBe('state');
  });

  it('invalid props reveal nothing', () => {
    expect(revealedByRules(EVENT_AREA_REVEALS, { source: 1 }, undefined, is(60))).toBeNull();
  });
});
