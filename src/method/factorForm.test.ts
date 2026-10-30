import { parseExpression, type Node } from '../engine/expression';
import { evalChain } from './lineChain';
import { factorBag, leaves, readback, sameBag } from './factorForm';

const ast = (raw: string): Node => {
  const p = parseExpression(raw, { variables: [], constants: [] });
  if (!p.ok) {
    throw new Error(`does not parse: ${raw}`);
  }
  return p.ast;
};
const same = (a: string, b: string) =>
  sameBag(factorBag(ast(a)), factorBag(ast(b)));
const val = (raw: string) => {
  const r = evalChain(raw);
  if (r.kind === 'unreadable') {
    throw new Error(raw);
  }
  return `${r.value[0]}/${r.value[1]}`;
};

describe('factor bag: the same product and quotient, however it is bracketed', () => {
  it('4*6*5/(2*1), 4*(6*5/(2*1)) and 4*6*5/2 are one bag (the "*1" is dropped)', () => {
    expect(same('4*6*5/(2*1)', '4*(6*5/(2*1))')).toBe(true);
    expect(same('4*6*5/(2*1)', '4*6*5/2')).toBe(true);
    expect(same('4*6*5/(2*1)', '(4*6*5)/(2*1)')).toBe(true);
  });

  it('order does not matter inside a product', () => {
    expect(same('10*9*8/(3*2*1)', '8*9*10/(1*2*3)')).toBe(true);
    expect(same('10*9*8/(3*2*1)', '10*9*8/(3*2)')).toBe(true);
  });

  it('990/3*2*1 is NOT 990/(3*2*1): the divisor group is the whole point', () => {
    expect(same('990/3*2*1', '990/(3*2*1)')).toBe(false);
    expect(factorBag(ast('990/3*2*1'))).toEqual({
      negative: false,
      num: ['2', '990'],
      den: ['3'],
    });
    expect(factorBag(ast('990/(3*2*1)'))).toEqual({
      negative: false,
      num: ['990'],
      den: ['2', '3'],
    });
  });

  it('the same value written another way is another bag (value is matched first, structure second)', () => {
    expect(same('720/6', '10*9*8/(3*2*1)')).toBe(false);
    expect(val('720/6')).toBe(val('10*9*8/(3*2*1)'));
  });

  it('a sum is one opaque factor, written in any order: (8+3)*7*6', () => {
    const bag = factorBag(ast('(8+3)*7*6'));
    expect(bag.num).toHaveLength(3);
    expect(same('(8+3)*7*6', '(3+8)*7*6')).toBe(true);
    expect(same('(8+3)*7*6', '8*7*6')).toBe(false);
  });

  it('5*4 and (5*4)/(2*1) differ (the division is missing)', () => {
    expect(same('5*4', '(5*4)/(2*1)')).toBe(false);
    expect(same('3*1', '3')).toBe(true);
  });

  it('keeps the sign of the whole product', () => {
    expect(factorBag(ast('-3')).negative).toBe(true);
    expect(factorBag(ast('-3*-2')).negative).toBe(false);
  });

  it('leaves lists every number written, sums included', () => {
    expect(leaves(ast('(8+3)*7*6'))).toEqual(['3', '6', '7', '8']);
    expect(leaves(ast('10*9*8/(3*2*1)'))).toEqual([
      '1',
      '10',
      '2',
      '3',
      '8',
      '9',
    ]);
  });
});

describe('readback: a "/" followed by a product, with no parentheses, is stated', () => {
  it('990/3*2*1 offers the grouped and the literal reading', () => {
    const r = readback('990/3*2*1');
    expect(r).not.toBeNull();
    expect(r!.divisor).toEqual(['3', '2', '1']);
    expect(r!.grouped).toBe('990/(3*2*1)');
    expect(val(r!.grouped)).toBe('165/1');
    expect(val('990/3*2*1')).toBe('660/1'); // the literal reading is what the parser does
  });

  it("keeps the student's own symbols and the rest of the chain", () => {
    expect(readback('10×9×8÷3×2×1 = 480')!.grouped).toBe(
      '10×9×8÷(3×2×1) = 480',
    );
    expect(readback('990/3*2*1 = 660')!.grouped).toBe('990/(3*2*1) = 660');
    expect(readback('8*7/2*1')!.grouped).toBe('8*7/(2*1)');
  });

  it('gives nothing when there is nothing ambiguous', () => {
    for (const raw of [
      '990/(3*2*1)',
      '990/3',
      '5*4/2',
      '10/2+3*4',
      '6/(2*1)*3',
      '100/4/5',
      '10×9×8÷(3×2×1) = 120',
      '8+3',
    ]) {
      expect(readback(raw)).toBeNull();
    }
  });

  it('finds it inside parentheses and after an "="', () => {
    expect(readback('3*(10/2*5)')!.grouped).toBe('3*(10/(2*5))');
    expect(readback('720 = 10*9*8 = 100/4*5')!.grouped).toBe(
      '720 = 10*9*8 = 100/(4*5)',
    );
  });

  it('a parenthesised factor after the first divisor atom is part of the group', () => {
    expect(readback('100/4*(2+3)')!.grouped).toBe('100/(4*(2+3))');
  });

  it('never throws on garbage', () => {
    for (const raw of ['', '/', '1/', '/*', '((', '1/(2', '1/2*', '÷3*2']) {
      expect(() => readback(raw)).not.toThrow();
    }
  });
});

describe('readback: a chain of fractions is a product of fractions, never asked (Question 3 sequences)', () => {
  it('1/2*1/2*1/2 and 1/6*5/6*5/6 give nothing', () => {
    for (const raw of [
      '1/2*1/2*1/2',
      '1/6*5/6*5/6',
      '1/2×1/2×1/2',
      '(1/2)*(1/2)',
    ]) {
      expect(readback(raw)).toBeNull();
    }
  });
  it('the real slip is still asked: 10*9*8/3*2*1 and 6*5/2*1', () => {
    expect(readback('10*9*8/3*2*1')).not.toBeNull();
    expect(readback('6*5/2*1')).not.toBeNull();
  });
  it('a divisor product that ends the line is asked even after a fraction: 1/2*10*9/3*2', () => {
    expect(readback('1/2*10*9/3*2')).not.toBeNull();
  });
});
