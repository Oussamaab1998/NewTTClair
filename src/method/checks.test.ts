import { parseExpression } from '../engine/expression';
import { frac } from '../engine/rational';
import {
  aboveOne,
  inRange,
  isUnreducedFraction,
  multiplyBackCheck,
  targetMatch,
  unitsMismatch,
} from './checks';
import { evalChain } from './lineChain';

const ast = (raw: string) => {
  const p = parseExpression(raw, { variables: [], constants: [] });
  if (!p.ok) {
    throw new Error(raw);
  }
  return p.ast;
};

describe('can this be a probability?', () => {
  it("the owner's 56/30 = 28/15, 2 and a negative fire; 15/28, 5/44, 1/2, 0 and 1 do not", () => {
    expect(aboveOne(frac(56, 30))).toBe(true);
    expect(aboveOne(frac(28, 15))).toBe(true);
    expect(aboveOne(frac(2))).toBe(true);
    expect(aboveOne(frac(-1, 2))).toBe(true);
    for (const v of [frac(15, 28), frac(5, 44), frac(1, 2), frac(0), frac(1)]) {
      expect(aboveOne(v)).toBe(false);
      expect(inRange(v)).toBe(true);
    }
    expect(inRange(frac(28, 15))).toBe(false);
  });
});

describe('units: an ordered count is not a group count', () => {
  it('990 (ordered) over 75 (groups) fires; groups over groups does not', () => {
    expect(unitsMismatch('ordered', 'groups')).toBe(true);
    expect(unitsMismatch('groups', 'ordered')).toBe(true);
    expect(unitsMismatch('groups', 'groups')).toBe(false);
    expect(unitsMismatch('ordered', 'ordered')).toBe(false);
    expect(unitsMismatch('count', 'groups')).toBe(false); // k! is a plain number
  });
});

describe('multiply back: the quotient times the divisor must give the dividend', () => {
  it('336/6 = 55: the student checks 55 x 6, never shown the product', () => {
    const r = evalChain('336/6 = 55');
    if (r.kind !== 'chain') {
      throw new Error('chain');
    }
    const c = multiplyBackCheck(r);
    expect(c).not.toBeNull();
    expect(c!.expr).toBe('55*6');
    expect(c!.expected).toEqual([336, 1]);
  });

  it('24/6 = 4 closes with 24 = 6 x 4 (the owner)', () => {
    const r = evalChain('24/6 = 4');
    if (r.kind !== 'chain') {
      throw new Error('chain');
    }
    expect(multiplyBackCheck(r)!.expr).toBe('4*6');
    expect(multiplyBackCheck(r)!.closedBy('4*6 = 24')).toBe(true);
    expect(multiplyBackCheck(r)!.closedBy('4*6 = 23')).toBe(false);
  });

  it("990/(3*2*1) = 165 keeps the student's own divisor", () => {
    const r = evalChain('990/(3*2*1) = 165');
    if (r.kind !== 'chain') {
      throw new Error('chain');
    }
    const c = multiplyBackCheck(r)!;
    expect(c.expr).toBe('165*(3*2*1)');
    expect(c.closedBy('165*6 = 990')).toBe(true);
  });

  it('is only for a division written first', () => {
    for (const raw of ['3*4 = 12', '10 = 10', '10*9*8 = 720']) {
      const r = evalChain(raw);
      expect(r.kind === 'chain' && multiplyBackCheck(r)).toBe(null);
    }
  });
});

describe('simplify: a fraction written with a factor in common', () => {
  it('25/55 and 60/120 and 5/10 are unreduced; 5/11, 1/2, 7 and 3/4 are not', () => {
    for (const raw of ['25/55', '60/120', '5/10', '56/30']) {
      expect(isUnreducedFraction(ast(raw))).toBe(true);
    }
    for (const raw of ['5/11', '1/2', '7', '3/4', '10*9/2']) {
      expect(isUnreducedFraction(ast(raw))).toBe(false);
    }
  });
});

describe('the target given by the statement is the last check', () => {
  it('1/2 against 60/120 = 1/2', () => {
    expect(targetMatch(frac(1, 2), frac(60, 120))).toBe(true);
    expect(targetMatch(frac(1, 2), frac(1, 12))).toBe(false);
  });
});
