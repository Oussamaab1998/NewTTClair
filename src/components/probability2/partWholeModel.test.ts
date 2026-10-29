import { frac } from '../../engine/rational';
import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import {
  PART_WHOLE_REVEALS,
  barParts,
  partWholeFinding,
  partWholeModel,
} from './partWhole';
import { PartWholeBarPropsSchema } from './schemas';

const model = (p: Record<string, unknown>) => partWholeModel(PartWholeBarPropsSchema.parse(p));
const is = (n: number, d = 1) => (f: readonly [number, number]) => f[0] === n && f[1] === d;

describe('partWholeModel', () => {
  it('place: positions from 0 to twice the whole, so a value above the whole can be placed', () => {
    const m = model({ whole: '6', mode: 'place', ticks: 6 });
    expect(m.positions).toHaveLength(13);
    expect(m.positions[6]).toEqual(frac(6));
    expect(m.positions[12]).toEqual(frac(12));
    expect(m.scale).toEqual(frac(12));
    expect(m.target).toBeNull();
    expect(m.part).toBeNull();
  });

  it('fraction_of_quantity: positions from 0 to the whole, the target is whole x fraction', () => {
    const m = model({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' });
    expect(m.positions).toHaveLength(7);
    expect(m.scale).toEqual(frac(36));
    expect(m.target).toEqual(frac(6));
    expect(m.positions.some(p => p[0] === 6 && p[1] === 1)).toBe(true);
  });

  it('feedback: the part is given, no positions, the scale holds twice the whole or the part', () => {
    const m = model({ whole: '6', mode: 'feedback', part: '12' });
    expect(m.positions).toEqual([]);
    expect(m.part).toEqual(frac(12));
    expect(m.scale).toEqual(frac(12));
    const big = model({ whole: '6', mode: 'feedback', part: '40' });
    expect(big.scale).toEqual(frac(40));
  });
});

describe('barParts: the widths of the bar, as fractions of its scale (layout only)', () => {
  it('a part inside the whole: filled, then empty up to the whole mark, then the rest', () => {
    const m = model({ whole: '6', mode: 'place', ticks: 6 });
    const b = barParts(m, frac(3));
    expect(b.fill).toBeCloseTo(3 / 12);
    expect(b.gap).toBeCloseTo(3 / 12);
    expect(b.over).toBe(0);
    expect(b.rest).toBeCloseTo(6 / 12);
    expect(b.exceeds).toBe(false);
  });

  it('a part above the whole: filled to the mark, then an overflow past it', () => {
    const m = model({ whole: '6', mode: 'feedback', part: '12' });
    const b = barParts(m, frac(12));
    expect(b.fill).toBeCloseTo(6 / 12);
    expect(b.gap).toBe(0);
    expect(b.over).toBeCloseTo(6 / 12);
    expect(b.rest).toBe(0);
    expect(b.exceeds).toBe(true);
  });

  it('the parts always add up to the whole bar', () => {
    const m = model({ whole: '6', mode: 'place', ticks: 6 });
    for (const v of m.positions) {
      const b = barParts(m, v);
      expect(b.fill + b.gap + b.over + b.rest).toBeCloseTo(1);
    }
  });

  it('the whole itself does not exceed it', () => {
    const m = model({ whole: '6', mode: 'place', ticks: 6 });
    const b = barParts(m, frac(6));
    expect(b.exceeds).toBe(false);
    expect(b.over).toBe(0);
  });
});

describe('partWholeFinding', () => {
  it('place: the student\'s own value over the whole, the calculation by the engine; never correct or wrong', () => {
    const m = model({ whole: '6', mode: 'place', ticks: 6 });
    const f = partWholeFinding(m, frac(12), ['placed:12'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'partwhole.place',
      numbers: { whole: '6', value: '12', ratio: '2' },
      how: 'found',
      correct: null,
      calc: ['\\frac{12}{6} = 2'],
    });
  });

  it('fraction_of_quantity: correct when the value is the fraction of the whole', () => {
    const m = model({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' });
    const right = partWholeFinding(m, frac(6), ['placed:6'], 'found');
    expect(right).toMatchObject({
      findingId: 'partwhole.fraction',
      numbers: { whole: '36', fraction: '1/6', value: '6', quantity: '6' },
      correct: true,
    });
    expect(right.calc).toEqual(['\\frac{1}{6} \\times 36 = 6']);
    const wrong = partWholeFinding(m, frac(12), ['placed:12'], 'found');
    expect(wrong.correct).toBe(false);
    expect(wrong.calc).toBeUndefined();
  });

  it('skipped: never correct, no calculation', () => {
    const m = model({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' });
    const f = partWholeFinding(m, frac(6), ['reveal'], 'skipped');
    expect(f.correct).toBeNull();
    expect(f.calc).toBeUndefined();
    expect(f.how).toBe('skipped');
  });
});

describe('reveals (hard rule 9)', () => {
  it('declared and complete', () => {
    expect(completeReveals(PART_WHOLE_REVEALS)).toBe(true);
  });

  it('the whole is on the bar from the start', () => {
    const hit = revealedByRules(PART_WHOLE_REVEALS, { whole: '6', mode: 'place' }, undefined, is(6));
    expect(hit?.value).toBe('whole');
    expect(hit?.by).toBe('props');
  });

  it('1/6 of 36 = 6 is written only after a value is placed (by state)', () => {
    const props = { whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' };
    const hit = revealedByRules(PART_WHOLE_REVEALS, props, undefined, is(6));
    expect(hit?.value).toBe('quantity');
    expect(hit?.by).toBe('state');
  });

  it('feedback writes the student\'s own value and its ratio, nothing about the correct value', () => {
    const props = { whole: '60', mode: 'feedback', part: '120' };
    expect(revealedByRules(PART_WHOLE_REVEALS, props, undefined, is(120))?.value).toBe('feedback_values');
    expect(revealedByRules(PART_WHOLE_REVEALS, props, undefined, is(2))?.value).toBe('feedback_values');
    // the correct probability, 1/2, is not on screen
    expect(revealedByRules(PART_WHOLE_REVEALS, props, undefined, is(1, 2))).toBeNull();
  });

  it('invalid props reveal nothing', () => {
    expect(revealedByRules(PART_WHOLE_REVEALS, { whole: 'x' }, undefined, is(6))).toBeNull();
  });
});
