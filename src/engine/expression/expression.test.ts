import {
  checkEquivalence,
  evaluateExact,
  evaluateReal,
  parseExpression,
  toString,
  type Node,
  type ParseOptions,
} from './index';

function ast(input: string, opts?: ParseOptions): Node {
  const r = parseExpression(input, opts);
  if (!r.ok) {
    throw new Error(`parse failed for ${input}: ${r.error.code}`);
  }
  return r.ast;
}
const show = (input: string, opts?: ParseOptions) => toString(ast(input, opts));
const value = (input: string, x = 0) => evaluateReal(ast(input), { x });

describe('parseExpression: structure', () => {
  it('follows the usual precedence', () => {
    expect(show('1+2*3')).toBe('(1 + (2 * 3))');
    expect(show('2^3^2')).toBe('(2 ^ (3 ^ 2))');
    expect(show('-x^2')).toBe('(-(x ^ 2))');
    expect(show('8/2/2')).toBe('((8 / 2) / 2)');
  });
  it('accepts implicit multiplication', () => {
    expect(show('2x')).toBe('(2 * x)');
    expect(show('2(x+1)')).toBe('(2 * (x + 1))');
    expect(show('(x+1)(x-1)')).toBe('((x + 1) * (x - 1))');
    expect(show('2e^x')).toBe('(2 * (e ^ x))');
    expect(show('3ln(x)')).toBe('(3 * ln(x))');
  });
  it('reads a signed exponent (e^-x) and documents e^-2x = e^(-2)·x', () => {
    expect(show('e^-x')).toBe('(e ^ (-x))');
    expect(show('e^-2x')).toBe('((e ^ (-2)) * x)');
  });
  it('accepts the French decimal comma and typographic operators', () => {
    expect(show('0,7')).toBe('0.7');
    expect(show('2×3 − 4÷2 · x')).toBe('((2 * 3) - ((4 / 2) * x))');
    expect(show('2π')).toBe('(2 * pi)');
  });
  it('knows ln, exp, sqrt, abs, sin, cos, tan and the constants e, pi', () => {
    expect(value('ln(e)')).toBeCloseTo(1, 12);
    expect(value('exp(0) + sqrt(4) + abs(-3)')).toBe(6);
    expect(value('cos(pi)')).toBeCloseTo(-1, 12);
    expect(value('e^0')).toBe(1);
  });
  it('returns NaN outside the real domain instead of throwing', () => {
    expect(value('ln(-1)')).toBeNaN();
    expect(value('sqrt(-4)')).toBeNaN();
    expect(Number.isFinite(value('1/x', 0))).toBe(false);
  });
  it('allows only the declared variables', () => {
    expect(parseExpression('n+1', { variables: ['n'] }).ok).toBe(true);
    expect(parseExpression('y+1').ok).toBe(false);
  });
});

describe('parseExpression: rejects non-math input', () => {
  const rejected: [string, string][] = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['hello', 'unknown_identifier'],
    ['alert(1)', 'unknown_identifier'],
    ['constructor', 'unknown_identifier'],
    ['__proto__', 'invalid_char'],
    ['Math.PI', 'unknown_identifier'],
    ['x; y', 'invalid_char'],
    ['x = 2', 'invalid_char'],
    ['`x`', 'invalid_char'],
    ['${x}', 'invalid_char'],
    ['"1"', 'invalid_char'],
    ['1 +', 'missing_operand'],
    ['*2', 'missing_operand'],
    ['(1+2', 'unbalanced_paren'],
    ['1+2)', 'unbalanced_paren'],
    ['()', 'missing_operand'],
    ['ln x', 'function_needs_parens'],
    ['2..3', 'invalid_char'],
    ['2 3', 'unexpected_token'],
    ['1/10 0,7', 'unexpected_token'],
    ['x'.repeat(201), 'too_long'],
    ['('.repeat(60) + '1' + ')'.repeat(60), 'too_deep'],
    ['-'.repeat(100) + '1', 'too_deep'],
  ];
  it.each(rejected)('rejects %j with %s', (input, code) => {
    const r = parseExpression(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(code);
      expect(r.error.index).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('evaluateExact (probability answers)', () => {
  it('computes fractions exactly', () => {
    expect(evaluateExact(ast('1 - 3/10'))).toEqual([7, 10]);
    expect(evaluateExact(ast('0,7'))).toEqual([7, 10]);
    expect(evaluateExact(ast('-2/10 - 1/10 + 2/10'))).toEqual([-1, 10]);
    expect(evaluateExact(ast('9/10 - (1/10)^2'))).toEqual([89, 100]);
    expect(evaluateExact(ast('2^-1'))).toEqual([1, 2]);
  });
  it('returns null when the value is not a known rational', () => {
    expect(evaluateExact(ast('sqrt(2)'))).toBeNull();
    expect(evaluateExact(ast('x + 1'))).toBeNull();
    expect(evaluateExact(ast('1/0'))).toBeNull();
    expect(evaluateExact(ast('2^(1/2)'))).toBeNull();
  });
});

describe('checkEquivalence (numeric samples)', () => {
  const eq = (a: string, b: string) => checkEquivalence(ast(a), ast(b));

  it('accepts algebraically equal forms', () => {
    expect(eq('(x+1)^2', 'x^2 + 2x + 1').verdict).toBe('equivalent');
    expect(eq('e^-x/(1+e^(-2x))', '1/(e^x + e^-x)').verdict).toBe('equivalent');
    expect(eq('ln(e^(2x))', '2x').verdict).toBe('equivalent');
  });
  it('rejects a missing parenthesis and gives a simple counterexample', () => {
    const r = eq('e^-x/1+e^(-2x)', 'e^-x/(1+e^(-2x))');
    expect(r.verdict).toBe('different');
    if (r.verdict === 'different') {
      expect(r.counterexample.scope).toEqual({ x: 1 });
    }
  });
  it('compares numbers exactly when both are rational', () => {
    expect(eq('7/10', '0,7').verdict).toBe('equivalent');
    expect(eq('1 - 3/10', '7/10').verdict).toBe('equivalent');
    expect(eq('0.33', '1/3').verdict).toBe('different');
    expect(eq('0.3333333333', '1/3').verdict).toBe('different');
    expect(eq('8,9', '89/100').verdict).toBe('different');
  });
  it('flags a domain difference (equal where both are defined)', () => {
    const r = eq('ln(x^2)', '2ln(x)');
    expect(r.verdict).toBe('equivalent');
    if (r.verdict === 'equivalent') {
      expect(r.domainDiffers).toBe(true);
    }
  });
  it('is undetermined when almost no sample is defined', () => {
    expect(eq('sqrt(-x^2-1)', '0').verdict).toBe('undetermined');
  });
  it('handles several variables', () => {
    const opts = { variables: ['x', 'y'] };
    const r = checkEquivalence(
      ast('(x+y)^2', opts),
      ast('x^2+2xy+y^2', opts),
      opts,
    );
    expect(r.verdict).toBe('equivalent');
  });
});
