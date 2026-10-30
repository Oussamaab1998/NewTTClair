import { ratToString } from '../engine/rationalFormat';
import {
  LINE_MAX,
  evalChain,
  lineLatex,
  mismatchLine,
  type ChainResult,
} from './lineChain';

const value = (r: ChainResult): string => {
  if (r.kind === 'unreadable') {
    throw new Error(`unreadable: ${r.reason}`);
  }
  return ratToString(r.value);
};

describe('a line is a chain of sides, each evaluated exactly', () => {
  it('336/6 = 56 is an equal chain (the owner: 8 balls choose 3)', () => {
    const r = evalChain('336/6 = 56');
    expect(r.kind).toBe('chain');
    if (r.kind === 'chain') {
      expect(r.equal).toBe(true);
      expect(r.sides.map(s => ratToString(s.value))).toEqual(['56', '56']);
    }
    expect(value(r)).toBe('56');
  });

  it('336/6 = 55 is a chain that is not equal, and says where', () => {
    const r = evalChain('336/6 = 55');
    expect(r.kind).toBe('chain');
    if (r.kind === 'chain') {
      expect(r.equal).toBe(false);
      expect(r.mismatchAt).toBe(0);
    }
  });

  it('reads the typographic keys: × ÷ and the real minus', () => {
    expect(value(evalChain('10×9×8÷(3×2×1) = 120'))).toBe('120');
    expect(value(evalChain('10 − 4 = 6'))).toBe('6');
  });

  it('the owner values, left to right: 990/3*2*1 = 660 but 990/(3*2*1) = 165', () => {
    expect(value(evalChain('990/3*2*1 = 660'))).toBe('660');
    expect(evalChain('990/3*2*1 = 660')).toMatchObject({ equal: true });
    expect(value(evalChain('990/(3*2*1) = 165'))).toBe('165');
    // the two readings of the same digits differ
    expect(value(evalChain('990/3*2*1'))).toBe('660');
    expect(value(evalChain('990/(3*2*1)'))).toBe('165');
  });

  it('a side without "=" is an unfinished line; a plain number is bare', () => {
    expect(evalChain('8+3')).toMatchObject({ kind: 'unfinished' });
    expect(value(evalChain('8+3'))).toBe('11'); // the start the owner wrote
    expect(value(evalChain('4*3'))).toBe('12');
    expect(value(evalChain('3*2*1'))).toBe('6'); // abc has 6 orderings
    expect(value(evalChain('24/6'))).toBe('4');
    expect(value(evalChain('3*1'))).toBe('3');
    expect(value(evalChain('5*4'))).toBe('20');
    expect(value(evalChain('(5*4)/(2*1)'))).toBe('10');
    expect(evalChain('120')).toMatchObject({ kind: 'bare' });
    expect(evalChain('-3')).toMatchObject({ kind: 'bare' });
    expect(value(evalChain('0,5'))).toBe('1/2');
  });

  it('fractions are exact and never floats: 75/660, 56/30, 25/55', () => {
    expect(value(evalChain('75/660'))).toBe('5/44');
    expect(value(evalChain('56/30'))).toBe('28/15');
    expect(value(evalChain('25/55'))).toBe('5/11');
    expect(value(evalChain('60÷120 = 1÷2'))).toBe('1/2');
  });

  it('a chain of three sides keeps each value', () => {
    const r = evalChain('10*9*8 = 720 = 6*120');
    expect(r.kind).toBe('chain');
    if (r.kind === 'chain') {
      expect(r.equal).toBe(true);
      expect(r.sides).toHaveLength(3);
    }
  });
});

describe('unreadable lines are named, never thrown', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['1+', 'syntax'],
    ['()', 'syntax'],
    ['2 3', 'syntax'],
    ['= 5', 'syntax'],
    ['5 =', 'syntax'],
    ['5 == 5', 'syntax'],
    ['a = 3', 'syntax'],
    ['x*2', 'syntax'],
    ['2^3', 'syntax'],
  ])('%j is unreadable (%s)', (raw, reason) => {
    expect(evalChain(raw)).toMatchObject({ kind: 'unreadable', reason });
  });

  it('a line longer than the limit is too long', () => {
    expect(evalChain('1+'.repeat(LINE_MAX) + '1')).toMatchObject({
      kind: 'unreadable',
      reason: 'too_long',
    });
  });

  it('1/0 and a product past the safe integers are not numbers, with no float', () => {
    expect(evalChain('1/0')).toMatchObject({
      kind: 'unreadable',
      reason: 'not_a_number',
    });
    expect(evalChain('99999999*99999999*99999999')).toMatchObject({
      kind: 'unreadable',
      reason: 'not_a_number',
    });
  });

  it('never throws on garbage', () => {
    for (const raw of [
      '\u0000',
      '((((',
      ')))',
      '1/',
      '/1',
      '*',
      '9'.repeat(400),
      '1,2,3',
      '1.2.3',
    ]) {
      expect(() => evalChain(raw)).not.toThrow();
    }
  });
});

describe("a mismatch shows the student's own line and no new number", () => {
  it('336/6 ≠ 55 repeats his digits only', () => {
    const r = evalChain('336/6 = 55');
    expect(r.kind === 'chain' && !r.equal).toBe(true);
    if (r.kind === 'chain') {
      const shown = mismatchLine('336/6 = 55', r.mismatchAt ?? 0);
      expect(shown).toContain('≠');
      const digits = (s: string) => new Set(s.match(/\d+/g));
      for (const d of digits(shown)) {
        expect(digits('336/6 = 55').has(d)).toBe(true);
      }
      expect(shown).not.toContain('56');
    }
  });

  it('puts the ≠ at the first side that differs in a longer chain', () => {
    const r = evalChain('2*3 = 6 = 7');
    expect(r.kind === 'chain' && r.mismatchAt).toBe(1);
    expect(mismatchLine('2*3 = 6 = 7', 1)).toBe('2*3 = 6 ≠ 7');
  });
});

describe('his own line as LaTeX', () => {
  it('writes each side as a formula and keeps the "="', () => {
    expect(lineLatex('1/2 = 0,5')).toContain('=');
    expect(lineLatex('10*9*8/(3*2*1) = 120')).toMatch(/\\frac/);
    expect(lineLatex('120')).toBe('120');
  });
  it('never invents a number', () => {
    const digits = (s: string) => new Set(s.match(/\d+/g));
    const out = lineLatex('336/6 = 55');
    for (const d of digits(out)) {
      expect(digits('336/6 = 55').has(d)).toBe(true);
    }
  });
});

describe('a lone fraction is a value, a whole quotient is a computation waiting for its "="', () => {
  it('7/2, 1/128 and 60/120 are read as values (bare)', () => {
    for (const raw of ['7/2', '1/128', '60/120']) {
      expect(evalChain(raw).kind).toBe('bare');
    }
  });
  it('720/6 (a whole quotient) and 1/2*1/2 (a product) are still unfinished', () => {
    for (const raw of ['720/6', '1/2*1/2', '10*9*8/(3*2*1)']) {
      expect(evalChain(raw).kind).toBe('unfinished');
    }
  });
});
