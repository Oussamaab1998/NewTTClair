import { parseNumeric } from '../format';
import { equals, type Fraction } from '../rational';
import {
  checkTypedCount,
  normalizeCounting,
  parseCountingAnswer,
  substituteSymbols,
} from './counting';

const value = (raw: string): Fraction | string => {
  const r = parseCountingAnswer(raw);
  return r.ok ? r.value : r.reason;
};

describe('C(a,b), A(a,b), a! become integers before the existing parser runs', () => {
  it.each([
    ['C(6,2)', 15],
    ['C(6;2)', 15],
    ['C(6, 2)', 15],
    ['C( 6 ; 2 )', 15],
    ['C_6^2', 15],
    ['C_{6}^{2}', 15],
    ['C^2_6', 15],
    ['C^{2}_{6}', 15],
    ['C₆²', 15], // C with subscript 6 and superscript 2
    ['C(10,3)', 120],
    ['C(4,1)', 4],
    ['A(6,2)', 30],
    ['A_6^2', 30],
    ['A₆²', 30],
    ['A(10;3)', 720],
    ['6!', 720],
    ['0!', 1],
  ])('%s = %i', (raw, want) => {
    expect(value(raw)).toEqual([want, 1]);
  });

  it('formulas the textbook writes: 6!/(2!4!), with and without a star', () => {
    expect(value('6!/(2!4!)')).toEqual([15, 1]);
    expect(value('6!/(2!*4!)')).toEqual([15, 1]);
    expect(value('10!/(3!7!)')).toEqual([120, 1]);
    expect(value('6!/(2!(6-2)!)')).toEqual([15, 1]);
    expect(value('(2+1)!')).toEqual([6, 1]);
  });

  it('products and sums of them: the exercise numbers', () => {
    expect(value('C(4,1)*C(6,2)')).toEqual([60, 1]);
    expect(value('C(4,1)×C(6,2)')).toEqual([60, 1]); // the multiplication sign
    expect(value('C(4,1)C(6,2)')).toEqual([60, 1]); // written side by side
    expect(value('4C(6,2)')).toEqual([60, 1]);
    expect(value('C(4,1)+C(6,2)')).toEqual([19, 1]);
    expect(value('C(4,1)*C(6,2)/C(10,3)')).toEqual([1, 2]);
    expect(value('C(6,3)/C(10,3)')).toEqual([1, 6]);
  });

  it('the comma stays a decimal separator everywhere except inside C( ) and A( )', () => {
    expect(value('0,5')).toEqual([1, 2]);
    expect(value('0,5*C(6,2)')).toEqual([15, 2]);
    const plain = normalizeCounting('0,5');
    expect(plain).toEqual({ ok: true, text: '0,5', usedNotation: false });
  });

  it('plain input is returned unchanged and flagged as no notation', () => {
    for (const raw of ['120', '1/2', '6*5/2', '1 - 3/10', '4*15']) {
      expect(normalizeCounting(raw)).toEqual({ ok: true, text: raw, usedNotation: false });
    }
  });

  it('notation is flagged', () => {
    expect(normalizeCounting('C(6,2)')).toMatchObject({ ok: true, usedNotation: true });
    expect(normalizeCounting('3!')).toMatchObject({ ok: true, usedNotation: true });
    expect(normalizeCounting('6*5/2')).toMatchObject({ ok: true, usedNotation: false });
  });

  it('agrees with the existing parser on what it produces: the result is plain arithmetic', () => {
    const n = normalizeCounting('C(6,2)*A(4,2)');
    expect(n.ok).toBe(true);
    if (n.ok) {
      expect(n.text).not.toMatch(/[CA!]/);
      const p = parseNumeric(n.text);
      expect(p.ok && equals(p.value, [180, 1])).toBe(true);
    }
  });
});

describe('refused, with a reason, never guessed', () => {
  it.each([
    ['C62', 'ambiguous'],
    ['C6', 'ambiguous'],
    ['A62', 'ambiguous'],
    ['4C62', 'ambiguous'],
    ['C(6,2.5)', 'bad_args'],
    ['C(6;2,5)', 'bad_args'],
    ['C(6,)', 'bad_args'],
    ['C(6)', 'bad_args'],
    ['C(6,2,3)', 'bad_args'],
    ['C(-1,2)', 'bad_args'],
    ['C(a,2)', 'bad_args'],
    ['(7/2)!', 'bad_args'],
    ['(0-1)!', 'bad_args'],
    ['19!', 'too_large'],
    ['C(70,35)', 'too_large'],
    ['C(99,1)', 'too_large'],
    ['A(30,20)', 'too_large'],
    ['3!!', 'syntax'],
    ['C', 'syntax'],
    ['2C', 'syntax'],
    ['C_6', 'syntax'],
    ['C_6^', 'syntax'],
    ['C(6,2', 'syntax'],
    ['x!', 'syntax'],
  ])('%s -> %s', (raw, reason) => {
    expect(value(raw)).toBe(reason);
  });

  it('C(7,9) is 0, as in the engine, not an error', () => {
    expect(value('C(7,9)')).toEqual([0, 1]);
    expect(value('A(3,5)')).toEqual([0, 1]);
  });

  it('what the parser itself refuses stays refused (no new grammar was added)', () => {
    expect(parseNumeric('C(6,2)').ok).toBe(false);
    expect(parseNumeric('6!').ok).toBe(false);
    expect(value('sqrt(4)')).toBe('not_a_number');
    expect(value('2+')).toBe('syntax');
  });
});

describe('substituteSymbols: n and k replaced by integers, for sampling', () => {
  it('C(n,k)/2^n at n = 5, k = 2 is 10/32', () => {
    const s = substituteSymbols('C(n,k)/2^n', { n: 5, k: 2 });
    expect(s).toBe('C(5,2)/2^5');
    expect(value(s)).toEqual([5, 16]);
  });
  it('n!/(k!(n-k)!) at n = 6, k = 2 is 15', () => {
    expect(value(substituteSymbols('n!/(k!(n-k)!)', { n: 6, k: 2 }))).toEqual([15, 1]);
  });
  it('only whole one-letter names are replaced, not letters inside words', () => {
    expect(substituteSymbols('nk + n', { n: 3, k: 4 })).toBe('nk + 3'); // "nk" is not a symbol
    expect(substituteSymbols('C_n^k', { n: 6, k: 2 })).toBe('C_6^2');
  });
  it('C(n,k) and C(n,n-k) are equal over a grid; C(n,k) and k!/n! are not', () => {
    let equal = 0;
    let differ = 0;
    for (let n = 2; n <= 9; n++) {
      for (let k = 0; k <= n; k++) {
        const a = value(substituteSymbols('C(n,k)', { n, k }));
        const b = value(substituteSymbols('C(n,n-k)', { n, k }));
        const c = value(substituteSymbols('k!/n!', { n, k }));
        if (equals(a as Fraction, b as Fraction)) {
          equal++;
        }
        if (!equals(a as Fraction, c as Fraction)) {
          differ++;
        }
      }
    }
    expect(equal).toBe(Array.from({ length: 8 }, (_, i) => i + 3).reduce((s, x) => s + x, 0));
    expect(differ).toBeGreaterThan(0);
  });
});

describe('a step that asks the student to COMPUTE a count: notation is not a pass (change 3)', () => {
  const sixty: Fraction = [60, 1];

  it('the value typed as a number is correct', () => {
    expect(checkTypedCount('60', sixty, { aboutNotation: false })).toEqual({ kind: 'correct', value: [60, 1] });
    expect(checkTypedCount('4*15', sixty, { aboutNotation: false })).toEqual({ kind: 'correct', value: [60, 1] });
    expect(checkTypedCount('120/2', sixty, { aboutNotation: false })).toEqual({ kind: 'correct', value: [60, 1] });
  });

  it('the right notation, not yet computed: a neutral verdict, not correct and not wrong', () => {
    for (const raw of ['C(4,1)*C(6,2)', 'C(4,1)C(6,2)', '4*C(6,2)', 'C(10,3)/2']) {
      const r = checkTypedCount(raw, sixty, { aboutNotation: false });
      expect(r).toEqual({ kind: 'notation_only', value: [60, 1] });
    }
  });

  it('notation that computes to a different number is just a wrong value (the number is what is compared)', () => {
    expect(checkTypedCount('C(6,3)', sixty, { aboutNotation: false })).toEqual({ kind: 'wrong', value: [20, 1] });
    expect(checkTypedCount('C(4,1)+C(6,2)', sixty, { aboutNotation: false })).toEqual({ kind: 'wrong', value: [19, 1] });
    expect(checkTypedCount('24', sixty, { aboutNotation: false })).toEqual({ kind: 'wrong', value: [24, 1] });
  });

  it('a step about notation accepts it', () => {
    expect(checkTypedCount('C(4,1)*C(6,2)', sixty, { aboutNotation: true })).toEqual({ kind: 'correct', value: [60, 1] });
    expect(checkTypedCount('C_4^1*C_6^2', sixty, { aboutNotation: true })).toEqual({ kind: 'correct', value: [60, 1] });
    expect(checkTypedCount('C(6,3)', sixty, { aboutNotation: true })).toEqual({ kind: 'wrong', value: [20, 1] });
  });

  it('unreadable input says so, with the reason', () => {
    expect(checkTypedCount('C62', sixty, { aboutNotation: false })).toEqual({ kind: 'unreadable', reason: 'ambiguous' });
    expect(checkTypedCount('', sixty, { aboutNotation: false })).toMatchObject({ kind: 'unreadable' });
    expect(checkTypedCount('4*', sixty, { aboutNotation: false })).toEqual({ kind: 'unreadable', reason: 'syntax' });
  });

  it('a probability step: 1/2 typed as notation is the same neutral verdict, as a number it is correct', () => {
    const half: Fraction = [1, 2];
    expect(checkTypedCount('C(4,1)*C(6,2)/C(10,3)', half, { aboutNotation: false })).toEqual({
      kind: 'notation_only',
      value: [1, 2],
    });
    expect(checkTypedCount('60/120', half, { aboutNotation: false })).toEqual({ kind: 'correct', value: [1, 2] });
    expect(checkTypedCount('0,5', half, { aboutNotation: false })).toEqual({ kind: 'correct', value: [1, 2] });
  });
});
